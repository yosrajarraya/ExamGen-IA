const mongoose = require('mongoose');
const Enseignant = require('../models/Enseignant');
const ExamBankItem = require('../models/ExamBankItem');
const { parseDocxBuffer } = require('../../utils/docxParser.utils');

const normalize = (value) => String(value || '').trim().toLowerCase();
const FIXED_EXAM_TOTAL = 20;

const getTeacherDepartement = async (teacherId) => {
  const teacher = await Enseignant.findById(teacherId).select('Departement');
  return String(teacher?.Departement || '').trim();
};

const getExamDepartement = (exam) => String(exam?.Departement || exam?.filiere || '').trim();

const normalizeExam = (item) => ({
  id: item._id.toString(),
  title: item.title || item.fileName || 'Examen sans titre',
  Departement: item.Departement || item.filiere || '',
  filiere: item.Departement || item.filiere || '',
  matiere: item.matiere,
  niveau: item.niveau,
  anneeUniversitaire: item.anneeUniversitaire,
  type: item.type,
  duree: item.duree,
  status: item.status || 'Exporte',
  noteTotale: FIXED_EXAM_TOTAL,
  questionsCount: Number(item.questionsCount) || 0,
  createdBy: item.createdBy.toString(),
  createdByName: item.createdByName,
  createdByEmail: item.createdByEmail,
  createdAt: item.createdAt,
  questions: (item.questions || []).map((q) =>
    q && typeof q === 'object' && q._id
      ? {
          id: q._id.toString(),
          text: q.text,
          matiere: q.matiere,
          niveau: q.niveau,
          anneeUniversitaire: q.anneeUniversitaire,
          createdByName: q.createdByName,
          createdAt: q.createdAt,
        }
      : q
  ),
});

const buildAccessQuery = (teacherId, teacherDepartement) => {
  if (!teacherDepartement) {
    return { createdBy: teacherId };
  }

  return {
    $or: [
      { createdBy: teacherId },
      { Departement: teacherDepartement },
      { filiere: teacherDepartement },
    ],
  };
};

const buildScopedQuery = async (req, extraFilters = {}) => {
  const teacherDepartement = await getTeacherDepartement(req.user.id);
  const accessQuery = buildAccessQuery(req.user.id, teacherDepartement);
  const filters = Object.entries(extraFilters).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');

  if (filters.length === 0) {
    return { teacherDepartement, query: accessQuery };
  }

  return {
    teacherDepartement,
    query: {
      $and: [
        accessQuery,
        ...filters.map(([field, value]) => ({ [field]: String(value).trim() })),
      ],
    },
  };
};

const canAccessExam = (exam, teacherId, teacherDepartement) => {
  if (!exam) {
    return false;
  }

  if (String(exam.createdBy) === String(teacherId)) {
    return true;
  }

  if (!teacherDepartement) {
    return false;
  }

  return normalize(getExamDepartement(exam)) === normalize(teacherDepartement);
};

