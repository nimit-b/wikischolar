
import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Download, Type, Highlighter, Save, FileText, FileCode, Printer } from 'lucide-react';

interface RichTextEditorProps {
  initialContent: string;
  onSave: (html: string) => void;
  isSaving?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ initialContent, onSave, isSaving }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && initialContent) {
      if (editorRef.current.innerHTML !== initialContent) {
        editorRef.current.innerHTML = initialContent;
      }
    }
  }, []);

  const exec = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) {
        // Auto-save debounced handled by parent usually, but here we just trigger state update
        // We pass the raw HTML up
        onSave(editorRef.current.innerHTML);
    }
  };

  const downloadFile = (type: 'html' | 'txt') => {
      if (!editorRef.current) return;
      
      const content = type === 'html' ? editorRef.current.innerHTML : editorRef.current.innerText;
      const mime = type === 'html' ? 'text/html' : 'text/plain';
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-notes.${type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
      if (!editorRef.current) return;
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
          printWindow.document.write('<html><head><title>Study Notes</title>');
          printWindow.document.write('<style>body{font-family: sans-serif; padding: 20px; line-height: 1.6;}</style>');
          printWindow.document.write('</head><body>');
          printWindow.document.write(editorRef.current.innerHTML);
          printWindow.document.write('</body></html>');
          printWindow.document.close();
          printWindow.print();
      }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1 items-center">
        <div className="flex bg-white rounded-lg border border-slate-200 p-1 mr-2">
            <button onClick={() => exec('bold')} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Bold"><Bold size={16} /></button>
            <button onClick={() => exec('italic')} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Italic"><Italic size={16} /></button>
            <button onClick={() => exec('underline')} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Underline"><Underline size={16} /></button>
        </div>

        <div className="flex bg-white rounded-lg border border-slate-200 p-1 mr-2">
            <button onClick={() => exec('insertUnorderedList')} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Bullet List"><List size={16} /></button>
            <button onClick={() => exec('insertOrderedList')} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Number List"><ListOrdered size={16} /></button>
        </div>

        <div className="flex bg-white rounded-lg border border-slate-200 p-1 mr-2">
            <div className="relative group">
                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-700 flex items-center gap-1">
                    <Type size={16} />
                </button>
                <div className="absolute top-full left-0 bg-white border border-slate-200 shadow-lg rounded-lg hidden group-hover:flex flex-col p-1 z-10 w-32">
                    <button onClick={() => exec('fontSize', '3')} className="p-2 text-left hover:bg-slate-50 text-sm">Normal</button>
                    <button onClick={() => exec('fontSize', '5')} className="p-2 text-left hover:bg-slate-50 text-lg font-bold">Large</button>
                    <button onClick={() => exec('fontSize', '7')} className="p-2 text-left hover:bg-slate-50 text-2xl font-bold">Huge</button>
                </div>
            </div>
            <button onClick={() => exec('backColor', 'yellow')} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Highlight"><Highlighter size={16} /></button>
        </div>

        <div className="flex-1" />

        <div className="flex bg-white rounded-lg border border-slate-200 p-1 items-center gap-1">
            <button onClick={() => downloadFile('html')} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Download HTML"><FileCode size={16} /></button>
            <button onClick={() => downloadFile('txt')} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Download Text"><FileText size={16} /></button>
            <button onClick={handlePrint} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Print/PDF"><Printer size={16} /></button>
        </div>
      </div>

      {/* Editor Area */}
      <div 
        ref={editorRef}
        contentEditable
        className="flex-1 p-6 overflow-y-auto focus:outline-none prose prose-slate max-w-none"
        onInput={handleInput}
        style={{ minHeight: '300px' }}
      />
      
      <div className="bg-slate-50 border-t border-slate-200 p-2 text-right text-xs text-slate-400 flex justify-between items-center px-4">
          <span>{isSaving ? 'Saving...' : 'Changes saved locally'}</span>
          <span className="flex items-center gap-1"><Save size={12} /> Auto-save active</span>
      </div>
    </div>
  );
};

export default RichTextEditor;
