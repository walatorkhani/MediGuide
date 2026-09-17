# MédiGuide — version finalisée

Cette version reprend le cahier des charges fourni.

## Parcours utilisateur

- Page logo sur `/bienvenue`
- Inscription patient ou professionnel
- Choix médecin, pharmacie ou parapharmacie
- Vérification de l'e-mail par code à 6 chiffres
- Connexion JWT
- Permissions RBAC par rôle
- Redirection vers le dashboard adapté
- Dashboard patient
- Dashboard professionnel pour médecin, pharmacie et parapharmacie
- Dashboard administrateur
- Recherche, carte, rendez-vous, avis et gestion des profils déjà présents dans le projet

## Vérification e-mail

En production, configurez SMTP dans `backend/.env`.

Sans SMTP en développement, l'API retourne le code de test dans la réponse d'inscription. L'interface l'affiche uniquement en mode développement.

Le code expire après 10 minutes.

## Démarrage Windows

Double-cliquez sur `LANCER-MEDIGUIDE.bat`.

Ou lancez séparément :

```text
cd backend
npm install
npm run dev
```

Puis :

```text
cd frontend
npm install
npm run dev
```

Frontend : http://localhost:5173

Backend : http://localhost:5000

## Base de données

PostgreSQL doit contenir la base `mediguide`.

Le démarrage vérifie et ajoute les trois colonnes de vérification e-mail si elles manquent.

La migration correspondante se trouve dans `backend/migrations/20260901000000-add-email-verification.js`.

## Production

Configurez au minimum :

- DATABASE_URL
- JWT_SECRET
- FRONTEND_ORIGIN
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASSWORD
- SMTP_FROM
- REDIS_URL

Ne mettez pas de secret réel dans Git.

## Référence fonctionnelle

Le cahier des charges demande notamment React/Vite, Node/Express, JWT access court + refresh rotatif, Nodemailer, PostgreSQL/PostGIS, Redis, géolocalisation, RBAC, recherche, rendez-vous, avis et espaces patient/professionnel/admin.

## Vérification e-mail en développement

Sans SMTP valide, l inscription ne bloque pas. Le backend affiche le code dans la réponse et la page de vérification l affiche en mode développement.

Pour recevoir le code dans une vraie boîte e-mail, renseignez dans `backend/.env` un SMTP valide. Avec Gmail, utilisez un mot de passe d application et non le mot de passe normal du compte.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=votre-adresse@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-d-application
SMTP_FROM="MédiGuide <votre-adresse@gmail.com>"
```

Redémarrez le backend après toute modification de `.env`.

## Langues de la navbar

Le sélecteur Français / English / العربية agit uniquement sur le contenu de la navbar. Le reste de l application garde son contenu en français.
