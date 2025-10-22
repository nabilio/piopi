import { useState, useEffect } from 'react';
import { BookOpen, Target, Lightbulb, ArrowLeft, Play, Lock, CheckCircle, Trophy, Sparkles, Gift } from 'lucide-react';
import { supabase, Activity } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';

type LessonContentProps = {
  chapter: {
    id: string;
    title: string;
    description: string;
    content?: any;
    objectives?: string[];
    key_points?: string[];
  };
  subjectName: string;
  onStartQuiz: (activity: Activity) => void;
  onBack: () => void;
};

type QuizProgress = {
  activity_id: string;
  completed: boolean;
  score: number;
};

export function LessonContent({ chapter, subjectName, onStartQuiz, onBack }: LessonContentProps) {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [quizProgress, setQuizProgress] = useState<QuizProgress[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [nextRewardPoints, setNextRewardPoints] = useState(0);
  const [avatar, setAvatar] = useState<any>(null);
  const content = chapter.content || {};
  const objectives = chapter.objectives || [];
  const keyPoints = chapter.key_points || [];

  useEffect(() => {
    loadActivities();
    loadQuizProgress();
    loadUserProgress();
    loadAvatar();
  }, [chapter.id]);

  async function loadAvatar() {
    if (!profile) return;

    const { data } = await supabase
      .from('avatars')
      .select('*')
      .eq('child_id', profile.id)
      .maybeSingle();

    setAvatar(data);
  }

  async function loadUserProgress() {
    if (!profile) return;

    const { data } = await supabase
      .from('progress')
      .select('score')
      .eq('child_id', profile.id)
      .eq('completed', true);

    const total = data?.reduce((sum, p) => sum + (p.score || 0), 0) || 0;
    setTotalPoints(total);

    const rewardThresholds = [100, 200, 500, 1000, 2500, 5000];
    const next = rewardThresholds.find(t => t > total) || 10000;
    setNextRewardPoints(next);
  }

  async function loadQuizProgress() {
    if (!profile) return;

    const { data } = await supabase
      .from('quiz_progression')
      .select('activity_id, completed, score')
      .eq('user_id', profile.id)
      .eq('chapter_id', chapter.id);

    setQuizProgress(data || []);
  }

  async function loadActivities() {
    setLoading(true);
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('chapter_id', chapter.id)
      .order('difficulty');

    setActivities(data || []);
    setLoading(false);
  }

  async function generateLessonContent() {
    if (!chapter || generatingContent) return;

    setGeneratingContent(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-content-generator/generate-lesson-content`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapterId: chapter.id,
          title: chapter.title,
          description: chapter.description
        })
      });

      if (response.ok) {
        const result = await response.json();
        window.location.reload();
      }
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setGeneratingContent(false);
    }
  }

  const getAvatarEmoji = (type: string) => {
    const avatars: { [key: string]: string } = {
      explorer: '🧑‍🚀',
      scientist: '🔬',
      artist: '🎨',
      athlete: '⚽',
      musician: '🎵',
      chef: '👨‍🍳',
    };
    return avatars[type] || '🧑‍🎓';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 py-4 px-4 shadow-lg mb-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-4 relative">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition backdrop-blur-sm"
              title="Retour"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>

            {profile && (
              <div className="flex items-center gap-4 flex-1">
                <AvatarDisplay userId={profile.id} fallbackName={profile.full_name} size="lg" />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">{profile.full_name}</h2>
                  <p className="text-sm text-white/80">{profile.grade_level}</p>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Trophy size={20} className="text-yellow-300" />
                  <span className="font-bold text-white">{totalPoints} pts</span>
                </div>
              </div>
            )}

            <h1 className="text-2xl font-bold text-white absolute left-1/2 -translate-x-1/2">{subjectName} - {chapter.title}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">

        <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-6 lg:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">{chapter.title}</h1>
              <p className="text-gray-600 mt-1">{chapter.description}</p>
            </div>
          </div>

          {objectives.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Target size={24} className="text-purple-600" />
                <h2 className="text-xl font-bold text-gray-800">Objectifs de la leçon</h2>
              </div>
              <ul className="space-y-2">
                {objectives.map((objective, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-purple-600 font-bold mt-1">•</span>
                    <span className="text-gray-700">{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {content.sections && content.sections.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Contenu de la leçon</h2>
              {content.sections.map((section: any, index: number) => (
                <div key={index} className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">{section.title}</h3>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </div>
                  {section.examples && section.examples.length > 0 && (
                    <div className="mt-4 bg-blue-50 rounded-xl p-4">
                      <p className="font-semibold text-blue-900 mb-2">Exemples:</p>
                      <ul className="space-y-2">
                        {section.examples.map((example: string, idx: number) => (
                          <li key={idx} className="text-gray-700">{example}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : chapter.content?.lesson_content ? (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Contenu de la leçon</h2>
              <div className="prose max-w-none">
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-white rounded-xl p-6 border-2 border-blue-100">
                  {chapter.content.lesson_content}
                </div>
              </div>
            </div>
          ) : null}

          {keyPoints.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={24} className="text-yellow-600" />
                <h2 className="text-xl font-bold text-gray-800">Points clés à retenir</h2>
              </div>
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6">
                <ul className="space-y-3">
                  {keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-yellow-600 font-bold text-xl mt-0.5">✓</span>
                      <span className="text-gray-700 font-medium">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-6 lg:p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Parcours de Quiz</h2>
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 px-6 py-3 rounded-full">
                <div className="flex items-center gap-2">
                  <Trophy className="text-orange-600" size={24} />
                  <div>
                    <p className="text-sm text-gray-600">Progression</p>
                    <p className="text-lg font-bold text-orange-600">{totalPoints} / {nextRewardPoints} points</p>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-3 text-gray-600">Chargement des quiz...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 sm:p-6 lg:p-8 text-center">
                <div className="text-5xl mb-3">📝</div>
                <p className="text-gray-700 font-semibold mb-1">Aucun quiz disponible</p>
                <p className="text-gray-600 text-sm">Les quiz pour cette leçon seront bientôt ajoutés!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => {
                  const progress = quizProgress.find(p => p.activity_id === activity.id);
                  const isCompleted = progress?.completed || false;
                  const isUnlocked = index === 0 || quizProgress.find(p => p.activity_id === activities[index - 1]?.id)?.completed;
                  const score = progress?.score || 0;
                  const isTreasure = (index + 1) % 5 === 0;
                  const treasureUnlocked = isCompleted;

                  return (
                    <div key={`quiz-${activity.id}-${index}`}>
                      <div
                        className={`relative border-2 rounded-2xl p-6 transition ${
                          isCompleted
                            ? 'bg-green-50 border-green-300'
                            : isUnlocked
                            ? 'bg-white border-blue-300 hover:border-blue-500 cursor-pointer'
                            : 'bg-gray-50 border-gray-300 opacity-60'
                        }`}
                        onClick={() => isUnlocked && onStartQuiz(activity)}
                      >
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isUnlocked
                            ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                            : 'bg-gray-300 text-gray-500'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle size={32} />
                          ) : isUnlocked ? (
                            <Play size={32} />
                          ) : (
                            <Lock size={32} />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-bold text-gray-800">{activity.title}</h3>
                            {isCompleted && (
                              <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                                Terminé
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{activity.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-500">
                              Difficulté: {activity.difficulty}/5 ⭐
                            </span>
                            <span className="text-orange-600 font-semibold">
                              {activity.points} points
                            </span>
                            {isCompleted && (
                              <span className="text-green-600 font-semibold">
                                Score: {score}%
                              </span>
                            )}
                          </div>
                        </div>

                        {!isUnlocked && (
                          <div className="absolute top-4 right-4 bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm font-semibold">
                            Verrouillé
                          </div>
                        )}
                      </div>
                    </div>

                    {isTreasure && (
                      <div className={`mt-4 mb-4 border-4 rounded-3xl p-8 text-center transition shadow-lg ${
                        treasureUnlocked
                          ? 'bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 border-yellow-400 animate-pulse'
                          : 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-400'
                      }`}>
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transform transition-transform hover:scale-110 ${
                              treasureUnlocked
                                ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-yellow-600'
                                : 'bg-gradient-to-br from-gray-400 to-gray-500'
                            }`}>
                              <Gift className="text-white" size={48} />
                            </div>
                            {!treasureUnlocked && (
                              <div className="absolute -top-2 -right-2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white text-2xl font-bold">🔒</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className={`text-2xl font-black mb-2 ${treasureUnlocked ? 'text-orange-600' : 'text-gray-600'}`}>
                              {treasureUnlocked ? '🎉 RÉCOMPENSE DÉBLOQUÉE! 🎉' : '✨ RÉCOMPENSE MYSTÈRE ✨'}
                            </h3>
                            <p className={`text-base font-semibold ${treasureUnlocked ? 'text-orange-700' : 'text-gray-600'}`}>
                              {treasureUnlocked
                                ? '🏆 +50 POINTS BONUS GAGNÉS! 🏆'
                                : `🎁 Termine le quiz ${index + 1} pour découvrir ton cadeau surprise!`
                              }
                            </p>
                            {!treasureUnlocked && (
                              <div className="mt-3 flex items-center justify-center gap-2">
                                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}

                <div className="mt-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Trophy className="text-orange-600" size={28} />
                    <h3 className="text-lg font-bold text-gray-800">Prochaine récompense</h3>
                  </div>
                  <p className="text-gray-700 mb-2">
                    Plus que <span className="font-bold text-orange-600">{nextRewardPoints - totalPoints} points</span> pour débloquer une récompense spéciale!
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-400 to-yellow-400 h-full transition-all duration-500"
                      style={{ width: `${Math.min((totalPoints / nextRewardPoints) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
