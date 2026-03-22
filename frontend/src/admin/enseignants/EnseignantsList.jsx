import { useState, useEffect, useCallback } from 'react';
import useAuth from '../../context/useAuth';
import {
  getEnseignants,
  createEnseignant,
  toggleActive,
  resetPassword,
  deleteEnseignant,
} from '../../api/admin/Enseignant.api';
import './EnseignantsList.css';

// ─── Valeurs initiales du formulaire de création ──────────────────────────────
const EMPTY_FORM = {
  Prenom: '', Nom: '', Email: '', Password: '',
  Telephone: '', Grade: '', Departement: '', Specialite: '', Active: true,
};

// ─── Composant Toast ──────────────────────────────────────────────────────────
const Toast = ({ message }) => message ? <div className="toast" role="status">{message}</div> : null;

// ─── Composant principal ──────────────────────────────────────────────────────
const EnseignantsList = () => {
  const { user, logout } = useAuth();

  const [enseignants, setEnseignants] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast]             = useState('');

  // Modal créer
  const [showCreate, setShowCreate]     = useState(false);
  const [createForm, setCreateForm]     = useState(EMPTY_FORM);
  const [createError, setCreateError]   = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Modal reset password
  const [resetModal, setResetModal]   = useState(null); // { id, nom }
  const [newPw, setNewPw]             = useState('');
  const [resetError, setResetError]   = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // ─── Toast helper ───────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  // ─── Chargement initial ─────────────────────────────────────────────────────
  const fetchEnseignants = useCallback(async () => {
    try {
      const data = await getEnseignants();
      setEnseignants(data);
    } catch {
      showToast('Erreur lors du chargement des enseignants');
    } finally {
      setPageLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchEnseignants(); }, [fetchEnseignants]);

  // ─── Créer un enseignant ────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      await createEnseignant(createForm);
      showToast('Enseignant créé avec succès');
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      fetchEnseignants();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setCreateLoading(false);
    }
  };

  // ─── Activer / désactiver ───────────────────────────────────────────────────
  const handleToggle = async (id) => {
    try {
      const result = await toggleActive(id);
      // Mise à jour locale sans refetch
      setEnseignants((prev) =>
        prev.map((e) => (e._id === id ? { ...e, Active: result.Active } : e))
      );
      showToast(result.message);
    } catch {
      showToast('Erreur lors de la modification');
    }
  };

  // ─── Reset mot de passe ─────────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    try {
      await resetPassword(resetModal.id, newPw);
      showToast('Mot de passe réinitialisé avec succès');
      setResetModal(null);
      setNewPw('');
    } catch (err) {
      setResetError(err.response?.data?.message || 'Erreur');
    } finally {
      setResetLoading(false);
    }
  };

  // ─── Supprimer ──────────────────────────────────────────────────────────────
  const handleDelete = async (id, nom) => {
    if (!window.confirm(`Confirmer la suppression de ${nom} ?`)) return;
    try {
      await deleteEnseignant(id);
      setEnseignants((prev) => prev.filter((e) => e._id !== id));
      showToast('Enseignant supprimé');
    } catch {
      showToast('Erreur lors de la suppression');
    }
  };

  const openResetModal = (ens) => {
    setResetModal({ id: ens._id, nom: `${ens.Prenom} ${ens.Nom}` });
    setNewPw('');
    setResetError('');
  };

  return (
    <div className="admin-layout">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">IIT</div>
          <div>
            <div className="sidebar-logo-name">ExamGen-IA</div>
            <div className="sidebar-logo-sub">Administration</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-nav-item active" aria-current="page">
            Enseignants
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" aria-hidden="true">A</div>
            <div>
              <div className="sidebar-user-name">Administrateur</div>
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>Déconnexion</button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <h1 className="admin-page-title">Gestion des enseignants</h1>
            <p className="admin-page-sub">
              {enseignants.length} enseignant{enseignants.length !== 1 ? 's' : ''} enregistré{enseignants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn-primary" onClick={() => { setCreateForm(EMPTY_FORM); setCreateError(''); setShowCreate(true); }}>
            + Créer un enseignant
          </button>
        </div>

        <div className="admin-content">
          {pageLoading ? (
            <div className="state-empty">Chargement...</div>
          ) : enseignants.length === 0 ? (
            <div className="state-empty">
              Aucun enseignant enregistré.<br />
              Créez le premier compte en cliquant sur le bouton ci-dessus.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="ens-table">
                <thead>
                  <tr>
                    <th>Enseignant</th>
                    <th>Email</th>
                    <th>Grade</th>
                    <th>Département</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enseignants.map((ens) => (
                    <tr key={ens._id}>
                      <td>
                        <div className="ens-name-cell">
                          <div className="ens-avatar" aria-hidden="true">
                            {ens.Prenom[0]}{ens.Nom[0]}
                          </div>
                          <span>{ens.Prenom} {ens.Nom}</span>
                        </div>
                      </td>
                      <td className="td-secondary">{ens.Email}</td>
                      <td className="td-secondary">{ens.Grade || '—'}</td>
                      <td className="td-secondary">{ens.Departement || '—'}</td>
                      <td>
                        <span className={`badge ${ens.Active ? 'badge-active' : 'badge-inactive'}`}>
                          {ens.Active ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button
                            className={`btn-action ${ens.Active ? 'btn-warn' : 'btn-success'}`}
                            onClick={() => handleToggle(ens._id)}
                          >
                            {ens.Active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            className="btn-action btn-neutral"
                            onClick={() => openResetModal(ens)}
                          >
                            Réinit. MDP
                          </button>
                          <button
                            className="btn-action btn-danger"
                            onClick={() => handleDelete(ens._id, `${ens.Prenom} ${ens.Nom}`)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Modal Créer ──────────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)} role="dialog" aria-modal="true" aria-label="Créer un enseignant">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Créer un enseignant</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)} aria-label="Fermer">✕</button>
            </div>
            <form onSubmit={handleCreate} className="modal-form" noValidate>
              <div className="form-row">
                <div className="form-group">
                  <label>Prénom <span className="req">*</span></label>
                  <input value={createForm.Prenom} onChange={(e) => setCreateForm({ ...createForm, Prenom: e.target.value })} required placeholder="Ines" />
                </div>
                <div className="form-group">
                  <label>Nom <span className="req">*</span></label>
                  <input value={createForm.Nom} onChange={(e) => setCreateForm({ ...createForm, Nom: e.target.value })} required placeholder="Kessemtini" />
                </div>
              </div>
              <div className="form-group">
                <label>Email <span className="req">*</span></label>
                <input type="email" value={createForm.Email} onChange={(e) => setCreateForm({ ...createForm, Email: e.target.value })} required placeholder="ines.kessemtini@iit.tn" />
              </div>
              <div className="form-group">
                <label>Mot de passe <span className="req">*</span></label>
                <input type="password" value={createForm.Password} onChange={(e) => setCreateForm({ ...createForm, Password: e.target.value })} required placeholder="••••••••" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Téléphone</label>
                  <input value={createForm.Telephone} onChange={(e) => setCreateForm({ ...createForm, Telephone: e.target.value })} placeholder="2X XXX XXX" />
                </div>
                <div className="form-group">
                  <label>Grade</label>
                  <input value={createForm.Grade} onChange={(e) => setCreateForm({ ...createForm, Grade: e.target.value })} placeholder="Maître Assistant" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Département</label>
                  <input value={createForm.Departement} onChange={(e) => setCreateForm({ ...createForm, Departement: e.target.value })} placeholder="Informatique" />
                </div>
                <div className="form-group">
                  <label>Spécialité</label>
                  <input value={createForm.Specialite} onChange={(e) => setCreateForm({ ...createForm, Specialite: e.target.value })} placeholder="Algorithmique" />
                </div>
              </div>
              <div className="form-group form-check">
                <label>
                  <input type="checkbox" checked={createForm.Active} onChange={(e) => setCreateForm({ ...createForm, Active: e.target.checked })} />
                  Compte actif immédiatement
                </label>
              </div>
              {createError && <div className="form-error" role="alert">{createError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={createLoading}>
                  {createLoading ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Reset Password ──────────────────────────────────────────────── */}
      {resetModal && (
        <div className="modal-overlay" onClick={() => setResetModal(null)} role="dialog" aria-modal="true" aria-label="Réinitialiser le mot de passe">
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Réinitialiser le mot de passe</h2>
              <button className="modal-close" onClick={() => setResetModal(null)} aria-label="Fermer">✕</button>
            </div>
            <p className="modal-desc">Nouveau mot de passe pour <strong>{resetModal.nom}</strong></p>
            <form onSubmit={handleResetPassword} className="modal-form" noValidate>
              <div className="form-group">
                <label>Nouveau mot de passe <span className="req">*</span></label>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required placeholder="••••••••" />
              </div>
              {resetError && <div className="form-error" role="alert">{resetError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setResetModal(null)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={resetLoading}>
                  {resetLoading ? 'Réinitialisation...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
};

export default EnseignantsList;