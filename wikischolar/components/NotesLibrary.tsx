
import React, { useState, useEffect } from 'react';
import { Book, Trash2, Edit3, X, Download, FileText, Eye, FileCode, Printer, File, ArrowLeft, ExternalLink, Save } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

interface NotesLibraryProps {
  onClose: () => void;
  onLoadNote: (title: string, content: string) => void;
}

interface SavedNote {
  title: string;
  content: string;
  lastModified: number;
}

const NotesLibrary: React.FC<NotesLibraryProps> = ({ onClose, onLoadNote }) => {
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [viewingNote, setViewingNote] = useState<SavedNote | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadedNotes: SavedNote[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('wiki_notes_')) {
        const title = key.replace('wiki_notes_', '');
        const content = localStorage.getItem(key) || '';
        loadedNotes.push({ title, content, lastModified: Date.now() });
      }
    }
    setNotes(loadedNotes.sort((a, b) => a.title.localeCompare(b.title)));
  }, []);

  const handleDelete = (title: string) => {
    if (confirm(`Delete notes for "${title}"?`)) {
      localStorage.removeItem(`wiki_notes_${title}`);
      setNotes(prev => prev.filter(n => n.title !== title));
      if (viewingNote?.title === title) setViewingNote(null);
    }
  };

  const handleUpdateContent = (html: string) => {
      if (!viewingNote) return;
      setIsSaving(true);
      
      const updatedNote = { ...viewingNote, content: html, lastModified: Date.now() };
      setViewingNote(updatedNote);
      
      // Update local storage
      localStorage.setItem(`wiki_notes_${updatedNote.title}`, html);
      
      // Update list (in a real app, might want to debounce state update of list)
      setNotes(prev => prev.map(n => n.title === updatedNote.title ? updatedNote : n));
      
      // Simulate save delay for UI
      setTimeout(() => setIsSaving(false), 500);
  };

  const handleDownload = (note: SavedNote, format: 'html' | 'txt' | 'docx' | 'pdf') => {
      if (format === 'pdf') {
          const printWindow = window.open('', '', 'height=600,width=800');
          if (printWindow) {
              printWindow.document.write('<html><head><title>' + note.title + '</title>');
              printWindow.document.write('<style>body{font-family: serif; padding: 40px; line-height: 1.6; color: #333;} h1{border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;} img {max-width: 100%;}</style>');
              printWindow.document.write('</head><body>');
              printWindow.document.write(`<h1>${note.title}</h1>`);
              printWindow.document.write(note.content);
              printWindow.document.write('</body></html>');
              printWindow.document.close();
              printWindow.focus();
              setTimeout(() => {
                  printWindow.print();
                  printWindow.close();
              }, 500);
          }
          return;
      }

      if (format === 'docx') {
          // Create a blob that Word can open (MHTML or HTML with specific namespaces)
          const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
          const postHtml = "</body></html>";
          const html = preHtml + `<h1>${note.title}</h1>` + note.content + postHtml;
          
          const blob = new Blob(['\ufeff', html], {
              type: 'application/vnd.ms-word'
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${note.title.replace(/\s+/g, '_')}_Notes.doc`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
      }

      const type = format === 'html' ? 'text/html' : 'text/plain';
      const content = format === 'html' ? note.content : note.content.replace(/<[^>]*>/g, '\n');
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title}-notes.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                      <ArrowLeft size={20} />
                  </button>
                  <div className="flex items-center gap-2">
                      <div className="bg-yellow-100 p-1.5 rounded-lg text-yellow-700">
                          <Book size={20} />
                      </div>
                      <h1 className="font-bold text-slate-800 text-lg">My Notes Library</h1>
                  </div>
              </div>
          </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-64px)]">
            {/* Sidebar List */}
            <div className={`md:col-span-4 lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${viewingNote ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Saved Topics ({notes.length})</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {notes.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 px-4">
                            <Edit3 size={32} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No saved notes found.</p>
                            <p className="text-xs mt-2">Start studying a topic and use the "Notes" section to save content here.</p>
                        </div>
                    ) : (
                        notes.map((note) => (
                            <div 
                                key={note.title} 
                                onClick={() => setViewingNote(note)}
                                className={`group p-3 rounded-xl border cursor-pointer transition-all ${viewingNote?.title === note.title ? 'bg-brand-50 border-brand-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className={`font-bold text-sm truncate ${viewingNote?.title === note.title ? 'text-brand-700' : 'text-slate-700'}`}>{note.title}</h3>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(note.title); }}
                                        className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                    {note.content.replace(/<[^>]*>/g, ' ')}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content Pane */}
            <div className={`md:col-span-8 lg:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden ${!viewingNote ? 'hidden md:flex' : 'flex'}`}>
                {viewingNote ? (
                    <>
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <button onClick={() => setViewingNote(null)} className="md:hidden p-2 -ml-2 text-slate-500"><ArrowLeft size={20} /></button>
                                <h2 className="font-serif font-bold text-xl text-slate-900 truncate">{viewingNote.title}</h2>
                                {isSaving && <span className="text-xs text-slate-400 flex items-center gap-1 animate-pulse"><Save size={12}/> Saving...</span>}
                            </div>
                            
                            <div className="flex items-center gap-1 md:gap-2">
                                <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-1">
                                    <button onClick={() => handleDownload(viewingNote, 'pdf')} className="p-2 text-slate-600 hover:bg-white hover:text-red-600 rounded-md transition-all" title="Export PDF"><Printer size={18} /></button>
                                    <button onClick={() => handleDownload(viewingNote, 'docx')} className="p-2 text-slate-600 hover:bg-white hover:text-blue-600 rounded-md transition-all" title="Export Word"><File size={18} /></button>
                                    <button onClick={() => handleDownload(viewingNote, 'txt')} className="p-2 text-slate-600 hover:bg-white hover:text-slate-900 rounded-md transition-all" title="Export Text"><FileText size={18} /></button>
                                </div>
                                
                                <button 
                                    onClick={() => { onLoadNote(viewingNote.title, viewingNote.content); onClose(); }} 
                                    className="ml-2 flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-100 font-medium text-sm shadow-sm"
                                    title="Go back to the Wikipedia guide"
                                >
                                    <ExternalLink size={16} /> <span className="hidden sm:inline">Open Source Guide</span>
                                </button>
                            </div>
                        </div>
                        
                        {/* Mobile Export Menu */}
                        <div className="sm:hidden grid grid-cols-3 gap-1 p-2 bg-slate-50 border-b border-slate-100">
                             <button onClick={() => handleDownload(viewingNote, 'pdf')} className="flex flex-col items-center gap-1 p-2 bg-white border border-slate-200 rounded text-xs text-slate-600"><Printer size={16}/> PDF</button>
                             <button onClick={() => handleDownload(viewingNote, 'docx')} className="flex flex-col items-center gap-1 p-2 bg-white border border-slate-200 rounded text-xs text-slate-600"><File size={16}/> Word</button>
                             <button onClick={() => handleDownload(viewingNote, 'txt')} className="flex flex-col items-center gap-1 p-2 bg-white border border-slate-200 rounded text-xs text-slate-600"><FileText size={16}/> Text</button>
                        </div>

                        {/* Editor Integration - Keyed by title to force re-mount on switch */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                             <RichTextEditor 
                                key={viewingNote.title}
                                initialContent={viewingNote.content} 
                                onSave={handleUpdateContent} 
                                isSaving={isSaving}
                             />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <Book size={48} className="opacity-50" />
                        </div>
                        <p className="text-lg font-medium text-slate-500">Select a note to read or edit</p>
                        <p className="text-sm mt-2 max-w-xs text-center">Your notes are stored locally in your browser.</p>
                    </div>
                )}
            </div>
      </div>
    </div>
  );
};

export default NotesLibrary;
