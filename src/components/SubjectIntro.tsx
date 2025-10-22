import { ArrowLeft, ArrowRight, BookOpen, Trophy, X } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Subject } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';
import { useGamification } from '../hooks/useGamification';

type SubjectIntroProps = {
  subject: Subject;
  onBack: () => void;
  onViewLessons: () => void;
  chaptersCount: number;
  activitiesCount: number;
};

export function SubjectIntro({ subject, onBack, onViewLessons, chaptersCount, activitiesCount }: SubjectIntroProps) {
  const { profile } = useAuth();
  const { totalPoints } = useGamification();
  const IconComponent = (Icons as any)[toCamelCase(subject.icon)] || Icons.BookOpen;

  function toCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace(/-/g, '').replace(/^[a-z]/, (g) => g.toUpperCase());
  }

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

            <h1 className="text-2xl font-bold text-white absolute left-1/2 -translate-x-1/2">Matière</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">

        <div className="bg-white rounded-3xl shadow-xl p-12 mb-6">
          <div className="flex flex-col items-center text-center mb-8">
            <div
              className="w-32 h-32 rounded-3xl flex items-center justify-center mb-6 shadow-lg"
              style={{ backgroundColor: subject.color + '20' }}
            >
              <IconComponent size={64} style={{ color: subject.color }} />
            </div>
            <h1 className="text-5xl font-bold text-gray-800 mb-4">{subject.name}</h1>
            <p className="text-xl text-gray-600 max-w-2xl">{subject.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">{chaptersCount}</div>
              <p className="text-gray-700 font-semibold">Leçons disponibles</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">{activitiesCount}</div>
              <p className="text-gray-700 font-semibold">Quiz à découvrir</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">🏆</div>
              <p className="text-gray-700 font-semibold">Points à gagner</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Comment ça marche ?</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Lis la leçon</h3>
                  <p className="text-gray-600">Découvre le cours et les explications détaillées</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Fais les quiz</h3>
                  <p className="text-gray-600">Teste tes connaissances avec plusieurs quiz par leçon</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Gagne des points</h3>
                  <p className="text-gray-600">Utilise le mode chrono pour gagner encore plus de points!</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onViewLessons}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold px-8 py-5 rounded-full hover:from-blue-600 hover:to-purple-600 transition shadow-lg text-xl"
          >
            <BookOpen size={28} />
            Voir les leçons
            <ArrowRight size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
