const express = require('express');
const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin');
const {
  createEnseignant,
  getEnseignants,
  toggleActive,
  resetPassword,
  deleteEnseignant,
  updateEnseignant,
} = require('../controllers/enseignant.admin.controller');

// Toutes ces routes nécessitent d'être connecté en tant qu'admin
router.use(requireAdmin);

router.post('/create', createEnseignant);           // Créer un enseignant
router.get('/', getEnseignants);                    // Lister tous les enseignants
router.put('/:id/toggle-active', toggleActive);     // Activer / désactiver
router.put('/:id/reset-password', resetPassword);   // Réinitialiser le mot de passe
router.put('/:id', updateEnseignant);               // Modifier un enseignant
router.delete('/:id', deleteEnseignant);            // Supprimer

module.exports = router;