# MediGuide — Dashboards professionnels + création de fiche

Cette version corrige le parcours des nouveaux professionnels.

## Nouveau parcours

1. Créer un compte sur `/register`.
2. Choisir `Professionnel de santé`.
3. Choisir la catégorie : `Médecin`, `Pharmacie` ou `Parapharmacie`.
4. Vérifier l'e-mail.
5. Après validation du compte par l'administrateur, se connecter.
6. Si aucune fiche n'est encore liée au compte, l'écran propose :
   - rechercher une fiche existante et la rattacher ; ou
   - créer une nouvelle fiche.
7. La catégorie de la nouvelle fiche est automatiquement prise depuis le compte connecté.
8. La nouvelle fiche est créée avec `estVerifie=false` et peut être validée par l'administrateur dans `Fiches à valider`.
9. Une fois la fiche créée, le professionnel accède à son espace correspondant.

## URLs professionnelles

- `/professionnel/medecin`
- `/professionnel/pharmacie`
- `/professionnel/parapharmacie`

`/professionnel` redirige automatiquement vers la catégorie du compte.

## Lancement

### Backend

```powershell
cd backend
npm install
npm run dev
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Puis ouvrir `http://localhost:5173`.

## Validation administrateur

Le dashboard administrateur possède maintenant l'onglet `Fiches à valider` pour valider les fiches de médecins, pharmacies et parapharmacies créées par les professionnels.
