import { useEffect, useMemo, useState } from 'react';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import {
  getQuestionBank,
  addQuestionToBank,
  updateQuestionBankItem,
  deleteQuestionBankItem,
  copyQuestionBankItem,
} from '../../api/enseignant/Enseignant.api';
import './Questionbank.css';

const PER_PAGE = 10;

const formatDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

const TYPE_LABELS = {
  ouverte:      { label: 'Ouverte',          cls: 'blue'   },
  qcm:          { label: 'QCM',              cls: 'violet' },
  qcm_unique:   { label: 'QCM — unique',     cls: 'violet' },
  qcm_multiple: { label: 'QCM — multiple',   cls: 'indigo' },
  vrai_faux:    { label: 'Vrai/Faux',        cls: 'green'  },
  pratique:     { label: 'Pratique',         cls: 'gold'   },
  enonce:       { label: 'Énoncé',           cls: 'gray'   },
};

const QUESTION_TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'ouverte', label: 'Ouverte' },
  { value: 'qcm_unique', label: 'QCM — choix unique' },
  { value: 'qcm_multiple', label: 'QCM — choix multiple' },
  { value: 'qcm', label: 'QCM (ancien)' },
  { value: 'vrai_faux', label: 'Vrai/Faux' },
  { value: 'pratique', label: 'Pratique' },
  { value: 'enonce', label: 'Énoncé' },
];

const normalizeQuestionType = (type) => {
  const clean = String(type || '').trim();
  if (TYPE_LABELS[clean]) return clean;
  return 'ouverte';
};

const normalizeQuestionItem = (item) => ({
  ...item,
  id: item.id || item._id,
  type: normalizeQuestionType(item.type),
});

/* ── Toast ── */
const Toast = ({ message, type }) =>
  message ? <div className={`qb-toast qb-toast--${type}`}>{message}</div> : null;

