const mongoose = require("mongoose");
const Enseignant = require("../models/Enseignant");
const ExamBankItem = require("../models/ExamBankItem");

const addExamToBank = async (req, res) => {
  try {
    const {
      title,
      filiere,
      matiere,
      niveau,
      type,
      duree,
      noteTotale,
      questionsCount,
      status,
      fileName,
      fileMimeType,
      fileContentBase64,
      anneeUniversitaire,
    } = req.body || {};

    const cleanBase64 = String(fileContentBase64 || "").trim();
    const cleanFileName = String(fileName || "").trim();
    if (!cleanBase64 || !cleanFileName) {
      return res
        .status(400)
        .json({
          message: "Le fichier .docx est requis pour enregistrer l'examen",
        });
    }

    const enseignant = await Enseignant.findById(req.user.id).select(
      "Prenom Nom Email",
    );
    if (!enseignant)
      return res.status(404).json({ message: "Enseignant introuvable" });

    const fileData = Buffer.from(cleanBase64, "base64");
    if (!fileData || !fileData.length) {
      return res.status(400).json({ message: "Contenu du fichier invalide" });
    }

    const created = await ExamBankItem.create({
      title: String(title || "").trim(),
      filiere: String(filiere || "").trim(),
      matiere: String(matiere || "").trim(),
      niveau: String(niveau || "").trim(),
      type: String(type || "").trim(),
      duree: String(duree || "").trim(),
      noteTotale: Number(noteTotale) || 0,
      questionsCount: Number(questionsCount) || 0,
      status: String(status || "Exporte").trim() || "Exporte",
      anneeUniversitaire: String(anneeUniversitaire || "").trim(),
      createdBy: req.user.id,
      createdByName:
        `${enseignant.Prenom || ""} ${enseignant.Nom || ""}`.trim(),
      createdByEmail: enseignant.Email || req.user.email || "",
      fileName: cleanFileName,
      fileMimeType: String(
        fileMimeType ||
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ).trim(),
      fileData,
    });

    return res.status(201).json({
      message: "Examen sauvegardé dans la banque avec succès",
      exam: {
        id: created._id.toString(),
        title: created.title,
        filiere: created.filiere,
        status: created.status,
        noteTotale: created.noteTotale,
        questionsCount: created.questionsCount,
        duree: created.duree,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getExamBank = async (req, res) => {
  try {
    const items = await ExamBankItem.find().sort({ createdAt: -1 });
    const mesExamens = [];
    const autresExamens = [];

    items.forEach((item) => {
      const normalized = {
        id: item._id.toString(),
        title: item.title || item.fileName || "Examen sans titre",
        filiere: item.filiere,
        matiere: item.matiere,
        niveau: item.niveau,
        anneeUniversitaire: item.anneeUniversitaire,
        type: item.type,
        duree: item.duree,
        status: item.status || "Exporte",
        noteTotale: Number(item.noteTotale) || 0,
        questionsCount: Number(item.questionsCount) || 0,
        createdBy: item.createdBy.toString(),
        createdByName: item.createdByName,
        createdByEmail: item.createdByEmail,
        createdAt: item.createdAt,
      };

      if (String(item.createdBy) === String(req.user.id)) {
        mesExamens.push(normalized);
      } else {
        autresExamens.push(normalized);
      }
    });

    return res.status(200).json({ mesExamens, autresExamens });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getFilteredExams = async (req, res) => {
  try {
    const { matiere, niveau, annee } = req.query;
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

    const items = await ExamBankItem.find(query).sort({ createdAt: -1 });
    const mesExamens = [];
    const autresExamens = [];

    items.forEach((item) => {
      const normalized = {
        id: item._id.toString(),
        title: item.title || item.fileName || "Examen sans titre",
        filiere: item.filiere,
        matiere: item.matiere,
        niveau: item.niveau,
        anneeUniversitaire: item.anneeUniversitaire,
        type: item.type,
        duree: item.duree,
        status: item.status || "Exporte",
        noteTotale: Number(item.noteTotale) || 0,
        questionsCount: Number(item.questionsCount) || 0,
        createdBy: item.createdBy.toString(),
        createdByName: item.createdByName,
        createdByEmail: item.createdByEmail,
        createdAt: item.createdAt,
      };

      if (String(item.createdBy) === String(req.user.id)) {
        mesExamens.push(normalized);
      } else {
        autresExamens.push(normalized);
      }
    });

    return res.status(200).json({ mesExamens, autresExamens });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const downloadExamBankFile = async (req, res) => {
  try {
    const exam = await ExamBankItem.findById(req.params.id).select("+fileData");
    if (!exam) return res.status(404).json({ message: "Examen introuvable" });
    res.setHeader(
      "Content-Type",
      exam.fileMimeType ||
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${exam.fileName || "examen.docx"}"`,
    );
    return res.status(200).send(exam.fileData);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteExamBankItem = async (req, res) => {
  try {
    const examId = String(req.params.id || "").trim();

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ message: "Format d'ID invalide" });
    }

    const exam = await ExamBankItem.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Examen introuvable" });
    }

    if (exam.createdBy.toString() !== String(req.user.id)) {
      return res
        .status(403)
        .json({ message: "Vous ne pouvez supprimer que vos propres examens" });
    }

    await ExamBankItem.deleteOne({ _id: exam._id });

    return res.status(200).json({ message: "Examen supprimé avec succès" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const copyExamBankItem = async (req, res) => {
  try {
    const sourceExam = await ExamBankItem.findById(req.params.id).select("+fileData");
    if (!sourceExam) {
      return res.status(404).json({ message: "Examen introuvable" });
    }

    const enseignant = await Enseignant.findById(req.user.id).select(
      "Prenom Nom Email",
    );
    if (!enseignant)
      return res.status(404).json({ message: "Enseignant introuvable" });

    const copiedExam = await ExamBankItem.create({
      title: sourceExam.title,
      filiere: sourceExam.filiere,
      matiere: sourceExam.matiere,
      niveau: sourceExam.niveau,
      type: sourceExam.type,
      duree: sourceExam.duree,
      noteTotale: sourceExam.noteTotale,
      questionsCount: sourceExam.questionsCount,
      status: sourceExam.status,
      anneeUniversitaire: sourceExam.anneeUniversitaire,
      createdBy: req.user.id,
      createdByName:
        `${enseignant.Prenom || ""} ${enseignant.Nom || ""}`.trim(),
      createdByEmail: enseignant.Email || req.user.email || "",
      fileName: sourceExam.fileName,
      fileMimeType: sourceExam.fileMimeType,
      fileData: sourceExam.fileData,
    });

    return res.status(201).json({
      message: "Examen copié avec succès",
      exam: {
        id: copiedExam._id.toString(),
        title: copiedExam.title || copiedExam.fileName || "Examen sans titre",
        filiere: copiedExam.filiere,
        matiere: copiedExam.matiere,
        niveau: copiedExam.niveau,
        type: copiedExam.type,
        duree: copiedExam.duree,
        noteTotale: copiedExam.noteTotale,
        questionsCount: copiedExam.questionsCount,
        status: copiedExam.status,
        createdBy: copiedExam.createdBy.toString(),
        createdByName: copiedExam.createdByName,
        createdByEmail: copiedExam.createdByEmail,
        createdAt: copiedExam.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addExamToBank,
  getExamBank,
  getFilteredExams,
  downloadExamBankFile,
  deleteExamBankItem,
  copyExamBankItem,
};
