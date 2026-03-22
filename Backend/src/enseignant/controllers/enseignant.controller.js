const bcrypt = require('bcryptjs');
const Enseignant = require('../models/Enseignant');

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

module.exports = { getProfil, updateProfil, changePassword };