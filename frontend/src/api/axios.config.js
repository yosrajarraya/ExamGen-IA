import axios from 'axios';

// ─── Instance unique partagée par toute l'app ────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000, // annule la requête si le serveur ne répond pas en 10s
  headers: { 'Content-Type': 'application/json' },
});

// ─── Intercepteur requête : injecte le token JWT automatiquement ─────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Intercepteur réponse : gestion centralisée des erreurs ──────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token expiré ou invalide → déconnexion automatique
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }

    // Accès refusé
    if (error.response?.status === 403) {
      console.warn('Accès refusé :', error.response.data?.message);
    }

    // Serveur inaccessible
    if (!error.response) {
      console.error('Erreur réseau : le serveur est inaccessible');
    }

    return Promise.reject(error);
  }
);

export default api;