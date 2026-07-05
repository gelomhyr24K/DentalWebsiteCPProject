import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Sparkles } from 'lucide-react';

interface SmartAutocompleteProps {
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (item: any) => void;
  masterKey: string;
  fallbackData: any[];
  searchField?: string;
  displayTemplate?: (item: any) => React.ReactNode;
  className?: string;
  inputClassName?: string;
}

export function SmartAutocomplete({
  placeholder = 'Type to search...',
  value,
  onChange,
  onSelect,
  masterKey,
  fallbackData,
  searchField = 'name',
  displayTemplate,
  className = 'relative w-full',
  inputClassName = 'w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:outline-none transition-colors'
}: SmartAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);

  const checkDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If there's less than 250px below and more space above, open upwards
      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  };

  useEffect(() => {
    if (isOpen && suggestions.length > 0) {
      checkDropdownPosition();
    }
  }, [isOpen, suggestions]);

  // Load latest data from localStorage, falling back to preloaded arrays
  const getMasterData = () => {
    try {
      const stored = localStorage.getItem(masterKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse master data for key', masterKey, e);
    }
    return fallbackData;
  };

  useEffect(() => {
    if (!value.trim() || !isOpen) {
      setSuggestions([]);
      setHighlightedIndex(-1);
      return;
    }

    const data = getMasterData();
    const query = value.toLowerCase();
    
    // Perform search against the search field or shortcutText (for tags)
    const filtered = data.filter((item: any) => {
      const fieldValue = String(item[searchField] || '').toLowerCase();
      const shortcutValue = String(item.shortcutText || '').toLowerCase();
      return fieldValue.includes(query) || shortcutValue.includes(query);
    });

    setSuggestions(filtered.slice(0, 10)); // limit to 10 suggestions for performance
    setHighlightedIndex(prev => Math.min(prev, filtered.length - 1));
  }, [value, isOpen, masterKey]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        const selectedItem = suggestions[highlightedIndex];
        onSelect(selectedItem);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={className}>
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={inputClassName}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div 
          className={`absolute left-0 right-0 max-h-72 overflow-y-auto bg-white border border-zinc-250 shadow-2xl rounded-xl z-[999] py-1 divide-y divide-zinc-50 ${
            dropdownPosition === 'top'
              ? 'bottom-full mb-1.5 animate-in fade-in slide-in-from-bottom-1 duration-100'
              : 'top-full mt-1.5 animate-in fade-in slide-in-from-top-1 duration-100'
          }`}
        >
          {suggestions.map((item, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <div
                key={item.id || index}
                onClick={() => {
                  onSelect(item);
                  setIsOpen(false);
                }}
                className={`px-3.5 py-2 cursor-pointer text-xs transition-colors flex items-center justify-between ${
                  isHighlighted ? 'bg-zinc-100 text-zinc-900 font-bold' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {displayTemplate ? (
                  displayTemplate(item)
                ) : (
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-zinc-900">{item[searchField]}</span>
                    {item.remarks && <span className="text-[10px] text-zinc-400">{item.remarks}</span>}
                    {item.dosage && <span className="text-[10px] text-teal-600 font-mono mt-0.5">{item.dosage}</span>}
                    {item.defaultAmount !== undefined && (
                      <span className="text-[10px] text-teal-600 font-bold mt-0.5">₱{item.defaultAmount.toLocaleString()}</span>
                    )}
                  </div>
                )}
                {isHighlighted && <Check className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose: () => void;
  onSelect: (snippet: string) => void;
  commands?: { trigger: string; title: string; subtitle: string; content: string }[];
}

export function CommandPalette({
  isOpen = true,
  onClose,
  onSelect,
  commands = [
    { trigger: '/extraction', title: 'Post-Extraction Care Snippet', subtitle: 'Insert extraction post-op advice', content: 'Apply pressure on gauze for 1 hour. Avoid spitting, smoking, or rinsing for 24 hours. Eat soft, cold foods.' },
    { trigger: '/ortho', title: 'Ortho Adjustment Snippet', subtitle: 'Insert bracket adjustment progress note', content: 'Ortho adjustment done today. Upper & lower archwire changed to 0.16 NiTi. Elastic chain applied.' },
    { trigger: '/hygiene', title: 'Oral Hygiene Snippet', subtitle: 'Insert oral prophylaxis advice', content: 'Plaque and calculus deposits completely scaled. Disclosing solution showed good compliance. Advised interdental flossing daily.' },
    { trigger: '/restoration', title: 'Light Cure Restoration Snippet', subtitle: 'Insert cavity filling notes', content: 'Composite light cure restoration of decay completed on tooth #. Shade matching perfect. Occlusion verified.' }
  ]
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
      setHighlightedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      if (filtered[highlightedIndex]) {
        e.preventDefault();
        onSelect(filtered[highlightedIndex].content);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-zinc-900/40 backdrop-blur-xs flex items-start justify-center pt-[15vh] px-4">
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
                  onClose();
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
