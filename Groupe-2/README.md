# Catalogue de produits et gestion des stocks — Groupe 2

Module du projet de Systèmes Numériques (ICT-University, Niveau 2 Cybersécurité, Dispensaire Messassi, Yaoundé).
Auteurs : Soumelong Jordan Landry (ICTU20251294) · Bekonje Bekonje Alexandre (ICTU20251313) — encadrant : M. Guy Atangana.

Pile : **Python / Flask + SQLite**, API REST JSON, interface web légère (HTML/CSS/JS).

## Fonctionnalités
- CRUD produits et catégories (une catégorie non vide ne peut pas être supprimée)
- Stock séparé du produit, **mise à jour atomique** (`BEGIN IMMEDIATE`), quantité jamais négative
- Historique des mouvements (entrée/sortie) et **alertes de seuil** (`critique` / `rupture`)
- Recherche par nom, catégorie, disponibilité, prix ; tri ; pagination
- Upload d'image JPEG/PNG (extension + signature binaire + taille max 2 Mo, nom aléatoire)
- Journal d'audit (date, auteur, action) de toutes les opérations sensibles
- Sécurité : jetons signés à expiration, RBAC (`admin` / `service` / `client`), requêtes préparées,
  limitation des tentatives de connexion, mots de passe hachés, en-têtes CSP/nosniff

## Installation
```bash
git clone <url-du-depot> && cd catalogue-stocks
python -m venv .venv && source .venv/bin/activate      # Windows : .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env    # puis définir SECRET_KEY (voir le fichier)
export SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
export FLASK_APP=app
flask seed              # jeu de données du rapport + compte admin (mot de passe affiché une fois)
flask run               # http://127.0.0.1:5000
```
Autres comptes : `flask create-user <nom> --role service` (module tiers) ou `--role client`.

Docker : `docker build -t catalogue . && docker run -p 8000:8000 -e SECRET_KEY=... catalogue`
(monter `/srv/instance` en volume pour conserver la base).

## Tests
```bash
pytest -v
```
36 tests : validation (prix négatif, nom manquant), catégorie non vide, vente 37→34 journalisée,
ventes simultanées sans perte, injection SQL, RBAC, upload d'images, performance (< 300 ms sur 1 000 produits).

## Architecture
```
app/
  api/        Présentation/intégration : routes REST (auth, catalogue, stock)
  services/   Logique métier : validation, règles de stock, alertes, journal
  db.py       Accès aux données : connexion SQLite, transactions
  schema.sql  Modèle de données (Catégorie, Produit, Stock, Mouvement, Journal, Utilisateur)
  security.py Jetons + RBAC + anti force brute
  static/     Interface web
tests/        pytest
docs/API.md   Contrat d'interface pour les autres groupes
```

## Rôles
| Rôle | Droits |
|---|---|
| anonyme / `client` | lecture du catalogue et des stocks |
| `service` (autres modules) | lecture + mouvements de stock, alertes |
| `admin` | tout : produits, catégories, images, seuils, journal |

Documentation complète de l'API : [docs/API.md](docs/API.md).

## Limites connues
SQLite convient à la démonstration (un seul serveur, écritures sérialisées). Pour la production multi-serveurs,
migrer vers PostgreSQL (`SELECT ... FOR UPDATE` remplacerait `BEGIN IMMEDIATE`). Le rate-limit de connexion est
en mémoire (par processus).
