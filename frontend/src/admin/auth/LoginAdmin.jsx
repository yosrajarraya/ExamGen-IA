import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import  useAuth  from '../../context/useAuth';
import { loginAdmin } from '../../api/admin/auth.admin.api';
import './LoginAdmin.css';

const LoginAdmin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const handleChange = (e) => {
    setError(''); // efface l'erreur dès que l'utilisateur tape
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
    <div className="login-admin-page">
      <div className="login-admin-card">

        <div className="login-admin-header">
          <div className="login-admin-logo">IIT</div>
          <div>
            <p className="login-admin-inst">Institut Informatique de Tunis</p>
            <h1 className="login-admin-title">Administration</h1>
          </div>
        </div>

        <p className="login-admin-subtitle">
          Connectez-vous à votre espace administrateur
        </p>

        <form onSubmit={handleSubmit} className="login-admin-form" noValidate>

          <div className="form-group">
            <label htmlFor="admin-email">Adresse email</label>
            <input
              id="admin-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@iit.tn"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password">Mot de passe</label>
            <div className="input-pw-wrapper">
              <input
                id="admin-password"
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

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <span className="btn-spinner">
                <span className="spinner" /> Connexion...
              </span>
            ) : 'Se connecter'}
          </button>

        </form>

        <div className="login-admin-footer">
          <a href="/enseignant/login">← Accès espace enseignant</a>
        </div>

      </div>
    </div>
  );
};

export default LoginAdmin;