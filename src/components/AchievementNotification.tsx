import { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import { Achievement } from '../lib/supabase';

type AchievementNotificationProps = {
  achievement: Achievement | null;
  onClose: () => void;
};

export function AchievementNotification({ achievement, onClose }: AchievementNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-2xl shadow-2xl p-6 max-w-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm animate-bounce">
              <Trophy size={32} />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-1">Nouveau succès !</h3>
            <p className="text-lg font-semibold mb-1">{achievement.title}</p>
            <p className="text-sm text-white/90">{achievement.description}</p>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onClose, 300);
            }}
            className="flex-shrink-0 text-white/80 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
