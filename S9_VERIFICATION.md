# S9 — Vérification finale du déploiement

Les configurations Railway/Vercel et GitHub Actions existantes sont conservées.

Après déploiement, vérifier :

1. `GET /health` du backend Railway retourne `{ "status": "ok" }`.
2. `/api/docs` affiche Swagger.
3. Le frontend Vercel charge la route `/`.
4. Un rafraîchissement direct de `/login`, `/etablissement/:id` et
   `/dashboard` ne renvoie pas une 404 grâce au rewrite Vercel.
5. Le frontend utilise l'URL Railway via `VITE_API_URL`.
6. PostgreSQL/PostGIS et Redis sont accessibles depuis Railway.
7. HTTPS est actif sur Railway/Vercel.
8. Le domaine personnalisé pointe vers Vercel.

Les secrets de production ne doivent jamais être ajoutés au ZIP.

## État après préparation finale — 2026-09-02

La configuration de déploiement est prête et la CI contient désormais les étapes de validation qualité S10. Le déploiement effectif Railway/Vercel reste volontairement externe au ZIP : il nécessite les comptes et secrets du propriétaire du dépôt.
