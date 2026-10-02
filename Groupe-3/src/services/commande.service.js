const {
  sequelize,
  Panier,
  LignePanier,
  Commande,
  LigneCommande,
  Facture,
  Livraison,
} = require('../models');
const catalogueClient = require('./catalogueClient');
const factureService = require('./facture.service');

/**
 * Valide la commande à partir du panier actif d'un client.
 *
 * Étapes (voir docs/analyse-conception.md — "Difficultés et solutions") :
 * 1. Vérifier le stock ET figer le prix de chaque ligne au moment T
 * 2. Créer la commande + ses lignes dans une transaction atomique
 *    (évite la survente en cas de forte affluence)
 * 3. Générer la facture associée
 * 4. Créer l'entrée de suivi de livraison
 * 5. Marquer le panier comme VALIDE
 */
async function validerCommande(clientId, adresse) {
  if (!adresse) {
    const err = new Error('Une adresse de livraison est requise');
    err.status = 400;
    throw err;
  }

  const panier = await Panier.findOne({ where: { client_id: clientId, statut: 'ACTIF' } });
  if (!panier) {
    const err = new Error('Aucun panier actif pour ce client');
    err.status = 404;
    throw err;
  }

  const lignesPanier = await LignePanier.findAll({ where: { panier_id: panier.id } });
  if (lignesPanier.length === 0) {
    const err = new Error('Le panier est vide');
    err.status = 400;
    throw err;
  }

  // Vérification de disponibilité + récupération du prix figé pour chaque ligne
  const lignesValidees = await Promise.all(
    lignesPanier.map(async (ligne) => {
      await catalogueClient.verifierDisponibilite(ligne.produit_id, ligne.quantite);
      const { prix } = await catalogueClient.getInfoProduit(ligne.produit_id);
      return {
        produit_id: ligne.produit_id,
        quantite: ligne.quantite,
        prix_unitaire: prix,
      };
    })
  );

  const montantTotal = lignesValidees.reduce(
    (somme, l) => somme + l.prix_unitaire * l.quantite,
    0
  );

  const resultat = await sequelize.transaction(async (t) => {
    const commande = await Commande.create(
      {
        client_id: clientId,
        statut: 'EN_ATTENTE',
        montant_total: montantTotal,
        adresse,
      },
      { transaction: t }
    );

    await LigneCommande.bulkCreate(
      lignesValidees.map((l) => ({ ...l, commande_id: commande.id })),
      { transaction: t }
    );

    const facture = await Facture.create(
      {
        commande_id: commande.id,
        numero: factureService.genererNumeroFacture(),
        montant: montantTotal,
      },
      { transaction: t }
    );

    const livraison = await Livraison.create(
      { commande_id: commande.id, statut: 'EN_ATTENTE' },
      { transaction: t }
    );

    panier.statut = 'VALIDE';
    await panier.save({ transaction: t });

    return { commande, facture, livraison };
  });

  // La commande est déjà créée et garantie cohérente (transaction ci-dessus).
  // On répercute maintenant la vente sur le stock du Groupe 2. Si cet appel
  // échoue (Groupe 2 indisponible), la commande reste valide côté Groupe 3 :
  // c'est une limite connue en l'absence de transaction distribuée entre les
  // deux modules — à surveiller via les logs [STOCK] en attendant une file
  // d'attente ou une compensation automatique.
  for (const ligne of lignesValidees) {
    try {
      await catalogueClient.decrementerStock(ligne.produit_id, ligne.quantite);
    } catch (err) {
      console.error(
        `[STOCK] Échec de la décrémentation pour le produit ${ligne.produit_id} (commande ${resultat.commande.id}) : ${err.message}`
      );
    }
  }

  return {
    ...resultat,
    lignes: lignesValidees,
  };
}

/**
 * Récupère une commande avec ses lignes, sa facture et sa livraison,
 * en vérifiant qu'elle appartient bien au client demandeur.
 */
async function obtenirCommande(clientId, commandeId) {
  const commande = await Commande.findByPk(commandeId, {
    include: [
      { model: LigneCommande, as: 'lignes' },
      { model: Facture, as: 'facture' },
      { model: Livraison, as: 'livraison' },
    ],
  });

  if (!commande || commande.client_id !== clientId) {
    const err = new Error('Commande introuvable');
    err.status = 404;
    throw err;
  }

  return commande;
}

/**
 * Historique des commandes d'un client, du plus récent au plus ancien.
 */
async function listerHistorique(clientId) {
  return Commande.findAll({
    where: { client_id: clientId },
    order: [['date', 'DESC']],
    include: [{ model: Livraison, as: 'livraison' }],
  });
}

module.exports = { validerCommande, obtenirCommande, listerHistorique };
