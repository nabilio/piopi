import { useState, useEffect } from 'react';
import { BookOpen, Edit2, Check, X, ArrowLeft, Send, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Question = {
  question: string;
  options: string[];
  correctAnswer: number;
};

type StoryPreviewProps = {
  storyId: string;
  onClose: () => void;
  onPublished: () => void;
};

export function StoryPreview({ storyId, onClose, onPublished }: StoryPreviewProps) {
  const [story, setStory] = useState<any>(null);
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [editingStory, setEditingStory] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [error, setError] = useState('');
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  useEffect(() => {
    loadStoryData();
  }, [storyId]);

  async function loadStoryData() {
    setLoading(true);
    try {
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();

      if (storyError) throw storyError;

      setStory(storyData);
      setEditedContent(storyData.content);
      setEditedTitle(storyData.title);

      const { data: quizData, error: quizError } = await supabase
        .from('story_quiz')
        .select('*')
        .eq('story_id', storyId)
        .maybeSingle();

      if (!quizError && quizData) {
        setQuiz(quizData.questions || []);
      } else {
        await generateQuiz();
      }
    } catch (err: any) {
      console.error('Error loading story:', err);
      setError('Impossible de charger l\'histoire');
    } finally {
      setLoading(false);
    }
  }

  async function generateQuiz() {
    setGeneratingQuiz(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-story-quiz`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ storyId })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }

      const result = await response.json();
      if (result.quiz && result.quiz.questions) {
        setQuiz(result.quiz.questions);
      }
    } catch (err: any) {
      console.error('Error generating quiz:', err);
    } finally {
      setGeneratingQuiz(false);
    }
  }

  async function handleSaveStory() {
    try {
      const { error } = await supabase
        .from('stories')
        .update({
          title: editedTitle,
          content: editedContent
        })
        .eq('id', storyId);

      if (error) throw error;

      setStory({ ...story, title: editedTitle, content: editedContent });
      setEditingStory(false);
    } catch (err: any) {
      console.error('Error saving story:', err);
      setError('Erreur lors de la sauvegarde de l\'histoire');
    }
  }

  async function handleSaveQuiz() {
    try {
      const { data: existingQuiz } = await supabase
        .from('story_quiz')
        .select('id')
        .eq('story_id', storyId)
        .maybeSingle();

      if (existingQuiz) {
        const { error } = await supabase
          .from('story_quiz')
          .update({ questions: quiz })
          .eq('id', existingQuiz.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('story_quiz')
          .insert({
            story_id: storyId,
            questions: quiz
          });

        if (error) throw error;
      }

      setEditingQuiz(false);
    } catch (err: any) {
      console.error('Error saving quiz:', err);
      setError('Erreur lors de la sauvegarde du quiz');
    }
  }

  async function handlePublish() {
    if (!story) return;

    setPublishing(true);
    setError('');

    try {
      console.log('Publishing story:', storyId);
      const { data, error: updateError } = await supabase
        .from('stories')
        .update({ is_published: true })
        .eq('id', storyId)
        .select();

      console.log('Update result:', { data, error: updateError });

      if (updateError) {
        console.error('Update error details:', updateError);
        throw new Error(updateError.message || 'Erreur de mise à jour');
      }

      console.log('Story published successfully');
      onPublished();
    } catch (err: any) {
      console.error('Error publishing story:', err);
      setError(`Erreur lors de la publication: ${err.message || 'Erreur inconnue'}`);
      setPublishing(false);
    }
  }

  function updateQuestion(index: number, field: keyof Question, value: any) {
    const newQuiz = [...quiz];
    newQuiz[index] = { ...newQuiz[index], [field]: value };
    setQuiz(newQuiz);
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    const newQuiz = [...quiz];
    const newOptions = [...newQuiz[questionIndex].options];
    newOptions[optionIndex] = value;
    newQuiz[questionIndex] = { ...newQuiz[questionIndex], options: newOptions };
    setQuiz(newQuiz);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 text-center">
          <Loader className="animate-spin mx-auto mb-4 text-purple-600" size={48} />
          <p className="text-lg font-semibold text-gray-800">Chargement de l'histoire...</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 text-center">
          <p className="text-lg font-semibold text-red-600">{error || 'Histoire introuvable'}</p>
          <button onClick={onClose} className="mt-4 px-6 py-2 bg-gray-200 rounded-lg">
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl my-8">
          <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-t-3xl flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <BookOpen size={32} />
              <div>
                <h2 className="text-2xl font-black">Prévisualisation de l'histoire</h2>
                <p className="text-white/90 text-sm mt-1">Modifiez et publiez l'histoire à votre enfant</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700 text-center font-semibold">
                {error}
              </div>
            )}

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <BookOpen size={24} className="text-amber-600" />
                  Histoire
                </h3>
                {!editingStory ? (
                  <button
                    onClick={() => setEditingStory(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-amber-600 rounded-lg font-semibold transition"
                  >
                    <Edit2 size={16} />
                    Modifier
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveStory}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition"
                    >
                      <Check size={16} />
                      Enregistrer
                    </button>
                    <button
                      onClick={() => {
                        setEditingStory(false);
                        setEditedContent(story.content);
                        setEditedTitle(story.title);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition"
                    >
                      <X size={16} />
                      Annuler
                    </button>
                  </div>
                )}
              </div>

              {editingStory ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Titre</label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Contenu</label>
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      rows={15}
                      className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-2xl font-black text-amber-700 mb-4">{story.title}</h4>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {story.content}
                  </div>
                </div>
              )}
            </div>

            {generatingQuiz ? (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-yellow-200">
                <div className="text-center">
                  <Loader className="animate-spin mx-auto mb-4 text-yellow-600" size={48} />
                  <p className="text-yellow-800 font-semibold mb-2">
                    Génération du quiz en cours...
                  </p>
                  <p className="text-yellow-700 text-sm">
                    Cela peut prendre quelques secondes. Veuillez patienter.
                  </p>
                </div>
              </div>
            ) : quiz.length > 0 ? (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Check size={24} className="text-blue-600" />
                    Quiz ({quiz.length} questions)
                  </h3>
                  {!editingQuiz ? (
                    <button
                      onClick={() => setEditingQuiz(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-blue-600 rounded-lg font-semibold transition"
                    >
                      <Edit2 size={16} />
                      Modifier
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveQuiz}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition"
                      >
                        <Check size={16} />
                        Enregistrer
                      </button>
                      <button
                        onClick={() => {
                          setEditingQuiz(false);
                          loadStoryData();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition"
                      >
                        <X size={16} />
                        Annuler
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {quiz.map((q, qIndex) => (
                    <div key={qIndex} className="bg-white rounded-xl p-4 border-2 border-blue-200">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {qIndex + 1}
                        </span>
                        {editingQuiz ? (
                          <textarea
                            value={q.question}
                            onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                            rows={2}
                            className="flex-1 px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        ) : (
                          <p className="flex-1 font-semibold text-gray-800">{q.question}</p>
                        )}
                      </div>
                      <div className="space-y-2 ml-11">
                        {q.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-3">
                            {editingQuiz ? (
                              <>
                                <input
                                  type="radio"
                                  checked={q.correctAnswer === oIndex}
                                  onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                                  className="w-5 h-5 text-green-500"
                                />
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                  className="flex-1 px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </>
                            ) : (
                              <>
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    q.correctAnswer === oIndex
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-gray-300'
                                  }`}
                                >
                                  {q.correctAnswer === oIndex && (
                                    <Check size={14} className="text-white" />
                                  )}
                                </div>
                                <span
                                  className={`${
                                    q.correctAnswer === oIndex
                                      ? 'font-semibold text-green-700'
                                      : 'text-gray-700'
                                  }`}
                                >
                                  {option}
                                </span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border-2 border-red-200">
                <div className="text-center">
                  <p className="text-red-800 font-semibold mb-2">
                    Le quiz n'a pas pu être généré
                  </p>
                  <p className="text-red-700 text-sm mb-4">
                    Une erreur s'est produite lors de la génération du quiz.
                  </p>
                  <button
                    onClick={generateQuiz}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-lg transition"
              >
                <ArrowLeft size={24} />
                Retour
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing || editingStory || editingQuiz || generatingQuiz || quiz.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? (
                  <>
                    <Loader className="animate-spin" size={24} />
                    Publication...
                  </>
                ) : generatingQuiz ? (
                  <>
                    <Loader className="animate-spin" size={24} />
                    Génération du quiz...
                  </>
                ) : (
                  <>
                    <Send size={24} />
                    Publier à mon enfant
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
