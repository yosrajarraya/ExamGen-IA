const mongoose = require('mongoose');

const wordTemplateSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      default: 'Nouveau modèle',
    },

    type: {
      type: String,
      enum: ['final', 'cc', 'rattrapage', 'tp'],
      default: 'final',
    },

    actif: {
      type: Boolean,
      default: true,
    },

    langue: {
      type: String,
      enum: ['Français', 'Arabe', 'Bilingue'],
      default: 'Français',
    },

    // Logos
    logoLeftBase64: {
      type: String,
      default: null,
    },

    logoRightBase64: {
      type: String,
      default: null,
    },

    // En-tête institutionnel
    universiteFr: {
      type: String,
      default: 'Université Nord-Américaine Privée',
    },

    institutFr: {
      type: String,
      default: 'Institut International de Technologie',
    },

    departementFr: {
      type: String,
      default: 'Département Informatique',
    },

    universiteAr: {
      type: String,
      default: '',
    },

    institutAr: {
      type: String,
      default: '',
    },

    departementAr: {
      type: String,
      default: '',
    },

    campusText: {
      type: String,
      default: 'SFAX - TUNISIA',
    },

    // Bloc principal
    titreExamen: {
      type: String,
      default: 'DEVOIR SURVEILLÉ',
    },

    codeExamen: {
      type: String,
      default: 'C',
    },

    matiere: {
      type: String,
      default: 'Fouille de données',
    },

    discipline: {
      type: String,
      default: 'Informatique'  ,
    },

    enseignants: {
      type: String,
      default: 'nom et prénom de l’enseignant',
    },

    anneeUniversitaire: {
      type: String,
      default: '2024-2025',
    },

    semestre: {
      type: String,
      default: '1',
    },

    dateExamen: {
      type: String,
      default: '07/11/2024',
    },

    nombrePages: {
      type: String,
      default: '6',
    },

    duree: {
      type: String,
      default: '1h30',
    },

    documentsAutorises: {
      type: String,
      default: 'PC & Internet non autorisés',
    },

    feuilleType: {
      type: String,
      default: 'Feuille d’énoncé',
    },

    // Affichage de sections
    sections: {
      zoneNomPrenom: { type: Boolean, default: true },
      zoneGroupe: { type: Boolean, default: true },
      blocNote: { type: Boolean, default: true },
      blocCommentaires: { type: Boolean, default: true },
      blocSignature: { type: Boolean, default: true },
      blocRemarques: { type: Boolean, default: true },
    },

    // Mise en page
    police: {
      type: String,
      default: 'Arial',
    },

    taille: {
      type: String,
      default: '11pt',
    },

    margeH: {
      type: Number,
      default: 2.0,
    },

    margeV: {
      type: Number,
      default: 2.0,
    },

    examCount: {
      type: Number,
      default: 0,
    },

    updatedBy: {
      type: String,
      default: 'admin',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WordTemplate', wordTemplateSchema);