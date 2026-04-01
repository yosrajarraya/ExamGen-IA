const mongoose = require('mongoose');

const enseignantSchema = new mongoose.Schema(
  {
    Prenom: {
      type: String,
      required: true,
      trim: true,
    },
    Nom: {
      type: String,
      required: true,
      trim: true,
    },
    Email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    Password: {
      type: String,
      required: true,
    },
    Telephone: {
      type: String,
      default: '',
      trim: true,
    },
    Grade: {
      type: String,
      default: '',
      trim: true,
    },
    Departement: {
      type: String,
      default: '',
      trim: true,
    },
    Specialite: {
      type: String,
      default: '',
      trim: true,
    },
    Active: {
      type: Boolean,
      default: true,
    },

    // Pour "mot de passe oublié"
    resetCode: {
      type: String,
      default: null,
    },
    resetCodeExpire: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Enseignant', enseignantSchema);