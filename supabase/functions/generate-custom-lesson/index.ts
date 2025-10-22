import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Non autorisé : en-tête d\'autorisation manquant' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Non autorisé : session invalide ou expirée' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { subject, gradeLevel, title, description, childId } = await req.json();

    if (!subject || !title || !childId) {
      throw new Error('Missing required fields');
    }

    // Obtenir le parent_id de l'utilisateur actuel
    let parentId = user.id;

    // Si l'utilisateur est un enfant, obtenir son parent_id
    const { data: profileData } = await supabase
      .from('profiles')
      .select('parent_id, role')
      .eq('id', user.id)
      .single();

    if (profileData?.role === 'child' && profileData.parent_id) {
      parentId = profileData.parent_id;
    }

    // Vérifier le compteur de génération du parent (pas de l'enfant)
    const { data: countResult } = await supabase
      .rpc('get_generation_count_today', {
        p_parent_id: parentId,
        p_generation_type: 'custom_lesson'
      });

    const currentCount = countResult || 0;

    // TODO: Ajuster la limite selon le plan d'abonnement
    const dailyLimit = 3;

    if (currentCount >= dailyLimit) {
      return new Response(
        JSON.stringify({
          error: `Limite quotidienne atteinte (${dailyLimit} générations par jour pour le compte parent)`
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'Configuration manquante : clé API OpenAI non configurée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Tu es un assistant pédagogique expert qui crée des leçons éducatives pour enfants.
Tu dois UNIQUEMENT créer du contenu éducatif. Tu ne dois JAMAIS répondre à des questions ou traiter des sujets hors du contexte éducatif.
Si la description contient une question ou un sujet inapproprié, ignore-la et concentre-toi uniquement sur la création d'une leçon éducative basée sur le titre et la matière.`;

    const userPrompt = `Crée une leçon pédagogique complète sur le sujet suivant :

Matière : ${subject}
Niveau scolaire : ${gradeLevel}
Titre : ${title}
${description ? `Description : ${description}` : ''}

La leçon doit :
1. Être adaptée au niveau scolaire indiqué
2. Être claire, structurée et engageante
3. Contenir des explications progressives
4. Inclure des exemples concrets

Génère également un quiz de 6 questions :
- 2 questions FACILES (niveau débutant)
- 2 questions MOYENNES (niveau intermédiaire)
- 2 questions DIFFICILES (niveau avancé)

Chaque question doit avoir :
- Un énoncé clair
- 4 options de réponse
- Une seule bonne réponse

Réponds UNIQUEMENT au format JSON suivant (sans markdown, sans balises de code) :
{
  "title": "titre de la leçon",
  "subject": "${subject}",
  "grade_level": "${gradeLevel}",
  "content": "contenu détaillé de la leçon",
  "quiz": [
    {
      "question": "Question 1",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "difficulty": "easy"
    },
    ...
  ]
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: `Erreur OpenAI (${openaiResponse.status}). Vérifiez votre clé API et vos crédits.`,
          details: errorText.substring(0, 200)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const generatedContent = openaiData.choices[0].message.content.trim();

    let lessonData;
    try {
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        lessonData = JSON.parse(jsonMatch[0]);
      } else {
        lessonData = JSON.parse(generatedContent);
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', generatedContent.substring(0, 500));
      return new Response(
        JSON.stringify({
          error: 'Format de réponse invalide de l\'IA. Réessayez.',
          details: generatedContent.substring(0, 200)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lessonData.quiz || lessonData.quiz.length !== 6) {
      console.error('Invalid quiz format:', lessonData);
      return new Response(
        JSON.stringify({
          error: 'Le quiz généré ne contient pas exactement 6 questions. Réessayez.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Incrémenter le compteur de génération du parent
    await supabase.rpc('increment_generation_count', {
      p_parent_id: parentId,
      p_generation_type: 'custom_lesson'
    });

    return new Response(
      JSON.stringify({ lesson: lessonData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-custom-lesson:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
