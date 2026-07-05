import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2 } from 'lucide-react';
import { searchMasterDirectoryItems, type MasterDirectoryItem, type MasterDirectoryType } from '../services/masterDirectoryService';

interface MasterSmartAutocompleteProps {
  directoryType: MasterDirectoryType;
  value: string;
  onChange: (val: string) => void;
  onSelect?: (item: MasterDirectoryItem) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  renderItem?: (item: MasterDirectoryItem, isHighlighted: boolean) => React.ReactNode;
  minChars?: number;
  limit?: number;
}

export function MasterSmartAutocomplete({
  directoryType,
  value,
  onChange,
  onSelect,
  placeholder = 'Search...',
  disabled = false,
  className = 'relative w-full',
  inputClassName = 'w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:outline-none transition-colors',
  renderItem,
  minChars = 1,
  limit = 10,
}: MasterSmartAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<MasterDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [opensUpward, setOpensUpward] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUpward = spaceBelow < 250 && spaceAbove > spaceBelow;
      const dropdownMaxHeight = Math.max(160, Math.min(320, (shouldOpenUpward ? spaceAbove : spaceBelow) - 16));

      setOpensUpward(shouldOpenUpward);
      setCoords({
        top: shouldOpenUpward ? rect.top : rect.bottom,
        left: rect.left,
        width: rect.width,
        maxHeight: dropdownMaxHeight,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  // Load matches from database on typing
  useEffect(() => {
    if (!value.trim() || value.length < minChars || !isOpen) {
      setSuggestions([]);
      setHasSearched(false);
      setIsLoading(false);
      setHighlightedIndex(-1);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setHasSearched(false);

    const fetchSuggestions = async () => {
      const res = await searchMasterDirectoryItems(directoryType, value, limit);
      if (isMounted) {
        setIsLoading(false);
        setHasSearched(true);
        if (res.ok) {
          setSuggestions(res.data);
          setHighlightedIndex(res.data.length > 0 ? 0 : -1);
        } else {
          setSuggestions([]);
          setHighlightedIndex(-1);
        }
      }
    };

    const delayDebounce = setTimeout(() => {
      void fetchSuggestions();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounce);
    };
  }, [value, isOpen, directoryType, minChars, limit]);

  // Click outside to dismiss dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInput = containerRef.current?.contains(target);
      const clickedDropdown = dropdownRef.current?.contains(target);
      if (!clickedInput && !clickedDropdown) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    suggestionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if ((e.key === 'ArrowDown' || e.key === 'Enter') && value.trim().length >= minChars) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (suggestions.length === 0 ? -1 : (prev + 1) % suggestions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (suggestions.length === 0 ? -1 : (prev - 1 + suggestions.length) % suggestions.length));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
      e.preventDefault();
      const selectedItem = suggestions[highlightedIndex];
      onChange(selectedItem.name);
      onSelect?.(selectedItem);
      setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const defaultRenderItem = (item: MasterDirectoryItem, isHighlighted: boolean) => {
    const isService = directoryType === 'services';
    const isMedicine = directoryType === 'medicines';
    const isTag = directoryType === 'tags';
    const isTooth = [
      'tooth_status',
      'tooth_conditions',
      'tooth_prosthodontics',
      'tooth_surgery',
      'tooth_xray',
    ].includes(directoryType);

    if (isService) {
      return (
        <div className="flex flex-col text-left w-full">
          <div className="flex items-center justify-between font-bold text-zinc-900 gap-2">
            <span>{item.name}</span>
            {item.code && (
              <span className="bg-zinc-100 text-zinc-650 px-1 py-0.5 rounded text-[10px] font-mono font-black select-none">
                {item.code}
              </span>
            )}
          </div>
          {item.description && <span className="text-[10px] text-zinc-400 mt-0.5 truncate">{item.description}</span>}
          {item.price !== null && item.price !== undefined && (
            <span className="text-[10px] text-teal-600 font-extrabold mt-0.5">
              ₱{Number(item.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      );
    }

    if (isMedicine) {
      return (
        <div className="flex flex-col text-left w-full">
          <span className="font-bold text-zinc-900">{item.name}</span>
          {(item.dosage || item.description) && (
            <span className="text-[10px] text-zinc-400 mt-0.5 truncate">
              {item.dosage} {item.description ? `• ${item.description}` : ''}
            </span>
          )}
          {item.instructions && <span className="text-[10px] text-teal-600 font-mono mt-0.5 truncate">{item.instructions}</span>}
        </div>
      );
    }

    if (isTag) {
      return (
        <div className="flex items-center gap-2 text-left w-full">
          {item.color && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-zinc-200" style={{ backgroundColor: item.color }} />
          )}
          <span className="font-bold text-zinc-900">{item.name}</span>
        </div>
      );
    }

    if (isTooth) {
      return (
        <div className="flex items-center justify-between gap-2 text-left w-full">
          <div className="flex items-center gap-2">
            {item.color && (
              <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-zinc-200" style={{ backgroundColor: item.color }} />
            )}
            <span className="font-bold text-zinc-900">{item.name}</span>
          </div>
          {item.code && (
            <span className="bg-zinc-150 text-zinc-600 px-1 py-0.5 rounded text-[10px] font-mono font-bold select-none">
              {item.code}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col text-left w-full">
        <span className="font-bold text-zinc-900">{item.name}</span>
        {item.description && <span className="text-[10px] text-zinc-400 mt-0.5 truncate">{item.description}</span>}
      </div>
    );
  };

  const showDropdown = isOpen && !disabled && value.trim().length >= minChars;
  const showEmptyState = showDropdown && !isLoading && hasSearched && suggestions.length === 0;
  const dropdown = showDropdown ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: opensUpward ? 'auto' : `${coords.top + 8}px`,
        bottom: opensUpward ? `${window.innerHeight - coords.top + 8}px` : 'auto',
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        maxHeight: `${coords.maxHeight}px`,
        zIndex: 9999,
      }}
      className="overflow-y-auto rounded-xl border border-zinc-250 bg-white py-1 shadow-2xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold italic text-zinc-500">
          <Loader2 size={12} className="animate-spin text-teal-600" />
          Searching Master Directory...
        </div>
      ) : showEmptyState ? (
        <div className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs italic text-zinc-400">
          <Search size={12} />
          No matches found
        </div>
      ) : (
        suggestions.map((item, index) => {
          const isHighlighted = index === highlightedIndex;
          return (
            <button
              key={item.id}
              ref={(node) => {
                suggestionRefs.current[index] = node;
              }}
              type="button"
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(item.name);
                onSelect?.(item);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors ${
                isHighlighted ? 'bg-teal-50 font-semibold text-teal-900' : 'text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {renderItem ? renderItem(item, isHighlighted) : defaultRenderItem(item, isHighlighted)}
            </button>
          );
        })
      )}
    </div>
  ) : null;

  return (
    <div ref={containerRef} className={className}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={inputClassName}
      />

      {typeof document !== 'undefined' && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}

export default MasterSmartAutocomplete;
