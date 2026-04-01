const WordTemplate = require("../../admin/models/WordTemplate");

const getWordTemplates = async (req, res) => {
  try {
    const templates = await WordTemplate.find().sort({ createdAt: 1 });
    return res.status(200).json(templates);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getWordTemplates,
};
