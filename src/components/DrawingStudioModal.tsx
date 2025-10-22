import { useEffect, useState } from 'react';
import { Palette, Share2, Lock, Trash2, X, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DrawingCanvas } from './DrawingCanvas';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export type Drawing = {
  id: string;
  title: string;
  drawing_data: string;
  is_shared: boolean;
  created_at: string;
};

type DrawingStudioModalProps = {
  childId: string;
  onClose: () => void;
  onUpdated?: (stats: { total: number; shared: number }) => void;
};

export function DrawingStudioModal({ childId, onClose, onUpdated }: DrawingStudioModalProps) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCanvas, setShowCanvas] = useState(false);
  const [drawingToDelete, setDrawingToDelete] = useState<string | null>(null);
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const { profile } = useAuth();
  const { showToast } = useToast();

  const canManage = !profile || profile.role !== 'child' || profile.id === childId;

  useEffect(() => {
    loadDrawings();
  }, [childId]);

  async function loadDrawings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('drawings')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading drawings:', error);
      showToast('Impossible de charger les dessins', 'error');
    } else {
      setDrawings(data || []);
      onUpdated?.({
        total: data?.length || 0,
        shared: (data || []).filter((d) => d.is_shared).length,
      });
    }

    setLoading(false);
  }

  async function toggleShare(drawingId: string, share: boolean) {
    const { error } = await supabase
      .from('drawings')
      .update({ is_shared: share })
      .eq('id', drawingId)
      .eq('child_id', childId);

    if (error) {
      console.error('Error updating drawing share status:', error);
      showToast('Erreur lors de la mise à jour du partage', 'error');
      return;
    }

    showToast(share ? 'Dessin partagé avec succès !' : 'Le dessin est redevenu privé.', 'success');
    await loadDrawings();
  }

  async function deleteDrawing(drawingId: string) {
    const { error } = await supabase
      .from('drawings')
      .delete()
      .eq('id', drawingId)
      .eq('child_id', childId);

    if (error) {
      console.error('Error deleting drawing:', error);
      showToast('Impossible de supprimer ce dessin', 'error');
      return;
    }

    showToast('Dessin supprimé', 'success');
    setDrawingToDelete(null);
    await loadDrawings();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-purple-50">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white shadow-md">
              <Palette className="text-pink-500" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Atelier de dessin</h2>
              <p className="text-sm text-gray-600">Crée ton classeur de chefs-d'œuvre et partage-les fièrement !</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-white transition"
            aria-label="Fermer"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-50 text-pink-600 font-semibold">
                <Sparkles size={16} /> {drawings.length} dessin{drawings.length > 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 font-semibold">
                <Share2 size={16} /> {drawings.filter((d) => d.is_shared).length} partagé{drawings.filter((d) => d.is_shared).length > 1 ? 's' : ''}
              </span>
            </div>

            {canManage && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowCanvas(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold shadow-lg hover:shadow-xl transition"
                >
                  <Palette size={18} />
                  Nouveau dessin
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 bg-gradient-to-b from-white via-white to-pink-50">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <Loader2 className="animate-spin mr-2" />
              Chargement des dessins...
            </div>
          ) : drawings.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-pink-200 rounded-2xl p-10 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-4">
                <Palette className="text-pink-500" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Aucun dessin pour l'instant</h3>
              <p className="text-gray-600 mb-6">Commence ton premier chef-d'œuvre et garde-le précieusement dans ton classeur.</p>
              {canManage && (
                <button
                  onClick={() => setShowCanvas(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold shadow-lg hover:shadow-xl transition"
                >
                  <Palette size={18} />
                  Je me lance !
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {drawings.map((drawing) => (
                <div key={drawing.id} className="bg-white border-2 border-pink-100 rounded-2xl shadow-sm hover:shadow-lg transition overflow-hidden flex flex-col">
                  <div className="relative bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 p-[3px]">
                    <button
                      type="button"
                      onClick={() => setSelectedDrawing(drawing)}
                      className="group relative block w-full rounded-[14px] overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      aria-label={`Voir le dessin ${drawing.title || 'Mon dessin'} en grand format`}
                    >
                      <div className="absolute inset-0 rounded-[14px] bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity mix-blend-screen" />
                      <img
                        src={drawing.drawing_data}
                        alt={drawing.title}
                        className="relative w-full h-48 object-contain rounded-[12px] bg-white"
                        style={{ filter: 'contrast(1.05) saturate(1.15)' }}
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-[12px] ring-1 ring-white/60 group-hover:ring-2 group-hover:ring-purple-200 transition" />
                    </button>
                    <div className="absolute top-3 right-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-md ${drawing.is_shared ? 'bg-purple-500 text-white' : 'bg-gray-900/70 text-white'}`}>
                        {drawing.is_shared ? <Share2 size={14} /> : <Lock size={14} />}
                        {drawing.is_shared ? 'Partagé' : 'Privé'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div>
                      <h3 className="font-semibold text-gray-800 truncate">
                        {drawing.title || 'Mon dessin'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {new Date(drawing.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    {canManage && (
                      <div className="mt-auto flex items-center gap-2">
                        <button
                          onClick={() => toggleShare(drawing.id, !drawing.is_shared)}
                          className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-semibold transition ${drawing.is_shared ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
                        >
                          <Share2 size={16} />
                          {drawing.is_shared ? 'Rendre privé' : 'Partager'}
                        </button>
                        <button
                          onClick={() => setDrawingToDelete(drawing.id)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition"
                          title="Supprimer ce dessin"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCanvas && (
        <DrawingCanvas
          childId={childId}
          onClose={() => setShowCanvas(false)}
          onSaved={async () => {
            setShowCanvas(false);
            await loadDrawings();
          }}
        />
      )}

      {drawingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Supprimer ce dessin ?</h3>
            <p className="text-gray-600 mb-6">Cette action est définitive, ton œuvre sera retirée de ton classeur.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDrawingToDelete(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteDrawing(drawingToDelete)}
                className="px-4 py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDrawing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
          <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-4 sm:p-6 max-w-5xl w-full">
            <button
              type="button"
              onClick={() => setSelectedDrawing(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white transition"
              aria-label="Fermer la prévisualisation du dessin"
            >
              <X size={20} />
            </button>
            <div className="bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 p-[5px] rounded-2xl">
              <div className="bg-white rounded-2xl p-4">
                <img
                  src={selectedDrawing.drawing_data}
                  alt={selectedDrawing.title}
                  className="max-h-[70vh] mx-auto w-full object-contain rounded-xl"
                  style={{ filter: 'contrast(1.08) saturate(1.2)' }}
                />
              </div>
            </div>
            <div className="mt-4 text-center text-white">
              <h3 className="text-xl font-semibold">{selectedDrawing.title || 'Mon dessin'}</h3>
              <p className="text-sm text-white/80">
                {new Date(selectedDrawing.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
