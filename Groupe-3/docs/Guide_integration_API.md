# Guide d'intégration – Module Groupe 3 (Panier, commandes et livraison)

Ce guide s'adresse aux autres groupes : il décrit comment appeler le module du Groupe 3 et ce qu'il attend d'eux.

## 1. Authentification (Groupe 1)

Toutes les routes `/api/...` exigent un jeton JWT :

```
Authorization: Bearer <jeton>
```

Le jeton doit être signé avec le **même secret** que celui configuré dans `JWT_SECRET` du Groupe 3, et contenir :

```json
{ "id": "identifiant-utilisateur", "role": "CLIENT" }
```

`role` vaut `CLIENT`, `ADMIN` ou `LIVREUR`. Sans jeton valide, l'API répond `401`.

## 2. Catalogue et stock (Groupe 2)

Le Groupe 3 n'accède au catalogue que par un objet qui offre ces trois méthodes asynchrones (voir `src/integrations/catalogClient.js`) :

| Méthode | Retour | Description |
|---------|--------|-------------|
| `getProduct(productId)` | `{ id, name, price, stock }` ou `null` | `price` est un entier en FCFA |
| `reserveStock(lines)` | rien | Retire le stock de **toutes** les lignes, ou d'aucune (erreur `INSUFFICIENT_STOCK`) |
| `releaseStock(lines)` | rien | Remet les quantités en stock |

`lines` est de la forme `[{ "productId": "p1", "quantity": 2 }]`.

**À convenir avec le Groupe 2** : soit ils exposent ces trois opérations dans leur API REST (le Groupe 3 écrira alors un client HTTP respectant ce contrat), soit ils fournissent une fonction équivalente. Le passage de la version de démonstration à la vraie version ne change qu'une ligne dans `src/server.js`.

## 3. Pour le Frontend (Groupe 4)

Base : `http://localhost:3003/api`. Corps et réponses en JSON. Montants en entiers FCFA (`XAF`).

### Panier (rôle CLIENT)

| Verbe | Route | Corps | Description |
|-------|-------|-------|-------------|
| GET | `/cart` | | Panier et total |
| POST | `/cart/items` | `{ "productId": "p1", "quantity": 2 }` | Ajouter (les quantités s'additionnent) |
| PATCH | `/cart/items/:productId` | `{ "quantity": 3 }` | Changer la quantité |
| DELETE | `/cart/items/:productId` | | Retirer un produit |
| DELETE | `/cart` | | Vider le panier |

### Commandes

| Verbe | Route | Qui | Description |
|-------|-------|-----|-------------|
| POST | `/orders` | Client | Corps : `{ "shippingAddress": "...", "paymentMethod": "MOBILE_MONEY" }` (`MOBILE_MONEY`, `CARD` ou `CASH_ON_DELIVERY`). Crée la commande `PENDING` |
| GET | `/orders` | Tous | Un client voit les siennes ; filtre `?status=` |
| GET | `/orders/:id` | Tous | Détail |
| GET | `/orders/:id/history` | Tous | Historique des états |
| POST | `/orders/:id/confirm` | Client, Admin | Paiement accepté : `CONFIRMED`, facture créée |
| POST | `/orders/:id/cancel` | Client, Admin | Avant expédition ; le stock est remis |
| POST | `/orders/:id/prepare` | Admin | `PREPARING` |
| POST | `/orders/:id/ship` | Admin, Livreur | `SHIPPED` |
| POST | `/orders/:id/deliver` | Admin, Livreur | `DELIVERED` |
| POST | `/orders/:id/refund` | Admin | Corps facultatif : `{ "reason": "..." }` |
| GET | `/orders/:id/invoice` | Tous | Facture en JSON |
| GET | `/orders/:id/invoice.html` | Tous | Facture imprimable |
| GET | `/orders/:id/delivery` | Tous | État de la livraison |

### Format des erreurs

```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "Stock insuffisant pour « Riz 5 kg » (disponible : 3)" } }
```

| Code HTTP | Signification |
|-----------|---------------|
| 400 | Données invalides (`VALIDATION_ERROR`) |
| 401 | Jeton absent ou invalide |
| 403 | Rôle non autorisé |
| 404 | Ressource introuvable (ou commande d'un autre client) |
| 409 | Règle métier refusée : `CART_EMPTY`, `INSUFFICIENT_STOCK`, `INVALID_TRANSITION`, `PRODUCT_UNAVAILABLE` |

## 4. Pour l'infrastructure (Groupe 5)

- Démarrage : `npm install` puis `npm start` (Node.js 18+)
- Santé : `GET /health` (sans authentification)
- Tests : `npm test` (aucune base ni service externe requis)
- Variables : `PORT`, `JWT_SECRET`, `DB_FILE`
- La base SQLite est un fichier : à sauvegarder (`DB_FILE`) et à monter sur un volume en conteneur
