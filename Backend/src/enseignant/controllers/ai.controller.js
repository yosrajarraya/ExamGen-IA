const { chatWithAI, generateAIQuestionsService, generateAIExamService } = require('../services/ai.service');

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

// Generative AI questions endpoint
const generateAIQuestions = async (req, res) => {
  try {
    const { matiere, niveau, type, count, contexte } = req.body;
    const files = req.files || []; // Récupérer les fichiers joints
    
    const jsonData = await generateAIQuestionsService({
      matiere,
      niveau,
      type,
      count,
      contexte,
      files // Passer les fichiers à la fonction de service
    });
    res.json(jsonData);
  } catch (err) {
    console.error('generateAIQuestions error:', err.message);
    res.status(500).json({
      message: err.message || 'Erreur lors de la génération de questions par l\'IA',
    });
  }
};

// Generative AI exam endpoint
const generateAIExam = async (req, res) => {
  try {
    const { matiere, niveau, duree, noteTotale, nbQuestions, types, contexte } = req.body;
    const files = req.files || []; // Récupérer les fichiers joints
    
    const jsonData = await generateAIExamService({
      matiere,
      niveau,
      duree,
      noteTotale,
      nbQuestions,
      types,
      contexte,
      files // Passer les fichiers à la fonction de service
    });
    res.json(jsonData);
  } catch (err) {
    console.error('generateAIExam error:', err.message);
    res.status(500).json({
      message: err.message || 'Erreur lors de la génération de l\'examen par l\'IA',
    });
  }
};

module.exports = {
  chatWithAIController,
  generateAIQuestions,
  generateAIExam,
};