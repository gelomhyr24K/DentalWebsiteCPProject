import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PatientRecord } from '../../../types';
import { calculateAge, isUnderage } from '../../../utils/date';
import { 
  Search, Plus, MessageSquare, ChevronLeft, ChevronRight, 
  ArrowUpDown, Edit, Trash2, Calendar, ChevronDown, Bell, Grid, Users, RotateCcw, AlertTriangle, CheckCircle2,
  Settings, Shield, Key, Mail, HelpCircle, Download, Upload, LogOut, User
} from 'lucide-react';

interface PatientsListProps {
  records: PatientRecord[];
  onAddNew: () => void;
  onViewDetails: (record: PatientRecord) => void;
  onEditPatient: (record: PatientRecord) => void;
  onArchivePatient: (id: string) => void;
  navbarSearchQuery?: string;
  userRole?: string;
}

export default function PatientsList({ 
  records, 
  onAddNew, 
  onViewDetails, 
  onEditPatient, 
  onArchivePatient,
  navbarSearchQuery = '',
  userRole
}: PatientsListProps) {
  
  // Profile settings state (Allows live update of profile details in header!)
  const [profile, setProfile] = useState({
    name: 'Maria Jessica Tanarte',
    role: 'Clinic Owner',
    email: 'maria.tanarte@pj-dental.com'
  });

  // Notifications State
  const [notifications, setNotifications] = useState([
    { id: 'notif-1', text: 'New patient registered: Andres Bonifacio', date: 'Just now', read: false, type: 'info' },
    { id: 'notif-2', text: 'Upcoming appointment: Sophia Alvarez (2:00 PM)', date: 'Today', read: false, type: 'appointment' },
    { id: 'notif-3', text: 'Pending follow-up: Ricardo Dela Cruz', date: 'Yesterday', read: false, type: 'followup' },
    { id: 'notif-4', text: 'System Update: Clinic Ledger upgraded to v2.4', date: '2 days ago', read: true, type: 'system' },
    { id: 'notif-5', text: 'Unread announcement: Holiday clinic hours', date: '3 days ago', read: true, type: 'announcement' }
  ]);

  // Dropdown visibility states
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Filter States
  const [filterName, setFilterName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearchInput, setTagSearchInput] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [filterYear, setFilterYear] = useState('all');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'pedia' | 'adult'
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Custom Date Picker State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 5)); // June 2026 as starting focus

  // Applied Filter States (Triggers filter execution on "Go" button click)
  const [appliedFilters, setAppliedFilters] = useState({
    filterName: '',
    selectedTags: [] as string[],
    filterYear: 'all',
    filterType: 'all',
    dateFilter: null as Date | null
  });

  const datePickerRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // SMS Dialog State
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSuccess, setSmsSuccess] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  // Modal Edit States
  const [editName, setEditName] = useState(profile.name);
  const [editRole, setEditRole] = useState(profile.role);
  const [editEmail, setEditEmail] = useState(profile.email);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [clinicName, setClinicName] = useState('P&J Tanarte Dental Clinic');
  const [clinicPhone, setClinicPhone] = useState('0917-123-4567');
  const [clinicAddress, setClinicAddress] = useState('Imus, Cavite, Philippines');
  const [smsEnabled, setSmsEnabled] = useState(true);

  // Success Indicators
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Sorting State
  // Sort field: 'name' | 'lastRecall' | 'balance' | 'id' | null
  const [sortField, setSortField] = useState<'name' | 'lastRecall' | 'balance' | 'id'>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (datePickerRef.current && !datePickerRef.current.contains(target)) {
        setIsDatePickerOpen(false);
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(target)) {
        setIsTagDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const AVAILABLE_TAGS = ['OP', 'LAXEXPER-OPD', 'Liwayway', 'Lyceum', 'Yazaki', 'general', 'ortho', 'pedio'];

  // Filter & Search Logic
  const handleGo = () => {
    setAppliedFilters({
      filterName,
      selectedTags: [...selectedTags],
      filterYear,
      filterType,
      dateFilter: selectedDate
    });
    setCurrentPage(1);
  };

  const handleClear = () => {
    setFilterName('');
    setSelectedTags([]);
    setTagSearchInput('');
    setFilterYear('all');
    setFilterType('all');
    setSelectedDate(null);
    setAppliedFilters({
      filterName: '',
      selectedTags: [],
      filterYear: 'all',
      filterType: 'all',
      dateFilter: null
    });
    setCurrentPage(1);
  };

  // Clickable Show Total Patients callback
  const handleShowAllAndReset = () => {
    handleClear();
  };

  // Toggle sort direction on column headers
  const handleSort = (field: 'name' | 'lastRecall' | 'balance' | 'id') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Master records filter
  const filteredRecords = useMemo(() => {
    let result = records.filter(record => !record.isArchived);

    // Use the stored patient tags without any automatic default/deterministic tag assignment
    result = result.map(record => ({
      ...record,
      tags: record.tags || []
    }));

    // 0. Navbar Search (Advanced optimized search)
    if (navbarSearchQuery) {
      const q = navbarSearchQuery.toLowerCase().trim();
      result = result.filter(r => {
        const fullName = `${r.personalInfo.firstName} ${r.personalInfo.lastName}`.toLowerCase();
        const reverseName = `${r.personalInfo.lastName} ${r.personalInfo.firstName}`.toLowerCase();
        const nickname = (r.personalInfo.nickname || '').toLowerCase();
        const mobile = r.personalInfo.mobile || '';
        const email = (r.personalInfo.email || '').toLowerCase();
        const birthdate = r.personalInfo.birthdate || '';
        const hmo = (r.personalInfo.hmo || '').toLowerCase();
        const address = (r.personalInfo.address || '').toLowerCase();
        const id = r.id.toLowerCase();
        const age = calculateAge(r.personalInfo.birthdate).toString();
        const lastVisit = (r.dentalHistory?.lastVisit || '').toLowerCase();

        return fullName.includes(q) ||
               reverseName.includes(q) ||
               nickname.includes(q) ||
               mobile.includes(q) ||
               email.includes(q) ||
               birthdate.includes(q) ||
               hmo.includes(q) ||
               address.includes(q) ||
               id.includes(q) ||
               age === q ||
               lastVisit.includes(q);
      });
    }

    // 1. Filter by Lastname, Firstname (supports comma separation, duplicates, exact or partial matching)
    if (appliedFilters.filterName) {
      const q = appliedFilters.filterName.toLowerCase().trim();
      result = result.filter(r => {
        const first = r.personalInfo.firstName.toLowerCase();
        const last = r.personalInfo.lastName.toLowerCase();
        const fullNameSpace = `${first} ${last}`;
        const reverseNameSpace = `${last} ${first}`;
        const commaSpace = `${last}, ${first}`;

        // Support commas (e.g. "Dela Cruz, Juan")
        if (q.includes(',')) {
          const parts = q.split(',').map(p => p.trim());
          if (parts.length >= 2) {
            const [lastPart, firstPart] = parts;
            return last.includes(lastPart) && first.includes(firstPart);
          }
        }

        return last === q ||
               first === q ||
               fullNameSpace === q ||
               reverseNameSpace === q ||
               commaSpace === q ||
               fullNameSpace.includes(q) ||
               reverseNameSpace.includes(q) ||
               last.includes(q) ||
               first.includes(q);
      });
    }

    // 2. Filter by Tags (multi-select match - patient must match all selected tags)
    if (appliedFilters.selectedTags && appliedFilters.selectedTags.length > 0) {
      result = result.filter(r => 
        appliedFilters.selectedTags.every(tag => 
          r.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
        )
      );
    }

    // 3. Filter by Year (of Registration / First Visit)
    if (appliedFilters.filterYear !== 'all') {
      result = result.filter(r => {
        const year = new Date(r.createdAt).getFullYear().toString();
        return year === appliedFilters.filterYear;
      });
    }

    // 4. Filter by Type (Age-based automatic categorization: Pedia < 22, Adult >= 22)
    if (appliedFilters.filterType !== 'all') {
      result = result.filter(r => {
        const age = calculateAge(r.personalInfo.birthdate);
        if (appliedFilters.filterType === 'pedia') {
          return age < 22; // Pedia
        } else if (appliedFilters.filterType === 'adult') {
          return age >= 22; // Adult
        }
        return true;
      });
    }

    // 5. Custom Date filter
    if (appliedFilters.dateFilter) {
      const selYear = appliedFilters.dateFilter.getFullYear();
      const selMonth = appliedFilters.dateFilter.getMonth();
      const selDay = appliedFilters.dateFilter.getDate();
      result = result.filter(r => {
        const d = new Date(r.createdAt);
        return d.getFullYear() === selYear && d.getMonth() === selMonth && d.getDate() === selDay;
      });
    }

    // Apply Sorting
    result.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'id') {
        valA = a.id;
        valB = b.id;
      } else if (sortField === 'name') {
        valA = `${a.personalInfo.lastName}, ${a.personalInfo.firstName}`.toLowerCase();
        valB = `${b.personalInfo.lastName}, ${b.personalInfo.firstName}`.toLowerCase();
      } else if (sortField === 'lastRecall') {
        valA = a.lastRecall || '';
        valB = b.lastRecall || '';
      } else if (sortField === 'balance') {
        valA = a.balance || 0;
        valB = b.balance || 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [records, appliedFilters, sortField, sortDirection, navbarSearchQuery]);

  // Paginated records helper
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;

  // Custom Calendar Day Cells builder with leading and trailing filler days
  const daysInMonth = useMemo(() => {
    const yr = calendarMonth.getFullYear();
    const mn = calendarMonth.getMonth();
    
    const firstDayIndex = new Date(yr, mn, 1).getDay(); // Sunday-start index (0-6)
    const totalDaysCurrent = new Date(yr, mn + 1, 0).getDate();
    const totalDaysPrev = new Date(yr, mn, 0).getDate();
    
    const cells: { day: number; isFiller: boolean; monthOffset: -1 | 0 | 1; date: Date }[] = [];
    
    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = totalDaysPrev - i;
      const prevMonthDate = new Date(yr, mn - 1, d);
      cells.push({
        day: d,
        isFiller: true,
        monthOffset: -1,
        date: prevMonthDate
      });
    }
    
    // Current month days
    for (let d = 1; d <= totalDaysCurrent; d++) {
      const currentDate = new Date(yr, mn, d);
      cells.push({
        day: d,
        isFiller: false,
        monthOffset: 0,
        date: currentDate
      });
    }
    
    // Next month filler days
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonthDate = new Date(yr, mn + 1, d);
      cells.push({
        day: d,
        isFiller: true,
        monthOffset: 1,
        date: nextMonthDate
      });
    }
    
    return cells;
  }, [calendarMonth]);

  const changeCalendarMonth = (offset: number) => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const handleSelectDay = (day: number, monthOffset: -1 | 0 | 1 = 0) => {
    let year = calendarMonth.getFullYear();
    let month = calendarMonth.getMonth();
    
    if (monthOffset !== 0) {
      const offsetDate = new Date(year, month + monthOffset, 1);
      year = offsetDate.getFullYear();
      month = offsetDate.getMonth();
      setCalendarMonth(offsetDate);
    }
    
    const date = new Date(year, month, day);
    setSelectedDate(date);
    setIsDatePickerOpen(false);
  };

  const formatSelectedDate = (date: Date | null) => {
    if (!date) return 'Select Specific Date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      


      {/* Main patients section title */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight font-display flex items-baseline gap-2">
          Patients
          <span className="text-xs font-medium text-zinc-400">Clinic patients list.</span>
        </h1>
      </div>

      {/* Primary Filtering toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
        
        {/* Name and Tag Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Last Name / First Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Filter by: Last Name / First Name</label>
            <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-zinc-100 focus-within:border-zinc-900 transition-all bg-white shadow-2xs">
              <span className="pl-3.5 text-zinc-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Type name (e.g. Dela Cruz, Juan)"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="w-full px-3 py-2.5 text-xs outline-hidden text-zinc-800 placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Filter by Tags */}
          <div className="space-y-1.5" ref={tagDropdownRef}>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Filter by Tags:</label>
            <div className="relative border border-zinc-200 rounded-xl focus-within:ring-2 focus-within:ring-zinc-100 focus-within:border-zinc-900 transition-all bg-white p-1 flex flex-wrap items-center gap-1 min-h-[42px] shadow-2xs">
              {/* Selected Tag Chips inside input box for ultimate styling */}
              {selectedTags.map(tag => (
                <span 
                  key={tag} 
                  className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-800 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-zinc-200 shrink-0"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                    className="hover:text-red-500 font-bold ml-0.5 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder={selectedTags.length === 0 ? "Search tags..." : ""}
                value={tagSearchInput}
                onChange={(e) => {
                  setTagSearchInput(e.target.value);
                  setIsTagDropdownOpen(true);
                }}
                onFocus={() => setIsTagDropdownOpen(true)}
                className="flex-1 min-w-[80px] px-2 py-1.5 text-xs outline-hidden text-zinc-800 placeholder:text-zinc-400 bg-transparent"
              />

              {/* Searchable tag options dropdown */}
              {isTagDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-30 max-h-40 overflow-y-auto divide-y divide-zinc-50">
                  {AVAILABLE_TAGS.filter(tag => 
                    tag.toLowerCase().includes(tagSearchInput.toLowerCase()) && 
                    !selectedTags.includes(tag)
                  ).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSelectedTags(prev => [...prev, tag]);
                        setTagSearchInput('');
                        setIsTagDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 text-zinc-700 font-bold flex items-center justify-between cursor-pointer"
                    >
                      <span>{tag}</span>
                      <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Select</span>
                    </button>
                  ))}
                  {AVAILABLE_TAGS.filter(tag => 
                    tag.toLowerCase().includes(tagSearchInput.toLowerCase()) && 
                    !selectedTags.includes(tag)
                  ).length === 0 && (
                    <div className="px-3 py-2.5 text-xs text-zinc-400 font-medium">No matching tags</div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Second Row of Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3.5 pt-3.5 border-t border-zinc-100 items-end">
          
          {/* Patient of Year */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Patient of:</label>
            <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
              <span className="px-3 text-xs font-bold text-zinc-500 bg-zinc-100/50 border-r border-zinc-200 py-2.5">Year</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-xs font-bold outline-hidden text-zinc-700 cursor-pointer"
              >
                <option value="all">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>
          </div>

          {/* Type Filter */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Type:</label>
            <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
              <span className="px-3 text-xs font-bold text-zinc-500 bg-zinc-100/50 border-r border-zinc-200 py-2.5">Category</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-xs font-bold outline-hidden text-zinc-700 cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="pedia">Pedia (18–21)</option>
                <option value="adult">Adult (22+)</option>
              </select>
            </div>
          </div>

          {/* Specific Date Picker */}
          <div className="md:col-span-4 relative" ref={datePickerRef}>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Select Specific Date:</label>
            <button
              onClick={() => setIsDatePickerOpen(prev => !prev)}
              type="button"
              className={`w-full flex items-center justify-between px-3.5 py-2.5 border rounded-xl text-xs font-bold transition-all shadow-2xs ${
                selectedDate 
                  ? 'bg-zinc-900 border-zinc-900 text-white shadow-xs' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer'
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                {formatSelectedDate(selectedDate)}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Custom Popover Calendar dropdown */}
            {isDatePickerOpen && (
              <div className="absolute top-full mt-2 left-0 z-50 w-72 bg-white rounded-2xl border border-zinc-200 shadow-xl p-3.5 animate-in fade-in slide-in-from-top-3 duration-150">
                <div className="flex items-center justify-between mb-3 gap-1">
                  <button
                    type="button"
                    onClick={() => changeCalendarMonth(-1)}
                    className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-600 cursor-pointer flex items-center justify-center border border-zinc-200"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex gap-1.5">
                    <select
                      value={calendarMonth.getMonth()}
                      onChange={(e) => {
                        const newMonth = new Date(calendarMonth.getFullYear(), parseInt(e.target.value), 1);
                        setCalendarMonth(newMonth);
                      }}
                      className="text-[11px] font-bold text-zinc-855 bg-zinc-50 border border-zinc-200 rounded-lg py-1 px-2 cursor-pointer outline-hidden focus:ring-1 focus:ring-zinc-400"
                    >
                      {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={calendarMonth.getFullYear()}
                      onChange={(e) => {
                        const newMonth = new Date(parseInt(e.target.value), calendarMonth.getMonth(), 1);
                        setCalendarMonth(newMonth);
                      }}
                      className="text-[11px] font-bold text-zinc-855 bg-zinc-50 border border-zinc-200 rounded-lg py-1 px-2 cursor-pointer outline-hidden focus:ring-1 focus:ring-zinc-400"
                    >
                      {Array.from({ length: 131 }, (_, i) => 1930 + i).map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => changeCalendarMonth(1)}
                    className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-600 cursor-pointer flex items-center justify-center border border-zinc-200"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Days of Week */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-zinc-400 mb-1 tracking-wider uppercase">
                  <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                </div>

                {/* Days numbers Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {daysInMonth.map((cell, idx) => {
                    const isToday = new Date().toDateString() === cell.date.toDateString();
                    const isSelected = selectedDate && selectedDate.toDateString() === cell.date.toDateString();

                    return (
                      <button
                        key={`day-${idx}`}
                        type="button"
                        onClick={() => handleSelectDay(cell.day, cell.monthOffset)}
                        className={`py-1 text-xs font-semibold rounded-lg hover:bg-zinc-100 cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-zinc-900 text-white hover:bg-zinc-800' 
                            : cell.isFiller
                            ? 'text-zinc-300 opacity-50 font-normal'
                            : isToday 
                            ? 'bg-teal-50 text-teal-700 border border-teal-150' 
                            : 'text-zinc-700'
                        }`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>

                {/* Reset button inside calendar */}
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(null);
                      setIsDatePickerOpen(false);
                    }}
                    className="w-full mt-3 pt-2 border-t border-zinc-100 text-[11px] font-extrabold text-red-500 hover:underline text-center block cursor-pointer"
                  >
                    Clear Date Filter
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Go / Clear button group */}
          <div className="md:col-span-2 flex items-center gap-1.5">
            <button
              onClick={handleGo}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold py-2.5 rounded-xl text-center cursor-pointer shadow-xs transition-all flex items-center justify-center"
            >
              Go
            </button>
            <button
              onClick={handleClear}
              className="flex-1 bg-zinc-150 hover:bg-zinc-200 text-zinc-700 text-xs font-extrabold py-2.5 rounded-xl text-center cursor-pointer border border-zinc-200 transition-all"
            >
              Clear
            </button>
          </div>

        </div>

        {/* New Patient and Bulk SMS quick action bar */}
        <div className="flex flex-wrap items-center justify-end gap-3 px-1.5 pt-3.5 border-t border-zinc-100/70">
          <button
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold px-4.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer animate-none"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5px]" /> New Patient
          </button>
          <button 
            onClick={() => {
              setSmsSuccess(false);
              setSmsMessage('');
              setActiveModal('sms-modal');
            }}
            className="inline-flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-extrabold px-4.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer animate-none"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Bulk SMS
          </button>
        </div>

      </div>

      {/* Pagination & Total count Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1.5">
        
        {/* Custom styled pagination */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors font-medium flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>
          
          {/* Numbers buttons with ellipse if too many */}
          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
            // Limit showing pagination numbers for beauty
            if (totalPages > 6 && Math.abs(currentPage - pageNum) > 2 && pageNum !== 1 && pageNum !== totalPages) {
              if (pageNum === 2 || pageNum === totalPages - 1) {
                return <span key={`ellipse-${pageNum}`} className="px-1 text-zinc-400">...</span>;
              }
              return null;
            }

            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8.5 h-8.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors font-medium flex items-center gap-1 cursor-pointer"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clicking Total Patients resets all filters as requested */}
        <button
          onClick={handleShowAllAndReset}
          className="text-sm text-zinc-500 hover:text-cyan-600 transition-colors font-semibold flex items-center gap-1.5 bg-white border border-zinc-200 rounded-xl px-4 py-2 cursor-pointer shadow-3xs"
          title="Click to show all patients & reset filters"
        >
          Total Patients: <strong className="text-zinc-900 font-extrabold">{filteredRecords.length}</strong>
        </button>

      </div>

      {/* Main Patients Directory Custom Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="patients-custom-table">
            <thead>
              <tr className="bg-zinc-50/50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200/60 select-none">
                <th className="py-3.5 px-3 text-center w-12">#</th>
                <th className="py-3.5 px-3 text-center w-16">Actions</th>
                <th 
                  onClick={() => handleSort('id')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-zinc-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    ID
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-zinc-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    ↑ Name
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Address</th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4">First visit</th>
                <th 
                  onClick={() => handleSort('lastRecall')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-zinc-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    ↑ Last recall
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('balance')}
                  className="py-3.5 px-6 cursor-pointer hover:bg-zinc-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    ↑ Balance
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {paginatedRecords.map((record, index) => {
                const age = calculateAge(record.personalInfo.birthdate);
                const isMinor = isUnderage(record.personalInfo.birthdate);
                const rowNum = (currentPage - 1) * itemsPerPage + index + 1;
                
                // Format dates elegantly
                const firstVisitDateStr = new Date(record.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });

                const lastRecallDateStr = record.lastRecall ? new Date(record.lastRecall).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) : 'None';

                const balanceAmount = record.balance !== undefined ? record.balance : 0;
                
                return (
                  <tr 
                    key={record.id} 
                    className="hover:bg-zinc-50/40 transition-colors group"
                  >
                    {/* Index cell */}
                    <td className="py-4.5 px-3 text-center text-xs font-semibold text-zinc-400">
                      {rowNum}
                    </td>

                    {/* Actions Cell showing edit and archive icons exactly like screenshot */}
                    <td className="py-4.5 px-3 text-center align-middle">
                      <div className="flex flex-col items-center justify-center gap-1">
                        {/* Green Edit Icon */}
                        <button
                          onClick={() => onEditPatient(record)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          title="Edit Patient Details"
                        >
                          <Edit className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        {/* Red Trash/Archive Icon */}
                        {userRole !== 'Staff Member' && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to archive ${record.personalInfo.lastName}, ${record.personalInfo.firstName}?`)) {
                                onArchivePatient(record.id);
                              }
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Archive Patient"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* ID column */}
                    <td className="py-4.5 px-4 font-bold text-zinc-500 text-xs">
                      {record.id}
                    </td>

                    {/* Name column - bright blue/teal and bold, opens detail view */}
                    <td className="py-4.5 px-4">
                      <button
                        onClick={() => onViewDetails(record)}
                        className="text-cyan-600 hover:text-cyan-700 font-extrabold text-left hover:underline uppercase block leading-tight cursor-pointer"
                      >
                        {record.personalInfo.lastName}, {record.personalInfo.firstName}
                      </button>
                      {record.tags && record.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {record.tags.map(tag => (
                            <span key={tag} className="text-[9px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-500 px-1.5 py-0.2 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Address in uppercase */}
                    <td className="py-4.5 px-4 text-xs font-semibold text-zinc-600 max-w-[200px] truncate uppercase" title={record.personalInfo.address}>
                      {record.personalInfo.address}
                    </td>

                    {/* Mobile phone number */}
                    <td className="py-4.5 px-4 font-semibold text-zinc-700 text-xs whitespace-nowrap">
                      {record.personalInfo.mobile}
                    </td>

                    {/* First visit vertically layout (Month Day / Year) */}
                    <td className="py-4.5 px-4 text-xs leading-normal whitespace-nowrap">
                      <div className="font-bold text-zinc-800">
                        {firstVisitDateStr.split(',')[0]}
                      </div>
                      <div className="text-zinc-400 font-medium">
                        {firstVisitDateStr.split(',')[1]}
                      </div>
                    </td>

                    {/* Last recall date */}
                    <td className="py-4.5 px-4 text-xs font-semibold text-zinc-700 whitespace-nowrap">
                      {lastRecallDateStr}
                    </td>

                    {/* Balance right-aligned, bold, styled */}
                    <td className="py-4.5 px-6 text-right font-extrabold text-zinc-900 whitespace-nowrap text-sm">
                      ₱{balanceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Users className="w-8 h-8 text-zinc-300 mx-auto" />
                      <p className="text-sm text-zinc-500 font-medium">No dental patient records match your criteria.</p>
                      <button
                        onClick={handleClear}
                        className="text-xs text-zinc-900 hover:underline font-bold"
                      >
                        Reset search & filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUCCESS TOAST NOTIFICATION CONTAINER */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* POPUP MODALS SYSTEM */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-zinc-50 border-b border-zinc-150 flex items-center justify-between shrink-0">
              <span className="text-sm font-black text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                {activeModal === 'sms-modal' && <MessageSquare className="w-4 h-4 text-cyan-600" />}
                {activeModal === 'settings' && <Settings className="w-4 h-4 text-teal-600" />}
                {activeModal === 'edit-profile' && <User className="w-4 h-4 text-emerald-600" />}
                {activeModal === 'change-password' && <Key className="w-4 h-4 text-indigo-600" />}
                {activeModal === 'change-email' && <Mail className="w-4 h-4 text-amber-600" />}
                {activeModal === 'manage' && <Shield className="w-4 h-4 text-teal-600" />}
                {activeModal === 'user-guide' && <HelpCircle className="w-4 h-4 text-zinc-600" />}
                {activeModal === 'logout' && <LogOut className="w-4 h-4 text-red-650" />}
                
                {activeModal === 'sms-modal' && 'Send Bulk SMS Dispatch'}
                {activeModal === 'settings' && 'Clinic Configurations'}
                {activeModal === 'edit-profile' && 'Modify User Profile'}
                {activeModal === 'change-password' && 'Reset Secure Password'}
                {activeModal === 'change-email' && 'Modify System Email'}
                {activeModal === 'manage' && 'Clinic Backup Manager'}
                {activeModal === 'user-guide' && 'Clinic Operations Manual'}
                {activeModal === 'logout' && 'Secure Session Logout'}
              </span>
              <button 
                onClick={() => setActiveModal(null)}
                className="text-zinc-400 hover:text-zinc-600 font-extrabold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Container with scroll */}
            <div className="p-5 overflow-y-auto space-y-4 text-zinc-700 text-xs">
              
              {/* 1. BULK SMS DISPATCH MODAL */}
              {activeModal === 'sms-modal' && (
                <div className="space-y-4">
                  <div className="p-3 bg-cyan-50/50 rounded-xl border border-cyan-100 text-cyan-800 leading-normal">
                    You are sending a bulk text message to all <strong>{filteredRecords.length}</strong> patients matching the current active filter criteria.
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase">Text message body:</label>
                    <textarea
                      placeholder="Type your clinical reminder or advisory SMS here..."
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      className="w-full h-32 p-3 border border-zinc-200 rounded-xl outline-hidden focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 bg-zinc-50 text-xs font-semibold leading-relaxed text-zinc-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-bold text-zinc-500 uppercase">Recipients list Preview ({Math.min(5, filteredRecords.length)} shown):</span>
                    <div className="max-h-24 overflow-y-auto border border-zinc-150 rounded-xl bg-zinc-50/50 p-2 divide-y divide-zinc-100">
                      {filteredRecords.slice(0, 5).map(r => (
                        <div key={r.id} className="py-1 flex items-center justify-between text-[10px] font-bold text-zinc-500">
                          <span className="uppercase text-zinc-700">{r.personalInfo.lastName}, {r.personalInfo.firstName}</span>
                          <span>{r.personalInfo.mobile}</span>
                        </div>
                      ))}
                      {filteredRecords.length > 5 && (
                        <div className="py-1 text-center text-[9px] font-extrabold text-cyan-600 uppercase tracking-wider">
                          + {filteredRecords.length - 5} more patients
                        </div>
                      )}
                    </div>
                  </div>

                  {smsSuccess && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-150 text-emerald-800 font-bold flex items-center gap-2 animate-bounce">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      Bulk SMS sent successfully!
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={smsSending || !smsMessage.trim()}
                      onClick={() => {
                        setSmsSending(true);
                        setTimeout(() => {
                          setSmsSending(false);
                          setSmsSuccess(true);
                          setTimeout(() => {
                            setActiveModal(null);
                            showSuccess(`Bulk SMS successfully dispatched to ${filteredRecords.length} contacts!`);
                          }, 1500);
                        }, 1200);
                      }}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white rounded-xl font-black cursor-pointer shadow-xs"
                    >
                      {smsSending ? 'Broadcasting...' : `Send to ${filteredRecords.length} Patients`}
                    </button>
                  </div>
                </div>
              )}

              {/* 2. CLINIC CONFIGURATIONS */}
              {activeModal === 'settings' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase">Clinic name:</label>
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-bold text-zinc-800"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase">Clinic hot line phone:</label>
                    <input
                      type="text"
                      value={clinicPhone}
                      onChange={(e) => setClinicPhone(e.target.value)}
                      className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-bold text-zinc-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase">Registered address:</label>
                    <input
                      type="text"
                      value={clinicAddress}
                      onChange={(e) => setClinicAddress(e.target.value)}
                      className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-bold text-zinc-800"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <div>
                      <span className="font-bold text-zinc-800 block">Enable Automated Recalls</span>
                      <span className="text-[10px] text-zinc-400 font-semibold">Sends SMS notices on patient recall intervals</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsEnabled}
                      onChange={(e) => setSmsEnabled(e.target.checked)}
                      className="w-4 h-4 accent-teal-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        showSuccess('Clinic configurations saved successfully!');
                      }}
                      className="px-4 py-2 bg-teal-650 hover:bg-teal-700 text-white rounded-xl font-black cursor-pointer shadow-xs"
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              )}

              {/* 3. EDIT PROFILE */}
              {activeModal === 'edit-profile' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase">Full owner name:</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-bold text-zinc-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase">System role / designation:</label>
                    <input
                      type="text"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-bold text-zinc-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase">System login email:</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-bold text-zinc-800"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfile({
                          name: editName,
                          role: editRole,
                          email: editEmail
                        });
                        setActiveModal(null);
                        showSuccess('User Profile updated successfully!');
                      }}
                      className="px-4 py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl font-black cursor-pointer shadow-xs"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* 4. CHANGE PASSWORD */}
              {activeModal === 'change-password' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase">Current login password:</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-zinc-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase">New password:</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-zinc-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase">Confirm new password:</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-zinc-800"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newPassword || newPassword !== confirmPassword}
                      onClick={() => {
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setActiveModal(null);
                        showSuccess('Secure login password successfully changed!');
                      }}
                      className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-650 text-white rounded-xl font-black cursor-pointer shadow-xs"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
              )}

              {/* 5. CHANGE EMAIL */}
              {activeModal === 'change-email' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 font-medium">
                    Changing your email address will update your primary secure login credentials.
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase">New system email address:</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-bold text-zinc-800"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfile(prev => ({ ...prev, email: editEmail }));
                        setActiveModal(null);
                        showSuccess('Clinic credential email changed successfully!');
                      }}
                      className="px-4 py-2 bg-amber-605 hover:bg-amber-650 text-white rounded-xl font-black cursor-pointer shadow-xs"
                    >
                      Update Email
                    </button>
                  </div>
                </div>
              )}

              {/* 6. MANAGE BACKUPS */}
              {activeModal === 'manage' && (
                <div className="space-y-4">
                  <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-teal-800 leading-normal">
                    PNJ Dental Clinical Database contains <strong>{records.length}</strong> active patient files. You can export them to a raw JSON backup.
                  </div>

                  <div className="space-y-2">
                    <span className="font-black text-zinc-800 block">Actions:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute("href", dataStr);
                        downloadAnchor.setAttribute("download", `pnj_dental_database_${new Date().toISOString().slice(0, 10)}.json`);
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                        setActiveModal(null);
                        showSuccess('Database exported successfully as JSON file!');
                      }}
                      className="w-full flex items-center justify-between p-3.5 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200/80 text-zinc-800 transition-all font-bold cursor-pointer text-left"
                    >
                      <div>
                        <span className="block text-zinc-900 font-extrabold text-[13px]">Export Database (JSON)</span>
                        <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mt-0.5">Download full data snapshot</span>
                      </div>
                      <Download className="w-5 h-5 text-teal-600 shrink-0" />
                    </button>

                    <div className="w-full flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-xl text-zinc-400 opacity-60">
                      <div>
                        <span className="block font-extrabold text-[13px]">Restore Database Backup</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider block mt-0.5">Upload .JSON file to restore records</span>
                      </div>
                      <Upload className="w-5 h-5 shrink-0" />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="font-bold text-zinc-500 uppercase tracking-wide block">Local Backup Registry Log:</span>
                    <div className="border border-zinc-150 rounded-xl bg-zinc-50/50 p-2 text-[10px] font-bold text-zinc-500 space-y-1.5">
                      <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                        <span>pnj_dental_auto_daily.json</span>
                        <span className="text-[9px] text-emerald-600 uppercase">Stored Securely</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span>pnj_dental_v2_migration.json</span>
                        <span className="text-[9px] text-emerald-600 uppercase">Stored Securely</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold cursor-pointer"
                    >
                      Close Manager
                    </button>
                  </div>
                </div>
              )}

              {/* 7. CLINIC OPERATIONS MANUAL (USER GUIDE) */}
              {activeModal === 'user-guide' && (
                <div className="space-y-4">
                  <div className="prose prose-sm prose-zinc text-zinc-650 leading-relaxed text-[11px] max-h-80 overflow-y-auto pr-1">
                    <h3 className="text-zinc-855 font-extrabold text-xs uppercase border-b border-zinc-200 pb-1 mb-2">1. Patient Intake Operations</h3>
                    <p className="mb-2">To register new clinical records, click the cyan <strong>New Patient</strong> button located inside the Filter toolbar or at the top of the app. This triggers the structured intake wizard spanning personal info, guardian indicators, medical conditions, and previous dental histories.</p>
                    
                    <h3 className="text-zinc-855 font-extrabold text-xs uppercase border-b border-zinc-200 pb-1 mt-3 mb-2">2. Advanced Filtering Directory</h3>
                    <p className="mb-2">You can query the directory utilizing five orthogonal filters:</p>
                    <ul className="list-disc pl-4 space-y-1 mb-2">
                      <li><strong>Last Name / First Name search:</strong> Fully supports looking up partial names, exact matches, comma separations (e.g. <em>Dela Cruz, Juan</em>), and perfectly supports duplicate listings.</li>
                      <li><strong>Tag Filters:</strong> Click the searchable multi-select tag widget to browse clinic tag bubbles such as OP, Yazaki, Lyceum, etc. Multiple active tags filter with AND logic.</li>
                      <li><strong>Registration Year:</strong> Filter dental cards by registration epoch (2022 to 2026).</li>
                      <li><strong>Age Type Categorization:</strong> Automatically segments cards by computed birthdate (<em>Pedia</em> for patients under 22 years of age; <em>Adult</em> for 22 years and above).</li>
                      <li><strong>Specific Date:</strong> Isolates cards created on precise day calendars.</li>
                    </ul>

                    <h3 className="text-zinc-855 font-extrabold text-xs uppercase border-b border-zinc-200 pb-1 mt-3 mb-2">3. Database Backups</h3>
                    <p className="mb-2">Go to the profile dropdown, choose <strong>Manage</strong>, and trigger a secure JSON database compilation. Store this locally to guard clinic files from browser caches clearing.</p>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl font-black cursor-pointer shadow-xs"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              )}

              {/* 8. SECURE LOGOUT */}
              {activeModal === 'logout' && (
                <div className="space-y-4">
                  <div className="p-3 bg-red-50 text-red-800 font-medium rounded-xl border border-red-100 flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="block font-black text-xs uppercase tracking-wide">Warning: Closing secure session</span>
                      <p className="text-[10px] leading-normal font-semibold">Logging out will terminate your authenticated clinic session. Your local storage state remains intact on this browser.</p>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        setProfile({
                          name: 'Logged Out Session',
                          role: 'GUEST',
                          email: ''
                        });
                        showSuccess('You have logged out successfully. (Demo session ended)');
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black cursor-pointer shadow-xs"
                    >
                      Yes, Log out
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
