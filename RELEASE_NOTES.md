# Notes de version

## v2025.10.21 — Gestion complète des anniversaires

### Fonctionnalités
- Formulaire dédié pour que les enfants saisissent leur date d'anniversaire avec validation du consentement parental.
- Notification proactive sur le tableau de bord enfant tant que l'anniversaire n'est pas renseigné.
- Création d'une API Supabase sécurisée (`update-child-birthday`) et de la table `birthday_party_invitations` pour suivre invitations et confirmations.
- Nouvelle vue parent "Gestion des anniversaires" avec filtres, actions de confirmation et aperçu des prochains événements.

### Expérience utilisateur
- Accès rapide depuis l'accueil parent et le tableau de bord parent grâce à des cartes contextuelles.
- Affichage automatique des anniversaires à venir ainsi que du nombre d'invitations en attente.

### Tests
- Ajout de tests unitaires couvrant la normalisation des dates et la mutation Supabase.
- Mise en place d'un scénario E2E simulant la saisie côté enfant, la disparition de la notification et la confirmation parentale.

### Documentation
- Mise à jour du guide produit avec les instructions de saisie enfant et le parcours parent.
