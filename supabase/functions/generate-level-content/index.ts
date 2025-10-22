import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function generateContent(gradeLevel: string, statusId: string) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    await supabase.from('generation_status').update({
      status: 'generating',
      progress: 10,
      message: `Génération des matières pour ${gradeLevel}...`,
      started_at: new Date().toISOString()
    }).eq('id', statusId);

    const generatedData = {
      subjects: []
    };

    // ÉTAPE 1: Générer les matières selon le programme officiel
    const subjectsPrompt = `Tu es un expert en pédagogie française. Génère les matières du programme officiel français 2025 pour le niveau ${gradeLevel}.

IMPORTANT: Génère les matières obligatoires pour ce niveau. Pour ${gradeLevel}, cela inclut généralement:
- Français
- Mathématiques
- Histoire-Géographie
- Sciences et Technologie (ou SVT/Physique-Chimie pour le collège)
- Langue vivante
- Et toute autre matière du programme officiel pour ce niveau

EXCLUSIONS: NE PAS GÉNÉRER les matières suivantes:
- Éducation physique et sportive (EPS)
- Arts plastiques
- Éducation musicale
- Spécialités lycée (uniquement tronc commun pour le lycée)

Génère les matières au format JSON avec la structure suivante:
{
  "subjects": [
    {
      "name": "Nom de la matière",
      "icon": "book-open",
      "color": "#3B82F6",
      "description": "Description courte et engageante"
    }
  ]
}

Icones disponibles: calculator, book-open, flask-conical, landmark, globe, microscope, palette, music, heart-handshake, languages, brain
Couleurs: #3B82F6, #10B981, #F59E0B, #EC4899, #14B8A6, #EF4444

RÉPONDS UNIQUEMENT EN JSON VALIDE.`;

    const subjectsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Tu es un expert en éducation française. Tu réponds toujours en JSON valide.' },
          { role: 'user', content: subjectsPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    const subjectsData = await subjectsResponse.json();
    const subjectsContent = JSON.parse(subjectsData.choices[0].message.content);

    // Sauvegarder les matières
    for (const subject of subjectsContent.subjects) {
      const { data: insertedSubject, error } = await supabase
        .from('subjects')
        .insert({
          name: subject.name,
          icon: subject.icon,
          color: subject.color,
          description: subject.description,
          grade_levels: [gradeLevel]
        })
        .select()
        .single();

      if (!error && insertedSubject) {
        generatedData.subjects.push(insertedSubject);
      }
    }

    // Marquer comme terminé
    await supabase.from('generation_status').update({
      status: 'completed',
      progress: 100,
      message: `${generatedData.subjects.length} matières générées pour ${gradeLevel} !`,
      subjects_count: generatedData.subjects.length,
      chapters_count: 0,
      quizzes_count: 0,
      completed_at: new Date().toISOString()
    }).eq('id', statusId);

  } catch (error) {
    console.error('Generation error:', error);
    await supabase.from('generation_status').update({
      status: 'error',
      message: `Erreur: ${error.message}`
    }).eq('id', statusId);
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
    const { gradeLevel } = await req.json();

    if (!gradeLevel) {
      throw new Error('gradeLevel is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Créer un statut de génération
    const { data: status, error: statusError } = await supabase
      .from('generation_status')
      .insert({
        grade_level: gradeLevel,
        status: 'pending',
        progress: 0,
        message: 'En attente de démarrage...'
      })
      .select()
      .single();

    if (statusError || !status) {
      throw new Error('Failed to create generation status');
    }

    // Lancer la génération et attendre sa complétion
    await generateContent(gradeLevel, status.id);

    // Retourner avec le statut final
    const { data: finalStatus } = await supabase
      .from('generation_status')
      .select('*')
      .eq('id', status.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        statusId: status.id,
        status: finalStatus,
        message: 'Génération terminée avec succès'
      }),
      {
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
        error: error.message || 'Internal server error'
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
