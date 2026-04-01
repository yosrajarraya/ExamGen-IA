import { useState, useCallback } from 'react';
import AuthContext from './AuthContext';
import { getInitialSession } from '../utils/auth.utils';

const initialSession = getInitialSession();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => initialSession.token);
  const [user,  setUser]  = useState(() => initialSession.user);

  // ─── Connexion ─────────────────────────────────────────────────────────────
  const login = useCallback((tokenData, userData) => {
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenData);
    setUser(userData);
  }, []);


  // ─── Déconnexion ───────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin      = useCallback(() => user?.role === 'admin',      [user]);
  const isEnseignant = useCallback(() => user?.role === 'enseignant', [user]);

  const value = {
    user,
    token,
    login,
    logout,
    isAdmin,
    isEnseignant,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};