import api from '../axios.config';

/**
 * Récupérer la liste de tous les enseignants
 */
export const getEnseignants = async () => {
  const response = await api.get('/admin/enseignants');
  return response.data;
};

export const getDepartements = async () => {
  const response = await api.get('/admin/enseignants/departements');
  return response.data;
};

/**
 * Créer un enseignant
 */
export const createEnseignant = async (data) => {
  const response = await api.post('/admin/enseignants/create', data);
  return response.data;
};

/**
 * Activer / désactiver
 */
export const toggleActive = async (id) => {
  const response = await api.put(`/admin/enseignants/${id}/toggle-active`);
  return response.data;
};

/**
 * Réinitialiser mot de passe
 */
export const resetPassword = async (id, newPassword) => {
  const response = await api.put(`/admin/enseignants/${id}/reset-password`, {
    newPassword,
  });
  return response.data;
};

/**
 * Supprimer
 */
export const deleteEnseignant = async (id) => {
  const response = await api.delete(`/admin/enseignants/${id}`);
  return response.data;
};

/**
 * Modifier un enseignant (sans mot de passe)
 */
export const updateEnseignant = async (id, data) => {
  const response = await api.put(`/admin/enseignants/${id}`, data);
  return response.data;
};