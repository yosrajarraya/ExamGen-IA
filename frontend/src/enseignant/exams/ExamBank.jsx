import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import {
  enseignantNavItems,
  buildEnseignantProfile,
} from '../../components/sidebar/sidebarConfigs';
import {
  downloadExamBankFile,
  getExamBank,
  getExamContent,
  deleteExamBankItem,
  copyExamBankItem,
} from '../../api/enseignant/Enseignant.api';
import '../../styles/ExamBank.css';

const normStatus = (v) => String(v || '').trim().toLowerCase();

const toId = (id) => {
  if (!id) return '';
  if (typeof id === 'object' && id.$oid) return String(id.$oid);
  return String(id);
};

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const filterList = (items, query, status) => {
  const q = String(query || '').trim().toLowerCase();
  const st = normStatus(status);
  return (items || []).filter((item) => {
    const byStatus = st === 'tous' || !st ? true : normStatus(item.status) === st;
    if (!byStatus) return false;
    if (!q) return true;
    return [item.title, item.Departement, item.filiere, item.matiere, item.niveau, item.createdByName, item.createdByEmail]
      .map((v) => String(v || '').toLowerCase())
      .join(' ')
      .includes(q);
  });
};

const paginate = (arr, page, n) => arr.slice((page - 1) * n, page * n);

const STATUS_CONFIG = {
  exporte: { label: 'Exporté', cls: 'exported' },
  'en cours': { label: 'Exporté', cls: 'exported' },
  brouillon: { label: 'Brouillon', cls: 'draft' },
};

const currentYear = new Date().getFullYear();
const ANNEE_UNIV = `${currentYear}-${currentYear + 1}`;

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

