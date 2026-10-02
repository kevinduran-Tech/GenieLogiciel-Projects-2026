# Groupe 3 – Panier, commandes et livraison

Module du **Projet de Génie Logiciel – Session normale Summer 2026** (plateforme e-commerce, 5 groupes).
Ce module gère le parcours d'achat : panier, passage de commande, suivi d'état, factures, livraison, annulation et remboursement.

**Technologies :** Node.js, Express, SQLite (better-sqlite3), JWT, tests avec Jest et Supertest.

## Fonctionnalités

- Panier par client : ajouter, modifier, retirer, vider, total calculé
- Commande à partir du panier, avec réservation du stock « tout ou rien » et prix figés
- Cycle de vie : `PENDING → CONFIRMED → PREPARING → SHIPPED → DELIVERED` (+ `CANCELLED`, `REFUNDED`)
- Facture générée à la confirmation (JSON et HTML imprimable)
- Suivi de livraison, historique complet des changements d'état
- Rôles `CLIENT`, `ADMIN`, `LIVREUR` (jeton JWT fourni par le Groupe 1)

## Installation et lancement

Prérequis : [Node.js](https://nodejs.org) 18 ou plus récent.

```bash
cd Groupe-3
npm install
npm test        # lance les 46 tests
npm start       # démarre l'API sur http://localhost:3003
```

Variables d'environnement (facultatives) :

| Variable | Défaut | Rôle |
|----------|--------|------|
| `PORT` | `3003` | Port du serveur |
| `JWT_SECRET` | `dev-secret-a-remplacer` | Secret partagé avec le Groupe 1 (à changer) |
| `DB_FILE` | `data/groupe3.db` | Fichier de la base SQLite |

## Organisation du dossier

```
Groupe-3/
├── README.md
├── package.json
├── docs/
│   ├── Analyse_des_besoins_Groupe3.docx   Étape 1 : analyse
│   ├── Conception_Groupe3.docx            Étape 2 : conception (diagrammes)
│   ├── Guide_integration_API.md           Guide pour les autres groupes
│   ├── Plan_de_tests.md                   Plan et résultats des tests
│   ├── diagrams/                          Images et sources des diagrammes
│   └── schema.sql                         Schéma de la base de données
├── src/
│   ├── app.js, server.js, config.js
│   ├── routes/          Endpoints REST
│   ├── services/        Règles métier (panier, commandes, états)
│   ├── middleware/      Authentification JWT, gestion des erreurs
│   ├── integrations/    Interface du catalogue (Groupe 2)
│   └── db/              Schéma SQL et ouverture de la base
└── tests/               Tests automatisés
```

## Documentation

- [Analyse des besoins](docs/Analyse_des_besoins_Groupe3.docx)
- [Conception](docs/Conception_Groupe3.docx)
- [Guide d'intégration de l'API](docs/Guide_integration_API.md)
- [Plan de tests](docs/Plan_de_tests.md)

## Limites connues

- Le paiement est **simulé** : la confirmation de la commande vaut paiement accepté.
- Le catalogue utilisé par défaut est une version **en mémoire** (données de démonstration). Il sera remplacé par le module du Groupe 2 via l'interface décrite dans le guide d'intégration.
