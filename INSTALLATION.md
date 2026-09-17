# Guide d'installation — MédiGuide

## Prérequis

- Node.js ≥ 20
- Docker Desktop (recommandé — voir option A ci-dessous : plus besoin
  d'installer PostgreSQL/PostGIS/Redis vous-même)

Si vous préférez ne pas utiliser Docker, il faut à la place PostgreSQL ≥ 14
avec l'extension **PostGIS** disponible (`CREATE EXTENSION postgis` doit
pouvoir s'exécuter) et Redis installés localement (option B ci-dessous).

## 1. Cloner et configurer le backend

```bash
cd backend
npm install
```

⚠️ Ne JAMAIS lancer `npm audit fix --force` sur ce projet : cela installe
des versions majeures incompatibles (ex. sequelize 3.x au lieu de 6.x) et
casse l'application (`connection.query(...).on is not a function`). Les
avertissements de vulnérabilités affichés par `npm install` sont normaux
pour un projet pédagogique et sans risque en local.

Le fichier `backend/.env` est déjà fourni avec des valeurs par défaut
fonctionnelles (mot de passe PostgreSQL `0000`, base `mediguide`,
`JWT_SECRET` de développement). Vous n'avez rien à modifier si vous
utilisez l'option A ci-dessous.

### Option A — Base de données + Redis via Docker (recommandé)

```bash
cd ..
docker compose up -d
```

Ceci démarre un PostgreSQL avec PostGIS déjà installé, et Redis, avec des
identifiants qui correspondent **exactement** à ceux déjà présents dans
`backend/.env` — aucune configuration supplémentaire n'est nécessaire.
Vérifier que les conteneurs tournent : `docker compose ps`.

### Option B — PostgreSQL/Redis installés localement

Ouvrir `backend/.env` et adapter `DATABASE_URL` avec le mot de passe réel
de votre compte PostgreSQL local, ex. :
`postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/mediguide`
(Sur Windows, ce mot de passe a été défini pendant l'installation de
PostgreSQL — utilisez pgAdmin, installé avec PostgreSQL, si vous devez le
retrouver ou le réinitialiser.) Le backend démarre même sans Redis
disponible (cache et sessions Redis simplement désactivés).

### Créer la base et importer les données

```bash
cd backend
npm run seed
```

Ce script active PostGIS, crée la table `Facility` avec son index GiST, et
importe les 3 CSV (`data/medecins_jendouba.csv`,
`data/pharmacies_jendouba (2).csv`, `data/parapharmacies_jendouba.csv`).

⚠️ Il vide (`TRUNCATE ... CASCADE`) la table `Facility` avant réimport — ne
le relancer que si vous acceptez de perdre les disponibilités/rendez-vous/
avis déjà créés en local.

### Lancer le backend

```bash
npm run dev
```

- API sur http://localhost:5000
- Documentation interactive : http://localhost:5000/api/docs
- Health check : http://localhost:5000/health

## 2. Configurer et lancer le frontend

Dans un second terminal :

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

- App sur http://localhost:5173
- `.env` pointe par défaut vers `http://localhost:5000/api` (backend local)

## 3. Compte administrateur

```bash
cd backend
node createAdmin.js
```

## 4. Lancer les tests

```bash
# Backend
cd backend
npm test                # tests unitaires
npm run test:coverage   # avec rapport de couverture (voir TESTS.md)

# Frontend
cd frontend
npm test
npm run test:coverage

# E2E (nécessite backend + frontend démarrés, voir TESTS.md pour les
# variables E2E_PATIENT_EMAIL / E2E_PATIENT_PASSWORD / E2E_FACILITY_ID)
cd frontend
npx playwright install chromium
npm run test:e2e
```

## 5. Déploiement

Voir `DEPLOIEMENT.md` pour Railway (backend), Vercel (frontend), domaine
personnalisé et CI GitHub Actions.

## Dépannage

- **`CREATE EXTENSION postgis` échoue** : l'utilisateur PostgreSQL doit
  avoir les droits superuser, ou l'extension doit être pré-installée sur le
  serveur (`sudo apt install postgresql-16-postgis-3` sous Ubuntu, ou image
  Docker `postgis/postgis`).
- **Erreur `React is not defined` sur les tests frontend** : corrigée en
  alignant `vitest` en version 4.x (voir `TESTS.md`) — si elle réapparaît
  après une mise à jour de dépendances, vérifier avec
  `npm ls vitest vite @vitejs/plugin-react` qu'une seule version majeure de
  Vite est résolue dans l'arbre de dépendances.
- **Les e-mails ne partent pas** : normal sans variables `SMTP_*` — ils
  sont journalisés dans la console du backend à la place.
