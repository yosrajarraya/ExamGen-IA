import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { getProfil, updateProfil, changePassword, getDepartements } from '../../api/enseignant/Enseignant.api';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import './Profil.css';

/* ═══════════════════════════════════════════════════════════
   SOUS-COMPOSANTS — Mémoïsés pour éviter les re-renders
   ═══════════════════════════════════════════════════════════ */

/** Toast notification avec aria-live pour l'accessibilité */
const Toast = memo(({ message, type = 'success' }) => {
  if (!message) return null;
  return (
    <div 
      className={`pf-toast pf-toast--${type}`} 
      role="status" 
      aria-live="polite"
      aria-atomic="true"
    >
      <span aria-hidden="true">{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
    </div>
  );
});
Toast.displayName = 'Toast';

/** Avatar avec initiales */
const Avatar = memo(({ prenom, nom, size = 'lg' }) => {
  const initials = useMemo(() => 
    `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase(), 
    [prenom, nom]
  );
  return <div className={`pf-avatar pf-avatar--${size}`} aria-hidden="true">{initials}</div>;
});
Avatar.displayName = 'Avatar';

/** Hero banner du profil */
const ProfileHero = memo(({ profil }) => {
  if (!profil) return null;
  
  return (
    <header className="pf-hero" role="banner">
      <div className="pf-hero-content">
        <Avatar prenom={profil.Prenom} nom={profil.Nom} size="xl" />
        <div className="pf-hero-info">
          <h1 className="pf-hero-name">{profil.Prenom} {profil.Nom}</h1>
          <p className="pf-hero-email">{profil.Email}</p>
          <div className="pf-hero-meta">
            {profil.Departement && (
              <span className="pf-meta-chip pf-meta-chip--dept">
                <span aria-hidden="true">🏛</span> {profil.Departement}
              </span>
            )}
            {profil.Grade && (
              <span className="pf-meta-chip pf-meta-chip--grade">
                <span aria-hidden="true">🎓</span> {profil.Grade}
              </span>
            )}
            <span className={`pf-meta-chip ${profil.Active ? 'pf-meta-chip--active' : 'pf-meta-chip--inactive'}`}>
              <span aria-hidden="true">●</span> {profil.Active ? 'Compte actif' : 'Compte désactivé'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
});
ProfileHero.displayName = 'ProfileHero';

/** Navigation par onglets */
const ProfileNav = memo(({ activeSection, onChange }) => {
  const tabs = useMemo(() => [
    { id: 'info', label: 'Informations personnelles', icon: '👤' },
    { id: 'security', label: 'Sécurité', icon: '🔒' },
  ], []);

  return (
    <nav className="pf-nav" role="tablist" aria-label="Sections du profil">
      {tabs.map(({ id, label, icon }) => (
        <button
          key={id}
          role="tab"
          aria-selected={activeSection === id}
          aria-controls={`panel-${id}`}
          id={`tab-${id}`}
          className={`pf-nav-btn${activeSection === id ? ' pf-nav-btn--active' : ''}`}
          onClick={() => onChange(id)}
        >
          <span aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
});
ProfileNav.displayName = 'ProfileNav';

/** État initial réutilisable */
const initialEditState = { Telephone: '', Grade: '', Departement: '', Specialite: '' };
const initialPwState = { ancienPassword: '', nouveauPassword: '' };

/* ═══════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ═══════════════════════════════════════════════════════════ */

const Profil = () => {
  const { user, logout } = useAuth();
  
  // ── États ──
  const [profil, setProfil] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [departements, setDepartements] = useState([]);
  const [activeSection, setActiveSection] = useState('info');
  
  // Formulaires avec useReducer pour une gestion centralisée
  const [editForm, setEditForm] = useState(initialEditState);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  
  const [pwForm, setPwForm] = useState(initialPwState);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // ── Callbacks ──
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    // Nettoyage automatique
    const timer = setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleSectionChange = useCallback((section) => {
    setActiveSection(section);
    // Reset des erreurs lors du changement d'onglet
    setEditError('');
    setPwError('');
  }, []);

  // ── Chargement initial ──
  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      try {
        const [depts, data] = await Promise.all([
          getDepartements().catch(() => []),
          getProfil(),
        ]);
        
        if (!mounted) return;
        
        setDepartements(Array.isArray(depts) ? depts : []);
        setProfil(data);
        setEditForm({
          Telephone: data.Telephone || '',
          Grade: data.Grade || '',
          Departement: data.Departement || '',
          Specialite: data.Specialite || '',
        });
      } catch {
        if (mounted) showToast('Erreur lors du chargement du profil', 'error');
      } finally {
        if (mounted) setPageLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [showToast]);

  // ── Validation ──
  const validateEditForm = useCallback(() => {
    if (editForm.Telephone && !/^[0-9\s\-+]{8,20}$/.test(editForm.Telephone)) {
      return 'Le numéro de téléphone est invalide';
    }
    return '';
  }, [editForm.Telephone]);

  const validatePwForm = useCallback(() => {
    if (!pwForm.ancienPassword || !pwForm.nouveauPassword) {
      return 'Veuillez remplir tous les champs';
    }
    if (pwForm.nouveauPassword.length < 6) {
      return 'Le nouveau mot de passe doit contenir au moins 6 caractères';
    }
    if (pwForm.ancienPassword === pwForm.nouveauPassword) {
      return 'Le nouveau mot de passe doit être différent de l\'ancien';
    }
    return '';
  }, [pwForm]);

  // ── Soumissions ──
  const handleEditSubmit = useCallback(async (e) => {
    e.preventDefault();
    const validationError = validateEditForm();
    if (validationError) {
      setEditError(validationError);
      return;
    }
    
    setEditLoading(true);
    setEditError('');
    
    try {
      const data = await updateProfil(editForm);
      setProfil(data.enseignant);
      showToast('Profil mis à jour avec succès');
    } catch (err) {
      setEditError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setEditLoading(false);
    }
  }, [editForm, validateEditForm, showToast]);

  const handlePasswordSubmit = useCallback(async (e) => {
    e.preventDefault();
    const validationError = validatePwForm();
    if (validationError) {
      setPwError(validationError);
      return;
    }
    
    setPwLoading(true);
    setPwError('');
    
    try {
      await changePassword(pwForm.ancienPassword, pwForm.nouveauPassword);
      showToast('Mot de passe changé avec succès');
      setPwForm(initialPwState);
      setShowOld(false);
      setShowNew(false);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Erreur lors du changement');
    } finally {
      setPwLoading(false);
    }
  }, [pwForm, validatePwForm, showToast]);

  // ── Handlers de changement mémorisés ──
  const handleEditChange = useCallback((key, value) => {
    setEditForm(prev => ({ ...prev, [key]: value }));
    if (editError) setEditError('');
  }, [editError]);

  const handlePwChange = useCallback((key, value) => {
    setPwForm(prev => ({ ...prev, [key]: value }));
    if (pwError) setPwError('');
  }, [pwError]);

  // ── Données dérivées ──
  const FIELDS = useMemo(() => [
    { key: 'Telephone', label: 'Téléphone', placeholder: 'Ex : 95 000 000', icon: '📞', type: 'tel' },
    { key: 'Grade', label: 'Grade', placeholder: 'Ex : Maître Assistant', icon: '🎓', type: 'text' },
    { key: 'Specialite', label: 'Spécialité', placeholder: 'Ex : Algorithmique', icon: '🔬', type: 'text' },
  ], []);

  // ── Rendu : Loading ──
  if (pageLoading) {
    return (
      <div className="pf-layout">
        <Sidebar 
          roleLabel="Espace enseignant" 
          navItems={enseignantNavItems} 
          profile={buildEnseignantProfile(user)} 
          onLogout={logout} 
        />
        <main className="pf-main profil-main">
          <div className="pf-loading" role="status" aria-live="polite">
            <div className="pf-loading-dots" aria-hidden="true">
              <span /><span /><span />
            </div>
            <p>Chargement du profil…</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Rendu principal ──
  return (
    <div className="pf-layout">
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={enseignantNavItems}
        profile={buildEnseignantProfile(user)}
        onLogout={logout}
      />

      <main className="pf-main profil-main">
        <ProfileHero profil={profil} />
        <ProfileNav activeSection={activeSection} onChange={handleSectionChange} />

        {/* ── Section : Informations ── */}
        {activeSection === 'info' && (
          <section 
            className="pf-section" 
            role="tabpanel" 
            id="panel-info" 
            aria-labelledby="tab-info"
          >
            <div className="pf-section-header">
              <div>
                <h2 className="pf-section-title">Informations personnelles</h2>
                <p className="pf-section-sub">Mettez à jour vos informations de profil</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="pf-form" noValidate>
              <div className="pf-form-grid">
                {FIELDS.map(({ key, label, placeholder, icon, type }) => (
                  <div className="pf-field" key={key}>
                    <label htmlFor={`edit-${key}`} className="pf-field-label">
                      <span className="pf-field-icon" aria-hidden="true">{icon}</span>
                      {label}
                    </label>
                    <input
                      id={`edit-${key}`}
                      type={type}
                      className="pf-field-input"
                      value={editForm[key]}
                      onChange={(e) => handleEditChange(key, e.target.value)}
                      placeholder={placeholder}
                      autoComplete="off"
                    />
                  </div>
                ))}

                {/* Département — select */}
                <div className="pf-field">
                  <label htmlFor="edit-dept" className="pf-field-label">
                    <span className="pf-field-icon" aria-hidden="true">🏛</span>
                    Département
                  </label>
                  <select
                    id="edit-dept"
                    className="pf-field-input pf-field-select"
                    value={editForm.Departement}
                    onChange={(e) => handleEditChange('Departement', e.target.value)}
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
                <div className="pf-alert pf-alert--error" role="alert" aria-live="assertive">
                  <span aria-hidden="true">✕</span> {editError}
                </div>
              )}

              <div className="pf-form-actions">
                <button 
                  type="submit" 
                  className="pf-btn pf-btn--primary" 
                  disabled={editLoading}
                  aria-busy={editLoading}
                >
                  {editLoading ? (
                    <><span className="pf-btn-spinner" aria-hidden="true" /> Enregistrement…</>
                  ) : (
                    <><span aria-hidden="true">💾</span> Enregistrer les modifications</>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ── Section : Sécurité ── */}
        {activeSection === 'security' && (
          <section 
            className="pf-section" 
            role="tabpanel" 
            id="panel-security" 
            aria-labelledby="tab-security"
          >
            <div className="pf-section-header">
              <div>
                <h2 className="pf-section-title">Changer le mot de passe</h2>
                <p className="pf-section-sub">Assurez-vous d'utiliser un mot de passe fort</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="pf-form pf-form--narrow" noValidate>
              <div className="pf-field">
                <label htmlFor="pw-old" className="pf-field-label">
                  <span className="pf-field-icon" aria-hidden="true">🔑</span>
                  Mot de passe actuel
                </label>
                <div className="pf-pw-wrap">
                  <input
                    id="pw-old"
                    type={showOld ? 'text' : 'password'}
                    className="pf-field-input"
                    value={pwForm.ancienPassword}
                    onChange={(e) => handlePwChange('ancienPassword', e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button 
                    type="button" 
                    className="pf-pw-eye" 
                    onClick={() => setShowOld(v => !v)}
                    aria-label={showOld ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    aria-pressed={showOld}
                  >
                    <span aria-hidden="true">{showOld ? '🙈' : '👁'}</span>
                  </button>
                </div>
              </div>

              <div className="pf-field">
                <label htmlFor="pw-new" className="pf-field-label">
                  <span className="pf-field-icon" aria-hidden="true">🔐</span>
                  Nouveau mot de passe
                </label>
                <div className="pf-pw-wrap">
                  <input
                    id="pw-new"
                    type={showNew ? 'text' : 'password'}
                    className="pf-field-input"
                    value={pwForm.nouveauPassword}
                    onChange={(e) => handlePwChange('nouveauPassword', e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button 
                    type="button" 
                    className="pf-pw-eye" 
                    onClick={() => setShowNew(v => !v)}
                    aria-label={showNew ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    aria-pressed={showNew}
                  >
                    <span aria-hidden="true">{showNew ? '🙈' : '👁'}</span>
                  </button>
                </div>
              </div>

              {pwError && (
                <div className="pf-alert pf-alert--error" role="alert" aria-live="assertive">
                  <span aria-hidden="true">✕</span> {pwError}
                </div>
              )}

              <div className="pf-form-actions">
                <button 
                  type="submit" 
                  className="pf-btn pf-btn--primary" 
                  disabled={pwLoading}
                  aria-busy={pwLoading}
                >
                  {pwLoading ? (
                    <><span className="pf-btn-spinner" aria-hidden="true" /> Modification…</>
                  ) : (
                    <><span aria-hidden="true">🔒</span> Changer le mot de passe</>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      <Toast message={toast.msg} type={toast.type} />
    </div>
  );
};

export default Profil;