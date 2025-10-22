import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  ImagePlus,
  Camera,
  LayoutGrid,
  Sparkles,
  Share2,
  Save,
  Trash2,
  Wand2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { applyMagicFrame, drawRoundedRect, loadImageElement } from '../utils/drawingEffects';

type PhotoCollageModalProps = {
  childId: string;
  onClose: () => void;
  onSaved?: () => void;
};

type LayoutOption = {
  id: 'grid' | 'story' | 'poster';
  label: string;
  description: string;
};

type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MAX_IMAGES = 8;

const LAYOUTS: LayoutOption[] = [
  {
    id: 'grid',
    label: 'Grille arc-en-ciel',
    description: 'Un carré harmonieux pour quatre souvenirs lumineux.'
  },
  {
    id: 'story',
    label: 'Histoire en bande',
    description: 'Idéal pour raconter une aventure image par image.'
  },
  {
    id: 'poster',
    label: 'Poster artistique',
    description: 'Une grande affiche avec un mélange de formats.'
  }
];

const LAYOUT_FRAMES: Record<LayoutOption['id'], { width: number; height: number; frames: Frame[] }> = {
  grid: {
    width: 864,
    height: 864,
    frames: (() => {
      const padding = 48;
      const cell = 360;
      return [
        { x: padding, y: padding, width: cell, height: cell },
        { x: padding * 2 + cell, y: padding, width: cell, height: cell },
        { x: padding, y: padding * 2 + cell, width: cell, height: cell },
        { x: padding * 2 + cell, y: padding * 2 + cell, width: cell, height: cell }
      ];
    })()
  },
  story: {
    width: 1112,
    height: 664,
    frames: (() => {
      const padding = 48;
      return [
        { x: padding, y: padding, width: 300, height: 420 },
        { x: padding * 2 + 300, y: padding - 20, width: 320, height: 460 },
        { x: padding * 3 + 620, y: padding, width: 300, height: 260 },
        { x: padding * 3 + 620, y: padding * 2 + 260, width: 300, height: 260 }
      ];
    })()
  },
  poster: {
    width: 964,
    height: 1184,
    frames: (() => {
      const padding = 48;
      return [
        { x: padding, y: padding, width: 500, height: 680 },
        { x: padding, y: padding * 2 + 680, width: 500, height: 360 },
        { x: padding * 2 + 500, y: padding, width: 320, height: 300 },
        { x: padding * 2 + 500, y: padding * 2 + 300, width: 320, height: 300 },
        { x: padding * 2 + 500, y: padding * 3 + 600, width: 320, height: 360 }
      ];
    })()
  }
};

