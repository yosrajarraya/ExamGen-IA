const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const connectDB = require('./src/config/db');

app.use(cors());
app.use(express.json());

// ── Route test ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'ExamGen-IA API ✓' });
});

// ── Routes Admin ──────────────────────────────────────────────────────────────
app.use('/api/admin/auth',        require('./src/admin/routes/auth.admin.routes'));
app.use('/api/admin/enseignants', require('./src/admin/routes/enseignant.admin.routes'));

// ── Routes Enseignant ─────────────────────────────────────────────────────────
app.use('/api/enseignant/auth',   require('./src/enseignant/routes/auth.enseignant.routes'));
app.use('/api/enseignant',        require('./src/enseignant/routes/enseignant.routes'));

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