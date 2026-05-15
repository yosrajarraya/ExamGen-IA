const Enseignant = require('../models/Enseignant');
const ExerciseBankItem = require('../models/ExerciseBankItem');

/* ─────────────────────────────────────────
   Constantes
───────────────────────────────────────── */
const VALID_TYPES = new Set([
  'ouverte',
  'qcm',
  'qcm_unique',
  'qcm_multiple',
  'vrai_faux',
  'pratique',
  'enonce',
]);

/* ─────────────────────────────────────────
   Fonctions utilitaires de normalisation
───────────────────────────────────────── */

/**
 * Normalise le type d'une question.
 * Si le type reçu n'est pas dans l'enum, retourne 'ouverte'.
 */
const normalizeQuestionType = (type) => {
  const clean = String(type == null ? '' : type).trim();
  return VALID_TYPES.has(clean) ? clean : 'ouverte';
};

/**
 * Normalise un tableau d'options QCM.
 * Chaque option résultante a : id (String), text (String), correct (Boolean).
 */
const normalizeOptions = (options) => {
  if (!Array.isArray(options)) return [];
  return options.map((o, i) => ({
    id:      String(o != null && o.id != null ? o.id : `opt_${i}`),
    text:    String(o != null && o.text != null ? o.text : '').trim(),
    correct: !!(o != null && o.correct),
  }));
};

/**
 * Normalise un document ExerciseBankItem pour la réponse API.
 * Ajoute questionsCount calculé dynamiquement.
 */
const normalizeExerciseItem = (item) => ({
  id:                 item._id.toString(),
  title:              item.title,
  matiere:            item.matiere || '',
  niveau:             item.niveau || '',
  anneeUniversitaire: item.anneeUniversitaire || '',
  questionsCount:     Array.isArray(item.questions) ? item.questions.length : 0,
  questions:          Array.isArray(item.questions)
    ? item.questions.map((q) => ({
        id:          q._id ? q._id.toString() : '',
        text:        q.text,
        type:        normalizeQuestionType(q.type),
        answerLines: typeof q.answerLines === 'number' ? q.answerLines : null,
        options:     normalizeOptions(q.options),
        imageUrl:    q.imageUrl || '',
      }))
    : [],
  createdBy:      item.createdBy.toString(),
  createdByName:  item.createdByName || '',
  createdByEmail: item.createdByEmail || '',
  createdAt:      item.createdAt,
});

