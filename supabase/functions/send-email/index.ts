import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  template?: 'welcome' | 'child_added' | 'subscription_info' | 'password_reset' | 'trial_ending' | 'subscription_expired' | 'email_confirmation' | 'subscription_confirmed' | 'subscription_cancelled' | 'subscription_upgraded' | 'subscription_downgraded';
  html?: string;
  data?: Record<string, any>;
}

function getEmailTemplate(template: string, data: Record<string, any>): string {
  const baseUrl = Deno.env.get('VITE_APP_URL') || 'https://www.piopi.eu';

  switch (template) {
    case 'email_confirmation':
      return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .logo-container { margin-bottom: 20px; }
    .site-name { font-size: 32px; font-weight: bold; margin: 0; letter-spacing: -0.5px; line-height: 48px; vertical-align: middle; }
    .logo-box { width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%); border-radius: 8px; font-size: 28px; font-weight: bold; color: white; text-align: center; line-height: 48px; vertical-align: middle; display: inline-block; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; font-size: 16px; }
    .highlight { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin-top: 20px; }
    .footer p { font-size: 12px; color: #6b7280; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <table cellpadding="0" cellspacing="0" border="0" align="center">
          <tr>
            <td class="logo-box">P</td>
            <td style="padding-left: 12px;">
              <span class="site-name">PioPi</span>
            </td>
          </tr>
        </table>
      </div>
      <h1 style="margin-top: 20px; font-size: 24px;">Confirmez votre email</h1>
    </div>
    <div class="content">
      <p>Bonjour ${data.parentName || ''},</p>

      <p>Bienvenue sur <strong>PioPi</strong> ! Pour commencer votre aventure, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>

      <div style="text-align: center;">
        <a href="${data.confirmationLink}" class="button">Confirmer mon email</a>
      </div>

      <div class="highlight">
        <p><strong>🎁 Votre essai gratuit de 30 jours vous attend !</strong></p>
        <p>Une fois votre email confirmé, vous pourrez :</p>
        <ul>
          <li>✅ Ajouter le profil de vos enfants</li>
          <li>✅ Accéder à tous les cours (CP à Terminale)</li>
          <li>✅ Profiter du Coach IA personnalisé</li>
        </ul>
      </div>

      <p>Si vous n'avez pas créé de compte sur PioPi, vous pouvez ignorer cet email.</p>

      <p>À très bientôt ! 🚀</p>

      <p>L'équipe PioPi</p>
    </div>
    <div class="footer">
      <p>Des questions ? Contactez-nous à <a href="mailto:support@piopi.eu" style="color: #3b82f6;">support@piopi.eu</a></p>
      <p>© 2025 PioPi - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
      `;

    case 'welcome':
      return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .logo-container { margin-bottom: 20px; }
    .site-name { font-size: 32px; font-weight: bold; margin: 0; letter-spacing: -0.5px; line-height: 48px; vertical-align: middle; }
    .logo-box { width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%); border-radius: 8px; font-size: 28px; font-weight: bold; color: white; text-align: center; line-height: 48px; vertical-align: middle; display: inline-block; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }
    .highlight { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin-top: 20px; }
    .footer p { font-size: 12px; color: #6b7280; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <table cellpadding="0" cellspacing="0" border="0" align="center">
          <tr>
            <td class="logo-box">P</td>
            <td style="padding-left: 12px;">
              <span class="site-name">PioPi</span>
            </td>
          </tr>
        </table>
      </div>
      <h1 style="margin-top: 20px; font-size: 24px;">Bienvenue !</h1>
    </div>
    <div class="content">
      <p>Bonjour ${data.parentName || 'cher parent'},</p>

      <p>Nous sommes ravis de vous accueillir sur <strong>PioPi</strong>, la plateforme qui transforme l'apprentissage en aventure !</p>

      <div class="highlight">
        <h3>🎁 Votre essai gratuit de 30 jours commence maintenant</h3>
        <p>Profitez de toutes les fonctionnalités premium sans aucune carte bancaire requise :</p>
        <ul>
          <li>✅ Accès illimité à tous les cours (CP à Terminale)</li>
          <li>✅ Coach IA personnalisé 24/7</li>
          <li>✅ Mode Battle et réseau social éducatif</li>
          <li>✅ Suivi détaillé de la progression</li>
        </ul>
      </div>

      <h3>📚 Prochaines étapes :</h3>
      <ol>
        <li>Ajoutez le profil de votre ou vos enfants</li>
        <li>Laissez-les découvrir leur espace personnalisé</li>
        <li>Suivez leur progression depuis votre tableau de bord</li>
      </ol>

      <div style="text-align: center;">
        <a href="${baseUrl}" class="button">Accéder à mon compte</a>
      </div>

      <p><strong>Tarification après l'essai :</strong> Seulement 2€ par enfant par mois. Sans engagement.</p>

      <p>Des questions ? Notre équipe est là pour vous aider !</p>

      <p>Excellente aventure sur PioPi ! 🚀</p>

      <p>L'équipe PioPi</p>
    </div>
    <div class="footer">
      <p>Des questions ? Contactez-nous à <a href="mailto:support@piopi.eu" style="color: #3b82f6;">support@piopi.eu</a></p>
      <p>© 2025 PioPi - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
      `;

    case 'subscription_confirmed':
      return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .logo-container { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
    .site-name { font-size: 32px; font-weight: bold; margin: 0; letter-spacing: -0.5px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .subscription-box { background: white; border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .price { font-size: 32px; color: #10b981; font-weight: bold; text-align: center; margin: 15px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .info-label { font-weight: bold; color: #6b7280; }
    .info-value { color: #111827; }
    .highlight { background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; font-size: 16px; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin-top: 20px; }
    .footer p { font-size: 12px; color: #6b7280; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <table cellpadding="0" cellspacing="0" border="0" align="center">
          <tr>
            <td class="logo-box">P</td>
            <td style="padding-left: 12px;">
              <span class="site-name">PioPi</span>
            </td>
          </tr>
        </table>
      </div>
      <h1 style="margin-top: 20px; font-size: 24px;">Votre abonnement est confirmé !</h1>
    </div>
    <div class="content">
      <p>Bonjour ${data.parentName || ''},</p>

      <p>Nous sommes ravis de confirmer votre abonnement à <strong>PioPi</strong> ! Votre période d'essai gratuit de 30 jours commence dès maintenant.</p>

      <div class="subscription-box">
        <h3 style="text-align: center; color: #111827; margin-top: 0;">📋 Récapitulatif de votre abonnement</h3>

        <div class="price">${data.price}€/mois</div>

        <div class="info-row">
          <span class="info-label">Nombre d'enfants :</span>
          <span class="info-value">${data.childrenCount} enfant${data.childrenCount > 1 ? 's' : ''}</span>
        </div>

        <div class="info-row">
          <span class="info-label">Prix par enfant :</span>
          <span class="info-value">2€/mois</span>
        </div>

        <div class="info-row">
          <span class="info-label">Date de début :</span>
          <span class="info-value">${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        <div class="info-row" style="border-bottom: none;">
          <span class="info-label">Fin de l'essai gratuit :</span>
          <span class="info-value">${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      <div class="highlight">
        <p><strong>🎁 Pendant votre essai gratuit, vous bénéficiez de :</strong></p>
        <ul style="margin: 10px 0;">
          <li>✅ Accès illimité à tous les cours (CP à Terminale)</li>
          <li>✅ Coach IA personnalisé disponible 24/7</li>
          <li>✅ Mode Battle pour défier d'autres élèves</li>
          <li>✅ Suivi détaillé de la progression de vos enfants</li>
          <li>✅ Réseau social éducatif sécurisé</li>
        </ul>
      </div>

      <p><strong>💳 Facturation :</strong> Aucune carte bancaire n'est requise pendant votre période d'essai. Vous pourrez annuler à tout moment depuis vos paramètres.</p>

      <div style="text-align: center;">
        <a href="${baseUrl}" class="button">Accéder à mon espace</a>
      </div>

      <p>Des questions ? Notre équipe est là pour vous accompagner !</p>

      <p>Excellente aventure sur PioPi ! 🚀</p>

      <p>L'équipe PioPi</p>
    </div>
    <div class="footer">
      <p>Des questions ? Contactez-nous à <a href="mailto:support@piopi.eu" style="color: #3b82f6;">support@piopi.eu</a></p>
      <p>© 2025 PioPi - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
      `;

    case 'password_reset':
      return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .logo-container { margin-bottom: 20px; }
    .site-name { font-size: 32px; font-weight: bold; margin: 0; letter-spacing: -0.5px; line-height: 48px; vertical-align: middle; }
    .logo-box { width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%); border-radius: 8px; font-size: 28px; font-weight: bold; color: white; text-align: center; line-height: 48px; vertical-align: middle; display: inline-block; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; font-size: 16px; }
    .warning { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin-top: 20px; }
    .footer p { font-size: 12px; color: #6b7280; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <table cellpadding="0" cellspacing="0" border="0" align="center">
          <tr>
            <td class="logo-box">P</td>
            <td style="padding-left: 12px;">
              <span class="site-name">PioPi</span>
            </td>
          </tr>
        </table>
      </div>
      <h1 style="margin-top: 20px; font-size: 24px;">Réinitialisation de mot de passe</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>

      <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte <strong>PioPi</strong>.</p>

      <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>

      <div style="text-align: center;">
        <a href="${data.resetLink}" class="button">Réinitialiser mon mot de passe</a>
      </div>

      <div class="warning">
        <p><strong>⚠️ Important :</strong></p>
        <ul style="margin: 10px 0;">
          <li>Ce lien expire dans <strong>1 heure</strong></li>
          <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
          <li>Votre mot de passe actuel reste valide tant que vous n'en créez pas un nouveau</li>
        </ul>
      </div>

      <p>Pour votre sécurité, ne partagez jamais ce lien avec personne.</p>

      <p>À très bientôt ! 🚀</p>

      <p>L'équipe PioPi</p>
    </div>
    <div class="footer">
      <p>Des questions ? Contactez-nous à <a href="mailto:support@piopi.eu" style="color: #3b82f6;">support@piopi.eu</a></p>
      <p>© 2025 PioPi - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
      `;

    case 'subscription_cancelled':
      return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .logo-container { margin-bottom: 20px; }
    .site-name { font-size: 32px; font-weight: bold; margin: 0; letter-spacing: -0.5px; line-height: 48px; vertical-align: middle; }
    .logo-box { width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%); border-radius: 8px; font-size: 28px; font-weight: bold; color: white; text-align: center; line-height: 48px; vertical-align: middle; display: inline-block; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .info-label { font-weight: bold; color: #6b7280; }
    .info-value { color: #111827; }
    .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
    .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; font-size: 16px; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin-top: 20px; }
    .footer p { font-size: 12px; color: #6b7280; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <table cellpadding="0" cellspacing="0" border="0" align="center">
          <tr>
            <td class="logo-box">P</td>
            <td style="padding-left: 12px;">
              <span class="site-name">PioPi</span>
            </td>
          </tr>
        </table>
      </div>
      <h1 style="margin-top: 20px; font-size: 24px;">Confirmation d'annulation</h1>
    </div>
    <div class="content">
      <p>Bonjour ${data.parentName || ''},</p>

      <p>Nous avons bien pris en compte l'annulation de votre abonnement <strong>PioPi</strong>.</p>

      <div class="info-box">
        <h3 style="text-align: center; color: #111827; margin-top: 0;">📋 Détails de l'annulation</h3>

        <div class="info-row">
          <span class="info-label">Date d'annulation :</span>
          <span class="info-value">${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        <div class="info-row">
          <span class="info-label">Accès jusqu'au :</span>
          <span class="info-value">${data.endDate || 'Fin de la période en cours'}</span>
        </div>

        <div class="info-row" style="border-bottom: none;">
          <span class="info-label">Nombre d'enfants :</span>
          <span class="info-value">${data.childrenCount || 0} enfant${(data.childrenCount || 0) > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div class="highlight">
        <p><strong>📌 Ce qui se passe maintenant :</strong></p>
        <ul style="margin: 10px 0;">
          <li>✅ Votre accès reste actif jusqu'à la fin de votre période payée</li>
          <li>✅ Aucun prélèvement ne sera effectué à l'avenir</li>
          <li>✅ Vos données sont conservées pendant 30 jours</li>
          <li>✅ Vous pouvez vous réabonner à tout moment</li>
        </ul>
      </div>

      <p><strong>Vous avez changé d'avis ?</strong> Vous pouvez vous réabonner à tout moment depuis votre espace personnel.</p>

      <div style="text-align: center;">
        <a href="${baseUrl}?settings=subscription" class="button">Réactiver mon abonnement</a>
      </div>

      <p>Nous sommes tristes de vous voir partir. N'hésitez pas à nous faire part de vos remarques pour nous améliorer !</p>

      <p>À bientôt peut-être ! 👋</p>

      <p>L'équipe PioPi</p>
    </div>
    <div class="footer">
      <p>Des questions ? Contactez-nous à <a href="mailto:support@piopi.eu" style="color: #3b82f6;">support@piopi.eu</a></p>
      <p>© 2025 PioPi - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
      `;

    case 'subscription_upgraded':
      return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .logo-container { margin-bottom: 20px; }
    .site-name { font-size: 32px; font-weight: bold; margin: 0; letter-spacing: -0.5px; line-height: 48px; vertical-align: middle; }
    .logo-box { width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%); border-radius: 8px; font-size: 28px; font-weight: bold; color: white; text-align: center; line-height: 48px; vertical-align: middle; display: inline-block; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .subscription-box { background: white; border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .price { font-size: 32px; color: #10b981; font-weight: bold; text-align: center; margin: 15px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .info-label { font-weight: bold; color: #6b7280; }
    .info-value { color: #111827; }
    .highlight { background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
    .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%); color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; font-size: 16px; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin-top: 20px; }
    .footer p { font-size: 12px; color: #6b7280; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <table cellpadding="0" cellspacing="0" border="0" align="center">
          <tr>
            <td class="logo-box">P</td>
            <td style="padding-left: 12px;">
              <span class="site-name">PioPi</span>
            </td>
          </tr>
        </table>
      </div>
      <h1 style="margin-top: 20px; font-size: 24px;">Abonnement mis à jour ! 🎉</h1>
    </div>
    <div class="content">
      <p>Bonjour ${data.parentName || ''},</p>

      <p>Votre abonnement <strong>PioPi</strong> a été mis à jour avec succès !</p>

      <div class="subscription-box">
        <h3 style="text-align: center; color: #111827; margin-top: 0;">📋 Nouveau récapitulatif</h3>

        <div class="price">${data.newPrice}€/mois</div>

        <div class="info-row">
          <span class="info-label">Nombre d'enfants :</span>
          <span class="info-value">${data.oldChildrenCount || 0} → <strong>${data.newChildrenCount}</strong> enfant${data.newChildrenCount > 1 ? 's' : ''}</span>
        </div>

        <div class="info-row">
          <span class="info-label">Prix par enfant :</span>
          <span class="info-value">2€/mois</span>
        </div>

        <div class="info-row" style="border-bottom: none;">
          <span class="info-label">Date de prise d'effet :</span>
          <span class="info-value">${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      <div class="highlight">
        <p><strong>✨ Vos avantages :</strong></p>
        <ul style="margin: 10px 0;">
          <li>✅ ${data.newChildrenCount} profil${data.newChildrenCount > 1 ? 's' : ''} d'enfant actif${data.newChildrenCount > 1 ? 's' : ''}</li>
          <li>✅ Accès illimité à tous les cours</li>
          <li>✅ Coach IA personnalisé pour chaque enfant</li>
          <li>✅ Mode Battle et réseau social sécurisé</li>
        </ul>
      </div>

      <p><strong>💳 Facturation :</strong> Votre prochaine facture de ${data.newPrice}€ sera prélevée le ${data.nextBillingDate || 'à la fin de votre période en cours'}.</p>

      <div style="text-align: center;">
        <a href="${baseUrl}" class="button">Accéder à mon espace</a>
      </div>

      <p>Merci de votre confiance ! 🙏</p>

      <p>L'équipe PioPi</p>
    </div>
    <div class="footer">
      <p>Des questions ? Contactez-nous à <a href="mailto:support@piopi.eu" style="color: #3b82f6;">support@piopi.eu</a></p>
      <p>© 2025 PioPi - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
      `;

    case 'subscription_downgraded':
      return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .logo-container { margin-bottom: 20px; }
    .site-name { font-size: 32px; font-weight: bold; margin: 0; letter-spacing: -0.5px; line-height: 48px; vertical-align: middle; }
    .logo-box { width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%); border-radius: 8px; font-size: 28px; font-weight: bold; color: white; text-align: center; line-height: 48px; vertical-align: middle; display: inline-block; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .subscription-box { background: white; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .price { font-size: 32px; color: #f59e0b; font-weight: bold; text-align: center; margin: 15px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .info-label { font-weight: bold; color: #6b7280; }
    .info-value { color: #111827; }
    .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
    .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%); color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; font-size: 16px; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin-top: 20px; }
    .footer p { font-size: 12px; color: #6b7280; margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <table cellpadding="0" cellspacing="0" border="0" align="center">
          <tr>
            <td class="logo-box">P</td>
            <td style="padding-left: 12px;">
              <span class="site-name">PioPi</span>
            </td>
          </tr>
        </table>
      </div>
      <h1 style="margin-top: 20px; font-size: 24px;">Abonnement modifié</h1>
    </div>
    <div class="content">
      <p>Bonjour ${data.parentName || ''},</p>

      <p>Votre abonnement <strong>PioPi</strong> a été modifié suite à la suppression d'un ou plusieurs profils d'enfants.</p>

      <div class="subscription-box">
        <h3 style="text-align: center; color: #111827; margin-top: 0;">📋 Nouveau récapitulatif</h3>

        <div class="price">${data.newPrice}€/mois</div>

        <div class="info-row">
          <span class="info-label">Nombre d'enfants :</span>
          <span class="info-value">${data.oldChildrenCount || 0} → <strong>${data.newChildrenCount}</strong> enfant${data.newChildrenCount > 1 ? 's' : ''}</span>
        </div>

        <div class="info-row">
          <span class="info-label">Prix par enfant :</span>
          <span class="info-value">2€/mois</span>
        </div>

        <div class="info-row" style="border-bottom: none;">
          <span class="info-label">Date de prise d'effet :</span>
          <span class="info-value">${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      <div class="highlight">
        <p><strong>📌 Informations importantes :</strong></p>
        <ul style="margin: 10px 0;">
          <li>✅ Votre tarif a été ajusté automatiquement</li>
          <li>✅ Les données des profils supprimés sont conservées 30 jours</li>
          <li>✅ Vous pouvez réactiver les profils pendant cette période</li>
          <li>✅ Tous les autres profils restent actifs</li>
        </ul>
      </div>

      <p><strong>💳 Facturation :</strong> Votre prochaine facture sera de ${data.newPrice}€ le ${data.nextBillingDate || 'à la fin de votre période en cours'}.</p>

      <div style="text-align: center;">
        <a href="${baseUrl}" class="button">Accéder à mon espace</a>
      </div>

      <p>Merci de votre confiance ! 🙏</p>

      <p>L'équipe PioPi</p>
    </div>
    <div class="footer">
      <p>Des questions ? Contactez-nous à <a href="mailto:support@piopi.eu" style="color: #3b82f6;">support@piopi.eu</a></p>
      <p>© 2025 PioPi - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
      `;

    default:
      return `<p>Email template not found</p>`;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, subject, template, html, data = {} }: EmailRequest = await req.json();

    if (!to || !subject || (!template && !html)) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields (to, subject, and either template or html)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const htmlContent = html || getEmailTemplate(template!, data);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'PioPi <noreply@piopi.eu>',
        to: [to],
        subject: subject,
        html: htmlContent
      })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(resendData.message || 'Failed to send email');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        emailId: resendData.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});