/* ── Pagination ── */
const Pagination = ({ page, total, onChange }) => {
  if (total <= 1) return null;
  return (
    <div className="qb-pagination">
      <button className="qb-page-btn" onClick={() => onChange(page - 1)} disabled={page === 1}>← Précédent</button>
      <div className="qb-page-nums">
        {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
          <button key={p} className={`qb-page-num ${p === page ? 'qb-page-num--active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        ))}
      </div>
      <button className="qb-page-btn" onClick={() => onChange(page + 1)} disabled={page === total}>Suivant →</button>
    </div>
  );
};

/* ── Add Question Modal ── */
const AddModal = ({ onSave, onClose }) => {
  const [text, setText]       = useState('');
  const [matiere, setMatiere] = useState('');
  const [type, setType]       = useState('ouverte');
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const handleSave = async () => {
    const clean = text.trim();
    if (!clean) { setErr('Le texte de la question est requis.'); return; }
    setSaving(true); setErr('');
    try {
      await onSave(clean, matiere.trim(), normalizeQuestionType(type));
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.message || "Erreur lors de l'ajout.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="qb-modal-overlay" onClick={onClose}>
      <div className="qb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qb-modal-header">
          <div className="qb-modal-header-left">
            <div className="qb-modal-num">+</div>
            <div><div className="qb-modal-label">Nouvelle question</div></div>
          </div>
          <button className="qb-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="qb-modal-body">
          <label className="qb-field-label">Matière <span className="qb-optional">(optionnel)</span></label>
          <input
            className="qb-field-input"
            type="text"
            placeholder="Ex : Algorithmique, Base de données…"
            value={matiere}
            onChange={(e) => setMatiere(e.target.value)}
          />
          <label className="qb-field-label" style={{ marginTop: '14px' }}>Type de question *</label>
          <select className="qb-field-input" value={type} onChange={(e) => setType(e.target.value)}>
            {QUESTION_TYPE_OPTIONS.filter((option) => option.value).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <label className="qb-field-label" style={{ marginTop: '14px' }}>Texte de la question *</label>
          <textarea
            className="qb-edit-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Saisissez l'énoncé de la question…"
            autoFocus
          />
          {err && <p className="qb-field-error">{err}</p>}
        </div>
        <div className="qb-modal-footer">
          <button className="qb-btn qb-btn--ghost" onClick={onClose}>Annuler</button>
          <button className="qb-btn qb-btn--save" onClick={handleSave} disabled={saving}>
            {saving ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Edit Modal ── */
const EditModal = ({ question, onSave, onClose }) => {
  const [text, setText]   = useState(question.text || '');
  const [type, setType]   = useState(normalizeQuestionType(question.type));
  const [saving, setSaving] = useState(false);
  const [err, setErr]     = useState('');

  const handleSave = async () => {
    const clean = text.trim();
    if (!clean) { setErr('Le texte est requis.'); return; }
    setSaving(true); setErr('');
    try {
      await onSave(clean, normalizeQuestionType(type));
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.message || 'Erreur de modification.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="qb-modal-overlay" onClick={onClose}>
      <div className="qb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qb-modal-header">
          <div className="qb-modal-header-left">
            <div className="qb-modal-num">✎</div>
            <div><div className="qb-modal-label">Modifier la question</div></div>
          </div>
          <button className="qb-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="qb-modal-body">
          <label className="qb-field-label">Type de question *</label>
          <select className="qb-field-input" value={type} onChange={(e) => setType(e.target.value)}>
            {QUESTION_TYPE_OPTIONS.filter((option) => option.value).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <label className="qb-field-label" style={{ marginTop: '14px' }}>Texte de la question *</label>
          <textarea className="qb-edit-textarea" value={text} onChange={(e) => setText(e.target.value)} rows={5} autoFocus />
          {err && <p className="qb-field-error">{err}</p>}
        </div>
        <div className="qb-modal-footer">
          <button className="qb-btn qb-btn--ghost" onClick={onClose}>Annuler</button>
          <button className="qb-btn qb-btn--save" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── View Modal ── */
const ViewModal = ({ question, index, isMine, onClose, onCopy }) => (
  <div className="qb-modal-overlay" onClick={onClose}>
    <div className="qb-modal" onClick={(e) => e.stopPropagation()}>
      <div className="qb-modal-header">
        <div className="qb-modal-header-left">
          <div className={`qb-modal-num ${!isMine ? 'qb-modal-num--other' : ''}`}>{index + 1}</div>
          <div>
            <div className="qb-modal-label">Question {index + 1}</div>
            {!isMine && <div className="qb-modal-author">{question.createdByName || question.createdByEmail || 'Professeur'}</div>}
          </div>
        </div>
        <button className="qb-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="qb-modal-body">
        <div className="qb-modal-matiere" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span className={`qb-type-badge qb-type-badge--${(TYPE_LABELS[normalizeQuestionType(question.type)] || TYPE_LABELS.ouverte).cls}`}>
            {(TYPE_LABELS[normalizeQuestionType(question.type)] || TYPE_LABELS.ouverte).label}
          </span>
        </div>
        {question.matiere && (
          <div className="qb-modal-matiere">
            <span className="qb-tag qb-tag--blue">{question.matiere}</span>
          </div>
        )}
        <p className="qb-modal-text">{question.text}</p>
        {question.options?.length > 0 && (
          <div className="qb-modal-options">
            {question.options.map((opt, oi) => (
              <div key={oi} className={`qb-modal-option ${opt.correct ? 'qb-modal-option--correct' : ''}`}>
                {String.fromCharCode(65 + oi)}. {opt.text}
                {opt.correct && <span className="qb-correct-mark"> ✓</span>}
              </div>
            ))}
          </div>
        )}
        <div className="qb-modal-date">Ajoutée le {formatDate(question.createdAt)}</div>
      </div>
      <div className="qb-modal-footer">
        {!isMine && (
          <button className="qb-btn qb-btn--copy" onClick={() => { onCopy(question); onClose(); }}>
            Copier dans ma banque
          </button>
        )}
        <button className="qb-btn qb-btn--ghost" onClick={onClose}>Fermer</button>
      </div>
    </div>
  </div>
);

/* ── Question Card ── */
const QuestionCard = ({ item, index, isMine, onView, onEdit, onDelete, onCopy }) => {
  const normalizedType = normalizeQuestionType(item.type);
  const typeMeta = TYPE_LABELS[normalizedType] || { label: 'Question', cls: 'blue' };
  const truncated = (item.text || '').length > 120;
  const display   = truncated ? item.text.slice(0, 120) + '…' : item.text;

  return (
    <div className={`qb-card ${!isMine ? 'qb-card--other' : ''}`}>
      <div className="qb-card-top">
        <div className="qb-card-num">{index + 1}</div>
        <div className="qb-card-badges">
          {item.matiere && <span className="qb-tag qb-tag--blue">{item.matiere}</span>}
          <span className={`qb-type-badge qb-type-badge--${typeMeta.cls}`}>{typeMeta.label}</span>
        </div>
      </div>
      <p className="qb-card-text">{display}</p>
      {item.copiedFrom && (
        <div className="qb-card-copied">Copiée de {item.copiedFrom}</div>
      )}
      {!isMine && (
        <div className="qb-card-author">{item.createdByName || item.createdByEmail || 'Professeur'}</div>
      )}
      <div className="qb-card-footer">
        <span className="qb-card-date">{formatDate(item.createdAt)}</span>
        <div className="qb-card-actions">
          <button className="qb-btn qb-btn--view" onClick={() => onView(item, index)}>Voir</button>
          {isMine ? (
            <>
              <button className="qb-btn qb-btn--edit" onClick={() => onEdit(item)}>Modifier</button>
              <button className="qb-btn qb-btn--danger" onClick={() => onDelete(item.id)}>Supprimer</button>
            </>
          ) : (
            <button className="qb-btn qb-btn--copy" onClick={() => onCopy(item)}>Copier</button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════
   QuestionBank — page principale
   ══════════════════════════════════════ */
const QuestionBank = () => {
  const { user, logout } = useAuth();

  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [mesQuestions, setMesQuestions]       = useState([]);
  const [autresQuestions, setAutresQuestions] = useState([]);
  const [toast, setToast]                     = useState({ message: '', type: 'success' });
  const [search, setSearch]                   = useState('');
  const [filterMatiere, setFilterMatiere]     = useState('');
  const [filterType, setFilterType]           = useState('');
  const [activeTab, setActiveTab]             = useState('mes');
  const [pageMes, setPageMes]                 = useState(1);
  const [pageAutres, setPageAutres]           = useState(1);
  const [viewModal, setViewModal]             = useState(null);
  const [editModal, setEditModal]             = useState(null);
  const [showAddModal, setShowAddModal]       = useState(false);

  const loadData = async () => {
    try {
      setLoading(true); setError('');
      const data = await getQuestionBank();
      setMesQuestions(Array.isArray(data?.mesQuestions) ? data.mesQuestions.map(normalizeQuestionItem) : []);
      setAutresQuestions(Array.isArray(data?.autresQuestions) ? data.autresQuestions.map(normalizeQuestionItem) : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Impossible de charger la banque de questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
    return () => clearTimeout(t);
  }, [toast.message]);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  /* Matières uniques pour le filtre */
  const allMatieres = useMemo(() => {
    const all = [...mesQuestions, ...autresQuestions].map(q => q.matiere).filter(Boolean);
    return [...new Set(all)].sort();
  }, [mesQuestions, autresQuestions]);

  const applyFilters = (items) => {
    const q = search.trim().toLowerCase();
    const m = filterMatiere.trim().toLowerCase();
    const type = filterType.trim();
    return items.filter((item) => {
      if (m && !(item.matiere || '').toLowerCase().includes(m)) return false;
      if (type && normalizeQuestionType(item.type) !== type) return false;
      if (!q) return true;
      return (item.text || '').toLowerCase().includes(q) ||
             (item.createdByName || '').toLowerCase().includes(q) ||
             (item.matiere || '').toLowerCase().includes(q);
    });
  };

  const filteredMes    = useMemo(() => applyFilters(mesQuestions),    [mesQuestions,    search, filterMatiere, filterType]);
  const filteredAutres = useMemo(() => applyFilters(autresQuestions), [autresQuestions, search, filterMatiere, filterType]);

  const totalPagesMes    = Math.max(1, Math.ceil(filteredMes.length / PER_PAGE));
  const totalPagesAutres = Math.max(1, Math.ceil(filteredAutres.length / PER_PAGE));
  const safeMes    = Math.min(pageMes,    totalPagesMes);
  const safeAutres = Math.min(pageAutres, totalPagesAutres);

  const pageMesItems    = filteredMes.slice((safeMes - 1) * PER_PAGE, safeMes * PER_PAGE);
  const pageAutresItems = filteredAutres.slice((safeAutres - 1) * PER_PAGE, safeAutres * PER_PAGE);
  const offsetMes    = (safeMes - 1) * PER_PAGE;
  const offsetAutres = (safeAutres - 1) * PER_PAGE;

  useEffect(() => { setPageMes(1); setPageAutres(1); }, [search, filterMatiere]);

  /* Actions */
  const handleAdd = async (text, matiere, type) => {
    const result = await addQuestionToBank(text, matiere, '', '', type);
    const newQ = normalizeQuestionItem(result.question || result);
    setMesQuestions(prev => [newQ, ...prev]);
    showToast('Question ajoutée à votre banque.');
  };

  const handleSaveEdit = async (text, type) => {
    await updateQuestionBankItem(editModal.id, { text, type });
    setMesQuestions(prev => prev.map(q => q.id === editModal.id ? { ...q, text, type: normalizeQuestionType(type) } : q));
    showToast('Question modifiée.');
    setEditModal(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette question définitivement ?')) return;
    try {
      await deleteQuestionBankItem(id);
      setMesQuestions(prev => prev.filter(q => q.id !== id));
      showToast('Question supprimée.');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur de suppression', 'error');
    }
  };

  const handleCopy = async (question) => {
    try {
      const result = await copyQuestionBankItem(question.id);
      const newQ = normalizeQuestionItem(result.question || result);
      setMesQuestions(prev => [
        { ...newQ, copiedFrom: question.createdByName || question.createdByEmail },
        ...prev,
      ]);
      showToast(`Question copiée de ${question.createdByName || 'ce professeur'}.`);
      setActiveTab('mes'); setPageMes(1);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur de copie', 'error');
    }
  };

  const hasFilters = search || filterMatiere || filterType;
  const resetFilters = () => { setSearch(''); setFilterMatiere(''); setFilterType(''); };

  return (
    <div className="qb-layout">
      <Sidebar roleLabel="Espace enseignant" navItems={enseignantNavItems} profile={buildEnseignantProfile(user)} onLogout={logout} />

      <main className="qb-main">
        {/* Header */}
        <header className="qb-header">
          <div>
            <div className="qb-header-eyebrow">Bibliothèque</div>
            <h3 className="qb-header-title">Banque de <span>questions</span></h3>
            <p className="qb-header-sub">
              {mesQuestions.length} personnelle{mesQuestions.length !== 1 ? 's' : ''} · {autresQuestions.length} partagée{autresQuestions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="qb-btn-new" onClick={() => setShowAddModal(true)}>
            + Nouvelle question
          </button>
        </header>

        {/* Filtres */}
        <div className="qb-filters">
          <div className="qb-search-wrap">
            <span className="qb-search-icon">⌕</span>
            <input
              className="qb-search-input"
              type="text"
              placeholder="Rechercher une question, un auteur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="qb-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>

          <select className="qb-select" value={filterMatiere} onChange={(e) => setFilterMatiere(e.target.value)}>
            <option value="">Toutes les matières</option>
            {allMatieres.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select className="qb-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            {QUESTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>

          {hasFilters && (
            <button className="qb-btn-reset" onClick={resetFilters}>✕ Réinitialiser</button>
          )}
        </div>

        {/* Onglets */}
        <div className="qb-tabs">
          <button className={`qb-tab ${activeTab === 'mes' ? 'qb-tab--active' : ''}`} onClick={() => setActiveTab('mes')}>
            Mes questions <span className="qb-tab-count">{filteredMes.length}</span>
          </button>
          <button className={`qb-tab ${activeTab === 'autres' ? 'qb-tab--active' : ''}`} onClick={() => setActiveTab('autres')}>
            Autres professeurs <span className="qb-tab-count">{filteredAutres.length}</span>
          </button>
        </div>

        {error && <div className="qb-alert qb-alert--error">{error}</div>}

        {loading ? (
          <div className="qb-loading">
            <div className="qb-loading-dots"><span /><span /><span /></div>
            <p>Chargement de la banque…</p>
          </div>
        ) : (
          <>
            {(activeTab === 'mes' ? pageMesItems : pageAutresItems).length === 0 ? (
              <div className="qb-empty">
                <div className="qb-empty-icon">?</div>
                <p className="qb-empty-msg">
                  {hasFilters ? 'Aucun résultat pour ces filtres.' : activeTab === 'mes' ? "Vous n'avez pas encore de question." : 'Aucune question partagée.'}
                </p>
                {hasFilters && <button className="qb-btn-reset" onClick={resetFilters}>Réinitialiser</button>}
                {!hasFilters && activeTab === 'mes' && (
                  <button className="qb-btn-new" style={{ marginTop: '12px' }} onClick={() => setShowAddModal(true)}>
                    Ajouter ma première question
                  </button>
                )}
              </div>
            ) : (
              <div className="qb-cards-grid">
                {(activeTab === 'mes' ? pageMesItems : pageAutresItems).map((item, i) => (
                  <QuestionCard
                    key={item.id}
                    item={item}
                    index={activeTab === 'mes' ? offsetMes + i : offsetAutres + i}
                    isMine={activeTab === 'mes'}
                    onView={(q, idx) => setViewModal({ question: q, index: idx, isMine: activeTab === 'mes' })}
                    onEdit={(q) => setEditModal(q)}
                    onDelete={handleDelete}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            )}

            {/* Pagination + compteur */}
            {activeTab === 'mes' ? (
              <>
                <Pagination page={safeMes} total={totalPagesMes} onChange={setPageMes} />
                {filteredMes.length > 0 && (
                  <p className="qb-count-label">
                    {offsetMes + 1}–{Math.min(offsetMes + PER_PAGE, filteredMes.length)} sur {filteredMes.length} question(s)
                  </p>
                )}
              </>
            ) : (
              <>
                <Pagination page={safeAutres} total={totalPagesAutres} onChange={setPageAutres} />
                {filteredAutres.length > 0 && (
                  <p className="qb-count-label">
                    {offsetAutres + 1}–{Math.min(offsetAutres + PER_PAGE, filteredAutres.length)} sur {filteredAutres.length} question(s)
                  </p>
                )}
              </>
            )}
          </>
        )}

        <Toast message={toast.message} type={toast.type} />
      </main>

      {/* Modals */}
      {showAddModal && (
        <AddModal onSave={handleAdd} onClose={() => setShowAddModal(false)} />
      )}
      {viewModal && (
        <ViewModal
          question={viewModal.question}
          index={viewModal.index}
          isMine={viewModal.isMine}
          onClose={() => setViewModal(null)}
          onCopy={handleCopy}
        />
      )}
      {editModal && (
        <EditModal
          question={editModal}
          onSave={handleSaveEdit}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
};

export default QuestionBank;
