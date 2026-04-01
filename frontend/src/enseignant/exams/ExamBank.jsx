import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import { downloadExamBankFile, getExamBank, deleteExamBankItem } from '../../api/enseignant/Enseignant.api';
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
 * ✅ Extrait un ID string fiable depuis n'importe quelle forme Mongoose/JSON :
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

    // ✅ Extraire l'ID de manière fiable avant l'appel API
    const id = toId(exam.id);

    if (!id) {
      setActionError("Impossible d'identifier l'examen à supprimer.");
      return;
    }

    try {
      await deleteExamBankItem(id);
      // ✅ Retirer l'examen de la liste locale avec comparaison normalisée
      setMesExamens((prev) => prev.filter((item) => toId(item.id) !== id));
      setActionError('');
      setActionMessage('Examen supprimé avec succès.');
    } catch (err) {
      setActionMessage('');
      setActionError(err?.response?.data?.message || 'Impossible de supprimer cet examen');
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
            <div className="exam-bank-table-wrapper">
              <table className="exam-bank-table">
                <thead>
                  <tr>
                    <th>Examen</th>
                    <th>Filiere</th>
                    <th>Statut</th>
                    <th>Pts</th>
                    <th>Q.</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myFiltered.map((exam) => (
                    <tr key={toId(exam.id)} className="exam-bank-row">
                      <td className="exam-bank-cell-title">
                        <div className="exam-bank-title-block">
                          <span className="exam-bank-exam-name">{exam.title || 'Examen sans titre'}</span>
                          {formatDuration(exam.duree) !== '-' && (
                            <span className="exam-bank-exam-duration">{formatDuration(exam.duree)}</span>
                          )}
                        </div>
                      </td>
                      <td className="exam-bank-cell">{exam.filiere || '—'}</td>
                      <td className="exam-bank-cell">
                        <span className={`exam-bank-badge exam-bank-badge-${String(exam.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                          {exam.status || '—'}
                        </span>
                      </td>
                      <td className="exam-bank-cell exam-bank-cell-number">{Number(exam.noteTotale) || 0}</td>
                      <td className="exam-bank-cell exam-bank-cell-number">{Number(exam.questionsCount) || 0}</td>
                      <td className="exam-bank-cell exam-bank-cell-action">
                        <button type="button" className="exam-bank-btn-download" onClick={() => handleDownload(exam)}>
                          Telecharger
                        </button>
                        <button type="button" className="exam-bank-btn-delete" onClick={() => handleDelete(exam)}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <div className="exam-bank-table-wrapper">
              <table className="exam-bank-table">
                <thead>
                  <tr>
                    <th>Examen</th>
                    <th>Filiere</th>
                    <th>Auteur</th>
                    <th>Pts</th>
                    <th>Q.</th>
                  </tr>
                </thead>
                <tbody>
                  {othersFiltered.map((exam) => (
                    <tr key={toId(exam.id)} className="exam-bank-row">
                      <td className="exam-bank-cell-title">
                        <div className="exam-bank-title-block">
                          <span className="exam-bank-exam-name">{exam.title || 'Examen sans titre'}</span>
                          {formatDuration(exam.duree) !== '-' && (
                            <span className="exam-bank-exam-duration">{formatDuration(exam.duree)}</span>
                          )}
                        </div>
                      </td>
                      <td className="exam-bank-cell">{exam.filiere || '—'}</td>
                      <td className="exam-bank-cell exam-bank-cell-author">
                        {exam.createdByName || exam.createdByEmail || 'Professeur'}
                      </td>
                      <td className="exam-bank-cell exam-bank-cell-number">{Number(exam.noteTotale) || 0}</td>
                      <td className="exam-bank-cell exam-bank-cell-number">{Number(exam.questionsCount) || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ExamBank;