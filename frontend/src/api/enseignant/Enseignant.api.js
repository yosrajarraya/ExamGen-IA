import api from '../axios.config';

/**
 * Récupérer le profil de l'enseignant connecté
 */
export const getProfil = async () => {
  const response = await api.get('/enseignant/profil');
  return response.data;
};

export const getDepartements = async () => {
  const response = await api.get('/enseignant/departements');
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

export const addQuestionToBank = async (text, matiere = '', niveau = '', anneeUniversitaire = '', type = 'ouverte') => {
  const response = await api.post('/enseignant/questions/bank', { 
    text,
    matiere,
    niveau,
    anneeUniversitaire,
    type,
  });
  return response.data;
};

export const getQuestionBank = async () => {
  const response = await api.get('/enseignant/questions/bank');
  return response.data;
};

export const getFilteredQuestions = async (matiere, niveau, annee, type) => {
  const params = new URLSearchParams();
  if (matiere) params.append('matiere', matiere);
  if (niveau) params.append('niveau', niveau);
  if (annee) params.append('annee', annee);
  if (type) params.append('type', type);

  const response = await api.get(`/enseignant/questions/filtered?${params.toString()}`);
  return response.data;
};

export const updateQuestionBankItem = async (id, payload) => {
  const response = await api.put(`/enseignant/questions/bank/${id}`, payload);
  return response.data;
};

export const deleteQuestionBankItem = async (id) => {
  const response = await api.delete(`/enseignant/questions/bank/${id}`);
  return response.data;
};

export const copyQuestionBankItem = async (id) => {
  const response = await api.post(`/enseignant/questions/bank/${id}/copy`);
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

export const getExamBankItem = async (id) => {
  const response = await api.get(`/enseignant/exams/bank/${id}`);
  return response.data;
};

export const getFilteredExams = async (matiere, niveau, annee) => {
  const params = new URLSearchParams();
  if (matiere) params.append('matiere', matiere);
  if (niveau) params.append('niveau', niveau);
  if (annee) params.append('annee', annee);

  const response = await api.get(`/enseignant/exams/filtered?${params.toString()}`);
  return response.data;
};

export const downloadExamBankFile = async (id) => {
  const response = await api.get(`/enseignant/exams/bank/${id}/download`, {
    responseType: 'blob',
  });
  return response.data;
};

export const deleteExamBankItem = async (id) => {
  const response = await api.delete(`/enseignant/exams/bank/${id}`);
  return response.data;
};

export const copyExamBankItem = async (id) => {
  const response = await api.post(`/enseignant/exams/bank/${id}/copy`);
  return response.data;
};

export const getExamContent = async (id) => {
  const response = await api.get(`/enseignant/exams/bank/${id}/content`);
  return response.data;
};