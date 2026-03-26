const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth.middleware');
const {
	getProfil,
	updateProfil,
	changePassword,
	getDashboard,
	getWordTemplates,
	addQuestionToBank,
	getQuestionBank,
	updateQuestionBankItem,
	deleteQuestionBankItem,
	addExamToBank,
	getExamBank,
	downloadExamBankFile,
	deleteExamBankItem,
} = require('../controllers/enseignant.controller');

// Toutes ces routes nécessitent d'être connecté en tant qu'enseignant
router.use(verifyToken);

router.get('/dashboard', getDashboard);              // Tableau de bord enseignant
router.get('/word-template', getWordTemplates);      // Lister les modèles Word admin
router.get('/profil', getProfil);                    // Consulter son profil
router.put('/profil', updateProfil);                 // Modifier ses informations
router.put('/change-password', changePassword);      // Changer son mot de passe
router.post('/questions/bank', addQuestionToBank);   // Ajouter question à la banque
router.get('/questions/bank', getQuestionBank);      // Récupérer banque de questions
router.put('/questions/bank/:id', updateQuestionBankItem);    // Modifier ma question
router.delete('/questions/bank/:id', deleteQuestionBankItem); // Supprimer ma question
router.post('/exams/bank', addExamToBank);           // Ajouter examen exporté à la banque
router.get('/exams/bank', getExamBank);              // Récupérer banque d'examens
router.get('/exams/bank/:id/download', downloadExamBankFile); // Télécharger un .docx
router.delete('/exams/bank/:id', deleteExamBankItem); // Supprimer mon examen

module.exports = router;