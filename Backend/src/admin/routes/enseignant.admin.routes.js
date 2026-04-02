const express = require('express');
const router = express.Router();
const multer = require('multer');
const requireAdmin = require('../middleware/requireAdmin');
const {
  createEnseignant,
  getEnseignants,
  toggleActive,
  resetPassword,
  deleteEnseignant,
  updateEnseignant,
  importEnseignantsExcel,
} = require('../controllers/enseignant.admin.controller');

// Configuration multer pour l'upload de fichiers Excel
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers Excel (.xlsx, .xls) sont autorisés'));
    }
  }
});

// Toutes ces routes nécessitent d'être connecté en tant qu'admin
router.use(requireAdmin);

router.post('/create', createEnseignant);           // Créer un enseignant
router.post('/import-excel', upload.single('file'), importEnseignantsExcel); // Importer via Excel
router.get('/', getEnseignants);                    // Lister tous les enseignants
router.put('/:id/toggle-active', toggleActive);     // Activer / désactiver
router.put('/:id/reset-password', resetPassword);   // Réinitialiser le mot de passe
router.put('/:id', updateEnseignant);               // Modifier un enseignant
router.delete('/:id', deleteEnseignant);            // Supprimer

module.exports = router;