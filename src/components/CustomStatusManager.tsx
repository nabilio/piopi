import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Smile } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Dialog } from './Dialog';
import { useDialog } from '../hooks/useDialog';

type CustomStatus = {
  id: string;
  emoji: string;
  label: string;
  created_at: string;
  created_by: string | null;
};

export function CustomStatusManager() {
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState({ emoji: '', label: '' });
  const [message, setMessage] = useState('');
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
      setStatuses(data || []);
    } catch (error) {
      console.error('Error loading statuses:', error);
      setMessage('Erreur lors du chargement des statuts');
    } finally {
      setLoading(false);
    }
  }

  async function addStatus() {
    if (!newStatus.emoji.trim() || !newStatus.label.trim()) {
      setMessage('Veuillez remplir tous les champs');
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_statuses')
        .insert([{ emoji: newStatus.emoji, label: newStatus.label }]);

      if (error) throw error;

      setNewStatus({ emoji: '', label: '' });
      setMessage('Statut ajouté avec succès');
      loadStatuses();
    } catch (error) {
      console.error('Error adding status:', error);
      setMessage('Erreur lors de l\'ajout du statut');
    }
  }

  async function deleteStatus(id: string) {
    const confirmed = await dialog.confirm(
      'Êtes-vous sûr de vouloir supprimer ce statut ?',
      'Confirmation',
      'warning'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('custom_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessage('Statut supprimé avec succès');
      loadStatuses();
    } catch (error) {
      console.error('Error deleting status:', error);
      setMessage('Erreur lors de la suppression du statut');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Smile className="w-6 h-6" />
          Gestion des Statuts Personnalisés
        </h2>

        {message && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            {message}
          </div>
        )}

        <div className="mb-6 p-4 bg-slate-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Ajouter un nouveau statut</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Emoji
              </label>
              <input
                type="text"
                value={newStatus.emoji}
                onChange={(e) => setNewStatus({ ...newStatus, emoji: e.target.value })}
                placeholder="😊"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl text-center"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={newStatus.label}
                onChange={(e) => setNewStatus({ ...newStatus, label: e.target.value })}
                placeholder="Content"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addStatus}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Ajouter
              </button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Statuts existants ({statuses.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {statuses.map((status) => (
              <div
                key={status.id}
                className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{status.emoji}</span>
                  <span className="font-medium text-slate-700">{status.label}</span>
                </div>
                <button
                  onClick={() => deleteStatus(status.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {statuses.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              Aucun statut personnalisé pour le moment
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">À propos des statuts</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>Les statuts personnalisés permettent aux enfants d'exprimer leur humeur</li>
          <li>Les statuts apparaissent dans le profil et le réseau des enfants</li>
          <li>Utilisez des emojis simples et des labels courts</li>
        </ul>
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
