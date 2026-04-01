const mongoose = require('mongoose');
const Admin = require('./src/admin/models/Admin');
require('dotenv').config();

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ MongoDB connecté');

  const existing = await Admin.findOne({ email: 'admin@iit.tn' });
  if (existing) {
    console.log('⚠️  Admin existe déjà !');
    process.exit();
  }

await Admin.create({
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD, // sera hashé par bcrypt automatiquement
  role: 'admin',
});

  console.log('✅ Admin créé avec succès !');
  process.exit();
}

createAdmin().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});