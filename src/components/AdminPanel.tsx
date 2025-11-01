import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, X, BookOpen, Users, Settings, UserPlus, Ban, Sparkles, LayoutDashboard, FileText, GraduationCap, Search, MessageCircle, FileCode, Eye, Zap, Edit, Smile, Gift, Tag, CalendarClock, CalendarCheck2, CalendarX2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AIContentGenerator } from './AIContentGenerator';
import { GenerationProgress } from './GenerationProgress';
import { ConfirmDialog } from './ConfirmDialog';
import { CoachDevoirs } from './CoachDevoirs';
import { PromptsManager } from './PromptsManager';
import { BulkGeneration } from './BulkGeneration';
import { QuizEditor } from './QuizEditor';
import { CustomStatusManager } from './CustomStatusManager';

type Subject = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
};

type Chapter = {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  grade_level: string;
  order_index: number;
};

type Activity = {
  id: string;
  chapter_id?: string;
  subject_id: string;
  title: string;
  type: string;
  difficulty: number;
  grade_level?: string;
  points: number;
  content: any;
};

type Question = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

type QuizContent = {
  questions: Question[];
};

type PromoCode = {
  code: string;
  description: string;
  free_months: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
  created_at: string;
};

type AppSettings = {
  id: string;
  logo_url: string | null;
  app_name: string;
  support_email: string;
  created_at?: string;
  updated_at?: string;
  default_trial_days: number;
  trial_promo_active: boolean;
  trial_promo_days: number | null;
  trial_promo_name: string | null;
  trial_promo_description: string | null;
  trial_promo_starts_at: string | null;
  trial_promo_ends_at: string | null;
};

type Profile = {
  id: string;
  email: string;
  role: string;
  full_name: string;
  grade_level?: string;
  department?: string;
  banned?: boolean;
  has_profile?: boolean;
  created_at?: string;
  last_sign_in_at?: string;
  email_confirmed?: boolean;
  email_confirmed_at?: string | null;
};

type SubscriptionRecord = {
  plan_type: string;
  status: string;
  subscription_end_date: string | null;
  trial_end_date?: string | null;
};

type SubscriptionModalState = {
  isOpen: boolean;
  loading: boolean;
  saving: boolean;
  user: Profile | null;
  planType: string;
  activationEndDate: string;
  status: string;
  error: string | null;
  success: string | null;
};

const ADMIN_PLAN_OPTIONS: { value: string; label: string }[] = [
  { value: 'basic', label: 'Basique • 1 enfant' },
  { value: 'duo', label: 'Duo • 2 enfants' },
  { value: 'family', label: 'Famille • 3 enfants' },
  { value: 'premium', label: 'Premium • 4 enfants' },
  { value: 'liberte', label: 'Liberté • 5+ enfants' },
];

const INITIAL_SUBSCRIPTION_MODAL: SubscriptionModalState = {
  isOpen: false,
  loading: false,
  saving: false,
  user: null,
  planType: 'basic',
  activationEndDate: '',
  status: 'inactive',
  error: null,
  success: null,
};

const GRADE_LEVELS = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];

type AdminView = 'dashboard' | 'levels' | 'quiz' | 'lessons' | 'users' | 'activities' | 'ai-generator' | 'settings' | 'subjects-manager' | 'lessons-manager' | 'quiz-manager' | 'coach-test' | 'prompts' | 'student-simulator' | 'custom-statuses' | 'promotions';

