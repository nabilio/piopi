import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Dialog } from './Dialog';
import { useDialog } from '../hooks/useDialog';

type StatusSelectorProps = {
  onClose: () => void;
};

type CustomStatus = {
  id: string;
  emoji: string;
  label: string;
};

export function StatusSelector({ onClose }: StatusSelectorProps) {
  const { profile, refreshProfile } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(profile?.custom_status_id || null);
  const [saving, setSaving] = useState(false);
  const [statusOptions, setStatusOptions] = useState<CustomStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const dialog = useDialog();

  useEffect(() => {
    loadStatuses();
  }, []);

  async function loadStatuses() {
    try {
      const { data, error } = await supabase
        .from('custom_statuses')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setStatusOptions(data || []);
    } catch (error) {
      console.error('Error loading statuses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          custom_status_id: selectedStatus,
          status_updated_at: selectedStatus ? new Date().toISOString() : null
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
      dialog.alert('Erreur lors de la mise à jour du statut', 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveStatus() {
    setSelectedStatus(null);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-3xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
          <h2 className="text-2xl font-bold text-gray-800">Choisir un statut</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Partage ce que tu fais en ce moment avec tes amis
          </p>

          {statusOptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun statut disponible pour le moment
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {statusOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedStatus(option.id)}
                  className={`p-4 rounded-xl border-2 transition flex items-center gap-3 text-left ${
                    selectedStatus === option.id
                      ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-3xl">{option.emoji}</span>
                  <span className="font-medium text-gray-800">{option.label}</span>
                </button>
              ))}
            </div>
          )}

          {selectedStatus && (
            <button
              onClick={handleRemoveStatus}
              className="w-full mb-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
            >
              Retirer le statut
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold disabled:bg-blue-300"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>

      <Dialog
        isOpen={dialog.isOpen}
        onClose={dialog.handleClose}
        onConfirm={dialog.handleConfirm}
        title={dialog.config.title}
        message={dialog.config.message}
        type={dialog.config.type}
        confirmText={dialog.config.confirmText}
        cancelText={dialog.config.cancelText}
        showCancel={dialog.config.showCancel}
      />
    </div>
  );
}
