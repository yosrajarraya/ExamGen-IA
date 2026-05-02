import { useEffect, useMemo, useState } from 'react';
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
import ASTRenderer from './ASTRenderer';

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
  catch { return '—'; }
};

const STATUS_CONFIG = {
  exporte:    { label: 'Exporté',   cls: 'exported' },
  'en cours': { label: 'En cours',  cls: 'ongoing'  },
  brouillon:  { label: 'Brouillon', cls: 'draft'    },
};

const PER_PAGE = 9; // 3 colonnes × 3 lignes

/* ── Filtre structuré : Cycle → Année → Semestre ── */
const CYCLES = [
  { id: 'licence',      label: 'Licence',              icon: '🎓' },
  { id: 'master',       label: 'Master / Mastère',     icon: '📚' },
  { id: 'ingenieur',    label: 'Ingénieur',             icon: '⚙️' },
  { id: 'prepa',        label: 'Cycle Préparatoire',   icon: '📐' },
  { id: 'architecture', label: 'Architecture',          icon: '🏛' },
];

const ANNEES_PAR_CYCLE = {
  licence:      ['1ère année', '2ème année', '3ème année'],
  master:       ['1ère année', '2ème année'],
  ingenieur:    ['1ère année', '2ème année', '3ème année'],
  prepa:        ['1ère année', '2ème année'],
  architecture: ['1ère année', '2ème année', '3ème année', '4ème année', '5ème année'],
};

const SEMESTRES = ['Semestre 1', 'Semestre 2'];

/* Normalise une chaîne : minuscules + supprime les accents */
const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/* Mots-clés pour détecter le cycle dans les champs filière/discipline/niveau */
const CYCLE_KEYWORDS = {
  licence:      ['licence', 'license', 'glid', 'msi', 'genie logiciel', 'management des systemes'],
  master:       ['master', 'mastere', 'intelligence artificielle', 'cybersecurite', 'cloud'],
  ingenieur:    ['ingenieur', 'genie informatique', 'genie civil', 'genie mecanique', 'genie industriel', 'genie des procedes'],
  prepa:        ['preparatoire', 'prepa'],
  architecture: ['architecture'],
};

const ANNEE_KEYWORDS = {
  '1ère année': ['1ere', '1re', 'premiere', '1ere annee'],
  '2ème année': ['2eme', 'deuxieme', '2eme annee'],
  '3ème année': ['3eme', 'troisieme', '3eme annee'],
  '4ème année': ['4eme', '4eme annee'],
  '5ème année': ['5eme', '5eme annee'],
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
  if (!s) return false; // pas de semestre enregistré → ne correspond à aucun filtre
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
  const cfg = STATUS_CONFIG[normStatus(value)] || { label: value || '—', cls: 'draft' };
  return <span className={`eb-status eb-status--${cfg.cls}`}>{cfg.label}</span>;
};

