import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../../components/sidebar/Sidebar';
import useAuth from '../../context/useAuth';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';

// Import des icônes (après avoir fait npm install react-icons)
import { FiPlus, FiBookOpen, FiCpu, FiArrowRight, FiActivity, FiLayers, FiDownload } from 'react-icons/fi';

import '../../styles/TeacherDashboard.css';

function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profil, setProfil] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  // 1. Calcul des statistiques avec icônes
  const quickStats = useMemo(() => {
    const stats = profil?.stats || { examens: 0, questions: 0, exports: 0 };
    return [
      { label: 'Examens',   value: stats.examens,   color: 'blue',   icon: <FiBookOpen /> },
      { label: 'Questions', value: stats.questions, color: 'gold',   icon: <FiLayers /> },
      { label: 'Exports',   value: stats.exports,   color: 'green',  icon: <FiDownload /> },
    ];
  }, [profil]);

  const recentExams = useMemo(() => profil?.recentExams || [], [profil]);

  const nomComplet = profil?.nomComplet || [user?.Prenom, user?.Nom].filter(Boolean).join(' ') || 'Enseignant';
  const prenom = user?.Prenom || nomComplet.split(' ')[0];

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
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await axios.get(`${apiBase}/enseignant/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfil(response.data);
      } catch (error) {
        if (error?.response?.status === 401) seDeconnecter();
        setErreur('Impossible de charger les données.');
      } finally {
        setChargement(false);
      }
    };
    loadDashboard();
  }, [navigate, seDeconnecter, user]);

  if (chargement) {
    return (
      <div className="teacher-shell loading-shell">
        <div className="teacher-loading-card">Initialisation de votre espace...</div>
      </div>
    );
  }

  const heure = new Date().getHours();
  const salutation = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="teacher-shell">
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={enseignantNavItems}
        profile={buildEnseignantProfile(user)}
        onLogout={seDeconnecter}
      />

      <main className="teacher-main">
        {/* ── En-tête Dynamique ── */}
        <header className="teacher-header">
         
         
        </header>

        {erreur && <p className="teacher-alert-error">{erreur}</p>}

        {/* ── Stats avec icônes ── */}
        <section className="teacher-stats-grid">
          {quickStats.map((stat) => (
            <article className="teacher-stat-card" key={stat.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className={`teacher-stat-value ${stat.color}`}>{stat.value}</span>
                <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>{stat.icon}</span>
              </div>
              <span className="teacher-stat-label">{stat.label}</span>
            </article>
          ))}
        </section>

        {/* ── Grille de Contenu ── */}
        <section className="teacher-content-grid">
          
          {/* Section Activité récente */}
          <article className="teacher-panel">
            <div className="teacher-panel-header">
              <div className="teacher-panel-title-group">
                <span className="teacher-panel-icon activity">
                  <FiActivity />
                </span>
                <div>
                  <h3>Activité récente</h3>
                  <p className="teacher-panel-subtitle">Vos derniers examens créés</p>
                </div>
              </div>
              <span className="teacher-panel-count">{recentExams.length}</span>
            </div>

            {recentExams.length === 0 ? (
              <div className="teacher-empty-state">
                <span className="teacher-empty-icon">📋</span>
                <p className="teacher-empty-title">Aucune activité récente</p>
                <p className="teacher-empty-sub">Créez votre premier examen pour commencer.</p>
              </div>
            ) : (
              <ul className="teacher-activity-list">
                {recentExams.map((exam, idx) => {
                  const titre = typeof exam === 'object' ? (exam.titre || exam.title || 'Sans titre') : exam;
                  const date  = typeof exam === 'object' ? (exam.updatedAt || exam.date || exam.createdAt) : null;
                  const statut = typeof exam === 'object' ? (exam.statut || exam.status) : null;
                  const isPublie = statut === 'publié' || statut === 'done';
                  const formattedDate = date
                    ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                    : null;
                  return (
                    <li
                      key={idx}
                      className="teacher-activity-item"
                      onClick={() => navigate('/enseignant/exams/bank')}
                    >
                      {/* Ligne de timeline */}
                      <div className="teacher-activity-timeline">
                        <span className={`teacher-activity-dot ${isPublie ? 'dot-green' : 'dot-gold'}`} />
                        {idx < recentExams.length - 1 && <span className="teacher-activity-line" />}
                      </div>

                      {/* Contenu */}
                      <div className="teacher-activity-card">
                        <div className="teacher-activity-card-top">
                          <span className="teacher-activity-icon-wrap">
                            <FiBookOpen />
                          </span>
                          <div className="teacher-activity-info">
                            <span className="teacher-activity-name">{titre}</span>
                            {formattedDate && (
                              <span className="teacher-activity-date">
                                Modifié le {formattedDate}
                              </span>
                            )}
                          </div>
                          <div className="teacher-activity-right">
                            {statut && (
                              <span className={`teacher-exam-badge ${isPublie ? 'done' : 'draft'}`}>
                                {isPublie ? 'Publié' : 'Brouillon'}
                              </span>
                            )}
                            <FiArrowRight className="teacher-exam-arrow" />
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <button className="teacher-link-btn" onClick={() => navigate('/enseignant/exams/bank')}>
              Explorer toute la banque →
            </button>
          </article>

          {/* Section Actions & IA */}
          <article className="teacher-panel" style={{ background: 'var(--td-bg-elevated)' }}>
            <h3 style={{ borderBottomColor: 'rgba(0,0,0,0.05)' }}><FiCpu style={{ marginRight: '8px' }} /> Assistant intelligent</h3>
            <div className="teacher-actions-col">
              <button className="teacher-primary-action" onClick={() => navigate('/enseignant/exams/create')}>
                <FiPlus style={{ marginRight: '8px' }} /> Créer un nouvel examen
              </button>
              
              <div style={{ marginTop: '10px', padding: '15px', background: '#fff', borderRadius: 'var(--td-radius-sm)', border: '1px solid var(--td-border)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--td-text-label)', marginBottom: '12px' }}>
                  Utilisez l'IA pour générer des questions à partir d'un texte ou d'un sujet.
                </p>
                <button className="teacher-secondary-action" style={{ width: '100%' }} onClick={() => navigate('/enseignant/questions/generator')}>
                   Générer des questions par IA
                </button>
              </div>

              <button className="teacher-secondary-action" onClick={() => navigate('/enseignant/questions/bank')}>
                Consulter la banque de questions
              </button>
            </div>
          </article>

        </section>

        <footer className="teacher-footer">
          <i className="teacher-dot" />
          Portail ExamGen-IA · {new Date().getFullYear()} · Mode sécurisé
        </footer>
      </main>
    </div>
  );
}

export default TeacherDashboard;