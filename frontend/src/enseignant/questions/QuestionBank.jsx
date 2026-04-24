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
import './Questionbank.css';

const PER_PAGE = 10;

const formatDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};
const paginate = (arr, page, n) => arr.slice((page - 1) * n, page * n);

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
        {Array.from({ length: total }, (_, i) => i + 1).map(p => (
          <button key={p} className={`qb-page-num ${p === page ? 'qb-page-num--active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        ))}
      </div>
      <button className="qb-page-btn" onClick={() => onChange(page + 1)} disabled={page === total}>Suivant →</button>
    </div>
  );
};

/* ── Edit Modal ── */
const EditModal = ({ question, onSave, onClose }) => {
  const [text, setText] = useState(question.text || '');
  return (
    <div className="qb-modal-overlay" onClick={onClose}>
      <div className="qb-modal" onClick={e => e.stopPropagation()}>
        <div className="qb-modal-header">
          <div className="qb-modal-header-left">
            <div className="qb-modal-num">✎</div>
            <div><div className="qb-modal-label">Modifier la question</div></div>
          </div>
          <button className="qb-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="qb-modal-body">
          <textarea className="qb-edit-textarea" value={text} onChange={e => setText(e.target.value)} rows={5} autoFocus />
        </div>
        <div className="qb-modal-footer">
          <button className="qb-btn qb-btn--ghost" onClick={onClose}>Annuler</button>
          <button className="qb-btn qb-btn--save" onClick={() => onSave(text)}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

/* ── View Modal ── */
const ViewModal = ({ question, index, isMine, onClose, onCopy }) => (
  <div className="qb-modal-overlay" onClick={onClose}>
    <div className="qb-modal" onClick={e => e.stopPropagation()}>
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
        <p className="qb-modal-text">{question.text}</p>
        <div className="qb-modal-date">Ajoutée le {formatDate(question.createdAt)}</div>
      </div>
      <div className="qb-modal-footer">
        {!isMine && <button className="qb-btn qb-btn--copy" onClick={() => { onCopy(question); onClose(); }}>Copier dans ma banque</button>}
        <button className="qb-btn qb-btn--ghost" onClick={onClose}>Fermer</button>
      </div>
    </div>
  </div>
);

/* ══════════════════════
   Main
   ══════════════════════ */
const QuestionBank = () => {
  const { user, logout } = useAuth();

  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState('');
  const [mesQuestions, setMesQuestions]         = useState([]);
  const [autresQuestions, setAutresQuestions]   = useState([]);
  const [toast, setToast]                       = useState({ message: '', type: 'success' });
  const [search, setSearch]                     = useState('');
  const [activeTab, setActiveTab]               = useState('mes');
  const [pageMes, setPageMes]                   = useState(1);
  const [pageAutres, setPageAutres]             = useState(1);
  const [viewModal, setViewModal]               = useState(null);
  const [editModal, setEditModal]               = useState(null);

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

  useEffect(() => {
    if (!toast.message) return;
    const t = setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
    return () => clearTimeout(t);
  }, [toast.message]);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const saveEdit = async (text) => {
    const clean = text.trim();
    if (!clean) { showToast('Le texte est requis.', 'error'); return; }
    try {
      await updateQuestionBankItem(editModal.id, clean);
      setMesQuestions(prev => prev.map(q => q.id === editModal.id ? { ...q, text: clean } : q));
      showToast('Question modifiée.'); setEditModal(null);
    } catch (err) { showToast(err?.response?.data?.message || 'Erreur de modification', 'error'); }
  };

  const removeQuestion = async (id) => {
    if (!window.confirm('Supprimer cette question définitivement ?')) return;
    try {
      await deleteQuestionBankItem(id);
      setMesQuestions(prev => prev.filter(q => q.id !== id));
      showToast('Question supprimée.');
    } catch (err) { showToast(err?.response?.data?.message || 'Erreur de suppression', 'error'); }
  };

  const handleCopy = async (question) => {
    try {
      const result = await copyQuestionBankItem(question.id);
      setMesQuestions(prev => [...prev, {
        id: result.question.id, text: result.question.text,
        createdAt: result.question.createdAt,
        copiedFrom: question.createdByName || question.createdByEmail,
      }]);
      showToast(`Question copiée de ${question.createdByName || 'ce professeur'}.`);
      setActiveTab('mes'); setPageMes(1);
    } catch (err) { showToast(err?.response?.data?.message || 'Erreur de copie', 'error'); }
  };

  const q = search.trim().toLowerCase();
  const filteredMes    = mesQuestions.filter(i => !q || i.text?.toLowerCase().includes(q));
  const filteredAutres = autresQuestions.filter(i =>
    !q || i.text?.toLowerCase().includes(q) || (i.createdByName || '').toLowerCase().includes(q)
  );

  const totalPagesMes    = Math.max(1, Math.ceil(filteredMes.length / PER_PAGE));
  const totalPagesAutres = Math.max(1, Math.ceil(filteredAutres.length / PER_PAGE));
  const safeMes    = Math.min(pageMes,    totalPagesMes);
  const safeAutres = Math.min(pageAutres, totalPagesAutres);
  const pageMesItems    = paginate(filteredMes,    safeMes,    PER_PAGE);
  const pageAutresItems = paginate(filteredAutres, safeAutres, PER_PAGE);
  const offsetMes    = (safeMes    - 1) * PER_PAGE;
  const offsetAutres = (safeAutres - 1) * PER_PAGE;

  const handleSearch = (val) => { setSearch(val); setPageMes(1); setPageAutres(1); };
  const handleTab    = (tab) => { setActiveTab(tab); setPageMes(1); setPageAutres(1); };

  /* ── Row components ── */
  const MyRow = ({ item, globalIndex }) => {
    const truncated = item.text?.length > 90;
    const display   = truncated ? item.text.slice(0, 90) + '…' : item.text;
    return (
      <tr className="qb-tr">
        <td className="qb-td qb-td--num"><div className="qb-num-bubble">{globalIndex + 1}</div></td>
        <td className="qb-td qb-td--text">
          <span className="qb-question-text">{display}</span>
          {truncated && <button className="qb-read-more" onClick={() => setViewModal({ question: item, index: globalIndex, isMine: true })}>Voir tout</button>}
          {item.copiedFrom && <span className="qb-badge qb-badge--copy"> Copiée de {item.copiedFrom}</span>}
        </td>
        <td className="qb-td qb-td--date">{formatDate(item.createdAt)}</td>
        <td className="qb-td qb-td--actions">
          <button className="qb-btn qb-btn--view" onClick={() => setViewModal({ question: item, index: globalIndex, isMine: true })}>Voir</button>
          <button className="qb-btn qb-btn--edit" onClick={() => setEditModal(item)}>Modifier</button>
          <button className="qb-btn qb-btn--danger" onClick={() => removeQuestion(item.id)}>Supprimer</button>
        </td>
      </tr>
    );
  };

  const OtherRow = ({ item, globalIndex }) => {
    const truncated = item.text?.length > 90;
    const display   = truncated ? item.text.slice(0, 90) + '…' : item.text;
    return (
      <tr className="qb-tr qb-tr--other">
        <td className="qb-td qb-td--num"><div className="qb-num-bubble qb-num-bubble--other">{globalIndex + 1}</div></td>
        <td className="qb-td qb-td--text">
          <span className="qb-question-text">{display}</span>
          {truncated && <button className="qb-read-more" onClick={() => setViewModal({ question: item, index: globalIndex, isMine: false })}>Voir tout</button>}
        </td>
        <td className="qb-td qb-td--author"><span className="qb-author-name">{item.createdByName || item.createdByEmail || 'Professeur'}</span></td>
        <td className="qb-td qb-td--date">{formatDate(item.createdAt)}</td>
        <td className="qb-td qb-td--actions">
          <button className="qb-btn qb-btn--view" onClick={() => setViewModal({ question: item, index: globalIndex, isMine: false })}>Voir</button>
          <button className="qb-btn qb-btn--copy" onClick={() => handleCopy(item)}>Copier</button>
        </td>
      </tr>
    );
  };

  return (
    <div className="qb-layout">
      <Sidebar roleLabel="Espace enseignant" navItems={enseignantNavItems} profile={buildEnseignantProfile(user)} onLogout={logout} />

      <main className="qb-main">
        <header className="teacher-header">
          <div className="teacher-header-left">
            <p className="teacher-header-greeting">Base de connaissances</p>
            <h1 className="teacher-header-title">Banque de <span>questions</span></h1>
            <p className="teacher-header-sub">
              {filteredMes.length} question{filteredMes.length !== 1 ? 's' : ''} personnelle{filteredMes.length !== 1 ? 's' : ''} · {filteredAutres.length} partagée{filteredAutres.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="teacher-header-badge">
            Consultation active
          </div>
        </header>

        <div className="qb-search-bar">
          <span className="qb-search-icon">⌕</span>
          <input className="qb-search-input" type="text" placeholder="Rechercher une question, un auteur…"
            value={search} onChange={e => handleSearch(e.target.value)} />
          {search && <button className="qb-search-clear" onClick={() => handleSearch('')}>✕</button>}
        </div>

        <div className="qb-tabs">
          <button className={`qb-tab ${activeTab === 'mes' ? 'qb-tab--active' : ''}`} onClick={() => handleTab('mes')}>
            Mes questions <span className="qb-tab-count">{filteredMes.length}</span>
          </button>
          <button className={`qb-tab ${activeTab === 'autres' ? 'qb-tab--active' : ''}`} onClick={() => handleTab('autres')}>
            Autres professeurs <span className="qb-tab-count">{filteredAutres.length}</span>
          </button>
        </div>

        {error && <div className="qb-alert qb-alert--error">{error}</div>}

        {loading ? (
          <div className="qb-loading">
            <div className="qb-loading-dots"><span /><span /><span /></div>
            <p>Chargement de la banque…</p>
          </div>
        ) : activeTab === 'mes' ? (
          filteredMes.length === 0 ? (
            <div className="qb-empty">
              <div className="qb-empty-icon">?</div>
              <p className="qb-empty-msg">{search ? 'Aucun résultat pour cette recherche.' : "Vous n'avez pas encore de question."}</p>
              <p className="qb-empty-hint">{search ? "Essayez d'autres mots-clés." : 'Créez des questions depuis l\'onglet "Création d\'examen".'}</p>
            </div>
          ) : (
            <>
              <div className="qb-table-wrap">
                <table className="qb-table">
                  <thead>
                    <tr className="qb-thead-tr">
                      <th className="qb-th qb-th--num">#</th>
                      <th className="qb-th qb-th--text">Question</th>
                      <th className="qb-th qb-th--date">Date d'ajout</th>
                      <th className="qb-th qb-th--actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageMesItems.map((item, i) => <MyRow key={item.id} item={item} globalIndex={offsetMes + i} />)}
                  </tbody>
                </table>
              </div>
              <div className="qb-table-footer">
                <span className="qb-count-label">
                  Affichage {offsetMes + 1}–{Math.min(offsetMes + PER_PAGE, filteredMes.length)} sur {filteredMes.length} question(s)
                </span>
                <Pagination page={safeMes} total={totalPagesMes} onChange={setPageMes} />
              </div>
            </>
          )
        ) : (
          filteredAutres.length === 0 ? (
            <div className="qb-empty">
              <div className="qb-empty-icon">?</div>
              <p className="qb-empty-msg">{search ? 'Aucun résultat.' : 'Aucune question partagée pour le moment.'}</p>
              <p className="qb-empty-hint">Les questions des autres professeurs apparaîtront ici.</p>
            </div>
          ) : (
            <>
              <div className="qb-table-wrap">
                <table className="qb-table">
                  <thead>
                    <tr className="qb-thead-tr">
                      <th className="qb-th qb-th--num">#</th>
                      <th className="qb-th qb-th--text">Question</th>
                      <th className="qb-th qb-th--author">Auteur</th>
                      <th className="qb-th qb-th--date">Date d'ajout</th>
                      <th className="qb-th qb-th--actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageAutresItems.map((item, i) => <OtherRow key={item.id} item={item} globalIndex={offsetAutres + i} />)}
                  </tbody>
                </table>
              </div>
              <div className="qb-table-footer">
                <span className="qb-count-label">
                  Affichage {offsetAutres + 1}–{Math.min(offsetAutres + PER_PAGE, filteredAutres.length)} sur {filteredAutres.length} question(s)
                </span>
                <Pagination page={safeAutres} total={totalPagesAutres} onChange={setPageAutres} />
              </div>
            </>
          )
        )}

        <Toast message={toast.message} type={toast.type} />
      </main>

      {viewModal && (
        <ViewModal question={viewModal.question} index={viewModal.index} isMine={viewModal.isMine}
          onClose={() => setViewModal(null)} onCopy={handleCopy} />
      )}
      {editModal && (
        <EditModal question={editModal} onSave={saveEdit} onClose={() => setEditModal(null)} />
      )}
    </div>
  );
};

export default QuestionBank;