import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import { downloadExamBankFile, getExamBank, deleteExamBankItem, copyExamBankItem } from '../../api/enseignant/Enseignant.api';
import './ExamBank.css';

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();
const formatDuration = (value) => String(value || '').trim() || '-';

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

const filterExamList = (items, query, status) => {
  const q = String(query || '').trim().toLowerCase();
  const st = normalizeStatus(status);

  return (items || []).filter((item) => {
    const byStatus = st === 'tous' || st === '' ? true : normalizeStatus(item.status) === st;
    if (!byStatus) return false;
    if (!q) return true;
    const haystack = [item.title, item.filiere, item.createdByName, item.createdByEmail]
      .map((v) => String(v || '').toLowerCase())
      .join(' ');
    return haystack.includes(q);
  });
};

/**
 * Extrait un ID string fiable depuis n'importe quelle forme Mongoose/JSON :
 *   - string normale : "69c4595e..."
 *   - ObjectId sérialisé : { $oid: "69c4595e..." }
 *   - ObjectId Mongoose brut : objet avec .toString()
 */
const toId = (id) => {
  if (!id) return '';
  if (typeof id === 'object' && id.$oid) return String(id.$oid);
  if (typeof id === 'object' && typeof id.toString === 'function') return id.toString();
  return String(id);
};

