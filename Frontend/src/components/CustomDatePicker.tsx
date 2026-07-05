import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';

type CustomDatePickerProps = {
  value: string | null;
  onChange: (dateString: string | null) => void;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
  className?: string;
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value: string | null | undefined) => {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
};

const formatDisplayDate = (value: string | null | undefined) => {
  const parsed = parseLocalDate(value);
  if (!parsed) return '';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const buildCalendarDays = (displayMonth: Date) => {
  const monthStart = startOfMonth(displayMonth);
  const firstGridDate = new Date(monthStart);
  firstGridDate.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(firstGridDate);
    cellDate.setDate(firstGridDate.getDate() + index);
    return {
      date: cellDate,
      key: formatLocalDate(cellDate),
      inCurrentMonth: cellDate.getMonth() === displayMonth.getMonth(),
    };
  });
};

const clampYear = (year: number, minYear: number, maxYear: number) => {
  if (year < minYear) return minYear;
  if (year > maxYear) return maxYear;
  return year;
};

export function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Select Specific Date',
  minYear = 1900,
  maxYear = 2100,
  className = '',
}: CustomDatePickerProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [displayMonth, setDisplayMonth] = useState<Date>(() => startOfMonth(parseLocalDate(value) || new Date()));
  const [yearInput, setYearInput] = useState(() => String((parseLocalDate(value) || new Date()).getFullYear()));

  const selectedDate = useMemo(() => parseLocalDate(value), [value]);
  const todayString = useMemo(() => formatLocalDate(new Date()), []);
  const selectedDateString = selectedDate ? formatLocalDate(selectedDate) : '';
  const days = useMemo(() => buildCalendarDays(displayMonth), [displayMonth]);

  useEffect(() => {
    const nextDate = parseLocalDate(value) || new Date();
    setDisplayMonth(startOfMonth(nextDate));
    setYearInput(String(nextDate.getFullYear()));
  }, [value]);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = dropdownRef.current?.offsetHeight || 388;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setOpenUpward(shouldOpenUpward);
      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        top: shouldOpenUpward ? Math.max(12, rect.top - dropdownHeight - 8) : Math.min(viewportHeight - dropdownHeight - 12, rect.bottom + 8),
        width: rect.width,
        zIndex: 220,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, openUpward]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const moveMonth = (offset: number) => {
    setDisplayMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
      const clamped = new Date(clampYear(next.getFullYear(), minYear, maxYear), next.getMonth(), 1);
      setYearInput(String(clamped.getFullYear()));
      return clamped;
    });
  };

  const handleMonthChange = (monthIndex: number) => {
    setDisplayMonth((prev) => new Date(prev.getFullYear(), monthIndex, 1));
  };

  const handleYearInputChange = (nextValue: string) => {
    const sanitized = nextValue.replace(/[^\d]/g, '').slice(0, 4);
    setYearInput(sanitized);
    if (sanitized.length === 4) {
      const nextYear = clampYear(Number(sanitized), minYear, maxYear);
      setDisplayMonth((prev) => new Date(nextYear, prev.getMonth(), 1));
      if (String(nextYear) !== sanitized) setYearInput(String(nextYear));
    }
  };

  const handleYearBlur = () => {
    if (!yearInput) {
      setYearInput(String(displayMonth.getFullYear()));
      return;
    }

    const clampedYear = clampYear(Number(yearInput), minYear, maxYear);
    setDisplayMonth((prev) => new Date(clampedYear, prev.getMonth(), 1));
    setYearInput(String(clampedYear));
  };

  const handleSelectDate = (date: Date) => {
    onChange(formatLocalDate(date));
    setIsOpen(false);
  };

  const dropdown = isOpen ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>

        <select
          value={displayMonth.getMonth()}
          onChange={(event) => handleMonthChange(Number(event.target.value))}
          className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {MONTHS.map((month, index) => (
            <option key={month} value={index}>
              {month}
            </option>
          ))}
        </select>

        <input
          type="text"
          inputMode="numeric"
          value={yearInput}
          onChange={(event) => handleYearInputChange(event.target.value)}
          onBlur={handleYearBlur}
          className="h-9 w-24 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          aria-label="Year"
        />

        <button
          type="button"
          onClick={() => moveMonth(1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label) => (
          <div key={label} className="py-2 text-center text-[10px] font-bold tracking-[0.18em] text-slate-400">
            {label}
          </div>
        ))}
        {days.map(({ date, key, inCurrentMonth }) => {
          const dateKey = formatLocalDate(date);
          const isSelected = selectedDateString === dateKey;
          const isToday = todayString === dateKey;

          let cellClassName = 'h-10 rounded-xl text-sm transition-colors';
          if (isSelected) {
            cellClassName += ' bg-sky-600 font-semibold text-white shadow-sm hover:bg-sky-700';
          } else if (isToday) {
            cellClassName += ' border border-sky-200 bg-sky-50 font-semibold text-sky-700 hover:bg-sky-100';
          } else if (inCurrentMonth) {
            cellClassName += ' text-slate-700 hover:bg-slate-100';
          } else {
            cellClassName += ' text-slate-300 hover:bg-slate-50';
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectDate(date)}
              className={cellClassName}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>{selectedDateString ? formatDisplayDate(selectedDateString) : placeholder}</span>
        <button
          type="button"
          onClick={() => {
            setDisplayMonth(startOfMonth(new Date()));
            setYearInput(String(new Date().getFullYear()));
          }}
          className="font-semibold text-slate-500 transition-colors hover:text-slate-700"
        >
          Today
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div ref={anchorRef} className={className}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-left transition-all focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <CalendarDays className="shrink-0 text-slate-400" size={16} />
        <span className={value ? 'text-sm text-slate-700' : 'text-sm text-slate-400'}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
      </button>
      {typeof document !== 'undefined' ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
