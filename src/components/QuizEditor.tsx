import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Question = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

type QuizContent = {
  questions: Question[];
};

type Activity = {
  id: string;
  title: string;
  type: string;
  difficulty: number;
  content: QuizContent;
  points: number;
  grade_level: string;
};

type QuizEditorProps = {
  activityId: string;
  onClose: () => void;
  onSave: () => void;
};

export function QuizEditor({ activityId, onClose, onSave }: QuizEditorProps) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivity();
  }, [activityId]);

  async function loadActivity() {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .single();

      if (error) throw error;
      setActivity(data as Activity);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateQuestion(index: number, field: keyof Question, value: any) {
    if (!activity) return;

    const newQuestions = [...activity.content.questions];
    newQuestions[index] = {
      ...newQuestions[index],
      [field]: value
    };

    setActivity({
      ...activity,
      content: { questions: newQuestions }
    });
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    if (!activity) return;

    const newQuestions = [...activity.content.questions];
    const newOptions = [...newQuestions[questionIndex].options];
    newOptions[optionIndex] = value;
    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      options: newOptions
    };

    setActivity({
      ...activity,
      content: { questions: newQuestions }
    });
  }

  function addQuestion() {
    if (!activity) return;

    const newQuestion: Question = {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    };

    setActivity({
      ...activity,
      content: {
        questions: [...activity.content.questions, newQuestion]
      }
    });
  }

  function removeQuestion(index: number) {
    if (!activity) return;

    const newQuestions = activity.content.questions.filter((_, i) => i !== index);
    setActivity({
      ...activity,
      content: { questions: newQuestions }
    });
  }

  async function handleSave() {
    if (!activity) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('activities')
        .update({
          title: activity.title,
          difficulty: activity.difficulty,
          content: activity.content,
          points: activity.points
        })
        .eq('id', activityId);

      if (error) throw error;

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="text-center text-gray-600">Chargement...</div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="text-center text-red-600">Quiz introuvable</div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-800">Éditer le Quiz</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Titre du Quiz</label>
              <input
                type="text"
                value={activity.title}
                onChange={(e) => setActivity({ ...activity, title: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulté (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={activity.difficulty}
                onChange={(e) => setActivity({ ...activity, difficulty: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Questions ({activity.content.questions.length})</h3>
              <button
                onClick={addQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition"
              >
                <Plus size={18} />
                Ajouter une question
              </button>
            </div>

            <div className="space-y-6">
              {activity.content.questions.map((question, qIndex) => (
                <div key={qIndex} className="p-4 border-2 border-gray-200 rounded-xl">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-700">Question {qIndex + 1}</h4>
                    <button
                      onClick={() => removeQuestion(qIndex)}
                      className="text-red-500 hover:bg-red-50 p-1 rounded transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                      <textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                      <div className="space-y-2">
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={question.correctAnswer === oIndex}
                              onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                              className="w-4 h-4 text-blue-500"
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Explication</label>
                      <textarea
                        value={question.explanation}
                        onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition disabled:opacity-50"
          >
            {saving ? (
              'Enregistrement...'
            ) : (
              <>
                <Save size={20} />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
