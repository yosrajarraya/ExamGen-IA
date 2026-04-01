import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

/**
 * Sidebar universel — utilisé par admin ET enseignant.
 *
 * Props :
 *  - appName    : string (défaut "ExamGen-IA")
 *  - roleLabel  : string  ex. "Administration" | "Espace enseignant"
 *  - navItems   : array  (depuis sidebarConfigs)
 *  - profile    : { name, email, avatar }
 *  - onLogout   : function
 */
const Sidebar = ({
  appName = 'ExamGen-IA',
  roleLabel,
  navItems = [],
  profile,
  onLogout,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (item) =>
    item.matchStartsWith ? pathname.startsWith(item.path) : pathname === item.path;

  return (
    <aside className="app-sidebar">

      {/* ── Logo ── */}
      <div className="app-sidebar-logo">
        <div className="app-sidebar-logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <div>
          <div className="app-sidebar-logo-name">{appName}</div>
          <div className="app-sidebar-logo-sub">{roleLabel}</div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="app-sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.path}
            type="button"
            className={`app-sidebar-nav-item ${isActive(item) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-current={isActive(item) ? 'page' : undefined}
          >
            {item.icon && (
              <span className="app-sidebar-nav-icon">{item.icon}</span>
            )}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="app-sidebar-footer">
        {profile && (
          <div className="app-sidebar-user">
            <div className="app-sidebar-avatar">{profile.avatar}</div>
            <div className="app-sidebar-user-info">
              <div className="app-sidebar-user-name">{profile.name}</div>
              <div className="app-sidebar-user-email">{profile.email}</div>
            </div>
          </div>
        )}
        <button type="button" className="app-sidebar-logout" onClick={onLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Déconnexion
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;