const mongoose = require('mongoose');

const examBankItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
    },
    Departement: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    filiere: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    matiere: {
      type: String,
      trim: true,
      default: '',
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
    type: {
      type: String,
      trim: true,
      default: '',
    },
    duree: {
      type: String,
      trim: true,
      default: '',
    },
    noteTotale: {
      type: Number,
      default: 20,
    },
    questionsCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      trim: true,
      default: 'Exporte',
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
    createdByEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileMimeType: {
      type: String,
      default: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      trim: true,
    },
    fileData: {
      type: Buffer,
      required: true,
      select: false,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuestionBankItem',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ExamBankItem', examBankItemSchema);