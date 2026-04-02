const WordTemplate = require("../../admin/models/WordTemplate");

const getWordTemplates = async (req, res) => {
  try {
    console.log('[TEMPLATES] Fetching all templates...');
    
    // First try with actif filter
    const templates = await WordTemplate.find().lean();
    console.log('[TEMPLATES] Total templates found:', templates.length);
    
    if (templates && templates.length > 0) {
      console.log('[TEMPLATES] First template:', JSON.stringify(templates[0], null, 2));
    }
    
    // Filter for active templates
    const activeTemplates = templates.filter(t => t.actif === true || t.actif === 'true');
    console.log('[TEMPLATES] Active templates:', activeTemplates.length);
    
    return res.status(200).json(activeTemplates);
  } catch (error) {
    console.error('[TEMPLATES] Error:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getWordTemplates,
};
