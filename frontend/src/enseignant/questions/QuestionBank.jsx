import { useEffect, useState } from 'react';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import {
  getQuestionBank,
  updateQuestionBankItem,
  deleteQuestionBankItem,
  copyQuestionBankItem,
} from '../../api/enseignant/Enseignant.api';
import './QuestionBank.css';

const formatDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

/* ── small sub-components ── */
const Badge = ({ children, variant = 'default' }) => (
  <span className={`qb-badge qb-badge--${variant}`}>{children}</span>
);

const EmptyState = ({ message, hint }) => (
  <div className="qb-empty">
    <div className="qb-empty-icon">?</div>
    <p className="qb-empty-msg">{message}</p>
    {hint && <p className="qb-empty-hint">{hint}</p>}
  </div>
);

const Toast = ({ message, type }) => (
  message ? <div className={`qb-toast qb-toast--${type}`}>{message}</div> : null
);

/* ── QuestionCard (mes questions) ── */
const MyQuestionCard = ({ item, index, editingId, editingText, onStartEdit, onSaveEdit, onCancelEdit, onEditChange, onDelete }) => {
  const isEditing = editingId === item.id;

  return (
    <div className={`qb-card ${isEditing ? 'qb-card--editing' : ''}`}>
      <div className="qb-card-num">{index + 1}</div>

      <div className="qb-card-body">
        {isEditing ? (
          <textarea
            className="qb-edit-textarea"
            value={editingText}
            onChange={(e) => onEditChange(e.target.value)}
            autoFocus
            rows={3}
          />
        ) : (
          <p className="qb-card-text">{item.text}</p>
        )}
        <span className="qb-card-date">Ajoutée le {formatDate(item.createdAt)}</span>
        {item.copiedFrom && <Badge variant="copy">Copiée de {item.copiedFrom}</Badge>}
      </div>

      <div className="qb-card-actions">
        {isEditing ? (
          <>
            <button className="qb-btn qb-btn--save" onClick={onSaveEdit}>Enregistrer</button>
            <button className="qb-btn qb-btn--ghost" onClick={onCancelEdit}>Annuler</button>
          </>
        ) : (
          <>
            <button className="qb-btn qb-btn--edit" onClick={() => onStartEdit(item)}>Modifier</button>
            <button className="qb-btn qb-btn--danger" onClick={() => onDelete(item.id)}>Supprimer</button>
          </>
        )}
      </div>
    </div>
  );
};

/* ── QuestionCard (autres profs) ── */
const OtherQuestionCard = ({ item, index, onCopy }) => (
  <div className="qb-card qb-card--other">
    <div className="qb-card-num qb-card-num--other">{index + 1}</div>

    <div className="qb-card-body">
      <p className="qb-card-text">{item.text}</p>
      <div className="qb-card-meta">
        <span className="qb-card-author">
          <span className="qb-author-dot" />
          {item.createdByName || item.createdByEmail || 'Professeur'}
        </span>
        <span className="qb-card-date">{formatDate(item.createdAt)}</span>
      </div>
    </div>

    <div className="qb-card-actions">
      <button className="qb-btn qb-btn--copy" onClick={() => onCopy(item)}>
        Copier dans ma banque
      </button>
    </div>
  </div>
);

