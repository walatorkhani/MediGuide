-- MédiGuide S10 — vérification des requêtes SQL lentes
-- À exécuter dans PostgreSQL après avoir chargé les données de test.
-- Ne modifie aucune donnée : EXPLAIN ANALYZE mesure uniquement l'exécution.

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1) Recherche géographique (équivalent à la recherche "Autour de moi").
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  id, nom, category, specialite,
  ST_Distance(
    location,
    ST_SetSRID(ST_MakePoint(8.78, 36.50), 4326)::geography
  ) AS distance_m
FROM "Facilities"
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(8.78, 36.50), 4326)::geography,
  5000
)
ORDER BY distance_m
LIMIT 20;

-- 2) Recherche texte nom + spécialité.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, nom, specialite
FROM "Facilities"
WHERE
  to_tsvector(
    'simple',
    coalesce(nom, '') || ' ' || coalesce(specialite, '')
  ) @@ plainto_tsquery('simple', 'cardiologie')
LIMIT 20;

-- 3) Avis approuvés utilisés pour la moyenne.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  AVG(note) AS moyenne,
  COUNT(id) AS total
FROM "Reviews"
WHERE "facilityId" = 1
  AND statut = 'approuve';