const addExamToBank = async (req, res) => {
  try {
    const {
      title,
      Departement,
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

    const teacherDepartement = await getTeacherDepartement(req.user.id);
    const cleanDepartement = String(Departement || filiere || teacherDepartement || '').trim();

    const created = await ExamBankItem.create({
      title: String(title || "").trim(),
      Departement: cleanDepartement,
      filiere: cleanDepartement,
      matiere: String(matiere || "").trim(),
      niveau: String(niveau || "").trim(),
      type: String(type || "").trim(),
      duree: String(duree || "").trim(),
      noteTotale: FIXED_EXAM_TOTAL,
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
      exam: normalizeExam(created),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getExamBank = async (req, res) => {
  try {
    const { query } = await buildScopedQuery(req);
    const items = await ExamBankItem.find(query).sort({ createdAt: -1 });
    const mesExamens = [];
    const autresExamens = [];

    items.forEach((item) => {
      const normalized = normalizeExam(item);

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
    const { query } = await buildScopedQuery(req, {
      matiere,
      niveau,
      anneeUniversitaire: annee,
    });

    const items = await ExamBankItem.find(query).sort({ createdAt: -1 });
    const mesExamens = [];
    const autresExamens = [];

    items.forEach((item) => {
      const normalized = normalizeExam(item);

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
    const teacherDepartement = await getTeacherDepartement(req.user.id);
    const exam = await ExamBankItem.findById(req.params.id).select("+fileData");
    if (!exam) return res.status(404).json({ message: "Examen introuvable" });
    if (!canAccessExam(exam, req.user.id, teacherDepartement)) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cet examen" });
    }
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
    const teacherDepartement = await getTeacherDepartement(req.user.id);
    const sourceExam = await ExamBankItem.findById(req.params.id).select("+fileData");
    if (!sourceExam) {
      return res.status(404).json({ message: "Examen introuvable" });
    }

    if (!canAccessExam(sourceExam, req.user.id, teacherDepartement)) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cet examen" });
    }

    const enseignant = await Enseignant.findById(req.user.id).select(
      "Prenom Nom Email",
    );
    if (!enseignant)
      return res.status(404).json({ message: "Enseignant introuvable" });

    const copiedExam = await ExamBankItem.create({
      title: sourceExam.title,
      Departement: sourceExam.Departement || sourceExam.filiere || teacherDepartement,
      filiere: sourceExam.Departement || sourceExam.filiere || teacherDepartement,
      matiere: sourceExam.matiere,
      niveau: sourceExam.niveau,
      type: sourceExam.type,
      duree: sourceExam.duree,
      noteTotale: FIXED_EXAM_TOTAL,
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
      exam: normalizeExam(copiedExam),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getExamBankItemById = async (req, res) => {
  try {
    const teacherDepartement = await getTeacherDepartement(req.user.id);
    const exam = await ExamBankItem.findById(req.params.id).populate('questions');
    if (!exam) {
      return res.status(404).json({ message: "Examen introuvable" });
    }

    if (!canAccessExam(exam, req.user.id, teacherDepartement)) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cet examen" });
    }

    return res.status(200).json({
      message: "Examen récupéré avec succès",
      exam: normalizeExam(exam),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getExamQuestions = async (req, res) => {
  try {
    const teacherDepartement = await getTeacherDepartement(req.user.id);
    const exam = await ExamBankItem.findById(req.params.id).populate('questions');
    if (!exam) return res.status(404).json({ message: 'Examen introuvable' });
    if (!canAccessExam(exam, req.user.id, teacherDepartement)) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cet examen" });
    }
    const questions = (exam.questions || []).map((q) => ({
      id: q._id.toString(),
      text: q.text,
      matiere: q.matiere,
      niveau: q.niveau,
      anneeUniversitaire: q.anneeUniversitaire,
      createdByName: q.createdByName,
      createdByEmail: q.createdByEmail,
      createdAt: q.createdAt,
    }));
    return res.status(200).json({ questions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const addQuestionToExam = async (req, res) => {
  try {
    const teacherDepartement = await getTeacherDepartement(req.user.id);
    const exam = await ExamBankItem.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Examen introuvable' });
    if (!canAccessExam(exam, req.user.id, teacherDepartement)) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cet examen" });
    }
    const { questionId } = req.body || {};
    if (!questionId) return res.status(400).json({ message: 'questionId requis' });
    const alreadyLinked = exam.questions.map(String).includes(String(questionId));
    if (!alreadyLinked) {
      exam.questions.push(questionId);
      exam.questionsCount = exam.questions.length;
      await exam.save();
    }
    return res.status(200).json({ message: 'Question ajoutée à l\'examen', questionsCount: exam.questionsCount });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const removeQuestionFromExam = async (req, res) => {
  try {
    const teacherDepartement = await getTeacherDepartement(req.user.id);
    const exam = await ExamBankItem.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Examen introuvable' });
    if (!canAccessExam(exam, req.user.id, teacherDepartement)) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cet examen" });
    }
    const { questionId } = req.params;
    exam.questions = exam.questions.filter((q) => String(q) !== String(questionId));
    exam.questionsCount = exam.questions.length;
    await exam.save();
    return res.status(200).json({ message: 'Question retirée de l\'examen', questionsCount: exam.questionsCount });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getExamContent = async (req, res) => {
  try {
    const teacherDepartement = await getTeacherDepartement(req.user.id);
    const exam = await ExamBankItem.findById(req.params.id).select('+fileData');
    if (!exam) return res.status(404).json({ message: 'Examen introuvable' });
    if (!canAccessExam(exam, req.user.id, teacherDepartement)) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cet examen" });
    }
    if (!exam.fileData || !exam.fileData.length) {
      return res.status(200).json({ sections: [], rawText: '' });
    }
    const { sections, rawText } = await parseDocxBuffer(exam.fileData);
    return res.status(200).json({ sections, rawText });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addExamToBank,
  getExamBank,
  getExamBankItemById,
  getExamContent,
  getExamQuestions,
  addQuestionToExam,
  removeQuestionFromExam,
  getFilteredExams,
  downloadExamBankFile,
  deleteExamBankItem,
  copyExamBankItem,
};