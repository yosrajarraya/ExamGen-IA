const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const Enseignant = require('../../enseignant/models/Enseignant');

// ✅ generatePassword était manquant dans l'import — c'était la cause du bug
const { sendTeacherCredentials, generatePassword, generateSimplePassword } = require('../../utils/email.utils');

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

    // Validation du format email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(Email)) {
      return res.status(400).json({ message: 'Veuillez entrer une adresse email valide' });
    }

    const existingEnseignant = await Enseignant.findOne({ Email: Email.toLowerCase() });
    if (existingEnseignant) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Générer le mot de passe en clair AVANT le hash (version simple et lisible)
    const generatedPassword = generateSimplePassword(12);
    console.log('✓ Mot de passe généré (simple):', generatedPassword);

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

const updateEnseignant = async (req, res) => {
  try {
    const { Prenom, Nom, Email, Telephone, Grade, Departement, Specialite, Active } = req.body;

    if (!Prenom || !Nom || !Email) {
      return res.status(400).json({ message: 'Prenom, Nom et Email sont obligatoires' });
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(Email)) {
      return res.status(400).json({ message: 'Veuillez entrer une adresse email valide' });
    }

    const enseignant = await Enseignant.findById(req.params.id);
    if (!enseignant) {
      return res.status(404).json({ message: 'Enseignant introuvable' });
    }

    const normalizedEmail = String(Email).toLowerCase();
    const existing = await Enseignant.findOne({ Email: normalizedEmail, _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    enseignant.Prenom = Prenom;
    enseignant.Nom = Nom;
    enseignant.Email = normalizedEmail;
    enseignant.Telephone = Telephone;
    enseignant.Grade = Grade;
    enseignant.Departement = Departement;
    enseignant.Specialite = Specialite;
    if (typeof Active === 'boolean') {
      enseignant.Active = Active;
    }

    const saved = await enseignant.save();
    const { Password: _, ...data } = saved.toObject();

    return res.status(200).json({
      message: 'Enseignant modifié avec succès',
      enseignant: data,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/admin/enseignants/import-excel
 */
const importEnseignantsExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    // Lire le fichier Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'Le fichier Excel est vide ou invalide' });
    }

    let imported = 0;
    let errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 car Excel commence à 1 et il y a l'en-tête

      try {
        // Validation des champs obligatoires
        const prenom = row['Prénom'] || row.Prenom;
        const nom = row['Nom'] || row.Nom;
        const email = row['Email'] || row.Email;

        if (!prenom || !nom || !email) {
          errors.push(`Ligne ${rowNumber}: Prénom, Nom et Email sont obligatoires`);
          continue;
        }

        // Validation du format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push(`Ligne ${rowNumber}: L'email "${email}" n'est pas au bon format`);
          continue;
        }

        // Vérifier si l'enseignant existe déjà
        const existingEnseignant = await Enseignant.findOne({ Email: email.toLowerCase() });
        if (existingEnseignant) {
          errors.push(`Ligne ${rowNumber}: L'email ${email} est déjà utilisé`);
          continue;
        }

        // Générer le mot de passe
        const generatedPassword = generatePassword(12);
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        // Créer l'enseignant
        const newEnseignant = new Enseignant({
          Prenom: prenom,
          Nom: nom,
          Email: email.toLowerCase(),
          Password: hashedPassword,
          Telephone: row['Téléphone'] || row.Telephone || '',
          Grade: row['Grade'] || row.Grade || '',
          Departement: row['Département'] || row.Departement || '',
          Specialite: row['Spécialité'] || row.Specialite || '',
          Active: true,
        });

        await newEnseignant.save();

        // Envoyer l'email avec les identifiants
        try {
          await sendTeacherCredentials({
            to: email,
            nomComplet: `${prenom} ${nom}`,
            email: email,
            motDePasse: generatedPassword,
          });
        } catch (emailError) {
          console.error(`Erreur envoi email pour ${email}:`, emailError);
          // Ne pas échouer l'importation pour autant
        }

        imported++;
      } catch (error) {
        errors.push(`Ligne ${rowNumber}: ${error.message}`);
      }
    }

    return res.status(200).json({
      message: `Importation terminée: ${imported} enseignants importés`,
      imported,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Erreur lors de l\'importation Excel:', error);
    return res.status(500).json({ message: 'Erreur lors de l\'importation: ' + error.message });
  }
};

module.exports = { createEnseignant, getEnseignants, toggleActive, resetPassword, deleteEnseignant, updateEnseignant, importEnseignantsExcel };