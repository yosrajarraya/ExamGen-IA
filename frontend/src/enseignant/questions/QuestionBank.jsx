import { useEffect, useState } from 'react';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import {
  getQuestionBank,
  updateQuestionBankItem,
  deleteQuestionBankItem,
} from '../../api/enseignant/Enseignant.api';
import '../exams/CreateExam.css';

const formatDate = (isoDate) => {
  try {
    return new Date(isoDate).toLocaleString();
  } catch {
    return '';
  }
};

const QuestionBank = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mesQuestions, setMesQuestions] = useState([]);
  const [autresQuestions, setAutresQuestions] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [editingText, setEditingText] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('tous');

  const loadQuestionBank = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getQuestionBank();
      setMesQuestions(Array.isArray(data?.mesQuestions) ? data.mesQuestions : []);
      setAutresQuestions(Array.isArray(data?.autresQuestions) ? data.autresQuestions : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Impossible de charger la banque de questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestionBank();
  }, []);

  useEffect(() => {
    if (!actionMessage && !actionError) return undefined;

    const timer = setTimeout(() => {
      setActionMessage('');
      setActionError('');
    }, 3000);

    return () => clearTimeout(timer);
  }, [actionMessage, actionError]);

  const startEdit = (item) => {
    setActionMessage('');
    setActionError('');
    setEditingId(item.id);
    setEditingText(item.text || '');
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditingText('');
  };

  const saveEdit = async () => {
    const clean = String(editingText || '').trim();
    if (!clean) {
      setActionError('Le texte de la question est requis.');
      return;
    }

    try {
      await updateQuestionBankItem(editingId, clean);
      setMesQuestions((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, text: clean } : item))
      );
      setActionError('');
      setActionMessage('Question modifiée avec succès.');
      cancelEdit();
    } catch (err) {
      setActionMessage('');
      setActionError(err?.response?.data?.message || 'Impossible de modifier la question');
    }
  };

  const removeQuestion = async (id) => {
    try {
      await deleteQuestionBankItem(id);
      setMesQuestions((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) {
        cancelEdit();
      }
      setActionError('');
      setActionMessage('Question supprimée avec succès.');
    } catch (err) {
      setActionMessage('');
      setActionError(err?.response?.data?.message || 'Impossible de supprimer la question');
    }
  };

  const query = String(search || '').trim().toLowerCase();

  const filteredMesQuestions = mesQuestions.filter((item) => {
    if (!query) return true;
    return String(item?.text || '').toLowerCase().includes(query);
  });

  const filteredAutresQuestions = autresQuestions.filter((item) => {
    if (!query) return true;
    const text = String(item?.text || '').toLowerCase();
    const author = String(item?.createdByName || item?.createdByEmail || '').toLowerCase();
    return text.includes(query) || author.includes(query);
  });

  return (
    <div className="exam-create-layout">
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={enseignantNavItems}
        profile={buildEnseignantProfile(user)}
        onLogout={logout}
      />

      <main className="exam-create-main">
        <header className="exam-create-header">
          <h1>Banque de questions</h1>
          <button className="exam-btn-logout" type="button" onClick={logout}>Se deconnecter</button>
        </header>

        <section className="exam-card">
          <div className="sources-url-row">
            <input
              type="text"
              className="sources-url-input"
              placeholder="Rechercher une question, un auteur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="question-bank-filter-select"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="tous">Tous</option>
              <option value="mes">Mes questions</option>
              <option value="autres">Questions d'autres profs</option>
            </select>
          </div>
        </section>

        {scope !== 'autres' && (
        <section className="exam-card">
          <h2 className="sources-title">Mes questions</h2>

          {loading ? (
            <div className="sources-placeholder">Chargement...</div>
          ) : error ? (
            <div className="exam-config-error">{error}</div>
          ) : filteredMesQuestions.length === 0 ? (
            <div className="sources-placeholder">Aucune question enregistrée pour le moment.</div>
          ) : (
            <ul className="sources-list">
              {filteredMesQuestions.map((item, index) => (
                <li key={item.id} className="sources-item">
                  <div className="sources-item-select">
                    {editingId === item.id ? (
                      <textarea
                        className="question-item-textarea"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                      />
                    ) : (
                      <span>
                        <strong>{`Q${index + 1}`}</strong> - {item.text}
                        <small>{`Ajoutée le ${formatDate(item.createdAt)}`}</small>
                      </span>
                    )}
                  </div>
                  <div className="question-item-actions">
                    {editingId === item.id ? (
                      <>
                        <button type="button" className="question-link-btn" onClick={saveEdit}>Enregistrer</button>
                        <button type="button" className="question-link-btn" onClick={cancelEdit}>Annuler</button>
                      </>
                    ) : (
                      <button type="button" className="question-link-btn" onClick={() => startEdit(item)}>Modifier</button>
                    )}
                    <button type="button" className="question-link-btn danger" onClick={() => removeQuestion(item.id)}>Supprimer</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {actionMessage && <p className="question-action-success">{actionMessage}</p>}
          {actionError && <p className="question-action-error">{actionError}</p>}
        </section>
        )}

        {scope !== 'mes' && (
        <section className="exam-card">
          <h2 className="sources-title">Anciennes questions d'autres profs</h2>

          {loading ? (
            <div className="sources-placeholder">Chargement...</div>
          ) : error ? (
            <div className="exam-config-error">{error}</div>
          ) : filteredAutresQuestions.length === 0 ? (
            <div className="sources-placeholder">Aucune question disponible pour le moment.</div>
          ) : (
            <ul className="sources-list">
              {filteredAutresQuestions.map((item, index) => (
                <li key={item.id} className="sources-item">
                  <div className="sources-item-select">
                    <span>
                      <strong>{`Q${index + 1}`}</strong> - {item.text}
                      <small>{`Par ${item.createdByName || item.createdByEmail || 'Professeur'} - ${formatDate(item.createdAt)}`}</small>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        )}
      </main>
    </div>
  );
};

export default QuestionBank;
