\# MediGuide



\*\*MediGuide\*\* est une application web dédiée à la recherche de produits médicaux et à la mise en relation entre patients, pharmacies, parapharmacies et professionnels de santé.



L'application permet aux utilisateurs de rechercher des établissements, consulter leurs informations et envoyer des demandes concernant la disponibilité des produits.



\---



\## 🚀 Démarrer MediGuide



\### Prérequis



Avant de démarrer l'application, installez :



\* \*\*Node.js\*\*

\* \*\*PostgreSQL\*\*

\* \*\*Git\*\*



Le projet utilise également Redis pour certaines fonctionnalités de cache. Si Redis n'est pas disponible, l'application peut continuer son fonctionnement sans le cache Redis.



\### 1. Cloner le projet



```bash

git clone https://github.com/walatorkhani/Medogui.git

cd Medogui

```



\### 2. Configurer le Backend



```bash

cd backend

npm install

```



Créez ensuite votre fichier `.env` à partir des variables nécessaires au projet.



> ⚠️ Le fichier `.env` contient des informations confidentielles et ne doit jamais être publié sur GitHub.



\### 3. Préparer la base de données



Après avoir configuré PostgreSQL et le fichier `.env`, exécutez les migrations :



```bash

npx sequelize-cli db:migrate

```



\### 4. Démarrer le Backend



```bash

node server.js

```



Le serveur API sera disponible sur :



\*\*http://localhost:5000\*\*



\---



\## 🌐 Démarrer le Frontend



Ouvrez un \*\*deuxième terminal\*\* depuis le dossier principal :



```bash

cd frontend

npm install

npm run dev

```



L'application sera disponible sur :



\*\*http://localhost:5173\*\*



\---



\## 🔐 Système de licence



MediGuide intègre un système de licence propriétaire permettant de contrôler l'utilisation de l'application.



Chaque licence possède notamment :



\* une clé de licence unique ;

\* une date d'émission ;

\* une date d'expiration ;

\* un nombre maximal d'activations ;

\* un statut (`active`, `inactive`, `expired` ou `revoked`).



\### Générer une licence



Depuis le dossier `backend` :



```bash

node scripts/generateLicense.js

```



La licence générée est configurée par défaut pour :



\* \*\*Durée : 1 an\*\*

\* \*\*Nombre maximal d'activations : 1\*\*



\### Activer une licence



```bash

node scripts/activateLicense.js "VOTRE\_LICENCE"

```



L'activation peut également être effectuée directement depuis l'interface de MediGuide.



> 🔒 Ne publiez jamais une clé de licence réelle sur GitHub.



\---



\## 👥 Fonctionnalités principales



\### 👤 Patient



\* Création d'un compte.

\* Vérification de l'adresse e-mail.

\* Connexion sécurisée.

\* Recherche de produits médicaux.

\* Recherche de pharmacies et parapharmacies.

\* Consultation des informations des établissements.

\* Recherche selon la localisation.

\* Envoi de demandes concernant la disponibilité d'un produit.

\* Consultation des réponses des établissements.

\* Gestion des rendez-vous.

\* Consultation de l'historique.

\* Gestion du profil.



\### 💊 Pharmacie



\* Gestion du profil de la pharmacie.

\* Consultation des demandes des patients.

\* Réponse concernant la disponibilité des produits.

\* Gestion des disponibilités.

\* Gestion des rendez-vous.

\* Gestion des informations de l'établissement.



\### 🧴 Parapharmacie



\* Gestion du profil.

\* Réception des demandes des patients.

\* Réponse concernant la disponibilité des produits.

\* Gestion des disponibilités.

\* Gestion des rendez-vous.

\* Gestion des informations de l'établissement.



\### 👨‍⚕️ Professionnel de santé



\* Gestion du profil professionnel.

\* Gestion des disponibilités.

\* Gestion des rendez-vous.

\* Consultation des informations liées aux patients.

\* Tableau de bord professionnel.



\### 👨‍💼 Administrateur



\* Tableau de bord administratif.

\* Gestion des utilisateurs.

\* Gestion des établissements.

\* Gestion des médecins.

\* Gestion des avis.

\* Consultation des statistiques.

\* Gestion des différentes fonctionnalités de la plateforme.



\---



\## 🔎 Recherche de produits



MediGuide permet au patient de rechercher un produit médical et d'envoyer une demande aux établissements concernés.



