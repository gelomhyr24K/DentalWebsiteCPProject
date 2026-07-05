import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { 
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Search, Calendar, Check, Trash2, 
  Clock, ToggleLeft, ToggleRight, AlertCircle, RefreshCw, Filter, 
  CheckCircle2, X, CalendarDays, Users, Edit3, User, MoreHorizontal,
  FileText, Info, Cake, Globe, History, Stethoscope
} from 'lucide-react';
import { PatientRecord, ClinicUser } from '../../types';
import { clinicStorage } from '../../lib/indexedDBStorage';
const localStorage = clinicStorage;

interface ClinicCalendarProps {
  records: PatientRecord[];
  onAddNewPatient: () => void;
  registeredUsers?: ClinicUser[];
  onUpdatePatient?: (patient: PatientRecord) => void;
  onViewPatientDetails?: (patient: PatientRecord) => void;
}

export interface CalendarAppointment {
  id: string;
  patientName: string;
  dentistName: string;
  time: string; // e.g. "10:00 AM"
  date: string; // e.g. "2026-06-25"
  type: 'Appointments' | 'Recalls' | 'Birthdays' | 'Events / Schedules' | 'Online Bookings' | 'Google Calendar';
  status: 'Pending' | 'Completed' | 'Cancelled';
  notes: string;
  treatmentTag?: string;
}

const APPOINTMENT_TYPES = [
  { name: 'Appointments', color: 'bg-violet-600 text-violet-850 border-violet-400' },
  { name: 'Recalls', color: 'bg-indigo-650 text-indigo-850 border-indigo-400' },
  { name: 'Birthdays', color: 'bg-rose-650 text-rose-850 border-rose-400' },
  { name: 'Events / Schedules', color: 'bg-amber-650 text-amber-850 border-amber-400' },
  { name: 'Online Bookings', color: 'bg-sky-650 text-sky-850 border-sky-400' },
  { name: 'Google Calendar', color: 'bg-zinc-650 text-zinc-850 border-zinc-400' },
] as const;

type AppType = typeof APPOINTMENT_TYPES[number]['name'];

const getAppointmentColor = (type: string) => {
  switch (type) {
    case 'Appointments':
      return { bg: '#2563EB', text: '#FFFFFF' };
    case 'Events / Schedules':
      return { bg: '#7C3AED', text: '#FFFFFF' };
    case 'Birthdays':
      return { bg: '#DC2626', text: '#FFFFFF' };
    case 'Online Bookings':
      return { bg: '#059669', text: '#FFFFFF' };
    case 'Google Calendar':
      return { bg: '#EA4335', text: '#FFFFFF' };
    case 'Recalls':
      return { bg: '#4F46E5', text: '#FFFFFF' };
    default:
      return { bg: '#4B5563', text: '#FFFFFF' };
  }
};

const renderAppointmentIcon = (type: string, sizeClass = "w-4 h-4") => {
  switch (type) {
    case 'Appointments':
      return <Stethoscope className={`${sizeClass} shrink-0 text-[#2563EB]`} />;
    case 'Recalls':
      return <History className={`${sizeClass} shrink-0 text-[#4F46E5]`} />;
    case 'Birthdays':
      return <Cake className={`${sizeClass} shrink-0 text-[#DC2626]`} />;
    case 'Events / Schedules':
      return <CalendarDays className={`${sizeClass} shrink-0 text-[#7C3AED]`} />;
    case 'Online Bookings':
      return <Calendar className={`${sizeClass} shrink-0 text-[#059669]`} />;
    case 'Google Calendar':
      return <Globe className={`${sizeClass} shrink-0 text-[#EA4335]`} />;
    default:
      return <Calendar className={`${sizeClass} shrink-0 text-[#4B5563]`} />;
  }
};

const getLocalDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const LOCAL_STORAGE_KEY = 'DENTAL_CLINIC_CALENDAR_APPOINTMENTS_PRODUCTION';

const INITIAL_APPOINTMENTS: CalendarAppointment[] = [];

const ToothIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
    <path d="M12,2C8.5,2,6,4.5,6,8c0,3,1.5,5.5,3,7.5c0.5,0.7,0.5,1.5,0.5,2.5c0,2,1.5,3.5,3,3.5s2-1,2.5-2c0.5,1,1,2,2.5,2s3-1.5,3-3.5c0-1,0-1.8,0.5-2.5c1.5-2,3-4.5,3-7.5C21,5.2,18.4,2.5,15.2,2C14.1,2.5,13.1,3,12,3.3C10.9,3,9.9,2.5,12,2z" />
  </svg>
);

