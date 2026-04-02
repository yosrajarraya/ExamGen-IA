const { verifyToken } = require('../../middleware/auth.middleware');

/**
 * Vérifie que le token est valide ET que le rôle est enseignant
 */
const requireEnseignant = [
  verifyToken,
  (req, res, next) => {
    if (req.user?.role !== 'enseignant') {
      return res.status(403).json({ message: 'Accès réservé à l’enseignant' });
    }
    next();
  },
];

module.exports = requireEnseignant;
