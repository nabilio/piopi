# Configuration de la Confirmation d'Email - Supabase

Ce document explique comment configurer la confirmation d'email obligatoire dans Supabase.

## Configuration Supabase Dashboard

### 1. Activer la Confirmation d'Email

1. Allez dans votre **Dashboard Supabase** : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Authentication** → **Providers** → **Email**
4. **Cochez "Confirm email"**
5. Sauvegardez

### 2. Configurer le Template d'Email

1. Dans **Authentication** → **Email Templates**
2. Sélectionnez **Confirm signup**
3. Utilisez le template HTML fourni dans `INSTRUCTIONS_EMAIL_TEMPLATE.md`

### 3. Configuration des URLs de Redirection

Dans **Authentication** → **URL Configuration** :

- **Site URL** : Votre URL de production (ex: `https://interactive-learning-fn5g.bolt.host`)
- **Redirect URLs** : Ajoutez vos URLs autorisées
  - `https://interactive-learning-fn5g.bolt.host/**`
  - `http://localhost:5173/**` (pour développement)

## Fonctionnalités Implémentées

### 1. Affichage du Statut dans Admin Panel

Le panel admin affiche maintenant pour chaque utilisateur :

- **Badge vert "Email confirmé"** : L'utilisateur a validé son email
- **Badge orange "En attente"** : L'utilisateur n'a pas encore confirmé son email

### 2. Blocage de Connexion

Les utilisateurs qui n'ont pas confirmé leur email **ne peuvent pas se connecter**.

Lorsqu'un utilisateur tente de se connecter sans avoir confirmé son email :
- La connexion est bloquée
- Il est automatiquement déconnecté
- Un message s'affiche : "Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception."

### 3. Edge Function Mise à Jour

La fonction `get-all-users` retourne maintenant :
- `email_confirmed` (boolean) : true si l'email est confirmé
- `email_confirmed_at` (timestamp) : date de confirmation de l'email

## Workflow d'Inscription

```
1. L'utilisateur s'inscrit
   ↓
2. Compte créé mais NON connecté
   ↓
3. Page "EmailConfirmation" s'affiche
   ↓
4. Email de confirmation Supabase envoyé (avec votre template personnalisé)
   ↓
5. L'utilisateur clique sur le lien dans l'email
   ↓
6. Email confirmé → Redirection vers l'application
   ↓
7. L'utilisateur peut maintenant se connecter
   ↓
8. PlanSelection → ParentOnboarding → Application
```

## Test du Système

### Test d'Inscription

1. Créez un compte avec un email de test
2. Vérifiez que vous voyez la page "EmailConfirmation"
3. Vérifiez votre boîte email
4. Cliquez sur le lien de confirmation
5. Vérifiez que vous êtes redirigé vers l'application

### Test de Connexion Sans Confirmation

1. Créez un compte mais ne confirmez PAS l'email
2. Tentez de vous connecter
3. Vérifiez que vous voyez le message d'erreur
4. Vérifiez que vous ne pouvez pas accéder à l'application

### Test Admin Panel

1. Connectez-vous en tant qu'admin
2. Allez dans "Utilisateurs"
3. Vérifiez que vous voyez le statut "Email confirmé" ou "En attente" pour chaque utilisateur

## Résolution de Problèmes

### L'utilisateur ne reçoit pas l'email

1. Vérifiez les spams/promotions
2. Vérifiez que la configuration SMTP est correcte dans Supabase
3. Utilisez le bouton "Renvoyer l'email" sur la page EmailConfirmation

### L'email n'a pas le bon design

1. Vérifiez que vous avez bien configuré le template dans **Email Templates**
2. Suivez les instructions dans `INSTRUCTIONS_EMAIL_TEMPLATE.md`
3. Testez avec un nouvel email

### L'utilisateur peut se connecter sans confirmation

1. Vérifiez que "Confirm email" est bien **coché** dans Authentication → Providers → Email
2. Vérifiez que le code dans `AuthModal.tsx` bloque bien la connexion
3. Effacez le cache du navigateur et réessayez

## Notes Importantes

- La confirmation d'email est **obligatoire**
- Les utilisateurs doivent confirmer leur email avant de pouvoir se connecter
- Le statut de confirmation est visible dans le panel admin
- Les emails sont envoyés par Supabase avec votre template personnalisé
