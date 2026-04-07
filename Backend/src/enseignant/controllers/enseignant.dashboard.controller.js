const Enseignant = require("../models/Enseignant");
const ExamBankItem = require("../models/ExamBankItem");
const QuestionBankItem = require("../models/QuestionBankItem");

const getDashboard = async (req, res) => {
  try {
    const enseignant = await Enseignant.findById(req.user.id).select(
      "-Password",
    );
    if (!enseignant)
      return res.status(404).json({ message: "Enseignant introuvable" });

    // Compter les examens créés par cet enseignant
    const examsCount = await ExamBankItem.countDocuments({
      createdBy: req.user.id,
    });

    // Compter les questions créées par cet enseignant
    const questionsCount = await QuestionBankItem.countDocuments({
      createdBy: req.user.id,
    });

    // Compter les examens avec le statut "Exporte"
    const exportsCount = await ExamBankItem.countDocuments({
      createdBy: req.user.id,
      status: 'Exporte',
    });

    // Récupérer les 5 derniers examens créés
    const recentExams = await ExamBankItem.find({
      createdBy: req.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title fileName');

    return res.status(200).json({
      profile: {
        prenom: enseignant.Prenom,
        nom: enseignant.Nom,
        nomComplet: `${enseignant.Prenom} ${enseignant.Nom}`.trim(),
        email: enseignant.Email,
        grade: enseignant.Grade,
      },
      stats: {
        examens: examsCount,
        questions: questionsCount,
        exports: exportsCount,
      },
      recentExams: recentExams.map((exam) => exam.title || exam.fileName || 'Examen sans titre'),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboard,
};
