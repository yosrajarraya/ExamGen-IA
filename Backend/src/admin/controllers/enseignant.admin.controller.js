const bcrypt = require('bcryptjs');
const Enseignant = require('../../enseignant/models/Enseignant');

// ✅ generatePassword était manquant dans l'import — c'était la cause du bug
const { sendTeacherCredentials, generatePassword } = require('../../utils/email.utils');

/**
 * POST /api/admin/enseignants/create
 */
const createEnseignant = async (req, res) => {
  try {
    console.log('🔵 Création enseignant - body reçu:', req.body);

    const { Prenom, Nom, Email, Telephone, Grade, Departement, Specialite, Active } = req.body;

    if (!Prenom || !Nom || !Email) {
      return res.status(400).json({ message: 'Prenom, Nom et Email sont obligatoires' });
    }

    const existingEnseignant = await Enseignant.findOne({ Email: Email.toLowerCase() });
    if (existingEnseignant) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Générer le mot de passe en clair AVANT le hash
    const generatedPassword = generatePassword(12);
    console.log('✓ Mot de passe généré');

    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const newEnseignant = new Enseignant({
      Prenom,
      Nom,
      Email: Email.toLowerCase(),
      Password: hashedPassword,
      Telephone,
      Grade,
      Departement,
      Specialite,
      Active: Active !== undefined ? Active : true,
    });

    const saved = await newEnseignant.save();
    console.log('✓ Enseignant sauvegardé en DB');

    // Envoi email avec le mot de passe en clair
    try {
      console.log('📧 Envoi email à:', Email);
      const emailResult = await sendTeacherCredentials({
        to: Email,
        nomComplet: `${Prenom} ${Nom}`,
        email: Email,
        motDePasse: generatedPassword,
      });

      if (emailResult?.status === 'sent') {
        console.log('✅ Email envoyé avec succès');
      } else {
        console.warn('⚠️ Envoi email non réussi:', emailResult);
      }
    } catch (emailError) {
      console.error('❌ Erreur envoi email:', emailError.message);
    }

    const { Password: _, ...data } = saved.toObject();

    res.status(201).json({
      message: 'Enseignant créé avec succès.',
      enseignant: data,
      emailStatus: 'envoyé si SMTP configuré; vérifier logs pour les erreurs potentielles',
    });
  } catch (error) {
    console.error('❌ Erreur createEnseignant:', error);
    res.status(500).json({ message: error.message });
  }
};

const getEnseignants = async (req, res) => {
  try {
    const enseignants = await Enseignant.find().select('-Password').sort({ createdAt: -1 });
    res.status(200).json(enseignants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleActive = async (req, res) => {
  try {
    const enseignant = await Enseignant.findById(req.params.id);
    if (!enseignant) return res.status(404).json({ message: 'Enseignant introuvable' });
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

const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: 'Nouveau mot de passe requis' });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Enseignant.findByIdAndUpdate(req.params.id, { Password: hashedPassword });
    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteEnseignant = async (req, res) => {
  try {
    const deleted = await Enseignant.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Enseignant introuvable' });
    res.status(200).json({ message: 'Enseignant supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createEnseignant, getEnseignants, toggleActive, resetPassword, deleteEnseignant };