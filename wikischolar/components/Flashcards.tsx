import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import { ChevronLeft, ChevronRight, RotateCcw, Layers } from 'lucide-react';

interface FlashcardsProps {
  cards: Flashcard[];
}

const BATCH_SIZE = 10;

const Flashcards: React.FC<FlashcardsProps> = ({ cards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  // Reset when deck changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setVisibleCount(BATCH_SIZE);
  }, [cards]);

  const visibleCards = cards.slice(0, visibleCount);
  const isLastCard = currentIndex === visibleCards.length - 1;
  const hasMoreContent = visibleCount < cards.length;

  if (cards.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
        <p className="text-slate-400">No flashcards could be generated for this topic.</p>
      </div>
    );
  }

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleCards.length);
    }, 200);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + visibleCards.length) % visibleCards.length);
    }, 200);
  };

  const loadMore = () => {
    setIsFlipped(false);
    setTimeout(() => {
        const nextCount = Math.min(visibleCount + BATCH_SIZE, cards.length);
        setVisibleCount(nextCount);
        // Automatically jump to the first new card
        setCurrentIndex(visibleCount); 
    }, 300);
  };

  const currentCard = visibleCards[currentIndex];

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex justify-between items-center text-slate-500 text-sm font-medium">
        <span>Card {currentIndex + 1} of {visibleCards.length} {hasMoreContent && `(of ${cards.length} total)`}</span>
        <span className="text-brand-500">Click card to flip</span>
      </div>

      <div 
        className="group relative h-80 w-full cursor-pointer perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className={`relative h-full w-full duration-500 transform-style-3d transition-all ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* Front */}
          <div className="absolute inset-0 backface-hidden bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center justify-center p-8 text-center" style={{ backfaceVisibility: 'hidden' }}>
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold tracking-wider mb-6">QUESTION</span>
            <div 
              className="text-xl md:text-2xl text-slate-700 font-serif leading-relaxed"
              dangerouslySetInnerHTML={{ __html: currentCard.front }}
            />
          </div>

          {/* Back */}
          <div 
            className="absolute inset-0 backface-hidden bg-gradient-to-br from-brand-500 to-indigo-600 rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 text-center text-white" 
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
             <span className="inline-block px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold tracking-wider mb-6">ANSWER</span>
            <div 
              className="text-2xl md:text-3xl font-bold"
              dangerouslySetInnerHTML={{ __html: currentCard.back }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 mt-10">
        <div className="flex justify-center items-center gap-6">
            <button 
            onClick={handlePrev}
            className="p-4 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-brand-200 hover:text-brand-600 transition-all shadow-sm"
            >
            <ChevronLeft size={24} />
            </button>
            
            <button 
            onClick={() => {
                setIsFlipped(false);
                setTimeout(() => setCurrentIndex(0), 300);
            }}
            className="p-4 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-brand-200 hover:text-brand-600 transition-all shadow-sm"
            title="Reset Current Batch"
            >
                <RotateCcw size={20} />
            </button>

            <button 
            onClick={handleNext}
            className="p-4 rounded-full bg-brand-600 text-white shadow-lg shadow-brand-200 hover:bg-brand-700 hover:shadow-brand-300 transition-all"
            >
            <ChevronRight size={24} />
            </button>
        </div>

        {/* Load More Section */}
        {isLastCard && hasMoreContent && (
             <div className="animate-in fade-in slide-in-from-top-2">
                 <button 
                    onClick={loadMore}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors font-medium"
                 >
                    <Layers size={18} />
                    Load Next {Math.min(BATCH_SIZE, cards.length - visibleCount)} Cards
                 </button>
             </div>
        )}
        
        {isLastCard && !hasMoreContent && (
            <div className="text-slate-400 text-sm italic">
                You've studied all generated cards for this topic!
            </div>
        )}
      </div>
    </div>
  );
};

export default Flashcards;