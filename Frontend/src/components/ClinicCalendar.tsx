import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  BellRing,
  Cake,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  Eye,
  Globe2,
  Grid3X3,
  Link2,
  List,
  MessageSquare,
  MoreVertical,
  MonitorSmartphone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Stethoscope,
  Tag,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  archiveClinicAppointment,
  cancelClinicAppointment,
  createClinicAppointment,
  loadClinicAppointments,
  mapClinicAppointmentRowToCalendarItem,
  normalizeAppointmentStatus,
  normalizeAppointmentType,
  updateClinicAppointment,
} from '../services/clinicCalendarService';
import { loadAppPreferenceSettings, saveAppPreferenceSettings } from '../services/settingsService';
import { loadActiveMasterDirectoryItems } from '../services/masterDirectoryService';
import type {
  CalendarAppointment,
  CalendarAppointmentStatus,
  CalendarAppointmentType,
  CalendarAppointmentSource,
  ClinicAppointmentType,
} from '../types/calendar';

type PatientRecord = {
  id: string;
  record_name?: string | null;
  patient_last_name?: string | null;
  patient_first_name?: string | null;
  patient_data?: Record<string, any> | null;
};

type DoctorRecord = {
  id?: string;
  name: string;
  role?: string;
  status?: string;
  displayInCalendar?: boolean;
};

type ClinicCalendarProps = {
  patientRecords: PatientRecord[];
  doctors: DoctorRecord[];
  onAddNewPatient: () => void;
  onViewPatientDetails: (patientId: string, tab?: string) => void;
};

type CalendarView = 'month' | 'week' | 'day' | 'list';

type AppointmentFormState = {
  patientId: string;
  patientName: string;
  title: string;
  dentistName: string;
  date: string;
  time: string;
  endTime: string;
  type: CalendarAppointmentType;
  status: CalendarAppointmentStatus;
  treatmentTag: string;
  notes: string;
};

const CALENDAR_TYPES: CalendarAppointmentType[] = [
  'Appointments',
  'Recalls',
  'Birthdays',
  'Events / Schedules',
  'Online Bookings',
  'Google Calendar',
];

const STATUS_OPTIONS: CalendarAppointmentStatus[] = [
  'Pending',
  'Scheduled',
  'Completed',
  'Cancelled',
  'Rescheduled',
  'Missed',
  'No-Show',
];

const TYPE_STYLES: Record<CalendarAppointmentType, string> = {
  Appointments: 'bg-blue-50 text-blue-700 border-blue-200',
  Recalls: 'bg-violet-50 text-violet-700 border-violet-200',
  Birthdays: 'bg-rose-50 text-rose-700 border-rose-200',
  'Events / Schedules': 'bg-purple-50 text-purple-700 border-purple-200',
  'Online Bookings': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Google Calendar': 'bg-red-50 text-red-700 border-red-200',
};

const TYPE_CONFIG: Record<CalendarAppointmentType, {
  Icon: React.ComponentType<{ className?: string }>;
  dot: string;
  icon: string;
}> = {
  Appointments: { Icon: Stethoscope, dot: 'bg-blue-500', icon: 'text-blue-600' },
  Recalls: { Icon: BellRing, dot: 'bg-violet-500', icon: 'text-violet-600' },
  Birthdays: { Icon: Cake, dot: 'bg-rose-500', icon: 'text-rose-600' },
  'Events / Schedules': { Icon: CalendarDays, dot: 'bg-purple-500', icon: 'text-purple-600' },
  'Online Bookings': { Icon: MonitorSmartphone, dot: 'bg-emerald-500', icon: 'text-emerald-600' },
  'Google Calendar': { Icon: Globe2, dot: 'bg-red-500', icon: 'text-red-600' },
};

const STATUS_STYLES: Record<CalendarAppointmentStatus, string> = {
  Pending: 'bg-slate-100 text-slate-700',
  Scheduled: 'bg-cyan-50 text-cyan-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-rose-50 text-rose-700',
  Rescheduled: 'bg-amber-50 text-amber-700',
  Missed: 'bg-orange-50 text-orange-700',
  'No-Show': 'bg-zinc-100 text-zinc-700',
};

