import { useEffect, useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiX, FiEye, FiEdit2, FiTrash2, FiCopy, FiSave, FiPlus } from 'react-icons/fi';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import {
  createExercise,
  getExerciseBank,
  updateExercise,
  deleteExercise,
  copyExercise,
} from '../../api/enseignant/Enseignant.api';
import './Questionbank.css';

const PER_PAGE = 10;

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const normalizeQuestionType = (type) => {
  const clean = String(type || '').trim();
  const allowed = new Set(['ouverte', 'qcm', 'qcm_unique', 'qcm_multiple', 'vrai_faux', 'pratique', 'enonce']);
  return allowed.has(clean) ? clean : 'ouverte';
};

const TYPE_LABELS = {
  ouverte:      { label: ' Ouverte', cls: 'blue' },
  qcm:          { label: 'QCM', cls: 'violet' },
  qcm_unique:   { label: 'QCM — unique', cls: 'violet' },
  qcm_multiple: { label: 'QCM — multiple', cls: 'indigo' },
  vrai_faux:    { label: 'Vrai/Faux', cls: 'green' },
  pratique:     { label: 'Pratique', cls: 'gold' },
  enonce:       { label: 'Énoncé', cls: 'gray' },
};

const normalizeExercise = (item) => ({
  id: item.id || item._id,
  title: item.title || '',
  matiere: item.matiere || '',
  niveau: item.niveau || '',
  anneeUniversitaire: item.anneeUniversitaire || '',
  questions: Array.isArray(item.questions)
    ? item.questions.map((question) => ({
        id: question.id || question._id,
        text: question.text || '',
        type: normalizeQuestionType(question.type),
        options: Array.isArray(question.options)
          ? question.options.map((option) => ({
              id: option.id || '',
              text: typeof option === 'string' ? option : (option.text || ''),
              correct: !!option.correct,
            }))
          : [],
        imageUrl: question.imageUrl || '',
      }))
    : [],
  createdByName: item.createdByName || '',
  createdByEmail: item.createdByEmail || '',
  createdAt: item.createdAt,
});

const Toast = ({ message, type }) => (message ? <div className={`qb-toast qb-toast--${type}`}>{message}</div> : null);

