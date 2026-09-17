# MédiGuide — S9/S10 finalisation

## S9 préparé dans le projet

- Railway configuré avec `backend/railway.json`.
- Healthcheck `/health`.
- Vercel configuré avec SPA rewrite.
- Cache des assets statiques configuré.
- Variables de production documentées dans `backend/.env.example` et `frontend/.env.production.example`.
- CI GitHub Actions couvre tests, build, E2E et audit Lighthouse.
- Les jobs de déploiement Railway/Vercel sont prêts et utilisent des secrets GitHub.

## Actions qui nécessitent les comptes du propriétaire

1. Créer le projet Railway.
2. Ajouter PostgreSQL et activer PostGIS.
3. Ajouter Redis.
4. Configurer les variables Railway.
5. Déployer le backend et vérifier `/health` et `/api/docs`.
6. Créer le projet Vercel avec `frontend` comme dossier racine.
7. Ajouter `VITE_API_URL` avec l'URL Railway.
8. Déployer le frontend.
9. Ajouter le domaine personnalisé.
10. Vérifier HTTPS.

Ces étapes ne peuvent pas être exécutées depuis le ZIP sans accès aux comptes Railway, Vercel, DNS et GitHub du propriétaire.

## S10

- Optimisation SQL et index validés dans `S10_AUDIT.md`.
- Métadonnées HTML et `lang=fr` corrigés.
- Focus clavier renforcé.
- Support `prefers-reduced-motion` ajouté.
- Images de profil avec texte alternatif.
- Contrôles icon-only critiques avec `aria-label`.
- Lighthouse CI configuré avec seuil de 85 pour performance et accessibilité.

Pour valider le score final, lancer sur le frontend :

```bash
npm ci
npm run build
npm run preview -- --host 127.0.0.1
npx lighthouse http://127.0.0.1:4173 --only-categories=performance,accessibility,best-practices
```

Le score Lighthouse dépend de l'environnement d'exécution et doit être mesuré après le build.