const ExamBank = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [mesExamens, setMesExamens] = useState([]);
  const [autresExamens, setAutresExamens] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getExamBank();
        setMesExamens(Array.isArray(data?.mesExamens) ? data.mesExamens : []);
        setAutresExamens(Array.isArray(data?.autresExamens) ? data.autresExamens : []);
      } catch (err) {
        setError(err?.response?.data?.message || "Impossible de charger la banque d'examens");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!actionMessage && !actionError) return undefined;
    const timer = setTimeout(() => {
      setActionMessage('');
      setActionError('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [actionMessage, actionError]);

  const myFiltered = useMemo(
    () => filterExamList(mesExamens, search, statusFilter),
    [mesExamens, search, statusFilter]
  );

  const othersFiltered = useMemo(
    () => filterExamList(autresExamens, search, statusFilter),
    [autresExamens, search, statusFilter]
  );

  const handleDownload = async (exam) => {
    try {
      const id = toId(exam.id);
      const blob = await downloadExamBankFile(id);
      const safeName = `${String(exam.title || 'examen').replace(/[^a-zA-Z0-9_-]+/g, '_') || 'examen'}.docx`;
      saveBlob(blob, safeName);
      setActionError('');
      setActionMessage('Examen téléchargé avec succès.');
    } catch (err) {
      setActionMessage('');
      setActionError(err?.response?.data?.message || 'Impossible de télécharger cet examen');
    }
  };

  const handleDelete = async (exam) => {
    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir supprimer "${exam.title || 'Examen sans titre'}" ? Cette action ne peut pas être annulée.`
      )
    ) return;

// Extraire l'ID de manière fiable avant l'appel API
    const id = toId(exam.id);

    if (!id) {
      setActionError("Impossible d'identifier l'examen à supprimer.");
      return;
    }

    try {
      await deleteExamBankItem(id);
      // Retirer l'examen de la liste locale avec comparaison normalisée
      setMesExamens((prev) => prev.filter((item) => toId(item.id) !== id));
      setActionError('');
      setActionMessage('Examen supprimé avec succès.');
    } catch (err) {
      setActionMessage('');
      setActionError(err?.response?.data?.message || 'Impossible de supprimer cet examen');
    }
  };

  const handleCopyExam = async (exam) => {
    try {
      const examId = toId(exam.id);
      console.log('[COPY-EXAM] Starting copy for exam:', examId);
      
      const result = await copyExamBankItem(examId);
      console.log('[COPY-EXAM] Copy result:', result);
      
      // Récupérer l'ID de l'examen copié
      const copiedExamId = result.exam?.id || result.exam?._id || result.id || examId;
      console.log('[COPY-EXAM] Copied exam ID:', copiedExamId);
      
      // Open the copied exam in a NEW tab for editing
      const newTabUrl = `/enseignant/exams/create?editExam=${copiedExamId}`;
      window.open(newTabUrl, '_blank');
      
      // Show success message on current page
      setActionMessage(`Examen "${exam.title}" copié avec succès. S'ouvre dans un nouvel onglet pour modification...`);
    } catch (err) {
      console.error('[COPY-EXAM] Error:', err);
      setActionMessage('');
      setActionError(err?.response?.data?.message || 'Erreur lors de la copie de l\'examen');
    }
  };

  return (
    <div className="exam-bank-layout">
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={enseignantNavItems}
        profile={buildEnseignantProfile(user)}
        onLogout={logout}
      />

      <main className="exam-bank-main">
        <div className="exam-bank-topbar">
          <div className="exam-bank-topbar-left">
            <h1 className="exam-bank-title">Bonjour, {user?.Prenom || 'Enseignant'}</h1>
            <p className="exam-bank-subtitle">Gérez vos examens et accédez à la banque d'examens.</p>
          </div>
          <button
            className="exam-bank-btn-primary"
            type="button"
            onClick={() => navigate('/enseignant/exams/create')}
          >
            + Nouvel examen
          </button>
        </div>

        <div className="exam-bank-filters-bar">
          <input
            type="text"
            placeholder="Rechercher par titre, filière, auteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="exam-bank-search"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="exam-bank-select">
            <option value="tous">Tous statuts</option>
            <option value="exporte">Exporté</option>
            <option value="en cours">En cours</option>
            <option value="brouillon">Brouillon</option>
          </select>
        </div>

        {error && <div className="exam-bank-alert exam-bank-alert-error">{error}</div>}
        {actionMessage && <div className="exam-bank-alert exam-bank-alert-success">{actionMessage}</div>}
        {actionError && <div className="exam-bank-alert exam-bank-alert-error">{actionError}</div>}

        {/* ── Mes examens ─────────────────────────────────────────────── */}
        <section className="exam-bank-section">
          <h2 className="exam-bank-section-title">Mes examens</h2>

          {loading ? (
            <div className="exam-bank-empty">Chargement...</div>
          ) : myFiltered.length === 0 ? (
            <div className="exam-bank-empty">Aucun examen dans mes sauvegardes.</div>
          ) : (
            <div className="exam-bank-cards-grid">
              {myFiltered.map((exam) => (
                <div key={toId(exam.id)} className="exam-bank-card">
                  <div className="exam-bank-card-header">
                    <h3 className="exam-bank-card-title">{exam.title || 'Examen sans titre'}</h3>
                    <span className={`exam-bank-badge exam-bank-badge-${String(exam.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      {exam.status || '—'}
                    </span>
                  </div>

                  <div className="exam-bank-card-content">
                    <div className="exam-bank-card-row">
                      <span className="exam-bank-card-label">Filière</span>
                      <span className="exam-bank-card-value">{exam.filiere || '—'}</span>
                    </div>
                    <div className="exam-bank-card-row">
                      <span className="exam-bank-card-label">Durée</span>
                      <span className="exam-bank-card-value">{formatDuration(exam.duree)} min</span>
                    </div>
                    <div className="exam-bank-card-row">
                      <span className="exam-bank-card-label">Points totaux</span>
                      <span className="exam-bank-card-value">{Number(exam.noteTotale) || 0}</span>
                    </div>
                    <div className="exam-bank-card-row">
                      <span className="exam-bank-card-label">Questions</span>
                      <span className="exam-bank-card-value">{Number(exam.questionsCount) || 0}</span>
                    </div>
                  </div>

                  <div className="exam-bank-card-actions">
                    <button type="button" className="exam-bank-btn-action exam-bank-btn-download" onClick={() => handleDownload(exam)}>
                      Télécharger
                    </button>
                    <button type="button" className="exam-bank-btn-action exam-bank-btn-delete" onClick={() => handleDelete(exam)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Anciens examens d'autres profs ──────────────────────────── */}
        <section className="exam-bank-section">
          <h2 className="exam-bank-section-title">Anciens examens d'autres profs</h2>

          {loading ? (
            <div className="exam-bank-empty">Chargement...</div>
          ) : othersFiltered.length === 0 ? (
            <div className="exam-bank-empty">Aucun examen disponible pour le moment.</div>
          ) : (
            <div className="exam-bank-cards-grid">
              {othersFiltered.map((exam) => (
                <div key={toId(exam.id)} className="exam-bank-card exam-bank-card-other">
                  <div className="exam-bank-card-header">
                    <h3 className="exam-bank-card-title">{exam.title || 'Examen sans titre'}</h3>
                    <span className="exam-bank-badge-author">par {exam.createdByName || exam.createdByEmail || 'Professeur'}</span>
                  </div>

                  <div className="exam-bank-card-content">
                    <div className="exam-bank-card-row">
                      <span className="exam-bank-card-label">Filière</span>
                      <span className="exam-bank-card-value">{exam.filiere || '—'}</span>
                    </div>
                    <div className="exam-bank-card-row">
                      <span className="exam-bank-card-label">Durée</span>
                      <span className="exam-bank-card-value">{formatDuration(exam.duree)} min</span>
                    </div>
                    <div className="exam-bank-card-row">
                      <span className="exam-bank-card-label">Points totaux</span>
                      <span className="exam-bank-card-value">{Number(exam.noteTotale) || 0}</span>
                    </div>
                    <div className="exam-bank-card-row">
                      <span className="exam-bank-card-label">Questions</span>
                      <span className="exam-bank-card-value">{Number(exam.questionsCount) || 0}</span>
                    </div>
                  </div>

                  <div className="exam-bank-card-actions">
                    <button type="button" className="exam-bank-btn-action exam-bank-btn-copy" onClick={() => handleCopyExam(exam)}>
                      Copier cet examen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ExamBank;