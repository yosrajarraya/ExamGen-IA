const mongoose = require('mongoose');

const wordTemplateSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      trim: true,
      default: 'Nouveau modèle',
    },

    type: {
      type: String,
      required: true,
      trim: true,
      enum: ['final', 'cc', 'rattrapage', 'tp'],
      default: 'final',
    },

    actif: {
      type: Boolean,
      default: true,
    },

    langue: {
      type: String,
      required: true,
      trim: true,
      enum: ['Français', 'Arabe', 'Bilingue'],
      default: 'Français',
    },
    templateStyle: {
      type: String,
      enum: ['long', 'court'],
      default: 'long',
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
      required: true,
      trim: true,
      default: 'Université Nord-Américaine Privée',
    },

    institutFr: {
      type: String,
      required: true,
      trim: true,
      default: 'Institut International de Technologie',
    },

    departementFr: {
      type: String,
      required: true,
      trim: true,
      default: 'Département Informatique',
    },

    universiteAr: {
      type: String,
      trim: true,
      default: '',
    },

    institutAr: {
      type: String,
      trim: true,
      default: '',
    },

    departementAr: {
      type: String,
      trim: true,
      default: '',
    },

    campusText: {
      type: String,
      required: true,
      trim: true,
      default: 'SFAX - TUNISIA',
    },

    // Bloc principal
    titreExamen: {
      type: String,
      required: true,
      trim: true,
      default: 'DEVOIR SURVEILLÉ',
    },

    codeExamen: {
      type: String,
      default: 'C',
    },

    matiere: {
      type: String,
      required: true,
      trim: true,
      default: 'Fouille de données',
    },

    discipline: {
      type: String,
      required: true,
      trim: true,
      default: 'Informatique',
    },

    enseignants: {
      type: String,
      required: true,
      trim: true,
      default: 'nom et prénom de l’enseignant',
    },

    anneeUniversitaire: {
      type: String,
      required: true,
      trim: true,
      default: '2024-2025',
    },

    semestre: {
      type: String,
      required: true,
      trim: true,
      default: '1',
    },

    dateExamen: {
      type: String,
      required: true,
      trim: true,
      default: '07/11/2024',
    },

    nombrePages: {
      type: String,
      trim: true,
      default: '6',
    },

    duree: {
      type: String,
      required: true,
      trim: true,
      default: '1h30',
    },

    documentsAutorises: {
      type: String,
      required: true,
      trim: true,
      default: 'PC & Internet non autorisés',
    },

    feuilleType: {
      type: String,
      required: true,
      trim: true,
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

    // Contenu du bloc Remarques (NB)
    remarques: {
      type: String,
      trim: true,
      default: '',
    },

    // Mise en page
    police: {
      type: String,
      required: true,
      trim: true,
      default: 'Arial',
    },

    taille: {
      type: String,
      required: true,
      trim: true,
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

    exercices: [
      {
        numero: Number,
        contenu: String,
        points: String,
      },
    ],

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