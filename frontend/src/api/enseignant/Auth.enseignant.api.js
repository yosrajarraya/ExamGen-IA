import api from '../axios.config';

/**
 * Connexion enseignant
 * @param {string} email
 * @param {string} password
 * @returns {{ token: string, user: object }}
 */
export const loginEnseignant = async (email, password) => {
  const response = await api.post('/enseignant/auth/login', { email, password });
  return response.data;
};