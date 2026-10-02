const { v4: uuidv4 } = require('uuid');
const { Commande, Facture } = require('../models');

/**
 * Génère un numéro de facture lisible et unique.
 * Format : FACT-<année>-<8 caractères>
 */
function genererNumeroFacture() {
  const annee = new Date().getFullYear();
  const suffixe = uuidv4().split('-')[0].toUpperCase();
  return `FACT-${annee}-${suffixe}`;
}

/**
 * Rembourse la facture d'une commande annulée.
 *
 * Règle métier (voir docs/analyse-conception.md — feature "Remboursement") :
 * un remboursement n'est déclenché qu'après une annulation (ou, à terme, un
 * retour produit validé — cf. Perspectives). Une facture ne peut être
 * remboursée qu'une seule fois.
 */
async function rembourser(commandeId) {
  const commande = await Commande.findByPk(commandeId);
  if (!commande) {
    const err = new Error('Commande introuvable');
    err.status = 404;
    throw err;
  }

  if (commande.statut !== 'ANNULEE') {
    const err = new Error(
      "Seule une commande annulée peut être remboursée pour l'instant"
    );
    err.status = 409;
    throw err;
  }

  const facture = await Facture.findOne({ where: { commande_id: commandeId } });
  if (!facture) {
    const err = new Error('Facture introuvable pour cette commande');
    err.status = 404;
    throw err;
  }

  if (facture.statut === 'REMBOURSEE') {
    const err = new Error('Cette facture a déjà été remboursée');
    err.status = 409;
    throw err;
  }

  facture.statut = 'REMBOURSEE';
  facture.date_remboursement = new Date();
  await facture.save();

  console.log(
    `[TRACABILITE] Facture ${facture.numero} (commande ${commandeId}) remboursée le ${facture.date_remboursement.toISOString()}`
  );

  return facture;
}

module.exports = { genererNumeroFacture, rembourser };
