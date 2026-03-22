const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Enseignant = require('../models/Enseignant');

/**
 * POST /api/enseignant/auth/login
 * Connexion enseignant — compte créé au préalable par l'admin
 */
const loginEnseignant = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const enseignant = await Enseignant.findOne({ Email: email.toLowerCase() });
    if (!enseignant) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    if (!enseignant.Active) {
      return res.status(403).json({ message: "Compte désactivé. Contactez l'administrateur." });
    }

    // Comparaison du mot de passe avec le hash stocké en DB
    const passwordValide = await bcrypt.compare(password, enseignant.Password);
    if (!passwordValide) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: enseignant._id, role: 'enseignant', email: enseignant.Email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: {
        id: enseignant._id,
        Prenom: enseignant.Prenom,
        Nom: enseignant.Nom,
        Email: enseignant.Email,
        Grade: enseignant.Grade,
        Departement: enseignant.Departement,
        Specialite: enseignant.Specialite,
        role: 'enseignant',
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { loginEnseignant };