const Pagination = ({ page, total, onChange }) => {
  if (total <= 1) return null;
  return (
    <div className="eb-pagination">
      <button className="eb-page-btn" onClick={() => onChange(page - 1)} disabled={page === 1}>← Précédent</button>
      <div className="eb-page-nums">
        {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
          <button key={p} className={`eb-page-num ${p === page ? 'eb-page-num--active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        ))}
      </div>
      <button className="eb-page-btn" onClick={() => onChange(page + 1)} disabled={page === total}>Suivant →</button>
    </div>
  );
};

/* ── Exam Card ── */
const ExamCard = ({ exam, isMine, onOpen }) => {
  const status = normStatus(exam.status);
  const cfg = STATUS_CONFIG[status] || { label: exam.status || '—', cls: 'draft' };
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

/* ── Exam Detail Modal ── */
const ExamModal = ({ exam, isMine, onClose, onDownload, onEdit, onCopy, onDelete }) => {
  const [sections, setSections] = useState([]);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docError, setDocError] = useState('');

  useEffect(() => {
    setSections([]); setDocError('');
    if (!exam) return;
    let mounted = true;
    setLoadingDoc(true);
    (async () => {
      try {
        const data = await getExamContent(toId(exam.id));
        if (mounted) setSections(Array.isArray(data?.sections) ? data.sections : []);
      } catch {
        if (mounted) setDocError("Impossible d'afficher le contenu.");
      } finally {
        if (mounted) setLoadingDoc(false);
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

        {/* Header */}
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

        {/* Body — contenu de l'examen */}
        <div className="eb-modal-body eb-modal-body--doc">
          {loadingDoc && (
            <div className="eb-modal-loading">
              <div className="eb-loading-dots"><span /><span /><span /></div>
              <p>Chargement du contenu…</p>
            </div>
          )}
          {docError && <div className="eb-modal-doc-error">{docError}</div>}
          {!loadingDoc && !docError && sections.length === 0 && (
            <div className="eb-modal-no-content">
              <p>Aucun contenu disponible.</p>
              <p>Téléchargez le fichier .docx pour le consulter.</p>
            </div>
          )}
          {!loadingDoc && !docError && sections.length > 0 && (
            <div className="eb-exam-content">
              {/* Méta-données */}
              <div className="eb-exam-meta-grid">
                <div><strong>Matière</strong><span>{exam.matiere || '—'}</span></div>
                <div><strong>Filière</strong><span>{exam.filiere || '—'}</span></div>
                <div><strong>Niveau</strong><span>{exam.niveau || '—'}</span></div>
                <div><strong>Durée</strong><span>{exam.duree || '—'}</span></div>
                <div><strong>Année</strong><span>{exam.anneeUniversitaire || '—'}</span></div>
                <div><strong>Créé par</strong><span>{exam.createdByName || '—'}</span></div>
              </div>
              {/* Sections / questions */}
              <div className="eb-exam-sections">
                {sections.map((sec, si) => (
                  <div key={si} className="eb-exam-section">
                    <div className="eb-exam-section-title">
                      Partie {si + 1}{sec.title ? ` — ${sec.title}` : ''}
                    </div>
                    {Array.isArray(sec.contentAst) && sec.contentAst.length > 0 ? (
                      <div className="eb-exam-section-ast">
                        <ASTRenderer nodes={sec.contentAst} />
                      </div>
                    ) : Array.isArray(sec.content) && sec.content.length > 0 ? (
                      <ol className="eb-exam-lines">
                        {sec.content.filter(l => l?.trim()).map((line, li) => (
                          <li key={li} className="eb-exam-line">{line}</li>
                        ))}
                      </ol>
                    ) : (
                      <p className="eb-exam-empty-sec">Section vide</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
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

/* ══════════════════════════════════════
   ExamBank — page principale
   ══════════════════════════════════════ */
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

  /* Quand le cycle change, reset l'année */
  useEffect(() => { setFilterAnnee(''); setFilterSemestre(''); }, [filterCycle]);
  useEffect(() => { setFilterSemestre(''); }, [filterAnnee]);
  useEffect(() => { setPageMes(1); setPageAutres(1); }, [search, filterMatiere, filterStatus, filterCycle, filterAnnee, filterSemestre]);

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

  const applyFilters = (items, isMine) => {
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
  };

  const myFiltered  = useMemo(() => applyFilters(mesExamens, true),    [mesExamens,  search, filterMatiere, filterStatus, filterCycle, filterAnnee, filterSemestre]);
  const othFiltered = useMemo(() => applyFilters(autresExamens, false), [autresExamens, search, filterMatiere, filterCycle, filterAnnee, filterSemestre]);

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
      showToast('Copie créée — ouverture en modification.');
    } catch {
      showToast('Erreur lors de la copie.', 'error');
    }
  };

  const handleDelete = async (exam) => {
    if (!window.confirm(`Supprimer définitivement "${exam.title || 'cet examen'}" ?`)) return;
    const id = toId(exam.id);
    try {
      await deleteExamBankItem(id);
      setMesExamens(prev => prev.filter(e => toId(e.id) !== id));
      showToast('Examen supprimé.');
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
              className={`eb-tree-all ${!filterCycle ? 'eb-tree-all--active' : ''}`}
              onClick={() => { setFilterCycle(''); setFilterAnnee(''); setFilterSemestre(''); }}
            >
              <span className="eb-tree-all-icon">◈</span>
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
                    <span className="eb-tree-arrow">{cycleOpen ? '▾' : '▸'}</span>
                    <span className="eb-tree-icon">{cycle.icon}</span>
                    <span className="eb-tree-node-label">{cycle.label}</span>
                    <span className="eb-tree-count">{cycleItems.length}</span>
                  </button>

                  {/* Années */}
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
            {(filterCycle || filterAnnee || filterSemestre) && (
              <div className="eb-breadcrumb">
                <button className="eb-bc-item eb-bc-item--link" onClick={() => { setFilterCycle(''); setFilterAnnee(''); setFilterSemestre(''); }}>
                  Tous
                </button>
                {filterCycle && (
                  <>
                    <span className="eb-bc-sep">›</span>
                    <button className="eb-bc-item eb-bc-item--link" onClick={() => { setFilterAnnee(''); setFilterSemestre(''); }}>
                      {CYCLES.find(c => c.id === filterCycle)?.label}
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