Le système permet ainsi de faciliter la communication entre :



```text

Patient

&#x20;  │

&#x20;  │ Recherche d'un produit

&#x20;  ▼

MediGuide

&#x20;  │

&#x20;  ├──► Pharmacie

&#x20;  │

&#x20;  └──► Parapharmacie

&#x20;          │

&#x20;          ▼

&#x20;     Disponibilité

&#x20;          │

&#x20;          ▼

&#x20;       Patient

```



\---



\## 🗺️ Localisation



L'application intègre des fonctionnalités de localisation permettant notamment de rechercher des établissements selon leur position.



Les utilisateurs peuvent consulter les établissements disponibles et accéder à leurs informations depuis l'interface de recherche.



\---



\## 📧 Vérification de l'adresse e-mail



Lors de l'inscription, MediGuide utilise un système de vérification par code.



Le processus est :



```text

Inscription

&#x20;   ↓

Création du compte

&#x20;   ↓

Envoi du code de vérification

&#x20;   ↓

Saisie du code

&#x20;   ↓

Compte vérifié

&#x20;   ↓

Connexion

```



La configuration SMTP doit être réalisée dans le fichier `.env`.



\---



\## 🛡️ Sécurité



MediGuide intègre plusieurs mécanismes de sécurité :



\* Authentification utilisateur.

\* Authentification par token.

\* Gestion des sessions.

\* Protection CSRF.

\* Gestion des rôles.

\* Gestion des permissions.

\* Rate limiting.

\* Validation des données.

\* Vérification des licences.

\* Signature cryptographique des clés de licence.

\* Protection des variables sensibles via `.env`.



\### ⚠️ Fichiers confidentiels



Ne publiez jamais :



```text

.env

LICENSE\_SECRET

Mot de passe PostgreSQL

Mot de passe SMTP

Clés API privées

Tokens privés

Clés de licence réelles

```



\---



\## 🏗️ Organisation du projet



```text

MediGuide/

│

├── backend/

│   ├── config/

│   ├── middleware/

│   ├── migrations/

│   ├── models/

│   ├── routes/

│   ├── scripts/

│   ├── tests/

│   ├── utils/

│   └── server.js

│

├── frontend/

│   ├── public/

│   ├── src/

│   │   ├── components/

│   │   ├── context/

│   │   ├── i18n/

│   │   ├── pages/

│   │   ├── services/

│   │   └── assets/

│   ├── package.json

│   └── vite.config.js

│

├── data/

├── docs/

├── docker-compose.yml

├── .gitignore

└── README.md

```



\---



\## 🧪 Tests



\### Backend



Depuis `backend` :



```bash

npm test

```



\### Frontend



Les tests et scénarios End-to-End sont configurés avec Playwright.



```bash

cd frontend

npx playwright test

```



\---



\## 🐳 Docker



Le projet contient également un fichier :



```text

docker-compose.yml

```



permettant de préparer une exécution avec Docker.



Pour utiliser Docker Compose :



```bash

docker compose up --build

```



Pour arrêter les conteneurs :



```bash

docker compose down

```



> La configuration Docker peut nécessiter une adaptation des variables d'environnement selon l'environnement de déploiement.



\---



\## 🛑 Arrêter l'application



Pour arrêter le Backend ou le Frontend lancé dans un terminal :



```text

Ctrl + C

```



Si Docker Compose est utilisé :



```bash

docker compose down

```



\---



\## 📚 Technologies utilisées



\### Backend



\* Node.js

\* Express.js

\* Sequelize

\* PostgreSQL

\* Redis

\* JWT

\* Jest

\* Supertest



\### Frontend



\* React

\* Vite

\* Axios

\* CSS

\* Playwright



\### Sécurité



\* CSRF Protection

\* Authentication

\* Authorization

\* Rate Limiting

\* Cryptographic License Verification



\---



\## 📄 Licence



MediGuide est un logiciel propriétaire.



Le code source et les éléments de l'application sont distribués selon les conditions définies par le propriétaire du projet.



Toute copie, modification, redistribution ou utilisation commerciale doit être autorisée par le propriétaire.



\---



\## 📌 Dépôt GitHub



Projet disponible sur :



\*\*https://github.com/walatorkhani/MediGuide\*\*



\---



\## 👨‍💻 Projet



\*\*MediGuide\*\*



Application de recherche et de gestion des produits médicaux destinée à faciliter la communication entre patients et établissements de santé.



