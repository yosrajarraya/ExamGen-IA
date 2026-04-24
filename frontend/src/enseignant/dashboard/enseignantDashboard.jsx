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
        { label: 'Examens',   value: 0, color: 'blue'   },
        { label: 'Questions', value: 0, color: 'violet'  },
        { label: 'Exports',   value: 0, color: 'green'   },
      ];
    }
    return [
      { label: 'Examens',   value: profil.stats.examens   || 0, color: 'blue'   },
      { label: 'Questions', value: profil.stats.questions || 0, color: 'violet'  },
      { label: 'Exports',   value: profil.stats.exports   || 0, color: 'green'   },
    ];
  }, [profil]);

  const recentExams = useMemo(() => profil?.recentExams || [], [profil]);

  const nomComplet =
    profil?.nomComplet ||
    [user?.Prenom, user?.Nom].filter(Boolean).join(' ').trim() ||
    user?.Email ||
    'Enseignant';

  const prenom = user?.Prenom || nomComplet.split(' ')[0] || 'Enseignant';

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
          departement: remoteProfile.departement || user?.Departement || '',
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
        <div className="teacher-loading-card">Chargement du tableau de bord…</div>
      </div>
    );
  }

  // Heure de la journée pour le message d'accueil
  const heure = new Date().getHours();
  const salutation =
    heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="teacher-shell">
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={enseignantNavItems}
        profile={buildEnseignantProfile(user)}
        onLogout={seDeconnecter}
      />

      <main className="teacher-main">

        {/* ── En-tête ── */}
        <header className="teacher-header">
          <div className="teacher-header-left">
            <p className="teacher-header-greeting">Tableau de bord</p>
            <h1 className="teacher-header-title">
              {salutation}, <span>{prenom}</span>
            </h1>
            <p className="teacher-header-sub">
              {profil?.grade ? `${profil.grade} · ` : ''}
              {profil?.departement ? `${profil.departement} · ` : ''}
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <div className="teacher-header-badge">
            Session active
          </div>
        </header>

        {/* ── Erreur ── */}
        {erreur && <p className="teacher-alert-error">{erreur}</p>}

        {/* ── Stats ── */}
        <section className="teacher-stats-grid">
          {quickStats.map((stat) => (
            <article className="teacher-stat-card" key={stat.label}>
              <span className={`teacher-stat-value ${stat.color}`}>{stat.value}</span>
              <span className="teacher-stat-label">{stat.label}</span>
            </article>
          ))}
        </section>

        {/* ── Contenu ── */}
        <section className="teacher-content-grid">

          {/* Examens récents */}
          <article className="teacher-panel">
            <h3>Examens récents</h3>
            {recentExams.length === 0 ? (
              <p className="teacher-empty">Aucun examen créé pour le moment.</p>
            ) : (
              <ul className="teacher-exams-list">
                {recentExams.map((exam, idx) => (
                  <li key={idx} className="teacher-exam-item">
                    <span className="teacher-exam-icon">📄</span>
                    <span className="teacher-exam-name">{exam}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              className="teacher-link-btn"
              onClick={() => navigate('/enseignant/exams/bank')}
            >
              Voir tous les examens →
            </button>
          </article>

          {/* Actions rapides */}
          <article className="teacher-panel actions-panel">
            <h3>Actions rapides</h3>
            <div className="teacher-quick-cards">
              <div 
                className="q-card q-primary"
                onClick={() => navigate('/enseignant/exams/create')}
              >
                <div className="q-card-icon">✨</div>
                <div className="q-card-body">
                  <h4>Créer un examen</h4>
                  <p>Générez un sujet complet avec l'aide de l'IA</p>
                </div>
                <div className="q-card-arrow">→</div>
              </div>

              <div 
                className="q-card q-secondary"
                onClick={() => navigate('/enseignant/questions/bank')}
              >
                <div className="q-card-icon">📚</div>
                <div className="q-card-body">
                  <h4>Banque de questions</h4>
                  <p>Gérez et organisez votre base de connaissances</p>
                </div>
                <div className="q-card-arrow">→</div>
              </div>
            </div>
          </article>

        </section>

        {/* ── Footer ── */}
        <footer className="teacher-footer">
          <i className="teacher-dot" />
          Connecté en tant que Professeur · Session active
        </footer>

      </main>
    </div>
  );
}

export default TeacherDashboard;