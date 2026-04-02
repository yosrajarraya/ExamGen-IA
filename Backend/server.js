const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const connectDB = require('./src/config/db');
const wordTemplateRoutes = require('./src/admin/routes/wordTemplate.admin.routes');

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// ── Route test ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'ExamGen-IA API ✓' });
});

// ── Routes Admin ──────────────────────────────────────────────────────────────
app.use('/api/admin/auth',        require('./src/admin/routes/auth.admin.routes'));
app.use('/api/admin/enseignants', require('./src/admin/routes/enseignant.admin.routes'));

// Route pour télécharger le template Excel
app.get('/api/admin/templates/enseignants-template', (req, res) => {
  const filePath = './templates/enseignants-template.xlsx';
  res.download(filePath, 'template-enseignants.xlsx', (err) => {
    if (err) {
      console.error('Erreur lors du téléchargement du template:', err);
      res.status(500).json({ message: 'Erreur lors du téléchargement du template' });
    }
  });
});

// ── Routes Enseignant ─────────────────────────────────────────────────────────
app.use('/api/enseignant/auth',   require('./src/enseignant/routes/auth.enseignant.routes'));
app.use('/api/enseignant',        require('./src/enseignant/routes/enseignant.routes'));

// ── Routes word-template ─────────────────────────────────────────────────────────
app.use('/api/admin/word-template', wordTemplateRoutes);

// ── Démarrage ─────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await connectDB();
    app.listen(process.env.PORT || 5000, () => {
      console.log(`✓ Serveur démarré sur le port ${process.env.PORT || 5000}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

start();