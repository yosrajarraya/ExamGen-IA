import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginEnseignant } from '../../api/enseignant/Auth.enseignant.api';
import './LoginEnseignant.css';

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

const IconKey = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12.65 10A6 6 0 1 0 14 13.65L21 21l1.41-1.41-7.06-7.06A5.94 5.94 0 0 0 12.65 10zM8 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
  </svg>
);

const LoginEnseignant = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginEnseignant(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/enseignant/profil';
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-panneau-gauche">
        <div className="auth-logo-bloc">
          <div className="auth-logo-icone">
            <IconDiplome />
          </div>
        </div>

        <div className="auth-info-bloc">
          <h2 className="auth-info-titre">
            Bienvenue sur <span>ExamGen-IA</span>
          </h2>
        </div>
      </div>

      <div className="auth-panneau-droit">
        <div className="auth-form-header">
          <h2 className="auth-titre-principal">Connexion Enseignant</h2>
          <p className="auth-sous-titre">
            Accédez au Espace Enseignant de la plateforme ExamGen-IA.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="alerte-erreur" role="alert">{error}</div>}

          <div className="form-groupe">
            <label htmlFor="ens-email">Adresse email</label>
            <div className="input-conteneur">
              <span className="input-icone-left"><IconEmail /></span>
              <input
                id="ens-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="enseignant@iit-sfax.tn"
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-groupe">
            <label htmlFor="ens-password">Mot de passe</label>
            <div className="input-conteneur">
              <span className="input-icone-left"><IconKey /></span>
              <input
                id="ens-password"
                type={showPw ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="btn-voir-mdp"
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Se souvenir de moi
            </label>

            <button
              type="button"
              className="lien-oublie-btn"
              onClick={() => navigate('/enseignant/forgot-password')}
            >
              Mot de passe oublié ?
            </button>
          </div>

          <button type="submit" className="btn-connexion" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" /> Connexion...
              </>
            ) : (
              <>
                <IconDiplome /> Se connecter
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <div className="separateur">ou</div>
          <p>Vous êtes administrateur ? <a href="/">Accédez à l'espace admin</a></p>
          <p>Problème ? <a href="mailto:support@iit.tn">Contacter le support</a></p>
        </div>
      </div>
    </div>
  );
};

export default LoginEnseignant;