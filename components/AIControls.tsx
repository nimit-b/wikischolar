
import React, { useState } from 'react';
import { Bot, Zap, Brain, FileText, Loader2, AlertCircle, MessageSquarePlus, Sparkles, PlusCircle, Globe, PenTool, Image as ImageIcon, Download } from 'lucide-react';

interface AIControlsProps {
  hasKey: boolean;
  onOpenSettings: () => void;
  onGenerate: (type: 'flashcards' | 'quiz' | 'simplify' | 'custom' | 'real_world' | 'diagram', customPrompt?: string) => void;
  isLoading: boolean;
  error?: string;
  simpleExplanation?: string;
}

const AIControls: React.FC<AIControlsProps> = ({ 
  hasKey, 
  onOpenSettings, 
  onGenerate, 
  isLoading, 
  error,
  simpleExplanation 
}) => {
  const [customPrompt, setCustomPrompt] = useState('');

  const isImageOrSvg = simpleExplanation && (simpleExplanation.trim().startsWith('<svg') || simpleExplanation.startsWith('data:') || simpleExplanation.startsWith('http'));

  const sanitizeDataUri = (content: string) => {
      if (!content) return '';
      let result = content.trim();

      // Fix incompatible MIME types
      if (result.startsWith('data:text/xml;base64')) {
          result = result.replace('data:text/xml;base64', 'data:image/svg+xml;base64');
      } else if (result.startsWith('data:text/plain;base64') && result.includes('iVBOR')) {
          result = result.replace('data:text/plain;base64', 'data:image/png;base64');
      }

      // Fix Unencoded SVG Data URIs
      if (result.startsWith('data:image/svg+xml') && !result.includes(';base64')) {
          if (result.includes('<')) {
              const body = result.substring(result.indexOf(',') + 1);
              return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(body)}`;
          }
      }
      return result;
  };

  const downloadImage = () => {
      if (!simpleExplanation) return;
      
      const sanitized = sanitizeDataUri(simpleExplanation);

      if (sanitized.startsWith('data:image') || sanitized.startsWith('http')) {
          const a = document.createElement('a');
          a.href = sanitized;
          a.download = `ai-visual-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
      }

      const blob = new Blob([simpleExplanation], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-diagram-${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const parseMarkdown = (text: string) => {
    if (!text) return '';

    const lines = text.split('\n');
    let html = '';
    let inList = false;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h3 class="text-lg font-bold text-slate-800 mt-6 mb-3">${trimmed.replace('### ', '')}</h3>`;
        } else if (trimmed.startsWith('## ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h2 class="text-xl font-bold text-slate-800 mt-8 mb-4 border-b border-indigo-100 pb-2">${trimmed.replace('## ', '')}</h2>`;
        } else if (trimmed.startsWith('# ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h1 class="text-2xl font-bold text-slate-900 mt-8 mb-4">${trimmed.replace('# ', '')}</h1>`;
        } else if (trimmed === '---' || trimmed === '***') {
             if (inList) { html += '</ul>'; inList = false; }
             html += '<hr class="my-8 border-slate-200" />';
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (!inList) { html += '<ul class="list-disc pl-5 space-y-2 mb-4 text-slate-700">'; inList = true; }
            let content = trimmed.substring(2);
            content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
            content = content.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
            html += `<li>${content}</li>`;
        } else if (/^\d+\.\s/.test(trimmed)) {
             if (inList) { html += '</ul>'; inList = false; }
             let content = trimmed.replace(/^\d+\.\s/, '');
             content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
             const number = trimmed.match(/^\d+/)?.[0];
             html += `<div class="flex gap-3 mb-3"><span class="font-bold text-indigo-500 font-mono mt-0.5">${number}.</span><span class="text-slate-700 leading-relaxed">${content}</span></div>`;
        } else {
            if (inList) { html += '</ul>'; inList = false; }
            if (trimmed.length > 0) {
                let content = trimmed;
                content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
                content = content.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
                html += `<p class="mb-4 text-slate-700 leading-relaxed">${content}</p>`;
            }
        }
    });
    if (inList) html += '</ul>';
    
    // Quick table support for AI Assistant tab
    const tableRegex = /((?:\|.*\|\r?\n)+)/g;
    html = html.replace(tableRegex, (match) => {
        const rows = match.trim().split('\n');
        if (rows.length < 2) return match; 
        const separatorRegex = /^\|?\s*:?-+:?\s*(\|?\s*:?-+:?\s*)+\|?$/;
        if (!separatorRegex.test(rows[1].trim())) return match;
        
        let tableHtml = '<div class="overflow-x-auto my-6"><table class="min-w-full border-collapse border border-slate-200 rounded-lg shadow-sm text-sm text-left">';
        const headers = rows[0].split('|').filter(c => c.trim() !== '').map(c => c.trim());
        tableHtml += '<thead class="bg-slate-50"><tr>';
        headers.forEach(h => { tableHtml += `<th class="border border-slate-200 px-4 py-2 font-semibold text-slate-700">${h}</th>`; });
        tableHtml += '</tr></thead><tbody>';
        for (let i = 2; i < rows.length; i++) {
            const cells = rows[i].split('|').filter(c => c.trim() !== '').map(c => c.trim());
            if (cells.length > 0) {
                 tableHtml += `<tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}">`;
                 cells.forEach(c => { tableHtml += `<td class="border border-slate-200 px-4 py-2 text-slate-600">${c}</td>`; });
                 tableHtml += '</tr>';
            }
        }
        tableHtml += '</tbody></table></div>';
        return tableHtml;
    });

    return html;
  };

  const cleanSvgContent = (content: string) => {
      // Basic cleanup for display
      let svg = content;
      svg = svg.replace(/width="[^"]*"/gi, '').replace(/height="[^"]*"/gi, '');
      if (!svg.includes('viewBox')) {
          svg = svg.replace('<svg', '<svg viewBox="0 0 800 600"');
      }
      return svg;
  };

  if (!hasKey) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-sm border border-slate-200 text-center">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bot size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Unlock AI Superpowers</h3>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          Add your own API key (OpenAI, Gemini, etc.) to generate smart quizzes, simplify complex topics, and get personalized study help.
        </p>
        <button onClick={onOpenSettings} className="px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium shadow-lg shadow-brand-200">
          Configure AI Settings
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
      
      {/* Quick Actions */}
      <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Zap size={16} /> Quick Study Aids</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button onClick={() => onGenerate('simplify')} disabled={isLoading} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all text-left group flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"><Sparkles size={20} /></div>
                <div><h3 className="font-bold text-slate-800">Simplify Topic</h3><p className="text-sm text-slate-500 mt-1">Explain like I'm 5.</p></div>
            </button>
            <button onClick={() => onGenerate('diagram')} disabled={isLoading} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all text-left group flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"><ImageIcon size={20} /></div>
                <div><h3 className="font-bold text-slate-800">Visual Aid</h3><p className="text-sm text-slate-500 mt-1">Generate a diagram.</p></div>
            </button>
            <button onClick={() => onGenerate('real_world')} disabled={isLoading} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all text-left group flex items-start gap-4">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"><Globe size={20} /></div>
                <div><h3 className="font-bold text-slate-800">Real World App</h3><p className="text-sm text-slate-500 mt-1">Real life examples.</p></div>
            </button>
            <button onClick={() => onGenerate('custom', 'Write a 3-paragraph essay outline about this topic.')} disabled={isLoading} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all text-left group flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"><PenTool size={20} /></div>
                <div><h3 className="font-bold text-slate-800">Essay Outline</h3><p className="text-sm text-slate-500 mt-1">For assignments.</p></div>
            </button>
          </div>
      </section>

      {/* Generators */}
      <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><PlusCircle size={16} /> Generate Content</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <button onClick={() => onGenerate('quiz')} disabled={isLoading} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all text-left group flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"><FileText size={20} /></div>
                <div><h3 className="font-bold text-slate-800">Generate Exam Questions</h3><p className="text-sm text-slate-500 mt-1">Create 5 new exam-style questions.</p></div>
            </button>
            <button onClick={() => onGenerate('flashcards')} disabled={isLoading} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all text-left group flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"><Brain size={20} /></div>
                <div><h3 className="font-bold text-slate-800">Generate Concept Cards</h3><p className="text-sm text-slate-500 mt-1">Create 8 deep-dive flashcards.</p></div>
            </button>
          </div>
      </section>

      {/* Manual Input */}
      <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><MessageSquarePlus size={16} /> Custom AI Tutor</h3>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-medium text-slate-700 mb-2">Ask anything about this topic</label>
            <div className="relative">
                <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g. 'Write a poem about the mitochondria', 'List the 5 most important dates', 'Create a difficult fill-in-the-blank question'"
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all resize-none"
                    disabled={isLoading}
                />
                <div className="absolute bottom-3 right-3">
                    <button
                        onClick={() => { if (customPrompt.trim()) onGenerate('custom', customPrompt); }}
                        disabled={isLoading || !customPrompt.trim()}
                        className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors flex items-center gap-2"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />} Ask AI
                    </button>
                </div>
            </div>
          </div>
      </section>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
           <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
           <p className="text-slate-600 font-medium animate-pulse">Consulting the AI...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100">
           <AlertCircle size={20} /> <span>{error}</span>
        </div>
      )}

      {/* AI Response Area */}
      {simpleExplanation && (
        <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden animate-in zoom-in-95 scroll-mt-24" id="ai-result">
           <div className="bg-indigo-600 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2"><Bot size={20} className="text-yellow-300" /><h3 className="font-bold">AI Response</h3></div>
           </div>
           <div className="p-8 prose prose-slate max-w-none">
              {isImageOrSvg ? (
                  <div className="w-full overflow-hidden flex flex-col items-center bg-white p-4 rounded-lg border border-slate-100 shadow-inner group/diagram relative">
                      {(simpleExplanation.startsWith('data:') || simpleExplanation.startsWith('http')) ? (
                           <img 
                                src={sanitizeDataUri(simpleExplanation)} 
                                alt="AI Visual" 
                                className="w-full h-auto rounded-lg" 
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const obj = document.createElement('object');
                                    obj.data = sanitizeDataUri(simpleExplanation);
                                    obj.type = "image/svg+xml";
                                    obj.className = "w-full h-auto rounded-lg";
                                    target.parentNode?.appendChild(obj);
                                }}
                            />
                      ) : (
                          <div 
                            className="w-full [&_svg]:w-full [&_svg]:h-auto"
                            dangerouslySetInnerHTML={{ __html: cleanSvgContent(simpleExplanation) }} 
                          />
                      )}
                      
                      <button 
                        onClick={downloadImage}
                        className="absolute bottom-4 right-4 bg-slate-900/80 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 opacity-0 group-hover/diagram:opacity-100 transition-opacity hover:bg-slate-900"
                      >
                         <Download size={12} /> Download
                      </button>
                  </div>
              ) : (
                  <div className="text-lg leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: parseMarkdown(simpleExplanation) }} />
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default AIControls;
