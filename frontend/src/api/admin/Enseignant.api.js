import api from '../axios.config';

/**
 * Récupérer la liste de tous les enseignants
 */
export const getEnseignants = async () => {
  const response = await api.get('/admin/enseignants');
  return response.data;
};

/**
 * Créer un enseignant (admin seulement)
 * @param {{ Prenom, Nom, Email, Password, Telephone, Grade, Departement, Specialite, Active }} data
 */
export const createEnseignant = async (data) => {
  const response = await api.post('/admin/enseignants/create', data);
  return response.data;
};

/**
 * Activer ou désactiver un compte enseignant
 * @param {string} id
 */
export const toggleActive = async (id) => {
  const response = await api.put(`/admin/enseignants/${id}/toggle-active`);
  return response.data;
};

/**
 * Réinitialiser le mot de passe d'un enseignant
 * @param {string} id
 * @param {string} newPassword
 */
export const resetPassword = async (id, newPassword) => {
  const response = await api.put(`/admin/enseignants/${id}/reset-password`, { newPassword });
  return response.data;
};

/**
 * Supprimer un enseignant
 * @param {string} id
 */
export const deleteEnseignant = async (id) => {
  const response = await api.delete(`/admin/enseignants/${id}`);
  return response.data;
};