export function AdminPanel() {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [totalQuizCount, setTotalQuizCount] = useState<number>(0);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedSubjectView, setSelectedSubjectView] = useState<string | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedChapterView, setSelectedChapterView] = useState<string | null>(null);
  const [quizFilterSubject, setQuizFilterSubject] = useState<string | null>(null);
  const [quizFilterChapter, setQuizFilterChapter] = useState<string | null>(null);
  const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [simulatorLevel, setSimulatorLevel] = useState<string>('CP');
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('');

  const [chapterForm, setChapterForm] = useState({
    title: '',
    description: '',
    gradeLevel: '',
    orderIndex: 0,
  });

  const [quizForm, setQuizForm] = useState({
    title: '',
    difficulty: 1,
    points: 10,
    questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }] as Question[],
  });

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'student',
    grade_level: '',
  });

  const [activityForm, setActivityForm] = useState({
    title: '',
    type: 'lesson',
    difficulty: 1,
    points: 5,
    content: '',
  });

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [defaultTrialDays, setDefaultTrialDays] = useState<number>(30);
  const [trialPromoForm, setTrialPromoForm] = useState({
    active: false,
    name: '',
    description: '',
    days: 7,
    startDate: '',
    endDate: '',
  });
  const [promoForm, setPromoForm] = useState({
    code: '',
    description: '',
    freeMonths: 1,
    maxUses: '',
    validFrom: '',
    validUntil: '',
    active: true,
  });
  const [subscriptionModal, setSubscriptionModal] = useState<SubscriptionModalState>(INITIAL_SUBSCRIPTION_MODAL);

  useEffect(() => {
    loadData();
    if (currentView === 'dashboard') {
      checkOngoingGeneration();
    }
  }, [currentView]);

  useEffect(() => {
    if (appSettings) {
      setDefaultTrialDays(appSettings.default_trial_days ?? 30);
      setTrialPromoForm({
        active: appSettings.trial_promo_active ?? false,
        name: appSettings.trial_promo_name || '',
        description: appSettings.trial_promo_description || '',
        days: appSettings.trial_promo_days ?? appSettings.default_trial_days ?? 30,
        startDate: appSettings.trial_promo_starts_at ? appSettings.trial_promo_starts_at.substring(0, 10) : '',
        endDate: appSettings.trial_promo_ends_at ? appSettings.trial_promo_ends_at.substring(0, 10) : '',
      });
    } else {
      setDefaultTrialDays(30);
      setTrialPromoForm({
        active: false,
        name: '',
        description: '',
        days: 30,
        startDate: '',
        endDate: '',
      });
    }
  }, [appSettings]);

  function showConfirm(title: string, message: string, onConfirm: () => void, variant: 'danger' | 'warning' | 'info' = 'warning') {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
      variant
    });
  }

  async function confirmAction(message: string, action: () => Promise<void> | void, variant: 'danger' | 'warning' = 'warning'): Promise<boolean> {
    return new Promise((resolve) => {
      const title = message.includes('supprimer') || message.includes('Supprimer')
        ? 'Confirmer la suppression'
        : message.includes('générer') || message.includes('Générer')
        ? 'Confirmer la génération'
        : 'Confirmation';

      setConfirmDialog({
        isOpen: true,
        title,
        message,
        onConfirm: async () => {
          await action();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
          resolve(true);
        },
        variant
      });
    });
  }

  async function customConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const title = message.includes('supprimer') || message.includes('Supprimer')
        ? 'Confirmer la suppression'
        : message.includes('générer') || message.includes('Générer')
        ? 'Confirmer la génération'
        : 'Confirmation';

      const variant: 'danger' | 'warning' = message.includes('supprimer') || message.includes('Supprimer') ? 'danger' : 'warning';

      setConfirmDialog({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          setConfirmDialog({ ...confirmDialog, isOpen: false });
          resolve(true);
        },
        variant
      });
    });
  }

  async function handleCloseGeneration() {
    setIsGenerating(false);
    setMessage('');
    const { data: statuses } = await supabase
      .from('generation_status')
      .select('*')
      .in('status', ['pending', 'generating'])
      .order('created_at', { ascending: false });

    if (statuses && statuses.length > 0) {
      for (const status of statuses) {
        await supabase
          .from('generation_status')
          .update({ status: 'cancelled', message: 'Annulé par l\'utilisateur' })
          .eq('id', status.id);
      }
    }
  }

  async function checkOngoingGeneration() {
    const { data: statuses } = await supabase
      .from('generation_status')
      .select('*')
      .in('status', ['pending', 'generating'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (statuses && statuses.length > 0) {
      const status = statuses[0];
      const createdAt = new Date(status.created_at);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCreation > 1) {
        await supabase
          .from('generation_status')
          .update({ status: 'error', message: 'Génération expirée (timeout)' })
          .eq('id', status.id);
        return;
      }

      setIsGenerating(true);
      setGenerationProgress(status.progress || 0);
      setGenerationMessage(status.message || 'Génération en cours...');

      const statusInterval = setInterval(async () => {
        const { data: currentStatus } = await supabase
          .from('generation_status')
          .select('*')
          .eq('id', status.id)
          .single();

        if (currentStatus) {
          setGenerationProgress(currentStatus.progress || 0);
          setGenerationMessage(currentStatus.message || 'En cours...');

          if (currentStatus.status === 'completed') {
            clearInterval(statusInterval);
            setMessage(`✅ Contenu généré: ${currentStatus.subjects_count} matières, ${currentStatus.chapters_count} leçons, ${currentStatus.quizzes_count} quiz`);
            await loadData();
            setTimeout(() => {
              setIsGenerating(false);
            }, 3000);
          } else if (currentStatus.status === 'error' || currentStatus.status === 'cancelled') {
            clearInterval(statusInterval);
            setMessage(`❌ ${currentStatus.message}`);
            setIsGenerating(false);
          }
        }
      }, 2000);
    }
  }

  async function handleGenerateAllContent() {
    if (isGenerating) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationMessage('Démarrage de la génération...');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const statusIds: string[] = [];

    try {
      for (let i = 0; i < GRADE_LEVELS.length; i++) {
        const level = GRADE_LEVELS[i];
        setGenerationMessage(`Lancement de la génération pour ${level}... (${i + 1}/${GRADE_LEVELS.length})`);

        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/generate-level-content`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ gradeLevel: level }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`✅ Génération lancée pour ${level}:`, result);
            if (result.statusId) {
              statusIds.push(result.statusId);
            }
          } else {
            const errorText = await response.text();
            console.error(`Erreur lancement ${level}:`, errorText);
          }
        } catch (fetchError: any) {
          console.error(`Erreur réseau pour ${level}:`, fetchError);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setGenerationMessage(`Génération en cours pour ${GRADE_LEVELS.length} niveaux...`);

      const pollInterval = setInterval(async () => {
        const { data: statuses } = await supabase
          .from('generation_status')
          .select('*')
          .in('id', statusIds)
          .order('created_at', { ascending: false });

        if (!statuses || statuses.length === 0) return;

        const completed = statuses.filter(s => s.status === 'completed').length;
        const errors = statuses.filter(s => s.status === 'error').length;
        const generating = statuses.filter(s => s.status === 'generating' || s.status === 'pending').length;

        const totalProgress = Math.floor((completed / statusIds.length) * 100);
        setGenerationProgress(totalProgress);

        if (generating > 0) {
          const currentStatus = statuses.find(s => s.status === 'generating');
          if (currentStatus) {
            setGenerationMessage(`${currentStatus.grade_level}: ${currentStatus.message} (${completed}/${statusIds.length} terminés)`);
          } else {
            setGenerationMessage(`En cours... (${completed}/${statusIds.length} terminés)`);
          }
        }

        if (completed + errors === statusIds.length) {
          clearInterval(pollInterval);
          setGenerationProgress(100);

          if (errors === 0) {
            setGenerationMessage(`✅ Tous les niveaux générés avec succès`);
            setMessage(`✅ Contenu généré avec succès pour tous les ${completed} niveaux`);
          } else {
            setGenerationMessage(`⚠️ Terminé: ${completed} succès, ${errors} erreurs`);
            setMessage(`⚠️ Génération terminée: ${completed} succès, ${errors} erreurs`);
          }

          await loadData();
          setTimeout(() => setIsGenerating(false), 2000);
        }
      }, 2000);

    } catch (error: any) {
      console.error('Erreur génération:', error);
      setMessage('❌ Erreur lors de la génération: ' + error.message);
      setIsGenerating(false);
    }
  }

  async function loadData() {
    const { data: subjectsData, error: subjectsError } = await supabase.from('subjects').select('*').order('name');
    if (subjectsError) {
      console.error('Erreur chargement matières:', subjectsError);
      setMessage('Erreur: ' + subjectsError.message);
    }
    if (subjectsData) {
      console.log('Matières chargées:', subjectsData.length);
      setSubjects(subjectsData);
    }

    const { data: chaptersData, error: chaptersError } = await supabase.from('chapters').select('*').order('order_index');
    if (chaptersError) {
      console.error('Erreur chargement leçons:', chaptersError);
    }
    if (chaptersData) {
      console.log('Leçons chargés:', chaptersData.length);
      setChapters(chaptersData);
    }

    if (currentView === 'dashboard' || currentView === 'quiz') {
      const { data: activitiesData } = await supabase.from('activities').select('*').eq('type', 'quiz').limit(10000);
      if (activitiesData) setActivities(activitiesData);

      const { count } = await supabase.from('activities').select('*', { count: 'exact', head: true }).eq('type', 'quiz');
      if (count !== null) setTotalQuizCount(count);
    }

    if (currentView === 'activities') {
      const { data: activitiesData } = await supabase.from('activities').select('*').neq('type', 'quiz').limit(10000);
      if (activitiesData) setActivities(activitiesData);
    }

    if (currentView === 'levels' || currentView === 'subjects-manager' || currentView === 'lessons-manager' || currentView === 'quiz-manager') {
      let allActivities: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: activitiesData, error } = await supabase
          .from('activities')
          .select('*')
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Erreur chargement activités:', error);
          break;
        }

        if (activitiesData && activitiesData.length > 0) {
          allActivities = [...allActivities, ...activitiesData];
          from += pageSize;
          hasMore = activitiesData.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log('Activités chargées:', allActivities.length);
      console.log('Activités par niveau:', {
        CP: allActivities.filter(a => a.type === 'quiz' && a.grade_level === 'CP').length,
        CE1: allActivities.filter(a => a.type === 'quiz' && a.grade_level === 'CE1').length,
        CE2: allActivities.filter(a => a.type === 'quiz' && a.grade_level === 'CE2').length,
        CM1: allActivities.filter(a => a.type === 'quiz' && a.grade_level === 'CM1').length,
        CM2: allActivities.filter(a => a.type === 'quiz' && a.grade_level === 'CM2').length,
      });
      setActivities(allActivities);
    }

    if (currentView === 'users') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-users`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUsers(data.users || []);
          } else {
            const error = await response.json();
            console.error('Error loading users:', error);
            setMessage('Erreur lors du chargement des utilisateurs: ' + (error.error || response.statusText));
          }
        }
      } catch (error: any) {
        console.error('Error loading users:', error);
        setMessage('Erreur lors du chargement des utilisateurs: ' + error.message);
      }
    }

    if (currentView === 'promotions' || currentView === 'settings') {
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (settingsError) {
        console.error('Erreur chargement paramètres applicatifs:', settingsError);
      }

      if (settingsData) {
        setAppSettings(settingsData as AppSettings);
      } else {
        setAppSettings(null);
      }
    }

    if (currentView === 'promotions') {
      const { data: promoData, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (promoError) {
        console.error('Erreur chargement codes promo:', promoError);
      }

      if (promoData) {
        setPromoCodes(promoData as PromoCode[]);
      }
    }
  }

  async function handleCreateChapter() {
    if (!selectedSubject || !chapterForm.title || !chapterForm.gradeLevel) {
      setMessage('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.from('chapters').insert({
        subject_id: selectedSubject,
        title: chapterForm.title,
        description: chapterForm.description,
        grade_level: chapterForm.gradeLevel,
        order_index: chapterForm.orderIndex,
      });

      if (error) throw error;

      setMessage('Leçon créé avec succès !');
      setChapterForm({ title: '', description: '', gradeLevel: '', orderIndex: 0 });
      await loadData();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateQuiz() {
    if (!selectedSubject || !selectedChapter || !quizForm.title || quizForm.questions.length === 0) {
      setMessage('Veuillez remplir tous les champs requis');
      return;
    }

    const invalidQuestions = quizForm.questions.filter(
      q => !q.question || q.options.some(o => !o)
    );

    if (invalidQuestions.length > 0) {
      setMessage('Toutes les questions doivent avoir un texte et 4 options');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const quizContent: QuizContent = { questions: quizForm.questions };

      const chapter = chapters.find(c => c.id === selectedChapter);

      const { error } = await supabase.from('activities').insert({
        subject_id: selectedSubject,
        chapter_id: selectedChapter,
        title: quizForm.title,
        type: 'quiz',
        difficulty: quizForm.difficulty,
        grade_level: chapter?.grade_level || selectedGradeLevel,
        points: quizForm.points,
        content: quizContent
      });

      if (error) throw error;

      setMessage('Quiz créé avec succès !');
      setQuizForm({
        title: '',
        difficulty: 1,
        points: 10,
        questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }],
      });
      await loadData();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function parseDateInput(value: string, endOfDay = false) {
    if (!value) return null;
    const time = endOfDay ? '23:59:59' : '00:00:00';
    const date = new Date(`${value}T${time}Z`);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }

  async function handleSaveTrialSettings() {
    if (!Number.isFinite(defaultTrialDays) || defaultTrialDays <= 0) {
      setMessage('La durée d\'essai par défaut doit être un nombre de jours positif');
      return;
    }

    if (trialPromoForm.active && (!trialPromoForm.days || trialPromoForm.days <= 0)) {
      setMessage('La durée de la promotion doit être supérieure à 0 jour');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const payload = {
        defaultTrialDays: Math.round(defaultTrialDays),
        promo: {
          active: trialPromoForm.active,
          days: trialPromoForm.active ? Math.round(trialPromoForm.days) : null,
          name: trialPromoForm.active ? (trialPromoForm.name.trim() || null) : null,
          description: trialPromoForm.active ? (trialPromoForm.description.trim() || null) : null,
          startsAt: trialPromoForm.active ? parseDateInput(trialPromoForm.startDate) : null,
          endsAt: trialPromoForm.active ? parseDateInput(trialPromoForm.endDate, true) : null,
        },
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-trial-settings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        let errorMessage = 'Mise à jour impossible';
        try {
          const errorBody = await response.json();
          if (errorBody?.error) {
            errorMessage = errorBody.error;
          }
        } catch (parseError) {
          console.error('Erreur lecture réponse update-trial-settings:', parseError);
        }
        throw new Error(errorMessage);
      }

      setMessage("Paramètres d'essai mis à jour avec succès");
      await loadData();
    } catch (error: any) {
      console.error('Erreur mise à jour paramètres essai:', error);
      setMessage('Erreur: ' + (error.message || 'Mise à jour impossible'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePromoCode() {
    if (!promoForm.code.trim() || !promoForm.description.trim()) {
      setMessage('Le code et la description sont requis');
      return;
    }

    setLoading(true);
    try {
      const insertData = {
        code: promoForm.code.trim().toUpperCase(),
        description: promoForm.description.trim(),
        free_months: Math.max(0, Math.round(promoForm.freeMonths)),
        max_uses: promoForm.maxUses ? Math.max(1, Math.round(Number(promoForm.maxUses))) : null,
        valid_from: parseDateInput(promoForm.validFrom) ?? new Date().toISOString(),
        valid_until: parseDateInput(promoForm.validUntil, true),
        active: promoForm.active,
      };

      const { error } = await supabase.from('promo_codes').insert(insertData);

      if (error) throw error;

      setMessage('Code promo créé avec succès');
      setPromoForm({ code: '', description: '', freeMonths: 1, maxUses: '', validFrom: '', validUntil: '', active: true });
      await loadData();
    } catch (error: any) {
      console.error('Erreur création code promo:', error);
      setMessage('Erreur: ' + (error.message || 'Création du code promo impossible'));
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePromoCode(code: string, updates: Partial<PromoCode>) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update(updates)
        .eq('code', code);

      if (error) throw error;

      await loadData();
      setMessage(`Code ${code} mis à jour`);
    } catch (error: any) {
      console.error('Erreur mise à jour code promo:', error);
      setMessage('Erreur: ' + (error.message || 'Mise à jour du code promo impossible'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePromoCode(code: string) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('code', code);

      if (error) throw error;

      setMessage(`Code ${code} supprimé avec succès`);
      await loadData();
    } catch (error: any) {
      console.error('Erreur suppression code promo:', error);
      setMessage('Erreur: ' + (error.message || 'Suppression du code promo impossible'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateActivity() {
    if (!selectedSubject || !selectedChapter || !activityForm.title || !activityForm.content) {
      setMessage('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const chapter = chapters.find(c => c.id === selectedChapter);

      const { error } = await supabase.from('activities').insert({
        subject_id: selectedSubject,
        chapter_id: selectedChapter,
        title: activityForm.title,
        type: activityForm.type,
        difficulty: activityForm.difficulty,
        grade_level: chapter?.grade_level || selectedGradeLevel,
        points: activityForm.points,
        content: { text: activityForm.content }
      });

      if (error) throw error;

      setMessage('Activité créée avec succès !');
      setActivityForm({ title: '', type: 'lesson', difficulty: 1, points: 5, content: '' });
      await loadData();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function addQuestion() {
    setQuizForm({
      ...quizForm,
      questions: [...quizForm.questions, { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }],
    });
  }

  function removeQuestion(index: number) {
    setQuizForm({
      ...quizForm,
      questions: quizForm.questions.filter((_, i) => i !== index),
    });
  }

  function updateQuestion(index: number, field: keyof Question, value: any) {
    const updated = [...quizForm.questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuizForm({ ...quizForm, questions: updated });
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    const updated = [...quizForm.questions];
    updated[qIndex].options[oIndex] = value;
    setQuizForm({ ...quizForm, questions: updated });
  }

  async function handleAddUser() {
    if (!newUserForm.email || !newUserForm.password || !newUserForm.full_name) {
      setMessage('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserForm.email,
        password: newUserForm.password,
        options: {
          data: {
            full_name: newUserForm.full_name,
            role: newUserForm.role,
            grade_level: newUserForm.grade_level || null,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: newUserForm.role,
            grade_level: newUserForm.grade_level || null,
            onboarding_completed: true,
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;
      }

      setMessage('Utilisateur créé avec succès !');
      setNewUserForm({ email: '', password: '', full_name: '', role: 'student', grade_level: '' });
      setShowAddUserModal(false);
      await loadData();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer l\'utilisateur',
      message: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action supprimera également son compte d\'authentification.',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('Session non disponible');

          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de la suppression');
          }

          setMessage('Utilisateur supprimé avec succès');
          await loadData();
        } catch (error: any) {
          setMessage('Erreur: ' + error.message);
        } finally {
          setLoading(false);
        }
      }
    });
  }

  function handleToggleUserSelection(userId: string) {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }

  const filteredUsers = users.filter(user => {
    const searchLower = userSearchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  function formatDateForInput(date: string | null | undefined): string {
    if (!date) return '';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().split('T')[0];
  }

  async function openSubscriptionModal(user: Profile) {
    setSubscriptionModal({
      ...INITIAL_SUBSCRIPTION_MODAL,
      isOpen: true,
      loading: true,
      user,
      planType: 'basic',
      status: 'active',
    });

    try {
      const { data, error } = await supabase
        .from<SubscriptionRecord>('subscriptions')
        .select('plan_type, status, subscription_end_date, trial_end_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      const planType = data?.plan_type || 'basic';
      const status = data?.status || 'active';
      const activationEndDate = formatDateForInput(data?.subscription_end_date || data?.trial_end_date || null);

      setSubscriptionModal(prev => ({
        ...prev,
        loading: false,
        planType,
        status,
        activationEndDate,
      }));
    } catch (error: any) {
      console.error('Erreur chargement abonnement:', error);
      setSubscriptionModal(prev => ({
        ...prev,
        loading: false,
        error: error?.message || 'Impossible de charger les informations abonnement',
      }));
    }
  }

  function closeSubscriptionModal() {
    setSubscriptionModal(INITIAL_SUBSCRIPTION_MODAL);
  }

  async function handleSaveSubscription() {
    if (!subscriptionModal.user) return;

    try {
      setSubscriptionModal(prev => ({ ...prev, saving: true, error: null, success: null }));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session non disponible');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: subscriptionModal.user.id,
          planType: subscriptionModal.planType,
          activationEndDate: subscriptionModal.activationEndDate || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Erreur lors de la mise à jour de l\'abonnement');
      }

      const updated: SubscriptionRecord | null = result?.subscription ?? null;

      setSubscriptionModal(prev => ({
        ...prev,
        saving: false,
        planType: updated?.plan_type || prev.planType,
        activationEndDate: formatDateForInput(updated?.subscription_end_date || null),
        status: updated?.status || prev.status,
        success: 'Abonnement mis à jour avec succès',
      }));

      setMessage('Abonnement mis à jour avec succès.');
    } catch (error: any) {
      console.error('Erreur mise à jour abonnement:', error);
      setSubscriptionModal(prev => ({
        ...prev,
        saving: false,
        error: error?.message || 'Erreur inattendue lors de la mise à jour',
        success: null,
      }));
    }
  }

  function handleSelectAllUsers() {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  }

  async function handleDeleteSelectedUsers() {
    if (selectedUsers.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer les utilisateurs',
      message: `Êtes-vous sûr de vouloir supprimer ${selectedUsers.length} utilisateur(s) ? Cette action supprimera également leurs comptes d'authentification.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('Session non disponible');

          for (const userId of selectedUsers) {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userId }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Erreur lors de la suppression');
            }
          }

          setMessage(`${selectedUsers.length} utilisateur(s) supprimé(s) avec succès`);
          setSelectedUsers([]);
          await loadData();
        } catch (error: any) {
          setMessage('Erreur: ' + error.message);
        } finally {
          setLoading(false);
        }
      }
    });
  }

  async function handleToggleBan(userId: string, currentBanStatus: boolean) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ banned: !currentBanStatus })
        .eq('id', userId);

      if (error) throw error;

      setMessage(!currentBanStatus ? 'Utilisateur banni' : 'Utilisateur débanni');
      await loadData();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSubject(subjectId: string) {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer la matière',
      message: 'Êtes-vous sûr de vouloir supprimer cette matière ? Tous les leçons et activités associés seront également supprimés.',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setLoading(true);
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
      if (error) throw error;

      setMessage('Matière supprimée avec succès');
      await loadData();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
      }
    });
  }

  async function handleDeleteChapter(chapterId: string) {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer le leçon',
      message: 'Êtes-vous sûr de vouloir supprimer ce leçon ? Toutes les activités associées seront également supprimées.',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setLoading(true);
    try {
      const { error } = await supabase.from('chapters').delete().eq('id', chapterId);
      if (error) throw error;

      setMessage('Leçon supprimé avec succès');
      await loadData();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
      }
    });
  }

  async function handleDeleteActivity(activityId: string) {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer l\'activité',
      message: 'Êtes-vous sûr de vouloir supprimer cette activité ?',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setLoading(true);
    try {
      const { error } = await supabase.from('activities').delete().eq('id', activityId);
      if (error) throw error;

      setMessage('Activité supprimée avec succès');
      await loadData();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
      }
    });
  }

  async function handleResetAll() {
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Supprimer toutes les données',
      message: 'Êtes-vous ABSOLUMENT sûr de vouloir supprimer TOUTES les données (matières, leçons, activités) ? Cette action est IRRÉVERSIBLE !',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setLoading(true);
    try {
      await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('chapters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      setMessage('Toutes les données ont été supprimées');
      await loadData();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
      }
    });
  }

  async function handleRegenerateAllSubjects() {
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Régénérer tout le contenu',
      message: 'Voulez-vous supprimer et régénérer TOUTES les matières, TOUS les leçons et TOUS les quiz de TOUS les niveaux ? Cette action est IRRÉVERSIBLE !',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setLoading(true);
    try {
      await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('chapters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setMessage('Toutes les données supprimées. Utilisez le générateur IA pour recréer le contenu.');
      await loadData();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
      }
    });
  }

  async function handleRegenerateAllChapters() {
    if (!selectedSubject) {
      setMessage('Veuillez sélectionner une matière');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Régénérer les leçons',
      message: 'Voulez-vous supprimer tous les leçons de cette matière et les régénérer ?',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setLoading(true);
    try {
      await supabase.from('chapters').delete().eq('subject_id', selectedSubject);
      setMessage('Leçons supprimés. Utilisez le générateur IA pour créer de nouveaux leçons.');
      await loadData();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
      }
    });
  }

  async function handleRegenerateAllActivities() {
    if (!selectedChapter) {
      setMessage('Veuillez sélectionner un leçon');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Régénérer les activités',
      message: 'Voulez-vous supprimer toutes les activités de ce leçon et les régénérer ?',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setLoading(true);
        try {
          await supabase.from('activities').delete().eq('chapter_id', selectedChapter);
          setMessage('Activités supprimées. Utilisez le générateur IA pour créer de nouvelles activités.');
          await loadData();
        } catch (error: any) {
          setMessage('Erreur: ' + error.message);
        } finally {
          setLoading(false);
        }
      }
    });
  }

  async function handleChangeRole(userId: string, newRole: string) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setMessage('Rôle modifié avec succès');
      await loadData();
    } catch (error: any) {
      setMessage('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredChapters = selectedSubject
    ? chapters.filter(c => c.subject_id === selectedSubject)
    : chapters;

  return (
    <div className="bg-white rounded-3xl shadow-2xl w-full p-8">
      <h2 className="text-3xl font-bold text-blue-600 mb-6">Panneau d'Administration</h2>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition ${
              currentView === 'dashboard'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView('lessons')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition ${
              currentView === 'lessons'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BookOpen size={20} />
            Leçons
          </button>
          <button
            onClick={() => setCurrentView('quiz')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition ${
              currentView === 'quiz'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Settings size={20} />
            Quiz
          </button>
          <button
            onClick={() => setCurrentView('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition ${
              currentView === 'users'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users size={20} />
            Utilisateurs
          </button>
          <button
            onClick={() => setCurrentView('activities')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition ${
              currentView === 'activities'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Plus size={20} />
            Activités
          </button>
          <button
            onClick={() => setCurrentView('ai-generator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition ${
              currentView === 'ai-generator'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Sparkles size={20} />
            IA Générateur
          </button>
          <button
            onClick={() => {
              setCurrentView('bulk-generation');
              setMessage('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition ${
              currentView === 'bulk-generation'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Zap size={20} />
            Génération Massive
          </button>
          <button
            onClick={() => setCurrentView('prompts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition ${
              currentView === 'prompts'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileCode size={20} />
            Prompts IA
          </button>
          <button
            onClick={() => setCurrentView('promotions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition ${
              currentView === 'promotions'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Gift size={20} />
            Promotions
          </button>
          <button
            onClick={() => setCurrentView('custom-statuses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition ${
              currentView === 'custom-statuses'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Smile size={20} />
            Statuts
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition ${
              currentView === 'settings'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Settings size={20} />
            Paramètres
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg whitespace-pre-line ${
            message.includes('succès') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {currentView === 'dashboard' && (
          <div className="space-y-6">
            <div className="mb-6 flex justify-end gap-3">
              {isGenerating && (
                <button
                  onClick={handleCloseGeneration}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-all"
                >
                  <X size={20} />
                  <span className="font-semibold">Arrêter la génération</span>
                </button>
              )}
              <button
                onClick={() => {
                  showConfirm(
                    'Générer tout le contenu',
                    'Cette action va générer automatiquement tout le contenu (matières, leçons et quiz) pour tous les niveaux scolaires.\n\nCela peut prendre plusieurs minutes et consommer des ressources.\n\nVoulez-vous continuer ?',
                    handleGenerateAllContent,
                    'warning'
                  );
                }}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={20} />
                <span className="font-semibold">
                  {isGenerating ? 'Génération en cours...' : 'Générer tout le contenu'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <button
                onClick={() => setCurrentView('levels')}
                className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg hover:scale-105 transition-transform text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <GraduationCap size={32} className="opacity-80" />
                  <span className="text-4xl font-bold">{GRADE_LEVELS.length}</span>
                </div>
                <h3 className="text-xl font-semibold">Niveaux</h3>
                <p className="text-orange-100 text-sm">Cliquez pour gérer</p>
              </button>

              <button
                onClick={() => setCurrentView('subjects-manager')}
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg hover:scale-105 transition-transform text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <BookOpen size={32} className="opacity-80" />
                  <span className="text-4xl font-bold">{subjects.length}</span>
                </div>
                <h3 className="text-xl font-semibold">Matières</h3>
                <p className="text-blue-100 text-sm">Cliquez pour gérer</p>
              </button>

              <button
                onClick={() => setCurrentView('lessons-manager')}
                className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg hover:scale-105 transition-transform text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <FileText size={32} className="opacity-80" />
                  <span className="text-4xl font-bold">{chapters.length}</span>
                </div>
                <h3 className="text-xl font-semibold">Leçons</h3>
                <p className="text-green-100 text-sm">Cliquez pour gérer</p>
              </button>

              <button
                onClick={() => setCurrentView('quiz-manager')}
                className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg hover:scale-105 transition-transform text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <Settings size={32} className="opacity-80" />
                  <span className="text-4xl font-bold">{totalQuizCount}</span>
                </div>
                <h3 className="text-xl font-semibold">Quiz</h3>
                <p className="text-purple-100 text-sm">Cliquez pour gérer</p>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <GraduationCap className="text-blue-500" />
                  Contenu par Niveau
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {GRADE_LEVELS.map(level => {
                    const levelSubjects = subjects.filter(s => s.grade_levels?.includes(level));
                    const levelChapters = chapters.filter(c => c.grade_level === level);
                    const levelQuizzes = activities.filter(a => a.type === 'quiz' && a.grade_level === level);

                    return (
                      <div key={level} className="p-4 bg-gray-50 rounded-xl">
                        <h4 className="font-bold text-gray-800 mb-2">{level}</h4>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Matières:</span>
                            <span className="ml-2 font-semibold text-blue-600">{levelSubjects.length}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Leçons:</span>
                            <span className="ml-2 font-semibold text-green-600">{levelChapters.length}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Quiz:</span>
                            <span className="ml-2 font-semibold text-purple-600">{levelQuizzes.length}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <MessageCircle className="text-blue-500" />
                  Tester le Coach IA
                </h3>
                <p className="text-gray-600 mb-4">
                  Testez le chatbot pédagogique avec OpenAI
                </p>
                <button
                  onClick={() => setCurrentView('coach-test')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                >
                  Ouvrir le Coach IA
                </button>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FileCode className="text-purple-500" />
                  Prompts IA
                </h3>
                <p className="text-gray-600 mb-4">
                  Personnalisez tous les prompts utilisés par l'IA
                </p>
                <button
                  onClick={() => setCurrentView('prompts')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                >
                  Gérer les Prompts
                </button>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Eye className="text-green-500" />
                  Simulateur Élève
                </h3>
                <p className="text-gray-600 mb-4">
                  Visualisez l'interface exacte qu'un élève voit selon son niveau
                </p>
                <button
                  onClick={() => setCurrentView('student-simulator')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                >
                  Ouvrir le Simulateur
                </button>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="text-blue-500" />
                  Matières Récentes
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {subjects.slice(0, 10).map(subject => {
                    const subjectChapters = chapters.filter(c => c.subject_id === subject.id);
                    const subjectQuizzes = activities.filter(a => a.subject_id === subject.id && a.type === 'quiz');

                    return (
                      <div key={subject.id} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800">{subject.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{subject.description}</p>
                            <div className="flex gap-4 mt-2 text-sm">
                              <span className="text-green-600 font-semibold">{subjectChapters.length} leçons</span>
                              <span className="text-purple-600 font-semibold">{subjectQuizzes.length} quiz</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'coach-test' && (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
              Retour au tableau de bord
            </button>
            <CoachDevoirs onBack={() => setCurrentView('dashboard')} />
          </div>
        )}

        {currentView === 'prompts' && (
          <div>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
              Retour au tableau de bord
            </button>
            <PromptsManager />
          </div>
        )}

        {currentView === 'student-simulator' && (
          <div className="space-y-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
              Retour au tableau de bord
            </button>

            <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <Eye size={32} className="text-green-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Simulateur Vue Élève</h2>
                  <p className="text-gray-600">Visualisez l'expérience utilisateur selon le niveau scolaire</p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Sélectionnez un niveau scolaire :
                </label>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                  {GRADE_LEVELS.map(level => (
                    <button
                      key={level}
                      onClick={() => setSimulatorLevel(level)}
                      className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                        simulatorLevel === level
                          ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">
                  Vue Élève - Niveau {simulatorLevel}
                </h3>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  Mode Simulation
                </span>
              </div>

              <div className="border-4 border-green-200 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-purple-50">
                {subjects.filter(s => s.grade_levels?.includes(simulatorLevel)).length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 text-lg">
                      Aucune matière disponible pour le niveau {simulatorLevel}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      Générez du contenu depuis le tableau de bord
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 mb-4">
                        📚 Mes Matières ({subjects.filter(s => s.grade_levels?.includes(simulatorLevel)).length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subjects.filter(s => s.grade_levels?.includes(simulatorLevel)).map(subject => {
                          const subjectChapters = chapters.filter(c => c.subject_id === subject.id && c.grade_level === simulatorLevel);
                          const subjectQuizzes = activities.filter(a => a.subject_id === subject.id && a.type === 'quiz' && a.grade_level === simulatorLevel);

                          return (
                            <div key={subject.id} className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-12 h-12 rounded-xl ${subject.color} flex items-center justify-center text-2xl`}>
                                  {subject.icon}
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-bold text-gray-800">{subject.name}</h5>
                                  <p className="text-xs text-gray-500">{subject.description}</p>
                                </div>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <div className="flex items-center gap-1 text-green-600">
                                  <FileText size={14} />
                                  <span className="font-semibold">{subjectChapters.length}</span>
                                  <span className="text-gray-500">leçons</span>
                                </div>
                                <div className="flex items-center gap-1 text-blue-600">
                                  <Settings size={14} />
                                  <span className="font-semibold">{subjectQuizzes.length}</span>
                                  <span className="text-gray-500">quiz</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {chapters.filter(c => c.grade_level === simulatorLevel).length > 0 && (
                      <div>
                        <h4 className="text-lg font-bold text-gray-800 mb-4">
                          📖 Toutes mes Leçons ({chapters.filter(c => c.grade_level === simulatorLevel).length})
                        </h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {chapters.filter(c => c.grade_level === simulatorLevel).map(chapter => {
                            const subject = subjects.find(s => s.id === chapter.subject_id);
                            const chapterQuizzes = activities.filter(a => a.chapter_id === chapter.id && a.type === 'quiz');

                            return (
                              <div key={chapter.id} className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-all">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {subject && (
                                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${subject.color}`}>
                                          {subject.icon} {subject.name}
                                        </span>
                                      )}
                                    </div>
                                    <h5 className="font-bold text-gray-800">{chapter.title}</h5>
                                    <p className="text-sm text-gray-600 mt-1">{chapter.description}</p>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-blue-600">
                                    <Settings size={14} />
                                    <span className="font-semibold">{chapterQuizzes.length}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 <strong>Mode Simulateur :</strong> Cette interface montre exactement ce qu'un élève de niveau {simulatorLevel} verrait dans l'application.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentView === 'levels' && (
          <div className="space-y-6">
            <div className="bg-orange-50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-800">Gestion des Niveaux Scolaires</h3>
                <button
                  onClick={async () => {
                    setLoading(true);
                    await loadData();
                    setLoading(false);
                    setMessage('✅ Données rechargées');
                  }}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Recharger
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Cliquez sur un niveau pour voir son contenu détaillé et effectuer des actions.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {GRADE_LEVELS.map(level => {
                  const levelSubjects = subjects.filter(s => s.grade_levels?.includes(level));
                  const levelChapters = chapters.filter(c => c.grade_level === level);
                  const levelQuizzes = activities.filter(a => a.type === 'quiz' && a.grade_level === level);

                  return (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`p-6 rounded-2xl transition-all ${
                        selectedLevel === level
                          ? 'bg-orange-500 text-white shadow-lg scale-105'
                          : 'bg-white text-gray-800 hover:bg-orange-100 shadow-md'
                      }`}
                    >
                      <div className="text-center">
                        <h4 className="text-2xl font-bold mb-3">{level}</h4>
                        <div className="space-y-1 text-sm">
                          <div className={selectedLevel === level ? 'text-orange-100' : 'text-gray-600'}>
                            <span className="font-semibold">{levelSubjects.length}</span> matières
                          </div>
                          <div className={selectedLevel === level ? 'text-orange-100' : 'text-gray-600'}>
                            <span className="font-semibold">{levelChapters.length}</span> leçons
                          </div>
                          <div className={selectedLevel === level ? 'text-orange-100' : 'text-gray-600'}>
                            <span className="font-semibold">{levelQuizzes.length}</span> quiz
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedLevel && (
              <div className="space-y-6">
                <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200">
                  <h4 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                    <Trash2 className="text-red-600" />
                    Actions Destructives
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        showConfirm(
                          'Supprimer tout le contenu',
                          `Voulez-vous vraiment supprimer TOUT le contenu du niveau ${selectedLevel} (matières, leçons ET quiz) ? Cette action est IRRÉVERSIBLE !`,
                          async () => {
                            setLoading(true);
                            setMessage('');

                            // Supprimer les quiz
                            const quizIds = activities.filter(a => a.type === 'quiz' && a.grade_level === selectedLevel).map(a => a.id);
                            if (quizIds.length > 0) {
                              await supabase.from('activities').delete().in('id', quizIds);
                            }

                            // Supprimer les leçons
                            const chapterIds = chapters.filter(c => c.grade_level === selectedLevel).map(c => c.id);
                            if (chapterIds.length > 0) {
                              await supabase.from('chapters').delete().in('id', chapterIds);
                            }

                            // Supprimer les matières (seulement celles qui sont exclusives à ce niveau)
                            const subjectsToDelete = subjects.filter(s =>
                              s.grade_levels?.length === 1 && s.grade_levels[0] === selectedLevel
                            ).map(s => s.id);

                            if (subjectsToDelete.length > 0) {
                              await supabase.from('subjects').delete().in('id', subjectsToDelete);
                            }

                            setMessage(`Tout le contenu du niveau ${selectedLevel} a été supprimé avec succès !`);
                            await loadData();
                            setLoading(false);
                          },
                          'danger'
                        );
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-bold"
                    >
                      <Trash2 size={20} />
                      SUPPRIMER TOUT LE NIVEAU
                    </button>

                    <button
                      onClick={() => {
                        showConfirm(
                          'Supprimer les matières',
                          `Voulez-vous vraiment supprimer toutes les matières du niveau ${selectedLevel} ?`,
                          async () => {
                            setLoading(true);
                            const subjectsToDelete = subjects.filter(s =>
                              s.grade_levels?.length === 1 && s.grade_levels[0] === selectedLevel
                            ).map(s => s.id);

                            if (subjectsToDelete.length > 0) {
                              await supabase.from('subjects').delete().in('id', subjectsToDelete);
                              setMessage('Matières supprimées avec succès !');
                            } else {
                              setMessage('Aucune matière exclusive à ce niveau');
                            }
                            await loadData();
                            setLoading(false);
                          },
                          'danger'
                        );
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Supprimer Matières
                    </button>

                    <button
                      onClick={() => {
                        showConfirm(
                          'Supprimer les leçons',
                          `Voulez-vous vraiment supprimer tous les leçons du niveau ${selectedLevel} ?`,
                          async () => {
                            setLoading(true);
                            const chapterIds = chapters.filter(c => c.grade_level === selectedLevel).map(c => c.id);
                            if (chapterIds.length > 0) {
                              await supabase.from('chapters').delete().in('id', chapterIds);
                              setMessage('Leçons supprimés avec succès !');
                            }
                            await loadData();
                            setLoading(false);
                          },
                          'danger'
                        );
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Supprimer Leçons
                    </button>

                    <button
                      onClick={() => {
                        showConfirm(
                          'Supprimer les quiz',
                          `Voulez-vous vraiment supprimer tous les quiz du niveau ${selectedLevel} ?`,
                          async () => {
                            setLoading(true);
                            const quizIds = activities.filter(a => a.type === 'quiz' && a.grade_level === selectedLevel).map(a => a.id);
                            if (quizIds.length > 0) {
                              await supabase.from('activities').delete().in('id', quizIds);
                              setMessage('Quiz supprimés avec succès !');
                            }
                            await loadData();
                            setLoading(false);
                          },
                          'danger'
                        );
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Supprimer Quiz
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6 border-2 border-green-200">
                  <h4 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                    <Sparkles className="text-green-600" />
                    Génération par IA
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={async () => {
                        if (await customConfirm(`Voulez-vous régénérer TOUT le contenu du niveau ${selectedLevel} par IA (matières + leçons + quiz) ? Cela peut prendre plusieurs minutes.`)) {
                          try {
                            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-level-content`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                gradeLevel: selectedLevel
                              }),
                            });

                            const result = await response.json();

                            if (result.success && result.statusId) {
                              setIsGenerating(true);
                              setGenerationProgress(0);
                              setGenerationMessage('Génération démarrée...');

                              // Suivre le statut en temps réel
                              const statusInterval = setInterval(async () => {
                                const { data: status } = await supabase
                                  .from('generation_status')
                                  .select('*')
                                  .eq('id', result.statusId)
                                  .single();

                                if (status) {
                                  setGenerationProgress(status.progress || 0);
                                  setGenerationMessage(status.message || 'En cours...');

                                  if (status.status === 'completed') {
                                    clearInterval(statusInterval);
                                    setMessage(`✅ Contenu généré: ${status.subjects_count} matières, ${status.chapters_count} leçons, ${status.quizzes_count} quiz`);
                                    await loadData();
                                    setTimeout(() => {
                                      setIsGenerating(false);
                                    }, 3000);
                                  } else if (status.status === 'error') {
                                    clearInterval(statusInterval);
                                    setMessage(`❌ ${status.message}`);
                                    setIsGenerating(false);
                                  }
                                }
                              }, 2000);

                              // Auto-cleanup après 5 minutes
                              setTimeout(() => clearInterval(statusInterval), 300000);
                            } else {
                              throw new Error(result.error || 'Erreur lors du démarrage');
                            }
                          } catch (error) {
                            console.error('Erreur:', error);
                            setMessage('❌ Erreur: ' + (error.message || 'Erreur inconnue'));
                          }
                        }
                      }}
                      disabled={loading || isGenerating}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition disabled:opacity-50 font-bold"
                    >
                      <Sparkles size={20} />
                      RÉGÉNÉRER TOUT PAR IA
                    </button>

                    <button
                      onClick={async () => {
                        if (await customConfirm(`Générer toutes les matières pour le niveau ${selectedLevel} ?`)) {
                          setLoading(true);
                          setMessage('Génération des matières en cours...');

                          try {
                            const currentYear = new Date().getFullYear();
                            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-content-generator/generate-subjects`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                gradeLevel: selectedLevel,
                                schoolYear: currentYear.toString()
                              }),
                            });

                            if (!response.ok) {
                              throw new Error('Erreur lors de la génération');
                            }

                            const result = await response.json();

                            if (result.success && result.data?.subjects) {
                              // Sauvegarder les matières dans Supabase
                              const subjectsToInsert = result.data.subjects.map((subj: any) => ({
                                name: subj.name,
                                icon: subj.icon,
                                color: subj.color,
                                description: subj.description,
                                grade_levels: subj.grade_levels || [selectedLevel]
                              }));

                              const { error } = await supabase
                                .from('subjects')
                                .insert(subjectsToInsert);

                              if (error) throw error;

                              await loadData();
                              setMessage(`${subjectsToInsert.length} matière(s) générée(s) avec succès !`);
                            } else {
                              throw new Error('Réponse invalide de l\'API');
                            }
                          } catch (error: any) {
                            setMessage(`Erreur: ${error.message}`);
                          }
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                    >
                      <Sparkles size={16} />
                      Générer Matières
                    </button>

                    <button
                      onClick={async () => {
                        if (await customConfirm(`Générer tous les leçons pour toutes les matières du niveau ${selectedLevel} ?`)) {
                          setLoading(true);
                          setMessage('Génération des leçons en cours...');

                          try {
                            const levelSubjects = subjects.filter(s => s.grade_levels?.includes(selectedLevel));
                            let totalChapters = 0;
                            const totalSubjects = levelSubjects.length;
                            let currentSubjectIndex = 0;

                            const currentYear = new Date().getFullYear();

                            for (const subject of levelSubjects) {
                              currentSubjectIndex++;
                              setMessage(`Matière ${currentSubjectIndex}/${totalSubjects}\nGénération des leçons pour ${subject.name}...`);

                              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-content-generator/generate-chapter`, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  subject: subject.name,
                                  gradeLevel: selectedLevel,
                                  schoolYear: currentYear.toString()
                                }),
                              });

                              if (!response.ok) {
                                console.error(`Erreur pour ${subject.name}`);
                                continue;
                              }

                              const result = await response.json();

                              if (result.success && result.data?.chapters) {
                                // Sauvegarder les leçons dans Supabase
                                const chaptersToInsert = result.data.chapters.map((ch: any, index: number) => ({
                                  subject_id: subject.id,
                                  title: ch.title,
                                  description: ch.description,
                                  grade_level: selectedLevel,
                                  order_index: ch.order_index !== undefined ? ch.order_index : index
                                }));

                                const { error } = await supabase
                                  .from('chapters')
                                  .insert(chaptersToInsert);

                                if (!error) {
                                  totalChapters += chaptersToInsert.length;
                                }
                              }
                            }

                            await loadData();
                            setMessage(`${totalChapters} leçon(s) généré(s) avec succès !`);
                          } catch (error: any) {
                            setMessage(`Erreur: ${error.message}`);
                          }
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                    >
                      <Sparkles size={16} />
                      Générer Leçons
                    </button>

                    <button
                      onClick={async () => {
                        if (await customConfirm(`Générer tous les quiz (5 facile, 5 moyen, 5 difficile = 15 quiz par leçon) pour le niveau ${selectedLevel} ?`)) {
                          setLoading(true);
                          setMessage('Génération des quiz en cours...');

                          try {
                            const levelChapters = chapters.filter(c => c.grade_level === selectedLevel);
                            let totalQuizzes = 0;
                            let failedQuizzes = 0;
                            const totalLessons = levelChapters.length;
                            const BATCH_SIZE = 3;
                            const TIMEOUT_MS = 45000;

                            const difficulties = [
                              { level: 'easy', name: 'Facile', difficulty: 1, points: 50 },
                              { level: 'medium', name: 'Moyen', difficulty: 3, points: 100 },
                              { level: 'hard', name: 'Difficile', difficulty: 5, points: 150 }
                            ];

                            const generateQuizWithTimeout = async (chapter: any, subject: any, diff: any, quizNumber: number) => {
                              const controller = new AbortController();
                              const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

                              try {
                                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-content-generator/generate-quiz`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    subject: subject.name,
                                    gradeLevel: selectedLevel,
                                    chapter: chapter.title,
                                    topic: chapter.title,
                                    numberOfQuestions: 10,
                                    difficulty: diff.level
                                  }),
                                  signal: controller.signal
                                });

                                clearTimeout(timeoutId);

                                if (!response.ok) {
                                  throw new Error(`HTTP ${response.status}`);
                                }

                                const result = await response.json();

                                if (result.success && result.data) {
                                  const { error } = await supabase
                                    .from('activities')
                                    .insert({
                                      chapter_id: chapter.id,
                                      subject_id: subject.id,
                                      title: `${result.data.title || chapter.title} - ${diff.name} ${quizNumber}`,
                                      type: 'quiz',
                                      difficulty: diff.difficulty,
                                      grade_level: selectedLevel,
                                      points: diff.points,
                                      content: { questions: result.data.questions }
                                    });

                                  if (!error) {
                                    return { success: true };
                                  }
                                }
                                return { success: false };
                              } catch (error: any) {
                                clearTimeout(timeoutId);
                                console.error(`Erreur quiz ${chapter.title} - ${diff.name} ${quizNumber}:`, error.message);
                                return { success: false, error: error.message };
                              }
                            };

                            for (let i = 0; i < levelChapters.length; i++) {
                              const chapter = levelChapters[i];
                              const subject = subjects.find(s => s.id === chapter.subject_id);
                              if (!subject) continue;

                              setMessage(`Leçon ${i + 1}/${totalLessons}: ${chapter.title}\nQuiz générés: ${totalQuizzes} | Échecs: ${failedQuizzes}`);

                              for (const diff of difficulties) {
                                const quizPromises = [];

                                for (let quizNumber = 1; quizNumber <= 5; quizNumber++) {
                                  quizPromises.push(generateQuizWithTimeout(chapter, subject, diff, quizNumber));

                                  if (quizPromises.length === BATCH_SIZE || quizNumber === 5) {
                                    const results = await Promise.all(quizPromises);
                                    results.forEach(result => {
                                      if (result.success) {
                                        totalQuizzes++;
                                      } else {
                                        failedQuizzes++;
                                      }
                                    });
                                    quizPromises.length = 0;
                                    setMessage(`Leçon ${i + 1}/${totalLessons}: ${chapter.title}\nQuiz générés: ${totalQuizzes} | Échecs: ${failedQuizzes}`);
                                  }
                                }
                              }
                            }

                            await loadData();
                            setMessage(`✓ ${totalQuizzes} quiz générés | ✗ ${failedQuizzes} échecs`);
                          } catch (error: any) {
                            setMessage(`Erreur: ${error.message}`);
                          }
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50"
                    >
                      <Sparkles size={16} />
                      Générer Quiz
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">
                      Contenu du niveau {selectedLevel}
                    </h3>
                    <button
                      onClick={() => setSelectedLevel(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Fermer
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <BookOpen className="text-blue-500" />
                          Matières ({subjects.filter(s => s.grade_levels?.includes(selectedLevel)).length})
                        </h4>
                        {selectedSubjects.length > 0 && (
                          <button
                            onClick={async () => {
                              if (await customConfirm(`Supprimer ${selectedSubjects.length} matière(s) avec leurs leçons et quiz ?`)) {
                                setLoading(true);
                                // Supprimer les quiz
                                await supabase.from('activities').delete().in('subject_id', selectedSubjects);
                                // Supprimer les leçons
                                await supabase.from('chapters').delete().in('subject_id', selectedSubjects);
                                // Supprimer les matières
                                await supabase.from('subjects').delete().in('id', selectedSubjects);
                                setSelectedSubjects([]);
                                setMessage(`${selectedSubjects.length} matière(s) supprimée(s)`);
                                await loadData();
                                setLoading(false);
                              }
                            }}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                            Supprimer ({selectedSubjects.length})
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {subjects.filter(s => s.grade_levels?.includes(selectedLevel)).map(subject => {
                          const isSelected = selectedSubjects.includes(subject.id);
                          const subjectChapters = chapters.filter(c => c.subject_id === subject.id);
                          return (
                            <div
                              key={subject.id}
                              className={`p-4 rounded-xl border-2 transition ${
                                isSelected
                                  ? 'bg-blue-100 border-blue-500'
                                  : 'bg-blue-50 border-transparent hover:border-blue-300'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSubjects([...selectedSubjects, subject.id]);
                                    } else {
                                      setSelectedSubjects(selectedSubjects.filter(id => id !== subject.id));
                                    }
                                  }}
                                  className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div
                                  className="flex-1 cursor-pointer"
                                  onClick={() => setSelectedSubjectView(subject.id)}
                                >
                                  <h5 className="font-bold text-gray-800 flex items-center gap-2">
                                    {subject.name}
                                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                                      {subjectChapters.length} leçons
                                    </span>
                                  </h5>
                                  <p className="text-sm text-gray-600 mt-1">{subject.description}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <FileText className="text-green-500" />
                          Leçons ({chapters.filter(c => c.grade_level === selectedLevel).length})
                        </h4>
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {chapters.filter(c => c.grade_level === selectedLevel).map(chapter => {
                          const subject = subjects.find(s => s.id === chapter.subject_id);
                          return (
                            <div key={chapter.id} className="p-4 bg-green-50 rounded-xl flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-bold text-gray-800">{chapter.title}</h5>
                                <p className="text-sm text-gray-600">{subject?.name}</p>
                                <p className="text-sm text-gray-500 mt-1">{chapter.description}</p>
                              </div>
                              <button
                                onClick={async () => {
                                  if (await customConfirm('Supprimer ce leçon ?')) {
                                    const { error } = await supabase.from('chapters').delete().eq('id', chapter.id);
                                    if (!error) {
                                      setMessage('Leçon supprimé');
                                      await loadData();
                                    }
                                  }
                                }}
                                className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <Settings className="text-purple-500" />
                          Quiz ({activities.filter(a => a.type === 'quiz' && a.grade_level === selectedLevel).length})
                        </h4>
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {activities.filter(a => a.type === 'quiz' && a.grade_level === selectedLevel).map(quiz => {
                          const subject = subjects.find(s => s.id === quiz.subject_id);
                          return (
                            <div key={quiz.id} className="p-4 bg-purple-50 rounded-xl flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-bold text-gray-800">{quiz.title}</h5>
                                <p className="text-sm text-gray-600">{subject?.name}</p>
                                <div className="flex gap-4 mt-1 text-sm text-gray-500">
                                  <span>Difficulté: {quiz.difficulty}/5</span>
                                  <span>Points: {quiz.points}</span>
                                </div>
                              </div>
                              <button
                                onClick={async () => {
                                  if (await customConfirm('Supprimer ce quiz ?')) {
                                    const { error } = await supabase.from('activities').delete().eq('id', quiz.id);
                                    if (!error) {
                                      setMessage('Quiz supprimé');
                                      await loadData();
                                    }
                                  }
                                }}
                                className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'subjects-manager' && (
          <div className="space-y-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-6 bg-white px-6 py-3 rounded-full shadow-md hover:bg-gray-50 transition font-semibold text-gray-700"
            >
              ← Retour au Dashboard
            </button>

            <div className="bg-blue-50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <BookOpen className="text-blue-500" />
                  Gestion des Matières ({subjects.length})
                </h3>
                <div className="flex gap-3">
                  {selectedSubjects.length > 0 && (
                    <button
                      onClick={async () => {
                        if (await customConfirm(`⚠️ Supprimer ${selectedSubjects.length} matière(s) avec TOUS leurs leçons et quiz ?`)) {
                          setLoading(true);
                          await supabase.from('activities').delete().in('subject_id', selectedSubjects);
                          await supabase.from('chapters').delete().in('subject_id', selectedSubjects);
                          await supabase.from('subjects').delete().in('id', selectedSubjects);
                          setSelectedSubjects([]);
                          setMessage(`${selectedSubjects.length} matière(s) supprimée(s)`);
                          await loadData();
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Supprimer ({selectedSubjects.length})
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (await customConfirm('⚠️ Supprimer TOUTES les matières avec TOUS leurs contenus ?')) {
                        setLoading(true);
                        await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        await supabase.from('chapters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        await supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        setMessage('Toutes les matières ont été supprimées');
                        await loadData();
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-bold"
                  >
                    <Trash2 size={16} />
                    Tout Supprimer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map(subject => {
                  const isSelected = selectedSubjects.includes(subject.id);
                  const subjectChapters = chapters.filter(c => c.subject_id === subject.id);
                  const subjectQuizzes = activities.filter(a => a.subject_id === subject.id && a.type === 'quiz');

                  return (
                    <div
                      key={subject.id}
                      className={`p-5 rounded-xl border-2 transition ${
                        isSelected
                          ? 'bg-blue-100 border-blue-500'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubjects([...selectedSubjects, subject.id]);
                            } else {
                              setSelectedSubjects(selectedSubjects.filter(id => id !== subject.id));
                            }
                          }}
                          className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <h5 className="font-bold text-gray-800 mb-1">{subject.name}</h5>
                          <p className="text-sm text-gray-600 mb-2">{subject.description}</p>
                          <div className="flex gap-3 text-xs">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
                              {subject.grade_levels?.join(', ') || 'N/A'}
                            </span>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                              {subjectChapters.length} ch.
                            </span>
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-semibold">
                              {subjectQuizzes.length} quiz
                            </span>
                          </div>
                          <button
                            onClick={async () => {
                              if (await customConfirm(`Supprimer "${subject.name}" avec tous ses contenus ?`)) {
                                await supabase.from('activities').delete().eq('subject_id', subject.id);
                                await supabase.from('chapters').delete().eq('subject_id', subject.id);
                                await supabase.from('subjects').delete().eq('id', subject.id);
                                setMessage(`"${subject.name}" supprimée`);
                                await loadData();
                              }
                            }}
                            className="mt-3 flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-semibold"
                          >
                            <Trash2 size={14} />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {subjects.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">Aucune matière disponible</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'lessons-manager' && (
          <div className="space-y-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-6 bg-white px-6 py-3 rounded-full shadow-md hover:bg-gray-50 transition font-semibold text-gray-700"
            >
              ← Retour au Dashboard
            </button>

            <div className="bg-green-50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="text-green-500" />
                  Gestion des Leçons ({chapters.length})
                </h3>
                <div className="flex gap-3">
                  {selectedChapters.length > 0 && (
                    <button
                      onClick={async () => {
                        if (await customConfirm(`Supprimer ${selectedChapters.length} leçon(s) ?`)) {
                          setLoading(true);
                          await supabase.from('activities').delete().in('chapter_id', selectedChapters);
                          await supabase.from('chapters').delete().in('id', selectedChapters);
                          setSelectedChapters([]);
                          setMessage(`${selectedChapters.length} leçon(s) supprimé(s)`);
                          await loadData();
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Supprimer ({selectedChapters.length})
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (await customConfirm('⚠️ Supprimer TOUS les leçons ?')) {
                        setLoading(true);
                        await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        await supabase.from('chapters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        setMessage('Tous les leçons ont été supprimés');
                        await loadData();
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-bold"
                  >
                    <Trash2 size={16} />
                    Tout Supprimer
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {chapters.map(chapter => {
                  const isSelected = selectedChapters.includes(chapter.id);
                  const subject = subjects.find(s => s.id === chapter.subject_id);
                  const chapterQuizzes = activities.filter(a => a.chapter_id === chapter.id && a.type === 'quiz');

                  return (
                    <div
                      key={chapter.id}
                      className={`p-4 rounded-xl border-2 transition ${
                        isSelected
                          ? 'bg-green-100 border-green-500'
                          : 'bg-white border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChapters([...selectedChapters, chapter.id]);
                            } else {
                              setSelectedChapters(selectedChapters.filter(id => id !== chapter.id));
                            }
                          }}
                          className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-bold text-gray-800">{chapter.title}</h5>
                              <p className="text-sm text-gray-600 mt-1">{chapter.description}</p>
                              <div className="flex gap-2 mt-2 text-xs">
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  {subject?.name || 'N/A'}
                                </span>
                                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                  {chapter.grade_level}
                                </span>
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                  {chapterQuizzes.length} quiz
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                if (await customConfirm(`Supprimer "${chapter.title}" ?`)) {
                                  await supabase.from('activities').delete().eq('chapter_id', chapter.id);
                                  await supabase.from('chapters').delete().eq('id', chapter.id);
                                  setMessage(`"${chapter.title}" supprimé`);
                                  await loadData();
                                }
                              }}
                              className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {chapters.length === 0 && (
                <div className="text-center py-12">
                  <FileText size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">Aucun leçon disponible</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'quiz-manager' && (
          <div className="space-y-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-6 bg-white px-6 py-3 rounded-full shadow-md hover:bg-gray-50 transition font-semibold text-gray-700"
            >
              ← Retour au Dashboard
            </button>

            <div className="bg-purple-50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Settings className="text-purple-500" />
                    Gestion des Quiz
                  </h3>
                  <div className="mt-2 text-sm text-gray-600">
                    Total: <span className="font-bold text-purple-600">
                      {activities.filter(a => {
                        if (a.type !== 'quiz') return false;
                        if (selectedLevel && a.grade_level !== selectedLevel) return false;
                        if (quizFilterSubject && a.subject_id !== quizFilterSubject) return false;
                        if (quizFilterChapter && a.chapter_id !== quizFilterChapter) return false;
                        return true;
                      }).length}
                    </span> quiz
                    {(selectedLevel || quizFilterSubject || quizFilterChapter) && (
                      <span className="text-gray-500"> (filtré sur {activities.filter(a => a.type === 'quiz').length} total)</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  {selectedQuizzes.length > 0 && (
                    <button
                      onClick={async () => {
                        if (await customConfirm(`Supprimer ${selectedQuizzes.length} quiz ?`)) {
                          setLoading(true);
                          await supabase.from('activities').delete().in('id', selectedQuizzes);
                          setSelectedQuizzes([]);
                          setMessage(`${selectedQuizzes.length} quiz supprimé(s)`);
                          await loadData();
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Supprimer ({selectedQuizzes.length})
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (await customConfirm('⚠️ Supprimer TOUS les quiz ?')) {
                        setLoading(true);
                        await supabase.from('activities').delete().eq('type', 'quiz');
                        setMessage('Tous les quiz ont été supprimés');
                        await loadData();
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-bold"
                  >
                    <Trash2 size={16} />
                    Tout Supprimer
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mb-4 flex-wrap">
                <select
                  value={selectedLevel || ''}
                  onChange={(e) => {
                    setSelectedLevel(e.target.value || null);
                    setQuizFilterSubject(null);
                    setQuizFilterChapter(null);
                  }}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400 focus:outline-none"
                >
                  <option value="">Tous les niveaux</option>
                  {GRADE_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>

                <select
                  value={quizFilterSubject || ''}
                  onChange={(e) => {
                    setQuizFilterSubject(e.target.value || null);
                    setQuizFilterChapter(null);
                  }}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400 focus:outline-none"
                >
                  <option value="">Toutes les matières</option>
                  {subjects
                    .filter(subject => {
                      if (!selectedLevel) return true;
                      const subjectLevels = subject.grade_levels || [];
                      return subjectLevels.includes(selectedLevel);
                    })
                    .map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                </select>

                <select
                  value={quizFilterChapter || ''}
                  onChange={(e) => setQuizFilterChapter(e.target.value || null)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400 focus:outline-none"
                >
                  <option value="">Toutes les leçons</option>
                  {chapters
                    .filter(c => {
                      if (quizFilterSubject && c.subject_id !== quizFilterSubject) return false;
                      if (selectedLevel && c.grade_level !== selectedLevel) return false;
                      return true;
                    })
                    .map(chapter => (
                      <option key={chapter.id} value={chapter.id}>{chapter.title}</option>
                    ))}
                </select>

                {(selectedLevel || quizFilterSubject || quizFilterChapter) && (
                  <button
                    onClick={() => {
                      setSelectedLevel(null);
                      setQuizFilterSubject(null);
                      setQuizFilterChapter(null);
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition font-semibold"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {activities.filter(a => {
                  if (a.type !== 'quiz') return false;
                  if (selectedLevel && a.grade_level !== selectedLevel) return false;
                  if (quizFilterSubject && a.subject_id !== quizFilterSubject) return false;
                  if (quizFilterChapter && a.chapter_id !== quizFilterChapter) return false;
                  return true;
                }).map(quiz => {
                  const isSelected = selectedQuizzes.includes(quiz.id);
                  const subject = subjects.find(s => s.id === quiz.subject_id);
                  const chapter = chapters.find(c => c.id === quiz.chapter_id);

                  return (
                    <div
                      key={quiz.id}
                      className={`p-4 rounded-xl border-2 transition ${
                        isSelected
                          ? 'bg-purple-100 border-purple-500'
                          : 'bg-white border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQuizzes([...selectedQuizzes, quiz.id]);
                            } else {
                              setSelectedQuizzes(selectedQuizzes.filter(id => id !== quiz.id));
                            }
                          }}
                          className="mt-1 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-bold text-gray-800">{quiz.title}</h5>
                              <div className="flex gap-2 mt-2 text-xs flex-wrap">
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  {subject?.name || 'N/A'}
                                </span>
                                {chapter && (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                    {chapter.title}
                                  </span>
                                )}
                                {quiz.grade_level && (
                                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                    {quiz.grade_level}
                                  </span>
                                )}
                                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                  Diff: {quiz.difficulty}/5
                                </span>
                                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                  {quiz.points} pts
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingQuizId(quiz.id)}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (await customConfirm(`Supprimer "${quiz.title}" ?`)) {
                                    await supabase.from('activities').delete().eq('id', quiz.id);
                                    setMessage(`"${quiz.title}" supprimé`);
                                    await loadData();
                                  }
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activities.filter(a => a.type === 'quiz').length === 0 && (
                <div className="text-center py-12">
                  <Settings size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">Aucun quiz disponible</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'lessons' && (
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-2xl p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-800">Créer un Leçon</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Matière</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                >
                  <option value="">Sélectionner une matière</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Titre du Leçon</label>
                <input
                  type="text"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                  placeholder="Ex: Les additions"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={chapterForm.description}
                  onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                  rows={3}
                  placeholder="Description du leçon"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Niveau Scolaire</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {GRADE_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => setChapterForm({ ...chapterForm, gradeLevel: level })}
                      className={`py-2 px-2 rounded-lg border-2 font-semibold transition ${
                        chapterForm.gradeLevel === level
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateChapter}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition disabled:opacity-50"
              >
                <Plus size={20} />
                {loading ? 'Création...' : 'Créer le Leçon'}
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Leçons Existants ({filteredChapters.length})</h3>
                <button
                  onClick={handleRegenerateAllChapters}
                  disabled={loading || !selectedSubject}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  Régénérer Tout
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredChapters.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-xl">
                    <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600 font-medium">
                      {selectedSubject
                        ? "Aucun leçon trouvé pour cette matière"
                        : "Sélectionnez une matière pour voir ses leçons"}
                    </p>
                    {selectedSubject && (
                      <p className="text-sm text-gray-500 mt-1">
                        Utilisez le générateur IA ou créez un leçon manuellement
                      </p>
                    )}
                  </div>
                ) : (
                  filteredChapters.map((chapter) => {
                    const subject = subjects.find(s => s.id === chapter.subject_id);
                    return (
                      <div key={chapter.id} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800">{chapter.title}</h4>
                            <p className="text-sm text-gray-600">{subject?.name} - {chapter.grade_level}</p>
                            <p className="text-sm text-gray-500 mt-1">{chapter.description}</p>
                          </div>
                          <button
                          onClick={() => handleDeleteChapter(chapter.id)}
                          className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Supprimer ce leçon"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                }))}
              </div>
            </div>
          </div>
        )}

        {currentView === 'quiz' && (
          <div className="space-y-6">
            <div className="bg-green-50 rounded-2xl p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-800">Créer un Quiz</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Matière</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setSelectedChapter('');
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 focus:outline-none"
                >
                  <option value="">Sélectionner une matière</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>

              {selectedSubject && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Leçon</label>
                  <select
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 focus:outline-none"
                  >
                    <option value="">Sélectionner un leçon</option>
                    {filteredChapters.map(chapter => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.title} ({chapter.grade_level})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Titre du Quiz</label>
                <input
                  type="text"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 focus:outline-none"
                  placeholder="Ex: Quiz sur les additions"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulté (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={quizForm.difficulty}
                    onChange={(e) => setQuizForm({ ...quizForm, difficulty: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Points</label>
                  <input
                    type="number"
                    min="1"
                    value={quizForm.points}
                    onChange={(e) => setQuizForm({ ...quizForm, points: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-800">Questions</h4>
                  <button
                    onClick={addQuestion}
                    className="flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition text-sm"
                  >
                    <Plus size={16} />
                    Ajouter
                  </button>
                </div>

                {quizForm.questions.map((q, qIndex) => (
                  <div key={qIndex} className="border-2 border-gray-200 rounded-xl p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-gray-700">Q{qIndex + 1}</span>
                      {quizForm.questions.length > 1 && (
                        <button
                          onClick={() => removeQuestion(qIndex)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-green-400 focus:outline-none"
                      placeholder="Question"
                    />

                    <div className="space-y-2">
                      {q.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={q.correctAnswer === oIndex}
                            onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                            className="w-4 h-4"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-green-400 focus:outline-none text-sm"
                            placeholder={`Option ${oIndex + 1}`}
                          />
                        </div>
                      ))}
                    </div>

                    <textarea
                      value={q.explanation || ''}
                      onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-green-400 focus:outline-none text-sm"
                      rows={2}
                      placeholder="Explication (optionnel)"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleCreateQuiz}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition disabled:opacity-50"
              >
                <Save size={20} />
                {loading ? 'Enregistrement...' : 'Enregistrer le Quiz'}
              </button>
            </div>
          </div>
        )}

        {currentView === 'activities' && (
          <div className="space-y-6">
            <div className="bg-orange-50 rounded-2xl p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-800">Créer une Activité</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Matière</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setSelectedChapter('');
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none"
                >
                  <option value="">Sélectionner une matière</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>

              {selectedSubject && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Leçon</label>
                  <select
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none"
                  >
                    <option value="">Sélectionner un leçon</option>
                    {filteredChapters.map(chapter => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.title} ({chapter.grade_level})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Type d'activité</label>
                <select
                  value={activityForm.type}
                  onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none"
                >
                  <option value="lesson">Leçon</option>
                  <option value="exercise">Exercice</option>
                  <option value="video">Vidéo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Titre</label>
                <input
                  type="text"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none"
                  placeholder="Ex: Introduction aux additions"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contenu</label>
                <textarea
                  value={activityForm.content}
                  onChange={(e) => setActivityForm({ ...activityForm, content: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none"
                  rows={6}
                  placeholder="Contenu de l'activité..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulté (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={activityForm.difficulty}
                    onChange={(e) => setActivityForm({ ...activityForm, difficulty: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Points</label>
                  <input
                    type="number"
                    min="1"
                    value={activityForm.points}
                    onChange={(e) => setActivityForm({ ...activityForm, points: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateActivity}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition disabled:opacity-50"
              >
                <Plus size={20} />
                {loading ? 'Création...' : 'Créer l\'Activité'}
              </button>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Activités Existantes ({activities.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activities.map((activity) => {
                  const subject = subjects.find(s => s.id === activity.subject_id);
                  const chapter = chapters.find(c => c.id === activity.chapter_id);
                  return (
                    <div key={activity.id} className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-gray-800">{activity.title}</h4>
                          <p className="text-sm text-gray-600">{subject?.name} - {chapter?.title}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">
                              {activity.type}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                              {activity.points} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {currentView === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold text-gray-800">Utilisateurs ({users.length})</h3>
                {selectedUsers.length > 0 && (
                  <button
                    onClick={handleDeleteSelectedUsers}
                    className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition font-semibold"
                  >
                    <Trash2 size={20} />
                    Supprimer ({selectedUsers.length})
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition font-semibold"
              >
                <UserPlus size={20} />
                Ajouter un utilisateur
              </button>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={handleSelectAllUsers}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <span className="font-semibold text-gray-700">Sélectionner tout</span>
              </label>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map((user) => (
                <div key={user.id} className={`p-4 rounded-xl ${
                  !user.has_profile ? 'bg-yellow-50 border-2 border-yellow-300' :
                  user.banned ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleToggleUserSelection(user.id)}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{user.full_name || 'Sans nom'}</h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {!user.has_profile ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-yellow-500 text-white font-semibold">
                              PROFIL INCOMPLET
                            </span>
                          ) : (
                            <select
                              value={user.role}
                              onChange={(e) => handleChangeRole(user.id, e.target.value)}
                              className="text-xs px-2 py-1 rounded-full font-semibold border-2 border-gray-200 focus:outline-none focus:border-blue-400"
                            >
                              <option value="student">student</option>
                              <option value="parent">parent</option>
                              <option value="admin">admin</option>
                            </select>
                          )}
                          {user.email_confirmed ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Email confirmé
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              En attente
                            </span>
                          )}
                          {user.grade_level && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700 font-semibold">
                              {user.grade_level}
                            </span>
                          )}
                          {user.banned && (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-500 text-white font-semibold">
                              BANNI
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {user.has_profile && (
                        <button
                          onClick={() => handleToggleBan(user.id, user.banned || false)}
                          className={`p-2 rounded-lg transition ${
                            user.banned
                              ? 'bg-green-500 hover:bg-green-600 text-white'
                              : 'bg-orange-500 hover:bg-orange-600 text-white'
                          }`}
                          title={user.banned ? 'Débannir' : 'Bannir'}
                        >
                          <Ban size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => openSubscriptionModal(user)}
                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                        title="Gérer l'abonnement"
                      >
                        <CalendarCheck2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showAddUserModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Ajouter un utilisateur</h3>
                <button onClick={() => setShowAddUserModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nom complet</label>
                  <input
                    type="text"
                    value={newUserForm.full_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mot de passe</label>
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Rôle</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                  >
                    <option value="student">Étudiant</option>
                    <option value="parent">Parent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {newUserForm.role === 'student' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Niveau scolaire</label>
                    <select
                      value={newUserForm.grade_level}
                      onChange={(e) => setNewUserForm({ ...newUserForm, grade_level: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                    >
                      <option value="">Sélectionner un niveau</option>
                      {GRADE_LEVELS.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleAddUser}
                    disabled={loading}
                    className="flex-1 bg-blue-500 text-white font-bold py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                  >
                    {loading ? 'Création...' : 'Créer'}
                  </button>
                  <button
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 bg-gray-200 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-300 transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {subscriptionModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Gérer l'abonnement</h3>
                  <p className="text-sm text-gray-500">
                    {subscriptionModal.user?.full_name || 'Utilisateur'} · {subscriptionModal.user?.email}
                  </p>
                </div>
                <button onClick={closeSubscriptionModal} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              {subscriptionModal.loading ? (
                <div className="py-10 text-center text-gray-500">Chargement des informations...</div>
              ) : (
                <div className="space-y-5">
                  {subscriptionModal.error && (
                    <div className="p-3 rounded-xl bg-red-100 text-red-700 text-sm font-medium">
                      {subscriptionModal.error}
                    </div>
                  )}
                  {subscriptionModal.success && (
                    <div className="p-3 rounded-xl bg-green-100 text-green-700 text-sm font-medium">
                      {subscriptionModal.success}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Plan d'abonnement</label>
                    <select
                      value={subscriptionModal.planType}
                      onChange={(e) => setSubscriptionModal(prev => ({ ...prev, planType: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                    >
                      {ADMIN_PLAN_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date de fin d'activation</label>
                    <input
                      type="date"
                      value={subscriptionModal.activationEndDate}
                      onChange={(e) => setSubscriptionModal(prev => ({ ...prev, activationEndDate: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      L'abonnement sera marqué {subscriptionModal.activationEndDate ? 'comme actif jusqu\'à cette date incluse.' : 'comme actif immédiatement.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-700">Statut actuel :</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        subscriptionModal.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : subscriptionModal.status === 'expired'
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {subscriptionModal.status}
                    </span>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={closeSubscriptionModal}
                      className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                      disabled={subscriptionModal.saving}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveSubscription}
                      className="px-5 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition disabled:opacity-50"
                      disabled={subscriptionModal.saving}
                    >
                      {subscriptionModal.saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'ai-generator' && (
          <AIContentGenerator
            subjects={subjects}
            offlineMode={offlineMode}
            onContentGenerated={async (type, content) => {
              if (type === 'quiz') {
                try {
                  const { error } = await supabase.from('activities').insert({
                    subject_id: content.subject_id,
                    chapter_id: content.chapter_id,
                    title: content.title,
                    type: 'quiz',
                    difficulty: content.difficulty || 3,
                    points: content.points || 100,
                    grade_level: content.grade_level,
                    content: { questions: content.questions },
                  });

                  if (error) throw error;
                  setMessage('Quiz généré et sauvegardé avec succès !');
                  await loadData();
                } catch (err: any) {
                  setMessage('Erreur lors de la sauvegarde du quiz: ' + err.message);
                }
              } else if (type === 'chapter') {
                try {
                  const { error } = await supabase.from('chapters').insert({
                    subject_id: content.subject_id,
                    title: content.title,
                    description: content.description,
                    grade_level: content.grade_level,
                    order_index: content.order_index || 0,
                  });

                  if (error) throw error;
                  await loadData();
                } catch (err: any) {
                  setMessage('Erreur lors de la sauvegarde du leçon: ' + err.message);
                }
              } else if (type === 'activity') {
                setActivityForm({
                  title: content.title,
                  type: content.type,
                  difficulty: 1,
                  points: content.points || 10,
                  content: JSON.stringify(content.content),
                });
                setSelectedSubject(content.subject_id);
                setCurrentView('activities');
                setMessage('Activité générée ! Vous pouvez maintenant la modifier et la sauvegarder.');
              } else if (type === 'subject') {
                try {
                  setLoading(true);
                  const subjectsToInsert = content.subjects.map((subj: any) => ({
                    name: subj.name,
                    icon: subj.icon,
                    color: subj.color,
                    description: subj.description,
                    grade_levels: subj.grade_levels,
                  }));

                  const { error } = await supabase
                    .from('subjects')
                    .insert(subjectsToInsert);

                  if (error) throw error;

                  await loadData();
                  setMessage(`${subjectsToInsert.length} matière(s) ajoutée(s) avec succès !`);
                } catch (err: any) {
                  setMessage(`Erreur: ${err.message}`);
                } finally {
                  setLoading(false);
                }
              }
            }}
          />
        )}

        {currentView === 'bulk-generation' && (
          <BulkGeneration />
        )}

        {currentView === 'custom-statuses' && (
          <CustomStatusManager />
        )}

        {currentView === 'promotions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Gift className="text-purple-500" size={24} />
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Essais gratuits & promotions globales</h3>
                  <p className="text-sm text-gray-600">
                    Configurez la durée d&apos;essai par défaut et planifiez des périodes promotionnelles temporaires.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <CalendarCheck2 size={18} className="text-blue-500" />
                    Essai gratuit par défaut
                  </h4>
                  <p className="text-sm text-gray-600">
                    Nombre de jours offerts à chaque nouvelle inscription lorsque aucune promotion spéciale n&apos;est active.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      value={defaultTrialDays}
                      onChange={(e) => setDefaultTrialDays(Number(e.target.value))}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-600">jours</span>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <CalendarClock size={18} className="text-indigo-500" />
                      Promotion temporaire
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trialPromoForm.active}
                        onChange={(e) => setTrialPromoForm({ ...trialPromoForm, active: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Lorsqu&apos;elle est activée, tous les nouveaux abonnements suivent cette durée d&apos;essai.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Nom de la promotion</label>
                      <input
                        type="text"
                        value={trialPromoForm.name}
                        onChange={(e) => setTrialPromoForm({ ...trialPromoForm, name: e.target.value })}
                        placeholder="Ex: Lancement rentrée"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={!trialPromoForm.active}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                      <textarea
                        value={trialPromoForm.description}
                        onChange={(e) => setTrialPromoForm({ ...trialPromoForm, description: e.target.value })}
                        placeholder="Message promotionnel affiché aux familles"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={3}
                        disabled={!trialPromoForm.active}
                      ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Durée</label>
                        <input
                          type="number"
                          min={1}
                          value={trialPromoForm.days}
                          onChange={(e) => setTrialPromoForm({ ...trialPromoForm, days: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          disabled={!trialPromoForm.active}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Début</label>
                        <input
                          type="date"
                          value={trialPromoForm.startDate}
                          onChange={(e) => setTrialPromoForm({ ...trialPromoForm, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          disabled={!trialPromoForm.active}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Fin</label>
                        <input
                          type="date"
                          value={trialPromoForm.endDate}
                          onChange={(e) => setTrialPromoForm({ ...trialPromoForm, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          disabled={!trialPromoForm.active}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveTrialSettings}
                  disabled={loading}
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={18} />
                  Sauvegarder les paramètres
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Tag className="text-green-500" size={24} />
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Codes promo</h3>
                  <p className="text-sm text-gray-600">
                    Créez et gérez des codes offrant des mois gratuits supplémentaires.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 p-4 bg-gray-50 rounded-xl space-y-3">
                  <h4 className="font-semibold text-gray-800">Nouveau code</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Code</label>
                      <input
                        type="text"
                        value={promoForm.code}
                        onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
                        placeholder="EX: BIENVENUE"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                      <textarea
                        value={promoForm.description}
                        onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Message qui sera montré aux parents"
                      ></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Mois offerts</label>
                        <input
                          type="number"
                          min={0}
                          value={promoForm.freeMonths}
                          onChange={(e) => setPromoForm({ ...promoForm, freeMonths: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Utilisations max.</label>
                        <input
                          type="number"
                          min={1}
                          value={promoForm.maxUses}
                          onChange={(e) => setPromoForm({ ...promoForm, maxUses: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Illimité"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Début</label>
                        <input
                          type="date"
                          value={promoForm.validFrom}
                          onChange={(e) => setPromoForm({ ...promoForm, validFrom: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Fin</label>
                        <input
                          type="date"
                          value={promoForm.validUntil}
                          onChange={(e) => setPromoForm({ ...promoForm, validUntil: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={promoForm.active}
                        onChange={(e) => setPromoForm({ ...promoForm, active: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      Activer immédiatement
                    </label>
                    <button
                      onClick={handleCreatePromoCode}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Créer le code
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  {promoCodes.length === 0 ? (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500">
                      Aucun code promo pour le moment
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {promoCodes.map(code => {
                        const now = new Date();
                        const validUntil = code.valid_until ? new Date(code.valid_until) : null;
                        const expired = validUntil ? validUntil < now : false;

                        return (
                          <div key={code.code} className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg tracking-wide uppercase">{code.code}</span>
                                <span className={`px-2 py-1 text-xs rounded-full ${code.active && !expired ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {code.active && !expired ? 'Actif' : expired ? 'Expiré' : 'Inactif'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{code.description}</p>
                              <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                                <span>{code.free_months} mois offerts</span>
                                <span>
                                  Utilisations : {code.current_uses}
                                  {code.max_uses ? ` / ${code.max_uses}` : ' (illimité)'}
                                </span>
                                <span>
                                  Valide du {new Date(code.valid_from).toLocaleDateString('fr-FR')}
                                  {code.valid_until ? ` au ${new Date(code.valid_until).toLocaleDateString('fr-FR')}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdatePromoCode(code.code, { active: !code.active })}
                                disabled={loading}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${code.active ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                              >
                                {code.active ? 'Désactiver' : 'Activer'}
                              </button>
                              <button
                                onClick={() =>
                                  showConfirm(
                                    'Supprimer le code promo',
                                    `Voulez-vous vraiment supprimer le code ${code.code} ?`,
                                    () => handleDeletePromoCode(code.code),
                                    'danger'
                                  )
                                }
                                disabled={loading}
                                className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Paramètres Généraux</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-800">Mode Hors-ligne</h4>
                    <p className="text-sm text-gray-600">
                      Désactive la génération de contenu par IA. Utile pour travailler sans connexion ou économiser les appels API.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offlineMode}
                      onChange={(e) => setOfflineMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Configuration OpenAI</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    La clé API OpenAI est configurée automatiquement dans les variables d'environnement de Supabase.
                  </p>
                  <p className="text-sm text-gray-600">
                    Si vous rencontrez des erreurs, vérifiez que la variable <code className="bg-white px-1 rounded">OPENAI_API_KEY</code> est bien définie.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">État du Service IA</h4>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${offlineMode ? 'bg-gray-400' : 'bg-green-500'}`}></div>
                    <span className="text-sm text-gray-600">
                      {offlineMode ? 'Mode hors-ligne activé' : 'Service IA disponible'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Personnalisation</h3>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Logo de l'application</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Par défaut, un logo avec la lettre "P" est affiché. Vous pouvez uploader un logo personnalisé.
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      placeholder="URL du logo personnalisé"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      id="logoUrl"
                      defaultValue={appSettings?.logo_url || ''}
                    />
                    <button
                      onClick={async () => {
                        const url = (document.getElementById('logoUrl') as HTMLInputElement).value;
                        const settingsId = appSettings?.id ?? '00000000-0000-0000-0000-000000000001';

                        const { error } = await supabase
                          .from('app_settings')
                          .upsert({
                            id: settingsId,
                            logo_url: url || null,
                            updated_at: new Date().toISOString()
                          }, { onConflict: 'id' });

                        if (error) {
                          alert('Erreur lors de la mise à jour du logo');
                        } else {
                          alert('Logo mis à jour avec succès');
                          window.location.reload();
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                    >
                      <Save size={16} />
                      Enregistrer
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Laissez vide pour utiliser le logo par défaut. Format recommandé: PNG ou SVG, 40x40px minimum.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Nom de l'application</h4>
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      placeholder="Nom de l'application"
                      defaultValue={appSettings?.app_name || 'PioPi'}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      id="appName"
                    />
                    <button
                      onClick={async () => {
                        const name = (document.getElementById('appName') as HTMLInputElement).value;
                        const settingsId = appSettings?.id ?? '00000000-0000-0000-0000-000000000001';

                        const { error } = await supabase
                          .from('app_settings')
                          .upsert({
                            id: settingsId,
                            app_name: name,
                            updated_at: new Date().toISOString()
                          }, { onConflict: 'id' });

                        if (error) {
                          alert('Erreur lors de la mise à jour du nom');
                        } else {
                          alert('Nom mis à jour avec succès');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                    >
                      <Save size={16} />
                      Enregistrer
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Email de support</h4>
                  <div className="flex items-center gap-4">
                    <input
                      type="email"
                      placeholder="Email de support"
                      defaultValue={appSettings?.support_email || 'support@piopi.com'}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      id="supportEmail"
                    />
                    <button
                      onClick={async () => {
                        const email = (document.getElementById('supportEmail') as HTMLInputElement).value;
                        const settingsId = appSettings?.id ?? '00000000-0000-0000-0000-000000000001';

                        const { error } = await supabase
                          .from('app_settings')
                          .upsert({
                            id: settingsId,
                            support_email: email,
                            updated_at: new Date().toISOString()
                          }, { onConflict: 'id' });

                        if (error) {
                          alert('Erreur lors de la mise à jour de l\'email');
                        } else {
                          alert('Email mis à jour avec succès');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                    >
                      <Save size={16} />
                      Enregistrer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 space-y-4">
              <h3 className="text-xl font-bold text-red-800 mb-4">Zone Dangereuse</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
                  <div>
                    <h4 className="font-semibold text-red-800">Régénérer TOUT (Matières, Leçons, Quiz)</h4>
                    <p className="text-sm text-red-600">
                      Supprime TOUTES les matières, TOUS les leçons et TOUS les quiz de TOUS les niveaux pour permettre une régénération complète
                    </p>
                  </div>
                  <button
                    onClick={handleRegenerateAllSubjects}
                    disabled={loading}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-2 font-bold"
                  >
                    <Sparkles size={16} />
                    TOUT RÉGÉNÉRER
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
                  <div>
                    <h4 className="font-semibold text-red-800">Supprimer TOUTES les données</h4>
                    <p className="text-sm text-red-600">
                      Supprime définitivement toutes les matières, leçons et activités. Action irréversible !
                    </p>
                  </div>
                  <button
                    onClick={handleResetAll}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2 font-bold"
                  >
                    <Trash2 size={16} />
                    TOUT SUPPRIMER
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {isGenerating && (
        <GenerationProgress
          message={generationMessage}
          progress={generationProgress}
          onClose={handleCloseGeneration}
        />
      )}

      {selectedChapterView && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">
                    {chapters.find(c => c.id === selectedChapterView)?.title}
                  </h2>
                  <p className="text-purple-100 mt-1">
                    {chapters.find(c => c.id === selectedChapterView)?.description}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedChapterView(null);
                    setSelectedQuizzes([]);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X size={28} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Settings className="text-purple-500" />
                  Quiz ({activities.filter(a => a.chapter_id === selectedChapterView && a.type === 'quiz').length})
                </h3>
                <div className="flex items-center gap-3">
                  {activities.filter(a => a.chapter_id === selectedChapterView && a.type === 'quiz').length > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          activities.filter(a => a.chapter_id === selectedChapterView && a.type === 'quiz').length > 0 &&
                          activities.filter(a => a.chapter_id === selectedChapterView && a.type === 'quiz').every(q => selectedQuizzes.includes(q.id))
                        }
                        onChange={(e) => {
                          const chapterQuizzes = activities.filter(a => a.chapter_id === selectedChapterView && a.type === 'quiz');
                          if (e.target.checked) {
                            setSelectedQuizzes([...new Set([...selectedQuizzes, ...chapterQuizzes.map(q => q.id)])]);
                          } else {
                            setSelectedQuizzes(selectedQuizzes.filter(id => !chapterQuizzes.find(q => q.id === id)));
                          }
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-semibold text-gray-700">Tout sélectionner</span>
                    </label>
                  )}
                  {selectedQuizzes.length > 0 && (
                    <button
                      onClick={async () => {
                        if (await customConfirm(`Supprimer ${selectedQuizzes.length} quiz ?`)) {
                          setLoading(true);
                          await supabase.from('activities').delete().in('id', selectedQuizzes);
                          setSelectedQuizzes([]);
                          setMessage(`${selectedQuizzes.length} quiz supprimé(s)`);
                          await loadData();
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Supprimer ({selectedQuizzes.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {activities.filter(a => a.chapter_id === selectedChapterView && a.type === 'quiz').length === 0 ? (
                  <div className="text-center py-12">
                    <Settings className="mx-auto text-gray-300 mb-4" size={64} />
                    <p className="text-gray-500 text-lg">Aucun quiz disponible</p>
                  </div>
                ) : (
                  activities.filter(a => a.chapter_id === selectedChapterView && a.type === 'quiz').map((quiz, index) => {
                    const isSelected = selectedQuizzes.includes(quiz.id);
                    const questionCount = quiz.content?.questions?.length || 0;
                    return (
                      <div
                        key={quiz.id}
                        className={`rounded-xl p-5 border-2 transition ${
                          isSelected
                            ? 'bg-purple-100 border-purple-500'
                            : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuizzes([...selectedQuizzes, quiz.id]);
                              } else {
                                setSelectedQuizzes(selectedQuizzes.filter(id => id !== quiz.id));
                              }
                            }}
                            className="mt-1 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="flex items-center justify-center w-8 h-8 bg-purple-500 text-white font-bold rounded-full text-sm">
                                {index + 1}
                              </span>
                              <h4 className="text-lg font-bold text-gray-800">{quiz.title}</h4>
                            </div>
                            <div className="flex items-center gap-4 ml-11">
                              <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                                {questionCount} questions
                              </span>
                              <span className="text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-semibold">
                                Difficulté: {quiz.difficulty}/5
                              </span>
                              <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
                                {quiz.points} points
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSubjectView && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">
                    {subjects.find(s => s.id === selectedSubjectView)?.name}
                  </h2>
                  <p className="text-blue-100 mt-1">
                    {subjects.find(s => s.id === selectedSubjectView)?.description}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedSubjectView(null);
                    setSelectedChapters([]);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X size={28} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="text-green-500" />
                  Leçons ({chapters.filter(c => c.subject_id === selectedSubjectView).length})
                </h3>
                <div className="flex items-center gap-3">
                  {chapters.filter(c => c.subject_id === selectedSubjectView).length > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          chapters.filter(c => c.subject_id === selectedSubjectView).length > 0 &&
                          chapters.filter(c => c.subject_id === selectedSubjectView).every(c => selectedChapters.includes(c.id))
                        }
                        onChange={(e) => {
                          const subjectChapters = chapters.filter(c => c.subject_id === selectedSubjectView);
                          if (e.target.checked) {
                            setSelectedChapters([...new Set([...selectedChapters, ...subjectChapters.map(c => c.id)])]);
                          } else {
                            setSelectedChapters(selectedChapters.filter(id => !subjectChapters.find(c => c.id === id)));
                          }
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm font-semibold text-gray-700">Tout sélectionner</span>
                    </label>
                  )}
                  {selectedChapters.length > 0 && (
                    <button
                      onClick={async () => {
                        if (await customConfirm(`Supprimer ${selectedChapters.length} leçon(s) et leurs quiz ?`)) {
                          setLoading(true);
                          // Supprimer les quiz des leçons
                          await supabase.from('activities').delete().in('chapter_id', selectedChapters);
                          // Supprimer les leçons
                          await supabase.from('chapters').delete().in('id', selectedChapters);
                          setSelectedChapters([]);
                          setMessage(`${selectedChapters.length} leçon(s) supprimé(s)`);
                          await loadData();
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Supprimer ({selectedChapters.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {chapters.filter(c => c.subject_id === selectedSubjectView).length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto text-gray-300 mb-4" size={64} />
                    <p className="text-gray-500 text-lg">Aucun leçon disponible</p>
                  </div>
                ) : (
                  chapters.filter(c => c.subject_id === selectedSubjectView).map((chapter, index) => {
                    const chapterQuizzes = activities.filter(a => a.chapter_id === chapter.id && a.type === 'quiz');
                    const isSelected = selectedChapters.includes(chapter.id);
                    return (
                      <div
                        key={chapter.id}
                        className={`rounded-xl p-5 border-2 transition ${
                          isSelected
                            ? 'bg-green-100 border-green-500'
                            : 'bg-gradient-to-r from-green-50 to-teal-50 border-green-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedChapters([...selectedChapters, chapter.id]);
                              } else {
                                setSelectedChapters(selectedChapters.filter(id => id !== chapter.id));
                              }
                            }}
                            className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => setSelectedChapterView(chapter.id)}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <span className="flex items-center justify-center w-8 h-8 bg-green-500 text-white font-bold rounded-full text-sm">
                                {index + 1}
                              </span>
                              <h4 className="text-lg font-bold text-gray-800">{chapter.title}</h4>
                            </div>
                            <p className="text-gray-600 ml-11">{chapter.description}</p>
                            <div className="flex items-center gap-4 ml-11 mt-3">
                              <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-semibold">
                                {chapterQuizzes.length} quiz
                              </span>
                              <span className="text-xs text-gray-500">
                                Niveau: {chapter.grade_level}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />

      {editingQuizId && (
        <QuizEditor
          activityId={editingQuizId}
          onClose={() => setEditingQuizId(null)}
          onSave={async () => {
            setMessage('Quiz mis à jour avec succès');
            await loadData();
          }}
        />
      )}
    </div>
  );
}
