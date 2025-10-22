# Configuration de l'email de réinitialisation de mot de passe

## Problème
Vous recevez actuellement l'email par défaut de Supabase en anglais lors de la réinitialisation du mot de passe.

## Solution : Configurer le template dans le Dashboard Supabase

### Étapes à suivre :

1. **Allez sur le Dashboard Supabase**
   - Connectez-vous à https://supabase.com/dashboard
   - Sélectionnez votre projet PioPi

2. **Accédez aux templates d'email**
   - Dans le menu de gauche, cliquez sur **Authentication**
   - Cliquez sur **Email Templates**

3. **Configurez le template "Reset Password"**
   - Sélectionnez **Reset Password** dans la liste des templates
   - Vous verrez plusieurs champs à remplir

4. **Personnalisez le template**

   **Subject (Objet) :**
   ```
   Réinitialisation de votre mot de passe PioPi
   ```

   **Body (HTML) :**
   Copiez-collez le contenu du fichier `SUPABASE_EMAIL_TEMPLATE_PASSWORD_RESET.html` qui se trouve dans le dossier racine du projet.

5. **Paramètres importants**
   - **Redirect URL** : Laissez vide ou mettez `https://www.piopi.eu`
   - La variable `{{ .ConfirmationURL }}` sera automatiquement remplacée par le lien de réinitialisation

6. **Sauvegardez**
   - Cliquez sur **Save** en bas de page

7. **Testez**
   - Faites une nouvelle demande de réinitialisation de mot de passe
   - Vous devriez recevoir l'email personnalisé avec le design PioPi

## Alternative : Configuration via la CLI Supabase

Si vous préférez configurer via la CLI (non recommandé car plus complexe) :

```bash
# Installer la CLI Supabase
npm install -g supabase

# Se connecter
supabase login

# Créer un fichier de configuration
# supabase/templates/reset_password.html

# Appliquer la configuration
supabase db push
```

## Notes importantes

- Le template doit utiliser la syntaxe Go Template de Supabase
- La variable `{{ .ConfirmationURL }}` est obligatoire et sera remplacée automatiquement
- D'autres variables disponibles :
  - `{{ .SiteURL }}` - L'URL de votre site
  - `{{ .Token }}` - Le token de confirmation (si vous voulez construire votre propre URL)
  - `{{ .TokenHash }}` - Le hash du token

## Vérification

Après la configuration, testez en :
1. Allant sur la page de connexion
2. Cliquant sur "Mot de passe oublié ?"
3. Entrant votre email
4. Vérifiant que vous recevez l'email personnalisé avec le design PioPi

---

**Support** : Si vous rencontrez des problèmes, consultez la documentation Supabase :
https://supabase.com/docs/guides/auth/auth-email-templates
