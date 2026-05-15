const mongoose = require('mongoose');

const questionSubSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['ouverte', 'qcm', 'qcm_unique', 'qcm_multiple', 'vrai_faux', 'pratique', 'enonce'],
      default: 'ouverte',
      trim: true,
    },
    answerLines: {
      type: Number,
      default: null,
    },
    options: {
      type: [
        {
          id:      { type: String, default: '' },
          text:    { type: String, default: '' },
          correct: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    imageUrl: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const exerciseBankItemSchema = new mongoose.Schema(
  {
    title: {
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
    questions: {
      type: [questionSubSchema],
      default: [],
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ExerciseBankItem', exerciseBankItemSchema);
