import { Activity } from '../lib/supabase';
import { BookOpen, Gamepad2, BookHeart, Zap, Trophy } from 'lucide-react';

type ActivityCardProps = {
  activity: Activity;
  onClick: () => void;
};

const typeIcons = {
  quiz: Zap,
  game: Gamepad2,
  reading: BookHeart,
  challenge: Trophy,
};

const typeColors = {
  quiz: 'from-yellow-400 to-orange-400',
  game: 'from-green-400 to-teal-400',
  reading: 'from-pink-400 to-rose-400',
  challenge: 'from-purple-400 to-indigo-400',
};

const typeLabels = {
  quiz: 'Quiz',
  game: 'Jeu',
  reading: 'Lecture',
  challenge: 'Défi',
};

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const Icon = typeIcons[activity.type] || BookOpen;
  const colorClass = typeColors[activity.type];
  const label = typeLabels[activity.type];

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group hover:-translate-y-1"
    >
      <div className={`h-32 bg-gradient-to-r ${colorClass} relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20">
          <Icon size={120} className="absolute -right-6 -bottom-6" />
        </div>
        <div className="absolute top-4 left-4">
          <div className="bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-semibold">
            {label}
          </div>
        </div>
        <div className="absolute top-4 right-4 flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < activity.difficulty ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-6 text-left">
        <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-purple-600 transition">
          {activity.title}
        </h3>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Niveau {activity.difficulty}</span>
          <span className="flex items-center gap-1 text-yellow-600 font-semibold">
            <Trophy size={16} />
            +{activity.points} pts
          </span>
        </div>
      </div>
    </button>
  );
}