export function PhotoCollageModal({ childId, onClose, onSaved }: PhotoCollageModalProps) {
  const [selectedLayout, setSelectedLayout] = useState<LayoutOption['id']>('grid');
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();
  const { showToast } = useToast();

  const layoutDefinition = useMemo(() => LAYOUT_FRAMES[selectedLayout], [selectedLayout]);

  const handleFileSelection = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).slice(0, MAX_IMAGES - images.length);
    if (files.length === 0) {
      showToast(`Tu peux ajouter jusqu'à ${MAX_IMAGES} images dans ta collation.`, 'info');
      return;
    }

    try {
      const readers = files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                resolve(reader.result);
              } else {
                reject(new Error("Impossible de lire l'image"));
              }
            };
            reader.onerror = () => reject(new Error("Erreur lors de l'import"));
            reader.readAsDataURL(file);
          })
      );

      const newImages = await Promise.all(readers);
      setImages((prev) => [...prev, ...newImages]);
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error reading files for collage:', error);
      showToast('Erreur lors de la récupération des images', 'error');
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    if (images.length === 0) {
      setPreview(null);
      return;
    }

    let active = true;
    setLoadingPreview(true);

    const generatePreview = async () => {
      try {
        const collage = await composeCollage(selectedLayout, images);
        const beautified = await applyMagicFrame(collage, { padding: 64 });
        if (active) {
          setPreview(beautified);
        }
      } catch (error) {
        console.error('Error generating collage preview:', error);
        if (active) {
          showToast('Impossible de générer la prévisualisation', 'error');
        }
      } finally {
        if (active) {
          setLoadingPreview(false);
        }
      }
    };

    generatePreview();

    return () => {
      active = false;
    };
  }, [images, selectedLayout, showToast]);

  const removeImageAt = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (share: boolean) => {
    if (!profile) return;
    if (images.length === 0) {
      showToast('Ajoute au moins une image pour créer ta collation.', 'info');
      return;
    }

    setSaving(true);
    try {
      const collage = preview ?? (await applyMagicFrame(await composeCollage(selectedLayout, images), { padding: 64 }));

      const { error } = await supabase
        .from('drawings')
        .insert({
          child_id: childId,
          title: title || 'Ma collation de photos',
          drawing_data: collage,
          is_shared: share
        });

      if (error) throw error;

      showToast(
        share ? 'Collation envoyée pour briller auprès de tes proches ✨' : 'Collation sauvegardée dans ton classeur !',
        'success'
      );

      if (onSaved) {
        onSaved();
      }

      onClose();
    } catch (error) {
      console.error('Error saving collage:', error);
      showToast('Oops, impossible de sauvegarder ta collation.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="flex-1 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 p-6 md:p-8 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/80 text-gray-600 hover:text-gray-800 shadow"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-inner">
                <LayoutGrid className="text-purple-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Créateur de collation</h2>
                <p className="text-gray-600 text-sm">Assemble tes photos dans des compositions magiques à partager.</p>
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700">Donne un titre à ta collation</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full px-4 py-2 rounded-xl border-2 border-white/70 bg-white/70 focus:border-purple-400 focus:outline-none"
                placeholder="Mes souvenirs colorés"
              />
            </label>

            <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Étape 1 · Ajoute des photos</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-4 py-3 bg-white rounded-2xl shadow-lg flex items-center gap-2 text-pink-600 font-semibold hover:-translate-y-0.5 transition disabled:opacity-50"
                  disabled={images.length >= MAX_IMAGES}
                >
                  <ImagePlus size={20} />
                  Depuis la galerie
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-4 py-3 bg-white rounded-2xl shadow-lg flex items-center gap-2 text-blue-600 font-semibold hover:-translate-y-0.5 transition disabled:opacity-50"
                  disabled={images.length >= MAX_IMAGES}
                >
                  <Camera size={20} />
                  Prendre une photo
                </button>
                <button
                  onClick={() => setImages([])}
                  className="px-4 py-3 bg-white/70 rounded-2xl shadow flex items-center gap-2 text-gray-600 font-semibold hover:bg-white"
                  disabled={images.length === 0}
                >
                  <Trash2 size={18} />
                  Tout effacer
                </button>
              </div>
              <p className="text-xs text-gray-600">Jusqu'à {MAX_IMAGES} photos. Combine dessins, selfies ou souvenirs !</p>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Étape 2 · Choisis une composition</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => setSelectedLayout(layout.id)}
                    className={`rounded-2xl p-4 text-left border-2 transition shadow-sm hover:-translate-y-0.5 ${
                      selectedLayout === layout.id
                        ? 'border-purple-400 bg-white'
                        : 'border-white/70 bg-white/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-purple-500 font-semibold mb-2">
                      <LayoutGrid size={18} />
                      {layout.label}
                    </div>
                    <p className="text-xs text-gray-600 leading-snug">{layout.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Étape 3 · Ordonne tes images</p>
              {images.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {images.map((img, index) => (
                    <div key={`${img}-${index}`} className="relative group">
                      <img
                        src={img}
                        alt={`Sélection ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow-md"
                      />
                      <button
                        onClick={() => removeImageAt(index)}
                        className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition"
                        title="Retirer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 bg-white/60 rounded-xl px-3 py-2 inline-flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-500" />
                  Ajoute des images pour démarrer ta collation magique.
                </p>
              )}
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => handleFileSelection(event.target.files)}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => handleFileSelection(event.target.files)}
            />
          </div>

          <div className="flex-1 bg-white p-6 md:p-8 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Aperçu magique</h3>
              <span className="text-xs text-gray-500">Composition {layoutDefinition.frames.length} cadres</span>
            </div>

            <div className="flex-1 bg-gray-50 rounded-3xl border-2 border-dashed border-purple-200 flex items-center justify-center overflow-hidden">
              {loadingPreview ? (
                <div className="text-center text-gray-500 flex flex-col items-center gap-3">
                  <Wand2 className="text-purple-500 animate-pulse" size={32} />
                  <p className="text-sm font-semibold">Mise en place de ton cadre féérique...</p>
                </div>
              ) : preview ? (
                <img src={preview} alt="Prévisualisation de la collation" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="text-center text-gray-400 text-sm">
                  Ajoute des images pour voir la magie opérer ✨
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => handleSave(false)}
                disabled={saving || images.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-700 text-white font-semibold shadow hover:bg-gray-800 transition disabled:opacity-50"
              >
                <Save size={18} />
                Sauvegarder dans mon classeur
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving || images.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-semibold shadow-lg hover:from-pink-600 hover:to-blue-600 transition disabled:opacity-50"
              >
                <Share2 size={18} />
                Partager ma collation
              </button>
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <Sparkles size={14} className="text-yellow-500" />
                Chaque collation est automatiquement encadrée pour un rendu magnifique.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function composeCollage(layout: LayoutOption['id'], sources: string[]): Promise<string> {
  const { width, height, frames } = LAYOUT_FRAMES[layout];
  const images = await Promise.all(sources.map((source) => loadImageElement(source)));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context is unavailable');
  }

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#fdf2f8');
  gradient.addColorStop(0.5, '#f5f3ff');
  gradient.addColorStop(1, '#dbeafe');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  frames.forEach((frame, index) => {
    const image = images[index % images.length];
    const scale = Math.min(frame.width / image.width, frame.height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const offsetX = frame.x + (frame.width - drawWidth) / 2;
    const offsetY = frame.y + (frame.height - drawHeight) / 2;

    ctx.save();
    drawRoundedRect(ctx, frame.x, frame.y, frame.width, frame.height, Math.min(frame.width, frame.height) * 0.12);
    ctx.clip();
    ctx.filter = 'saturate(1.1) contrast(1.05)';
    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    ctx.restore();

    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    drawRoundedRect(ctx, frame.x, frame.y, frame.width, frame.height, Math.min(frame.width, frame.height) * 0.12);
    ctx.stroke();
  });

  return canvas.toDataURL('image/png');
}
