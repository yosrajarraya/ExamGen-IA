const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: 'Nouvelle conversation',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enseignant',
      required: true,
      index: true,
    },
    createdByName: {
      type: String,
      trim: true,
      default: '',
    },
    messages: [
      {
        id: String,
        role: {
          type: String,
          enum: ['user', 'assistant'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        files: [String],
        jsonData: mongoose.Schema.Types.Mixed,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    context: {
      matiere: { type: String, default: '' },
      niveau: { type: String, default: '' },
      duree: { type: String, default: '2 heures' },
      noteTotale: { type: String, default: '20' },
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index pour recherche rapide
chatHistorySchema.index({ createdBy: 1, lastMessageAt: -1 });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
