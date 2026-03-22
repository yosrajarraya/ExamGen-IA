const jwt = require('jsonwebtoken');
const adminCredentials = require('../../config/admin');

/**
 * POST /api/admin/auth/login
 * Connexion admin avec credentials statiques
 */
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    if (email !== adminCredentials.email) {
      return res.status(404).json({ message: 'Administrateur introuvable' });
    }

    if (password !== adminCredentials.password) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    const token = jwt.sign(
      { role: 'admin', email: adminCredentials.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      message: 'Connexion admin réussie',
      token,
      user: {
        role: 'admin',
        email: adminCredentials.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { loginAdmin };