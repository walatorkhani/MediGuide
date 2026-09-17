# MédiGuide — Recherche, carte & géolocalisation

Ce qui a été ajouté sans toucher à l'authentification existante (register/login/me,
JWT, rôles, tables User) :

## Backend

- `models/Facility.js` — table unique pour médecins/pharmacies/parapharmacies,
  avec une colonne `location` en `GEOGRAPHY(Point, 4326)` (PostGIS).
- `scripts/seedFacilities.js` — active l'extension PostGIS, crée un index GiST
  sur `location`, puis importe les 3 CSV du dossier `data/`.
- `routes/facilities.js` — `GET /api/facilities` (recherche avec filtres
  `category`, `q`, `specialite`, `ville`, `lat`/`lng`/`radius` via
  `ST_DWithin`/`ST_Distance`) et `GET /api/facilities/:id` (détails).
- `server.js` — une seule ligne ajoutée pour brancher ce nouveau routeur.

### Mise en route

```bash
cd backend
npm install
npm run seed   # crée la table Facility, l'extension PostGIS, l'index GiST
                # et importe les médecins/pharmacies/parapharmacies
npm run dev
```

Prérequis : PostgreSQL avec l'extension PostGIS disponible sur le serveur
(`CREATE EXTENSION postgis` doit pouvoir s'exécuter avec l'utilisateur de
`DATABASE_URL`).

## Frontend

- Tailwind CSS v4 (plugin Vite) + palette "médicale" définie dans `index.css`.
- Leaflet / React-Leaflet conservés comme demandé (`components/MapView.jsx`).
- React Query pour la recherche (`pages/Search.jsx`) et la fiche détail
  (`pages/FacilityDetails.jsx`).
- `components/SearchBar.jsx` : sélection Médecin/Pharmacie/Parapharmacie,
  recherche par nom, filtre spécialité, ville, rayon, bouton
  « 📍 Autour de moi » (géolocalisation navigateur).
- `components/FacilityCard.jsx` / `FacilityCardSkeleton.jsx` : cartes de
  résultats avec badges par catégorie et état de chargement.
- `components/Navbar.jsx` : navbar commune à toutes les pages.
- La page d'accueil (`/`) est maintenant la recherche ; l'authentification
  (`/login`, `/register`, `/dashboard`) est inchangée.
- Nouvelle route `/etablissement/:id` pour la fiche détaillée.

### Mise en route

```bash
cd frontend
npm install
npm run dev
```

## Prochaines étapes suggérées

- Redis : cache des recherches géographiques fréquentes (par ville/rayon).
- Refresh token rotatif (actuellement un seul access token JWT, 1 jour).
- Table d'avis polymorphique + prise de rendez-vous (mentionnées dans le
  cahier des charges mais pas encore implémentées).
- Tests Jest/Supertest sur `routes/facilities.js` et E2E Playwright sur le
  parcours de recherche.
