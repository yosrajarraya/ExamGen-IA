import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../context/useAuth';
import { loginEnseignant } from '../../api/enseignant/Auth.enseignant.api';
import './LoginEnseignant.css';

const LoginEnseignant = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const handleChange = (e) => {
    setError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await loginEnseignant(form.email, form.password);
      login(data.token, data.user);
      navigate('/enseignant/profil', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion. Vérifiez vos identifiants.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-ens-page">
      <div className="login-ens-card">

        <div className="login-ens-header">
          <div className="login-ens-logo">IIT</div>
          <div>
            <p className="login-ens-inst">Institut Informatique de Tunis</p>
            <h1 className="login-ens-title">Espace Enseignant</h1>
          </div>
        </div>

        <p className="login-ens-subtitle">
          Votre compte a été créé par l'administrateur.<br />
          Connectez-vous avec vos identifiants reçus.
        </p>

        <form onSubmit={handleSubmit} className="login-ens-form" noValidate>

          <div className="form-group">
            <label htmlFor="ens-email">Adresse email</label>
            <input
              id="ens-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="prenom.nom@iit.tn"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ens-password">Mot de passe</label>
            <div className="input-pw-wrapper">
              <input
                id="ens-password"
                type={showPw ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="btn-toggle-pw"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn-login-ens" disabled={loading}>
            {loading ? (
              <span className="btn-spinner">
                <span className="spinner" /> Connexion...
              </span>
            ) : 'Se connecter'}
          </button>

        </form>

        <div className="login-ens-footer">
          <a href="/">← Accès administrateur</a>
        </div>

      </div>
    </div>
  );
};

export default LoginEnseignant;