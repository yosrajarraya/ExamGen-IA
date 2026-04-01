const { verifyToken } = require('../../middleware/auth.middleware');

/**
 * Vérifie que le token est valide ET que le rôle est admin
 * À appliquer sur toutes les routes admin protégées
 */
const requireAdmin = [
  verifyToken,
  (req, res, next) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Accès réservé à l'administrateur" });
    }
    next();
  },
];

module.exports = requireAdmin;