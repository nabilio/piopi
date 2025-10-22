import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function TestQuizQuery() {
  const [results, setResults] = useState<string>('');

  useEffect(() => {
    async function runTests() {
      let output = '';

      output += '=== Test 1: Get all subjects ===\n';
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, grade_levels')
        .order('name');

      if (subjectsError) {
        output += `Error: ${JSON.stringify(subjectsError)}\n`;
      } else {
        output += `Subjects: ${JSON.stringify(subjects, null, 2)}\n`;
      }

      output += '\n=== Test 2: Count all quiz activities ===\n';
      const { count: quizCount, error: countError } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'quiz');

      if (countError) {
        output += `Error: ${JSON.stringify(countError)}\n`;
      } else {
        output += `Total quiz count: ${quizCount}\n`;
      }

      output += '\n=== Test 3: Get sample quiz activities ===\n';
      const { data: quizzes, error: quizzesError } = await supabase
        .from('activities')
        .select('id, title, type, subject_id, grade_level, difficulty')
        .eq('type', 'quiz')
        .limit(10);

      if (quizzesError) {
        output += `Error: ${JSON.stringify(quizzesError)}\n`;
      } else {
        output += `Sample quizzes: ${JSON.stringify(quizzes, null, 2)}\n`;
      }

      if (subjects && subjects.length > 0) {
        const firstSubject = subjects[0];
        output += `\n=== Test 4: Get quizzes for "${firstSubject.name}" (${firstSubject.id}) ===\n`;

        const { data: subjectQuizzes, error: subjectQuizzesError } = await supabase
          .from('activities')
          .select('id, title, grade_level, difficulty')
          .eq('subject_id', firstSubject.id)
          .eq('type', 'quiz');

        if (subjectQuizzesError) {
          output += `Error: ${JSON.stringify(subjectQuizzesError)}\n`;
        } else {
          output += `Found ${subjectQuizzes?.length || 0} quizzes for ${firstSubject.name}\n`;
          output += `Quizzes: ${JSON.stringify(subjectQuizzes, null, 2)}\n`;
        }

        if (firstSubject.grade_levels && firstSubject.grade_levels.length > 0) {
          const gradeLevel = firstSubject.grade_levels[0];
          output += `\n=== Test 5: Get quizzes for "${firstSubject.name}" at grade "${gradeLevel}" ===\n`;

          const { data: gradeQuizzes, error: gradeQuizzesError } = await supabase
            .from('activities')
            .select('id, title, difficulty')
            .eq('subject_id', firstSubject.id)
            .eq('grade_level', gradeLevel)
            .eq('type', 'quiz');

          if (gradeQuizzesError) {
            output += `Error: ${JSON.stringify(gradeQuizzesError)}\n`;
          } else {
            output += `Found ${gradeQuizzes?.length || 0} quizzes\n`;
            output += `Quizzes: ${JSON.stringify(gradeQuizzes, null, 2)}\n`;
          }
        }
      }

      setResults(output);
    }

    runTests();
  }, []);

  return (
    <div className="fixed inset-0 bg-white p-8 overflow-auto z-50">
      <h1 className="text-2xl font-bold mb-4">Test Quiz Query Results</h1>
      <pre className="bg-gray-100 p-4 rounded text-xs whitespace-pre-wrap">
        {results || 'Loading...'}
      </pre>
    </div>
  );
}
