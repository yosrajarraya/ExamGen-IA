const Departement = require('../models/Departement');

const DEFAULT_DEPARTEMENTS = [
  'Informatique',
  'Développement logiciel',
  'Réseaux et télécommunications',
  'Intelligence artificielle',
  'Data Science',
  'Cybersécurité',
];

const ensureDefaultDepartements = async () => {
  const count = await Departement.countDocuments();

  if (count > 0) {
    return;
  }

  await Departement.insertMany(DEFAULT_DEPARTEMENTS.map((name) => ({ name })));
};

const getDepartements = async (req, res) => {
  try {
    await ensureDefaultDepartements();

    const departements = await Departement.find({ active: true }).sort({ name: 1 });

    return res.status(200).json(
      departements.map((departement) => ({
        id: departement._id.toString(),
        name: departement.name,
        active: departement.active,
      }))
    );
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDepartements,
  ensureDefaultDepartements,
};