const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth.middleware');
const { getProfil, updateProfil, changePassword } = require('../controllers/enseignant.controller');

// Toutes ces routes nécessitent d'être connecté en tant qu'enseignant
router.use(verifyToken);

router.get('/profil', getProfil);                    // Consulter son profil
router.put('/profil', updateProfil);                 // Modifier ses informations
router.put('/change-password', changePassword);      // Changer son mot de passe

module.exports = router;