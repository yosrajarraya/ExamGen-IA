const jwt = require('jsonwebtoken');
const Admin = require('../../admin/models/Admin');

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Chercher l'admin en base
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // 2. Vérifier le mot de passe avec bcrypt
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // 3. Générer le token JWT
    const token = jwt.sign(
      { id: admin._id, role: admin.role, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      message: 'Connexion admin réussie',
      token,
      user: { email: admin.email, role: admin.role },
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { loginAdmin };