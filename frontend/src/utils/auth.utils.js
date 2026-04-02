// ─── Vérifie si un token JWT est expiré ───────────────────────────────────────
export const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // token malformé → considéré expiré
  }
};

// ─── Lit et valide la session depuis localStorage (exécuté une seule fois) ────
export const getInitialSession = () => {
  const savedToken = localStorage.getItem('token');
  const savedUser  = localStorage.getItem('user');

  if (savedToken && savedUser && !isTokenExpired(savedToken)) {
    try {
      return {
        token: savedToken,
        user: JSON.parse(savedUser),
      };
    } catch {
      // JSON corrompu → session ignorée
    }
  }

  // Session invalide ou expirée → nettoyage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return { token: null, user: null };
};