# Groupe 3 — Panier, commandes et livraison

Projet de Systèmes Numériques — ICT University, section francophone
Niveau 2, Spécialité Cybersécurité — Dispensaire Messassi, Yaoundé
Dirigé par M. Guy Atangana

## Rôle du groupe

Responsable du module « Panier, commandes et livraison », qui porte l'ensemble
du parcours d'achat du client : ajout au panier, validation de la commande,
suivi de la livraison et génération des factures.

## Objectif général

Offrir aux clients un parcours d'achat fiable et sécurisé, du panier à la
livraison, en garantissant la cohérence avec le stock et la traçabilité de
chaque commande.

## Acteurs concernés

| Acteur | Rôle vis-à-vis du panier et des commandes |
|---|---|
| Client | Ajoute des produits au panier, passe commande, suit sa livraison, consulte son historique |
| Administrateur / gestionnaire | Traite les commandes, met à jour leur statut, gère les annulations et remboursements |
| Livreur / transporteur | Met à jour le statut de livraison jusqu'à la remise au client |
| Autres modules | Catalogue (stock, prix — Groupe 2), Sécurité (authentification — Groupe 1), Frontend (affichage du tunnel d'achat — Groupe 4) |

## Besoins fonctionnels

- Ajouter, modifier et retirer un produit du panier
- Calculer le total du panier (produits, quantités, frais de livraison)
- Valider une commande à partir du panier, après vérification du stock
- Suivre l'état d'une commande (en attente, confirmée, en préparation, expédiée, livrée, annulée)
- Générer une facture pour chaque commande validée
- Gérer les annulations et les remboursements
- Consulter l'historique des commandes d'un client
- Mettre à jour le statut de livraison

## Besoins non fonctionnels

1. **Fiabilité** — aucune commande perdue ou dupliquée, même en cas de forte affluence
2. **Sécurité** — un client n'accède qu'à ses propres commandes ; entrées validées côté serveur
3. **Cohérence** — le stock vérifié doit refléter la disponibilité réelle au moment de la validation
4. **Traçabilité** — chaque changement de statut de commande est journalisé
5. **Maintenabilité** — code structuré, documenté et testé pour faciliter les évolutions

## Modèle de données

| Entité | Attributs principaux | Relations |
|---|---|---|
| Panier | id, client_id, date_creation, statut | Appartient à un Client ; contient des LignePanier |
| LignePanier | id, panier_id, produit_id, quantité | Associée à un Panier et à un Produit |
| Commande | id, client_id, date, statut, montant_total, adresse | Issue d'un Panier ; contient des LigneCommande |
| LigneCommande | id, commande_id, produit_id, quantité, prix_unitaire | Associée à une Commande |
| Facture | id, commande_id, numéro, date_émission, montant | Associée à une Commande unique |
| Livraison | id, commande_id, transporteur, statut, dates | Associée à une Commande unique |

Le prix est figé dans `LigneCommande` : si le prix catalogue change après la
commande, la facture reste fidèle au montant réellement payé par le client.

## Architecture en couches

| Couche | Rôle |
|---|---|
| Présentation | Pages du panier, tunnel de commande, suivi et facture téléchargeable (Groupe 4) |
| Logique métier | Calcul du total, vérification de la disponibilité, gestion des transitions d'état |
| Accès aux données | Transactions atomiques lors de la création d'une commande (panier → commande) |
| Intégration | Appels au module Catalogue (stock, prix) et au module Sécurité (authentification) |

## Cycle de vie d'une commande

```
EN_ATTENTE → CONFIRMEE → EN_PREPARATION → EXPEDIEE → LIVREE
```

`ANNULEE` est accessible depuis n'importe quel statut antérieur à l'expédition.
Chaque transition d'état est horodatée et journalisée.

## Fonctionnalités développées

1. Gestion du panier (ajout, modification, retrait de produits)
2. Validation de commande (vérification du stock, calcul du total)
3. Suivi de commande (état courant et historique des statuts)
4. Génération de facture (récapitulatif téléchargeable)
5. Annulation (possible avant l'expédition)
6. Remboursement (après annulation ou retour validé)
7. Historique client (commandes passées et leur statut)
8. Suivi de livraison (mise à jour jusqu'à la remise au client)

## Dépendances avec les autres groupes

1. Vérification du stock et du prix auprès du Groupe 2 avant validation de commande
2. Authentification du client via le module du Groupe 1 avant toute opération
3. Interfaces communes avec le Groupe 4 pour l'affichage du panier et du suivi
4. Participation aux tests d'intégration globaux menés par le Groupe 5

## Stratégie de tests

| Type de test | Objectif | Exemple de cas testé |
|---|---|---|
| Unitaires | Vérifier isolément chaque fonction | Ajout au panier d'une quantité supérieure au stock → rejet |
| Intégration | Interaction panier / commande / catalogue | Stock modifié entre-temps → recalcul ou blocage |
| Fonctionnels | Vérifier le tunnel d'achat complet | Parcours panier → commande → facture → livraison |
| Non-régression | Aucune casse après une évolution | Rejeu des tests précédents à chaque changement |

## Difficultés anticipées et solutions retenues

| Difficulté | Solution retenue |
|---|---|
| Risque de survente si deux clients commandent le dernier exemplaire | Vérification finale du stock et transaction atomique au moment de la validation |
| Décalage entre le panier (temporaire) et le stock réel | Le stock n'est décrémenté qu'à la validation de la commande, jamais à l'ajout au panier |
| Gestion des annulations tardives (commande en préparation) | Règles strictes limitant l'annulation aux statuts antérieurs à l'expédition |

## Perspectives

- Paiement en ligne intégré
- Notifications en temps réel de l'état de la livraison
- Système de codes promotionnels avancé