/* ── Main component ── */
const QuestionBank = () => {
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mesQuestions, setMesQuestions] = useState([]);
  const [autresQuestions, setAutresQuestions] = useState([]);

  const [editingId, setEditingId] = useState('');
  const [editingText, setEditingText] = useState('');

  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('mes'); // 'mes' | 'autres'

  /* load */
  const loadQuestionBank = async () => {
    try {
      setLoading(true); setError('');
      const data = await getQuestionBank();
      setMesQuestions(Array.isArray(data?.mesQuestions) ? data.mesQuestions : []);
      setAutresQuestions(Array.isArray(data?.autresQuestions) ? data.autresQuestions : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Impossible de charger la banque de questions');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadQuestionBank(); }, []);

  /* auto-clear toast */
  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
    return () => clearTimeout(t);
  }, [toast.message]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  /* edit handlers */
  const startEdit = (item) => { setEditingId(item.id); setEditingText(item.text || ''); };
  const cancelEdit = () => { setEditingId(''); setEditingText(''); };
  const saveEdit = async () => {
    const clean = editingText.trim();
    if (!clean) { showToast('Le texte est requis.', 'error'); return; }
    try {
      await updateQuestionBankItem(editingId, clean);
      setMesQuestions(prev => prev.map(q => q.id === editingId ? { ...q, text: clean } : q));
      showToast('Question modifiée.'); cancelEdit();
    } catch (err) { showToast(err?.response?.data?.message || 'Erreur de modification', 'error'); }
  };

  /* delete */
  const removeQuestion = async (id) => {
    if (!window.confirm('Supprimer cette question définitivement ?')) return;
    try {
      await deleteQuestionBankItem(id);
      setMesQuestions(prev => prev.filter(q => q.id !== id));
      if (editingId === id) cancelEdit();
      showToast('Question supprimée.');
    } catch (err) { showToast(err?.response?.data?.message || 'Erreur de suppression', 'error'); }
  };

  /* copy */
  const handleCopy = async (question) => {
    try {
      const result = await copyQuestionBankItem(question.id);
      setMesQuestions(prev => [...prev, {
        id: result.question.id,
        text: result.question.text,
        createdAt: result.question.createdAt,
        copiedFrom: question.createdByName || question.createdByEmail,
      }]);
      showToast(`Question copiée de ${question.createdByName || 'ce professeur'}.`);
      setActiveTab('mes');
    } catch (err) { showToast(err?.response?.data?.message || 'Erreur de copie', 'error'); }
  };

  /* filter */
  const q = search.trim().toLowerCase();
  const filteredMes = mesQuestions.filter(i =>
    !q || i.text?.toLowerCase().includes(q)
  );
  const filteredAutres = autresQuestions.filter(i =>
    !q || i.text?.toLowerCase().includes(q) ||
    (i.createdByName || '').toLowerCase().includes(q)
  );

  return (
    <div className="qb-layout">
      <Sidebar roleLabel="Espace enseignant" navItems={enseignantNavItems} profile={buildEnseignantProfile(user)} onLogout={logout} />

      <main className="qb-main">
        {/* Header */}
        <header className="qb-header">
          <div>
            <p className="qb-header-eyebrow">ExamGen — IA</p>
            <h1 className="qb-header-title">Banque de <span>questions</span></h1>
            <p className="qb-header-sub">
              {filteredMes.length} question{filteredMes.length !== 1 ? 's' : ''} personnelle{filteredMes.length !== 1 ? 's' : ''} · {filteredAutres.length} partagée{filteredAutres.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="qb-btn-logout" onClick={logout}>Se déconnecter</button>
        </header>

        {/* Search bar */}
        <div className="qb-search-bar">
          <span className="qb-search-icon">⌕</span>
          <input
            className="qb-search-input"
            type="text"
            placeholder="Rechercher une question, un auteur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="qb-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* Tabs */}
        <div className="qb-tabs">
          <button
            className={`qb-tab ${activeTab === 'mes' ? 'qb-tab--active' : ''}`}
            onClick={() => setActiveTab('mes')}
          >
            Mes questions
            <span className="qb-tab-count">{filteredMes.length}</span>
          </button>
          <button
            className={`qb-tab ${activeTab === 'autres' ? 'qb-tab--active' : ''}`}
            onClick={() => setActiveTab('autres')}
          >
            Autres professeurs
            <span className="qb-tab-count">{filteredAutres.length}</span>
          </button>
        </div>

        {/* Error */}
        {error && <div className="qb-alert qb-alert--error">{error}</div>}

        {/* Content */}
        {loading ? (
          <div className="qb-loading">
            <div className="qb-loading-dots"><span /><span /><span /></div>
            <p>Chargement de la banque…</p>
          </div>
        ) : activeTab === 'mes' ? (
          <div className="qb-list">
            {filteredMes.length === 0 ? (
              <EmptyState
                message={search ? 'Aucun résultat pour cette recherche.' : 'Vous navez pas encore de question.'}
                hint={search ? 'Essayez dautres mots-clés.' : 'Créez des questions depuis longlet "Création dexamen".'}
              />
            ) : (
              filteredMes.map((item, i) => (
                <MyQuestionCard
                  key={item.id}
                  item={item}
                  index={i}
                  editingId={editingId}
                  editingText={editingText}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  onEditChange={setEditingText}
                  onDelete={removeQuestion}
                />
              ))
            )}
          </div>
        ) : (
          <div className="qb-list">
            {filteredAutres.length === 0 ? (
              <EmptyState
                message={search ? 'Aucun résultat.' : 'Aucune question partagée pour le moment.'}
                hint="Les questions des autres professeurs apparaîtront ici."
              />
            ) : (
              filteredAutres.map((item, i) => (
                <OtherQuestionCard
                  key={item.id}
                  item={item}
                  index={i}
                  onCopy={handleCopy}
                />
              ))
            )}
          </div>
        )}

        <Toast message={toast.message} type={toast.type} />
      </main>
    </div>
  );
};

export default QuestionBank;