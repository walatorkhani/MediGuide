# Tests MédiGuide

## ✅ État de la couverture backend S8

La couverture backend est désormais contrôlée avec les seuils du cahier des charges :
**70 % statements, 70 % functions, 70 % lines et 60 % branches**.
Le rapport `backend/coverage` présent dans cette archive dépasse ces seuils
(rapport généré lors de la dernière exécution locale).


Le cahier des charges demande une couverture **> 70 % sur l'API**.
Les seuils Jest sont maintenant alignés sur cet objectif. Si une future
modification fait repasser la couverture sous ces valeurs, la commande
`npm run test:coverage` échouera immédiatement.

## Backend — Jest + Supertest

```bash
cd backend
npm install
npm test
npm run test:coverage
```

## ⚠️ Correction appliquée : fichier de test non détecté

`src/components/__tests__/BookingTunnel.jsx` a été renommé
`BookingTunnel.test.jsx`. Sans le suffixe `.test.`, Vitest (glob par défaut)
ne détectait pas ce fichier : les 5 scénarios décrits ci-dessous ne
s'exécutaient jamais malgré `npm test`.

## Frontend — React Testing Library + snapshot

```bash
cd frontend
npm install
npm test
npm run test:coverage
```

Les tests de `BookingTunnel` couvrent :
- rendu du tunnel ;
- snapshot ;
- sélection d'une date ;
- chargement et sélection d'un créneau ;
- confirmation et écran de succès.

## E2E — Playwright

Démarrer PostgreSQL/Redis et le backend, puis :

```bash
cd frontend
npm install
npx playwright install chromium

set E2E_PATIENT_EMAIL=patient@example.com
set E2E_PATIENT_PASSWORD=motdepasse
set E2E_FACILITY_ID=1

npm run test:e2e
```

Sous PowerShell :

```powershell
$env:E2E_PATIENT_EMAIL="patient@example.com"
$env:E2E_PATIENT_PASSWORD="motdepasse"
$env:E2E_FACILITY_ID="1"
npm run test:e2e
```

Le scénario Playwright réalise le parcours critique :
connexion patient → fiche médecin → ouverture du tunnel → date → créneau → confirmation → « Rendez-vous confirmé ! ».

Si les trois variables E2E ne sont pas définies, le scénario est automatiquement marqué `skipped` plutôt que d'échouer à cause d'un environnement non configuré.
