import api from '../axios.config';

const normalizeParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );

export const QuestionBankApi = {
  list: (params = {}) => api.get('/enseignant/exercises/bank', { params: normalizeParams(params) }),
  getById: (id) => api.get(`/enseignant/exercises/bank/${id}`),
  create: (payload) => api.post('/enseignant/exercises/bank', payload),
  update: (id, payload) => api.put(`/enseignant/exercises/bank/${id}`, payload),
  remove: (id) => api.delete(`/enseignant/exercises/bank/${id}`),
};

export const ExamBankApi = {
  list: (params = {}) => api.get('/enseignant/exams/bank', { params: normalizeParams(params) }),
  getById: (id) => api.get(`/enseignant/exams/bank/${id}`),
  create: (payload) => api.post('/enseignant/exams/bank', payload),
  update: (id, payload) => api.put(`/enseignant/exams/bank/${id}`, payload),
  remove: (id) => api.delete(`/enseignant/exams/bank/${id}`),
  duplicate: (id) => api.post(`/enseignant/exams/bank/${id}/copy`),
};

export const ExerciseBankApi = QuestionBankApi;
