const express = require('express');
const router = express.Router();
const { loginEnseignant } = require('../controllers/auth.enseignant.controller');

// POST /api/enseignant/auth/login  → public (page de connexion enseignant)
router.post('/login', loginEnseignant);

module.exports = router;