# API du module Panier, commandes et livraison — Guide d'intégration

Destiné aux Groupes 1 (auth), 2 (catalogue), 4 (frontend) et 5 (infra/tests).

## Authentification

En attendant l'intégration réelle avec le module Sécurité du Groupe 1, toutes
les routes (sauf `/health`) exigent un en-tête :

```
x-client-id: <identifiant-client>
```

À terme, ce middleware (`src/middlewares/auth.middleware.js`) sera remplacé
par une vérification de token JWT fournie par le Groupe 1 — la signature des
fonctions des contrôleurs ne changera pas (`req.clientId` restera disponible).

## Dépendance avec le Groupe 2 (Catalogue)

`src/services/catalogueClient.js` centralise tous les appels au catalogue
(prix, stock). C'est le seul fichier à modifier pour brancher la vraie API du
Groupe 2 : remplacer l'implémentation interne par un appel HTTP/RPC réel, en
conservant les deux fonctions exposées :
- `verifierDisponibilite(produitId, quantite)`
- `getInfoProduit(produitId)` → `{ prix, ... }`

## Endpoints

### Panier

| Méthode | Route | Body | Description |
|---|---|---|---|
| GET | `/api/panier` | — | Contenu détaillé et total du panier actif |
| POST | `/api/panier/lignes` | `{ produitId, quantite }` | Ajoute un produit (cumule si déjà présent) |
| PATCH | `/api/panier/lignes/:ligneId` | `{ quantite }` | Modifie la quantité d'une ligne |
| DELETE | `/api/panier/lignes/:ligneId` | — | Retire une ligne du panier |

### Commandes

| Méthode | Route | Body | Description |
|---|---|---|---|
| POST | `/api/commandes` | `{ adresse }` | Valide la commande à partir du panier actif (vérifie le stock, génère facture + livraison) |
| GET | `/api/commandes/:commandeId` | — | Détail d'une commande (lignes, facture, livraison) |
| GET | `/api/commandes/historique` | — | Historique des commandes du client |
| POST | `/api/commandes/:commandeId/annuler` | — | Annule la commande (refusé si déjà expédiée) |
| POST | `/api/commandes/:commandeId/rembourser` | — | Rembourse la facture d'une commande annulée (réservé aux gestionnaires) |
| PATCH | `/api/commandes/:commandeId/statut` | `{ statut }` | Fait progresser le statut (réservé aux gestionnaires/livreurs — à protéger par rôle une fois le Groupe 1 disponible) |

Statuts valides pour `PATCH /statut` : `CONFIRMEE`, `EN_PREPARATION`,
`EXPEDIEE`, `LIVREE`, `ANNULEE` — uniquement dans l'ordre du cycle de vie
(voir `docs/analyse-conception.md`).

## Formats d'erreur

Toutes les erreurs passent par `src/middlewares/erreurs.middleware.js` et
renvoient :

```json
{ "erreur": "message lisible" }
```

avec le code HTTP approprié (400 requête invalide, 401 non authentifié, 403
accès refusé, 404 introuvable, 409 conflit — ex. stock insuffisant ou
transition de statut non autorisée).

## Pour le Groupe 4 (frontend)

- Le panier est calculé côté serveur à chaque lecture (`GET /api/panier`) —
  ne pas recalculer le total côté client.
- La facture (numéro, montant, date) est renvoyée dans
  `GET /api/commandes/:commandeId`, sous la clé `facture`.

## Pour le Groupe 5 (tests d'intégration globaux)

- Suite de tests fonctionnels : `tests/tunnel-achat.test.js` (`npm test`)
- Base de données de test : SQLite en mémoire (`NODE_ENV=test`), aucune
  dépendance externe requise pour lancer les tests
