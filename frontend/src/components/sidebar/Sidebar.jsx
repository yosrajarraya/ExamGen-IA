import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import iitLogo from '../../assets/iit2.png';
import './Sidebar.css';

const Sidebar = ({
  appName = 'ExamGen-IA',
  roleLabel,
  navItems = [],
  profile,
  onLogout,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item) =>
    item.matchStartsWith ? pathname.startsWith(item.path) : pathname === item.path;

  /* Synchronise une classe sur <body> pour que les pages puissent adapter leur margin-left */
  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    return () => document.body.classList.remove('sidebar-collapsed');
  }, [collapsed]);

  return (
    <aside className={`app-sidebar ${collapsed ? 'app-sidebar--collapsed' : ''}`}>

      {/* ── Logo ── */}
      <div className="app-sidebar-logo">
        <div className="app-sidebar-logo-icon">
          <img src={iitLogo} alt="IIT Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div className="app-sidebar-logo-text">
          <div className="app-sidebar-logo-name">{appName}</div>
          <div className="app-sidebar-logo-sub">{roleLabel}</div>
        </div>
      </div>

      {/* ── Bouton toggle ── */}
      <button
        type="button"
        className="app-sidebar-toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Ouvrir le menu' : 'Fermer le menu'}
        title={collapsed ? 'Ouvrir' : 'Réduire'}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="app-sidebar-toggle-icon"
        >
          {collapsed ? (
            /* chevron right */
            <polyline points="9 18 15 12 9 6" />
          ) : (
            /* chevron left */
            <polyline points="15 18 9 12 15 6" />
          )}
        </svg>
      </button>

      {/* ── Navigation ── */}
      <nav className="app-sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.path}
            type="button"
            className={`app-sidebar-nav-item ${isActive(item) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-current={isActive(item) ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
          >
            {item.icon && (
              <span className="app-sidebar-nav-icon">{item.icon}</span>
            )}
            <span className="app-sidebar-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="app-sidebar-footer">
        {profile && (
          <div className="app-sidebar-user" title={collapsed ? `${profile.name}\n${profile.email}` : undefined}>
            <div className="app-sidebar-avatar">{profile.avatar}</div>
            <div className="app-sidebar-user-info">
              <div className="app-sidebar-user-name">{profile.name}</div>
              <div className="app-sidebar-user-email">{profile.email}</div>
            </div>
          </div>
        )}
        <button
          type="button"
          className="app-sidebar-logout"
          onClick={onLogout}
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="app-sidebar-nav-label">Déconnexion</span>
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;
