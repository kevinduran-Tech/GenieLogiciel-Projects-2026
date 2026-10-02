# Module Utilisateurs & Sécurité — Event Manager

Livrable du groupe « Utilisateurs et protection des accès » du projet Event Manager : un module backend
REST (Java 17, Spring Boot 3, Spring Security, JWT), prêt à être intégré par les autres groupes.
Ce module n'est pas destiné à être démontré seul dans un navigateur — c'est une brique que les autres
groupes appellent depuis leur propre code (mobile, autre service backend, etc.), voir « Guide
d'intégration » ci-dessous.

## État du livrable

- Code source complet : modèles, dépôts, services, contrôleurs, sécurité, tests (voir `src/`).
- 15 tests automatisés couvrant les cas nominaux et les attaques courantes (`mvn test`).
- Documentation des endpoints et du contrat d'intégration ci-dessous.
- Restent à faire par les groupes concernés : réinitialisation de mot de passe par email, limitation
  de débit par IP, déploiement en production (voir « Limites connues »).

## Prérequis

- **Java 17 ou supérieur** (Java 21 / 26 fonctionne aussi)
- **Maven 3.8+**

### Installer Maven (Windows)

1. Télécharger : https://maven.apache.org/download.cgi → `apache-maven-3.9.x-bin.zip`
2. Décompresser dans `C:\maven`
3. Ajouter `C:\maven\bin` dans la variable d’environnement **Path**
4. Définir **JAVA_HOME** (sans le dossier `\bin`) :
   ```
   C:\Program Files\Java\jdk-26.0.2
   ```
   (adapte selon ton installation Java)
5. Ouvrir un **nouveau** terminal et vérifier :
   ```powershell
   mvn -version
   ```

### Installer Maven (macOS / Linux)

```bash
# macOS
brew install maven

# Ubuntu / Debian
sudo apt update && sudo apt install maven
```

## Compiler et exécuter

```bash
# Lancer les tests
mvn test

# Démarrer le serveur (port 8080)
mvn spring-boot:run
```

- Swagger UI : http://localhost:8080/swagger-ui.html
- Base de données en développement : H2 en mémoire

### Production

```bash
export SPRING_PROFILES_ACTIVE=prod
export JWT_SECRET=$(openssl rand -base64 48)
export DB_URL=jdbc:postgresql://localhost:5432/eventmanager
export DB_USER=...
export DB_PASSWORD=...
mvn spring-boot:run
```

## Endpoints
| Méthode | URL | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | non | Inscription (rôle USER ou ORGANIZER) |
| POST | /api/auth/login | non | Retourne accessToken + refreshToken |
| POST | /api/auth/refresh | non | Nouveau couple de tokens (rotation) |
| POST | /api/auth/logout | non | Révoque le refresh token |
| GET | /oauth2/authorization/google | non | Démarre la connexion Google |
| GET | /oauth2/authorization/github | non | Démarre la connexion GitHub |
| GET | /oauth2/authorization/spotify | non | Démarre la connexion Spotify |
| GET/PUT | /api/users/me | Bearer | Consulter / modifier son profil |
| PUT | /api/users/me/password | Bearer | Changer son mot de passe |
| DELETE | /api/users/me | Bearer | Désactiver son compte |
| GET | /api/admin/users | ADMIN | Lister les utilisateurs |

### Connexion sociale (OAuth2)
1. Le frontend redirige l'utilisateur vers :
   - Google  → `http://localhost:8080/oauth2/authorization/google`
   - GitHub  → `http://localhost:8080/oauth2/authorization/github`
   - Spotify → `http://localhost:8080/oauth2/authorization/spotify`
2. Après authentification réussie, le backend redirige vers l'URL configurée
   (`app.oauth2.success-redirect-url`, défaut `http://localhost:3000/oauth/callback`)
   avec les query params : `accessToken`, `refreshToken`, `expiresIn`, `tokenType`.
3. Le frontend récupère les tokens et les stocke (localStorage / cookie sécurisé).

Variables d'environnement nécessaires :
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
OAUTH2_SUCCESS_REDIRECT=http://localhost:3000/oauth/callback
```

Dans les consoles des providers, configurez l'URL de callback :
`http://localhost:8080/login/oauth2/code/{provider}`
(ex: `http://localhost:8080/login/oauth2/code/google`)

## Guide d'intégration pour le Frontend

Base URL (développement) : `http://localhost:8080`

