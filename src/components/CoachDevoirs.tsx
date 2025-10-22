import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Lightbulb, X, Image as ImageIcon, Bot, Sparkles, Star } from 'lucide-react';
import { supabase, CoachConversation } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type CoachDevoirsProps = {
  onBack: () => void;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export function CoachDevoirs({ onBack }: CoachDevoirsProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Salut ! 👋 Je suis ton Coach Devoirs. Je suis là pour t'aider à comprendre tes exercices, pas pour te donner les réponses ! Pose-moi ta question ou décris ton exercice, et je te guiderai étape par étape. 🌟",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadOrCreateConversation();
  }, [user]);

  async function loadOrCreateConversation() {
    if (!user) return;

    const { data, error } = await supabase
      .from('coach_conversations')
      .select('*')
      .eq('child_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading conversation:', error);
      return;
    }

    if (data) {
      setConversationId(data.id);
      if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages);
      }
    } else {
      const { data: newConv, error: createError } = await supabase
        .from('coach_conversations')
        .insert({
          child_id: user.id,
          messages: messages,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
      } else {
        setConversationId(newConv.id);
      }
    }
  }

  async function handleSend() {
    if (!input.trim() || !user || !conversationId) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const userInput = input.trim();
    setInput('');
    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-ai`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la communication avec le coach');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);

      await supabase
        .from('coach_conversations')
        .update({
          messages: finalMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "Oups ! J'ai un petit problème technique. Peux-tu réessayer ? Si ça persiste, redemande-moi ta question ! 😊",
        timestamp: new Date().toISOString(),
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-teal-400 to-cyan-400 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-300 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 text-4xl animate-bounce delay-100">💡</div>
        <div className="absolute top-40 right-1/3 text-3xl animate-bounce delay-500">✨</div>
        <div className="absolute bottom-32 left-1/3 text-3xl animate-bounce delay-300">📝</div>
        <div className="absolute bottom-20 right-1/4 text-4xl animate-bounce delay-700">🎯</div>
      </div>

      <div className="relative z-10">
        <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-2xl">
          <div className="container mx-auto px-4 py-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white/90 hover:text-white transition mb-4"
            >
              <ArrowLeft size={24} />
              <span className="font-semibold">Retour</span>
            </button>
            <div className="flex items-center gap-6">
              <div className="relative animate-float">
                <div className="w-32 h-32 bg-gradient-to-br from-white to-green-50 rounded-3xl flex items-center justify-center shadow-2xl border-4 border-white/50 transform hover:scale-110 transition">
                  <div className="relative">
                    <div className="text-7xl">🤖</div>
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-4 h-4 border-2 border-white animate-pulse"></div>
                  </div>
                </div>
                <div className="absolute -top-3 -right-3 bg-yellow-400 rounded-full p-2.5 animate-bounce shadow-lg">
                  <Sparkles size={24} className="text-yellow-900" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-black">Coach Devoirs</h1>
                  <div className="flex gap-1">
                    <Star size={20} className="text-yellow-300 fill-yellow-300 animate-pulse" />
                    <Star size={20} className="text-yellow-300 fill-yellow-300 animate-pulse delay-100" />
                    <Star size={20} className="text-yellow-300 fill-yellow-300 animate-pulse delay-200" />
                  </div>
                </div>
                <p className="text-lg text-white/95 font-semibold">
                  Ton assistant intelligent qui t'aide à apprendre !
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold">
                    🧠 Pédagogique
                  </span>
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold">
                    🎯 Patient
                  </span>
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold">
                    ⚡ Disponible 24/7
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 py-6 flex flex-col max-w-4xl relative z-10">
        <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 mb-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-400 rounded-full flex items-center justify-center mr-3 flex-shrink-0 shadow-lg">
                    <Bot size={20} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] p-4 rounded-2xl shadow-lg ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'bg-gradient-to-br from-green-50 to-teal-50 text-gray-800 border-2 border-green-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center ml-3 flex-shrink-0 shadow-lg text-white font-bold text-lg">
                    👤
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-400 rounded-full flex items-center justify-center mr-3 flex-shrink-0 shadow-lg">
                  <Bot size={20} className="text-white" />
                </div>
                <div className="bg-gradient-to-br from-green-50 to-teal-50 p-4 rounded-2xl border-2 border-green-200 shadow-lg">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" />
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce delay-100" />
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-5">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pose ta question ou décris ton exercice..."
              className="flex-1 px-5 py-4 rounded-2xl border-2 border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-200 focus:outline-none text-lg"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-green-400 to-teal-400 text-white px-6 py-4 rounded-2xl hover:from-green-500 hover:to-teal-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
            >
              <Send size={24} />
              <span className="hidden sm:inline font-bold">Envoyer</span>
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-3 border border-green-200">
            <Lightbulb size={18} className="text-green-600" />
            <p className="text-sm text-green-700 font-semibold">
              Le coach te donne des indices, pas les réponses !
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}