const Pagination = ({ page, total, onChange }) => {
  if (total <= 1) return null;
  return (
    <div className="qb-pagination">
      <button className="qb-page-btn" onClick={() => onChange(page - 1)} disabled={page === 1} title="Page précédente">
        <FiChevronLeft size={16} />
      </button>
      <div className="qb-page-nums">
        {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
          <button key={p} className={`qb-page-num ${p === page ? 'qb-page-num--active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        ))}
      </div>
      <button className="qb-page-btn" onClick={() => onChange(page + 1)} disabled={page === total} title="Page suivante">
        <FiChevronRight size={16} />
      </button>
    </div>
  );
};

const DeleteModal = ({ exercise, onConfirm, onClose }) => (
  <div className="qb-modal-overlay" onClick={onClose}>
    <div className="qb-modal qb-modal--confirm" onClick={(e) => e.stopPropagation()}>
      <div className="qb-modal-header">
        <div className="qb-modal-header-left">
          <div className="qb-modal-num qb-modal-num--danger">
            <FiTrash2 size={14} />
          </div>
          <div>
            <div className="qb-modal-label">Supprimer l'exercice</div>
          </div>
        </div>
      </div>
      <div className="qb-modal-body">
        <p className="qb-confirm-text">
          Voulez-vous vraiment supprimer <strong>"{exercise?.title || 'cet exercice'}"</strong> définitivement de votre banque ?
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


const ViewModal = ({ exercise, index, isMine, onClose, onCopy }) => (
  <div className="qb-modal-overlay" onClick={onClose}>
    <div className="qb-modal qb-modal--wide" onClick={(e) => e.stopPropagation()}>
      <div className="qb-modal-header">
        <div className="qb-modal-header-left">
          <div className={`qb-modal-num ${!isMine ? 'qb-modal-num--other' : ''}`}>{index + 1}</div>
          <div>
            <div className="qb-modal-label">Exercice {index + 1}</div>
            {!isMine && <div className="qb-modal-author">{exercise.createdByName || exercise.createdByEmail || 'Professeur'}</div>}
          </div>
        </div>
        <button className="qb-modal-close" onClick={onClose} title="Fermer"><FiX size={16} /></button>
      </div>
      <div className="qb-modal-body">
        <h3 className="qb-modal-title" style={{ marginBottom: '8px' }}>{exercise.title || 'Exercice sans titre'}</h3>
        <div className="qb-modal-matiere" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {exercise.matiere && <span className="qb-tag qb-tag--blue">{exercise.matiere}</span>}
          {exercise.niveau && <span className="qb-tag">{exercise.niveau}</span>}
          {exercise.anneeUniversitaire && <span className="qb-tag qb-tag--blue">{exercise.anneeUniversitaire}</span>}
        </div>
        <div className="qb-modal-options">
          {Array.isArray(exercise.questions) && exercise.questions.length > 0 ? (
            exercise.questions.map((question, questionIndex) => {
              const qType = normalizeQuestionType(question.type);
              // const meta = TYPE_LABELS[qType] || { label: qType, cls: 'blue' };
              return (
                <div key={question.id || questionIndex} className="qb-modal-option" style={{ whiteSpace: 'pre-wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    {/* <span className={`qb-type-badge qb-type-badge--${meta.cls}`} style={{ fontWeight: 700 }}>{meta.label}</span> */}
                    <strong style={{ fontSize: '0.98rem' }}>{questionIndex + 1}.</strong>
                    <div style={{ flex: 1 }}>{question.text}</div>
                  </div>

                  {question.imageUrl && (
                    <div style={{ marginLeft: 36, marginTop: 8 }}>
                      <img src={question.imageUrl} alt="Illustration" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6 }} />
                    </div>
                  )}

                  {Array.isArray(question.options) && question.options.length > 0 && (
                    <div style={{ marginLeft: 36, marginTop: 6 }}>
                      {question.options.map((opt, oi) => (
                        <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                          <div style={{ width: 18, textAlign: 'center' }}>{String.fromCharCode(65 + oi)}.</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            <div>{opt.text}</div>
                            {opt.correct && <div style={{ color: '#0d7a55', fontWeight: 700 }}>✓</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(qType === 'ouverte' || qType === 'pratique') && (
                    <div style={{ marginLeft: 36, marginTop: 8 }}>
                      <em style={{ color: '#6b7a99' }}>Lignes de réponse :</em>
                      <div style={{ marginTop: 6 }}>
                        {Array.from({ length: question.answerLines ?? 3 }).map((_, li) => (
                          <div key={li} style={{ height: 10, borderBottom: '1px dashed rgba(0,0,0,0.08)', marginBottom: 8 }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="qb-modal-option">Aucune question disponible</div>
          )}
        </div>
        <div className="qb-modal-date">Ajouté le {formatDate(exercise.createdAt)}</div>
      </div>
     
    </div>
  </div>
);

import { useNavigate } from 'react-router-dom';

const ExerciseCard = ({ item, index, isMine, onView, onEdit, onDelete, onCopy }) => {
  const questionsCount = Array.isArray(item.questions) ? item.questions.length : 0;
  const preview = questionsCount > 0 ? item.questions[0].text : '';
  const truncated = preview.length > 120;
  const navigate = useNavigate();

  return (
    <div className={`qb-card ${!isMine ? 'qb-card--other' : ''}`}>
      <div className="qb-card-top">
        <div className="qb-card-num">{index + 1}</div>
        <div className="qb-card-badges">
          {item.matiere && <span className="qb-tag qb-tag--blue">{item.matiere}</span>}
          {item.niveau && <span className="qb-type-badge qb-type-badge--indigo">{item.niveau}</span>}
        </div>
      </div>
      <h3 className="qb-card-title" style={{ marginTop: '2px' }}>{item.title || 'Exercice sans titre'}</h3>
      <p className="qb-card-text">{truncated ? `${preview.slice(0, 120)}…` : preview || 'Aucune question disponible'}</p>
      <div className="qb-card-footer">
        <span className="qb-card-date">{questionsCount} question{questionsCount > 1 ? 's' : ''} · {formatDate(item.createdAt)}</span>
        <div className="qb-card-actions">
          <button className="qb-btn qb-btn--view" onClick={() => onView(item, index)} title="Voir"><FiEye size={14} /></button>
          {isMine ? (
            <>
              <button
                className="qb-btn qb-btn--view"
                onClick={() => navigate('/enseignant/exams/create', { state: { importExercise: item } })}
                title="Importer dans l'éditeur"
              >
                <FiCopy size={14} />
              </button>
              <button className="qb-btn qb-btn--danger" onClick={() => onDelete(item.id)} title="Supprimer"><FiTrash2 size={14} /></button>
            </>
          ) : (
            <button className="qb-btn qb-btn--copy" onClick={() => onCopy(item)} title="Copier dans ma banque"><FiCopy size={14} /></button>
          )}
        </div>
      </div>
    </div>
  );
};

const ExerciseBank = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mesExercises, setMesExercises] = useState([]);
  const [autresExercises, setAutresExercises] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [search, setSearch] = useState('');
  const [filterMatiere, setFilterMatiere] = useState('');
  const [activeTab, setActiveTab] = useState('mes');
  const [pageMes, setPageMes] = useState(1);
  const [pageAutres, setPageAutres] = useState(1);
  const [viewModal, setViewModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getExerciseBank();
      setMesExercises(Array.isArray(data?.mesExercices) ? data.mesExercices.map(normalizeExercise) : []);
      setAutresExercises(Array.isArray(data?.autresExercices) ? data.autresExercices.map(normalizeExercise) : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Impossible de charger la banque d'exercices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!toast.message) return;
    const timer = setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
    return () => clearTimeout(timer);
  }, [toast.message]);

  const allMatieres = useMemo(() => {
    const all = [...mesExercises, ...autresExercises].map((exercise) => exercise.matiere).filter(Boolean);
    return [...new Set(all)].sort();
  }, [mesExercises, autresExercises]);

  const applyFilters = (items) => {
    const q = search.trim().toLowerCase();
    const m = filterMatiere.trim().toLowerCase();
    return items.filter((exercise) => {
      if (m && !(exercise.matiere || '').toLowerCase().includes(m)) return false;
      if (!q) return true;
      const haystack = [
        exercise.title,
        exercise.matiere,
        exercise.niveau,
        exercise.anneeUniversitaire,
        exercise.createdByName,
        ...(Array.isArray(exercise.questions) ? exercise.questions.map((question) => question.text) : []),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  };

  const filteredMes = useMemo(() => applyFilters(mesExercises), [mesExercises, search, filterMatiere]);
  const filteredAutres = useMemo(() => applyFilters(autresExercises), [autresExercises, search, filterMatiere]);

  const totalPagesMes = Math.max(1, Math.ceil(filteredMes.length / PER_PAGE));
  const totalPagesAutres = Math.max(1, Math.ceil(filteredAutres.length / PER_PAGE));
  const safeMes = Math.min(pageMes, totalPagesMes);
  const safeAutres = Math.min(pageAutres, totalPagesAutres);
  const pageMesItems = filteredMes.slice((safeMes - 1) * PER_PAGE, safeMes * PER_PAGE);
  const pageAutresItems = filteredAutres.slice((safeAutres - 1) * PER_PAGE, safeAutres * PER_PAGE);
  const offsetMes = (safeMes - 1) * PER_PAGE;
  const offsetAutres = (safeAutres - 1) * PER_PAGE;

  useEffect(() => { setPageMes(1); setPageAutres(1); }, [search, filterMatiere]);

  const handleAdd = async (payload) => {
    const result = await createExercise(payload);
    const newExercise = normalizeExercise(result.exercise || result);
    setMesExercises((prev) => [newExercise, ...prev]);
    showToast('Exercice ajouté à votre banque.');
  };

  const handleSaveEdit = async (payload) => {
    await updateExercise(editModal.id, payload);
    setMesExercises((prev) => prev.map((exercise) => (exercise.id === editModal.id ? { ...exercise, ...payload } : exercise)));
    showToast('Exercice modifié.');
    setEditModal(null);
  };

  const confirmDelete = async () => {
    try {
      await deleteExercise(deleteConfirm);
      setMesExercises((prev) => prev.filter((exercise) => exercise.id !== deleteConfirm));
      showToast('Exercice supprimé.');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur de suppression', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleCopy = async (exercise) => {
    try {
      const result = await copyExercise(exercise.id);
      const newExercise = normalizeExercise(result.exercise || result);
      setMesExercises((prev) => [
        { ...newExercise, copiedFrom: exercise.createdByName || exercise.createdByEmail },
        ...prev,
      ]);
      showToast(`Exercice copié de ${exercise.createdByName || 'ce professeur'}.`);
      setActiveTab('mes');
      setPageMes(1);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur de copie', 'error');
    }
  };

  const hasFilters = search || filterMatiere;
  const resetFilters = () => {
    setSearch('');
    setFilterMatiere('');
  };

  return (
    <div className="qb-layout">
      <Sidebar roleLabel="Espace enseignant" navItems={enseignantNavItems} profile={buildEnseignantProfile(user)} onLogout={logout} />

      <main className="qb-main">
        <header className="qb-header">
          <div>
            <div className="qb-header-eyebrow">Bibliothèque</div>
            <h3 className="qb-header-title">Banque d'<span>exercices</span></h3>
            <p className="qb-header-sub">
              {mesExercises.length} personnelle{mesExercises.length !== 1 ? 's' : ''} · {autresExercises.length} partagée{autresExercises.length !== 1 ? 's' : ''}
            </p>
          </div>
          {/* <button className="qb-btn-new" onClick={() => setShowAddModal(true)}>
            <FiPlus size={14} /> Nouvel exercice
          </button> */}
        </header>

        <div className="qb-filters">
          <div className="qb-search-wrap">
            <span className="qb-search-icon">⌕</span>
            <input
              className="qb-search-input"
              type="text"
              placeholder="Rechercher un exercice, une matière, une question…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="qb-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>

          <select className="qb-select" value={filterMatiere} onChange={(e) => setFilterMatiere(e.target.value)}>
            <option value="">Toutes les matières</option>
            {allMatieres.map((matiere) => <option key={matiere} value={matiere}>{matiere}</option>)}
          </select>

          {hasFilters && (
            <button className="qb-btn-reset" onClick={resetFilters}>✕ Réinitialiser</button>
          )}
        </div>

        <div className="qb-tabs">
          <button className={`qb-tab ${activeTab === 'mes' ? 'qb-tab--active' : ''}`} onClick={() => setActiveTab('mes')}>
            Mes exercices <span className="qb-tab-count">{filteredMes.length}</span>
          </button>
          <button className={`qb-tab ${activeTab === 'autres' ? 'qb-tab--active' : ''}`} onClick={() => setActiveTab('autres')}>
            Autres professeurs <span className="qb-tab-count">{filteredAutres.length}</span>
          </button>
        </div>

        {error && <div className="qb-alert qb-alert--error">{error}</div>}

        {loading ? (
          <div className="qb-loading">
            <div className="qb-loading-dots"><span /><span /><span /></div>
            <p>Chargement de la banque d'exercices…</p>
          </div>
        ) : (
          <>
            {(activeTab === 'mes' ? pageMesItems : pageAutresItems).length === 0 ? (
              <div className="qb-empty">
                <div className="qb-empty-icon">?</div>
                <p className="qb-empty-msg">
                  {hasFilters
                    ? 'Aucun résultat pour ces filtres.'
                    : activeTab === 'mes'
                      ? "Vous n'avez pas encore d'exercice."
                      : 'Aucun exercice partagé.'}
                </p>
                {hasFilters && <button className="qb-btn-reset" onClick={resetFilters}>Réinitialiser</button>}
                {!hasFilters && activeTab === 'mes' && (
                  <button className="qb-btn-new" style={{ marginTop: '12px' }} onClick={() => setShowAddModal(true)}>
                    Ajouter mon premier exercice
                  </button>
                )}
              </div>
            ) : (
              <div className="qb-cards-grid">
                {(activeTab === 'mes' ? pageMesItems : pageAutresItems).map((item, i) => (
                  <ExerciseCard
                    key={item.id}
                    item={item}
                    index={activeTab === 'mes' ? offsetMes + i : offsetAutres + i}
                    isMine={activeTab === 'mes'}
                    onView={(exercise, index) => setViewModal({ exercise, index, isMine: activeTab === 'mes' })}
                    onEdit={(exercise) => setEditModal(exercise)}
                    onDelete={setDeleteConfirm}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            )}

            {activeTab === 'mes' ? (
              <>
                <Pagination page={safeMes} total={totalPagesMes} onChange={setPageMes} />
                {filteredMes.length > 0 && (
                  <p className="qb-count-label">
                    {offsetMes + 1}–{Math.min(offsetMes + PER_PAGE, filteredMes.length)} sur {filteredMes.length} exercice(s)
                  </p>
                )}
              </>
            ) : (
              <>
                <Pagination page={safeAutres} total={totalPagesAutres} onChange={setPageAutres} />
                {filteredAutres.length > 0 && (
                  <p className="qb-count-label">
                    {offsetAutres + 1}–{Math.min(offsetAutres + PER_PAGE, filteredAutres.length)} sur {filteredAutres.length} exercice(s)
                  </p>
                )}
              </>
            )}
          </>
        )}

        <Toast message={toast.message} type={toast.type} />
      </main>

      {showAddModal && (
        <ExerciseFormModal onSave={handleAdd} onClose={() => setShowAddModal(false)} />
      )}
      {viewModal && (
        <ViewModal
          exercise={viewModal.exercise}
          index={viewModal.index}
          isMine={viewModal.isMine}
          onClose={() => setViewModal(null)}
          onCopy={handleCopy}
        />
      )}
      {editModal && (
        <ExerciseFormModal
          exercise={editModal}
          onSave={handleSaveEdit}
          onClose={() => setEditModal(null)}
        />
      )}
      {deleteConfirm && (
        <DeleteModal
          exercise={[...mesExercises, ...autresExercises].find((exercise) => exercise.id === deleteConfirm)}
          onConfirm={confirmDelete}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default ExerciseBank;
