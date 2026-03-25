import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import { downloadExamBankFile, getExamBank } from '../../api/enseignant/Enseignant.api';
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

    const haystack = [
      item.title,
      item.filiere,
      item.createdByName,
      item.createdByEmail,
    ]
      .map((v) => String(v || '').toLowerCase())
      .join(' ');

    return haystack.includes(q);
  });
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
      const blob = await downloadExamBankFile(exam.id);
      const safeName = `${String(exam.title || 'examen').replace(/[^a-zA-Z0-9_-]+/g, '_') || 'examen'}.docx`;
      saveBlob(blob, safeName);
      setActionError('');
      setActionMessage('Examen telecharge avec succes.');
    } catch (err) {
      setActionMessage('');
      setActionError(err?.response?.data?.message || 'Impossible de telecharger cet examen');
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
        <header className="exam-bank-header">
          <h1>Mes examens sauvegardes</h1>
          <button className="exam-bank-logout" type="button" onClick={logout}>Se deconnecter</button>
        </header>

        <section className="exam-bank-filters">
          <input
            type="text"
            placeholder="Rechercher par titre, filiere, auteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="tous">Tous</option>
            <option value="exporte">Exporte</option>
            <option value="en cours">En cours</option>
            <option value="brouillon">Brouillon</option>
          </select>

          <button type="button" className="exam-bank-new-btn" onClick={() => navigate('/enseignant/exams/create')}>
            + Nouvel examen
          </button>
        </section>

        {error && <p className="exam-bank-error">{error}</p>}
        {actionMessage && <p className="exam-bank-success">{actionMessage}</p>}
        {actionError && <p className="exam-bank-error">{actionError}</p>}

        <section className="exam-bank-card">
          <h2>Mes examens</h2>

          {loading ? (
            <div className="exam-bank-empty">Chargement...</div>
          ) : myFiltered.length === 0 ? (
            <div className="exam-bank-empty">Aucun examen dans mes sauvegardes.</div>
          ) : (
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
                  <tr key={exam.id}>
                    <td>
                      <strong>{exam.title || 'Examen sans titre'}</strong>
                      <small>{formatDuration(exam.duree)}</small>
                    </td>
                    <td>{exam.filiere || '-'}</td>
                    <td>{exam.status || '-'}</td>
                    <td>{Number(exam.noteTotale) || 0}</td>
                    <td>{Number(exam.questionsCount) || 0}</td>
                    <td>
                      <button type="button" className="exam-bank-action-btn" onClick={() => handleDownload(exam)}>
                        Telecharger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="exam-bank-card">
          <h2>Anciens examens d'autres profs</h2>

          {loading ? (
            <div className="exam-bank-empty">Chargement...</div>
          ) : othersFiltered.length === 0 ? (
            <div className="exam-bank-empty">Aucun examen disponible pour le moment.</div>
          ) : (
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
                  <tr key={exam.id}>
                    <td>
                      <strong>{exam.title || 'Examen sans titre'}</strong>
                      <small>{formatDuration(exam.duree)}</small>
                    </td>
                    <td>{exam.filiere || '-'}</td>
                    <td>{exam.createdByName || exam.createdByEmail || 'Professeur'}</td>
                    <td>{Number(exam.noteTotale) || 0}</td>
                    <td>{Number(exam.questionsCount) || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
};

export default ExamBank;
