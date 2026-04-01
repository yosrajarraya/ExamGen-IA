const Enseignant = require("../models/Enseignant");

const getDashboard = async (req, res) => {
  try {
    const enseignant = await Enseignant.findById(req.user.id).select(
      "-Password",
    );
    if (!enseignant)
      return res.status(404).json({ message: "Enseignant introuvable" });
    return res.status(200).json({
      profile: {
        prenom: enseignant.Prenom,
        nom: enseignant.Nom,
        nomComplet: `${enseignant.Prenom} ${enseignant.Nom}`.trim(),
        email: enseignant.Email,
        grade: enseignant.Grade,
      },
      stats: { examens: 0, questions: 0, exports: 0, requetesIA: 0 },
      recentExams: [],
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboard,
};
