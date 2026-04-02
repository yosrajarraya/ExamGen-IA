// Backend/src/admin/routes/wordTemplate.admin.routes.js
const express    = require('express');
const router     = express.Router();
const requireAdmin = require('../middleware/requireAdmin');
const {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
} = require('../controllers/wordTemplate.admin.controller');

// GET    /api/admin/word-templates          → liste tous les modèles
router.get('/',             requireAdmin, getTemplates);

// GET    /api/admin/word-templates/:id      → un seul modèle
router.get('/:id',          requireAdmin, getTemplateById);

// POST   /api/admin/word-templates          → créer un nouveau modèle
router.post('/',            requireAdmin, createTemplate);

// PUT    /api/admin/word-templates/:id      → mettre à jour un modèle
router.put('/:id',          requireAdmin, updateTemplate);

// DELETE /api/admin/word-templates/:id      → supprimer un modèle
router.delete('/:id',       requireAdmin, deleteTemplate);

// POST   /api/admin/word-templates/:id/duplicate → dupliquer un modèle
router.post('/:id/duplicate', requireAdmin, duplicateTemplate);

module.exports = router;