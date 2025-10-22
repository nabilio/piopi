import { useState, useEffect } from 'react';
import { Sparkles, Loader, XCircle, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Subject = {
  id: string;
  name: string;
  grade_levels?: string[];
};

type Chapter = {
  id: string;
  subject_id: string;
  title: string;
  grade_level: string;
};

type ProgressState = {
  currentLevel: string;
  currentLevelIndex: number;
  totalLevels: number;
  currentSubject?: string;
  currentSubjectIndex?: number;
  totalSubjects?: number;
  currentLesson?: string;
  currentLessonIndex?: number;
  totalLessons?: number;
  currentQuizType?: string;
  currentQuizNumber?: number;
  totalQuizzes?: number;
  isRunning: boolean;
  isPaused: boolean;
};

const GRADE_LEVELS = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];

export function BulkGeneration() {
  const [progressLessons, setProgressLessons] = useState<ProgressState>({
    currentLevel: '',
    currentLevelIndex: 0,
    totalLevels: 0,
    isRunning: false,
    isPaused: false,
  });

  const [progressQuizzes, setProgressQuizzes] = useState<ProgressState>({
    currentLevel: '',
    currentLevelIndex: 0,
    totalLevels: 0,
    isRunning: false,
    isPaused: false,
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [failedGenerations, setFailedGenerations] = useState<any[]>([]);
  const [showFailures, setShowFailures] = useState(false);

  useEffect(() => {
    loadProgress();
    loadFailedGenerations();

    // Vérifier toutes les 30 secondes si la génération est bloquée
    const monitorInterval = setInterval(async () => {
      await checkAndUnblockStuckGenerations();
    }, 30000);

    // Vérifier toutes les 2 minutes si la génération doit être relancée automatiquement
    const autoRestartInterval = setInterval(async () => {
      await checkAndAutoRestartGenerations();
    }, 120000);

    return () => {
      clearInterval(monitorInterval);
      clearInterval(autoRestartInterval);
    };
  }, []);

  const checkAndUnblockStuckGenerations = async () => {
    const { data: progressData } = await supabase
      .from('bulk_generation_progress')
      .select('*')
      .eq('is_running', true);

    if (!progressData || progressData.length === 0) return;

    for (const progress of progressData) {
      const lastUpdate = new Date(progress.updated_at);
      const now = new Date();
      const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

      if (minutesSinceUpdate > 3) {
        console.warn(`⚠️ Auto-déblocage: ${progress.generation_type} bloqué depuis ${Math.round(minutesSinceUpdate)} minutes`);

        await supabase
          .from('bulk_generation_progress')
          .update({ is_running: false })
          .eq('id', progress.id);

        await loadProgress();
      }
    }
  };

  const checkAndAutoRestartGenerations = async () => {
    const { data: progressData } = await supabase
      .from('bulk_generation_progress')
      .select('*');

    if (!progressData) return;

    for (const progress of progressData) {
      // Si la génération n'est pas en cours et n'est pas terminée (pas au dernier niveau)
      const isNotRunning = !progress.is_running;
      const isNotFinished = progress.current_level !== 'Terminé!' && progress.current_level !== 'Erreur - Arrêté';
      const hasLevelsRemaining = progress.current_level_index < progress.total_levels;

      if (isNotRunning && isNotFinished && hasLevelsRemaining) {
        const lastUpdate = new Date(progress.updated_at);
        const now = new Date();
        const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

        // Si arrêté depuis plus de 5 minutes, relancer automatiquement
        if (minutesSinceUpdate > 5) {
          console.log(`🔄 Auto-relance: ${progress.generation_type} arrêté depuis ${Math.round(minutesSinceUpdate)} minutes`);

          if (progress.generation_type === 'quizzes') {
            console.log('🚀 Relance automatique de la génération de quiz...');
            // Relancer en arrière-plan sans attendre
            setTimeout(() => {
              generateAllQuizzes().catch(err =>
                console.error('Erreur lors de la relance auto des quiz:', err)
              );
            }, 1000);
          } else if (progress.generation_type === 'lessons') {
            console.log('🚀 Relance automatique de la génération de leçons...');
            setTimeout(() => {
              generateAllLessons().catch(err =>
                console.error('Erreur lors de la relance auto des leçons:', err)
              );
            }, 1000);
          }
        }
      }
    }
  };

  const loadFailedGenerations = async () => {
    const { data } = await supabase
      .from('failed_generations')
      .select('*')
      .is('retried_successfully_at', null)
      .order('created_at', { ascending: false });

    if (data) {
      setFailedGenerations(data);
    }
  };

  const loadProgress = async () => {
    const { data: lessonsProgress } = await supabase
      .from('bulk_generation_progress')
      .select('*')
      .eq('generation_type', 'lessons')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: quizzesProgress } = await supabase
      .from('bulk_generation_progress')
      .select('*')
      .eq('generation_type', 'quizzes')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Calculer les niveaux actifs pour la progression
    const { data: subjectsData } = await supabase.from('subjects').select('*');
    const { data: chaptersData } = await supabase.from('chapters').select('*');

    let activeLevelsForLessons = 0;
    let activeLevelsForQuizzes = 0;

    if (subjectsData) {
      const allLevels = new Set<string>();
      subjectsData.forEach(subject => {
        subject.grade_levels?.forEach(level => allLevels.add(level));
      });
      activeLevelsForLessons = GRADE_LEVELS.filter(level => allLevels.has(level)).length;
    }

    if (chaptersData) {
      const allLevels = new Set<string>();
      chaptersData.forEach(chapter => allLevels.add(chapter.grade_level));
      activeLevelsForQuizzes = GRADE_LEVELS.filter(level => allLevels.has(level)).length;
    }

    if (lessonsProgress) {
      setProgressLessons({
        currentLevel: lessonsProgress.current_level || '',
        currentLevelIndex: lessonsProgress.current_level_index || 0,
        totalLevels: activeLevelsForLessons || lessonsProgress.total_levels || 0,
        currentSubject: lessonsProgress.current_subject,
        currentSubjectIndex: lessonsProgress.current_subject_index,
        totalSubjects: lessonsProgress.total_subjects,
        currentLesson: lessonsProgress.current_lesson,
        currentLessonIndex: lessonsProgress.current_lesson_index,
        totalLessons: lessonsProgress.total_lessons,
        isRunning: lessonsProgress.is_running || false,
        isPaused: lessonsProgress.is_paused || false,
      });
    }

    if (quizzesProgress) {
      setProgressQuizzes({
        currentLevel: quizzesProgress.current_level || '',
        currentLevelIndex: quizzesProgress.current_level_index || 0,
        totalLevels: activeLevelsForQuizzes || quizzesProgress.total_levels || 0,
        currentSubject: quizzesProgress.current_subject,
        currentSubjectIndex: quizzesProgress.current_subject_index,
        totalSubjects: quizzesProgress.total_subjects,
        currentLesson: quizzesProgress.current_lesson,
        currentLessonIndex: quizzesProgress.current_lesson_index,
        totalLessons: quizzesProgress.total_lessons,
        currentQuizType: quizzesProgress.current_quiz_type,
        currentQuizNumber: quizzesProgress.current_quiz_number,
        totalQuizzes: quizzesProgress.total_quizzes,
        isRunning: quizzesProgress.is_running || false,
        isPaused: quizzesProgress.is_paused || false,
      });
    }
  };

  const saveProgress = async (type: 'lessons' | 'quizzes', progress: ProgressState) => {
    await supabase
      .from('bulk_generation_progress')
      .upsert({
        generation_type: type,
        current_level: progress.currentLevel,
        current_level_index: progress.currentLevelIndex,
        total_levels: progress.totalLevels,
        current_subject: progress.currentSubject,
        current_subject_index: progress.currentSubjectIndex,
        total_subjects: progress.totalSubjects,
        current_lesson: progress.currentLesson,
        current_lesson_index: progress.currentLessonIndex,
        total_lessons: progress.totalLessons,
        current_quiz_type: progress.currentQuizType,
        current_quiz_number: progress.currentQuizNumber,
        total_quizzes: progress.totalQuizzes,
        is_running: progress.isRunning,
        is_paused: progress.isPaused,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'generation_type',
      });
  };

  const loadData = async () => {
    const { data: subjectsData } = await supabase.from('subjects').select('*');
    const { data: chaptersData } = await supabase.from('chapters').select('*');
    if (subjectsData) setSubjects(subjectsData);
    if (chaptersData) setChapters(chaptersData);
    return { subjects: subjectsData || [], chapters: chaptersData || [] };
  };

  // Removed stuck detection - generation never stops automatically

  const generateAllLessons = async () => {

    const data = await loadData();
    let currentSubjects = data.subjects;

    console.log('Starting generation with', currentSubjects.length, 'subjects');

    // Extraire tous les niveaux uniques présents dans les matières
    const allLevels = new Set<string>();
    currentSubjects.forEach(subject => {
      subject.grade_levels?.forEach(level => allLevels.add(level));
    });

    // Trier les niveaux selon l'ordre du système éducatif français
    const activeLevels = GRADE_LEVELS.filter(level => allLevels.has(level));

    console.log(`Found ${activeLevels.length} active levels:`, activeLevels);

    const { data: existingProgress } = await supabase
      .from('bulk_generation_progress')
      .select('*')
      .eq('generation_type', 'lessons')
      .maybeSingle();

    let startIndex = 0;
    if (existingProgress && existingProgress.current_level_index) {
      startIndex = Math.max(0, existingProgress.current_level_index - 1);
      console.log(`📍 Reprendre depuis le niveau ${startIndex + 1}: ${activeLevels[startIndex]}`);
    }

    const initialProgress = {
      currentLevel: activeLevels[startIndex] || '',
      currentLevelIndex: startIndex,
      totalLevels: activeLevels.length,
      isRunning: true,
      isPaused: false,
    };

    setProgressLessons(initialProgress);
    await saveProgress('lessons', initialProgress);

    for (let i = startIndex; i < activeLevels.length; i++) {
      // Vérifier si la génération a été arrêtée
      const { data: currentProgress } = await supabase
        .from('bulk_generation_progress')
        .select('is_running')
        .eq('generation_type', 'lessons')
        .maybeSingle();

      if (!currentProgress?.is_running) {
        console.log('Generation stopped by user');
        return;
      }

      const level = activeLevels[i];

      const levelSubjects = currentSubjects.filter(s => s.grade_levels?.includes(level));

      console.log(`Level ${level}: Found ${levelSubjects.length} subjects`, levelSubjects.map(s => s.name));

      const levelProgress = {
        currentLevel: level,
        currentLevelIndex: i + 1,
        totalLevels: activeLevels.length,
        totalSubjects: levelSubjects.length,
        currentSubjectIndex: 0,
        isRunning: true,
        isPaused: false,
      };

      setProgressLessons(prev => ({ ...prev, ...levelProgress }));
      await saveProgress('lessons', levelProgress);

      for (let j = 0; j < levelSubjects.length; j++) {
        const subject = levelSubjects[j];

        // Vérifier si des chapitres existent déjà pour ce sujet et niveau
        const { data: existingChapters, count } = await supabase
          .from('chapters')
          .select('id', { count: 'exact', head: true })
          .eq('subject_id', subject.id)
          .eq('grade_level', level);

        if (count && count > 0) {
          console.log(`✅ Skipping ${subject.name} - ${level}: ${count} chapitres déjà générés`);
          continue;
        }

        console.log(`🔄 Generating lessons for ${subject.name} - ${level}`);

        const subjectProgress = {
          currentLevel: level,
          currentLevelIndex: i + 1,
          totalLevels: activeLevels.length,
          currentSubject: subject.name,
          currentSubjectIndex: j + 1,
          totalSubjects: levelSubjects.length,
          isRunning: true,
          isPaused: false,
        };

        setProgressLessons(prev => ({ ...prev, ...subjectProgress }));
        await saveProgress('lessons', subjectProgress);

        let retryCount = 0;
        const maxRetries = 3;
        let success = false;
        let lastError = '';

        while (retryCount < maxRetries && !success) {
          try {
            if (retryCount > 0) {
              console.log(`🔄 Tentative ${retryCount + 1}/${maxRetries} pour ${subject.name} - ${level}`);
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            }

            const currentYear = new Date().getFullYear().toString();

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000);

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-content-generator/generate-chapter`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                subject: subject.name,
                gradeLevel: level,
                schoolYear: currentYear
              }),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data?.chapters) {
                const chaptersToInsert = result.data.chapters.map((ch: any, index: number) => ({
                  subject_id: subject.id,
                  title: ch.title,
                  description: ch.description,
                  grade_level: level,
                  order_index: ch.order_index !== undefined ? ch.order_index : index
                }));

                await supabase.from('chapters').insert(chaptersToInsert);
                console.log(`✅ Succès: ${subject.name} - ${level}`);
                success = true;
              } else {
                lastError = `Réponse API invalide`;
                console.error(`❌ ${lastError} pour ${subject.name} - ${level}`);
                retryCount++;
              }
            } else {
              lastError = `Erreur HTTP ${response.status}`;
              console.error(`❌ ${lastError} pour ${subject.name} - ${level}`);
              retryCount++;
            }
          } catch (error) {
            retryCount++;
            if (error instanceof Error) {
              if (error.name === 'AbortError') {
                lastError = 'Timeout: La génération a pris trop de temps (>3min)';
              } else {
                lastError = error.message;
              }
            } else {
              lastError = 'Erreur inconnue';
            }
            console.error(`❌ Erreur (tentative ${retryCount}/${maxRetries}) pour ${subject.name} - ${level}:`, lastError);
          }
        }

        if (!success) {
          console.error(`❌ Échec définitif après ${maxRetries} tentatives pour ${subject.name} - ${level}`);
          await supabase.from('failed_generations').insert({
            generation_type: 'lesson',
            subject_name: subject.name,
            grade_level: level,
            error_message: lastError,
            retry_count: maxRetries,
            last_attempt_at: new Date().toISOString()
          });
        }
      }
    }

    const finalProgress = {
      currentLevel: 'Terminé!',
      currentLevelIndex: activeLevels.length,
      totalLevels: activeLevels.length,
      isRunning: false,
      isPaused: false,
    };

    setProgressLessons(finalProgress);
    await saveProgress('lessons', finalProgress);
    await loadData();
  };

  const stopLessonsGeneration = async () => {
    const stoppedProgress = {
      ...progressLessons,
      isRunning: false,
      isPaused: false,
    };
    setProgressLessons(stoppedProgress);
    await saveProgress('lessons', stoppedProgress);
  };

  const stopQuizzesGeneration = async () => {
    const stoppedProgress = {
      ...progressQuizzes,
      isRunning: false,
      isPaused: false,
    };
    setProgressQuizzes(stoppedProgress);
    await saveProgress('quizzes', stoppedProgress);
  };

  const retryFailedGeneration = async (failure: any) => {
    console.log(`🔄 Nouvelle tentative pour: ${failure.generation_type} - ${failure.subject_name}`);

    if (failure.generation_type === 'lesson') {
      const data = await loadData();
      const subject = data.subjects.find(s => s.name === failure.subject_name);

      if (!subject) {
        console.error('Matière introuvable');
        return;
      }

      let success = false;
      try {
        const currentYear = new Date().getFullYear().toString();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-content-generator/generate-chapter`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject: failure.subject_name,
            gradeLevel: failure.grade_level,
            schoolYear: currentYear
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.chapters) {
            const chaptersToInsert = result.data.chapters.map((ch: any, index: number) => ({
              subject_id: subject.id,
              title: ch.title,
              description: ch.description,
              grade_level: failure.grade_level,
              order_index: ch.order_index !== undefined ? ch.order_index : index
            }));

            await supabase.from('chapters').insert(chaptersToInsert);
            success = true;
            console.log(`✅ Succès après retry: ${failure.subject_name} - ${failure.grade_level}`);
          }
        }
      } catch (error) {
        console.error('❌ Échec du retry:', error);
      }

      if (success) {
        await supabase
          .from('failed_generations')
          .update({ retried_successfully_at: new Date().toISOString() })
          .eq('id', failure.id);
        await loadFailedGenerations();
      }
    } else if (failure.generation_type === 'quiz') {
      const data = await loadData();
      const subject = data.subjects.find(s => s.name === failure.subject_name);
      const chapter = data.chapters.find(c => c.title === failure.chapter_title && c.grade_level === failure.grade_level);

      if (!subject || !chapter) {
        console.error('Matière ou chapitre introuvable');
        return;
      }

      const diffMap: any = {
        'Facile': { level: 'easy', difficulty: 1, points: 50 },
        'Moyen': { level: 'medium', difficulty: 3, points: 100 },
        'Difficile': { level: 'hard', difficulty: 5, points: 150 }
      };

      const diff = diffMap[failure.quiz_difficulty];
      if (!diff) {
        console.error('Difficulté introuvable');
        return;
      }

      let success = false;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-content-generator/generate-quiz`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject: subject.name,
            gradeLevel: failure.grade_level,
            chapter: chapter.title,
            topic: chapter.title,
            numberOfQuestions: 10,
            difficulty: diff.level
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            await supabase.from('activities').insert({
              chapter_id: chapter.id,
              subject_id: subject.id,
              title: `${result.data.title || chapter.title} - ${failure.quiz_difficulty} ${failure.quiz_number}`,
              type: 'quiz',
              difficulty: diff.difficulty,
              grade_level: failure.grade_level,
              points: diff.points,
              content: { questions: result.data.questions }
            });
            success = true;
            console.log(`✅ Succès après retry: ${failure.chapter_title} - ${failure.quiz_difficulty} ${failure.quiz_number}`);
          }
        }
      } catch (error) {
        console.error('❌ Échec du retry:', error);
      }

      if (success) {
        await supabase
          .from('failed_generations')
          .update({ retried_successfully_at: new Date().toISOString() })
          .eq('id', failure.id);
        await loadFailedGenerations();
      }
    }
  };

  const deleteFailedGeneration = async (id: string) => {
    await supabase.from('failed_generations').delete().eq('id', id);
    await loadFailedGenerations();
  };

  const retryAllFailures = async () => {
    for (const failure of failedGenerations) {
      await retryFailedGeneration(failure);
    }
  };

  // Removed stuck detection - generation never stops automatically

  const generateAllQuizzes = async () => {
    try {
      const data = await loadData();
      let currentSubjects = data.subjects;
      let currentChapters = data.chapters;

    // Extraire tous les niveaux uniques présents dans les chapitres
    const allLevels = new Set<string>();
    currentChapters.forEach(chapter => {
      allLevels.add(chapter.grade_level);
    });

    // Trier les niveaux selon l'ordre du système éducatif français
    const activeLevels = GRADE_LEVELS.filter(level => allLevels.has(level));

    console.log(`Found ${activeLevels.length} active levels for quizzes:`, activeLevels);

    const { data: existingProgress } = await supabase
      .from('bulk_generation_progress')
      .select('*')
      .eq('generation_type', 'quizzes')
      .maybeSingle();

    let startIndex = 0;
    if (existingProgress && existingProgress.current_level_index) {
      startIndex = Math.max(0, existingProgress.current_level_index - 1);
      console.log(`📍 Reprendre génération quiz depuis le niveau ${startIndex + 1}: ${activeLevels[startIndex]}`);
    }

    const initialProgress = {
      currentLevel: activeLevels[startIndex] || '',
      currentLevelIndex: startIndex,
      totalLevels: activeLevels.length,
      isRunning: true,
      isPaused: false,
    };

    setProgressQuizzes(initialProgress);
    await saveProgress('quizzes', initialProgress);

    const difficulties = [
      { level: 'easy', name: 'Facile', difficulty: 1, points: 50 },
      { level: 'medium', name: 'Moyen', difficulty: 3, points: 100 },
      { level: 'hard', name: 'Difficile', difficulty: 5, points: 150 }
    ];

    for (let i = startIndex; i < activeLevels.length; i++) {
      try {
        // Vérifier si la génération a été arrêtée
        const { data: currentProgress } = await supabase
          .from('bulk_generation_progress')
          .select('is_running')
          .eq('generation_type', 'quizzes')
          .maybeSingle();

        if (!currentProgress?.is_running) {
          console.log('Generation stopped by user');
          return;
        }

        const level = activeLevels[i];

        const levelChapters = currentChapters.filter(c => c.grade_level === level);

        const levelProgress = {
          currentLevel: level,
          currentLevelIndex: i + 1,
          totalLevels: activeLevels.length,
          isRunning: true,
          isPaused: false,
        };

        setProgressQuizzes(prev => ({ ...prev, ...levelProgress }));
        await saveProgress('quizzes', levelProgress);

      for (let j = 0; j < levelChapters.length; j++) {
        try {
          // Vérifier si la génération a été arrêtée
          const { data: chapterProgress } = await supabase
            .from('bulk_generation_progress')
            .select('is_running')
            .eq('generation_type', 'quizzes')
            .maybeSingle();

          if (!chapterProgress?.is_running) {
            console.log('Generation stopped by user');
            return;
          }

          const chapter = levelChapters[j];
          const subject = currentSubjects.find(s => s.id === chapter.subject_id);
          if (!subject) {
            console.warn(`⚠️ Matière introuvable pour le chapitre ${chapter.title}, passage au suivant`);
            continue;
          }

          const chapterProgressData = {
            currentLevel: level,
            currentLevelIndex: i + 1,
            totalLevels: activeLevels.length,
            currentLesson: chapter.title,
            currentLessonIndex: j + 1,
            totalLessons: levelChapters.length,
            totalQuizzes: 15,
            currentQuizNumber: 0,
            isRunning: true,
            isPaused: false,
          };

          setProgressQuizzes(chapterProgressData);
          await saveProgress('quizzes', chapterProgressData);

          for (const diff of difficulties) {
            try {
          // Vérifier si des quiz existent déjà pour ce chapitre et cette difficulté
          const { data: existingQuizzes, count } = await supabase
            .from('activities')
            .select('id', { count: 'exact', head: true })
            .eq('chapter_id', chapter.id)
            .eq('difficulty', diff.difficulty);

          if (count && count >= 5) {
            console.log(`✅ Skipping ${chapter.title} - ${diff.name}: ${count} quiz déjà générés`);
            continue;
          }

          const startQuizNumber = count || 0;

          for (let quizNumber = startQuizNumber + 1; quizNumber <= 5; quizNumber++) {
            try {
              // Vérifier si la génération a été arrêtée
              const { data: quizProgress } = await supabase
                .from('bulk_generation_progress')
                .select('is_running')
                .eq('generation_type', 'quizzes')
                .maybeSingle();

              if (!quizProgress?.is_running) {
                console.log('Generation stopped by user');
                return;
              }

              const currentQuizNum = (difficulties.indexOf(diff) * 5) + quizNumber;
              const quizProgressData = {
                currentLevel: level,
                currentLevelIndex: i + 1,
                totalLevels: activeLevels.length,
                currentLesson: chapter.title,
                currentLessonIndex: j + 1,
                totalLessons: levelChapters.length,
                totalQuizzes: 15,
                currentQuizType: diff.name,
                currentQuizNumber: currentQuizNum,
                isRunning: true,
                isPaused: false,
              };

              setProgressQuizzes(quizProgressData);
              await saveProgress('quizzes', quizProgressData);

              let success = false;
              let lastError = '';
              let retryAttempts = 0;
              const maxRetries = 3;

              // Boucle de retry pour chaque quiz
              while (!success && retryAttempts < maxRetries) {
                try {
                  if (retryAttempts > 0) {
                    console.log(`🔄 Tentative ${retryAttempts + 1}/${maxRetries} pour ${chapter.title} - ${diff.name} ${quizNumber}`);
                    // Attendre plus longtemps entre les retry
                    await new Promise(resolve => setTimeout(resolve, 5000 * retryAttempts));
                  } else {
                    // Délai entre chaque quiz pour éviter le rate limit OpenAI
                    await new Promise(resolve => setTimeout(resolve, 2500));
                  }

                  const controller = new AbortController();
                  // Augmenter le timeout à 90 secondes
                  const timeoutId = setTimeout(() => controller.abort(), 90000);

                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-content-generator/generate-quiz`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    subject: subject.name,
                    gradeLevel: level,
                    chapter: chapter.title,
                    topic: chapter.title,
                    numberOfQuestions: 10,
                    difficulty: diff.level
                  }),
                  signal: controller.signal
                });

                  clearTimeout(timeoutId);

                  if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                      const { error: insertError } = await supabase
                        .from('activities')
                        .insert({
                          chapter_id: chapter.id,
                          subject_id: subject.id,
                          title: `${result.data.title || chapter.title} - ${diff.name} ${quizNumber}`,
                          type: 'quiz',
                          difficulty: diff.difficulty,
                          grade_level: level,
                          points: diff.points,
                          content: { questions: result.data.questions }
                        });

                      if (insertError) {
                        lastError = `Erreur insertion: ${insertError.message}`;
                        console.error('❌', lastError);
                        retryAttempts++;
                      } else {
                        console.log(`✅ Quiz créé: ${chapter.title} - ${diff.name} ${quizNumber}`);
                        success = true;
                      }
                    } else {
                      lastError = 'Réponse API invalide';
                      console.error('❌', lastError, result);
                      retryAttempts++;
                    }
                  } else {
                    const errorText = await response.text();
                    lastError = `Erreur HTTP ${response.status}: ${errorText}`;
                    console.error(`❌`, lastError);
                    retryAttempts++;
                  }
                } catch (error) {
                  retryAttempts++;
                  if (error instanceof Error) {
                    if (error.name === 'AbortError') {
                      lastError = 'Timeout: La génération du quiz a pris trop de temps (>90s)';
                    } else {
                      lastError = error.message;
                    }
                  } else {
                    lastError = 'Erreur inconnue';
                  }
                  console.error(`❌ Erreur quiz ${diff.name} ${quizNumber} pour ${chapter.title} (tentative ${retryAttempts}/${maxRetries}):`, lastError);
                }
              }

                // Mettre à jour updated_at même en cas d'erreur pour éviter le blocage auto
                await saveProgress('quizzes', quizProgressData);

              if (!success) {
                console.error(`❌ Échec pour quiz ${diff.name} ${quizNumber} - ${chapter.title}: ${lastError}`);
                await supabase.from('failed_generations').insert({
                  generation_type: 'quiz',
                  subject_name: subject.name,
                  grade_level: level,
                  chapter_title: chapter.title,
                  quiz_difficulty: diff.name,
                  quiz_number: quizNumber,
                  error_message: lastError,
                  retry_count: 1,
                  last_attempt_at: new Date().toISOString()
                });
              }
            } catch (outerError) {
              console.error(`❌ ERREUR CRITIQUE lors de la génération du quiz ${quizNumber}:`, outerError);
              // Enregistrer l'erreur et CONTINUER quand même
              await supabase.from('failed_generations').insert({
                generation_type: 'quiz',
                subject_name: subject?.name || 'Unknown',
                grade_level: level,
                chapter_title: chapter.title,
                quiz_difficulty: diff.name,
                quiz_number: quizNumber,
                error_message: outerError instanceof Error ? outerError.message : 'Erreur critique inconnue',
                retry_count: 1,
                last_attempt_at: new Date().toISOString()
              });
              // IMPORTANT: On ne fait PAS de return ici, on continue la boucle
            }
          }
            } catch (diffError) {
              console.error(`❌ ERREUR CRITIQUE pour la difficulté ${diff.name}:`, diffError);
              // Continuer avec la difficulté suivante
            }
        }
        } catch (chapterError) {
          console.error(`❌ ERREUR CRITIQUE pour le chapitre ${j}:`, chapterError);
          // Continuer avec le chapitre suivant
        }
      }
      } catch (levelError) {
        console.error(`❌ ERREUR CRITIQUE pour le niveau ${activeLevels[i]}:`, levelError);
        // Continuer avec le niveau suivant
      }
    }

      const finalProgress = {
        currentLevel: 'Terminé!',
        currentLevelIndex: activeLevels.length,
        totalLevels: activeLevels.length,
        isRunning: false,
        isPaused: false,
      };

      setProgressQuizzes(finalProgress);
      await saveProgress('quizzes', finalProgress);
    } catch (globalError) {
      console.error('❌ ERREUR GLOBALE dans generateAllQuizzes:', globalError);
      // Même en cas d'erreur globale, marquer comme terminé pour ne pas bloquer
      const errorProgress = {
        currentLevel: 'Erreur - Arrêté',
        currentLevelIndex: 0,
        totalLevels: 0,
        isRunning: false,
        isPaused: false,
      };
      setProgressQuizzes(errorProgress);
      await saveProgress('quizzes', errorProgress);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Génération Massive</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-2 border-blue-200 rounded-xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Leçons - Tous Niveaux</h3>

            {progressLessons.currentLevel === 'Terminé!' ? (
              <div className="text-center py-4">
                <div className="text-green-600 font-bold text-xl mb-2">✅ Génération terminée!</div>
                <button
                  onClick={async () => {
                    const resetProgress = {
                      currentLevel: '',
                      currentLevelIndex: 0,
                      totalLevels: 0,
                      isRunning: false,
                      isPaused: false,
                    };
                    setProgressLessons(resetProgress);
                    await saveProgress('lessons', resetProgress);
                  }}
                  className="text-blue-500 hover:underline text-sm"
                >
                  Réinitialiser
                </button>
              </div>
            ) : !progressLessons.isRunning ? (
              <div className="space-y-3">
                <button
                  onClick={generateAllLessons}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  <Sparkles size={20} />
                  Générer Toutes les Leçons
                </button>
                {progressLessons.currentLevel && progressLessons.currentLevel !== '' && (
                  <button
                    onClick={generateAllLessons}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
                  >
                    <Sparkles size={16} />
                    Reprendre la génération
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">En cours...</span>
                  <Loader className="animate-spin text-blue-500" size={20} />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Niveau:</span>
                    <span className="font-bold">{progressLessons.currentLevelIndex} / {progressLessons.totalLevels} - {progressLessons.currentLevel}</span>
                  </div>

                  {progressLessons.currentSubject && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Matière:</span>
                      <span className="font-bold">{progressLessons.currentSubjectIndex} / {progressLessons.totalSubjects} - {progressLessons.currentSubject}</span>
                    </div>
                  )}
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progressLessons.currentLevelIndex / progressLessons.totalLevels) * 100}%` }}
                  />
                </div>

                <button
                  onClick={stopLessonsGeneration}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition mt-4"
                >
                  <XCircle size={18} />
                  Arrêter la génération
                </button>
              </div>
            )}
          </div>

          <div className="border-2 border-green-200 rounded-xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Quiz - Tous Niveaux</h3>

            {progressQuizzes.currentLevel === 'Terminé!' ? (
              <div className="space-y-4 py-4">
                <div className="text-green-600 font-bold text-xl text-center">✅ Génération terminée!</div>
                <button
                  onClick={async () => {
                    const resetProgress = {
                      currentLevel: '',
                      currentLevelIndex: 0,
                      totalLevels: 0,
                      isRunning: false,
                      isPaused: false,
                    };
                    setProgressQuizzes(resetProgress);
                    await saveProgress('quizzes', resetProgress);
                    await generateAllQuizzes();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  <RefreshCw size={20} />
                  Compléter les Quiz Manquants
                </button>
                <button
                  onClick={async () => {
                    const resetProgress = {
                      currentLevel: '',
                      currentLevelIndex: 0,
                      totalLevels: 0,
                      isRunning: false,
                      isPaused: false,
                    };
                    setProgressQuizzes(resetProgress);
                    await saveProgress('quizzes', resetProgress);
                  }}
                  className="text-blue-500 hover:underline text-sm text-center w-full"
                >
                  Réinitialiser
                </button>
              </div>
            ) : !progressQuizzes.isRunning ? (
              <div className="space-y-3">
                <button
                  onClick={generateAllQuizzes}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  <Sparkles size={20} />
                  Générer Tous les Quiz
                </button>
                <button
                  onClick={async () => {
                    const resetProgress = {
                      currentLevel: '',
                      currentLevelIndex: 0,
                      totalLevels: 0,
                      isRunning: false,
                      isPaused: false,
                    };
                    setProgressQuizzes(resetProgress);
                    await saveProgress('quizzes', resetProgress);
                    await generateAllQuizzes();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  <RefreshCw size={20} />
                  Compléter les Quiz Manquants
                </button>
                {progressQuizzes.currentLevel && progressQuizzes.currentLevel !== '' && (
                  <button
                    onClick={generateAllQuizzes}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition text-sm"
                  >
                    <Sparkles size={16} />
                    Reprendre la génération
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">En cours...</span>
                  <Loader className="animate-spin text-green-500" size={20} />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Niveau:</span>
                    <span className="font-bold">{progressQuizzes.currentLevelIndex} / {progressQuizzes.totalLevels} - {progressQuizzes.currentLevel}</span>
                  </div>

                  {progressQuizzes.currentLesson && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Leçon:</span>
                        <span className="font-bold">{progressQuizzes.currentLessonIndex} / {progressQuizzes.totalLessons || '?'} - {progressQuizzes.currentLesson.substring(0, 30)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quiz:</span>
                        <span className="font-bold">{progressQuizzes.currentQuizNumber} / {progressQuizzes.totalQuizzes} - {progressQuizzes.currentQuizType}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progressQuizzes.currentLevelIndex / progressQuizzes.totalLevels) * 100}%` }}
                  />
                </div>

                <button
                  onClick={stopQuizzesGeneration}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition mt-4"
                >
                  <XCircle size={18} />
                  Arrêter la génération
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Attention:</strong> La génération massive peut prendre plusieurs heures.
            Les processus tournent en arrière-plan et vous pouvez naviguer dans l'application pendant la génération.
          </p>
        </div>
      </div>

      {failedGenerations.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-500" size={24} />
              <h2 className="text-2xl font-bold text-gray-800">
                Échecs de Génération ({failedGenerations.length})
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFailures(!showFailures)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                {showFailures ? 'Masquer' : 'Afficher'}
              </button>
              <button
                onClick={retryAllFailures}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                <RefreshCw size={16} />
                Réessayer tout
              </button>
            </div>
          </div>

          {showFailures && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {failedGenerations.map((failure) => (
                <div
                  key={failure.id}
                  className="border border-red-200 rounded-lg p-4 bg-red-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-red-600 text-white text-xs rounded font-semibold">
                          {failure.generation_type === 'lesson' ? 'LEÇON' : 'QUIZ'}
                        </span>
                        <span className="font-bold text-gray-900">
                          {failure.subject_name} - {failure.grade_level}
                        </span>
                      </div>

                      {failure.chapter_title && (
                        <div className="text-sm text-gray-700 mb-1">
                          <strong>Chapitre:</strong> {failure.chapter_title}
                        </div>
                      )}

                      {failure.quiz_difficulty && (
                        <div className="text-sm text-gray-700 mb-1">
                          <strong>Quiz:</strong> {failure.quiz_difficulty} #{failure.quiz_number}
                        </div>
                      )}

                      <div className="text-sm text-red-700 mt-2">
                        <strong>Erreur:</strong> {failure.error_message}
                      </div>

                      <div className="text-xs text-gray-500 mt-2">
                        Tentatives: {failure.retry_count} •
                        Dernier essai: {new Date(failure.last_attempt_at).toLocaleString('fr-FR')}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => retryFailedGeneration(failure)}
                        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                        title="Réessayer"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={() => deleteFailedGeneration(failure.id)}
                        className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
