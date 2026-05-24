const ChatHistory = require('../models/ChatHistory');
const Enseignant = require('../models/Enseignant');

// Normaliser une conversation pour la réponse
const normalizeChatHistory = (chat) => ({
  id: chat._id.toString(),
  title: chat.title || 'Nouvelle conversation',
  createdBy: chat.createdBy.toString(),
  createdByName: chat.createdByName,
  messages: chat.messages || [],
  context: chat.context || {},
  lastMessageAt: chat.lastMessageAt,
  createdAt: chat.createdAt,
  updatedAt: chat.updatedAt,
});

// Créer ou mettre à jour une conversation
const saveChatHistory = async (req, res) => {
  try {
    const { id, title, messages, context } = req.body;
    const user = await Enseignant.findById(req.user.id).select('Prenom Nom');
    
    if (!user) {
      return res.status(404).json({ message: 'Enseignant introuvable' });
    }

    // Générer un titre automatique si non fourni
    let chatTitle = title;
    if (!chatTitle && messages && messages.length > 0) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        chatTitle = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
      }
    }

    // Si ID fourni, mettre à jour
    if (id) {
      const existing = await ChatHistory.findById(id);
      if (!existing) {
        return res.status(404).json({ message: 'Conversation introuvable' });
      }
      
      if (existing.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Accès refusé' });
      }

      existing.title = chatTitle || existing.title;
      existing.messages = messages || existing.messages;
      existing.context = context || existing.context;
      existing.lastMessageAt = new Date();
      
      await existing.save();
      
      return res.status(200).json({
        message: 'Conversation mise à jour',
        chat: normalizeChatHistory(existing),
      });
    }

    // Sinon, créer une nouvelle conversation
    const newChat = await ChatHistory.create({
      title: chatTitle || 'Nouvelle conversation',
      createdBy: req.user.id,
      createdByName: `${user.Prenom} ${user.Nom}`,
      messages: messages || [],
      context: context || {},
      lastMessageAt: new Date(),
    });

    return res.status(201).json({
      message: 'Conversation créée',
      chat: normalizeChatHistory(newChat),
    });
  } catch (err) {
    console.error('Erreur saveChatHistory:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer toutes les conversations de l'enseignant
const getChatHistories = async (req, res) => {
  try {
    const chats = await ChatHistory.find({ createdBy: req.user.id })
      .sort({ lastMessageAt: -1 })
      .select('-messages'); // Ne pas charger tous les messages pour la liste

    const normalized = chats.map(chat => ({
      id: chat._id.toString(),
      title: chat.title,
      createdByName: chat.createdByName,
      context: chat.context,
      lastMessageAt: chat.lastMessageAt,
      createdAt: chat.createdAt,
      messageCount: chat.messages?.length || 0,
    }));

    return res.status(200).json({ chats: normalized });
  } catch (err) {
    console.error('Erreur getChatHistories:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer une conversation spécifique avec tous ses messages
const getChatHistoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const chat = await ChatHistory.findById(id);

    if (!chat) {
      return res.status(404).json({ message: 'Conversation introuvable' });
    }

    if (chat.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    return res.status(200).json({ chat: normalizeChatHistory(chat) });
  } catch (err) {
    console.error('Erreur getChatHistoryById:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer une conversation
const deleteChatHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const chat = await ChatHistory.findById(id);

    if (!chat) {
      return res.status(404).json({ message: 'Conversation introuvable' });
    }

    if (chat.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    await ChatHistory.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Conversation supprimée' });
  } catch (err) {
    console.error('Erreur deleteChatHistory:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour le titre d'une conversation
const updateChatTitle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const chat = await ChatHistory.findById(id);
    if (!chat) {
      return res.status(404).json({ message: 'Conversation introuvable' });
    }

    if (chat.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    chat.title = title;
    await chat.save();

    return res.status(200).json({
      message: 'Titre mis à jour',
      chat: normalizeChatHistory(chat),
    });
  } catch (err) {
    console.error('Erreur updateChatTitle:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  saveChatHistory,
  getChatHistories,
  getChatHistoryById,
  deleteChatHistory,
  updateChatTitle,
};
