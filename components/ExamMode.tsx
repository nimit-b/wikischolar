
import React, { useState, useEffect } from 'react';
import { QuizQuestion, ExamConfig, GradingResult, AIConfig } from '../types';
import { Clock, CheckCircle, XCircle, Award, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { generateWithAI, DEFAULT_AI_CONFIG } from '../services/aiService';

interface ExamModeProps {
  questions: QuizQuestion[];
  onExit: () => void;
  onGenerateExam?: (config: ExamConfig) => Promise<QuizQuestion[]>;
  hasAiKey?: boolean;
}

const ExamMode: React.FC<ExamModeProps> = ({ questions: initialQuestions, onExit, onGenerateExam, hasAiKey }) => {
  const [stage, setStage] = useState<'setup' | 'active' | 'results'>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
  
  // Setup State
  const [config, setConfig] = useState<ExamConfig>({
      questionCount: 5,
      type: 'mcq',
      difficulty: 'medium'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Active Exam State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  
  // Grading State
  const [gradingResults, setGradingResults] = useState<Record<string, GradingResult>>({});
  const [isGrading, setIsGrading] = useState<Record<string, boolean>>({});
  
  // For non-AI fallback
  const [shortAnswerReveal, setShortAnswerReveal] = useState<Record<string, boolean>>({}); 
  const [selfGrades, setSelfGrades] = useState<Record<string, boolean>>({});
  
  const [timeLeft, setTimeLeft] = useState(300); // Default 5 mins
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [maxTotalScore, setMaxTotalScore] = useState(0);

  // Load AI config from storage to use for grading
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  useEffect(() => {
    const saved = localStorage.getItem('wikiScholarAiConfig');
    if (saved) setAiConfig(JSON.parse(saved));
  }, []);

  const startExam = async () => {
      setIsGenerating(true);
      try {
          let examQuestions = initialQuestions;
          
          if (hasAiKey && onGenerateExam) {
              try {
                  const newQs = await onGenerateExam(config);
                  if (newQs && newQs.length > 0) {
                      examQuestions = newQs;
                  }
              } catch (e) {
                  console.error("Failed to generate exam, using default pool", e);
                  alert("Could not generate AI exam. Using available revision questions instead.");
              }
          } else {
               examQuestions = initialQuestions.slice(0, config.questionCount);
          }
          
          setQuestions(examQuestions);
          // 2 mins for short answer, 1 min for MCQ
          const duration = examQuestions.reduce((acc, q) => acc + (q.type === 'short_answer' ? 120 : 60), 0);
          setTimeLeft(duration); 
          setStage('active');
      } finally {
          setIsGenerating(false);
      }
  };

  // Timer
  useEffect(() => {
    if (stage !== 'active' || isSubmitted || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((p) => p <= 0 ? 0 : p - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted, stage]);

  const handleGradeWithAI = async (question: QuizQuestion) => {
      if (!answers[question.id] || answers[question.id].trim().length < 2) {
          alert("Please type an answer before grading.");
          return;
      }
      
      setIsGrading({...isGrading, [question.id]: true});
      try {
          const result = await generateWithAI(aiConfig, 'grade_answer', '', {
              question: question.question,
              modelAnswer: question.modelAnswer || question.correctAnswer || "N/A",
              userAnswer: answers[question.id],
              marks: question.marks || 1
          });
          
          setGradingResults(prev => ({...prev, [question.id]: result}));
      } catch (e) {
          console.error(e);
          alert("Auto-grading failed. Switching to manual check.");
          setShortAnswerReveal({...shortAnswerReveal, [question.id]: true});
      } finally {
          setIsGrading(prev => ({...prev, [question.id]: false}));
      }
  };

  const handleSubmit = () => {
    let rawScore = 0;
    let maxScore = 0;

    questions.forEach(q => {
      const qMarks = q.marks || 1;
      maxScore += qMarks;

      if (q.type === 'short_answer' || !q.options) {
          // Priority: AI Grade -> Self Grade -> 0
          if (gradingResults[q.id]) {
              rawScore += gradingResults[q.id].marksObtained;
          } else if (selfGrades[q.id]) {
              rawScore += qMarks;
          }
      } else {
          // Auto graded MCQ
          if (answers[q.id] === q.correctAnswer) rawScore += qMarks;
      }
    });

    setTotalScore(rawScore);
    setMaxTotalScore(maxScore);
    setIsSubmitted(true);
    setStage('results');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- STAGE: SETUP ---
  if (stage === 'setup') {
      return (
          <div className="fixed inset-0 z-[200] bg-slate-900 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl">
                  <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">Exam Configuration</h1>
                  <p className="text-slate-500 mb-8">Customize your practice session.</p>
                  
                  <div className="space-y-6">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Number of Questions</label>
                          <div className="grid grid-cols-4 gap-2">
                              {[5, 10, 20, 30].map(num => (
                                  <button
                                    key={num}
                                    onClick={() => setConfig({...config, questionCount: num})}
                                    className={`py-2 rounded-lg border font-medium ${config.questionCount === num ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                  >
                                      {num}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Question Type</label>
                          <div className="grid grid-cols-3 gap-2">
                              {[
                                  {id: 'mcq', label: 'MCQ Only'},
                                  {id: 'short_answer', label: 'Short Answer'},
                                  {id: 'mixed', label: 'Mixed'}
                              ].map(t => (
                                  <button
                                    key={t.id}
                                    onClick={() => setConfig({...config, type: t.id as any})}
                                    disabled={!hasAiKey && t.id !== 'mcq'} 
                                    className={`py-2 rounded-lg border font-medium text-sm ${config.type === t.id ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                                  >
                                      {t.label}
                                  </button>
                              ))}
                          </div>
                          {!hasAiKey && <p className="text-xs text-amber-600 mt-2">Short Answer & Mixed modes require AI API Key.</p>}
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Difficulty</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['easy', 'medium', 'hard'].map(d => (
                                  <button
                                    key={d}
                                    onClick={() => setConfig({...config, difficulty: d as any})}
                                    className={`py-2 rounded-lg border font-medium capitalize ${config.difficulty === d ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                  >
                                      {d}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="mt-10 flex gap-4">
                      <button onClick={onExit} type="button" className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium">Cancel</button>
                      <button 
                        onClick={startExam} 
                        disabled={isGenerating}
                        className="flex-[2] py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold shadow-lg shadow-brand-200 flex items-center justify-center gap-2"
                      >
                          {isGenerating ? <Loader2 className="animate-spin" /> : 'Start Exam'}
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- STAGE: RESULTS ---
  if (stage === 'results') {
    const percentage = Math.round((totalScore / maxTotalScore) * 100) || 0;
    return (
      <div className="fixed inset-0 z-[200] bg-slate-50 overflow-y-auto">
         <div className="max-w-4xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-serif text-slate-800">Exam Results</h1>
                <button onClick={onExit} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors">Exit Exam Mode</button>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center mb-8">
                <div className="inline-block p-4 rounded-full bg-yellow-50 mb-4"><Award className="w-12 h-12 text-yellow-600" /></div>
                <h2 className="text-4xl font-bold text-slate-900 mb-2">{percentage}%</h2>
                <p className="text-slate-500">You scored {totalScore.toFixed(1)} out of {maxTotalScore}</p>
            </div>

            <div className="space-y-6">
                {questions.map((q, idx) => {
                    const isShort = q.type === 'short_answer' || !q.options;
                    // Logic to determine if "Correct" visually
                    let isCorrect = false;
                    let obtained = 0;
                    if (isShort) {
                        obtained = gradingResults[q.id]?.marksObtained || (selfGrades[q.id] ? q.marks || 1 : 0);
                        isCorrect = obtained >= ((q.marks || 1) / 2); // Considered pass if >= 50%
                    } else {
                        isCorrect = answers[q.id] === q.correctAnswer;
                        obtained = isCorrect ? q.marks || 1 : 0;
                    }
                    
                    return (
                        <div key={q.id} className={`p-6 rounded-xl border ${isCorrect ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                             <div className="flex gap-3">
                                 <span className="font-bold text-slate-400">Q{idx + 1}.</span>
                                 <div className="flex-1">
                                     <div className="flex justify-between items-start mb-4">
                                        <p className="font-medium text-slate-800 text-lg mr-4" dangerouslySetInnerHTML={{__html: q.question}} />
                                        <span className={`text-sm font-bold px-2 py-1 rounded ${isCorrect ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                                            {obtained}/{q.marks || 1} Marks
                                        </span>
                                     </div>
                                     
                                     {isShort ? (
                                         <div className="space-y-3">
                                             <div className="bg-white p-3 rounded border border-slate-200 text-slate-600">
                                                 <span className="text-xs font-bold text-slate-400 block mb-1">YOUR ANSWER</span>
                                                 {answers[q.id] || '(No answer provided)'}
                                             </div>
                                             {gradingResults[q.id] && (
                                                <div className="bg-indigo-50 p-3 rounded border border-indigo-100 text-indigo-800">
                                                    <span className="text-xs font-bold text-indigo-400 block mb-1">AI FEEDBACK</span>
                                                    {gradingResults[q.id].feedback}
                                                </div>
                                             )}
                                             <div className="bg-green-100 p-3 rounded border border-green-200 text-green-900">
                                                 <span className="text-xs font-bold text-green-700 block mb-1">MODEL ANSWER</span>
                                                 {q.modelAnswer || q.correctAnswer}
                                             </div>
                                         </div>
                                     ) : (
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                                             {q.options?.map(opt => {
                                                 let optionClass = "p-3 rounded-lg border text-sm ";
                                                 if (opt === q.correctAnswer) optionClass += "bg-green-100 border-green-300 text-green-800 font-bold";
                                                 else if (opt === answers[q.id] && !isCorrect) optionClass += "bg-red-100 border-red-300 text-red-800";
                                                 else optionClass += "bg-white border-slate-200 text-slate-500 opacity-70";
                                                 return <div key={opt} className={optionClass} dangerouslySetInnerHTML={{__html: opt}} />;
                                             })}
                                         </div>
                                     )}
                                     
                                     {q.explanation && (
                                         <div className="mt-3 text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                                             <strong>Explanation:</strong> {q.explanation}
                                         </div>
                                     )}
                                 </div>
                             </div>
                        </div>
                    );
                })}
            </div>
         </div>
      </div>
    );
  }

  // --- STAGE: ACTIVE EXAM ---
  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isShortAnswer = currentQ.type === 'short_answer' || !currentQ.options;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 text-slate-100 flex flex-col h-screen overflow-hidden">
       {/* Quit Confirmation Modal */}
       {showQuitConfirm && (
           <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                   <div className="flex items-center gap-3 text-amber-400 mb-4">
                       <AlertTriangle size={24} />
                       <h3 className="text-lg font-bold">Quit Exam?</h3>
                   </div>
                   <p className="text-slate-300 mb-6">Are you sure you want to leave? Your progress and answers will be lost.</p>
                   <div className="flex gap-3">
                       <button onClick={() => setShowQuitConfirm(false)} className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium">Cancel</button>
                       <button onClick={onExit} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium">Quit</button>
                   </div>
               </div>
           </div>
       )}

       {/* Exam Header */}
       <div className="flex-none h-16 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-800">
           <div className="font-mono font-bold text-xl flex items-center gap-2">
               <Clock className={timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-slate-400'} />
               {formatTime(timeLeft)}
           </div>
           <div className="text-sm text-slate-400">Question {currentIndex + 1} of {questions.length}</div>
           <button 
                type="button"
                onClick={() => setShowQuitConfirm(true)}
                className="text-slate-400 hover:text-white px-3 py-1 rounded hover:bg-slate-700 transition-colors"
            >
               Quit
           </button>
       </div>

       {/* Progress Bar */}
       <div className="flex-none h-1 bg-slate-800 w-full">
           <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${progress}%` }} />
       </div>

       {/* Question Area - Scrollable */}
       <div className="flex-1 overflow-y-auto p-6 flex justify-center">
           <div className="max-w-3xl w-full my-auto">
               <div className="flex justify-between items-start mb-6">
                   <h2 className="text-2xl md:text-3xl font-serif leading-relaxed" dangerouslySetInnerHTML={{__html: currentQ.question}} />
                   <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider flex-shrink-0 ml-4">
                       {currentQ.marks || 1} Marks
                   </span>
               </div>
               
               {isShortAnswer ? (
                   <div className="space-y-6">
                       <textarea 
                         className="w-full h-32 bg-slate-800 border border-slate-600 rounded-xl p-4 text-white focus:ring-2 focus:ring-brand-500"
                         placeholder="Type your answer here..."
                         value={answers[currentQ.id] || ''}
                         onChange={(e) => setAnswers({...answers, [currentQ.id]: e.target.value})}
                         readOnly={!!gradingResults[currentQ.id]}
                       />
                       
                       {/* Grading Area */}
                       {gradingResults[currentQ.id] ? (
                           <div className="animate-in fade-in slide-in-from-bottom-2 bg-slate-800 p-6 rounded-xl border border-slate-600">
                               <div className="flex justify-between items-start mb-4">
                                   <div className="flex items-center gap-2 text-green-400 font-bold">
                                       <CheckCircle size={20} />
                                       <span>Graded: {gradingResults[currentQ.id].marksObtained}/{currentQ.marks || 1}</span>
                                   </div>
                               </div>
                               <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mb-4">
                                   <p className="text-sm text-slate-300 italic">"{gradingResults[currentQ.id].feedback}"</p>
                               </div>
                               <div>
                                   <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Model Answer</h4>
                                   <p className="text-slate-400 text-sm">{currentQ.modelAnswer || currentQ.correctAnswer}</p>
                               </div>
                           </div>
                       ) : hasAiKey ? (
                           <button 
                             onClick={() => handleGradeWithAI(currentQ)}
                             disabled={isGrading[currentQ.id]}
                             className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20"
                           >
                               {isGrading[currentQ.id] ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                               Submit for Grading
                           </button>
                       ) : !shortAnswerReveal[currentQ.id] ? (
                           <button 
                             onClick={() => setShortAnswerReveal({...shortAnswerReveal, [currentQ.id]: true})}
                             className="text-brand-400 underline text-sm"
                           >
                               Self Check (No AI)
                           </button>
                       ) : (
                           <div className="animate-in fade-in slide-in-from-bottom-2 bg-slate-800 p-6 rounded-xl border border-slate-600">
                               <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase">Model Answer</h4>
                               <p className="text-green-400 mb-6">{currentQ.modelAnswer || currentQ.correctAnswer || "No model answer available."}</p>
                               <div className="flex gap-4">
                                   <button 
                                     onClick={() => setSelfGrades({...selfGrades, [currentQ.id]: true})}
                                     className={`flex-1 py-3 rounded-lg border ${selfGrades[currentQ.id] === true ? 'bg-green-600 border-green-600' : 'border-slate-600 hover:bg-slate-700'}`}
                                   >
                                       <CheckCircle className="inline mr-2" /> I got it right
                                   </button>
                                   <button 
                                     onClick={() => setSelfGrades({...selfGrades, [currentQ.id]: false})}
                                     className={`flex-1 py-3 rounded-lg border ${selfGrades[currentQ.id] === false ? 'bg-red-600 border-red-600' : 'border-slate-600 hover:bg-slate-700'}`}
                                   >
                                       <XCircle className="inline mr-2" /> I missed it
                                   </button>
                               </div>
                           </div>
                       )}
                   </div>
               ) : (
                   <div className="space-y-4">
                       {currentQ.options?.map((option, idx) => (
                           <button
                              key={idx}
                              onClick={() => setAnswers({...answers, [currentQ.id]: option})}
                              className={`w-full text-left p-6 rounded-xl border-2 transition-all flex items-center justify-between group
                                ${answers[currentQ.id] === option ? 'bg-brand-600 border-brand-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                           >
                               <span className="text-lg" dangerouslySetInnerHTML={{__html: option}} />
                               {answers[currentQ.id] === option && <CheckCircle className="text-white" />}
                               {answers[currentQ.id] !== option && <div className="w-5 h-5 rounded-full border border-slate-600 group-hover:border-slate-400" />}
                           </button>
                       ))}
                   </div>
               )}
           </div>
       </div>

       {/* Footer Navigation */}
       <div className="flex-none h-20 border-t border-slate-700 bg-slate-800 flex items-center justify-between px-6">
           <button
             onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
             disabled={currentIndex === 0}
             className="px-6 py-3 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition-colors"
           >
             Previous
           </button>
           
           {currentIndex === questions.length - 1 ? (
               <button onClick={handleSubmit} className="px-8 py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20">Submit Exam</button>
           ) : (
                <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-8 py-3 rounded-lg bg-brand-600 text-white font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-900/20"
              >
                Next Question
              </button>
           )}
       </div>
    </div>
  );
};

export default ExamMode;
