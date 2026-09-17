# MédiGuide — S7

## Ajouts
- Redis : cache des recherches géographiques pendant 60 secondes.
- Sessions JWT : access token 15 min + refresh token 7 jours stockés dans Redis.
- Rate limiting : API 300/15 min, authentification 10/15 min.
- Validation Zod : register/login.
- Protection CSRF : cookie `csrf_token` + header `X-CSRF-Token` sur les méthodes non sûres.
- Helmet + CORS restrictif + limite JSON.
- Responsive mobile : recherche/carte mobile déjà prévue, complétée par styles responsive.
- Skeleton loaders : composant existant conservé et micro-interactions ajoutées.
- Axios : renouvellement automatique du JWT à l'expiration.

## Préparation
1. Installer Redis et le démarrer sur `redis://localhost:6379`.
2. Dans `backend`, exécuter `npm install`.
3. Vérifier `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL` et `FRONTEND_ORIGIN`.
4. Démarrer le backend avec `npm run dev`.
5. Dans `frontend`, exécuter `npm install` puis `npm run dev`.

## Note
Le backend démarre même si Redis est temporairement indisponible : la recherche n'utilisera alors pas le cache et les sessions Redis ne seront pas activées. Pour valider complètement S7, Redis doit être disponible.
