import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import useAuth from "../context/useAuth";

import ForgotPassword from "../enseignant/auth/ForgotPassword";
import VerifyCode from "../enseignant/auth/VerifyCode";
import ResetPassword from "../enseignant/auth/ResetPassword";

const LoginAdmin = lazy(() => import("../admin/auth/LoginAdmin"));
const LoginEnseignant = lazy(
  () => import("../enseignant/auth/LoginEnseignant"),
);
const EnseignantsList = lazy(
  () => import("../admin/enseignants/EnseignantsList"),
);
const TeacherDashboard = lazy(
  () => import("../enseignant/dashboard/enseignantDashboard"),
);
const CreateExam = lazy(() => import("../enseignant/exams/CreateExam"));
const ExamBank = lazy(() => import("../enseignant/exams/ExamBank"));
const QuestionBank = lazy(() => import("../enseignant/questions/QuestionBank"));
const Profil = lazy(() => import("../enseignant/profil/Profil"));
const WordTemplates = lazy(() => import("../enseignant/modeles/WordTemplates"));
const WordTemplate = lazy(() => import("../admin/modeles/WordTemplate"));

const PageLoader = () => (
  <div className="route-loader">
    <div className="route-loader-card">
      <h2 className="route-loader-title">ExamGen IA</h2>
      <p className="route-loader-sub">Chargement de votre espace...</p>
      <div className="route-loader-bars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  </div>
);

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;

  if (role && user.role !== role) {
    return (
      <Navigate
        to={
          user.role === "admin" ? "/admin/enseignants" : "/enseignant/dashboard"
        }
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
        to={
          user.role === "admin" ? "/admin/enseignants" : "/enseignant/dashboard"
        }
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
            path="/admin/login"
            element={
              <PublicRoute>
                <LoginAdmin />
              </PublicRoute>
            }
          />

          <Route
            path="/"
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
            path="/enseignant/dashboard"
            element={
              <ProtectedRoute role="enseignant">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/enseignant/exams/create"
            element={
              <ProtectedRoute role="enseignant">
                <CreateExam />
              </ProtectedRoute>
            }
          />

          <Route
            path="/enseignant/exams/bank"
            element={
              <ProtectedRoute role="enseignant">
                <ExamBank />
              </ProtectedRoute>
            }
          />

          <Route
            path="/enseignant/questions/bank"
            element={
              <ProtectedRoute role="enseignant">
                <QuestionBank />
              </ProtectedRoute>
            }
          />

          <Route
            path="/enseignant"
            element={
              <ProtectedRoute role="enseignant">
                <Navigate to="/enseignant/dashboard" replace />
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
                  user?.role === "admin"
                    ? "/admin/enseignants"
                    : user?.role === "enseignant"
                      ? "/enseignant/dashboard"
                      : "/"
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
