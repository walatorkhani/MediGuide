# Déploiement — MédiGuide

Ce guide couvre la S9 du cahier des charges : backend sur Railway, frontend
sur Vercel avec domaine personnalisé et HTTPS, et l'automatisation via la CI
GitHub Actions déjà en place (`.github/workflows/ci.yml`).

Deux façons de déployer, à ne pas mélanger :

- **Option A — intégration native (recommandée, la plus simple)** : Railway
  et Vercel se connectent directement à votre dépôt GitHub et redéploient à
  chaque push, sans rien configurer dans GitHub Actions.
- **Option B — via la CI GitHub Actions** : les jobs `deploy-backend-railway`
  et `deploy-frontend-vercel` du workflow font le déploiement eux-mêmes,
  après que les tests soient passés. Utile si vous voulez que le déploiement
  soit bloqué tant que les tests échouent. Nécessite des tokens en secrets.

Ce guide part sur l'**option A**, plus simple pour un projet étudiant, et
indique où basculer vers l'option B si besoin.

---

## 1. Prérequis

- Le dépôt du projet doit être poussé sur GitHub (avec `.gitignore`
  excluant déjà `node_modules` et `.env` — vérifié présent).
- Compte Railway (https://railway.app) connecté à GitHub.
- Compte Vercel (https://vercel.com) connecté à GitHub.
- Un compte SMTP si vous voulez de vrais e-mails de confirmation/rappel
  (sinon, ils restent journalisés dans la console — suffisant pour la
  démo/soutenance).

---

## 2. Backend sur Railway

### 2.1 Créer le projet

1. Railway → **New Project** → **Deploy from GitHub repo** → sélectionner
   le dépôt.
2. Railway détecte un monorepo (backend/ + frontend/). Dans les paramètres
   du service créé : **Settings → Root Directory** → renseigner `backend`.
   C'est ce qui fait que Railway ne build que le dossier backend et utilise
   `backend/railway.json` (déjà présent dans le projet) pour le build
   Nixpacks et le healthcheck sur `/health`.

### 2.2 Ajouter PostgreSQL + PostGIS

1. Dans le projet Railway : **+ New → Database → PostgreSQL**.
2. Railway fournit une base Postgres standard (pas PostGIS par défaut). Deux
   options :
   - **Simple** : ouvrir l'onglet **Query** de la base Railway et exécuter
     `CREATE EXTENSION IF NOT EXISTS postgis;` une fois — l'image Postgres
     de Railway inclut l'extension, il suffit de l'activer.
   - **Alternative** : remplacer l'image par `postgis/postgis` via
     **Settings → Source → Docker Image** si l'activation simple échoue.
3. Railway génère automatiquement une variable `DATABASE_URL` sur le
   service Postgres. Il faut la référencer dans le service backend :
   **Backend service → Variables → New Variable → Add Reference** →
   choisir `DATABASE_URL` du service Postgres.

### 2.3 Ajouter Redis

1. **+ New → Database → Redis**.
2. Sur le service backend, référencer sa variable `REDIS_URL` de la même
   façon qu'à l'étape 2.2 (Add Reference).

### 2.4 Variables d'environnement du backend

Dans **Backend service → Variables**, ajouter (voir `backend/.env.example`
pour la liste complète et les commentaires) :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | référence au service Postgres (2.2) |
| `REDIS_URL` | référence au service Redis (2.3) |
| `JWT_SECRET` | générer avec `openssl rand -hex 32`, ne jamais réutiliser la valeur de dev |
| `FRONTEND_ORIGIN` | URL Vercel du frontend, ex. `https://mediguide.vercel.app` — à revenir mettre à jour après l'étape 3 |
| `NODE_ENV` | `production` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | optionnel, voir 1. Prérequis |

`PORT` n'est pas à définir : Railway l'injecte automatiquement et
`server.js` le lit déjà via `process.env.PORT`.

### 2.5 Premier déploiement et seed des données

1. Railway build et démarre automatiquement (`npm start` = `node server.js`,
   défini dans `railway.json`). Au premier démarrage, `sequelize.sync({
   alter: true })` crée les tables.
2. **Importer les CSV une seule fois**, en local avec les variables de prod :
   ```bash
   cd backend
   railway link          # relie ce dossier au projet Railway
   railway run npm run seed
   ```
   ⚠️ **`npm run seed` fait un `TRUNCATE ... CASCADE` sur la table
   `Facility`** avant de réimporter les CSV : il supprime aussi en cascade
   les disponibilités, rendez-vous et avis existants. Ne l'exécuter qu'une
   fois au tout début, jamais dans un script de démarrage automatique.
3. Vérifier : `https://<votre-projet>.up.railway.app/health` doit répondre
   `{"status":"ok"}`, et `/api/docs` doit afficher la documentation Swagger.

### 2.6 Compte administrateur

```bash
railway run node createAdmin.js
```
(adapter si le script attend des arguments — voir `backend/createAdmin.js`).

---

## 3. Frontend sur Vercel

### 3.1 Créer le projet

1. Vercel → **Add New → Project** → sélectionner le même dépôt GitHub.
2. **Root Directory** : `frontend`.
3. Vercel détecte Vite automatiquement (`vercel.json` déjà présent dans
   `frontend/` précise `buildCommand`, `outputDirectory: dist`, et les
   rewrites nécessaires pour que le routing React (`react-router` côté
   client) fonctionne sur un rafraîchissement de page).

### 3.2 Variable d'environnement

**Project Settings → Environment Variables** :

| Nom | Valeur | Environnements |
|---|---|---|
| `VITE_API_URL` | `https://<votre-projet>.up.railway.app/api` | Production, Preview, Development |

Redéployer après ajout (Vercel ne réinjecte pas les variables dans un build
déjà fait).

### 3.3 Domaine personnalisé + HTTPS

1. **Project Settings → Domains → Add**, saisir le domaine (ex.
   `mediguide.tn` ou un sous-domaine `app.mediguide.tn`).
2. Vercel indique les enregistrements DNS à créer chez votre registrar :
   - domaine racine → enregistrement `A` vers `76.76.21.21`
   - sous-domaine → `CNAME` vers `cname.vercel-dns.com`
3. **HTTPS est automatique** : une fois le DNS propagé (quelques minutes à
   24h), Vercel émet et renouvelle seul un certificat Let's Encrypt — rien
   à configurer côté projet.
4. Revenir sur Railway (étape 2.4) et mettre à jour `FRONTEND_ORIGIN` avec
   le domaine final, pour que CORS l'autorise.

---

## 4. Option B — déploiement via GitHub Actions

Si vous préférez que le déploiement passe par la CI (jobs déjà écrits dans
`.github/workflows/ci.yml`, gated sur `main` + tests verts) :

1. Désactiver le déploiement automatique GitHub dans Railway et Vercel
   (sinon vous auriez deux déploiements concurrents à chaque push).
2. Dans **GitHub → Settings → Secrets and variables → Actions**, ajouter :
   - `RAILWAY_TOKEN` (Railway → Account Settings → Tokens → New Token)
   - `VERCEL_TOKEN` (Vercel → Account Settings → Tokens)
   - `VERCEL_ORG_ID` et `VERCEL_PROJECT_ID` (dans `frontend/.vercel/project.json`
     après un premier `vercel link` en local)
3. Un push sur `main` avec tests verts déclenche alors
   `deploy-backend-railway` et `deploy-frontend-vercel` automatiquement.

---

## 5. Vérification finale

- [ ] `https://<backend>.up.railway.app/health` → `{"status":"ok"}`
- [ ] `https://<backend>.up.railway.app/api/docs` → Swagger UI visible
- [ ] `https://<domaine-frontend>` → HTTPS actif (cadenas navigateur)
- [ ] Recherche + carte fonctionnent (CORS correctement configuré entre les
      deux)
- [ ] Un compte patient peut se connecter et réserver un créneau de bout en
      bout (le scénario testé par `frontend/e2e/booking.spec.js`)
