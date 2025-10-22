import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  email?: string;
  userEmail?: string;
  userName?: string;
  oldChildrenCount?: number;
  newChildrenCount?: number;
  oldPrice: number;
  newPrice: number;
  oldPlan?: string;
  newPlan?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const {
      email,
      userEmail,
      userName,
      oldChildrenCount,
      newChildrenCount,
      oldPrice,
      newPrice,
      oldPlan,
      newPlan
    }: RequestBody = await req.json();

    const recipientEmail = email || userEmail || '';
    const recipientName = userName || 'Parent';

    // Prepare email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .logo-container { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
          .site-name { font-size: 32px; font-weight: bold; margin: 0; letter-spacing: -0.5px; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .comparison { display: flex; justify-content: space-around; margin: 20px 0; }
          .old-value { color: #6b7280; text-decoration: line-through; }
          .new-value { color: #3b82f6; font-weight: bold; font-size: 1.2em; }
          .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #a855f7 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; margin-top: 20px; }
          .footer p { font-size: 12px; color: #6b7280; margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-container">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g transform="rotate(-15 24 24)">
                  <rect x="8" y="18" width="4" height="20" rx="2" fill="#ef4444"/>
                  <path d="M10 15 L12 8 L14 15" stroke="#ef4444" stroke-width="2" stroke-linecap="round" fill="none"/>
                </g>
                <rect x="18" y="22" width="20" height="2" rx="1" fill="white" opacity="0.9"/>
                <rect x="18" y="26" width="20" height="2" rx="1" fill="white" opacity="0.9"/>
              </svg>
              <div class="site-name">PioPi</div>
            </div>
            <h1 style="margin-top: 20px; font-size: 24px;">Mise à jour de votre abonnement</h1>
          </div>
          <div class="content">
            <h2>Votre abonnement a été mis à jour</h2>
            <p>Bonjour ${recipientName},</p>
            <p>Votre abonnement PioPi a été mis à jour avec succès.</p>

            <div class="info-box">
              <h3>📊 Changements effectués</h3>
              <div class="comparison">
                ${oldPlan && newPlan ? `
                <div>
                  <p><strong>Plan</strong></p>
                  <p class="old-value">${oldPlan}</p>
                  <p class="new-value">${newPlan}</p>
                </div>
                ` : ''}
                ${oldChildrenCount && newChildrenCount ? `
                <div>
                  <p><strong>Nombre d'enfants</strong></p>
                  <p class="old-value">${oldChildrenCount}</p>
                  <p class="new-value">${newChildrenCount}</p>
                </div>
                ` : ''}
                <div>
                  <p><strong>Tarif mensuel</strong></p>
                  <p class="old-value">${oldPrice}€/mois</p>
                  <p class="new-value">${newPrice}€/mois</p>
                </div>
              </div>
            </div>

            <div class="info-box">
              <h3>ℹ️ Informations importantes</h3>
              <ul>
                <li>✓ Le nouveau tarif s'applique dès maintenant</li>
                <li>✓ Votre période d'essai gratuit reste active si applicable</li>
                <li>✓ Vous pouvez annuler à tout moment sans frais</li>
                <li>✓ Gérez votre abonnement depuis vos paramètres</li>
              </ul>
            </div>

            <p style="text-align: center;">
              <a href="${supabaseUrl.replace('/v1', '')}" class="button">Gérer mon abonnement</a>
            </p>

            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            <p>L'équipe PioPi</p>
          </div>
          <div class="footer">
            <p>Des questions ? Contactez-nous à <a href="mailto:support@piopi.eu" style="color: #3b82f6;">support@piopi.eu</a></p>
            <p>© 2025 PioPi - Tous droits réservés</p>
            <p>Vous recevez cet email car votre abonnement PioPi a été modifié.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via send-email function
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject: '✨ Mise à jour de votre abonnement PioPi',
        html: emailHtml
      }),
    });

    if (!emailResponse.ok) {
      console.error('Failed to send email:', await emailResponse.text());
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Subscription update email sent' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
