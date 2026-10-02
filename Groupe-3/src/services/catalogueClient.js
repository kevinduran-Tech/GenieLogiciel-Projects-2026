const axios = require('axios');

const CATALOG_BASE_URL = process.env.CATALOG_SERVICE_URL || '';
const CATALOG_ADMIN_KEY = process.env.CATALOG_ADMIN_KEY || '';
const MOCK_MODE = process.env.CATALOG_SERVICE_MOCK === 'true' || !CATALOG_BASE_URL;

// Petit catalogue simulé, utilisé tant que CATALOG_SERVICE_MOCK=true ou que
// CATALOG_SERVICE_URL n'est pas renseignée. Reflète le contrat réel exposé
// par le Groupe 2 (voir groupe-2-catalogue-stocks/docs/integration-api.md) :
// GET /api/produits/:id -> { prix, stock } et
// POST /api/stock/:id/mouvement { variation } -> { quantite, alerte }.
const CATALOGUE_SIMULE = {
  'produit-demo-1': { prix: 1500, stock: 25, nom: 'Riz 5kg' },
  'produit-demo-2': { prix: 750, stock: 3, nom: 'Huile 1L' },
};

/**
 * Récupère le prix et le stock disponible d'un produit.
 * @param {string} produitId
 * @returns {Promise<{prix: number, stockDisponible: number}>}
 */
async function getInfoProduit(produitId) {
  if (MOCK_MODE) {
    const produit = CATALOGUE_SIMULE[produitId];
    if (!produit) {
      const err = new Error(`Produit ${produitId} introuvable (mode simulation)`);
      err.status = 404;
      throw err;
    }
    return { prix: produit.prix, stockDisponible: produit.stock };
  }

  const { data } = await axios.get(`${CATALOG_BASE_URL}/produits/${produitId}`);
  return { prix: data.prix, stockDisponible: data.stock };
}

/**
 * Vérifie que la quantité demandée est disponible en stock.
 * Lève une erreur (status 409) si le stock est insuffisant.
 */
async function verifierDisponibilite(produitId, quantite) {
  const { stockDisponible } = await getInfoProduit(produitId);
  if (quantite > stockDisponible) {
    const err = new Error(
      `Stock insuffisant pour le produit ${produitId} (demandé: ${quantite}, disponible: ${stockDisponible})`
    );
    err.status = 409;
    throw err;
  }
  return true;
}

/**
 * Décrémente le stock d'un produit suite à une commande validée.
 * Appelé APRÈS la création réussie de la commande (voir commande.service.js) :
 * la vérification de disponibilité a déjà eu lieu, ceci n'est donc pas un
 * deuxième contrôle mais l'écriture réelle du mouvement de stock côté
 * Groupe 2. `POST /api/stock/:id/mouvement` exige l'en-tête x-admin-key
 * (mécanisme provisoire du Groupe 2, en attendant le Groupe 1).
 */
async function decrementerStock(produitId, quantite) {
  if (MOCK_MODE) {
    const produit = CATALOGUE_SIMULE[produitId];
    if (!produit || produit.stock < quantite) {
      const err = new Error(`Stock insuffisant pour le produit ${produitId} (mode simulation)`);
      err.status = 409;
      throw err;
    }
    produit.stock -= quantite;
    return { produit_id: produitId, quantite: produit.stock };
  }

  const { data } = await axios.post(
    `${CATALOG_BASE_URL}/stock/${produitId}/mouvement`,
    { variation: -quantite },
    { headers: { 'x-admin-key': CATALOG_ADMIN_KEY } }
  );
  return data;
}

module.exports = { getInfoProduit, verifierDisponibilite, decrementerStock };
