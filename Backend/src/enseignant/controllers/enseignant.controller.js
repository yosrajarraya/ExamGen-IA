const bcrypt = require('bcryptjs');
const Enseignant = require('../models/Enseignant');
const WordTemplate = require('../../admin/models/WordTemplate');
const QuestionBankItem = require('../models/QuestionBankItem');
const ExamBankItem = require('../models/ExamBankItem');

/**
 * GET /api/enseignant/profil
 * L'enseignant consulte son propre profil
 */
const getProfil = async (req, res) => {
  try {
    const enseignant = await Enseignant.findById(req.user.id).select('-Password');
    if (!enseignant) {
      return res.status(404).json({ message: 'Enseignant introuvable' });
    }
    res.status(200).json(enseignant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/enseignant/profil
 * L'enseignant met à jour ses informations (sauf Email et Password)
 */
const updateProfil = async (req, res) => {
  try {
    const { Telephone, Grade, Departement, Specialite } = req.body;

    const updated = await Enseignant.findByIdAndUpdate(
      req.user.id,
      { Telephone, Grade, Departement, Specialite },
      { new: true }
    ).select('-Password');

    res.status(200).json({
      message: 'Profil mis à jour avec succès',
      enseignant: updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/enseignant/word-templates
 * L'enseignant consulte les modèles word créés par l'admin
 */
const getWordTemplates = async (req, res) => {
  try {
    // Retourne tous les modèles, même inactifs pour information.
    const templates = await WordTemplate.find().sort({ createdAt: 1 });
    return res.status(200).json(templates);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/enseignant/dashboard
 * Tableau de bord enseignant (profil + stats de base)
 */
const getDashboard = async (req, res) => {
  try {
    const enseignant = await Enseignant.findById(req.user.id).select('-Password');

    if (!enseignant) {
      return res.status(404).json({ message: 'Enseignant introuvable' });
    }

    return res.status(200).json({
      profile: {
        prenom: enseignant.Prenom,
        nom: enseignant.Nom,
        nomComplet: `${enseignant.Prenom} ${enseignant.Nom}`.trim(),
        email: enseignant.Email,
        grade: enseignant.Grade,
      },
      stats: {
        examens: 0,
        questions: 0,
        exports: 0,
        requetesIA: 0,
      },
      recentExams: [],
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/enseignant/questions/bank
 * Ajouter une question dans la banque
 */
const addQuestionToBank = async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();

    if (!text) {
      return res.status(400).json({ message: 'Le texte de la question est requis' });
    }

    const enseignant = await Enseignant.findById(req.user.id).select('Prenom Nom Email');
    if (!enseignant) {
      return res.status(404).json({ message: 'Enseignant introuvable' });
    }

    const created = await QuestionBankItem.create({
      text,
      createdBy: req.user.id,
      createdByName: `${enseignant.Prenom || ''} ${enseignant.Nom || ''}`.trim(),
      createdByEmail: enseignant.Email || req.user.email || '',
    });

    return res.status(201).json({
      message: 'Question ajoutée à la banque avec succès',
      question: created,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/enseignant/questions/bank
 * Récupérer mes questions + questions des autres profs
 */
const getQuestionBank = async (req, res) => {
  try {
    const items = await QuestionBankItem.find().sort({ createdAt: -1 });

    const mesQuestions = [];
    const autresQuestions = [];

    items.forEach((item) => {
      const normalized = {
        id: item._id,
        text: item.text,
        createdBy: item.createdBy,
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

    return res.status(200).json({
      mesQuestions,
      autresQuestions,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/enseignant/questions/bank/:id
 * Modifier une question de ma banque
 */
const updateQuestionBankItem = async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      return res.status(400).json({ message: 'Le texte de la question est requis' });
    }

    const item = await QuestionBankItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Question introuvable' });
    }

    if (String(item.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Vous ne pouvez modifier que vos propres questions' });
    }

    item.text = text;
    await item.save();

    return res.status(200).json({
      message: 'Question modifiée avec succès',
      question: {
        id: item._id,
        text: item.text,
        createdBy: item.createdBy,
        createdByName: item.createdByName,
        createdByEmail: item.createdByEmail,
        createdAt: item.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /api/enseignant/questions/bank/:id
 * Supprimer une question de ma banque
 */
const deleteQuestionBankItem = async (req, res) => {
  try {
    const item = await QuestionBankItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Question introuvable' });
    }

    if (String(item.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Vous ne pouvez supprimer que vos propres questions' });
    }

    await QuestionBankItem.deleteOne({ _id: item._id });

    return res.status(200).json({ message: 'Question supprimée avec succès' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/enseignant/exams/bank
 * Ajouter un fichier d'examen .docx dans la banque
 */
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
    } = req.body || {};

    const cleanBase64 = String(fileContentBase64 || '').trim();
    const cleanFileName = String(fileName || '').trim();

    if (!cleanBase64 || !cleanFileName) {
      return res.status(400).json({ message: 'Le fichier .docx est requis pour enregistrer l\'examen' });
    }

    const enseignant = await Enseignant.findById(req.user.id).select('Prenom Nom Email');
    if (!enseignant) {
      return res.status(404).json({ message: 'Enseignant introuvable' });
    }

    const fileData = Buffer.from(cleanBase64, 'base64');
    if (!fileData || !fileData.length) {
      return res.status(400).json({ message: 'Contenu du fichier invalide' });
    }

    const created = await ExamBankItem.create({
      title: String(title || '').trim(),
      filiere: String(filiere || '').trim(),
      matiere: String(matiere || '').trim(),
      niveau: String(niveau || '').trim(),
      type: String(type || '').trim(),
      duree: String(duree || '').trim(),
      noteTotale: Number(noteTotale) || 0,
      questionsCount: Number(questionsCount) || 0,
      status: String(status || 'Exporte').trim() || 'Exporte',
      createdBy: req.user.id,
      createdByName: `${enseignant.Prenom || ''} ${enseignant.Nom || ''}`.trim(),
      createdByEmail: enseignant.Email || req.user.email || '',
      fileName: cleanFileName,
      fileMimeType: String(fileMimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').trim(),
      fileData,
    });

    return res.status(201).json({
      message: 'Examen sauvegardé dans la banque avec succès',
      exam: {
        id: created._id,
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

/**
 * GET /api/enseignant/exams/bank
 * Récupérer mes examens + anciens examens d'autres profs
 */
const getExamBank = async (req, res) => {
  try {
    const items = await ExamBankItem.find().sort({ createdAt: -1 });

    const mesExamens = [];
    const autresExamens = [];

    items.forEach((item) => {
      const normalized = {
        id: item._id,
        title: item.title || item.fileName || 'Examen sans titre',
        filiere: item.filiere,
        matiere: item.matiere,
        niveau: item.niveau,
        type: item.type,
        duree: item.duree,
        status: item.status || 'Exporte',
        noteTotale: Number(item.noteTotale) || 0,
        questionsCount: Number(item.questionsCount) || 0,
        createdBy: item.createdBy,
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

/**
 * GET /api/enseignant/exams/bank/:id/download
 * Télécharger le fichier .docx d'un examen de la banque
 */
const downloadExamBankFile = async (req, res) => {
  try {
    const exam = await ExamBankItem.findById(req.params.id).select('+fileData');
    if (!exam) {
      return res.status(404).json({ message: 'Examen introuvable' });
    }

    res.setHeader('Content-Type', exam.fileMimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.fileName || 'examen.docx'}"`);
    return res.status(200).send(exam.fileData);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/enseignant/change-password
 * L'enseignant change son propre mot de passe
 */
const changePassword = async (req, res) => {
  try {
    const { ancienPassword, nouveauPassword } = req.body;

    if (!ancienPassword || !nouveauPassword) {
      return res.status(400).json({ message: 'Ancien et nouveau mot de passe requis' });
    }

    const enseignant = await Enseignant.findById(req.user.id);
    if (!enseignant) {
      return res.status(404).json({ message: 'Enseignant introuvable' });
    }

    const valide = await bcrypt.compare(ancienPassword, enseignant.Password);
    if (!valide) {
      return res.status(401).json({ message: 'Ancien mot de passe incorrect' });
    }

    enseignant.Password = await bcrypt.hash(nouveauPassword, 10);
    await enseignant.save();

    res.status(200).json({ message: 'Mot de passe changé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfil,
  updateProfil,
  changePassword,
  getWordTemplates,
  getDashboard,
  addQuestionToBank,
  getQuestionBank,
  updateQuestionBankItem,
  deleteQuestionBankItem,
  addExamToBank,
  getExamBank,
  downloadExamBankFile,
};