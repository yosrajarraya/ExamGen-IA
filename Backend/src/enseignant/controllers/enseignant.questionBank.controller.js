const Enseignant = require("../models/Enseignant");
const QuestionBankItem = require("../models/QuestionBankItem");

const QUESTION_TYPES = new Set([
  'ouverte',
  'qcm',
  'qcm_unique',
  'qcm_multiple',
  'vrai_faux',
  'pratique',
  'enonce',
]);

const normalizeQuestionType = (type) => {
  const clean = String(type || '').trim();
  if (QUESTION_TYPES.has(clean)) return clean;
  return 'ouverte';
};

const normalizeQuestionItem = (item) => ({
  id: item._id.toString(),
  text: item.text,
  matiere: item.matiere,
  niveau: item.niveau,
  anneeUniversitaire: item.anneeUniversitaire,
  type: normalizeQuestionType(item.type),
  createdBy: item.createdBy.toString(),
  createdByName: item.createdByName,
  createdByEmail: item.createdByEmail,
  createdAt: item.createdAt,
});

const buildTypeQuery = (type) => {
  const normalized = normalizeQuestionType(type);
  if (!String(type || '').trim()) {
    return null;
  }
  if (normalized === 'qcm') {
    return { $in: ['qcm', 'qcm_unique', 'qcm_multiple'] };
  }
  return normalized;
};

const addQuestionToBank = async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text)
      return res
        .status(400)
        .json({ message: "Le texte de la question est requis" });
    const { matiere, niveau, anneeUniversitaire, type } = req.body || {};
    
    // Log pour debug
    console.log('📝 [addQuestionToBank] Type reçu:', type, '| Type normalisé:', normalizeQuestionType(type));
    
    const enseignant = await Enseignant.findById(req.user.id).select(
      "Prenom Nom Email",
    );
    if (!enseignant)
      return res.status(404).json({ message: "Enseignant introuvable" });
    
    const normalizedType = normalizeQuestionType(type);
    const created = await QuestionBankItem.create({
      text,
      matiere: String(matiere || "").trim(),
      niveau: String(niveau || "").trim(),
      anneeUniversitaire: String(anneeUniversitaire || "").trim(),
      type: normalizedType,
      createdBy: req.user.id,
      createdByName:
        `${enseignant.Prenom || ""} ${enseignant.Nom || ""}`.trim(),
      createdByEmail: enseignant.Email || req.user.email || "",
    });
    
    console.log('✅ [addQuestionToBank] Question créée avec type:', created.type);
    
    return res
      .status(201)
      .json({
        message: "Question ajoutée à la banque avec succès",
        question: created,
      });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getQuestionBank = async (req, res) => {
  try {
    const items = await QuestionBankItem.find().sort({ createdAt: -1 });
    const mesQuestions = [];
    const autresQuestions = [];
    items.forEach((item) => {
      const normalized = normalizeQuestionItem(item);
      if (String(item.createdBy) === String(req.user.id)) {
        mesQuestions.push(normalized);
      } else {
        autresQuestions.push(normalized);
      }
    });
    return res.status(200).json({ mesQuestions, autresQuestions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getFilteredQuestions = async (req, res) => {
  try {
    const { matiere, niveau, annee, type } = req.query;
    const query = {};

    if (matiere && String(matiere).trim()) {
      query.matiere = String(matiere).trim();
    }
    if (niveau && String(niveau).trim()) {
      query.niveau = String(niveau).trim();
    }
    if (annee && String(annee).trim()) {
      query.anneeUniversitaire = String(annee).trim();
    }
    if (type && String(type).trim()) {
      query.type = buildTypeQuery(type);
    }

    const items = await QuestionBankItem.find(query).sort({ createdAt: -1 });
    const mesQuestions = [];
    const autresQuestions = [];
    items.forEach((item) => {
      const normalized = normalizeQuestionItem(item);
      if (String(item.createdBy) === String(req.user.id)) {
        mesQuestions.push(normalized);
      } else {
        autresQuestions.push(normalized);
      }
    });
    return res.status(200).json({ mesQuestions, autresQuestions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateQuestionBankItem = async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text)
      return res
        .status(400)
        .json({ message: "Le texte de la question est requis" });
    const type = normalizeQuestionType(req.body?.type);
    const item = await QuestionBankItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Question introuvable" });
    if (String(item.createdBy) !== String(req.user.id)) {
      return res
        .status(403)
        .json({ message: "Vous ne pouvez modifier que vos propres questions" });
    }
    item.text = text;
    item.type = type;
    await item.save();
    return res.status(200).json({
      message: "Question modifiée avec succès",
      question: normalizeQuestionItem(item),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteQuestionBankItem = async (req, res) => {
  try {
    const item = await QuestionBankItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Question introuvable" });
    if (String(item.createdBy) !== String(req.user.id)) {
      return res
        .status(403)
        .json({
          message: "Vous ne pouvez supprimer que vos propres questions",
        });
    }
    await QuestionBankItem.deleteOne({ _id: item._id });
    return res.status(200).json({ message: "Question supprimée avec succès" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const copyQuestionBankItem = async (req, res) => {
  try {
    const sourceItem = await QuestionBankItem.findById(req.params.id);
    if (!sourceItem) return res.status(404).json({ message: "Question introuvable" });
    
    const enseignant = await Enseignant.findById(req.user.id).select(
      "Prenom Nom Email",
    );
    if (!enseignant)
      return res.status(404).json({ message: "Enseignant introuvable" });
    
    const copiedQuestion = await QuestionBankItem.create({
      text: sourceItem.text,
      matiere: sourceItem.matiere,
      niveau: sourceItem.niveau,
      anneeUniversitaire: sourceItem.anneeUniversitaire,
      type: normalizeQuestionType(sourceItem.type),
      createdBy: req.user.id,
      createdByName:
        `${enseignant.Prenom || ""} ${enseignant.Nom || ""}`.trim(),
      createdByEmail: enseignant.Email || req.user.email || "",
    });
    
    return res.status(201).json({
      message: "Question copiée avec succès",
      question: normalizeQuestionItem(copiedQuestion),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addQuestionToBank,
  getQuestionBank,
  getFilteredQuestions,
  updateQuestionBankItem,
  deleteQuestionBankItem,
  copyQuestionBankItem,
};
