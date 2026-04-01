import api from '../axios.config';

/**
 * Connexion admin
 * @param {string} email
 * @param {string} password
 * @returns {{ token: string, user: object }}
 */
export const loginAdmin = async (email, password) => {
  const response = await api.post('/admin/auth/login', { email, password });
  return response.data;
};