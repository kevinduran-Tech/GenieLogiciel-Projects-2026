process.env.NODE_ENV = 'test';
process.env.CATALOG_SERVICE_MOCK = 'true';

const { sequelize } = require('../src/models');
const panierService = require('../src/services/panier.service');
const commandeService = require('../src/services/commande.service');
const livraisonService = require('../src/services/livraison.service');
const factureService = require('../src/services/facture.service');

const CLIENT_ID = 'client-test-1';
const PRODUIT_DISPONIBLE = 'produit-demo-1'; // stock: 25
const PRODUIT_STOCK_LIMITE = 'produit-demo-2'; // stock: 3

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Panier', () => {
  test('ajoute un produit au panier', async () => {
    const ligne = await panierService.ajouterProduit(CLIENT_ID, PRODUIT_DISPONIBLE, 2);
    expect(ligne.quantite).toBe(2);
  });

  test('cumule la quantité si le produit est déjà présent', async () => {
    const ligne = await panierService.ajouterProduit(CLIENT_ID, PRODUIT_DISPONIBLE, 3);
    expect(ligne.quantite).toBe(5);
  });

  test('rejette une quantité inférieure à 1', async () => {
    await expect(panierService.ajouterProduit(CLIENT_ID, PRODUIT_DISPONIBLE, 0)).rejects.toThrow();
  });

  test('calcule correctement le total du panier', async () => {
    const panier = await panierService.calculerPanier(CLIENT_ID);
    // 5 x 1500 = 7500
    expect(panier.total).toBe(7500);
  });
});

describe('Validation de commande', () => {
  test('rejette la commande si le stock est insuffisant', async () => {
    const clientId = 'client-test-stock-insuffisant';
    await panierService.ajouterProduit(clientId, PRODUIT_STOCK_LIMITE, 10); // stock dispo: 3
    await expect(
      commandeService.validerCommande(clientId, 'Yaoundé, Cameroun')
    ).rejects.toThrow(/Stock insuffisant/);
  });

  test('valide une commande et génère panier -> commande -> facture -> livraison', async () => {
    const resultat = await commandeService.validerCommande(CLIENT_ID, 'Yaoundé, Cameroun');

    expect(resultat.commande.statut).toBe('EN_ATTENTE');
    expect(Number(resultat.commande.montant_total)).toBe(7500);
    expect(resultat.facture.numero).toMatch(/^FACT-\d{4}-/);
    expect(resultat.livraison.statut).toBe('EN_ATTENTE');
  });

  test('rejette la validation si le panier est vide', async () => {
    const clientId = 'client-test-panier-vide';
    await expect(
      commandeService.validerCommande(clientId, 'Douala, Cameroun')
    ).rejects.toThrow(/panier/i);
  });
});

describe('Cycle de vie de la commande', () => {
  let commandeId;

  beforeAll(async () => {
    const clientId = 'client-test-cycle';
    await panierService.ajouterProduit(clientId, PRODUIT_DISPONIBLE, 1);
    const resultat = await commandeService.validerCommande(clientId, 'Bafoussam, Cameroun');
    commandeId = resultat.commande.id;
  });

  test('progresse dans l\'ordre attendu', async () => {
    let commande = await livraisonService.mettreAJourStatutCommande(commandeId, 'CONFIRMEE');
    expect(commande.statut).toBe('CONFIRMEE');

    commande = await livraisonService.mettreAJourStatutCommande(commandeId, 'EN_PREPARATION');
    expect(commande.statut).toBe('EN_PREPARATION');
  });

  test('rejette un saut d\'étape (EN_PREPARATION -> LIVREE directement)', async () => {
    await expect(
      livraisonService.mettreAJourStatutCommande(commandeId, 'LIVREE')
    ).rejects.toThrow(/Transition non autorisée/);
  });

  test('autorise l\'annulation avant expédition', async () => {
    const commande = await livraisonService.annulerCommande(commandeId);
    expect(commande.statut).toBe('ANNULEE');
  });

  test('interdit toute nouvelle transition après annulation', async () => {
    await expect(
      livraisonService.mettreAJourStatutCommande(commandeId, 'EXPEDIEE')
    ).rejects.toThrow(/Transition non autorisée/);
  });

  test('rembourse la facture une fois la commande annulée', async () => {
    const facture = await factureService.rembourser(commandeId);
    expect(facture.statut).toBe('REMBOURSEE');
    expect(facture.date_remboursement).not.toBeNull();
  });

  test('refuse un second remboursement de la même facture', async () => {
    await expect(factureService.rembourser(commandeId)).rejects.toThrow(/déjà été remboursée/);
  });
});

describe('Remboursement', () => {
  test('refuse le remboursement tant que la commande n\'est pas annulée', async () => {
    const clientId = 'client-test-remboursement-refuse';
    await panierService.ajouterProduit(clientId, PRODUIT_DISPONIBLE, 1);
    const resultat = await commandeService.validerCommande(clientId, 'Garoua, Cameroun');

    await expect(factureService.rembourser(resultat.commande.id)).rejects.toThrow(
      /commande annulée/
    );
  });
});

describe('Intégration Groupe 2 (catalogue/stock)', () => {
  test('décrémente le stock du catalogue après validation de la commande', async () => {
    const catalogueClient = require('../src/services/catalogueClient');
    const clientId = 'client-test-decrement-stock';

    const { stockDisponible: stockAvant } = await catalogueClient.getInfoProduit(PRODUIT_DISPONIBLE);
    await panierService.ajouterProduit(clientId, PRODUIT_DISPONIBLE, 2);
    await commandeService.validerCommande(clientId, 'Bafoussam, Cameroun');
    const { stockDisponible: stockApres } = await catalogueClient.getInfoProduit(PRODUIT_DISPONIBLE);

    expect(stockApres).toBe(stockAvant - 2);
  });
});
