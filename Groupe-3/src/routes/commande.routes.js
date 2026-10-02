const express = require('express');
const authentifier = require('../middlewares/auth.middleware');
const commandeController = require('../controllers/commande.controller');

const router = express.Router();

router.use(authentifier);

router.post('/', commandeController.valider);
router.get('/historique', commandeController.historique);
router.get('/:commandeId', commandeController.obtenir);
router.post('/:commandeId/annuler', commandeController.annuler);
router.post('/:commandeId/rembourser', commandeController.rembourser);
// Route de gestion (statut mis à jour par un administrateur ou le module Livraison)
router.patch('/:commandeId/statut', commandeController.mettreAJourStatut);

module.exports = router;
