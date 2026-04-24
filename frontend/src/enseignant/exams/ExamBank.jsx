import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import { downloadExamBankFile, getExamBank, deleteExamBankItem, copyExamBankItem } from '../../api/enseignant/Enseignant.api';
import './ExamBank.css';

/* ── helpers ── */
const normStatus = (v) => String(v || '').trim().toLowerCase();
const toId = (id) => {
  if (!id) return '';
  if (typeof id === 'object' && id.$oid) return String(id.$oid);
  return String(id);
};
const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};
const filterList = (items, query, status) => {
  const q = String(query || '').trim().toLowerCase();
  const st = normStatus(status);
  return (items || []).filter((item) => {
    const byStatus = (st === 'tous' || !st) ? true : normStatus(item.status) === st;
    if (!byStatus) return false;
    if (!q) return true;
    return [item.title, item.Departement, item.filiere, item.matiere, item.niveau, item.createdByName, item.createdByEmail]
      .map(v => String(v || '').toLowerCase()).join(' ').includes(q);
  });
};
const paginate = (arr, page, n) => arr.slice((page - 1) * n, page * n);
const STATUS_CONFIG = {
  'exporte':  { label: 'Exporté',   cls: 'exported' },
  'en cours': { label: 'En cours',  cls: 'active' },
  'brouillon':{ label: 'Brouillon', cls: 'draft' },
};
const currentYear = new Date().getFullYear();
const ANNEE_UNIV = `${currentYear}-${currentYear + 1}`;

/* ── sub-components ── */
const StatusBadge = ({ value }) => {
  const cfg = STATUS_CONFIG[normStatus(value)] || { label: value || '—', cls: 'draft' };
  return <span className={`eb-status eb-status--${cfg.cls}`}>{cfg.label}</span>;
};
const Toast = ({ message, type }) =>
  message ? <div className={`eb-toast eb-toast--${type}`}>{message}</div> : null;
const Pagination = ({ page, total, onPrev, onNext }) =>
  total > 1 ? (
    <div className="eb-pagination">
      <button className="eb-page-btn" onClick={onPrev} disabled={page === 1}>← Précédent</button>
      <span className="eb-page-info">Page {page} / {total}</span>
      <button className="eb-page-btn" onClick={onNext} disabled={page === total}>Suivant →</button>
    </div>
  ) : null;

/* ══════════════════════════════
   EXAM MODAL — full content
   ══════════════════════════════ */
