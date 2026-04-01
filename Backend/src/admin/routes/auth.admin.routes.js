const express = require('express');
const router = express.Router();
const { loginAdmin } = require('../controllers/auth.admin.controller');

// POST /api/admin/auth/login  → public (page de connexion admin)
router.post('/login', loginAdmin);

module.exports = router;