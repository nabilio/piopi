import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateQuizRequest {
  subject: string;
  gradeLevel: string;
  chapter?: string;
  topic: string;
  numberOfQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface GenerateChapterRequest {
  subject: string;
  gradeLevel: string;
  topic?: string;
  numberOfChapters?: number;
  schoolYear?: string;
}

interface GenerateActivityRequest {
  subject: string;
  gradeLevel: string;
  chapter: string;
  activityType: 'quiz' | 'exercise' | 'story';
}

interface GenerateSubjectsRequest {
  gradeLevel: string;
  schoolYear: string;
  numberOfSubjects?: number;
}

async function getPrompt(supabase: any, promptKey: string, fallbackPrompt: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('prompts_config')
      .select('prompt_content, is_active')
      .eq('prompt_key', promptKey)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.log(`Database prompt fetch error for ${promptKey}:`, error);
      return fallbackPrompt;
    }

    if (data && data.is_active) {
      console.log(`Using database prompt for ${promptKey}`);
      return data.prompt_content;
    }

    console.log(`Using hardcoded prompt for ${promptKey}`);
    return fallbackPrompt;
  } catch (err) {
    console.log(`Error fetching prompt for ${promptKey}:`, err);
    return fallbackPrompt;
  }
}

function replacePromptVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables or use offline mode.' }),
        {
          status: 503,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (path.includes('/generate-subjects') && req.method === 'POST') {
      const body: GenerateSubjectsRequest = await req.json();

      const numberOfSubjectsInstruction = body.numberOfSubjects
        ? `Génère exactement ${body.numberOfSubjects} matières principales.`
        : `Génère TOUTES les matières du programme officiel français pour ce niveau. Ne limite pas le nombre de matières, inclus toutes les matières obligatoires et optionnelles du programme.`;

      const fallbackPrompt = `Tu es un expert en pédagogie française et en programmes scolaires officiels. Génère une liste de matières pour le programme officiel français de l'année scolaire ${body.schoolYear}-${parseInt(body.schoolYear) + 1}.

Niveau: ${body.gradeLevel}
Année scolaire: ${body.schoolYear}-${parseInt(body.schoolYear) + 1}

${numberOfSubjectsInstruction}

⛔ RÈGLE ABSOLUE - MATIÈRES INTERDITES ⛔
NE GÉNÈRE JAMAIS CES MATIÈRES (elles sont exclues du système):
- Éducation physique et sportive (EPS)
- Sport
- Éducation physique
- Arts plastiques
- Arts visuels
- Éducation musicale
- Musique
- Éducation artistique
- Spécialités lycée (uniquement tronc commun pour le lycée)

Si une matière contient les mots "sport", "physique", "EPS", "arts", "plastiques", "musicale", "musique", "artistique", NE LA GÉNÈRE PAS.

Génère les matières au format JSON avec la structure suivante:
{
  "subjects": [
    {
      "name": "Nom de la matière",
      "icon": "nom-icone-lucide",
      "color": "#HEXCODE",
      "description": "Description engageante de la matière pour des enfants",
      "grade_levels": ["CP", "CE1", ...]
    }
  ]
}

ICÔNES LUCIDE DISPONIBLES:
- calculator, book-open, flask-conical, landmark, globe, microscope, atom, wrench, palette, music, activity, heart-handshake, book-heart, languages, compass, brain, graduation-cap, beaker, telescope

COULEURS RECOMMANDÉES:
- Bleu: #3B82F6, Vert: #10B981, Violet: #8B5CF6, Orange: #F59E0B, Rose: #EC4899, Cyan: #14B8A6, Indigo: #6366F1, Rouge: #EF4444, Jaune: #F59E0B

ASSURE-TOI QUE:
1. Les matières correspondent EXACTEMENT au programme officiel français ${body.schoolYear} pour le niveau ${body.gradeLevel}
2. Les matières sont pertinentes et à jour (réformes récentes incluses)
3. Les descriptions sont courtes, motivantes et adaptées aux enfants
4. Chaque matière a les niveaux scolaires appropriés (grade_levels en array JSON)
5. Les icônes choisies sont appropriées et variées
6. Les couleurs sont différentes et attrayantes
7. Pour le primaire (CP-CM2): inclure Français, Mathématiques, Sciences et Technologie, EMC, Anglais/LV1, Questionner le monde, Histoire-Géographie, etc.
8. Pour le collège (6ème-3ème): inclure Français, Mathématiques, Histoire-Géographie, SVT, Physique-Chimie, Technologie, Anglais/LV1, LV2, EMC, etc.
9. Pour le lycée (2nde-Terminale): inclure UNIQUEMENT les matières du tronc commun (Français, Mathématiques, Histoire-Géo, LV1, LV2, Philosophie, etc.)
10. Si aucun nombre n'est spécifié, génère les matières du programme (entre 5 et 8 selon le niveau)

⚠️ VÉRIFICATION FINALE OBLIGATOIRE:
Avant de retourner le JSON, VÉRIFIE que AUCUNE matière ne contient les mots interdits mentionnés ci-dessus.
Si tu trouves une matière interdite, SUPPRIME-LA immédiatement de la liste.

RÉPONDS UNIQUEMENT EN JSON VALIDE.`;

      const promptTemplate = await getPrompt(supabase, 'generate_subjects', fallbackPrompt);
      const prompt = replacePromptVariables(promptTemplate, {
        gradeLevel: body.gradeLevel,
        schoolYear: body.schoolYear,
        nextYear: (parseInt(body.schoolYear) + 1).toString(),
        numberOfSubjectsInstruction
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Tu es un expert en éducation française et en programmes scolaires officiels. Tu connais parfaitement les programmes de chaque niveau et année scolaire. Tu réponds toujours en JSON valide.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      return new Response(
        JSON.stringify({ success: true, data: content }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (path.includes('/generate-quiz') && req.method === 'POST') {
      const body: GenerateQuizRequest = await req.json();

      const fallbackPrompt = `Tu es un expert en pédagogie française. Crée un quiz éducatif selon le programme officiel français 2025.

Matière: ${body.subject}
Niveau: ${body.gradeLevel}
${body.chapter ? `Leçon: ${body.chapter}` : ''}
Sujet: ${body.topic}
Nombre de questions: ${body.numberOfQuestions}
Difficulté: ${body.difficulty}

Génère un quiz au format JSON avec la structure suivante:
{
  "title": "Titre du quiz",
  "description": "Description courte",
  "questions": [
    {
      "question": "Question ici",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explication de la réponse"
    }
  ]
}

Assure-toi que:
- Les questions sont adaptées au niveau ${body.gradeLevel}
- Le contenu suit le programme officiel français 2025
- Les explications sont claires et pédagogiques
- Le vocabulaire est adapté à l'âge des élèves`;

      const promptTemplate = await getPrompt(supabase, 'generate_quiz', fallbackPrompt);
      const prompt = replacePromptVariables(promptTemplate, {
        subject: body.subject,
        gradeLevel: body.gradeLevel,
        chapter: body.chapter || '',
        topic: body.topic,
        numberOfQuestions: body.numberOfQuestions.toString(),
        difficulty: body.difficulty
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Tu es un expert en pédagogie française spécialisé dans la création de contenu éducatif pour le programme officiel 2025. Tu réponds toujours en JSON valide.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      return new Response(
        JSON.stringify({ success: true, data: content }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (path.includes('/generate-chapter') && req.method === 'POST') {
      const body: GenerateChapterRequest = await req.json();

      const currentYear = body.schoolYear || new Date().getFullYear().toString();
      const nextYear = (parseInt(currentYear) + 1).toString();
      const isMultipleChapters = !body.topic;
      const numberOfChaptersInstruction = body.numberOfChapters
        ? `Génère exactement ${body.numberOfChapters} leçons principaux.`
        : `Génère TOUS les leçons du programme officiel français pour cette matière et ce niveau. Ne limite pas le nombre, inclus tous les leçons obligatoires du programme.`;

      const fallbackPromptMultiple = `Tu es un expert en pédagogie française. Génère une liste complète de leçons selon le programme officiel français de l'année scolaire ${currentYear}-${nextYear}.

Matière: ${body.subject}
Niveau: ${body.gradeLevel}

${numberOfChaptersInstruction}

Génère les leçons au format JSON avec la structure suivante:
{
  "chapters": [
    {
      "title": "Titre du leçon",
      "description": "Description détaillée du leçon",
      "objectives": ["Objectif 1", "Objectif 2", "Objectif 3"],
      "content": "Contenu pédagogique détaillé",
      "keyPoints": ["Point clé 1", "Point clé 2"],
      "order_index": 0
    }
  ]
}

ASSURE-TOI QUE:
1. Les leçons suivent EXACTEMENT le programme officiel français ${currentYear}-${nextYear} pour ${body.gradeLevel}
2. Les leçons sont dans l'ordre logique d'apprentissage (order_index commence à 0)
3. Chaque leçon a des objectifs conformes au programme
4. Le contenu est détaillé et pédagogique
5. Les points clés sont essentiels pour la compréhension
6. Si aucun nombre n'est spécifié, génère TOUS les leçons du programme (généralement 6-12 selon la matière)

RÉPONDS UNIQUEMENT EN JSON VALIDE.`;

      const fallbackPromptSingle = `Tu es un expert en pédagogie française. Crée une structure de leçon selon le programme officiel français de l'année scolaire ${currentYear}-${nextYear}.

Matière: ${body.subject}
Niveau: ${body.gradeLevel}
Sujet: ${body.topic}

Génère un leçon au format JSON avec la structure suivante:
{
  "title": "Titre du leçon",
  "description": "Description détaillée du leçon",
  "objectives": ["Objectif 1", "Objectif 2", "Objectif 3"],
  "content": "Contenu pédagogique détaillé",
  "keyPoints": ["Point clé 1", "Point clé 2"],
  "suggestedActivities": [
    {
      "type": "quiz",
      "title": "Titre de l'activité",
      "description": "Description"
    }
  ]
}

Assure-toi que:
- Le contenu suit strictement le programme officiel français ${currentYear}-${nextYear}
- Les objectifs sont conformes aux attendus du niveau ${body.gradeLevel}
- Le vocabulaire est adapté à l'âge des élèves
- Les activités suggérées sont variées et engageantes`;

      const promptKey = isMultipleChapters ? 'generate_chapters' : 'generate_chapter';
      const fallbackPrompt = isMultipleChapters ? fallbackPromptMultiple : fallbackPromptSingle;

      const promptTemplate = await getPrompt(supabase, promptKey, fallbackPrompt);
      const prompt = replacePromptVariables(promptTemplate, {
        schoolYear: currentYear,
        nextYear: nextYear,
        subject: body.subject,
        gradeLevel: body.gradeLevel,
        topic: body.topic || '',
        numberOfChaptersInstruction
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Tu es un expert en pédagogie française spécialisé dans la création de contenu éducatif pour le programme officiel 2025. Tu réponds toujours en JSON valide.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      return new Response(
        JSON.stringify({ success: true, data: content }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (path.includes('/generate-activity') && req.method === 'POST') {
      const body: GenerateActivityRequest = await req.json();

      let activityPrompt = '';

      switch(body.activityType) {
        case 'quiz':
          activityPrompt = `Crée un quiz interactif de 5 questions`;
          break;
        case 'exercise':
          activityPrompt = `Crée un exercice pratique avec 5 questions/problèmes`;
          break;
        case 'story':
          activityPrompt = `Crée une histoire éducative interactive`;
          break;
      }

      const fallbackPrompt = `Tu es un expert en pédagogie française. ${activityPrompt} selon le programme officiel français 2025.

Matière: ${body.subject}
Niveau: ${body.gradeLevel}
Leçon: ${body.chapter}
Type: ${body.activityType}

Génère une activité au format JSON avec la structure suivante:
{
  "title": "Titre de l'activité",
  "description": "Description de l'activité",
  "type": "${body.activityType}",
  "content": ${body.activityType === 'story' ? '"Contenu de l\'histoire"' : '{ "questions": [...] }'},
  "estimatedDuration": "15 minutes",
  "points": 100
}

Assure-toi que:
- Le contenu est adapté au niveau ${body.gradeLevel}
- L'activité est engageante et ludique
- Les instructions sont claires`;

      const promptTemplate = await getPrompt(supabase, 'generate_activity', fallbackPrompt);
      const prompt = replacePromptVariables(promptTemplate, {
        subject: body.subject,
        gradeLevel: body.gradeLevel,
        chapter: body.chapter,
        activityType: body.activityType,
        activityPrompt
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Tu es un expert en pédagogie française spécialisé dans la création de contenu éducatif pour le programme officiel 2025. Tu réponds toujours en JSON valide.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      return new Response(
        JSON.stringify({ success: true, data: content }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Invalid endpoint',
        availableEndpoints: [
          'POST /generate-subjects',
          'POST /generate-quiz',
          'POST /generate-chapter',
          'POST /generate-activity'
        ]
      }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        hint: 'Check if OPENAI_API_KEY is configured or use offline mode'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});