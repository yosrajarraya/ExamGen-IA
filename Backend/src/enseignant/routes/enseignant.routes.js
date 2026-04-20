const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../middleware/auth.middleware");
const { getDepartements } = require("../../admin/controllers/departement.controller");
const {
  getProfil,
  updateProfil,
  changePassword,
} = require("../controllers/enseignant.profile.controller");
const {
  getDashboard,
} = require("../controllers/enseignant.dashboard.controller");
const {
  getWordTemplates,
} = require("../controllers/enseignant.templates.controller");
const {
  addQuestionToBank,
  getQuestionBank,
  getFilteredQuestions,
  updateQuestionBankItem,
  deleteQuestionBankItem,
  copyQuestionBankItem,
} = require("../controllers/enseignant.questionBank.controller");
const {
  addExamToBank,
  getExamBank,
  getExamBankItemById,
  getFilteredExams,
  downloadExamBankFile,
  deleteExamBankItem,
  copyExamBankItem,
} = require("../controllers/enseignant.examBank.controller");

// Toutes ces routes nécessitent d'être connecté en tant qu'enseignant
router.use(verifyToken);

router.get('/departements', getDepartements); // Lister les départements définis en base

router.get("/dashboard", getDashboard); // Tableau de bord enseignant
router.get("/word-template", getWordTemplates); // Lister les modèles Word admin
router.get("/profil", getProfil); // Consulter son profil
router.put("/profil", updateProfil); // Modifier ses informations
router.put("/change-password", changePassword); // Changer son mot de passe
router.post("/questions/bank", addQuestionToBank); // Ajouter question à la banque
router.get("/questions/bank", getQuestionBank); // Récupérer banque de questions
router.get("/questions/filtered", getFilteredQuestions); // Récupérer questions filtrées
router.put("/questions/bank/:id", updateQuestionBankItem); // Modifier ma question
router.delete("/questions/bank/:id", deleteQuestionBankItem); // Supprimer ma question
router.post("/questions/bank/:id/copy", copyQuestionBankItem); // Copier une question
router.post("/exams/bank", addExamToBank); // Ajouter examen exporté à la banque
router.get("/exams/bank", getExamBank); // Récupérer banque d'examens
router.get("/exams/bank/:id/download", downloadExamBankFile); // Télécharger un .docx
router.get("/exams/bank/:id", getExamBankItemById); // Récupérer un examen spécifique
router.get("/exams/filtered", getFilteredExams); // Récupérer examens filtrés
router.delete("/exams/bank/:id", deleteExamBankItem); // Supprimer mon examen
router.post("/exams/bank/:id/copy", copyExamBankItem); // Copier un examen

module.exports = router;
