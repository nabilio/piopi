import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type DrawingDisplayProps = {
  drawingId: string;
  title?: string;
};

export function DrawingDisplay({ drawingId, title }: DrawingDisplayProps) {
  const [drawingData, setDrawingData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDrawing();
  }, [drawingId]);

  async function loadDrawing() {
    try {
      const { data, error } = await supabase
        .from('drawings')
        .select('drawing_data, title')
        .eq('id', drawingId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDrawingData(data.drawing_data);
      }
    } catch (error) {
      console.error('Error loading drawing:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-3 bg-gray-100 rounded-xl h-48 animate-pulse"></div>
    );
  }

  if (!drawingData) {
    return null;
  }

  return (
    <div className="mt-3">
      {title && (
        <p className="text-sm font-semibold text-gray-700 mb-2">{title}</p>
      )}
      <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
        <img
          src={drawingData}
          alt={title || 'Dessin partagé'}
          className="w-full h-auto max-h-96 object-contain"
        />
      </div>
    </div>
  );
}
