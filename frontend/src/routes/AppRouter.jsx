import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import useAuth from '../context/useAuth';

import ForgotPassword from '../enseignant/auth/ForgotPassword';
import VerifyCode from '../enseignant/auth/VerifyCode';
import ResetPassword from '../enseignant/auth/ResetPassword';

const LoginAdmin = lazy(() => import('../admin/auth/LoginAdmin'));
const LoginEnseignant = lazy(() => import('../enseignant/auth/LoginEnseignant'));
const EnseignantsList = lazy(() => import('../admin/enseignants/EnseignantsList'));
const Profil = lazy(() => import('../enseignant/profil/Profil'));
const WordTemplates = lazy(() => import('../enseignant/modeles/WordTemplates'));
const WordTemplate = lazy(() => import('../admin/modeles/WordTemplate'));

const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'sans-serif',
      color: '#6b7280',
      fontSize: '14px',
    }}
  >
    Chargement...
  </div>
);

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;

  if (role && user.role !== role) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin/enseignants' : '/enseignant/profil'}
        replace
      />
    );
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (user) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin/enseignants' : '/enseignant/profil'}
        replace
      />
    );
  }

  return children;
};

const AppRouter = () => {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/"
            element={
              <PublicRoute>
                <LoginAdmin />
              </PublicRoute>
            }
          />

          <Route
            path="/enseignant/login"
            element={
              <PublicRoute>
                <LoginEnseignant />
              </PublicRoute>
            }
          />

          <Route
            path="/enseignant/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />

          <Route
            path="/enseignant/verify-code"
            element={
              <PublicRoute>
                <VerifyCode />
              </PublicRoute>
            }
          />

          <Route
            path="/enseignant/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />

          <Route
            path="/admin/enseignants"
            element={
              <ProtectedRoute role="admin">
                <EnseignantsList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/modeles-word"
            element={
              <ProtectedRoute role="admin">
                <WordTemplate />
              </ProtectedRoute>
            }
          />

          <Route
            path="/enseignant/profil"
            element={
              <ProtectedRoute role="enseignant">
                <Profil />
              </ProtectedRoute>
            }
          />

          <Route
            path="/enseignant/modeles-word"
            element={
              <ProtectedRoute role="enseignant">
                <WordTemplates />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to={
                  user?.role === 'admin'
                    ? '/admin/enseignants'
                    : user?.role === 'enseignant'
                    ? '/enseignant/profil'
                    : '/'
                }
                replace
              />
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;