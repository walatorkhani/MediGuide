# MédiGuide — S10 : optimisation SQL, accessibilité et Lighthouse

## 1. EXPLAIN ANALYZE — exécuté réellement (2026-08-30)

`backend/scripts/explain-analyze.sql` a été exécuté pour de vrai sur une
base PostgreSQL 16 + PostGIS 3 seedée avec les 262 établissements réels
(`npm run seed`). Résultats :

| Requête | Plan avant | Plan après correction |
|---|---|---|
| Recherche géo (`ST_DWithin` + tri par distance) | Bitmap Index Scan sur `facilities_location_gist` — **8,7 ms** | inchangé, déjà optimal |
| Recherche full-text (`to_tsvector` + `plainto_tsquery`) | **Seq Scan** complet sur `Facilities` (aucun index sur l'expression) — 0,76 ms sur 262 lignes, ne passerait pas à l'échelle | Bitmap Index Scan sur le nouvel index `facilities_fulltext_gin` — **0,04 ms** |
| Moyenne des avis approuvés | Bitmap Index Scan sur `reviews_facility_id_patient_id` + `reviews_statut` — 0,03 ms | inchangé, déjà optimal |

**Bug réel trouvé et corrigé** : la recherche full-text (utilisée par
`GET /api/facilities?q=...`) n'avait aucun index sur l'expression
`to_tsvector('simple', nom || specialite)`, donc PostgreSQL scannait toute
la table à chaque recherche. Ce n'était pas visible avec seulement 262
lignes, mais serait devenu un vrai goulot d'étranglement à l'échelle.
Corrigé par la migration `backend/migrations/20260830000000-add-fulltext-gin-index.js`
(index GIN sur l'expression exacte utilisée par la route) — à appliquer avec
`npx sequelize-cli db:migrate`. Vérifié après coup : le plan passe bien par
l'index.

Pour reproduire :
```bash
psql "$DATABASE_URL" -f backend/scripts/explain-analyze.sql
```

## 2. Audit WCAG AA


Points à vérifier avant la soutenance :

- chaque image informative possède un `alt` pertinent ;
- les boutons et liens ont un nom accessible ;
- les champs de formulaire ont un label associé ;
- le focus clavier reste visible ;
- l'ordre de navigation au clavier est logique ;
- les erreurs de formulaire sont annoncées clairement ;
- les contrastes texte/fond respectent WCAG AA ;
- aucune information essentielle n'est donnée uniquement par la couleur.

Commande conseillée avec Lighthouse :

```bash
npx lighthouse http://localhost:5173 --only-categories=accessibility --view
```

## 3. Lighthouse performance

Après démarrage du frontend en production :

```bash
npm run build
npm run preview -- --host 0.0.0.0
npx lighthouse http://localhost:4173 --only-categories=performance,accessibility,best-practices --view
```

Objectif du cahier des charges : **score Lighthouse > 85**.

Le score doit être mesuré sur une version de production (`build` + `preview`),
pas sur le serveur Vite de développement.

## 4. Important

Le ZIP ne peut pas certifier un score Lighthouse ou un audit WCAG sans exécuter
ces outils dans l'environnement cible. Les fichiers S10 ajoutés ici fournissent
les contrôles reproductibles sans modifier les fonctionnalités existantes.
