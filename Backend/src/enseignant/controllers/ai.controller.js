const { chatWithAI } = require('../services/ai.service');

/* ── POST /api/enseignant/ai/chat ── */
const chatWithAIController = async (req, res) => {
  try {
    const { message, history, context } = req.body;
    const files = req.files || [];

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message requis.' });
    }

    const parsedHistory = history ? (typeof history === 'string' ? JSON.parse(history) : history) : [];
    const parsedContext = context ? (typeof context === 'string' ? JSON.parse(context) : context) : {};

    const result = await chatWithAI({
      message,
      files,
      history: parsedHistory,
      context: parsedContext,
    });

    res.json(result);
  } catch (err) {
    console.error('Erreur chat IA:', err.message);
    res.status(500).json({
      message: err.message || "Erreur lors de la conversation avec l'IA",
    });
  }
};

module.exports = { chatWithAIController };

// Stubs for AI generation endpoints (to avoid route errors until implemented)
const generateAIQuestions = async (req, res) => {
  try {
    // TODO: implémenter la génération réelle via ai.service
    res.status(501).json({ message: 'generateAIQuestions not implemented yet' });
  } catch (err) {
    console.error('generateAIQuestions error:', err.message);
    res.status(500).json({ message: err.message || 'Erreur interne' });
  }
};

const generateAIExam = async (req, res) => {
  try {
    // TODO: implémenter la génération réelle via ai.service
    res.status(501).json({ message: 'generateAIExam not implemented yet' });
  } catch (err) {
    console.error('generateAIExam error:', err.message);
    res.status(500).json({ message: err.message || 'Erreur interne' });
  }
};

module.exports = { chatWithAIController, generateAIQuestions, generateAIExam };