const ExamModal = ({ exam, isMine, onClose, onDownload, onEdit, onCopy, onDelete, onCopyQuestions }) => {
  const [sections, setSections] = useState([]);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docError, setDocError] = useState('');

  useEffect(() => {
    setSections([]);
    setDocError('');
    if (!exam) return;
    let mounted = true;
    setLoadingDoc(true);
    (async () => {
      try {
        const data = await getExamContent(toId(exam.id));
        if (mounted) setSections(Array.isArray(data?.sections) ? data.sections : []);
      } catch {
        if (mounted) setDocError("Impossible d'afficher le contenu. Téléchargez le fichier pour le consulter.");
      } finally {
        if (mounted) setLoadingDoc(false);
      }
    })();
    return () => { mounted = false; };
  }, [exam]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!exam) return null;
  const hasSections = sections.length > 0;

  return (
    <div className="eb-modal-overlay" onClick={onClose}>
      <div className="eb-modal eb-modal--wide" onClick={(e) => e.stopPropagation()}>
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
                {exam.duree && <span className="eb-modal-chip eb-modal-chip--muted">⏱ {exam.duree} min</span>}
                {exam.noteTotale > 0 && <span className="eb-modal-chip eb-modal-chip--muted">/{exam.noteTotale} pts</span>}
              </div>
            </div>
          </div>
          <button className="eb-modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="eb-modal-body eb-modal-body--doc">
          {loadingDoc && (
            <div className="eb-modal-loading">
              <div className="eb-loading-dots"><span /><span /><span /></div>
              <p>Chargement du document…</p>
            </div>
          )}
          {docError && <div className="eb-modal-doc-error">{docError}</div>}
          {!loadingDoc && !docError && !hasSections && (
            <div className="eb-modal-no-content">
              <p>Aucun contenu disponible à afficher.</p>
              <p>Téléchargez le fichier .docx pour le consulter.</p>
            </div>
          )}
          {!loadingDoc && !docError && hasSections && (
            <div className="eb-word-doc">
              <div className="word-logos-row">
                <div className="word-logo-left">
                  <strong>North American</strong>
                  <span>Private University</span>
                  <span>Université Privée</span>
                </div>
                <div className="word-logo-center">
                  <strong>Université Nord-Américaine Privée</strong>
                  <span>Institut International de Technologie</span>
                  <span>Département Informatique</span>
                </div>
                <div className="word-logo-right">
                  <strong>IIT</strong>
                  <span>Institut International</span>
                  <span>de Technologie</span>
                </div>
              </div>
              <div className="word-title-box">
                <h1>{exam.title || 'DEVOIR SURVEILLÉ'}</h1>
              </div>
              <div className="word-info-table">
                <div className="word-info-left">
                  <p><strong>Matière :</strong> {exam.matiere || '—'}</p>
                  <p><strong>Discipline :</strong> Informatique</p>
                  <p><strong>Enseignants :</strong> {exam.createdByName || '—'}</p>
                  <p><strong>Documents autorisés :</strong> P.C & Internet non autorisés</p>
                </div>
                <div className="word-info-right">
                  <p><strong>Année Universitaire :</strong> {exam.anneeUniversitaire || ANNEE_UNIV}</p>
                  <p><strong>Semestre :</strong> 1</p>
                  <p><strong>Feuille d'énoncé / Durée :</strong> {exam.duree ? `${exam.duree} min` : '1h30'}</p>
                </div>
              </div>
              <div className="word-student-table">
                <div><strong>Prénom & Nom :</strong></div>
                <div><strong>Groupe</strong></div>
              </div>
              <div className="word-signature-box"><strong>Signature</strong></div>
              <div className="word-nb-box">
                <strong>NB.</strong>
                <p>— Le barème est fourni à titre indicatif et peut être ajusté.</p>
                <p>— La durée de l'examen est de {exam.duree || '90'} min.</p>
                <p>— Les ordinateurs, l'accès à Internet et l'utilisation d'un téléphone sont strictement interdits.</p>
              </div>
              <div className="word-body">
                {sections.map((section, si) => (
                  <div key={si} className="word-section">
                    <h2>Partie {si + 1} — {section.title || `Partie ${si + 1}`}</h2>
                    {Array.isArray(section.content) && section.content.map((line, li) => (
                      <p key={li} className="word-line">{line}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="eb-modal-footer">
          <button className="eb-modal-btn eb-modal-btn--dl" onClick={() => onDownload(exam)}>
            ↓ Télécharger .docx
          </button>
          <button className="eb-modal-btn eb-modal-btn--copy-q" onClick={() => onCopyQuestions(sections)} disabled={!hasSections}>
            📋 Copier les questions
          </button>
          {isMine ? (
            <>
              {/* ✅ Modifier la même copie — pas de duplication */}
              <button
                className="eb-modal-btn eb-modal-btn--edit"
                onClick={() => { onEdit(exam); onClose(); }}
              >
                ✏️ Modifier
              </button>
              <button
                className="eb-modal-btn eb-modal-btn--del"
                onClick={() => { onDelete(exam); onClose(); }}
              >
                Supprimer
              </button>
            </>
          ) : (
            <button
              className="eb-modal-btn eb-modal-btn--copy"
              onClick={() => { onCopy(exam); onClose(); }}
            >
              📋 Copier et modifier
            </button>
          )}
          <button className="eb-modal-btn eb-modal-btn--ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
};

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
    {isMine ? (
      <td><StatusBadge value={exam.status} /></td>
    ) : (
      <td><span className="eb-cell-muted">{exam.createdByName || '—'}</span></td>
    )}
    <td className="eb-center"><span className="eb-row-hint">Cliquer pour voir →</span></td>
  </tr>
);

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
  const [modalExam, setModalExam] = useState(null);
  const [modalIsMine, setModalIsMine] = useState(true);

  const PER_PAGE = 10;

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

  useEffect(() => { setPageMes(1); setPageAutres(1); }, [search, statusFilter]);

  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
    return () => clearTimeout(t);
  }, [toast.message]);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const myFiltered = useMemo(() => filterList(mesExamens, search, statusFilter), [mesExamens, search, statusFilter]);
  const othFiltered = useMemo(() => filterList(autresExamens, search, 'tous'), [autresExamens, search]);
  const myPage = useMemo(() => paginate(myFiltered, pageMes, PER_PAGE), [myFiltered, pageMes]);
  const othPage = useMemo(() => paginate(othFiltered, pageAutres, PER_PAGE), [othFiltered, pageAutres]);

  const openModal = (exam, isMine) => { setModalExam(exam); setModalIsMine(isMine); };
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

  // ✅ MODIFIÉ : navigue vers l'examen existant sans créer de copie
  const handleEdit = (exam) => {
    const examId = toId(exam.id);
    navigate(`/enseignant/exams/create?editExam=${examId}`);
  };

  // Copier (depuis les examens des autres) → crée une copie et l'ouvre
  const handleCopy = async (exam) => {
    try {
      const result = await copyExamBankItem(toId(exam.id));
      const copiedId = result.exam?.id || result.exam?._id || toId(exam.id);
      window.open(`/enseignant/exams/create?editExam=${copiedId}`, '_blank');
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
      setMesExamens((prev) => prev.filter((e) => toId(e.id) !== id));
      showToast('Examen supprimé.');
    } catch {
      showToast('Impossible de supprimer.', 'error');
    }
  };

  const handleCopyQuestions = (sections) => {
    if (!sections || sections.length === 0) { showToast('Aucune question à copier.', 'error'); return; }
    const lines = [];
    sections.forEach((section) => {
      if (section.title?.trim()) { lines.push(section.title.trim()); lines.push(''); }
      if (Array.isArray(section.content)) {
        let qIndex = 1;
        section.content.forEach((line) => {
          if (!line?.trim()) return;
          const trimmed = line.trim();
          const isAnswer =
            /^(réponse|correction|corrigé|solution|r[eé]p\.?\s*:)/i.test(trimmed) ||
            /^[a-d]\s*[).]\s+/i.test(trimmed) ||
            /^(vrai|faux)\s*$/i.test(trimmed);
          if (!isAnswer) { lines.push(`${qIndex}. ${trimmed}`); qIndex += 1; }
        });
        lines.push('');
      }
    });
    const text = lines.join('\n').trim();
    if (!text) { showToast('Aucun contenu à copier.', 'error'); return; }
    navigator.clipboard.writeText(text)
      .then(() => showToast('Questions copiées dans le presse-papier ✓'))
      .catch(() => showToast("Erreur : impossible d'accéder au presse-papier.", 'error'));
  };

  return (
    <div className="eb-layout">
      <Sidebar roleLabel="Espace enseignant" navItems={enseignantNavItems} profile={buildEnseignantProfile(user)} onLogout={logout} />
      <main className="eb-main">
        <header className="eb-header">
          <div>
            <h2 className="eb-header-title">Banque d'<span>examens</span></h2>
            <p className="eb-header-sub">
              {myFiltered.length} personnel{myFiltered.length !== 1 ? 's' : ''} · {othFiltered.length} partagé{othFiltered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="eb-btn-new" onClick={() => navigate('/enseignant/exams/create')}>+ Nouvel examen</button>
        </header>

        <div className="eb-filters">
          <div className="eb-search-wrap">
            <span className="eb-search-icon">⌕</span>
            <input className="eb-search" type="text" placeholder="Titre, filière, matière, enseignant…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button className="eb-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
          <select className="eb-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="tous">Tous les statuts</option>
            <option value="exporte">Exporté</option>
            <option value="en cours">En cours</option>
            <option value="brouillon">Brouillon</option>
          </select>
        </div>

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
                  {myPage.length === 0 ? (
                    <tr><td colSpan={7} className="eb-empty-row">{search ? 'Aucun résultat.' : 'Aucun examen personnel.'}</td></tr>
                  ) : (
                    myPage.map((exam) => <ExamRow key={toId(exam.id)} exam={exam} isMine={true} onOpen={(e) => openModal(e, true)} />)
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={pageMes} total={Math.ceil(myFiltered.length / PER_PAGE)} onPrev={() => setPageMes((p) => p - 1)} onNext={() => setPageMes((p) => p + 1)} />
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
                  {othPage.length === 0 ? (
                    <tr><td colSpan={7} className="eb-empty-row">{search ? 'Aucun résultat.' : 'Aucun examen partagé.'}</td></tr>
                  ) : (
                    othPage.map((exam) => <ExamRow key={toId(exam.id)} exam={exam} isMine={false} onOpen={(e) => openModal(e, false)} />)
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={pageAutres} total={Math.ceil(othFiltered.length / PER_PAGE)} onPrev={() => setPageAutres((p) => p - 1)} onNext={() => setPageAutres((p) => p + 1)} />
          </section>
        )}

        <Toast message={toast.message} type={toast.type} />

        <ExamModal
          exam={modalExam}
          isMine={modalIsMine}
          onClose={closeModal}
          onDownload={handleDownload}
          onEdit={handleEdit}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onCopyQuestions={handleCopyQuestions}
        />
      </main>
    </div>
  );
};

export default ExamBank;