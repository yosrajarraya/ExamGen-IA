import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

/* â”€â”€ Helpers â”€â”€ */
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
  catch { return 'â€”'; }
};

const STATUS_CONFIG = {
  exporte:    { label: 'ExportÃ©',   cls: 'exported' },
  'en cours': { label: 'En cours',  cls: 'ongoing'  },
  brouillon:  { label: 'Brouillon', cls: 'draft'    },
};

const PER_PAGE = 9; // 3 colonnes Ã— 3 lignes

/* â”€â”€ Filtre structurÃ© : Cycle â†’ AnnÃ©e â†’ Semestre â”€â”€ */
const CYCLES = [
  { id: 'licence',      label: 'Licence',              icon: 'ðŸŽ“' },
  { id: 'master',       label: 'Master / MastÃ¨re',     icon: 'ðŸ“š' },
  { id: 'ingenieur',    label: 'IngÃ©nieur',             icon: 'âš™ï¸' },
  { id: 'prepa',        label: 'Cycle PrÃ©paratoire',   icon: 'ðŸ“' },
  { id: 'architecture', label: 'Architecture',          icon: 'ðŸ›' },
];

const ANNEES_PAR_CYCLE = {
  licence:      ['1Ã¨re annÃ©e', '2Ã¨me annÃ©e', '3Ã¨me annÃ©e'],
  master:       ['1Ã¨re annÃ©e', '2Ã¨me annÃ©e'],
  ingenieur:    ['1Ã¨re annÃ©e', '2Ã¨me annÃ©e', '3Ã¨me annÃ©e'],
  prepa:        ['1Ã¨re annÃ©e', '2Ã¨me annÃ©e'],
  architecture: ['1Ã¨re annÃ©e', '2Ã¨me annÃ©e', '3Ã¨me annÃ©e', '4Ã¨me annÃ©e', '5Ã¨me annÃ©e'],
};

const SEMESTRES = ['Semestre 1', 'Semestre 2'];

/* Normalise une chaÃ®ne : minuscules + supprime les accents */
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/* Mots-clÃ©s pour dÃ©tecter le cycle dans les champs filiÃ¨re/discipline/niveau */
const CYCLE_KEYWORDS = {
  licence:      ['licence', 'license', 'glid', 'msi', 'genie logiciel', 'management des systemes'],
  master:       ['master', 'mastere', 'intelligence artificielle', 'cybersecurite', 'cloud'],
  ingenieur:    ['ingenieur', 'genie informatique', 'genie civil', 'genie mecanique', 'genie industriel', 'genie des procedes'],
  prepa:        ['preparatoire', 'prepa'],
  architecture: ['architecture'],
};

const ANNEE_KEYWORDS = {
  '1Ã¨re annÃ©e': ['1ere', '1re', 'premiere', '1ere annee'],
  '2Ã¨me annÃ©e': ['2eme', 'deuxieme', '2eme annee'],
  '3Ã¨me annÃ©e': ['3eme', 'troisieme', '3eme annee'],
  '4Ã¨me annÃ©e': ['4eme', '4eme annee'],
  '5Ã¨me annÃ©e': ['5eme', '5eme annee'],
};

const matchesCycle = (exam, cycleId) => {
  if (!cycleId) return true;
  const haystack = norm(
    [exam.filiere, exam.discipline, exam.niveau, exam.title].join(' ')
  );
  return (CYCLE_KEYWORDS[cycleId] || []).some(kw => haystack.includes(kw));
};

const matchesAnnee = (exam, annee) => {
  if (!annee) return true;
  const haystack = norm(
    [exam.filiere, exam.discipline, exam.niveau].join(' ')
  );
  return (ANNEE_KEYWORDS[annee] || []).some(kw => haystack.includes(kw));
};

const matchesSemestre = (exam, semestre) => {
  if (!semestre) return true;
  const s = norm(exam.semestre || '');
  if (!s) return false; // pas de semestre enregistre, ne correspond a aucun filtre
  const num = semestre === 'Semestre 1' ? '1' : '2';
  return (
    s === num ||
    s === `semestre ${num}` ||
    s === `s${num}` ||
    s === `semestre${num}`
  );
};

/* â”€â”€ Sub-components â”€â”€ */
const Toast = ({ message, type }) =>
  message ? <div className={`eb-toast eb-toast--${type}`}>{message}</div> : null;

const StatusBadge = ({ value }) => {
  const cfg = STATUS_CONFIG[normStatus(value)] || { label: value || 'â€”', cls: 'draft' };
  return <span className={`eb-status eb-status--${cfg.cls}`}>{cfg.label}</span>;
};

