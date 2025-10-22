import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Trophy } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Subject, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';
import { useGamification } from '../hooks/useGamification';

type SubjectViewProps = {
  subject: Subject;
  onBack: () => void;
  onLessonView: (chapter: any) => void;
};

export function SubjectView({ subject, onBack, onLessonView }: SubjectViewProps) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { totalPoints } = useGamification();
  const IconComponent = (Icons as any)[toCamelCase(subject.icon)] || Icons.BookOpen;

  useEffect(() => {
    loadData();
  }, [subject.id, profile]);

  async function loadData() {
    setLoading(true);

    const userGradeLevel = profile?.grade_level;
    const isAdmin = profile?.role === 'admin';

    let chaptersQuery = supabase
      .from('chapters')
      .select('*')
      .eq('subject_id', subject.id);

    if (!isAdmin && userGradeLevel) {
      chaptersQuery = chaptersQuery.eq('grade_level', userGradeLevel);
    }

    const { data: chaptersData } = await chaptersQuery.order('order_index');
    setChapters(chaptersData || []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 py-4 px-4 shadow-lg">
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

            <h1 className="text-2xl font-bold text-white absolute left-1/2 -translate-x-1/2">Matière - {subject.name}</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">Leçons disponibles</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Chargement des leçons...</p>
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Pas encore de leçons !</h3>
            <p className="text-gray-600">
              Aucune leçon disponible pour ton niveau ({profile?.grade_level}).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                onClick={() => onLessonView(chapter)}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:-translate-y-1 text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    {index + 1}
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-blue-500 transition" size={24} />
                </div>

                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition">
                  {chapter.title}
                </h3>

                <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                  {chapter.description}
                </p>

                <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                  <BookOpen size={16} />
                  Voir la leçon
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}
