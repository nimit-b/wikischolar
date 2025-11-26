
import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, Loader2, BookOpen, Bot, Sparkles } from 'lucide-react';
import { searchTopics } from '../services/wikiService';
import { SearchResult } from '../types';

interface SearchBarProps {
  onSearch: (term: string) => void;
  onAiSearch: (term: string) => void;
  isLoading: boolean;
  hasAiKey?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onAiSearch, isLoading, hasAiKey }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      const data = await searchTopics(query);
      setResults(data);
    };

    const timeoutId = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (title: string) => {
    setQuery(title);
    setShowResults(false);
    onSearch(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setShowResults(false);
      onSearch(query);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative z-50" ref={wrapperRef}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-brand-500 animate-spin" />
          ) : (
            <SearchIcon className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
          )}
        </div>
        <input
          type="text"
          className="block w-full pl-12 pr-16 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          placeholder="What do you want to learn about today?"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
        />
        
        {/* Direct AI Search Button */}
        <div className="absolute inset-y-0 right-2 flex items-center">
            <button
                onClick={() => onAiSearch(query)}
                disabled={!query.trim() || isLoading}
                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                title={hasAiKey ? "Generate Study Guide with AI" : "Configure AI in Settings"}
            >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            </button>
        </div>
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="divide-y divide-slate-50">
            {results.map((result, idx) => (
              <li 
                key={idx}
                className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-3"
                onClick={() => handleSelect(result.title)}
              >
                <div className="bg-brand-50 p-2 rounded-lg text-brand-500">
                  <BookOpen size={16} />
                </div>
                <div>
                  <div className="font-medium text-slate-700">{result.title}</div>
                  {result.description && (
                    <div className="text-xs text-slate-400 line-clamp-1">{result.description}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
