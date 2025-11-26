import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircle, XCircle, RefreshCw, Trophy, ArrowRight, Sparkles, Loader2 } from 'lucide-react';

interface QuizProps {
  questions: QuizQuestion[];
  onGenerateMore?: () => void;
  isGenerating?: boolean;
}

const QUESTIONS_PER_ROUND = 5;

const Quiz: React.FC<QuizProps> = ({ questions, onGenerateMore, isGenerating }) => {
  // State for current round
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [currentQIndexInRound, setCurrentQIndexInRound] = useState(0);
  
  // State for gameplay
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Derived state
  const roundStartIdx = currentRoundIdx * QUESTIONS_PER_ROUND;
  const currentRoundQuestions = questions.slice(roundStartIdx, roundStartIdx + QUESTIONS_PER_ROUND);
  const totalRounds = Math.ceil(questions.length / QUESTIONS_PER_ROUND);
  const hasMoreRounds = currentRoundIdx < totalRounds - 1;

  // Reset when questions prop changes completely
  useEffect(() => {
    // If just appending new questions, don't reset everything, just UI state for the result screen might update
    if (questions.length > 0 && currentRoundIdx === 0 && currentQIndexInRound === 0 && !showResult) {
        // Initial load
    }
  }, [questions]);

  const handleOptionClick = (option: string) => {
    if (isAnswered) return;
    
    setSelectedOption(option);
    setIsAnswered(true);
    
    const currentQ = currentRoundQuestions[currentQIndexInRound];
    if (option === currentQ.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQIndexInRound < currentRoundQuestions.length - 1) {
      setCurrentQIndexInRound(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResult(true);
    }
  };

  const startNextRound = () => {
      setCurrentRoundIdx(prev => prev + 1);
      setCurrentQIndexInRound(0);
      setScore(0);
      setShowResult(false);
      setSelectedOption(null);
      setIsAnswered(false);
  };

  const restartCurrentRound = () => {
    setCurrentQIndexInRound(0);
    setScore(0);
    setShowResult(false);
    setSelectedOption(null);
    setIsAnswered(false);
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
        <p className="text-slate-400">Not enough content to generate a quiz for this topic.</p>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-yellow-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Round {currentRoundIdx + 1} Complete!</h2>
        <p className="text-slate-500 mb-8">
            {score === QUESTIONS_PER_ROUND ? "Perfect score! Outstanding job." : "Good effort! Keep practicing."}
        </p>
        
        <div className="text-6xl font-black text-brand-600 mb-2">{score} <span className="text-3xl text-slate-300">/</span> {currentRoundQuestions.length}</div>
        <div className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-10">Score</div>

        <div className="flex flex-col gap-4 justify-center">
            <div className="flex gap-4 justify-center">
                <button 
                onClick={restartCurrentRound}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                >
                <RefreshCw size={18} />
                Retry Round
                </button>
                
                {hasMoreRounds ? (
                    <button 
                    onClick={startNextRound}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium shadow-lg shadow-brand-200"
                    >
                    Start Round {currentRoundIdx + 2}
                    <ArrowRight size={18} />
                    </button>
                ) : (
                    onGenerateMore ? (
                        <button
                             onClick={() => {
                                 onGenerateMore();
                                 // We will auto-start next round once props update in useEffect or user clicks start next
                             }}
                             disabled={isGenerating}
                             className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium shadow-lg shadow-purple-200"
                        >
                            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            Generate AI Round
                        </button>
                    ) : (
                        <div className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-medium cursor-default">
                            Quiz Completed
                        </div>
                    )
                )}
            </div>
            
            {/* If we just generated questions, show a button to start them */}
            {onGenerateMore && !hasMoreRounds && isGenerating === false && questions.length > (currentRoundIdx + 1) * QUESTIONS_PER_ROUND && (
                 <button 
                    onClick={startNextRound}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-lg shadow-green-200 animate-in fade-in"
                >
                    Start New AI Round! <ArrowRight size={18} />
                </button>
            )}
        </div>
      </div>
    );
  }

  const currentQ = currentRoundQuestions[currentQIndexInRound];
  // Guard clause for safety
  if (!currentQ) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="mb-8 flex justify-between items-center">
        <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Round {currentRoundIdx + 1} • Q{currentQIndexInRound + 1}/{currentRoundQuestions.length}
        </div>
        <div className="text-sm font-bold text-brand-600">Score: {score}</div>
      </div>
      
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-8 md:p-10 border-b border-slate-50">
          <h3 
            className="text-xl md:text-2xl font-serif text-slate-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: currentQ.question }}
          />
        </div>
        
        <div className="p-6 md:p-8 space-y-3 bg-slate-50/50">
          {currentQ.options.map((option, idx) => {
            let stateClasses = "bg-white border-slate-200 hover:border-brand-300 hover:shadow-md";
            
            if (isAnswered) {
              if (option === currentQ.correctAnswer) {
                stateClasses = "bg-green-50 border-green-500 text-green-700 shadow-sm";
              } else if (option === selectedOption) {
                stateClasses = "bg-red-50 border-red-500 text-red-700 shadow-sm";
              } else {
                stateClasses = "bg-slate-50 border-slate-100 text-slate-400 opacity-60";
              }
            } else if (selectedOption === option) {
               stateClasses = "bg-brand-50 border-brand-500 text-brand-700";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(option)}
                disabled={isAnswered}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex justify-between items-center ${stateClasses}`}
              >
                <span 
                    className="font-medium text-lg" 
                    dangerouslySetInnerHTML={{ __html: option }} 
                />
                {isAnswered && option === currentQ.correctAnswer && <CheckCircle className="text-green-500" size={20} />}
                {isAnswered && option === selectedOption && option !== currentQ.correctAnswer && <XCircle className="text-red-500" size={20} />}
              </button>
            );
          })}
        </div>
      </div>
      
      {isAnswered && currentQ.explanation && (
         <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 text-sm animate-in fade-in">
            <strong>Explanation:</strong> {currentQ.explanation}
         </div>
      )}

      {isAnswered && (
        <div className="mt-8 flex justify-end animate-in fade-in slide-in-from-left-4">
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-lg shadow-slate-200"
          >
            {currentQIndexInRound < currentRoundQuestions.length - 1 ? 'Next Question' : 'Finish Round'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Quiz;