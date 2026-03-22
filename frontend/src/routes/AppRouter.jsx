import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuth from '../context/useAuth';
// Lazy loading pour meilleures performances (chargement à la demande)
import { lazy, Suspense } from 'react';

const LoginAdmin       = lazy(() => import('../admin/auth/LoginAdmin'));
const LoginEnseignant  = lazy(() => import('../enseignant/auth/LoginEnseignant'));
const EnseignantsList  = lazy(() => import('../admin/enseignants/EnseignantsList'));
const Profil           = lazy(() => import('../enseignant/profil/Profil'));

// ─── Écran de chargement pendant le lazy load ─────────────────────────────────
const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', fontFamily: 'sans-serif', color: '#6b7280', fontSize: '14px'
  }}>
    Chargement...
  </div>
);

// ─── Route protégée par rôle ──────────────────────────────────────────────────
const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  // Non connecté → page de login
  if (!user) return <Navigate to="/" replace />;

  // Mauvais rôle → redirection vers sa propre page
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin/enseignants' : '/enseignant/profil'} replace />;
  }

  return children;
};

// ─── Route publique : redirige si déjà connecté ───────────────────────────────
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin/enseignants' : '/enseignant/profil'} replace />;
  }

  return children;
};

// ─── Router principal ─────────────────────────────────────────────────────────
const AppRouter = () => {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Pages de connexion — redirigent si déjà connecté */}
          <Route path="/" element={
            <PublicRoute><LoginAdmin /></PublicRoute>
          } />
          <Route path="/enseignant/login" element={
            <PublicRoute><LoginEnseignant /></PublicRoute>
          } />

          {/* Dashboard Admin */}
          <Route path="/admin/enseignants" element={
            <ProtectedRoute role="admin"><EnseignantsList /></ProtectedRoute>
          } />

          {/* Dashboard Enseignant */}
          <Route path="/enseignant/profil" element={
            <ProtectedRoute role="enseignant"><Profil /></ProtectedRoute>
          } />

          {/* Toute URL inconnue → redirection intelligente */}
          <Route path="*" element={
            <Navigate to={
              user?.role === 'admin' ? '/admin/enseignants' :
              user?.role === 'enseignant' ? '/enseignant/profil' : '/'
            } replace />
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;