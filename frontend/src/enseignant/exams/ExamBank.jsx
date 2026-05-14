import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiX, FiDownload, FiEdit2, FiTrash2, FiCopy } from 'react-icons/fi';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import {
  downloadExamBankFile,
  getExamBank,
  getExamContent,
  deleteExamBankItem,
  copyExamBankItem,
} from '../../api/enseignant/Enseignant.api';
import '../../styles/ExamBank.css';

/* ── Helpers ── */
const toId = (id) => {
  if (!id) return '';
  if (typeof id === 'object' && id.$oid) return String(id.$oid);
  return String(id);
};

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};

const normStatus = (v) => String(v || '').trim().toLowerCase();

const formatDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '–'; }
};

const STATUS_CONFIG = {
  exporte:    { label: 'Exporté',   cls: 'exported' },
  'en cours': { label: 'En cours',  cls: 'ongoing'  },
  brouillon:  { label: 'Brouillon', cls: 'draft'    },
};

const PER_PAGE = 9; // 3 colonnes × 3 lignes

/* ── Filtre structuré : Filière → Année → Semestre ── */
const ANNEES_PAR_CYCLE = {
  default: ['1ère année', '2ème année', '3ème année', '4ème année', '5ème année'],
};

const SEMESTRES = ['Semestre 1', 'Semestre 2'];

/* Normalise une chaîne : minuscules + supprime les accents */
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const ANNEE_KEYWORDS = {
  '1ère année': ['1ere', '1re', 'premiere', '1ere annee'],
  '2ème année': ['2eme', 'deuxieme', '2eme annee'],
  '3ème année': ['3eme', 'troisieme', '3eme annee'],
  '4ème année': ['4eme', '4eme annee'],
  '5ème année': ['5eme', '5eme annee'],
};

const normalizeDepartementLabel = (exam) => String(exam?.Departement || '').trim();

const getDepartementKey = (exam) => norm(normalizeDepartementLabel(exam)) || '__sans_departement__';

const matchesDepartement = (exam, departementKey) => {
  if (!departementKey) return true;
  return getDepartementKey(exam) === departementKey;
};

const normalizeFiliereLabel = (exam) => String(
  exam?.filiere || exam?.Filiere || exam?.specialite || exam?.Specialite || exam?.discipline || ''
).trim();

const getFiliereKey = (exam) => norm(normalizeFiliereLabel(exam)) || '__sans_filiere__';

const matchesFiliere = (exam, filiereKey) => {
  if (!filiereKey) return true;
  return getFiliereKey(exam) === filiereKey;
};

const matchesAnnee = (exam, annee) => {
  if (!annee) return true;
  const haystack = norm(
    [exam.filiere, exam.Filiere, exam.specialite, exam.Specialite, exam.discipline, exam.niveau].join(' ')
  );
  return (ANNEE_KEYWORDS[annee] || []).some(kw => haystack.includes(kw));
};

const matchesSemestre = (exam, semestre) => {
  if (!semestre) return true;
  const s = norm(exam.semestre || '');
  if (!s) return false;
  const num = semestre === 'Semestre 1' ? '1' : '2';
  return (
    s === num ||
    s === `semestre ${num}` ||
    s === `s${num}` ||
    s === `semestre${num}`
  );
};

/* ── Sub-components ── */
const Toast = ({ message, type }) =>
  message ? <div className={`eb-toast eb-toast--${type}`}>{message}</div> : null;

const StatusBadge = ({ value }) => {
  const cfg = STATUS_CONFIG[normStatus(value)] || { label: value || '–', cls: 'draft' };
  return <span className={`eb-status eb-status--${cfg.cls}`}>{cfg.label}</span>;
};

