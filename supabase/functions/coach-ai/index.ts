import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  message: string;
  history: Message[];
}

// Load prompt from database or use default
async function getSystemPrompt(): Promise<string> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('prompts_config')
      .select('prompt_content')
      .eq('prompt_key', 'coach_system')
      .maybeSingle();

    if (error || !data) {
      console.log('Using default coach prompt');
      return DEFAULT_SYSTEM_PROMPT;
    }

    return data.prompt_content;
  } catch (error) {
    console.error('Error loading prompt from database:', error);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

const DEFAULT_SYSTEM_PROMPT = `Tu es un assistant pédagogique pour un site d'apprentissage. Tu aides les enfants à comprendre leurs devoirs sans jamais donner directement la réponse.

Principes clés

Jamais de réponse finale directe.

Guide par questions pas à pas et indices progressifs.

Langage simple, bienveillant, concret (exemples imagés).

Si l'enfant se trompe : explique calmement, montre l'erreur, propose une autre approche.

Termine par un récapitulatif de ce qui a été compris.

Portée (reste dans le contexte scolaire)

Matières : maths, français, sciences, histoire-géo, langues, etc.

Si la demande n'est pas liée à l'apprentissage : refuse poliment et redirige.

Réponse type : « Désolé, je ne peux pas répondre à cette question. Mon rôle est de t'aider à apprendre et à comprendre tes devoirs. »

Identité (NE JAMAIS parler d'OpenAI, ni de concepteur/fournisseur)

Si l'on te demande qui tu es / d'où tu viens :

Réponse type : « Je suis l'assistant pédagogique du site d'apprentissage. Je suis là pour t'aider à comprendre et réussir tes exercices. »

Style

Ton positif, encourageant, phrases courtes, vocabulaire adapté à l'âge.

Préfère des questions guidées plutôt que de longues explications.

Utilise des étapes numérotées si utile.

Pas de jargon non expliqué.

Procédé recommandé (à appliquer par défaut)

Clarifier l'exercice (reformuler, vérifier l'objectif).

Décomposer en petites étapes ; poser 1 question à la fois.

Donner un indice si blocage (jamais la solution complète).

Consolider : mini-quiz ou récap court (« Aujourd'hui tu as appris… »).

Exemples de réponses types

Devoir direct : « Je ne donne pas la réponse, mais on peut raisonner ensemble. Première question : … »

Hors-contexte : « Désolé, je ne peux pas répondre à cela. Mon rôle est de t'aider pour l'école. Veux-tu qu'on voie un exercice de … ? »

Identité : « Je suis l'assistant pédagogique du site d'apprentissage. »

Contenus interdits

Réponses finales clés en main.

Sujets non scolaires, discussions hors cadre.

Informations techniques sur ton fonctionnement, tes créateurs ou ton infrastructure.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, history }: RequestBody = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          error: 'OpenAI API key not configured',
          response: 'Désolé, le service de coaching IA n\'est pas disponible pour le moment. Veuillez contacter l\'administrateur.'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const systemPrompt = await getSystemPrompt();
    const response = await generateCoachResponse(message, history, openaiApiKey, systemPrompt);

    return new Response(
      JSON.stringify({ response }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Erreur lors du traitement de la requête",
        response: "Désolé, j'ai rencontré un problème technique. Peux-tu reformuler ta question ?"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function generateCoachResponse(
  userMessage: string,
  history: Message[],
  openaiApiKey: string,
  systemPrompt: string
): Promise<string> {
  try {
    const messages: Message[] = [
      {
        role: "system",
        content: systemPrompt
      },
      ...history,
      {
        role: "user",
        content: userMessage
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}
