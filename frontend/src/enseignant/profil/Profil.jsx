import { useState, useEffect } from 'react';
import { getProfil, updateProfil, changePassword, getDepartements } from '../../api/enseignant/Enseignant.api';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { enseignantNavItems, buildEnseignantProfile } from '../../components/sidebar/sidebarConfigs';
import './Profil.css';

const Toast = ({ message }) =>
  message ? <div className="toast" role="status">{message}</div> : null;

const Profil = () => {
  const { user, logout } = useAuth();
  const [profil, setProfil] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [departements, setDepartements] = useState([]);

  const [editForm, setEditForm] = useState({ Telephone: '', Grade: '', Departement: '', Specialite: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [pwForm, setPwForm] = useState({ ancienPassword: '', nouveauPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    const fetchProfil = async () => {
      try {
        const departementsData = await getDepartements().catch(() => []);
        setDepartements(Array.isArray(departementsData) ? departementsData : []);
        const data = await getProfil();
        setProfil(data);
        setEditForm({ Telephone: data.Telephone || '', Grade: data.Grade || '', Departement: data.Departement || '', Specialite: data.Specialite || '' });
      } catch { showToast('Erreur lors du chargement du profil'); }
      finally { setPageLoading(false); }
    };
    fetchProfil();
  }, []);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true); setEditError('');
    try {
      const data = await updateProfil(editForm);
      setProfil(data.enseignant);
      showToast('Profil mis à jour avec succès');
    } catch (err) { setEditError(err.response?.data?.message || 'Erreur lors de la mise à jour'); }
    finally { setEditLoading(false); }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwLoading(true); setPwError('');
    try {
      await changePassword(pwForm.ancienPassword, pwForm.nouveauPassword);
      showToast('Mot de passe changé avec succès');
      setPwForm({ ancienPassword: '', nouveauPassword: '' });
    } catch (err) { setPwError(err.response?.data?.message || 'Erreur lors du changement'); }
    finally { setPwLoading(false); }
  };

  if (pageLoading) {
    return (
      <div className="new-admin-layout">
        <Sidebar roleLabel="Espace enseignant" navItems={enseignantNavItems} profile={buildEnseignantProfile(user)} onLogout={logout} />
        <main className="new-admin-main"><div className="profil-loading">Chargement...</div></main>
      </div>
    );
  }

  return (
    <div className="new-admin-layout">
      {/* ✅ Sidebar partagée — aucun code sidebar ici */}
      <Sidebar
        roleLabel="Espace enseignant"
        navItems={enseignantNavItems}
        profile={buildEnseignantProfile(user)}
        onLogout={logout}
      />

      <main className="new-admin-main">

        <div className="new-admin-body">
          <div className="profil-identity-card">
            <div className="profil-identity-avatar">{profil?.Prenom?.[0]}{profil?.Nom?.[0]}</div>
            <div className="profil-identity-info">
              <h2 className="profil-identity-name">{profil?.Prenom} {profil?.Nom}</h2>
              <p className="profil-identity-email">{profil?.Email}</p>
              <p className="profil-identity-departement">Département : {profil?.Departement || '—'}</p>
              <span className={`new-badge ${profil?.Active ? 'new-badge-active' : 'new-badge-inactive'}`}>
                {profil?.Active ? 'Compte actif' : 'Compte désactivé'}
              </span>
            </div>
          </div>

          <div className="profil-grid">
            <div className="profil-card">
              <h3 className="profil-card-title">Informations personnelles</h3>
              <form onSubmit={handleEditSubmit} className="profil-form" noValidate>
                {[['Telephone','Téléphone','2X XXX XXX'],['Grade','Grade','Maître Assistant'],['Departement','Département','Informatique'],['Specialite','Spécialité','Algorithmique']].map(([field, label, placeholder]) => (
                  <div className="profil-form-group" key={field}>
                    <label>{label}</label>
                    {field === 'Departement' ? (
                      <select value={editForm[field]} onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}>
                        <option value="">Sélectionner un département</option>
                        {departements.map((departement) => (
                          <option key={departement.id} value={departement.name}>
                            {departement.name}
                          </option>
                        ))}
                        {editForm[field] && !departements.some((departement) => departement.name === editForm[field]) && (
                          <option value={editForm[field]}>{editForm[field]}</option>
                        )}
                      </select>
                    ) : (
                      <input type="text" value={editForm[field]} onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })} placeholder={placeholder} />
                    )}
                  </div>
                ))}
                {editError && <div className="profil-form-error">{editError}</div>}
                <button type="submit" className="profil-btn-primary" disabled={editLoading}>
                  {editLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </form>
            </div>

            <div className="profil-card">
              <h3 className="profil-card-title">Changer le mot de passe</h3>
              <form onSubmit={handlePasswordSubmit} className="profil-form" noValidate>
                <div className="profil-form-group">
                  <label>Mot de passe actuel</label>
                  <div className="profil-pw-wrapper">
                    <input type={showOld ? 'text' : 'password'} value={pwForm.ancienPassword} onChange={(e) => setPwForm({ ...pwForm, ancienPassword: e.target.value })} placeholder="••••••••" />
                    <button type="button" className="profil-btn-eye" onClick={() => setShowOld(!showOld)}>{showOld ? '🙈' : '👁'}</button>
                  </div>
                </div>
                <div className="profil-form-group">
                  <label>Nouveau mot de passe</label>
                  <div className="profil-pw-wrapper">
                    <input type={showNew ? 'text' : 'password'} value={pwForm.nouveauPassword} onChange={(e) => setPwForm({ ...pwForm, nouveauPassword: e.target.value })} placeholder="••••••••" />
                    <button type="button" className="profil-btn-eye" onClick={() => setShowNew(!showNew)}>{showNew ? '🙈' : '👁'}</button>
                  </div>
                </div>
                {pwError && <div className="profil-form-error">{pwError}</div>}
                <button type="submit" className="profil-btn-primary" disabled={pwLoading}>
                  {pwLoading ? 'Modification...' : 'Changer le mot de passe'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Toast message={toast} />
    </div>
  );
};

export default Profil;