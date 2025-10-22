import { useRef, useState, useEffect } from 'react';
import { X, Eraser, Pencil, Palette, Share2, Save, Trash2, Undo, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

type DrawingCanvasProps = {
  onClose: () => void;
  onSaved?: () => void;
  childId?: string;
};

const COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FF8800', '#8800FF', '#FFFFFF',
  '#8B4513', '#FFC0CB', '#FFD700', '#98FB98', '#87CEEB',
  '#DDA0DD', '#F0E68C', '#E6E6FA', '#FFDAB9', '#B0C4DE'
];

const BRUSH_SIZES = [2, 5, 10, 15, 20, 30, 40];

export function DrawingCanvas({ onClose, onSaved, childId }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { profile } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    // Détecter si on est sur mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Initialiser le canvas avec la bonne taille
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initCanvas = () => {
      if (isMobile) {
        // Plein écran sur mobile (en tenant compte des barres)
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - 120; // Espace pour les contrôles
      } else {
        // Taille desktop
        canvas.width = 800;
        canvas.height = 600;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveToHistory();
    };

    initCanvas();

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [isMobile]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL();
    setHistory(prev => [...prev.slice(-9), dataUrl]);
  };

  const undo = () => {
    if (history.length < 2) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const newHistory = history.slice(0, -1);
    setHistory(newHistory);

    const img = new Image();
    img.src = newHistory[newHistory.length - 1];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      // Touch event
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Empêcher le scroll sur mobile
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Empêcher le scroll sur mobile
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const handleSave = async (share: boolean) => {
    if (!profile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const targetChildId = childId || profile.id;

    setSaving(true);
    try {
      const drawingData = canvas.toDataURL('image/png');

      const { error } = await supabase
        .from('drawings')
        .insert({
          child_id: targetChildId,
          title: title || 'Mon dessin',
          drawing_data: drawingData,
          is_shared: share
        });

      if (error) throw error;

      showToast(share ? 'Dessin partagé avec succès!' : 'Dessin sauvegardé!', 'success');

      if (onSaved) {
        onSaved();
      }

      onClose();
    } catch (error) {
      console.error('Error saving drawing:', error);
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (isMobile) {
    // Version mobile plein écran
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* Header mobile compact */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-2 flex items-center justify-between shadow-lg">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X size={20} />
          </button>
          <input
            type="text"
            placeholder="Titre..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 mx-2 px-3 py-1 rounded-lg text-gray-800 text-sm"
          />
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition disabled:opacity-50"
          >
            <Save size={20} />
          </button>
        </div>

        {/* Canvas plein écran */}
        <div className="flex-1 overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            className="w-full h-full touch-none"
            style={{ touchAction: 'none' }}
          />
        </div>

        {/* Barre d'outils mobile en bas */}
        <div className="bg-gray-100 border-t-2 border-gray-300 p-2">
          <div className="flex items-center justify-between gap-2 mb-2">
            {/* Outil actif */}
            <div className="flex gap-2">
              <button
                onClick={() => setTool('pen')}
                className={`p-3 rounded-xl transition ${
                  tool === 'pen' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white text-gray-600'
                }`}
              >
                <Pencil size={24} />
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={`p-3 rounded-xl transition ${
                  tool === 'eraser' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white text-gray-600'
                }`}
              >
                <Eraser size={24} />
              </button>
            </div>

            {/* Couleur actuelle avec picker */}
            <button
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowTools(false);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl shadow-md"
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: color }}
              />
              <ChevronDown size={20} className="text-gray-600" />
            </button>

            {/* Plus d'outils */}
            <button
              onClick={() => {
                setShowTools(!showTools);
                setShowColorPicker(false);
              }}
              className="px-4 py-3 bg-white rounded-xl shadow-md text-gray-700 font-semibold"
            >
              Outils
            </button>

            <button
              onClick={undo}
              disabled={history.length < 2}
              className="p-3 bg-white rounded-xl shadow-md text-gray-600 disabled:opacity-30"
            >
              <Undo size={24} />
            </button>
          </div>

          {/* Palette de couleurs déroulante */}
          {showColorPicker && (
            <div className="bg-white rounded-xl shadow-lg p-3 mb-2">
              <div className="grid grid-cols-10 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      setShowColorPicker(false);
                    }}
                    className={`w-10 h-10 rounded-full border-2 transition ${
                      color === c ? 'border-blue-500 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Menu outils déroulant */}
          {showTools && (
            <div className="bg-white rounded-xl shadow-lg p-3 mb-2">
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">Taille du pinceau</p>
                <div className="flex gap-2 flex-wrap">
                  {BRUSH_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setBrushSize(size)}
                      className={`px-4 py-2 rounded-lg transition ${
                        brushSize === size ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    clearCanvas();
                    setShowTools(false);
                  }}
                  className="flex-1 px-4 py-3 bg-red-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <Trash2 size={20} />
                  Effacer tout
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-gray-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={20} />
                  Sauvegarder
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Version desktop (inchangée mais avec support tactile)
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-6 relative max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition z-10"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Crée ton dessin</h2>
          <input
            type="text"
            placeholder="Titre de ton dessin (optionnel)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-center"
          />
        </div>

        <div className="mb-4 flex items-center gap-4 flex-wrap justify-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTool('pen')}
              className={`p-2 rounded-lg transition ${
                tool === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              <Pencil size={20} />
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-lg transition ${
                tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              <Eraser size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Palette size={20} className="text-gray-600" />
            <div className="flex gap-1">
              {COLORS.slice(0, 10).map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition ${
                    color === c ? 'border-blue-500 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Taille:</span>
            {BRUSH_SIZES.slice(0, 5).map((size) => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                className={`px-3 py-1 rounded-lg transition ${
                  brushSize === size ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <button
            onClick={undo}
            disabled={history.length < 2}
            className="p-2 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition disabled:opacity-50"
          >
            <Undo size={20} />
          </button>

          <button
            onClick={clearCanvas}
            className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="bg-white border-4 border-gray-300 rounded-xl overflow-hidden mb-4 flex justify-center">
          <canvas
            ref={canvasRef}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="cursor-crosshair max-w-full touch-none"
            style={{ touchAction: 'none' }}
          />
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-6 py-3 bg-gray-500 text-white font-bold rounded-xl hover:bg-gray-600 transition disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={20} />
            Sauvegarder
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50 flex items-center gap-2"
          >
            <Share2 size={20} />
            Partager avec mes amis
          </button>
        </div>
      </div>
    </div>
  );
}
