# Système de Confirmation d'Email avec Resend

Ce document explique le nouveau système de confirmation d'email qui utilise **Resend** au lieu de Supabase pour l'envoi des emails.

## Architecture

### 1. Table de Tokens
**Migration:** `20251015163300_create_email_confirmation_tokens.sql`

La table `email_confirmation_tokens` stocke les tokens de confirmation :
- `id` : UUID unique
- `user_id` : Référence vers auth.users
- `token` : Token de confirmation (UUID double)
- `email` : Email à confirmer
- `expires_at` : Date d'expiration (24h)
- `confirmed_at` : Date de confirmation (null si non confirmé)
- `created_at` : Date de création

### 2. Edge Functions

#### `register-with-email-confirmation`
Gère l'inscription complète :
1. Crée l'utilisateur avec `email_confirm: false`
2. Crée le profil dans la table `profiles`
3. Génère un token de confirmation unique
4. Envoie l'email via Resend avec le template `email_confirmation`

#### `resend-confirmation-email`
Permet de renvoyer l'email de confirmation :
1. Trouve l'utilisateur par email
2. Invalide les anciens tokens
3. Crée un nouveau token
4. Envoie l'email via Resend

#### `send-email`
Déjà existant, gère l'envoi d'emails via Resend avec le template `email_confirmation`.

### 3. Fonction SQL

`confirm_email_token(token)`
- Vérifie la validité du token (non expiré, non confirmé)
- Marque le token comme confirmé
- Met à jour `email_confirmed_at` dans `auth.users`
- Retourne un JSON avec le résultat

## Workflow d'Inscription

```
1. L'utilisateur remplit le formulaire d'inscription
   ↓
2. Frontend appelle /functions/v1/register-with-email-confirmation
   ↓
3. Edge function :
   - Crée l'utilisateur (email NON confirmé)
   - Crée le profil
   - Génère un token unique
   - Envoie l'email via Resend avec le beau template
   ↓
4. Page "EmailConfirmation" s'affiche
   ↓
5. L'utilisateur reçoit l'email de Resend avec le design personnalisé
   ↓
6. Clic sur le lien → /confirm-email?token=xxx
   ↓
7. Page EmailConfirmedPage :
   - Appelle la fonction SQL confirm_email_token()
   - Confirme l'email dans auth.users
   - Affiche un message de succès
   ↓
8. Redirection automatique vers la page de connexion
   ↓
9. L'utilisateur peut se connecter (AuthModal vérifie email_confirmed_at)
```

## Template Email Resend

Le template `email_confirmation` dans `send-email/index.ts` contient :

- **En-tête** avec gradient violet/bleu
- **Logo École Magique**
- **Message personnalisé** avec le nom du parent
- **Bouton "Confirmer mon email"** avec le lien de confirmation
- **Liste des avantages** (essai 30 jours, cours, Coach IA)
- **Design responsive** et professionnel

## Avantages de cette Solution

### Pourquoi Resend au lieu de Supabase ?

1. **Design personnalisé** : Template HTML avec votre branding
2. **Contrôle total** : Vous gérez le contenu et le style
3. **Meilleure délivrabilité** : Resend est spécialisé dans l'envoi d'emails
4. **Tracking** : Possibilité d'ajouter des analytics
5. **Cohérence** : Même service pour tous les emails de l'app

## Configuration Requise

### 1. Appliquer la Migration

```bash
# La migration est déjà créée dans :
supabase/migrations/20251015163300_create_email_confirmation_tokens.sql

# Elle sera appliquée automatiquement au prochain déploiement
```

### 2. Déployer les Edge Functions

Les fonctions suivantes doivent être déployées :
- `register-with-email-confirmation` (nouvelle)
- `resend-confirmation-email` (nouvelle)
- `send-email` (déjà existante, template mis à jour)

### 3. Variables d'Environnement

Déjà configurées dans `.env` :
- `RESEND_API_KEY` : Votre clé API Resend
- `VITE_APP_URL` : URL de votre application

### 4. Configuration Supabase Dashboard

**IMPORTANT** : Dans Supabase Dashboard, allez dans :
- **Authentication** → **Providers** → **Email**
- **DÉCOCHEZ "Confirm email"** (Supabase ne doit PAS envoyer d'email)

Notre système gère tout via Resend !

## Composants Frontend

### SimpleRegistration.tsx
Modifié pour appeler la edge function au lieu de `supabase.auth.signUp()`.

### EmailConfirmedPage.tsx
Nouvelle page qui :
- Récupère le token depuis l'URL
- Appelle `confirm_email_token()`
- Affiche le résultat (succès/erreur)
- Redirige automatiquement après confirmation

### AuthModal.tsx
Vérifie `email_confirmed_at` avant de permettre la connexion.

## Sécurité

- Les tokens expirent après **24 heures**
- Les tokens sont **uniques** (double UUID)
- RLS activé sur la table (aucune lecture directe possible)
- Fonction SQL en **SECURITY DEFINER** pour mettre à jour auth.users
- Les anciens tokens sont **invalidés** lors du renvoi

## Panel Admin

Le panel admin affiche toujours le statut de confirmation :
- **Badge vert** : Email confirmé
- **Badge orange** : En attente de confirmation

## Testing

### Test d'Inscription

1. Créez un compte avec un email de test
2. Vérifiez que la page "EmailConfirmation" s'affiche
3. Vérifiez votre boîte email
4. **L'email doit avoir le design personnalisé de École Magique**
5. Cliquez sur "Confirmer mon email"
6. Vous devez voir la page de succès
7. Connexion maintenant possible

### Test de Renvoi

1. Sur la page "EmailConfirmation", cliquez "Renvoyer l'email"
2. Vérifiez que vous recevez un nouvel email
3. L'ancien lien ne doit plus fonctionner
4. Le nouveau lien doit fonctionner

## Résolution de Problèmes

### L'utilisateur ne reçoit pas l'email

1. Vérifiez que `RESEND_API_KEY` est configurée
2. Vérifiez les logs de la fonction `send-email`
3. Vérifiez les spams
4. Utilisez le bouton "Renvoyer l'email"

### Token invalide ou expiré

1. Les tokens expirent après 24h
2. Demandez un nouvel email via "Renvoyer l'email"
3. Vérifiez que le lien n'a pas été tronqué dans l'email

### L'utilisateur peut se connecter sans confirmer

1. Vérifiez que "Confirm email" est **décoché** dans Supabase Dashboard
2. Vérifiez que la fonction SQL met bien à jour `email_confirmed_at`
3. Vérifiez le code de `AuthModal.tsx`

## Avantages Finaux

- Email avec **design professionnel École Magique**
- **Template HTML personnalisé** avec votre branding
- **Resend** pour une meilleure délivrabilité
- **Contrôle total** sur le contenu et le style
- **Tracking** possible des ouvertures et clics
- **Cohérence** avec tous les autres emails de l'app
