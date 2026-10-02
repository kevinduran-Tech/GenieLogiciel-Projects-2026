/**
 * Stub d'authentification.
 *
 * En attendant l'intégration avec le module Sécurité du Groupe 1 (JWT ou
 * session), ce middleware lit l'identifiant du client depuis l'en-tête
 * `x-client-id`. A remplacer par la vérification réelle du token une fois
 * l'API du Groupe 1 disponible : req.clientId = tokenDecode(req).sub;
 */
function authentifier(req, res, next) {
  const clientId = req.header('x-client-id');
  if (!clientId) {
    return res.status(401).json({ erreur: "Authentification requise (en-tête 'x-client-id' manquant)" });
  }
  req.clientId = clientId;
  next();
}

module.exports = authentifier;
