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

/* ── Icônes SVG inline ── */
const IconEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconActivate = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const IconDeactivate = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

/* Icônes stat cards — style image: outline sur fond coloré */
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);

const IconShieldOff = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);

const IconFolder = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

/* ── Toast ── */
const Toast = ({ message }) =>
  message ? <div className="toast" role="status">{message}</div> : null;

/* ── Stat Card — style image ── */
const StatCard = ({ icon, label, value, color, bgColor }) => (
  <div className="teacher-stat-card" style={{ color }}>
    <div className="teacher-stat-icon-wrap" style={{ background: bgColor }}>
      <span style={{ color }}>{icon}</span>
    </div>
    <div className="teacher-stat-info">
      <div className="teacher-stat-value" style={{ color }}>{value}</div>
      <div className="teacher-stat-label">{label}</div>
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
  const [confirmDelete, setConfirmDelete] = useState(null);
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

  const openEditModal = (ens) => setEditingEnseignant(ens);

  const totalEns = enseignants.length;
  const actifs   = enseignants.filter((e) => e.Active).length;
  const inactifs = enseignants.filter((e) => !e.Active).length;

  const deptMap = new Map();
  enseignants.forEach((e) => {
    if (e.Departement) {
      const key = e.Departement.toLowerCase();
      if (!deptMap.has(key)) deptMap.set(key, e.Departement);
    }
  });
  const depts = deptMap.size;
  const allDepts = Array.from(deptMap.values());

  const filtered = enseignants.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      e.Nom?.toLowerCase().includes(q) ||
      e.Prenom?.toLowerCase().includes(q) ||
      e.Email?.toLowerCase().includes(q) ||
      e.Departement?.toLowerCase().includes(q) ||
      e.Grade?.toLowerCase().includes(q);
    const matchStatut = filterStatut === 'tous' || (filterStatut === 'actif' && e.Active) || (filterStatut === 'inactif' && !e.Active);
    const matchDept = filterDept === 'tous' || e.Departement?.toLowerCase() === filterDept.toLowerCase();
    return matchSearch && matchStatut && matchDept;
  });

  return (
    <div className="teacher-shell">
      <Sidebar
        roleLabel="Administration"
        navItems={adminNavItems}
        profile={buildAdminProfile(user)}
        onLogout={logout}
      />

      <main className="teacher-main">
        {/* ── En-tête ── */}
        <div className="teacher-header">
          <div className="teacher-header-left">
            <div className="teacher-header-greeting">Espace Administration</div>
          </div>
        </div>

        {/* ── Stats — couleurs douces comme l'image ── */}
        <div className="teacher-stats-grid">
          <StatCard
            label="Total enseignants"
            value={totalEns}
            color="#3b6ef5"
            bgColor="rgba(59,110,245,0.10)"
            icon={<IconUsers />}
          />
          <StatCard
            label="Comptes actifs"
            value={actifs}
            color="#22a06b"
            bgColor="rgba(34,160,107,0.10)"
            icon={<IconShield />}
          />
          <StatCard
            label="Comptes inactifs"
            value={inactifs}
            color="#e04040"
            bgColor="rgba(224,64,64,0.08)"
            icon={<IconShieldOff />}
          />
          <StatCard
            label="Départements"
            value={depts}
            color="#7c5cdb"
            bgColor="rgba(124,92,219,0.10)"
            icon={<IconFolder />}
          />
        </div>

        {/* ── Tableau ── */}
        <div className="teacher-content-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="teacher-panel teacher-table-panel">
            <div className="teacher-panel-header">
              <div className="teacher-panel-title-group">
                <div className="teacher-panel-icon activity">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div>
                  <h3>Liste des enseignants</h3>
                  <div className="teacher-panel-subtitle">Gérez les comptes, les statuts et les informations</div>
                </div>
              </div>
              <div className="teacher-panel-count">{filtered.length}</div>
            </div>

            {/* Filtres */}
            <div className="teacher-filters">
              <input
                className="teacher-search"
                type="text"
                placeholder="Rechercher par nom, prénom, email, département, grade…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className="teacher-select" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
                <option value="tous">Tous statuts</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
              <select className="teacher-select" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                <option value="tous">Tous départements</option>
                {allDepts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="teacher-filters-actions">
                <button className="teacher-secondary-action" onClick={() => setShowImport(true)}>
                  📊 Importer Excel
                </button>
                <button className="teacher-primary-action" onClick={() => setShowCreate(true)}>
                  + Nouveau compte
                </button>
              </div>
            </div>

            {/* Table */}
            {pageLoading ? (
              <div className="teacher-empty-state">
                <div className="teacher-empty-icon">⏳</div>
                <div className="teacher-empty-title">Chargement des données…</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="teacher-empty-state">
                <div className="teacher-empty-icon">📭</div>
                <div className="teacher-empty-title">Aucun enseignant trouvé</div>
                <div className="teacher-empty-sub">Ajustez les filtres ou créez un nouveau compte.</div>
              </div>
            ) : (
              <div className="teacher-table-wrap">
                <table className="teacher-table">
                  <thead>
                    <tr>
                      <th>NOM</th>
                      <th>PRÉNOM</th>
                      <th>EMAIL</th>
                      <th>DÉPARTEMENT</th>
                      <th>GRADE</th>
                      <th>TÉLÉPHONE</th>
                      <th>STATUT</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((ens) => (
                      <tr key={ens._id}>
                        <td className="td-strong">{ens.Nom}</td>
                        <td>{ens.Prenom}</td>
                        <td className="td-email">{ens.Email}</td>
                        <td>{ens.Departement || '—'}</td>
                        <td>{ens.Grade || '—'}</td>
                        <td>{ens.Telephone || '—'}</td>
                        <td>
                          <span className={`teacher-badge ${ens.Active ? 'teacher-badge-active' : 'teacher-badge-inactive'}`}>
                            {ens.Active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td>
                          <div className="teacher-action-btns">
                            <button
                              className="teacher-icon-btn teacher-icon-btn--edit"
                              onClick={() => openEditModal(ens)}
                              title="Modifier"
                              aria-label="Modifier"
                            >
                              <IconEdit />
                            </button>
                            <button
                              className={`teacher-icon-btn ${ens.Active ? 'teacher-icon-btn--deactivate' : 'teacher-icon-btn--activate'}`}
                              onClick={() => handleToggle(ens._id)}
                              title={ens.Active ? 'Désactiver' : 'Activer'}
                              aria-label={ens.Active ? 'Désactiver' : 'Activer'}
                            >
                              {ens.Active ? <IconDeactivate /> : <IconActivate />}
                            </button>
                            <button
                              className="teacher-icon-btn teacher-icon-btn--delete"
                              onClick={() => handleDelete(ens._id, `${ens.Prenom} ${ens.Nom}`)}
                              title="Supprimer"
                              aria-label="Supprimer"
                            >
                              <IconTrash />
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
        </div>

        {/* ── Footer ── */}
        <div className="teacher-footer">
          <span className="teacher-dot" />
          Système ExamGen-IA • Administration • {new Date().getFullYear()}
        </div>
      </main>

      {/* ── Modales ── */}
      <ImportEnseignantsExcel
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={async () => { setShowImport(false); await fetchEnseignants(); }}
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
        onCreated={async () => { setEditingEnseignant(null); await fetchEnseignants(); }}
        showToast={showToast}
      />

      {confirmDelete && (
        <div className="confirmation-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmer la suppression</h3>
            <p>Supprimer l'enseignant « {confirmDelete.nom} » ?</p>
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