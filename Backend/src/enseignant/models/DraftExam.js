const mongoose = require('mongoose');

const draftExamSchema = new mongoose.Schema({
  title: { type: String, trim: true, default: '' },
  Departement: { type: String, trim: true, default: '' },
  filiere: { type: String, trim: true, default: '' },
  matiere: { type: String, trim: true, default: '' },
  niveau: { type: String, trim: true, default: '' },
  anneeUniversitaire: { type: String, trim: true, default: '' },
  semestre: { type: String, trim: true, default: '' },
  type: { type: String, trim: true, default: '' },
  duree: { type: String, trim: true, default: '' },
  noteTotale: { type: Number, default: 20 },
  sections: { type: mongoose.Schema.Types.Mixed, default: [] },
  examForm: { type: mongoose.Schema.Types.Mixed, default: {} },
  templateId: { type: String, trim: true, default: null },
  status: { type: String, trim: true, default: 'Brouillon' },
  visibility: { type: String, enum: ['public', 'private'], default: 'private' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Enseignant', required: true, index: true },
  createdByName: { type: String, trim: true, default: '' },
  createdByEmail: { type: String, trim: true, lowercase: true, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('DraftExam', draftExamSchema);
