# MédiGuide — version finale

Version finalisée à partir du cahier des charges fourni et de la structure existante.

Fonctionnalités ajoutées ou renforcées

- page logo / bienvenue
- inscription patient et professionnel
- choix médecin, pharmacie ou parapharmacie
- vérification e-mail par code à 6 chiffres
- renvoi du code
- expiration du code après 10 minutes
- JWT avec permissions par rôle
- accès séparé patient, professionnel et administrateur
- dashboard patient refondu
- dashboard administrateur refondu
- espace professionnel existant conservé et orienté selon la catégorie
- scripts de démarrage Windows
- documentation de démarrage

Le code de vérification est stocké sous forme de hash côté serveur.

En développement sans SMTP, le code est retourné uniquement pour faciliter les tests locaux. En production il ne l'est pas.

Consulter GUIDE-DEMARRAGE.md.
