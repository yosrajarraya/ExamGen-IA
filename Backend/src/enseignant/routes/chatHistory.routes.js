const express = require('express');
const router = express.Router();
const {
  saveChatHistory,
  getChatHistories,
  getChatHistoryById,
  deleteChatHistory,
  updateChatTitle,
} = require('../controllers/chatHistory.controller');
const requireEnseignant = require('../middleware/requireEnseignant');

// Toutes les routes nécessitent l'authentification enseignant
router.use(requireEnseignant);

// POST /api/enseignant/chat-history - Créer ou mettre à jour une conversation
router.post('/', saveChatHistory);

// GET /api/enseignant/chat-history - Récupérer toutes les conversations
router.get('/', getChatHistories);

// GET /api/enseignant/chat-history/:id - Récupérer une conversation spécifique
router.get('/:id', getChatHistoryById);

// DELETE /api/enseignant/chat-history/:id - Supprimer une conversation
router.delete('/:id', deleteChatHistory);

// PATCH /api/enseignant/chat-history/:id/title - Mettre à jour le titre
router.patch('/:id/title', updateChatTitle);

module.exports = router;