### 1. Inscription

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Secret123",
  "firstName": "Jean",
  "lastName": "Dupont",
  "phone": "+237 6XX XXX XXX",   // optionnel
  "role": "USER"                 // ou "ORGANIZER" (ADMIN interdit)
}
```

Réponse `201` :
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "Jean",
  "lastName": "Dupont",
  "phone": null,
  "role": "USER",
  "provider": "LOCAL"
}
```

### 2. Connexion classique (email + mot de passe)

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Secret123"
}
```

Réponse `200` :
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
  "tokenType": "Bearer",
  "expiresInSeconds": 900
}
```

**Stockage recommandé côté frontend :**
- `accessToken` → mémoire (React state / Zustand / Redux) ou `sessionStorage`
- `refreshToken` → `httpOnly` cookie (idéal) ou `localStorage` (plus simple mais moins sécurisé)

### 3. Envoyer le token sur chaque requête protégée

```js
// Exemple avec fetch
fetch("http://localhost:8080/api/users/me", {
  headers: {
    "Authorization": `Bearer ${accessToken}`
  }
})
```

```js
// Exemple avec axios (interceptor recommandé)
axios.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### 4. Rafraîchir le token (quand l’access token expire)

Quand une requête renvoie **401**, appeler :

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

Réponse : nouveau couple `accessToken` + `refreshToken` (l’ancien refresh est invalidé).

**Exemple d’interceptor axios :**
```js
axios.interceptors.response.use(
  res => res,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const { data } = await axios.post("/api/auth/refresh", {
        refreshToken: getRefreshToken()
      });
      saveTokens(data.accessToken, data.refreshToken);
      error.config.headers.Authorization = `Bearer ${data.accessToken}`;
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```

### 5. Déconnexion

```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "..."
}
```

Puis supprimer les tokens côté frontend.

### 6. Connexion sociale (Google / GitHub / Spotify)

**Boutons côté frontend :**
```html
<a href="http://localhost:8080/oauth2/authorization/google">Continuer avec Google</a>
<a href="http://localhost:8080/oauth2/authorization/github">Continuer avec GitHub</a>
<a href="http://localhost:8080/oauth2/authorization/spotify">Continuer avec Spotify</a>
```

Après authentification réussie, le backend redirige vers :
```
http://localhost:3000/oauth/callback?accessToken=...&refreshToken=...&expiresIn=900&tokenType=Bearer
```

**Page de callback côté frontend (exemple React) :**
```js
// pages/oauth/callback.jsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get("accessToken");
  const refreshToken = params.get("refreshToken");

  if (accessToken && refreshToken) {
    saveTokens(accessToken, refreshToken);
    navigate("/dashboard");
  } else {
    navigate("/login?error=oauth_failed");
  }
}, []);
```

### 7. Profil utilisateur

```http
GET  /api/users/me          → récupérer son profil
PUT  /api/users/me          → modifier prénom / nom / téléphone
PUT  /api/users/me/password → changer de mot de passe
DELETE /api/users/me        → désactiver son compte
```

### Codes d’erreur utiles

| Code | Signification |
|------|---------------|
| 400  | Données invalides (mot de passe trop faible, etc.) |
| 401  | Non authentifié / identifiants incorrects |
| 403  | Accès refusé (rôle insuffisant) |
| 409  | Email déjà utilisé |
| 423  | Compte temporairement verrouillé (trop d’échecs) |

### CORS

Le backend autorise déjà les requêtes depuis le frontend en développement.  
Si besoin, on peut ajouter une config CORS plus stricte.

---

## Guide d'intégration pour les autres modules Backend (Spring)

1. Se connecter : `POST /api/auth/login`
2. Envoyer le token : `Authorization: Bearer <accessToken>`
3. Quand l’access token expire → appeler `/api/auth/refresh`
4. Récupérer l’utilisateur courant : `@AuthenticationPrincipal User user`
5. Restreindre une route : `.requestMatchers("/api/events/manage/**").hasAnyRole("ORGANIZER","ADMIN")`

## Mesures de sécurité
BCrypt (coût 12) · JWT signé HS256 (15 min) · refresh tokens aléatoires stockés hachés (SHA-256), rotation et
détection de réutilisation · verrouillage après 5 échecs · messages d'erreur génériques + hash factice contre
l'énumération d'emails · validation des entrées · requêtes JPA paramétrées · pas de détails internes dans les erreurs ·
inscription ADMIN interdite.

## Limites connues / à faire
- Pas de réinitialisation du mot de passe par email (nécessite un service d'envoi).
- Pas de limitation de débit par IP (rate limiting) : à ajouter via un filtre ou un reverse proxy.
- Création du premier ADMIN : à faire directement en base ou via un script d'initialisation.
- Toujours servir derrière HTTPS en production.
