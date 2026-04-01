import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/sidebar/Sidebar';
import useAuth from '../../context/useAuth';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import '../../styles/TeacherDashboard.css';

function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profil, setProfil] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const quickStats = useMemo(() => {
    if (!profil?.stats) {
      return [
        { label: 'Examens', value: 0, color: 'blue' },
        { label: 'Questions', value: 0, color: 'violet' },
        { label: 'Exports', value: 0, color: 'green' },
        { label: 'Requetes IA', value: 0, color: 'orange' },
      ];
    }

    return [
      { label: 'Examens', value: profil.stats.examens || 0, color: 'blue' },
      { label: 'Questions', value: profil.stats.questions || 0, color: 'violet' },
      { label: 'Exports', value: profil.stats.exports || 0, color: 'green' },
      { label: 'Requetes IA', value: profil.stats.requetesIA || 0, color: 'orange' },
    ];
  }, [profil]);

  const recentExams = useMemo(() => profil?.recentExams || [], [profil]);

  const nomComplet =
    profil?.nomComplet ||
    [user?.Prenom, user?.Nom].filter(Boolean).join(' ').trim() ||
    user?.Email ||
    'Enseignant';

  const seDeconnecter = useCallback(() => {
    logout();
    navigate('/enseignant/login', { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token || user?.role !== 'enseignant') {
      navigate('/enseignant/login', { replace: true });
      return;
    }

    const loadDashboard = async () => {
      try {
        setChargement(true);
        setErreur('');

        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await axios.get(`${apiBase}/enseignant/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const payload = response.data || {};
        const remoteProfile = payload.profile || {};

        const merged = {
          nomComplet:
            remoteProfile.nomComplet ||
            [remoteProfile.prenom, remoteProfile.nom].filter(Boolean).join(' ').trim() ||
            [user?.Prenom, user?.Nom].filter(Boolean).join(' ').trim() ||
            user?.Email ||
            'Enseignant',
          email: remoteProfile.email || user?.Email || '',
          grade: remoteProfile.grade || user?.Grade || '',
          stats: payload.stats || { examens: 0, questions: 0, exports: 0, requetesIA: 0 },
          recentExams: Array.isArray(payload.recentExams) ? payload.recentExams : [],
        };

        setProfil(merged);
      } catch (error) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          seDeconnecter();
          return;
        }

        setErreur(
          error?.response?.data?.message || 'Impossible de charger votre tableau de bord.'
        );
      } finally {
        setChargement(false);
      }
    };

    loadDashboard();
  }, [navigate, seDeconnecter, user]);

  if (chargement) {
    return (
      <div className="teacher-shell loading-shell">
        <div className="teacher-loading-card">Chargement du dashboard enseignant...</div>
      </div>
    );
  }

  return (
    <div className="teacher-shell">
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={enseignantNavItems}
        profile={buildEnseignantProfile(user)}
        onLogout={seDeconnecter}
      />

      <main className="teacher-main">
        <header className="teacher-main-header">
          <h2>Bonjour, {nomComplet}</h2>
          <button className="teacher-logout" onClick={seDeconnecter}>Se deconnecter</button>
        </header>

        {erreur && <p className="teacher-alert-error">{erreur}</p>}

        <section className="teacher-stats-grid">
          {quickStats.map((stat) => (
            <article className="teacher-stat-card" key={stat.label}>
              <span className={`teacher-stat-value ${stat.color}`}>{stat.value}</span>
              <span className="teacher-stat-label">{stat.label}</span>
            </article>
          ))}
        </section>

        <section className="teacher-content-grid">
          <article className="teacher-panel">
            <h3>Examens recents</h3>
            {recentExams.length === 0 ? (
              <p className="teacher-empty">Aucun examen recent pour le moment.</p>
            ) : (
              <ul>
                {recentExams.map((exam) => (
                  <li key={exam}>{exam}</li>
                ))}
              </ul>
            )}
            <button className="teacher-link-btn">Voir tous les examens</button>
          </article>

          <article className="teacher-panel">
            <h3>Actions rapides</h3>
            <div className="teacher-actions-col">
              <button className="teacher-primary-action" onClick={() => navigate('/enseignant/exams/create')}>
                + Creer un nouvel examen
              </button>
              <button className="teacher-secondary-action" onClick={() => navigate('/enseignant/modeles-word')}>
                Consulter la banque de questions
              </button>
              <button className="teacher-secondary-action" onClick={() => navigate('/enseignant/modeles-word')}>
                Assistant IA
              </button>
            </div>
          </article>
        </section>

        <footer className="teacher-footer">
          <span><i className="teacher-dot" />Connecte en tant que Professeur a Session active</span>
        </footer>
      </main>
    </div>
  );
}

export default TeacherDashboard;
