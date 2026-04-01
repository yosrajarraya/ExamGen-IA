const Enseignant = require("../models/Enseignant");
const QuestionBankItem = require("../models/QuestionBankItem");

const addQuestionToBank = async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text)
      return res
        .status(400)
        .json({ message: "Le texte de la question est requis" });
    const enseignant = await Enseignant.findById(req.user.id).select(
      "Prenom Nom Email",
    );
    if (!enseignant)
      return res.status(404).json({ message: "Enseignant introuvable" });
    const created = await QuestionBankItem.create({
      text,
      createdBy: req.user.id,
      createdByName:
        `${enseignant.Prenom || ""} ${enseignant.Nom || ""}`.trim(),
      createdByEmail: enseignant.Email || req.user.email || "",
    });
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
      const normalized = {
        id: item._id.toString(),
        text: item.text,
        createdBy: item.createdBy.toString(),
        createdByName: item.createdByName,
        createdByEmail: item.createdByEmail,
        createdAt: item.createdAt,
      };
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
    const item = await QuestionBankItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Question introuvable" });
    if (String(item.createdBy) !== String(req.user.id)) {
      return res
        .status(403)
        .json({ message: "Vous ne pouvez modifier que vos propres questions" });
    }
    item.text = text;
    await item.save();
    return res.status(200).json({
      message: "Question modifiée avec succès",
      question: {
        id: item._id.toString(),
        text: item.text,
        createdBy: item.createdBy.toString(),
        createdByName: item.createdByName,
        createdByEmail: item.createdByEmail,
        createdAt: item.createdAt,
      },
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

module.exports = {
  addQuestionToBank,
  getQuestionBank,
  updateQuestionBankItem,
  deleteQuestionBankItem,
};
