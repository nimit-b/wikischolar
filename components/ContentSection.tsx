
import React, { useEffect, useState } from 'react';
import { TopicData, RelatedTopic } from '../types';
import { ExternalLink, BookOpen, List, Link as LinkIcon, Menu, Volume2, StopCircle, Edit3, Save, Sparkles, Plus, Image as ImageIcon, HelpCircle, Download } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import { parseMarkdownToHtml } from '../utils/generator';

interface ContentSectionProps {
  topic: TopicData;
  keyPoints: string[];
  relatedTopics: RelatedTopic[];
  examTips?: string[];
  commonMistakes?: string[];
  mnemonics?: string[];
  userNotes?: string;
  onRelatedClick: (title: string) => void;
  onSaveNotes: (notes: string) => void;
  onAiAction?: (type: 'expand' | 'diagram' | 'simplify', context: string) => Promise<string>;
  hasAiKey?: boolean;
}

const ContentSection: React.FC<ContentSectionProps> = ({ 
    topic, keyPoints, relatedTopics, examTips, commonMistakes, mnemonics, userNotes, 
    onRelatedClick, onSaveNotes, onAiAction, hasAiKey 
}) => {
  const [activeSection, setActiveSection] = useState<string>(topic.sections[0]?.id || '');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  const [extras, setExtras] = useState<Record<string, { type: string, content: string }>>({});
  const [loadingExtras, setLoadingExtras] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleScroll = () => {
      const sections = topic.sections;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [topic.sections]);

  const handleSpeak = (text: string) => {
    if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handleNotesChange = (html: string) => {
    setIsSavingNotes(true);
    onSaveNotes(html);
    setTimeout(() => setIsSavingNotes(false), 500);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
      setIsMobileMenuOpen(false);
    }
  };

  const handleAiActionClick = async (sectionId: string, sectionText: string, action: 'expand' | 'diagram' | 'simplify') => {
      if (!onAiAction) return;
      setLoadingExtras(prev => ({...prev, [sectionId]: true}));
      try {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = sectionText;
          const cleanText = tempDiv.textContent || '';
          const result = await onAiAction(action, cleanText);
          setExtras(prev => ({ ...prev, [sectionId]: { type: action, content: result } }));
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingExtras(prev => ({...prev, [sectionId]: false}));
      }
  };

  const sanitizeDataUri = (content: string) => {
      if (!content) return '';
      let result = content.trim();

      // Magic Byte Detection: Check the actual Base64 signature
      const base64Index = result.indexOf(';base64,');
      if (base64Index !== -1) {
          const rawBase64 = result.substring(base64Index + 8).trim();
          
          // PNG signature (iVBORw0KGgo)
          if (rawBase64.startsWith('iVBOR')) {
              return `data:image/png;base64,${rawBase64}`;
          } 
          // JPG signature (/9j/)
          else if (rawBase64.startsWith('/9j/')) {
              return `data:image/jpeg;base64,${rawBase64}`;
          }
          // GIF signature (R0lGOD)
          else if (rawBase64.startsWith('R0lGOD')) {
               return `data:image/gif;base64,${rawBase64}`;
          }
          // SVG signature (PHN2Zy = <svg, PD94bW = <?xml)
          else if (rawBase64.startsWith('PHN2Zy') || rawBase64.startsWith('PD94bW')) {
               return `data:image/svg+xml;base64,${rawBase64}`;
          }
      }

      // Legacy fallback: If starts with data:image/svg+xml, DOES NOT have ;base64, and contains <
      if (result.startsWith('data:image/svg+xml') && !result.includes(';base64')) {
          // Check if it's raw XML. If so, encode it.
          if (result.includes('<')) {
              const body = result.substring(result.indexOf(',') + 1);
              return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(body)}`;
          }
      }

      return result;
  };

  const downloadImage = (content: string, fileName: string) => {
      const sanitized = sanitizeDataUri(content);

      // Check if it's base64/url
      if (sanitized.startsWith('data:image') || sanitized.startsWith('http')) {
          const extension = sanitized.includes('image/png') ? 'png' : sanitized.includes('image/jpeg') ? 'jpg' : 'svg';
          const a = document.createElement('a');
          a.href = sanitized;
          a.download = `${fileName}.${extension}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
      }
      
      // Fallback for raw SVG text
      const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const fullContentText = topic.sections.map(s => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = s.contentHtml;
      return tempDiv.textContent || '';
  }).join(' ');

  const validSections = topic.sections.filter(s => s.title || s.contentHtml.length > 20);

  const cleanSvgContent = (content: string) => {
      if (content.startsWith('data:') || content.startsWith('http')) return content; // Pass through images
      const match = content.match(/<svg[\s\S]*?<\/svg>/i);
      let svg = match ? match[0] : content;
      svg = svg.replace(/width="[^"]*"/gi, '').replace(/height="[^"]*"/gi, '');
      if (!svg.includes('viewBox') && svg.includes('<svg')) {
          svg = svg.replace('<svg', '<svg viewBox="0 0 800 600"');
      }
      return svg;
  };

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      <div className="hidden lg:block lg:col-span-3">
        <div className="sticky top-8 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 font-serif font-bold text-slate-700">Table of Contents</div>
                <nav className="max-h-[50vh] overflow-y-auto p-2">
                    {validSections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                        activeSection === section.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                        title={section.title}
                    >
                        {section.title}
                    </button>
                    ))}
                </nav>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-blue-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-indigo-900">
                    <List size={18} />
                    <h3 className="font-bold text-sm uppercase tracking-wide">Summary Points</h3>
                </div>
                <ul className="space-y-3">
                    {keyPoints.slice(0, 5).map((point, idx) => (
                    <li key={idx} className="flex gap-3 text-xs text-indigo-900/80 leading-relaxed">
                        <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                        <span>{point}</span>
                    </li>
                    ))}
                </ul>
            </div>

            {(mnemonics?.length || 0) > 0 && (
                 <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 shadow-sm">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-amber-900 mb-3">Memory Aids</h3>
                    <ul className="space-y-2 text-xs text-amber-800">
                        {mnemonics?.map((m, i) => <li key={i}>• {m}</li>)}
                    </ul>
                 </div>
            )}
        </div>
      </div>

      <div className="lg:hidden col-span-1">
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-700 font-medium">
            <span>Jump to Section...</span>
            <Menu size={20} />
        </button>
        {isMobileMenuOpen && (
            <div className="mt-2 bg-white rounded-xl border border-slate-200 shadow-lg p-2 absolute z-20 w-full left-0 max-h-80 overflow-y-auto">
                {validSections.map((section) => (
                <button key={section.id} onClick={() => scrollToSection(section.id)} className="w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 text-slate-600 active:bg-slate-50">{section.title}</button>
                ))}
            </div>
        )}
      </div>

      <div className="lg:col-span-9 space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-screen">
            <div className="relative border-b border-slate-100">
                {topic.thumbnail ? (
                    <div className="w-full h-64 md:h-80 overflow-hidden relative group">
                        <img src={topic.thumbnail} alt={topic.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-6 md:p-8 text-white w-full">
                            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-2 shadow-black drop-shadow-lg">{topic.title}</h1>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 md:p-12 bg-slate-50">
                         <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900">{topic.title}</h1>
                    </div>
                )}
                
                <div className="px-6 py-4 flex items-center justify-between bg-slate-50/50 text-sm border-t border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                        <BookOpen size={16} />
                        <span>WikiScholar Study Guide</span>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => handleSpeak(fullContentText)} className={`flex items-center gap-1 font-medium transition-colors ${isPlaying ? 'text-red-500 animate-pulse' : 'text-slate-600 hover:text-brand-600'}`}>
                            {isPlaying ? <><StopCircle size={16}/> Stop Reading</> : <><Volume2 size={16}/> Read Aloud</>}
                        </button>
                        <a href={topic.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium">Original <ExternalLink size={14} /></a>
                    </div>
                </div>
            </div>

            {(examTips?.length || 0) > 0 && (
                <div className="m-6 md:m-10 p-6 bg-green-50 border border-green-100 rounded-xl">
                    <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2"><span className="text-xl">💡</span> Exam Strategy & Tips</h3>
                    <ul className="space-y-2">{examTips?.map((tip, i) => (<li key={i} className="text-green-800 text-sm flex gap-2"><span className="font-bold">•</span> {tip}</li>))}</ul>
                </div>
            )}

            <div className="p-6 md:p-10 md:pr-12">
                <div className="max-w-none">
                    {validSections.map((section) => (
                        <div key={section.id} id={section.id} className="scroll-mt-24 mb-16 last:mb-0 group/section">
                            {section.title && section.title !== 'Overview' && (
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 pb-2 border-b border-slate-100 gap-4">
                                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3"><span className="w-2 h-8 bg-brand-500 rounded-full inline-block" />{section.title}</h2>
                                    {hasAiKey && (
                                        <div className="flex flex-wrap gap-2 md:opacity-0 group-hover/section:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleAiActionClick(section.id, section.contentHtml, 'simplify')} 
                                                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:text-brand-600 hover:border-brand-300 rounded-full flex items-center gap-1 transition-all"
                                            >
                                                <HelpCircle size={14} /> Explain
                                            </button>
                                            <button 
                                                onClick={() => handleAiActionClick(section.id, section.contentHtml, 'expand')} 
                                                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:text-purple-600 hover:border-purple-300 rounded-full flex items-center gap-1 transition-all"
                                            >
                                                <Plus size={14} /> Expand
                                            </button>
                                            <button 
                                                onClick={() => handleAiActionClick(section.id, section.contentHtml, 'diagram')} 
                                                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:text-emerald-600 hover:border-emerald-300 rounded-full flex items-center gap-1 transition-all"
                                            >
                                                <ImageIcon size={14} /> Visual Aid
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="wiki-content prose prose-slate prose-lg max-w-none prose-headings:font-serif prose-headings:text-slate-800 prose-p:text-slate-600 prose-p:leading-relaxed prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-md" 
                                dangerouslySetInnerHTML={{ 
                                    __html: (section.contentHtml.includes('<ul>') || section.contentHtml.includes('<p>') || section.contentHtml.includes('<div')) 
                                        ? section.contentHtml 
                                        : parseMarkdownToHtml(section.contentHtml) 
                                }} 
                            />

                            {/* Smart Suggestion for Diagrams */}
                            {hasAiKey && /Diagram|Structure|Anatomy|Cycle|System|Process/i.test(section.title) && !extras[section.id] && !loadingExtras[section.id] && (
                                <div className="mt-8 p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
                                    <p className="text-slate-500 text-sm mb-4 font-medium">This section often requires visualization for better understanding.</p>
                                    <button 
                                        onClick={() => handleAiActionClick(section.id, section.contentHtml, 'diagram')} 
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm text-slate-700 hover:text-emerald-600 hover:border-emerald-300 rounded-lg transition-all text-sm font-semibold"
                                    >
                                        <ImageIcon size={16} /> Generate AI Diagram
                                    </button>
                                </div>
                            )}
                            
                            {loadingExtras[section.id] && <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center gap-2 text-slate-500 animate-pulse"><Sparkles size={16} /> Generating content...</div>}
                            {extras[section.id] && (
                                <div className="mt-6 p-6 rounded-xl border border-indigo-100 bg-indigo-50/50 animate-in fade-in slide-in-from-top-2 relative">
                                    <button onClick={() => setExtras(prev => { const newState = {...prev}; delete newState[section.id]; return newState; })} className="absolute top-2 right-2 text-indigo-300 hover:text-indigo-600"><div className="p-1"><div className="w-4 h-4 rounded-full border border-current text-[10px] flex items-center justify-center">X</div></div></button>
                                    <div className="flex items-center gap-2 mb-3 text-indigo-800 font-bold text-xs uppercase tracking-wider"><Sparkles size={14} /> {extras[section.id].type === 'diagram' ? 'AI Visual' : 'AI Analysis'}</div>
                                    {extras[section.id].type === 'diagram' ? (
                                        <div className="w-full overflow-hidden flex flex-col items-center bg-white p-4 rounded-lg border border-indigo-100 shadow-sm relative group/diagram">
                                            {/* Render Image OR SVG */}
                                            {(extras[section.id].content.startsWith('data:') || extras[section.id].content.startsWith('http')) ? (
                                                <img 
                                                    src={sanitizeDataUri(extras[section.id].content)} 
                                                    alt="AI Generated Diagram" 
                                                    className="w-full h-auto rounded-lg"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        // Fallback logic for actual SVG data
                                                        if (extras[section.id].content.includes('svg')) {
                                                            target.style.display = 'none';
                                                            const obj = document.createElement('object');
                                                            obj.data = sanitizeDataUri(extras[section.id].content);
                                                            obj.type = "image/svg+xml";
                                                            obj.className = "w-full h-auto rounded-lg";
                                                            target.parentNode?.appendChild(obj);
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div 
                                                    className="w-full [&_svg]:w-full [&_svg]:h-auto" 
                                                    dangerouslySetInnerHTML={{ __html: cleanSvgContent(extras[section.id].content) }} 
                                                />
                                            )}
                                            
                                            <button 
                                                onClick={() => downloadImage(extras[section.id].content, `${topic.title}-diagram`)}
                                                className="absolute bottom-2 right-2 bg-slate-900/80 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 opacity-0 group-hover/diagram:opacity-100 transition-opacity hover:bg-slate-900"
                                            >
                                                <Download size={12} /> Download
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm prose-indigo" dangerouslySetInnerHTML={{__html: parseMarkdownToHtml(extras[section.id].content)}} />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-yellow-50 border-b border-yellow-100 flex justify-between items-center">
                <h3 className="font-bold text-yellow-900 flex items-center gap-2"><Edit3 size={20} /> Professional Study Notes</h3>
            </div>
            <RichTextEditor initialContent={userNotes || ''} onSave={handleNotesChange} isSaving={isSavingNotes} />
        </div>

        {relatedTopics.length > 0 && (
            <div className="bg-slate-50 p-8 border-t border-slate-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-6 text-slate-700">
                    <LinkIcon size={20} />
                    <h3 className="font-bold text-lg">Continue Learning</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {relatedTopics.slice(0, 12).map((related, idx) => (
                        <button key={idx} onClick={() => onRelatedClick(related.title)} className="px-4 py-3 bg-white hover:bg-white hover:shadow-md hover:border-brand-300 border border-slate-200 text-slate-600 text-sm rounded-xl transition-all text-left truncate">{related.title}</button>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ContentSection;
