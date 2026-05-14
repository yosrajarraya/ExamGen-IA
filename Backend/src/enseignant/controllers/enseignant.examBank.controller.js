const mongoose = require('mongoose');
const Enseignant = require('../models/Enseignant');
const ExamBankItem = require('../models/ExamBankItem');
const { parseDocxBuffer } = require('../../utils/docxParser.utils');

const FIXED_EXAM_TOTAL = 20;

/* ── Récupère département + filière du profil enseignant ── */
const getTeacherInfo = async (teacherId) => {
  const teacher = await Enseignant.findById(teacherId).select('Departement Filiere Specialite');
  return {
    departement: String(teacher?.Departement || '').trim(),
    filiere: String(teacher?.Filiere || teacher?.Specialite || '').trim(),
  };
};

/* ── Sérialise un ExamBankItem pour le frontend ── */
const normalizeExam = (item) => ({
  id: item._id.toString(),
  title: item.title || item.fileName || 'Examen sans titre',
  Departement: item.Departement || '',
  filiere: item.filiere || item.Filiere || '',
  matiere: item.matiere,
  niveau: item.niveau,
  anneeUniversitaire: item.anneeUniversitaire,
  semestre: item.semestre || '',
  type: item.type,
  duree: item.duree,
  status: item.status || 'Exporte',
  visibility: item.visibility || 'public',
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

/* ══════════════════════════════════════════════════════════════════
   AJOUTER UN EXAMEN À LA BANQUE
══════════════════════════════════════════════════════════════════ */
const addExamToBank = async (req, res) => {
  try {
    const {
      title, matiere, niveau, type, duree,
      questionsCount, status, visibility,
      fileName, fileMimeType, fileContentBase64,
      anneeUniversitaire, semestre,
      departement, filiere,
    } = req.body || {};

    const cleanBase64 = String(fileContentBase64 || '').trim();
    const cleanFileName = String(fileName || '').trim();
    if (!cleanBase64 || !cleanFileName) {
      return res.status(400).json({ message: "Le fichier .docx est requis pour enregistrer l'examen" });
    }

    const enseignant = await Enseignant.findById(req.user.id).select('Prenom Nom Email');
    if (!enseignant) return res.status(404).json({ message: 'Enseignant introuvable' });

    const fileData = Buffer.from(cleanBase64, 'base64');
    if (!fileData || !fileData.length) {
      return res.status(400).json({ message: 'Contenu du fichier invalide' });
    }

    let htmlContent = '';
    try {
      const { rawHtml } = await parseDocxBuffer(fileData);
      htmlContent = rawHtml || '';
    } catch {
      htmlContent = '';
    }

    // Utiliser département et filière du formulaire, puis fallback au profil enseignant
    const teacherInfo = await getTeacherInfo(req.user.id);
    const finalDepartement = String(departement || teacherInfo.departement || '').trim();
    const finalFiliere = String(filiere || teacherInfo.filiere || '').trim();

    const cleanVisibility = ['public', 'private'].includes(
      String(visibility || '').trim().toLowerCase()
    ) ? String(visibility).trim().toLowerCase() : 'public';

    const created = await ExamBankItem.create({
      title: String(title || '').trim(),
      Departement: finalDepartement,
      filiere: finalFiliere,
      matiere: String(matiere || '').trim(),
      niveau: String(niveau || '').trim(),
      type: String(type || '').trim(),
      duree: String(duree || '').trim(),
      noteTotale: FIXED_EXAM_TOTAL,
      questionsCount: Number(questionsCount) || 0,
      status: String(status || 'Exporte').trim() || 'Exporte',
      visibility: cleanVisibility,
      anneeUniversitaire: String(anneeUniversitaire || '').trim(),
      semestre: String(semestre || '').trim(),
      createdBy: req.user.id,
      createdByName: `${enseignant.Prenom || ''} ${enseignant.Nom || ''}`.trim(),
      createdByEmail: enseignant.Email || req.user.email || '',
      fileName: cleanFileName,
      fileMimeType: String(fileMimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').trim(),
      fileData,
      htmlContent,
    });

    return res.status(201).json({
      message: 'Examen sauvegardé dans la banque avec succès',
      exam: normalizeExam(created),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ══════════════════════════════════════════════════════════════════
   RÉCUPÉRER LA BANQUE D'EXAMENS
   - mesExamens   : tous les examens créés par l'enseignant connecté
   - autresExamens: tous les examens PUBLIC des autres enseignants
══════════════════════════════════════════════════════════════════ */
const getExamBank = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const [mesItems, autresItems] = await Promise.all([
      ExamBankItem.find({ createdBy: teacherId }).sort({ createdAt: -1 }),
      ExamBankItem.find({
        createdBy: { $ne: teacherId },
        $or: [
          { visibility: 'public' },
          { visibility: { $exists: false } },
          { visibility: null },
        ],
      }).sort({ createdAt: -1 }),
    ]);

    return res.status(200).json({
      mesExamens: mesItems.map(normalizeExam),
      autresExamens: autresItems.map(normalizeExam),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ══════════════════════════════════════════════════════════════════
   RÉCUPÉRER LES EXAMENS FILTRÉS
══════════════════════════════════════════════════════════════════ */
const getFilteredExams = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { matiere, niveau, annee } = req.query;

    const addOptionalFilters = (base) => {
      const f = { ...base };
      if (matiere) f.matiere = matiere;
      if (niveau)  f.niveau  = niveau;
      if (annee)   f.anneeUniversitaire = annee;
      return f;
    };

    const [mesItems, autresItems] = await Promise.all([
      ExamBankItem.find(addOptionalFilters({ createdBy: teacherId })).sort({ createdAt: -1 }),
      ExamBankItem.find(addOptionalFilters({
        createdBy: { $ne: teacherId },
        $or: [{ visibility: 'public' }, { visibility: { $exists: false } }, { visibility: null }],
      })).sort({ createdAt: -1 }),
    ]);

    return res.status(200).json({
      mesExamens: mesItems.map(normalizeExam),
      autresExamens: autresItems.map(normalizeExam),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ══════════════════════════════════════════════════════════════════
   TÉLÉCHARGER UN FICHIER EXAMEN
══════════════════════════════════════════════════════════════════ */
const downloadExamBankFile = async (req, res) => {
  try {
    const exam = await ExamBankItem.findById(req.params.id).select('+fileData');
    if (!exam) return res.status(404).json({ message: 'Examen introuvable' });

    const isOwner  = String(exam.createdBy) === String(req.user.id);
    const isPublic = (exam.visibility || 'public') === 'public';
    if (!isOwner && !isPublic) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cet examen" });
    }

    res.setHeader('Content-Type', exam.fileMimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.fileName || 'examen.docx'}"`);
    return res.status(200).send(exam.fileData);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ══════════════════════════════════════════════════════════════════
   SUPPRIMER UN EXAMEN
══════════════════════════════════════════════════════════════════ */
const deleteExamBankItem = async (req, res) => {
  try {
    const examId = String(req.params.id || '').trim();
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ message: "Format d'ID invalide" });
    }

    const exam = await ExamBankItem.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Examen introuvable' });

    if (exam.createdBy.toString() !== String(req.user.id)) {
      return res.status(403).json({ message: 'Vous ne pouvez supprimer que vos propres examens' });
    }

    await ExamBankItem.deleteOne({ _id: exam._id });
    return res.status(200).json({ message: 'Examen supprimé avec succès' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ══════════════════════════════════════════════════════════════════
   COPIER UN EXAMEN (accessible si public ou propriétaire)
══════════════════════════════════════════════════════════════════ */
const copyExamBankItem = async (req, res) => {
  try {
    const sourceExam = await ExamBankItem.findById(req.params.id).select('+fileData');
    if (!sourceExam) return res.status(404).json({ message: 'Examen introuvable' });

    const isOwner  = String(sourceExam.createdBy) === String(req.user.id);
    const isPublic = (sourceExam.visibility || 'public') === 'public';
    if (!isOwner && !isPublic) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cet examen" });
    }

    const enseignant = await Enseignant.findById(req.user.id).select('Prenom Nom Email');
    if (!enseignant) return res.status(404).json({ message: 'Enseignant introuvable' });

    const teacherInfo = await getTeacherInfo(req.user.id);

    const copiedExam = await ExamBankItem.create({
      title: sourceExam.title,
      Departement: teacherInfo.departement,
      filiere: teacherInfo.filiere || sourceExam.filiere || sourceExam.Filiere || '',
      matiere: sourceExam.matiere,
      niveau: sourceExam.niveau,
      type: sourceExam.type,
      duree: sourceExam.duree,
      noteTotale: FIXED_EXAM_TOTAL,
      questionsCount: sourceExam.questionsCount,
      status: sourceExam.status,
      visibility: 'private', // copie privée par défaut
      anneeUniversitaire: sourceExam.anneeUniversitaire,
      semestre: sourceExam.semestre || '',
      createdBy: req.user.id,
      createdByName: `${enseignant.Prenom || ''} ${enseignant.Nom || ''}`.trim(),
      createdByEmail: enseignant.Email || req.user.email || '',
      fileName: sourceExam.fileName,
      fileMimeType: sourceExam.fileMimeType,
      fileData: sourceExam.fileData,
    });

    return res.status(201).json({
      message: 'Examen copié avec succès',
      exam: normalizeExam(copiedExam),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ══════════════════════════════════════════════════════════════════
   RÉCUPÉRER UN EXAMEN PAR ID
══════════════════════════════════════════════════════════════════ */
const getExamBankItemById = async (req, res) => {
  try {
    const exam = await ExamBankItem.findById(req.params.id).populate('questions');
    if (!exam) return res.status(404).json({ message: 'Examen introuvable' });

    const isOwner  = String(exam.createdBy) === String(req.user.id);
    const isPublic = (exam.visibility || 'public') === 'public';
    if (!isOwner && !isPublic) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cet examen" });
    }

    return res.status(200).json({ message: 'Examen récupéré avec succès', exam: normalizeExam(exam) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ══════════════════════════════════════════════════════════════════
   CONTENU HTML D'UN EXAMEN
══════════════════════════════════════════════════════════════════ */
const getExamContent = async (req, res) => {
  try {
    const exam = await ExamBankItem.findById(req.params.id).select('+fileData +htmlContent');
    if (!exam) return res.status(404).json({ message: 'Examen introuvable' });

    const isOwner  = String(exam.createdBy) === String(req.user.id);
    const isPublic = (exam.visibility || 'public') === 'public';
    if (!isOwner && !isPublic) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cet examen" });
    }

    if (!exam.fileData || !exam.fileData.length) {
      return res.status(200).json({ sections: [], rawText: '', rawHtml: exam.htmlContent || '' });
    }
    if (exam.htmlContent && exam.htmlContent.length > 0) {
      return res.status(200).json({ sections: [], rawText: '', rawHtml: exam.htmlContent });
    }
    const { sections, rawText, rawHtml } = await parseDocxBuffer(exam.fileData);
    ExamBankItem.findByIdAndUpdate(exam._id, { htmlContent: rawHtml || '' }).catch(() => {});
    return res.status(200).json({ sections, rawText, rawHtml: rawHtml || '' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ══════════════════════════════════════════════════════════════════
   QUESTIONS D'UN EXAMEN
══════════════════════════════════════════════════════════════════ */
const getExamQuestions = async (req, res) => {
  try {
    const exam = await ExamBankItem.findById(req.params.id).populate('questions');
    if (!exam) return res.status(404).json({ message: 'Examen introuvable' });

    const isOwner  = String(exam.createdBy) === String(req.user.id);
    const isPublic = (exam.visibility || 'public') === 'public';
    if (!isOwner && !isPublic) {
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

/* ══════════════════════════════════════════════════════════════════
   AJOUTER / RETIRER UNE QUESTION D'UN EXAMEN (propriétaire seulement)
══════════════════════════════════════════════════════════════════ */
const addQuestionToExam = async (req, res) => {
  try {
    const exam = await ExamBankItem.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Examen introuvable' });
    if (String(exam.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Vous ne pouvez modifier que vos propres examens' });
    }
    const { questionId } = req.body || {};
    if (!questionId) return res.status(400).json({ message: 'questionId requis' });
    if (!exam.questions.map(String).includes(String(questionId))) {
      exam.questions.push(questionId);
      exam.questionsCount = exam.questions.length;
      await exam.save();
    }
    return res.status(200).json({ message: "Question ajoutée à l'examen", questionsCount: exam.questionsCount });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const removeQuestionFromExam = async (req, res) => {
  try {
    const exam = await ExamBankItem.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Examen introuvable' });
    if (String(exam.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Vous ne pouvez modifier que vos propres examens' });
    }
    const { questionId } = req.params;
    exam.questions = exam.questions.filter((q) => String(q) !== String(questionId));
    exam.questionsCount = exam.questions.length;
    await exam.save();
    return res.status(200).json({ message: "Question retirée de l'examen", questionsCount: exam.questionsCount });
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
