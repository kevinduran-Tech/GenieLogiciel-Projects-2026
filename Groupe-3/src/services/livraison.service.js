const { Commande, Livraison } = require('../models');

// Ordre officiel du cycle de vie (voir docs/analyse-conception.md)
const ORDRE_STATUTS = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE'];

/**
 * Vérifie qu'une transition de statut de commande est autorisée.
 * - Progression uniquement vers l'avant dans ORDRE_STATUTS
 * - ANNULEE atteignable depuis n'importe quel statut avant EXPEDIEE
 */
function transitionAutorisee(statutActuel, nouveauStatut) {
  if (nouveauStatut === 'ANNULEE') {
    const indexActuel = ORDRE_STATUTS.indexOf(statutActuel);
    const indexExpediee = ORDRE_STATUTS.indexOf('EXPEDIEE');
    return statutActuel !== 'LIVREE' && statutActuel !== 'ANNULEE' && indexActuel < indexExpediee;
  }

  const indexActuel = ORDRE_STATUTS.indexOf(statutActuel);
  const indexNouveau = ORDRE_STATUTS.indexOf(nouveauStatut);
  if (indexActuel === -1 || indexNouveau === -1) return false;
  return indexNouveau === indexActuel + 1;
}

/**
 * Met à jour le statut d'une commande (et de sa livraison associée si
 * pertinent), en journalisant la transition. Lève une erreur 409 si la
 * transition n'est pas autorisée.
 */
async function mettreAJourStatutCommande(commandeId, nouveauStatut) {
  const commande = await Commande.findByPk(commandeId);
  if (!commande) {
    const err = new Error('Commande introuvable');
    err.status = 404;
    throw err;
  }

  if (!transitionAutorisee(commande.statut, nouveauStatut)) {
    const err = new Error(
      `Transition non autorisée : ${commande.statut} -> ${nouveauStatut}`
    );
    err.status = 409;
    throw err;
  }

  const ancienStatut = commande.statut;
  commande.statut = nouveauStatut;
  await commande.save();

  // Journalisation (traçabilité — besoin non fonctionnel n°4)
  console.log(
    `[TRACABILITE] Commande ${commandeId} : ${ancienStatut} -> ${nouveauStatut} (${new Date().toISOString()})`
  );

  // Synchronisation avec la livraison pour les statuts communs aux deux entités
  if (['EN_PREPARATION', 'EXPEDIEE', 'LIVREE'].includes(nouveauStatut)) {
    const livraison = await Livraison.findOne({ where: { commande_id: commandeId } });
    if (livraison) {
      livraison.statut = nouveauStatut;
      if (nouveauStatut === 'EXPEDIEE') livraison.date_expedition = new Date();
      if (nouveauStatut === 'LIVREE') livraison.date_livraison = new Date();
      await livraison.save();
    }
  }

  return commande;
}

/**
 * Annule une commande si elle n'a pas encore été expédiée.
 */
async function annulerCommande(commandeId) {
  return mettreAJourStatutCommande(commandeId, 'ANNULEE');
}

module.exports = {
  transitionAutorisee,
  mettreAJourStatutCommande,
  annulerCommande,
  ORDRE_STATUTS,
};
