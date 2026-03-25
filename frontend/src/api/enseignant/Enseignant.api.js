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

export const addQuestionToBank = async (text) => {
  const response = await api.post('/enseignant/questions/bank', { text });
  return response.data;
};

export const getQuestionBank = async () => {
  const response = await api.get('/enseignant/questions/bank');
  return response.data;
};

export const updateQuestionBankItem = async (id, text) => {
  const response = await api.put(`/enseignant/questions/bank/${id}`, { text });
  return response.data;
};

export const deleteQuestionBankItem = async (id) => {
  const response = await api.delete(`/enseignant/questions/bank/${id}`);
  return response.data;
};

export const addExamToBank = async (payload) => {
  const response = await api.post('/enseignant/exams/bank', payload);
  return response.data;
};

export const getExamBank = async () => {
  const response = await api.get('/enseignant/exams/bank');
  return response.data;
};

export const downloadExamBankFile = async (id) => {
  const response = await api.get(`/enseignant/exams/bank/${id}/download`, {
    responseType: 'blob',
  });
  return response.data;
};