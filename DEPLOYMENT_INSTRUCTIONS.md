# Instructions de Déploiement

## Déploiement du build statique avec PM2

Ces étapes remplacent l'ancienne commande `pm2 start "serve -s ./dist -l 3001"` qui pouvait échouer sur Windows lorsque `pm2` était lancé en dehors du dossier du projet.

1. **Se placer dans le dossier du projet**

   ```bash
   cd /home/adminio/htdocs/lapsi.online
   ```

   > Sous Windows, ouvrez un terminal (PowerShell ou Git Bash) et exécutez la commande `cd` vers le dossier qui contient `package.json` **avant** d'appeler `npm ci` ou `pm2`.

2. **Installer les dépendances puis builder**

   ```bash
   npm ci
   npm run build
   ```

3. **Démarrer le serveur statique via PM2**

   ```bash
   # Linux / macOS
   PORT=3001 pm2 start ecosystem.config.cjs --env production

   # Windows (PowerShell)
   $env:PORT="3001"; pm2 start ecosystem.config.cjs --env production
   ```

   Le fichier `ecosystem.config.cjs` lance automatiquement `node scripts/serve-dist.mjs`, un petit serveur HTTP qui diffuse le contenu du dossier `dist` avec un fallback sur `index.html` pour le SPA React.

4. **Sauvegarder l'état PM2 (optionnel mais recommandé)**

   ```bash
   pm2 save
   ```

5. **Redémarrer après un nouveau build**

   ```bash
   pm2 restart piopi-prod
   ```

6. **Vérifier que le serveur répond**

   - Ouvrez `http://<votre-domaine>:3001`
   - Contrôlez que la notification anniversaire, la modale enfant et la vue parent fonctionnent toujours.

---

## Problème 1 : Failed to fetch lors de l'inscription

**Cause :** Les nouvelles edge functions ne sont pas encore déployées sur Supabase.

**Solution :** Vous devez déployer les edge functions via le dashboard Supabase.

### Déployer les Edge Functions

Les fonctions suivantes doivent être déployées :

1. **register-with-email-confirmation** (NOUVELLE)
   - Fichier : `supabase/functions/register-with-email-confirmation/index.ts`
   - Gère l'inscription avec envoi d'email via Resend

2. **resend-confirmation-email** (NOUVELLE)
   - Fichier : `supabase/functions/resend-confirmation-email/index.ts`
   - Permet de renvoyer l'email de confirmation

3. **send-email** (EXISTE DÉJÀ)
   - Fichier : `supabase/functions/send-email/index.ts`
   - Template `email_confirmation` déjà présent

### Comment déployer ?

Vous avez deux options :

#### Option 1 : Via Supabase CLI (recommandé si installé)

```bash
# Se connecter à Supabase
supabase login

# Déployer une fonction
supabase functions deploy register-with-email-confirmation
supabase functions deploy resend-confirmation-email

# Déployer toutes les fonctions
supabase functions deploy
```

#### Option 2 : Via le Dashboard Supabase

1. Allez dans **Edge Functions** dans votre dashboard
2. Cliquez sur **"Create Function"** ou **"Deploy"**
3. Copiez-collez le contenu de chaque fichier `.ts`
4. Déployez chaque fonction

#### Option 3 : Via l'API (si vous avez accès)

Utilisez l'API Supabase pour déployer les fonctions programmatiquement.

## Problème 2 : Abonnement créé automatiquement

**Cause :** Un trigger SQL créait automatiquement un abonnement trial lors de l'inscription.

**Solution :** Migration créée pour supprimer ce trigger.

### Migration à appliquer

**Fichier :** `supabase/migrations/20251015170000_remove_auto_subscription.sql`

Cette migration :
- Supprime le trigger `trigger_create_subscription_on_parent_signup`
- Supprime la fonction `create_subscription_on_parent_signup()`

### Comment appliquer la migration ?

Les migrations dans le dossier `supabase/migrations/` sont automatiquement appliquées lors du prochain déploiement ou push.

Si vous utilisez Supabase CLI :

```bash
# Appliquer les migrations
supabase db push
```

Sinon, vous pouvez exécuter manuellement le SQL dans le **SQL Editor** de Supabase Dashboard.

