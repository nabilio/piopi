import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, BookOpen, Share2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { playSound } from '../lib/sounds';

type Story = {
  id: string;
  title: string;
  content: string;
  theme: string;
  grade_level: string;
};

type StoryReaderProps = {
  story: Story;
  onClose: () => void;
  onStartQuiz?: () => void;
};

export function StoryReader({ story, onClose, onStartQuiz }: StoryReaderProps) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const paragraphs = story.content.split('\n\n').filter(p => p.trim());
    const wordsPerPage = 50;
    const newPages: string[] = [];
    let currentPageContent = '';
    let wordCount = 0;

    paragraphs.forEach(paragraph => {
      const words = paragraph.split(' ');
      if (wordCount + words.length > wordsPerPage && currentPageContent) {
        newPages.push(currentPageContent.trim());
        currentPageContent = paragraph + '\n\n';
        wordCount = words.length;
      } else {
        currentPageContent += paragraph + '\n\n';
        wordCount += words.length;
      }
    });

    if (currentPageContent.trim()) {
      newPages.push(currentPageContent.trim());
    }

    setPages(newPages);
  }, [story.content]);

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const isLastPage = currentPage === pages.length - 1;

  const handleShare = async () => {
    if (!profile?.id || sharing || shared) return;

    setSharing(true);
    try {
      const { error } = await supabase
        .from('activity_feed')
        .insert({
          user_id: profile.id,
          activity_type: 'story_created',
          content: {
            story_id: story.id,
            theme: story.theme,
            story_title: story.title,
            grade_level: story.grade_level
          },
          points_earned: 0
        });

      if (error) {
        console.error('Error sharing story:', error);
        showToast('Erreur lors du partage', 'error');
      } else {
        console.log('Story shared successfully, showing toast');
        setShared(true);
        showToast('Histoire partagée dans le fil d\'actualité!', 'success');
        playSound('achievement');
      }
    } catch (error) {
      console.error('Error sharing story:', error);
      showToast('Erreur lors du partage', 'error');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 z-50 overflow-hidden">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all"
      >
        <X size={24} className="text-gray-700" />
      </button>

      <div className="h-full flex items-center justify-center p-4 md:p-8">
        <div className="max-w-4xl w-full h-full flex flex-col">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg mb-4">
              <BookOpen size={24} className="text-amber-600" />
              <h1 className="text-2xl md:text-3xl font-black text-gray-800">
                {story.title}
              </h1>
            </div>

            {isLastPage && (
              <div className="flex justify-center items-center gap-4 animate-fadeIn">
                <button
                  onClick={handleShare}
                  disabled={sharing || shared}
                  className={`relative flex items-center gap-2 font-bold text-lg px-6 py-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all disabled:cursor-not-allowed ${
                    shared
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'
                  }`}
                >
                  <Share2 size={24} />
                  {sharing ? 'Partage...' : shared ? 'Partagé ✓' : 'Partager'}
                </button>
                {onStartQuiz && (
                  <button
                    onClick={onStartQuiz}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg px-6 py-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
                  >
                    Commencer le quiz 🎯
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold text-lg px-6 py-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
                >
                  <ArrowLeft size={24} />
                  Retour
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center gap-4">
            <button
              onClick={prevPage}
              disabled={currentPage === 0}
              className="p-4 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={32} className="text-gray-700" />
            </button>

            <div className="flex-1 max-w-2xl aspect-square flex items-center">
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 w-full h-full flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400" />

                <div className="flex-1 flex items-center justify-center">
                  <div className="text-gray-900 leading-relaxed whitespace-pre-wrap font-bold text-2xl md:text-3xl text-center">
                    {pages[currentPage]}
                  </div>
                </div>

                <div className="absolute bottom-6 right-8 text-sm font-semibold text-gray-400">
                  Page {currentPage + 1} / {pages.length}
                </div>
              </div>
            </div>

            <button
              onClick={nextPage}
              disabled={isLastPage}
              className="p-4 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={32} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
