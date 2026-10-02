/* eslint-disable no-unused-vars */
function gestionErreurs(err, req, res, next) {
  const status = err.status || 500;
  if (status === 500) {
    console.error(err);
  }
  res.status(status).json({ erreur: err.message || 'Erreur interne du serveur' });
}

module.exports = gestionErreurs;