const Pagination = ({ page, total, onChange }) => {
  if (total <= 1) return null;
  return (
    <div className="eb-pagination">
      <button className="eb-page-btn" onClick={() => onChange(page - 1)} disabled={page === 1} title="Page précédente"><FiChevronLeft size={16} /></button>
      <div className="eb-page-nums">
        {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
          <button key={p} className={`eb-page-num ${p === page ? 'eb-page-num--active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        ))}
      </div>
      <button className="eb-page-btn" onClick={() => onChange(page + 1)} disabled={page === total} title="Page suivante"><FiChevronRight size={16} /></button>
    </div>
  );
};

/* ── Delete Dialog Modal ── */
const DeleteModal = ({ exam, onConfirm, onClose }) => (
  <div className="qb-modal-overlay" onClick={onClose}>
    <div className="qb-modal qb-modal--confirm" onClick={(e) => e.stopPropagation()}>
      <div className="qb-modal-header">
        <div className="qb-modal-header-left">
          <div className="qb-modal-num qb-modal-num--danger">
            <FiTrash2 size={14} />
          </div>
          <div>
            <div className="qb-modal-label">Supprimer l'examen</div>
          </div>
        </div>
      </div>
      <div className="qb-modal-body">
        <p className="qb-confirm-text">
          Voulez-vous vraiment supprimer <strong>"{exam?.title || 'cet examen'}"</strong> définitivement de votre banque ?
        </p>
      </div>
      <div className="qb-modal-footer">
        <button className="qb-btn qb-btn--ghost" onClick={onClose}>
          <FiX size={14} /> Annuler
        </button>
        <button className="qb-btn qb-btn--danger-full" onClick={onConfirm}>
          <FiTrash2 size={14} /> Supprimer définitivement
        </button>
      </div>
    </div>
  </div>
);

/* ── Exam Card ── */
const ExamCard = ({ exam, isMine, onOpen }) => {
  const status = normStatus(exam.status);
  const cfg = STATUS_CONFIG[status] || { label: exam.status || '–', cls: 'draft' };
  return (
    <div className="eb-card" onClick={() => onOpen(exam)}>
      <div className="eb-card-top">
        <span className={`eb-card-status eb-status--${cfg.cls}`}>{cfg.label}</span>
        {isMine && (
          <span className={`eb-card-visibility ${exam.visibility === 'private' ? 'eb-card-visibility--private' : 'eb-card-visibility--public'}`}>
            {exam.visibility === 'private' ? '🔒 Privé' : '🌐 Public'}
          </span>
        )}
        {!isMine && <span className="eb-card-author">{exam.createdByName || 'Professeur'}</span>}
      </div>
      <h3 className="eb-card-title">{exam.title || 'Examen sans titre'}</h3>
      <div className="eb-card-tags">
        {exam.matiere && <span className="eb-tag eb-tag--blue">{exam.matiere}</span>}
        {exam.filiere && <span className="eb-tag">{exam.filiere}</span>}
        {exam.niveau  && <span className="eb-tag eb-tag--level">{exam.niveau}</span>}
      </div>
      <div className="eb-card-meta">
        {exam.duree && <span>⏱ {exam.duree}</span>}
        {exam.anneeUniversitaire && <span>📅 {exam.anneeUniversitaire}</span>}
        {exam.noteTotale > 0 && <span>/{exam.noteTotale} pts</span>}
      </div>
      <div className="eb-card-footer">
        <span className="eb-card-date">{formatDate(exam.createdAt)}</span>
        <span className="eb-card-cta">Voir →</span>
      </div>
    </div>
  );
};

/* ── Extrait le texte d'un nœud AST ── */
const extractTextFromAstNode = (node) => {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.children)) return node.children.map(extractTextFromAstNode).join('');
  if (node.type === 'list') return (node.items || []).map(item => (item.children || []).map(extractTextFromAstNode).join('')).join(' ');
  if (node.type === 'table') return (node.rows || []).flat().map(cell => (cell.children || []).map(extractTextFromAstNode).join('')).join(' ');
  return '';
};

/* ── Rendu AST inline ── */
const renderInline = (children = []) =>
  (children || []).map((ch, i) => {
    if (!ch) return null;
    if (ch.type === 'text') {
      if (ch.bold)      return <strong key={i}>{ch.text}</strong>;
      if (ch.italic)    return <em key={i}>{ch.text}</em>;
      if (ch.underline) return <u key={i}>{ch.text}</u>;
      return <span key={i}>{ch.text}</span>;
    }
    if (ch.type === 'link') return <a key={i} href={ch.href} style={{ color: '#1e4fa8' }}>{renderInline(ch.children || [])}</a>;
    if (ch.type === 'image') return <img key={i} src={ch.src} alt={ch.alt || ''} style={{ maxWidth: '100%', margin: '4px 0' }} />;
    if (Array.isArray(ch.children)) return <span key={i}>{renderInline(ch.children)}</span>;
    return null;
  });

/* ── Rendu d'un nœud AST ── */
const renderAstNode = (node, idx) => {
  if (!node) return null;
  const text = extractTextFromAstNode(node).trim();

  if (node.type === 'paragraph' || node.type === 'heading') {
    if (!text) return null;
    if (/^[_\s]{5,}$/.test(text) || /^_{3,}/.test(text)) {
      return <div key={idx} style={{ borderBottom: '1px dotted #888', height: '16px', marginTop: '4px', marginBottom: '4px', width: '100%' }} />;
    }
    const isBold = node.type === 'heading';
    return (
      <p key={idx} style={{ margin: '0 0 5px', lineHeight: '1.55', fontSize: '13px', fontWeight: isBold ? '700' : 'normal' }}>
        {renderInline(node.children || [])}
      </p>
    );
  }
  if (node.type === 'list') {
    const Tag = node.ordered ? 'ol' : 'ul';
    return (
      <Tag key={idx} style={{ margin: '4px 0 6px', paddingLeft: '22px' }}>
        {(node.items || []).map((item, ii) => (
          <li key={ii} style={{ marginBottom: '3px', lineHeight: '1.5', fontSize: '13px' }}>
            {renderInline(item.children || [])}
          </li>
        ))}
      </Tag>
    );
  }
  if (node.type === 'table') {
    return (
      <table key={idx} style={{ borderCollapse: 'collapse', width: '100%', margin: '6px 0', fontSize: '12px' }}>
        <tbody>
          {(node.rows || []).map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ border: '1px solid #000', padding: '4px 8px', verticalAlign: 'top' }}>
                  {renderInline(cell.children || [])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return null;
};

/* ── Rendu structuré style Word – sections plates du parser ── */
const WordSections = ({ sections }) => {
  const isPartie   = (t) => /^partie\s*\d*/i.test((t || '').trim());
  const isExercice = (t) => /^exercice\s*\d*/i.test((t || '').trim());

  return (
    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '13px', color: '#000' }}>
      {sections.map((sec, si) => {
        const title = (sec.title || '').trim();
        const nodes = Array.isArray(sec.contentAst) ? sec.contentAst : [];

        if (isPartie(title)) {
          return (
            <div key={si} style={{ marginTop: '20px' }}>
              <div style={{
                fontWeight: '700', fontSize: '13px', textTransform: 'uppercase',
                borderBottom: '1.5px solid #000', paddingBottom: '3px',
                marginBottom: '10px', color: '#1e4fa8', letterSpacing: '0.04em',
              }}>
                {title}
              </div>
              {nodes.map((node, ni) => renderAstNode(node, ni))}
            </div>
          );
        }

        if (isExercice(title)) {
          return (
            <div key={si} style={{ marginTop: '10px' }}>
              <div style={{ fontWeight: '700', fontSize: '13px', textDecoration: 'underline', marginBottom: '6px', color: '#000' }}>
                {title}
              </div>
              {nodes.map((node, ni) => renderAstNode(node, ni))}
            </div>
          );
        }

        if (title.toLowerCase().includes('en-tête') || title.toLowerCase().includes('instructions')) return null;
        return (
          <div key={si} style={{ marginTop: '10px' }}>
            {title && <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>{title}</div>}
            {nodes.map((node, ni) => renderAstNode(node, ni))}
          </div>
        );
      })}
    </div>
  );
};

/* ── Exam Detail Modal ── */
const ExamModal = ({ exam, isMine, onClose, onDownload, onEdit, onCopy, onDelete }) => {
  const [rawHtml, setRawHtml] = useState('');
  const [loadingQ, setLoadingQ] = useState(false);

  useEffect(() => {
    setRawHtml('');
    if (!exam) return;
    let mounted = true;
    setLoadingQ(true);
    (async () => {
      try {
        const data = await getExamContent(toId(exam.id));
        if (mounted) {
          let html = data?.rawHtml || '';
          html = html.replace(
            /(<p[^>]*>)([^<<]*Feuille[^<<]*◄[^<<]*<<\/p>)/gi,
            '<p style="text-align:right;font-size:10px;color:#888">$2'
          );
          html = html.replace(
            /(<p[^>]*>)((?:[^<<]|<(?!\/p>))*Feuille[^<<]*◄(?:[^<<]|<(?!\/p>))*<<\/p>)/gi,
            (match, tag, content) => {
              const newTag = tag.replace(/style="[^"]*"/, '').replace('<p', '<p style="text-align:right"');
              return newTag + content;
            }
          );

          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          doc.querySelectorAll('table').forEach((table) => {
            const rows = table.querySelectorAll('tr');
            if (rows.length === 0) return;
            let isAnswerTable = true;
            rows.forEach((row) => {
              const cells = row.querySelectorAll('td, th');
              if (cells.length !== 1) { isAnswerTable = false; return; }
              const cellText = (cells[0].textContent || '').trim();
              if (cellText !== '') { isAnswerTable = false; }
            });
            if (!isAnswerTable) return;
            const wrapper = doc.createElement('div');
            wrapper.style.cssText = 'margin: 6px 0 10px 0; width: 100%;';
            rows.forEach(() => {
              const line = doc.createElement('div');
              line.style.cssText = 'border-bottom: 1px dotted #888; height: 20px; width: 100%; margin-top: 4px;';
              wrapper.appendChild(line);
            });
            table.parentNode.replaceChild(wrapper, table);
          });
          html = doc.body.innerHTML;

          setRawHtml(html);
        }
      } catch {
        if (mounted) setRawHtml('');
      } finally {
        if (mounted) setLoadingQ(false);
      }
    })();
    return () => { mounted = false; };
  }, [exam]);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  if (!exam) return null;

  return (
    <div className="eb-modal-overlay" onClick={onClose}>
      <div className="eb-modal eb-modal--wide" onClick={(e) => e.stopPropagation()}>

        {/* Header modal */}
        <div className="eb-modal-header">
          <div className="eb-modal-header-left">
            <div>
              <h2 className="eb-modal-title">{exam.title || 'Examen sans titre'}</h2>
              <div className="eb-modal-meta-row">
                {exam.matiere  && <span className="eb-modal-chip eb-modal-chip--blue">{exam.matiere}</span>}
                {exam.filiere  && <span className="eb-modal-chip">{exam.filiere}</span>}
                {exam.niveau   && <span className="eb-modal-chip">{exam.niveau}</span>}
                {exam.duree    && <span className="eb-modal-chip eb-modal-chip--muted">⏱ {exam.duree}</span>}
                {exam.anneeUniversitaire && <span className="eb-modal-chip eb-modal-chip--gold">{exam.anneeUniversitaire}</span>}
                <StatusBadge value={exam.status} />
              </div>
              {!isMine && exam.createdByName && (
                <div className="eb-modal-by">Par {exam.createdByName}</div>
              )}
            </div>
          </div>
        </div>

        {/* Body — aperçu Word complet (HTML mammoth) */}
        <div className="eb-modal-body eb-modal-body--doc">
          <div style={{ background: '#d9d9d9', padding: '20px', minHeight: '300px', display: 'flex', justifyContent: 'center' }}>
            {loadingQ && (
              <div style={{ background: '#fff', width: '794px', padding: '40px', fontFamily: '"Times New Roman", serif', fontSize: '13px', color: '#888', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}>
                Chargement du contenu…
              </div>
            )}
            {!loadingQ && rawHtml && (
              <div
                className="eb-word-html-content"
                dangerouslySetInnerHTML={{ __html: rawHtml }}
              />
            )}
            {!loadingQ && !rawHtml && (
              <div style={{ background: '#fff', width: '794px', padding: '40px', fontFamily: '"Times New Roman", serif', fontSize: '13px', color: '#888', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}>
                Aucun contenu disponible.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="eb-modal-footer">
          <button className="eb-modal-btn eb-modal-btn--dl" onClick={() => onDownload(exam)} title="Télécharger">
            <FiDownload size={16} />
          </button>
          {isMine ? (
            <>
              <button className="eb-modal-btn eb-modal-btn--edit" onClick={() => { onEdit(exam); onClose(); }} title="Modifier">
                <FiEdit2 size={16} />
              </button>
              {/* ✅ CORRECTION : ferme aussi le modal lors du clic sur Supprimer */}
              <button className="eb-modal-btn eb-modal-btn--del" onClick={() => { onDelete(exam); onClose(); }} title="Supprimer">
                <FiTrash2 size={16} />
              </button>
            </>
          ) : (
            <button className="eb-modal-btn eb-modal-btn--copy" onClick={() => { onCopy(exam); onClose(); }} title="Copier">
              <FiCopy size={16} />
            </button>
          )}
          <button className="eb-modal-btn eb-modal-btn--ghost" onClick={onClose} title="Fermer"><FiX size={16} /></button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════
   ExamBank – page principale
   ══════════════════════════════════════════════════ */
const ExamBank = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [toast, setToast]               = useState({ message: '', type: 'success' });
  const [mesExamens, setMesExamens]     = useState([]);
  const [autresExamens, setAutresExamens] = useState([]);
  const [search, setSearch]             = useState('');
  const [filterMatiere, setFilterMatiere] = useState('');
  const [filterStatus, setFilterStatus] = useState('tous');
  const [filterDepartement, setFilterDepartement] = useState('');
  const [filterFiliere, setFilterFiliere]   = useState('');
  const [filterAnnee, setFilterAnnee]   = useState('');
  const [filterSemestre, setFilterSemestre] = useState('');
  const [activeTab, setActiveTab]       = useState('mes');
  const [pageMes, setPageMes]           = useState(1);
  const [pageAutres, setPageAutres]     = useState(1);
  const [modalExam, setModalExam]       = useState(null);
  const [modalIsMine, setModalIsMine]   = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getExamBank();
        setMesExamens(Array.isArray(data?.mesExamens) ? data.mesExamens : []);
        setAutresExamens(Array.isArray(data?.autresExamens) ? data.autresExamens : []);
      } catch (err) {
        setError(err?.response?.data?.message || "Impossible de charger la banque d'examens");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => { setPageMes(1); setPageAutres(1); }, [search, filterMatiere, filterStatus]);

  /* Quand le département change, reset la filière et l'année */
  useEffect(() => { setFilterFiliere(''); setFilterAnnee(''); setFilterSemestre(''); }, [filterDepartement]);
  
  /* Quand la filière change, reset l'année */
  useEffect(() => { setFilterAnnee(''); setFilterSemestre(''); }, [filterFiliere]);
  useEffect(() => { setFilterSemestre(''); }, [filterAnnee]);
  useEffect(() => { setPageMes(1); setPageAutres(1); }, [search, filterMatiere, filterStatus, filterDepartement, filterFiliere, filterAnnee, filterSemestre]);

  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
    return () => clearTimeout(t);
  }, [toast.message]);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  /* Listes de matières uniques pour le filtre */
  const allMatieres = useMemo(() => {
    const all = [...mesExamens, ...autresExamens].map(e => e.matiere).filter(Boolean);
    return [...new Set(all)].sort();
  }, [mesExamens, autresExamens]);

  const applyBaseFilters = useCallback((items, isMine) => {
    const q  = search.trim().toLowerCase();
    const st = normStatus(filterStatus);
    const m  = filterMatiere.trim().toLowerCase();
    return items.filter((item) => {
      if (isMine && st !== 'tous' && st && normStatus(item.status) !== st) return false;
      if (m && !(item.matiere || '').toLowerCase().includes(m)) return false;
      if (!q) return true;
      return [item.title, item.filiere, item.matiere, item.niveau, item.createdByName, item.createdByEmail]
        .map(v => String(v || '').toLowerCase()).join(' ').includes(q);
    });
  }, [search, filterMatiere, filterStatus]);

  const applyFilters = useCallback((items, isMine) => {
    return applyBaseFilters(items, isMine).filter((item) => {
      if (!matchesDepartement(item, filterDepartement)) return false;
      if (!matchesFiliere(item, filterFiliere)) return false;
      if (!matchesAnnee(item, filterAnnee)) return false;
      if (!matchesSemestre(item, filterSemestre)) return false;
      return true;
    });
  }, [applyBaseFilters, filterDepartement, filterFiliere, filterAnnee, filterSemestre]);

  const myFiltered  = useMemo(() => applyFilters(mesExamens, true),    [applyFilters, mesExamens]);
  const othFiltered = useMemo(() => applyFilters(autresExamens, false), [applyFilters, autresExamens]);

  const myTreeBase  = useMemo(() => applyBaseFilters(mesExamens, true), [applyBaseFilters, mesExamens]);
  const othTreeBase = useMemo(() => applyBaseFilters(autresExamens, false), [applyBaseFilters, autresExamens]);

  const departments = useMemo(() => {
    const source = activeTab === 'mes' ? myTreeBase : othTreeBase;
    const map = new Map();
    source.forEach((exam) => {
      const label = normalizeDepartementLabel(exam);
      // Ignorer les examens sans département
      if (!label || !label.trim()) return;
      const key = getDepartementKey(exam);
        // Filtrer aussi les clés "sans département"
        if (key === '__sans_departement__') return;
      if (!map.has(key)) map.set(key, { key, label, count: 0, items: [] });
      const entry = map.get(key);
      entry.count += 1;
      entry.items.push(exam);
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [activeTab, myTreeBase, othTreeBase]);

  const filieres = useMemo(() => {
    const source = activeTab === 'mes' ? myTreeBase : othTreeBase;
    const deptFiltered = filterDepartement 
      ? source.filter(exam => getDepartementKey(exam) === filterDepartement)
      : source;
    const map = new Map();
    deptFiltered.forEach((exam) => {
      const label = normalizeFiliereLabel(exam);
      // Ignorer les examens sans filière
      if (!label || !label.trim()) return;
      const key = getFiliereKey(exam);
      // Filtrer aussi les clés "sans filière"
      if (key === '__sans_filiere__') return;
      if (!map.has(key)) map.set(key, { key, label, count: 0, items: [] });
      const entry = map.get(key);
      entry.count += 1;
      entry.items.push(exam);
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [activeTab, myTreeBase, othTreeBase, filterDepartement]);

  const myPage  = useMemo(() => myFiltered.slice((pageMes - 1) * PER_PAGE, pageMes * PER_PAGE), [myFiltered, pageMes]);
  const othPage = useMemo(() => othFiltered.slice((pageAutres - 1) * PER_PAGE, pageAutres * PER_PAGE), [othFiltered, pageAutres]);

  const openModal  = (exam, isMine) => { setModalExam(exam); setModalIsMine(isMine); };
  const closeModal = () => setModalExam(null);

  const handleDownload = async (exam) => {
    try {
      const blob = await downloadExamBankFile(toId(exam.id));
      saveBlob(blob, `${String(exam.title || 'examen').replace(/[^a-zA-Z0-9_-]+/g, '_')}.docx`);
      showToast('Téléchargement réussi.');
    } catch {
      showToast('Impossible de télécharger.', 'error');
    }
  };

  const handleEdit = (exam) => {
    navigate(`/enseignant/exams/create?editExam=${toId(exam.id)}`);
  };

  const handleCopy = async (exam) => {
    try {
      const result = await copyExamBankItem(toId(exam.id));
      const copiedId = result.exam?.id || result.exam?._id || toId(exam.id);
      navigate(`/enseignant/exams/create?editExam=${copiedId}`);
      showToast('Copie créée – ouverture en modification.');
    } catch {
      showToast('Erreur lors de la copie.', 'error');
    }
  };

  /* ✅ CORRECTION : ferme l'ExamModal avant d'ouvrir la confirmation de suppression */
  const handleDelete = (exam) => {
    setModalExam(null);   // ← ferme l'aperçu
    setDeleteConfirm(exam);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const id = toId(deleteConfirm.id);
    try {
      await deleteExamBankItem(id);
      setMesExamens(prev => prev.filter(e => toId(e.id) !== id));
      showToast('Examen supprimé.');
    } catch {
      showToast('Impossible de supprimer.', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const resetFilters = () => { setSearch(''); setFilterMatiere(''); setFilterStatus('tous'); setFilterDepartement(''); setFilterFiliere(''); setFilterAnnee(''); setFilterSemestre(''); };
  const hasFilters = search || filterMatiere || filterStatus !== 'tous' || filterDepartement || filterFiliere || filterAnnee || filterSemestre;
  const treeSource = activeTab === 'mes' ? myTreeBase : othTreeBase;

  /* Exclure les examens sans département ET sans filière du compte */
  const validTreeSource = useMemo(() => {
    return treeSource.filter(exam => {
      const deptLabel = normalizeDepartementLabel(exam);
      const filiereLabel = normalizeFiliereLabel(exam);
      return (deptLabel && deptLabel.trim()) || (filiereLabel && filiereLabel.trim());
    });
  }, [treeSource]);

  return (
    <div className="eb-layout">
      <Sidebar roleLabel="Espace enseignant" navItems={enseignantNavItems} profile={buildEnseignantProfile(user)} onLogout={logout} />

      <main className="eb-main">
        {/* Header */}
        <header className="eb-header">
          <div>
            <div className="eb-header-eyebrow">Bibliothèque</div>
            <h2 className="eb-header-title">Banque d'<span>examens</span></h2>
            <p className="eb-header-sub">
              {mesExamens.length} personnel{mesExamens.length !== 1 ? 's' : ''} · {autresExamens.length} partagé{autresExamens.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="eb-btn-new" onClick={() => navigate('/enseignant/exams/create')}>
            + Nouvel examen
          </button>
        </header>

        {/* Filtres */}
        <div className="eb-filters">
          <div className="eb-search-wrap">
            <span className="eb-search-icon">⌕</span>
            <input
              className="eb-search"
              type="text"
              placeholder="Titre, filière, matière, enseignant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="eb-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>

          <select className="eb-select" value={filterMatiere} onChange={(e) => setFilterMatiere(e.target.value)}>
            <option value="">Toutes les matières</option>
            {allMatieres.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select className="eb-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="tous">Tous les statuts</option>
            <option value="exporte">Exporté</option>
            <option value="en cours">En cours</option>
            <option value="brouillon">Brouillon</option>
          </select>

          {hasFilters && (
            <button className="eb-btn-reset" onClick={resetFilters}>✕ Réinitialiser</button>
          )}
        </div>

        {/* Layout 2 colonnes : arborescence + grille */}
        <div className="eb-browser-layout">

          {/* ── Panneau arborescence ── */}
          <aside className="eb-tree-panel">
            <div className="eb-tree-header">
              <span className="eb-tree-header-icon">🗂</span>
              <span>Parcourir</span>
            </div>

            {/* Nœud "Tous" */}
            <button
              className={`eb-tree-all ${!filterDepartement && !filterFiliere ? 'eb-tree-all--active' : ''}`}
              onClick={() => { setFilterDepartement(''); setFilterFiliere(''); setFilterAnnee(''); setFilterSemestre(''); }}
            >
              <span className="eb-tree-all-icon">◈</span>
              Tous les examens
              <span className="eb-tree-count">{validTreeSource.length}</span>
            </button>

            {/* Départements */}
            {departments.map((dept) => {
              const deptOpen = filterDepartement === dept.key;
              const deptItems = dept.items;
              if (deptItems.length === 0) return null;

              return (
                <div key={dept.key} className="eb-tree-department">
                  <button
                    className={`eb-tree-node eb-tree-node--dept ${deptOpen ? 'eb-tree-node--open' : ''}`}
                    onClick={() => {
                      if (deptOpen) { setFilterDepartement(''); setFilterFiliere(''); setFilterAnnee(''); setFilterSemestre(''); }
                      else { setFilterDepartement(dept.key); setFilterFiliere(''); setFilterAnnee(''); setFilterSemestre(''); }
                    }}
                  >
                    <span className="eb-tree-arrow">{deptOpen ? '▾' : '▸'}</span>
                    <span className="eb-tree-icon">🏢</span>
                    <span className="eb-tree-node-label">{dept.label}</span>
                    <span className="eb-tree-count">{dept.count}</span>
                  </button>

                  {/* Filières (sous département) */}
                  {deptOpen && filieres.map((filiere) => {
                    const filiereOpen = filterFiliere === filiere.key;
                    const filiereItems = filiere.items;
                    if (filiereItems.length === 0) return null;

                    return (
                      <div key={filiere.key} className="eb-tree-filiere">
                        <button
                          className={`eb-tree-node eb-tree-node--filiere ${filiereOpen ? 'eb-tree-node--open' : ''}`}
                          onClick={() => {
                            if (filiereOpen) { setFilterFiliere(''); setFilterAnnee(''); setFilterSemestre(''); }
                            else { setFilterFiliere(filiere.key); setFilterAnnee(''); setFilterSemestre(''); }
                          }}
                        >
                          <span className="eb-tree-arrow">{filiereOpen ? '▾' : '▸'}</span>
                          <span className="eb-tree-icon">📘</span>
                          <span className="eb-tree-node-label">{filiere.label}</span>
                          <span className="eb-tree-count">{filiere.count}</span>
                        </button>

                        {/* Années */}
                        {filiereOpen && ANNEES_PAR_CYCLE.default.map((annee) => {
                          const anneeItems = filiereItems.filter(e => matchesAnnee(e, annee));
                          if (anneeItems.length === 0) return null;
                          const anneeOpen = filterAnnee === annee;

                          return (
                            <div key={annee} className="eb-tree-annee">
                              <button
                                className={`eb-tree-node eb-tree-node--annee ${anneeOpen ? 'eb-tree-node--open' : ''}`}
                                onClick={() => {
                                  if (anneeOpen) { setFilterAnnee(''); setFilterSemestre(''); }
                                  else { setFilterAnnee(annee); setFilterSemestre(''); }
                                }}
                              >
                                <span className="eb-tree-arrow">{anneeOpen ? '▾' : '▸'}</span>
                                <span className="eb-tree-icon">📁</span>
                                <span className="eb-tree-node-label">{annee}</span>
                                <span className="eb-tree-count">{anneeItems.length}</span>
                              </button>

                              {/* Semestres */}
                              {anneeOpen && SEMESTRES.map((sem) => {
                                const semItems = anneeItems.filter(e => matchesSemestre(e, sem));
                                if (semItems.length === 0) return null;
                                const semActive = filterSemestre === sem;

                                return (
                                  <button
                                    key={sem}
                                    className={`eb-tree-node eb-tree-node--sem ${semActive ? 'eb-tree-node--active' : ''}`}
                                    onClick={() => setFilterSemestre(semActive ? '' : sem)}
                                  >
                                    <span className="eb-tree-arrow eb-tree-arrow--leaf">—</span>
                                    <span className="eb-tree-icon">📄</span>
                                    <span className="eb-tree-node-label">{sem}</span>
                                    <span className="eb-tree-count">{semItems.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </aside>

          {/* ── Zone principale ── */}
          <div className="eb-browser-content">

            {/* Onglets */}
            <div className="eb-tabs">
              <button className={`eb-tab ${activeTab === 'mes' ? 'eb-tab--active' : ''}`} onClick={() => setActiveTab('mes')}>
                Mes examens <span className="eb-tab-count">{myFiltered.length}</span>
              </button>
              <button className={`eb-tab ${activeTab === 'autres' ? 'eb-tab--active' : ''}`} onClick={() => setActiveTab('autres')}>
                Examens partagés <span className="eb-tab-count">{othFiltered.length}</span>
              </button>
            </div>

            {/* Fil d'Ariane */}
            {(filterDepartement || filterFiliere || filterAnnee || filterSemestre) && (
              <div className="eb-breadcrumb">
                <button className="eb-bc-item eb-bc-item--link" onClick={() => { setFilterDepartement(''); setFilterFiliere(''); setFilterAnnee(''); setFilterSemestre(''); }}>
                  Tous
                </button>
                {filterDepartement && (
                  <>
                    <span className="eb-bc-sep">›</span>
                    <button className="eb-bc-item eb-bc-item--link" onClick={() => { setFilterFiliere(''); setFilterAnnee(''); setFilterSemestre(''); }}>
                      {departments.find(d => d.key === filterDepartement)?.label || 'Département'}
                    </button>
                  </>
                )}
                {filterFiliere && (
                  <>
                    <span className="eb-bc-sep">›</span>
                    <button className="eb-bc-item eb-bc-item--link" onClick={() => { setFilterAnnee(''); setFilterSemestre(''); }}>
                      {filieres.find(f => f.key === filterFiliere)?.label || 'Filière'}
                    </button>
                  </>
                )}
                {filterAnnee && (
                  <>
                    <span className="eb-bc-sep">›</span>
                    <button className="eb-bc-item eb-bc-item--link" onClick={() => setFilterSemestre('')}>
                      {filterAnnee}
                    </button>
                  </>
                )}
                {filterSemestre && (
                  <>
                    <span className="eb-bc-sep">›</span>
                    <span className="eb-bc-item eb-bc-item--current">{filterSemestre}</span>
                  </>
                )}
              </div>
            )}

            {error && <div className="eb-alert eb-alert--error">{error}</div>}

            {loading ? (
              <div className="eb-loading">
                <div className="eb-loading-dots"><span /><span /><span /></div>
                <p>Chargement des examens…</p>
              </div>
            ) : (
              <>
                {(activeTab === 'mes' ? myPage : othPage).length === 0 ? (
                  <div className="eb-empty">
                    <div className="eb-empty-icon">📂</div>
                    <p className="eb-empty-msg">
                      {hasFilters ? 'Aucun résultat pour ces filtres.' : activeTab === 'mes' ? 'Aucun examen personnel.' : 'Aucun examen partagé.'}
                    </p>
                    {hasFilters && <button className="eb-btn-reset" onClick={resetFilters}>Réinitialiser les filtres</button>}
                    {!hasFilters && activeTab === 'mes' && (
                      <button className="eb-btn-new" style={{ marginTop: '12px' }} onClick={() => navigate('/enseignant/exams/create')}>
                        Créer mon premier examen
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="eb-cards-grid">
                    {(activeTab === 'mes' ? myPage : othPage).map((exam) => (
                      <ExamCard
                        key={toId(exam.id)}
                        exam={exam}
                        isMine={activeTab === 'mes'}
                        onOpen={(e) => openModal(e, activeTab === 'mes')}
                      />
                    ))}
                  </div>
                )}

                {activeTab === 'mes' ? (
                  <Pagination page={pageMes} total={Math.ceil(myFiltered.length / PER_PAGE)} onChange={setPageMes} />
                ) : (
                  <Pagination page={pageAutres} total={Math.ceil(othFiltered.length / PER_PAGE)} onChange={setPageAutres} />
                )}

                {(activeTab === 'mes' ? myFiltered : othFiltered).length > 0 && (
                  <p className="eb-count-label">
                    {activeTab === 'mes'
                      ? `${Math.min((pageMes - 1) * PER_PAGE + 1, myFiltered.length)}–${Math.min(pageMes * PER_PAGE, myFiltered.length)} sur ${myFiltered.length} examen(s)`
                      : `${Math.min((pageAutres - 1) * PER_PAGE + 1, othFiltered.length)}–${Math.min(pageAutres * PER_PAGE, othFiltered.length)} sur ${othFiltered.length} examen(s)`
                    }
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <Toast message={toast.message} type={toast.type} />
      </main>

      {/* ✅ Les modals sont rendues en dehors du <main> mais dans le même layout */}
      <ExamModal
        exam={modalExam}
        isMine={modalIsMine}
        onClose={closeModal}
        onDownload={handleDownload}
        onEdit={handleEdit}
        onCopy={handleCopy}
        onDelete={handleDelete}
      />

      {deleteConfirm && (
        <DeleteModal
          exam={deleteConfirm}
          onConfirm={confirmDelete}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default ExamBank;