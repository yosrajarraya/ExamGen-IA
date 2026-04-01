import api from '../axios.config';

export const loginEnseignant = async (email, password) => {
  const response = await api.post('/enseignant/auth/login', { email, password });
  return response.data;
};

export const forgotPasswordEnseignant = async (email) => {
  const response = await api.post('/enseignant/auth/forgot-password', { email });
  return response.data;
};

export const verifyResetCodeEnseignant = async (email, code) => {
  const response = await api.post('/enseignant/auth/verify-reset-code', {
    email,
    code,
  });
  return response.data;
};

export const resetPasswordEnseignant = async (email, code, newPassword) => {
  const response = await api.post('/enseignant/auth/reset-password', {
    email,
    code,
    newPassword,
  });
  return response.data;
};