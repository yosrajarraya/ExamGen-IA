import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  resetPasswordEnseignant,
  loginEnseignant,
} from '../../api/enseignant/Auth.enseignant.api';
import './ResetPassword.css';

const IconDiplome = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
  </svg>
);

const IconEmail = () => (
  <svg viewBox="0 0 24 24">
    <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 2-8 5-8-5h16zm0 12H4V9l8 5 8-5v9z" />
  </svg>
);

const IconCode = () => (
  <svg viewBox="0 0 24 24">
    <path d="M8.7 16.7L4 12l4.7-4.7 1.4 1.4L6.8 12l3.3 3.3-1.4 1.4zm6.6 0l-1.4-1.4 3.3-3.3-3.3-3.3 1.4-1.4L20 12l-4.7 4.7z" />
  </svg>
);

const IconKey = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12.65 10A6 6 0 1 0 14 13.65L21 21l1.41-1.41-7.06-7.06A5.94 5.94 0 0 0 12.65 10zM8 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
  </svg>
);

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState(location.state?.code || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [message, setMessage] = useState('Code valide. Définissez votre nouveau mot de passe.');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!newPassword || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      const resetData = await resetPasswordEnseignant(email, code, newPassword);
      setMessage(resetData.message || 'Mot de passe réinitialisé avec succès');
      setSuccess(true);

      // Connexion automatique après reset
      const loginData = await loginEnseignant(email, newPassword);
      localStorage.setItem('token', loginData.token);
      localStorage.setItem('user', JSON.stringify(loginData.user));

      // Redirection vers le profil après 1.5s
      setTimeout(() => {
        window.location.href = '/enseignant/profil';
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-auth-container">
      {/* ── Panneau gauche ── */}
      <div className="reset-auth-left">
        <div className="reset-auth-logo-wrap">
          <div className="reset-auth-logo-circle">
            <IconDiplome />
          </div>
        </div>
        <div className="reset-auth-left-content">
          <h2 className="reset-auth-left-title">
            Bienvenue sur <span>ExamGen-IA</span>
          </h2>
        </div>
      </div>

      {/* ── Panneau droit ── */}
      <div className="reset-auth-right">
        <div className="reset-auth-header">
          <h1 className="reset-auth-title">Réinitialiser mot de passe</h1>
          <p className="reset-auth-subtitle">
            Récupérez votre accès enseignant en 3 étapes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="reset-auth-form" noValidate>
          {message && <div className="reset-alert-success">{message}</div>}
          {error   && <div className="reset-alert-error">{error}</div>}

          <div className="reset-step-badge">Étape 3/3 : Nouveau mot de passe</div>

          {/* Email (lecture seule) */}
          <div className="reset-form-group">
            <label htmlFor="reset-email">Adresse email</label>
            <div className="reset-input-wrap">
              <span className="reset-input-icon"><IconEmail /></span>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="reset-input"
                required
                disabled={loading || success}
              />
            </div>
          </div>

          {/* Code */}
          <div className="reset-form-group">
            <label htmlFor="reset-code">Code reçu par email</label>
            <div className="reset-input-wrap">
              <span className="reset-input-icon"><IconCode /></span>
              <input
                id="reset-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="reset-input"
                required
                disabled={loading || success}
              />
            </div>
          </div>

          {/* Nouveau mot de passe */}
          <div className="reset-form-group">
            <label htmlFor="reset-password">Nouveau mot de passe</label>
            <div className="reset-input-wrap">
              <span className="reset-input-icon"><IconKey /></span>
              <input
                id="reset-password"
                type={showNewPw ? 'text' : 'password'}
                placeholder="Minimum 6 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="reset-input"
                required
                disabled={loading || success}
              />
              <button
                type="button"
                className="reset-toggle-pw"
                onClick={() => setShowNewPw((v) => !v)}
                tabIndex={-1}
              >
                {showNewPw ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          {/* Confirmer mot de passe */}
          <div className="reset-form-group">
            <label htmlFor="reset-confirm-password">Confirmer mot de passe</label>
            <div className="reset-input-wrap">
              <span className="reset-input-icon"><IconKey /></span>
              <input
                id="reset-confirm-password"
                type={showConfirmPw ? 'text' : 'password'}
                placeholder="Retapez le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`reset-input ${
                  confirmPassword && confirmPassword !== newPassword
                    ? 'reset-input-error'
                    : confirmPassword && confirmPassword === newPassword
                    ? 'reset-input-ok'
                    : ''
                }`}
                required
                disabled={loading || success}
              />
              <button
                type="button"
                className="reset-toggle-pw"
                onClick={() => setShowConfirmPw((v) => !v)}
                tabIndex={-1}
              >
                {showConfirmPw ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            {/* Indicateur visuel de correspondance */}
            {confirmPassword && (
              <span className={`reset-match-hint ${confirmPassword === newPassword ? 'ok' : 'ko'}`}>
                {confirmPassword === newPassword ? '✓ Les mots de passe correspondent' : '✗ Ne correspondent pas'}
              </span>
            )}
          </div>

          {/* Bouton principal */}
          <button
            type="submit"
            className={`reset-submit-btn ${success ? 'reset-submit-btn--success' : ''}`}
            disabled={loading || success}
          >
            {loading
              ? 'Validation en cours...'
              : success
              ? '✓ Redirection vers votre profil...'
              : 'Changer le mot de passe'}
          </button>
        </form>

        <div className="reset-auth-footer">
          <p>
            Retour à la connexion :{' '}
            <button
              type="button"
              className="reset-link-btn"
              onClick={() => navigate('/enseignant/login')}
            >
              ouvrir la page login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;