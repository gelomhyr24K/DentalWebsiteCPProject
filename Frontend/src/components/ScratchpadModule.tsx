import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Pin, Check } from 'lucide-react';

interface ScratchpadProps {
  patientData: any;
  setPatientData: (updater: any) => void;
}

const STICKY_COLORS = [
  { bg: 'bg-yellow-50 border-yellow-200 text-yellow-800', badge: 'bg-yellow-100' },
  { bg: 'bg-teal-50 border-teal-200 text-teal-800', badge: 'bg-teal-100' },
  { bg: 'bg-pink-50 border-pink-200 text-pink-800', badge: 'bg-pink-100' },
  { bg: 'bg-purple-50 border-purple-200 text-purple-800', badge: 'bg-purple-100' }
];

export const ScratchpadModule: React.FC<ScratchpadProps> = ({
  patientData,
  setPatientData
}) => {
  const [activeColorIdx, setActiveColorIdx] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const notes = patientData.notes || [];
  const itemsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(notes.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, notes.length);
  const paginatedNotes = notes.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    const newNote = {
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString().split('T')[0],
      title: title.trim() || 'Untitled Note',
      details: content.trim() || 'No contents written.',
      colorIdx: activeColorIdx,
      isPinned: false
    };

    setPatientData((prev: any) => ({
      ...prev,
      notes: [newNote, ...(prev.notes || [])]
    }));

    setTitle('');
    setContent('');
  };

  const handleTogglePin = (id: string) => {
    setPatientData((prev: any) => {
      const updated = prev.notes.map((n: any) => n.id === id ? { ...n, isPinned: !n.isPinned } : n);
      // Sort pinned to the top
      const sorted = [...updated].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      return { ...prev, notes: sorted };
    });
  };

  const handleDeleteNote = (id: string) => {
    setPatientData((prev: any) => ({
      ...prev,
      notes: prev.notes.filter((n: any) => n.id !== id)
    }));
  };

  const handleTextChange = (id: string, field: 'title' | 'details', text: string) => {
    setPatientData((prev: any) => ({
      ...prev,
      notes: prev.notes.map((n: any) => n.id === id ? { ...n, [field]: text } : n)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 font-display">Scratchpad Clinical Notes</h3>
          <p className="text-xs text-zinc-500">Unstructured operation stickies, quick logs, and clinical preferences auto-saved locally.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4 items-start">
        {/* Note Creator Form */}
        <div className="md:col-span-1">
          <form onSubmit={handleAddNote} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-bold text-zinc-800 text-sm font-display uppercase mb-2">Create Sticky Note</h4>
            
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Note Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Diagnostic check..."
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Details & Thoughts</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Type note details here..."
                rows={4}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Color Select Grid */}
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Select Accent Theme</label>
              <div className="flex items-center gap-2">
                {STICKY_COLORS.map((col, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveColorIdx(idx)}
                    className={`w-6 h-6 rounded-full border transition-all flex items-center justify-center ${col.bg} ${
                      activeColorIdx === idx ? 'ring-2 ring-teal-500/45 scale-110 shadow-sm' : ''
                    }`}
                  >
                    {activeColorIdx === idx && <Check size={10} />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <Plus size={14} />
              <span>Pin New Sticky Note</span>
            </button>
          </form>
        </div>

        {/* Notes Stickies Grid */}
        <div className="md:col-span-3 space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedNotes.map((note: any) => {
            const theme = STICKY_COLORS[note.colorIdx] || STICKY_COLORS[0];
            return (
              <div 
                key={note.id} 
                className={`border rounded-2xl p-4 shadow-sm relative flex flex-col justify-between transition-all hover:shadow min-h-[160px] ${theme.bg}`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <input
                      type="text"
                      value={note.title}
                      onChange={e => handleTextChange(note.id, 'title', e.target.value)}
                      className="font-bold text-sm bg-transparent border-none outline-none w-full border-b border-transparent focus:border-zinc-300 focus:bg-white/40 rounded px-0.5"
                    />
                    <button 
                      onClick={() => handleTogglePin(note.id)}
                      className={`p-1 rounded-full transition-colors ${note.isPinned ? 'text-teal-600 bg-white shadow-sm' : 'text-zinc-400 hover:bg-white/40'}`}
                      title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
                    >
                      <Pin size={12} className={note.isPinned ? 'fill-current' : ''} />
                    </button>
                  </div>
                  <textarea
                    value={note.details}
                    onChange={e => handleTextChange(note.id, 'details', e.target.value)}
                    rows={4}
                    className="text-xs bg-transparent border-none outline-none w-full resize-none focus:bg-white/40 rounded p-1 font-medium leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-black/5 pt-2 mt-2">
                  <span className="text-[9px] font-mono opacity-60">{note.date}</span>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1 rounded-full hover:bg-black/5 text-red-700/60 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
          {notes.length === 0 && (
            <div className="col-span-full py-16 text-center text-zinc-400 italic text-xs border border-dashed border-zinc-200 bg-white rounded-2xl">
              No sticky notes written on the scratchpad yet. Create one to keep trace notes.
            </div>
          )}
          </div>
          {notes.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[10px] font-semibold text-zinc-500">
                Showing {startIndex + 1}-{endIndex} of {notes.length} scratchpad notes
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                >
                  &lt; Prev
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${page === safeCurrentPage ? 'bg-teal-600 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                >
                  Next &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
