const jwt = require('jsonwebtoken');
const { AppError } = require('../errors');

const ROLES = ['CLIENT', 'ADMIN', 'LIVREUR'];

// Vérifie le jeton JWT émis par le module du Groupe 1 (payload attendu : { id, role }).
function authenticate(secret) {
  return (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Jeton d\'authentification manquant'));
    }
    try {
      const payload = jwt.verify(token, secret);
      if (payload.id === undefined || !ROLES.includes(payload.role)) throw new Error('payload');
      req.user = { id: String(payload.id), role: payload.role };
      return next();
    } catch (e) {
      return next(new AppError(401, 'INVALID_TOKEN', 'Jeton invalide ou expiré'));
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : next(new AppError(403, 'FORBIDDEN', 'Action non autorisée pour votre rôle'));
}

module.exports = { authenticate, requireRole, ROLES };
