import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { storyId } = await req.json();

    if (!storyId) {
      return new Response(
        JSON.stringify({ error: 'Missing story ID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('*, profiles!stories_child_id_fkey(full_name, grade_level, parent_id)')
      .eq('id', storyId)
      .single();

    if (storyError || !story) {
      return new Response(
        JSON.stringify({ error: 'Story not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const childProfile = story.profiles;
    if (childProfile.parent_id !== user.id && story.child_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to create quiz for this story' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const numQuestions = story.grade_level === 'Maternelle' || story.grade_level === 'CP' ? 5 : 8;

    const systemPrompt = `Tu es un créateur de quiz pédagogiques pour enfants.

RÈGLES ABSOLUES :
- Crée UNIQUEMENT des questions de compréhension basées sur l'histoire fournie
- Les questions doivent tester la compréhension de l'histoire
- Adapte la difficulté au niveau scolaire indiqué
- Utilise un langage clair et positif
- Ne demande jamais d'opinion ou d'interprétation personnelle

FORMAT DES QUESTIONS :
- ${numQuestions} questions à choix multiples
- 4 options de réponse par question (A, B, C, D)
- Une seule réponse correcte
- Les options incorrectes doivent être plausibles mais clairement fausses

TYPES DE QUESTIONS :
- Questions sur les personnages principaux
- Questions sur le déroulement de l'histoire
- Questions sur les lieux et le contexte
- Questions sur les actions et décisions des personnages
- Questions sur la fin de l'histoire

Réponds UNIQUEMENT avec un JSON valide au format suivant :
{
  "questions": [
    {
      "question": "Question ici ?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explication de la réponse"
    }
  ]
}`;

    const userPrompt = `Niveau scolaire : ${story.grade_level}

Histoire :
Titre : ${story.title}

${story.content}

Crée ${numQuestions} questions de compréhension adaptées à ce niveau scolaire.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate quiz' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const quizData = JSON.parse(openaiData.choices[0].message.content);

    const { data: existingQuiz } = await supabase
      .from('story_quiz')
      .select('id')
      .eq('story_id', storyId)
      .single();

    let quiz;
    if (existingQuiz) {
      const { data: updatedQuiz, error: updateError } = await supabase
        .from('story_quiz')
        .update({ questions: quizData.questions })
        .eq('id', existingQuiz.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update quiz' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      quiz = updatedQuiz;
    } else {
      const { data: newQuiz, error: insertError } = await supabase
        .from('story_quiz')
        .insert({
          story_id: storyId,
          questions: quizData.questions
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save quiz' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      quiz = newQuiz;
    }

    return new Response(
      JSON.stringify({ quiz }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
