import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../context/useAuth';
import { loginAdmin } from '../../api/admin/auth.admin.api';
import './LoginAdmin.css';

const IconDiplome = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
  </svg>
);

const IconBouclier = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
  </svg>
);

const IconEmail = () => (
  <svg viewBox="0 0 24 24">
    <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 2-8 5-8-5h16zm0 12H4V9l8 5 8-5v9z" />
  </svg>
);

const IconCle = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12.65 10A6 6 0 1 0 14 13.65L21 21l1.41-1.41-7.06-7.06A5.94 5.94 0 0 0 12.65 10zM8 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
  </svg>
);

const LoginAdmin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    setError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await loginAdmin(form.email, form.password);
      login(data.token, data.user);
      navigate('/admin/enseignants', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion. Vérifiez vos identifiants.');
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
          <h2 className="auth-titre-principal">Connexion Admin</h2>
          <p className="auth-sous-titre">
            Accédez au Espace Administrateur de la plateforme ExamGen-IA.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="alerte-erreur" role="alert">{error}</div>}

          <div className="form-groupe">
            <label htmlFor="admin-email">Adresse email</label>
            <div className="input-conteneur">
              <span className="input-icone-left"><IconEmail /></span>
              <input
                id="admin-email"
                type="email"
                name="email"
                className="form-input"
                value={form.email}
                onChange={handleChange}
                placeholder="admin@iit-sfax.tn"
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-groupe">
            <label htmlFor="admin-password">Mot de passe</label>
            <div className="input-conteneur">
              <span className="input-icone-left"><IconCle /></span>
              <input
                id="admin-password"
                type={showPw ? 'text' : 'password'}
                name="password"
                className="form-input"
                value={form.password}
                onChange={handleChange}
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
          </div>

          <button type="submit" className="btn-connexion" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" /> Connexion...
              </>
            ) : (
              <>
                <IconBouclier /> Se connecter
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <div className="separateur">ou</div>
          <p>Vous êtes enseignant ? <a href="/enseignant/login">Accédez à votre espace</a></p>
          <p>Problème ? <a href="https://iit.tn/contact-3/" target="_blank" rel="noopener noreferrer">Contacter le support</a></p>
        </div>
      </div>
    </div>
  );
};

export default LoginAdmin;
