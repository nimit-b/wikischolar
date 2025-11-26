
import React, { useState, useEffect } from 'react';
import { AppState, DashboardTab, StudyMaterial, AIConfig, Theme, ExamConfig } from './types';
import { getTopicDetails } from './services/wikiService';
import { generateWithAI, DEFAULT_AI_CONFIG } from './services/aiService';
import { generateKeyPoints, generateFlashcards, generateQuiz, generateTimeline } from './utils/generator';
import SearchBar from './components/SearchBar';
import ContentSection from './components/ContentSection';
import Flashcards from './components/Flashcards';
import Quiz from './components/Quiz';
import SettingsModal from './components/SettingsModal';
import AIControls from './components/AIControls';
import ExamMode from './components/ExamMode';
import NotesLibrary from './components/NotesLibrary';
import { BookOpen, GraduationCap, BrainCircuit, Sparkles, ArrowLeft, History, Clock, Settings as SettingsIcon, Bot, Book } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.GUIDE);
  const [studyMaterial, setStudyMaterial] = useState<StudyMaterial | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Removed isNotesLibraryOpen boolean logic in favor of AppState
  
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>();
  const [aiExplanation, setAiExplanation] = useState<string>();

  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = localStorage.getItem('wikiScholarAiConfig');
    if (saved) {
      try {
        setAiConfig(JSON.parse(saved));
      } catch (e) { console.error('Failed to load settings'); }
    }

    const savedTheme = localStorage.getItem('wikiScholarTheme') as Theme;
    if (savedTheme) {
        setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
      document.body.className = `theme-${theme} antialiased transition-colors duration-300`;
  }, [theme]);

  const handleSaveSettings = (config: AIConfig, newTheme: Theme) => {
    setAiConfig(config);
    localStorage.setItem('wikiScholarAiConfig', JSON.stringify(config));
    setTheme(newTheme);
    localStorage.setItem('wikiScholarTheme', newTheme);
  };

  const loadNotesForTopic = (title: string): string => {
      return localStorage.getItem(`wiki_notes_${title}`) || '';
  };

  const saveNotesForTopic = (title: string, notes: string) => {
      localStorage.setItem(`wiki_notes_${title}`, notes);
      if (studyMaterial) {
          setStudyMaterial({...studyMaterial, userNotes: notes});
      }
  };

  const handleSearch = async (term: string) => {
    setIsLoading(true);
    setAppState(AppState.LOADING);
    setCurrentSearchTerm(term);
    
    try {
      const result = await getTopicDetails(term);
      
      if (!result) {
        setAppState(AppState.ERROR);
        setIsLoading(false);
        return;
      }

      const { topic, related } = result;
      const savedNotes = loadNotesForTopic(topic.title);

      const parser = new DOMParser();
      const fullText = topic.sections.map(s => {
          const doc = parser.parseFromString(s.contentHtml, 'text/html');
          return doc.body.textContent || '';
      }).join(' ');

      const keyPoints = generateKeyPoints(fullText);
      const flashcards = generateFlashcards(fullText);
      const quiz = generateQuiz(fullText);
      const timeline = generateTimeline(fullText);

      setStudyMaterial({
        topic,
        keyPoints,
        flashcards,
        quiz,
        timeline,
        relatedTopics: related,
        userNotes: savedNotes
      });
      
      setAppState(AppState.DASHBOARD);
      setActiveTab(DashboardTab.GUIDE);
      setAiExplanation(undefined);
      setAiError(undefined);

    } catch (e) {
      console.error(e);
      setAppState(AppState.ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiFallback = async (term?: string) => {
      const query = term || currentSearchTerm;
      if (!query) return;

      if (!aiConfig.apiKey) {
          setIsSettingsOpen(true);
          return;
      }
      
      setIsLoading(true);
      setAiError(undefined);
      setAppState(AppState.LOADING);
      
      try {
          const aiData = await generateWithAI(aiConfig, 'study_guide', query);
          if (!aiData || !aiData.title) throw new Error("Invalid AI response");

          const aiSections = (aiData.sections || []).map((s: any, idx: number) => ({
              id: `ai-sec-${idx}`,
              title: s.title,
              level: 2,
              contentHtml: s.content
          }));
          
          if (aiData.overview) {
              aiSections.unshift({
                  id: 'overview',
                  title: 'Overview',
                  level: 1,
                  contentHtml: `<p>${aiData.overview}</p>`
              });
          }

          const aiFlashcards = (aiData.flashcards || []).map((fc: any, i: number) => ({
              id: `ai-fc-${i}`,
              front: fc.front,
              back: fc.back,
              tag: 'AI Generated'
          }));

          const aiQuiz = (aiData.quiz || []).map((q: any, i: number) => ({
              id: `ai-q-${i}`,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation
          }));

          // Load existing notes if any for this AI generated topic
          const savedNotes = loadNotesForTopic(aiData.title || query);

          setStudyMaterial({
              topic: {
                  title: aiData.title || query,
                  sections: aiSections,
                  url: '',
                  thumbnail: undefined
              },
              keyPoints: aiData.keyPoints || [],
              flashcards: aiFlashcards,
              quiz: aiQuiz,
              timeline: [],
              relatedTopics: [],
              examTips: aiData.examTips,
              commonMistakes: aiData.commonMistakes,
              mnemonics: aiData.mnemonics,
              userNotes: savedNotes
          });

          setAppState(AppState.DASHBOARD);
          setActiveTab(DashboardTab.GUIDE);

      } catch (e: any) {
          console.error("AI Fallback failed:", e);
          setAiError(e.message);
          // Show alert for quota or auth errors
          if (e.message.includes("quota") || e.message.includes("429")) {
            alert("API Limit Exceeded: " + e.message);
          } else if (e.message.includes("Auth")) {
            alert(e.message);
            setIsSettingsOpen(true);
          } else {
             alert(`AI Generation Failed: ${e.message}`);
          }
          setAppState(AppState.ERROR);
      } finally {
          setIsLoading(false);
      }
  };

  const handleAIGenerate = async (type: 'flashcards' | 'quiz' | 'simplify' | 'custom' | 'real_world' | 'diagram', customPrompt?: string) => {
    if (!studyMaterial) return;
    setIsAiLoading(true);
    setAiError(undefined);

    try {
        const parser = new DOMParser();
        let contextText = '';
        for (const section of studyMaterial.topic.sections) {
            const doc = parser.parseFromString(section.contentHtml, 'text/html');
            contextText += (doc.body.textContent || '') + '\n';
            if (contextText.length > 4500) break;
        }

        const result = await generateWithAI(aiConfig, type, contextText, customPrompt);

        if (['simplify', 'custom', 'real_world', 'diagram'].includes(type)) {
            setAiExplanation(result);
        } else if (type === 'flashcards') {
            const newCards = result.map((c: any, i: number) => ({
                id: `ai-${Date.now()}-${i}`,
                front: c.front,
                back: c.back,
                tag: 'AI Generated'
            }));
            setStudyMaterial(prev => prev ? { ...prev, flashcards: [...newCards, ...prev.flashcards] } : null);
            setActiveTab(DashboardTab.FLASHCARDS);
        } else if (type === 'quiz') {
            const newQuestions = result.map((q: any, i: number) => ({
                id: `ai-q-${Date.now()}-${i}`,
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation
            }));
            setStudyMaterial(prev => prev ? { ...prev, quiz: [...prev.quiz, ...newQuestions] } : null);
        }
    } catch (e: any) {
        setAiError(e.message || "Something went wrong with the AI");
        if (e.message.includes("quota") || e.message.includes("429")) {
             alert(e.message);
        }
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleGenerateExam = async (config: ExamConfig) => {
      if (!studyMaterial || !aiConfig.apiKey) return [];
      
      const parser = new DOMParser();
      let contextText = '';
      for (const section of studyMaterial.topic.sections) {
          contextText += (parser.parseFromString(section.contentHtml, 'text/html').body.textContent || '') + '\n';
          if (contextText.length > 4500) break;
      }

      const result = await generateWithAI(aiConfig, 'exam_gen', contextText, config);
      
      if (Array.isArray(result)) {
          return result.map((q: any, i: number) => ({
              id: `ai-exam-${i}`,
              type: q.type || config.type,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              modelAnswer: q.modelAnswer,
              explanation: q.explanation,
              marks: q.marks
          }));
      }
      return [];
  };

  const handleContentAiAction = async (type: 'expand' | 'diagram' | 'simplify', context: string) => {
      return await generateWithAI(aiConfig, type, context);
  };

  // Render Logic
  if (appState === AppState.NOTES_LIBRARY) {
      return (
          <NotesLibrary 
            onClose={() => setAppState(studyMaterial ? AppState.DASHBOARD : AppState.HOME)} 
            onLoadNote={(title, content) => {
                // If we have material loaded and it matches, just go to dashboard
                if (studyMaterial && studyMaterial.topic.title === title) {
                    setAppState(AppState.DASHBOARD);
                } else {
                    // Otherwise search for it (which will load it)
                    handleSearch(title);
                }
            }} 
          />
      );
  }

  if (appState === AppState.EXAM_MODE && studyMaterial) {
      return (
          <ExamMode 
            questions={studyMaterial.quiz} 
            onExit={() => setAppState(AppState.DASHBOARD)} 
            hasAiKey={!!aiConfig.apiKey}
            onGenerateExam={handleGenerateExam}
          />
      );
  }

  const renderDashboard = () => {
    if (!studyMaterial) return null;

    return (
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="mb-8 pt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
               <button onClick={() => setAppState(AppState.HOME)} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-4 transition-colors"><ArrowLeft size={16} /> Back to Search</button>
               <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-2">{studyMaterial.topic.title}</h1>
               <p className="text-slate-500">{studyMaterial.flashcards.length} cards • {studyMaterial.quiz.length} questions {aiConfig.apiKey && <span className="ml-2 text-brand-600 font-medium">• AI Enhanced</span>}</p>
           </div>
           
           <div className="flex gap-2">
              <button onClick={() => setAppState(AppState.EXAM_MODE)} className="flex items-center gap-2 px-4 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors shadow-lg" title="Enter Exam Mode"><Clock size={18} /><span className="hidden sm:inline">Exam Mode</span></button>
              <button onClick={() => setAppState(AppState.NOTES_LIBRARY)} className="flex items-center gap-2 px-4 py-3 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-xl hover:bg-yellow-200 transition-colors shadow-sm"><Book size={18} /><span className="hidden sm:inline">My Notes</span></button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-colors shadow-sm" title="Settings"><SettingsIcon size={20} /></button>
           </div>
        </div>

        <div className="flex overflow-x-auto pb-2 mb-6 gap-2 no-scrollbar">
          <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 min-w-max">
            {[
                {id: DashboardTab.GUIDE, icon: BookOpen, label: 'Guide'},
                {id: DashboardTab.AI_ASSISTANT, icon: Bot, label: 'AI Assistant'},
                ...(studyMaterial.timeline.length ? [{id: DashboardTab.TIMELINE, icon: History, label: 'Timeline'}] : []),
                {id: DashboardTab.FLASHCARDS, icon: BrainCircuit, label: 'Flashcards'},
                {id: DashboardTab.QUIZ, icon: GraduationCap, label: 'Quiz'}
            ].map(tab => (
                 <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as DashboardTab)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <tab.icon size={18} /> {tab.label}
                </button>
            ))}
          </div>
        </div>

        <div className="min-h-[500px]">
          {activeTab === DashboardTab.GUIDE && (
            <ContentSection 
              topic={studyMaterial.topic} 
              keyPoints={studyMaterial.keyPoints} 
              relatedTopics={studyMaterial.relatedTopics}
              examTips={studyMaterial.examTips}
              mnemonics={studyMaterial.mnemonics}
              commonMistakes={studyMaterial.commonMistakes}
              userNotes={studyMaterial.userNotes}
              onRelatedClick={handleSearch}
              onSaveNotes={(n) => saveNotesForTopic(studyMaterial.topic.title, n)}
              onAiAction={aiConfig.apiKey ? handleContentAiAction : undefined}
              hasAiKey={!!aiConfig.apiKey}
            />
          )}

          {activeTab === DashboardTab.AI_ASSISTANT && (
            <AIControls 
              hasKey={!!aiConfig.apiKey}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onGenerate={handleAIGenerate}
              isLoading={isAiLoading}
              error={aiError}
              simpleExplanation={aiExplanation}
            />
          )}
          
          {activeTab === DashboardTab.TIMELINE && (
             <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-2xl font-serif font-bold text-slate-800 mb-6 flex items-center gap-2"><Clock className="text-brand-500" /> Key Events Timeline</h2>
                    <div className="relative border-l-2 border-brand-100 ml-3 space-y-8 pl-8 py-2">
                        {studyMaterial.timeline.map((event, idx) => (
                            <div key={idx} className="relative">
                                <span className="absolute -left-[41px] top-1 h-5 w-5 rounded-full border-4 border-white bg-brand-500 shadow-sm" />
                                <span className="inline-block px-2 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded mb-1">{event.year}</span>
                                <p className="text-slate-600 leading-relaxed">{event.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          )}

          {activeTab === DashboardTab.FLASHCARDS && <Flashcards cards={studyMaterial.flashcards} />}
          {activeTab === DashboardTab.QUIZ && (
            <Quiz 
                questions={studyMaterial.quiz} 
                onGenerateMore={aiConfig.apiKey ? () => handleAIGenerate('quiz') : undefined}
                isGenerating={isAiLoading}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] transition-colors duration-300">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-100/50 to-transparent -z-10" />
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onSave={handleSaveSettings} currentConfig={aiConfig} currentTheme={theme} />

      {appState === AppState.HOME && (
         <div className="absolute top-6 right-6 z-20 flex gap-2">
            <button onClick={() => setAppState(AppState.NOTES_LIBRARY)} className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full text-slate-600 hover:text-brand-600 shadow-sm transition-all text-sm font-medium"><Book size={16} /> My Notes</button>
            <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full text-slate-600 hover:text-brand-600 shadow-sm transition-all text-sm font-medium"><SettingsIcon size={16} /> Settings</button>
         </div>
      )}
      
      {appState === AppState.HOME && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="text-center space-y-6 max-w-2xl relative z-10 mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm mb-4">
                    <Sparkles size={14} className="text-amber-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{aiConfig.apiKey ? 'AI Enhanced Learning Enabled' : 'AI-Ready Study Companion'}</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-serif font-bold text-slate-900 tracking-tight">Wiki<span className="text-brand-600">Scholar</span></h1>
                <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-lg mx-auto">Turn any topic into a personalized textbook with structured chapters, exams, and flashcards.</p>
            </div>
            <SearchBar onSearch={handleSearch} onAiSearch={(term) => handleAiFallback(term)} isLoading={isLoading} hasAiKey={!!aiConfig.apiKey} />
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-slate-400 text-sm">
                <div className="flex flex-col items-center gap-2"><BookOpen size={24} className="text-slate-300"/><span>Structured Guide</span></div>
                <div className="flex flex-col items-center gap-2"><Bot size={24} className="text-slate-300"/><span>AI Tutor</span></div>
                <div className="flex flex-col items-center gap-2"><BrainCircuit size={24} className="text-slate-300"/><span>Smart Flashcards</span></div>
                 <div className="flex flex-col items-center gap-2"><GraduationCap size={24} className="text-slate-300"/><span>Persona-based Exams</span></div>
            </div>
        </div>
      )}
      {appState === AppState.LOADING && (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-medium text-slate-700">Structuring Knowledge...</h2>
            <p className="text-slate-400 mt-2">Parsing content and generating study materials</p>
        </div>
      )}
      {appState === AppState.DASHBOARD && renderDashboard()}
      {appState === AppState.ERROR && (
         <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6"><Sparkles size={32} /></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Topic Not Found</h2>
            <p className="text-slate-500 mb-8 max-w-md">We couldn't find a Wikipedia article matching "{currentSearchTerm}".</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => setAppState(AppState.HOME)} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium shadow-sm">Try Another Search</button>
                <button onClick={() => handleAiFallback()} className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium shadow-lg shadow-brand-200 justify-center"><Bot size={20} /> Search with AI</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
