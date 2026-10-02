# Groupe 3: Panier, commandes et livraison

Module « Panier, commandes et livraison » Projet de Systèmes Numériques,
ICT University (section francophone), dirigé par M. Guy Atangana.

Voir [`docs/analyse-conception.md`](docs/analyse-conception.md) pour
l'analyse des besoins et la conception détaillée (synchronisé avec le
support de présentation du groupe), et
[`docs/integration-api.md`](docs/integration-api.md) pour le guide
d'intégration destiné aux autres groupes (endpoints, formats, dépendances).

Le PowerPoint et le rapport Word de présentation du projet se trouvent
dans [`livrables/`](livrables/).

## Stack technique

- Node.js + Express (API REST)
- Sequelize + PostgreSQL (persistance) — SQLite en mémoire pour les tests
- Jest + Supertest (tests)

## Structure du projet

```
src/
  config/       # connexion base de données
  models/       # Panier, LignePanier, Commande, LigneCommande, Facture, Livraison
  services/     # logique métier (panier, commande, facture, livraison)
  controllers/  # gestion des requêtes HTTP
  routes/       # définition des routes de l'API
  middlewares/  # authentification, gestion des erreurs
  server.js     # point d'entrée
tests/          # tests unitaires, intégration, fonctionnels
docs/           # documentation d'analyse et de conception
```

## Installation

```bash
npm install
cp .env.example .env   # puis renseigner les identifiants PostgreSQL
npm run dev
```

## Tests

```bash
npm test
```

## Statut du projet

- [x] Analyse des besoins
- [x] Conception (modèle de données, architecture)
- [x] Développement (panier, validation de commande, facture, remboursement, transitions de statut)
- [x] Tests (tunnel d'achat complet : 15 tests passants, dont l'intégration Groupe 2)
- [x] Documentation d'intégration pour les autres groupes (`docs/integration-api.md`)
- [ ] Documentation OpenAPI/Swagger (nice-to-have, non bloquant)
- [x] Branchement réel sur l'API du Groupe 2 (catalogue) — code prêt (`CATALOG_SERVICE_MOCK=false`), à activer dès que leur serveur tourne en continu
- [ ] Branchement réel sur l'API du Groupe 1 (authentification), en attente de leur livraison

## Intégration avec le Groupe 2 (catalogue/stock)

Le code source de leur module se trouve dans
[`groupe-2-catalogue-stocks/`](groupe-2-catalogue-stocks/) (Flask/Python,
31 tests, voir son propre README pour l'installer et le lancer en local :
`python run.py`, écoute sur `http://localhost:5002`).

Par défaut, `src/services/catalogueClient.js` tourne en **mode simulation**
(`CATALOG_SERVICE_MOCK=true` ou `CATALOG_SERVICE_URL` non renseignée), avec un
petit catalogue de démonstration. Pour utiliser leur vraie API (une fois leur
serveur lancé), renseigner dans `.env` :

```
CATALOG_SERVICE_URL=http://localhost:5002/api
CATALOG_SERVICE_MOCK=false
CATALOG_ADMIN_KEY=<valeur de ADMIN_API_KEY dans leur .env>
```

Contrat réel exposé par le Groupe 2 (voir
[`groupe-2-catalogue-stocks/docs/integration-api.md`](groupe-2-catalogue-stocks/docs/integration-api.md)) :
`GET /api/produits/:id` retourne `{ prix, stock }`, et la validation de
commande déclenche `POST /api/stock/:id/mouvement { variation }` (en-tête
`x-admin-key` requis) pour décrémenter réellement le stock.

## Points d'API exposés

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/panier` | Consulter le panier actif (avec total) |
| POST | `/api/panier/lignes` | Ajouter un produit `{ produitId, quantite }` |
| PATCH | `/api/panier/lignes/:ligneId` | Modifier la quantité `{ quantite }` |
| DELETE | `/api/panier/lignes/:ligneId` | Retirer une ligne |
| POST | `/api/commandes` | Valider la commande `{ adresse }` |
| GET | `/api/commandes/historique` | Historique des commandes du client |
| GET | `/api/commandes/:commandeId` | Détail d'une commande |
| POST | `/api/commandes/:commandeId/annuler` | Annuler (avant expédition) |
| PATCH | `/api/commandes/:commandeId/statut` | Mettre à jour le statut (gestionnaire) |

Toutes les routes nécessitent l'en-tête `x-client-id` (stub d'authentification
en attendant l'intégration réelle avec le Groupe 1).

## Dépendances avec les autres groupes

- Groupe 1 (authentification) — vérification de l'identité du client
- Groupe 2 (catalogue/stock) — vérification de la disponibilité et du prix
- Groupe 4 (frontend) — interfaces panier / suivi / facture
- Groupe 5 (infra/tests globaux) — intégration continue et tests de bout en bout
