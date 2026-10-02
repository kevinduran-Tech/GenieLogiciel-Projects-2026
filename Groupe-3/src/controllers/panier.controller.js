const panierService = require('../services/panier.service');

async function ajouter(req, res, next) {
  try {
    const { produitId, quantite } = req.body;
    const ligne = await panierService.ajouterProduit(req.clientId, produitId, quantite);
    res.status(201).json(ligne);
  } catch (err) {
    next(err);
  }
}

async function modifier(req, res, next) {
  try {
    const { quantite } = req.body;
    const ligne = await panierService.modifierQuantite(req.clientId, req.params.ligneId, quantite);
    res.json(ligne);
  } catch (err) {
    next(err);
  }
}

async function retirer(req, res, next) {
  try {
    const resultat = await panierService.retirerProduit(req.clientId, req.params.ligneId);
    res.json(resultat);
  } catch (err) {
    next(err);
  }
}

async function consulter(req, res, next) {
  try {
    const panier = await panierService.calculerPanier(req.clientId);
    res.json(panier);
  } catch (err) {
    next(err);
  }
}

module.exports = { ajouter, modifier, retirer, consulter };
