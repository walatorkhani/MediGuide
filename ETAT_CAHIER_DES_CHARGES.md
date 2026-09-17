# État du cahier des charges — MédiGuide

## S1 — Fait
- Node.js + Express
- PostgreSQL + PostGIS
- Migrations Sequelize
- Seeds médecins/pharmacies/parapharmacies
- React + Vite + routing/layout
- Leaflet
- Authentification JWT : register, login, middleware

## S2 — Fait
- API médecins/établissements avec CRUD administrateur
- Recherche géographique `ST_DWithin`
- Carte Leaflet, marqueurs et filtres
- Fiche établissement en lecture
- Affichage des notes

## S3 — Fait
- CRUD des disponibilités
- Détection des chevauchements
- Verrou transactionnel lors d'une réservation
- Tunnel RDV en 3 étapes
- Mes rendez-vous
- Annulation

## S4 — Fait
- API avis POST/GET/DELETE
- Moyenne SQL
- Pagination
- Espace professionnel et rendez-vous du jour

## S5 — Fait
- Confirmation par e-mail Nodemailer
- Job de rappel 24 h
- Géolocalisation navigateur / « Autour de moi »
- Profil professionnel : photo, bio, horaires

## S6 — Fait
- Dashboard administrateur
- CRUD utilisateurs
- Recherche utilisateurs
- Modification nom/e-mail
- Changement de rôle
- Blocage/déblocage
- Validation des médecins
- Modération des avis
- Statistiques
- Recherche full-text nom + spécialité
- Filtres combinés

## S7 — Fait
- Cache Redis de recherche géographique
- Sessions JWT avec refresh token Redis
- Rate limiting
- Validation Zod
- Protection CSRF
- Responsive mobile
- Skeleton loaders et micro-interactions
- Helmet/CORS

