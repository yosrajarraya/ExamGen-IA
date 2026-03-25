import api from '../axios.config';

/**
 * Récupérer le profil de l'enseignant connecté
 */
export const getProfil = async () => {
  const response = await api.get('/enseignant/profil');
  return response.data;
};

/**
 * Mettre à jour les informations du profil
 * @param {{ Telephone, Grade, Departement, Specialite }} data
 */
export const updateProfil = async (data) => {
  const response = await api.put('/enseignant/profil', data);
  return response.data;
};

/**
 * Changer son propre mot de passe
 * @param {string} ancienPassword
 * @param {string} nouveauPassword
 */
export const changePassword = async (ancienPassword, nouveauPassword) => {
  const response = await api.put('/enseignant/change-password', {
    ancienPassword,
    nouveauPassword,
  });
  return response.data;
};

export const getWordTemplates = async () => {
  const response = await api.get('/enseignant/word-template');
  return response.data;
};