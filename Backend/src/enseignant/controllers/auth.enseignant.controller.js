const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Enseignant = require('../models/Enseignant');
const { sendPasswordResetCodeEmail } = require('../../utils/email.utils');

const loginEnseignant = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const enseignant = await Enseignant.findOne({ Email: email.toLowerCase().trim() });

    if (!enseignant) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    if (!enseignant.Active) {
      return res.status(403).json({
        message: "Compte désactivé. Contactez l'administrateur.",
      });
    }

    const passwordValide = await bcrypt.compare(password, enseignant.Password);

    if (!passwordValide) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    const token = jwt.sign(
      {
        id: enseignant._id,
        role: 'enseignant',
        email: enseignant.Email,
      },
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
    console.error('Erreur loginEnseignant:', error);
    return res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email requis' });
    }

    const enseignant = await Enseignant.findOne({ Email: email.toLowerCase().trim() });

    if (!enseignant) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    if (!enseignant.Active) {
      return res.status(403).json({
        message: "Compte désactivé. Contactez l'administrateur.",
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    enseignant.resetCode = code;
    enseignant.resetCodeExpire = new Date(Date.now() + 10 * 60 * 1000);
    await enseignant.save();

    const emailResult = await sendPasswordResetCodeEmail({
      to: enseignant.Email,
      nomComplet: `${enseignant.Prenom} ${enseignant.Nom}`,
      code,
      profileLabel: 'Enseignant',
    });

    if (emailResult.status !== 'sent') {
      return res.status(500).json({
        message: `Impossible d'envoyer l'email: ${emailResult.reason || 'Erreur email'}`,
      });
    }

    return res.status(200).json({
      message: 'Code de réinitialisation envoyé à votre email.',
    });
  } catch (error) {
    console.error('Erreur forgotPassword:', error);
    return res.status(500).json({ message: error.message });
  }
};

const verifyResetCode = async (req, res) => {
  try {
    console.log('verifyResetCode body =', req.body);

    const { email, code } = req.body;

    if (!email || !code) {
      console.log('email ou code manquant');
      return res.status(400).json({
        message: 'Email et code requis',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    const enseignant = await Enseignant.findOne({ Email: normalizedEmail });

    console.log('email recherché =', normalizedEmail);
    console.log('code reçu =', normalizedCode);
    console.log('enseignant trouvé =', enseignant ? enseignant.Email : null);

    if (!enseignant) {
      console.log('aucun enseignant trouvé');
      return res.status(400).json({ message: 'Email introuvable' });
    }

    console.log('resetCode en base =', enseignant.resetCode);
    console.log('resetCodeExpire en base =', enseignant.resetCodeExpire);

    if (!enseignant.resetCode || !enseignant.resetCodeExpire) {
      console.log('pas de resetCode ou resetCodeExpire');
      return res.status(400).json({
        message: 'Aucune demande de réinitialisation trouvée',
      });
    }

    if (enseignant.resetCode !== normalizedCode) {
      console.log('code invalide');
      return res.status(400).json({ message: 'Code invalide' });
    }

    if (enseignant.resetCodeExpire.getTime() < Date.now()) {
      console.log('code expiré');
      return res.status(400).json({ message: 'Code expiré' });
    }

    console.log('code valide');
    return res.status(200).json({
      message: 'Code valide.',
    });
  } catch (error) {
    console.error('Erreur verifyResetCode:', error);
    return res.status(500).json({ message: error.message });
  }
};

const resetPasswordWithCode = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        message: 'Email, code et nouveau mot de passe sont requis',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Le mot de passe doit contenir au moins 6 caractères',
      });
    }

    const enseignant = await Enseignant.findOne({ Email: email.toLowerCase().trim() });

    if (!enseignant) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    if (!enseignant.resetCode || !enseignant.resetCodeExpire) {
      return res.status(400).json({
        message: 'Aucune demande de réinitialisation trouvée',
      });
    }

    if (enseignant.resetCode !== code.trim()) {
      return res.status(400).json({ message: 'Code invalide' });
    }

    if (enseignant.resetCodeExpire.getTime() < Date.now()) {
      return res.status(400).json({ message: 'Code expiré' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    enseignant.Password = hashedPassword;
    enseignant.resetCode = null;
    enseignant.resetCodeExpire = null;

    await enseignant.save();

    return res.status(200).json({
      message: 'Mot de passe réinitialisé avec succès',
    });
  } catch (error) {
    console.error('Erreur resetPasswordWithCode:', error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  loginEnseignant,
  forgotPassword,
  verifyResetCode,
  resetPasswordWithCode,
};