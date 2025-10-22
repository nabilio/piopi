import { useState, useEffect } from 'react';
import { ArrowLeft, BookPlus, User } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CustomLessonCreator } from './CustomLessonCreator';
import { CustomLessonsList } from './CustomLessonsList';

type CustomLessonsManagerProps = {
  onClose: () => void;
  preselectedChildId?: string;
  preselectedChildName?: string;
};

export function CustomLessonsManager({ onClose, preselectedChildId, preselectedChildName }: CustomLessonsManagerProps) {
  const { user } = useAuth();
  const [children, setChildren] = useState<Profile[]>([]);
  const [selectedChild, setSelectedChild] = useState<Profile | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadChildren();
    }
  }, [user]);

  useEffect(() => {
    if (preselectedChildId && children.length > 0) {
      const child = children.find(c => c.id === preselectedChildId);
      if (child) {
        setSelectedChild(child);
      }
    }
  }, [preselectedChildId, children]);

  async function loadChildren() {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', user.id)
      .eq('role', 'child')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading children:', error);
    } else {
      setChildren(data || []);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (showCreator && selectedChild) {
    return (
      <CustomLessonCreator
        childId={selectedChild.id}
        childName={selectedChild.full_name}
        onBack={() => setShowCreator(false)}
        onClose={onClose}
      />
    );
  }

  if (selectedChild) {
    return (
      <CustomLessonsList
        childId={selectedChild.id}
        childName={selectedChild.full_name}
        onBack={() => {
          if (preselectedChildId) {
            onClose();
          } else {
            setSelectedChild(null);
          }
        }}
        onCreateNew={() => setShowCreator(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-violet-600 hover:text-violet-700 font-semibold mb-4"
          >
            <ArrowLeft size={20} />
            Retour au tableau de bord
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Cours Personnalisés</h1>
          <p className="text-gray-600">
            Créez des leçons et quiz sur mesure pour vos enfants avec l'aide de l'IA
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child) => (
            <div
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-violet-400 to-purple-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {child.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{child.full_name}</h3>
                  <p className="text-gray-600">{child.age} ans</p>
                </div>
              </div>
              <button className="w-full bg-gradient-to-r from-violet-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-violet-600 hover:to-purple-600 transition flex items-center justify-center gap-2">
                <BookPlus size={20} />
                Gérer les cours
              </button>
            </div>
          ))}
        </div>

        {children.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <User size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Aucun enfant</h3>
            <p className="text-gray-600">
              Ajoutez un profil enfant pour commencer à créer des cours personnalisés
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