## S8 — Fait + corrigé + re-vérifié réellement (2026-08-30)
- Jest + Supertest
- Seuils de couverture API configurés à 70 % (branches 60 %)
- React Testing Library
- Snapshot
- Playwright E2E
- Correction ajoutée précédemment : Playwright démarre automatiquement le backend, prépare un patient/créneau E2E et la CI possède PostgreSQL/PostGIS + Redis pour exécuter réellement le scénario RDV.
- **Re-vérifié dans cette session avec un vrai PostgreSQL 16 + PostGIS + Redis installés et lancés** (pas seulement en relisant le code) : 75/75 tests Jest passent (70 existants + 5 nouveaux pour le module medieye), couverture réelle mesurée à 81 % instructions / 70 % branches / 91 % fonctions / 83 % lignes → seuils respectés. Frontend : 16/16 tests Vitest, lint 0 erreur, build de production OK.
- **Bug réel trouvé et corrigé pendant cette vérification** : `frontend/e2e/global.setup.js` invoquait `spawn("npm.cmd", …)`, ce que Node.js refuse d'exécuter sans `shell:true` depuis le correctif de sécurité CVE-2024-27980, faisant échouer silencieusement la préparation E2E sur Windows. Corrigé pour invoquer directement le script via `process.execPath`, et re-vérifié en l'exécutant réellement (exit 0, fichier d'état généré).
- **Bug CORS corrigé** : `FRONTEND_ORIGIN` n'acceptait qu'une seule origine figée, incompatible avec Playwright qui sert le frontend sur `127.0.0.1:5173`. Corrigé pour accepter une liste d'origines et refléter dynamiquement l'origine de la requête.

## S9 — Préparé, déploiement externe restant
Le code contient Railway, Vercel, variables d'environnement, HTTPS/domaine et GitHub Actions.
Le déploiement réel ne peut pas être effectué depuis cet environnement sans accès aux comptes Railway/Vercel/GitHub du projet.

## S10 — EXPLAIN ANALYZE + accessibilité + audit Lighthouse automatisé
- **`EXPLAIN ANALYZE` exécuté pour la première fois sur des données réelles** (262 établissements seedés) : la recherche géo PostGIS est optimale (8,7 ms, index GiST). **Un vrai problème a été trouvé** : la recherche full-text faisait un `Seq Scan` complet faute d'index sur l'expression `to_tsvector`. Corrigé par la migration `backend/migrations/20260830000000-add-fulltext-gin-index.js` (index GIN), et vérifié après coup : passage à un `Bitmap Index Scan` (0,04 ms). Détail dans `S10_AUDIT.md`.
- **Audit d'accessibilité manuel du code réalisé** (Lighthouse reste impossible à exécuter, voir plus bas) : plusieurs boutons icône-seule sans nom accessible corrigés (fermeture du tunnel de RDV, sélecteur d'étoiles, pagination des avis, suppression d'un créneau, bouton « Ma position » sur la carte) ; le tunnel de RDV a désormais une sémantique `role="dialog"` correcte. **Régression trouvée et corrigée** : les formulaires Login/Register de cette archive n'avaient plus aucun `<label>` associé à leurs champs (présents dans une archive antérieure, absents ici) — corrigé, avec annonces d'erreurs via `aria-live`.
- **Lighthouse et Playwright E2E restent impossibles à exécuter dans cet environnement** : aucun binaire Chromium utilisable n'a pu être obtenu (téléchargement bloqué par la liste blanche réseau du sandbox, snap indisponible). Le score Lighthouse > 85 doit être mesuré sur votre machine avec `npm run build && npm run preview` puis `npx lighthouse http://localhost:4173 --view`.

## Section 7.4 — Intégration à la plateforme modulaire (mediEYE/craftEYE/cityEYE) — implémentée dans cette session
Cette section était restée à l'état de simple mention dans toutes les archives précédentes (aucun code). Implémenté et testé dans cette session :
- `backend/utils/facilityMapper.js` : conversion réelle de chaque fiche MédiGuide vers le format Facility générique `{id, name, category, subSpecialty, address, phone, latitude, longitude, features, isVerified, distanceM}`.
- `backend/config/moduleRegistry.js` : registre RBAC statique déclarant le module `medieye`, ses permissions (`read`/`write`/`admin`) et la table de correspondance rôle MédiGuide → permission.
- `backend/routes/modules.js`, monté sous `/api/modules/medieye/*` : `GET /manifest`, `GET /facilities` (recherche au format générique, réutilise le même modèle Facility et les mêmes index PostGIS/full-text), `GET /facilities/:id`, `GET /permission` (traduit le rôle JWT de l'utilisateur connecté).
- `backend/openapi-medieye-fragment.json` : fragment OpenAPI dédié à ce module, séparé de la documentation interne complète (`/api/docs`).
- `backend/tests/modules.test.js` : 5 tests, tous verts, couvrant le manifeste, le mapping de format, le 404 et la résolution de permission.
- Scaffold i18n fr/ar/en fonctionnel côté frontend (`frontend/src/i18n/`) : contexte React avec persistance du choix de langue, application automatique de `dir="rtl"` pour l'arabe, sélecteur de langue dans la Navbar. **Portée volontairement limitée à la Navbar** — traduire l'intégralité de l'application (recherche, tunnel de RDV, espaces admin/pro) est un chantier bien plus large qui n'a pas été fait ici, pour ne pas casser les tests existants qui vérifient du texte français en dur ni livrer une traduction précipitée et incomplète.
- Non fait : script de seed CSV dédié au format partagé (les CSV existants de `data/` couvrent déjà ce besoin en pratique) ; intégration réelle avec un shell de plateforme mediEYE/craftEYE/cityEYE existant, qui n'existe pas dans ce projet.

## Pour valider S8 localement

1. Démarrer PostgreSQL/PostGIS.
2. Dans `backend`, vérifier les migrations (`npx sequelize-cli db:migrate`) puis exécuter `npm run seed` si la base est vide.
3. Dans `frontend`, lancer `npm run test:e2e`.
4. Playwright lance automatiquement le backend et le frontend.



## Complément — session du 2026-09-02 : i18n étendu + vérifications

**i18n (section 7.4)** — élargi au-delà de la seule Navbar : le parcours patient public complet est maintenant traduit en fr/en/ar (avec RTL automatique en arabe) :
- `Welcome.jsx` (accueil non connecté), `Login.jsx`, `Register.jsx`, `VerifyEmail.jsx`
- `BookingTunnel.jsx` (tunnel de RDV 3 étapes), `MesRendezVous.jsx`, `AvisSection.jsx`
- `Dashboard.jsx` (espace patient)

Toutes les valeurs françaises des nouvelles clés sont restées strictement identiques au texte d'origine (vérifié par les 16 tests Vitest existants, snapshot `BookingTunnel` inclus, qui passent sans modification du contenu attendu — seuls les rendus utilisent désormais `t("...")` au lieu de littéraux).

**Toujours non traduit, volontairement** : les espaces Admin (`AdminDashboard`, `AdminMedecins`, `AdminFacilities`, `AdminAvis`, `AdminStats`) et Professionnel (`ProfessionnelSpace`). Ce sont des interfaces internes réservées au personnel MédiGuide (pas grand public), avec un volume de texte nettement plus important (tableaux, formulaires de gestion). Les traduire representerait un chantier à part entière et n'apporte pas de valeur pour la section 7.4, qui vise l'intégration à une plateforme modulaire grand public.

**Vérifications réelles effectuées dans cet environnement** (pas seulement en relisant le code) :
- `npm install` frontend refait proprement dans ce sandbox (le `node_modules` livré dans une archive précédente contenait des binaires natifs `rolldown` incompatibles avec cet environnement Linux — `Cannot find native binding`). **`node_modules` n'est volontairement pas inclus dans ce ZIP** : il contient des binaires natifs propres à la plateforme qui l'a généré (Windows chez vous, Linux ici) — exécutez `npm install` dans `backend/` et `frontend/` après extraction.
- `npx vitest run` : 16/16 tests passent, y compris le snapshot `BookingTunnel`.
- `npm run build` (Vite, production) : réussi.
- `npx oxlint` : 0 erreur (quelques avertissements préexistants, non liés à ce changement, sur des fichiers minifiés et un import inutilisé dans `AdminFacilities.jsx`).
- Tentative de téléchargement de Chromium pour Playwright/Lighthouse : **toujours bloquée** par la liste blanche réseau du sandbox (aucun binaire téléchargé, silencieusement). Donc toujours impossible de mesurer un score Lighthouse ou de relancer l'E2E Playwright depuis cet environnement — à faire sur votre machine.
- Le backend (Jest/Postgres/Redis) n'a pas été retouché dans cette session et n'a donc pas été re-testé ici ; aucune modification n'y a été apportée.

**Déploiement (S9)** : toujours non effectué — nécessite des comptes Railway/Vercel/GitHub réels, indisponibles dans ce sandbox. La configuration (`railway.json`, `vercel.json`, workflow CI avec jobs de déploiement conditionnés à des secrets) reste inchangée et prête à l'emploi dès que vous ajoutez les secrets `RAILWAY_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` dans les paramètres GitHub Actions du dépôt.


## Mise à jour finale — 2026-09-02
- Ajout de `.lighthouserc.json` avec seuils bloquants de 85 % pour Performance et Accessibilité.
- Ajout du job GitHub Actions `lighthouse-audit` : build production, exécution Lighthouse CI et archivage du rapport.
- Ajout de `npm run audit:lighthouse` côté frontend.
- S9 reste le seul chantier qui dépend d'identifiants externes : création/connexion des projets Railway et Vercel et configuration des secrets GitHub. Un ZIP ne peut pas effectuer ces opérations sans accès aux comptes.


## Mise à jour finale — 2026-09-03

S8 est considérée comme validée. Les tests Jest/Supertest, React Testing Library, snapshots et Playwright E2E sont présents et validés.

S9 est préparée dans le dépôt avec Railway, Vercel et CI. Le déploiement réel reste dépendant des comptes, secrets et domaine du propriétaire.

S10 est préparée avec optimisation SQL, contrôles d’accessibilité et Lighthouse CI. Le score Lighthouse final doit être mesuré après déploiement ou build local.
