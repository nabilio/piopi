import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface BattleSubject {
  subject_id: string;
  subject_name: string;
}

interface CreateBattleRequest {
  creator_id: string;
  opponent_id: string;
  battle_subjects: BattleSubject[];
  difficulty?: string; // Optional now, will be random if not provided
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { creator_id, opponent_id, battle_subjects, difficulty }: CreateBattleRequest = await req.json();

    console.log('Create battle request:', { creator_id, opponent_id, battle_subjects, difficulty });

    if (!creator_id || !opponent_id || !battle_subjects || battle_subjects.length === 0) {
      throw new Error('Missing required fields');
    }

    // Get creator's grade level
    const { data: creatorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('grade_level')
      .eq('id', creator_id)
      .single();

    if (profileError || !creatorProfile) {
      console.error('Creator profile error:', profileError);
      throw new Error('Creator profile not found');
    }

    console.log(`Creator grade level: ${creatorProfile.grade_level}`);

    // Calculate total quizzes (one per subject)
    const total_quizzes = battle_subjects.length;

    // Create the battle with difficulty (will be used for display purposes)
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .insert({
        creator_id,
        opponent_id,
        battle_subjects,
        difficulty: difficulty || 'moyen',
        total_quizzes,
        status: 'pending',
      })
      .select()
      .single();

    if (battleError) {
      console.error('Battle creation error:', battleError);
      throw battleError;
    }

    console.log('Battle created:', battle.id);

    // Create battle_quizzes for each subject
    const battleQuizzes = [];

    for (let i = 0; i < battle_subjects.length; i++) {
      const subject = battle_subjects[i];

      console.log(`Finding quiz for subject: ${subject.subject_name} (${subject.subject_id}), grade: ${creatorProfile.grade_level}`);

      // Step 1: Try to find quizzes for this subject and grade level (ANY difficulty)
      let { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('id, content, difficulty, title')
        .eq('subject_id', subject.subject_id)
        .eq('grade_level', creatorProfile.grade_level)
        .eq('type', 'quiz');

      if (activitiesError) {
        console.error('Error fetching activities:', activitiesError);
        throw activitiesError;
      }

      console.log(`Found ${activities?.length || 0} quiz(zes) for ${subject.subject_name} at grade ${creatorProfile.grade_level}`);

      // Step 2: If no quiz found for exact grade level, try ANY grade level
      if (!activities || activities.length === 0) {
        console.log(`No quiz at grade ${creatorProfile.grade_level}, trying any grade level...`);

        const { data: activitiesAnyGrade, error: anyGradeError } = await supabase
          .from('activities')
          .select('id, content, difficulty, title')
          .eq('subject_id', subject.subject_id)
          .eq('type', 'quiz');

        if (anyGradeError) {
          console.error('Error fetching activities (any grade):', anyGradeError);
          throw anyGradeError;
        }

        activities = activitiesAnyGrade;
        console.log(`Found ${activities?.length || 0} quiz(zes) for ${subject.subject_name} at any grade level`);
      }

      // Step 3: If still no quiz, throw error
      if (!activities || activities.length === 0) {
        console.error(`No quiz found for subject ${subject.subject_name}`);
        throw new Error(`Aucun quiz trouvé pour ${subject.subject_name}. Veuillez d'abord générer du contenu pour cette matière dans le panneau Admin.`);
      }

      // Step 4: Select a RANDOM quiz from all available quizzes
      const randomIndex = Math.floor(Math.random() * activities.length);
      const randomActivity = activities[randomIndex];

      console.log(`Selected random activity: ${randomActivity.title} (id: ${randomActivity.id}, difficulty: ${randomActivity.difficulty})`);

      battleQuizzes.push({
        battle_id: battle.id,
        subject_id: subject.subject_id,
        activity_id: randomActivity.id,
        quiz_order: i + 1,
        quiz_data: randomActivity.content,
      });
    }

    // Insert all battle quizzes
    const { error: quizzesError } = await supabase
      .from('battle_quizzes')
      .insert(battleQuizzes);

    if (quizzesError) {
      console.error('Battle quizzes creation error:', quizzesError);
      throw quizzesError;
    }

    console.log(`Created ${battleQuizzes.length} battle quizzes`);

    // Create battle participants
    const participants = [
      { battle_id: battle.id, child_id: creator_id, status: 'accepted' }, // Creator auto-accepts
      { battle_id: battle.id, child_id: opponent_id, status: 'pending' },
    ];

    const { error: participantsError } = await supabase
      .from('battle_participants')
      .insert(participants);

    if (participantsError) {
      console.error('Participants creation error:', participantsError);
      throw participantsError;
    }

    // Create battle notification
    const { error: notificationError } = await supabase
      .from('battle_notifications')
      .insert({
        user_id: opponent_id,
        battle_id: battle.id,
        from_user_id: creator_id,
        status: 'pending',
      });

    if (notificationError) {
      console.error('Notification creation error:', notificationError);
      throw notificationError;
    }

    console.log('Battle setup completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        battle_id: battle.id,
        message: `Battle invitation sent to your friend!`
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error creating battle:', error);
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