const ExamModal = ({ exam, isMine, onClose, onDownload, onCopy, onDelete }) => {
  const [html, setHtml] = useState('');
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docError, setDocError] = useState('');

  /* convert docx → html when exam changes */
  useEffect(() => {
    setHtml(''); setDocError('');
    if (!exam?.fileData) return;

    let mounted = true;
    setLoadingDoc(true);

    (async () => {
      try {
        let ab = exam.fileData;
        /* handle Buffer from MongoDB */
        if (ab instanceof Buffer) {
          ab = ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.byteLength);
        }
        const result = await mammoth.convertToHtml({ arrayBuffer: ab });
        if (mounted) setHtml(result.value || '<p>Aucun contenu détecté.</p>');
      } catch (err) {
        console.error('Mammoth error:', err);
        if (mounted) setDocError('Impossible d\'afficher le contenu. Téléchargez le fichier pour le consulter.');
      } finally {
        if (mounted) setLoadingDoc(false);
      }
    })();

    return () => { mounted = false; };
  }, [exam?.fileData]);

  /* close on Escape */
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!exam) return null;

  return (
    <div className="eb-modal-overlay" onClick={onClose}>
      <div className="eb-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header with key metadata only ── */}
        <div className="eb-modal-header">
          <div className="eb-modal-header-left">
            <div className="eb-modal-icon">📄</div>
            <div>
              <h2 className="eb-modal-title">{exam.title || 'Examen sans titre'}</h2>
              <div className="eb-modal-meta-row">
                {exam.niveau && <span className="eb-modal-chip">{exam.niveau}</span>}
                {exam.matiere && <span className="eb-modal-chip eb-modal-chip--blue">{exam.matiere}</span>}
                <span className="eb-modal-chip eb-modal-chip--gold">{exam.anneeUniversitaire || ANNEE_UNIV}</span>
                {exam.status && <StatusBadge value={exam.status} />}
              </div>
            </div>
          </div>
          <button className="eb-modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {/* ── Exam content ── */}
        <div className="eb-modal-body">
          {loadingDoc && (
            <div className="eb-modal-loading">
              <div className="eb-loading-dots"><span /><span /><span /></div>
              <p>Chargement du contenu…</p>
            </div>
          )}
          {docError && (
            <div className="eb-modal-doc-error">{docError}</div>
          )}
          {!loadingDoc && !docError && html && (
            <div className="eb-modal-docx" dangerouslySetInnerHTML={{ __html: html }} />
          )}
          {!loadingDoc && !docError && !html && (
            <div className="eb-modal-no-content">
              <p>Aucun contenu disponible à afficher.</p>
              <p>Téléchargez le fichier .docx pour le consulter.</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="eb-modal-footer">
          <button className="eb-modal-btn eb-modal-btn--dl" onClick={() => onDownload(exam)}>
            ↓ Télécharger .docx
          </button>
          {isMine ? (
            <button className="eb-modal-btn eb-modal-btn--del" onClick={() => { onDelete(exam); onClose(); }}>
              Supprimer
            </button>
          ) : (
            <button className="eb-modal-btn eb-modal-btn--copy" onClick={() => { onCopy(exam); onClose(); }}>
              Copier et modifier →
            </button>
          )}
          <button className="eb-modal-btn eb-modal-btn--ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
};

/* ── Exam Row ── */
const ExamRow = ({ exam, isMine, onOpen }) => (
  <tr className="eb-row" onClick={() => onOpen(exam)}>
    <td>
      <div className="eb-title-cell">
        <span className="eb-title-text">{exam.title || 'Examen sans titre'}</span>
      </div>
    </td>
    <td><span className="eb-cell-muted">{exam.Departement || exam.filiere || '—'}</span></td>
    <td>
      {exam.matiere && <span className="eb-tag">{exam.matiere}</span>}
      {exam.niveau && <span className="eb-tag eb-tag--level">{exam.niveau}</span>}
    </td>
    <td className="eb-center">{exam.duree ? `${exam.duree} min` : '—'}</td>
    <td className="eb-center">{exam.noteTotale ? `/${exam.noteTotale}` : '—'}</td>
    {isMine
      ? <td><StatusBadge value={exam.status} /></td>
      : <td><span className="eb-cell-muted">{exam.createdByName || '—'}</span></td>
    }
    <td className="eb-center">
      <span className="eb-row-hint">Cliquer pour voir →</span>
    </td>
  </tr>
);

/* ── Main ── */
const ExamBank = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [mesExamens, setMesExamens] = useState([]);
  const [autresExamens, setAutresExamens] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [activeTab, setActiveTab] = useState('mes');
  const [pageMes, setPageMes] = useState(1);
  const [pageAutres, setPageAutres] = useState(1);
  const PER_PAGE = 10;

  /* modal state */
  const [modalExam, setModalExam] = useState(null);
  const [modalIsMine, setModalIsMine] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getExamBank();
        setMesExamens(Array.isArray(data?.mesExamens) ? data.mesExamens : []);
        setAutresExamens(Array.isArray(data?.autresExamens) ? data.autresExamens : []);
      } catch (err) {
        setError(err?.response?.data?.message || "Impossible de charger la banque d'examens");
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { setPageMes(1); setPageAutres(1); }, [search, statusFilter]);

  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
    return () => clearTimeout(t);
  }, [toast.message]);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const myFiltered  = useMemo(() => filterList(mesExamens, search, statusFilter), [mesExamens, search, statusFilter]);
  const othFiltered = useMemo(() => filterList(autresExamens, search, 'tous'), [autresExamens, search]);
  const myPage  = useMemo(() => paginate(myFiltered, pageMes, PER_PAGE), [myFiltered, pageMes]);
  const othPage = useMemo(() => paginate(othFiltered, pageAutres, PER_PAGE), [othFiltered, pageAutres]);

  const openModal = (exam, isMine) => { setModalExam(exam); setModalIsMine(isMine); };
  const closeModal = () => setModalExam(null);

  const handleDownload = async (exam) => {
    try {
      const blob = await downloadExamBankFile(toId(exam.id));
      saveBlob(blob, `${String(exam.title || 'examen').replace(/[^a-zA-Z0-9_-]+/g, '_')}.docx`);
      showToast('Téléchargement réussi.');
    } catch { showToast('Impossible de télécharger.', 'error'); }
  };

  const handleDelete = async (exam) => {
    if (!window.confirm(`Supprimer définitivement "${exam.title || 'cet examen'}" ?`)) return;
    const id = toId(exam.id);
    try {
      await deleteExamBankItem(id);
      setMesExamens(prev => prev.filter(e => toId(e.id) !== id));
      showToast('Examen supprimé.');
    } catch { showToast('Impossible de supprimer.', 'error'); }
  };

  const handleCopy = async (exam) => {
    try {
      const result = await copyExamBankItem(toId(exam.id));
      const copiedId = result.exam?.id || result.exam?._id || toId(exam.id);
      window.open(`/enseignant/exams/create?editExam=${copiedId}`, '_blank');
      showToast('Examen copié — s\'ouvre dans un nouvel onglet.');
    } catch { showToast('Erreur lors de la copie.', 'error'); }
  };

  return (
    <div className="eb-layout">
      <Sidebar roleLabel="Espace enseignant" navItems={enseignantNavItems} profile={buildEnseignantProfile(user)} onLogout={logout} />

      <main className="eb-main">
        {/* Header */}
        <header className="teacher-header">
          <div className="teacher-header-left">
            <p className="teacher-header-greeting">Archives</p>
            <h1 className="teacher-header-title">
              Banque d'<span>examens</span>
            </h1>
            <p className="teacher-header-sub">
              {myFiltered.length} personnel{myFiltered.length !== 1 ? 's' : ''} · {othFiltered.length} partagé{othFiltered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="teacher-header-actions">
            <button className="btn-header-primary" onClick={() => navigate('/enseignant/exams/create')}>+ Nouvel examen</button>
          </div>
        </header>

        {/* Filters */}
        <div className="eb-filters">
          <div className="eb-search-wrap">
            <span className="eb-search-icon">⌕</span>
            <input className="eb-search" type="text" placeholder="Titre, filière, matière, enseignant…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="eb-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
          <select className="eb-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="tous">Tous les statuts</option>
            <option value="exporte">Exporté</option>
            <option value="en cours">En cours</option>
            <option value="brouillon">Brouillon</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="eb-tabs">
          <button className={`eb-tab ${activeTab === 'mes' ? 'eb-tab--active' : ''}`} onClick={() => setActiveTab('mes')}>
            Mes examens <span className="eb-tab-count">{myFiltered.length}</span>
          </button>
          <button className={`eb-tab ${activeTab === 'autres' ? 'eb-tab--active' : ''}`} onClick={() => setActiveTab('autres')}>
            Examens partagés <span className="eb-tab-count">{othFiltered.length}</span>
          </button>
        </div>

        {error && <div className="eb-alert eb-alert--error">{error}</div>}

        {loading ? (
          <div className="eb-loading">
            <div className="eb-loading-dots"><span /><span /><span /></div>
            <p>Chargement des examens…</p>
          </div>
        ) : activeTab === 'mes' ? (
          <section className="eb-section">
            <div className="eb-table-wrap">
              <table className="eb-table">
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Titre</th>
                    <th>Département</th>
                    <th>Matière / Niveau</th>
                    <th className="eb-center">Durée</th>
                    <th className="eb-center">Barème</th>
                    <th>Statut</th>
                    <th className="eb-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {myPage.length === 0
                    ? <tr><td colSpan={7} className="eb-empty-row">{search ? 'Aucun résultat.' : 'Aucun examen personnel.'}</td></tr>
                    : myPage.map(exam => <ExamRow key={toId(exam.id)} exam={exam} isMine={true} onOpen={e => openModal(e, true)} />)
                  }
                </tbody>
              </table>
            </div>
            <Pagination page={pageMes} total={Math.ceil(myFiltered.length / PER_PAGE)} onPrev={() => setPageMes(p => p - 1)} onNext={() => setPageMes(p => p + 1)} />
          </section>
        ) : (
          <section className="eb-section">
            <div className="eb-table-wrap">
              <table className="eb-table">
                <thead>
                  <tr>
                    <th style={{ width: '32%' }}>Titre</th>
                    <th>Département</th>
                    <th>Matière / Niveau</th>
                    <th className="eb-center">Durée</th>
                    <th className="eb-center">Barème</th>
                    <th>Créé par</th>
                    <th className="eb-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {othPage.length === 0
                    ? <tr><td colSpan={7} className="eb-empty-row">{search ? 'Aucun résultat.' : 'Aucun examen partagé.'}</td></tr>
                    : othPage.map(exam => <ExamRow key={toId(exam.id)} exam={exam} isMine={false} onOpen={e => openModal(e, false)} />)
                  }
                </tbody>
              </table>
            </div>
            <Pagination page={pageAutres} total={Math.ceil(othFiltered.length / PER_PAGE)} onPrev={() => setPageAutres(p => p - 1)} onNext={() => setPageAutres(p => p + 1)} />
          </section>
        )}

        <Toast message={toast.message} type={toast.type} />

        <ExamModal
          exam={modalExam}
          isMine={modalIsMine}
          onClose={closeModal}
          onDownload={handleDownload}
          onCopy={handleCopy}
          onDelete={handleDelete}
        />
      </main>
    </div>
  );
};

export default ExamBank;