/* ─────────────────────────────────────────
   createExercise — POST /enseignant/exercises/bank
───────────────────────────────────────── */
const createExercise = async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    if (!title) {
      return res.status(400).json({ message: "Le titre de l'exercice est requis" });
    }

    const questions = req.body?.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Un exercice doit contenir au moins une question' });
    }

    const enseignant = await Enseignant.findById(req.user.id).select('Prenom Nom Email');
    if (!enseignant) {
      return res.status(404).json({ message: 'Enseignant introuvable' });
    }

    const { matiere, niveau, anneeUniversitaire } = req.body || {};

    const normalizedQuestions = questions.map((q) => ({
      text:        String(q.text || '').trim(),
      type:        normalizeQuestionType(q.type),
      answerLines: typeof q.answerLines === 'number' ? q.answerLines : undefined,
      options:     normalizeOptions(q.options),
      imageUrl:    typeof q.imageUrl === 'string' ? q.imageUrl : '',
    }));

    const created = await ExerciseBankItem.create({
      title,
      matiere:            String(matiere || '').trim(),
      niveau:             String(niveau || '').trim(),
      anneeUniversitaire: String(anneeUniversitaire || '').trim(),
      questions:          normalizedQuestions,
      createdBy:          req.user.id,
      createdByName:      `${enseignant.Prenom || ''} ${enseignant.Nom || ''}`.trim(),
      createdByEmail:     enseignant.Email || req.user.email || '',
    });

    return res.status(201).json({
      message: 'Exercice ajouté à la banque avec succès',
      exercise: normalizeExerciseItem(created),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────
   getExerciseBank — GET /enseignant/exercises/bank
───────────────────────────────────────── */
const getExerciseBank = async (req, res) => {
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

    const items = await ExerciseBankItem.find(query).sort({ createdAt: -1 });

    const mesExercices    = [];
    const autresExercices = [];

    items.forEach((item) => {
      const normalized = normalizeExerciseItem(item);
      if (String(item.createdBy) === String(req.user.id)) {
        mesExercices.push(normalized);
      } else {
        autresExercices.push(normalized);
      }
    });

    return res.status(200).json({ mesExercices, autresExercices });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────
   updateExercise — PUT /enseignant/exercises/bank/:id
───────────────────────────────────────── */
const updateExercise = async (req, res) => {
  try {
    const item = await ExerciseBankItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Exercice introuvable' });
    }
    if (String(item.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Vous ne pouvez modifier que vos propres exercices' });
    }

    const questions = req.body?.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Un exercice doit contenir au moins une question' });
    }

    if (req.body.title !== undefined) {
      const title = String(req.body.title || '').trim();
      if (!title) {
        return res.status(400).json({ message: "Le titre de l'exercice est requis" });
      }
      item.title = title;
    }
    if (req.body.matiere !== undefined)            item.matiere            = String(req.body.matiere || '').trim();
    if (req.body.niveau !== undefined)             item.niveau             = String(req.body.niveau || '').trim();
    if (req.body.anneeUniversitaire !== undefined) item.anneeUniversitaire = String(req.body.anneeUniversitaire || '').trim();

    item.questions = questions.map((q) => ({
      text:        String(q.text || '').trim(),
      type:        normalizeQuestionType(q.type),
      answerLines: typeof q.answerLines === 'number' ? q.answerLines : undefined,
      options:     normalizeOptions(q.options),
      imageUrl:    typeof q.imageUrl === 'string' ? q.imageUrl : '',
    }));

    await item.save();

    return res.status(200).json({
      message: 'Exercice modifié avec succès',
      exercise: normalizeExerciseItem(item),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────
   deleteExercise — DELETE /enseignant/exercises/bank/:id
───────────────────────────────────────── */
const deleteExercise = async (req, res) => {
  try {
    const item = await ExerciseBankItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Exercice introuvable' });
    }
    if (String(item.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Vous ne pouvez supprimer que vos propres exercices' });
    }

    await ExerciseBankItem.deleteOne({ _id: item._id });

    return res.status(200).json({ message: 'Exercice supprimé avec succès' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────
   copyExercise — POST /enseignant/exercises/bank/:id/copy
───────────────────────────────────────── */
const copyExercise = async (req, res) => {
  try {
    const sourceItem = await ExerciseBankItem.findById(req.params.id);
    if (!sourceItem) {
      return res.status(404).json({ message: 'Exercice introuvable' });
    }

    const enseignant = await Enseignant.findById(req.user.id).select('Prenom Nom Email');
    if (!enseignant) {
      return res.status(404).json({ message: 'Enseignant introuvable' });
    }

    const copiedQuestions = sourceItem.questions.map((q) => ({
      text:        q.text,
      type:        normalizeQuestionType(q.type),
      answerLines: q.answerLines,
      options:     normalizeOptions(q.options),
      imageUrl:    q.imageUrl || '',
    }));

    const copied = await ExerciseBankItem.create({
      title:              sourceItem.title,
      matiere:            sourceItem.matiere,
      niveau:             sourceItem.niveau,
      anneeUniversitaire: sourceItem.anneeUniversitaire,
      questions:          copiedQuestions,
      createdBy:          req.user.id,
      createdByName:      `${enseignant.Prenom || ''} ${enseignant.Nom || ''}`.trim(),
      createdByEmail:     enseignant.Email || req.user.email || '',
    });

    return res.status(201).json({
      message: 'Exercice copié avec succès',
      exercise: normalizeExerciseItem(copied),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────
   Exports
───────────────────────────────────────── */
module.exports = {
  normalizeQuestionType,
  normalizeOptions,
  normalizeExerciseItem,
  createExercise,
  getExerciseBank,
  updateExercise,
  deleteExercise,
  copyExercise,
};
