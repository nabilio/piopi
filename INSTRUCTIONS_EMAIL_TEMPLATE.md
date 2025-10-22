# Configuration du Template d'Email de Confirmation - Supabase

Pour afficher le beau template d'email au lieu du template par défaut de Supabase, suivez ces étapes :

## Étapes de Configuration

### 1. Accéder à la Configuration Email

1. Allez dans votre **Dashboard Supabase** : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Authentication** → **Email Templates**
4. Sélectionnez **Confirm signup**

### 2. Template HTML Personnalisé

Remplacez le contenu du template par ce code HTML :

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
      border-radius: 16px 16px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .content {
      background: white;
      padding: 40px 30px;
      border-radius: 0 0 16px 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 50px;
      margin: 30px 0;
      font-weight: bold;
      font-size: 16px;
      text-align: center;
    }
    .button:hover {
      opacity: 0.9;
    }
    .highlight {
      background: #e3f2fd;
      padding: 20px;
      border-radius: 12px;
      margin: 20px 0;
      border-left: 4px solid #667eea;
    }
    .highlight h3 {
      margin-top: 0;
      color: #667eea;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .highlight ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .highlight li {
      margin: 8px 0;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
    .center {
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">✨</div>
      <h1>Confirmez votre email</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>

      <p>Bienvenue sur <strong>École Magique</strong> ! Pour commencer votre aventure, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>

      <div class="center">
        <a href="{{ .ConfirmationURL }}" class="button">Confirmer mon email</a>
      </div>

      <div class="highlight">
        <h3>🎁 Votre essai gratuit de 30 jours vous attend !</h3>
        <p>Une fois votre email confirmé, vous pourrez :</p>
        <ul>
          <li>✅ Choisir votre formule d'abonnement</li>
          <li>✅ Ajouter le profil de vos enfants</li>
          <li>✅ Accéder à tous les cours (CP à Terminale)</li>
          <li>✅ Profiter du Coach IA personnalisé 24/7</li>
          <li>✅ Découvrir le mode Battle et le réseau social éducatif</li>
        </ul>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Si vous n'avez pas créé de compte sur École Magique, vous pouvez ignorer cet email.
      </p>

      <p>À très bientôt ! 🚀</p>

      <p><strong>L'équipe École Magique</strong></p>
    </div>
    <div class="footer">
      <p>© 2025 École Magique - La plateforme éducative qui rend l'apprentissage magique</p>
    </div>
  </div>
</body>
</html>
```

### 3. Configuration du Sujet de l'Email

Dans le champ **Subject** du template, mettez :

```
Confirmez votre email - École Magique
```

### 4. Configuration de la Redirection

Dans **Authentication** → **URL Configuration** :

- **Site URL** : Votre URL de production (ex: `https://votre-site.com`)
- **Redirect URLs** : Ajoutez votre URL avec `?emailConfirmed=true`
  - Ex: `https://votre-site.com/?emailConfirmed=true`
  - Ex: `https://votre-site.com/**` (pour autoriser toutes les pages)

### 5. Sauvegarde

Cliquez sur **Save** pour enregistrer le template.

## Test

1. Créez un nouveau compte avec un email de test
2. Vérifiez que vous recevez l'email avec le nouveau design
3. Cliquez sur "Confirmer mon email"
4. Vous devriez voir la page de confirmation EmailConfirmed
5. Cliquez sur "Continuer"
6. Vous devriez voir la page de sélection de plan (PlanSelection)
7. Choisissez un plan
8. Vous devriez voir l'onboarding pour ajouter vos enfants

## Workflow Complet

```
Inscription
    ↓
Confirmation d'email requise (page EmailConfirmation)
    ↓
Email reçu avec beau template
    ↓
Clic sur "Confirmer mon email"
    ↓
Page EmailConfirmed (félicitations + prochaines étapes)
    ↓
Clic sur "Continuer"
    ↓
PlanSelection (choix du nombre d'enfants)
    ↓
ParentOnboarding (ajout des profils enfants)
    ↓
Application principale
```

## Notes Importantes

- Le template utilise la variable `{{ .ConfirmationURL }}` fournie par Supabase
- Les styles CSS sont inline pour une meilleure compatibilité email
- Le design est responsive et fonctionne sur mobile
- Les couleurs correspondent au design de l'application