export default function ClinicCalendar({ 
  records, 
  onAddNewPatient, 
  registeredUsers,
  onUpdatePatient,
  onViewPatientDetails
}: ClinicCalendarProps) {
  // Dynamically load active registered owner & associates who have displayInCalendar !== false
  const dynamicAssociates = useMemo(() => {
    let users: ClinicUser[] = [];
    if (registeredUsers && registeredUsers.length > 0) {
      users = registeredUsers;
    } else {
      try {
        const stored = localStorage.getItem('DENTAL_USERS');
        if (stored) {
          users = JSON.parse(stored);
        }
      } catch (e) {
        console.error(e);
      }
    }

    const filteredUsers = users.filter(u => 
      u.status === 'Active' && 
      (u.role === 'Clinic Owner' || u.role === 'Associate Dentist') &&
      u.displayInCalendar !== false
    );

    return filteredUsers.map((u, index) => {
      let dentistNameInAppt = u.name;
      if (u.role === 'Clinic Owner' && u.name.includes('Maria Jessica')) {
        dentistNameInAppt = 'Dr. Maria Jessica Tanarte';
      } else if (!dentistNameInAppt.startsWith('Dr.')) {
        dentistNameInAppt = `Dr. ${dentistNameInAppt}`;
      }

      const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      
      const colors = [
        'bg-violet-600 text-white',
        'bg-teal-600 text-white',
        'bg-sky-600 text-white',
        'bg-rose-600 text-white',
        'bg-emerald-600 text-white',
        'bg-indigo-600 text-white'
      ];
      const textColors = [
        'text-violet-750 font-bold',
        'text-teal-750 font-bold',
        'text-sky-750 font-bold',
        'text-rose-750 font-bold',
        'text-emerald-750 font-bold',
        'text-indigo-750 font-bold'
      ];

      return {
        id: u.id,
        name: dentistNameInAppt,
        initial: initials || 'DR',
        color: colors[index % colors.length],
        textColor: textColors[index % textColors.length]
      };
    });
  }, [registeredUsers]);

  const [appointments, setAppointments] = useState<CalendarAppointment[]>(() => {
    const mapInitialOrParsed = (list: any[]) => {
      return list.map(appt => {
        if (appt.type === 'Appointments') {
          if (appt.treatmentTag === 'RECALL') return { ...appt, type: 'Recalls' };
          if (appt.treatmentTag === 'BIRTHDAY') return { ...appt, type: 'Birthdays' };
          if (appt.treatmentTag === 'MEETING') return { ...appt, type: 'Events / Schedules' };
          if (appt.treatmentTag === 'ONLINE CONSULT') return { ...appt, type: 'Online Bookings' };
        }
        return appt;
      });
    };
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return mapInitialOrParsed(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [activeView, setActiveView] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 5, 26)); // default to June 2026
  const [focusedDate, setFocusedDate] = useState<Date>(() => new Date(2026, 5, 26));

  // Collapsible lists
  const [associatesExpanded, setAssociatesExpanded] = useState(true);
  const [typesExpanded, setTypesExpanded] = useState(true);

  // Filters State
  const [associateSearch, setAssociateSearch] = useState('');
  const [selectedAssociates, setSelectedAssociates] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<AppType[]>([]);

  // Sync state
  const [syncMySchedule, setSyncMySchedule] = useState(true);
  const [syncEntireClinic, setSyncEntireClinic] = useState(false);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Dropdown states
  const [activeDropdownApptId, setActiveDropdownApptId] = useState<string | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  } | null>(null);

  // Hover card state
  const [hoveredPatient, setHoveredPatient] = useState<{
    name: string;
    address: string;
    age: number;
    gender: string;
    medicalCondition: string;
    lastCallSummary: string;
    x: number;
    y: number;
  } | null>(null);

  // Form states
  const [formPatientName, setFormPatientName] = useState('');
  const [formDentist, setFormDentist] = useState(() => {
    return dynamicAssociates[0]?.name || 'Dr. Maria Jessica Tanarte';
  });
  
  // Update formDentist when dynamicAssociates loaded
  useEffect(() => {
    if (dynamicAssociates.length > 0 && !formDentist) {
      setFormDentist(dynamicAssociates[0].name);
    }
  }, [dynamicAssociates]);
  const [formDate, setFormDate] = useState('2026-06-26');
  const [formTime, setFormTime] = useState('10:00 AM');
  const [formType, setFormType] = useState<AppType>('Appointments');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'Pending' | 'Completed' | 'Cancelled' | 'Scheduled' | 'Rescheduled' | 'Missed'>('Pending');
  const [formTreatmentTag, setFormTreatmentTag] = useState('');
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);

  const patientSuggestions = useMemo(() => {
    if (!formPatientName.trim()) return [];
    return records.filter(p => {
      const full = `${p.personalInfo.lastName}, ${p.personalInfo.firstName}`.toLowerCase();
      const nick = (p.personalInfo.nickname || '').toLowerCase();
      const q = formPatientName.toLowerCase();
      return full.includes(q) || nick.includes(q);
    }).slice(0, 5);
  }, [formPatientName, records]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    if (!isDayModalOpen) {
      setActiveDropdownApptId(null);
      setDropdownCoords(null);
    }
  }, [isDayModalOpen]);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const calculateAge = (birthdate: string) => {
    if (!birthdate) return 24;
    const birth = new Date(birthdate);
    if (isNaN(birth.getTime())) return 24;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const findPatientRecord = (patientName: string) => {
    return records.find(p => {
      const full = `${p.personalInfo.firstName} ${p.personalInfo.lastName}`.toLowerCase();
      const reverse = `${p.personalInfo.lastName} ${p.personalInfo.firstName}`.toLowerCase();
      const q = patientName.toLowerCase();
      return full.includes(q) || reverse.includes(q);
    });
  };

  const handleMouseEnterPatient = (e: React.MouseEvent, patientName: string) => {
    const record = findPatientRecord(patientName);
    const age = record?.personalInfo?.birthdate ? calculateAge(record.personalInfo.birthdate) : 24;
    const gender = record?.personalInfo?.sex || 'Female';
    const medicalCondition = record?.medicalHistory?.medicalAlert || record?.medicalHistory?.allergiesToMedications || 'No Known Allergies';

    const rect = e.currentTarget.getBoundingClientRect();

    setHoveredPatient({
      name: patientName,
      address: record?.personalInfo?.address || 'Angeles City, Pampanga',
      age,
      gender,
      medicalCondition,
      lastCallSummary: `Confirmed appointment for June 26, 2026.`,
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  const handleMouseMovePatient = () => {
    // Tooltip is anchored, no mouse follow needed for static premium positioning
  };

  const handleMouseLeavePatient = () => {
    setHoveredPatient(null);
  };

  // Merge manual appointments and dynamically computed recalls from progress notes
  const allAppointments = useMemo(() => {
    // Filter out manual 'Recalls' so that progress notes are the single source of truth for recalls
    const manualAppts = appointments.filter(appt => appt.type !== 'Recalls');

    const recallAppts: CalendarAppointment[] = [];
    records.forEach(p => {
      if (p.progressNotes) {
        p.progressNotes.forEach(note => {
          if (note.recallDate) {
            const status = note.recallStatus || 'Scheduled';
            const procedures = note.items && note.items.length > 0
              ? note.items.map(item => item.serviceProcedure).join(', ')
              : (note.remarks || 'Routine Checkup');

            recallAppts.push({
              id: `recall-${p.id}-${note.id}`,
              patientName: `${p.personalInfo.lastName}, ${p.personalInfo.firstName}`,
              dentistName: "Dr. Maria Jessica Tanarte", // Assigned Dentist
              time: note.recallTime || '10:00 AM',
              date: note.recallDate, // format: YYYY-MM-DD
              type: 'Recalls',
              status: status as any, // Scheduled, Completed, etc.
              notes: note.recallReason || 'Patient Dental Recall',
              treatmentTag: 'RECALL',
              // extra metadata for display card
              patientId: p.id,
              contactNumber: p.personalInfo.mobile,
              previousProcedure: procedures,
              recallPurpose: note.recallReason || 'Routine Recall Visit',
              latestProgressNoteId: note.id,
              latestProgressNoteText: note.remarks || 'No remarks detail.',
              isRecallEvent: true
            } as any);
          }
        });
      }
    });

    return [...manualAppts, ...recallAppts];
  }, [appointments, records]);

  // Filtered Appointments: ALWAYS display everything by default, respect selectedTypes exactly
  const filteredAppointments = useMemo(() => {
    return allAppointments.filter(appt => {
      const matchesType = selectedTypes.includes(appt.type);
      const matchesAssociate = selectedAssociates.length === 0 || selectedAssociates.includes(appt.dentistName);
      return matchesType && matchesAssociate;
    });
  }, [allAppointments, selectedTypes, selectedAssociates]);

  const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  const handlePrev = () => {
    if (activeView === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (activeView === 'week') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7));
    } else if (activeView === 'day') {
      const nextDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
      setCurrentDate(nextDay);
      setFocusedDate(nextDay);
    }
  };

  const handleNext = () => {
    if (activeView === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (activeView === 'week') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7));
    } else if (activeView === 'day') {
      const nextDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
      setCurrentDate(nextDay);
      setFocusedDate(nextDay);
    }
  };

  const handleToday = () => {
    const today = new Date(2026, 5, 26);
    setCurrentDate(today);
    setFocusedDate(today);
  };

  const handleDateClick = (date: Date) => {
    setFocusedDate(date);
    setFormDate(getLocalDateString(date));
    setIsDayModalOpen(true);
  };

  const openNewAppointment = (defaultDateString?: string) => {
    setFormPatientName('');
    setFormDentist(dynamicAssociates[0]?.name || 'Dr. Maria Jessica Tanarte');
    setFormDate(defaultDateString || getLocalDateString(focusedDate));
    setFormTime('10:00 AM');
    setFormType('Appointments');
    setFormNotes('');
    setFormStatus('Pending');
    setFormTreatmentTag('');
    setIsNewModalOpen(true);
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatientName.trim()) return;

    const newAppt: CalendarAppointment = {
      id: `appt-${Date.now()}`,
      patientName: formPatientName,
      dentistName: formDentist,
      time: formTime,
      date: formDate,
      type: formType,
      status: formStatus,
      notes: formNotes,
      treatmentTag: formTreatmentTag || undefined
    };

    setAppointments(prev => [newAppt, ...prev]);
    setIsNewModalOpen(false);
    showSuccess(`Appointment for ${formPatientName} successfully booked!`);
  };

  const openEditAppointment = (appt: CalendarAppointment) => {
    setSelectedAppointment(appt);
    setFormPatientName(appt.patientName);
    setFormDentist(appt.dentistName);
    setFormDate(appt.date);
    setFormTime(appt.time);
    setFormType(appt.type);
    setFormNotes(appt.notes);
    setFormStatus(appt.status);
    setFormTreatmentTag(appt.treatmentTag || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateRecallEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !onUpdatePatient) return;

    const patientId = (selectedAppointment as any).patientId;
    const noteId = (selectedAppointment as any).latestProgressNoteId;
    const patient = records.find(r => r.id === patientId);

    if (patient && patient.progressNotes) {
      const updatedNotes = patient.progressNotes.map(note => {
        if (note.id === noteId) {
          return {
            ...note,
            recallDate: formDate,
            recallTime: formTime,
            recallReason: formNotes,
            recallStatus: formStatus as any
          };
        }
        return note;
      });

      onUpdatePatient({
        ...patient,
        progressNotes: updatedNotes
      });

      setIsEditModalOpen(false);
      showSuccess(`Recall appointment details updated and synchronized successfully!`);
    }
  };

  const handleDeleteRecallEvent = () => {
    if (!selectedAppointment || !onUpdatePatient) return;
    if (window.confirm("Are you sure you want to remove this recall date from the patient's progress notes? This will unschedule the recall from the calendar.")) {
      const patientId = (selectedAppointment as any).patientId;
      const noteId = (selectedAppointment as any).latestProgressNoteId;
      const patient = records.find(r => r.id === patientId);

      if (patient && patient.progressNotes) {
        const updatedNotes = patient.progressNotes.map(note => {
          if (note.id === noteId) {
            return {
              ...note,
              recallDate: '',
              recallStatus: undefined
            };
          }
          return note;
        });

        onUpdatePatient({
          ...patient,
          progressNotes: updatedNotes
        });

        setIsEditModalOpen(false);
        showSuccess("Recall date removed. Calendar unscheduled.");
      }
    }
  };

  const handleUpdateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    if ((selectedAppointment as any).isRecallEvent) {
      handleUpdateRecallEvent(e);
      return;
    }

    setAppointments(prev => prev.map(a => a.id === selectedAppointment.id ? {
      ...a,
      patientName: formPatientName,
      dentistName: formDentist,
      date: formDate,
      time: formTime,
      type: formType,
      notes: formNotes,
      status: formStatus as any,
      treatmentTag: formTreatmentTag || undefined
    } : a));

    setIsEditModalOpen(false);
    showSuccess(`Appointment details updated successfully!`);
  };

  const handleDeleteAppointment = (id: string) => {
    if (selectedAppointment && (selectedAppointment as any).isRecallEvent) {
      handleDeleteRecallEvent();
      return;
    }
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      setAppointments(prev => prev.filter(a => a.id !== id));
      setIsEditModalOpen(false);
      showSuccess("Appointment deleted successfully.");
    }
  };

  const getTreatmentTag = (appt: CalendarAppointment) => {
    if (appt.treatmentTag) return appt.treatmentTag.toUpperCase();
    if (appt.type === 'Recalls') return 'RECALL / CLEANING';
    if (appt.type === 'Birthdays') return 'BIRTHDAY';
    if (appt.type === 'Events / Schedules') return 'CLINIC SCHEDULE';
    if (appt.type === 'Online Bookings') return 'ONLINE CONSULT';
    return 'DENTAL TREATMENT';
  };

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    for (let i = firstDayIndex; i > 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevLastDay - i + 1),
        isCurrentMonth: false,
        key: `prev-${prevLastDay - i + 1}`
      });
    }
    for (let i = 1; i <= lastDay; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
        key: `curr-${i}`
      });
    }
    const totalDays = days.length;
    const remainingDays = 42 - totalDays;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        key: `next-${i}`
      });
    }
    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const current = new Date(currentDate);
    const day = current.getDay();
    const diff = current.getDate() - day;
    const sunday = new Date(current.setDate(diff));

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i));
    }
    return days;
  }, [currentDate]);

  const toggleType = (name: AppType) => {
    setSelectedTypes(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

  const toggleAssociate = (name: string) => {
    setSelectedAssociates(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  // Safe coordinates for hover card
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  let safeX = hoveredPatient ? hoveredPatient.x : 0;
  let safeY = hoveredPatient ? hoveredPatient.y : 0;
  let renderBelow = false;

  if (hoveredPatient) {
    const halfWidth = 144;
    const margin = 16;
    // Clamp horizontally
    if (safeX - halfWidth < margin) {
      safeX = margin + halfWidth;
    } else if (safeX + halfWidth > screenWidth - margin) {
      safeX = screenWidth - margin - halfWidth;
    }
    // Check if it goes off the top of the viewport
    if (safeY - 270 < margin) {
      renderBelow = true;
      safeY = safeY + 20; // Position below the text
    } else {
      safeY = safeY - 8; // Position above the text
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER BLOCK */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-transparent pb-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight font-display">
            Clinic Appointments
          </h2>
          <span className="text-sm text-zinc-500 font-medium md:mt-1">
            Manage clinic appointments.
          </span>
          
          {/* Calendar / List View Selector next to header */}
          <div className="flex border border-zinc-200 rounded-lg overflow-hidden p-0.5 bg-white shadow-3xs ml-0 sm:ml-4 self-start sm:self-auto">
            <button
              onClick={() => setActiveView('month')}
              className={`px-4 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeView !== 'list'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 bg-transparent'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`px-4 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeView === 'list'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 bg-transparent'
              }`}
            >
              List View
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openNewAppointment()}
            className="inline-flex items-center gap-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> New Appointment
          </button>
          <button
            onClick={() => {
              openNewAppointment();
              // Select Events / Schedules type
              setTimeout(() => {
                const typeSelect = document.getElementById('appt-type-select') as HTMLSelectElement;
                if (typeSelect) {
                  typeSelect.value = 'Events / Schedules';
                  typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }, 100);
            }}
            className="inline-flex items-center gap-1.5 bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4" /> Events/Schedules
          </button>
        </div>
      </div>

      {/* TOP CONTROLS (Month Navigators) */}
      <div className="bg-white p-4.5 rounded-2xl shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-1 p-1 bg-zinc-50 rounded-lg">
          <button 
            onClick={handlePrev} 
            className="bg-teal-700 text-white text-xs font-bold px-4 py-1.5 rounded-md hover:bg-teal-800 transition-colors cursor-pointer"
          >
            Previous
          </button>
          <button 
            onClick={handleToday} 
            className="bg-white border border-zinc-200 text-zinc-700 text-xs font-bold px-4 py-1.5 rounded-md hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            Today
          </button>
          <button 
            onClick={handleNext} 
            className="bg-teal-700 text-white text-xs font-bold px-4 py-1.5 rounded-md hover:bg-teal-800 transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>

        <span className="text-2xl font-light text-zinc-800 font-sans tracking-wide">
          {activeView === 'day' 
            ? focusedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
            : `${currentMonthName} ${currentYear}`}
        </span>

        <div className="flex rounded-lg overflow-hidden p-0.5 bg-zinc-50">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer capitalize ${
                activeView === v 
                  ? 'bg-teal-700 text-white shadow-xs' 
                  : 'text-zinc-600 hover:text-zinc-900 bg-transparent'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* TWO COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: FILTERS */}
        <div className="lg:col-span-3 space-y-5">
          {/* ASSOCIATES FILTERS (Collapsible) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
            <div 
              onClick={() => setAssociatesExpanded(!associatesExpanded)}
              className="flex items-center justify-between cursor-pointer select-none group"
            >
              <span className="text-sm font-bold text-zinc-900 flex items-center gap-2 group-hover:text-teal-700 transition-colors">
                <Users className="w-4.5 h-4.5 text-teal-600" /> Associates
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-zinc-100 text-zinc-600 font-bold px-2 py-0.5 rounded-full">
                  {selectedAssociates.length}
                </span>
                {associatesExpanded ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </div>
            </div>

            {associatesExpanded && (
              <div className="space-y-4 pt-1">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search associate..."
                    value={associateSearch}
                    onChange={(e) => setAssociateSearch(e.target.value)}
                    className="w-full bg-zinc-50 hover:bg-zinc-100/70 border border-zinc-200 rounded-xl pl-8.5 pr-3 py-1.5 text-xs font-medium text-zinc-800 outline-hidden transition-all placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white"
                  />
                </div>

                {/* No-border high contrast checklist */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {dynamicAssociates.filter(a => a.name.toLowerCase().includes(associateSearch.toLowerCase())).map((assoc) => {
                    const isSelected = selectedAssociates.includes(assoc.name);
                    return (
                      <label 
                        key={assoc.id} 
                        className="flex items-center gap-3 text-xs font-bold text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer select-none"
                      >
                        <input
                           type="checkbox"
                           checked={isSelected}
                           onChange={() => toggleAssociate(assoc.name)}
                           className="rounded-md border-zinc-300 text-teal-600 focus:ring-teal-500 h-4.5 w-4.5 shrink-0 cursor-pointer transition-all"
                        />
                        <span className={`flex-1 truncate ${assoc.textColor}`}>
                          {assoc.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* APPOINTMENT TYPES (Collapsible) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
            <div 
              onClick={() => setTypesExpanded(!typesExpanded)}
              className="flex items-center justify-between cursor-pointer select-none group"
            >
              <span className="text-sm font-bold text-zinc-900 flex items-center gap-2 group-hover:text-teal-700 transition-colors">
                <CalendarDays className="w-4.5 h-4.5 text-teal-600" /> Type Legend
              </span>
              {typesExpanded ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              )}
            </div>

            {typesExpanded && (
              <div className="space-y-3 pt-1">
                {APPOINTMENT_TYPES.map((type) => {
                  const isSelected = selectedTypes.includes(type.name);
                  const colors = getAppointmentColor(type.name);

                  return (
                    <label 
                      key={type.name}
                      className="flex items-center gap-3 text-xs font-bold text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleType(type.name)}
                        className="rounded-md border-zinc-300 text-teal-600 focus:ring-teal-500 h-4.5 w-4.5 shrink-0 cursor-pointer transition-all"
                      />
                      <span className="flex items-center gap-2.5">
                        <span 
                          className="w-3.5 h-3.5 rounded-sm inline-block shrink-0 shadow-3xs border border-white" 
                          style={{ backgroundColor: colors.bg }}
                        />
                        <span className="text-zinc-800 font-extrabold">{type.name}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* GOOGLE CALENDAR SYNC */}
          <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4.5">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider block border-b border-zinc-100 pb-1.5">
              Integrations
            </div>
            
            <label className="flex items-start gap-3 cursor-pointer select-none group">
              <div 
                onClick={() => setSyncMySchedule(!syncMySchedule)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden mt-0.5 ${syncMySchedule ? 'bg-teal-600' : 'bg-zinc-200'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${syncMySchedule ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-900 transition-colors leading-tight">
                Sync My Schedule with Google Calendar
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none group">
              <div 
                onClick={() => setSyncEntireClinic(!syncEntireClinic)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden mt-0.5 ${syncEntireClinic ? 'bg-teal-600' : 'bg-zinc-200'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${syncEntireClinic ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-900 transition-colors leading-tight">
                Sync Entire Clinic Schedule with Google Calendar
              </span>
            </label>
          </div>
        </div>

        {/* RIGHT COLUMN: CALENDAR DISPLAY */}
        <div className="lg:col-span-9 bg-white rounded-2xl shadow-sm overflow-hidden">
          <AnimatePresence mode="wait">
            {/* MONTH VIEW */}
            {activeView === 'month' && (
              <motion.div
                key="month"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-[#E5E7EB] p-[1px]"
              >
                <div className="grid grid-cols-7 bg-zinc-50 mb-[1px] rounded-t-xl">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="py-2.5 text-center text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-[1px] bg-[#E5E7EB] rounded-b-xl overflow-hidden">
                  {monthDays.map((dayObj) => {
                    const dateString = getLocalDateString(dayObj.date);
                    const dayAppts = filteredAppointments.filter(a => a.date === dateString);
                    const isToday = dateString === '2026-06-26';
                    const isSelectedDay = focusedDate && dayObj.date.toDateString() === focusedDate.toDateString();

                    return (
                      <div
                        key={dayObj.key}
                        onClick={() => handleDateClick(dayObj.date)}
                        className={`min-h-[112px] p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 ease-in-out ${
                          dayObj.isCurrentMonth ? 'bg-white' : 'bg-zinc-50/40 text-zinc-400'
                        } ${
                          isSelectedDay 
                            ? 'ring-2 ring-[#0F9D9A] ring-inset bg-[#F0FDFA]' 
                            : isToday 
                              ? 'ring-2 ring-teal-500/50 ring-inset bg-teal-50/10' 
                              : 'hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            {dayAppts.length > 0 ? (
                              <span className="text-[9px] bg-zinc-900 text-white font-extrabold px-1.5 py-0.5 rounded-md">
                                {dayAppts.length}
                              </span>
                            ) : (
                              <span className="invisible text-[9px] px-1.5 py-0.5">0</span>
                            )}
                          </div>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                            isToday ? 'bg-teal-600 text-white font-black shadow-3xs' : 'text-zinc-650 font-extrabold'
                          }`}>
                            {dayObj.date.getDate()}
                          </span>
                        </div>

                        {/* Compact high-contrast event icons inside month days */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2.5 justify-start select-none">
                          {dayAppts.slice(0, 5).map((appt) => (
                            <div 
                              key={appt.id} 
                              className="shrink-0 transition-transform duration-150 hover:scale-115"
                              title={`${appt.time} - ${appt.patientName} (${appt.type})`}
                            >
                              {renderAppointmentIcon(appt.type, "w-4.5 h-4.5")}
                            </div>
                          ))}
                          {dayAppts.length > 5 && (
                            <span 
                              className="text-[9px] font-extrabold text-zinc-500 bg-zinc-100 px-1 py-0.5 rounded-sm shrink-0 self-center"
                              title={`${dayAppts.length - 5} more records`}
                            >
                              +{dayAppts.length - 5}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* WEEK VIEW */}
            {activeView === 'week' && (
              <motion.div
                key="week"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-7 gap-[1px] bg-[#E5E7EB] p-[1px] rounded-xl overflow-hidden"
              >
                {weekDays.map((wDay) => {
                  const dateStr = getLocalDateString(wDay);
                  const dayAppts = filteredAppointments.filter(a => a.date === dateStr);
                  const isToday = dateStr === '2026-06-26';
                  const isSelectedDay = focusedDate && wDay.toDateString() === focusedDate.toDateString();

                  return (
                    <div
                      key={dateStr}
                      onClick={() => handleDateClick(wDay)}
                      className={`min-h-[240px] p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 ease-in-out ${
                        isSelectedDay 
                          ? 'ring-2 ring-[#0F9D9A] ring-inset bg-[#F0FDFA]' 
                          : isToday 
                            ? 'ring-2 ring-teal-500/50 ring-inset bg-teal-50/10' 
                            : 'bg-white hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        {dayAppts.length > 0 ? (
                          <span className="text-[9px] bg-zinc-900 text-white font-extrabold px-1.5 py-0.5 rounded-md">
                            {dayAppts.length}
                          </span>
                        ) : (
                          <span className="invisible text-[9px] px-1.5 py-0.5">0</span>
                        )}
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 font-extrabold uppercase block leading-none">
                            {wDay.toLocaleDateString('default', { weekday: 'short' })}
                          </span>
                          <span className={`text-sm font-extrabold block mt-1 ${isToday ? 'text-teal-650 font-black' : 'text-zinc-700'}`}>
                            {wDay.getDate()}
                          </span>
                        </div>
                      </div>

                      {/* Compact high-contrast event list inside week days */}
                      <div className="space-y-1 mt-auto pt-2">
                        {dayAppts.slice(0, 4).map((appt) => {
                          const colors = getAppointmentColor(appt.type);

                          return (
                            <div
                              key={appt.id}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs truncate shadow-3xs text-white"
                              style={{ backgroundColor: colors.bg }}
                              title={`${appt.time} - ${appt.patientName}`}
                            >
                              {appt.time} {appt.patientName}
                            </div>
                          );
                        })}
                        {dayAppts.length > 4 && (
                          <div className="text-[8px] font-black text-zinc-500 pl-1">
                            +{dayAppts.length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* DAY VIEW */}
            {activeView === 'day' && (
              <motion.div
                key="day"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-5 space-y-4"
              >
                <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                      Timeline for {focusedDate.toLocaleDateString('default', { month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <button
                    onClick={() => openNewAppointment(getLocalDateString(focusedDate))}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Book Schedule
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {filteredAppointments.filter(a => a.date === getLocalDateString(focusedDate)).length === 0 ? (
                    <div className="text-center py-12 text-zinc-400">No schedules set for this date.</div>
                  ) : (
                    filteredAppointments
                      .filter(a => a.date === getLocalDateString(focusedDate))
                      .sort((a,b) => a.time.localeCompare(b.time))
                      .map((appt) => (
                        <div 
                          key={appt.id} 
                          onClick={() => openEditAppointment(appt)}
                          className="p-3.5 border border-zinc-200 rounded-xl flex justify-between items-center bg-zinc-50/20 hover:bg-zinc-50 transition-all cursor-pointer"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-zinc-700">{appt.time}</span>
                              <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md font-bold">{getTreatmentTag(appt)}</span>
                            </div>
                            <span 
                              onMouseEnter={(e) => handleMouseEnterPatient(e, appt.patientName)}
                              onMouseMove={handleMouseMovePatient}
                              onMouseLeave={handleMouseLeavePatient}
                              className="text-sm font-black text-zinc-900 mt-1 block hover:text-teal-600 transition-colors cursor-pointer border-b border-dashed border-zinc-200"
                            >
                              {appt.patientName}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-zinc-500">[{appt.dentistName}]</span>
                        </div>
                      ))
                  )}
                </div>
              </motion.div>
            )}

            {/* LIST VIEW */}
            {activeView === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-5 space-y-4"
              >
                <div className="border-b border-zinc-150 pb-2.5 flex justify-between items-center">
                  <span className="text-[10px] font-black text-zinc-450 uppercase tracking-wider">All scheduled operations</span>
                  <span className="text-xs font-extrabold text-teal-600">{filteredAppointments.length} Entries</span>
                </div>

                <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                  {filteredAppointments.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400">No appointments matched the types list.</div>
                  ) : (
                    filteredAppointments
                      .sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                      .map((appt) => (
                        <div 
                          key={appt.id} 
                          onClick={() => openEditAppointment(appt)}
                          className="bg-white border border-zinc-200 hover:border-zinc-350 p-3.5 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:bg-zinc-50/30"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-500">{appt.date} ({appt.time})</span>
                              <span className="text-[9px] font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-md">{getTreatmentTag(appt)}</span>
                            </div>
                            <h4 
                              onMouseEnter={(e) => handleMouseEnterPatient(e, appt.patientName)}
                              onMouseMove={handleMouseMovePatient}
                              onMouseLeave={handleMouseLeavePatient}
                              className="text-sm font-black text-zinc-900 mt-1 hover:text-teal-600 transition-colors border-b border-dashed border-zinc-200 inline-block"
                            >
                              {appt.patientName}
                            </h4>
                          </div>
                          <div className="text-right text-xs font-bold text-zinc-600">[{appt.dentistName}]</div>
                        </div>
                      ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SUCCESS TOAST */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* HOVERCARD OVERLAY */}
      <AnimatePresence>
        {hoveredPatient && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[9999] bg-white border border-zinc-200 shadow-2xl rounded-2xl p-4 w-72 pointer-events-none text-left animate-in fade-in zoom-in-95 duration-100"
            style={{ 
              left: `${safeX}px`, 
              top: `${safeY}px`,
              transform: renderBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
            }}
          >
            {/* Directional Tooltip Arrow */}
            {renderBelow ? (
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-zinc-200 rotate-45" />
            ) : (
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-zinc-200 rotate-45" />
            )}

            <div className="border-b border-zinc-100 pb-2 mb-2">
              <h4 className="font-extrabold text-zinc-900 text-sm tracking-tight">{hoveredPatient.name}</h4>
              <span className="text-[9px] font-black text-teal-600 uppercase tracking-widest block mt-0.5">Patient hover preview</span>
            </div>
            <div className="space-y-1.5 text-xs text-zinc-600 font-semibold">
              <div className="flex justify-between">
                <span className="text-zinc-400">Address:</span>
                <span className="text-zinc-800 font-bold truncate max-w-[160px]">{hoveredPatient.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Age:</span>
                <span className="text-zinc-800 font-bold">{hoveredPatient.age}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Gender:</span>
                <span className="text-zinc-800 font-bold">{hoveredPatient.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Medical Condition:</span>
                <span className="text-red-650 font-bold truncate max-w-[150px]">{hoveredPatient.medicalCondition}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-zinc-100">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Last Call Summary</span>
                <p className="text-[11px] text-zinc-500 font-semibold bg-zinc-50 p-2 rounded-lg border border-zinc-150 leading-relaxed">
                  {hoveredPatient.lastCallSummary}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. DATE CLICK modal */}
      <AnimatePresence>
        {isDayModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col"
            >
              <div className="px-5 py-4 bg-zinc-50 border-b border-zinc-150 flex items-center justify-between">
                <span className="text-xs font-black text-zinc-800 uppercase tracking-widest flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-teal-600" /> Agenda for {focusedDate.toLocaleDateString('default', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <button onClick={() => setIsDayModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 font-extrabold text-sm cursor-pointer">✕</button>
              </div>

              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {filteredAppointments.filter(a => a.date === getLocalDateString(focusedDate)).length === 0 ? (
                  <div className="text-center py-10 text-zinc-400 border border-dashed border-zinc-150 rounded-xl">
                    <Clock className="w-8 h-8 text-zinc-350 mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase tracking-wide">No schedules set for this day.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAppointments
                      .filter(a => a.date === getLocalDateString(focusedDate))
                      .sort((a,b) => a.time.localeCompare(b.time))
                      .map((appt) => (
                        <div 
                          key={appt.id}
                          className="relative p-4 rounded-xl border border-zinc-200 bg-white shadow-3xs flex justify-between items-center gap-3 transition-all hover:bg-zinc-50/10 group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="text-xs font-extrabold text-zinc-800">{appt.time}</span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100">
                                {getTreatmentTag(appt)}
                              </span>
                            </div>

                            <div className="mt-1.5 flex items-baseline gap-2">
                              <span 
                                onMouseEnter={(e) => handleMouseEnterPatient(e, appt.patientName)}
                                onMouseMove={handleMouseMovePatient}
                                onMouseLeave={handleMouseLeavePatient}
                                className="text-sm font-black text-zinc-900 cursor-pointer hover:text-teal-600 transition-colors border-b border-dashed border-zinc-300"
                              >
                                {appt.patientName}
                              </span>
                              <span className="text-[11px] font-bold text-zinc-400">[{appt.dentistName}]</span>
                            </div>
                            {appt.notes && <p className="text-[11px] text-zinc-400 mt-1 italic">"{appt.notes}"</p>}
                          </div>

                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeDropdownApptId === appt.id) {
                                  setActiveDropdownApptId(null);
                                  setDropdownCoords(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setActiveDropdownApptId(appt.id);
                                  setDropdownCoords({
                                    top: rect.top,
                                    bottom: rect.bottom,
                                    left: rect.left,
                                    right: rect.right,
                                    width: rect.width,
                                    height: rect.height,
                                  });
                                }
                              }}
                              className="p-2 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-750 rounded-lg border border-zinc-150 cursor-pointer transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setIsDayModalOpen(false);
                    openNewAppointment(getLocalDateString(focusedDate));
                  }}
                  className="w-full py-2.5 border border-dashed border-zinc-300 hover:border-zinc-900 rounded-xl text-xs font-bold text-zinc-650 hover:text-zinc-950 text-center transition-all bg-zinc-50/30 hover:bg-zinc-50/50 cursor-pointer"
                >
                  + Add Booking for {focusedDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                </button>
              </div>

              <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-150 flex justify-end">
                <button onClick={() => setIsDayModalOpen(false)} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-3xs">Done</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. CREATE BOOKING modal */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="px-5 py-4 bg-zinc-50 border-b border-zinc-150 flex items-center justify-between">
                <span className="text-xs font-black text-zinc-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600" /> Reserve Dental Booking
                </span>
                <button onClick={() => setIsNewModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 font-extrabold text-sm cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleCreateAppointment} className="p-5 space-y-4">
                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Patient/Client Name</label>
                  <input
                    type="text"
                    placeholder="Type patient full name"
                    value={formPatientName}
                    onChange={(e) => { setFormPatientName(e.target.value); setShowPatientSuggestions(true); }}
                    onFocus={() => setShowPatientSuggestions(true)}
                    className="w-full p-2.5 border border-zinc-200 rounded-xl font-bold text-xs text-zinc-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden"
                    required
                  />
                  {showPatientSuggestions && patientSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 mt-1 max-h-40 overflow-y-auto">
                      {patientSuggestions.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setFormPatientName(`${p.personalInfo.firstName} ${p.personalInfo.lastName}`);
                            setShowPatientSuggestions(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs hover:bg-zinc-50 text-zinc-800 font-bold flex justify-between"
                        >
                          <span>{p.personalInfo.lastName}, {p.personalInfo.firstName}</span>
                          <span className="text-[9px] bg-zinc-100 text-zinc-400 font-black px-1.5 py-0.5 rounded-md uppercase">Patient</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Dentist / Associate Practitioner</label>
                  <select value={formDentist} onChange={(e) => setFormDentist(e.target.value)} className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 bg-white">
                    {dynamicAssociates.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Date</label>
                    <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Time</label>
                    <input type="text" placeholder="e.g. 10:00 AM" value={formTime} onChange={(e) => setFormTime(e.target.value)} className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Type</label>
                    <select value={formType} onChange={(e) => setFormType(e.target.value as AppType)} className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 bg-white">
                      {APPOINTMENT_TYPES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Treatment Tag</label>
                    <input type="text" placeholder="e.g. EXO / OP" value={formTreatmentTag} onChange={(e) => setFormTreatmentTag(e.target.value)} className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-850 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Clinical Notes / Compliant</label>
                  <textarea placeholder="Clinical notes..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="w-full h-16 p-2.5 border border-zinc-200 rounded-xl text-xs font-semibold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                  <button type="button" onClick={() => setIsNewModalOpen(false)} className="px-4 py-2 bg-zinc-100 rounded-xl text-xs font-bold text-zinc-600">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black shadow-xs">Book Appointment</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. EDIT / RESCHEDULE modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="px-5 py-4 bg-zinc-50 border-b border-zinc-150 flex items-center justify-between">
                <span className="text-xs font-black text-zinc-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-teal-600" /> Manage Appointment Card
                </span>
                <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 font-extrabold text-sm cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleUpdateAppointment} className="p-5 space-y-4">
                {selectedAppointment.isRecallEvent ? (
                  <div className="space-y-4">
                    {/* Patient Information Section */}
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Patient Name</span>
                          <span className="text-sm font-black text-zinc-950">{selectedAppointment.patientName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block text-right">Patient Number</span>
                          <span className="text-xs font-mono font-bold text-zinc-650 block text-right">#{selectedAppointment.patientId}</span>
                        </div>
                      </div>

                      {selectedAppointment.contactNumber && (
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Contact Number</span>
                          <span className="text-xs font-bold text-zinc-700">{selectedAppointment.contactNumber}</span>
                        </div>
                      )}

                      {/* Open Patient Record shortcut button */}
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewPatientDetails) {
                              const patient = records.find(r => r.id === selectedAppointment.patientId);
                              if (patient) {
                                onViewPatientDetails(patient);
                                setIsEditModalOpen(false);
                              }
                            }
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5" /> Open Patient Record
                        </button>
                      </div>
                    </div>

                    {/* Dentist Select */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Assigned Dentist</label>
                      <select 
                        value={formDentist} 
                        onChange={(e) => setFormDentist(e.target.value)} 
                        className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 bg-white"
                      >
                        {dynamicAssociates.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                      </select>
                    </div>

                    {/* Recall Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Recall Date</label>
                        <input 
                          type="date" 
                          value={formDate} 
                          onChange={(e) => setFormDate(e.target.value)} 
                          className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" 
                          required 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Recall Time</label>
                        <input 
                          type="text" 
                          value={formTime} 
                          onChange={(e) => setFormTime(e.target.value)} 
                          className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" 
                          required 
                        />
                      </div>
                    </div>

                    {/* Status Management */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Recall Status</label>
                      <select 
                        value={formStatus} 
                        onChange={(e) => setFormStatus(e.target.value as any)} 
                        className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Rescheduled">Rescheduled</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Missed">Missed</option>
                      </select>
                    </div>

                    {/* Procedure Performed & Purpose */}
                    <div className="grid grid-cols-2 gap-4 bg-zinc-50/55 p-3 rounded-xl border border-zinc-150">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Previous Procedure</span>
                        <span className="text-xs font-bold text-zinc-800">{selectedAppointment.previousProcedure || 'None recorded'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Recall Purpose</span>
                        <span className="text-xs font-bold text-zinc-800">{selectedAppointment.recallPurpose || 'Routine Checkup'}</span>
                      </div>
                    </div>

                    {/* Latest Progress Note */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Latest Progress Note</label>
                      <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-650 font-semibold italic max-h-24 overflow-y-auto">
                        "{selectedAppointment.latestProgressNoteText}"
                      </div>
                    </div>

                    {/* Action Buttons for Recall */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-zinc-150">
                      <button 
                        type="button" 
                        onClick={() => handleDeleteAppointment(selectedAppointment.id)} 
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Cancel / Remove Recall
                      </button>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-zinc-100 rounded-xl text-xs font-bold text-zinc-600">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black shadow-xs">Save Changes</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Patient/Client Name</label>
                      <input type="text" value={formPatientName} onChange={(e) => setFormPatientName(e.target.value)} className="w-full p-2.5 border border-zinc-200 rounded-xl font-bold text-xs text-zinc-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" required />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Dentist / Associate Practitioner</label>
                      <select value={formDentist} onChange={(e) => setFormDentist(e.target.value)} className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 bg-white">
                        {dynamicAssociates.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Date</label>
                        <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Time</label>
                        <input type="text" value={formTime} onChange={(e) => setFormTime(e.target.value)} className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Type</label>
                        <select value={formType} onChange={(e) => setFormType(e.target.value as AppType)} className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden">
                          {APPOINTMENT_TYPES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Treatment Tag</label>
                        <input type="text" placeholder="e.g. EXO / OP" value={formTreatmentTag} onChange={(e) => setFormTreatmentTag(e.target.value)} className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-850 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Status</label>
                        <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as any)} className="w-full p-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden">
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Clinical Notes</label>
                      <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="w-full h-16 p-2.5 border border-zinc-200 rounded-xl text-xs font-semibold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-zinc-150">
                      <button type="button" onClick={() => handleDeleteAppointment(selectedAppointment.id)} className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold cursor-pointer transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Delete Appointment
                      </button>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-zinc-100 rounded-xl text-xs font-bold text-zinc-600">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black shadow-xs">Save Changes</button>
                      </div>
                    </div>
                  </>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeDropdownApptId && dropdownCoords && (() => {
        const appt = allAppointments.find(a => a.id === activeDropdownApptId);
        if (!appt) return null;

        const dropdownWidth = 176; // w-44
        const dropdownHeight = 222; // 6 items * ~32px + padding

        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Check if we should open upward
        const showUpward = (viewportHeight - dropdownCoords.bottom < dropdownHeight) && (dropdownCoords.top > dropdownHeight);

        const topPos = showUpward 
          ? dropdownCoords.top - dropdownHeight - 4 
          : dropdownCoords.bottom + 4;

        // Keep left/right within bounds
        let leftPos = dropdownCoords.right - dropdownWidth;
        if (leftPos < 10) leftPos = 10;
        if (leftPos + dropdownWidth > viewportWidth - 10) {
          leftPos = viewportWidth - dropdownWidth - 10;
        }

        return createPortal(
          <>
            {/* Backdrop layer to capture clicks outside */}
            <div 
              className="fixed inset-0 z-[9998]" 
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownApptId(null);
                setDropdownCoords(null);
              }} 
            />
            
            {/* The dropdown list positioned floatingly */}
            <div 
              style={{
                position: 'fixed',
                top: `${topPos}px`,
                left: `${leftPos}px`,
                width: `${dropdownWidth}px`,
              }}
              className="bg-white border border-zinc-200 rounded-xl shadow-xl z-[9999] py-1.5 text-xs font-bold text-zinc-700 animate-in fade-in slide-in-from-top-1 duration-100 flex flex-col"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdownApptId(null);
                  setDropdownCoords(null);
                  setIsDayModalOpen(false);
                  openEditAppointment(appt);
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-zinc-50 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <User className="w-3.5 h-3.5 text-zinc-400" /> View Appointment
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdownApptId(null);
                  setDropdownCoords(null);
                  setIsDayModalOpen(false);
                  openEditAppointment(appt);
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-zinc-50 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-zinc-400" /> Edit Appointment
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdownApptId(null);
                  setDropdownCoords(null);
                  const note = prompt("Add notes to appointment:", appt.notes);
                  if (note !== null) {
                    setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, notes: note } : a));
                    showSuccess("Note updated!");
                  }
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-zinc-50 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400" /> Add Note
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdownApptId(null);
                  setDropdownCoords(null);
                  showSuccess(`SMS notification sent to ${appt.patientName}!`);
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-zinc-50 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-400" /> Send SMS
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdownApptId(null);
                  setDropdownCoords(null);
                  setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'Cancelled' } : a));
                  showSuccess("Appointment cancelled.");
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-red-50 text-red-650 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5 text-red-400" /> Cancel Appointment
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdownApptId(null);
                  setDropdownCoords(null);
                  showSuccess("Opening in new tab...");
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-zinc-50 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-400" /> Open in New Tab
              </button>
            </div>
          </>,
          document.body
        );
      })()}
    </div>
  );
}
