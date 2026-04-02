const mongoose = require('mongoose');

const questionBankItemSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    matiere: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    niveau: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    anneeUniversitaire: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enseignant',
      required: true,
    },
    createdByName: {
      type: String,
      default: '',
      trim: true,
    },
    createdByEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('QuestionBankItem', questionBankItemSchema);
