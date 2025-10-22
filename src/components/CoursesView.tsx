import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Subject, supabase } from '../lib/supabase';
import { SubjectCard } from './SubjectCard';
import { useAuth } from '../contexts/AuthContext';

type CoursesViewProps = {
  onBack: () => void;
  onSubjectSelect: (subject: Subject) => void;
};

export function CoursesView({ onBack, onSubjectSelect }: CoursesViewProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    loadSubjects();
  }, [profile?.grade_level]);

  async function loadSubjects() {
    if (!profile?.grade_level) return;

    const { data: chaptersData } = await supabase
      .from('chapters')
      .select('subject_id')
      .eq('grade_level', profile.grade_level);

    if (!chaptersData) return;

    const subjectIds = [...new Set(chaptersData.map(c => c.subject_id))];

    if (subjectIds.length === 0) {
      setSubjects([]);
      return;
    }

    const { data } = await supabase
      .from('subjects')
      .select('*')
      .in('id', subjectIds)
      .order('name');

    if (data) {
      setSubjects(data);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 py-12">
      <div className="container mx-auto px-4">
        <button
          onClick={onBack}
          className="mb-6 bg-white px-6 py-3 rounded-full shadow-md hover:bg-gray-50 transition font-semibold text-gray-700 flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Retour
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mb-4">
            <BookOpen size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Toutes les Matières
          </h1>
          <p className="text-xl text-gray-600">
            Choisis une matière pour commencer à apprendre
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onClick={() => onSubjectSelect(subject)}
              isAdmin={profile?.role === 'admin'}
            />
          ))}
        </div>

        {subjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Aucune matière disponible pour le moment</p>
          </div>
        )}
      </div>
    </div>
  );
}
