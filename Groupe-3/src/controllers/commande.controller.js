const commandeService = require('../services/commande.service');
const livraisonService = require('../services/livraison.service');
const factureService = require('../services/facture.service');

async function valider(req, res, next) {
  try {
    const { adresse } = req.body;
    const resultat = await commandeService.validerCommande(req.clientId, adresse);
    res.status(201).json(resultat);
  } catch (err) {
    next(err);
  }
}

async function obtenir(req, res, next) {
  try {
    const commande = await commandeService.obtenirCommande(req.clientId, req.params.commandeId);
    res.json(commande);
  } catch (err) {
    next(err);
  }
}

async function historique(req, res, next) {
  try {
    const commandes = await commandeService.listerHistorique(req.clientId);
    res.json(commandes);
  } catch (err) {
    next(err);
  }
}

async function annuler(req, res, next) {
  try {
    // Vérifie que la commande appartient bien au client avant d'annuler
    await commandeService.obtenirCommande(req.clientId, req.params.commandeId);
    const commande = await livraisonService.annulerCommande(req.params.commandeId);
    res.json(commande);
  } catch (err) {
    next(err);
  }
}

// Réservé aux administrateurs/gestionnaires (à protéger par un contrôle de
// rôle une fois le module Sécurité du Groupe 1 disponible)
async function mettreAJourStatut(req, res, next) {
  try {
    const { statut } = req.body;
    const commande = await livraisonService.mettreAJourStatutCommande(req.params.commandeId, statut);
    res.json(commande);
  } catch (err) {
    next(err);
  }
}

// Réservé aux administrateurs/gestionnaires
async function rembourser(req, res, next) {
  try {
    // Vérifie que la commande appartient bien au client avant de rembourser
    await commandeService.obtenirCommande(req.clientId, req.params.commandeId);
    const facture = await factureService.rembourser(req.params.commandeId);
    res.json(facture);
  } catch (err) {
    next(err);
  }
}

module.exports = { valider, obtenir, historique, annuler, mettreAJourStatut, rembourser };
