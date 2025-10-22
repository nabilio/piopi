import { useState, useEffect } from 'react';
import { X, Sparkles, Save } from 'lucide-react';
import { supabase, Avatar } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAvatarRefresh } from '../contexts/AvatarRefreshContext';

type AvatarCustomizerProps = {
  onClose: () => void;
  onSave?: () => void;
};

const characterTypes = [
  { id: 'explorer', name: 'Explorateur', emoji: '🧑‍🚀' },
  { id: 'scientist', name: 'Scientifique', emoji: '🧑‍🔬' },
  { id: 'artist', name: 'Artiste', emoji: '🧑‍🎨' },
  { id: 'athlete', name: 'Sportif', emoji: '🏃' },
  { id: 'musician', name: 'Musicien', emoji: '🧑‍🎤' },
  { id: 'wizard', name: 'Magicien', emoji: '🧙' },
];

const accessories = [
  { id: 'glasses', name: 'Lunettes', emoji: '👓' },
  { id: 'hat', name: 'Chapeau', emoji: '🎩' },
  { id: 'crown', name: 'Couronne', emoji: '👑' },
  { id: 'star', name: 'Étoile', emoji: '⭐' },
  { id: 'medal', name: 'Médaille', emoji: '🏅' },
  { id: 'rainbow', name: 'Arc-en-ciel', emoji: '🌈' },
];

export function AvatarCustomizer({ onClose, onSave }: AvatarCustomizerProps) {
  const { user, profile } = useAuth();
  const { triggerRefresh } = useAvatarRefresh();
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState('explorer');
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      loadAvatar();
    }
  }, [profile]);

  async function loadAvatar() {
    if (!profile) return;

    const { data, error } = await supabase
      .from('avatars')
      .select('*')
      .eq('child_id', profile.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading avatar:', error);
      return;
    }

    if (data) {
      setAvatar(data);
      setSelectedCharacter(data.character_type);
      setSelectedAccessories(data.accessories || []);
    }
  }

  async function handleSave() {
    if (!profile) return;

    setSaving(true);
    try {
      console.log('Saving avatar:', {
        child_id: profile.id,
        character_type: selectedCharacter,
        accessories: selectedAccessories,
      });

      const { data, error } = await supabase
        .from('avatars')
        .upsert({
          child_id: profile.id,
          character_type: selectedCharacter,
          accessories: selectedAccessories,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'child_id'
        })
        .select();

      if (error) throw error;

      console.log('Avatar saved successfully:', data);

      triggerRefresh();

      if (onSave) {
        onSave();
      }

      await new Promise(resolve => setTimeout(resolve, 200));
      onClose();
    } catch (error: any) {
      console.error('Error saving avatar:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      alert(`Erreur lors de la sauvegarde de l'avatar: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  }

  function toggleAccessory(accessoryId: string) {
    setSelectedAccessories((prev) =>
      prev.includes(accessoryId)
        ? prev.filter((id) => id !== accessoryId)
        : [...prev, accessoryId]
    );
  }

  const selectedCharacterData = characterTypes.find((c) => c.id === selectedCharacter);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mb-4">
            <Sparkles size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Personnalise ton Avatar</h2>
          <p className="text-gray-600">Crée un personnage qui te ressemble !</p>
        </div>

        <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-8 mb-8 text-center">
          <div className="text-8xl mb-4">{selectedCharacterData?.emoji}</div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {selectedAccessories.map((accId) => {
              const acc = accessories.find((a) => a.id === accId);
              return acc ? <span key={accId} className="text-4xl">{acc.emoji}</span> : null;
            })}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Choisis ton personnage</h3>
          <div className="grid grid-cols-3 gap-3">
            {characterTypes.map((char) => (
              <button
                key={char.id}
                onClick={() => setSelectedCharacter(char.id)}
                className={`p-4 rounded-xl border-2 transition ${
                  selectedCharacter === char.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="text-4xl mb-2">{char.emoji}</div>
                <div className="text-sm font-semibold text-gray-700">{char.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Ajoute des accessoires</h3>
          <div className="grid grid-cols-3 gap-3">
            {accessories.map((acc) => (
              <button
                key={acc.id}
                onClick={() => toggleAccessory(acc.id)}
                className={`p-4 rounded-xl border-2 transition ${
                  selectedAccessories.includes(acc.id)
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-pink-300'
                }`}
              >
                <div className="text-4xl mb-2">{acc.emoji}</div>
                <div className="text-sm font-semibold text-gray-700">{acc.name}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={20} />
          {saving ? 'Enregistrement...' : 'Enregistrer mon avatar'}
        </button>
      </div>
    </div>
  );
}
