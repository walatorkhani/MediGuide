# Semaine 3 — Rendez-vous (ajouté)

Le projet contenait déjà S1 (init Node/PostgreSQL/PostGIS, init React/Vite/Leaflet,
auth JWT) et S2 (API médecins CRUD + recherche par rayon `ST_DWithin`, carte
interactive avec filtres, fiche médecin en lecture seule avec note en étoiles).

Ce qui a été ajouté ici correspond à S3 : disponibilités, tunnel de RDV,
« Mes rendez-vous », annulation.

## Backend

- `models/Availability.js` — un créneau (`date`, `heureDebut`, `heureFin`, `estReserve`) rattaché à une `Facility`.
- `models/Appointment.js` — un rendez-vous (`statut: confirme|annule`, `motif`) rattaché à une `Availability` et à un `User` (patient).
- `models/associations.js` — associations Sequelize (Facility↔User via `ownerId`, Facility→Availability, Availability→Appointment, User→Appointment). Chargé une fois depuis `server.js`.
- `models/Facility.js` — ajout du champ `ownerId` (nullable) pour permettre à un compte professionnel de gérer une fiche existante.
- `routes/disponibilites.js` :
  - `GET /api/facilities/:facilityId/disponibilites?date=` — créneaux futurs et libres (public, utilisé par le tunnel de RDV).
  - `GET /api/disponibilites/mine` — tous les créneaux du professionnel connecté, avec le patient s'ils sont réservés.
  - `POST /api/disponibilites` — génère un lot de créneaux à partir d'une plage horaire + durée ; détecte et ignore les chevauchements avec les créneaux existants (gestion des conflits).
  - `DELETE /api/disponibilites/:id` — supprime un créneau non réservé (propriétaire uniquement).
- `routes/rendezvous.js` :
  - `POST /api/rendezvous` — réservation avec transaction + verrou de ligne (`SELECT ... FOR UPDATE`) pour éviter qu'un créneau soit réservé deux fois (conflit de réservation → 409).
  - `GET /api/rendezvous/mes` — liste des rendez-vous du patient connecté.
  - `PATCH /api/rendezvous/:id/annuler` — annulation ; libère le créneau associé.
- `routes/facilities.js` — ajout de `PATCH /api/facilities/:id/revendiquer` (un professionnel se rattache à une fiche existante) et `GET /api/facilities/mine/liste`.
- `server.js` — montage des nouvelles routes + `sequelize.sync({ alter: true })` pour ajouter automatiquement les nouvelles colonnes/tables (à remplacer par de vraies migrations avant mise en production).

## Frontend

- `components/BookingTunnel.jsx` — tunnel de prise de RDV en 3 étapes (date → créneau → confirmation), en modale.
- `pages/FacilityDetails.jsx` — bouton « Prendre rendez-vous » (uniquement pour la catégorie `medecin`, visible différemment selon le statut de connexion/rôle).
- `pages/MesRendezVous.jsx` — nouvelle page patient : rendez-vous à venir / passés-annulés, avec annulation.
- `pages/ProfessionnelSpace.jsx` — remplace le stub : recherche + rattachement d'une fiche existante, génération de créneaux, liste des créneaux avec le patient s'ils sont réservés, suppression des créneaux libres.
- `App.jsx` — route `/mes-rendez-vous` (rôle patient).
- `components/Navbar.jsx` — lien « Mes rendez-vous » pour les patients connectés.
- `services/api.js` — nouvelles fonctions : `getDisponibilites`, `reserverCreneau`, `getMesRendezVous`, `annulerRendezVous`, `getMesFacilities`, `revendiquerFacility`, `getMesDisponibilites`, `creerDisponibilites`, `supprimerDisponibilite`.

## Pour tester

```bash
cd backend && npm install && npm run dev   # nécessite PostgreSQL + PostGIS, voir .env
cd frontend && npm install && npm run dev
```

# Semaine 4 — Avis + tableau de bord professionnel (ajouté)

- `models/Review.js` — avis (`note` 1-5, `commentaire`), un seul avis par patient et par fiche (index unique).
- `routes/avis.js` :
  - `GET /api/facilities/:facilityId/avis?page=&limit=` — liste paginée + moyenne calculée côté SQL (`AVG`/`COUNT`).
  - `POST /api/facilities/:facilityId/avis` — publication (patient connecté, un seul avis par fiche).
  - `DELETE /api/avis/:id` — suppression (auteur uniquement).
  - Après chaque création/suppression, `Facility.noteAvis` est recalculée et persistée (moyenne toujours à jour sur la recherche/la carte).
- `routes/rendezvous.js` — `GET /api/rendezvous/aujourdhui` : rendez-vous confirmés du jour du professionnel connecté, pour le tableau de bord.
- Frontend : `components/AvisSection.jsx` (formulaire étoiles + liste paginée, intégré à `FacilityDetails.jsx`) ; `pages/ProfessionnelSpace.jsx` — onglet « Aujourd'hui » (liste des RDV du jour, heure + patient).

# Semaine 5 — E-mails, géolocalisation, profil (ajouté)

- **Confirmation par e-mail (Nodemailer)** : `utils/mailer.js` (transporteur SMTP configurable via `.env`, simule/journalise si non configuré) ; un e-mail est envoyé au patient dès la réservation confirmée dans `routes/rendezvous.js`.
- **Rappel 24h avant** : `jobs/rappels.js` — tâche planifiée (`node-cron`, toutes les 15 min) qui envoie un e-mail de rappel aux RDV confirmés dont le créneau tombe dans 23-25h, puis marque `Appointment.rappelEnvoye = true` pour ne pas le renvoyer. Démarrée depuis `server.js` après la connexion à PostgreSQL.
- **Géolocalisation navigateur + bouton « Autour de moi »** : déjà présent (implémenté en S2/S5 précédemment, voir `pages/Search.jsx` → `handleNearMe`) — rien à ajouter, vérifié fonctionnel.
- **Gestion du profil professionnel (photo, bio, horaires)** :
  - Backend : champs `bio`/`photoUrl` sur `Facility`, upload via `multer` (`middleware/uploadPhoto.js`, 3 Mo max, jpg/png/webp), route `PATCH /api/facilities/:id/profil` (propriétaire uniquement), fichiers servis statiquement sur `/uploads`.
  - Frontend : onglet « Profil » dans `ProfessionnelSpace.jsx` (aperçu photo, upload, bio, horaires) ; affichage de la photo/bio sur `FacilityDetails.jsx`.

## Nouvelles dépendances backend

```bash
cd backend && npm install   # ajoute nodemailer, node-cron, multer
```

## Variables d'environnement

Voir `backend/.env.example` pour les variables SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). Sans elles, les e-mails sont journalisés dans la console au lieu d'être envoyés — pratique pour tester sans compte SMTP.

