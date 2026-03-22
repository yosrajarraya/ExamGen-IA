const bcrypt = require('bcryptjs');
const Enseignant = require('../models/enseignant');

/**
 * POST /api/enseignants/create  (admin seulement)
 * L'admin crée un compte enseignant → le password est hashé avant d'être stocké
 */
const createEnseignant = async (req, res) => {
  try {
    const { Prenom, Nom, Email, Password, Telephone, Grade, Departement, Specialite, Active } = req.body;

    if (!Prenom || !Nom || !Email || !Password) {
      return res.status(400).json({ message: 'Prenom, Nom, Email et Password sont obligatoires' });
    }

    const existingEnseignant = await Enseignant.findOne({ Email: Email.toLowerCase() });
    if (existingEnseignant) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Hash du mot de passe avant stockage
    const hashedPassword = await bcrypt.hash(Password, 10);

    const newEnseignant = new Enseignant({
      Prenom,
      Nom,
      Email,
      Password: hashedPassword,
      Telephone,
      Grade,
      Departement,
      Specialite,
      Active: Active !== undefined ? Active : true,
    });

    const savedEnseignant = await newEnseignant.save();

    // Ne jamais renvoyer le password dans la réponse
    const { Password: _, ...enseignantSansPassword } = savedEnseignant.toObject();

    res.status(201).json({
      message: 'Enseignant créé avec succès',
      enseignant: enseignantSansPassword,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/enseignants  (admin seulement)
 * Liste tous les enseignants
 */
const getEnseignants = async (req, res) => {
  try {
    const enseignants = await Enseignant.find().select('-Password').sort({ createdAt: -1 });
    res.status(200).json(enseignants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/enseignants/:id/toggle-active  (admin seulement)
 * Activer / désactiver un compte enseignant
 */
const toggleActive = async (req, res) => {
  try {
    const enseignant = await Enseignant.findById(req.params.id);
    if (!enseignant) {
      return res.status(404).json({ message: 'Enseignant introuvable' });
    }

    enseignant.Active = !enseignant.Active;
    await enseignant.save();

    res.status(200).json({
      message: `Compte ${enseignant.Active ? 'activé' : 'désactivé'} avec succès`,
      Active: enseignant.Active,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/enseignants/:id/reset-password  (admin seulement)
 * Réinitialiser le mot de passe d'un enseignant
 */
const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: 'Nouveau mot de passe requis' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Enseignant.findByIdAndUpdate(req.params.id, { Password: hashedPassword });

    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /api/enseignants/:id  (admin seulement)
 */
const deleteEnseignant = async (req, res) => {
  try {
    const deleted = await Enseignant.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Enseignant introuvable' });
    }
    res.status(200).json({ message: 'Enseignant supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createEnseignant,
  getEnseignants,
  toggleActive,
  resetPassword,
  deleteEnseignant,
};