import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { loadActiveMasterDirectoryItems } from '../services/masterDirectoryService';

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose: () => void;
  onSelect: (snippet: string) => void;
}

export function CommandPalette({
  isOpen = true,
  onClose,
  onSelect,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [snippets, setSnippets] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSnippets = async () => {
      const res = await loadActiveMasterDirectoryItems('clinical_snippets');
      if (isMounted && res.ok) {
        setSnippets(res.data);
      }
    };
    void fetchSnippets();
    return () => {
      isMounted = false;
    };
  }, []);

  const commands = snippets.map((item, idx) => ({
    trigger: item.code && item.code.startsWith('/') ? item.code : `/${item.code || item.name.toLowerCase().replace(/\s+/g, '')}`,
    title: item.name,
    subtitle: item.description || 'Clinical template',
    content: item.instructions || item.description || ''
  }));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const filtered = commands.filter(cmd =>
    cmd.trigger.toLowerCase().includes(search.toLowerCase()) ||
    cmd.title.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (filtered.length === 0 ? 0 : (prev + 1) % filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (filtered.length === 0 ? 0 : (prev - 1 + filtered.length) % filtered.length));
    } else if (e.key === 'Enter') {
      if (filtered[highlightedIndex]) {
        e.preventDefault();
        onSelect(filtered[highlightedIndex].content);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-900/40 backdrop-blur-xs flex items-start justify-center pt-[15vh] px-4">
      <div
        ref={containerRef}
        className="bg-white border border-zinc-250 shadow-2xl rounded-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-zinc-150 p-4">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search commands (e.g. /extraction, /ortho)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm text-zinc-800 outline-none bg-transparent"
          />
        </div>
        <div className="max-h-60 overflow-y-auto divide-y divide-zinc-50 p-2">
          {filtered.map((cmd, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <div
                key={cmd.trigger}
                onClick={() => {
                  onSelect(cmd.content);
                }}
                className={`px-4 py-2.5 rounded-xl cursor-pointer text-left transition-colors flex flex-col ${
                  isHighlighted ? 'bg-zinc-100 text-zinc-900 font-bold' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 font-mono">{cmd.trigger}</span>
                  <span className="text-[10px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{cmd.title}</span>
                </div>
                <span className="text-[11px] text-zinc-400 mt-0.5 font-semibold">{cmd.subtitle}</span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-4 text-center text-xs text-zinc-400 italic">
              No snippets matched your query.
            </div>
          )}
        </div>
        <div className="border-t border-zinc-150 p-2.5 bg-zinc-50 flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider px-4">
          <span>Navigate with ↑ ↓ and Press Enter to Insert</span>
          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-teal-600 animate-pulse" /> Command Snippet Engine</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
