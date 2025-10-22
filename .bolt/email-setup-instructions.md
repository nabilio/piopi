# Configuration de l'envoi d'emails avec Resend

## Pourquoi la confirmation d'email n'est pas activée

Actuellement, la confirmation d'email n'est **pas activée** dans votre projet Supabase. C'est pourquoi :
- Les utilisateurs ne reçoivent pas d'emails de confirmation
- Les comptes sont automatiquement confirmés à l'inscription
- L'application Resend n'est pas utilisée

## Comment activer la confirmation d'email

### Étape 1 : Créer un compte Resend

1. Allez sur [https://resend.com](https://resend.com)
2. Créez un compte gratuit
3. Une fois connecté, allez dans **API Keys**
4. Créez une nouvelle clé API et copiez-la

### Étape 2 : Configurer Resend dans Supabase

1. Allez dans votre **Dashboard Supabase**
2. Allez dans **Project Settings** → **Authentication**
3. Scrollez jusqu'à **SMTP Settings**
4. Activez **Enable Custom SMTP**
5. Utilisez ces paramètres pour Resend :
   ```
   Host: smtp.resend.com
   Port: 465 (ou 587)
   Username: resend
   Password: [Votre clé API Resend]
   Sender email: [Votre email vérifié sur Resend]
   Sender name: École Magique
   ```

### Étape 3 : Configurer les templates d'emails

1. Dans Supabase Dashboard → **Authentication** → **Email Templates**
2. Configurez le template **Confirm signup** :
   ```html
   <h2>Bienvenue sur École Magique !</h2>
   <p>Merci de votre inscription. Pour confirmer votre compte, cliquez sur le lien ci-dessous :</p>
   <p><a href="{{ .ConfirmationURL }}">Confirmer mon email</a></p>
   <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
   ```

### Étape 4 : Activer la confirmation d'email

1. Dans **Authentication** → **Settings**
2. Trouvez **Enable email confirmations**
3. **Activez** cette option
4. Sauvegardez les modifications

### Étape 5 : Vérifier votre domaine sur Resend (Production)

Pour les emails en production (pas localhost) :
1. Dans Resend, allez dans **Domains**
2. Ajoutez votre domaine
3. Configurez les enregistrements DNS (SPF, DKIM, etc.)
4. Attendez la vérification

## Test de la configuration

1. Créez un nouveau compte sur votre application
2. Vous devriez maintenant :
   - Être redirigé vers la page de confirmation d'email
   - Recevoir un email de confirmation
   - Devoir cliquer sur le lien pour activer votre compte

## En attendant la configuration

L'application fonctionne actuellement **sans confirmation d'email** :
- Les utilisateurs peuvent s'inscrire et se connecter immédiatement
- Une page s'affiche après l'inscription expliquant que la confirmation n'est pas activée
- Tout fonctionne normalement, mais sans la sécurité de la confirmation d'email

## Tarification Resend

- **Gratuit** : 3 000 emails/mois
- **Largement suffisant** pour démarrer votre projet
- Emails transactionnels professionnels
