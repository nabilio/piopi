import { useEffect, useState } from 'react';
import { supabase, Avatar } from '../lib/supabase';
import { Pencil } from 'lucide-react';
import { useAvatarRefresh } from '../contexts/AvatarRefreshContext';

type AvatarDisplayProps = {
  userId: string;
  fallbackName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onAvatarClick?: () => void;
  onEditClick?: () => void;
};

const characterTypes = [
  { id: 'explorer', emoji: '🧑‍🚀' },
  { id: 'scientist', emoji: '🧑‍🔬' },
  { id: 'artist', emoji: '🧑‍🎨' },
  { id: 'athlete', emoji: '🏃' },
  { id: 'musician', emoji: '🧑‍🎤' },
  { id: 'wizard', emoji: '🧙' },
];

const accessories = [
  { id: 'glasses', emoji: '👓' },
  { id: 'hat', emoji: '🎩' },
  { id: 'crown', emoji: '👑' },
  { id: 'star', emoji: '⭐' },
  { id: 'medal', emoji: '🏅' },
  { id: 'rainbow', emoji: '🌈' },
];

export function AvatarDisplay({ userId, fallbackName, size = 'md', className = '', onAvatarClick, onEditClick }: AvatarDisplayProps) {
  const { refreshKey } = useAvatarRefresh();
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    loadAvatar();

    const channel = supabase
      .channel(`avatar-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'avatars',
          filter: `child_id=eq.${userId}`
        },
        (payload) => {
          console.log('Avatar realtime change detected for user:', userId, payload);
          loadAvatar();
        }
      )
      .subscribe((status) => {
        console.log('Avatar realtime subscription status for user:', userId, status);
      });

    return () => {
      console.log('Cleaning up avatar realtime channel for user:', userId);
      supabase.removeChannel(channel);
    };
  }, [userId, refreshKey]);

  async function loadAvatar() {
    try {
      console.log('Loading avatar for user:', userId);
      const { data, error } = await supabase
        .from('avatars')
        .select('*')
        .eq('child_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading avatar:', error);
        return;
      }

      console.log('Avatar loaded:', data);
      setAvatar(data);
    } catch (error) {
      console.error('Error loading avatar:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={`${getSizeClasses(size)} bg-gray-200 rounded-full animate-pulse ${className}`} />
    );
  }

  if (!avatar) {
    return (
      <div
        className="relative inline-block"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`${getSizeClasses(size)} bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${onAvatarClick ? 'cursor-pointer hover:shadow-xl transition-all' : ''} ${className}`}
          onClick={onAvatarClick}
        >
          <span className={getEmojiSize(size)}>
            {fallbackName ? fallbackName.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
        {onEditClick && isHovered && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onEditClick();
            }}
            className="absolute -bottom-0.5 -right-0.5 bg-white/90 rounded-full p-0.5 shadow-sm border border-gray-200 cursor-pointer hover:scale-110 hover:bg-white transition opacity-60 hover:opacity-100"
          >
            <Pencil size={size === 'lg' ? 10 : size === 'md' ? 8 : 6} className="text-gray-500" />
          </div>
        )}
      </div>
    );
  }

  const character = characterTypes.find((c) => c.id === avatar.character_type);
  const selectedAccessories = (avatar.accessories || [])
    .map((accId) => accessories.find((a) => a.id === accId))
    .filter(Boolean);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`${getSizeClasses(size)} bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center shadow-lg border-4 border-cyan-200 ${onAvatarClick ? 'cursor-pointer hover:shadow-xl transition-all' : ''} ${className}`}
        onClick={onAvatarClick}
      >
        <div className={`${getEmojiSize(size)} relative`}>
          <span className="block">{character?.emoji || '🧑'}</span>
          {selectedAccessories.length > 0 && (
            <div className="absolute -top-1 -right-1 flex gap-0.5">
              {selectedAccessories.slice(0, 2).map((acc, idx) => (
                <span key={idx} className={getAccessorySize(size)}>
                  {acc?.emoji}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {onEditClick && isHovered && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onEditClick();
          }}
          className="absolute -bottom-0.5 -right-0.5 bg-white/90 rounded-full p-0.5 shadow-sm border border-gray-200 cursor-pointer hover:scale-110 hover:bg-white transition opacity-60 hover:opacity-100"
        >
          <Pencil size={size === 'lg' ? 10 : size === 'md' ? 8 : 6} className="text-gray-500" />
        </div>
      )}
    </div>
  );
}

function getSizeClasses(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return 'w-10 h-10 md:w-12 md:h-12';
    case 'md':
      return 'w-16 h-16 md:w-20 md:h-20';
    case 'lg':
      return 'w-20 h-20 md:w-32 md:h-32';
    default:
      return 'w-16 h-16 md:w-20 md:h-20';
  }
}

function getEmojiSize(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return 'text-xl md:text-2xl';
    case 'md':
      return 'text-3xl md:text-4xl';
    case 'lg':
      return 'text-4xl md:text-6xl';
    default:
      return 'text-3xl md:text-4xl';
  }
}

function getAccessorySize(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return 'text-xs';
    case 'md':
      return 'text-sm';
    case 'lg':
      return 'text-base';
    default:
      return 'text-sm';
  }
}