const SYNC_SETTINGS_KEY = 'clinic_calendar_sync_settings';

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getMonthLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const getDisplayDate = (dateString: string) => {
  if (!dateString) return 'No date';
  return parseLocalDate(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getWeekStart = (date: Date) => addDays(date, -date.getDay());

const getCalendarMonthDays = (date: Date) => {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = addDays(firstOfMonth, -firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = addDays(start, index);
    return {
      date: day,
      dateString: getLocalDateString(day),
      isCurrentMonth: day.getMonth() === date.getMonth(),
    };
  });
};

const parseAppointmentTime = (time: string) => {
  const value = String(time || '').trim();
  if (!value) return 24 * 60 + 1;

  const amPmMatch = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPmMatch) {
    let hour = Number(amPmMatch[1]);
    const minute = Number(amPmMatch[2]);
    const meridian = amPmMatch[3].toUpperCase();
    if (meridian === 'PM' && hour < 12) hour += 12;
    if (meridian === 'AM' && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  const twentyFourHourMatch = value.match(/^(\d{1,2}):(\d{2})/);
  if (twentyFourHourMatch) {
    return Number(twentyFourHourMatch[1]) * 60 + Number(twentyFourHourMatch[2]);
  }

  return 24 * 60 + 1;
};

const normalizeTimeInput = (time: string) => {
  const value = String(time || '').trim();
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
};

const formatDisplayTime = (time: string) => {
  const normalized = normalizeTimeInput(time);
  if (!normalized) return 'Any time';
  const [hourRaw, minute] = normalized.split(':').map(Number);
  const meridian = hourRaw >= 12 ? 'PM' : 'AM';
  const hour = hourRaw % 12 || 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${meridian}`;
};

const sortAppointmentsByDateTime = (items: CalendarAppointment[]) =>
  [...items].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return parseAppointmentTime(a.time) - parseAppointmentTime(b.time);
  });

const normalizePatientDisplayName = (record: PatientRecord) => {
  const data = record.patient_data || {};
  const lastName = String(record.patient_last_name || data.lastName || '').trim();
  const firstName = String(record.patient_first_name || data.firstName || '').trim();

  if (lastName && firstName) return `${lastName}, ${firstName}`;
  if (lastName || firstName) return `${lastName}${firstName}`.trim();
  return String(record.record_name || 'Untitled Patient').trim();
};

const calculateAge = (birthDate: string) => {
  if (!birthDate) return '';
  const birth = parseLocalDate(birthDate);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? String(age) : '';
};

const getAgendaTitle = (dateString: string) =>
  `AGENDA FOR ${parseLocalDate(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase()}`;

const getPatientPreviewRows = (record?: PatientRecord | null) => {
  if (!record) return [];
  const data = record.patient_data || {};
  const birthDate = getPatientBirthDate(record);
  const age = calculateAge(birthDate);
  const medicalCondition = String(
    data.medicalCondition
    || data.medicalHistory?.medicalCondition
    || data.healthDetails?.medicalCondition
    || data.conditionsSummary
    || ''
  ).trim();
  const allergyValues = data.allergies && typeof data.allergies === 'object'
    ? Object.entries(data.allergies)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key)
        .join(', ')
    : '';

  return [
    { label: 'Address', value: String(data.address || data.homeAddress || '').trim() },
    { label: 'Age', value: age ? `${age} years old` : '' },
    { label: 'Sex', value: String(data.sex || data.gender || '').trim() },
    { label: 'Medical Alert', value: medicalCondition || allergyValues },
    { label: 'Last Call', value: String(data.lastCallSummary || data.lastCall || '').trim() },
  ].filter((row) => row.value);
};

const getPatientBirthDate = (record: PatientRecord) => {
  const data = record.patient_data || {};
  const nestedPersonal = data.personalInfo || {};
  return String(data.birthDate || data.birthdate || nestedPersonal.birthdate || nestedPersonal.birthDate || '').trim();
};

const buildBirthdayAppointments = (records: PatientRecord[], year: number): CalendarAppointment[] =>
  records.flatMap((record) => {
    const birthDate = getPatientBirthDate(record);
    if (!birthDate) return [];

    const date = parseLocalDate(birthDate);
    if (Number.isNaN(date.getTime())) return [];

    const birthdayDate = getLocalDateString(new Date(year, date.getMonth(), date.getDate()));
    const patientName = normalizePatientDisplayName(record);

    return [{
      id: `birthday-${record.id}-${year}`,
      patientId: record.id,
      patientName,
      dentistName: '',
      date: birthdayDate,
      time: '',
      endTime: null,
      type: 'Birthdays' as CalendarAppointmentType,
      status: 'Scheduled' as CalendarAppointmentStatus,
      title: `${patientName} Birthday`,
      notes: 'Patient birthday',
      source: 'birthday' as CalendarAppointmentSource,
      metadata: { birthDate },
    }];
  });

const calendarTypeToClinicType = (type: CalendarAppointmentType): ClinicAppointmentType => {
  if (type === 'Recalls') return 'recall';
  if (type === 'Birthdays') return 'birthday';
  if (type === 'Events / Schedules') return 'event';
  if (type === 'Online Bookings') return 'online_booking';
  if (type === 'Google Calendar') return 'google_calendar';
  return 'appointment';
};

const getSourceForType = (type: CalendarAppointmentType): CalendarAppointmentSource => {
  if (type === 'Events / Schedules') return 'event';
  if (type === 'Online Bookings') return 'online_booking';
  if (type === 'Google Calendar') return 'google_calendar';
  return 'manual';
};

const makeBlankForm = (date: string, defaults: Partial<AppointmentFormState> = {}): AppointmentFormState => ({
  patientId: defaults.patientId || '',
  patientName: defaults.patientName || '',
  title: defaults.title || '',
  dentistName: defaults.dentistName || '',
  date: defaults.date || date,
  time: defaults.time || '',
  endTime: defaults.endTime || '',
  type: defaults.type || 'Appointments',
  status: defaults.status || 'Scheduled',
  treatmentTag: defaults.treatmentTag || '',
  notes: defaults.notes || '',
});

export const ClinicCalendar: React.FC<ClinicCalendarProps> = ({
  patientRecords,
  doctors,
  onAddNewPatient,
  onViewPatientDetails,
}) => {
  const todayString = getLocalDateString(new Date());
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [view, setView] = useState<CalendarView>('month');
  const [lastCalendarView, setLastCalendarView] = useState<Exclude<CalendarView, 'list'>>('month');
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<CalendarAppointmentType[]>([]);
  const [selectedAssociates, setSelectedAssociates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dayAgendaDate, setDayAgendaDate] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<CalendarAppointment | null>(null);
  const [form, setForm] = useState<AppointmentFormState>(() => makeBlankForm(todayString));
  const [patientSearch, setPatientSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [syncSettings, setSyncSettings] = useState({ syncMySchedule: false, syncEntireClinic: false });
  const [syncSettingsReady, setSyncSettingsReady] = useState(false);
  const [actionMenu, setActionMenu] = useState<null | { appointmentId: string; x: number; y: number }>(null);
  const [appointmentTypes, setAppointmentTypes] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchTypes = async () => {
      const res = await loadActiveMasterDirectoryItems('appointment_types');
      if (isMounted) {
        if (res.ok && res.data.length > 0) {
          setAppointmentTypes(res.data.map(item => item.name));
        } else {
          setAppointmentTypes(CALENDAR_TYPES);
        }
      }
    };
    void fetchTypes();
    return () => { isMounted = false; };
  }, []);

  const [hoverPreview, setHoverPreview] = useState<null | { patientId: string; x: number; y: number }>(null);

  const patientNameById = useMemo(() => {
    const entries = patientRecords.map((record) => [record.id, normalizePatientDisplayName(record)] as const);
    return new Map(entries);
  }, [patientRecords]);

  const patientById = useMemo(() => {
    const entries = patientRecords.map((record) => [record.id, record] as const);
    return new Map(entries);
  }, [patientRecords]);

  const associateNames = useMemo(() => {
    const doctorNames = doctors
      .filter((doctor) => doctor.displayInCalendar !== false)
      .filter((doctor) => !doctor.status || doctor.status === 'Active')
      .map((doctor) => doctor.name)
      .filter(Boolean);
    const appointmentNames = appointments.map((appointment) => appointment.dentistName).filter(Boolean);
    return Array.from(new Set([...doctorNames, ...appointmentNames])).sort();
  }, [appointments, doctors]);

  const birthdayAppointments = useMemo(
    () => buildBirthdayAppointments(patientRecords, currentDate.getFullYear()),
    [currentDate, patientRecords],
  );

  const allAppointments = useMemo(() => {
    const enriched = appointments.map((appointment) => ({
      ...appointment,
      patientName: appointment.patientId && patientNameById.has(appointment.patientId)
        ? patientNameById.get(appointment.patientId) || appointment.patientName
        : appointment.patientName,
    }));
    return sortAppointmentsByDateTime([...enriched, ...birthdayAppointments]);
  }, [appointments, birthdayAppointments, patientNameById]);

  const filteredAppointments = useMemo(() => {
    return allAppointments.filter((appointment) => {
      if (!selectedTypes.includes(appointment.type)) return false;
      if (selectedAssociates.length > 0 && appointment.dentistName && !selectedAssociates.includes(appointment.dentistName)) {
        return false;
      }
      return true;
    });
  }, [allAppointments, selectedAssociates, selectedTypes]);

  const patientSuggestions = useMemo(() => {
    const query = patientSearch.trim().toLowerCase();
    if (!query) return patientRecords.slice(0, 6);

    return patientRecords
      .filter((record) => {
        const data = record.patient_data || {};
        const haystack = [
          normalizePatientDisplayName(record),
          record.record_name,
          data.nickname,
          `${data.firstName || ''} ${data.lastName || ''}`,
          `${data.lastName || ''} ${data.firstName || ''}`,
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 6);
  }, [patientRecords, patientSearch]);

  const selectedDayAppointments = useMemo(
    () => filteredAppointments.filter((appointment) => appointment.date === selectedDate),
    [filteredAppointments, selectedDate],
  );

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const rows = await loadClinicAppointments();
      setAppointments(rows.map(mapClinicAppointmentRowToCalendarItem));
    } catch (loadError: any) {
      console.error('Error loading clinic appointments:', loadError);
      setError(loadError?.message || 'Failed to load clinic appointments.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    let isActive = true;

    const loadSyncSettings = async () => {
      try {
        const settings = await loadAppPreferenceSettings(SYNC_SETTINGS_KEY);
        if (!isActive) return;
        setSyncSettings({
          syncMySchedule: Boolean(settings?.syncMySchedule),
          syncEntireClinic: Boolean(settings?.syncEntireClinic),
        });
      } catch (settingsError) {
        console.warn('Unable to load calendar sync settings from Supabase:', settingsError);
        try {
          const parsed = JSON.parse(localStorage.getItem(SYNC_SETTINGS_KEY) || '{}');
          if (isActive) {
            setSyncSettings({
              syncMySchedule: Boolean(parsed.syncMySchedule),
              syncEntireClinic: Boolean(parsed.syncEntireClinic),
            });
          }
        } catch {
          if (isActive) setSyncSettings({ syncMySchedule: false, syncEntireClinic: false });
        }
      } finally {
        if (isActive) setSyncSettingsReady(true);
      }
    };

    void loadSyncSettings();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!syncSettingsReady) return;
    localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(syncSettings));
    void saveAppPreferenceSettings(SYNC_SETTINGS_KEY, syncSettings).catch((settingsError) => {
      console.warn('Unable to save calendar sync settings to Supabase:', settingsError);
    });
  }, [syncSettings, syncSettingsReady]);

  useEffect(() => {
    const closeMenus = () => setActionMenu(null);
    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  const getAppointmentsForDate = (dateString: string) =>
    filteredAppointments.filter((appointment) => appointment.date === dateString);

  const navigate = (direction: -1 | 1) => {
    setCurrentDate((date) => {
      if (view === 'week') return addDays(date, direction * 7);
      if (view === 'day') {
        const next = addDays(date, direction);
        setSelectedDate(getLocalDateString(next));
        return next;
      }
      return new Date(date.getFullYear(), date.getMonth() + direction, 1);
    });
  };

  const goToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(getLocalDateString(today));
  };

  const setCalendarView = (nextView: CalendarView) => {
    setView(nextView);
    if (nextView !== 'list') setLastCalendarView(nextView);
  };

  const toggleCalendarList = (mode: 'calendar' | 'list') => {
    setView(mode === 'list' ? 'list' : lastCalendarView);
  };

  const toggleType = (type: CalendarAppointmentType) => {
    setSelectedTypes((current) => (
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    ));
  };

  const toggleAssociate = (associate: string) => {
    setSelectedAssociates((current) => (
      current.includes(associate) ? current.filter((item) => item !== associate) : [...current, associate]
    ));
  };

  const openNewAppointment = (defaults: Partial<AppointmentFormState> = {}) => {
    const date = defaults.date || selectedDate || todayString;
    setEditingAppointment(null);
    setForm(makeBlankForm(date, defaults));
    setPatientSearch(defaults.patientName || '');
    setIsFormOpen(true);
  };

  const openEditAppointment = (appointment: CalendarAppointment) => {
    if (appointment.source === 'birthday') {
      if (appointment.patientId) onViewPatientDetails(appointment.patientId, 'form');
      return;
    }

    setEditingAppointment(appointment);
    setForm(makeBlankForm(appointment.date || selectedDate, {
      patientId: appointment.patientId || '',
      patientName: appointment.patientName || '',
      title: appointment.title || '',
      dentistName: appointment.dentistName || '',
      date: appointment.date,
      time: normalizeTimeInput(appointment.time),
      endTime: normalizeTimeInput(appointment.endTime || ''),
      type: appointment.type,
      status: appointment.status,
      treatmentTag: appointment.treatmentTag || '',
      notes: appointment.notes || '',
    }));
    setPatientSearch(appointment.patientName || '');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAppointment(null);
    setForm(makeBlankForm(selectedDate || todayString));
    setPatientSearch('');
  };

  const selectPatient = (record: PatientRecord) => {
    const patientName = normalizePatientDisplayName(record);
    setForm((current) => ({
      ...current,
      patientId: record.id,
      patientName,
    }));
    setPatientSearch(patientName);
  };

  const validateForm = () => {
    const isEvent = form.type === 'Events / Schedules';
    const requiresPatient = ['Appointments', 'Recalls', 'Online Bookings'].includes(form.type);
    if (!form.date) return 'Date is required.';
    if (!form.time) return 'Start time is required.';
    if (requiresPatient && !form.patientId && !form.patientName.trim()) return 'Patient is required for patient appointments.';
    if (['Appointments', 'Recalls'].includes(form.type) && !form.dentistName.trim()) {
      return 'Dentist / associate is required.';
    }
    if (!form.title.trim() && !isEvent) return 'Appointment title is required.';
    if (isEvent && !form.title.trim() && !form.notes.trim()) return 'Event title or notes are required.';
    return '';
  };

  const hasConflict = () => {
    if (!form.dentistName.trim() || !form.time.trim()) return false;
    const dentist = form.dentistName.trim().toLowerCase();
    const time = normalizeTimeInput(form.time);

    return allAppointments.some((appointment) => {
      if (appointment.id === editingAppointment?.id) return false;
      if (appointment.source === 'birthday') return false;
      if (appointment.status === 'Cancelled') return false;
      return appointment.date === form.date
        && normalizeTimeInput(appointment.time) === time
        && appointment.dentistName.trim().toLowerCase() === dentist;
    });
  };

  const saveAppointment = async () => {
    const validationMessage = validateForm();
    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    if (hasConflict()) {
      const confirmed = window.confirm(`Warning: Dr. ${form.dentistName} already has a scheduled slot at ${formatDisplayTime(form.time)} on ${getDisplayDate(form.date)}. Would you like to double-book?`);
      if (!confirmed) return;
    }

    setIsSaving(true);
    try {
      const appointmentType = calendarTypeToClinicType(form.type);
      const title = form.title.trim() || form.notes.trim() || form.type;
      const source = editingAppointment?.source && editingAppointment.source !== 'birthday'
        ? editingAppointment.source
        : getSourceForType(form.type);

      const payload = {
        patient_id: form.patientId || null,
        title,
        appointment_type: normalizeAppointmentType(appointmentType),
        source,
        status: normalizeAppointmentStatus(form.status),
        dentist_name: form.dentistName.trim() || null,
        appointment_date: form.date,
        start_time: form.time || null,
        end_time: form.endTime || null,
        reason: title,
        notes: form.notes.trim() || null,
        treatment_tag: form.treatmentTag.trim() || null,
        metadata: {
          patientName: form.patientName.trim() || null,
        },
      };

      if (editingAppointment) {
        await updateClinicAppointment(editingAppointment.id, payload);
      } else {
        await createClinicAppointment(payload);
      }

      await loadAppointments();
      closeForm();
    } catch (saveError: any) {
      console.error('Error saving appointment:', saveError);
      alert(saveError?.message || 'Failed to save appointment.');
    } finally {
      setIsSaving(false);
    }
  };

  const archiveAppointment = async () => {
    if (!editingAppointment || editingAppointment.source === 'birthday') return;
    const confirmed = window.confirm('Archive this appointment?');
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await archiveClinicAppointment(editingAppointment.id);
      await loadAppointments();
      closeForm();
    } catch (archiveError: any) {
      console.error('Error archiving appointment:', archiveError);
      alert(archiveError?.message || 'Failed to archive appointment.');
    } finally {
      setIsSaving(false);
    }
  };

  const getAppointmentById = (appointmentId: string) =>
    allAppointments.find((appointment) => appointment.id === appointmentId) || null;

  const openActionMenu = (event: React.MouseEvent, appointment: CalendarAppointment) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setActionMenu({
      appointmentId: appointment.id,
      x: Math.min(rect.left, window.innerWidth - 230),
      y: Math.min(rect.bottom + 8, window.innerHeight - 260),
    });
  };

  const viewOrEditAppointment = (appointment: CalendarAppointment) => {
    setActionMenu(null);
    openEditAppointment(appointment);
  };

  const addAppointmentNote = async (appointment: CalendarAppointment) => {
    setActionMenu(null);
    if (appointment.source === 'birthday') return;
    const note = window.prompt('Add note for this appointment:', appointment.notes || '');
    if (note === null) return;

    try {
      await updateClinicAppointment(appointment.id, { notes: note.trim() || null });
      await loadAppointments();
    } catch (noteError: any) {
      console.error('Error updating appointment note:', noteError);
      alert(noteError?.message || 'Failed to update appointment note.');
    }
  };

  const cancelAppointment = async (appointment: CalendarAppointment) => {
    setActionMenu(null);
    if (appointment.source === 'birthday') return;
    const confirmed = window.confirm('Cancel this appointment?');
    if (!confirmed) return;

    try {
      await cancelClinicAppointment(appointment.id);
      await loadAppointments();
    } catch (cancelError: any) {
      console.error('Error cancelling appointment:', cancelError);
      alert(cancelError?.message || 'Failed to cancel appointment.');
    }
  };

  const sendSms = (appointment: CalendarAppointment) => {
    setActionMenu(null);
    alert(`SMS integration is not connected yet for ${appointment.patientName || appointment.title}.`);
  };

  const openAppointmentInNewTab = (appointment: CalendarAppointment) => {
    setActionMenu(null);
    if (!appointment.patientId) {
      alert('This schedule is not linked to a patient record.');
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('patientId', appointment.patientId);
    window.open(`${url.pathname}${url.search}${url.hash}`, '_blank', 'noopener,noreferrer');
  };

  const renderTypeIcon = (type: CalendarAppointmentType, className = 'h-[15px] w-[15px]') => {
    const { Icon, icon } = TYPE_CONFIG[type];
    return <Icon className={`${className} ${icon}`} />;
  };

  const renderAppointmentCard = (appointment: CalendarAppointment, compact = false) => (
    <button
      key={appointment.id}
      onClick={(event) => {
        event.stopPropagation();
        openEditAppointment(appointment);
      }}
      className={`w-full rounded-lg border px-2 py-1.5 text-left transition hover:shadow-sm ${TYPE_STYLES[appointment.type]} ${compact ? 'text-[11px]' : 'text-xs'}`}
      title={`${appointment.title} - ${appointment.patientName}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{formatDisplayTime(appointment.time)}</span>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${STATUS_STYLES[appointment.status]}`}>
          {appointment.status}
        </span>
      </div>
      <div className="mt-1 truncate font-medium">{appointment.title}</div>
      {!compact && <div className="truncate text-[11px] opacity-80">{appointment.patientName}</div>}
    </button>
  );

  const renderMonthView = () => {
    const days = getCalendarMonthDays(currentDate);
    const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {weekLabels.map((day) => (
            <div key={day} className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayAppointments = getAppointmentsForDate(day.dateString);
            const isToday = day.dateString === todayString;
            const isSelected = day.dateString === selectedDate;

            return (
              <button
                key={day.dateString}
                onClick={() => {
                  setSelectedDate(day.dateString);
                  setCurrentDate(day.date);
                  setDayAgendaDate(day.dateString);
                }}
                className={`min-h-[132px] border-b border-r border-slate-100 p-2 text-left transition hover:bg-slate-50 ${day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/80 text-slate-400'} ${isSelected ? 'ring-2 ring-inset ring-teal-500' : ''}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                    {day.date.getDate()}
                  </span>
                  {dayAppointments.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {dayAppointments.length}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {dayAppointments.slice(0, 5).map((appointment) => (
                    <span
                      key={appointment.id}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditAppointment(appointment);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          openEditAppointment(appointment);
                        }
                      }}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border bg-white shadow-sm transition hover:scale-105 ${TYPE_STYLES[appointment.type]}`}
                      title={`${appointment.type}: ${appointment.title}`}
                    >
                      {renderTypeIcon(appointment.type)}
                    </span>
                  ))}
                  {dayAppointments.length > 5 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedDate(day.dateString);
                        setDayAgendaDate(day.dateString);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          setSelectedDate(day.dateString);
                          setDayAgendaDate(day.dateString);
                        }
                      }}
                      className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-100 px-2 text-[11px] font-black text-slate-600 shadow-sm"
                    >
                      +{dayAppointments.length - 5}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDate);
    const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

    return (
      <div className="grid gap-3 lg:grid-cols-7">
        {days.map((day) => {
          const dateString = getLocalDateString(day);
          const dayAppointments = getAppointmentsForDate(dateString);
          return (
            <section key={dateString} className="min-h-[460px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <button
                onClick={() => {
                  setSelectedDate(dateString);
                  setCurrentDate(day);
                  setDayAgendaDate(dateString);
                }}
                className={`mb-3 w-full rounded-lg px-2 py-2 text-left ${dateString === todayString ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-700'}`}
              >
                <div className="text-xs font-bold uppercase tracking-wide">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className="text-lg font-black">{day.getDate()}</div>
              </button>
              <div className="space-y-2">
                {dayAppointments.map((appointment) => renderAppointmentCard(appointment))}
                {dayAppointments.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-400">
                    No records
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{getDisplayDate(selectedDate)}</h3>
          <p className="text-sm text-slate-500">{selectedDayAppointments.length} scheduled item{selectedDayAppointments.length === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={() => openNewAppointment({ date: selectedDate })}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} /> Book Schedule
        </button>
      </div>
      <div className="space-y-3">
        {selectedDayAppointments.map((appointment) => (
          <button
            key={appointment.id}
            onClick={() => openEditAppointment(appointment)}
            className="flex w-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-700">{formatDisplayTime(appointment.time)}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${TYPE_STYLES[appointment.type]}`}>{appointment.type}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[appointment.status]}`}>{appointment.status}</span>
              </div>
              <div className="mt-2 text-base font-bold text-slate-900">{appointment.title}</div>
              <div className="text-sm text-slate-500">{appointment.patientName}</div>
              {appointment.notes && <div className="mt-1 text-sm text-slate-500">{appointment.notes}</div>}
            </div>
            <div className="text-sm font-semibold text-slate-500">{appointment.dentistName || 'No associate'}</div>
          </button>
        ))}
        {selectedDayAppointments.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 py-14 text-center text-sm text-slate-400">
            No appointments for this date.
          </div>
        )}
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[150px_120px_minmax(0,1fr)_180px_150px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 max-xl:hidden">
        <div>Date</div>
        <div>Time</div>
        <div>Patient / Event</div>
        <div>Associate</div>
        <div>Status</div>
      </div>
      <div className="divide-y divide-slate-100">
        {filteredAppointments.map((appointment) => (
          <button
            key={appointment.id}
            onClick={() => openEditAppointment(appointment)}
            className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-slate-50 xl:grid-cols-[150px_120px_minmax(0,1fr)_180px_150px]"
          >
            <div className="font-semibold text-slate-700">{getDisplayDate(appointment.date)}</div>
            <div className="font-mono text-sm text-slate-600">{formatDisplayTime(appointment.time)}</div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900">{appointment.title}</div>
              <div className="truncate text-sm text-slate-500">{appointment.patientName}</div>
              {appointment.notes && <div className="truncate text-xs text-slate-400">{appointment.notes}</div>}
            </div>
            <div className="text-sm text-slate-600">{appointment.dentistName || '-'}</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${TYPE_STYLES[appointment.type]}`}>{appointment.type}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[appointment.status]}`}>{appointment.status}</span>
            </div>
          </button>
        ))}
        {filteredAppointments.length === 0 && (
          <div className="py-14 text-center text-sm text-slate-400">No matching calendar records.</div>
        )}
      </div>
    </div>
  );

  const renderAgendaAppointmentCard = (appointment: CalendarAppointment) => {
    const primaryLabel = appointment.type === 'Events / Schedules' && !appointment.patientId
      ? appointment.title
      : appointment.patientName || appointment.title;

    return (
      <div key={appointment.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700">
                {formatDisplayTime(appointment.time)}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${TYPE_STYLES[appointment.type]}`}>
                {renderTypeIcon(appointment.type)}
                {appointment.type}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[appointment.status]}`}>
                {appointment.status}
              </span>
            </div>

            <div className="mt-3">
              <button
                onClick={() => openEditAppointment(appointment)}
                onMouseEnter={(event) => {
                  if (!appointment.patientId) return;
                  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                  setHoverPreview({
                    patientId: appointment.patientId,
                    x: Math.min(rect.left, window.innerWidth - 310),
                    y: rect.bottom + 8,
                  });
                }}
                onMouseLeave={() => setHoverPreview(null)}
                className="max-w-full truncate text-left text-base font-black text-slate-900 hover:text-blue-700 hover:underline"
              >
                {primaryLabel || 'Untitled Schedule'}
              </button>
              <div className="mt-1 text-sm font-medium text-slate-500">
                {appointment.dentistName || 'Dentist not assigned'}
              </div>
            </div>

            {appointment.notes && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{appointment.notes}</p>
            )}

            {appointment.linkedBillId && (
              <div className="mt-2 text-xs font-semibold text-slate-400">Linked bill: {appointment.linkedBillId}</div>
            )}
          </div>

          <button
            onClick={(event) => openActionMenu(event, appointment)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Appointment actions"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1760px] space-y-5 pb-12">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Clinic Calendar</div>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Clinic Appointments</h2>
            <p className="text-sm text-slate-500">Manage clinic appointments.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => toggleCalendarList('calendar')}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${view === 'list' ? 'text-slate-500 hover:bg-white' : 'bg-white text-blue-700 shadow-sm'}`}
              >
                <Grid3X3 size={15} /> Calendar
              </button>
              <button
                onClick={() => toggleCalendarList('list')}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${view === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-white'}`}
              >
                <List size={15} /> List
              </button>
            </div>
            <button
              onClick={() => openNewAppointment()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={16} /> New Appointment
            </button>
            <button
              onClick={() => openNewAppointment({ type: 'Events / Schedules', patientId: '', patientName: '' })}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              <CalendarRange size={16} /> Events/Schedules
            </button>
            <button
              onClick={() => void loadAppointments()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigate(-1)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
              <ChevronLeft size={18} />
            </button>
            <button onClick={goToday} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Today
            </button>
            <button onClick={() => navigate(1)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
              <ChevronRight size={18} />
            </button>
            <div className="ml-2 text-xl font-black text-slate-900">{getMonthLabel(currentDate)}</div>
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(['month', 'week', 'day', 'list'] as CalendarView[]).map((item) => (
              <button
                key={item}
                onClick={() => setCalendarView(item)}
                className={`rounded-md px-3 py-2 text-sm font-bold capitalize transition ${view === item ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-white'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Users size={16} className="text-blue-600" /> Associates
            </div>
            <div className="space-y-2">
              {associateNames.map((associate) => (
                <label key={associate} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedAssociates.includes(associate)}
                    onChange={() => toggleAssociate(associate)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span>{associate}</span>
                </label>
              ))}
              {associateNames.length === 0 && <div className="text-xs text-slate-400">No associates registered yet.</div>}
              {selectedAssociates.length > 0 && (
                <button onClick={() => setSelectedAssociates([])} className="text-xs font-semibold text-blue-600 hover:underline">
                  Show all associates
                </button>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Tag size={16} className="text-teal-600" /> Type Legend
            </div>
            <div className="space-y-2">
              {CALENDAR_TYPES.map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => toggleType(type)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600"
                  />
                  <span className={`h-2.5 w-2.5 rounded-sm ${TYPE_CONFIG[type].dot}`} />
                  {renderTypeIcon(type)}
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Link2 size={16} className="text-sky-600" /> Integrations
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <label className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span>Sync My Schedule with Google Calendar</span>
                <input
                  type="checkbox"
                  checked={syncSettings.syncMySchedule}
                  onChange={(event) => setSyncSettings((current) => ({ ...current, syncMySchedule: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span>Sync Entire Clinic Schedule with Google Calendar</span>
                <input
                  type="checkbox"
                  checked={syncSettings.syncEntireClinic}
                  onChange={(event) => setSyncSettings((current) => ({ ...current, syncEntireClinic: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
              </label>
              <p className="text-xs text-slate-400">Google Calendar controls are UI-ready and do not connect to an external account yet.</p>
            </div>
          </section>
        </aside>

        <section className="min-w-0">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
          {view === 'list' && renderListView()}
        </section>
      </div>

      {dayAgendaDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-wide text-slate-900">{getAgendaTitle(dayAgendaDate)}</h3>
                  <p className="text-sm text-slate-500">Visible schedules based on the active filters.</p>
                </div>
              </div>
              <button onClick={() => setDayAgendaDate(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-5">
              <div className="space-y-3">
                {getAppointmentsForDate(dayAgendaDate).map((appointment) => renderAgendaAppointmentCard(appointment))}
                {getAppointmentsForDate(dayAgendaDate).length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 py-14 text-center text-sm font-medium text-slate-400">
                    No schedules found for this day.
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-200 px-5 py-4">
              <button onClick={() => setDayAgendaDate(null)} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {actionMenu && (() => {
        const appointment = getAppointmentById(actionMenu.appointmentId);
        if (!appointment) return null;
        return (
          <div
            className="fixed z-[70] w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl"
            style={{ left: actionMenu.x, top: actionMenu.y }}
            onClick={(event) => event.stopPropagation()}
          >
            <button onClick={() => viewOrEditAppointment(appointment)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              <Eye size={15} className="text-blue-600" /> View Appointment
            </button>
            <button onClick={() => viewOrEditAppointment(appointment)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              <Edit3 size={15} className="text-orange-500" /> Edit Appointment
            </button>
            <button onClick={() => void addAppointmentNote(appointment)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              <MessageSquare size={15} className="text-teal-600" /> Add Note
            </button>
            <button onClick={() => sendSms(appointment)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              <MonitorSmartphone size={15} className="text-emerald-600" /> Send SMS
            </button>
            <button onClick={() => void cancelAppointment(appointment)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              <Ban size={15} className="text-rose-600" /> Cancel Appointment
            </button>
            <button onClick={() => openAppointmentInNewTab(appointment)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              <ExternalLink size={15} className="text-slate-500" /> Open in New Tab
            </button>
          </div>
        );
      })()}

      {hoverPreview && (() => {
        const record = patientById.get(hoverPreview.patientId);
        if (!record) return null;
        const rows = getPatientPreviewRows(record);
        return (
          <div
            className="fixed z-[65] w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
            style={{ left: hoverPreview.x, top: hoverPreview.y }}
          >
            <div className="font-black text-slate-900">{normalizePatientDisplayName(record)}</div>
            <div className="mt-3 space-y-2 text-sm">
              {rows.map((row) => (
                <div key={row.label} className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{row.label}</span>
                  <span className="min-w-0 break-words text-slate-700">{row.value}</span>
                </div>
              ))}
              {rows.length === 0 && <div className="text-slate-500">Not recorded</div>}
            </div>
          </div>
        );
      })()}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{editingAppointment ? 'Edit Appointment' : 'New Appointment'}</h3>
                  <p className="text-sm text-slate-500">Schedule dental consultations, recalls, and clinic events.</p>
                </div>
              </div>
              <button onClick={closeForm} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Patient / Client Name</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                      <input
                        value={patientSearch}
                        onChange={(event) => {
                          setPatientSearch(event.target.value);
                          setForm((current) => ({ ...current, patientName: event.target.value, patientId: '' }));
                        }}
                        className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder={form.type === 'Events / Schedules' ? 'Optional for events' : 'Search patient'}
                      />
                    </div>
                    {patientSearch && patientSuggestions.length > 0 && (
                      <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                        {patientSuggestions.map((record) => (
                          <button
                            key={record.id}
                            onClick={() => selectPatient(record)}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                          >
                            <div className="font-semibold text-slate-800">{normalizePatientDisplayName(record)}</div>
                            <div className="text-xs text-slate-400">{record.record_name || record.id}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={onAddNewPatient}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                    >
                      <UserPlus size={14} /> Quick Register New Patient
                    </button>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Appointment / Event Title</label>
                    <input
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Orthodontics Adjustment"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Dentist / Associate</label>
                    <select
                      value={form.dentistName}
                      onChange={(event) => setForm((current) => ({ ...current, dentistName: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select associate</option>
                      {associateNames.map((associate) => (
                        <option key={associate} value={associate}>{associate}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Date</label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Type</label>
                      <select
                        value={form.type}
                        onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as CalendarAppointmentType }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        {(appointmentTypes.length > 0 ? appointmentTypes : CALENDAR_TYPES).filter((type) => type !== 'Birthdays').map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Start Time</label>
                      <input
                        type="time"
                        value={form.time}
                        onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">End Time</label>
                      <input
                        type="time"
                        value={form.endTime}
                        onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
                      <select
                        value={form.status}
                        onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CalendarAppointmentStatus }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Treatment Tag</label>
                    <input
                      value={form.treatmentTag}
                      onChange={(event) => setForm((current) => ({ ...current, treatmentTag: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Orthodontics / Prophylaxis / Surgery"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Clinical Notes / Reason</label>
                <textarea
                  rows={5}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Notes, reason, or preparation reminders"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {editingAppointment && (
                  <button
                    onClick={() => void archiveAppointment()}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                  >
                    <Trash2 size={16} /> Archive
                  </button>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={closeForm} className="rounded-lg bg-orange-400 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500">
                  <X size={15} className="mr-1.5 inline" /> Cancel
                </button>
                <button
                  onClick={() => void saveAppointment()}
                  disabled={isSaving}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={15} className="mr-1.5 inline animate-spin" /> Saving
                    </>
                  ) : (
                    <>
                      {editingAppointment ? <Check size={15} className="mr-1.5 inline" /> : <Save size={15} className="mr-1.5 inline" />}
                      {editingAppointment ? 'Save Changes' : 'Save Appointment'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
