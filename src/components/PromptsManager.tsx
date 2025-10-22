import { useState, useEffect } from 'react';
import { Save, RotateCcw, FileCode, AlertCircle, Power } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Prompt = {
  id: string;
  prompt_key: string;
  prompt_name: string;
  prompt_description: string;
  prompt_content: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = {
  chatbot: { name: 'Chatbot Coach', color: 'bg-blue-100 text-blue-700' },
  generation_matiere: { name: 'Génération Matières', color: 'bg-green-100 text-green-700' },
  generation_lecon: { name: 'Génération Leçons', color: 'bg-purple-100 text-purple-700' },
  generation_quiz: { name: 'Génération Quiz', color: 'bg-orange-100 text-orange-700' },
  generation_activite: { name: 'Génération Activités', color: 'bg-pink-100 text-pink-700' },
};

export function PromptsManager() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompts_config')
        .select('*')
        .order('category', { ascending: true })
        .order('prompt_name', { ascending: true });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error: any) {
      showMessage('Erreur lors du chargement des prompts: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setEditedContent(prompt.prompt_content);
  };

  const handleSavePrompt = async () => {
    if (!selectedPrompt) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('prompts_config')
        .update({
          prompt_content: editedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPrompt.id);

      if (error) throw error;

      showMessage('Prompt sauvegardé avec succès !', 'success');
      await loadPrompts();

      const updatedPrompt = prompts.find(p => p.id === selectedPrompt.id);
      if (updatedPrompt) {
        setSelectedPrompt({ ...updatedPrompt, prompt_content: editedContent });
      }
    } catch (error: any) {
      showMessage('Erreur lors de la sauvegarde: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedPrompt) return;

    setLoading(true);
    try {
      const newActiveState = !selectedPrompt.is_active;
      const { error } = await supabase
        .from('prompts_config')
        .update({
          is_active: newActiveState,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPrompt.id);

      if (error) throw error;

      showMessage(
        newActiveState
          ? 'Prompt activé ! Il sera maintenant utilisé par l\'IA.'
          : 'Prompt désactivé. Le prompt codé en dur sera utilisé.',
        'success'
      );
      await loadPrompts();

      const updatedPrompt = prompts.find(p => p.id === selectedPrompt.id);
      if (updatedPrompt) {
        setSelectedPrompt(updatedPrompt);
      }
    } catch (error: any) {
      showMessage('Erreur lors du changement d\'état: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPrompt = () => {
    if (selectedPrompt) {
      setEditedContent(selectedPrompt.prompt_content);
      showMessage('Modifications annulées', 'success');
    }
  };

  const filteredPrompts = selectedCategory === 'all'
    ? prompts
    : prompts.filter(p => p.category === selectedCategory);

  const hasChanges = selectedPrompt && editedContent !== selectedPrompt.prompt_content;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileCode className="text-purple-500" size={32} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Gestion des Prompts IA</h2>
            <p className="text-gray-600">Personnalisez tous les prompts utilisés par l'intelligence artificielle</p>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <AlertCircle size={20} />
            {message}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Filtrer par catégorie</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">Toutes les catégories</option>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <option key={key} value={key}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 mb-3">Liste des Prompts ({filteredPrompts.length})</h3>
            {loading && !selectedPrompt ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : filteredPrompts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Aucun prompt trouvé</div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {filteredPrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => handleSelectPrompt(prompt)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      selectedPrompt?.id === prompt.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-purple-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-800 mb-1">{prompt.prompt_name}</div>
                    <div className="text-xs text-gray-600 mb-2">{prompt.prompt_description}</div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        CATEGORIES[prompt.category as keyof typeof CATEGORIES]?.color || 'bg-gray-100 text-gray-700'
                      }`}>
                        {CATEGORIES[prompt.category as keyof typeof CATEGORIES]?.name || prompt.category}
                      </span>
                      {prompt.is_active && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                          <Power size={12} />
                          Actif
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedPrompt ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800">{selectedPrompt.prompt_name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{selectedPrompt.prompt_description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${
                        CATEGORIES[selectedPrompt.category as keyof typeof CATEGORIES]?.color || 'bg-gray-100 text-gray-700'
                      }`}>
                        {CATEGORIES[selectedPrompt.category as keyof typeof CATEGORIES]?.name || selectedPrompt.category}
                      </span>
                      {selectedPrompt.is_active && (
                        <span className="flex items-center gap-1 text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                          <Power size={16} />
                          Actif
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleToggleActive}
                    disabled={loading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                      selectedPrompt.is_active
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Power size={18} />
                    {selectedPrompt.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className={`border rounded-lg p-4 ${
                    selectedPrompt.is_active
                      ? 'bg-green-50 border-green-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <Power className={selectedPrompt.is_active ? 'text-green-600' : 'text-blue-600'} size={20} />
                      <div className={`text-sm ${selectedPrompt.is_active ? 'text-green-800' : 'text-blue-800'}`}>
                        <p className="font-semibold mb-1">
                          {selectedPrompt.is_active ? 'Prompt actif' : 'Prompt inactif'}
                        </p>
                        <p className="text-xs">
                          {selectedPrompt.is_active
                            ? 'Ce prompt est actuellement utilisé par l\'IA pour les générations. Les modifications que vous apportez seront immédiatement prises en compte après sauvegarde.'
                            : 'Ce prompt n\'est pas utilisé. L\'IA utilise le prompt codé en dur par défaut. Activez-le pour qu\'il soit pris en compte.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                      <div className="text-sm text-yellow-800">
                        <p className="font-semibold mb-1">Variables disponibles</p>
                        <p className="text-xs">
                          Utilisez des variables comme <code className="bg-yellow-100 px-1 rounded">{'{{gradeLevel}}'}</code>,
                          <code className="bg-yellow-100 px-1 rounded ml-1">{'{{subject}}'}</code>,
                          <code className="bg-yellow-100 px-1 rounded ml-1">{'{{topic}}'}</code> dans vos prompts.
                          Elles seront automatiquement remplacées lors de la génération.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contenu du Prompt
                    {hasChanges && (
                      <span className="ml-2 text-orange-600 text-xs">(Modifications non sauvegardées)</span>
                    )}
                  </label>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-[400px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                    placeholder="Contenu du prompt..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSavePrompt}
                    disabled={loading || !hasChanges}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                      loading || !hasChanges
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
                    }`}
                  >
                    <Save size={20} />
                    {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                  <button
                    onClick={handleResetPrompt}
                    disabled={loading || !hasChanges}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                      loading || !hasChanges
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <RotateCcw size={20} />
                    Annuler
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                  <p className="font-semibold mb-2">Informations</p>
                  <p>Key: <code className="bg-gray-200 px-2 py-0.5 rounded">{selectedPrompt.prompt_key}</code></p>
                  <p className="mt-1">
                    Dernière modification: {new Date(selectedPrompt.updated_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FileCode size={64} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Sélectionnez un prompt pour l'éditer</p>
                  <p className="text-sm mt-2">Cliquez sur un prompt dans la liste de gauche</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