## Problème 3 : Migration des tokens de confirmation

**Fichier :** `supabase/migrations/20251015163300_create_email_confirmation_tokens.sql`

Cette migration crée :
- Table `email_confirmation_tokens`
- Fonction SQL `confirm_email_token()`

Elle doit aussi être appliquée (voir instructions ci-dessus).

## Résumé des Actions Requises

### 1. Appliquer les Migrations

Deux nouvelles migrations à appliquer :
- `20251015163300_create_email_confirmation_tokens.sql` (système de tokens)
- `20251015170000_remove_auto_subscription.sql` (suppression trigger)

**Via Supabase CLI :**
```bash
supabase db push
```

**Ou via Dashboard :** Copiez-collez le SQL dans le SQL Editor.

### 2. Déployer les Edge Functions

Trois fonctions à déployer :
- `register-with-email-confirmation` (nouvelle)
- `resend-confirmation-email` (nouvelle)
- `send-email` (déjà existe, vérifier que le template est à jour)

**Via Supabase CLI :**
```bash
supabase functions deploy register-with-email-confirmation
supabase functions deploy resend-confirmation-email
```

### 3. Configurer Supabase Auth

Dans **Supabase Dashboard** → **Authentication** → **Providers** → **Email** :

**IMPORTANT :** **DÉCOCHEZ "Confirm email"**

Notre système gère la confirmation via Resend, Supabase ne doit pas envoyer d'email.

### 4. Vérifier les Variables d'Environnement

Dans **Edge Functions Settings**, vérifiez que ces variables sont définies :
- `RESEND_API_KEY` : Votre clé API Resend
- `VITE_APP_URL` : URL de votre application
- `SUPABASE_URL` : (automatique)
- `SUPABASE_ANON_KEY` : (automatique)
- `SUPABASE_SERVICE_ROLE_KEY` : (automatique)

## Workflow Complet Après Déploiement

1. **Inscription :**
   - Frontend appelle `/functions/v1/register-with-email-confirmation`
   - Edge function crée l'utilisateur (email non confirmé)
   - Génère un token
   - Envoie l'email via Resend

2. **Sélection du Plan :**
   - **AUCUN abonnement n'est créé automatiquement**
   - L'utilisateur voit `PlanSelection.tsx`
   - Il choisit son plan (1, 2, ou 3 enfants)
   - Un abonnement trial de 30 jours est créé

3. **Confirmation Email :**
   - L'utilisateur clique sur le lien dans l'email
   - Route `/confirm-email?token=xxx`
   - Fonction SQL confirme l'email
   - Redirection vers la connexion

4. **Connexion :**
   - `AuthModal.tsx` vérifie `email_confirmed_at`
   - Bloque la connexion si non confirmé

## Tester Après Déploiement

### Test 1 : Inscription
1. Créez un compte
2. Vérifiez que vous recevez l'email de confirmation (design École Magique)
3. L'email doit venir de Resend (pas de Supabase)

### Test 2 : Pas d'abonnement automatique
1. Après inscription, vous devez voir `PlanSelection.tsx`
2. **AUCUN abonnement ne doit exister avant de choisir**
3. Choisissez un plan
4. L'abonnement trial est créé

### Test 3 : Confirmation
1. Cliquez sur le lien dans l'email
2. Vous devez voir la page de succès
3. Connexion maintenant possible

## Logs et Debugging

### Vérifier les logs des Edge Functions

Dans Supabase Dashboard → **Edge Functions** → sélectionnez une fonction → **Logs**

### Vérifier la base de données

Requête SQL pour voir les tokens :
```sql
SELECT * FROM email_confirmation_tokens ORDER BY created_at DESC;
```

Requête SQL pour voir les abonnements :
```sql
SELECT * FROM subscriptions ORDER BY created_at DESC;
```

Vérifier qu'aucun utilisateur n'a d'abonnement avant de choisir un plan.

## Support

Si vous avez des erreurs :
1. Vérifiez les logs des edge functions
2. Vérifiez que les migrations sont appliquées
3. Vérifiez que "Confirm email" est décoché dans Supabase Auth
4. Vérifiez que RESEND_API_KEY est configurée
