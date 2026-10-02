const { Panier, LignePanier } = require('../models');
const catalogueClient = require('./catalogueClient');

/**
 * Récupère le panier actif d'un client, ou en crée un nouveau.
 */
async function getOuCreerPanierActif(clientId) {
  let panier = await Panier.findOne({ where: { client_id: clientId, statut: 'ACTIF' } });
  if (!panier) {
    panier = await Panier.create({ client_id: clientId });
  }
  return panier;
}

/**
 * Ajoute un produit au panier (ou augmente la quantité si déjà présent).
 * Ne décrémente PAS le stock : le stock n'est vérifié/décrémenté qu'à la
 * validation de la commande (cf. docs/analyse-conception.md).
 */
async function ajouterProduit(clientId, produitId, quantite) {
  if (quantite < 1) {
    const err = new Error('La quantité doit être supérieure à 0');
    err.status = 400;
    throw err;
  }

  const panier = await getOuCreerPanierActif(clientId);

  const ligneExistante = await LignePanier.findOne({
    where: { panier_id: panier.id, produit_id: produitId },
  });

  if (ligneExistante) {
    ligneExistante.quantite += quantite;
    await ligneExistante.save();
    return ligneExistante;
  }

  return LignePanier.create({
    panier_id: panier.id,
    produit_id: produitId,
    quantite,
  });
}

/**
 * Modifie la quantité d'une ligne du panier.
 */
async function modifierQuantite(clientId, ligneId, quantite) {
  if (quantite < 1) {
    const err = new Error('La quantité doit être supérieure à 0');
    err.status = 400;
    throw err;
  }

  const ligne = await LignePanier.findByPk(ligneId);
  if (!ligne) {
    const err = new Error('Ligne de panier introuvable');
    err.status = 404;
    throw err;
  }

  await verifierProprietaire(clientId, ligne.panier_id);

  ligne.quantite = quantite;
  await ligne.save();
  return ligne;
}

/**
 * Retire une ligne du panier.
 */
async function retirerProduit(clientId, ligneId) {
  const ligne = await LignePanier.findByPk(ligneId);
  if (!ligne) {
    const err = new Error('Ligne de panier introuvable');
    err.status = 404;
    throw err;
  }

  await verifierProprietaire(clientId, ligne.panier_id);

  await ligne.destroy();
  return { supprime: true };
}

/**
 * Calcule le contenu détaillé et le total du panier actif d'un client.
 * Interroge le module Catalogue (Groupe 2) pour le prix courant de chaque
 * produit (le prix n'est figé qu'au moment de la commande, cf. LigneCommande).
 */
async function calculerPanier(clientId) {
  const panier = await getOuCreerPanierActif(clientId);
  const lignes = await LignePanier.findAll({ where: { panier_id: panier.id } });

  const details = await Promise.all(
    lignes.map(async (ligne) => {
      const { prix } = await catalogueClient.getInfoProduit(ligne.produit_id);
      return {
        ligneId: ligne.id,
        produitId: ligne.produit_id,
        quantite: ligne.quantite,
        prixUnitaire: prix,
        sousTotal: prix * ligne.quantite,
      };
    })
  );

  const total = details.reduce((somme, l) => somme + l.sousTotal, 0);

  return { panierId: panier.id, lignes: details, total };
}

/**
 * Vérifie qu'une ligne de panier appartient bien au panier actif du client.
 */
async function verifierProprietaire(clientId, panierId) {
  const panier = await Panier.findByPk(panierId);
  if (!panier || panier.client_id !== clientId) {
    const err = new Error("Accès refusé : ce panier n'appartient pas à ce client");
    err.status = 403;
    throw err;
  }
}

module.exports = {
  getOuCreerPanierActif,
  ajouterProduit,
  modifierQuantite,
  retirerProduit,
  calculerPanier,
};
