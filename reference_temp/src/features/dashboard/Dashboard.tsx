import React, { useState, useMemo, useEffect } from 'react';
import { PatientRecord } from '../../types';
import { calculateAge, isUnderage } from '../../utils/date';
import { 
  Users, ShieldAlert, AlertTriangle, CheckCircle2, 
  Calendar, Gift, Coins, ArrowUpDown, X, Eye, Clock, ChevronRight, Sparkles, Smile
} from 'lucide-react';

interface DashboardProps {
  records: PatientRecord[];
  onAddNew: () => void;
  onViewDetails: (record: PatientRecord) => void;
  onDeleteRecord: (id: string) => void;
  navbarSearchQuery?: string;
}

export default function Dashboard({ 
  records, 
  onAddNew, 
  onViewDetails, 
  onDeleteRecord,
  navbarSearchQuery = ''
}: DashboardProps) {

  // Modal open states
  const [isAppointmentsModalOpen, setIsAppointmentsModalOpen] = useState(false);
  const [isBirthdaysModalOpen, setIsBirthdaysModalOpen] = useState(false);
  const [isBalancesModalOpen, setIsBalancesModalOpen] = useState(false);

  // Sorting and filter states for the Cards
  const [sortAppointmentsAsc, setSortAppointmentsAsc] = useState(true); // default old to newest
  const [sortBalanceAsc, setSortBalanceAsc] = useState(true); // default lowest to greatest

  // Card list pagination states (Max 10 per page)
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [birthdaysPage, setBirthdaysPage] = useState(1);
  const [balancesPage, setBalancesPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Key stats (Original top section preserved exactly)
  const totalCount = records.length;
  const minorCount = useMemo(() => records.filter(r => isUnderage(r.personalInfo.birthdate)).length, [records]);
  const alertCount = useMemo(() => records.filter(r => !!r.medicalHistory.medicalAlert).length, [records]);
  const healthyCount = useMemo(() => records.filter(r => r.medicalHistory.conditions.length === 0).length, [records]);

  // Today's Date Reference (Set to June 26, 2026 to align with environment)
  const TODAY_STR = "2026-06-26";
  const TODAY_DATE = new Date(TODAY_STR);

  // 1. ALL APPOINTMENTS COMPILATION
  // Gathers appointments across all patients from localStorage (with defaults matching PatientDetails)
  const allAppointments = useMemo(() => {
    const list: {
      patientId: string;
      patientName: string;
      id: string;
      startDate: string;
      endDate: string;
      title: string;
      status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
      parsedDate: Date;
    }[] = [];

    records.forEach(r => {
      if (r.isArchived) return;
      const saved = localStorage.getItem(`dental_appointments_${r.id}`);
      let appts: any[] = [];
      if (saved) {
        try {
          appts = JSON.parse(saved);
        } catch (e) {
          appts = [];
        }
      } else {
        // Fallback mock appointments matching PatientDetails defaults
        appts = [];
      }

      appts.forEach(a => {
        list.push({
          patientId: r.id,
          patientName: `${r.personalInfo.lastName}, ${r.personalInfo.firstName}`,
          id: a.id,
          startDate: a.startDate,
          endDate: a.endDate,
          title: a.title,
          status: a.status,
          parsedDate: new Date(a.startDate)
        });
      });
    });

    return list;
  }, [records]);

  // Filters appointments for Today's Appointments card
  // This filters appointments scheduled on/around today (June 26, 2026)
  // or simply filters by navbarSearchQuery and sorts oldest to newest
  const filteredAppointments = useMemo(() => {
    let list = [...allAppointments];

    // Sort by Date (chronologically)
    list.sort((a, b) => {
      const diff = a.parsedDate.getTime() - b.parsedDate.getTime();
      return sortAppointmentsAsc ? diff : -diff;
    });

    return list;
  }, [allAppointments, sortAppointmentsAsc]);

  // Today's specific appointments only (exact match on month and day of June 26, 2026)
  const todaysOnlyAppointments = useMemo(() => {
    return filteredAppointments.filter(a => {
      const d = a.parsedDate;
      return d.getFullYear() === 2026 && d.getMonth() === 5 && d.getDate() === 26;
    });
  }, [filteredAppointments]);

  // List of appointments to show in the card: Today's if any, otherwise all sorted up to today
  const appointmentsToDisplayInCard = useMemo(() => {
    if (todaysOnlyAppointments.length > 0) {
      return todaysOnlyAppointments;
    }
    // Fallback: show appointments on/around June 2026 sorted chronologically
    return filteredAppointments;
  }, [todaysOnlyAppointments, filteredAppointments]);


  // 2. TODAY'S BIRTHDAYS COMPILATION
  const birthdaysList = useMemo(() => {
    return records.filter(r => {
      if (r.isArchived || !r.personalInfo.birthdate) return false;
      const bdate = new Date(r.personalInfo.birthdate);
      // Compare month and day
      return bdate.getMonth() === TODAY_DATE.getMonth() && bdate.getDate() === TODAY_DATE.getDate();
    });
  }, [records]);

  // Filtered Birthdays list for global navbar search
  const filteredBirthdays = useMemo(() => {
    let list = [...birthdaysList];

    // If there are no birthdays exactly today, let's look for upcoming birthdays in June/July 
    // to keep the dashboard card visually active and high-utility
    if (list.length === 0) {
      list = records.filter(r => {
        if (r.isArchived || !r.personalInfo.birthdate) return false;
        const bdate = new Date(r.personalInfo.birthdate);
        // Show patients with birthdays in June (month 5)
        return bdate.getMonth() === 5;
      }).slice(0, 15); // limit to 15
    }

    return list;
  }, [birthdaysList, records]);


  // 3. PATIENTS WITH BALANCE COMPILATION
  const patientsWithBalance = useMemo(() => {
    return records.filter(r => !r.isArchived && (r.balance || 0) > 0);
  }, [records]);

  const sortedBalances = useMemo(() => {
    let list = [...patientsWithBalance];

    list.sort((a, b) => {
      const balA = a.balance || 0;
      const balB = b.balance || 0;
      return sortBalanceAsc ? balA - balB : balB - balA;
    });

    return list;
  }, [patientsWithBalance, sortBalanceAsc]);

  // 4. CARD PAGINATION COMPUTATIONS (Max 10 per page)
  const totalAppointmentsPages = useMemo(() => {
    return Math.max(1, Math.ceil(appointmentsToDisplayInCard.length / ITEMS_PER_PAGE));
  }, [appointmentsToDisplayInCard]);

  const totalBirthdaysPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredBirthdays.length / ITEMS_PER_PAGE));
  }, [filteredBirthdays]);

  const totalBalancesPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedBalances.length / ITEMS_PER_PAGE));
  }, [sortedBalances]);

  const paginatedAppointments = useMemo(() => {
    const start = (appointmentsPage - 1) * ITEMS_PER_PAGE;
    return appointmentsToDisplayInCard.slice(start, start + ITEMS_PER_PAGE);
  }, [appointmentsToDisplayInCard, appointmentsPage]);

  const paginatedBirthdays = useMemo(() => {
    const start = (birthdaysPage - 1) * ITEMS_PER_PAGE;
    return filteredBirthdays.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBirthdays, birthdaysPage]);

  const paginatedBalances = useMemo(() => {
    const start = (balancesPage - 1) * ITEMS_PER_PAGE;
    return sortedBalances.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedBalances, balancesPage]);

  // Reset pagination to first page when filters alter the visible datasets
  useEffect(() => {
    setAppointmentsPage(1);
  }, [sortAppointmentsAsc]);

  useEffect(() => {
    setBirthdaysPage(1);
  }, []);

  useEffect(() => {
    setBalancesPage(1);
  }, [sortBalanceAsc]);


  // Safe rendering utilities
  const formatPHP = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getBirthdayLabel = (birthdateStr: string) => {
    if (!birthdateStr) return '';
    const bdate = new Date(birthdateStr);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const formatted = bdate.toLocaleDateString('en-US', options);
    const age = calculateAge(birthdateStr);
    const isToday = bdate.getMonth() === TODAY_DATE.getMonth() && bdate.getDate() === TODAY_DATE.getDate();
    return `${formatted} (${isToday ? 'Turns' : 'Age'} ${age})`;
  };

  return (
    <div className="space-y-6">
      
      {/* Clinic Stats Hero Dashboard Grid (Preserved Top Section) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: Total Patients */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 md:p-5 shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300">
          <span className="p-3 bg-zinc-100 text-zinc-800 rounded-xl">
            <Users className="w-5.5 h-5.5" />
          </span>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Total Patients</span>
            <span className="text-xl md:text-2xl font-bold text-zinc-900 font-display tracking-tight">{totalCount}</span>
          </div>
        </div>

        {/* Stat 2: Pediatric Minors */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 md:p-5 shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300">
          <span className="p-3 bg-zinc-100 text-zinc-800 rounded-xl">
            <ShieldAlert className="w-5.5 h-5.5" />
          </span>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Minor Patients</span>
            <span className="text-xl md:text-2xl font-bold text-zinc-900 font-display tracking-tight">{minorCount}</span>
          </div>
        </div>

        {/* Stat 3: Medical High-Risk Alerts */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 md:p-5 shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300">
          <span className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle className="w-5.5 h-5.5 text-red-600 animate-pulse" />
          </span>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Active Alerts</span>
            <span className="text-xl md:text-2xl font-bold text-red-600 font-display tracking-tight">{alertCount}</span>
          </div>
        </div>

        {/* Stat 4: Fully Healthy Systems */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 md:p-5 shadow-xs flex items-center gap-4 transition-all hover:border-zinc-300">
          <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5.5 h-5.5 text-emerald-600" />
          </span>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Clean Profiles</span>
            <span className="text-xl md:text-2xl font-bold text-emerald-700 font-display tracking-tight">{healthyCount}</span>
          </div>
        </div>

      </div>

      {/* THREE BENTO CARDS EXPANDED IN VIEWS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARD 1: TODAY'S APPOINTMENTS */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs flex flex-col h-[400px] hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-zinc-100 rounded-lg text-zinc-700">
                <Calendar className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Today's Appointments</h3>
                <p className="text-[10px] font-semibold text-zinc-400">Scheduled visits checklist</p>
              </div>
            </div>
            
            {/* Sorting trigger */}
            <button
              onClick={() => setSortAppointmentsAsc(!sortAppointmentsAsc)}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer"
              title={sortAppointmentsAsc ? "Sort: Latest to Oldest" : "Sort: Oldest to Latest"}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List area */}
          <div className="flex-1 overflow-y-auto pr-1 min-h-0 divide-y divide-zinc-50 py-2">
            {paginatedAppointments.length > 0 ? (
              paginatedAppointments.map((apt) => (
                <div 
                  key={`${apt.patientId}-${apt.id}`} 
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 group hover:bg-zinc-50/50 px-2 rounded-xl transition-all"
                >
                  <div>
                    <button
                      onClick={() => {
                        const pat = records.find(r => r.id === apt.patientId);
                        if (pat) onViewDetails(pat);
                      }}
                      className="text-xs font-bold text-cyan-600 hover:underline hover:text-cyan-700 text-left uppercase block"
                    >
                      {apt.patientName}
                    </button>
                    <span className="text-[10px] font-semibold text-zinc-400 block mt-0.5 truncate max-w-[200px]" title={apt.title}>
                      {apt.title}
                    </span>
                  </div>
                  <div className="text-right sm:text-right shrink-0">
                    <span className="text-xs font-bold text-zinc-800 bg-zinc-100 px-2.5 py-1 rounded-lg inline-block font-mono">
                      {apt.startDate.split(',')[0]}
                    </span>
                    <span className="text-[9px] font-semibold text-zinc-400 block mt-1">
                      {apt.startDate.split(',')[1] || ''}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Clock className="w-8 h-8 text-zinc-300 mb-2" />
                <p className="text-xs font-bold text-zinc-400">No scheduled appointments</p>
                <p className="text-[10px] text-zinc-400/80 mt-1">Click Add Patient to book dental slots</p>
              </div>
            )}
          </div>

          {/* Card Footer See All & Pagination */}
          <div className="pt-3 border-t border-zinc-100 shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Total: {appointmentsToDisplayInCard.length}</span>

            {/* Minimalist Pagination Controls */}
            {totalAppointmentsPages > 1 && (
              <div className="flex items-center gap-1.5 bg-zinc-50 p-1 rounded-lg border border-zinc-200/60">
                <button
                  disabled={appointmentsPage === 1}
                  onClick={() => setAppointmentsPage(prev => Math.max(1, prev - 1))}
                  className="px-2 py-0.5 text-[9px] font-black text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-200 hover:border-zinc-300 disabled:opacity-40 disabled:pointer-events-none rounded-md transition-all cursor-pointer"
                >
                  PREV
                </button>
                <span className="text-[9px] font-black text-zinc-600 font-mono px-1">
                  {appointmentsPage}/{totalAppointmentsPages}
                </span>
                <button
                  disabled={appointmentsPage === totalAppointmentsPages}
                  onClick={() => setAppointmentsPage(prev => Math.min(totalAppointmentsPages, prev + 1))}
                  className="px-2 py-0.5 text-[9px] font-black text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-200 hover:border-zinc-300 disabled:opacity-40 disabled:pointer-events-none rounded-md transition-all cursor-pointer"
                >
                  NEXT
                </button>
              </div>
            )}

            <button
              onClick={() => setIsAppointmentsModalOpen(true)}
              className="text-xs font-extrabold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              See All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CARD 2: TODAY'S BIRTHDAYS */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs flex flex-col h-[400px] hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <Gift className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Today's Birthdays</h3>
                <p className="text-[10px] font-semibold text-zinc-400">Celebration and greetings registry</p>
              </div>
            </div>
          </div>

          {/* List area */}
          <div className="flex-1 overflow-y-auto pr-1 min-h-0 divide-y divide-zinc-50 py-2">
            {paginatedBirthdays.length > 0 ? (
              paginatedBirthdays.map((pat) => (
                <div 
                  key={pat.id} 
                  className="py-3 flex items-center justify-between gap-4 group hover:bg-zinc-50/50 px-2 rounded-xl transition-all"
                >
                  <div className="truncate">
                    <button
                      onClick={() => onViewDetails(pat)}
                      className="text-xs font-bold text-cyan-600 hover:underline hover:text-cyan-700 text-left uppercase block"
                    >
                      {pat.personalInfo.lastName}, {pat.personalInfo.firstName}
                    </button>
                    <span className="text-[10px] font-semibold text-zinc-400 block mt-0.5">
                      {pat.personalInfo.mobile || 'No contact number'}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg inline-block whitespace-nowrap">
                      {getBirthdayLabel(pat.personalInfo.birthdate)}
                    </span>
                    {new Date(pat.personalInfo.birthdate).getMonth() === TODAY_DATE.getMonth() && 
                     new Date(pat.personalInfo.birthdate).getDate() === TODAY_DATE.getDate() && (
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider block mt-1 animate-pulse">🎂 Today!</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Gift className="w-8 h-8 text-rose-200 mb-2" />
                <p className="text-xs font-bold text-zinc-400">No birthdays found</p>
                <p className="text-[10px] text-zinc-400/80 mt-1">Check back later or search names</p>
              </div>
            )}
          </div>

          {/* Card Footer See All & Pagination */}
          <div className="pt-3 border-t border-zinc-100 shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">
              {birthdaysList.length > 0 ? `Today: ${birthdaysList.length}` : "Upcoming June"}
            </span>

            {/* Minimalist Pagination Controls */}
            {totalBirthdaysPages > 1 && (
              <div className="flex items-center gap-1.5 bg-zinc-50 p-1 rounded-lg border border-zinc-200/60">
                <button
                  disabled={birthdaysPage === 1}
                  onClick={() => setBirthdaysPage(prev => Math.max(1, prev - 1))}
                  className="px-2 py-0.5 text-[9px] font-black text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-200 hover:border-zinc-300 disabled:opacity-40 disabled:pointer-events-none rounded-md transition-all cursor-pointer"
                >
                  PREV
                </button>
                <span className="text-[9px] font-black text-zinc-600 font-mono px-1">
                  {birthdaysPage}/{totalBirthdaysPages}
                </span>
                <button
                  disabled={birthdaysPage === totalBirthdaysPages}
                  onClick={() => setBirthdaysPage(prev => Math.min(totalBirthdaysPages, prev + 1))}
                  className="px-2 py-0.5 text-[9px] font-black text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-200 hover:border-zinc-300 disabled:opacity-40 disabled:pointer-events-none rounded-md transition-all cursor-pointer"
                >
                  NEXT
                </button>
              </div>
            )}

            <button
              onClick={() => setIsBirthdaysModalOpen(true)}
              className="text-xs font-extrabold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              See All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CARD 3: PATIENTS W/ BALANCE */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs flex flex-col h-[400px] hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Coins className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Patients w/ Balance</h3>
                <p className="text-[10px] font-semibold text-zinc-400">Ledger accounting balances</p>
              </div>
            </div>

            {/* Sorting trigger */}
            <button
              onClick={() => setSortBalanceAsc(!sortBalanceAsc)}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              title={sortBalanceAsc ? "Sort: Lowest to Greatest" : "Sort: Greatest to Lowest"}
            >
              <span className="text-[9px] font-black uppercase text-zinc-400">
                {sortBalanceAsc ? "LOW → HIGH" : "HIGH → LOW"}
              </span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>

          {/* List area */}
          <div className="flex-1 overflow-y-auto pr-1 min-h-0 divide-y divide-zinc-50 py-2">
            {paginatedBalances.length > 0 ? (
              paginatedBalances.map((pat) => (
                <div 
                  key={pat.id} 
                  className="py-3 flex items-center justify-between gap-4 group hover:bg-zinc-50/50 px-2 rounded-xl transition-all"
                >
                  <div className="truncate">
                    <button
                      onClick={() => onViewDetails(pat)}
                      className="text-xs font-bold text-cyan-600 hover:underline hover:text-cyan-700 text-left uppercase block"
                    >
                      {pat.personalInfo.lastName}, {pat.personalInfo.firstName}
                    </button>
                    <span className="text-[10px] font-semibold text-zinc-400 block mt-0.5">
                      ID: {pat.id}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-red-600 bg-red-50/70 px-2.5 py-1 rounded-lg inline-block whitespace-nowrap">
                      {formatPHP(pat.balance || 0)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-300 mb-2" />
                <p className="text-xs font-bold text-zinc-400">All accounts settled!</p>
                <p className="text-[10px] text-zinc-400/80 mt-1">Zero pending clinic balances</p>
              </div>
            )}
          </div>

          {/* Card Footer See All & Pagination */}
          <div className="pt-3 border-t border-zinc-100 shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Unsettled: {patientsWithBalance.length}</span>

            {/* Minimalist Pagination Controls */}
            {totalBalancesPages > 1 && (
              <div className="flex items-center gap-1.5 bg-zinc-50 p-1 rounded-lg border border-zinc-200/60">
                <button
                  disabled={balancesPage === 1}
                  onClick={() => setBalancesPage(prev => Math.max(1, prev - 1))}
                  className="px-2 py-0.5 text-[9px] font-black text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-200 hover:border-zinc-300 disabled:opacity-40 disabled:pointer-events-none rounded-md transition-all cursor-pointer"
                >
                  PREV
                </button>
                <span className="text-[9px] font-black text-zinc-600 font-mono px-1">
                  {balancesPage}/{totalBalancesPages}
                </span>
                <button
                  disabled={balancesPage === totalBalancesPages}
                  onClick={() => setBalancesPage(prev => Math.min(totalBalancesPages, prev + 1))}
                  className="px-2 py-0.5 text-[9px] font-black text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-200 hover:border-zinc-300 disabled:opacity-40 disabled:pointer-events-none rounded-md transition-all cursor-pointer"
                >
                  NEXT
                </button>
              </div>
            )}

            <button
              onClick={() => setIsBalancesModalOpen(true)}
              className="text-xs font-extrabold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              See All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>


      {/* MODAL 1: SEE ALL APPOINTMENTS */}
      {isAppointmentsModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-150 flex items-center justify-between shrink-0 bg-zinc-50">
              <div className="flex items-center gap-2.5">
                <div className="bg-zinc-900 text-white p-2 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">All Patient Appointments</h3>
                  <p className="text-xs text-zinc-400">Complete clinical visit scheduler history</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAppointmentsModalOpen(false)}
                className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-900 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto min-h-0 space-y-4">
              <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200 select-none">
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Appointment Reason</th>
                      <th className="py-3 px-4">Scheduled Date & Time</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Chart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredAppointments.map((apt) => (
                      <tr key={`${apt.patientId}-${apt.id}`} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-extrabold text-zinc-900 uppercase">
                          {apt.patientName}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-zinc-650">
                          {apt.title}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-zinc-700">
                          {apt.startDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            apt.status === 'Confirmed' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                            apt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            apt.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-zinc-100 text-zinc-500'
                          }`}>
                            {apt.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setIsAppointmentsModalOpen(false);
                              const pat = records.find(r => r.id === apt.patientId);
                              if (pat) onViewDetails(pat);
                            }}
                            className="p-1 text-cyan-600 hover:bg-cyan-50 rounded-lg cursor-pointer transition-all"
                            title="Open Patient Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredAppointments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-400 font-medium">
                          No matching appointments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-150 flex justify-end shrink-0 bg-zinc-50">
              <button
                onClick={() => setIsAppointmentsModalOpen(false)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL 2: SEE ALL BIRTHDAYS */}
      {isBirthdaysModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-150 flex items-center justify-between shrink-0 bg-zinc-50">
              <div className="flex items-center gap-2.5">
                <div className="bg-rose-600 text-white p-2 rounded-xl">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Patient Birthdays Directory</h3>
                  <p className="text-xs text-zinc-400 font-medium">All patient date-of-birth records and turning age tracker</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBirthdaysModalOpen(false)}
                className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-900 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto min-h-0 space-y-4">
              <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200 select-none">
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Birth Date</th>
                      <th className="py-3 px-4">Sex / Age</th>
                      <th className="py-3 px-4">Contact Details</th>
                      <th className="py-3 px-4 text-center">Open Chart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {records.filter(r => !r.isArchived).map((pat) => {
                      const isBdayToday = pat.personalInfo.birthdate && 
                        (new Date(pat.personalInfo.birthdate).getMonth() === TODAY_DATE.getMonth() && 
                         new Date(pat.personalInfo.birthdate).getDate() === TODAY_DATE.getDate());
                      return (
                        <tr key={pat.id} className={`hover:bg-zinc-50/50 transition-colors ${isBdayToday ? 'bg-rose-50/30' : ''}`}>
                          <td className="py-3.5 px-4 font-extrabold text-zinc-900 uppercase flex items-center gap-2">
                            {pat.personalInfo.lastName}, {pat.personalInfo.firstName}
                            {isBdayToday && <span className="bg-rose-500 text-white font-extrabold text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded-full animate-bounce">🎈 TODAY</span>}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs font-bold text-zinc-600">
                            {pat.personalInfo.birthdate ? new Date(pat.personalInfo.birthdate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'None'}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-bold text-zinc-750">
                            {pat.personalInfo.sex} | {calculateAge(pat.personalInfo.birthdate)} yrs old
                          </td>
                          <td className="py-3.5 px-4 text-xs font-semibold text-zinc-600">
                            {pat.personalInfo.mobile}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => {
                                setIsBirthdaysModalOpen(false);
                                onViewDetails(pat);
                              }}
                              className="p-1 text-cyan-600 hover:bg-cyan-50 rounded-lg cursor-pointer transition-all"
                              title="Open Patient Chart"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-150 flex justify-end shrink-0 bg-zinc-50">
              <button
                onClick={() => setIsBirthdaysModalOpen(false)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL 3: SEE ALL BALANCES */}
      {isBalancesModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-zinc-150 flex items-center justify-between shrink-0 bg-zinc-50">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-600 text-white p-2 rounded-xl">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Unsettled Patient Ledger Balances</h3>
                  <p className="text-xs text-zinc-400">Total clinic outstanding payments directory</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBalancesModalOpen(false)}
                className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-900 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto min-h-0 space-y-4">
              <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200 select-none">
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Patient ID</th>
                      <th className="py-3 px-4">Contact Details</th>
                      <th className="py-3 px-4">HMO Coverage</th>
                      <th className="py-3 px-4 text-right">Outstanding Balance</th>
                      <th className="py-3 px-4 text-center">Open Chart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {sortedBalances.map((pat) => (
                      <tr key={pat.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-extrabold text-zinc-900 uppercase">
                          {pat.personalInfo.lastName}, {pat.personalInfo.firstName}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-zinc-500">
                          {pat.id}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-zinc-600">
                          {pat.personalInfo.mobile}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold">
                          {pat.personalInfo.hmo || 'Self-pay'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-red-650 text-sm">
                          {formatPHP(pat.balance || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setIsBalancesModalOpen(false);
                              onViewDetails(pat);
                            }}
                            className="p-1 text-cyan-600 hover:bg-cyan-50 rounded-lg cursor-pointer transition-all"
                            title="Open Patient Ledger"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sortedBalances.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-400 font-semibold">
                          No outstanding balances recorded! All clinic accounts are green.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-150 flex items-center justify-between shrink-0 bg-zinc-50">
              <span className="text-xs font-bold text-zinc-500">
                Sum Total Outstanding: <strong className="text-red-600 font-mono text-sm">{formatPHP(patientsWithBalance.reduce((acc, p) => acc + (p.balance || 0), 0))}</strong>
              </span>
              <button
                onClick={() => setIsBalancesModalOpen(false)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
