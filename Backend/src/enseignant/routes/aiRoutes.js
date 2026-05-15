// routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { verifyToken } = require('../../middleware/auth.middleware');

router.use(verifyToken);

router.post('/generate', aiController.generateAIQuestions);
router.post('/chats', aiController.saveChat);
router.get('/chats', aiController.getChats);
router.get('/chats/:id', aiController.getChatById);
router.delete('/chats/:id', aiController.deleteChat);

module.exports = router;