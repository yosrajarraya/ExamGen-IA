import { useState, useEffect, useCallback } from 'react';
import useAuth from '../../context/useAuth';
import Sidebar from '../../components/sidebar/Sidebar';
import { adminNavItems, buildAdminProfile } from '../../components/sidebar/sidebarConfigs';
import {
  getEnseignants,
  toggleActive,
  deleteEnseignant,
} from '../../api/admin/Enseignant.api';
import CreateEnseignant from './CreateEnseignant';
import ImportEnseignantsExcel from './ImportEnseignantsExcel';
import './EnseignantsList.css';

const Toast = ({ message }) =>
  message ? <div className="toast" role="status">{message}</div> : null;

const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: color }}>{icon}</div>
    <div className="stat-info">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  </div>
);

const EnseignantsList = () => {
  const { user, logout } = useAuth();

  const [enseignants, setEnseignants] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingEnseignant, setEditingEnseignant] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, nom }
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterDept, setFilterDept] = useState('tous');

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const fetchEnseignants = useCallback(async () => {
    try {
      setPageLoading(true);
      const data = await getEnseignants();
      setEnseignants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showToast('Erreur lors du chargement des enseignants');
    } finally {
      setPageLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchEnseignants(); }, [fetchEnseignants]);

  const handleToggle = async (id) => {
    try {
      const result = await toggleActive(id);
      setEnseignants((prev) => prev.map((e) => e._id === id ? { ...e, Active: result.Active } : e));
      showToast(result?.message || 'Statut modifié');
    } catch { showToast('Erreur lors de la modification'); }
  };

  const handleDelete = async (id, nom) => {
    setConfirmDelete({ id, nom });
  };

  const confirmDeleteEnseignant = async () => {
    if (!confirmDelete) return;

    try {
      await deleteEnseignant(confirmDelete.id);
      setEnseignants((prev) => prev.filter((e) => e._id !== confirmDelete.id));
      showToast('Enseignant supprimé');
    } catch {
      showToast('Erreur lors de la suppression');
    } finally {
      setConfirmDelete(null);
    }
  };

  const openEditModal = (ens) => {
    setEditingEnseignant(ens);
  };

  const totalEns = enseignants.length;
  const actifs   = enseignants.filter((e) => e.Active).length;
  const inactifs  = enseignants.filter((e) => !e.Active).length;
  
  // Créer une liste de départements uniques insensibles à la casse
  const deptMap = new Map(); // { lowercase: originalValue }
  enseignants.forEach((e) => {
    if (e.Departement) {
      const key = e.Departement.toLowerCase();
      if (!deptMap.has(key)) {
        deptMap.set(key, e.Departement);
      }
    }
  });
  const depts = deptMap.size;
  const allDepts = Array.from(deptMap.values());

  const filtered = enseignants.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.Nom?.toLowerCase().includes(q) || e.Prenom?.toLowerCase().includes(q) || e.Email?.toLowerCase().includes(q) || e.Departement?.toLowerCase().includes(q) || e.Grade?.toLowerCase().includes(q);
    const matchStatut = filterStatut === 'tous' || (filterStatut === 'actif' && e.Active) || (filterStatut === 'inactif' && !e.Active);
    const matchDept = filterDept === 'tous' || e.Departement?.toLowerCase() === filterDept.toLowerCase();
    return matchSearch && matchStatut && matchDept;
  });

  const adminName = user?.Prenom || user?.name || 'Administrateur';

  return (
    <div className="new-admin-layout">
      {/* ✅ Sidebar partagée — aucun code sidebar ici */}
      <Sidebar
        roleLabel="Administration"
        navItems={adminNavItems}
        profile={buildAdminProfile(user)}
        onLogout={logout}
      />

      <main className="new-admin-main">
        <div className="new-topbar">
          <div className="new-topbar-left">
            <h1 className="new-topbar-title">Bonjour, {adminName}</h1>
            <p className="new-topbar-sub">Statistiques globales et gestion des comptes enseignants.</p>
          </div>
          <div className="new-topbar-actions">
            <button className="new-btn-secondary" onClick={() => setShowImport(true)}>
              📊 Importer fichier Excel
            </button>
            <button className="new-btn-primary" onClick={() => setShowCreate(true)}>
              + Nouveau compte enseignant
            </button>
          </div>
        </div>

        <div className="new-admin-body">
          <div className="stats-grid">
            <StatCard label="Total enseignants" value={totalEns} color="#3b82f6"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            />
            <StatCard label="Comptes actifs" value={actifs} color="#22c55e"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
            />
            <StatCard label="Comptes inactifs" value={inactifs} color="#f97316"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
            />
            <StatCard label="Departements" value={depts} color="#a855f7"
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
            />
          </div>

          <div className="new-table-card">
            <div className="new-filters">
              <input className="new-search" type="text" placeholder="Filtre dynamique: nom, prenom, email, departement, grade..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="new-select" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
                <option value="tous">Tous statuts</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
              <select className="new-select" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                <option value="tous">Tous departements</option>
                {allDepts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {pageLoading ? (
              <div className="new-state-empty">Chargement...</div>
            ) : filtered.length === 0 ? (
              <div className="new-state-empty">Aucun enseignant enregistré.<br />Créez le premier compte en cliquant sur le bouton ci-dessus.</div>
            ) : (
              <table className="new-table">
                <thead>
                  <tr><th>NOM</th><th>PRENOM</th><th>EMAIL</th><th>DEPARTEMENT</th><th>GRADE</th><th>TELEPHONE</th><th>STATUT</th><th>ACTIONS</th></tr>
                </thead>
                <tbody>
                  {filtered.map((ens) => (
                    <tr key={ens._id}>
                      <td>{ens.Nom}</td>
                      <td>{ens.Prenom}</td>
                      <td className="td-email">{ens.Email}</td>
                      <td>{ens.Departement || '—'}</td>
                      <td>{ens.Grade || '—'}</td>
                      <td>{ens.Telephone || '—'}</td>
                      <td>
                        <span className={`new-badge ${ens.Active ? 'new-badge-active' : 'new-badge-inactive'}`}>
                          {ens.Active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        <div className="new-action-btns">
                          <button className="new-btn-link new-btn-modifier" onClick={() => openEditModal(ens)}>Modifier</button>
                          <button className={`new-btn-link ${ens.Active ? 'new-btn-desactiver' : 'new-btn-activer'}`} onClick={() => handleToggle(ens._id)}>
                            {ens.Active ? 'Desactiver' : 'Activer'}
                          </button>
                          <button className="new-btn-link new-btn-supprimer" onClick={() => handleDelete(ens._id, `${ens.Prenom} ${ens.Nom}`)}>Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      <ImportEnseignantsExcel
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={async () => {
          setShowImport(false);
          await fetchEnseignants();
        }}
        showToast={showToast}
      />

      <CreateEnseignant
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={async () => { setShowCreate(false); await fetchEnseignants(); }}
        showToast={showToast}
      />

      <CreateEnseignant
        isOpen={Boolean(editingEnseignant)}
        mode="edit"
        initialData={editingEnseignant}
        onClose={() => setEditingEnseignant(null)}
        onCreated={async () => {
          setEditingEnseignant(null);
          await fetchEnseignants();
        }}
        showToast={showToast}
      />

      {confirmDelete && (
        <div
          className="confirmation-overlay"
          onClick={() => setConfirmDelete(null)}
        >
          <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmer la suppression</h3>
            <p>Supprimer l'enseignant "{confirmDelete.nom}" ?</p>
            <div className="confirmation-actions">
              <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className="btn-confirm" onClick={confirmDeleteEnseignant}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
};

export default EnseignantsList;