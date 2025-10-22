import { useState, useEffect } from 'react';
import { Edit, Trash2, Save, X, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type ChildProfile = {
  id: string;
  full_name: string;
  age: number;
  grade_level: string;
  department: string;
};

const GRADE_LEVELS = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];

const FRENCH_DEPARTMENTS = [
  { code: '01', name: 'Ain' },
  { code: '02', name: 'Aisne' },
  { code: '03', name: 'Allier' },
  { code: '04', name: 'Alpes-de-Haute-Provence' },
  { code: '05', name: 'Hautes-Alpes' },
  { code: '06', name: 'Alpes-Maritimes' },
  { code: '07', name: 'Ardèche' },
  { code: '08', name: 'Ardennes' },
  { code: '09', name: 'Ariège' },
  { code: '10', name: 'Aube' },
  { code: '75', name: 'Paris' },
  { code: '91', name: 'Essonne' },
  { code: '92', name: 'Hauts-de-Seine' },
  { code: '93', name: 'Seine-Saint-Denis' },
  { code: '94', name: 'Val-de-Marne' },
  { code: '95', name: 'Val-d\'Oise' },
];

export function ChildrenManager() {
  const { user, refreshProfile } = useAuth();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ChildProfile>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadChildren();
    }
  }, [user]);

  async function loadChildren() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, age, grade_level, department')
        .eq('parent_id', user.id)
        .eq('role', 'child')
        .order('full_name');

      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      console.error('Error loading children:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des enfants' });
    } finally {
      setLoading(false);
    }
  }

  function startEdit(child: ChildProfile) {
    setEditingChildId(child.id);
    setEditForm({
      full_name: child.full_name,
      age: child.age,
      grade_level: child.grade_level,
      department: child.department,
    });
    setMessage(null);
  }

  function cancelEdit() {
    setEditingChildId(null);
    setEditForm({});
    setMessage(null);
  }

  async function saveEdit(childId: string) {
    if (!editForm.full_name?.trim()) {
      setMessage({ type: 'error', text: 'Le nom est requis' });
      return;
    }

    if (!editForm.age || editForm.age < 3 || editForm.age > 18) {
      setMessage({ type: 'error', text: 'L\'âge doit être entre 3 et 18 ans' });
      return;
    }

    if (!editForm.grade_level) {
      setMessage({ type: 'error', text: 'Le niveau scolaire est requis' });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim(),
          age: editForm.age,
          grade_level: editForm.grade_level,
          department: editForm.department,
        })
        .eq('id', childId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profil de l\'enfant mis à jour' });
      setEditingChildId(null);
      setEditForm({});
      await loadChildren();
      await refreshProfile();
    } catch (error) {
      console.error('Error updating child:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
    }
  }

  async function deleteChild(childId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const deleteUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
      const response = await fetch(deleteUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: childId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }

      setMessage({ type: 'success', text: 'Enfant supprimé avec succès' });
      setDeleteConfirm(null);
      await loadChildren();
      await refreshProfile();
    } catch (error: any) {
      console.error('Error deleting child:', error);
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la suppression' });
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Users size={24} className="text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Mes Enfants ({children.length})</h2>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <AlertCircle size={20} />
          {message.text}
        </div>
      )}

      {children.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">Aucun enfant enregistré</p>
        </div>
      ) : (
        <div className="space-y-4">
          {children.map((child) => (
            <div key={child.id} className="bg-gray-50 rounded-2xl p-6">
              {editingChildId === child.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                      <input
                        type="text"
                        value={editForm.full_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Âge</label>
                      <input
                        type="number"
                        min="3"
                        max="18"
                        value={editForm.age || ''}
                        onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || 6 })}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Niveau scolaire</label>
                    <select
                      value={editForm.grade_level || ''}
                      onChange={(e) => setEditForm({ ...editForm, grade_level: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none"
                    >
                      <option value="">Sélectionner</option>
                      {GRADE_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Département</label>
                    <select
                      value={editForm.department || ''}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none"
                    >
                      <option value="">Sélectionner un département</option>
                      {FRENCH_DEPARTMENTS.map(dept => (
                        <option key={dept.code} value={`${dept.code} - ${dept.name}`}>
                          {dept.code} - {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => saveEdit(child.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition font-semibold"
                    >
                      <Save size={18} />
                      Enregistrer
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition font-semibold"
                    >
                      <X size={18} />
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{child.full_name}</h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><span className="font-semibold">Âge:</span> {child.age} ans</p>
                        <p><span className="font-semibold">Niveau:</span> {child.grade_level}</p>
                        {child.department && (
                          <p><span className="font-semibold">Département:</span> {child.department}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(child)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit size={20} />
                      </button>
                      {deleteConfirm === child.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteChild(child.id)}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition font-semibold"
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm rounded-lg transition font-semibold"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(child.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
