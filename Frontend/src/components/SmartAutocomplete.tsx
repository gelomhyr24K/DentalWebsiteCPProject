import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Loader2, Search } from 'lucide-react';
import {
  loadActiveMasterDirectoryItems,
  loadMasterDirectoryItems,
  type MasterDirectoryItem,
  type MasterDirectoryType,
} from '../services/masterDirectoryService';

interface SmartAutocompleteProps {
  directoryType: MasterDirectoryType;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (item: MasterDirectoryItem) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  includeInactive?: boolean;
  filterFn?: (item: MasterDirectoryItem, query: string) => boolean;
  renderItem?: (item: MasterDirectoryItem, isHighlighted: boolean) => ReactNode;
}

const searchTextForItem = (item: MasterDirectoryItem) => [
  item.name,
  item.code,
  item.description,
  item.dosage,
  item.frequency,
  item.duration,
  item.instructions,
  JSON.stringify(item.metadata || {}),
].filter(Boolean).join(' ').toLowerCase();

export function SmartAutocomplete({
  directoryType,
  value,
  onChange,
  onSelect,
  placeholder,
  disabled = false,
  className = '',
  includeInactive = false,
  filterFn,
  renderItem,
}: SmartAutocompleteProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<MasterDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [opensUpward, setOpensUpward] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadItems = async () => {
      setIsLoading(true);
      const result = includeInactive
        ? await loadMasterDirectoryItems(directoryType)
        : await loadActiveMasterDirectoryItems(directoryType);

      if (!isMounted) return;
      setIsLoading(false);
      setItems(result.ok ? result.data : []);
    };

    void loadItems();
    return () => {
      isMounted = false;
    };
  }, [directoryType, includeInactive]);

  const filteredItems = useMemo(() => {
    const query = value.trim().toLowerCase();
    const activeItems = includeInactive ? items : items.filter((item) => item.is_active && !item.archived_at);
    if (!query) return activeItems.slice(0, 12);

    return activeItems
      .filter((item) => filterFn ? filterFn(item, query) : searchTextForItem(item).includes(query))
      .slice(0, 12);
  }, [filterFn, includeInactive, items, value]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [value, directoryType]);

  const updateDropdownDirection = () => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    setOpensUpward(spaceBelow < 260 && rect.top > spaceBelow);
  };

  const openMenu = () => {
    updateDropdownDirection();
    setIsOpen(true);
  };

  const selectItem = (item: MasterDirectoryItem) => {
    onChange(item.name);
    onSelect?.(item);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      openMenu();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((index) => Math.min(index + 1, filteredItems.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && isOpen && filteredItems[highlightIndex]) {
      event.preventDefault();
      selectItem(filteredItems[highlightIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen && !disabled && (items.length > 0 || filteredItems.length > 0 || isLoading);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={openMenu}
        onChange={(event) => {
          onChange(event.target.value);
          openMenu();
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        className={className || 'w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400'}
      />

      {showDropdown && (
        <div
          className={`absolute left-0 z-50 max-h-72 w-full min-w-[240px] overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl ${
            opensUpward ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              Loading suggestions
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
              <Search size={14} />
              No matches
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isHighlighted = index === highlightIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setHighlightIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectItem(item);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                    isHighlighted ? 'bg-teal-50 text-teal-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {renderItem ? renderItem(item, isHighlighted) : (
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{item.name}</span>
                        {item.code && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{item.code}</span>}
                      </div>
                      {(item.description || item.dosage || item.price != null) && (
                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          {item.description || item.dosage || (item.price != null ? `PHP ${Number(item.price).toLocaleString('en-PH')}` : '')}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default SmartAutocomplete;
