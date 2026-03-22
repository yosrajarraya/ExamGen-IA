require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL
}));
app.use(express.json());

// Route test
app.get('/', (req, res) => {
  res.json({ message: 'ExamGen-IA API ✓' });
});

// TODO Sprint 1 : ajouter les vraies routes ici
// app.use('/api/auth', require('./src/routes/auth.routes'));
// app.use('/api/examens', require('./src/routes/examen.routes'));

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