

/* ── Nav items Admin ── */
export const adminNavItems = [
  {
    label: 'Tableau de bord',
    path: '/admin/enseignants',
    matchStartsWith: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Modèles Word',
    path: '/admin/modeles-word',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

/* ── Nav items Enseignant ── */
export const enseignantNavItems = [
  {
    label: 'Tableau de bord',
    path: '/enseignant/dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="3" y="14" width="5" height="7" />
        <rect x="10" y="12" width="11" height="9" />
      </svg>
    ),
  },
  {
    label: 'Créer un examen',
    path: '/enseignant/exams/create',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    label: "Banque d'examens",
    path: '/enseignant/exams/bank',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3L2 9v2h20V9L12 3z" />
        <path d="M5 13h2v6H5z" />
        <path d="M11 13h2v6h-2z" />
        <path d="M17 13h2v6h-2z" />
      </svg>
    ),
  },
  {
    label: 'Banque de questions',
    path: '/enseignant/questions/bank',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    label: 'Mon profil',
    path: '/enseignant/profil',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
 
];

/* ── Builders de profil ── */
export const buildAdminProfile = (user) => ({
  name: user?.Prenom || user?.name || 'Administrateur',
  email: user?.Email || user?.email || 'admin@examgen-ia.local',
  avatar: 'A',
});

export const buildEnseignantProfile = (user) => ({
  name: `${user?.Prenom || ''} ${user?.Nom || ''}`.trim() || 'Enseignant',
  email: user?.Email || '',
  avatar: `${user?.Prenom?.[0] || ''}${user?.Nom?.[0] || ''}`.toUpperCase() || 'E',
});