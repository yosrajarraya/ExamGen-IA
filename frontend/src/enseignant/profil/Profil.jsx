import { useState, useEffect } from 'react';
import { getProfil, updateProfil, changePassword, getDepartements } from '../../api/enseignant/Enseignant.api';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import './Profil.css';

/* ── Toast ── */
const Toast = ({ message, type = 'success' }) =>
  message ? (
    <div className={`pf-toast pf-toast--${type}`} role="status">
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  ) : null;

/* ── Initiales avatar ── */
const Avatar = ({ prenom, nom, size = 'lg' }) => {
  const initials = `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase();
  return <div className={`pf-avatar pf-avatar--${size}`}>{initials}</div>;
};

const Profil = () => {
  const { user, logout } = useAuth();
  const [profil, setProfil]           = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast]             = useState({ msg: '', type: 'success' });
  const [departements, setDepartements] = useState([]);
  const [activeSection, setActiveSection] = useState('info');

  const [editForm, setEditForm]   = useState({ Telephone: '', Grade: '', Departement: '', Specialite: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]   = useState('');

  const [pwForm, setPwForm]     = useState({ ancienPassword: '', nouveauPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError]   = useState('');
  const [showOld, setShowOld]   = useState(false);
  const [showNew, setShowNew]   = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  useEffect(() => {
    (async () => {
      try {
        const [depts, data] = await Promise.all([
          getDepartements().catch(() => []),
          getProfil(),
        ]);
        setDepartements(Array.isArray(depts) ? depts : []);
        setProfil(data);
        setEditForm({
          Telephone:  data.Telephone  || '',
          Grade:      data.Grade      || '',
          Departement: data.Departement || '',
          Specialite: data.Specialite || '',
        });
      } catch {
        showToast('Erreur lors du chargement du profil', 'error');
      } finally {
        setPageLoading(false);
      }
    })();
  }, []);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true); setEditError('');
    try {
      const data = await updateProfil(editForm);
      setProfil(data.enseignant);
      showToast('Profil mis à jour avec succès');
    } catch (err) {
      setEditError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setEditLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwLoading(true); setPwError('');
    try {
      await changePassword(pwForm.ancienPassword, pwForm.nouveauPassword);
      showToast('Mot de passe changé avec succès');
      setPwForm({ ancienPassword: '', nouveauPassword: '' });
    } catch (err) {
      setPwError(err.response?.data?.message || 'Erreur lors du changement');
    } finally {
      setPwLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="pf-layout">
        <Sidebar roleLabel="Espace enseignant" navItems={enseignantNavItems} profile={buildEnseignantProfile(user)} onLogout={logout} />
        <main className="pf-main profil-main">
          <div className="pf-loading">
            <p>Chargement du profil…</p>
          </div>
        </main>
      </div>
    );
  }

  const FIELDS = [
    { key: 'Telephone',  label: 'Téléphone',   placeholder: 'Ex : 95 000 000',    icon: '📞' },
    { key: 'Grade',      label: 'Grade',        placeholder: 'Ex : Maître Assistant', icon: '🎓' },
    { key: 'Specialite', label: 'Spécialité',   placeholder: 'Ex : Algorithmique', icon: '🔬' },
  ];

  return (
    <div className="pf-layout">
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={enseignantNavItems}
        profile={buildEnseignantProfile(user)}
        onLogout={logout}
      />

      <main className="pf-main profil-main">

        {/* ── Hero banner ── */}
        <div className="pf-hero">
          <div className="pf-hero-bg" />
          <div className="pf-hero-content">
            <div className="pf-hero-info">
              <h1 className="pf-hero-name">{profil?.Prenom} {profil?.Nom}</h1>
              <p className="pf-hero-email">{profil?.Email}</p>
              <div className="pf-hero-meta">
                {profil?.Departement && (
                  <span className="pf-meta-chip pf-meta-chip--dept">
                    🏛 {profil.Departement}
                  </span>
                )}
                {profil?.Grade && (
                  <span className="pf-meta-chip pf-meta-chip--grade">
                    🎓 {profil.Grade}
                  </span>
                )}
                <span className={`pf-meta-chip ${profil?.Active ? 'pf-meta-chip--active' : 'pf-meta-chip--inactive'}`}>
                  {profil?.Active ? '● Compte actif' : '● Compte désactivé'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Navigation sections ── */}
        <div className="pf-nav">
          <button
            className={`pf-nav-btn${activeSection === 'info' ? ' pf-nav-btn--active' : ''}`}
            onClick={() => setActiveSection('info')}
          >
            <span>👤</span> Informations personnelles
          </button>
          <button
            className={`pf-nav-btn${activeSection === 'security' ? ' pf-nav-btn--active' : ''}`}
            onClick={() => setActiveSection('security')}
          >
            <span>🔒</span> Sécurité
          </button>
        </div>

        {/* ── Section : Informations ── */}
        {activeSection === 'info' && (
          <div className="pf-section">
            <div className="pf-section-header">
              <div>
                <h2 className="pf-section-title">Informations personnelles</h2>
                <p className="pf-section-sub">Mettez à jour vos informations de profil</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="pf-form" noValidate>
              <div className="pf-form-grid">
                {FIELDS.map(({ key, label, placeholder, icon }) => (
                  <div className="pf-field" key={key}>
                    <label className="pf-field-label">
                      <span className="pf-field-icon">{icon}</span>
                      {label}
                    </label>
                    <input
                      type="text"
                      className="pf-field-input"
                      value={editForm[key]}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                      placeholder={placeholder}
                    />
                  </div>
                ))}

                {/* Département — select */}
                <div className="pf-field">
                  <label className="pf-field-label">
                    <span className="pf-field-icon">🏛</span>
                    Département
                  </label>
                  <select
                    className="pf-field-input pf-field-select"
                    value={editForm.Departement}
                    onChange={(e) => setEditForm({ ...editForm, Departement: e.target.value })}
                  >
                    <option value="">Sélectionner un département</option>
                    {departements.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                    {editForm.Departement && !departements.some((d) => d.name === editForm.Departement) && (
                      <option value={editForm.Departement}>{editForm.Departement}</option>
                    )}
                  </select>
                </div>
              </div>

              {editError && (
                <div className="pf-alert pf-alert--error">
                  ✕ {editError}
                </div>
              )}

              <div className="pf-form-actions">
                <button type="submit" className="pf-btn pf-btn--primary" disabled={editLoading}>
                  {editLoading ? (
                    <><span className="pf-btn-spinner" /> Enregistrement…</>
                  ) : (
                    <><span>💾</span> Enregistrer les modifications</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Section : Sécurité ── */}
        {activeSection === 'security' && (
          <div className="pf-section">
            <div className="pf-section-header">
              <div>
                <h2 className="pf-section-title">Changer le mot de passe</h2>
                <p className="pf-section-sub">Assurez-vous d'utiliser un mot de passe fort</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="pf-form pf-form--narrow" noValidate>
              <div className="pf-field">
                <label className="pf-field-label">
                  <span className="pf-field-icon">🔑</span>
                  Mot de passe actuel
                </label>
                <div className="pf-pw-wrap">
                  <input
                    type={showOld ? 'text' : 'password'}
                    className="pf-field-input"
                    value={pwForm.ancienPassword}
                    onChange={(e) => setPwForm({ ...pwForm, ancienPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                  <button type="button" className="pf-pw-eye" onClick={() => setShowOld(!showOld)}>
                    {showOld ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div className="pf-field">
                <label className="pf-field-label">
                  <span className="pf-field-icon">🔐</span>
                  Nouveau mot de passe
                </label>
                <div className="pf-pw-wrap">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="pf-field-input"
                    value={pwForm.nouveauPassword}
                    onChange={(e) => setPwForm({ ...pwForm, nouveauPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                  <button type="button" className="pf-pw-eye" onClick={() => setShowNew(!showNew)}>
                    {showNew ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {pwError && (
                <div className="pf-alert pf-alert--error">
                  ✕ {pwError}
                </div>
              )}

              <div className="pf-form-actions">
                <button type="submit" className="pf-btn pf-btn--primary" disabled={pwLoading}>
                  {pwLoading ? (
                    <><span className="pf-btn-spinner" /> Modification…</>
                  ) : (
                    <><span>🔒</span> Changer le mot de passe</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

      </main>

      <Toast message={toast.msg} type={toast.type} />
    </div>
  );
};

export default Profil;
