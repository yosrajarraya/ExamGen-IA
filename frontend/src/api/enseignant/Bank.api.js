import api from '../axios.config';

const normalizeParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );

export const QuestionBankApi = {
  list: (params = {}) => api.get('/enseignant/question-bank', { params: normalizeParams(params) }),
  getById: (id) => api.get(`/enseignant/question-bank/${id}`),
  create: (payload) => api.post('/enseignant/question-bank', payload),
  update: (id, payload) => api.put(`/enseignant/question-bank/${id}`, payload),
  remove: (id) => api.delete(`/enseignant/question-bank/${id}`),
};

export const ExamBankApi = {
  list: (params = {}) => api.get('/enseignant/exam-bank', { params: normalizeParams(params) }),
  getById: (id) => api.get(`/enseignant/exam-bank/${id}`),
  create: (payload) => api.post('/enseignant/exam-bank', payload),
  update: (id, payload) => api.put(`/enseignant/exam-bank/${id}`, payload),
  remove: (id) => api.delete(`/enseignant/exam-bank/${id}`),
  duplicate: (id) => api.post(`/enseignant/exam-bank/${id}/duplicate`),
};
