const express = require('express');
const authentifier = require('../middlewares/auth.middleware');
const panierController = require('../controllers/panier.controller');

const router = express.Router();

router.use(authentifier);

router.get('/', panierController.consulter);
router.post('/lignes', panierController.ajouter);
router.patch('/lignes/:ligneId', panierController.modifier);
router.delete('/lignes/:ligneId', panierController.retirer);

module.exports = router;
