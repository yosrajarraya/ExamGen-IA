import { useState, useEffect, useCallback } from 'react';
import useAuth from '../../context/useAuth';
import { getProfil, updateProfil, changePassword } from '../../api/enseignant/Enseignant.api';
import './Profil.css';

const Profil = () => {
  const { logout } = useAuth();

  const [profil, setProfil]       = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast]         = useState('');

  // Formulaire modifier profil
  const [editForm, setEditForm]       = useState({ Telephone: '', Grade: '', Departement: '', Specialite: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]     = useState('');

  // Formulaire changer mot de passe
  const [pwForm, setPwForm]       = useState({ ancienPassword: '', nouveauPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError]     = useState('');
  const [showOld, setShowOld]     = useState(false);
  const [showNew, setShowNew]     = useState(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  // ─── Chargement du profil ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfil = async () => {
      try {
        const data = await getProfil();
        setProfil(data);
        setEditForm({
          Telephone: data.Telephone || '',
          Grade: data.Grade || '',
          Departement: data.Departement || '',
          Specialite: data.Specialite || '',
        });
      } catch {
        showToast('Erreur lors du chargement du profil');
      } finally {
        setPageLoading(false);
      }
    };
    fetchProfil();
  }, [showToast]);

  // ─── Modifier profil ────────────────────────────────────────────────────────
  const handleEditSubmit = async (e) => {
    e.preventDefault();
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
  };

  // ─── Changer mot de passe ───────────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    setPwError('');
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
      <div className="profil-loading" aria-live="polite">Chargement...</div>
    );
  }

  return (
    <div className="profil-layout">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="profil-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">IIT</div>
          <div>
            <div className="sidebar-logo-name">ExamGen-IA</div>
            <div className="sidebar-logo-sub">Espace enseignant</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-nav-item active" aria-current="page">Mon profil</div>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" aria-hidden="true">
              {profil?.Prenom?.[0]}{profil?.Nom?.[0]}
            </div>
            <div>
              <div className="sidebar-user-name">{profil?.Prenom} {profil?.Nom}</div>
              <div className="sidebar-user-email">{profil?.Email}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>Déconnexion</button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="profil-main">
        <div className="profil-topbar">
          <h1 className="profil-page-title">Mon profil</h1>
        </div>

        <div className="profil-content">

          {/* Carte info */}
          <div className="profil-info-card">
            <div className="profil-info-avatar" aria-hidden="true">
              {profil?.Prenom?.[0]}{profil?.Nom?.[0]}
            </div>
            <div>
              <h2 className="profil-info-name">{profil?.Prenom} {profil?.Nom}</h2>
              <p className="profil-info-email">{profil?.Email}</p>
              <span className={`badge ${profil?.Active ? 'badge-active' : 'badge-inactive'}`}>
                {profil?.Active ? 'Compte actif' : 'Compte désactivé'}
              </span>
            </div>
          </div>

          <div className="profil-grid">

            {/* Modifier infos */}
            <div className="card">
              <h3 className="card-title">Informations personnelles</h3>
              <form onSubmit={handleEditSubmit} className="profil-form" noValidate>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input value={editForm.Telephone} onChange={(e) => setEditForm({ ...editForm, Telephone: e.target.value })} placeholder="2X XXX XXX" />
                </div>
                <div className="form-group">
                  <label>Grade</label>
                  <input value={editForm.Grade} onChange={(e) => setEditForm({ ...editForm, Grade: e.target.value })} placeholder="Maître Assistant" />
                </div>
                <div className="form-group">
                  <label>Département</label>
                  <input value={editForm.Departement} onChange={(e) => setEditForm({ ...editForm, Departement: e.target.value })} placeholder="Informatique" />
                </div>
                <div className="form-group">
                  <label>Spécialité</label>
                  <input value={editForm.Specialite} onChange={(e) => setEditForm({ ...editForm, Specialite: e.target.value })} placeholder="Algorithmique" />
                </div>
                {editError && <div className="form-error" role="alert">{editError}</div>}
                <button type="submit" className="btn-primary" disabled={editLoading}>
                  {editLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </form>
            </div>

            {/* Changer mot de passe */}
            <div className="card">
              <h3 className="card-title">Changer le mot de passe</h3>
              <form onSubmit={handlePasswordSubmit} className="profil-form" noValidate>
                <div className="form-group">
                  <label>Mot de passe actuel</label>
                  <div className="input-pw-wrapper">
                    <input
                      type={showOld ? 'text' : 'password'}
                      value={pwForm.ancienPassword}
                      onChange={(e) => setPwForm({ ...pwForm, ancienPassword: e.target.value })}
                      required placeholder="••••••••"
                    />
                    <button type="button" className="btn-toggle-pw" onClick={() => setShowOld((v) => !v)} tabIndex={-1} aria-label="Afficher/masquer">
                      {showOld ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Nouveau mot de passe</label>
                  <div className="input-pw-wrapper">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={pwForm.nouveauPassword}
                      onChange={(e) => setPwForm({ ...pwForm, nouveauPassword: e.target.value })}
                      required placeholder="••••••••"
                    />
                    <button type="button" className="btn-toggle-pw" onClick={() => setShowNew((v) => !v)} tabIndex={-1} aria-label="Afficher/masquer">
                      {showNew ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                {pwError && <div className="form-error" role="alert">{pwError}</div>}
                <button type="submit" className="btn-primary" disabled={pwLoading}>
                  {pwLoading ? 'Modification...' : 'Changer le mot de passe'}
                </button>
              </form>
            </div>

          </div>
        </div>
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
};

export default Profil;