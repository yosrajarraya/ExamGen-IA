const DraftExam = require('../models/DraftExam');
const Enseignant = require('../models/Enseignant');
const mongoose = require('mongoose');

const normalizeDraft = (d) => ({
  id: d._id.toString(),
  title: d.title || '',
  Departement: d.Departement || '',
  filiere: d.filiere || '',
  matiere: d.matiere || '',
  niveau: d.niveau || '',
  status: d.status || 'Brouillon',
  visibility: d.visibility || 'private',
  createdBy: d.createdBy.toString(),
  createdByName: d.createdByName,
  createdByEmail: d.createdByEmail,
  createdAt: d.createdAt,
  sections: d.sections || [],
  examForm: d.examForm || {},
  templateId: d.templateId || null,
});

const saveDraftExam = async (req, res) => {
  try {
    const payload = req.body || {};
    const user = await Enseignant.findById(req.user.id).select('Prenom Nom Email');
    if (!user) return res.status(404).json({ message: 'Enseignant introuvable' });

    // If id provided, try update
    if (payload.id && mongoose.Types.ObjectId.isValid(String(payload.id))) {
      const existing = await DraftExam.findById(payload.id);
      if (existing && String(existing.createdBy) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Accès refusé' });
      }
      const updated = await DraftExam.findByIdAndUpdate(payload.id, {
        title: payload.title || existing.title,
        Departement: payload.departement || existing.Departement,
        filiere: payload.filiere || existing.filiere,
        matiere: payload.matiere || existing.matiere,
        niveau: payload.niveau || existing.niveau,
        sections: payload.sections || existing.sections,
        examForm: payload.examForm || existing.examForm,
        templateId: payload.templateId || existing.templateId,
        status: payload.status || existing.status || 'Brouillon',
        visibility: payload.visibility || existing.visibility || 'private',
      }, { new: true });
      return res.status(200).json({ message: 'Brouillon mis à jour', draft: normalizeDraft(updated) });
    }

    const created = await DraftExam.create({
      title: payload.title || '',
      Departement: payload.departement || '',
      filiere: payload.filiere || '',
      matiere: payload.matiere || '',
      niveau: payload.niveau || '',
      sections: payload.sections || [],
      examForm: payload.examForm || {},
      templateId: payload.templateId || null,
      status: payload.status || 'Brouillon',
      visibility: payload.visibility || 'private',
      createdBy: req.user.id,
      createdByName: `${user.Prenom || ''} ${user.Nom || ''}`.trim(),
      createdByEmail: user.Email || req.user.email || '',
    });

    return res.status(201).json({ message: 'Brouillon sauvegardé', draft: normalizeDraft(created) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDraftExams = async (req, res) => {
  try {
    const drafts = await DraftExam.find({ createdBy: req.user.id }).sort({ updatedAt: -1 });
    return res.status(200).json({ drafts: drafts.map(normalizeDraft) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDraftExamById = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'ID invalide' });
    const d = await DraftExam.findById(id);
    if (!d) return res.status(404).json({ message: 'Brouillon introuvable' });
    if (String(d.createdBy) !== String(req.user.id)) return res.status(403).json({ message: 'Accès refusé' });
    return res.status(200).json({ draft: normalizeDraft(d) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteDraftExam = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'ID invalide' });
    const d = await DraftExam.findById(id);
    if (!d) return res.status(404).json({ message: 'Brouillon introuvable' });
    if (String(d.createdBy) !== String(req.user.id)) return res.status(403).json({ message: 'Accès refusé' });
    await DraftExam.deleteOne({ _id: id });
    return res.status(200).json({ message: 'Brouillon supprimé' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { saveDraftExam, getDraftExams, getDraftExamById, deleteDraftExam };
