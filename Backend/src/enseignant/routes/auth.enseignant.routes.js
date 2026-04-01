const express = require('express');
const router = express.Router();

const {
  loginEnseignant,
  forgotPassword,
  verifyResetCode,
  resetPasswordWithCode,
} = require('../controllers/auth.enseignant.controller');
console.log('AUTH ENSEIGNANT ROUTES FILE LOADED');
// Connexion enseignant
router.post('/login', loginEnseignant);

// Mot de passe oublié : envoi du code
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode); 
// Réinitialisation avec code
router.post('/reset-password', resetPasswordWithCode);
console.log('VERIFY RESET ROUTE REGISTERED');
module.exports = router;