const Pagination = ({ page, total, onChange }) => {
  if (total <= 1) return null;
  return (
    <div className="eb-pagination">
      <button className="eb-page-btn" onClick={() => onChange(page - 1)} disabled={page === 1}>â† PrÃ©cÃ©dent</button>
      <div className="eb-page-nums">
        {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
          <button key={p} className={`eb-page-num ${p === page ? 'eb-page-num--active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        ))}
      </div>
      <button className="eb-page-btn" onClick={() => onChange(page + 1)} disabled={page === total}>Suivant â†’</button>
    </div>
  );
};

/* â”€â”€ Exam Card â”€â”€ */
const ExamCard = ({ exam, isMine, onOpen }) => {
  const status = normStatus(exam.status);
  const cfg = STATUS_CONFIG[status] || { label: exam.status || 'â€”', cls: 'draft' };
  return (
    <div className="eb-card" onClick={() => onOpen(exam)}>
      <div className="eb-card-top">
        <span className={`eb-card-status eb-status--${cfg.cls}`}>{cfg.label}</span>
        {!isMine && <span className="eb-card-author">{exam.createdByName || 'Professeur'}</span>}
      </div>
      <h3 className="eb-card-title">{exam.title || 'Examen sans titre'}</h3>
      <div className="eb-card-tags">
        {exam.matiere && <span className="eb-tag eb-tag--blue">{exam.matiere}</span>}
        {exam.filiere && <span className="eb-tag">{exam.filiere}</span>}
        {exam.niveau  && <span className="eb-tag eb-tag--level">{exam.niveau}</span>}
      </div>
      <div className="eb-card-meta">
        {exam.duree && <span>â± {exam.duree}</span>}
        {exam.anneeUniversitaire && <span>ðŸ“… {exam.anneeUniversitaire}</span>}
        {exam.noteTotale > 0 && <span>/{exam.noteTotale} pts</span>}
      </div>
      <div className="eb-card-footer">
        <span className="eb-card-date">{formatDate(exam.createdAt)}</span>
        <span className="eb-card-cta">Voir â†’</span>
      </div>
    </div>
  );
};

/* â”€â”€ Extrait le texte d'un nÅ“ud AST â”€â”€ */
const extractTextFromAstNode = (node) => {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.children)) return node.children.map(extractTextFromAstNode).join('');
  if (node.type === 'list') return (node.items || []).map(item => (item.children || []).map(extractTextFromAstNode).join('')).join(' ');
  if (node.type === 'table') return (node.rows || []).flat().map(cell => (cell.children || []).map(extractTextFromAstNode).join('')).join(' ');
  return '';
};

/* â”€â”€ Rendu AST inline â”€â”€ */
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

/* â”€â”€ Rendu d'un nÅ“ud AST â”€â”€ */
const renderAstNode = (node, idx) => {
  if (!node) return null;
  const text = extractTextFromAstNode(node).trim();

  if (node.type === 'paragraph' || node.type === 'heading') {
    if (!text) return null;
    // Ligne de réponse (tirets/underscores)
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

/* â”€â”€ Rendu structurÃ© style Word â€” sections plates du parser â”€â”€ */
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

        // Autre section (ne pas afficher l'en-tÃªte)
        if (title.toLowerCase().includes('en-tÃªte') || title.toLowerCase().includes('instructions')) return null;
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
          // Force right-align on any paragraph containing "Feuille"
          html = html.replace(
            /(<p[^>]*>)([^<]*Feuille[^<]*◄[^<]*<\/p>)/gi,
            '<p style="text-align:right;font-size:10px;color:#888">$2'
          );
          // Also handle: <p ...>Feuille d'énoncé ◄</p> with any style
          html = html.replace(
            /(<p[^>]*>)((?:[^<]|<(?!\/p>))*Feuille[^<]*◄(?:[^<]|<(?!\/p>))*<\/p>)/gi,
            (match, tag, content) => {
              const newTag = tag.replace(/style="[^"]*"/, '').replace('<p', '<p style="text-align:right"');
              return newTag + content;
            }
          );

          // ── Convertir les tableaux de lignes de réponse en divs pointillés ──
          // Mammoth convertit notre Table(bNone+dotted-bottom) en <table> avec bordures visibles
          // On détecte ces tableaux via le DOM et on les remplace par des divs propres
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          doc.querySelectorAll('table').forEach((table) => {
            const rows = table.querySelectorAll('tr');
            if (rows.length === 0) return;
            // Vérifie si TOUTES les cellules ont une seule colonne et sont vides (lignes de réponse)
            let isAnswerTable = true;
            rows.forEach((row) => {
              const cells = row.querySelectorAll('td, th');
              if (cells.length !== 1) { isAnswerTable = false; return; }
              const cellText = (cells[0].textContent || '').trim();
              if (cellText !== '') { isAnswerTable = false; }
            });
            if (!isAnswerTable) return;
            // Remplacer le tableau par des divs lignes pointillées
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
            <div className="eb-modal-icon">📄</div>
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
          <button className="eb-modal-close" onClick={onClose}>✕</button>
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
          <button className="eb-modal-btn eb-modal-btn--dl" onClick={() => onDownload(exam)}>
            ↓ Télécharger .docx
          </button>
          {isMine ? (
            <>
              <button className="eb-modal-btn eb-modal-btn--edit" onClick={() => { onEdit(exam); onClose(); }}>
                ✏️ Modifier
              </button>
              <button className="eb-modal-btn eb-modal-btn--del" onClick={() => { onDelete(exam); onClose(); }}>
                🗑 Supprimer
              </button>
            </>
          ) : (
            <button className="eb-modal-btn eb-modal-btn--copy" onClick={() => { onCopy(exam); onClose(); }}>
              📋 Copier et modifier
            </button>
          )}
          <button className="eb-modal-btn eb-modal-btn--ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ExamBank â€” page principale
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
  const [filterCycle, setFilterCycle]   = useState('');
  const [filterAnnee, setFilterAnnee]   = useState('');
  const [filterSemestre, setFilterSemestre] = useState('');
  const [activeTab, setActiveTab]       = useState('mes');
  const [pageMes, setPageMes]           = useState(1);
  const [pageAutres, setPageAutres]     = useState(1);
  const [modalExam, setModalExam]       = useState(null);
  const [modalIsMine, setModalIsMine]   = useState(true);

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

  /* Quand le cycle change, reset l'annÃ©e */
  useEffect(() => { setFilterAnnee(''); setFilterSemestre(''); }, [filterCycle]);
  useEffect(() => { setFilterSemestre(''); }, [filterAnnee]);
  useEffect(() => { setPageMes(1); setPageAutres(1); }, [search, filterMatiere, filterStatus, filterCycle, filterAnnee, filterSemestre]);

  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
    return () => clearTimeout(t);
  }, [toast.message]);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  /* Listes de matiÃ¨res uniques pour le filtre */
  const allMatieres = useMemo(() => {
    const all = [...mesExamens, ...autresExamens].map(e => e.matiere).filter(Boolean);
    return [...new Set(all)].sort();
  }, [mesExamens, autresExamens]);

  const applyFilters = useCallback((items, isMine) => {
    const q  = search.trim().toLowerCase();
    const st = normStatus(filterStatus);
    const m  = filterMatiere.trim().toLowerCase();
    return items.filter((item) => {
      if (isMine && st !== 'tous' && st && normStatus(item.status) !== st) return false;
      if (m && !(item.matiere || '').toLowerCase().includes(m)) return false;
      if (!matchesCycle(item, filterCycle)) return false;
      if (!matchesAnnee(item, filterAnnee)) return false;
      if (!matchesSemestre(item, filterSemestre)) return false;
      if (!q) return true;
      return [item.title, item.filiere, item.matiere, item.niveau, item.createdByName, item.createdByEmail]
        .map(v => String(v || '').toLowerCase()).join(' ').includes(q);
    });
  }, [search, filterMatiere, filterStatus, filterCycle, filterAnnee, filterSemestre]);

  const myFiltered  = useMemo(() => applyFilters(mesExamens, true),    [applyFilters, mesExamens]);
  const othFiltered = useMemo(() => applyFilters(autresExamens, false), [applyFilters, autresExamens]);

  const myPage  = useMemo(() => myFiltered.slice((pageMes - 1) * PER_PAGE, pageMes * PER_PAGE), [myFiltered, pageMes]);
  const othPage = useMemo(() => othFiltered.slice((pageAutres - 1) * PER_PAGE, pageAutres * PER_PAGE), [othFiltered, pageAutres]);

  const openModal  = (exam, isMine) => { setModalExam(exam); setModalIsMine(isMine); };
  const closeModal = () => setModalExam(null);

  const handleDownload = async (exam) => {
    try {
      const blob = await downloadExamBankFile(toId(exam.id));
      saveBlob(blob, `${String(exam.title || 'examen').replace(/[^a-zA-Z0-9_-]+/g, '_')}.docx`);
      showToast('TÃ©lÃ©chargement rÃ©ussi.');
    } catch {
      showToast('Impossible de tÃ©lÃ©charger.', 'error');
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
      showToast('Copie crÃ©Ã©e â€” ouverture en modification.');
    } catch {
      showToast('Erreur lors de la copie.', 'error');
    }
  };

  const handleDelete = async (exam) => {
    if (!window.confirm(`Supprimer dÃ©finitivement "${exam.title || 'cet examen'}" ?`)) return;
    const id = toId(exam.id);
    try {
      await deleteExamBankItem(id);
      setMesExamens(prev => prev.filter(e => toId(e.id) !== id));
      showToast('Examen supprimÃ©.');
    } catch {
      showToast('Impossible de supprimer.', 'error');
    }
  };

  const resetFilters = () => { setSearch(''); setFilterMatiere(''); setFilterStatus('tous'); setFilterCycle(''); setFilterAnnee(''); setFilterSemestre(''); };
  const hasFilters = search || filterMatiere || filterStatus !== 'tous' || filterCycle || filterAnnee || filterSemestre;

  return (
    <div className="eb-layout">
      <Sidebar roleLabel="Espace enseignant" navItems={enseignantNavItems} profile={buildEnseignantProfile(user)} onLogout={logout} />

      <main className="eb-main">
        {/* Header */}
        <header className="eb-header">
          <div>
            <div className="eb-header-eyebrow">BibliothÃ¨que</div>
            <h2 className="eb-header-title">Banque d'<span>examens</span></h2>
            <p className="eb-header-sub">
              {mesExamens.length} personnel{mesExamens.length !== 1 ? 's' : ''} Â· {autresExamens.length} partagÃ©{autresExamens.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="eb-btn-new" onClick={() => navigate('/enseignant/exams/create')}>
            + Nouvel examen
          </button>
        </header>

        {/* Filtres */}
        <div className="eb-filters">
          <div className="eb-search-wrap">
            <span className="eb-search-icon">âŒ•</span>
            <input
              className="eb-search"
              type="text"
              placeholder="Titre, filiÃ¨re, matiÃ¨re, enseignantâ€¦"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="eb-search-clear" onClick={() => setSearch('')}>âœ•</button>}
          </div>

          <select className="eb-select" value={filterMatiere} onChange={(e) => setFilterMatiere(e.target.value)}>
            <option value="">Toutes les matiÃ¨res</option>
            {allMatieres.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select className="eb-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="tous">Tous les statuts</option>
            <option value="exporte">ExportÃ©</option>
            <option value="en cours">En cours</option>
            <option value="brouillon">Brouillon</option>
          </select>

          {hasFilters && (
            <button className="eb-btn-reset" onClick={resetFilters}>âœ• RÃ©initialiser</button>
          )}
        </div>

        {/* Layout 2 colonnes : arborescence + grille */}
        <div className="eb-browser-layout">

          {/* â”€â”€ Panneau arborescence â”€â”€ */}
          <aside className="eb-tree-panel">
            <div className="eb-tree-header">
              <span className="eb-tree-header-icon">ðŸ—‚</span>
              <span>Parcourir</span>
            </div>

            {/* NÅ“ud "Tous" */}
            <button
              className={`eb-tree-all ${!filterCycle ? 'eb-tree-all--active' : ''}`}
              onClick={() => { setFilterCycle(''); setFilterAnnee(''); setFilterSemestre(''); }}
            >
              <span className="eb-tree-all-icon">â—ˆ</span>
              Tous les examens
              <span className="eb-tree-count">{(activeTab === 'mes' ? myFiltered : othFiltered).length}</span>
            </button>

            {/* Cycles */}
            {CYCLES.map((cycle) => {
              const cycleOpen = filterCycle === cycle.id;
              const cycleItems = (activeTab === 'mes' ? mesExamens : autresExamens)
                .filter(e => matchesCycle(e, cycle.id));
              if (cycleItems.length === 0) return null;

              return (
                <div key={cycle.id} className="eb-tree-cycle">
                  <button
                    className={`eb-tree-node eb-tree-node--cycle ${cycleOpen ? 'eb-tree-node--open' : ''}`}
                    onClick={() => {
                      if (cycleOpen) { setFilterCycle(''); setFilterAnnee(''); setFilterSemestre(''); }
                      else { setFilterCycle(cycle.id); setFilterAnnee(''); setFilterSemestre(''); }
                    }}
                  >
                    <span className="eb-tree-arrow">{cycleOpen ? 'â–¾' : 'â–¸'}</span>
                    <span className="eb-tree-icon">{cycle.icon}</span>
                    <span className="eb-tree-node-label">{cycle.label}</span>
                    <span className="eb-tree-count">{cycleItems.length}</span>
                  </button>

                  {/* AnnÃ©es */}
                  {cycleOpen && (ANNEES_PAR_CYCLE[cycle.id] || []).map((annee) => {
                    const anneeItems = cycleItems.filter(e => matchesAnnee(e, annee));
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
                          <span className="eb-tree-arrow">{anneeOpen ? 'â–¾' : 'â–¸'}</span>
                          <span className="eb-tree-icon">ðŸ“</span>
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
                              <span className="eb-tree-arrow eb-tree-arrow--leaf">â€”</span>
                              <span className="eb-tree-icon">ðŸ“„</span>
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
          </aside>

          {/* â”€â”€ Zone principale â”€â”€ */}
          <div className="eb-browser-content">

            {/* Onglets */}
            <div className="eb-tabs">
              <button className={`eb-tab ${activeTab === 'mes' ? 'eb-tab--active' : ''}`} onClick={() => setActiveTab('mes')}>
                Mes examens <span className="eb-tab-count">{myFiltered.length}</span>
              </button>
              <button className={`eb-tab ${activeTab === 'autres' ? 'eb-tab--active' : ''}`} onClick={() => setActiveTab('autres')}>
                Examens partagÃ©s <span className="eb-tab-count">{othFiltered.length}</span>
              </button>
            </div>

            {/* Fil d'Ariane */}
            {(filterCycle || filterAnnee || filterSemestre) && (
              <div className="eb-breadcrumb">
                <button className="eb-bc-item eb-bc-item--link" onClick={() => { setFilterCycle(''); setFilterAnnee(''); setFilterSemestre(''); }}>
                  Tous
                </button>
                {filterCycle && (
                  <>
                    <span className="eb-bc-sep">â€º</span>
                    <button className="eb-bc-item eb-bc-item--link" onClick={() => { setFilterAnnee(''); setFilterSemestre(''); }}>
                      {CYCLES.find(c => c.id === filterCycle)?.label}
                    </button>
                  </>
                )}
                {filterAnnee && (
                  <>
                    <span className="eb-bc-sep">â€º</span>
                    <button className="eb-bc-item eb-bc-item--link" onClick={() => setFilterSemestre('')}>
                      {filterAnnee}
                    </button>
                  </>
                )}
                {filterSemestre && (
                  <>
                    <span className="eb-bc-sep">â€º</span>
                    <span className="eb-bc-item eb-bc-item--current">{filterSemestre}</span>
                  </>
                )}
              </div>
            )}

            {error && <div className="eb-alert eb-alert--error">{error}</div>}

            {loading ? (
              <div className="eb-loading">
                <div className="eb-loading-dots"><span /><span /><span /></div>
                <p>Chargement des examensâ€¦</p>
              </div>
            ) : (
              <>
                {(activeTab === 'mes' ? myPage : othPage).length === 0 ? (
                  <div className="eb-empty">
                    <div className="eb-empty-icon">ðŸ“‚</div>
                    <p className="eb-empty-msg">
                      {hasFilters ? 'Aucun rÃ©sultat pour ces filtres.' : activeTab === 'mes' ? 'Aucun examen personnel.' : 'Aucun examen partagÃ©.'}
                    </p>
                    {hasFilters && <button className="eb-btn-reset" onClick={resetFilters}>RÃ©initialiser les filtres</button>}
                    {!hasFilters && activeTab === 'mes' && (
                      <button className="eb-btn-new" style={{ marginTop: '12px' }} onClick={() => navigate('/enseignant/exams/create')}>
                        CrÃ©er mon premier examen
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
                      ? `${Math.min((pageMes - 1) * PER_PAGE + 1, myFiltered.length)}â€“${Math.min(pageMes * PER_PAGE, myFiltered.length)} sur ${myFiltered.length} examen(s)`
                      : `${Math.min((pageAutres - 1) * PER_PAGE + 1, othFiltered.length)}â€“${Math.min(pageAutres * PER_PAGE, othFiltered.length)} sur ${othFiltered.length} examen(s)`
                    }
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <Toast message={toast.message} type={toast.type} />
      </main>

      <ExamModal
        exam={modalExam}
        isMine={modalIsMine}
        onClose={closeModal}
        onDownload={handleDownload}
        onEdit={handleEdit}
        onCopy={handleCopy}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ExamBank;
