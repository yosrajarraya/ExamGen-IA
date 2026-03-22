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
    // Toujours stocké hashé via bcrypt — jamais en clair
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Enseignant', enseignantSchema);