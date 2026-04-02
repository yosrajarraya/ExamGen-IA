const WordTemplate = require('../models/WordTemplate');

const validateMarges = (margeH, margeV) => {
  if (margeH !== undefined && (margeH < 1 || margeH > 5)) {
    return 'Marge H doit être entre 1 et 5 cm';
  }
  if (margeV !== undefined && (margeV < 1 || margeV > 5)) {
    return 'Marge V doit être entre 1 et 5 cm';
  }
  return null;
};

const getTemplates = async (req, res) => {
  try {
    const templates = await WordTemplate.find().sort({ createdAt: 1 });

    if (templates.length === 0) {
      const def = await WordTemplate.create({
        nom: 'Examen Final',
        type: 'final',
      });
      return res.status(200).json([def]);
    }

    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTemplateById = async (req, res) => {
  try {
    const template = await WordTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Modèle introuvable' });
    }
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTemplate = async (req, res) => {
  try {
    const err = validateMarges(req.body.margeH, req.body.margeV);
    if (err) {
      return res.status(400).json({ message: err });
    }

    const template = await WordTemplate.create({
      ...req.body,
      updatedBy: req.user?.email || 'admin',
    });

    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const err = validateMarges(req.body.margeH, req.body.margeV);
    if (err) {
      return res.status(400).json({ message: err });
    }

    const template = await WordTemplate.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...req.body,
          updatedBy: req.user?.email || 'admin',
        },
      },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ message: 'Modèle introuvable' });
    }

    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const count = await WordTemplate.countDocuments();

    if (count <= 1) {
      return res.status(400).json({
        message: 'Impossible de supprimer le dernier modèle.',
      });
    }

    const template = await WordTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Modèle introuvable' });
    }

    res.status(200).json({ message: 'Modèle supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const duplicateTemplate = async (req, res) => {
  try {
    const source = await WordTemplate.findById(req.params.id);

    if (!source) {
      return res.status(404).json({ message: 'Modèle introuvable' });
    }

    const copy = source.toObject();
    delete copy._id;
    delete copy.createdAt;
    delete copy.updatedAt;

    copy.nom = `${source.nom} (copie)`;
    copy.examCount = 0;
    copy.updatedBy = req.user?.email || 'admin';

    const newTemplate = await WordTemplate.create(copy);
    res.status(201).json(newTemplate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
};