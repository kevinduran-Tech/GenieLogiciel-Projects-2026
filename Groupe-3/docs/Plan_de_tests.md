# Plan de tests – Groupe 3

Tests automatisés avec **Jest** et **Supertest**. Chaque test utilise une base SQLite en mémoire neuve et un catalogue de démonstration : aucun service externe n'est nécessaire.

```bash
npm test
```

## Couverture par fichier

| Fichier | Objet | Cas d'utilisation | Tests |
|---------|-------|-------------------|-------|
| `tests/auth.test.js` | Authentification et rôles | Sécurité | 7 |
| `tests/cart.test.js` | Panier : ajout, total, quantité, stock, retrait, isolation entre clients | CU1, CU2, CU3 | 15 |
| `tests/orders.test.js` | Passage de commande, accès aux commandes, rollback et compensation du stock | CU4, CU6 | 11 |
| `tests/lifecycle.test.js` | Cycle de vie, facture, livraison, annulation, remboursement, rôles, accès concurrents | CU5, CU7 à CU10 | 13 |

**Résultat : 46 tests réussis sur 46.**

## Scénarios clés vérifiés

- **Sécurité** : requête sans jeton (401), mauvais secret, jeton expiré, rôle inconnu, panier interdit à l'administrateur (403).
- **Panier** : total correct, additionner les quantités, produit inconnu (404), stock insuffisant ou nul (409), quantités invalides (400).
- **Commande** : prix figés, stock réservé, panier vidé ; panier vide refusé ; adresse ou paiement invalides refusés.
- **Erreurs et annulations** : stock épuisé entre-temps (aucune réservation partielle, panier conservé) ; panne d'enregistrement (stock remis, aucune commande créée).
- **Cycle de vie** : parcours complet jusqu'à la livraison ; transitions interdites (409) ; rôles respectés (403) ; annulation avec remise en stock ; remboursement avec et sans remise en stock ; deux modifications simultanées (une seule acceptée).
- **Confidentialité** : un client ne peut ni lire ni annuler la commande d'un autre (404).
- **Facture et livraison** : numéro `FAC-AAAA-NNNNNN`, total exact, version HTML, suivi des dates d'expédition et de livraison.

## Liste détaillée des tests

```
✓ parcours complet : confirmation, préparation, expédition, livraison
✓ la confirmation génère la facture avec le bon total
✓ la facture est disponible en HTML
✓ suit la livraison (PENDING, SHIPPED puis DELIVERED)
✓ refuse les transitions interdites (409)
✓ respecte les rôles : le client ne prépare ni n'expédie, le livreur ne prépare pas
✓ annulation avant expédition : statut CANCELLED et stock remis
✓ annulation possible après confirmation et préparation, impossible une fois expédiée
✓ une commande annulée est définitive
✓ remboursement d'une commande livrée : pas de remise en stock, remboursement enregistré
✓ remboursement d'une commande confirmée mais non expédiée : stock remis
✓ on ne rembourse pas une commande non confirmée (409)
✓ deux transitions simultanées : une seule est acceptée
✓ crée une commande PENDING, fige les prix, réserve le stock et vide le panier
✓ refuse une commande avec un panier vide (409)
✓ refuse une adresse trop courte ou un mode de paiement inconnu (400)
✓ si le stock a baissé entre-temps, rien n'est enregistré et le panier est conservé
✓ en cas d'erreur d'enregistrement, le stock réservé est remis (compensation)
✓ le prix figé dans la commande ne change pas si le catalogue change ensuite
✓ un client liste uniquement ses commandes
✓ un client ne peut pas lire la commande d'un autre (404)
✓ un client ne peut pas annuler la commande d'un autre (404)
✓ filtre par statut et refuse un statut invalide
✓ un identifiant de commande invalide renvoie 404
✓ un panier neuf est vide
✓ ajoute des produits et calcule le total
✓ additionne les quantités quand le même produit est ajouté deux fois
✓ refuse un produit inconnu (404)
✓ refuse une quantité supérieure au stock (409)
✓ refuse un produit en rupture de stock (409)
✓ refuse la quantité invalide 0 (400)
✓ refuse la quantité invalide -1 (400)
✓ refuse la quantité invalide 1.5 (400)
✓ refuse la quantité invalide "2" (400)
✓ refuse la quantité invalide undefined (400)
✓ modifie la quantité d'une ligne
✓ refuse de modifier une ligne absente du panier (404)
✓ retire un produit puis vide le panier
✓ chaque client a son propre panier
✓ refuse une requête sans jeton (401)
✓ refuse un jeton signé avec un mauvais secret (401)
✓ refuse un jeton expiré (401)
✓ refuse un rôle inconnu (401)
✓ le panier est réservé au rôle CLIENT (403 pour l'administrateur)
✓ la route /health est publique
✓ une route inconnue renvoie 404
```
