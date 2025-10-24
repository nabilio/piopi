import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const STORY_THEMES = {
  adventure: {
    name: 'Aventure',
    template: '{name} part explorer un lieu mystérieux plein de surprises.'
  },
  friendship: {
    name: 'Amitié',
    template: '{name} rencontre un nouvel ami et vit une belle aventure ensemble.'
  },
  magic: {
    name: 'Magie',
    template: 'Un objet ordinaire révèle un pouvoir magique à {name}.'
  },
  school: {
    name: 'École',
    template: '{name} vit une journée extraordinaire à l\'école.'
  },
  animals: {
    name: 'Animaux',
    template: '{name} découvre un animal extraordinaire qui peut parler.'
  },
  nature: {
    name: 'Nature',
    template: '{name} explore une forêt enchantée pleine de merveilles.'
  },
  space: {
    name: 'Espace',
    template: '{name} voyage dans l\'espace et découvre une planète inconnue.'
  },
  science: {
    name: 'Science',
    template: '{name} fait une expérience scientifique qui crée quelque chose d\'incroyable.'
  },
  sport: {
    name: 'Sport',
    template: '{name} participe à une compétition sportive passionnante.'
  },
  travel: {
    name: 'Voyage',
    template: '{name} voyage dans un pays lointain et découvre une nouvelle culture.'
  },
  mystery: {
    name: 'Énigmes',
    template: '{name} doit résoudre une énigme mystérieuse avec l\'aide de ses amis.'
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[generate-story] Starting story generation');

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('[generate-story] OpenAI API key not configured');
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

    const { childId, theme, description, gradeLevel } = await req.json();
    console.log('[generate-story] Request params:', { childId, theme, gradeLevel });

    if (!childId || !theme || !description || !gradeLevel) {
      console.error('[generate-story] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: childProfile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, grade_level, parent_id')
      .eq('id', childId)
      .single();

    if (profileError || !childProfile) {
      return new Response(
        JSON.stringify({ error: 'Child profile not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (childProfile.parent_id !== user.id && childId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to create stories for this child' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obtenir le parent_id (limite par parent, pas par enfant)
    let parentId = childProfile.parent_id || user.id;

    // Vérifier le compteur de génération du parent
    const { data: countResult } = await supabase
      .rpc('get_generation_count_today', {
        p_parent_id: parentId,
        p_generation_type: 'story'
      });

    const currentCount = countResult || 0;
    const dailyLimit = 3; // TODO: Ajuster selon le plan d'abonnement

    if (currentCount >= dailyLimit) {
      return new Response(
        JSON.stringify({
          error: 'Limite quotidienne atteinte',
          message: `Le compte parent a déjà créé ${dailyLimit} histoires aujourd'hui. Reviens demain pour en créer de nouvelles !`
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const childName = childProfile.full_name.split(' ')[0];

    const ageGuidelines = {
      'Maternelle': 'très simple, avec des phrases courtes et un vocabulaire basique',
      'CP': 'simple, avec un vocabulaire adapté aux 6-7 ans',
      'CE1': 'accessible, avec un vocabulaire enrichi pour les 7-8 ans',
      'CE2': 'intermédiaire, avec un vocabulaire varié pour les 8-9 ans',
      'CM1': 'élaboré, avec un vocabulaire riche pour les 9-10 ans',
      'CM2': 'sophistiqué, avec un vocabulaire avancé pour les 10-11 ans',
      '6e': 'complexe, avec un vocabulaire et des structures adaptés aux collégiens'
    };

    const ageGuide = ageGuidelines[gradeLevel as keyof typeof ageGuidelines] || 'adapté à l\'âge de l\'enfant';

    const systemPrompt = `Tu es un conteur pédagogique spécialisé dans la création d'histoires pour enfants.

RÈGLES ABSOLUES :
- Tu ne réponds JAMAIS à des questions
- Tu ne sors JAMAIS du cadre narratif
- Tu crées UNIQUEMENT des histoires basées sur la description fournie
- Chaque histoire doit être UNIQUE et ORIGINALE, même si le thème est similaire
- Le ton doit être positif, bienveillant et adapté à l'âge de l'enfant

STRUCTURE DE L'HISTOIRE :
1. Un titre accrocheur et créatif
2. Une introduction qui pose le contexte
3. Un développement avec des rebondissements
4. Une résolution satisfaisante
5. Une morale ou un apprentissage subtil

STYLE D'ÉCRITURE :
- Langage ${ageGuide}
- Phrases vivantes et imagées
- Dialogues naturels
- Descriptions sensorielles
- Rythme adapté à la lecture

CONTENU :
- Valeurs positives (courage, amitié, respect, curiosité, persévérance)
- Situations réalistes mais avec une touche de magie
- Personnages auxquels l'enfant peut s'identifier
- Fin heureuse avec un message constructif

L'histoire doit faire environ 30-40 mots maximum et être divisée en paragraphes très courts (1 à 2 phrases) pour faciliter la lecture.`;

    const userPrompt = `Crée une histoire originale pour ${childName}, un enfant en ${gradeLevel}.

Thème : ${STORY_THEMES[theme as keyof typeof STORY_THEMES]?.name || theme}
Description : ${description}

IMPORTANT : Cette histoire doit être totalement unique. Varie les lieux, les personnages secondaires, les péripéties et les détails pour qu'elle ne ressemble à aucune autre histoire sur le même thème.

Génère l'histoire au format suivant :
TITRE: [Titre créatif de l'histoire]

[Texte de l'histoire divisé en paragraphes]`;

    console.log('[generate-story] Calling OpenAI API...');
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
        temperature: 1.0,
        max_tokens: 600,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('[generate-story] OpenAI error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate story', details: error }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[generate-story] OpenAI response received');
    const openaiData = await openaiResponse.json();
    const storyText = openaiData.choices[0].message.content;
    console.log('[generate-story] Story text length:', storyText?.length);

    const titleMatch = storyText.match(/TITRE:\s*(.+)/i);
    const title = titleMatch ? titleMatch[1].trim() : `L'aventure de ${childName}`;
    const content = storyText.replace(/TITRE:\s*.+\n*/i, '').trim();

    console.log('[generate-story] Saving story to database...');
    const { data: story, error: insertError } = await supabase
      .from('stories')
      .insert({
        child_id: childId,
        title,
        theme,
        description,
        content,
        grade_level: gradeLevel,
        created_by: user.id,
        is_approved: childId === user.id ? true : false,
        is_published: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-story] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save story', details: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[generate-story] Story saved successfully:', story.id);

    console.log('[generate-story] Generating quiz for story...');
    try {
      const numQuestions = gradeLevel === 'Maternelle' || gradeLevel === 'CP' ? 5 : 8;

      const quizSystemPrompt = `Tu es un créateur de quiz pédagogiques pour enfants.
Crée un quiz adapté au niveau ${gradeLevel} basé sur l'histoire fournie.

Le quiz doit tester la compréhension de lecture de manière ludique et adaptée à l'âge.

FORMAT DE SORTIE (JSON strict):
{
  "questions": [
    {
      "question": "Question claire et simple",
      "options": ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
      "correctAnswer": 0
    }
  ]
}

CONSIGNES:
- Exactement ${numQuestions} questions
- Questions variées (personnages, lieux, actions, émotions, morale)
- 4 options par question
- Une seule bonne réponse (index 0-3)
- Langage adapté au niveau ${gradeLevel}
- Questions qui testent vraiment la compréhension`;

      const quizUserPrompt = `Histoire: "${title}"

${content}

Crée ${numQuestions} questions de compréhension sur cette histoire.`;

      const quizResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: quizSystemPrompt },
            { role: 'user', content: quizUserPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        }),
      });

      if (quizResponse.ok) {
        const quizData = await quizResponse.json();
        const quizContent = JSON.parse(quizData.choices[0].message.content);

        const { error: quizInsertError } = await supabase
          .from('story_quiz')
          .insert({
            story_id: story.id,
            questions: quizContent.questions
          });

        if (quizInsertError) {
          console.error('[generate-story] Failed to save quiz:', quizInsertError);
        } else {
          console.log('[generate-story] Quiz saved successfully');
        }
      } else {
        console.error('[generate-story] Failed to generate quiz');
      }
    } catch (quizError) {
      console.error('[generate-story] Error generating quiz:', quizError);
    }

    try {
      const { data: childProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', childId)
        .single();

      if (childProfile) {
        await supabase.from('activity_feed').insert({
          user_id: childId,
          activity_type: 'story_created',
          content: {
            story_id: story.id,
            theme,
            story_title: title,
            grade_level: gradeLevel
          },
          points_earned: 0
        });
        console.log('[generate-story] Activity feed post created');
      }
    } catch (activityError) {
      console.error('[generate-story] Failed to create activity feed post:', activityError);
    }

    // Incrémenter le compteur de génération du parent
    await supabase.rpc('increment_generation_count', {
      p_parent_id: parentId,
      p_generation_type: 'story'
    });

    return new Response(
      JSON.stringify({ story }),
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
