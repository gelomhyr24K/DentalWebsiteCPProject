import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Coins,
  Gift,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import {
  loadClinicAppointmentsByDateRange,
  mapClinicAppointmentRowToCalendarItem,
} from '../services/clinicCalendarService';
import type { CalendarAppointment } from '../types/calendar';
import {
  calculatePatientRemainingBalance,
  formatPatientCurrency,
  getPatientLatestBillDate,
} from '../utils/patientFinance';

type PatientRecord = {
  id: string;
  record_name?: string | null;
  patient_last_name?: string | null;
  patient_first_name?: string | null;
  patient_data?: Record<string, any> | null;
  archived_at?: string | null;
};

type DashboardProps = {
  patientRecords: PatientRecord[];
  onViewPatientDetails?: (record: PatientRecord) => void;
  onOpenCalendar?: () => void;
  navbarSearchQuery?: string;
};

type BalanceEntry = {
  record: PatientRecord;
  patientName: string;
  balance: number;
  latestBillDate: string;
};

type ModalType = 'appointments' | 'birthdays' | 'balances' | null;

const ITEMS_PER_PAGE = 5;
const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateString: string) => {
  const [year, month, day] = String(dateString || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateAge = (birthdate: string) => {
  const birth = parseLocalDate(birthdate);
  if (!birth) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

const formatPHP = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getPatientData = (record: PatientRecord) => (
  record.patient_data && typeof record.patient_data === 'object' ? record.patient_data : {}
);

const getPatientDisplayName = (record: PatientRecord) => {
  const data = getPatientData(record);
  const lastName = String(record.patient_last_name || data.lastName || '').trim();
  const firstName = String(record.patient_first_name || data.firstName || '').trim();
  const middleName = String(data.middleName || '').trim();

  if (lastName && firstName) return `${lastName}, ${firstName}${middleName ? ` ${middleName.charAt(0)}.` : ''}`;
  if (lastName || firstName) return `${lastName}${firstName}`.trim();
  return String(record.record_name || 'Untitled Patient').trim();
};

const getPatientBirthdate = (record: PatientRecord) => {
  const data = getPatientData(record);
  const personalInfo = data.personalInfo && typeof data.personalInfo === 'object' ? data.personalInfo : {};
  return String(data.birthDate || data.birthdate || personalInfo.birthDate || personalInfo.birthdate || '').trim();
};

const getPatientContact = (record: PatientRecord) => {
  const data = getPatientData(record);
  return String(data.mobile || data.contact || data.phone || data.telephone || data.email || '').trim();
};

const hasActiveAlert = (record: PatientRecord) => {
  const data = getPatientData(record);
  const allergyMap = data.allergies && typeof data.allergies === 'object' ? data.allergies : {};
  const questionMap = data.questions && typeof data.questions === 'object' ? data.questions : {};
  const conditions = data.conditions && typeof data.conditions === 'object' ? data.conditions : {};
  const explicitAlert = Boolean(data.medicalAlert || data.hasMedicalAlert || data.alert || data.medicalCondition);
  const hasAllergy = Object.values(allergyMap).some(Boolean);
  const hasPositiveQuestion = Object.values(questionMap).some((value) => value === 'Yes' || value === true);
  const hasCondition = Object.values(conditions).some(Boolean);

  return explicitAlert || hasAllergy || hasPositiveQuestion || hasCondition;
};

const getBillBalance = (bill: Record<string, any>) => {
  const direct = Number(bill.remainingBalance ?? bill.balance ?? bill.unpaidAmount ?? bill.amountDue);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const payable = Number(bill.payable ?? bill.total ?? bill.totalCost ?? bill.amount);
  const paid = Number(bill.paidAmount ?? bill.amountPaid ?? bill.paid);
  if (Number.isFinite(payable)) return Math.max(0, payable - (Number.isFinite(paid) ? paid : 0));

  return 0;
};

const calculatePatientBalance = (record: PatientRecord) => {
  const data = getPatientData(record);
  if (Array.isArray(data.bills) && data.bills.length > 0) {
    return data.bills.reduce((sum: number, bill: Record<string, any>) => sum + getBillBalance(bill), 0);
  }

  const direct = Number(data.balance ?? data.outstandingBalance ?? data.remainingBalance);
  if (Number.isFinite(direct) && direct > 0) return direct;

  if (Array.isArray(data.treatmentRecords)) {
    return data.treatmentRecords.reduce((sum: number, row: Record<string, any>) => {
      const charged = Number(row.amountCharged);
      const paid = Number(row.amountPaid);
      const balance = Number(row.balance);
      if (Number.isFinite(balance) && balance > 0) return sum + balance;
      if (Number.isFinite(charged)) return sum + Math.max(0, charged - (Number.isFinite(paid) ? paid : 0));
      return sum;
    }, 0);
  }

  return 0;
};

const getLatestBillDate = (record: PatientRecord) => {
  const data = getPatientData(record);
  if (!Array.isArray(data.bills)) return '';
  const dates = data.bills
    .map((bill: Record<string, any>) => String(bill.date || bill.createdAt || bill.created_at || '').trim())
    .filter(Boolean)
    .sort();
  return dates.length > 0 ? dates[dates.length - 1] : '';
};

const isBirthdayToday = (record: PatientRecord, today: Date) => {
  const birthdate = getPatientBirthdate(record);
  const birth = parseLocalDate(birthdate);
  return Boolean(birth && birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate());
};

const formatBirthdayBadge = (record: PatientRecord, today: Date) => {
  const birthdate = getPatientBirthdate(record);
  const birth = parseLocalDate(birthdate);
  const turns = calculateAge(birthdate);
  if (!birth) return 'TODAY!';
  const label = new Date(today.getFullYear(), birth.getMonth(), birth.getDate()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return turns === null ? label : `${label} (Turns ${turns})`;
};

const appointmentMatchesSearch = (appointment: CalendarAppointment, query: string) => (
  [
    appointment.patientName,
    appointment.title,
    appointment.dentistName,
    appointment.treatmentTag,
    appointment.notes,
    appointment.status,
    appointment.type,
  ].join(' ').toLowerCase().includes(query)
);

const patientMatchesSearch = (record: PatientRecord, query: string) => (
  [
    getPatientDisplayName(record),
    getPatientContact(record),
    record.record_name,
  ].join(' ').toLowerCase().includes(query)
);

const StatCard = ({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) => (
  <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
        <div className="mt-1 text-3xl font-black text-zinc-950">{value}</div>
      </div>
    </div>
  </div>
);

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
}) => (
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
      <Icon size={19} />
    </div>
    <div>
      <h2 className="text-lg font-black text-zinc-950">{title}</h2>
      <p className="text-sm text-zinc-500">{subtitle}</p>
    </div>
  </div>
);

const PaginationFooter = ({
  label,
  totalItems,
  page,
  totalPages,
  onPageChange,
}: {
  label: string;
  totalItems: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => (
  <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
    <span>{label}: {totalItems}</span>
    {totalItems > ITEMS_PER_PAGE && (
      <div className="flex items-center gap-2 tracking-normal">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-zinc-200 px-2.5 py-1 font-bold normal-case text-zinc-500 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        <span className="font-bold normal-case text-zinc-500">Page {page} of {totalPages}</span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-lg border border-zinc-200 px-2.5 py-1 font-bold normal-case text-zinc-500 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    )}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({
  patientRecords,
  onViewPatientDetails,
  onOpenCalendar,
  navbarSearchQuery,
}) => {
  const [todayAppointments, setTodayAppointments] = useState<CalendarAppointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [appointmentError, setAppointmentError] = useState('');
  const [balanceSortAscending, setBalanceSortAscending] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [birthdaysPage, setBirthdaysPage] = useState(1);
  const [balancesPage, setBalancesPage] = useState(1);

  const today = useMemo(() => new Date(), []);
  const todayString = getLocalDateString(today);
  const searchQuery = String(navbarSearchQuery || '').trim().toLowerCase();
  const activePatients = useMemo(() => patientRecords.filter((record) => !record.archived_at), [patientRecords]);
  const patientNameById = useMemo(() => new Map(activePatients.map((record) => [record.id, getPatientDisplayName(record)] as const)), [activePatients]);

  useEffect(() => {
    let isActive = true;
    const loadAppointments = async () => {
      setIsLoadingAppointments(true);
      setAppointmentError('');
      try {
        const rows = await loadClinicAppointmentsByDateRange(todayString, todayString);
        if (!isActive) return;
        setTodayAppointments(rows
          .map(mapClinicAppointmentRowToCalendarItem)
          .filter((appointment) => appointment.status !== 'Cancelled')
          .filter((appointment) => ['Appointments', 'Recalls', 'Online Bookings', 'Events / Schedules'].includes(appointment.type))
          .map((appointment) => ({
            ...appointment,
            patientName: appointment.patientId && patientNameById.has(appointment.patientId)
              ? patientNameById.get(appointment.patientId) || appointment.patientName
              : appointment.patientName,
          })));
      } catch (error: any) {
        console.error('Failed to load dashboard appointments:', error);
        if (isActive) setAppointmentError(error?.message || 'Failed to load today appointments.');
      } finally {
        if (isActive) setIsLoadingAppointments(false);
      }
    };

    void loadAppointments();

    return () => {
      isActive = false;
    };
  }, [patientNameById, todayString]);

  const minorPatients = activePatients.filter((record) => {
    const age = calculateAge(getPatientBirthdate(record));
    return age !== null && age < 18;
  });

  const alertPatients = activePatients.filter(hasActiveAlert);
  const cleanProfiles = activePatients.filter((record) => !hasActiveAlert(record));
  const birthdaysToday = activePatients.filter((record) => isBirthdayToday(record, today));

  const balanceEntries = activePatients
    .map((record): BalanceEntry => ({
      record,
      patientName: getPatientDisplayName(record),
      balance: calculatePatientRemainingBalance(record),
      latestBillDate: getPatientLatestBillDate(record),
    }))
    .filter((entry) => entry.balance > 0)
    .sort((a, b) => balanceSortAscending ? a.balance - b.balance : b.balance - a.balance);

  const searchedAppointments = searchQuery
    ? todayAppointments.filter((appointment) => appointmentMatchesSearch(appointment, searchQuery))
    : todayAppointments;
  const searchedBirthdays = searchQuery
    ? birthdaysToday.filter((record) => patientMatchesSearch(record, searchQuery))
    : birthdaysToday;
  const searchedBalances = searchQuery
    ? balanceEntries.filter((entry) => patientMatchesSearch(entry.record, searchQuery))
    : balanceEntries;

  const getTotalPages = (totalItems: number) => Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const paginate = <T,>(items: T[], page: number) =>
    items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const appointmentsTotalPages = getTotalPages(searchedAppointments.length);
  const birthdaysTotalPages = getTotalPages(searchedBirthdays.length);
  const balancesTotalPages = getTotalPages(searchedBalances.length);

  const visibleAppointments = paginate(searchedAppointments, appointmentsPage);
  const visibleBirthdays = paginate(searchedBirthdays, birthdaysPage);
  const visibleBalances = paginate(searchedBalances, balancesPage);

  useEffect(() => {
    setAppointmentsPage(1);
    setBirthdaysPage(1);
    setBalancesPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setAppointmentsPage((page) => Math.min(page, appointmentsTotalPages));
  }, [appointmentsTotalPages]);

  useEffect(() => {
    setBirthdaysPage((page) => Math.min(page, birthdaysTotalPages));
  }, [birthdaysTotalPages]);

  useEffect(() => {
    setBalancesPage((page) => Math.min(page, balancesTotalPages));
  }, [balancesTotalPages, balanceSortAscending]);

  const openPatient = (record?: PatientRecord | null) => {
    if (!record || !onViewPatientDetails) return;
    onViewPatientDetails(record);
  };

  const appointmentPatientRecord = (appointment: CalendarAppointment) =>
    appointment.patientId ? activePatients.find((record) => record.id === appointment.patientId) || null : null;

  const renderAppointments = (items: CalendarAppointment[], limit?: number) => {
    const visible = typeof limit === 'number' ? items.slice(0, limit) : items;
    if (isLoadingAppointments) return <div className="py-8 text-center text-sm text-zinc-400">Loading today’s appointments...</div>;
    if (appointmentError) return <div className="py-8 text-center text-sm text-rose-500">{appointmentError}</div>;
    if (visible.length === 0) return <div className="py-8 text-center text-sm text-zinc-400">No appointments today.</div>;

    return (
      <div className="space-y-3">
        {visible.map((appointment) => {
          const record = appointmentPatientRecord(appointment);
          return (
            <button
              key={appointment.id}
              onClick={() => openPatient(record)}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 text-left transition hover:border-cyan-200 hover:bg-cyan-50/60"
            >
              <div className="min-w-0">
                <div className="truncate font-bold text-zinc-900">{appointment.patientName || appointment.title}</div>
                <div className="truncate text-sm text-zinc-500">{appointment.treatmentTag || appointment.title || appointment.notes || 'Scheduled visit'}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-700 shadow-sm">{appointment.time || 'Any time'}</div>
                <div className="mt-1 text-[11px] font-bold uppercase text-zinc-400">{appointment.status}</div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderBirthdays = (items: PatientRecord[], limit?: number) => {
    const visible = typeof limit === 'number' ? items.slice(0, limit) : items;
    if (visible.length === 0) return <div className="py-8 text-center text-sm text-zinc-400">No birthdays today.</div>;

    return (
      <div className="space-y-3">
        {visible.map((record) => (
          <button
            key={record.id}
            onClick={() => openPatient(record)}
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 text-left transition hover:border-rose-200 hover:bg-rose-50/60"
          >
            <div className="min-w-0">
              <div className="truncate font-bold text-zinc-900">{getPatientDisplayName(record)}</div>
              <div className="truncate text-sm text-zinc-500">{getPatientContact(record) || 'Contact not recorded'}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700">{formatBirthdayBadge(record, today)}</div>
              <div className="mt-1 text-[11px] font-black uppercase text-rose-500">Today!</div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderBalances = (items: BalanceEntry[], limit?: number) => {
    const visible = typeof limit === 'number' ? items.slice(0, limit) : items;
    if (visible.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div className="font-black text-zinc-900">All accounts settled!</div>
          <div className="text-sm text-zinc-500">Zero pending clinic balances</div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {visible.map((entry) => (
          <button
            key={entry.record.id}
            onClick={() => openPatient(entry.record)}
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 text-left transition hover:border-amber-200 hover:bg-amber-50/60"
          >
            <div className="min-w-0">
              <div className="truncate font-bold text-zinc-900">{entry.patientName}</div>
              <div className="truncate text-sm text-zinc-500">{entry.latestBillDate ? `Latest bill: ${entry.latestBillDate}` : 'No bill date recorded'}</div>
            </div>
            <div className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-black text-amber-700 shadow-sm">
              {formatPatientCurrency(entry.balance)}
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1760px] space-y-6 pb-12">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Patients" value={activePatients.length} icon={Users} tone="bg-cyan-50 text-cyan-700" />
        <StatCard label="Minor Patients" value={minorPatients.length} icon={ShieldAlert} tone="bg-indigo-50 text-indigo-700" />
        <StatCard label="Active Alerts" value={alertPatients.length} icon={AlertTriangle} tone="bg-rose-50 text-rose-700" />
        <StatCard label="Clean Profiles" value={cleanProfiles.length} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionHeader icon={CalendarCheck} title="Today’s Appointments" subtitle="Scheduled visits checklist" />
            <button onClick={onOpenCalendar} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-cyan-700 hover:bg-cyan-50">
              See All <ChevronRight size={16} />
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto pr-1">
            {renderAppointments(visibleAppointments)}
          </div>
          <PaginationFooter
            label="Total"
            totalItems={searchedAppointments.length}
            page={appointmentsPage}
            totalPages={appointmentsTotalPages}
            onPageChange={setAppointmentsPage}
          />
        </section>

        <div className="grid gap-5">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <SectionHeader icon={Gift} title="Today’s Birthdays" subtitle="Celebration and greeting registry" />
              <button onClick={() => setActiveModal('birthdays')} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50">
                See All <ChevronRight size={16} />
              </button>
            </div>
            <div className="max-h-[240px] overflow-y-auto pr-1">{renderBirthdays(visibleBirthdays)}</div>
            <PaginationFooter
              label="Today"
              totalItems={searchedBirthdays.length}
              page={birthdaysPage}
              totalPages={birthdaysTotalPages}
              onPageChange={setBirthdaysPage}
            />
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <SectionHeader icon={Coins} title="Patients w/ Balance" subtitle="Ledger accounting balances" />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setBalanceSortAscending((value) => !value)}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  title={balanceSortAscending ? 'Sort high to low' : 'Sort low to high'}
                >
                  <ArrowUpDown size={16} />
                </button>
                <button onClick={() => setActiveModal('balances')} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50">
                  See All <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="max-h-[260px] overflow-y-auto pr-1">{renderBalances(visibleBalances)}</div>
            <PaginationFooter
              label="Unsettled"
              totalItems={searchedBalances.length}
              page={balancesPage}
              totalPages={balancesTotalPages}
              onPageChange={setBalancesPage}
            />
          </section>
        </div>
      </div>

      <footer className="pt-2 text-center text-xs font-medium text-zinc-400">
        © 2026 PNJ Dental Clinic Digital Ledger. Private medical registry system.
      </footer>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div className="font-black text-zinc-950">
                {activeModal === 'appointments' && 'Today’s Appointments'}
                {activeModal === 'birthdays' && 'Today’s Birthdays'}
                {activeModal === 'balances' && 'Patients w/ Balance'}
              </div>
              <button onClick={() => setActiveModal(null)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {activeModal === 'appointments' && renderAppointments(searchedAppointments)}
              {activeModal === 'birthdays' && renderBirthdays(searchedBirthdays)}
              {activeModal === 'balances' && renderBalances(searchedBalances)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
