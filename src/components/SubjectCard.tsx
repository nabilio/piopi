import * as Icons from 'lucide-react';
import { Subject } from '../lib/supabase';

type SubjectCardProps = {
  subject: Subject;
  onClick: () => void;
  isAdmin?: boolean;
};

export function SubjectCard({ subject, onClick, isAdmin }: SubjectCardProps) {
  const IconComponent = (Icons as any)[toCamelCase(subject.icon)] || Icons.Star;

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl p-4 sm:p-6 lg:p-8 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
      style={{ backgroundColor: subject.color }}
    >
      <div className="absolute top-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity hidden sm:block">
        <IconComponent size={120} />
      </div>

      <div className="relative z-10">
        <div className="mb-3 sm:mb-4 inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-2xl backdrop-blur-sm">
          <IconComponent className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>

        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2">{subject.name}</h3>
        <p className="text-white/90 text-xs sm:text-sm">{subject.description}</p>

        {isAdmin && subject.grade_levels && subject.grade_levels.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {subject.grade_levels.map((level) => (
              <span
                key={level}
                className="px-2 py-1 bg-white/30 backdrop-blur-sm rounded-full text-xs font-semibold"
              >
                {level}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
        <div className="h-full bg-white/60 w-0 group-hover:w-full transition-all duration-500" />
      </div>
    </button>
  );
}

function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}
