import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPasswordEnseignant } from '../../api/enseignant/Auth.enseignant.api';
import './ForgotPassword.css';

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

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const data = await forgotPasswordEnseignant(email);
      setMessage(data.message || 'Code envoyé par email');

      setTimeout(() => {
        navigate('/enseignant/verify-code', { state: { email } });
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur lors de l’envoi du code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-auth-container">
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

      <div className="reset-auth-right">
        <div className="reset-auth-header">
          <h1 className="reset-auth-title">Mot de passe oublié</h1>
          <p className="reset-auth-subtitle">
            Récupérez votre accès enseignant en 3 étapes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="reset-auth-form" noValidate>
          <div className="reset-step-badge">Étape 1/3: Vérification email</div>

          {message && <div className="reset-alert-success">{message}</div>}
          {error && <div className="reset-alert-error">{error}</div>}

          <div className="reset-form-group">
            <label htmlFor="forgot-email">Adresse email</label>
            <div className="reset-input-wrap">
              <span className="reset-input-icon">
                <IconEmail />
              </span>
              <input
                id="forgot-email"
                type="email"
                placeholder="enseignant@iit-sfax.tn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="reset-input"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="reset-submit-btn" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le code'}
          </button>
        </form>

        <div className="reset-auth-footer">
          <p>
            Retour à la connexion:{' '}
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

export default ForgotPassword;