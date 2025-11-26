
import { Flashcard, QuizQuestion, TimelineEvent } from '../types';

// Helper to check if a word is significant (capitalized, number, long word)
const isSignificant = (word: string, index: number, words: string[]) => {
  const cleanWord = word.replace(/[^\w\s]/gi, '');
  if (cleanWord.length < 3) return false;
  
  // Check for number
  if (/\d/.test(word)) return true;
  
  // Check for capitalization (but not start of sentence)
  if (index > 0 && /^[A-Z]/.test(word)) return true;
  
  // Longer words are often more important
  if (cleanWord.length > 8) return true;
  
  return false;
};

// Simple sentence tokenizer
const splitSentences = (text: string): string[] => {
  // Split by periods, but try to avoid splitting on "Mr.", "U.S.", etc.
  return text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
};

export const parseMarkdownToHtml = (text: string): string => {
    if (!text) return '';
    let html = text;

    // 0. Handle Images ![alt](url)
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-xl shadow-md my-6 max-w-full h-auto border border-slate-200" loading="lazy" />');

    // 1. Handle Links [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:underline">$1</a>');
    
    // 2. Handle Lists (Bullets)
    // Replace lines starting with "- " or "* " with <li> items, wrapped in <ul>
    html = html.replace(/^[\*\-]\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/<\/li>\n<li>/g, '</li><li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul class="list-disc pl-5 space-y-2 mb-4 text-slate-700">$1</ul>');

    // 3. Handle Lists (Numbered)
    html = html.replace(/^\d+\.\s+(.*)$/gm, '<li class="list-decimal">$1</li>');
    html = html.replace(/<\/li>\n<li class="list-decimal">/g, '</li><li class="list-decimal">');
    html = html.replace(/(<li class="list-decimal">.*<\/li>)/s, '<ul class="list-decimal pl-5 space-y-2 mb-4 text-slate-700">$1</ul>');

    // 4. Handle Bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 5. Handle Headers (###)
    html = html.replace(/^###\s+(.*)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>');
    html = html.replace(/^##\s+(.*)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>');

    // 6. Handle Tables (Robust Regex Parser)
    // Looks for lines starting with | and containing |, allowing for multiline tables
    const tableRegex = /((?:\|.*\|\r?\n)+)/g;
    
    html = html.replace(tableRegex, (match) => {
        const rows = match.trim().split('\n');
        if (rows.length < 2) return match; // Not a valid table

        // Check if second row is a separator |---|
        const separatorRegex = /^\|?\s*:?-+:?\s*(\|?\s*:?-+:?\s*)+\|?$/;
        if (!separatorRegex.test(rows[1].trim())) return match;

        let tableHtml = '<div class="overflow-x-auto my-6"><table class="min-w-full border-collapse border border-slate-200 rounded-lg shadow-sm text-sm text-left">';
        
        // Header
        const headers = rows[0].split('|').filter(c => c.trim() !== '').map(c => c.trim());
        tableHtml += '<thead class="bg-slate-50"><tr>';
        headers.forEach(h => {
             tableHtml += `<th class="border border-slate-200 px-4 py-2 font-semibold text-slate-700">${h}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        // Body
        for (let i = 2; i < rows.length; i++) {
            const cells = rows[i].split('|').filter(c => c.trim() !== '').map(c => c.trim());
            // Only add if row has content
            if (cells.length > 0) {
                 tableHtml += `<tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}">`;
                 cells.forEach(c => {
                     // Simple formatting inside cells
                     let cellContent = c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                     tableHtml += `<td class="border border-slate-200 px-4 py-2 text-slate-600">${cellContent}</td>`;
                 });
                 tableHtml += '</tr>';
            }
        }
        
        tableHtml += '</tbody></table></div>';
        return tableHtml;
    });

    // 7. Handle Paragraphs (double newlines)
    // If it's not already wrapped in a tag, wrap double newlines in <p>
    const segments = html.split('\n\n');
    html = segments.map(seg => {
        const trimmed = seg.trim();
        if (!trimmed) return '';
        // Avoid wrapping existing block elements
        if (trimmed.startsWith('<div') || trimmed.startsWith('<table') || trimmed.startsWith('<ul') || trimmed.startsWith('<h')) return seg;
        
        return `<p class="mb-4 leading-relaxed">${seg}</p>`;
    }).join('');

    return html;
};

export const generateKeyPoints = (text: string): string[] => {
  const sentences = splitSentences(text).slice(0, 300);
  
  const scoredSentences = sentences.map(s => {
    let score = 0;
    if (/\d{4}/.test(s)) score += 3; // Dates
    if (/[A-Z][a-z]+/.test(s)) score += 1; // Proper nouns
    if (s.length > 50 && s.length < 200) score += 2; // Good length
    return { text: s.replace(/&nbsp;/g, ' ').trim(), score };
  });

  return scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(s => s.text);
};

export const generateTimeline = (text: string): TimelineEvent[] => {
    const sentences = splitSentences(text);
    const events: TimelineEvent[] = [];
    const seenYears = new Set<string>();

    sentences.forEach(s => {
        // Look for 4 digit years from 1000 to 2099
        const yearMatch = s.match(/\b(1\d{3}|20\d{2})\b/);
        // Clean up entities and excess spaces
        const cleanSentence = s.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

        if (yearMatch && cleanSentence.length < 200 && cleanSentence.length > 20) {
            const year = yearMatch[0];
            if (!seenYears.has(year)) {
                seenYears.add(year);
                events.push({
                    year,
                    description: cleanSentence
                });
            }
        }
    });

    return events.sort((a, b) => parseInt(a.year) - parseInt(b.year));
};

export const generateFlashcards = (text: string): Flashcard[] => {
  const sentences = splitSentences(text).slice(0, 500); 
  const flashcards: Flashcard[] = [];
  const seenAnswers = new Set<string>();
  
  sentences.forEach((s, idx) => {
    const cleanS = s.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleanS.split(' ');
    if (words.length < 5 || words.length > 40) return;

    // Prioritize proper nouns and numbers
    const candidates = words.map((w, i) => ({ 
        w, 
        i, 
        score: (/\d/.test(w) ? 3 : 0) + (/^[A-Z]/.test(w) && i > 0 ? 2 : 0) + (w.length > 7 ? 1 : 0)
    }));
    
    const bestCandidate = candidates.sort((a, b) => b.score - a.score)[0];

    if (bestCandidate && bestCandidate.score > 0) {
        const answer = bestCandidate.w.replace(/[.,;!?()"]/g, '');
        if (answer.length < 3 || seenAnswers.has(answer.toLowerCase())) return;
        
        const front = cleanS.replace(bestCandidate.w, '________');
        
        seenAnswers.add(answer.toLowerCase());
        flashcards.push({
            id: `fc-${idx}`,
            front: front,
            back: answer
        });
    }
  });

  return flashcards;
};

export const generateQuiz = (text: string): QuizQuestion[] => {
  const sentences = splitSentences(text).slice(0, 500);
  const questions: QuizQuestion[] = [];
  
  const allWords = text.split(/\s+/).map(w => w.replace(/[.,;!?()"]/g, ''));
  const properNouns = [...new Set(allWords.filter(w => /^[A-Z][a-z]+$/.test(w) && w.length > 4))];
  const numbers = [...new Set(allWords.filter(w => /^\d+$/.test(w)))];

  sentences.forEach((s, idx) => {
    const cleanS = s.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleanS.split(' ');
    if (words.length < 10) return;

    let targetIndex = words.findIndex(w => /\d+/.test(w));
    let type = 'number';

    if (targetIndex === -1) {
        targetIndex = words.findIndex((w, i) => i > 0 && /^[A-Z]/.test(w) && w.length > 5);
        type = 'noun';
    }

    if (targetIndex !== -1) {
        const rawWord = words[targetIndex];
        const targetWord = rawWord.replace(/[.,;!?()"]/g, '');
        const questionText = cleanS.replace(rawWord, '________');
        
        const options = new Set<string>();
        options.add(targetWord);
        
        const pool = type === 'number' ? numbers : properNouns;
        
        let attempts = 0;
        while (options.size < 4 && attempts < 20) {
            const randomDist = pool[Math.floor(Math.random() * pool.length)];
            if (randomDist && randomDist !== targetWord) {
                options.add(randomDist);
            }
            attempts++;
        }
        
        if (options.size < 4) {
             const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
             if (randomWord && randomWord !== targetWord) options.add(randomWord);
        }

        if (options.size === 4) {
            questions.push({
                id: `q-${idx}`,
                type: 'mcq',
                question: questionText,
                options: Array.from(options).sort(() => Math.random() - 0.5),
                correctAnswer: targetWord,
                marks: 1
            });
        }
    }
  });

  return questions;
};
