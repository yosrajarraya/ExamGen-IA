import { createContext } from 'react';

// Fichier dédié au context object — ni composant, ni hook
const AuthContext = createContext(null);

export default AuthContext;