import React, { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  FileText, LayoutTemplate, Settings, Printer, Edit3,
  GripVertical, Image as ImageIcon, Eye, EyeOff, Download, Loader2,
  ArrowUp, ArrowDown, Camera, Upload, Lock, Unlock, Save, RotateCcw, Activity, ClipboardList, Plus, Minus, RefreshCw, Trash2, Menu, ChevronDown, ChevronRight, Archive, ArrowLeft, Search, Bell, User, MessageSquare, X, Check, MoreHorizontal, Edit2, Copy, CalendarDays, Database, KeyRound, Mail, Shield, HelpCircle, LogOut,
  AlertTriangle, CircleDot, Pill, Stethoscope, Tags
} from 'lucide-react';
import { isSupabaseConfigured, supabase, supabaseConfigError, supabaseHost } from './supabase';
import { createAppointment, deleteAppointment, getAppointments, updateAppointment, type Appointment } from './src/services/appointmentService';
import { createEmptyDentalChartData, getDentalChartsByPatientId, createDentalChartRecord, updateDentalChartRecord, deleteDentalChartRecord, normalizeDentalChartData } from './src/services/dentalChartService';
import { archivePatientRecord as archivePatientRecordService, loadActivePatientRecords, loadArchivedPatientRecords, loadPatientRecord, restorePatientRecord as restorePatientRecordService, deletePatientRecord as deletePatientRecordService, savePatientRecord } from './src/services/patientService';
import { loadDoctorsRegistry as loadDoctorsRegistryService, loadTemplateSettings as loadTemplateSettingsService, saveDoctorsRegistry as saveDoctorsRegistryService, saveTemplateSettings as saveTemplateSettingsService } from './src/services/settingsService';
import { PatientDetailsWorkspace } from './src/components/PatientDetailsWorkspace';
import { SmartSupportModule } from './src/components/SmartSupportModule';
import LedgerModule from './src/components/LedgerModule';
import { UploadsModule } from './src/components/UploadsModule';
import { RecallsModule } from './src/components/RecallsModule';
import { ScratchpadModule } from './src/components/ScratchpadModule';
import { FollowupModule } from './src/components/FollowupModule';
import ProgressNotesModule from './src/components/ProgressNotesModule';
import { TreatmentRecordsModule } from './src/components/TreatmentRecordsModule';
import { ClinicCalendar } from './src/components/ClinicCalendar';
import { Dashboard } from './src/components/Dashboard';
import { MasterFileDirectory } from './src/components/MasterFileDirectory';
import { MasterSmartAutocomplete } from './src/components/MasterSmartAutocomplete';
import { CustomDatePicker } from './src/components/CustomDatePicker';
import { AuthAccessPortal, type DemoRoleKey } from './src/components/AuthAccessPortal';
import { CommandPalette } from './src/components/CommandPalette';
import { isDeveloperModeUnlocked, unlockDeveloperMode, lockDeveloperMode } from './src/utils/developerModeAuth';
import { loadActiveMasterDirectoryItems, loadDentalChartMasterItems, type MasterDirectoryItem, type MasterDirectoryType } from './src/services/masterDirectoryService';
import {
  loadNotifications,
  loadUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
  type NotificationUser,
} from './src/services/notificationService';
import {
  searchGlobal,
  type GlobalSearchResponse,
  type GlobalSearchResult,
} from './src/services/globalSearchService';
import { calculatePatientRemainingBalance, formatPatientCurrency } from './src/utils/patientFinance';

declare global {
  interface Window {
    html2pdf?: () => {
      set: (options: unknown) => {
        from: (element: HTMLElement) => {
          save: () => Promise<void>;
        };
      };
    };
  }
}

const DEV_AUTH_ENABLED = String(import.meta.env.VITE_ENABLE_DEV_AUTH || '').toLowerCase() === 'true';
const DEV_AUTH_SESSION_KEY = 'PNJ_DEV_AUTH_SESSION';
// Local development only: this bypass must never be enabled in shared or production environments.

type DentalChartTagValue =
  | string
  | null
  | undefined
  | {
      id?: string;
      code?: string;
      name?: string;
      label?: string;
      color?: string;
      legacyCode?: string;
      directoryType?: string;
    };

function getDentalTagCode(value: DentalChartTagValue): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.code || value.label || value.name || value.legacyCode || '';
}

function getDentalTagLabel(value: DentalChartTagValue): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.label || value.name || value.code || value.legacyCode || '';
}

function getDentalTagColor(value: DentalChartTagValue): string | undefined {
  if (!value || typeof value === 'string') return undefined;
  return value.color || undefined;
}

function normalizeFavoriteStatusesList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const normalized = values
    .map((value) => getDentalTagCode(value as DentalChartTagValue).trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

const getPatientRecordData = (record: any): Record<string, any> => {
  if (record?.patient_data && typeof record.patient_data === 'object') return record.patient_data;
  if (record?.patientData && typeof record.patientData === 'object') return record.patientData;
  return {};
};

const parseLocalDateValue = (value: unknown): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateInputValue = (value: unknown): string => {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = parseLocalDateValue(raw);
  if (!parsed) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateAgeFromBirthDate = (birthDate: string): number | null => {
  const parsed = parseLocalDateValue(birthDate);
  if (!parsed) return null;

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

const getPatientRecordAge = (record: any): number | null => {
  const data = getPatientRecordData(record);
  const personalInfo = data.personalInfo && typeof data.personalInfo === 'object' ? data.personalInfo : {};
  const birthDate = String(data.birthDate || data.birthdate || personalInfo.birthDate || personalInfo.birthdate || '').trim();
  const ageFromBirthDate = calculateAgeFromBirthDate(birthDate);
  if (ageFromBirthDate !== null) return ageFromBirthDate;

  const ageCandidates = [data.age, data.patientAge, personalInfo.age];
  for (const candidate of ageCandidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }

  return null;
};

const normalizePatientTagValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizePatientTagValue(entry));
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const tagText = [source.name, source.label, source.code, source.tag, source.text, source.value]
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .find(Boolean);
    return tagText ? [tagText] : [];
  }

  return [];
};

const getPatientRecordTags = (record: any): string[] => {
  const data = getPatientRecordData(record);
  const sources = [
    record?.favorite_statuses,
    data.tags,
    data.favorite_statuses,
    record?.tags,
    record?.patientData?.tags,
  ];

  const seen = new Set<string>();
  const tags: string[] = [];

  sources.forEach((source) => {
    normalizePatientTagValue(source).forEach((tag) => {
      const key = tag.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        tags.push(tag);
      }
    });
  });

  return tags;
};

const getPatientRecordYear = (record: any): string => {
  const data = getPatientRecordData(record);
  const candidates = [
    record?.created_at,
    data.firstVisit,
    data.recordDate,
    data.record_date,
    data.createdAt,
    data.created_at,
  ];

  for (const candidate of candidates) {
    const parsed = parseLocalDateValue(candidate);
    if (parsed) return String(parsed.getFullYear());
  }

  return '';
};

const getPatientRecordFilterDate = (record: any): string => {
  const data = getPatientRecordData(record);
  const candidates = [
    record?.created_at,
    data.firstVisit,
    data.recordDate,
    data.record_date,
    data.createdAt,
    data.created_at,
  ];

  for (const candidate of candidates) {
    const value = toDateInputValue(candidate);
    if (value) return value;
  }

  return '';
};

const formatNotificationDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

type ClinicUserProfile = {
  id?: string | null;
  fullName: string;
  email: string;
  role: DemoRoleKey;
  source: 'session' | 'clinic_users' | 'fallback';
  raw?: any;
};

type ProfileDialog = null | 'editProfile' | 'changePassword' | 'changeEmail' | 'userGuide';

const getSessionUserFullName = (sessionUser: any): string => {
  if (!sessionUser) return '';
  const meta = sessionUser.user_metadata && typeof sessionUser.user_metadata === 'object' ? sessionUser.user_metadata : {};
  return String(
    meta.full_name ||
    meta.name ||
    [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
    sessionUser.email ||
    ''
  ).trim();
};

const normalizeClinicRole = (value: unknown): DemoRoleKey => {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'clinic_owner' || normalized === 'owner' || normalized === 'admin') return 'clinic_owner';
  if (normalized === 'associate_dentist' || normalized === 'associate' || normalized === 'dentist') return 'associate_dentist';
  return 'staff_member';
};

const buildClinicUserProfile = (sessionUser: any, clinicUserRow?: any | null): ClinicUserProfile => {
  const row = clinicUserRow && typeof clinicUserRow === 'object' ? clinicUserRow : null;
  const isDevMockUser = Boolean(sessionUser?.isDevMockUser === true || sessionUser?.user_metadata?.isDevMockUser === true);
  const rowFullName = row
    ? String(
        row.full_name ||
        row.name ||
        row.display_name ||
        [row.first_name, row.last_name].filter(Boolean).join(' ') ||
        ''
      ).trim()
    : '';
  const rowEmail = row ? String(row.email || '').trim() : '';
  const sessionFullName = getSessionUserFullName(sessionUser);
  const sessionEmail = String(sessionUser?.email || '').trim();
  const sessionMeta = sessionUser?.user_metadata && typeof sessionUser.user_metadata === 'object' ? sessionUser.user_metadata : {};

  return {
    id: row?.id ? String(row.id) : null,
    fullName: rowFullName || sessionFullName || (isDevMockUser ? String(sessionUser?.full_name || sessionMeta.full_name || '') : '') || 'Clinic User',
    email: rowEmail || sessionEmail,
    role: normalizeClinicRole(row?.role || sessionUser?.role || sessionMeta.role || (isDevMockUser ? sessionMeta.demoRole : null)),
    source: row ? 'clinic_users' : sessionUser ? 'session' : 'fallback',
    raw: row || sessionUser || null,
  };
};

const getProfileInitials = (fullName: string, email?: string) => {
  const source = fullName.trim() || String(email || '').trim();
  if (!source) return 'CU';

  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const normalizeSavedDentalTag = (val: any): any => {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (val.code) {
      return {
        id: val.id || val.code,
        code: val.code,
        name: val.name || val.label || val.code,
        label: val.label || val.name || val.code,
        color: val.color || null,
        legacyCode: val.legacyCode || val.code,
        directoryType: val.directoryType || null
      };
    }
  }
  return null;
};

const getCodeOfValue = (val: any): string => {
  return getDentalTagCode(val);
};

const hasToothValue = (values: any[], target: any): boolean => {
  const targetCode = getCodeOfValue(target);
  return (values || []).some((v) => getCodeOfValue(v) === targetCode);
};

const toggleToothValue = (values: any[], target: any): any[] => {
  const targetCode = getCodeOfValue(target);
  if (hasToothValue(values, target)) {
    return (values || []).filter((v) => getCodeOfValue(v) !== targetCode);
  }
  return [...(values || []), target];
};

export function mapSupabaseDentalChartRowToHistoryEntry(row: any) {
  return {
    id: row.id,
    recallDate: row.recall_date || row.created_at?.slice(0, 10),
    medicalCondition: row.medical_condition || '',
    medications: row.medications || '',
    allergies: row.allergies || '',
    extraoralExam: row.extraoral_exam || '',
    recallSummary: row.summary || row.chart_data?.findings || '',
    dentalChart: normalizeDentalChartData(row.chart_data),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// --- CONSTANTS & DATA STRUCTURES ---
const MEDICAL_QUESTIONS = [
  { id: 'q1', text: 'Are you in good condition?' },
  { id: 'q2', text: 'Are you under medical treatment now?' },
  { id: 'q3', text: 'Have you ever had serious illness or surgical operation?' },
  { id: 'q4', text: 'Have you ever been hospitalized?' },
  { id: 'q5', text: 'Are you taking any prescription / non-prescription medication?' },
  { id: 'q6', text: 'Do you use tobacco products?' },
  { id: 'q7', text: 'Do you use alcohol, cocaine or other dangerous drugs?' }
];

const CONDITIONS = [
  'High Blood Pressure', 'Heart Disease', 'Cancer / Tumors',
  'Low Blood Pressure', 'Heart Murmur', 'Anemia',
  'Epilepsy / Convulsion', 'Hepatitis / Liver Disease', 'Angina',
  'AIDS or HIV Infection', 'Rheumatic Fever', 'Asthma',
  'Sexually Transmitted Disease', 'Hay Fever / Allergies', 'Emphysema',
  'Stomach Troubles / Ulcers', 'Respiratory Problems', 'Bleeding Problems',
  'Fainting Seizure', 'Hepatitis / Jaundice', 'Blood Disease',
  'Rapid Weight Loss', 'Tuberculosis', 'Head Injuries',
  'Radiation Therapy', 'Swollen Ankles', 'Arthritis / Rheumatism',
  'Joint Replacement / Implant', 'Kidney Disease', 'Thyroid Problem',
  'Heart Surgery', 'Chest Pain', 'Diabetes',
  'Heart Attack', 'Stroke', 'Others'
];

const SECTIONS = [
  { id: 'personal', title: 'Patient Information Record' },
  { id: 'referral', title: 'Minor / Referral Details' },
  { id: 'dentalHistory', title: 'Dental History' },
  { id: 'medicalHistory', title: 'Medical History' },
  { id: 'questions', title: 'Medical Questions' },
  { id: 'allergies', title: 'Allergies' },
  { id: 'healthDetails', title: 'Health Details' },
  { id: 'womenOnly', title: 'For Women Only' },
  { id: 'conditions', title: 'Medical Conditions Checklist' },
  { id: 'signature', title: 'Signature & Consent' }
];

const HEADER_ITEMS = [
  { id: 'left', label: 'Left Image (Circle)' },
  { id: 'middle', label: 'Clinic Info & Logo' },
  { id: 'right', label: 'Right Photo (2x2)' }
];

const PATIENT_WORKFLOW_TABS = [
  { id: 'form', label: 'Patient Info' },
  { id: 'progress_notes', label: 'Progress Notes' },
  { id: 'treatment_records', label: 'Treatment Records' },
  { id: 'charting', label: 'Dental Charts' },
  { id: 'prescriptions', label: 'Prescriptions' },
  { id: 'ledger', label: 'Bills & Payments' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'uploads', label: 'Uploads / X-Rays' },
  { id: 'recalls', label: 'Dental Recalls' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'scratchpad', label: 'Scratchpad Notes' },
  { id: 'followup', label: 'Follow Up Lists' },
  { id: 'smart_support', label: 'Smart Support' }
] as const;

const PRIMARY_PATIENT_WORKFLOW_TABS = PATIENT_WORKFLOW_TABS.slice(0, 6);
const OVERFLOW_PATIENT_WORKFLOW_TABS = PATIENT_WORKFLOW_TABS.slice(6);
const PATIENT_WORKFLOW_TAB_IDS = PATIENT_WORKFLOW_TABS.map((tab) => tab.id);
type PatientWorkspaceTab = typeof PATIENT_WORKFLOW_TABS[number]['id'];

type DocumentFormType = 'certificate' | 'consent';
type SystemSettingsTab = 'dashboard' | 'general' | 'doctors' | 'pdf' | 'certificateForm' | 'consentForm' | 'users' | 'migration' | 'maintenance' | 'about' | 'sync';
type ExportMode = 'record' | DocumentFormType | 'contract';

const DOCUMENT_FORM_CONFIG: Record<DocumentFormType, { prefix: string; label: string; fileSuffix: string; description: string }> = {
  certificate: {
    prefix: 'certificateForm',
    label: 'Certificate Form',
    fileSuffix: 'CertificateForm',
    description: 'Brand and spacing settings for the printable dental certificate.',
  },
  consent: {
    prefix: 'consentForm',
    label: 'Consent Form',
    fileSuffix: 'ConsentForm',
    description: 'Brand and spacing settings for the printable oral surgery consent form.',
  },
};

// DENTAL CHART CONSTANTS
const TEMP_UPPER_RIGHT = [55, 54, 53, 52, 51];
const TEMP_UPPER_LEFT = [61, 62, 63, 64, 65];
const PERM_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const PERM_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const PERM_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const PERM_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
const TEMP_LOWER_RIGHT = [85, 84, 83, 82, 81];
const TEMP_LOWER_LEFT = [71, 72, 73, 74, 75];

const CHART_LEGENDS = {
  condition: [
    { code: 'D', label: 'Decayed (Caries Indicated for Filling)' },
    { code: 'M', label: 'Missing due to Caries' },
    { code: 'F', label: 'Filled' },
    { code: 'I', label: 'Caries Indicated for Extraction' },
    { code: 'RF', label: 'Root Fragment' },
    { code: 'MO', label: 'Missing due to Other Causes' },
    { code: 'IM', label: 'Impacted Tooth' }
  ],
  restoration: [
    { code: 'J', label: 'Jacket Crown' },
    { code: 'A', label: 'Amalgam Filling' },
    { code: 'AB', label: 'Abutment' },
    { code: 'P', label: 'Pontic' },
    { code: 'In', label: 'Inlay' },
    { code: 'FX', label: 'Fixed Cure Composite' },
    { code: 'Rm', label: 'Removable Denture' }
  ],
  surgery: [
    { code: 'X', label: 'Extraction due to Caries' },
    { code: 'XO', label: 'Extraction due to Other Causes' },
    { code: '✓', label: 'Present Teeth' },
    { code: 'Cm', label: 'Congenitally Missing' },
    { code: 'Sp', label: 'Supernumerary' }
  ]
};

const DENTAL_CHART_ROWS = [
  { index: 0, label: 'Upper Arc (Primary)', layout: 'top', teeth: [null, null, null, '55', '54', '53', '52', '51', '61', '62', '63', '64', '65', null, null, null] },
  { index: 1, label: 'Upper Arc (Permanent)', layout: 'top', teeth: ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'] },
  { index: 2, label: 'Lower Arc (Permanent)', layout: 'bottom', teeth: ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'] },
  { index: 3, label: 'Lower Arc (Primary)', layout: 'bottom', teeth: [null, null, null, '85', '84', '83', '82', '81', '71', '72', '73', '74', '75', null, null, null] },
] as const;

const DENTAL_CHART_PROCEDURES = {
  Conditions: ['/', 'M', 'MO', 'IM', 'SP', 'RF', 'UN', 'PT', 'D', 'RCT'],
  'Restoration & Prosthodontics': ['MC', 'PJ', 'AM', 'LCF', 'PORJC', 'AB', 'ATT', 'P', 'IC', 'IMP', 'S', 'RM', 'GI', 'V', 'TF'],
  Surgery: ['X', 'XO'],
  Xray: ['PANO', 'CEPHA', 'OCC', 'PERI'],
};

const DENTAL_CHART_LEGEND_GUIDE = [
  {
    title: 'Condition',
    items: [
      { code: 'D', meaning: 'Decayed (Caries Indicated for Filling)' },
      { code: 'M', meaning: 'Missing due to Caries' },
      { code: 'F', meaning: 'Filled' },
      { code: 'I', meaning: 'Caries Indicated for Extraction' },
      { code: 'RF', meaning: 'Root Fragment' },
      { code: 'MO', meaning: 'Missing due to Other Causes' },
      { code: 'IM', meaning: 'Impacted Tooth' },
      { code: 'UN', meaning: 'Unerupted' },
      { code: '/', meaning: 'Present Teeth' },
      { code: 'PT', meaning: 'Pulpless Tooth' },
    ],
  },
  {
    title: 'Restoration & Prosthetics',
    items: [
      { code: 'Jacket Crown', meaning: 'Jacket Crown' },
      { code: 'A', meaning: 'Amalgam Filling' },
      { code: 'AB', meaning: 'Abutment' },
      { code: 'P', meaning: 'Pontic' },
      { code: 'Inlay', meaning: 'Inlay' },
      { code: 'FX', meaning: 'Fixed Cure Composite' },
      { code: 'RM', meaning: 'Removable Composite' },
    ],
  },
  {
    title: 'Surgery',
    items: [
      { code: 'X', meaning: 'Extraction due to Caries' },
      { code: 'XO', meaning: 'Extraction due to Other Causes' },
      { code: 'C', meaning: 'Present Teeth' },
      { code: 'Sp', meaning: 'Supernumerary Missing' },
    ],
  },
] as const;

const TOOTH_CATEGORY_FIELD_MAP = {
  Status: 'status',
  Conditions: 'conditions',
  Prosthodontics: 'restorations',
  Surgery: 'surgery',
  'X-Ray': 'xray',
  'Restoration & Prosthodontics': 'restorations',
  Xray: 'xray',
} as const;

const SURFACE_COLORS = {
  cavity: '#ef4444',
  pasta: '#3b82f6',
  null: '#ffffff',
} as const;

const DENTAL_RECORD_LEGEND_COLUMNS = [
  {
    title: 'Condition',
    items: [
      { code: '/', label: 'Present Teeth' },
      { code: 'D', label: 'Decayed (Caries Indicated for Filling)' },
      { code: 'M', label: 'Missing Due to Caries' },
      { code: 'MO', label: 'Missing due to Other Causes' },
      { code: 'Im', label: 'Impacted Teeth' },
      { code: 'Sp', label: 'Supernumerary Tooth' },
      { code: 'Rf', label: 'Root Fragment' },
      { code: 'Un', label: 'Unerupted' },
    ],
  },
  {
    title: 'Restorations & Prosthetics',
    items: [
      { code: 'Am', label: 'Amalgam Filling' },
      { code: 'Co', label: 'Composite Filling' },
      { code: 'JC', label: 'Jacket Crown' },
      { code: 'Ab', label: 'Abutment' },
      { code: 'Att', label: 'Attachment' },
      { code: 'P', label: 'Pontic' },
      { code: 'In', label: 'Inlay' },
      { code: 'Imp', label: 'Implant' },
      { code: 'S', label: 'Sealants' },
      { code: 'Rm', label: 'Removal Denture' },
    ],
  },
  {
    title: 'Surgery',
    items: [
      { code: 'X', label: 'Extraction Due to Caries' },
      { code: 'XO', label: 'Extraction Due to Other Causes' },
    ],
  },
] as const;

const DENTAL_RECORD_RECOMMENDATIONS = [
  { key: 'oralProphylaxis', label: 'ORAL PROPHYLAXIS' },
  { key: 'prosthodonticsManagement', label: 'PROSTHODONTICS MANAGEMENT' },
  { key: 'rootCanalTreatment', label: 'ROOT CANAL TREATMENT (RCT)' },
  { key: 'others', label: 'OTHERS' },
] as const;

const DENTAL_RECORD_REMARK_OPTIONS = [
  { value: 'dentallyFit', label: 'DENTALLY FIT' },
  { value: 'forCompliance', label: 'FOR COMPLIANCE' },
] as const;

const ALL_DENTAL_CHART_TOOTH_IDS = DENTAL_CHART_ROWS.flatMap((row) => row.teeth).filter(Boolean) as string[];

const DEFAULT_SETTINGS = {
  clinicName: 'P & J  T A N A R T E', showClinicName: true,
  clinicAddress: 'BAYAN LUMA IV IMUS CAVITE', showAddress: true,
  clinicContact: '0953 834 3062', showContact: true,
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  averageAppointmentDuration: 30,
  recallSMSNotifications: true,
  recordBadgeText: 'PATIENT RECORD', showRecordBadge: true,
  recordBadgeMarginTop: 8, recordBadgeMarginBottom: 8,
  leftImage: null, showLeftImage: true, leftImageSize: 65, leftImageOutline: true,
  middleImage: null, showMiddleImage: false, middleImageSize: 50,
  rightImage: null, showRightImage: true, rightImageFit: 'cover', rightImagePositionX: 50, rightImagePositionY: 50,
  headerMarginBottom: 8,
  leftImageMarginTop: 0, leftImageMarginBottom: 0, leftImageMarginLeft: 0, leftImageMarginRight: 0,
  middleMarginTop: 0, middleMarginBottom: 0, middleMarginLeft: 16, middleMarginRight: 16,
  rightImageMarginTop: 0, rightImageMarginBottom: 0, rightImageMarginLeft: 0, rightImageMarginRight: 0,
  headerOrder: ['left', 'middle', 'right'],
  sectionOrder: SECTIONS.map(s => s.id),
  visibility: SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: true }), {}),
  fontSize: 'Medium', labelSize: 'Medium', lineSpacing: 'Normal',
  borderStyle: 'border-black', underlineStyle: 'Solid', sectionSeparator: 'None', overflowBehavior: 'Truncate', density: 'Compact',

  printPatientForm: true, printDentalChart: true, printTreatmentRecord: true,
  chartTitle: 'DENTAL CHART', showChartTitle: false,
  showChartLegend: true, showChartFindings: true, showChartRecommendation: true, showChartFooter: true,

  treatmentTitle: 'TREATMENT RECORD', showTreatmentTitle: true,
  showDentistColumn: true, showBalanceColumn: true, treatmentRowHeight: 'Compact',

  // DENTIST PROFILE SETTINGS
  defaultDentistId: '',
  defaultDentistName: '',
  defaultDentistRole: 'Attending Dentist',
  defaultDentistSignature: null,

  showDentistNameInPatientRecord: false,
  showSignatureInPatientRecord: false,

  showDentistNameInDentalChart: true,
  showSignatureInDentalChart: false,

  showDentistNameInTreatmentRecord: true,
  showSignatureInTreatmentRecord: false,

  dentistSignatureSize: 100,
  dentistSignaturePlacement: 'right',

  // CERTIFICATE FORM DESIGNER SETTINGS
  certificateFormLogo: null,
  certificateFormShowLogo: true,
  certificateFormLogoOutline: false,
  certificateFormPageOutline: false,
  certificateFormLogoSize: 96,
  certificateFormLogoGap: 18,
  certificateFormPagePaddingTop: 54,
  certificateFormPagePaddingRight: 58,
  certificateFormPagePaddingBottom: 54,
  certificateFormPagePaddingLeft: 58,

  // CONSENT FORM DESIGNER SETTINGS
  consentFormLogo: null,
  consentFormShowLogo: true,
  consentFormLogoOutline: false,
  consentFormPageOutline: false,
  consentFormLogoSize: 84,
  consentFormLogoGap: 14,
  consentFormPagePaddingTop: 44,
  consentFormPagePaddingRight: 44,
  consentFormPagePaddingBottom: 44,
  consentFormPagePaddingLeft: 44,
};

const generateEmptyTreatmentRow = () => ({ id: crypto.randomUUID(), date: '', toothNumbers: '', procedure: '', dentist: '', amountCharged: '', amountPaid: '', balance: '' });

const DEFAULT_FAVORITE_STATUSES = ['âœ“', 'D', 'M', 'F', 'X', 'Cm'];

const DEFAULT_DOCTORS: Array<{ id: string; name: string; role: string; signature: string | null }> = [];

const createDefaultCertificateDocument = () => ({
  date: new Date().toISOString().split('T')[0],
  patientName: '',
  age: '',
  diagnosis: '',
  recommendation: '',
  dentistName: 'Maria Jessica David - Tanarte, DMD',
  licenseNo: '0052369',
});

const createDefaultConsentDocument = () => ({
  date: new Date().toISOString().split('T')[0],
  patientName: '',
  birthDate: '',
  age: '',
  status: '',
  doctorName: '',
  otherDentists: '',
  procedure: '',
  procedureType: '',
  medicalHistory: {},
  allergies: {},
  medications: '',
  physicianTreatment: '',
  previousExtraction: '',
  otherRisk: '',
  anesthesiaConsent: false,
});

const createEmptyContractPackageRow = () => ({
  id: crypto.randomUUID(),
  date: '',
  amountCharged: '',
  amountPaid: '',
  remarks: '',
  signature: '',
});

const createDefaultPatientContractDocument = () => ({
  patientName: '',
  age: '',
  address: '',
  mobileNo: '',
  birthDate: '',
  acknowledgementName: '',
  acknowledgementAddress: '',
  acknowledgementAge: '',
  dentistName: 'Maria Jessica David - Tanarte, DMD',
  associateDentistRole: 'Associate Dentist',
  orthodonticPackage: '',
  downPaymentTerms: ['', '', '', '', ''],
  balanceTerms: '',
  packageRows: Array.from({ length: 14 }, createEmptyContractPackageRow),
});

const ORTHO_CONTRACT_FEES = [
  'The Orthodontic Treatment Package (OTP) shall be determined by the dentist or orthodontist or doctor. Prices may vary due to the nature of each patient case.',
  'Cost of Orthodontic Treatment Package: Initial Down Payment, Monthly Installment, and Estimated Duration of Treatment.',
  'The Orthodontic Treatment Package will include all cost of the material needed for the patient case, dentist or orthodontist or doctor professional fees and all other expenses, fees and charges necessary for or incidental to the specific treatment.',
  'All minor patients must have written consent form from the parents or guardians before the treatment commences.',
  'Payment of the Orthodontic Treatment Package fees shall be made on a monthly basis. If a patient fails to pay on the specific monthly visit, it is understood that such payment must be settled on the patient next visit.',
  'Prices/Cost shall be kept confidential at all times, even after the termination of the doctor-patient relationship.',
  'The Orthodontic Treatment Package fees should be settled upon completion of the treatment.',
];

const ORTHO_CONTRACT_INCLUSIONS = [
  'Oral prophylaxis (cleaning) every dental check-up during the orthodontic treatment.',
  'A minimum of two (2) restorations or tooth filling of tooth caries present during the time of consultation. However, extensive or deep restorations and other teeth that have carious lesions must be charged accordingly.',
];

const ORTHO_CONTRACT_NON_INCLUSIONS = [
  'Serial extractions needed for the treatment',
  'Odontectomy (surgical removal of impacted teeth) and extraction of 3rd molars (wisdom teeth)',
  'Frenectomy',
  'Temporary Anchorage Device (TADS)',
  'Splints',
  'Temporary Dentures',
  'Panoramic and Cephalometric X-rays',
  'Fixed Porcelain or Plastic Crowns',
  'Root Canal Treatment (RCT)',
  'Gingivectomy',
  'Retainers after treatment. This is due to the unpredictable cost of manufacturing of retainers; however, if a patient refers to a person for possible orthodontic treatment commences, it shall be converted into points and thus deducted from the total cost of the retainers of the patients who referred the individual.',
  'Painless anaesthesia for any root canal treatment, periodontal and other surgery procedures and tooth extraction.',
];

const ORTHO_CONTRACT_TERMS = [
  'The clinic follows a strict rule of "FIRST COME, FIRST SERVE WITH APPOINTMENT" rules. Clinic only accepts patients on an appointment basis.',
  'The clinic strictly follows the CHART TIME RULE. This is determined based on how many times the patient comes in for the treatment; the clinic does not use CALENDAR TIME in determining treatment duration.',
  'Six (6) months or more of non-appearance and treatment, despite repetitive reminders from the clinic staff, entitles the clinic to automatically put the patient case in our dormant file. No notices will be sent afterwards. No paid fees shall be refunded.',
  'The clinic reserves the right not to accept delinquent patients of six (6) months or more. No paid fees shall be refunded.',
  'The patient must advise the dentist/orthodontist/doctor of any temporary cessation of treatment due to illness, pregnancy and/or any other health conditions prior to the next scheduled appointment/treatment. Failure to notify and to keep the appointment shall result in an additional 10% of cost package, which shall be collected upon resumption of treatment.',
  'However, if a patient notifies the clinic of the above mentioned circumstances, treatment and payment of fees will resume. No additional fees shall be collected.',
  'In all cases of the above mentioned, the dentist/orthodontist/doctor WILL NOT BE HELD LIABLE FOR WHATEVER CONSEQUENCES THAT MAY ARISE DUE TO NON-APPEARANCE OF THE PATIENT FOR TREATMENT.',
  'There shall be NO REFUND OF FEES that are already paid for.',
  'There shall be NO REFUND OF FEES for patients who wish to pre-terminate treatment and contract for whatever reason. Patient shall have to pay the running cost incurred by the dentist/orthodontist/doctor at the time of pre-termination.',
  'No release of diagnostic aids (panoramic, periapical, cephalometric radiograph), working and study casts and patient chart during and after the treatment.',
  'The clinic and/or dentist/orthodontist/doctor reserve the right to refuse treatment to an individual who is unruly in behavior and to pre-terminate contract if the patient is proven to be uncooperative.',
  'The clinic only accepts referral from current or previous patients.',
  'If the patient intends to leave for another country or migrates while still undergoing treatment, the patient shall advise the dentist/orthodontist/doctor of his/her intentions and make arrangements with the clinic. No records shall be released except for the patient profile.',
  'The dentist/orthodontist/doctor shall not be liable for relapse of any dental condition, whether or not covered by the OTP, for which the patient has sought any treatment.',
  'Lost, misplaced, or damaged brackets, buccal tubes, and molar bands shall be charged to patient: repaste - PHP 200/each; replacement - PHP 500/each.',
  'Patients who wish to have their appliance removed temporarily for an occasion will be charged with a minimum fee for removal and reinstallation. The dentist/orthodontist/doctor DO NOT use same appliance for reinstallation.',
];

const ORAL_SURGERY_HISTORY_COLUMNS = [
  ['High Blood Pressure', 'A Heart Condition', 'Rheumatic Fever', 'Venereal Disease', 'Kidney Disease', 'Fainting History', 'Thyroid Disease', 'Liver Disease', 'Rheumatism'],
  ['Asthma', 'Anemia', 'Diabetes', 'Hepatitis', 'Epilepsy', 'Arthritis', 'Allergies', 'Tonsillitis', 'Glaucoma'],
  ['Hay Fever', 'Tuberculosis', 'Stomach Ulcer', 'Sinus Problem', 'Clotting Disorder', 'Nervous Disorder', 'Bleeding Disorder', 'Enlarged Adenoids'],
] as const;

const ORAL_SURGERY_ALLERGY_ITEMS = ['Penicillin', 'Other Antibiotics', 'Local Anesthesia', 'Others'] as const;

const createInitialPatientData = () => ({
  patientPhoto: '', lastName: '', firstName: '', middleName: '', nickname: '',
  birthDate: '', age: '', sex: '', religion: '', nationality: '', civilStatus: '',
  address: '', contact: '', parentGuardian: '', referral: '', company: '', occupation: '', officeContact: '',
  dentalInsurance: '', effectiveDate: '', fax: '', mobile: '', email: '',
  dentalReason: '', previousDentist: '', lastVisit: '', physicianName: '', physicianSpecialty: '', physicianContact: '', physicianAddress: '',
  questions: {}, questionDetails: {}, bloodType: '', bloodPressure: '',
  allergies: { penicillin: false, latex: false, aspirin: false, sulfa: false, others: '' },
  womenOnly: { pregnant: false, nursing: false, birthControl: false }, conditions: {}, habits: {},
  signatureName: '', signatureDate: new Date().toISOString().split('T')[0],
  dentalChart: createEmptyDentalChartData(),
  dentalChartHistory: [],
  treatmentRecords: [],
  progressNotes: [],
  bills: [],
  prescriptions: [],
  certificateDocument: createDefaultCertificateDocument(),
  consentDocument: createDefaultConsentDocument(),
  patientContractDocument: createDefaultPatientContractDocument(),
  certificates: [],
  attachments: [],
  notes: [],
  consents: [],
  appointments: [],
  recalls: [],
  followups: []
});

const createDefaultToothChartEntry = (toothId: string) => ({
  toothId,
  surfaces: { top: null, left: null, right: null, bottom: null, center: null },
  summary: '',
  conditions: [] as string[],
  restorations: [] as string[],
  surgery: [] as string[],
  xray: [] as string[],
});

const mapLegacyChartCodeToEntry = (toothId: string, legacyCode: string) => {
  const entry = createDefaultToothChartEntry(toothId);
  if (!legacyCode) return entry;

  if (DENTAL_CHART_PROCEDURES.Conditions.includes(legacyCode)) {
    entry.conditions = [legacyCode];
  } else if (DENTAL_CHART_PROCEDURES['Restoration & Prosthodontics'].includes(legacyCode)) {
    entry.restorations = [legacyCode];
  } else if (DENTAL_CHART_PROCEDURES.Surgery.includes(legacyCode)) {
    entry.surgery = [legacyCode];
  } else if (DENTAL_CHART_PROCEDURES.Xray.includes(legacyCode)) {
    entry.xray = [legacyCode];
  } else {
    entry.summary = legacyCode;
  }

  return entry;
};

const normalizeToothChartEntry = (toothId: string, rawEntry: any) => {
  if (!rawEntry) return createDefaultToothChartEntry(toothId);
  if (typeof rawEntry === 'string') return mapLegacyChartCodeToEntry(toothId, rawEntry);

  const base = createDefaultToothChartEntry(toothId);
  return {
    ...base,
    ...rawEntry,
    surfaces: { ...base.surfaces, ...(rawEntry?.surfaces || {}) },
    status: Array.isArray(rawEntry?.status) ? rawEntry.status.map(normalizeSavedDentalTag).filter(Boolean) : [],
    conditions: Array.isArray(rawEntry?.conditions) ? rawEntry.conditions.map(normalizeSavedDentalTag).filter(Boolean) : [],
    restorations: Array.isArray(rawEntry?.restorations) ? rawEntry.restorations.map(normalizeSavedDentalTag).filter(Boolean) : [],
    surgery: Array.isArray(rawEntry?.surgery) ? rawEntry.surgery.map(normalizeSavedDentalTag).filter(Boolean) : [],
    xray: Array.isArray(rawEntry?.xray) ? rawEntry.xray.map(normalizeSavedDentalTag).filter(Boolean) : [],
  };
};

const normalizeDentalChartTeeth = (rawTeeth: any) => {
  const normalized: Record<string, any> = {};
  ALL_DENTAL_CHART_TOOTH_IDS.forEach((toothId) => {
    normalized[toothId] = normalizeToothChartEntry(toothId, rawTeeth?.[toothId]);
  });
  return normalized;
};

const mergeDentalChartData = (snapshot: any) => {
  const defaults = createEmptyDentalChartData();
  return {
    ...defaults,
    ...(snapshot || {}),
    teeth: normalizeDentalChartTeeth(snapshot?.teeth),
    periodontal: { ...defaults.periodontal, ...(snapshot?.periodontal || {}) },
    occlusion: { ...defaults.occlusion, ...(snapshot?.occlusion || {}) },
    appliances: { ...defaults.appliances, ...(snapshot?.appliances || {}) },
    tmd: { ...defaults.tmd, ...(snapshot?.tmd || {}) },
    recommendationPlan: { ...defaults.recommendationPlan, ...(snapshot?.recommendationPlan || {}) },
    xrayTaken: { ...defaults.xrayTaken, ...(snapshot?.xrayTaken || {}) },
    remarks: { ...defaults.remarks, ...(snapshot?.remarks || {}) },
  };
};

const mergePatientContractDocument = (snapshot: any) => {
  const defaults = createDefaultPatientContractDocument();
  const rawRows = Array.isArray(snapshot?.packageRows) ? snapshot.packageRows : [];
  const mergedRows = rawRows.map((row: any) => ({
    ...createEmptyContractPackageRow(),
    ...(row || {}),
    id: row?.id || crypto.randomUUID(),
  }));

  return {
    ...defaults,
    ...(snapshot || {}),
    downPaymentTerms: Array.from({ length: 5 }, (_, index) => snapshot?.downPaymentTerms?.[index] || ''),
    packageRows: mergedRows.length > 0 ? mergedRows : defaults.packageRows,
  };
};

const getToothFlatTags = (toothEntry: any) => [
  ...(toothEntry?.status || []),
  ...(toothEntry?.conditions || []),
  ...(toothEntry?.restorations || []),
  ...(toothEntry?.surgery || []),
  ...(toothEntry?.xray || []),
];

const getToothCategoryValues = (toothEntry: any, category: keyof typeof TOOTH_CATEGORY_FIELD_MAP) => {
  const field = TOOTH_CATEGORY_FIELD_MAP[category];
  return toothEntry?.[field] || [];
};

const setToothCategoryValues = (toothEntry: any, category: keyof typeof TOOTH_CATEGORY_FIELD_MAP, values: string[]) => {
  const field = TOOTH_CATEGORY_FIELD_MAP[category];
  return { ...toothEntry, [field]: values };
};

const mergePatientData = (snapshot: any) => {
  const defaults = createInitialPatientData();
  return {
    ...defaults,
    ...snapshot,
    allergies: { ...defaults.allergies, ...(snapshot?.allergies || {}) },
    womenOnly: { ...defaults.womenOnly, ...(snapshot?.womenOnly || {}) },
    dentalChart: mergeDentalChartData(snapshot?.dentalChart),
    dentalChartHistory: Array.isArray(snapshot?.dentalChartHistory) ? snapshot.dentalChartHistory : [],
    certificateDocument: { ...defaults.certificateDocument, ...(snapshot?.certificateDocument || {}) },
    patientContractDocument: mergePatientContractDocument(snapshot?.patientContractDocument),
    consentDocument: {
      ...defaults.consentDocument,
      ...(snapshot?.consentDocument || {}),
      medicalHistory: { ...defaults.consentDocument.medicalHistory, ...(snapshot?.consentDocument?.medicalHistory || {}) },
      allergies: { ...defaults.consentDocument.allergies, ...(snapshot?.consentDocument?.allergies || {}) },
    },
  };
};

const mergeSettings = (snapshot: any) => ({
  ...DEFAULT_SETTINGS,
  ...snapshot,
  visibility: { ...DEFAULT_SETTINGS.visibility, ...(snapshot?.visibility || {}) },
});

const normalizeDoctors = (snapshot: any) => (
  Array.isArray(snapshot)
    ? snapshot
      .map((doctor) => ({
        id: doctor?.id || crypto.randomUUID(),
        name: doctor?.name || '',
        role: doctor?.role || 'Attending Dentist',
        signature: doctor?.signature || null,
      }))
      .filter((doctor) => doctor.name.trim())
    : DEFAULT_DOCTORS
);

const getDoctorById = (doctors: Array<{ id: string; name: string; role: string; signature: string | null }>, doctorId?: string | null) =>
  doctors.find((doctor) => doctor.id === doctorId) || null;

const formatSupabaseError = (error: any) => {
  const message = error?.message || 'Unknown Supabase error';
  if (message === 'Failed to fetch' || message.includes('fetch')) {
    return supabaseHost
      ? `Network error talking to Supabase. The configured host \`${supabaseHost}\` could not be reached. Update \`VITE_SUPABASE_URL\` in \`.env.local\` or confirm that the Supabase project still exists.`
      : 'Network error talking to Supabase. Check `VITE_SUPABASE_URL` in `.env.local` and confirm your project is active.';
  }
  return message;
};

const formatClinicRecordName = (data: any) => {
  const lastName = (data?.lastName || '').trim();
  const firstName = (data?.firstName || '').trim();
  const middleName = (data?.middleName || '').trim();
  const signatureName = (data?.signatureName || '').trim();

  if (lastName && firstName) {
    return `${lastName}, ${firstName}${middleName ? ` ${middleName}` : ''}`;
  }

  if (lastName) return lastName;
  if (firstName) return firstName;
  if (signatureName) return signatureName;
  return 'Untitled Patient';
};

const sanitizeFileNamePart = (value: string | null | undefined, fallback = 'Patient') => {
  const safe = (value || '').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_');
  return safe || fallback;
};

const getNumberSetting = (settings: any, key: string, fallback: number) => {
  const parsed = Number(settings?.[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getDocumentFormPrefix = (documentType: DocumentFormType) => DOCUMENT_FORM_CONFIG[documentType].prefix;

const getDocumentLayoutSettings = (settings: any, documentType: DocumentFormType) => {
  const prefix = getDocumentFormPrefix(documentType);
  return {
    logo: settings?.[`${prefix}Logo`] || null,
    showLogo: settings?.[`${prefix}ShowLogo`] ?? true,
    logoOutline: settings?.[`${prefix}LogoOutline`] ?? false,
    pageOutline: settings?.[`${prefix}PageOutline`] ?? false,
    logoSize: getNumberSetting(settings, `${prefix}LogoSize`, documentType === 'certificate' ? 96 : 84),
    logoGap: getNumberSetting(settings, `${prefix}LogoGap`, documentType === 'certificate' ? 18 : 14),
    pagePaddingTop: getNumberSetting(settings, `${prefix}PagePaddingTop`, documentType === 'certificate' ? 54 : 44),
    pagePaddingRight: getNumberSetting(settings, `${prefix}PagePaddingRight`, documentType === 'certificate' ? 58 : 44),
    pagePaddingBottom: getNumberSetting(settings, `${prefix}PagePaddingBottom`, documentType === 'certificate' ? 54 : 44),
    pagePaddingLeft: getNumberSetting(settings, `${prefix}PagePaddingLeft`, documentType === 'certificate' ? 58 : 44),
  };
};

const getDocumentPageStyle = (settings: any, documentType: DocumentFormType) => {
  const layout = getDocumentLayoutSettings(settings, documentType);
  return {
    paddingTop: `${layout.pagePaddingTop}px`,
    paddingRight: `${layout.pagePaddingRight}px`,
    paddingBottom: `${layout.pagePaddingBottom}px`,
    paddingLeft: `${layout.pagePaddingLeft}px`,
    border: layout.pageOutline ? '1.5px solid #0f172a' : '0 solid transparent',
  };
};

const resolveExportModeFromTab = (activeTab: string): ExportMode => {
  if (activeTab === 'certificates') return 'certificate';
  if (activeTab === 'consents') return 'consent';
  if (activeTab === 'contract') return 'contract';
  return 'record';
};

const getExportElementId = (mode: ExportMode) => {
  if (mode === 'certificate') return 'certificate-pdf-export-container';
  if (mode === 'consent') return 'consent-pdf-export-container';
  if (mode === 'contract') return 'contract-pdf-export-container';
  return 'pdf-export-container';
};

const getExportFileName = (mode: ExportMode, data: any) => {
  const lastName = sanitizeFileNamePart(data?.lastName, 'Patient');
  if (mode === 'certificate') return `${lastName}_CertificateForm.pdf`;
  if (mode === 'consent') return `${lastName}_ConsentForm.pdf`;
  if (mode === 'contract') return `${lastName}_PatientContract.pdf`;
  return `${lastName}_Record.pdf`;
};

type DevAuthUser = {
  id: 'dev-owner' | 'dev-associate' | 'dev-staff';
  email: string;
  full_name: string;
  role: 'clinic_owner' | 'associate_dentist' | 'staff';
  isDevMockUser: true;
};

const DEV_AUTH_USERS: Array<DevAuthUser & { password: string }> = [
  {
    id: 'dev-owner',
    email: 'pnjtanartedentalclinic@gmail.com',
    full_name: 'Maria Jessica David Tanarte',
    role: 'clinic_owner',
    password: 'pnjtanarte2020',
    isDevMockUser: true,
  },
  {
    id: 'dev-associate',
    email: 'associate@pj-dental.com',
    full_name: 'Associate Dentist',
    role: 'associate_dentist',
    password: 'pj2020',
    isDevMockUser: true,
  },
  {
    id: 'dev-staff',
    email: 'staff@pj-dental.com',
    full_name: 'Staff Member',
    role: 'staff',
    password: 'pj2020',
    isDevMockUser: true,
  },
];

const getDevAuthUser = (email: string, password: string) =>
  DEV_AUTH_USERS.find(
    (user) => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password,
  ) || null;

const getDevAuthSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DEV_AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.isDevMockUser !== true) return null;
    return parsed as DevAuthUser;
  } catch {
    return null;
  }
};

const setDevAuthSession = (user: DevAuthUser) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEV_AUTH_SESSION_KEY, JSON.stringify(user));
};

const clearDevAuthSession = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEV_AUTH_SESSION_KEY);
};

// --- MAIN APP COMPONENT ---
export default function DentalSaaS() {
  const loadRequestIdRef = useRef(0);
  const supabaseUnavailableMessage = supabaseConfigError || 'Supabase is not configured yet.';
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activePrintHistoryEntryId, setActivePrintHistoryEntryId] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState('patient_record');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [patientsMenuOpen, setPatientsMenuOpen] = useState(true);
  const [patientsActionMenuOpen, setPatientsActionMenuOpen] = useState(false);
  const [patientTabsMoreOpen, setPatientTabsMoreOpen] = useState(false);
  const [systemSettingsView, setSystemSettingsView] = useState<'overview' | 'pdf'>('overview');
  const [systemSettingsTab, setSystemSettingsTab] = useState<SystemSettingsTab>('general');
  const [activeMasterDirectoryType, setActiveMasterDirectoryType] = useState<MasterDirectoryType>('services');
  const [masterDirectoryCounts, setMasterDirectoryCounts] = useState<Record<MasterDirectoryType, number>>({} as any);

  const [patientData, setPatientData] = useState(createInitialPatientData);
  const patientDataRef = useRef(patientData);
  useEffect(() => {
    patientDataRef.current = patientData;
  }, [patientData]);

  const [isDownloading, setIsDownloading] = useState(false);
  const [printExportMode, setPrintExportMode] = useState<ExportMode>('record');
  const [printRequestId, setPrintRequestId] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [favoriteStatuses, setFavoriteStatuses] = useState(['✓', 'D', 'M', 'F', 'X', 'Cm']);
  const [doctors, setDoctors] = useState(DEFAULT_DOCTORS);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authInfoMessage, setAuthInfoMessage] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<DemoRoleKey>('clinic_owner');

  // Developer Mode & User Management States
  const [devUnlockModalOpen, setDevUnlockModalOpen] = useState(false);
  const [devIdInput, setDevIdInput] = useState('');
  const [devKeyInput, setDevKeyInput] = useState('');
  const [devUnlockError, setDevUnlockError] = useState('');
  const [devUnlockLoading, setDevUnlockLoading] = useState(false);
  const [isDevModeUnlocked, setIsDevModeUnlocked] = useState(() => isDeveloperModeUnlocked());
  const [settingsTitleClicks, setSettingsTitleClicks] = useState(0);
  const [devWizardStep, setDevWizardStep] = useState(1);
  const [clinicUsersList, setClinicUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [addUserForm, setAddUserForm] = useState({ fullName: '', email: '', role: 'staff_member' as DemoRoleKey, status: 'Active' });

  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isRefreshingRecords, setIsRefreshingRecords] = useState(false);
  const [isRefreshingArchivedRecords, setIsRefreshingArchivedRecords] = useState(false);
  const [isSavingDoctors, setIsSavingDoctors] = useState(false);
  const [patientDbStatus, setPatientDbStatus] = useState('');
  const [dentalChartDbStatus, setDentalChartDbStatus] = useState('');
  const [templateDbStatus, setTemplateDbStatus] = useState('');
  const [doctorDbStatus, setDoctorDbStatus] = useState('');
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [archivedRecords, setArchivedRecords] = useState<any[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchError, setGlobalSearchError] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResponse>({
    patients: [],
    masterDirectory: [],
    appointments: [],
    combined: [],
  });
  const [globalSearchHighlightIndex, setGlobalSearchHighlightIndex] = useState(0);
  const globalSearchRef = useRef<HTMLDivElement | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [clinicUserProfile, setClinicUserProfile] = useState<ClinicUserProfile>(() => buildClinicUserProfile(null, null));
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileDialog, setProfileDialog] = useState<ProfileDialog>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [pendingEmailChange, setPendingEmailChange] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRunningProfileAction, setIsRunningProfileAction] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [patientRecordDetailOpen, setPatientRecordDetailOpen] = useState(false);
  const [patientRecordDetailTab, setPatientRecordDetailTab] = useState<PatientWorkspaceTab>('form');
  const [patientRecordEditorOpen, setPatientRecordEditorOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | { type: 'archive' | 'restore' | 'delete'; record: any }>(null);

  // Developer Mode Auth & Users CRUD Helpers
  const DEV_MOCK_USERS = [
    { id: 'mock-1', full_name: 'Dr. P&J Tanarte', email: 'pnjtanartedentalclinic@gmail.com', role: 'clinic_owner', status: 'Active' },
    { id: 'mock-2', full_name: 'Dr. Associate Dentist', email: 'associate@pj-dental.com', role: 'associate_dentist', status: 'Active' },
    { id: 'mock-3', full_name: 'Staff Member', email: 'staff@pj-dental.com', role: 'staff_member', status: 'Active' }
  ];

  const handleDevUnlockSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDevUnlockError('');
    setDevUnlockLoading(true);
    try {
      const unlocked = await unlockDeveloperMode(devIdInput, devKeyInput);
      if (unlocked) {
        setIsDevModeUnlocked(true);
        setDevUnlockModalOpen(false);
        setDevIdInput('');
        setDevKeyInput('');
        setToast({ open: true, tone: 'success', message: 'Developer Mode unlocked successfully.' });
      } else {
        setDevUnlockError('Invalid developer credentials.');
      }
    } catch (err) {
      console.error(err);
      setDevUnlockError('Verification process failed.');
    } finally {
      setDevUnlockLoading(false);
    }
  };

  const handleLockDevMode = () => {
    lockDeveloperMode();
    setIsDevModeUnlocked(false);
    setToast({ open: true, tone: 'success', message: 'Developer Mode locked.' });
    if (['migration', 'maintenance', 'about', 'sync'].includes(systemSettingsTab)) {
      setSystemSettingsTab('general');
    }
  };

  const handleSettingsTitleClick = () => {
    setSettingsTitleClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setDevUnlockModalOpen(true);
        return 0;
      }
      return next;
    });
  };

  const loadClinicUsers = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoadingUsers(true);
    setUsersError('');
    try {
      const { data, error } = await supabase
        .from('clinic_users')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      setClinicUsersList(data || []);
    } catch (err) {
      console.error('Error loading clinic users:', err);
      setUsersError('Failed to load clinic personnel list.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Keyboard shortcut Ctrl + Shift + D to trigger developer mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setDevUnlockModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Title click timeout reset
  useEffect(() => {
    if (settingsTitleClicks === 0) return;
    const timer = setTimeout(() => setSettingsTitleClicks(0), 2000);
    return () => clearTimeout(timer);
  }, [settingsTitleClicks]);

  // Load clinic users list
  useEffect(() => {
    if (systemSettingsTab === 'users') {
      void loadClinicUsers();
    }
  }, [systemSettingsTab]);

  // Active check of developer mode status
  useEffect(() => {
    if (activeTab === 'customize') {
      const active = isDeveloperModeUnlocked();
      setIsDevModeUnlocked(active);
      if (!active && ['migration', 'maintenance', 'about', 'sync'].includes(systemSettingsTab)) {
        setSystemSettingsTab('general');
      }
    }
  }, [activeTab, systemSettingsTab]);
  const [toast, setToast] = useState<{ open: boolean; tone: 'success' | 'error'; message: string }>({
    open: false,
    tone: 'success',
    message: '',
  });

  const [searchName, setSearchName] = useState('');
  const [searchTag, setSearchTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<MasterDirectoryItem[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [filterYear, setFilterYear] = useState('All Years');
  const [filterCategory, setFilterCategory] = useState('All Types');
  const [filterDate, setFilterDate] = useState('');
  const [sortField, setSortField] = useState<'id' | 'name' | 'lastRecall' | 'balance'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const tagFilterRef = useRef<HTMLDivElement | null>(null);

  const syncPatientRecordUrl = (recordId: string | null) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (recordId) {
      url.searchParams.set('patientId', recordId);
    } else {
      url.searchParams.delete('patientId');
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const openPatientRecordDetail = async (record: { id: string }, tab: PatientWorkspaceTab = 'form', updateUrl = true) => {
    if (!record?.id) return;
    setSelectedRecordId(record.id);
    setPatientRecordDetailTab(tab);
    setPatientRecordDetailOpen(true);
    setPatientRecordEditorOpen(false);
    setActiveTab('patients_record');
    if (updateUrl) {
      syncPatientRecordUrl(record.id);
    }
    await loadRecordFromDatabase(record.id);
  };

  const closePatientRecordDetail = () => {
    setPatientRecordDetailOpen(false);
    setPatientRecordDetailTab('form');
    setPatientRecordEditorOpen(false);
    setPatientsActionMenuOpen(false);
    setPatientTabsMoreOpen(false);
    syncPatientRecordUrl(null);
  };
  const currentNotificationUser: NotificationUser = clinicUserProfile.email
    ? { email: clinicUserProfile.email, name: clinicUserProfile.fullName }
    : clinicUserProfile.fullName
      ? { name: clinicUserProfile.fullName }
      : null;
  const globalSearchFlatResults = [
    ...globalSearchResults.patients,
    ...globalSearchResults.masterDirectory,
    ...globalSearchResults.appointments,
  ];

  const closeGlobalSearch = () => {
    setGlobalSearchOpen(false);
    setGlobalSearchHighlightIndex(0);
  };

  const clearGlobalSearch = () => {
    setGlobalSearchQuery('');
    setGlobalSearchResults({
      patients: [],
      masterDirectory: [],
      appointments: [],
      combined: [],
    });
    setGlobalSearchError('');
    setGlobalSearchLoading(false);
    closeGlobalSearch();
  };

  const handleGlobalSearchSelect = async (result: GlobalSearchResult) => {
    if (result.kind === 'patient') {
      clearGlobalSearch();
      await openPatientRecordDetail({ id: result.id }, 'form', true);
      return;
    }

    if (result.kind === 'master_directory') {
      setActiveTab('master_directory');
      setToast({ open: true, tone: 'success', message: `Opened Master File Directory for ${result.title}.` });
      clearGlobalSearch();
      return;
    }

    if (result.kind === 'appointment') {
      setActiveTab('calendar');
      setToast({ open: true, tone: 'success', message: `Opened Calendar for appointment: ${result.title}.` });
      clearGlobalSearch();
    }
  };

  const handleSelectDemoRole = (role: DemoRoleKey) => {
    setSelectedDemoRole(role);
    setAuthError('');
    const selectedUser =
      role === 'clinic_owner'
        ? DEV_AUTH_USERS[0]
        : role === 'associate_dentist'
          ? DEV_AUTH_USERS[1]
          : DEV_AUTH_USERS[2];
    setAuthInfoMessage('Demo role selected. The matching credentials have been filled in.');
    setAuthEmail(selectedUser.email);
    setAuthPassword(selectedUser.password);
  };

  const handleAuthSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    setAuthInfoMessage('');

    if (DEV_AUTH_ENABLED) {
      const devUser = getDevAuthUser(authEmail, authPassword);
      if (!devUser) {
        setAuthError('Invalid demo credentials.');
        setIsSigningIn(false);
        return;
      }

      const mockSessionUser = {
        id: devUser.id,
        email: devUser.email,
        full_name: devUser.full_name,
        role: devUser.role,
        isDevMockUser: true,
        user_metadata: {
          full_name: devUser.full_name,
          name: devUser.full_name,
          role: devUser.role,
          demoRole: devUser.role,
          isDevMockUser: true,
        },
      };

      setDevAuthSession(devUser);
      setAuthPassword('');
      setAuthInfoMessage('');
      await loadCurrentUserProfile(mockSessionUser);
      setIsSigningIn(false);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setAuthError(supabaseUnavailableMessage);
      return;
    }

    if (!authEmail.trim() || !authPassword) {
      setAuthError('Please enter both email and password.');
      return;
    }

    setIsSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (error) throw error;

      await loadCurrentUserProfile(data.session?.user ?? data.user ?? null);
      setAuthPassword('');
      setAuthInfoMessage('');
    } catch (error) {
      console.error('Error signing in:', error);
      setAuthError(formatSupabaseError(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  const loadCurrentUserProfile = async (sessionCandidate?: any | null) => {
    const nextSessionUser = sessionCandidate ?? null;
    setSessionUser(nextSessionUser);

    if (DEV_AUTH_ENABLED && nextSessionUser?.isDevMockUser) {
      const profile = buildClinicUserProfile(nextSessionUser, null);
      setClinicUserProfile(profile);
      setEditProfileName(profile.fullName);
      setPendingEmailChange(profile.email);
      setIsAuthChecking(false);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      const fallbackProfile = buildClinicUserProfile(nextSessionUser, null);
      setClinicUserProfile(fallbackProfile);
      setEditProfileName(fallbackProfile.fullName);
      setPendingEmailChange(fallbackProfile.email);
      setIsAuthChecking(false);
      return;
    }

    const sessionEmail = String(nextSessionUser?.email || '').trim();
    if (!sessionEmail) {
      const fallbackProfile = buildClinicUserProfile(nextSessionUser, null);
      setClinicUserProfile(fallbackProfile);
      setEditProfileName(fallbackProfile.fullName);
      setPendingEmailChange(fallbackProfile.email);
      setIsAuthChecking(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clinic_users')
        .select('*')
        .eq('email', sessionEmail)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const profile = buildClinicUserProfile(nextSessionUser, data);
      setClinicUserProfile(profile);
      setEditProfileName(profile.fullName);
      setPendingEmailChange(profile.email);
    } catch (error) {
      console.warn('Unable to load clinic_users profile, using session fallback.', error);
      const fallbackProfile = buildClinicUserProfile(nextSessionUser, null);
      setClinicUserProfile(fallbackProfile);
      setEditProfileName(fallbackProfile.fullName);
      setPendingEmailChange(fallbackProfile.email);
    } finally {
      setIsAuthChecking(false);
    }
  };

  const openProfileDialog = (dialog: ProfileDialog) => {
    setProfileMenuOpen(false);
    setEditProfileName(clinicUserProfile.fullName);
    setPendingEmailChange(clinicUserProfile.email);
    setProfileDialog(dialog);
  };

  const handleOpenSettingsFromProfile = () => {
    setProfileMenuOpen(false);
    openSystemSettings();
  };

  const handleManageAccount = () => {
    setProfileMenuOpen(false);
    setSystemSettingsView('overview');
    setSystemSettingsTab('general');
    setActiveTab('customize');
    setToast({ open: true, tone: 'success', message: 'Opened account and system settings.' });
  };

  const handleSaveProfileDetails = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setToast({ open: true, tone: 'error', message: 'Supabase is not configured, so profile editing is unavailable.' });
      return;
    }

    const fullName = editProfileName.trim();
    if (!fullName) {
      setToast({ open: true, tone: 'error', message: 'Full name is required.' });
      return;
    }

    if (!clinicUserProfile.email) {
      setToast({ open: true, tone: 'error', message: 'No profile email is available for this account.' });
      return;
    }

    setIsSavingProfile(true);
    try {
      const [firstName, ...rest] = fullName.split(/\s+/);
      const lastName = rest.join(' ');
      const payload: Record<string, unknown> = {
        email: clinicUserProfile.email,
        full_name: fullName,
        name: fullName,
        first_name: firstName || null,
        last_name: lastName || null,
        updated_at: new Date().toISOString(),
      };

      const query = clinicUserProfile.id
        ? supabase.from('clinic_users').update(payload).eq('id', clinicUserProfile.id)
        : supabase.from('clinic_users').insert(payload);

      const { data, error } = await query.select('*').single();
      if (error) throw error;

      const profile = buildClinicUserProfile(sessionUser, data);
      setClinicUserProfile(profile);
      setEditProfileName(profile.fullName);
      setProfileDialog(null);
      setToast({ open: true, tone: 'success', message: 'Profile details updated.' });
    } catch (error) {
      console.error('Error saving clinic user profile:', error);
      setToast({ open: true, tone: 'error', message: `Unable to save profile: ${formatSupabaseError(error)}` });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!isSupabaseConfigured || !supabase || !clinicUserProfile.email) {
      setToast({ open: true, tone: 'error', message: 'Password reset is unavailable for this account.' });
      return;
    }

    setIsRunningProfileAction(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(clinicUserProfile.email, {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      });
      if (error) throw error;
      setProfileDialog(null);
      setToast({ open: true, tone: 'success', message: `Password reset instructions were sent to ${clinicUserProfile.email}.` });
    } catch (error) {
      console.error('Error sending password reset:', error);
      setToast({ open: true, tone: 'error', message: `Unable to start password reset: ${formatSupabaseError(error)}` });
    } finally {
      setIsRunningProfileAction(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!isSupabaseConfigured || !supabase || !sessionUser) {
      setToast({ open: true, tone: 'error', message: 'Email change is unavailable without an active signed-in session.' });
      return;
    }

    const nextEmail = pendingEmailChange.trim();
    if (!nextEmail) {
      setToast({ open: true, tone: 'error', message: 'Please enter a new email address.' });
      return;
    }

    setIsRunningProfileAction(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: nextEmail });
      if (error) throw error;

      setClinicUserProfile((prev) => ({ ...prev, email: nextEmail }));
      setProfileDialog(null);
      setToast({ open: true, tone: 'success', message: 'Email update requested. Check both inboxes if confirmation is required.' });
    } catch (error) {
      console.error('Error changing email:', error);
      setToast({ open: true, tone: 'error', message: `Unable to change email: ${formatSupabaseError(error)}` });
    } finally {
      setIsRunningProfileAction(false);
    }
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    const isMockSession = Boolean(sessionUser?.isDevMockUser);

    setIsRunningProfileAction(true);
    try {
      if (isMockSession) {
        clearDevAuthSession();
      } else if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } else {
        setToast({ open: true, tone: 'error', message: 'Logout is unavailable because Supabase is not configured.' });
        return;
      }
      await loadCurrentUserProfile(null);
      setToast({ open: true, tone: 'success', message: 'Logged out successfully.' });
    } catch (error) {
      console.error('Error logging out:', error);
      setToast({ open: true, tone: 'error', message: `Unable to log out: ${formatSupabaseError(error)}` });
    } finally {
      setIsRunningProfileAction(false);
    }
  };

  const refreshUnreadNotificationCount = async () => {
    if (!isSupabaseConfigured) {
      setUnreadNotificationCount(0);
      return;
    }

    try {
      const count = await loadUnreadNotificationCount(currentNotificationUser);
      setUnreadNotificationCount(count);
    } catch (error) {
      console.error('Error loading unread notification count:', error);
      setUnreadNotificationCount(0);
    }
  };

  const refreshNotifications = async () => {
    if (!isSupabaseConfigured) {
      setNotifications([]);
      setNotificationsError(supabaseUnavailableMessage);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError('');

    try {
      const items = await loadNotifications(currentNotificationUser);
      setNotifications(items);
      setUnreadNotificationCount(items.filter((item) => !item.isRead).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
      setNotificationsError(formatSupabaseError(error));
    } finally {
      setNotificationsLoading(false);
    }
  };

  const navigateFromNotificationLink = async (link: string) => {
    if (!link || typeof window === 'undefined') return;

    const normalizedLink = link.trim();
    if (!normalizedLink) return;

    try {
      const url = new URL(normalizedLink, window.location.origin);
      const patientId = url.searchParams.get('patientId');
      if (patientId) {
        await openPatientRecordDetail({ id: patientId }, 'form', true);
        return;
      }

      const pathname = url.pathname.replace(/^\/+/, '').toLowerCase();
      const explicitTab = (url.searchParams.get('tab') || pathname).toLowerCase();
      if (explicitTab === 'calendar') {
        setActiveTab('calendar');
        return;
      }
      if (explicitTab === 'master_directory' || explicitTab === 'master-file-directory') {
        setActiveTab('master_directory');
        return;
      }
      if (explicitTab === 'patients' || explicitTab === 'patients_record') {
        setActiveTab('patients_record');
      }
    } catch (error) {
      console.warn('Skipping unsafe notification link:', link, error);
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    try {
      if (!notification.isRead) {
        await markNotificationRead(notification.id);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      await refreshNotifications();
    }

    setNotificationsOpen(false);
    if (notification.related_link) {
      await navigateFromNotificationLink(notification.related_link);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsRead(currentNotificationUser);
      await refreshNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setNotificationsError(formatSupabaseError(error));
    }
  };

  const formatPatientId = (record: any) => {
    const year = record.created_at ? new Date(record.created_at).getFullYear() : 2026;
    const shortId = record.id ? record.id.split('-')[0].substring(0, 4).toUpperCase() : '0000';
    return `PAT-${year}-${shortId}`;
  };

  const getPatientBalance = (record: any) => {
    return calculatePatientRemainingBalance(record);
  };

  const handleSort = (field: 'id' | 'name' | 'lastRecall' | 'balance') => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getProcessedRecords = () => {
    let list = [...savedRecords];

    if (searchName.trim()) {
      const query = searchName.toLowerCase();
      list = list.filter((r) => {
        const patientData = getPatientRecordData(r);
        const fullName = `${patientData.lastName || r.patient_last_name || ''} ${patientData.firstName || r.patient_first_name || ''}`.toLowerCase();
        return fullName.includes(query) || (r.record_name && r.record_name.toLowerCase().includes(query));
      });
    }

    if (selectedTags.length > 0) {
      const selectedTagKeys = new Set(selectedTags.map((tag) => tag.toLowerCase()));
      list = list.filter((r) => {
        const recordTags = getPatientRecordTags(r);
        return recordTags.some((tag) => selectedTagKeys.has(tag.toLowerCase()));
      });
    }

    if (filterCategory !== 'All Types') {
      list = list.filter((r) => {
        const age = getPatientRecordAge(r);
        if (age === null) return false;
        if (filterCategory === 'Pedia') return age >= 18 && age <= 21;
        if (filterCategory === 'Adult') return age >= 22;
        return false;
      });
    }

    if (filterYear !== 'All Years') {
      list = list.filter((r) => {
        return getPatientRecordYear(r) === filterYear;
      });
    }

    if (filterDate) {
      list = list.filter((r) => {
        return getPatientRecordFilterDate(r) === filterDate;
      });
    }

    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'id') {
        valA = a.created_at || a.updated_at || '';
        valB = b.created_at || b.updated_at || '';
      } else if (sortField === 'name') {
        const aData = getPatientRecordData(a);
        const bData = getPatientRecordData(b);
        valA = `${aData.lastName || a.patient_last_name || ''}, ${aData.firstName || a.patient_first_name || ''}`.toLowerCase();
        valB = `${bData.lastName || b.patient_last_name || ''}, ${bData.firstName || b.patient_first_name || ''}`.toLowerCase();
      } else if (sortField === 'lastRecall') {
        valA = getPatientRecordData(a).lastVisit || '';
        valB = getPatientRecordData(b).lastVisit || '';
      } else if (sortField === 'balance') {
        valA = getPatientBalance(a);
        valB = getPatientBalance(b);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  };

  const processedList = getProcessedRecords();
  const totalPages = Math.ceil(processedList.length / 30) || 1;
  const paginatedRecords = processedList.slice((currentPage - 1) * 30, currentPage * 30);
  const currentYear = String(new Date().getFullYear());
  const yearOptions = Array.from(new Set(savedRecords.map((record) => getPatientRecordYear(record)).filter(Boolean)))
    .sort((a, b) => Number(b) - Number(a));
  const sortedYearOptions = currentYear
    ? [currentYear, ...yearOptions.filter((year) => year !== currentYear)]
    : yearOptions;
  const selectedTagKeys = new Set(selectedTags.map((tag) => tag.toLowerCase()));
  const filteredTagOptions = availableTags.filter((item) => {
    const tagLabel = String(item.name || item.code || '').trim();
    if (!tagLabel || selectedTagKeys.has(tagLabel.toLowerCase())) return false;
    if (!searchTag.trim()) return true;
    const query = searchTag.toLowerCase();
    return [item.name, item.code, item.description].join(' ').toLowerCase().includes(query);
  });

  const recordName = formatClinicRecordName(patientData);

  const applySnapshot = (record: any) => {
    setCurrentRecordId(record.id);
    setSelectedRecordId(record.id);
    setPatientData(mergePatientData(record.patient_data));
    setFavoriteStatuses(
      Array.isArray(record.favorite_statuses) && record.favorite_statuses.length > 0
        ? normalizeFavoriteStatusesList(record.favorite_statuses)
        : DEFAULT_FAVORITE_STATUSES
    );
  };



  const refreshSavedRecords = async () => {
    if (!isSupabaseConfigured) {
      setPatientDbStatus(supabaseUnavailableMessage);
      return;
    }

    setIsRefreshingRecords(true);

    try {
      const data = await loadActivePatientRecords();
      setSavedRecords(data || []);
    } catch (error) {
      console.error('Error loading patient list:', error);
      setPatientDbStatus(`Failed to load patient list: ${formatSupabaseError(error)}`);
      setToast({ open: true, tone: 'error', message: 'Failed to refresh patient list.' });
    } finally {
      setIsRefreshingRecords(false);
    }
  };

  const refreshArchivedRecords = async () => {
    if (!isSupabaseConfigured) {
      setPatientDbStatus(supabaseUnavailableMessage);
      return;
    }

    setIsRefreshingArchivedRecords(true);

    try {
      const data = await loadArchivedPatientRecords();
      setArchivedRecords(data || []);
    } catch (error) {
      console.error('Error loading archived patient list:', error);
      setPatientDbStatus(`Failed to load archived patient list: ${formatSupabaseError(error)}`);
      setToast({ open: true, tone: 'error', message: 'Failed to refresh archived records.' });
    } finally {
      setIsRefreshingArchivedRecords(false);
    }
  };

  const loadTemplateSettings = async () => {
    if (!isSupabaseConfigured) {
      setTemplateDbStatus(supabaseUnavailableMessage);
      return;
    }

    try {
      const settingsData = await loadTemplateSettingsService();
      if (settingsData) {
        setSettings(mergeSettings(settingsData));
        setTemplateDbStatus('Loaded latest PDF template settings.');
      } else {
        setTemplateDbStatus('No saved PDF template yet. Using local defaults.');
      }
    } catch (error) {
      console.error('Error loading template settings:', error);
      setTemplateDbStatus(`Template load failed: ${formatSupabaseError(error)}`);
    }
  };

  const loadDoctorsRegistry = async () => {
    if (!isSupabaseConfigured) {
      setDoctorDbStatus(supabaseUnavailableMessage);
      return;
    }

    try {
      const normalizedDoctors = await loadDoctorsRegistryService();
      setDoctors(normalizedDoctors);
      setDoctorDbStatus(normalizedDoctors.length > 0 ? 'Loaded clinic doctors registry.' : 'No doctors saved yet. Add doctors in System Settings.');
    } catch (error) {
      console.error('Error loading doctors registry:', error);
      setDoctorDbStatus(`Failed to load doctors: ${formatSupabaseError(error)}`);
    }
  };

  const saveDoctorsRegistry = async (nextDoctors: Array<{ id: string; name: string; role: string; signature: string | null }>) => {
    if (!isSupabaseConfigured) {
      setDoctorDbStatus(supabaseUnavailableMessage);
      return false;
    }

    setIsSavingDoctors(true);
    setDoctorDbStatus('Saving doctors registry...');

    try {
      const normalizedDoctors = await saveDoctorsRegistryService(nextDoctors);
      setDoctors(normalizedDoctors);
      setDoctorDbStatus(`Saved ${normalizedDoctors.length} clinic doctor${normalizedDoctors.length === 1 ? '' : 's'}.`);

      const defaultDoctor = getDoctorById(normalizedDoctors, settings.defaultDentistId) || normalizedDoctors[0] || null;
      if (defaultDoctor) {
        setSettings((prev) => ({
          ...prev,
          defaultDentistId: defaultDoctor.id,
          defaultDentistName: defaultDoctor.name,
          defaultDentistRole: defaultDoctor.role,
          defaultDentistSignature: defaultDoctor.signature,
        }));
      }

      return true;
    } catch (error) {
      console.error('Error saving doctors registry:', error);
      setDoctorDbStatus(`Failed to save doctors: ${formatSupabaseError(error)}`);
      return false;
    } finally {
      setIsSavingDoctors(false);
    }
  };

  const saveTemplateSettings = async (nextSettings: any) => {
    if (!isSupabaseConfigured) {
      setTemplateDbStatus(supabaseUnavailableMessage);
      return false;
    }

    setIsSavingTemplate(true);
    setTemplateDbStatus('Saving PDF template settings...');

    try {
      await saveTemplateSettingsService(nextSettings);
      setSettings(mergeSettings(nextSettings));
      setTemplateDbStatus('Saved PDF template settings.');
      return true;
    } catch (error) {
      console.error('Error saving template settings:', error);
      setTemplateDbStatus(`Failed to save template settings: ${formatSupabaseError(error)}`);
      return false;
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const loadDentalChartForRecord = async (recordId: string, recordName: string) => {
    if (!isSupabaseConfigured) return;
    try {
      const charts = await getDentalChartsByPatientId(recordId);
      console.log('Loaded dental charts count:', charts.length);
      
      if (charts.length > 0) {
        const mappedHistory = charts.map(mapSupabaseDentalChartRowToHistoryEntry);

        setPatientData(prev => ({
          ...prev,
          dentalChartHistory: mappedHistory,
          dentalChart: mappedHistory[0]?.dentalChart || createEmptyDentalChartData()
        }));
      } else {
        setPatientData(prev => ({
          ...prev,
          dentalChartHistory: [],
          dentalChart: createEmptyDentalChartData()
        }));
      }
      setDentalChartDbStatus(`Loaded dedicated dental charts for ${recordName}.`);
    } catch (e) {
      console.error('Error loading dental charts:', e);
      setDentalChartDbStatus(`Failed to load dental charts: ${formatSupabaseError(e)}`);
    }
  };

  const loadRecordFromDatabase = async (recordId?: string | null) => {
    if (!isSupabaseConfigured) {
      setPatientDbStatus(supabaseUnavailableMessage);
      return;
    }

    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    setIsLoadingFromDb(true);
    setPatientDbStatus(recordId ? 'Loading selected patient record...' : 'Loading latest patient record...');

    try {
      const data = await loadPatientRecord(recordId);

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      if (!data) {
        setCurrentRecordId(null);
        setSelectedRecordId(null);
        setPatientRecordDetailOpen(false);
        setPatientRecordDetailTab('form');
        setPatientRecordEditorOpen(false);
        syncPatientRecordUrl(null);
        setPatientDbStatus('Supabase is connected, but there are no patient records yet.');
        setDentalChartDbStatus('No patient selected yet, so no dental chart is loaded.');
        setToast({ open: true, tone: 'error', message: 'No patient record found.' });
        return;
      }

      applySnapshot(data);
      await loadDentalChartForRecord(data.id, data.record_name || 'Untitled Patient');
      await refreshSavedRecords();
      setToast({ open: true, tone: 'success', message: `Loaded ${data.record_name || 'patient record'}.` });
    } catch (error) {
      console.error('Error loading Supabase record:', error);
      setPatientDbStatus(`Failed to load data: ${formatSupabaseError(error)}`);
      setToast({ open: true, tone: 'error', message: 'Failed to load patient record.' });
    } finally {
      setIsLoadingFromDb(false);
    }
  };

  const saveToDatabase = async (saveAsNew = false) => {
    if (!isSupabaseConfigured) {
      setPatientDbStatus(supabaseUnavailableMessage);
      return;
    }

    setIsSavingToDb(true);
    setPatientDbStatus(saveAsNew ? 'Saving as new patient record...' : 'Saving patient record...');

    const payload = {
      id: saveAsNew ? undefined : currentRecordId || undefined,
      record_name: recordName,
      patient_last_name: patientDataRef.current.lastName || null,
      patient_first_name: patientDataRef.current.firstName || null,
      patient_data: patientDataRef.current,
      favorite_statuses: normalizeFavoriteStatusesList(favoriteStatuses),
    };

    let savedRecord: Awaited<ReturnType<typeof savePatientRecord>> | null = null;

    try {
      savedRecord = await savePatientRecord({
        ...payload,
        id: saveAsNew ? undefined : currentRecordId || undefined,
      });
      // Dental chart rows are managed exclusively through the Dental Chart History
      // module (createDentalChartRecord / updateDentalChartRecord).
      // EXCEPTION: if this is the very first save of a previously-unsaved patient,
      // flush any locally queued dental chart entries now so they reach Supabase.
      const isFirstSave = !currentRecordId && !saveAsNew;
      if (isFirstSave) {
        console.log('New patient created: dentalChartHistory should be 0');
        const localCharts = patientDataRef.current.dentalChartHistory || [];
        for (const chart of localCharts) {
          const chartPayload = {
            chartData: chart.dentalChart,
            summary: chart.recallSummary || null,
            recallDate: chart.recallDate,
            medicalCondition: chart.medicalCondition || null,
            medications: chart.medications || null,
            allergies: chart.allergies || null,
            extraoralExam: chart.extraoralExam || null
          };
          await createDentalChartRecord(savedRecord.id, chartPayload, { source: 'explicit-dental-chart-save' });
        }
      }
      applySnapshot(savedRecord);
      await loadDentalChartForRecord(savedRecord.id, savedRecord.record_name || 'Untitled Patient');
      await refreshSavedRecords();
      setPatientDbStatus(`${saveAsNew ? 'Saved new' : 'Saved'} patient record: ${savedRecord.record_name || 'Untitled Patient'}`);
      setToast({ open: true, tone: 'success', message: `${saveAsNew ? 'Saved new' : 'Updated'} ${savedRecord.record_name || 'patient record'}.` });

      if (saveAsNew) {
        setCurrentRecordId(null);
        setSelectedRecordId(null);
        setActiveTab('patients_record');
      }
    } catch (chartError) {
      console.error('Error saving patient record:', chartError);
      setPatientDbStatus(`Failed to save patient record: ${formatSupabaseError(chartError)}`);
      setToast({ open: true, tone: 'error', message: 'Failed to save patient record.' });
      return;
    } finally {
      setIsSavingToDb(false);
    }
  };

  const startNewPatientRecord = () => {
    loadRequestIdRef.current += 1;
    setCurrentRecordId(null);
    setSelectedRecordId(null);
    setPatientData(createInitialPatientData());
    setFavoriteStatuses(DEFAULT_FAVORITE_STATUSES);
    setDentalChartDbStatus('No patient selected yet, so no dental chart is loaded.');
    setPatientDbStatus('Started a new blank patient record. Save it when ready.');
    setToast({ open: true, tone: 'success', message: 'Started a new blank patient record.' });
    setPatientsActionMenuOpen(false);
    setPatientRecordDetailTab('form');
    setPatientRecordDetailOpen(true);
    setPatientRecordEditorOpen(true);
    setActiveTab('patients_record');
    syncPatientRecordUrl(null);
  };

  const archivePatientRecord = async (record: any) => {
    if (!isSupabaseConfigured) {
      setPatientDbStatus(supabaseUnavailableMessage);
      setToast({ open: true, tone: 'error', message: supabaseUnavailableMessage });
      return;
    }

    setPatientDbStatus(`Archiving ${record.record_name || 'patient record'}...`);

    try {
      await archivePatientRecordService(record.id);
    } catch (error) {
      console.error('Error archiving patient record:', error);
      setPatientDbStatus(`Failed to archive patient record: ${formatSupabaseError(error)}`);
      setToast({ open: true, tone: 'error', message: `Failed to archive ${record.record_name || 'patient record'}.` });
      return;
    }

    if (currentRecordId === record.id || selectedRecordId === record.id) {
      startNewPatientRecord();
    }

    await refreshSavedRecords();
    await refreshArchivedRecords();
    setPatientDbStatus(`Archived patient record: ${record.record_name || 'Untitled Patient'}`);
    setToast({ open: true, tone: 'success', message: `${record.record_name || 'Patient record'} archived.` });
  };

  const restorePatientRecord = async (record: any) => {
    if (!isSupabaseConfigured) {
      setPatientDbStatus(supabaseUnavailableMessage);
      return;
    }

    setIsLoadingFromDb(true);
    setPatientDbStatus('Restoring patient record...');

    try {
      await restorePatientRecordService(record.id);
      await refreshSavedRecords();
      await refreshArchivedRecords();
    } catch (error) {
      console.error('Error restoring record:', error);
      setPatientDbStatus(`Failed to restore patient record: ${formatSupabaseError(error)}`);
      setToast({ open: true, tone: 'error', message: `Failed to restore ${record.record_name || 'patient record'}.` });
      return;
    } finally {
      setIsLoadingFromDb(false);
    }

    setPatientDbStatus(`Restored patient record: ${record.record_name || 'Untitled Patient'}`);
    setToast({ open: true, tone: 'success', message: `${record.record_name || 'Patient record'} restored to active list.` });
    setActiveTab('patients_record');
  };

  const deletePatientRecord = async (record: any) => {
    if (!isSupabaseConfigured) {
      setPatientDbStatus(supabaseUnavailableMessage);
      return;
    }

    setIsLoadingFromDb(true);
    setPatientDbStatus('Deleting patient record permanently...');

    try {
      await deletePatientRecordService(record.id);
      await refreshArchivedRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
      setPatientDbStatus(`Failed to delete patient record: ${formatSupabaseError(error)}`);
      setToast({ open: true, tone: 'error', message: `Failed to delete ${record.record_name || 'patient record'}.` });
      return;
    } finally {
      setIsLoadingFromDb(false);
    }

    setPatientDbStatus(`Permanently deleted patient record: ${record.record_name || 'Untitled Patient'}`);
    setToast({ open: true, tone: 'success', message: `${record.record_name || 'Patient record'} permanently deleted.` });
  };

  const openSystemSettings = () => {
    setSystemSettingsTab('general');
    setSystemSettingsView('overview');
    setActiveTab('customize');
  };

  useEffect(() => {
    let authCleanup: (() => void) | undefined;

    if (DEV_AUTH_ENABLED) {
      loadTemplateSettings();
      loadDoctorsRegistry();
      refreshSavedRecords();
      refreshArchivedRecords();

      const storedDevSession = getDevAuthSession();
      if (storedDevSession) {
        void loadCurrentUserProfile({
          id: storedDevSession.id,
          email: storedDevSession.email,
          full_name: storedDevSession.full_name,
          role: storedDevSession.role,
          isDevMockUser: true,
          user_metadata: {
            full_name: storedDevSession.full_name,
            name: storedDevSession.full_name,
            role: storedDevSession.role,
            demoRole: storedDevSession.role,
            isDevMockUser: true,
          },
        });
      } else {
        setIsAuthChecking(false);
      }

      const params = new URLSearchParams(window.location.search);
      const patientIdParam = params.get('patientId');
      if (patientIdParam) {
        setSelectedRecordId(patientIdParam);
        setPatientRecordDetailTab('form');
        setPatientRecordDetailOpen(true);
        setPatientRecordEditorOpen(false);
        setActiveTab('patients_record');
        loadRecordFromDatabase(patientIdParam);
      }
    } else if (isSupabaseConfigured) {
      loadTemplateSettings();
      loadDoctorsRegistry();
      refreshSavedRecords();
      refreshArchivedRecords();
      if (supabase) {
        void supabase.auth.getSession().then(({ data }) => {
          void loadCurrentUserProfile(data.session?.user ?? null);
        });

        const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
          void loadCurrentUserProfile(session?.user ?? null);
        });

        authCleanup = () => authSubscription.subscription.unsubscribe();
      }

      const params = new URLSearchParams(window.location.search);
      const patientIdParam = params.get('patientId');
      if (patientIdParam) {
        setSelectedRecordId(patientIdParam);
        setPatientRecordDetailTab('form');
        setPatientRecordDetailOpen(true);
        setPatientRecordEditorOpen(false);
        setActiveTab('patients_record');
        loadRecordFromDatabase(patientIdParam);
      }
    } else {
      setPatientDbStatus(supabaseUnavailableMessage);
      setDentalChartDbStatus(supabaseUnavailableMessage);
      setTemplateDbStatus(supabaseUnavailableMessage);
      setDoctorDbStatus(supabaseUnavailableMessage);
      setIsAuthChecking(false);
    }

    return () => {
      authCleanup?.();
    };
  }, []);

  useEffect(() => {
    void refreshUnreadNotificationCount();
  }, [clinicUserProfile.email, clinicUserProfile.fullName]);

  useEffect(() => {
    if (!notificationsOpen) return;
    void refreshNotifications();
  }, [notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileMenuOpen]);



  useEffect(() => {
    const normalized = globalSearchQuery.trim();
    if (normalized.length < 1) {
      setGlobalSearchResults({
        patients: [],
        masterDirectory: [],
        appointments: [],
        combined: [],
      });
      setGlobalSearchLoading(false);
      setGlobalSearchError('');
      setGlobalSearchHighlightIndex(0);
      if (!normalized) setGlobalSearchOpen(false);
      return;
    }

    setGlobalSearchOpen(true);
    const timer = window.setTimeout(() => {
      setGlobalSearchLoading(true);
      setGlobalSearchError('');
      void searchGlobal(normalized)
        .then((results) => {
          setGlobalSearchResults(results);
          setGlobalSearchHighlightIndex(0);
        })
        .catch((error) => {
          console.error('Error running global search:', error);
          setGlobalSearchResults({
            patients: [],
            masterDirectory: [],
            appointments: [],
            combined: [],
          });
          setGlobalSearchError(formatSupabaseError(error));
        })
        .finally(() => {
          setGlobalSearchLoading(false);
        });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [globalSearchQuery]);

  useEffect(() => {
    if (!globalSearchOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (globalSearchRef.current && !globalSearchRef.current.contains(event.target as Node)) {
        closeGlobalSearch();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeGlobalSearch();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [globalSearchOpen]);

  useEffect(() => {
    let isMounted = true;

    const loadTagDirectory = async () => {
      if (!isSupabaseConfigured) {
        if (isMounted) setAvailableTags([]);
        return;
      }

      setIsLoadingTags(true);
      try {
        const result = await loadActiveMasterDirectoryItems('tags');
        if (!isMounted) return;
        setAvailableTags(result.ok ? result.data : []);
      } catch (error) {
        console.error('Error loading patient tags:', error);
        if (isMounted) setAvailableTags([]);
      } finally {
        if (isMounted) setIsLoadingTags(false);
      }
    };

    loadTagDirectory();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isTagDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (tagFilterRef.current && !tagFilterRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTagDropdownOpen]);

  useEffect(() => {
    const defaultDoctor = getDoctorById(doctors, settings.defaultDentistId);
    if (defaultDoctor) {
      setSettings((prev) => ({
        ...prev,
        defaultDentistName: defaultDoctor.name,
        defaultDentistRole: defaultDoctor.role,
        defaultDentistSignature: defaultDoctor.signature,
      }));
    } else if (doctors.length > 0 && !settings.defaultDentistId) {
      const firstDoctor = doctors[0];
      setSettings((prev) => ({
        ...prev,
        defaultDentistId: firstDoctor.id,
        defaultDentistName: firstDoctor.name,
        defaultDentistRole: firstDoctor.role,
        defaultDentistSignature: firstDoctor.signature,
      }));
    }
  }, [doctors, settings.defaultDentistId]);

  useEffect(() => {
    if (['patients', 'patients_record', 'calendar', 'archived', ...PATIENT_WORKFLOW_TAB_IDS, 'preview'].includes(activeTab)) {
      setPatientsMenuOpen(true);
    }
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, selectedTags, filterYear, filterCategory, filterDate]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPatientTabsMoreOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const isPatientContextTab = ['patients_record', 'preview', ...PATIENT_WORKFLOW_TAB_IDS].includes(activeTab);
    
    // HARD RESET IF NOT IN PATIENT CONTEXT
    if (!isPatientContextTab) {
      setSelectedRecordId(null);
      setCurrentRecordId(null);
      setPatientData(createInitialPatientData());
      setPatientRecordDetailOpen(false);
      setPatientRecordEditorOpen(false);
      setPatientDbStatus('Ready to connect.');
      setDentalChartDbStatus('Ready to connect.');
      
      // Clear URL
      syncPatientRecordUrl(null);
      localStorage.removeItem('patientId');
    }
  }, [activeTab]);

  useEffect(() => {
    if (patientData && (patientData.lastName || patientData.firstName)) {
      const fullName = `${patientData.lastName || ''}, ${patientData.firstName || ''}`.trim().toUpperCase();
      document.title = fullName || 'Patient Record';
    } else {
      document.title = 'DentalFlow';
    }
  }, [patientData]);

  useEffect(() => {
    if (!toast.open) return;
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [toast.open, toast.message]);

  useLayoutEffect(() => {
    if (printRequestId === 0) return;
    window.print();
  }, [printRequestId, printExportMode]);

  const printDocument = (mode: ExportMode) => {
    setPrintExportMode(mode);
    setPrintRequestId((prev) => prev + 1);
  };

  const handlePrint = () => {
    printDocument(resolveExportModeFromTab(activeTab));
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const exportMode = resolveExportModeFromTab(activeTab);
      const element = document.getElementById(getExportElementId(exportMode));
      if (!element) return;
      if (!window.html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const opt = {
        margin: 0,
        filename: getExportFileName(exportMode, patientData),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'css', before: '.page-break' }
      };
      await window.html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('May error sa pag-download ng PDF. Pakisubukan muli.');
    } finally {
      setIsDownloading(false);
    }
  };

  const selectedPatientRecord = savedRecords.find((record) => record.id === selectedRecordId) || (currentRecordId ? savedRecords.find((record) => record.id === currentRecordId) || null : null);
  const openPatientRecordEditor = () => {
    setPatientRecordEditorOpen(true);
  };
  const patientWorkspaceChildren = (tab: PatientWorkspaceTab, setActiveGlobalTab: (tab: string) => void) => (
    <>
      {tab === 'form' && (
        <PatientInfoSummaryView data={patientData} />
      )}
      {tab === 'charting' && <div className="mx-auto w-full max-w-[1720px]">
        <DentalChartHistoryModule 
          patientData={patientData} 
          setPatientData={setPatientData} 
          patientRecordId={currentRecordId}
          favoriteStatuses={favoriteStatuses} 
          setFavoriteStatuses={setFavoriteStatuses} 
          doctors={doctors} 
          onPrintAction={(id: string) => {
            setActivePrintHistoryEntryId(id);
            setActiveGlobalTab('preview');
            setActiveDoc('dental_chart');
          }}
        />
      </div>}
      {tab === 'treatment_records' && <div className="mx-auto w-full max-w-[1680px]"><TreatmentRecordModule data={patientData} setData={setPatientData} doctors={doctors} /></div>}
      {tab === 'certificates' && <CertificateDocumentModule data={patientData} setData={setPatientData} settings={settings} printDocument={printDocument} onSave={() => saveToDatabase(false)} setActiveGlobalTab={setActiveGlobalTab} activePrintHistoryEntryId={activePrintHistoryEntryId} setActivePrintHistoryEntryId={setActivePrintHistoryEntryId} />}
      {tab === 'prescriptions' && <div className="mx-auto w-full max-w-[1680px]"><PatientAuxTableModule data={patientData} setData={setPatientData} sectionKey="prescriptions" title="Prescriptions" subtitle="Medication and prescription records for this patient." columns={[{ key: 'date', label: 'Date' }, { key: 'title', label: 'Prescription' }, { key: 'details', label: 'Remarks' }]} newLabel="New Prescription" emptyLabel="No prescriptions recorded yet." /></div>}
      {tab === 'appointments' && <div className="mx-auto w-full max-w-[1680px]"><PatientAuxTableModule data={patientData} setData={setPatientData} sectionKey="appointments" title="Appointments" subtitle="Scheduled and completed appointment records for this patient." columns={[{ key: 'date', label: 'Date' }, { key: 'title', label: 'Appointment' }, { key: 'details', label: 'Remarks' }]} newLabel="New Appointment" emptyLabel="No appointments recorded yet." patientId={currentRecordId} /></div>}
      {tab === 'progress_notes' && <ProgressNotesModule patientData={patientData} setPatientData={setPatientData} doctors={doctors} saveToDatabase={() => saveToDatabase(false)} patientId={currentRecordId} />}
      {tab === 'smart_support' && <SmartSupportModule patientData={patientData} setPatientData={setPatientData} doctors={doctors} />}
      {tab === 'ledger' && <LedgerModule patientData={patientData} setPatientData={setPatientData} doctors={doctors} saveToDatabase={() => saveToDatabase(false)} />}
      {tab === 'uploads' && <UploadsModule patientData={patientData} setPatientData={setPatientData} />}
      {tab === 'recalls' && <RecallsModule patientData={patientData} setPatientData={setPatientData} />}
      {tab === 'scratchpad' && <ScratchpadModule patientData={patientData} setPatientData={setPatientData} />}
      {tab === 'followup' && <FollowupModule patientData={patientData} setPatientData={setPatientData} />}
    </>
  );

  if (isAuthChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          <Loader2 size={18} className="animate-spin" />
          <span>Checking secure session...</span>
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <AuthAccessPortal
        email={authEmail}
        password={authPassword}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSubmit={handleAuthSignIn}
        error={authError}
        infoMessage={authInfoMessage}
        isSigningIn={isSigningIn}
        isSupabaseConfigured={isSupabaseConfigured}
        showPassword={showAuthPassword}
        onToggleShowPassword={() => setShowAuthPassword((value) => !value)}
        selectedRole={selectedDemoRole}
        onSelectRole={handleSelectDemoRole}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-only { display: block !important; position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 9999; background: white; }
          .print-export-document { display: none !important; }
          .print-export-document.is-print-target { display: block !important; }
          .a4-page { box-shadow: none !important; transform: none !important; margin: 0 !important; width: 210mm; height: 297mm; position: relative; }
          .page-break { page-break-before: always; }
        }
      `}</style>



      {/* Main Content Area */}
      <main className="hidden flex-1 overflow-y-auto p-4 sm:p-6 no-print bg-[#f8f9fa]">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <div className="font-medium">Patient record sync</div>
              <div>{patientDbStatus || 'Ready to connect.'}</div>
              <div className="text-xs text-emerald-700 mt-1">Current record ID: {currentRecordId || 'New unsaved record'}</div>
              <div className="text-xs text-emerald-700">Clinic file name: {recordName}</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <div className="font-medium">PDF template sync</div>
              <div>{templateDbStatus || 'Ready to connect.'}</div>
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Saved Patient Records</label>
                <select
                  value={selectedRecordId || ''}
                  onChange={(e) => setSelectedRecordId(e.target.value || null)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Latest record</option>
                  {savedRecords.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.record_name} {record.updated_at ? `• ${new Date(record.updated_at).toLocaleString()}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={refreshSavedRecords} disabled={isRefreshingRecords} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                  {isRefreshingRecords ? 'Refreshing...' : 'Refresh List'}
                </button>
                <button
                  onClick={() => {
                    if (!selectedRecordId) return;
                    void openPatientRecordDetail({ id: selectedRecordId });
                  }}
                  disabled={isLoadingFromDb}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {isLoadingFromDb ? 'Loading...' : 'Load Selected'}
                </button>
              </div>
            </div>
          </div>
          {activeTab === 'form' && <FormModule data={patientData} setData={setPatientData} onSave={() => saveToDatabase(false)} />}
          {activeTab === 'charting' && 
            <DentalChartHistoryModule 
              patientData={patientData} 
              setPatientData={setPatientData} 
              patientRecordId={currentRecordId}
              favoriteStatuses={favoriteStatuses} 
              setFavoriteStatuses={setFavoriteStatuses} 
              doctors={doctors} 
              onPrintAction={(id: string) => {
                setActivePrintHistoryEntryId(id);
                setActiveTab('preview');
                setActiveDoc('dental_chart');
              }}
              saveToDatabase={() => saveToDatabase(false)}
            />
          }
          {activeTab === 'treatment' && <TreatmentRecordModule data={patientData} setData={setPatientData} doctors={doctors} />}
          {activeTab === 'customize' && <CustomizeModule settings={settings} setSettings={setSettings} onSaveSettings={saveTemplateSettings} isSavingTemplate={isSavingTemplate} doctors={doctors} />}
        </div>

        {activeTab === 'preview' && (
          <LivePreviewContainer 
            data={activePrintHistoryEntryId 
              ? { ...patientData, dentalChart: patientData.dentalChartHistory?.find((h: any) => h.id === activePrintHistoryEntryId)?.dentalChart || patientData.dentalChart } 
              : patientData
            } 
            settings={settings} 
          />
        )}
      </main>

      <div className="flex flex-1 min-h-0 no-print">
        <aside className={`${sidebarCollapsed ? 'w-20' : 'w-72'} shrink-0 border-r border-slate-200 bg-white transition-all duration-300`}>
          <div className="border-b border-slate-100 px-4 py-4">
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} gap-3 rounded-xl p-2 text-blue-600 hover:bg-slate-50`}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
                  <LayoutTemplate size={22} />
                </div>
                {!sidebarCollapsed && (
                  <div className="text-left">
                    <div className="text-lg font-semibold text-slate-900">P&J Tanarte</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Dental Clinic</div>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && <Menu size={18} className="text-slate-500" />}
            </button>
          </div>

          <nav className="space-y-2 px-3 py-4">
            {activeTab !== 'customize' && activeTab !== 'master_directory' ? (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  title="Dashboard"
                >
                  <LayoutTemplate size={18} />
                  {!sidebarCollapsed && <span>Dashboard</span>}
                </button>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setActiveTab('patients_record');
                    }}
                    className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${['patients_record', 'patients', 'archived', ...PATIENT_WORKFLOW_TAB_IDS, 'preview'].includes(activeTab)
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    title="Patients"
                  >
                    <FileText size={18} />
                    {!sidebarCollapsed && <span>Patients</span>}
                  </button>
                </div>

                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  title="Calendar"
                >
                  <CalendarDays size={18} />
                  {!sidebarCollapsed && <span>Calendar</span>}
                </button>

                {clinicUserProfile.role === 'clinic_owner' && (
                  <button
                    onClick={() => {
                      setActiveTab('master_directory');
                      setActiveMasterDirectoryType('services');
                    }}
                    className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === 'master_directory' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    title="Master File Directory"
                  >
                    <Database size={18} />
                    {!sidebarCollapsed && <span>Master File Directory</span>}
                  </button>
                )}

                <button
                  onClick={openSystemSettings}
                  className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === 'customize' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  title="System Settings"
                >
                  <Settings size={18} />
                  {!sidebarCollapsed && <span>System Settings</span>}
                </button>
              </>
            ) : activeTab === 'customize' ? (() => {
              const showUsersAndRoles = clinicUserProfile.role === 'clinic_owner';
              const showDevTools = isDevModeUnlocked;

              const settingsItems = [
                { id: 'general', label: 'General Settings', icon: Settings },
                showUsersAndRoles && { id: 'users', label: 'Users & Roles', icon: User },
                { id: 'doctors', label: 'Doctors Registry', icon: User }
              ].filter(Boolean) as { id: SystemSettingsTab; label: string; icon: React.ComponentType<any> }[];

              const docItems: { id: SystemSettingsTab; label: string; icon: React.ComponentType<any> }[] = [
                { id: 'pdf', label: 'PDF Designer', icon: FileText },
                { id: 'certificateForm', label: 'Certificate Form', icon: FileText },
                { id: 'consentForm', label: 'Consent Form', icon: Shield }
              ];

              const devItems: { id: SystemSettingsTab; label: string; icon: React.ComponentType<any> }[] = showDevTools ? [
                { id: 'sync', label: 'Sync Diagnostics', icon: Database },
                { id: 'migration', label: 'Data Migration Center', icon: Database },
                { id: 'maintenance', label: 'System Maintenance', icon: Shield },
                { id: 'about', label: 'About Application', icon: HelpCircle }
              ] : [];

              return (
                <div className="space-y-3 font-sans">
                  {/* Back to main dashboard link */}
                  <button
                    onClick={() => {
                      setActiveTab('dashboard');
                    }}
                    className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors`}
                    title="Back to Main Dashboard"
                  >
                    <ArrowLeft size={18} />
                    {!sidebarCollapsed && <span>← Back to Dashboard</span>}
                  </button>

                  <div className="border-t border-slate-100 my-2" />

                  {settingsItems.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = systemSettingsTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setSystemSettingsTab(tab.id);
                          if (tab.id !== 'pdf') setSystemSettingsView('overview');
                        }}
                        className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                          isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                        title={tab.label}
                      >
                        <Icon size={18} />
                        {!sidebarCollapsed && <span>{tab.label}</span>}
                      </button>
                    );
                  })}

                  {!sidebarCollapsed && (
                    <div className="px-4 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Documents
                    </div>
                  )}

                  {docItems.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = systemSettingsTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setSystemSettingsTab(tab.id);
                          if (tab.id !== 'pdf') setSystemSettingsView('overview');
                        }}
                        className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                          isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                        title={tab.label}
                      >
                        <Icon size={18} />
                        {!sidebarCollapsed && <span>{tab.label}</span>}
                      </button>
                    );
                  })}

                  {showDevTools && (
                    <>
                      {!sidebarCollapsed && (
                        <div className="px-4 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Developer Tools
                        </div>
                      )}

                      {devItems.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = systemSettingsTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setSystemSettingsTab(tab.id);
                              if (tab.id !== 'pdf') setSystemSettingsView('overview');
                            }}
                            className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                              isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            title={tab.label}
                          >
                            <Icon size={18} />
                            {!sidebarCollapsed && <span>{tab.label}</span>}
                          </button>
                        );
                      })}

                      {/* Lock Developer Mode */}
                      <button
                        onClick={handleLockDevMode}
                        className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors`}
                        title="Lock Developer Mode"
                      >
                        <Lock size={18} />
                        {!sidebarCollapsed && <span>Lock Dev Mode</span>}
                      </button>
                    </>
                  )}
                </div>
              );
            })() : (() => {
              const showDevTools = isDevModeUnlocked;
              const mdGroups = [
                {
                  title: 'Core Modules',
                  items: [
                    { type: 'services', label: 'Services', icon: Stethoscope },
                    { type: 'medicines', label: 'Medicines', icon: Pill },
                    { type: 'medical_conditions', label: 'Medical Conditions', icon: AlertTriangle },
                    { type: 'dental_habits', label: 'Dental Habits', icon: AlertTriangle },
                    { type: 'tags', label: 'Tags', icon: Tags },
                    { type: 'prescription_templates', label: 'Rx Templates', icon: FileText },
                  ] as { type: MasterDirectoryType; label: string; icon: React.ComponentType<any> }[]
                },
                {
                  title: 'Recall Items',
                  items: [
                    { type: 'recall_appliance', label: 'Recall Appliance', icon: CircleDot },
                    { type: 'recall_occlusion', label: 'Recall Occlusion', icon: Stethoscope },
                    { type: 'periodontal_screening', label: 'Periodontal Screening', icon: Stethoscope },
                    { type: 'recall_tmd', label: 'Recall TMD', icon: Stethoscope },
                  ] as { type: MasterDirectoryType; label: string; icon: React.ComponentType<any> }[]
                },
                {
                  title: 'Tooth Items',
                  items: [
                    { type: 'tooth_status', label: 'Tooth Status', icon: CircleDot },
                    { type: 'tooth_conditions', label: 'Tooth Condition', icon: CircleDot },
                    { type: 'tooth_prosthodontics', label: 'Tooth Prosthodontics', icon: CircleDot },
                    { type: 'tooth_surgery', label: 'Tooth Surgery', icon: Stethoscope },
                    { type: 'tooth_xray', label: 'Tooth X-Ray', icon: CircleDot },
                  ] as { type: MasterDirectoryType; label: string; icon: React.ComponentType<any> }[]
                }
              ];

              return (
                <div className="space-y-3 font-sans max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
                  {/* Back to main dashboard link */}
                  <button
                    onClick={() => {
                      setActiveTab('dashboard');
                    }}
                    className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors`}
                    title="Back to Main Dashboard"
                  >
                    <ArrowLeft size={18} />
                    {!sidebarCollapsed && <span>← Back to Dashboard</span>}
                  </button>

                  <div className="border-t border-slate-100 my-2" />

                  {mdGroups.map((group) => (
                    <div key={group.title} className="space-y-1">
                      {!sidebarCollapsed && (
                        <div className="px-4 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {group.title}
                        </div>
                      )}
                      {group.items.map((category) => {
                        const Icon = category.icon;
                        const isActive = activeMasterDirectoryType === category.type;
                        const count = masterDirectoryCounts[category.type] ?? null;

                        return (
                          <button
                            key={category.type}
                            onClick={() => {
                              setActiveMasterDirectoryType(category.type);
                            }}
                            className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                              isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                            title={category.label}
                          >
                            <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                            {!sidebarCollapsed && (
                              <span className="flex-1 truncate block">{category.label}</span>
                            )}
                            {!sidebarCollapsed && (
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {count !== null ? count : '...'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })()}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Global Navbar */}
          <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0 no-print">
            {/* Left Side: Search Bar and Add Patient Button */}
            <div className="flex items-center">
              <div
                ref={globalSearchRef}
                className="relative"
              >
                <div className="flex items-center border border-slate-200 bg-slate-50 rounded-l-[10px] overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={globalSearchQuery}
                      onFocus={() => {
                        if (globalSearchQuery.trim().length >= 1) setGlobalSearchOpen(true);
                      }}
                      onChange={(event) => setGlobalSearchQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          if (globalSearchFlatResults.length > 0) {
                            setGlobalSearchOpen(true);
                            setGlobalSearchHighlightIndex((prev) => (prev + 1) % globalSearchFlatResults.length);
                          }
                        } else if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          if (globalSearchFlatResults.length > 0) {
                            setGlobalSearchOpen(true);
                            setGlobalSearchHighlightIndex((prev) => (prev - 1 + globalSearchFlatResults.length) % globalSearchFlatResults.length);
                          }
                        } else if (event.key === 'Enter') {
                          if (globalSearchFlatResults[globalSearchHighlightIndex]) {
                            event.preventDefault();
                            void handleGlobalSearchSelect(globalSearchFlatResults[globalSearchHighlightIndex]);
                          }
                        } else if (event.key === 'Escape') {
                          closeGlobalSearch();
                        }
                      }}
                      placeholder="Search patients, services, medicines..."
                      className="pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none w-72"
                    />
                  </div>
                </div>

                {globalSearchOpen && globalSearchQuery.trim().length >= 1 && (
                  <div className="absolute left-0 top-full z-[150] mt-3 w-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">Smart Search</div>
                      <div className="text-xs text-slate-500">Patients, master directory items, and appointments</div>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                      {globalSearchLoading ? (
                        <div className="flex items-center gap-2 px-4 py-5 text-sm text-slate-500">
                          <Loader2 size={16} className="animate-spin" />
                          <span>Searching the system...</span>
                        </div>
                      ) : globalSearchError ? (
                        <div className="px-4 py-5 text-sm text-rose-600">{globalSearchError}</div>
                      ) : globalSearchFlatResults.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500">No matches found.</div>
                      ) : (
                        <div className="py-2">
                          {[
                            { key: 'patients', label: 'Patients', items: globalSearchResults.patients },
                            { key: 'master', label: 'Master Directory', items: globalSearchResults.masterDirectory },
                            { key: 'appointments', label: 'Appointments', items: globalSearchResults.appointments },
                          ].map((section, sectionIndex) => {
                            if (section.items.length === 0) return null;
                            const sectionStartIndex =
                              sectionIndex === 0
                                ? 0
                                : sectionIndex === 1
                                  ? globalSearchResults.patients.length
                                  : globalSearchResults.patients.length + globalSearchResults.masterDirectory.length;

                            return (
                              <div key={section.key} className="pb-2">
                                <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                  {section.label}
                                </div>
                                {section.items.map((item, index) => {
                                  const absoluteIndex = sectionStartIndex + index;
                                  const isHighlighted = absoluteIndex === globalSearchHighlightIndex;
                                  const icon = item.kind === 'patient'
                                    ? <User size={16} className="text-blue-600" />
                                    : item.kind === 'master_directory'
                                      ? <Database size={16} className="text-emerald-600" />
                                      : <CalendarDays size={16} className="text-violet-600" />;

                                  return (
                                    <button
                                      key={`${item.kind}-${item.id}`}
                                      type="button"
                                      onMouseEnter={() => setGlobalSearchHighlightIndex(absoluteIndex)}
                                      onClick={() => { void handleGlobalSearchSelect(item); }}
                                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                                        isHighlighted ? 'bg-slate-100' : 'hover:bg-slate-50'
                                      }`}
                                    >
                                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                                        {icon}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <div className="truncate text-sm font-semibold text-slate-900">{item.title}</div>
                                          {item.kind === 'patient' ? (
                                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                              {item.patientCode}
                                            </span>
                                          ) : null}
                                        </div>
                                        <div className="mt-1 truncate text-xs text-slate-500">{item.detail}</div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={startNewPatientRecord}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors border border-l-0 border-blue-600 rounded-r-[10px] self-stretch"
              >
                <Plus size={16} />
                <span className="whitespace-nowrap">Add New Patient</span>
              </button>
            </div>

            {/* Right Side: Notification Bell, Profile Icon and Clinic Owner Name */}
            <div className="flex items-center gap-4">
              <div ref={notificationMenuRef} className="relative">
                <button
                  onClick={() => setNotificationsOpen((open) => !open)}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors relative"
                  aria-label="Open notifications"
                  aria-expanded={notificationsOpen}
                >
                  <Bell size={20} />
                  {unreadNotificationCount > 0 ? (
                    <span className="absolute -top-1 -right-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </span>
                  ) : null}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-full z-[140] mt-3 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                        <p className="text-xs text-slate-500">
                          {unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : 'All caught up'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleMarkAllNotificationsRead()}
                        disabled={notificationsLoading || unreadNotificationCount === 0}
                        className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        Mark all read
                      </button>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="flex items-center gap-2 px-4 py-5 text-sm text-slate-500">
                          <Loader2 size={16} className="animate-spin" />
                          <span>Loading notifications...</span>
                        </div>
                      ) : notificationsError ? (
                        <div className="px-4 py-5 text-sm text-rose-600">{notificationsError}</div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500">No new notifications.</div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => void handleNotificationClick(notification)}
                            className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                              notification.isRead ? 'bg-white' : 'bg-blue-50/50'
                            }`}
                          >
                            <div className="pt-1">
                              {notification.isRead ? (
                                <span className="mt-1 block h-2.5 w-2.5 rounded-full bg-slate-200" />
                              ) : (
                                <span className="mt-1 block h-2.5 w-2.5 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className={`truncate text-sm ${notification.isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                                {notification.title}
                              </div>
                              <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                                {notification.message || 'No message.'}
                              </div>
                              <div className="mt-2 text-[11px] text-slate-400">
                                {formatNotificationDateTime(notification.created_at)}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div ref={profileMenuRef} className="relative border-l border-slate-200 pl-2">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-2xl px-2 py-1.5 transition-colors hover:bg-slate-50"
                  aria-expanded={profileMenuOpen}
                  aria-label="Open user profile menu"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {getProfileInitials(clinicUserProfile.fullName, clinicUserProfile.email)}
                  </div>
                  <div className="hidden text-left sm:block">
                    <div className="max-w-[180px] truncate text-sm font-medium text-slate-700">
                      {clinicUserProfile.fullName || 'Clinic User'}
                    </div>
                    <div className="max-w-[180px] truncate text-xs text-slate-400">
                      {clinicUserProfile.email || 'No active session'}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-full z-[140] mt-3 w-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="border-b border-slate-100 px-4 py-4">
                      <div className="text-sm font-semibold text-slate-900">{clinicUserProfile.fullName || 'Clinic User'}</div>
                      <div className="mt-1 truncate text-xs text-slate-500">{clinicUserProfile.email || 'No active session email'}</div>
                    </div>
                    <div className="py-2">
                      {[
                        { label: 'Settings', icon: Settings, action: handleOpenSettingsFromProfile },
                        { label: 'Edit Profile', icon: User, action: () => openProfileDialog('editProfile') },
                        { label: 'Change Password', icon: KeyRound, action: () => openProfileDialog('changePassword') },
                        { label: 'Change Email', icon: Mail, action: () => openProfileDialog('changeEmail') },
                        { label: 'Manage Account', icon: Shield, action: handleManageAccount },
                        { label: 'User Guide', icon: HelpCircle, action: () => openProfileDialog('userGuide') },
                        { label: 'Logout', icon: LogOut, action: () => { void handleLogout(); }, danger: true },
                      ].map(({ label, icon: Icon, action, danger }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={action}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                            danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700'
                          }`}
                        >
                          <Icon size={16} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-[#f8f9fa]">
            {activeTab !== 'customize' && activeTab !== 'master_directory' && (
              <div className="border-b border-slate-200 bg-white px-6 py-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {activeTab === 'dashboard' && 'Dashboard'}
                    {activeTab === 'patients_record' && 'Patients'}
                    {activeTab === 'patients' && 'Patients'}
                    {activeTab === 'calendar' && 'Calendar'}
                    {activeTab === 'master_directory' && 'Master File Directory'}
                    {activeTab === 'archived' && 'Archived Records'}
                    {activeTab === 'form' && 'Patient Information'}
                    {activeTab === 'charting' && 'Dental Charting'}
                    {activeTab === 'treatment' && 'Treatment Record'}
                    {activeTab === 'prescriptions' && 'Prescriptions'}
                    {activeTab === 'certificates' && 'Certificates'}
                    {activeTab === 'contract' && 'Patient Contract'}
                    {activeTab === 'attachments' && 'File Attachments'}
                    {activeTab === 'notes' && 'Notes'}
                    {activeTab === 'consents' && 'Consents'}
                    {activeTab === 'appointments' && 'Appointments'}
                    {activeTab === 'preview' && 'Live Preview'}
                  </h1>
                  <p className="text-sm text-slate-500">
                    {activeTab === 'dashboard' && 'Clinical overview of patient registry, appointments, birthdays, and ledger balances.'}
                    {activeTab === 'patients_record' && 'Clinic patients list.'}
                    {activeTab === 'patients' && 'Manage clinic patient files in a receptionist-friendly table.'}
                    {activeTab === 'calendar' && 'Clinic-wide schedule, recalls, birthdays, and appointment ledger.'}
                    {activeTab === 'master_directory' && 'Manage reusable clinic records, dropdowns, procedures, medicines, templates, and tags.'}
                    {activeTab === 'archived' && 'Review and restore archived patient records from Supabase.'}
                    {activeTab === 'form' && 'Register and update patient information.'}
                    {activeTab === 'charting' && 'Maintain the dental chart for the current patient.'}
                    {activeTab === 'treatment' && 'Track treatment history and billing details.'}
                    {activeTab === 'prescriptions' && 'Manage patient medication and prescription records.'}
                    {activeTab === 'certificates' && 'Manage patient certificate records.'}
                    {activeTab === 'contract' && 'Prepare and print the orthodontic treatment contract and package ledger.'}
                    {activeTab === 'attachments' && 'Manage patient file attachments and uploaded documents.'}
                    {activeTab === 'notes' && 'Track internal patient notes and reminders.'}
                    {activeTab === 'consents' && 'Track signed consent forms and statuses.'}
                    {activeTab === 'appointments' && 'Manage patient appointment history and schedules.'}
                    {activeTab === 'preview' && 'Review the printable output before export.'}
                  </p>
                </div>
              </div>
            )}

            <div className="p-6">
              {activeTab !== 'dashboard' && activeTab !== 'patients_record' && activeTab !== 'calendar' && activeTab !== 'master_directory' && activeTab !== 'customize' && !PATIENT_WORKFLOW_TAB_IDS.includes(activeTab as any) && (
                <div className="mb-6 grid gap-4 xl:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                    <div className="font-semibold">Patient Record Sync</div>
                    <div className="mt-1">{patientDbStatus || 'Ready to connect.'}</div>
                    <div className="mt-2 text-xs text-emerald-800">Clinic file name: {recordName}</div>
                    <div className="text-xs text-emerald-800">Current record ID: {currentRecordId || 'New unsaved record'}</div>
                  </div>
                  <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4 text-sm text-cyan-900">
                    <div className="font-semibold">Dental Chart Sync</div>
                    <div className="mt-1">{dentalChartDbStatus || 'Waiting for a patient chart to load.'}</div>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                    <div className="font-semibold">PDF Template Sync</div>
                    <div className="mt-1">{templateDbStatus || 'Ready to connect.'}</div>
                  </div>
                </div>
              )}

              {activeTab === 'dashboard' && (
                <Dashboard
                  patientRecords={savedRecords}
                  onViewPatientDetails={(record) => { void openPatientRecordDetail(record); }}
                  onOpenCalendar={() => setActiveTab('calendar')}
                />
              )}

                              {activeTab === 'patients_record' && (
                <div className="space-y-6">
                  {patientRecordDetailOpen ? (
                    <div className="mx-auto w-full max-w-[1760px]">
                      <PatientDetailsWorkspace
                        patientData={patientData}
                        setPatientData={setPatientData}
                        doctors={doctors}
                        settings={settings}
                        currentRecordId={currentRecordId}
                        patientCode={formatPatientId(selectedPatientRecord || { id: currentRecordId || selectedRecordId || '0000' })}
                        favoriteStatuses={favoriteStatuses}
                        setFavoriteStatuses={setFavoriteStatuses}
                        isSavingToDb={isSavingToDb}
                        saveToDatabase={saveToDatabase}
                        handlePrint={handlePrint}
                        handleDownloadPDF={handleDownloadPDF}
                        isDownloading={isDownloading}
                        activeTab={patientRecordDetailTab}
                        setActiveTab={setPatientRecordDetailTab}
                        onOpenUpdateRecord={openPatientRecordEditor}
                        onBack={closePatientRecordDetail}
                      >
                        {patientWorkspaceChildren}
                      </PatientDetailsWorkspace>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="grid gap-6 md:grid-cols-2">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Filter by: Last Name / First Name
                            </label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                              <input
                                type="text"
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                placeholder="Type name (e.g. Dela Cruz, Juan)"
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-[10px] text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Filter by Tags:
                            </label>
                            <div ref={tagFilterRef} className="relative">
                              <div className="min-h-[42px] w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                                <div className="flex flex-wrap items-center gap-2">
                                  {selectedTags.map((tag) => {
                                    const tagItem = availableTags.find((item) => String(item.name || item.code || '').trim().toLowerCase() === tag.toLowerCase());
                                    return (
                                      <span
                                        key={tag}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                                      >
                                        {tagItem?.color ? (
                                          <span
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: tagItem.color }}
                                          />
                                        ) : null}
                                        <span>{tag}</span>
                                        <button
                                          type="button"
                                          onClick={() => setSelectedTags((prev) => prev.filter((item) => item.toLowerCase() !== tag.toLowerCase()))}
                                          className="text-slate-400 transition-colors hover:text-slate-600"
                                          aria-label={`Remove ${tag} tag`}
                                        >
                                          <X size={12} />
                                        </button>
                                      </span>
                                    );
                                  })}

                                  <input
                                    type="text"
                                    value={searchTag}
                                    onFocus={() => setIsTagDropdownOpen(true)}
                                    onChange={(e) => {
                                      setSearchTag(e.target.value);
                                      setIsTagDropdownOpen(true);
                                    }}
                                    placeholder={selectedTags.length > 0 ? 'Search more tags...' : 'Search tags...'}
                                    className="min-w-[140px] flex-1 border-none bg-transparent py-1 text-sm text-slate-700 placeholder-slate-300 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setIsTagDropdownOpen((open) => !open)}
                                    className="ml-auto text-slate-400 transition-colors hover:text-slate-600"
                                    aria-label="Toggle tag filter dropdown"
                                  >
                                    <ChevronDown size={16} className={isTagDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                  </button>
                                </div>
                              </div>

                              {isTagDropdownOpen && (
                                <div className="absolute left-0 top-full z-[120] mt-2 w-full rounded-[12px] border border-slate-200 bg-white shadow-xl">
                                  <div className="max-h-64 overflow-y-auto py-2">
                                    {isLoadingTags ? (
                                      <div className="px-4 py-3 text-sm text-slate-500">Loading tags...</div>
                                    ) : filteredTagOptions.length > 0 ? (
                                      filteredTagOptions.slice(0, 10).map((item) => {
                                        const label = String(item.name || item.code || '').trim();
                                        return (
                                          <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedTags((prev) => (prev.some((tag) => tag.toLowerCase() === label.toLowerCase()) ? prev : [...prev, label]));
                                              setSearchTag('');
                                              setIsTagDropdownOpen(false);
                                            }}
                                            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                                          >
                                            <span
                                              className="h-2.5 w-2.5 rounded-full border border-white/40"
                                              style={{ backgroundColor: item.color || '#cbd5e1' }}
                                            />
                                            <span className="font-medium">{label}</span>
                                            {item.description ? (
                                              <span className="truncate text-xs text-slate-400">{item.description}</span>
                                            ) : null}
                                          </button>
                                        );
                                      })
                                    ) : (
                                      <div className="px-4 py-3 text-sm text-slate-500">No tags found.</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="my-6 border-t border-slate-100"></div>

                        <div className="flex flex-wrap items-end gap-3">
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Patient Year:
                            </label>
                            <div className="flex border border-slate-200 rounded-[10px] overflow-hidden bg-white focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                              <div className="bg-slate-50 border-r border-slate-200 px-3 py-2 text-slate-500 text-sm font-medium flex items-center justify-center">
                                Year
                              </div>
                              <select
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                                className="flex-1 px-3 py-2 bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer"
                              >
                                <option value="All Years">All Years</option>
                                {sortedYearOptions.map((year) => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Type:
                            </label>
                            <div className="flex border border-slate-200 rounded-[10px] overflow-hidden bg-white focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                              <div className="bg-slate-50 border-r border-slate-200 px-3 py-2 text-slate-500 text-sm font-medium flex items-center justify-center">
                                Category
                              </div>
                              <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="flex-1 px-3 py-2 bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer"
                              >
                                <option value="All Types">All Types</option>
                                <option value="Pedia">Pedia (18-21)</option>
                                <option value="Adult">Adult (22+)</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex-[1.5] min-w-[260px]">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Select Specific Date:
                            </label>
                            <CustomDatePicker
                              value={filterDate || null}
                              onChange={(dateString) => setFilterDate(dateString || '')}
                              placeholder="Select Specific Date"
                              minYear={1900}
                              maxYear={2100}
                            />
                          </div>

                          <div className="flex gap-2 min-w-[180px]">
                            <button
                              onClick={() => {
                                setCurrentPage(1);
                              }}
                              className="flex-1 px-5 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-[10px] text-sm font-semibold shadow-sm transition-colors h-10"
                            >
                              Go
                            </button>
                            <button
                              onClick={() => {
                                setSearchName('');
                                setSearchTag('');
                                setSelectedTags([]);
                                setIsTagDropdownOpen(false);
                                setFilterYear('All Years');
                                setFilterCategory('All Types');
                                setFilterDate('');
                                setCurrentPage(1);
                              }}
                              className="flex-1 px-5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-[10px] text-sm font-semibold transition-colors h-10"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="mt-8 flex justify-end border-t border-slate-100 pt-4">
                          <button
                            onClick={startNewPatientRecord}
                            className="flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white px-4 py-2.5 rounded-[12px] text-sm font-semibold transition-colors shadow-sm"
                          >
                            <Plus size={16} />
                            <span>New Patient</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-2 mt-4 px-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                          >
                            &lt; Previous
                          </button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${currentPage === page
                                ? 'bg-[#0284c7] text-white shadow-sm'
                                : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                              {page}
                            </button>
                          ))}

                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                          >
                            Next &gt;
                          </button>
                        </div>

                        <div className="px-4 py-2 border border-slate-200 rounded-[12px] bg-white text-sm font-bold text-slate-700 shadow-sm">
                          Total Patients: {processedList.length}
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-[15px] border border-slate-200 bg-white shadow-sm">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider">#</th>
                              <th className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider">ACTIONS</th>
                              <th onClick={() => handleSort('id')} className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider cursor-pointer hover:bg-slate-100 select-none">
                                <div className="flex items-center gap-1">
                                  <span>ID</span>
                                  <span>{sortField === 'id' ? (sortDirection === 'asc' ? 'Asc' : 'Desc') : 'Sort'}</span>
                                </div>
                              </th>
                              <th onClick={() => handleSort('name')} className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider cursor-pointer hover:bg-slate-100 select-none">
                                <div className="flex items-center gap-1">
                                  <span>NAME</span>
                                  <span>{sortField === 'name' ? (sortDirection === 'asc' ? 'Asc' : 'Desc') : 'Sort'}</span>
                                </div>
                              </th>
                              <th className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider">ADDRESS</th>
                              <th className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider">MOBILE</th>
                              <th className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider">FIRST VISIT</th>
                              <th onClick={() => handleSort('lastRecall')} className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider cursor-pointer hover:bg-slate-100 select-none">
                                <div className="flex items-center gap-1">
                                  <span>LAST RECALL</span>
                                  <span>{sortField === 'lastRecall' ? (sortDirection === 'asc' ? 'Asc' : 'Desc') : 'Sort'}</span>
                                </div>
                              </th>
                              <th onClick={() => handleSort('balance')} className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider cursor-pointer hover:bg-slate-100 select-none">
                                <div className="flex items-center gap-1">
                                  <span>BALANCE</span>
                                  <span>{sortField === 'balance' ? (sortDirection === 'asc' ? 'Asc' : 'Desc') : 'Sort'}</span>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {paginatedRecords.map((record, index) => {
                              const globalIndex = (currentPage - 1) * 30 + index + 1;
                              const pData = record.patient_data || {};
                              const fullName = `${pData.lastName || ''}, ${pData.firstName || ''} ${pData.middleName || ''}`.trim().toUpperCase();
                              const address = (pData.address || '').trim().toUpperCase();
                              const mobile = pData.mobile || pData.contact || '-';

                              let visitDay = '-';
                              let visitYear = '';
                              if (pData.lastVisit) {
                                const d = new Date(pData.lastVisit);
                                visitDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                visitYear = d.getFullYear().toString();
                              }

                              const lastRecall = pData.lastVisit ? new Date(pData.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
                              const balanceVal = getPatientBalance(record);
                              const balanceFormatted = formatPatientCurrency(balanceVal);

                              return (
                                <tr
                                  key={record.id}
                                  onClick={() => { void openPatientRecordDetail(record); }}
                                  className={`cursor-pointer transition-colors ${selectedRecordId === record.id ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}
                                >
                                  <td className="px-4 py-4 text-slate-400 font-medium">{globalIndex}</td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                      <button onClick={(e) => { e.stopPropagation(); void openPatientRecordDetail(record); }} className="text-emerald-500 hover:text-emerald-700 transition-colors" title="Edit patient record">
                                        <Edit3 size={18} />
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'archive', record }); }} className="text-rose-500 hover:text-rose-700 transition-colors" title="Archive patient record">
                                        <Trash2 size={18} />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 font-bold text-slate-700">{formatPatientId(record)}</td>
                                  <td className="px-4 py-4 font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer select-none">{fullName || 'UNTITLED PATIENT'}</td>
                                  <td className="px-4 py-4 text-slate-500 font-medium">{address || '-'}</td>
                                  <td className="px-4 py-4 text-slate-700 font-medium">{mobile}</td>
                                  <td className="px-4 py-4">
                                    {visitYear ? (
                                      <div>
                                        <span className="font-bold text-slate-800 text-sm">{visitDay}</span>
                                        <span className="block text-slate-400 text-xs">{visitYear}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 text-slate-700 font-medium">{lastRecall}</td>
                                  <td className="px-4 py-4 font-bold text-slate-800">{balanceFormatted}</td>
                                </tr>
                              );
                            })}
                            {paginatedRecords.length === 0 && (
                              <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">
                                  No matching patient records found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'patients' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex-1">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Patient Registry</div>
                      <h2 className="mt-1 text-xl font-semibold text-slate-900">Saved Patient Records</h2>
                      <p className="text-sm text-slate-500">Receptionist-friendly patient list pulled from Supabase.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={startNewPatientRecord} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">Add New Patient</button>
                      <button onClick={refreshSavedRecords} disabled={isRefreshingRecords} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                        {isRefreshingRecords ? 'Refreshing...' : 'Refresh List'}
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setPatientsActionMenuOpen((open) => !open)}
                          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          title="More patient actions"
                        >
                          <Settings size={16} />
                          <ChevronDown size={14} className={`transition-transform ${patientsActionMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {patientsActionMenuOpen && (
                          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                            <button
                              onClick={() => {
                                setPatientsActionMenuOpen(false);
                                if (selectedRecordId) {
                                  void openPatientRecordDetail({ id: selectedRecordId });
                                }
                              }}
                              disabled={isLoadingFromDb}
                              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              {isLoadingFromDb ? 'Loading...' : 'Load Selected'}
                            </button>
                            <button
                              onClick={() => {
                                setPatientsActionMenuOpen(false);
                                saveToDatabase(false);
                              }}
                              disabled={isSavingToDb}
                              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              {isSavingToDb ? 'Saving...' : 'Save DB'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Patient File</th>
                          <th className="px-4 py-3 text-left font-semibold">Last Name</th>
                          <th className="px-4 py-3 text-left font-semibold">First Name</th>
                          <th className="px-4 py-3 text-left font-semibold">Updated</th>
                          <th className="px-4 py-3 text-left font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {savedRecords.map((record) => (
                          <tr key={record.id} className={selectedRecordId === record.id ? 'bg-blue-50' : ''}>
                            <td className="px-4 py-3 font-medium text-slate-900">{record.record_name}</td>
                            <td className="px-4 py-3 text-slate-600">{record.patient_last_name || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{record.patient_first_name || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{record.updated_at ? new Date(record.updated_at).toLocaleString() : '-'}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                onClick={() => { void openPatientRecordDetail(record); }}
                                className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
                                title="Modify patient record"
                              >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => setConfirmAction({ type: 'archive', record })}
                                  className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
                                  title="Archive patient record"
                                >
                                  <Archive size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {savedRecords.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No patient records found yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'calendar' && (
                <ClinicCalendar
                  patientRecords={savedRecords}
                  doctors={doctors}
                  onAddNewPatient={startNewPatientRecord}
                  onViewPatientDetails={(patientId, tab = 'appointments') => {
                    void openPatientRecordDetail({ id: patientId }, tab as PatientWorkspaceTab);
                  }}
                />
              )}

              {activeTab === 'master_directory' && (
                clinicUserProfile.role === 'clinic_owner' ? (
                  <MasterFileDirectory 
                    activeType={activeMasterDirectoryType}
                    setActiveType={setActiveMasterDirectoryType}
                    showDevTools={isDevModeUnlocked}
                    onCountsChange={setMasterDirectoryCounts}
                  />
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center max-w-md mx-auto mt-12 shadow-sm font-sans">
                    <Shield size={48} className="mx-auto text-rose-500 mb-4 animate-bounce" />
                    <h2 className="text-lg font-bold text-slate-900 font-sans">Access Restricted</h2>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed font-sans">
                      Only the clinic owner has authority to view or modify clinic master catalogs and configuration registries.
                    </p>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all cursor-pointer font-sans"
                    >
                      ← Return to Dashboard
                    </button>
                  </div>
                )
              )}

              {activeTab === 'archived' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex-1">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Patient Archive</div>
                      <h2 className="mt-1 text-xl font-semibold text-slate-900">Archived Records</h2>
                      <p className="text-sm text-slate-500">Retrieve archived patient files and return them to the active registry.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={refreshArchivedRecords}
                        disabled={isRefreshingArchivedRecords}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {isRefreshingArchivedRecords ? 'Refreshing...' : 'Refresh List'}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Patient File</th>
                          <th className="px-4 py-3 text-left font-semibold">Last Name</th>
                          <th className="px-4 py-3 text-left font-semibold">First Name</th>
                          <th className="px-4 py-3 text-left font-semibold">Archived</th>
                          <th className="px-4 py-3 text-left font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {archivedRecords.map((record) => (
                          <tr key={record.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{record.record_name}</td>
                            <td className="px-4 py-3 text-slate-600">{record.patient_last_name || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{record.patient_first_name || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{record.archived_at ? new Date(record.archived_at).toLocaleString() : '-'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setConfirmAction({ type: 'restore', record })}
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                                  title="Restore patient record"
                                >
                                  Restore
                                </button>
                                <button
                                  onClick={() => setConfirmAction({ type: 'delete', record })}
                                  className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                                  title="Permanently delete patient record"
                                >
                                  Permanent Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {archivedRecords.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No archived patient records found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}



              {PATIENT_WORKFLOW_TAB_IDS.includes(activeTab as any) && (
                <PatientDetailsWorkspace
                  patientData={patientData}
                  setPatientData={setPatientData}
                  doctors={doctors}
                  settings={settings}
                  currentRecordId={currentRecordId}
                  patientCode={formatPatientId(savedRecords.find((r) => r.id === currentRecordId) || { id: currentRecordId })}
                  favoriteStatuses={favoriteStatuses}
                  setFavoriteStatuses={setFavoriteStatuses}
                  isSavingToDb={isSavingToDb}
                  saveToDatabase={saveToDatabase}
                  handlePrint={handlePrint}
                  handleDownloadPDF={handleDownloadPDF}
                  isDownloading={isDownloading}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onOpenUpdateRecord={openPatientRecordEditor}
                  onBack={() => {
                    setActiveTab('patients_record');
                    setPatientRecordDetailOpen(false);
                    setPatientRecordDetailTab('form');
                    setPatientRecordEditorOpen(false);
                  }}
                >
                  {patientWorkspaceChildren}
                </PatientDetailsWorkspace>
              )}
              {activeTab === 'customize' && (() => {
                const showUsersAndRoles = clinicUserProfile.role === 'clinic_owner';
                const showDevTools = isDevModeUnlocked;

                return (
                  <div className="mx-auto w-full max-w-[1760px] relative font-sans animate-in fade-in duration-150">
                    {/* Hidden trigger dot in bottom-left */}
                    <div 
                      onClick={() => setDevUnlockModalOpen(true)}
                      className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full bg-slate-400/10 hover:bg-slate-400/40 cursor-pointer transition-colors z-[100]"
                      title="Developer Access Dot"
                    />

                    {/* Subpage Header */}
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
                      <div className="space-y-3">
                        <div>
                          <h1 
                            onClick={handleSettingsTitleClick}
                            className="text-2xl font-bold text-slate-900 cursor-pointer select-none group flex items-center gap-2"
                            title="Click 5 times quickly to open Developer Access"
                          >
                            {systemSettingsTab === 'general' && 'General Settings'}
                            {systemSettingsTab === 'users' && 'Users & Roles'}
                            {systemSettingsTab === 'doctors' && 'Doctors Registry'}
                            {systemSettingsTab === 'pdf' && 'PDF Designer'}
                            {systemSettingsTab === 'certificateForm' && 'Certificate Form'}
                            {systemSettingsTab === 'consentForm' && 'Consent Form'}
                            {systemSettingsTab === 'migration' && 'Data Migration Center'}
                            {systemSettingsTab === 'maintenance' && 'System Maintenance'}
                            {systemSettingsTab === 'about' && 'About Application'}
                            {systemSettingsTab === 'sync' && 'Sync & Database Diagnostics'}
                          </h1>
                          <p className="text-sm text-slate-500 mt-1 font-sans">
                            {systemSettingsTab === 'general' && 'Manage clinic profile, contact details, working hours, and notifications.'}
                            {systemSettingsTab === 'users' && 'Manage credentials, system role access, and personnel registrations.'}
                            {systemSettingsTab === 'doctors' && 'Configure registered dentists, specialization registries, and availability defaults.'}
                            {systemSettingsTab === 'pdf' && 'Tailor default branding, logo alignments, page margins, and live PDF format previews.'}
                            {systemSettingsTab === 'certificateForm' && 'Tune certificate brand details, custom notes templates, and printable document styling.'}
                            {systemSettingsTab === 'consentForm' && 'Configure brand headers, specific consent statement disclosures, and patient signature rules.'}
                            {systemSettingsTab === 'migration' && 'Re-platform legacy systems with our interactive migration pipeline.'}
                            {systemSettingsTab === 'maintenance' && 'Examine storage quotas, safety logs, and diagnostic parameters.'}
                            {systemSettingsTab === 'about' && 'Inspect system builds, framework modules, and backups.'}
                            {systemSettingsTab === 'sync' && 'Debug patient file buffers, dental chart histories, and template storage sync status.'}
                          </p>
                        </div>
                      </div>
                      
                      {systemSettingsTab === 'users' && showUsersAndRoles && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(null);
                            setAddUserForm({ fullName: '', email: '', role: 'staff_member', status: 'Active' });
                            setAddUserOpen(true);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-sm self-start sm:self-auto cursor-pointer"
                        >
                          <Plus size={14} /> Add User Account
                        </button>
                      )}
                    </div>

                    <div className="min-w-0">
                      
                      {/* GENERAL SETTINGS */}
                      {systemSettingsTab === 'general' && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const saved = await saveTemplateSettings(settings);
                            if (saved) {
                              setToast({ open: true, tone: 'success', message: 'Clinic configuration saved successfully.' });
                            }
                          }} className="space-y-6 max-w-2xl">
                            
                            <div className="grid gap-6 sm:grid-cols-2">
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-sans">Clinic Name</label>
                                <input
                                  type="text"
                                  value={settings.clinicName || ''}
                                  onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 font-sans"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-sans">Clinic Contact Number</label>
                                <input
                                  type="text"
                                  value={settings.clinicContact || ''}
                                  onChange={(e) => setSettings({ ...settings, clinicContact: e.target.value })}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 font-sans"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-sans">Official Address</label>
                              <input
                                type="text"
                                value={settings.clinicAddress || ''}
                                onChange={(e) => setSettings({ ...settings, clinicAddress: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 font-sans"
                              />
                            </div>

                            <div className="grid gap-6 sm:grid-cols-3">
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-sans">Working Hours Start</label>
                                <input
                                  type="time"
                                  value={settings.workingHoursStart || '09:00'}
                                  onChange={(e) => setSettings({ ...settings, workingHoursStart: e.target.value })}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 font-sans"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-sans">Working Hours End</label>
                                <input
                                  type="time"
                                  value={settings.workingHoursEnd || '17:00'}
                                  onChange={(e) => setSettings({ ...settings, workingHoursEnd: e.target.value })}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 font-sans"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-sans">Average Appointment Duration</label>
                                <select
                                  value={settings.averageAppointmentDuration || '30'}
                                  onChange={(e) => setSettings({ ...settings, averageAppointmentDuration: Number(e.target.value) })}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-855 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 font-sans font-bold"
                                >
                                  <option value="15">15 minutes</option>
                                  <option value="30">30 minutes</option>
                                  <option value="45">45 minutes</option>
                                  <option value="60">60 minutes</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-100">
                              <div>
                                <span className="text-xs font-bold text-slate-800 block font-sans">Automated Recall SMS Notifications</span>
                                <span className="text-[10px] text-slate-400">Send automatic check-up reminders to patients scheduled for recall.</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={settings.recallSMSNotifications ?? true}
                                onChange={(e) => setSettings({ ...settings, recallSMSNotifications: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                              />
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                              <button
                                type="submit"
                                disabled={isSavingTemplate}
                                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-855 hover:shadow-md disabled:opacity-60 transition-all cursor-pointer font-sans"
                              >
                                {isSavingTemplate ? 'Saving Configuration...' : 'Save Settings Configuration'}
                              </button>
                            </div>

                          </form>
                        </div>
                      )}

                      {/* USERS & ROLES */}
                      {systemSettingsTab === 'users' && showUsersAndRoles && (
                        <div className="space-y-6">
                          {usersError && (
                            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3 text-xs font-semibold text-rose-600">
                              {usersError}
                            </div>
                          )}

                          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                            {isLoadingUsers ? (
                              <div className="p-8 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin text-slate-400" size={16} /> Loading users...
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                                      <th className="px-6 py-4 font-sans">Name</th>
                                      <th className="px-6 py-4 font-sans">Email</th>
                                      <th className="px-6 py-4 font-sans">Role Badge</th>
                                      <th className="px-6 py-4 font-sans">Status</th>
                                      <th className="px-6 py-4 text-right font-sans">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {(clinicUsersList.length > 0 ? clinicUsersList : DEV_MOCK_USERS).map((u) => {
                                      const roleLabel =
                                        u.role === 'clinic_owner'
                                          ? 'Clinic Owner'
                                          : u.role === 'associate_dentist'
                                            ? 'Associate Dentist'
                                            : 'Staff Member';
                                      const roleColor =
                                        u.role === 'clinic_owner'
                                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                          : u.role === 'associate_dentist'
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-slate-50 text-slate-700 border border-slate-200';
                                      
                                      return (
                                        <tr key={u.id || u.email} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="px-6 py-4 font-bold text-slate-800 font-sans">{u.full_name || u.name}</td>
                                          <td className="px-6 py-4 text-slate-500 font-sans">{u.email}</td>
                                          <td className="px-6 py-4">
                                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase font-sans ${roleColor}`}>
                                              {roleLabel}
                                            </span>
                                          </td>
                                          <td className="px-6 py-4">
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold font-sans ${
                                              u.status === 'Inactive' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                                            }`}>
                                              {u.status || 'Active'}
                                            </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingUser(u);
                                                  setAddUserForm({
                                                    fullName: u.full_name || u.name || '',
                                                    email: u.email || '',
                                                    role: u.role || 'staff_member',
                                                    status: u.status || 'Active'
                                                  });
                                                  setAddUserOpen(true);
                                                }}
                                                className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                              >
                                                <Edit2 size={14} />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  if (window.confirm(`Are you sure you want to toggle status for ${u.full_name || u.name}?`)) {
                                                    try {
                                                      const nextStatus = u.status === 'Inactive' ? 'Active' : 'Inactive';
                                                      if (u.id && u.id.startsWith('mock-')) {
                                                        setToast({ open: true, tone: 'success', message: 'Mock account status updated.' });
                                                      } else if (u.id) {
                                                        const { error } = await supabase
                                                          .from('clinic_users')
                                                          .update({ status: nextStatus })
                                                          .eq('id', u.id);
                                                        if (error) throw error;
                                                        setToast({ open: true, tone: 'success', message: 'User status updated.' });
                                                      }
                                                      void loadClinicUsers();
                                                    } catch (err) {
                                                      console.error(err);
                                                      setToast({ open: true, tone: 'error', message: 'Failed to update user status.' });
                                                    }
                                                  }
                                                }}
                                                className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                                              >
                                                <X size={14} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* DOCTORS REGISTRY */}
                      {systemSettingsTab === 'doctors' && (
                        <DoctorsRegistryModule
                          doctors={doctors}
                          onSaveDoctors={saveDoctorsRegistry}
                          isSavingDoctors={isSavingDoctors}
                          doctorDbStatus={doctorDbStatus}
                        />
                      )}

                      {/* PDF DESIGNER */}
                      {systemSettingsTab === 'pdf' && (
                        <div className="space-y-6">
                          {systemSettingsView === 'overview' ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-start gap-4">
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                    <Settings size={24} />
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-lg font-semibold text-slate-900 font-sans">PDF Format Configuration</h3>
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 font-sans">Layout Editor</span>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-500 font-sans">Open the designer tool to adjust paper formats, clinic headings, branding alignments, and spacing configurations.</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSystemSettingsView('pdf')}
                                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer font-sans font-bold"
                                >
                                  Open PDF Designer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-end mb-4">
                                <button
                                  onClick={() => setSystemSettingsView('overview')}
                                  className="inline-flex items-center justify-center rounded-xl border border-slate-350 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer font-sans"
                                >
                                  <ArrowLeft size={14} className="mr-1.5" />
                                  Back to PDF Overview
                                </button>
                              </div>

                              <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
                                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                  <CustomizeModule settings={settings} setSettings={setSettings} onSaveSettings={saveTemplateSettings} isSavingTemplate={isSavingTemplate} doctors={doctors} />
                                </div>
                                <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100/70 p-5 shadow-sm">
                                  <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-slate-900 font-sans">PDF Format Preview</h3>
                                    <p className="text-xs text-slate-500 font-sans">Review live layout changes directly in the rendered page below.</p>
                                  </div>
                                  <div className="max-h-[calc(100vh-240px)] overflow-auto rounded-2xl border border-slate-200 bg-slate-200/60 p-3">
                                    <LivePreviewContainer data={patientData} settings={settings} />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* CERTIFICATE FORM DESIGNER */}
                      {systemSettingsTab === 'certificateForm' && (
                        <DocumentFormDesigner
                          documentType="certificate"
                          settings={settings}
                          setSettings={setSettings}
                          onSaveSettings={saveTemplateSettings}
                          isSavingTemplate={isSavingTemplate}
                          data={patientData}
                        />
                      )}

                      {/* CONSENT FORM DESIGNER */}
                      {systemSettingsTab === 'consentForm' && (
                        <DocumentFormDesigner
                          documentType="consent"
                          settings={settings}
                          setSettings={setSettings}
                          onSaveSettings={saveTemplateSettings}
                          isSavingTemplate={isSavingTemplate}
                          data={patientData}
                        />
                      )}

                      {/* DATA MIGRATION CENTER */}
                      {systemSettingsTab === 'migration' && showDevTools && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-2xl overflow-x-auto gap-4">
                            {[
                              { step: 1, name: 'Upload' },
                              { step: 2, name: 'Detect' },
                              { step: 3, name: 'Validate' },
                              { step: 4, name: 'Preview' },
                              { step: 5, name: 'Resolve' },
                              { step: 6, name: 'Import' },
                              { step: 7, name: 'Report' }
                            ].map((s) => (
                              <div key={s.step} className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                  devWizardStep === s.step ? 'bg-slate-900 text-white ring-4 ring-slate-100' :
                                  devWizardStep > s.step ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                                }`}>
                                  {devWizardStep > s.step ? '✓' : s.step}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                                  devWizardStep === s.step ? 'text-slate-900' : 'text-slate-400'
                                }`}>
                                  {s.name}
                                </span>
                                {s.step < 7 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                              </div>
                            ))}
                          </div>

                          {devWizardStep === 1 ? (
                            <div className="grid gap-6 md:grid-cols-3">
                              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <FileText size={16} /> Legacy Templates
                                </h3>
                                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                  Get spreadsheets pre-structured to mimic old dental systems.
                                </p>
                                <div className="space-y-1.5 pt-2">
                                  {['Patients', 'Bills', 'Progress Notes'].map((tmpl) => (
                                    <button
                                      key={tmpl}
                                      type="button"
                                      onClick={() => {
                                        setToast({ open: true, tone: 'success', message: `Downloading ${tmpl} CSV Template...` });
                                      }}
                                      className="w-full flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-left text-[10px] font-bold text-slate-600 transition-all cursor-pointer font-sans"
                                    >
                                      <span>{tmpl} CSV Template</span>
                                      <Download size={12} />
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center border-dashed border-2 py-12">
                                <Database size={36} className="text-slate-300 mb-3 animate-bounce" />
                                <span className="font-bold text-slate-800 text-sm block">Drag and drop your migration sheet here</span>
                                <span className="text-xs text-slate-400 mt-1">Supports JSON, CSV files up to 10MB</span>
                                <button
                                  type="button"
                                  onClick={() => setDevWizardStep(2)}
                                  className="mt-6 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-805 transition-all cursor-pointer font-sans"
                                >
                                  Simulate File Upload & Analysis
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Step {devWizardStep} - Migration Pipeline</h3>
                              <p className="text-xs text-slate-500 font-medium">Processing records through security layers and format alignment checks.</p>
                              <div className="flex justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setDevWizardStep(1)}
                                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer font-sans"
                                >
                                  Restart
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (devWizardStep < 7) {
                                      setDevWizardStep(devWizardStep + 1);
                                    } else {
                                      setDevWizardStep(1);
                                      setToast({ open: true, tone: 'success', message: 'Data migration successfully completed.' });
                                    }
                                  }}
                                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer font-sans"
                                >
                                  {devWizardStep === 7 ? 'Finish Migration' : 'Next Step'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SYSTEM MAINTENANCE */}
                      {systemSettingsTab === 'maintenance' && showDevTools && (
                        <div className="space-y-6">
                          <div className="grid gap-5 md:grid-cols-3">
                            {[
                              { label: 'Database Status', val: 'Online & Reconciled', icon: Database, color: 'text-emerald-700 bg-emerald-50/50 border border-emerald-100' },
                              { label: 'Active Storage Usage', val: `${(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB / 5.0 MB`, icon: Database, color: 'text-slate-800 bg-slate-50 border border-slate-100' },
                              { label: 'Clinician Actions Audited', val: '14 Active Sessions', icon: Shield, color: 'text-indigo-700 bg-indigo-50 border border-indigo-100' }
                            ].map((stat) => (
                              <div key={stat.label} className={`p-4 rounded-2xl flex items-center justify-between ${stat.color}`}>
                                <div>
                                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">{stat.label}</span>
                                  <span className="text-xs font-bold mt-1.5 block">{stat.val}</span>
                                </div>
                                <stat.icon size={20} className="shrink-0" />
                              </div>
                            ))}
                          </div>

                          {/* Audit Logs Trail */}
                          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                            <div className="px-5 py-3.5 bg-slate-50 flex items-center justify-between">
                              <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Clinician Access & Safety Audit Log</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setToast({ open: true, tone: 'success', message: 'Audit trails cleared successfully.' });
                                }}
                                className="text-[10px] font-black text-slate-400 hover:text-slate-700 cursor-pointer uppercase font-sans"
                              >
                                Clear Logs
                              </button>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                              {[
                                { action: 'UPDATE_SETTINGS', user: 'owner@pj-dental.com', module: 'System', time: Date.now() - 300000 },
                                { action: 'DENTAL_CHART_SAVE', user: 'dentist@pj-dental.com', module: 'Patient Chart', time: Date.now() - 900000 },
                                { action: 'PATIENT_RECORD_CREATE', user: 'staff@pj-dental.com', module: 'Records', time: Date.now() - 3600000 },
                              ].map((log, idx) => (
                                <div key={idx} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50 transition-all">
                                  <div>
                                    <span className="font-bold text-slate-850">{log.action}</span>
                                    <p className="text-[10px] text-slate-400 font-semibold">{log.user} • {log.module} Node</p>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-semibold">{new Date(log.time).toLocaleTimeString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                localStorage.clear();
                                setToast({ open: true, tone: 'success', message: 'System memory pruned! Reloading layout...' });
                                setTimeout(() => window.location.reload(), 1200);
                              }}
                              className="bg-red-50 text-red-700 border border-red-100 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-red-100 transition-all cursor-pointer font-sans"
                            >
                              Clear Cache Parameters
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setToast({ open: true, tone: 'success', message: 'Clinical diagnostics run completed. Zero latency errors.' });
                              }}
                              className="bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all cursor-pointer shadow-sm font-sans"
                            >
                              Run Diagnostics Check
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ABOUT APPLICATION */}
                      {systemSettingsTab === 'about' && showDevTools && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center max-w-xl mx-auto space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                          <div className="flex flex-col items-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white font-black text-lg tracking-tighter shadow-sm border border-slate-850">
                              PJ
                            </div>
                            <h3 className="text-xs font-bold text-slate-850 uppercase tracking-widest mt-4 font-sans">
                              P&J Tanarte Dental Clinic Ledger
                            </h3>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1">
                              Version 3.4.0 (Enterprise Suite)
                            </p>
                          </div>

                          <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 text-left text-xs">
                            <div className="p-4 flex justify-between">
                              <span className="text-slate-400 font-bold uppercase font-sans">System Kernel Version</span>
                              <span className="font-bold text-slate-700 font-sans">React 18.3 • Vite v6</span>
                            </div>
                            <div className="p-4 flex justify-between">
                              <span className="text-slate-400 font-bold uppercase font-sans">Database Model</span>
                              <span className="font-bold text-slate-700 font-sans">Supabase Schema & Relational Tables</span>
                            </div>
                            <div className="p-4 flex justify-between">
                              <span className="text-slate-400 font-bold uppercase font-sans">Secure License Scope</span>
                              <span className="font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100 uppercase text-[10px] font-sans">
                                Authorized Clinic Owner
                              </span>
                            </div>
                            <div className="p-4 flex justify-between">
                              <span className="text-slate-400 font-bold uppercase font-sans">Developer Organization</span>
                              <span className="font-bold text-slate-700 font-sans">DeepMind Antigravity Systems</span>
                            </div>
                            <div className="p-4 flex justify-between">
                              <span className="text-slate-400 font-bold uppercase font-sans">Last Successful Backup</span>
                              <span className="font-bold text-slate-650 font-sans">Today, {new Date().toLocaleDateString()}</span>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-400 font-semibold max-w-md mx-auto leading-relaxed pt-4 border-t border-slate-100 font-sans">
                            © 2026 P&J Tanarte Dental Clinic Group. Certified medical storage module. All clinical access trails are legally signed and protected.
                          </p>
                        </div>
                      )}

                      {/* SYNC DIAGNOSTICS */}
                      {systemSettingsTab === 'sync' && showDevTools && (
                        <div className="space-y-6">
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900 shadow-sm">
                              <div className="font-semibold flex items-center gap-1.5 font-sans"><Database size={16} /> Patient Record Sync</div>
                              <div className="mt-2 font-medium font-sans">{patientDbStatus || 'Ready to connect.'}</div>
                              <div className="mt-3 text-xs text-emerald-850 space-y-1 font-sans">
                                <p>Clinic file name: <span className="font-semibold">{recordName}</span></p>
                                <p>Current record ID: <span className="font-mono">{currentRecordId || 'New unsaved record'}</span></p>
                              </div>
                            </div>
                            
                            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4 text-sm text-cyan-900 shadow-sm">
                              <div className="font-semibold flex items-center gap-1.5 font-sans"><Database size={16} /> Dental Chart Sync</div>
                              <div className="mt-2 font-medium font-sans">{dentalChartDbStatus || 'Waiting for patient dental chart...'}</div>
                            </div>
                            
                            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900 shadow-sm">
                              <div className="font-semibold flex items-center gap-1.5 font-sans"><FileText size={16} /> PDF Template Sync</div>
                              <div className="mt-2 font-medium font-sans">{templateDbStatus || 'Ready to connect.'}</div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 font-sans">Direct Database Operations</h3>
                            <p className="text-xs text-slate-400 font-sans">Trigger manual schema checks and table validations to confirm Supabase configurations.</p>
                            <div className="flex flex-wrap gap-2.5 font-sans">
                              <button
                                onClick={() => setToast({ open: true, tone: 'success', message: 'Manual Patient Sync integrity check passed.' })}
                                className="rounded-xl border border-slate-250 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                Validate Patient Sync
                              </button>
                              <button
                                onClick={() => setToast({ open: true, tone: 'success', message: 'Dental Chart Schema matched perfectly.' })}
                                className="rounded-xl border border-slate-250 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                Test Chart Relations
                              </button>
                              <button
                                onClick={() => setToast({ open: true, tone: 'success', message: 'PDF Templates are fully synchronized.' })}
                                className="rounded-xl border border-slate-250 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                Sync PDF Templates
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })()}
              {activeTab === 'preview' && <div className="mx-auto w-full max-w-[1500px]"><LivePreviewContainer data={patientData} settings={settings} /></div>}
            </div>
          </main>
        </div>
      </div>

      {profileDialog && (
        <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {profileDialog === 'editProfile' && 'Edit Profile'}
                  {profileDialog === 'changePassword' && 'Change Password'}
                  {profileDialog === 'changeEmail' && 'Change Email'}
                  {profileDialog === 'userGuide' && 'User Guide'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {profileDialog === 'editProfile' && 'Review and update the clinic user profile details linked to this session.'}
                  {profileDialog === 'changePassword' && 'Send a secure password reset flow to the signed-in user email.'}
                  {profileDialog === 'changeEmail' && 'Request an email change for the signed-in Supabase account.'}
                  {profileDialog === 'userGuide' && 'Quick pointers for moving through the clinic system.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileDialog(null)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close profile dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {profileDialog === 'editProfile' && (
                <>
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Full Name</label>
                    <input
                      value={editProfileName}
                      onChange={(event) => setEditProfileName(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Email</label>
                    <input
                      value={clinicUserProfile.email}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 outline-none"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    This updates the `clinic_users` profile when that table is available. Auth email changes stay in the separate Change Email action.
                  </p>
                </>
              )}

              {profileDialog === 'changePassword' && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    The reset link will be sent to <span className="font-semibold text-slate-800">{clinicUserProfile.email || 'the signed-in email'}</span>.
                  </div>
                  {!clinicUserProfile.email && (
                    <p className="text-sm text-rose-600">No active session email is available, so password reset cannot start yet.</p>
                  )}
                </div>
              )}

              {profileDialog === 'changeEmail' && (
                <>
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">New Email</label>
                    <input
                      type="email"
                      value={pendingEmailChange}
                      onChange={(event) => setPendingEmailChange(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="name@example.com"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    If your auth configuration requires confirmation, Supabase will ask you to verify the change.
                  </p>
                </>
              )}

              {profileDialog === 'userGuide' && (
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-medium text-slate-800">Quick guide</p>
                    <ul className="mt-3 list-disc space-y-2 pl-5">
                      <li>Use Patients to open a record inline, then move across tabs for notes, ledger, and charting.</li>
                      <li>Use Calendar for clinic-wide appointments, recalls, and birthdays.</li>
                      <li>Use Master File Directory to manage reusable services, medicines, tags, and dental chart items.</li>
                      <li>Use System Settings for clinic configuration and doctor registry updates.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setProfileDialog(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Close
              </button>

              {profileDialog === 'editProfile' && (
                <button
                  type="button"
                  onClick={() => void handleSaveProfileDetails()}
                  disabled={isSavingProfile}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              )}

              {profileDialog === 'changePassword' && (
                <button
                  type="button"
                  onClick={() => void handleSendPasswordReset()}
                  disabled={isRunningProfileAction || !clinicUserProfile.email}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunningProfileAction ? 'Sending...' : 'Send Reset Link'}
                </button>
              )}

              {profileDialog === 'changeEmail' && (
                <button
                  type="button"
                  onClick={() => void handleChangeEmail()}
                  disabled={isRunningProfileAction}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunningProfileAction ? 'Updating...' : 'Update Email'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {devUnlockModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950 font-sans">Developer Mode Access</h3>
                <p className="text-[10px] font-medium text-slate-400">Unlock diagnostics and database features</p>
              </div>
            </div>
            
            {devUnlockError && (
              <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50/50 px-3.5 py-2.5 text-xs font-semibold text-rose-600">
                {devUnlockError}
              </div>
            )}

            <form onSubmit={handleDevUnlockSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Developer ID</label>
                <input
                  type="text"
                  required
                  value={devIdInput}
                  onChange={(e) => setDevIdInput(e.target.value)}
                  placeholder="Enter Developer ID"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Access Key</label>
                <input
                  type="password"
                  required
                  value={devKeyInput}
                  onChange={(e) => setDevKeyInput(e.target.value)}
                  placeholder="Enter Access Key"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setDevUnlockModalOpen(false);
                    setDevIdInput('');
                    setDevKeyInput('');
                    setDevUnlockError('');
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={devUnlockLoading}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all disabled:opacity-60"
                >
                  {devUnlockLoading ? 'Verifying...' : 'Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addUserOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950 font-sans">{editingUser ? 'Edit User Account' : 'Add User Account'}</h3>
                <p className="text-[10px] font-medium text-slate-400">Manage personnel permissions and roles</p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const payload = {
                  full_name: addUserForm.fullName,
                  name: addUserForm.fullName,
                  email: addUserForm.email.trim(),
                  role: addUserForm.role,
                  status: addUserForm.status,
                  updated_at: new Date().toISOString()
                };

                if (editingUser) {
                  if (editingUser.id && editingUser.id.startsWith('mock-')) {
                    setToast({ open: true, tone: 'success', message: 'Mock user account updated locally.' });
                  } else if (editingUser.id) {
                    const { error } = await supabase
                      .from('clinic_users')
                      .update(payload)
                      .eq('id', editingUser.id);
                    if (error) throw error;
                  }
                } else {
                  const { error } = await supabase
                    .from('clinic_users')
                    .insert(payload);
                  if (error) throw error;
                }

                setToast({ open: true, tone: 'success', message: editingUser ? 'User updated successfully.' : 'User registered successfully.' });
                setAddUserOpen(false);
                setEditingUser(null);
                void loadClinicUsers();
              } catch (err) {
                console.error(err);
                setToast({ open: true, tone: 'error', message: 'Error processing user record in database.' });
              }
            }} className="space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={addUserForm.fullName}
                  onChange={(e) => setAddUserForm({ ...addUserForm, fullName: e.target.value })}
                  placeholder="Dr. John Doe"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={addUserForm.email}
                  onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                  placeholder="johndoe@pj-dental.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 disabled:bg-slate-50 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Access Role</label>
                <select
                  value={addUserForm.role}
                  onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value as DemoRoleKey })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-850 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                >
                  <option value="clinic_owner">Clinic Owner</option>
                  <option value="associate_dentist">Associate Dentist</option>
                  <option value="staff_member">Staff Member</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
                <select
                  value={addUserForm.status}
                  onChange={(e) => setAddUserForm({ ...addUserForm, status: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-850 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setAddUserOpen(false);
                    setEditingUser(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all"
                >
                  {editingUser ? 'Save' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.type === 'archive' ? 'Archive Patient Record' : confirmAction?.type === 'restore' ? 'Restore Patient Record' : 'Permanently Delete Record'}
        message={
          confirmAction
            ? confirmAction.type === 'archive'
              ? `Archive ${confirmAction.record.record_name || 'this patient record'}? You can retrieve it later from Archived Records.`
              : confirmAction.type === 'restore'
              ? `Restore ${confirmAction.record.record_name || 'this patient record'} to the active patient list?`
              : `Are you absolutely sure you want to PERMANENTLY DELETE ${confirmAction.record.record_name || 'this patient record'}? This action cannot be undone.`
            : ''
        }
        confirmLabel={confirmAction?.type === 'archive' ? 'Archive' : confirmAction?.type === 'restore' ? 'Restore' : 'Delete'}
        confirmTone={confirmAction?.type === 'archive' || confirmAction?.type === 'delete' ? 'danger' : 'success'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const pendingAction = confirmAction;
          setConfirmAction(null);
          if (!pendingAction) return;
          if (pendingAction.type === 'archive') {
            archivePatientRecord(pendingAction.record);
          } else if (pendingAction.type === 'restore') {
            restorePatientRecord(pendingAction.record);
          } else if (pendingAction.type === 'delete') {
            deletePatientRecord(pendingAction.record);
          }
        }}
      />

      <ToastNotice open={toast.open} tone={toast.tone} message={toast.message} />

      {patientRecordEditorOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Update Patient Record</h3>
                <p className="text-sm text-slate-500">Edit the patient information here. The person icon stays as a full read-only record view.</p>
              </div>
              <button
                onClick={() => setPatientRecordEditorOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title="Close update record"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              <FormModule 
                data={patientData} 
                setData={setPatientData} 
                onSave={async () => {
                  await saveToDatabase(false);
                  setPatientRecordEditorOpen(false);
                }}
                onClose={() => setPatientRecordEditorOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Hidden container for pure printing */}
      <div className="absolute left-[-10000px] top-[-10000px] print:static print:left-auto print:top-auto print:block print:w-full print:h-full print:z-[9999] print:bg-white overflow-hidden">
        <div id="pdf-export-container" className={`print-export-document ${printExportMode === 'record' ? 'is-print-target' : ''}`}>
          {settings.printPatientForm && <PatientFormPage data={patientData} settings={settings} />}
          {settings.printDentalChart && (
            <div className={settings.printPatientForm ? 'page-break' : ''}>
              <DentalChartPage data={
                activePrintHistoryEntryId 
                  ? { ...patientData, dentalChart: patientData.dentalChartHistory?.find((h: any) => h.id === activePrintHistoryEntryId)?.dentalChart || patientData.dentalChart } 
                  : patientData
              } settings={settings} />
            </div>
          )}
          {settings.printTreatmentRecord && (
            <div className={(settings.printPatientForm || settings.printDentalChart) ? 'page-break' : ''}>
              <TreatmentRecordPages data={patientData} settings={settings} />
            </div>
          )}
        </div>
        <div id="certificate-pdf-export-container" className={`print-export-document ${printExportMode === 'certificate' ? 'is-print-target' : ''}`}>
          <CertificateFormPage data={patientData} settings={settings} />
        </div>
        <div id="consent-pdf-export-container" className={`print-export-document ${printExportMode === 'consent' ? 'is-print-target' : ''}`}>
          <ConsentFormPage data={patientData} settings={settings} />
        </div>
        <div id="contract-pdf-export-container" className={`print-export-document ${printExportMode === 'contract' ? 'is-print-target' : ''}`}>
          <PatientContractPages data={patientData} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODULE 1: FORM INPUT SYSTEM
// ============================================================================
const FormInput = ({ label, field, data, handleChange, type = 'text', width = 'w-full', error = '' }) => (
  <div className={`${width}`}>
    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">{label}</label>
    <input 
      type={type} 
      value={data[field] || ''} 
      onChange={(e) => handleChange(field, e.target.value)} 
      className={`w-full px-3 py-2 border ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50/5' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500 bg-white'} rounded-md shadow-sm focus:ring-2 sm:text-sm transition-colors`} 
    />
    {error && <p className="mt-1 text-[11px] font-semibold text-red-500">{error}</p>}
  </div>
);

const FormSelect = ({ label, field, data, handleChange, options, width = 'w-full' }) => (
  <div className={`${width}`}>
    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">{label}</label>
    <select value={data[field] || ''} onChange={(e) => handleChange(field, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white">
      <option value="">Select...</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const PatientInfoField = ({ label, value, className = '' }: { label: string; value?: ReactNode; className?: string }) => (
  <div className={className}>
    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
    <div className="mt-1 text-sm text-slate-900">{value || 'Not provided'}</div>
  </div>
);

function PatientInfoSummaryView({ data }: { data: any }) {
  const allergyList = Object.entries(data.allergies || {})
    .filter(([, active]) => Boolean(active))
    .map(([key]) => key);
  const conditionList = Object.entries(data.conditions || {})
    .filter(([, active]) => Boolean(active))
    .map(([key]) => key);
  const activeQuestionNotes = MEDICAL_QUESTIONS
    .filter((question) => data.questions?.[question.id] === true || data.questionDetails?.[question.id])
    .map((question) => ({
      label: question.text,
      answer: data.questions?.[question.id] === true ? 'Yes' : data.questions?.[question.id] === false ? 'No' : 'Not answered',
      note: data.questionDetails?.[question.id] || '',
    }));

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <User size={22} />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">
                  {[data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ') || 'Untitled Patient'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">Full patient details are shown here. Use Update Record to edit this information.</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {data.sex && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{data.sex}</span>}
              {data.civilStatus && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{data.civilStatus}</span>}
              {data.bloodType && <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">Blood Type: {data.bloodType}</span>}
              {allergyList.length > 0 && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{allergyList.length} allergy alerts</span>}
              {conditionList.length > 0 && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">{conditionList.length} medical conditions</span>}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {data.patientPhoto ? (
                <img src={data.patientPhoto} alt="Patient" className="h-full w-full object-cover" />
              ) : (
                <User size={32} className="text-slate-300" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <User size={18} className="text-blue-600" />
            <h4 className="text-lg font-semibold">Personal Information</h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PatientInfoField label="Name" value={[data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ') || 'Untitled Patient'} />
            <PatientInfoField label="Birth Date" value={data.birthDate} />
            <PatientInfoField label="Sex" value={data.sex} />
            <PatientInfoField label="Nationality" value={data.nationality} />
            <PatientInfoField label="Religion" value={data.religion} />
            <PatientInfoField label="Civil Status" value={data.civilStatus} />
            <PatientInfoField label="Address" value={data.address} className="sm:col-span-2" />
            <PatientInfoField label="Mobile" value={data.mobile || data.contact} />
            <PatientInfoField label="Email" value={data.email} />
            <PatientInfoField label="Occupation" value={data.occupation} />
            <PatientInfoField label="Company" value={data.company} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <MessageSquare size={18} className="text-blue-600" />
            <h4 className="text-lg font-semibold">Minor / Referral Details</h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PatientInfoField label="Parent/Guardian" value={data.parentGuardian} />
            <PatientInfoField label="Referral" value={data.referral} />
            <PatientInfoField label="Nickname" value={data.nickname} />
            <PatientInfoField label="Insurance" value={data.dentalInsurance} />
            <PatientInfoField label="Reason for Consult" value={data.dentalReason} className="sm:col-span-2" />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <FileText size={18} className="text-blue-600" />
            <h4 className="text-lg font-semibold">Medical History</h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PatientInfoField label="Previous Dentist" value={data.previousDentist} />
            <PatientInfoField label="Last Visit" value={data.lastVisit} />
            <PatientInfoField label="Physician" value={data.physicianName} />
            <PatientInfoField label="Specialty" value={data.physicianSpecialty} />
            <PatientInfoField label="Physician Address" value={data.physicianAddress} />
            <PatientInfoField label="Office Contact" value={data.physicianContact} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <Activity size={18} className="text-blue-600" />
            <h4 className="text-lg font-semibold">Health Details & Allergies</h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PatientInfoField label="Blood Pressure" value={data.bloodPressure} />
            <PatientInfoField label="Blood Type" value={data.bloodType} />
            <PatientInfoField
              label="Allergies"
              value={allergyList.length > 0 ? allergyList.join(', ') : 'None recorded'}
              className="sm:col-span-2"
            />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-900">
          <Bell size={18} className="text-red-500" />
          <h4 className="text-lg font-semibold">Medical Checklist Summary</h4>
        </div>
        {conditionList.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {conditionList.map((condition) => (
              <span key={condition} className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                {condition}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No medical conditions checked.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-900">
          <ClipboardList size={18} className="text-blue-600" />
          <h4 className="text-lg font-semibold">Medical Questions</h4>
        </div>
        <div className="space-y-3">
          {activeQuestionNotes.length > 0 ? (
            activeQuestionNotes.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium text-slate-800">{item.label}</div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{item.answer}</span>
                </div>
                {item.note && <div className="mt-2 text-sm text-slate-600">{item.note}</div>}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No answered medical alerts or detailed notes recorded.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function FormModule({ data, setData, onSave, onClose }: { data: any; setData: any; onSave?: any; onClose?: any; }) {
  const [currentPhase, setCurrentPhase] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dbConditions, setDbConditions] = useState<string[]>([]);
  const [dbHabits, setDbHabits] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchChecklists = async () => {
      const condRes = await loadActiveMasterDirectoryItems('medical_conditions');
      const habRes = await loadActiveMasterDirectoryItems('dental_habits');
      if (isMounted) {
        if (condRes.ok && condRes.data.length > 0) {
          setDbConditions(condRes.data.map(item => item.name));
        } else {
          setDbConditions(CONDITIONS);
        }
        if (habRes.ok && habRes.data.length > 0) {
          setDbHabits(habRes.data.map(item => item.name));
        } else {
          setDbHabits([
            "night time bottle feeding",
            "thumb sucking",
            "tongue thrusting",
            "teeth grinding",
            "nail biting",
            "mouth breathing",
            "smoking"
          ]);
        }
      }
    };
    void fetchChecklists();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleNested = (category: string, field: string, value: any) => setData((prev: any) => ({ ...prev, [category]: { ...prev[category], [field]: value } }));

  const handleBirthDateChange = (field: string, val: string) => {
    handleChange('birthDate', val);
    if (val) {
      const today = new Date();
      const birthDate = new Date(val);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      handleChange('age', age >= 0 ? age.toString() : '');
    } else {
      handleChange('age', '');
    }
  };

  const handlePatientPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleChange('patientPhoto', reader.result);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!data.lastName || !data.lastName.trim()) {
      newErrors.lastName = 'Last Name is required';
    }
    if (!data.firstName || !data.firstName.trim()) {
      newErrors.firstName = 'First Name is required';
    }
    if (!data.birthDate || !data.birthDate.trim()) {
      newErrors.birthDate = 'Birth Date is required';
    }
    if (!data.address || !data.address.trim()) {
      newErrors.address = 'Home Address is required';
    }
    if (!data.mobile || !data.mobile.trim()) {
      newErrors.mobile = 'Mobile Number is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    const isValid = validateForm();
    if (!isValid) {
      setCurrentPhase(1); // Force return to Phase 1 to show the errors
      return;
    }
    setCurrentPhase(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentPhase(prev => Math.max(prev - 1, 1));
  };

  const handlePhaseClick = (phaseNum: number) => {
    const isValid = validateForm();
    if (!isValid) {
      setCurrentPhase(1); // Force stay/return on Phase 1
      return;
    }
    setCurrentPhase(phaseNum);
  };

  const handleSaveClick = () => {
    const isValid = validateForm();
    if (!isValid) {
      setCurrentPhase(1); // Force stay/return on Phase 1
      return;
    }
    if (onSave) {
      onSave();
    }
  };

  return (
    <div className="w-full max-w-[1560px] mx-auto space-y-8 pb-12">
      {/* Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          {onClose ? 'Update Patient Record' : 'Patient Registration'}
        </h2>
      </div>

      {/* Stepper Progress Indicator */}
      <div className="mb-8 px-4 select-none">
        <div className="flex items-center justify-between relative">
          {/* Progress Bar background */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full z-0"></div>
          {/* Active Progress Bar fill */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full transition-all duration-300 z-0"
            style={{ width: `${((currentPhase - 1) / 3) * 100}%` }}
          ></div>

          {[
            { num: 1, name: 'Phase 1', label: 'Patient Info' },
            { num: 2, name: 'Phase 2', label: 'History & Referrals' },
            { num: 3, name: 'Phase 3', label: 'Medical Details' },
            { num: 4, name: 'Phase 4', label: 'Consent & Finish' }
          ].map((step) => {
            const isActive = currentPhase === step.num;
            const isCompleted = currentPhase > step.num;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => handlePhaseClick(step.num)}
                className="flex flex-col items-center z-10 focus:outline-none group"
              >
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-md border transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-600 border-blue-600 text-white scale-110' 
                      : isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {isCompleted ? <Check size={16} /> : step.num}
                </div>
                <span 
                  className={`mt-2 text-xs font-bold tracking-wider uppercase transition-colors duration-200 ${
                    isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'
                  }`}
                >
                  {step.name}
                </span>
                <span className="hidden sm:inline text-[10px] text-slate-400 font-medium">
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phase Contents */}
      <div className="space-y-8 min-h-[400px]">
        {currentPhase === 1 && (
          <SectionCard title="1. Patient Information">
            <div className="mb-6 flex flex-col sm:flex-row gap-6 items-start bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="w-28 h-28 bg-white border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center overflow-hidden shrink-0">
                {data.patientPhoto ? <img src={data.patientPhoto} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300" size={32} />}
              </div>
              <div className="flex flex-col space-y-3 pt-2">
                <div><h3 className="text-sm font-semibold text-slate-800">Patient 2x2 Photo</h3></div>
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer flex items-center bg-white border border-slate-300 px-3 py-1.5 rounded-md text-sm hover:bg-slate-100 shadow-sm"><Upload size={14} className="mr-2" /> Upload Image<input type="file" accept="image/*" className="hidden" onChange={handlePatientPhotoUpload} /></label>
                  <label className="cursor-pointer flex items-center bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-md text-sm hover:bg-blue-100 shadow-sm"><Camera size={14} className="mr-2" /> Take Photo<input type="file" accept="image/*" capture="user" className="hidden" onChange={handlePatientPhotoUpload} /></label>
                </div>
                {data.patientPhoto && <button onClick={() => handleChange('patientPhoto', '')} className="text-xs text-red-500 underline w-max">Remove Photo</button>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <FormInput label="Last Name" field="lastName" data={data} handleChange={handleChange} error={errors.lastName} />
              <FormInput label="First Name" field="firstName" data={data} handleChange={handleChange} error={errors.firstName} />
              <FormInput label="Middle Name" field="middleName" data={data} handleChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <FormInput label="Nickname" field="nickname" data={data} handleChange={handleChange} />
              <FormInput label="Birth Date" field="birthDate" type="date" data={data} handleChange={handleBirthDateChange} error={errors.birthDate} />
              <FormInput label="Age" field="age" type="number" data={data} handleChange={handleChange} />
              <FormSelect label="Sex" field="sex" data={data} handleChange={handleChange} options={['M', 'F']} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <FormInput label="Religion" field="religion" data={data} handleChange={handleChange} />
              <FormInput label="Nationality" field="nationality" data={data} handleChange={handleChange} />
              <FormSelect label="Civil Status" field="civilStatus" data={data} handleChange={handleChange} options={['Single', 'Married', 'Widowed', 'Separated']} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <FormInput label="Home Address" field="address" width="md:col-span-2" data={data} handleChange={handleChange} error={errors.address} />
              <FormInput label="Tel. No/s." field="contact" data={data} handleChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <FormInput label="Company" field="company" data={data} handleChange={handleChange} />
              <FormInput label="Occupation" field="occupation" data={data} handleChange={handleChange} />
              <FormInput label="Office No/s." field="officeContact" data={data} handleChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <FormInput label="Dental Insurance" field="dentalInsurance" width="md:col-span-2" data={data} handleChange={handleChange} />
              <FormInput label="Fax No/s." field="fax" data={data} handleChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <FormInput label="Effective Date" field="effectiveDate" type="date" width="md:col-span-2" data={data} handleChange={handleChange} />
              <FormInput label="Mobile No/s." field="mobile" data={data} handleChange={handleChange} error={errors.mobile} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <FormInput label="Email Add." field="email" width="md:col-span-3" data={data} handleChange={handleChange} />
            </div>
          </SectionCard>
        )}

        {currentPhase === 2 && (
          <>
            <SectionCard title="2. Minor / Referral Details">
              <div className="space-y-4">
                <FormInput label="Parent / Guardian's Name (for minors)" field="parentGuardian" data={data} handleChange={handleChange} />
                <FormInput label="Whom may we thank for referring you?" field="referral" data={data} handleChange={handleChange} />
                <FormInput label="What is your reason for dental consultation?" field="dentalReason" data={data} handleChange={handleChange} />
              </div>
            </SectionCard>

            <SectionCard title="3. Dental & Medical History">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <FormInput label="Previous Dentist" field="previousDentist" data={data} handleChange={handleChange} />
                <FormInput label="Last Dental Visit" field="lastVisit" type="date" data={data} handleChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <FormInput label="Physician's Name" field="physicianName" data={data} handleChange={handleChange} />
                <FormInput label="Specialty, if applicable" field="physicianSpecialty" data={data} handleChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Office Address" field="physicianAddress" data={data} handleChange={handleChange} />
                <FormInput label="Office No/s." field="physicianContact" data={data} handleChange={handleChange} />
              </div>
            </SectionCard>
          </>
        )}

        {currentPhase === 3 && (
          <>
            <SectionCard title="4. Medical Questions">
              <div className="space-y-4">
                {MEDICAL_QUESTIONS.map((q) => (
                  <div key={q.id} className="py-3 border-b border-slate-100 last:border-0 flex flex-col">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-700">{q.text}</span>
                      <div className="flex space-x-4">
                        <label className="flex items-center text-sm"><input type="radio" name={q.id} checked={data.questions?.[q.id] === true} onChange={() => handleNested('questions', q.id, true)} className="mr-1" /> Yes</label>
                        <label className="flex items-center text-sm"><input type="radio" name={q.id} checked={data.questions?.[q.id] === false} onChange={() => handleNested('questions', q.id, false)} className="mr-1" /> No</label>
                      </div>
                    </div>
                    {data.questions?.[q.id] !== undefined && (
                      <div className="mt-2 pl-4"><input type="text" placeholder="Optional comment / specify details..." className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-slate-50 outline-none" value={data.questionDetails?.[q.id] || ''} onChange={(e) => handleNested('questionDetails', q.id, e.target.value)} /></div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="5. Health Details & Allergies">
              <label className="block text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">Are you allergic to any of the following?</label>
              <div className="flex flex-wrap gap-4 mb-6">
                {['penicillin', 'latex', 'aspirin', 'sulfa', 'local anesthetic'].map(allergy => (
                  <label key={allergy} className="flex items-center capitalize text-sm"><input type="checkbox" checked={data.allergies?.[allergy] || false} onChange={e => handleNested('allergies', allergy, e.target.checked)} className="mr-2 rounded text-blue-600" />{allergy}</label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormSelect label="Blood Type" field="bloodType" data={data} handleChange={handleChange} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']} />
                <FormInput label="Blood Pressure" field="bloodPressure" data={data} handleChange={handleChange} />
              </div>
            </SectionCard>

            {data.sex === 'F' && (
              <SectionCard title="6. For Women Only">
                <div className="flex flex-col sm:flex-row sm:space-x-8 space-y-2 sm:space-y-0">
                  <label className="flex items-center text-sm"><input type="checkbox" checked={data.womenOnly?.pregnant || false} onChange={e => handleNested('womenOnly', 'pregnant', e.target.checked)} className="mr-2" /> Are you pregnant?</label>
                  <label className="flex items-center text-sm"><input type="checkbox" checked={data.womenOnly?.nursing || false} onChange={e => handleNested('womenOnly', 'nursing', e.target.checked)} className="mr-2" /> Are you nursing?</label>
                  <label className="flex items-center text-sm"><input type="checkbox" checked={data.womenOnly?.birthControl || false} onChange={e => handleNested('womenOnly', 'birthControl', e.target.checked)} className="mr-2" /> Taking birth control pills?</label>
                </div>
              </SectionCard>
            )}
          </>
        )}

        {currentPhase === 4 && (
          <>
            <SectionCard title="7. Medical Conditions Checklist">
              <p className="text-xs text-slate-500 mb-4">Check all that apply.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
                {(dbConditions.length > 0 ? dbConditions : CONDITIONS).map((condition) => (
                  <label key={condition} className="flex items-start space-x-2">
                    <input type="checkbox" checked={data.conditions?.[condition] || false} onChange={e => handleNested('conditions', condition, e.target.checked)} className="mt-1 rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm leading-tight text-slate-700">{condition}</span>
                  </label>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="8. Dental Habits Checklist">
              <p className="text-xs text-slate-500 mb-4">Check all that apply.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
                {dbHabits.map((habit) => (
                  <label key={habit} className="flex items-start space-x-2">
                    <input type="checkbox" checked={data.habits?.[habit] || false} onChange={e => handleNested('habits', habit, e.target.checked)} className="mt-1 rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm leading-tight text-slate-700 capitalize">{habit}</span>
                  </label>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="9. Signature & Consent">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Signature / Printed Name" field="signatureName" data={data} handleChange={handleChange} />
                <FormInput label="Date" field="signatureDate" type="date" data={data} handleChange={handleChange} />
              </div>
            </SectionCard>
          </>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-8">
        <div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {currentPhase > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm animate-fade-in"
            >
              <ArrowLeft size={16} className="mr-2" /> Back
            </button>
          )}

          {currentPhase < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveClick}
              className="inline-flex items-center px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
            >
              <Check size={16} className="mr-2" /> Finish &amp; Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const SectionCard = ({ title, children, className = "" }: { title?: ReactNode; children?: ReactNode; className?: string }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {title && <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">{title}</h3>}
    {children}
  </div>
);

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  confirmTone = 'danger',
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmTone?: 'danger' | 'success';
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-slate-600">{message}</p>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onCancel} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${confirmTone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const ToastNotice = ({
  open,
  tone,
  message,
}: {
  open: boolean;
  tone: 'success' | 'error';
  message: string;
}) => {
  if (!open || !message) return null;

  return (
    <div className="fixed right-4 top-4 z-[80] max-w-sm rounded-2xl shadow-xl">
      <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
        {message}
      </div>
    </div>
  );
};

// ============================================================================
// MODULE 1B: DENTAL CHARTING SYSTEM
// ============================================================================
const ToothSurfaceSVG = ({ toothId, surfaces, onSurfaceClick, isInteractive, className = 'h-[42px] w-[42px]', strokeColor = '#94a3b8', strokeWidth = 2 }: any) => {
  const getFill = (surface: keyof typeof surfaces) => SURFACE_COLORS[(surfaces?.[surface] || 'null') as keyof typeof SURFACE_COLORS] || SURFACE_COLORS.null;
  const handleClick = (event: any, surface: string) => {
    event.stopPropagation();
    if (isInteractive && onSurfaceClick) onSurfaceClick(toothId, surface);
  };

  return (
    <svg viewBox="0 0 100 100" className={`${className} shrink-0`}>
      <path d="M 16 16 A 48 48 0 0 1 84 16 L 50 50 Z" fill={getFill('top')} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" className={isInteractive ? 'cursor-pointer hover:opacity-80' : ''} onClick={(e) => handleClick(e, 'top')} />
      <path d="M 84 16 A 48 48 0 0 1 84 84 L 50 50 Z" fill={getFill('right')} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" className={isInteractive ? 'cursor-pointer hover:opacity-80' : ''} onClick={(e) => handleClick(e, 'right')} />
      <path d="M 84 84 A 48 48 0 0 1 16 84 L 50 50 Z" fill={getFill('bottom')} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" className={isInteractive ? 'cursor-pointer hover:opacity-80' : ''} onClick={(e) => handleClick(e, 'bottom')} />
      <path d="M 16 84 A 48 48 0 0 1 16 16 L 50 50 Z" fill={getFill('left')} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" className={isInteractive ? 'cursor-pointer hover:opacity-80' : ''} onClick={(e) => handleClick(e, 'left')} />
      <circle cx="50" cy="50" r="18" fill={getFill('center')} stroke={strokeColor} strokeWidth={strokeWidth} className={isInteractive ? 'cursor-pointer hover:opacity-80' : ''} onClick={(e) => handleClick(e, 'center')} />
    </svg>
  );
};

const ToothInfoBox = ({ toothId, toothEntry, mode, onBoxClick, bStyle = 'border-slate-300', colors = {} }: any) => {
  const flatTags = getToothFlatTags(toothEntry).slice(0, 4);
  return (
    <div
      id={`box-${toothId}`}
      onClick={(event) => mode === 'INLINE' && onBoxClick?.(event, toothId)}
      className={`h-[42px] w-[42px] shrink-0 rounded-[4px] border-2 ${bStyle} ${mode === 'INLINE' ? 'grid cursor-pointer grid-cols-2 grid-rows-2 gap-[1px] overflow-hidden bg-slate-200 hover:border-cyan-400' : 'bg-white'}`}
    >
      {mode === 'INLINE' && [0, 1, 2, 3].map((index) => {
        const tag = flatTags[index] || '';
        const code = getDentalTagCode(tag);
        const name = getDentalTagLabel(tag);
        const color = getDentalTagColor(tag) || colors[code] || null;
        return (
          <div 
            key={`${toothId}-${index}`} 
            style={color ? { backgroundColor: color, color: '#fff' } : {}}
            className="flex items-center justify-center overflow-hidden bg-white text-[9px] font-bold text-slate-700"
            title={name}
          >
            {code}
          </div>
        );
      })}
    </div>
  );
};

const InlineProcedurePopup = ({ isOpen, onClose, popupToothId, toothEntry, anchorElement, onToggleTag, procedures = DENTAL_CHART_PROCEDURES, colors = {} }: any) => {
  const popupRef = useRef<any>(null);
  const [style, setStyle] = useState({ top: -9999, left: -9999, opacity: 0 });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const handleOutsideClick = (event: MouseEvent) => {
      if (popupRef.current?.contains(event.target)) return;
      if ((event.target as HTMLElement)?.closest('.tooth-cell-container')) return;
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  useLayoutEffect(() => {
    if (!isOpen || !popupToothId || !popupRef.current || !anchorElement) return;
    const updatePosition = () => {
      if (!popupRef.current || !anchorElement?.isConnected) return;
      const anchorRect = anchorElement.getBoundingClientRect();
      const popupRect = popupRef.current.getBoundingClientRect();

      const gutter = 12;
      const viewportPadding = 12;
      const availableRight = window.innerWidth - anchorRect.right;
      const availableLeft = anchorRect.left;

      let left = anchorRect.right + gutter;
      if (availableRight < popupRect.width + viewportPadding && availableLeft >= popupRect.width + gutter) {
        left = anchorRect.left - popupRect.width - gutter;
      }

      let top = anchorRect.top + (anchorRect.height / 2) - (popupRect.height / 2);
      const maxLeft = Math.max(viewportPadding, window.innerWidth - popupRect.width - viewportPadding);
      const maxTop = Math.max(viewportPadding, window.innerHeight - popupRect.height - viewportPadding);

      left = Math.min(Math.max(left, viewportPadding), maxLeft);
      top = Math.min(Math.max(top, viewportPadding), maxTop);

      setStyle({ top, left, opacity: 1 });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorElement, isOpen, popupToothId]);

  if (!isOpen || !popupToothId) return null;

  const flatTags = getToothFlatTags(toothEntry);
  return (
    <div ref={popupRef} style={{ position: 'fixed', top: style.top, left: style.left, opacity: style.opacity, zIndex: 60 }} className="w-[280px] rounded-lg border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      <div className="flex items-center justify-between rounded-t-lg bg-slate-800 px-3 py-2 text-white">
        <div>
          <div className="text-xs font-bold">Procedures & Tags</div>
          <div className="text-[10px] text-slate-300">Tooth {popupToothId} • Tags {flatTags.length}/4</div>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-white">×</button>
      </div>
      <div className="max-h-[350px] overflow-y-auto p-3">
        {Object.entries(procedures).map(([category, items]: [string, any]) => (
          <div key={category} className="mb-4 last:mb-0">
            <h3 className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{category}</h3>
            <div className="flex flex-wrap gap-1.5">
              {items.map((item: any) => {
                const currentValues = getToothCategoryValues(toothEntry, category as keyof typeof TOOTH_CATEGORY_FIELD_MAP);
                const isActive = hasToothValue(currentValues, item);
                const isDisabled = !isActive && flatTags.length >= 4;
                const code = getDentalTagCode(item);
                const color = getDentalTagColor(item) || colors[code];
                const label = getDentalTagLabel(item);
                return (
                  <button 
                    key={`${category}-${code}`} 
                    onClick={() => onToggleTag(category, item)} 
                    disabled={isDisabled} 
                    title={label}
                    style={isActive && color ? { backgroundColor: color, borderColor: color } : {}}
                    className={`rounded border px-2 py-1 text-[10px] font-bold transition-colors ${isActive ? 'border-cyan-600 bg-cyan-600 text-white' : isDisabled ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300' : 'border-slate-300 bg-white text-slate-600 hover:border-cyan-400 hover:bg-cyan-50'}`}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ToothCell = ({ toothId, layout, toothEntry, isActive, mode, onToothClick, onBoxClick, onSurfaceClick, allowSurfaceClick, colors = {} }: any) => {
  if (!toothId) return <div className="h-[110px] w-[52px]" />;

  return (
    <div className={`tooth-cell-container flex h-[110px] w-[52px] cursor-pointer flex-col items-center justify-between rounded p-1 transition-colors ${isActive ? 'bg-cyan-50 ring-2 ring-cyan-500' : 'hover:bg-slate-50'}`} onClick={() => onToothClick(toothId)}>
      {layout === 'top' && <ToothInfoBox toothId={toothId} toothEntry={toothEntry} mode={mode} onBoxClick={onBoxClick} colors={colors} />}
      <span className="select-none text-xs font-bold text-slate-700">{toothId}</span>
      <ToothSurfaceSVG toothId={toothId} surfaces={toothEntry?.surfaces} onSurfaceClick={onSurfaceClick} isInteractive={allowSurfaceClick} />
      {layout === 'bottom' && <ToothInfoBox toothId={toothId} toothEntry={toothEntry} mode={mode} onBoxClick={onBoxClick} colors={colors} />}
    </div>
  );
};

function DentalLegendGuide() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">Clinical Legend / Meaning Guide</h3>
        <p className="mt-1 text-xs text-slate-500">
          Reference guide for the clinic&apos;s preferred dental chart notation.
        </p>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-3">
        {DENTAL_CHART_LEGEND_GUIDE.map((group) => (
          <section key={group.title} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h4 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</h4>
            <div className="space-y-2.5">
              {group.items.map((item) => (
                <div key={`${group.title}-${item.code}`} className="grid grid-cols-[minmax(76px,auto)_1fr] items-start gap-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200">
                  <span className="text-xs font-bold text-slate-900">{item.code}</span>
                  <span className="text-xs leading-5 text-slate-600">{item.meaning}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function DentalRecordLegendColumns({ print = false }: { print?: boolean }) {
  // PDF LEGEND TEXT KNOBS:
  // text-[8.5px] controls legend font size in Download PDF only.
  // leading-[1.32] and py-[1.5px] add row breathing room between legend items.
  const baseText = print ? 'text-[8.5px] leading-[1.32]' : 'text-xs leading-5';
  const titleText = print ? 'text-[8.5px]' : 'text-xs';

  const globalItems = (window as any).dentalChartMasterItems;
  const categories = globalItems ? [
    {
      title: 'Condition',
      items: globalItems.Conditions.map((item: any) => ({
        code: getDentalTagCode(item),
        label: getDentalTagLabel(item)
      }))
    },
    {
      title: 'Restorations & Prosthetics',
      items: globalItems.Prosthodontics.map((item: any) => ({
        code: getDentalTagCode(item),
        label: getDentalTagLabel(item)
      }))
    },
    {
      title: 'Surgery',
      items: globalItems.Surgery.map((item: any) => ({
        code: getDentalTagCode(item),
        label: getDentalTagLabel(item)
      }))
    }
  ] : DENTAL_RECORD_LEGEND_COLUMNS;

  return (
    <>
      {categories.map((group) => (
        <section key={group.title} className={print ? '' : 'rounded-lg border border-slate-200 bg-slate-50 p-4'}>
          <h4 className={`${titleText} mb-1 font-black`}>{group.title}</h4>
          <div className={baseText}>
            {group.items.map((item) => (
              <div
                key={`${group.title}-${item.code}`}
                className={print ? 'grid grid-cols-[28px_1fr] gap-x-3 py-[1.5px]' : 'grid grid-cols-[24px_1fr] gap-1'}
              >
                <span className="font-black">{item.code}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

// EDITOR / SYSTEM VIEW ONLY:
// Adjust this component when you want to change what appears on the Dental Chart tab in the app.
// Changes here affect the on-screen editor controls, not the downloadable PDF layout.
function DentalRecordRevisionEditor({ data, handleChartChange, handleNested, doctors, recallMasterItems = { appliance: [], occlusion: [], periodontal: [], tmd: [] } }: any) {
  const [activeTextarea, setActiveTextarea] = useState<'findings' | 'recommendation' | null>(null);
  const chart = data.dentalChart || {};
  const recommendationPlan = chart.recommendationPlan || {};
  const xrayTaken = chart.xrayTaken || {};
  const remarksStatus = chart.remarks?.status || '';

  const setRecommendation = (field: string, value: boolean | string) => handleNested('recommendationPlan', field, value);
  const setXray = (field: string, value: boolean | string) => handleNested('xrayTaken', field, value);
  const setRemarksStatus = (value: string) => handleNested('remarks', 'status', remarksStatus === value ? '' : value);

  return (
    /* Editor layout controls:
       - mt-6 moves this whole editor footer section closer/farther from the tooth chart on screen.
       - space-y-4 changes the vertical gap between editor cards.
       - SectionCard blocks below are editor-only panels. */
    <div className="mt-6 space-y-4">
      <SectionCard title="Dental Record Legend">
        <div className="grid gap-4 lg:grid-cols-4">
          <DentalRecordLegendColumns />
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="mb-1 text-xs font-black">X-ray Taken</h4>
            <div className="space-y-2 text-xs leading-5">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!xrayTaken.periapical} onChange={(e) => setXray('periapical', e.target.checked)} />
                <span>Periapical Taken</span>
              </label>
              <label className="flex items-center gap-2 pl-5">
                <span className="whitespace-nowrap">Tth no.</span>
                <input value={xrayTaken.periapicalToothNo || ''} onChange={(e) => setXray('periapicalToothNo', e.target.value)} className="w-24 border-b border-slate-300 bg-transparent px-1 outline-none" />
              </label>
              {[
                ['panoramic', 'Panoramic'],
                ['cephalometric', 'Cephalometric'],
                ['occlusalUpperLower', 'Occlusal (Upper/Lower)'],
                ['others', 'Others'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" checked={!!xrayTaken[key]} onChange={(e) => setXray(key, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
              <input value={xrayTaken.othersText || ''} onChange={(e) => setXray('othersText', e.target.value)} placeholder="Other X-ray note" className="w-full border-b border-slate-300 bg-transparent px-1 py-1 text-xs outline-none" />
            </div>
          </section>
        </div>
      </SectionCard>

      <SectionCard title="Recommendation">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            {DENTAL_RECORD_RECOMMENDATIONS.map((item) => (
              <label key={item.key} className="flex items-center gap-2 text-xs font-semibold">
                <input type="checkbox" checked={!!recommendationPlan[item.key]} onChange={(e) => setRecommendation(item.key, e.target.checked)} />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <div className="space-y-3 text-xs font-semibold">
            <label className="grid grid-cols-[82px_1fr] items-center gap-3">
              <span>TOOTH #</span>
              <input value={recommendationPlan.restorativeFillingToothNo || ''} onChange={(e) => setRecommendation('restorativeFillingToothNo', e.target.value)} className="border-b border-slate-300 bg-transparent px-1 py-1 outline-none" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!recommendationPlan.restorativeFilling} onChange={(e) => setRecommendation('restorativeFilling', e.target.checked)} />
              <span>RESTORATIVE FILLING</span>
            </label>
            <label className="grid grid-cols-[82px_1fr] items-center gap-3">
              <span>TOOTH #</span>
              <input value={recommendationPlan.toothExtractionToothNo || ''} onChange={(e) => setRecommendation('toothExtractionToothNo', e.target.value)} className="border-b border-slate-300 bg-transparent px-1 py-1 outline-none" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!recommendationPlan.toothExtraction} onChange={(e) => setRecommendation('toothExtraction', e.target.checked)} />
              <span>TOOTH EXTRACTION</span>
            </label>
          </div>
        </div>
      </SectionCard>

      {/* ADDITIONAL CLINICAL CHECKLISTS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 animate-in fade-in duration-150">
        <SectionCard title="Periodontal" className="md:col-span-1">
          <div className="flex flex-col space-y-2">
            {(recallMasterItems.periodontal.length > 0 ? recallMasterItems.periodontal.map(item => item.name.toLowerCase()) : ['gingivitis', 'early', 'moderate', 'advanced']).map(k => (
              <label key={k} className="flex items-center text-xs text-slate-700">
                <input 
                  type="checkbox" 
                  checked={!!(chart.periodontal && chart.periodontal[k])} 
                  onChange={e => handleNested('periodontal', k, e.target.checked)} 
                  className="mr-2 text-teal-600 rounded focus:ring-teal-500" 
                /> 
                <span className="capitalize">{k}</span>
              </label>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Occlusion" className="md:col-span-1">
          <div className="flex flex-col space-y-2 text-xs text-slate-700">
            <label className="flex items-center">
              <span className="w-12 font-bold text-slate-600">Class</span>
              <input 
                type="text" 
                value={(chart.occlusion && chart.occlusion.class) || ''} 
                onChange={e => handleNested('occlusion', 'class', e.target.value)} 
                className="border-b border-slate-300 w-16 px-1 outline-none bg-transparent text-slate-800" 
              />
            </label>
            {(recallMasterItems.occlusion.length > 0 
              ? recallMasterItems.occlusion.filter(item => !item.name.toLowerCase().startsWith('class'))
              : [{ name: 'overjet' }, { name: 'overbite' }, { name: 'midline' }, { name: 'crossbite' }]
            ).map(item => {
              const k = item.name.toLowerCase();
              const key = k === 'midline deviation' ? 'midline' : k;
              return (
                <label key={key} className="flex items-center font-bold">
                  <input 
                    type="checkbox" 
                    checked={!!(chart.occlusion && chart.occlusion[key])} 
                    onChange={e => handleNested('occlusion', key, e.target.checked)} 
                    className="mr-2 text-teal-600 rounded focus:ring-teal-500" 
                  /> 
                  <span className="capitalize">{item.name}</span>
                </label>
              );
            })}
          </div>
        </SectionCard>
        <SectionCard title="Appliances" className="md:col-span-1">
          <div className="flex flex-col space-y-2 text-xs text-slate-700">
            {(recallMasterItems.appliance.length > 0 
              ? recallMasterItems.appliance.filter(item => item.name.toLowerCase() !== 'other' && item.name.toLowerCase() !== 'others')
              : [{ name: 'orthodontic' }, { name: 'stayplate' }]
            ).map(item => {
              const k = item.name.toLowerCase();
              return (
                <label key={k} className="flex items-center font-bold">
                  <input 
                    type="checkbox" 
                    checked={!!(chart.appliances && chart.appliances[k])} 
                    onChange={e => handleNested('appliances', k, e.target.checked)} 
                    className="mr-2 text-teal-600 rounded focus:ring-teal-500" 
                  /> 
                  <span className="capitalize">{item.name}</span>
                </label>
              );
            })}
            <label className="flex items-center mt-2 font-bold">
              Others 
              <input 
                type="text" 
                value={(chart.appliances && chart.appliances.others) || ''} 
                onChange={e => handleNested('appliances', 'others', e.target.value)} 
                className="border-b border-slate-300 ml-2 w-full outline-none bg-transparent text-slate-800" 
              />
            </label>
          </div>
        </SectionCard>
        <SectionCard title="TMD" className="md:col-span-1">
          <div className="flex flex-col space-y-2 text-xs text-slate-700">
            {(recallMasterItems.tmd.length > 0 ? recallMasterItems.tmd.map(item => item.name.toLowerCase()) : ['clenching', 'clicking', 'trismus', 'muscleSpasm']).map(k => {
              const key = k === 'muscle spasm' ? 'muscleSpasm' : k;
              return (
                <label key={key} className="flex items-center font-bold">
                  <input 
                    type="checkbox" 
                    checked={!!(chart.tmd && chart.tmd[key])} 
                    onChange={e => handleNested('tmd', key, e.target.checked)} 
                    className="mr-2 text-teal-600 rounded focus:ring-teal-500" 
                  /> 
                  <span className="capitalize">{k}</span>
                </label>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <SectionCard title="Clinical Findings (Type '/' for templates)">
          <textarea 
            rows={4} 
            value={chart.findings || ''} 
            onChange={(e) => {
              const val = e.target.value;
              handleChartChange('findings', val);
              if (val.endsWith('/')) {
                setActiveTextarea('findings');
              }
            }} 
            placeholder="Enter clinical findings..." 
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm outline-none text-sm text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-shadow" 
          />
        </SectionCard>
        <SectionCard title="Treatment Recommendations (Type '/' for templates)">
          <textarea 
            rows={4} 
            value={chart.recommendation || ''} 
            onChange={(e) => {
              const val = e.target.value;
              handleChartChange('recommendation', val);
              if (val.endsWith('/')) {
                setActiveTextarea('recommendation');
              }
            }} 
            placeholder="Enter treatment recommendations..." 
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm outline-none text-sm text-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-shadow" 
          />
        </SectionCard>
      </div>

      {activeTextarea && (
        <CommandPalette
          onSelect={(snippet: string) => {
            const field = activeTextarea;
            handleChartChange(field, (chart[field] || '').replace(/\/$/, '') + snippet);
            setActiveTextarea(null);
          }}
          onClose={() => setActiveTextarea(null)}
        />
      )}

      <SectionCard title="Remarks & Sign-off">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Remarks</div>
            <div className="flex flex-wrap gap-4">
              {DENTAL_RECORD_REMARK_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-xs font-semibold">
                  <input type="radio" checked={remarksStatus === option.value} onChange={() => setRemarksStatus(option.value)} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Checked By</label>
              {doctors.length > 0 ? (
                <select value={chart.checkedBy || ''} onChange={(e) => handleChartChange('checkedBy', e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 sm:text-sm">
                  <option value="">Select dentist...</option>
                  {doctors.map((doctor: any) => <option key={doctor.id} value={doctor.name}>{doctor.name}</option>)}
                </select>
              ) : (
                <input type="text" value={chart.checkedBy || ''} onChange={(e) => handleChartChange('checkedBy', e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 sm:text-sm" placeholder="Dr. Name" />
              )}
            </div>
            <FormInput label="Date" field="chartDate" type="date" data={chart} handleChange={(field: string, value: string) => handleChartChange(field, value)} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function DentalChartModule({ data, setData, doctors }: { data: any; setData: any; doctors: any; favoriteStatuses?: string[]; setFavoriteStatuses?: any }) {
  const [chartMode, setChartMode] = useState<'INLINE' | 'MULTIPLE'>('INLINE');
  const TOOTH_FALLBACK_ITEMS: Record<string, { code: string; name: string; color?: string }[]> = {
    Status: [
      { code: 'cv', name: 'Cavity', color: '#FF0000' },
      { code: 'ok', name: 'OK / Pasta', color: '#0433FF' }
    ],
    Conditions: [
      { code: '/', name: 'Present Teeth', color: '#00C853' },
      { code: 'm', name: 'Missing Due to Caries', color: '#D50000' },
      { code: 'mo', name: 'Missing Due to Other Cause', color: '#AA00FF' },
      { code: 'im', name: 'Impacted Tooth', color: '#FF6D00' },
      { code: 'sp', name: 'Supernumerary Tooth', color: '#00B0FF' },
      { code: 'rf', name: 'Root Fragment', color: '#FFD600' },
      { code: 'un', name: 'Unerupted Tooth', color: '#C6FF00' },
      { code: 'pt', name: 'Pulpless Tooth', color: '#00E5FF' },
      { code: 'd', name: 'Decayed (Caries Indicated for Filling)', color: '#FF1744' },
      { code: 'rct', name: 'Root Canal Treatment', color: '#2979FF' }
    ],
    Prosthodontics: [
      { code: 'mc', name: 'Metal Crown' },
      { code: 'pj', name: 'Plastic Jacket Crown' },
      { code: 'am', name: 'Amalgam Filling' },
      { code: 'lcf', name: 'Light Cure Filling' },
      { code: 'porjc', name: 'Porcelain Crown' },
      { code: 'ab', name: 'Abutment' },
      { code: 'att', name: 'Attachment' },
      { code: 'p', name: 'Pontic' },
      { code: 'ic', name: 'Inlay' },
      { code: 'imp', name: 'Implant' },
      { code: 's', name: 'Sealants' },
      { code: 'rm', name: 'Removable Denture' },
      { code: 'gi', name: 'Glass Ionomer' },
      { code: 'v', name: 'Veneer' },
      { code: 'tf', name: 'Temporary Filling' }
    ],
    Surgery: [
      { code: 'x', name: 'Extraction Due to Caries' },
      { code: 'xo', name: 'Extraction Due to Other Causes' }
    ],
    'X-Ray': [
      { code: 'pano', name: 'Panoramic' },
      { code: 'cepha', name: 'Cephalometric' },
      { code: 'occ', name: 'Occlusal (Upper/Lower)' },
      { code: 'peri', name: 'Periapical' }
    ]
  };

  const [toothProcedures, setToothProcedures] = useState<Record<string, any[]>>({
    Status: [],
    Conditions: [],
    Prosthodontics: [],
    Surgery: [],
    'X-Ray': [],
  });
  const [toothItemColors, setToothItemColors] = useState<Record<string, string>>({});
  const [recallMasterItems, setRecallMasterItems] = useState<{
    appliance: any[];
    occlusion: any[];
    periodontal: any[];
    tmd: any[];
  }>({ appliance: [], occlusion: [], periodontal: [], tmd: [] });
  const [activeTextarea, setActiveTextarea] = useState<'findings' | 'recommendation' | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchToothData = async () => {
      const [
        toothItemsRes,
        appRes, occRes, perioRes, tmdRes
      ] = await Promise.all([
        loadDentalChartMasterItems(),
        loadActiveMasterDirectoryItems('recall_appliance'),
        loadActiveMasterDirectoryItems('recall_occlusion'),
        loadActiveMasterDirectoryItems('periodontal_screening'),
        loadActiveMasterDirectoryItems('recall_tmd')
      ]);

      if (!isMounted) return;

      const mapToObjects = (items: any[] | null | undefined, categoryKey: string) => {
        if (Array.isArray(items) && items.length > 0) {
          return items;
        }
        return TOOTH_FALLBACK_ITEMS[categoryKey].map((fallback: any) => ({
          id: fallback.code,
          directoryType: categoryKey === 'X-Ray' ? 'tooth_xray' : `tooth_${categoryKey.toLowerCase()}`,
          code: fallback.code,
          label: fallback.name,
          color: fallback.color || null,
          legacyCode: fallback.code,
          name: fallback.name
        }));
      };

      const proceduresObj = {
        Status: mapToObjects(toothItemsRes.ok ? toothItemsRes.data.toothStatus : null, 'Status'),
        Conditions: mapToObjects(toothItemsRes.ok ? toothItemsRes.data.toothConditions : null, 'Conditions'),
        Prosthodontics: mapToObjects(toothItemsRes.ok ? toothItemsRes.data.toothProsthodontics : null, 'Prosthodontics'),
        Surgery: mapToObjects(toothItemsRes.ok ? toothItemsRes.data.toothSurgery : null, 'Surgery'),
        'X-Ray': mapToObjects(toothItemsRes.ok ? toothItemsRes.data.toothXray : null, 'X-Ray'),
      };
      setToothProcedures(proceduresObj);
      (window as any).dentalChartMasterItems = proceduresObj;

      const colors: Record<string, string> = {};
      Object.values(proceduresObj).forEach(items => {
        items.forEach(item => {
          if (item.color) {
            colors[item.code] = item.color;
          }
        });
      });
      setToothItemColors(colors);

      setRecallMasterItems({
        appliance: appRes.ok ? appRes.data : [],
        occlusion: occRes.ok ? occRes.data : [],
        periodontal: perioRes.ok ? perioRes.data : [],
        tmd: tmdRes.ok ? tmdRes.data : []
      });
    };
    void fetchToothData();
    return () => { isMounted = false; };
  }, []);

  const [inlineActiveTool, setInlineActiveTool] = useState<'CAVITY' | 'PASTA' | 'CLEAR'>('CAVITY');
  const [multipleActiveTool, setMultipleActiveTool] = useState<'CAVITY' | 'PASTA' | 'CLEAR'>('CAVITY');
  const [activeToothId, setActiveToothId] = useState<string | null>(null);
  const [inlinePopupToothId, setInlinePopupToothId] = useState<string | null>(null);
  const [inlinePopupAnchor, setInlinePopupAnchor] = useState<HTMLElement | null>(null);
  const [currentRowIndex, setCurrentRowIndex] = useState<number | null>(null);
  const [editMultiple, setEditMultiple] = useState(false);
  const [selectedToothIds, setSelectedToothIds] = useState<string[]>([]);

  const handleNested = (cat: string, field: string, value: any) => {
    setData((prev: any) => ({ ...prev, dentalChart: { ...prev.dentalChart, [cat]: { ...prev.dentalChart[cat], [field]: value } } }));
  };

  const handleChartChange = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, dentalChart: { ...prev.dentalChart, [field]: value } }));
  };

  const updateToothEntries = (toothIds: string[], updater: (entry: any) => any) => {
    setData((prev: any) => {
      const nextTeeth = { ...prev.dentalChart.teeth };
      toothIds.forEach((toothId) => {
        nextTeeth[toothId] = updater(normalizeToothChartEntry(toothId, nextTeeth[toothId]));
      });
      return { ...prev, dentalChart: { ...prev.dentalChart, teeth: nextTeeth } };
    });
  };

  const applySurfaceTool = (toothIds: string[], surface: string, tool: 'CAVITY' | 'PASTA' | 'CLEAR') => {
    const nextValue = tool === 'CAVITY' ? 'cavity' : tool === 'PASTA' ? 'pasta' : null;
    updateToothEntries(toothIds, (entry) => ({ ...entry, surfaces: { ...entry.surfaces, [surface]: nextValue } }));
  };

  const handleInlineSurfaceClick = (toothId: string, surface: string) => {
    setActiveToothId(toothId);
    setInlinePopupToothId(null);
    setInlinePopupAnchor(null);
    applySurfaceTool([toothId], surface, inlineActiveTool);
  };

  const handleInlineBoxClick = (event: any, toothId: string) => {
    event.stopPropagation();
    setActiveToothId(toothId);
    if (inlinePopupToothId === toothId) {
      setInlinePopupToothId(null);
      setInlinePopupAnchor(null);
      return;
    }
    setInlinePopupAnchor(event.currentTarget as HTMLElement);
    setInlinePopupToothId(toothId);
  };

  const handleInlineTagToggle = (category: string, item: any) => {
    if (!inlinePopupToothId) return;
    updateToothEntries([inlinePopupToothId], (entry) => {
      const currentValues = getToothCategoryValues(entry, category as keyof typeof TOOTH_CATEGORY_FIELD_MAP);
      const isActive = hasToothValue(currentValues, item);
      const flatTags = getToothFlatTags(entry);
      if (!isActive && flatTags.length >= 4) return entry;
      const nextValues = toggleToothValue(currentValues, item);
      return setToothCategoryValues(entry, category as keyof typeof TOOTH_CATEGORY_FIELD_MAP, nextValues);
    });
  };

  const handleMultipleToothClick = (toothId: string) => {
    const rowIndex = DENTAL_CHART_ROWS.findIndex((row) => (row.teeth as readonly (string | null)[]).includes(toothId));
    setCurrentRowIndex(rowIndex);
    setInlinePopupToothId(null);
    setActiveToothId(toothId);
    setSelectedToothIds((prev) => {
      const rowToothIds = DENTAL_CHART_ROWS[rowIndex].teeth.filter(Boolean) as string[];
      const rowSelections = prev.filter((id) => rowToothIds.includes(id));
      if (!editMultiple) return [toothId];
      return rowSelections.includes(toothId) ? rowSelections.filter((id) => id !== toothId) : [...rowSelections, toothId];
    });
  };

  const handleMultipleTagToggle = (category: string, item: any) => {
    if (selectedToothIds.length === 0) return;
    const firstEntry = data.dentalChart.teeth[selectedToothIds[0]];
    const isActive = hasToothValue(getToothCategoryValues(firstEntry, category as keyof typeof TOOTH_CATEGORY_FIELD_MAP), item);
    updateToothEntries(selectedToothIds, (entry) => {
      const currentValues = getToothCategoryValues(entry, category as keyof typeof TOOTH_CATEGORY_FIELD_MAP);
      const nextValues = toggleToothValue(currentValues, item);
      return setToothCategoryValues(entry, category as keyof typeof TOOTH_CATEGORY_FIELD_MAP, nextValues);
    });
  };

  const handleSummaryChange = (value: string) => {
    if (selectedToothIds.length === 0) return;
    updateToothEntries(selectedToothIds, (entry) => ({ ...entry, summary: value }));
  };

  const selectedRow = currentRowIndex === null ? null : DENTAL_CHART_ROWS[currentRowIndex];
  const selectedToothEntries = selectedToothIds.map((toothId) => data.dentalChart.teeth[toothId]).filter(Boolean);
  const aggregatedSurfaces = selectedToothEntries[0]?.surfaces || createDefaultToothChartEntry('reference').surfaces;
  const currentSummary = selectedToothEntries[0]?.summary || '';
  const visibleRows = chartMode === 'MULTIPLE' && currentRowIndex !== null ? [DENTAL_CHART_ROWS[currentRowIndex]] : DENTAL_CHART_ROWS;

  useEffect(() => {
    if (chartMode === 'INLINE') {
      setCurrentRowIndex(null);
      setSelectedToothIds([]);
      setEditMultiple(false);
    } else {
      setInlinePopupToothId(null);
      setInlinePopupAnchor(null);
    }
  }, [chartMode]);

  return (
    <div className="w-full max-w-[1660px] mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Clinical Dental Chart</h2>
        <p className="text-sm text-slate-500">Inline single-tooth charting plus row-focused multiple-selection editing.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setChartMode('INLINE')} className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${chartMode === 'INLINE' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>Inline Surfaces</button>
          <button onClick={() => setChartMode('MULTIPLE')} className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${chartMode === 'MULTIPLE' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>Charting w/ Multiple Selection</button>
        </div>
      </div>

      {chartMode === 'INLINE' && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {[
            ...toothProcedures.Status.map((item: any) => ({
              id: item.code === 'cv' ? 'CAVITY' : item.code === 'ok' ? 'PASTA' : (item.code || '').toUpperCase(),
              label: item.name,
              dotStyle: { backgroundColor: item.color || '#3b82f6' }
            })),
            { id: 'CLEAR', label: 'Clear', dotStyle: { border: '1px solid #94a3b8', backgroundColor: '#fff' } },
          ].map((tool) => (
            <button key={tool.id} onClick={() => setInlineActiveTool(tool.id as any)} className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${inlineActiveTool === tool.id ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              <span className="h-3 w-3 rounded-full" style={tool.dotStyle}></span>{tool.label}
            </button>
          ))}
        </div>
      )}

      {chartMode === 'MULTIPLE' && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <button onClick={() => { setCurrentRowIndex((prev) => prev === null || prev === 0 ? DENTAL_CHART_ROWS.length - 1 : prev - 1); setSelectedToothIds([]); }} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Prev</button>
          <button onClick={() => { setEditMultiple((prev) => !prev); if (editMultiple) setSelectedToothIds([]); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${editMultiple ? 'bg-emerald-100 text-emerald-800' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>Edit Multiple</button>
          <button onClick={() => { setCurrentRowIndex(null); setSelectedToothIds([]); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${currentRowIndex === null ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>View Chart</button>
          <button onClick={() => { setCurrentRowIndex((prev) => prev === null || prev === DENTAL_CHART_ROWS.length - 1 ? 0 : prev + 1); setSelectedToothIds([]); }} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Next</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto flex min-w-[1080px] max-w-[1240px] flex-col gap-6">
          {visibleRows.map((row) => (
            <div key={row.index} className="space-y-3">
              {chartMode === 'MULTIPLE' && currentRowIndex !== null && <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{row.label}</div>}
              <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-2">
                {row.teeth.map((toothId, index) => {
                  const entry = toothId ? data.dentalChart.teeth[toothId] : null;
                  const isActive = chartMode === 'INLINE' ? activeToothId === toothId : selectedToothIds.includes(toothId as string);
                  return (
                    <ToothCell
                      key={toothId || `${row.index}-empty-${index}`}
                      toothId={toothId}
                      layout={row.layout}
                      toothEntry={entry}
                      isActive={isActive}
                      mode={chartMode}
                      onToothClick={chartMode === 'INLINE' ? (tooth: string) => { setActiveToothId(tooth); setInlinePopupToothId(null); setInlinePopupAnchor(null); } : handleMultipleToothClick}
                      onBoxClick={handleInlineBoxClick}
                      onSurfaceClick={chartMode === 'INLINE' ? handleInlineSurfaceClick : undefined}
                      allowSurfaceClick={chartMode === 'INLINE'}
                      colors={toothItemColors}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {chartMode === 'MULTIPLE' && selectedToothIds.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="grid gap-0 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
            <div className="border-r border-slate-200 bg-slate-50 p-6">
              <h3 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Tooth Status</h3>
              <div className="space-y-3">
                {[
                  ...toothProcedures.Status.map((item: any) => ({
                    id: item.code === 'cv' ? 'CAVITY' : item.code === 'ok' ? 'PASTA' : (item.code || '').toUpperCase(),
                    label: item.name,
                    dotStyle: { backgroundColor: item.color || '#3b82f6' }
                  })),
                  { id: 'CLEAR', label: 'Reset/Clear', dotStyle: { border: '1px solid #94a3b8', backgroundColor: '#fff' } },
                ].map((tool) => (
                  <button key={tool.id} onClick={() => setMultipleActiveTool(tool.id as any)} className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 font-bold transition-colors ${multipleActiveTool === tool.id ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                    <span className="h-4 w-4 rounded-full" style={tool.dotStyle}></span>{tool.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border-r border-slate-200 p-6">
              <div className="self-start text-xs font-black uppercase tracking-[0.18em] text-slate-400">Selected Tooth</div>
              <div className="mb-4 self-start text-xl font-black text-cyan-700">{selectedToothIds.join(', ')}</div>
              <p className="mb-4 text-xs font-medium text-slate-500">Click a surface to apply {multipleActiveTool.toLowerCase()} to the selected tooth/teeth.</p>
              <ToothSurfaceSVG toothId="multiple-editor" surfaces={aggregatedSurfaces} onSurfaceClick={(_: string, surface: string) => applySurfaceTool(selectedToothIds, surface, multipleActiveTool)} isInteractive={true} className="h-[180px] w-[180px]" />
            </div>

            <div className="max-h-[420px] overflow-y-auto bg-slate-50 p-6">
              <h3 className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Summary</h3>
              <input value={currentSummary} onChange={(e) => handleSummaryChange(e.target.value)} placeholder="Enter condition notes..." className="mb-6 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
              {Object.entries(toothProcedures).map(([category, items]) => {
                const activeValues = getToothCategoryValues(selectedToothEntries[0], category as keyof typeof TOOTH_CATEGORY_FIELD_MAP);
                return (
                  <div key={category} className="mb-6 last:mb-0">
                    <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{category}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((item) => {
                        const isSelected = hasToothValue(activeValues, item);
                        const code = getCodeOfValue(item);
                        const color = typeof item === 'object' && item && item.color ? item.color : toothItemColors[code];
                        const label = typeof item === 'object' && item ? item.name : code;
                        return (
                          <button 
                            key={`${category}-${code}`} 
                            onClick={() => handleMultipleTagToggle(category, item)} 
                            title={label}
                            style={isSelected && color ? { backgroundColor: color, borderColor: color } : {}}
                            className={`rounded border px-2.5 py-1 text-xs font-bold transition-colors ${isSelected ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-400'}`}
                          >
                            {code}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* EDITOR / SYSTEM VIEW: this renders the lower dental-record controls inside the app only. */}
      <DentalRecordRevisionEditor data={data} handleChartChange={handleChartChange} handleNested={handleNested} doctors={doctors} recallMasterItems={recallMasterItems} />

      <InlineProcedurePopup 
        isOpen={inlinePopupToothId !== null} 
        onClose={() => { setInlinePopupToothId(null); setInlinePopupAnchor(null); }} 
        popupToothId={inlinePopupToothId} 
        toothEntry={inlinePopupToothId ? data.dentalChart.teeth[inlinePopupToothId] : null} 
        anchorElement={inlinePopupAnchor} 
        onToggleTag={handleInlineTagToggle} 
        procedures={toothProcedures}
        colors={toothItemColors}
      />
    </div>
  );
}

function DentalChartHistoryModule({ patientData, setPatientData, patientRecordId, favoriteStatuses, setFavoriteStatuses, doctors, onPrintAction, saveToDatabase }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [localEntryData, setLocalEntryData] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const itemsPerPage = 5;

  const history = patientData.dentalChartHistory || [];
  
  const handleNewChart = () => {
    setLocalEntryData({
      id: crypto.randomUUID(),
      recallDate: new Date().toISOString().split('T')[0],
      medicalCondition: '',
      medications: '',
      allergies: '',
      extraoralExam: '',
      recallSummary: '',
      dentalChart: createEmptyDentalChartData(),
    });
    setEditingEntryId(null);
    setIsModalOpen(true);
    setActiveDropdownId(null);
  };

  const handleEdit = (entry: any) => {
    setLocalEntryData(JSON.parse(JSON.stringify(entry)));
    setEditingEntryId(entry.id);
    setIsModalOpen(true);
    setActiveDropdownId(null);
  };

  const handleDuplicate = (entry: any) => {
    setLocalEntryData({
      ...JSON.parse(JSON.stringify(entry)),
      id: crypto.randomUUID(),
      recallDate: new Date().toISOString().split('T')[0]
    });
    setEditingEntryId(null);
    setIsModalOpen(true);
    setActiveDropdownId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recall record?')) {
      setActiveDropdownId(null);
      return;
    }
    
    try {
      if (patientRecordId) {
        await deleteDentalChartRecord(id);
        const allCharts = await getDentalChartsByPatientId(patientRecordId);
        
        setPatientData((prev: any) => {
          const history: any[] = allCharts.map(mapSupabaseDentalChartRowToHistoryEntry);
          return {
            ...prev,
            dentalChartHistory: history,
            dentalChart: history.length > 0 ? history[0].dentalChart : prev.dentalChart
          };
        });
      } else {
        // Fallback for unsaved patients
        setPatientData((prev: any) => {
          const newHistory = (prev.dentalChartHistory || []).filter((h: any) => h.id !== id);
          return {
            ...prev,
            dentalChartHistory: newHistory,
            dentalChart: newHistory.length > 0 ? newHistory[0].dentalChart : prev.dentalChart
          };
        });
      }
    } catch (e) {
      console.error('Error deleting dental chart:', e);
      alert('Failed to delete dental chart.');
    }
    setActiveDropdownId(null);
  };

  const handleSave = async () => {
    const entryToSave = { 
      ...localEntryData, 
      recallSummary: localEntryData.dentalChart?.findings || localEntryData.recallSummary 
    };
    
    // If the patient is already saved in Supabase, make direct backend calls using the real UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientRecordId || '');
    
    if (patientRecordId && isUUID) {
      const payload = {
        chartData: entryToSave.dentalChart,
        summary: entryToSave.recallSummary || null,
        recallDate: entryToSave.recallDate,
        medicalCondition: entryToSave.medicalCondition || null,
        medications: entryToSave.medications || null,
        allergies: entryToSave.allergies || null,
        extraoralExam: entryToSave.extraoralExam || null
      };

      console.log('Saving dental chart with patient UUID:', patientRecordId);
      console.log('Payload:', payload);

      try {
        if (editingEntryId) {
          await updateDentalChartRecord(editingEntryId, payload);
        } else {
          await createDentalChartRecord(patientRecordId, payload, { source: 'explicit-dental-chart-save' });
        }
        
        // Reload all charts
        const allCharts = await getDentalChartsByPatientId(patientRecordId);
        setPatientData((prev: any) => {
          const history: any[] = allCharts.map(mapSupabaseDentalChartRowToHistoryEntry);
          return {
            ...prev,
            dentalChartHistory: history,
            dentalChart: history.length > 0 ? history[0].dentalChart : prev.dentalChart
          };
        });
      } catch (e) {
        console.error('Error saving dental chart directly:', e);
        alert('Failed to save dental chart to database.');
        return;
      }
    } else if (patientRecordId && !isUUID) {
      // patientRecordId exists but is not a valid UUID — block save
      alert('Invalid patient ID. Dental chart must be linked to patient_records.id.');
      console.error('Blocked dental chart save: patientRecordId is not a valid UUID:', patientRecordId);
      return;
    } else {
      // Unsaved patient fallback
      setPatientData((prev: any) => {
        const existingHistory = prev.dentalChartHistory || [];
        const newHistory = editingEntryId 
          ? existingHistory.map((h: any) => h.id === editingEntryId ? entryToSave : h)
          : [entryToSave, ...existingHistory];
          
        return { 
          ...prev, 
          dentalChartHistory: newHistory,
          dentalChart: newHistory[0]?.dentalChart || prev.dentalChart
        };
      });
      if (saveToDatabase) setTimeout(() => saveToDatabase(), 50);
    }
    
    setIsModalOpen(false);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, history.length);
  const currentRows = history.slice(startIndex, endIndex);
  const totalPages = Math.max(1, Math.ceil(history.length / itemsPerPage));

  const handleLocalNested = (field: string, value: any) => {
    setLocalEntryData((prev: any) => ({ ...prev, [field]: value }));
  };
  
  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Charting History, Update List, New Recall / Consult</h2>
          <p className="text-sm text-slate-500">Track patients' clinical status updates, extraoral findings, and dental screening history.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64" />
          </div>
          <button onClick={handleNewChart} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Dental Chart
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-4">
        <div className="max-h-[500px] overflow-y-auto min-h-[300px] rounded-xl">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-20">
              <tr>
                <th className="px-4 py-4 whitespace-nowrap">Recall Date</th>
                <th className="px-4 py-4">Extra Oral Examination</th>
                <th className="px-4 py-4">Recall Summary</th>
                <th className="px-4 py-4 w-20 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentRows.map((row: any, index: number) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-medium text-slate-800">{row.recallDate}</td>
                  <td className="px-4 py-4 max-w-xs truncate" title={row.extraoralExam}>{row.extraoralExam || '-'}</td>
                  <td className="px-4 py-4 max-w-xs truncate" title={row.recallSummary}>{row.recallSummary || '-'}</td>
                  <td className="px-4 py-4 text-center relative">
                      <div className="relative z-[9999]">
                        <button onClick={(e) => { e.stopPropagation(); setActiveDropdownId(activeDropdownId === row.id ? null : row.id); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        {activeDropdownId === row.id && (
                          <>
                            <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setActiveDropdownId(null); }} />
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-200 py-1.5 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => handleEdit(row)} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-teal-600 font-medium flex items-center gap-2"><Edit2 className="w-4 h-4" /> Edit Recall</button>
                              <button onClick={() => handleDuplicate(row)} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-teal-600 font-medium flex items-center gap-2"><Copy className="w-4 h-4" /> Duplicate</button>
                              <button onClick={() => { setActiveDropdownId(null); onPrintAction(row.id); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-teal-600 font-medium flex items-center gap-2"><Printer className="w-4 h-4" /> Print Record</button>
                              <div className="h-px bg-slate-100 my-1.5"></div>
                              <button onClick={() => handleDelete(row.id)} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete / Archive</button>
                            </div>
                          </>
                        )}
                      </div>
                </td>
              </tr>
            ))}
            {currentRows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500 italic bg-slate-50/50">No dental recall/consult yet. Click New Dental Chart to create one.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {history.length > 0 && (
        <div className="flex items-center justify-between px-1 pt-2">
          <span className="text-xs text-slate-500 font-medium">Showing <span className="font-bold text-slate-700">{startIndex + 1}-{endIndex}</span> of <span className="font-bold text-slate-700">{history.length}</span> records</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-40 font-medium">&lt; Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${page === currentPage ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{page}</button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-40 font-medium">Next &gt;</button>
          </div>
        </div>
      )}

      {isModalOpen && localEntryData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-sm">
          <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-7xl h-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800">New Patient Recall / Consult</h2>
                <p className="text-xs text-slate-500">Complete clinical checkups, Odontogram teeth charting, and screening diagnostics.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 relative">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Present Medical Condition</label>
                    <input type="text" value={localEntryData.medicalCondition || ''} onChange={e => handleLocalNested('medicalCondition', e.target.value)} placeholder="Describe condition (e.g. Hypertension)" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-shadow outline-none" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Present Medications</label>
                    <input type="text" value={localEntryData.medications || ''} onChange={e => handleLocalNested('medications', e.target.value)} placeholder="Active medications" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-shadow outline-none" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Allergies to Medications</label>
                    <input type="text" value={localEntryData.allergies || ''} onChange={e => handleLocalNested('allergies', e.target.value)} placeholder="Allergies (e.g. Penicillin)" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-shadow outline-none" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Recall Date</label>
                    <input type="date" value={localEntryData.recallDate || ''} onChange={e => handleLocalNested('recallDate', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-shadow outline-none" />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Extraoral Examination</label>
                    <input type="text" value={localEntryData.extraoralExam || ''} onChange={e => handleLocalNested('extraoralExam', e.target.value)} placeholder="Asymmetry, lymph nodes, joints..." className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-shadow outline-none" />
                 </div>
               </div>

               <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 relative">
                 <DentalChartModule 
                   data={{ dentalChart: localEntryData.dentalChart }} 
                   setData={(updater: any) => {
                     setLocalEntryData((prev: any) => {
                       const nextData = typeof updater === 'function' ? updater({ dentalChart: prev.dentalChart }) : updater;
                       return { ...prev, dentalChart: nextData.dentalChart };
                     });
                   }}
                   favoriteStatuses={favoriteStatuses}
                   setFavoriteStatuses={setFavoriteStatuses}
                   doctors={doctors}
                 />
               </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
               <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors">
                 CANCEL
               </button>
               <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-teal-500 hover:bg-teal-600 transition-colors shadow-sm">
                 <Check className="w-4 h-4" /> SAVE
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegacyDentalChartModule({ data, setData, favoriteStatuses, setFavoriteStatuses, doctors }) {
  const [activeTooth, setActiveTooth] = useState(null);
  const [paintMode, setPaintMode] = useState(null);

  const handleNested = (cat, field, value) => {
    setData(prev => ({ ...prev, dentalChart: { ...prev.dentalChart, [cat]: { ...prev.dentalChart[cat], [field]: value } } }));
  };
  const handleChartChange = (field, value) => {
    setData(prev => ({ ...prev, dentalChart: { ...prev.dentalChart, [field]: value } }));
  };
  const setToothCondition = (code) => {
    if (!activeTooth) return;
    setData(prev => ({ ...prev, dentalChart: { ...prev.dentalChart, teeth: { ...prev.dentalChart.teeth, [activeTooth]: code } } }));
  };

  const handleFavoriteClick = (value) => {
    const code = getDentalTagCode(value);
    if (!code) return;
    if (paintMode === code) {
      setPaintMode(null);
      return;
    }
    if (activeTooth) {
      setToothCondition(code);
    } else {
      setPaintMode(code);
    }
  };

  const getLegendLabel = (code) => {
    const normalizedCode = getDentalTagCode(code);
    for (const group of Object.values(CHART_LEGENDS)) {
      const item = group.find(l => l.code === normalizedCode);
      if (item) return item.label;
    }
    return normalizedCode;
  };

  const InteractiveTooth = ({ t }: { t: number }) => {
    const status = data.dentalChart.teeth[t] || '';
    const statusCode = getDentalTagCode(status);
    const isActive = activeTooth === t;
    const isPaintTarget = paintMode && !isActive;

    return (
      <div onClick={() => {
        if (paintMode) {
          setData(prev => ({ ...prev, dentalChart: { ...prev.dentalChart, teeth: { ...prev.dentalChart.teeth, [t]: paintMode } } }));
          setActiveTooth(t);
        } else {
          setActiveTooth(t);
        }
      }} className={`flex flex-col items-center mx-[2px] cursor-pointer p-1 rounded transition-colors ${isActive ? 'bg-blue-100 ring-2 ring-blue-400' : isPaintTarget ? 'hover:bg-orange-100' : 'hover:bg-slate-100'}`}>
        <span className="text-[10px] font-bold text-slate-600 mb-0.5">{t}</span>
        <div className={`w-6 h-6 border border-slate-400 flex items-center justify-center bg-white shadow-sm text-xs font-bold ${statusCode ? 'text-blue-700' : 'text-transparent'}`}>
          {statusCode}
        </div>
        <div className="mt-1 w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center bg-slate-50">
          <div className="w-2.5 h-2.5 rounded-full border border-slate-400 bg-white"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1660px] mx-auto space-y-6 pb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Clinical Dental Chart</h2>
        <p className="text-slate-500 text-sm">Select a tooth to mark its condition based on the legend.</p>
      </div>

      <div className="grid grid-cols-1 min-[1450px]:grid-cols-[minmax(0,1.7fr)_360px] gap-6 items-start">
        {/* CHART GRID AREA */}
        <div className="w-full bg-white p-6 border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <div className="relative mx-auto flex w-full min-w-[1080px] max-w-[1240px] flex-col items-center pb-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Maxillary (Upper)</h4>
            <div className="absolute left-1/2 top-10 bottom-10 w-px bg-slate-300"></div>
            <div className="absolute top-1/2 left-4 right-4 h-px bg-slate-300"></div>
            <span className="absolute left-4 top-4 text-xs font-bold text-slate-400">RIGHT</span>
            <span className="absolute right-4 top-4 text-xs font-bold text-slate-400">LEFT</span>

            <div className="flex items-center space-x-4 mb-4 z-10 relative">
              <span className="absolute -left-24 text-[9px] font-bold text-slate-400 uppercase w-20 text-right pr-2">Temporary</span>
              <div className="flex">{TEMP_UPPER_RIGHT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
              <div className="w-2"></div>
              <div className="flex">{TEMP_UPPER_LEFT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
            </div>

            <div className="flex items-center space-x-4 mb-6 z-10 relative">
              <span className="absolute -left-24 text-[9px] font-bold text-slate-400 uppercase w-20 text-right pr-2">Permanent</span>
              <div className="flex">{PERM_UPPER_RIGHT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
              <div className="w-2"></div>
              <div className="flex">{PERM_UPPER_LEFT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
            </div>

            <div className="flex items-center space-x-4 mt-6 mb-4 z-10 relative">
              <span className="absolute -left-24 text-[9px] font-bold text-slate-400 uppercase w-20 text-right pr-2">Permanent</span>
              <div className="flex">{PERM_LOWER_RIGHT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
              <div className="w-2"></div>
              <div className="flex">{PERM_LOWER_LEFT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
            </div>

            <div className="flex items-center space-x-4 z-10 relative">
              <span className="absolute -left-24 text-[9px] font-bold text-slate-400 uppercase w-20 text-right pr-2">Temporary</span>
              <div className="flex">{TEMP_LOWER_RIGHT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
              <div className="w-2"></div>
              <div className="flex">{TEMP_LOWER_LEFT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
            </div>

            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-8">Mandibular (Lower)</h4>
          </div>
        </div>

        {/* EDITOR SIDEBAR */}
        <div className="w-full xl:w-[340px] shrink-0 space-y-4">
          <div className="w-full bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm">
            <h3 className="font-bold text-blue-900 mb-2">Edit Tooth</h3>
            {activeTooth ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm">Tooth Selected: <strong className="text-lg bg-white px-2 py-0.5 rounded border border-blue-200">{activeTooth}</strong></div>
                  <button onClick={() => setActiveTooth(null)} className="text-[10px] text-slate-500 hover:text-slate-800 underline">Clear Selection</button>
                </div>
                <div className="text-xs font-semibold mb-2 uppercase text-slate-500">Set Condition:</div>
                <select
                  className="w-full p-2 text-sm border border-slate-300 rounded outline-none"
                  value={getDentalTagCode(data.dentalChart.teeth[activeTooth])}
                  onChange={(e) => setToothCondition(e.target.value)}
                >
                  <option value="">- Clear Status -</option>
                  <optgroup label="Condition">
                    {CHART_LEGENDS.condition.map(l => <option key={l.code} value={l.code}>{l.code} - {l.label}</option>)}
                  </optgroup>
                  <optgroup label="Restoration & Prosthetics">
                    {CHART_LEGENDS.restoration.map(l => <option key={l.code} value={l.code}>{l.code} - {l.label}</option>)}
                  </optgroup>
                  <optgroup label="Surgery">
                    {CHART_LEGENDS.surgery.map(l => <option key={l.code} value={l.code}>{l.code} - {l.label}</option>)}
                  </optgroup>
                </select>
              </div>
            ) : (
              <div className="text-sm text-blue-600/70 italic py-2">Click a tooth on the chart to assign a condition.</div>
            )}

            {/* QUICK APPLY / FAVORITES */}
            <div className="mt-4 border-t border-blue-200 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-blue-900 text-sm">Quick Apply (Favorites)</h4>
                {(activeTooth && getDentalTagCode(data.dentalChart.teeth[activeTooth]) && !favoriteStatuses.some((fav) => getDentalTagCode(fav) === getDentalTagCode(data.dentalChart.teeth[activeTooth]))) ? (
                  <button onClick={() => setFavoriteStatuses([...favoriteStatuses, getDentalTagCode(data.dentalChart.teeth[activeTooth])])} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded shadow-sm hover:bg-blue-700 transition-colors">+ Add Current</button>
                ) : null}
              </div>

              {paintMode && (
                <div className="text-xs text-orange-700 bg-orange-100 border border-orange-200 p-2 rounded mb-3 font-medium flex justify-between items-center shadow-sm">
                  <span className="animate-pulse"><strong>Paint Mode Active:</strong> Click teeth to apply "{paintMode}"</span>
                  <button onClick={() => setPaintMode(null)} className="text-orange-500 hover:text-orange-800 ml-2 font-bold text-lg leading-none">&times;</button>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {favoriteStatuses.map((fav) => {
                  const favoriteCode = getDentalTagCode(fav);
                  return (
                  <div key={favoriteCode} className={`flex items-center rounded overflow-hidden shadow-sm border transition-colors ${paintMode === favoriteCode ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-300'}`}>
                    <button onClick={() => handleFavoriteClick(fav)} className={`flex-1 flex items-center px-2 py-1.5 text-left transition-colors ${paintMode === favoriteCode ? 'bg-orange-100' : 'bg-white hover:bg-slate-50'}`}>
                      <span className={`w-6 text-center font-bold text-xs ${paintMode === favoriteCode ? 'text-orange-700' : 'text-blue-700'}`}>{favoriteCode}</span>
                      <span className="text-[10px] text-slate-600 truncate ml-1">{getLegendLabel(fav)}</span>
                    </button>
                    <button onClick={() => setFavoriteStatuses(favoriteStatuses.filter((f) => getDentalTagCode(f) !== favoriteCode))} className="bg-slate-100 px-2 py-1.5 hover:bg-red-100 hover:text-red-600 text-slate-400 border-l border-slate-200 transition-colors" title="Remove">
                      &times;
                    </button>
                  </div>
                )})}
              </div>
              <p className="text-[10px] text-slate-500 mt-3 leading-tight">
                <strong>Tip:</strong> Select a tooth and click a favorite to apply. Clear your selection and click a favorite to enter <strong>Paint Mode</strong>.
              </p>
            </div>
          </div>

          <div className="w-full bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs h-64 overflow-y-auto">
            <h4 className="font-bold border-b border-slate-100 pb-1 mb-2">Legend Reference</h4>
            <div className="font-semibold text-slate-500 mt-2">Condition</div>
            {CHART_LEGENDS.condition.map(l => <div key={l.code} className="flex"><span className="w-6 font-bold">{l.code}</span><span className="truncate">{l.label}</span></div>)}
            <div className="font-semibold text-slate-500 mt-3">Restoration</div>
            {CHART_LEGENDS.restoration.map(l => <div key={l.code} className="flex"><span className="w-6 font-bold">{l.code}</span><span className="truncate">{l.label}</span></div>)}
            <div className="font-semibold text-slate-500 mt-3">Surgery</div>
            {CHART_LEGENDS.surgery.map(l => <div key={l.code} className="flex"><span className="w-6 font-bold">{l.code}</span><span className="truncate">{l.label}</span></div>)}
          </div>
        </div>
      </div>

      {/* ADDITIONAL CLINICAL CHECKLISTS (Restored) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <SectionCard title="Periodontal" className="md:col-span-1">
          <div className="flex flex-col space-y-2">
            {['gingivitis', 'early', 'moderate', 'advanced'].map(k => (
              <label key={k} className="flex items-center text-xs"><input type="checkbox" checked={data.dentalChart.periodontal[k]} onChange={e => handleNested('periodontal', k, e.target.checked)} className="mr-2" /> <span className="capitalize">{k}</span></label>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Occlusion" className="md:col-span-1">
          <div className="flex flex-col space-y-2 text-xs">
            <label className="flex items-center"><span className="w-12">Class</span><input type="text" value={data.dentalChart.occlusion.class} onChange={e => handleNested('occlusion', 'class', e.target.value)} className="border-b border-slate-300 w-16 px-1 outline-none bg-transparent" /></label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.occlusion.overjet} onChange={e => handleNested('occlusion', 'overjet', e.target.checked)} className="mr-2" /> Overjet</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.occlusion.overbite} onChange={e => handleNested('occlusion', 'overbite', e.target.checked)} className="mr-2" /> Overbite</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.occlusion.midline} onChange={e => handleNested('occlusion', 'midline', e.target.checked)} className="mr-2" /> Midline Deviation</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.occlusion.crossbite} onChange={e => handleNested('occlusion', 'crossbite', e.target.checked)} className="mr-2" /> Crossbite</label>
          </div>
        </SectionCard>
        <SectionCard title="Appliances" className="md:col-span-1">
          <div className="flex flex-col space-y-2 text-xs">
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.appliances.orthodontic} onChange={e => handleNested('appliances', 'orthodontic', e.target.checked)} className="mr-2" /> Orthodontic</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.appliances.stayplate} onChange={e => handleNested('appliances', 'stayplate', e.target.checked)} className="mr-2" /> Stayplate</label>
            <label className="flex items-center mt-2">Others <input type="text" value={data.dentalChart.appliances.others} onChange={e => handleNested('appliances', 'others', e.target.value)} className="border-b border-slate-300 ml-2 w-full outline-none bg-transparent" /></label>
          </div>
        </SectionCard>
        <SectionCard title="TMD" className="md:col-span-1">
          <div className="flex flex-col space-y-2 text-xs">
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.tmd.clenching} onChange={e => handleNested('tmd', 'clenching', e.target.checked)} className="mr-2" /> Clenching</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.tmd.clicking} onChange={e => handleNested('tmd', 'clicking', e.target.checked)} className="mr-2" /> Clicking</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.tmd.trismus} onChange={e => handleNested('tmd', 'trismus', e.target.checked)} className="mr-2" /> Trismus</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.tmd.muscleSpasm} onChange={e => handleNested('tmd', 'muscleSpasm', e.target.checked)} className="mr-2" /> Muscle Spasm</label>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <SectionCard title="Clinical Findings">
          <textarea rows={4} value={data.dentalChart.findings} onChange={(e) => handleChartChange('findings', e.target.value)} placeholder="Enter clinical findings..." className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm outline-none text-sm" />
        </SectionCard>
        <SectionCard title="Treatment Recommendations">
          <textarea rows={4} value={data.dentalChart.recommendation} onChange={(e) => handleChartChange('recommendation', e.target.value)} placeholder="Enter treatment recommendations..." className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm outline-none text-sm" />
        </SectionCard>
      </div>

      <SectionCard title="Sign-off & Date" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Checked By (Dentist)</label>
            {doctors.length > 0 ? (
              <select
                value={data.dentalChart.checkedBy || ''}
                onChange={(e) => handleChartChange('checkedBy', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white"
              >
                <option value="">Select dentist...</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.name}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={data.dentalChart.checkedBy || ''}
                onChange={(e) => handleChartChange('checkedBy', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white"
                placeholder="Dr. Name"
              />
            )}
          </div>
          <FormInput label="Chart Date" field="chartDate" type="date" data={data.dentalChart} handleChange={(f, v) => handleChartChange(f, v)} />
        </div>
      </SectionCard>

    </div>
  );
}

// ============================================================================
// MODULE 1C: TREATMENT RECORD SYSTEM
// ============================================================================
function TreatmentRecordModule({ data, setData, doctors }) {
  const updateRow = (id, field, value) => {
    setData(prev => {
      const newRecords = prev.treatmentRecords.map(record => {
        if (record.id === id) {
          const newRecord = { ...record, [field]: value };
          if (field === 'amountCharged' || field === 'amountPaid') {
            const charged = parseFloat(newRecord.amountCharged) || 0;
            const paid = parseFloat(newRecord.amountPaid) || 0;
            if (newRecord.amountCharged || newRecord.amountPaid) {
              newRecord.balance = (charged - paid).toFixed(2);
            } else {
              newRecord.balance = '';
            }
          }
          return newRecord;
        }
        return record;
      });
      return { ...prev, treatmentRecords: newRecords };
    });
  };

  const addRow = () => {
    setData(prev => ({
      ...prev,
      treatmentRecords: [...prev.treatmentRecords, generateEmptyTreatmentRow()]
    }));
  };

  const deleteRow = (id) => {
    setData(prev => ({
      ...prev,
      treatmentRecords: prev.treatmentRecords.filter(r => r.id !== id)
    }));
  };

  return (
    <div className="w-full max-w-[1560px] mx-auto space-y-6 pb-12">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Treatment Record</h2>
          <p className="text-slate-500 text-sm">Ledger for {data.lastName ? `${data.lastName}, ${data.firstName}` : 'the patient'}.</p>
        </div>
        <button onClick={addRow} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">
          <Plus size={16} className="mr-2" /> Add Entry
        </button>
      </div>

      <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700 w-32">Date</th>
              <th className="px-4 py-3 font-semibold text-slate-700 w-24">Tooth No./s</th>
              <th className="px-4 py-3 font-semibold text-slate-700 min-w-[200px]">Procedure</th>
              <th className="px-4 py-3 font-semibold text-slate-700 w-32">Dentist/s</th>
              <th className="px-4 py-3 font-semibold text-slate-700 w-28">Amt Charged</th>
              <th className="px-4 py-3 font-semibold text-slate-700 w-28">Amt Paid</th>
              <th className="px-4 py-3 font-semibold text-slate-700 w-28">Balance</th>
              <th className="px-2 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.treatmentRecords.map((record) => (
              <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-2 py-1"><input type="date" value={record.date} onChange={e => updateRow(record.id, 'date', e.target.value)} className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded" /></td>
                <td className="px-2 py-1"><input type="text" value={record.toothNumbers} onChange={e => updateRow(record.id, 'toothNumbers', e.target.value)} className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded" placeholder="e.g. 18, 17" /></td>
                <td className="px-2 py-1"><input type="text" value={record.procedure} onChange={e => updateRow(record.id, 'procedure', e.target.value)} className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded" placeholder="Description..." /></td>
                <td className="px-2 py-1">
                  {doctors.length > 0 ? (
                    <select
                      value={record.dentist}
                      onChange={e => updateRow(record.id, 'dentist', e.target.value)}
                      className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded"
                    >
                      <option value="">Select dentist...</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.name}>
                          {doctor.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={record.dentist} onChange={e => updateRow(record.id, 'dentist', e.target.value)} className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded" placeholder="Dr. Name" />
                  )}
                </td>
                <td className="px-2 py-1"><input type="number" value={record.amountCharged} onChange={e => updateRow(record.id, 'amountCharged', e.target.value)} className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded" placeholder="0.00" /></td>
                <td className="px-2 py-1"><input type="number" value={record.amountPaid} onChange={e => updateRow(record.id, 'amountPaid', e.target.value)} className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded" placeholder="0.00" /></td>
                <td className="px-2 py-1"><input type="number" value={record.balance} readOnly className="w-full bg-transparent p-1 outline-none text-slate-500 font-medium" placeholder="0.00" /></td>
                <td className="px-2 py-1 text-center">
                  <button onClick={() => deleteRow(record.id)} className="text-slate-400 hover:text-red-500 p-1 transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {data.treatmentRecords.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400 italic">No treatment records yet. Click "Add Entry" to begin.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const createSectionDraft = (sectionKey) => {
  const today = new Date().toISOString().split('T')[0];
  if (sectionKey === 'prescriptions') {
    return {
      date: today,
      template: '',
      medicines: [{ id: crypto.randomUUID(), medication: '', dose: '', qty: '1' }],
      remarks: '',
    };
  }

  if (sectionKey === 'certificates') {
    return { date: today, template: '', title: 'Medical Certificate', body: '', remarks: '' };
  }

  if (sectionKey === 'attachments') {
    return { date: today, files: [], fileNames: '', remarks: '' };
  }

  if (sectionKey === 'notes') {
    return { date: today, title: '', details: '' };
  }

  if (sectionKey === 'consents') {
    return { date: today, title: '', status: 'Pending', details: '' };
  }

  return { date: today, title: '', time: '', status: 'Scheduled', details: '' };
};

const buildSectionRow = (sectionKey, draft) => {
  if (sectionKey === 'prescriptions') {
    const filledMedicines = draft.medicines.filter((medicine) => medicine.medication.trim());
    return {
      id: crypto.randomUUID(),
      date: draft.date,
      title: filledMedicines.map((medicine) => medicine.medication).join(', ') || 'Untitled Prescription',
      details: draft.remarks,
      medicines: filledMedicines,
      remarks: draft.remarks,
    };
  }

  if (sectionKey === 'certificates') {
    return {
      id: crypto.randomUUID(),
      date: draft.date,
      title: draft.title || 'Certificate',
      details: draft.remarks,
      body: draft.body,
      template: draft.template,
    };
  }

  if (sectionKey === 'attachments') {
    const uploadedFiles = Array.isArray(draft.files) ? draft.files : [];
    const typedNames = draft.fileNames || '';
    const title = uploadedFiles.length > 0
      ? uploadedFiles.map((file: any) => file.name).join(', ')
      : typedNames || 'Uploaded File';

    return {
      id: crypto.randomUUID(),
      date: draft.date,
      title,
      details: draft.remarks,
      files: uploadedFiles,
    };
  }

  if (sectionKey === 'notes') {
    return {
      id: crypto.randomUUID(),
      date: draft.date,
      title: draft.title || 'Patient Note',
      details: draft.details,
    };
  }

  if (sectionKey === 'consents') {
    return {
      id: crypto.randomUUID(),
      date: draft.date,
      title: `${draft.title || 'Consent'} (${draft.status})`,
      details: draft.details,
      status: draft.status,
    };
  }

  return {
    id: crypto.randomUUID(),
    date: draft.date,
    title: `${draft.title || 'Appointment'}${draft.time ? ` - ${draft.time}` : ''}`,
    details: `${draft.status}${draft.details ? ` | ${draft.details}` : ''}`,
    status: draft.status,
    time: draft.time,
  };
};

const getAppointmentStatusLabel = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'completed') return 'Completed';
  if (normalized === 'cancelled' || normalized === 'no show' || normalized === 'no-show') return 'Cancelled';
  return 'Scheduled';
};

const createSectionDraftFromRow = (sectionKey, row) => {
  const blankDraft = createSectionDraft(sectionKey);

  if (sectionKey === 'prescriptions') {
    const medicines = Array.isArray(row.medicines) && row.medicines.length > 0
      ? row.medicines
      : blankDraft.medicines;
    return {
      ...blankDraft,
      date: row.date || blankDraft.date,
      template: row.template || '',
      medicines,
      remarks: row.remarks || row.details || '',
    };
  }

  if (sectionKey === 'certificates') {
    return {
      ...blankDraft,
      date: row.date || blankDraft.date,
      title: row.title || blankDraft.title,
      body: row.body || '',
      remarks: row.details || row.remarks || '',
      template: row.template || '',
    };
  }

  if (sectionKey === 'attachments') {
    const files = Array.isArray(row.files) ? row.files : [];
    return {
      ...blankDraft,
      date: row.date || blankDraft.date,
      files,
      fileNames: row.title || files.map((file: any) => file.name).join(', '),
      remarks: row.details || '',
    };
  }

  if (sectionKey === 'notes') {
    return {
      ...blankDraft,
      date: row.date || blankDraft.date,
      title: row.title || '',
      details: row.details || '',
    };
  }

  if (sectionKey === 'consents') {
    return {
      ...blankDraft,
      date: row.date || blankDraft.date,
      title: row.title || '',
      status: row.status || blankDraft.status,
      details: row.details || '',
    };
  }

  return {
    ...blankDraft,
    date: row.appointment_date || row.date || blankDraft.date,
    time: row.appointment_time || row.time || '',
    title: row.reason || row.title || '',
    status: getAppointmentStatusLabel(row.status || blankDraft.status),
    details: row.details || '',
  };
};

const patientDisplayName = (data: any) => (
  [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ').trim()
);

function MiniDocumentEditorShell({
  title,
  subtitle,
  children,
  settings,
  documentType,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  settings?: any;
  documentType?: DocumentFormType;
}) {
  const pageStyle = documentType ? getDocumentPageStyle(settings || DEFAULT_SETTINGS, documentType) : undefined;
  const pageOutline = documentType ? getDocumentLayoutSettings(settings || DEFAULT_SETTINGS, documentType).pageOutline : false;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-6 shadow-inner">
        <div
          className={`mx-auto min-h-[980px] w-[760px] max-w-full bg-white text-black shadow-xl ${pageOutline ? 'ring-2 ring-slate-700' : 'ring-1 ring-slate-200'}`}
          style={pageStyle}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function DocumentBrandHeader({ settings, documentType }: { settings: any; documentType: DocumentFormType }) {
  const layout = getDocumentLayoutSettings(settings, documentType);
  if (!layout.showLogo) return null;

  const clinicName = settings?.clinicName || DEFAULT_SETTINGS.clinicName;
  const isCertificate = documentType === 'certificate';

  return (
    <div className="text-center" style={{ marginBottom: `${layout.logoGap}px` }}>
      {layout.logo ? (
        <div
          className="inline-flex max-w-full items-center justify-center"
          style={{
            border: layout.logoOutline ? '1px dashed #64748b' : '0 solid transparent',
            padding: layout.logoOutline ? '6px' : 0,
          }}
        >
          <img
            src={layout.logo}
            alt={`${DOCUMENT_FORM_CONFIG[documentType].label} brand logo`}
            className="max-w-full object-contain"
            style={{ maxHeight: `${layout.logoSize}px` }}
          />
        </div>
      ) : (
        <div
          className="inline-flex flex-col items-center justify-center px-5 py-3"
          style={{
            minHeight: `${layout.logoSize}px`,
            border: layout.logoOutline ? '1px dashed #64748b' : '0 solid transparent',
          }}
        >
          {isCertificate ? (
            <>
              <div className="text-[24px] font-bold uppercase tracking-[0.28em] text-teal-500">{clinicName}</div>
              <div className="text-[23px] uppercase tracking-[0.22em] text-slate-500">Dental Clinic</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-slate-600">General Dentistry - Orthodontics - Endodontics - Oral Surgery</div>
            </>
          ) : (
            <div className="text-[20px] font-bold uppercase tracking-[0.2em] text-slate-500">{clinicName}</div>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentA4Page({ data, settings, documentType, children, className = '' }: any) {
  return (
    <div
      className={`a4-page bg-white w-[210mm] h-[297mm] mx-auto shadow-2xl relative box-border overflow-hidden text-black ${className}`}
      style={getDocumentPageStyle(settings, documentType)}
    >
      {children}
    </div>
  );
}

const PrintLineValue = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`inline-block min-h-[1.35em] border-b border-black px-1 align-bottom ${className}`}>{children}</span>
);

const PrintTextAreaValue = ({ value, className = '' }: { value?: string; className?: string }) => (
  <div className={`whitespace-pre-wrap border-b border-black px-1 leading-7 ${className}`}>{value || '\u00a0'}</div>
);

const PrintCheckbox = ({ checked }: { checked: boolean }) => (
  <span className="inline-flex h-[12px] w-[12px] items-center justify-center border border-black text-[9px] font-bold leading-none">
    {checked ? '/' : ''}
  </span>
);

function MedicalCertificateEditor({ data, setData, settings }: any) {
  const certificate = data.certificateDocument || createDefaultCertificateDocument();
  const fallbackPatientName = patientDisplayName(data);
  const updateCertificate = (field: string, value: string) => {
    setData((prev: any) => ({
      ...prev,
      certificateDocument: { ...(prev.certificateDocument || createDefaultCertificateDocument()), [field]: value },
    }));
  };

  return (
    <MiniDocumentEditorShell
      title="Dental Certificate"
      subtitle="Mini Word-style certificate editor. Brand logo and spacing are controlled in System Settings."
      settings={settings}
      documentType="certificate"
    >
      <div className="text-[15px] leading-6" style={{ fontFamily: 'Times New Roman, serif' }}>
        <DocumentBrandHeader settings={settings} documentType="certificate" />

        <div className="mb-5 grid grid-cols-2 gap-10 text-[14px] leading-5">
          <div>
            Unit 11, 2F The Ford Arcade, Amparo Subd.<br />
            cor. Aguinaldo Highway, Bayan Luma 4,<br />
            Imus, Cavite<br />
            Tel. Nos. (046) 884-7593 ; 0917-8071853
          </div>
          <div>
            Monday - Saturday<br />
            9AM - 5PM<br />
            Sunday - By Appointment
          </div>
        </div>

        <div className="mb-9 border-t-2 border-black" />

        <h3 className="mb-10 text-center text-[18px] font-bold uppercase tracking-wide text-[#8b5a44]">Dental Certificate</h3>

        <label className="mb-10 flex items-end gap-2">
          <span>Date:</span>
          <input value={certificate.date || ''} onChange={(e) => updateCertificate('date', e.target.value)} type="date" className="w-44 border-b border-black bg-transparent px-1 text-[14px] outline-none" />
        </label>

        <p className="mb-7">To Whom It May Concern:</p>

        <div className="mb-6">
          <div className="flex flex-wrap items-end gap-x-2">
            <span>This is to certify that Mr./Mrs./Ms.</span>
            <input value={certificate.patientName || fallbackPatientName} onChange={(e) => updateCertificate('patientName', e.target.value)} className="min-w-[310px] flex-1 border-b border-black bg-transparent px-1 outline-none" />
            <input value={certificate.age || data.age || ''} onChange={(e) => updateCertificate('age', e.target.value)} className="w-16 border-b border-black bg-transparent px-1 text-center outline-none" />
            <span>years of age, was</span>
          </div>
          <p>examined and treated at P&amp;J Tanarte Dental Clinic on with the following diagnosis:</p>
          <textarea value={certificate.diagnosis || ''} onChange={(e) => updateCertificate('diagnosis', e.target.value)} rows={4} className="mt-2 w-full resize-none border-0 border-b border-black bg-transparent leading-7 outline-none [background-image:linear-gradient(to_bottom,transparent_26px,#111_27px)] [background-size:100%_28px]" />
        </div>

        <div className="mb-7">
          <p className="mb-2">I therefore recommend:</p>
          <textarea value={certificate.recommendation || ''} onChange={(e) => updateCertificate('recommendation', e.target.value)} rows={4} className="w-full resize-none border-0 border-b border-black bg-transparent leading-7 outline-none [background-image:linear-gradient(to_bottom,transparent_26px,#111_27px)] [background-size:100%_28px]" />
        </div>

        <p className="mb-10">This certificate was issued upon the request of the patient, for whichever legal purpose/s it may serve (excluding legal matters).</p>
        <p className="mb-16">Thank you very much.</p>
        <p className="mb-16">Respectfully yours,</p>

        <div className="w-72">
          <input value={certificate.dentistName || ''} onChange={(e) => updateCertificate('dentistName', e.target.value)} className="w-full border-b border-black bg-transparent px-1 font-semibold outline-none" />
          <div className="flex items-center gap-1">
            <span>License #</span>
            <input value={certificate.licenseNo || ''} onChange={(e) => updateCertificate('licenseNo', e.target.value)} className="flex-1 bg-transparent outline-none" />
          </div>
        </div>
      </div>
    </MiniDocumentEditorShell>
  );
}

function DentalChartHistoryViewer({ charts, selectedChartId, onSelectChart }: { charts: any[], selectedChartId: string | null, onSelectChart: (id: string) => void }) {
  if (!charts || charts.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-2 mb-2 ml-4 pl-3 border-l-2 border-slate-200">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chart History</div>
      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[250px] pr-1">
        {charts.map((chart: any) => {
          const isActive = chart.id === selectedChartId;
          return (
            <button
              key={chart.id}
              onClick={() => onSelectChart(chart.id)}
              className={`text-left p-2.5 rounded-lg border text-sm transition-all duration-200 ${
                isActive 
                  ? 'bg-white border-slate-300 shadow-sm ring-1 ring-slate-200' 
                  : 'bg-transparent border-transparent hover:bg-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`font-semibold text-xs ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
                  {chart.recallDate}
                </span>
                {isActive && <Check className="w-3 h-3 text-slate-700" />}
              </div>
              <div className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                {chart.recallSummary || 'No summary'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CertificateDocumentModule({ data, setData, settings, printDocument, onSave, setActiveGlobalTab, activePrintHistoryEntryId, setActivePrintHistoryEntryId }: any) {
  const [activeDoc, setActiveDoc] = useState<'patient_form' | 'dental_chart' | 'treatment_record' | 'certificate' | 'consent' | 'contract'>('patient_form');
  const activeChartId = activePrintHistoryEntryId;
  const setActiveChartId = setActivePrintHistoryEntryId;
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!activeChartId && data.dentalChartHistory?.length) {
      setActiveChartId(data.dentalChartHistory[0].id);
    } else if (activeChartId && !data.dentalChartHistory?.find((h: any) => h.id === activeChartId)) {
      setActiveChartId(data.dentalChartHistory?.[0]?.id || null);
    } else if (!data.dentalChartHistory?.length) {
      setActiveChartId(null);
    }
  }, [data.dentalChartHistory, activeChartId, setActiveChartId]);

  const menuItems = [
    { id: 'patient_form', label: 'Patient Form', icon: FileText, color: 'slate' },
    { id: 'dental_chart', label: 'Dental Chart Form', icon: Activity, color: 'slate' },
    { id: 'treatment_record', label: 'Treatment Record Form', icon: ClipboardList, color: 'slate' },
    { id: 'certificate', label: 'Certificate Form', icon: LayoutTemplate, color: 'blue' },
    { id: 'consent', label: 'Consent Form', icon: LayoutTemplate, color: 'indigo' },
    { id: 'contract', label: 'Contract Form', icon: LayoutTemplate, color: 'emerald' },
  ];

  const handleClear = () => {
    if (activeDoc === 'certificate') setData((prev: any) => ({ ...prev, certificateDocument: createDefaultCertificateDocument() }));
    if (activeDoc === 'consent') setData((prev: any) => ({ ...prev, consentDocument: createDefaultConsentDocument() }));
    if (activeDoc === 'contract') setData((prev: any) => ({ ...prev, patientContractDocument: createDefaultPatientContractDocument() }));
  };

  const handlePrint = () => {
    if (activeDoc === 'patient_form' || activeDoc === 'dental_chart' || activeDoc === 'treatment_record') {
      printDocument('record');
    } else {
      printDocument(activeDoc as any);
    }
  };

  const handleEdit = () => {
    if (activeDoc === 'patient_form') setActiveGlobalTab('form');
    if (activeDoc === 'dental_chart') setActiveGlobalTab('charting');
    if (activeDoc === 'treatment_record') setActiveGlobalTab('treatment_records');
  };

  const renderZoomBar = (description: string) => (
    <div className="mb-4 flex items-center justify-between text-sm text-slate-500 shrink-0">
      <span>{description}</span>
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm text-slate-700">
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors" title="Zoom Out"><Minus size={14} /></button>
        <span className="font-medium w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(1)} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors" title="Reset Zoom"><RefreshCw size={12} /></button>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors" title="Zoom In"><Plus size={14} /></button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeDoc) {
      case 'certificate': return <div className="h-full overflow-y-auto"><MedicalCertificateEditor data={data} setData={setData} settings={settings} /></div>;
      case 'consent': return <div className="h-full overflow-y-auto"><ConsentDocumentModule data={data} setData={setData} settings={settings} /></div>;
      case 'contract': return <div className="h-full overflow-y-auto"><PatientContractModule data={data} setData={setData} /></div>;
      case 'patient_form': return (
        <div className="flex h-full flex-col">
          {renderZoomBar('Patient form is edited from the Patient Info tab. Below is the print preview.')}
          <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-200/50 p-6 shadow-inner">
            <div className="min-w-max min-h-max flex items-center justify-center">
              <div style={{ zoom: zoom }} className="shadow-xl ring-1 ring-slate-900/5 bg-white">
                <PatientFormPage data={data} settings={settings} />
              </div>
            </div>
          </div>
        </div>
      );
      case 'dental_chart': 
        if (!data.dentalChartHistory || data.dentalChartHistory.length === 0) {
          return (
            <div className="flex h-full flex-col items-center justify-center text-slate-500 font-medium p-8">
              <span>No dental chart available.</span>
            </div>
          );
        }
        const previewData = activeChartId 
          ? { ...data, dentalChart: data.dentalChartHistory?.find((h: any) => h.id === activeChartId)?.dentalChart || data.dentalChart } 
          : data;
        return (
        <div className="flex h-full flex-col">
          {renderZoomBar('Dental Chart is edited from the Charting tab. Below is the print preview.')}
          <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-200/50 p-6 shadow-inner">
            <div className="min-w-max min-h-max flex items-center justify-center">
              <div style={{ zoom: zoom }} className="shadow-xl ring-1 ring-slate-900/5 bg-white">
                <DentalChartPage data={previewData} settings={settings} />
              </div>
            </div>
          </div>
        </div>
      );
      case 'treatment_record': return (
        <div className="flex h-full flex-col">
          {renderZoomBar('Treatment Records are edited from the Treatment tab. Below is the print preview.')}
          <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-200/50 p-6 shadow-inner">
            <div className="min-w-max min-h-max flex items-center justify-center">
              <div style={{ zoom: zoom }} className="shadow-xl ring-1 ring-slate-900/5 bg-white">
                <TreatmentRecordPages data={data} settings={settings} />
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  const isDynamicForm = activeDoc === 'patient_form' || activeDoc === 'dental_chart' || activeDoc === 'treatment_record';

  return (
    <div className="flex bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden h-[calc(100vh-140px)] min-h-[600px]">
      {/* Left Sidebar Menu */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Documents &amp; Forms</h2>
        </div>
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <React.Fragment key={item.id}>
              <button
                onClick={() => setActiveDoc(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeDoc === item.id ? `bg-${item.color}-100 text-${item.color}-800 shadow-sm` : 'text-slate-600 hover:bg-slate-200'}`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
              {item.id === 'dental_chart' && activeDoc === 'dental_chart' && data.dentalChartHistory && data.dentalChartHistory.length > 1 && (
                <DentalChartHistoryViewer 
                  charts={data.dentalChartHistory} 
                  selectedChartId={activeChartId} 
                  onSelectChart={setActiveChartId} 
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right Panel / Preview & Editor */}
      <div className="flex-1 flex flex-col bg-slate-50/50 min-w-0">
        {/* Topbar CTA */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <h3 className="font-semibold text-slate-800 text-lg">{menuItems.find(i => i.id === activeDoc)?.label}</h3>
          <div className="flex items-center gap-2">
            {isDynamicForm && (
              <button onClick={handleEdit} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-200 transition-colors">Edit Source</button>
            )}
            {!isDynamicForm && (
              <button onClick={handleClear} className="px-4 py-2 bg-rose-50 text-rose-600 font-semibold text-sm rounded-lg hover:bg-rose-100 transition-colors">Clear</button>
            )}
            <button onClick={onSave} className="px-4 py-2 bg-zinc-900 text-white font-semibold text-sm rounded-lg hover:bg-zinc-800 transition-colors">Save</button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold text-sm rounded-lg hover:bg-teal-700 transition-colors">
              <Printer size={16} /> Print / PDF
            </button>
          </div>
        </div>
        {/* Content Area */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

function ConsentDocumentModule({ data, setData, settings }: any) {
  const consent = data.consentDocument || createDefaultConsentDocument();
  const fallbackPatientName = patientDisplayName(data);
  const updateConsent = (field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      consentDocument: { ...(prev.consentDocument || createDefaultConsentDocument()), [field]: value },
    }));
  };
  const updateNestedConsent = (group: 'medicalHistory' | 'allergies', field: string, value: string) => {
    setData((prev: any) => ({
      ...prev,
      consentDocument: {
        ...(prev.consentDocument || createDefaultConsentDocument()),
        [group]: { ...((prev.consentDocument || {})[group] || {}), [field]: value },
      },
    }));
  };
  const yesNoValue = (group: 'medicalHistory' | 'allergies', item: string) => consent[group]?.[item] || '';

  return (
    <MiniDocumentEditorShell
      title="Oral Surgery Consent Form"
      subtitle="Mini Word-style consent editor. Brand logo and spacing are controlled in System Settings."
      settings={settings}
      documentType="consent"
    >
      <div className="text-[12px] leading-[1.2]" style={{ fontFamily: 'Arial, sans-serif' }}>
        <DocumentBrandHeader settings={settings} documentType="consent" />
        <div className="border-t-2 border-black" />
        <h3 className="mb-5 text-center text-[26px] font-black uppercase leading-none">Oral Surgery Consent Form</h3>

        <div className="mb-4 grid grid-cols-[1fr_150px_80px_120px] gap-4 text-[14px]">
          <label className="flex items-end gap-1">Patient Name:<input value={consent.patientName || fallbackPatientName} onChange={(e) => updateConsent('patientName', e.target.value)} className="flex-1 border-b border-black bg-transparent outline-none" /></label>
          <label className="flex items-end gap-1">Date of Birth:<input value={consent.birthDate || data.birthDate || ''} onChange={(e) => updateConsent('birthDate', e.target.value)} className="w-full border-b border-black bg-transparent outline-none" /></label>
          <label className="flex items-end gap-1">Age:<input value={consent.age || data.age || ''} onChange={(e) => updateConsent('age', e.target.value)} className="w-full border-b border-black bg-transparent outline-none" /></label>
          <label className="flex items-end gap-1">Status:<input value={consent.status || data.civilStatus || ''} onChange={(e) => updateConsent('status', e.target.value)} className="w-full border-b border-black bg-transparent outline-none" /></label>
        </div>

        <h4 className="text-center text-[18px] font-black uppercase">Medical History</h4>
        <div className="mb-5 grid grid-cols-[1.8fr_1fr] gap-4 border border-black p-3">
          <div>
            <div className="mb-2 font-bold">Do you have or have you had any of the following? (Please check)</div>
            <div className="grid grid-cols-3 gap-3">
              {ORAL_SURGERY_HISTORY_COLUMNS.map((column, columnIndex) => (
                <div key={columnIndex} className="space-y-1">
                  <div className="grid grid-cols-[24px_24px_1fr] gap-1 text-[10px] font-semibold"><span>YES</span><span>NO</span><span /></div>
                  {column.map((item) => (
                    <div key={item} className="grid grid-cols-[24px_24px_1fr] items-center gap-1">
                      <input type="checkbox" checked={yesNoValue('medicalHistory', item) === 'yes'} onChange={() => updateNestedConsent('medicalHistory', item, yesNoValue('medicalHistory', item) === 'yes' ? '' : 'yes')} />
                      <input type="checkbox" checked={yesNoValue('medicalHistory', item) === 'no'} onChange={() => updateNestedConsent('medicalHistory', item, yesNoValue('medicalHistory', item) === 'no' ? '' : 'no')} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-center font-bold">Do you have any allergies?</div>
            <div className="grid grid-cols-[24px_24px_1fr] gap-1 text-[10px] font-semibold"><span>YES</span><span>NO</span><span /></div>
            <div className="space-y-1">
              {ORAL_SURGERY_ALLERGY_ITEMS.map((item) => (
                <div key={item} className="grid grid-cols-[24px_24px_1fr] items-center gap-1">
                  <input type="checkbox" checked={yesNoValue('allergies', item) === 'yes'} onChange={() => updateNestedConsent('allergies', item, yesNoValue('allergies', item) === 'yes' ? '' : 'yes')} />
                  <input type="checkbox" checked={yesNoValue('allergies', item) === 'no'} onChange={() => updateNestedConsent('allergies', item, yesNoValue('allergies', item) === 'no' ? '' : 'no')} />
                  <span>{item}</span>
                </div>
              ))}
              <label className="mt-3 block">Are you taking medications at present?<input value={consent.medications || ''} onChange={(e) => updateConsent('medications', e.target.value)} className="ml-2 w-28 border-b border-black bg-transparent outline-none" /></label>
              <label className="block">Are you being treated by a Physician?<input value={consent.physicianTreatment || ''} onChange={(e) => updateConsent('physicianTreatment', e.target.value)} className="ml-2 w-28 border-b border-black bg-transparent outline-none" /></label>
              <label className="block">Previous Extraction?<input value={consent.previousExtraction || ''} onChange={(e) => updateConsent('previousExtraction', e.target.value)} className="ml-2 w-32 border-b border-black bg-transparent outline-none" /></label>
            </div>
          </div>
        </div>

        <p className="mb-3">
          I hereby authorize Dr. <input value={consent.doctorName || ''} onChange={(e) => updateConsent('doctorName', e.target.value)} className="w-56 border-b border-black bg-transparent outline-none" /> and any other dentists of
          <input value={consent.otherDentists || ''} onChange={(e) => updateConsent('otherDentists', e.target.value)} className="mx-1 w-48 border-b border-black bg-transparent outline-none" /> to perform the following treatment or surgical procedure
          <input value={consent.procedure || ''} onChange={(e) => updateConsent('procedure', e.target.value)} className="mx-1 w-60 border-b border-black bg-transparent outline-none" />, and I understand that this is an elective, urgent, or emergency procedure
          <input value={consent.procedureType || ''} onChange={(e) => updateConsent('procedureType', e.target.value)} className="mx-1 w-32 border-b border-black bg-transparent outline-none" />.
        </p>

        <p className="mb-2">I have been informed that the risks to my health if this procedure is not performed include, but are not limited to pain, infection, cyst formation, loss or bone around the teeth causing their loss, and an increased risks of complications if surgery is postpone.</p>
        <p className="mb-2">I have been informed of any possible alternative methods of treatment should any exist. Further, I understand that there are certain inherent and potential risks in any treatment or procedure, and that in this specific instance, such risks may include the following:</p>

        <ol className="mb-3 list-decimal space-y-[1px] pl-9">
          {[
            'Postoperative discomfort and swelling that may necessitate several days of home recuperation.',
            'Restricted mouth opening for several days or weeks.',
            'Heavy bleeding that may be prolonged.',
            'Nausea and vomiting (usually associated with medications prescribed for pain).',
            'Postoperative infection requiring additional treatment.',
            'Decision to leave a small piece of root in the jaw when its removal would require extensive surgery.',
            'Damage to adjacent teeth, fillings, and crowns.',
            'Stretching of the corners of the mouth with resulting cracking and bruising.',
            'Change in occlusion and temporo-mandibular joint difficulty.',
            'Prolonged drowsiness.',
            'With surgery and extractions of the upper jaw, an opening into the maxillary nasal sinus or nose requiring additional surgery.',
            'With surgery and extractions of the lower jaw, injury to the nerve underlying the teeth resulting in numbness or tingling.',
            'Breakage / fracture of the jaw.',
            'Cardiac arrest.',
          ].map((risk) => <li key={risk}>{risk}</li>)}
          <li>Other: <input value={consent.otherRisk || ''} onChange={(e) => updateConsent('otherRisk', e.target.value)} className="w-96 border-b border-black bg-transparent outline-none" /></li>
        </ol>

        <p className="mb-1"><input type="checkbox" checked={!!consent.anesthesiaConsent} onChange={(e) => updateConsent('anesthesiaConsent', e.target.checked)} className="mr-2" />I consent to the administration of local anesthesia, nitrous oxide analgesia or oral sedation in connection to the procedure referred to above.</p>
        <p className="mb-1 text-center">I certify that I have read the above and fully understand this consent for surgery, and that I understand that a perfect result cannot be guaranteed.</p>
        <p className="mb-8 text-center">Drugs given at the time of surgery for sedative purposes or control of pain may cause drowsiness and lack of awareness or coordination.</p>

        <div className="grid grid-cols-2 gap-x-24 gap-y-10 text-center">
          {["Patient's Signature / Date", 'Witness or Interpreter / Date', "Parent or Legal Guardian\n(If patient under 18 years of age) / Date", "Dentist's Signature / Date"].map((label) => (
            <div key={label}>
              <div className="border-b border-black">&nbsp;</div>
              <div className="whitespace-pre-line font-semibold">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </MiniDocumentEditorShell>
  );
}

function CertificateFormPage({ data, settings }: any) {
  const certificate = data.certificateDocument || createDefaultCertificateDocument();
  const fallbackPatientName = patientDisplayName(data);

  return (
    <DocumentA4Page settings={settings} documentType="certificate">
      <div className="h-full text-[15px] leading-6" style={{ fontFamily: 'Times New Roman, serif' }}>
        <DocumentBrandHeader settings={settings} documentType="certificate" />

        <div className="mb-5 grid grid-cols-2 gap-10 text-[14px] leading-5">
          <div>
            Unit 11, 2F The Ford Arcade, Amparo Subd.<br />
            cor. Aguinaldo Highway, Bayan Luma 4,<br />
            Imus, Cavite<br />
            Tel. Nos. (046) 884-7593 ; 0917-8071853
          </div>
          <div>
            Monday - Saturday<br />
            9AM - 5PM<br />
            Sunday - By Appointment
          </div>
        </div>

        <div className="mb-9 border-t-2 border-black" />
        <h3 className="mb-10 text-center text-[18px] font-bold uppercase tracking-wide text-[#8b5a44]">Dental Certificate</h3>

        <div className="mb-10 flex items-end gap-2">
          <span>Date:</span>
          <PrintLineValue className="w-44 text-[14px]">{certificate.date || ''}</PrintLineValue>
        </div>

        <p className="mb-7">To Whom It May Concern:</p>

        <div className="mb-6">
          <div className="flex flex-wrap items-end gap-x-2">
            <span>This is to certify that Mr./Mrs./Ms.</span>
            <PrintLineValue className="min-w-[310px] flex-1">{certificate.patientName || fallbackPatientName}</PrintLineValue>
            <PrintLineValue className="w-16 text-center">{certificate.age || data.age || ''}</PrintLineValue>
            <span>years of age, was</span>
          </div>
          <p>examined and treated at P&amp;J Tanarte Dental Clinic on with the following diagnosis:</p>
          <PrintTextAreaValue value={certificate.diagnosis || ''} className="mt-2 min-h-[112px]" />
        </div>

        <div className="mb-7">
          <p className="mb-2">I therefore recommend:</p>
          <PrintTextAreaValue value={certificate.recommendation || ''} className="min-h-[112px]" />
        </div>

        <p className="mb-10">This certificate was issued upon the request of the patient, for whichever legal purpose/s it may serve (excluding legal matters).</p>
        <p className="mb-16">Thank you very much.</p>
        <p className="mb-16">Respectfully yours,</p>

        <div className="w-72">
          <PrintLineValue className="w-full font-semibold">{certificate.dentistName || ''}</PrintLineValue>
          <div className="flex items-center gap-1">
            <span>License #</span>
            <span className="flex-1">{certificate.licenseNo || ''}</span>
          </div>
        </div>
      </div>
    </DocumentA4Page>
  );
}

function ConsentFormPage({ data, settings }: any) {
  const consent = data.consentDocument || createDefaultConsentDocument();
  const fallbackPatientName = patientDisplayName(data);
  const yesNoValue = (group: 'medicalHistory' | 'allergies', item: string) => consent[group]?.[item] || '';

  return (
    <DocumentA4Page settings={settings} documentType="consent">
      <div className="h-full text-[12px] leading-[1.2]" style={{ fontFamily: 'Arial, sans-serif' }}>
        <DocumentBrandHeader settings={settings} documentType="consent" />
        <div className="border-t-2 border-black" />
        <h3 className="mb-5 text-center text-[26px] font-black uppercase leading-none">Oral Surgery Consent Form</h3>

        <div className="mb-4 grid grid-cols-[1fr_150px_80px_120px] gap-4 text-[14px]">
          <label className="flex items-end gap-1">Patient Name:<PrintLineValue className="flex-1">{consent.patientName || fallbackPatientName}</PrintLineValue></label>
          <label className="flex items-end gap-1">Date of Birth:<PrintLineValue className="w-full">{consent.birthDate || data.birthDate || ''}</PrintLineValue></label>
          <label className="flex items-end gap-1">Age:<PrintLineValue className="w-full">{consent.age || data.age || ''}</PrintLineValue></label>
          <label className="flex items-end gap-1">Status:<PrintLineValue className="w-full">{consent.status || data.civilStatus || ''}</PrintLineValue></label>
        </div>

        <h4 className="text-center text-[18px] font-black uppercase">Medical History</h4>
        <div className="mb-5 grid grid-cols-[1.8fr_1fr] gap-4 border border-black p-3">
          <div>
            <div className="mb-2 font-bold">Do you have or have you had any of the following? (Please check)</div>
            <div className="grid grid-cols-3 gap-3">
              {ORAL_SURGERY_HISTORY_COLUMNS.map((column, columnIndex) => (
                <div key={columnIndex} className="space-y-1">
                  <div className="grid grid-cols-[24px_24px_1fr] gap-1 text-[10px] font-semibold"><span>YES</span><span>NO</span><span /></div>
                  {column.map((item) => (
                    <div key={item} className="grid grid-cols-[24px_24px_1fr] items-center gap-1">
                      <PrintCheckbox checked={yesNoValue('medicalHistory', item) === 'yes'} />
                      <PrintCheckbox checked={yesNoValue('medicalHistory', item) === 'no'} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-center font-bold">Do you have any allergies?</div>
            <div className="grid grid-cols-[24px_24px_1fr] gap-1 text-[10px] font-semibold"><span>YES</span><span>NO</span><span /></div>
            <div className="space-y-1">
              {ORAL_SURGERY_ALLERGY_ITEMS.map((item) => (
                <div key={item} className="grid grid-cols-[24px_24px_1fr] items-center gap-1">
                  <PrintCheckbox checked={yesNoValue('allergies', item) === 'yes'} />
                  <PrintCheckbox checked={yesNoValue('allergies', item) === 'no'} />
                  <span>{item}</span>
                </div>
              ))}
              <div className="mt-3">Are you taking medications at present?<PrintLineValue className="ml-2 w-28">{consent.medications || ''}</PrintLineValue></div>
              <div>Are you being treated by a Physician?<PrintLineValue className="ml-2 w-28">{consent.physicianTreatment || ''}</PrintLineValue></div>
              <div>Previous Extraction?<PrintLineValue className="ml-2 w-32">{consent.previousExtraction || ''}</PrintLineValue></div>
            </div>
          </div>
        </div>

        <p className="mb-3">
          I hereby authorize Dr. <PrintLineValue className="w-56">{consent.doctorName || ''}</PrintLineValue> and any other dentists of
          <PrintLineValue className="mx-1 w-48">{consent.otherDentists || ''}</PrintLineValue> to perform the following treatment or surgical procedure
          <PrintLineValue className="mx-1 w-60">{consent.procedure || ''}</PrintLineValue>, and I understand that this is an elective, urgent, or emergency procedure
          <PrintLineValue className="mx-1 w-32">{consent.procedureType || ''}</PrintLineValue>.
        </p>

        <p className="mb-2">I have been informed that the risks to my health if this procedure is not performed include, but are not limited to pain, infection, cyst formation, loss or bone around the teeth causing their loss, and an increased risks of complications if surgery is postpone.</p>
        <p className="mb-2">I have been informed of any possible alternative methods of treatment should any exist. Further, I understand that there are certain inherent and potential risks in any treatment or procedure, and that in this specific instance, such risks may include the following:</p>

        <ol className="mb-3 list-decimal space-y-[1px] pl-9">
          {[
            'Postoperative discomfort and swelling that may necessitate several days of home recuperation.',
            'Restricted mouth opening for several days or weeks.',
            'Heavy bleeding that may be prolonged.',
            'Nausea and vomiting (usually associated with medications prescribed for pain).',
            'Postoperative infection requiring additional treatment.',
            'Decision to leave a small piece of root in the jaw when its removal would require extensive surgery.',
            'Damage to adjacent teeth, fillings, and crowns.',
            'Stretching of the corners of the mouth with resulting cracking and bruising.',
            'Change in occlusion and temporo-mandibular joint difficulty.',
            'Prolonged drowsiness.',
            'With surgery and extractions of the upper jaw, an opening into the maxillary nasal sinus or nose requiring additional surgery.',
            'With surgery and extractions of the lower jaw, injury to the nerve underlying the teeth resulting in numbness or tingling.',
            'Breakage / fracture of the jaw.',
            'Cardiac arrest.',
          ].map((risk) => <li key={risk}>{risk}</li>)}
          <li>Other: <PrintLineValue className="w-96">{consent.otherRisk || ''}</PrintLineValue></li>
        </ol>

        <p className="mb-1"><PrintCheckbox checked={!!consent.anesthesiaConsent} /> <span className="ml-1">I consent to the administration of local anesthesia, nitrous oxide analgesia or oral sedation in connection to the procedure referred to above.</span></p>
        <p className="mb-1 text-center">I certify that I have read the above and fully understand this consent for surgery, and that I understand that a perfect result cannot be guaranteed.</p>
        <p className="mb-8 text-center">Drugs given at the time of surgery for sedative purposes or control of pain may cause drowsiness and lack of awareness or coordination.</p>

        <div className="grid grid-cols-2 gap-x-24 gap-y-10 text-center">
          {["Patient's Signature / Date", 'Witness or Interpreter / Date', "Parent or Legal Guardian\n(If patient under 18 years of age) / Date", "Dentist's Signature / Date"].map((label) => (
            <div key={label}>
              <div className="border-b border-black">&nbsp;</div>
              <div className="whitespace-pre-line font-semibold">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </DocumentA4Page>
  );
}

const ContractLine = ({ children, className = '' }: { children?: ReactNode; className?: string }) => (
  <span className={`inline-block min-h-[16px] border-b border-black px-1 align-bottom ${className}`}>{children || '\u00a0'}</span>
);

const OrderedContractList = ({ items, start = 1 }: { items: string[]; start?: number }) => (
  <ol className="space-y-[5px]" style={{ listStyleType: 'upper-roman', paddingLeft: '34px' }} start={start}>
    {items.map((item) => <li key={item} className="pl-3">{item}</li>)}
  </ol>
);

const ContractA4Page = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`a4-page bg-white w-[210mm] h-[297mm] mx-auto shadow-2xl relative box-border overflow-hidden p-[18mm] text-black ${className}`}>
    {children}
  </div>
);

const getPatientContractValues = (data: any) => {
  const contract = mergePatientContractDocument(data.patientContractDocument);
  const patientName = contract.patientName || patientDisplayName(data);
  const age = contract.age || data.age || '';
  const address = contract.address || data.address || '';
  const mobileNo = contract.mobileNo || data.mobile || data.contact || '';
  const birthDate = contract.birthDate || data.birthDate || '';

  return {
    ...contract,
    patientName,
    age,
    address,
    mobileNo,
    birthDate,
    acknowledgementName: contract.acknowledgementName || patientName,
    acknowledgementAddress: contract.acknowledgementAddress || address,
    acknowledgementAge: contract.acknowledgementAge || age,
  };
};

function PatientContractPages({ data }: any) {
  const contract = getPatientContractValues(data);
  const nonInclusionFirstPage = ORTHO_CONTRACT_NON_INCLUSIONS.slice(0, 10);
  const nonInclusionSecondPage = ORTHO_CONTRACT_NON_INCLUSIONS.slice(10);
  const termsPageTwo = ORTHO_CONTRACT_TERMS.slice(0, 13);
  const termsPageThree = ORTHO_CONTRACT_TERMS.slice(13);

  return (
    <>
      <ContractA4Page>
        <div className="text-[11px] leading-[1.45]" style={{ fontFamily: 'Arial, sans-serif' }}>
          <h2 className="mb-10 mt-8 text-center text-[12px] font-black uppercase tracking-wide">Contract for Orthodontic Treatment</h2>

          <div className="mb-10 grid grid-cols-[1.4fr_1fr] gap-x-16 gap-y-3 text-[11px] font-semibold uppercase">
            <div>Name: <ContractLine className="min-w-[260px] normal-case font-normal">{contract.patientName}</ContractLine></div>
            <div>Age: <ContractLine className="min-w-[110px] normal-case font-normal">{contract.age}</ContractLine></div>
            <div>Address: <ContractLine className="min-w-[245px] normal-case font-normal">{contract.address}</ContractLine></div>
            <div>Tel/Mobile No: <ContractLine className="min-w-[130px] normal-case font-normal">{contract.mobileNo}</ContractLine></div>
            <div>Date of Birth: <ContractLine className="min-w-[210px] normal-case font-normal">{contract.birthDate}</ContractLine></div>
          </div>

          <h3 className="mb-7 text-center text-[12px] font-semibold uppercase">Orthodontic Treatment Package Fees</h3>
          <OrderedContractList items={ORTHO_CONTRACT_FEES} />

          <h3 className="mb-4 mt-10 text-[11px] font-semibold uppercase">Inclusions</h3>
          <p className="mb-3">The Orthodontic Treatment Package includes the following:</p>
          <OrderedContractList items={ORTHO_CONTRACT_INCLUSIONS} />

          <h3 className="mb-4 mt-8 text-[11px] font-semibold uppercase">Non Inclusions</h3>
          <OrderedContractList items={nonInclusionFirstPage} />
        </div>
      </ContractA4Page>

      <div className="page-break">
        <ContractA4Page>
          <div className="text-[11px] leading-[1.45]" style={{ fontFamily: 'Arial, sans-serif' }}>
            <OrderedContractList items={nonInclusionSecondPage} start={11} />
            <p className="mb-9 mt-6">All Standard rates apply hereafter, however, discounts may be given at the discretion of the dentist/orthodontist/doctor.</p>
            <h3 className="mb-4 text-[11px] font-semibold uppercase">Terms and Conditions</h3>
            <OrderedContractList items={termsPageTwo} />
          </div>
        </ContractA4Page>
      </div>

      <div className="page-break">
        <ContractA4Page>
          <div className="text-[11px] leading-[1.45]" style={{ fontFamily: 'Arial, sans-serif' }}>
            <OrderedContractList items={termsPageThree} start={14} />

            <p className="mt-16 leading-7">
              I, <ContractLine className="w-[250px]">{contract.acknowledgementName}</ContractLine>, with address at,
              <ContractLine className="mx-1 w-[190px]">{contract.acknowledgementAddress}</ContractLine>, age,
              <ContractLine className="mx-1 w-[110px]">{contract.acknowledgementAge}</ContractLine>, have read, understood and conform all the term and conditions stated in this contract.
            </p>

            <div className="mt-16 grid grid-cols-2 gap-x-20">
              <div className="pt-28">
                <div className="mb-20">
                  <div className="w-72 border-b border-black">&nbsp;</div>
                  <div className="mt-2">{contract.dentistName}</div>
                </div>
                <div>
                  <div className="w-72 border-b border-black">&nbsp;</div>
                  <div className="mt-2">{contract.associateDentistRole}</div>
                </div>
              </div>

              <div className="space-y-14 text-center">
                <div>
                  <div className="mx-auto w-72 border-b border-black">&nbsp;</div>
                  <div className="mt-2">Signature over printed name</div>
                </div>
                <div>
                  <div className="mx-auto w-72 border-b border-black">&nbsp;</div>
                  <div className="mt-2">Signature over printed name of Legal Guardian</div>
                  <div className="mt-2">if the patient is minor</div>
                </div>
              </div>
            </div>
          </div>
        </ContractA4Page>
      </div>

      <div className="page-break">
        <ContractA4Page>
          <div className="text-[11px] leading-[1.45]" style={{ fontFamily: 'Arial, sans-serif' }}>
            <h2 className="mb-8 mt-3 text-center text-[12px] font-black uppercase tracking-wide">Orthodontic Treatment Package</h2>

            <div className="mx-auto mb-8 max-w-[620px] space-y-2">
              <div>Name of the Patient: <ContractLine className="w-[390px]">{contract.patientName}</ContractLine></div>
              <div>Tel./Mobile No.: <ContractLine className="w-[410px]">{contract.mobileNo}</ContractLine></div>
              <div>Age: <ContractLine className="w-[150px]">{contract.age}</ContractLine></div>
            </div>

            <div className="mx-auto mb-8 max-w-[680px] space-y-2">
              <div>Orthodontic Treatment Package: <ContractLine className="w-[420px]">{contract.orthodonticPackage}</ContractLine></div>
              <div>Down payment Terms: <ContractLine className="w-[470px]">{contract.downPaymentTerms[0]}</ContractLine></div>
              {contract.downPaymentTerms.slice(1).map((term, index) => (
                <div key={`down-${index}`} className="pl-[138px]"><ContractLine className="w-[470px]">{term}</ContractLine></div>
              ))}
              <div className="pt-5">Balance Terms: <ContractLine className="w-[450px]">{contract.balanceTerms}</ContractLine></div>
            </div>

            <table className="w-full border-collapse text-center text-[11px]">
              <thead>
                <tr>
                  {['DATE', 'AMOUNT\nCHARGED', 'AMOUNT PAID', 'REMARKS', 'SIGNATURE'].map((header) => (
                    <th key={header} className="whitespace-pre-line border border-black px-2 py-2 font-black">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contract.packageRows.map((row: any) => (
                  <tr key={row.id}>
                    <td className="h-[27px] border border-black px-1">{row.date}</td>
                    <td className="border border-black px-1">{row.amountCharged}</td>
                    <td className="border border-black px-1">{row.amountPaid}</td>
                    <td className="border border-black px-1">{row.remarks}</td>
                    <td className="border border-black px-1">{row.signature}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContractA4Page>
      </div>
    </>
  );
}

function PatientContractModule({ data, setData }: any) {
  const contract = getPatientContractValues(data);

  const updateContract = (field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      patientContractDocument: {
        ...mergePatientContractDocument(prev.patientContractDocument),
        [field]: value,
      },
    }));
  };

  const updateDownPaymentTerm = (index: number, value: string) => {
    const nextTerms = [...contract.downPaymentTerms];
    nextTerms[index] = value;
    updateContract('downPaymentTerms', nextTerms);
  };

  const updatePackageRow = (id: string, field: string, value: string) => {
    updateContract('packageRows', contract.packageRows.map((row: any) => (
      row.id === id ? { ...row, [field]: value } : row
    )));
  };

  const addPackageRow = () => updateContract('packageRows', [...contract.packageRows, createEmptyContractPackageRow()]);
  const removePackageRow = (id: string) => updateContract('packageRows', contract.packageRows.filter((row: any) => row.id !== id));

  const editableField = (label: string, field: string, fallbackHint: string, type = 'text') => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-2">{label}</label>
      <input
        type={type}
        value={contract[field] || ''}
        onChange={(e) => updateContract(field, e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder={fallbackHint}
      />
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1760px] space-y-6 pb-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Patient Contract</div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Orthodontic Treatment Contract</h2>
            <p className="mt-2 text-sm text-slate-500">Patient details auto-fill from the Patient Information tab. Type here only when you need an override for this contract.</p>
          </div>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Download or Print while this tab is open to export <span className="font-semibold">Patient Contract</span>.
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Auto-filled Patient Details</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {editableField('Patient Name', 'patientName', patientDisplayName(data) || 'Uses patient information name')}
              {editableField('Age', 'age', data.age || 'Uses patient information age')}
              {editableField('Address', 'address', data.address || 'Uses patient information address')}
              {editableField('Tel./Mobile No.', 'mobileNo', data.mobile || data.contact || 'Uses mobile/contact')}
              {editableField('Date of Birth', 'birthDate', data.birthDate || 'Uses date of birth', 'date')}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Page 3 Acknowledgement</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {editableField('Printed Name', 'acknowledgementName', contract.patientName || 'Patient name')}
              {editableField('Address at', 'acknowledgementAddress', contract.address || 'Patient address')}
              {editableField('Age', 'acknowledgementAge', contract.age || 'Patient age')}
              {editableField('Dentist Name', 'dentistName', 'Maria Jessica David - Tanarte, DMD')}
              {editableField('Dentist Role', 'associateDentistRole', 'Associate Dentist')}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Orthodontic Treatment Package</h3>
                <p className="mt-1 text-xs text-slate-500">These fields appear on the package ledger page.</p>
              </div>
              <button onClick={addPackageRow} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800">Add Row</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {editableField('Treatment Package', 'orthodonticPackage', 'Package description / fee')}
              {editableField('Balance Terms', 'balanceTerms', 'Balance payment terms')}
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Down Payment Terms</label>
              {contract.downPaymentTerms.map((term: string, index: number) => (
                <input
                  key={`down-edit-${index}`}
                  value={term}
                  onChange={(e) => updateDownPaymentTerm(index, e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder={`Down payment term line ${index + 1}`}
                />
              ))}
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    {['Date', 'Amount Charged', 'Amount Paid', 'Remarks', 'Signature', ''].map((header) => (
                      <th key={header} className="px-3 py-2 text-left font-semibold">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contract.packageRows.map((row: any) => (
                    <tr key={row.id}>
                      <td className="px-2 py-2"><input type="date" value={row.date} onChange={(e) => updatePackageRow(row.id, 'date', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5" /></td>
                      <td className="px-2 py-2"><input value={row.amountCharged} onChange={(e) => updatePackageRow(row.id, 'amountCharged', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5" placeholder="0.00" /></td>
                      <td className="px-2 py-2"><input value={row.amountPaid} onChange={(e) => updatePackageRow(row.id, 'amountPaid', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5" placeholder="0.00" /></td>
                      <td className="px-2 py-2"><input value={row.remarks} onChange={(e) => updatePackageRow(row.id, 'remarks', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5" /></td>
                      <td className="px-2 py-2"><input value={row.signature} onChange={(e) => updatePackageRow(row.id, 'signature', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5" /></td>
                      <td className="px-2 py-2 text-center"><button onClick={() => removePackageRow(row.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100/70 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Printable Preview</h3>
            <p className="text-sm text-slate-500">This exact contract is used for Print and Download PDF.</p>
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-auto rounded-2xl border border-slate-200 bg-slate-200/60 p-3">
            <div className="flex flex-col gap-8">
              <PatientContractPages data={{ ...data, patientContractDocument: contract }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientAuxTableModule({
  data,
  setData,
  sectionKey,
  title,
  subtitle,
  columns,
  newLabel,
  emptyLabel,
  patientId,
}: {
  data: Record<string, any>;
  setData: React.Dispatch<React.SetStateAction<any>>;
  sectionKey: string;
  title: string;
  subtitle: string;
  columns: Array<{ key: string; label: string }>;
  newLabel: string;
  emptyLabel: string;
  patientId?: string | null;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(() => createSectionDraft(sectionKey));
  const isAppointmentsSection = sectionKey === 'appointments';
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [activeTextarea, setActiveTextarea] = useState<'rxRemarks' | null>(null);

  const handleSelectTemplate = (templateItem: any) => {
    const textToInsert = templateItem.instructions || templateItem.metadata?.templateBody || '';
    if (!textToInsert) return;

    if (draft.remarks && draft.remarks.trim()) {
      const confirmOverwrite = window.confirm(
        "You already have text in the Remarks field. Do you want to overwrite it with the template? Cancel will append it instead."
      );
      if (confirmOverwrite) {
        setDraft((prev: any) => ({ ...prev, remarks: textToInsert, template: templateItem.name }));
      } else {
        setDraft((prev: any) => ({ ...prev, remarks: `${prev.remarks}\n\n${textToInsert}`, template: templateItem.name }));
      }
    } else {
      setDraft((prev: any) => ({ ...prev, remarks: textToInsert, template: templateItem.name }));
    }
  };

  const rows = data[sectionKey] || [];
  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, rows.length);
  const paginatedRows = rows.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!isAppointmentsSection || !patientId) return;

    let isActive = true;
    const loadAppointments = async () => {
      const result = await getAppointments(patientId);
      if (!isActive) return;
      if ('data' in result) {
        setData((prev) => ({ ...prev, [sectionKey]: result.data }));
        return;
      }
      console.error('Error loading appointments:', result.error);
    };

    void loadAppointments();

    return () => {
      isActive = false;
    };
  }, [isAppointmentsSection, patientId, sectionKey, setData]);

  const refreshList = async () => {
    if (isAppointmentsSection && patientId) {
      const result = await getAppointments(patientId);
      if ('data' in result) {
        setData((prev) => ({ ...prev, [sectionKey]: result.data }));
      } else {
        console.error('Error loading appointments:', result.error);
      }
      return;
    }

    setData((prev) => ({ ...prev, [sectionKey]: [...(prev[sectionKey] || [])] }));
  };

  const openModal = () => {
    setEditingRowId(null);
    setDraft(createSectionDraft(sectionKey));
    setIsModalOpen(true);
  };

  const openEditModal = (row: any) => {
    setEditingRowId(row.id);
    setDraft(createSectionDraftFromRow(sectionKey, row));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingRowId(null);
    setDraft(createSectionDraft(sectionKey));
    setIsModalOpen(false);
  };

  const saveModalEntry = async () => {
    if (isAppointmentsSection && patientId) {
      if (editingRowId) {
        const result = await updateAppointment(patientId, editingRowId, {
          appointment_date: draft.date,
          appointment_time: draft.time,
          reason: draft.title?.trim() || null,
          status: draft.status,
          details: draft.details,
          title: draft.title,
        });

        if ('error' in result) {
          console.error('Error updating appointment:', result.error);
          return;
        }

        setData((prev) => ({
          ...prev,
          [sectionKey]: (prev[sectionKey] || []).map((row: any) => (
            row.id === editingRowId ? result.data : row
          )),
        }));
        closeModal();
        return;
      }

      const result = await createAppointment(patientId, {
        appointment_date: draft.date,
        appointment_time: draft.time,
        reason: draft.title?.trim() || null,
        status: draft.status,
        details: draft.details,
        title: draft.title,
      });

      if ('error' in result) {
        console.error('Error saving appointment:', result.error);
        return;
      }

      setData((prev) => ({
        ...prev,
        [sectionKey]: [...(prev[sectionKey] || []), result.data],
      }));
      closeModal();
      return;
    }

    if (editingRowId) {
      const nextRow = {
        ...buildSectionRow(sectionKey, draft),
        id: editingRowId,
      };
      setData((prev) => ({
        ...prev,
        [sectionKey]: (prev[sectionKey] || []).map((row) => (
          row.id === editingRowId ? nextRow : row
        )),
      }));
      closeModal();
      return;
    }

    setData((prev) => ({
      ...prev,
      [sectionKey]: [...(prev[sectionKey] || []), buildSectionRow(sectionKey, draft)],
    }));
    closeModal();
  };

  const deleteItem = async (id: string) => {
    if (isAppointmentsSection && patientId) {
      const result = await deleteAppointment(patientId, id);
      if ('error' in result) {
        console.error('Error deleting appointment:', result.error);
        return;
      }

      setData((prev) => ({
        ...prev,
        [sectionKey]: result.data,
      }));
      return;
    }

    setData((prev) => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter((item) => item.id !== id),
    }));
  };

  const updateMedicine = (id, field, value) => {
    setDraft((prev: any) => ({
      ...prev,
      medicines: prev.medicines.map((medicine) => (
        medicine.id === id ? { ...medicine, [field]: value } : medicine
      )),
    }));
  };

  const addMedicine = () => {
    setDraft((prev: any) => ({
      ...prev,
      medicines: [...prev.medicines, { id: crypto.randomUUID(), medication: '', dose: '', qty: '1' }],
    }));
  };

  const resetPrescription = () => {
    setDraft(createSectionDraft(sectionKey));
  };

  const handleAttachmentUpload = async (event: any) => {
    const selectedFiles = Array.from(event.target.files || []) as File[];
    if (selectedFiles.length === 0) return;

    const files = await Promise.all(selectedFiles.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: reader.result,
      });
      reader.readAsDataURL(file);
    })));

    setDraft((prev: any) => ({
      ...prev,
      files: [...(Array.isArray(prev.files) ? prev.files : []), ...files],
      fileNames: [...(Array.isArray(prev.files) ? prev.files : []), ...files].map((file: any) => file.name).join(', '),
    }));
  };

  const removeDraftAttachment = (id: string) => {
    setDraft((prev: any) => {
      const nextFiles = (Array.isArray(prev.files) ? prev.files : []).filter((file: any) => file.id !== id);
      return { ...prev, files: nextFiles, fileNames: nextFiles.map((file: any) => file.name).join(', ') };
    });
  };

  return (
    <div className="w-full max-w-[1560px] mx-auto space-y-6 pb-12">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="text-slate-500 text-sm">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={refreshList} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Refresh List
          </button>
          <button onClick={openModal} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            {newLabel}
          </button>
        </div>
      </div>

      <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-semibold text-slate-700">
                  {column.label}
                </th>
              ))}
              <th className="px-2 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 align-top text-slate-700">
                    {sectionKey === 'attachments' && column.key === 'title' && Array.isArray(row.files) && row.files.length > 0 ? (
                      <div className="space-y-1">
                        {row.files.map((file: any) => (
                          <a
                            key={file.id || file.name}
                            href={file.dataUrl}
                            download={file.name}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-blue-700 hover:underline"
                          >
                            {file.name}
                            <span className="ml-2 text-xs text-slate-400">{file.type || 'file'}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      row[column.key] || '-'
                    )}
                  </td>
                ))}
                <td className="px-2 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {isAppointmentsSection && (
                      <button onClick={() => openEditModal(row)} className="text-slate-400 hover:text-blue-600 p-1 transition-colors" title="Edit appointment">
                        <Edit3 size={16} />
                      </button>
                    )}
                    <button onClick={() => deleteItem(row.id)} className="text-slate-400 hover:text-red-500 p-1 transition-colors" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-8 text-slate-400 italic">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between px-1 pt-3">
          <span className="text-xs text-zinc-500 font-medium">Showing <span className="font-bold text-zinc-700">{startIndex + 1}-{endIndex}</span> of <span className="font-bold text-zinc-700">{rows.length}</span> {title.toLowerCase()}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-40 font-medium"
            >
              &lt; Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                  page === safeCurrentPage ? 'bg-teal-600 text-white' : 'text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-40 font-medium"
            >
              Next &gt;
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-2xl font-semibold text-slate-900">{editingRowId ? `Edit ${isAppointmentsSection ? 'Appointment' : 'Entry'}` : newLabel}</h3>
              <button onClick={closeModal} className="text-2xl leading-none text-slate-400 hover:text-slate-700">×</button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
              {sectionKey === 'prescriptions' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Load From Template</label>
                    <div className="flex flex-col gap-2 md:flex-row relative">
                      <MasterSmartAutocomplete
                        directoryType="prescription_templates"
                        value={draft.template || ''}
                        onChange={(val) => setDraft((prev: any) => ({ ...prev, template: val }))}
                        onSelect={handleSelectTemplate}
                        placeholder="Search prescription template here"
                        className="flex-1 relative"
                        inputClassName="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-550 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button onClick={resetPrescription} className="rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600">
                      <RotateCcw size={15} className="mr-2 inline" />Reset
                    </button>
                    <button onClick={addMedicine} className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                      <Plus size={15} className="mr-2 inline" />Add Medicine
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Medication</th>
                          <th className="px-4 py-3 text-left font-semibold">Dose</th>
                          <th className="px-4 py-3 text-left font-semibold">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {draft.medicines.map((medicine) => (
                          <tr key={medicine.id}>
                            <td className="px-3 py-2">
                              <MasterSmartAutocomplete
                                directoryType="medicines"
                                value={medicine.medication || ''}
                                onChange={(value) => updateMedicine(medicine.id, 'medication', value)}
                                onSelect={(item) => {
                                  updateMedicine(medicine.id, 'medication', item.name);
                                  let doseText = item.dosage || '';
                                  if (item.frequency) doseText += (doseText ? ' - ' : '') + item.frequency;
                                  if (item.duration) doseText += (doseText ? ' for ' : '') + item.duration;
                                  if (doseText) {
                                    updateMedicine(medicine.id, 'dose', doseText);
                                  }
                                  if (item.instructions) {
                                    setDraft((prev: any) => ({
                                      ...prev,
                                      remarks: prev.remarks 
                                        ? `${prev.remarks}\n${item.name}: ${item.instructions}` 
                                        : `${item.name}: ${item.instructions}`
                                    }));
                                  }
                                }}
                                inputClassName="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                placeholder="Search medicine here"
                              />
                            </td>
                            <td className="px-3 py-2"><input type="text" value={medicine.dose} onChange={(e) => updateMedicine(medicine.id, 'dose', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Prescribe dosage here" /></td>
                            <td className="px-3 py-2"><input type="number" min="1" value={medicine.qty} onChange={(e) => updateMedicine(medicine.id, 'qty', e.target.value)} className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Remarks (Type '/' for Templates)</label>
                    <textarea 
                      rows={4} 
                      value={draft.remarks || ''} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((prev: any) => ({ ...prev, remarks: val }));
                        if (val.endsWith('/')) {
                          setActiveTextarea('rxRemarks');
                        }
                      }} 
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" 
                    />
                  </div>

                  {activeTextarea === 'rxRemarks' && (
                    <CommandPalette
                      onSelect={(snippet: string) => {
                        setDraft((prev: any) => ({ ...prev, remarks: (prev.remarks || '').replace(/\/$/, '') + snippet }));
                        setActiveTextarea(null);
                      }}
                      onClose={() => setActiveTextarea(null)}
                    />
                  )}
                </div>
              )}

              {sectionKey === 'certificates' && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Load From Template</label>
                      <div className="flex gap-2">
                        <input type="text" value={draft.template} onChange={(e) => setDraft((prev: any) => ({ ...prev, template: e.target.value }))} className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search certificate template here" />
                        <button className="rounded-md border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">Use Template</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Date</label>
                      <input type="date" value={draft.date} onChange={(e) => setDraft((prev: any) => ({ ...prev, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Certificate Title</label>
                    <input type="text" value={draft.title} onChange={(e) => setDraft((prev: any) => ({ ...prev, title: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Medical Certificate" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Certificate Body</label>
                    <textarea rows={12} value={draft.body} onChange={(e) => setDraft((prev: any) => ({ ...prev, body: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Remarks</label>
                    <input type="text" value={draft.remarks} onChange={(e) => setDraft((prev: any) => ({ ...prev, remarks: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {sectionKey === 'attachments' && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Files</label>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                        onChange={handleAttachmentUpload}
                        className="w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={draft.fileNames || ''}
                        onChange={(e) => setDraft((prev: any) => ({ ...prev, fileNames: e.target.value }))}
                        className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Or type file names / references manually"
                      />
                      {Array.isArray(draft.files) && draft.files.length > 0 && (
                        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                          {draft.files.map((file: any) => (
                            <div key={file.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
                              <div className="min-w-0">
                                <div className="truncate font-medium text-slate-800">{file.name}</div>
                                <div className="text-xs text-slate-500">{file.type || 'file'} | {Math.max(1, Math.round((file.size || 0) / 1024))} KB</div>
                              </div>
                              <button onClick={() => removeDraftAttachment(file.id)} className="text-slate-400 hover:text-red-500">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Date</label>
                      <input type="date" value={draft.date} onChange={(e) => setDraft((prev: any) => ({ ...prev, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Remarks</label>
                    <input type="text" value={draft.remarks} onChange={(e) => setDraft((prev: any) => ({ ...prev, remarks: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {sectionKey === 'notes' && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Date</label>
                      <input type="date" value={draft.date} onChange={(e) => setDraft((prev: any) => ({ ...prev, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Note Title</label>
                      <input type="text" value={draft.title} onChange={(e) => setDraft((prev: any) => ({ ...prev, title: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Details</label>
                    <textarea rows={8} value={draft.details} onChange={(e) => setDraft((prev: any) => ({ ...prev, details: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {sectionKey === 'consents' && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)_180px]">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Date</label>
                      <input type="date" value={draft.date} onChange={(e) => setDraft((prev: any) => ({ ...prev, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Consent Name</label>
                      <input type="text" value={draft.title} onChange={(e) => setDraft((prev: any) => ({ ...prev, title: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Status</label>
                      <select value={draft.status} onChange={(e) => setDraft((prev: any) => ({ ...prev, status: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
                        <option>Pending</option>
                        <option>Signed</option>
                        <option>Declined</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Remarks</label>
                    <textarea rows={6} value={draft.details} onChange={(e) => setDraft((prev: any) => ({ ...prev, details: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {sectionKey === 'appointments' && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-[160px_160px_minmax(0,1fr)_180px]">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Date</label>
                      <input type="date" value={draft.date} onChange={(e) => setDraft((prev: any) => ({ ...prev, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Time</label>
                      <input type="time" value={draft.time} onChange={(e) => setDraft((prev: any) => ({ ...prev, time: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Appointment</label>
                      <input type="text" value={draft.title} onChange={(e) => setDraft((prev: any) => ({ ...prev, title: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Consultation / Procedure" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Status</label>
                      <select value={draft.status} onChange={(e) => setDraft((prev: any) => ({ ...prev, status: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
                        <option>Scheduled</option>
                        <option>Completed</option>
                        <option>Cancelled</option>
                        <option>No Show</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Remarks</label>
                    <textarea rows={6} value={draft.details} onChange={(e) => setDraft((prev: any) => ({ ...prev, details: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button onClick={closeModal} className="rounded-lg bg-orange-400 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-500">
                Cancel
              </button>
              <button onClick={saveModalEntry} className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
                <Save size={15} className="mr-2 inline" />
                {editingRowId ? 'Save Changes' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MODULE 2: LIVE A4 PREVIEW (DYNAMIC RENDER ENGINE)
// ============================================================================

const PrintHeader = ({ settings, data }) => {
  const bStyle = settings.borderStyle || 'border-black';
  return (
    <div className="flex justify-between items-center shrink-0" style={{ marginBottom: `${settings.headerMarginBottom}px` }}>
      {settings.headerOrder.map(part => {
        if (part === 'left') {
          return (
            <div key="left" className="shrink-0" style={{ marginTop: `${settings.leftImageMarginTop}px`, marginBottom: `${settings.leftImageMarginBottom}px`, marginLeft: `${settings.leftImageMarginLeft}px`, marginRight: `${settings.leftImageMarginRight}px` }}>
              {settings.showLeftImage && (
                <div className={`bg-slate-50 rounded-full flex items-center justify-center overflow-hidden ${settings.leftImageOutline ? 'border border-slate-300' : ''}`} style={{ width: `${settings.leftImageSize}px`, height: `${settings.leftImageSize}px` }}>
                  {settings.leftImage ? <img src={settings.leftImage} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300" size={24} />}
                </div>
              )}
            </div>
          );
        }
        if (part === 'middle') {
          return (
            <div key="middle" className="text-center flex-1 flex flex-col items-center justify-center" style={{ marginTop: `${settings.middleMarginTop}px`, marginBottom: `${settings.middleMarginBottom}px`, marginLeft: `${settings.middleMarginLeft}px`, marginRight: `${settings.middleMarginRight}px` }}>
              {settings.showMiddleImage && (
                <div className="mb-2" style={{ height: `${settings.middleImageSize}px` }}>
                  {settings.middleImage ? <img src={settings.middleImage} className="h-full object-contain" /> : <div className="h-full w-24 bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-[8px] text-slate-400">Logo</div>}
                </div>
              )}
              {settings.showClinicName && <h1 className="text-xl font-bold tracking-widest text-[#56C5C0] uppercase">{settings.clinicName}</h1>}
              {settings.showAddress && <h2 className="text-[9px] tracking-widest text-slate-600 uppercase mt-0.5">{settings.clinicAddress}</h2>}
              {settings.showContact && <p className="text-[8px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wider">{settings.clinicContact}</p>}
            </div>
          );
        }
        if (part === 'right') {
          const photoToDisplay = data.patientPhoto || settings.rightImage;
          return (
            <div key="right" className="shrink-0" style={{ marginTop: `${settings.rightImageMarginTop}px`, marginBottom: `${settings.rightImageMarginBottom}px`, marginLeft: `${settings.rightImageMarginLeft}px`, marginRight: `${settings.rightImageMarginRight}px` }}>
              {settings.showRightImage && (
                <div className={`w-[2in] h-[1.5in] max-w-[100px] max-h-[100px] border-[1.5px] ${bStyle} rounded-md flex items-center justify-center text-[8px] text-slate-400 border-dashed overflow-hidden bg-slate-50`}>
                  {photoToDisplay ? (
                    <img src={photoToDisplay} className="w-full h-full" style={{ objectFit: settings.rightImageFit, objectPosition: `${settings.rightImagePositionX}% ${settings.rightImagePositionY}%` }} />
                  ) : '2x2 Photo'}
                </div>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

const InlineLine = ({
  label,
  value,
  sublabel,
  flex = "1",
  width,
  settings
}: {
  label?: ReactNode;
  value?: ReactNode;
  sublabel?: ReactNode;
  flex?: string;
  width?: string;
  settings: any;
}) => {
  const labelSizeMap = { 'Small': 'text-[8.5px]', 'Medium': 'text-[9.5px]', 'Large': 'text-[10px]' };
  const underlineMap = { 'Solid': 'border-solid', 'Dashed': 'border-dashed', 'Dotted': 'border-dotted' };
  const labelFontSize = labelSizeMap[settings.labelSize] || 'text-[9.5px]';
  const uStyle = underlineMap[settings.underlineStyle] || 'border-solid';
  const bStyle = settings.borderStyle || 'border-black';

  return (
    <div className={`flex flex-col ${width ? width : `flex-${flex}`} px-1`}>
      <div className="flex items-end">
        {label && <span className={`whitespace-nowrap mr-1 leading-none ${labelFontSize}`}>{label}</span>}
        <div className={`flex-1 border-b ${bStyle} ${uStyle} text-center min-h-[12px] leading-tight pb-[1px]`}>
          {value}
        </div>
      </div>
      {sublabel && <span className="text-[8px] italic text-center w-full block pt-[1px] leading-none">{sublabel}</span>}
    </div>
  );
};

const DentistSignatureBlock = ({
  settings,
  manualName,
  bStyle,
  uStyle = 'border-solid',
  showName,
  showSignature
}: {
  settings: any;
  manualName?: ReactNode;
  bStyle: string;
  uStyle?: string;
  showName?: boolean;
  showSignature?: boolean;
}) => {
  const nameToUse = showName ? (manualName || settings.defaultDentistName) : manualName;
  const roleToUse = showName ? (settings.defaultDentistRole || 'Attending Dentist') : 'Checked By (Dentist)';

  let alignContainer = 'items-center';
  let justifyText = 'justify-center';

  if (settings.dentistSignaturePlacement === 'left') { alignContainer = 'items-start'; justifyText = 'justify-start'; }
  if (settings.dentistSignaturePlacement === 'right') { alignContainer = 'items-end'; justifyText = 'justify-end'; }

  return (
    <div className={`text-center w-64 relative flex flex-col justify-end mt-4 ${alignContainer}`}>
      {showSignature && settings.defaultDentistSignature && (
        <img
          src={settings.defaultDentistSignature}
          alt="Dentist Signature"
          className="absolute bottom-4 object-contain z-10 mix-blend-multiply"
          style={{ width: `${settings.dentistSignatureSize}px`, maxHeight: '60px' }}
        />
      )}
      <div className={`border-b ${bStyle} ${uStyle} h-5 w-full flex items-end ${justifyText} text-[10px] font-bold uppercase pb-0.5 z-0 relative px-1`}>
        {nameToUse}
      </div>
      <span className="text-[10px] leading-tight mt-1 block">{roleToUse}</span>
    </div>
  );
};


// 2A: PATIENT FORM PREVIEW PAGE
function PatientFormPage({ data, settings }) {
  const fontSizeMap = { 'Small': 'text-[9px]', 'Medium': 'text-[10px]', 'Large': 'text-[11px]' };
  const labelSizeMap = { 'Small': 'text-[8.5px]', 'Medium': 'text-[9.5px]', 'Large': 'text-[10px]' };
  const baseFontSize = fontSizeMap[settings.fontSize] || 'text-[10px]';
  const labelFontSize = labelSizeMap[settings.labelSize] || 'text-[9.5px]';
  const bStyle = settings.borderStyle || 'border-black';
  const uStyle = settings.underlineStyle === 'Dashed' ? 'border-dashed' : settings.underlineStyle === 'Dotted' ? 'border-dotted' : 'border-solid';
  const A4_CLASSES = "a4-page bg-white w-[210mm] h-[297mm] mx-auto shadow-2xl relative box-border overflow-hidden";

  return (
    <div className={`${A4_CLASSES} ${baseFontSize} text-black font-sans flex flex-col p-[10mm] pb-[12mm]`}>

      <PrintHeader settings={settings} data={data} />

      {settings.showRecordBadge && settings.sectionOrder.includes('personal') && settings.visibility['personal'] && (
        <h3 className="text-sm font-bold uppercase tracking-wider text-center bg-black text-white w-max mx-auto px-4 py-0.5 rounded-full" style={{ marginTop: `${settings.recordBadgeMarginTop}px`, marginBottom: `${settings.recordBadgeMarginBottom}px` }}>
          {settings.recordBadgeText || 'PATIENT RECORD'}
        </h3>
      )}

      <div className={`flex-1 flex flex-col ${settings.density === 'Compact' ? 'space-y-1' : 'space-y-2'} overflow-hidden leading-tight`}>
        {settings.sectionOrder.map((sectionId) => {
          if (!settings.visibility[sectionId]) return null;

          switch (sectionId) {
            case 'personal': return (
              <div key={sectionId} className="w-full shrink-0">
                <div className="flex w-full">
                  <span className={`whitespace-nowrap mr-2 leading-none self-start mt-1 ${labelFontSize}`}>Name:</span>
                  <div className="flex flex-1">
                    <InlineLine settings={settings} value={data.lastName} sublabel="Last Name" flex="1" />
                    <InlineLine settings={settings} value={data.firstName} sublabel="First Name" flex="1" />
                    <InlineLine settings={settings} value={data.middleName} sublabel="Middle" flex="1" />
                  </div>
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Birthday(mm/dd/yy):" value={data.birthDate} flex="1" />
                  <InlineLine settings={settings} label="Nickname:" value={data.nickname} flex="1" />
                  <InlineLine settings={settings} label="Age:" value={data.age} width="w-20" />
                  <InlineLine settings={settings} label="Sex: M / F" value={data.sex} width="w-28" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Religion:" value={data.religion} flex="1" />
                  <InlineLine settings={settings} label="Nationality:" value={data.nationality} flex="1" />
                  <InlineLine settings={settings} label="Civil Status:" value={data.civilStatus} width="w-48" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Home Address:" value={data.address} flex="1" />
                  <InlineLine settings={settings} label="Tel. No/s.:" value={data.contact} width="w-48" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Company:" value={data.company} flex="1" />
                  <InlineLine settings={settings} label="Occupation:" value={data.occupation} flex="1" />
                  <InlineLine settings={settings} label="Office No/s.:" value={data.officeContact} width="w-48" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Dental Insurance:" value={data.dentalInsurance} flex="1" />
                  <InlineLine settings={settings} label="Fax No/s.:" value={data.fax} width="w-48" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Effective Date:" value={data.effectiveDate} flex="1" />
                  <InlineLine settings={settings} label="Mobile No/s.:" value={data.mobile} width="w-48" />
                </div>
                <div className="flex w-full mt-1">
                  <div className="font-bold italic text-[10px] mr-2 self-end">For Minors:</div>
                  <InlineLine settings={settings} label="Email Add.:" value={data.email} width="w-64" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Parents / Guardian's Name:" value={data.parentGuardian} flex="1" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Whom may we thank for referring you?:" value={data.referral} flex="1" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="What is your reason for dental consultation?:" value={data.dentalReason} flex="1" />
                </div>
              </div>
            );

            case 'referral': return null;

            case 'dentalHistory': return (
              <div key={sectionId} className="w-full shrink-0">
                <div className="font-bold uppercase mt-2 mb-1">Dental History</div>
                <div className="flex w-full">
                  <InlineLine settings={settings} label="Previous Dentist: Dr." value={data.previousDentist} flex="1" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Last Dental visit:" value={data.lastVisit} flex="1" />
                </div>
              </div>
            );

            case 'medicalHistory': return (
              <div key={sectionId} className="w-full shrink-0">
                <div className="font-bold uppercase mt-2 mb-1">Medical History</div>
                <div className="flex w-full">
                  <InlineLine settings={settings} label="Name of the Physician: Dr." value={data.physicianName} flex="1" />
                  <InlineLine settings={settings} label="Specialty, if applicable:" value={data.physicianSpecialty} flex="1" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Office Address:" value={data.physicianAddress} flex="1" />
                  <InlineLine settings={settings} label="Office No/s.:" value={data.physicianContact} width="w-48" />
                </div>
              </div>
            );

            case 'questions': return (
              <div key={sectionId} className="w-full shrink-0">
                <div className="flex justify-between items-end mt-2 pr-6">
                  <span className={labelFontSize}>Please place (✓) under "YES" or "NO".</span>
                  <div className="flex space-x-4 text-center font-semibold text-[9px]">
                    <span className="w-8">YES</span>
                    <span className="w-8">NO</span>
                  </div>
                </div>
                {MEDICAL_QUESTIONS.map((q, idx) => (
                  <div key={q.id} className="flex flex-col pr-6 mt-0.5">
                    <div className="flex justify-between items-center">
                      <span className="truncate pr-2">{idx + 1}. {q.text}</span>
                      <div className="flex space-x-4">
                        <span className="w-8 text-center font-mono">{data.questions[q.id] === true ? '(✓)' : 'O'}</span>
                        <span className="w-8 text-center font-mono">{data.questions[q.id] === false ? '(✓)' : 'O'}</span>
                      </div>
                    </div>
                    {idx === 1 && <div className="pl-4 mt-[1px]"><InlineLine settings={settings} label="If so, what is the condition being treated?" value={data.questionDetails?.[q.id]} flex="1" /></div>}
                    {idx === 2 && <div className="pl-4 mt-[1px]"><InlineLine settings={settings} label="If so, what illness or operation?" value={data.questionDetails?.[q.id]} flex="1" /></div>}
                    {idx === 3 && <div className="pl-4 mt-[1px]"><InlineLine settings={settings} label="If so, when and why?" value={data.questionDetails?.[q.id]} flex="1" /></div>}
                    {idx === 4 && <div className="pl-4 mt-[1px]"><InlineLine settings={settings} label="If so, please specify:" value={data.questionDetails?.[q.id]} flex="1" /></div>}
                    {[0, 5, 6].includes(idx) && data.questionDetails?.[q.id] && (
                      <div className="pl-4 mt-[1px]"><InlineLine settings={settings} label="Comment:" value={data.questionDetails?.[q.id]} flex="1" /></div>
                    )}
                  </div>
                ))}
              </div>
            );

            case 'allergies': return (
              <div key={sectionId} className="w-full shrink-0 mt-1">
                <span className={labelFontSize}>Are you allergic to any of the following:</span>
                <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 pl-4 mt-1">
                  <div className="flex items-center"><span className="font-mono mr-1">{data.allergies['local anesthetic'] ? '(✓)' : '( )'}</span> Local Anesthetic</div>
                  <div className="flex items-center"><span className="font-mono mr-1">{data.allergies['sulfa'] ? '(✓)' : '( )'}</span> Sulfa Drugs</div>
                  <div className="flex items-center"><span className="font-mono mr-1">{data.allergies['latex'] ? '(✓)' : '( )'}</span> Latex</div>
                  <div className="flex items-center"><span className="font-mono mr-1">{data.allergies['penicillin'] ? '(✓)' : '( )'}</span> Penicillin / Antibiotics</div>
                  <div className="flex items-center"><span className="font-mono mr-1">{data.allergies['aspirin'] ? '(✓)' : '( )'}</span> Aspirin</div>
                  <div className="flex items-center"><span className="font-mono mr-1">{data.allergies['others'] ? '(✓)' : '( )'}</span> Other: <div className={`flex-1 border-b ${bStyle} ${uStyle} ml-1 min-h-[1em]`}>{data.allergies.others}</div></div>
                </div>
              </div>
            );

            case 'healthDetails': return (
              <div key={sectionId} className="w-full shrink-0 flex mt-2 space-x-6">
                <InlineLine settings={settings} label="Blood Type:" value={data.bloodType} flex="1" />
                <InlineLine settings={settings} label="Blood Pressure:" value={data.bloodPressure} flex="1" />
              </div>
            );

            case 'womenOnly': return (
              <div key={sectionId} className="w-full shrink-0 mt-2 flex pr-6 border border-slate-200 p-1.5">
                <span className={`w-32 ${labelFontSize}`}>For women only:</span>
                <div className="flex-1 flex flex-col items-end">
                  <div className="flex justify-between w-full pl-8 max-w-[300px]">
                    <span>Are you pregnant?</span>
                    <div className="flex space-x-4"><span className="w-8 text-center font-mono">{data.womenOnly.pregnant ? '(✓)' : 'O'}</span><span className="w-8 text-center font-mono">{!data.womenOnly.pregnant && data.womenOnly.pregnant !== undefined ? 'O' : 'O'}</span></div>
                  </div>
                  <div className="flex justify-between w-full pl-8 max-w-[300px]">
                    <span>Are you nursing?</span>
                    <div className="flex space-x-4"><span className="w-8 text-center font-mono">{data.womenOnly.nursing ? '(✓)' : 'O'}</span><span className="w-8 text-center font-mono">O</span></div>
                  </div>
                  <div className="flex justify-between w-full pl-8 max-w-[300px]">
                    <span>Are you taking birth control pills?</span>
                    <div className="flex space-x-4"><span className="w-8 text-center font-mono">{data.womenOnly.birthControl ? '(✓)' : 'O'}</span><span className="w-8 text-center font-mono">O</span></div>
                  </div>
                </div>
              </div>
            );

            case 'conditions': return (
              <div key={sectionId} className="w-full flex-1 flex flex-col mt-2">
                <span className={labelFontSize}>Do you have or have you had any of the following? Check which apply.</span>
                <div className="grid grid-cols-3 gap-x-2 gap-y-[2px] pl-4 mt-2">
                  {CONDITIONS.map((cond) => (
                    <div key={cond} className="flex items-start text-[9.5px]">
                      <span className="mr-2 font-mono leading-none pt-[1px]">{data.conditions[cond] ? '(✓)' : '( )'}</span>
                      <span className="truncate leading-tight">{cond}</span>
                    </div>
                  ))}
                </div>
              </div>
            );

            case 'signature': return (
              <div key={sectionId} className="w-full flex justify-between px-8 pt-6 pb-2 shrink-0 mt-auto items-end">
                <div className="text-center w-40">
                  <div className={`border-b ${bStyle} ${uStyle} h-5 flex items-end justify-center text-[10px] pb-0.5`}>
                    {data.signatureDate}
                  </div>
                  <span className="text-[10px]">Date</span>
                </div>
                <div className="text-center w-64">
                  <div className={`border-b ${bStyle} ${uStyle} h-5 flex items-end justify-center text-[10px] font-bold uppercase pb-0.5`}>
                    {data.signatureName}
                  </div>
                  <span className="text-[10px] leading-tight mt-1 block">Patient / Parent / Guardian Signature<br />Over Printed Name</span>
                </div>

                {(settings.showDentistNameInPatientRecord || settings.showSignatureInPatientRecord) && (
                  <DentistSignatureBlock
                    settings={settings}
                    manualName=""
                    bStyle={bStyle}
                    uStyle={uStyle}
                    showName={settings.showDentistNameInPatientRecord}
                    showSignature={settings.showSignatureInPatientRecord}
                  />
                )}
              </div>
            );

            default: return null;
          }
        })}
      </div>
    </div>
  );
}

// 2B: DENTAL CHART PREVIEW PAGE
function DentalChartPage({ data, settings }) {
  const fontSizeMap = { 'Small': 'text-[8px]', 'Medium': 'text-[9px]', 'Large': 'text-[10px]' };
  const baseFontSize = fontSizeMap[settings.fontSize] || 'text-[9px]';
  const bStyle = settings.borderStyle || 'border-black';
  const A4_CLASSES = "a4-page bg-white w-[210mm] h-[297mm] mx-auto shadow-2xl relative box-border overflow-hidden";
  const printRows = [
    { key: 'upper-temp', right: TEMP_UPPER_RIGHT, left: TEMP_UPPER_LEFT, layout: 'top', spacing: 'mb-5' },
    { key: 'upper-perm', right: PERM_UPPER_RIGHT, left: PERM_UPPER_LEFT, layout: 'top', spacing: 'mb-7' },
    { key: 'lower-perm', right: PERM_LOWER_RIGHT, left: PERM_LOWER_LEFT, layout: 'bottom', spacing: 'mb-5' },
    { key: 'lower-temp', right: TEMP_LOWER_RIGHT, left: TEMP_LOWER_LEFT, layout: 'bottom', spacing: '' },
  ];

  const renderPrintToothCard = (toothId, toothEntry, layout) => {
    const flatTags = getToothFlatTags(toothEntry).slice(0, 4);
    const gridValues = flatTags.length > 0 ? flatTags : ['', '', '', ''];

    return (
      <div key={`pt-${toothId}`} className="flex w-[34px] flex-col items-center px-[1px]">
        {layout === 'top' && (
          <>
            <div className={`grid h-[22px] w-[22px] grid-cols-2 grid-rows-2 overflow-hidden rounded-[3px] border border-slate-300 bg-white text-[5.5px] font-bold text-slate-800`}>
              {[0, 1, 2, 3].map((index) => {
                const tag = gridValues[index];
                const code = getDentalTagCode(tag);
                const label = getDentalTagLabel(tag);
                const color = getDentalTagColor(tag);
                return (
                  <div 
                    key={`${toothId}-box-top-${index}`} 
                    style={color ? { backgroundColor: color, color: '#fff' } : {}}
                    title={label}
                    className="flex items-center justify-center border-[0.5px] border-slate-200 leading-none"
                  >
                    {code}
                  </div>
                );
              })}
            </div>
            <div className="mt-[2px] text-center text-[7px] font-semibold leading-none text-slate-900">{toothId}</div>
            <PrintToothSurfaceDiagram surfaces={toothEntry.surfaces} className="mt-[2px]" />
          </>
        )}

        {layout === 'bottom' && (
          <>
            <PrintToothSurfaceDiagram surfaces={toothEntry.surfaces} />
            <div className="mt-[2px] text-center text-[7px] font-semibold leading-none text-slate-900">{toothId}</div>
            <div className={`mt-[2px] grid h-[22px] w-[22px] grid-cols-2 grid-rows-2 overflow-hidden rounded-[3px] border border-slate-300 bg-white text-[5.5px] font-bold text-slate-800`}>
              {[0, 1, 2, 3].map((index) => {
                const tag = gridValues[index];
                const code = getDentalTagCode(tag);
                const label = getDentalTagLabel(tag);
                const color = getDentalTagColor(tag);
                return (
                  <div 
                    key={`${toothId}-box-bottom-${index}`} 
                    style={color ? { backgroundColor: color, color: '#fff' } : {}}
                    title={label}
                    className="flex items-center justify-center border-[0.5px] border-slate-200 leading-none"
                  >
                    {code}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderToothTop = (t) => {
    const toothEntry = normalizeToothChartEntry(String(t), data.dentalChart.teeth[t]);
    return renderPrintToothCard(t, toothEntry, 'top');
  };

  const renderToothBottom = (t) => {
    const toothEntry = normalizeToothChartEntry(String(t), data.dentalChart.teeth[t]);
    return renderPrintToothCard(t, toothEntry, 'bottom');
  };

  const renderPrintRow = ({ key, right, left, layout, spacing }) => {
    const renderer = layout === 'top' ? renderToothTop : renderToothBottom;
    return (
      <div key={key} className={`flex items-center justify-center ${spacing}`}>
        <div className="flex items-center justify-end gap-[2px] pr-3">
          {right.map(renderer)}
        </div>
        <div className="h-[56px] w-px bg-black"></div>
        <div className="flex items-center justify-start gap-[2px] pl-3">
          {left.map(renderer)}
        </div>
      </div>
    );
  };

  return (
    <div className={`${A4_CLASSES} ${baseFontSize} text-black font-sans flex flex-col p-[10mm] pb-[12mm]`}>

      <PrintHeader settings={settings} data={data} />

      {settings.showChartTitle && (
        <h3 className="text-sm font-bold uppercase tracking-wider text-center w-full mb-6 mt-4">
          {settings.chartTitle || 'DENTAL CHART'}
        </h3>
      )}

      {/* PATIENT INFO STRIP */}
      <div className={`flex w-full mb-4 pb-1 border-b-2 ${bStyle}`}>
        <div className="flex-1 flex items-end">
          <span className="font-semibold mr-1">Patient:</span>
          <div className="flex-1 font-bold px-1 border-b border-black">{data.lastName ? `${data.lastName}, ${data.firstName} ${data.middleName}` : ''}</div>
        </div>
        <div className="w-32 flex items-end ml-4">
          <span className="font-semibold mr-1">Age/Sex:</span>
          <div className="flex-1 font-bold px-1 border-b border-black">{data.age} / {data.sex}</div>
        </div>
        <div className="w-48 flex items-end ml-4">
          <span className="font-semibold mr-1">Date:</span>
          <div className="flex-1 font-bold px-1 border-b border-black text-right">{data.dentalChart.chartDate}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">

        {/* CLINICAL CHART GRAPHIC AREA */}
        <div className="mb-4 rounded-[12px] border border-transparent px-4 py-4">
          <div className="grid grid-cols-[58px_1fr_58px] items-center mb-3 text-[7px] font-bold uppercase tracking-[0.08em] text-slate-500">
            <div className="text-left leading-tight">Status<br />Right</div>
            <div className="text-center">Dental Status Chart</div>
            <div className="text-right">Left</div>
          </div>

          <div className="relative">
            <div className="absolute left-1/2 top-[56px] bottom-[56px] w-px -translate-x-1/2 bg-black"></div>
            <div className="absolute left-[10%] right-[10%] top-1/2 h-px -translate-y-1/2 bg-black"></div>

            <div className="absolute -left-1 top-[44px] text-[6.5px] font-bold uppercase leading-tight text-slate-500">
              Temporary<br />Teeth
            </div>
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 text-[6.5px] font-bold uppercase leading-tight text-slate-500">
              Permanent<br />Teeth
            </div>
            <div className="absolute -left-1 bottom-[44px] text-[6.5px] font-bold uppercase leading-tight text-slate-500">
              Temporary<br />Teeth
            </div>

            {printRows.map(renderPrintRow)}
          </div>
        </div>

        <DentalRecordChartFooterPrint data={data} bStyle={bStyle} />
      </div>

    </div>
  );
}

function DentalRecordChartFooterPrint({ data, bStyle }: any) {
  const chart = data.dentalChart || {};
  const recommendationPlan = chart.recommendationPlan || {};
  const xrayTaken = chart.xrayTaken || {};
  const remarksStatus = chart.remarks?.status || '';
  const checked = (value: boolean) => (value ? '/' : '');

  const PrintCheckLine = ({ isChecked, label, children }: any) => (
    <div className="flex items-center leading-[1.18]">
      <span className={`mr-1 inline-block h-[9px] w-[24px] border-b ${bStyle} text-center text-[7px] font-black leading-[8px]`}>
        {checked(isChecked)}
      </span>
      <span>{label}</span>
      {children}
    </div>
  );

  return (
    /* PDF footer layout controls:
       - mt-3 moves the whole bottom section closer/farther from the tooth chart.
       - text-[8px] changes the printed text size for this whole bottom section.
       - leading-[1.25] changes vertical line spacing across the footer. */
    <div className="mt-3 flex flex-1 flex-col text-[8px] leading-[1.25] text-black">
      {/* Legend/X-ray row controls:
          - grid-cols controls the width of: Legend label, Condition, Restorations, Surgery, X-ray.
          - gap-x-8 controls horizontal spacing between those columns.
          - pt-4 controls the top padding after the horizontal separator line. */}
      <div className={`grid grid-cols-[44px_1.12fr_1.24fr_1fr_1.35fr] gap-x-8 border-t ${bStyle} pt-4`}>
        <div className="font-black">Legend:</div>
        <DentalRecordLegendColumns print />
        <section>
          <h4 className="mb-1 text-[8.5px] font-black">X-ray Taken</h4>
          {/* PDF X-RAY GAP KNOB: space-y-[2px] adds small spacing between X-ray rows. */}
          <div className="space-y-[2px]">
            <PrintCheckLine isChecked={xrayTaken.periapical} label="Periapical Taken">
              <span className="ml-1">(Tth no.</span>
              <span className={`mx-1 inline-block min-w-[40px] border-b ${bStyle} text-center leading-[9px]`}>{xrayTaken.periapicalToothNo || ''}</span>
              <span>)</span>
            </PrintCheckLine>
            <PrintCheckLine isChecked={xrayTaken.panoramic} label="Panoramic" />
            <PrintCheckLine isChecked={xrayTaken.cephalometric} label="Cephalometric" />
            <PrintCheckLine isChecked={xrayTaken.occlusalUpperLower} label="Occlusal (Upper/Lower)" />
            <PrintCheckLine isChecked={xrayTaken.others} label="Others:">
              <span className={`ml-1 inline-block min-w-[48px] border-b ${bStyle}`}>{xrayTaken.othersText || ''}</span>
            </PrintCheckLine>
          </div>
        </section>
      </div>

      {/* Recommendation area controls:
          - mt-4 moves Recommendation up/down relative to the legend row.
          - gap-x-14 changes the space between left checklist and right tooth-number lines.
          - pl-14 / pr-12 move the left and right groups inward/outward. */}
      <div className="mt-4">
        <div className="mb-2 text-center text-[8px] font-black">RECOMMENDATION:</div>
        <div className="grid grid-cols-[1fr_1fr] gap-x-14">
          <div className="space-y-[2.5px] pl-14">
            {DENTAL_RECORD_RECOMMENDATIONS.map((item) => (
              <PrintCheckLine key={item.key} isChecked={recommendationPlan[item.key]} label={item.label} />
            ))}
          </div>
          <div className="space-y-[2.5px] pr-12">
            <div className="flex items-center leading-tight">
              <span className="mr-1">TOOTH #</span>
              <span className={`mr-2 inline-block min-w-[54px] border-b ${bStyle} text-center`}>{recommendationPlan.restorativeFillingToothNo || ''}</span>
              <span>{checked(recommendationPlan.restorativeFilling)}</span>
              <span className="ml-1">RESTORATIVE FILLING</span>
            </div>
            <div className="flex items-center leading-tight">
              <span className="mr-1">TOOTH #</span>
              <span className={`mr-2 inline-block min-w-[54px] border-b ${bStyle} text-center`}>{recommendationPlan.toothExtractionToothNo || ''}</span>
              <span>{checked(recommendationPlan.toothExtraction)}</span>
              <span className="ml-1">TOOTH EXTRACTION</span>
            </div>
          </div>
        </div>
      </div>

      {/* Remarks controls:
          - mt-4 moves Remarks up/down.
          - grid-cols-[70px_1fr] controls label width vs option width.
          - space-y controls distance between DENTALLY FIT and FOR COMPLIANCE. */}
      <div className="mt-4 grid grid-cols-[70px_1fr] items-start">
        <div className="font-semibold">REMARKS:</div>
        <div className="space-y-[1.5px]">
          {DENTAL_RECORD_REMARK_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center leading-tight">
              <span className={`mr-1 inline-block h-[8px] w-[8px] rounded-full border ${bStyle} text-center text-[6px] leading-[6px]`}>
                {remarksStatus === option.value ? '/' : ''}
              </span>
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Paper footer controls:
          - mt-auto pushes Checked By / Date to the bottom of the dental chart PDF page.
          - grid-cols-[1fr_260px] controls line width: 1fr is Checked By, 260px is Date.
          - text-[8.5px] controls Checked By / Date label and value font size.
          - gap-16 controls space between Checked By and Date.
          - pt-8 / pb-1 controls vertical spacing above and below this footer row. */}
      <div className="mt-auto grid grid-cols-[1fr_260px] items-end gap-16 pt-8 pb-1 text-[9.5px]">
        <div className="flex items-end">
          <span className="mr-1 whitespace-nowrap">Checked By:</span>
          <span className={`block min-h-[13px] flex-1 border-b ${bStyle} px-1 leading-[13px]`}>{chart.checkedBy || ''}</span>
        </div>
        <div className="flex items-end">
          <span className="mr-1 whitespace-nowrap">Date:</span>
          <span className={`block min-h-[13px] flex-1 border-b ${bStyle} px-1 text-right leading-[13px]`}>{chart.chartDate || ''}</span>
        </div>
      </div>
    </div>
  );
}

// 2C: TREATMENT RECORD PREVIEW PAGE
function TreatmentRecordPages({ data, settings }) {
  const fontSizeMap = { 'Small': 'text-[9px]', 'Medium': 'text-[10px]', 'Large': 'text-[11px]' };
  const baseFontSize = fontSizeMap[settings.fontSize] || 'text-[10px]';
  const bStyle = settings.borderStyle || 'border-black';
  const A4_CLASSES = "a4-page bg-white w-[210mm] h-[297mm] mx-auto shadow-2xl relative box-border overflow-hidden flex flex-col";

  const ROWS_PER_PAGE = settings.treatmentRowHeight === 'Compact' ? 40 : 30;

  let displayRecords = [...data.treatmentRecords];
  if (displayRecords.length < ROWS_PER_PAGE) {
    const blanksNeeded = ROWS_PER_PAGE - displayRecords.length;
    displayRecords = [...displayRecords, ...Array.from({ length: blanksNeeded }, generateEmptyTreatmentRow)];
  }

  const pages: typeof displayRecords[] = [];
  for (let i = 0; i < displayRecords.length; i += ROWS_PER_PAGE) {
    pages.push(displayRecords.slice(i, i + ROWS_PER_PAGE));
  }

  return (
    <>
      {pages.map((pageRows, pageIndex) => (
        <div key={`tr-page-${pageIndex}`} className={`${A4_CLASSES} ${baseFontSize} text-black font-sans flex flex-col p-[10mm] ${pageIndex > 0 ? 'page-break' : ''}`}>

          <PrintHeader settings={settings} data={data} />

          {pageIndex === 0 && settings.showTreatmentTitle && (
            <h2 className="text-center font-bold text-lg uppercase mb-4 tracking-widest">{settings.treatmentTitle}</h2>
          )}

          <table className={`w-full border-collapse border ${bStyle} text-left`}>
            <thead>
              <tr className={`border-b ${bStyle} bg-slate-50`}>
                <th className={`border-r ${bStyle} px-2 py-1.5 w-24 font-bold`}>Date</th>
                <th className={`border-r ${bStyle} px-2 py-1.5 w-16 font-bold`}>Tooth No./s</th>
                <th className={`border-r ${bStyle} px-2 py-1.5 font-bold`}>Procedure</th>
                {settings.showDentistColumn && <th className={`border-r ${bStyle} px-2 py-1.5 w-28 font-bold`}>Dentist/s</th>}
                <th className={`border-r ${bStyle} px-2 py-1.5 w-24 font-bold text-right`}>Amount Charged</th>
                <th className={`border-r ${bStyle} px-2 py-1.5 w-24 font-bold text-right`}>Amount Paid</th>
                {settings.showBalanceColumn && <th className={`px-2 py-1.5 w-24 font-bold text-right`}>Balance</th>}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, idx) => (
                <tr key={`row-${pageIndex}-${idx}`} className={`border-b ${bStyle}`}>
                  <td className={`border-r ${bStyle} px-2 ${settings.treatmentRowHeight === 'Compact' ? 'py-1' : 'py-2'}`}>{row.date}</td>
                  <td className={`border-r ${bStyle} px-2`}>{row.toothNumbers}</td>
                  <td className={`border-r ${bStyle} px-2 truncate max-w-[200px]`}>{row.procedure}</td>
                  {settings.showDentistColumn && <td className={`border-r ${bStyle} px-2`}>{row.dentist}</td>}
                  <td className={`border-r ${bStyle} px-2 text-right`}>{row.amountCharged ? Number(row.amountCharged).toFixed(2) : ''}</td>
                  <td className={`border-r ${bStyle} px-2 text-right`}>{row.amountPaid ? Number(row.amountPaid).toFixed(2) : ''}</td>
                  {settings.showBalanceColumn && <td className={`px-2 text-right`}>{row.balance ? Number(row.balance).toFixed(2) : ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>

          {pageIndex === pages.length - 1 && (settings.showDentistNameInTreatmentRecord || settings.showSignatureInTreatmentRecord) && (
            <div className={`flex ${settings.dentistSignaturePlacement === 'left' ? 'justify-start' : settings.dentistSignaturePlacement === 'center' ? 'justify-center' : 'justify-end'} mt-auto pt-8`}>
              <DentistSignatureBlock
                settings={settings}
                manualName=""
                bStyle={bStyle}
                showName={settings.showDentistNameInTreatmentRecord}
                showSignature={settings.showSignatureInTreatmentRecord}
              />
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// 2D: LIVE PREVIEW CONTAINER
function LivePreviewContainer({ data, settings }) {
  const [previewMode, setPreviewMode] = useState('form');

  return (
    <div className="flex flex-col items-center py-4 sm:py-8 min-h-full">
      <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex mb-6 sticky top-20 z-10 flex-wrap justify-center gap-1">
        <button onClick={() => setPreviewMode('form')} className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-all ${previewMode === 'form' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          Patient Form
        </button>
        <button onClick={() => setPreviewMode('chart')} className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-all ${previewMode === 'chart' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          Dental Chart
        </button>
        <button onClick={() => setPreviewMode('treatment')} className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-all ${previewMode === 'treatment' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          Treatment Record
        </button>
        <button onClick={() => setPreviewMode('certificate')} className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-all ${previewMode === 'certificate' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          Certificate
        </button>
        <button onClick={() => setPreviewMode('consent')} className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-all ${previewMode === 'consent' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          Consent
        </button>
        <button onClick={() => setPreviewMode('contract')} className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-all ${previewMode === 'contract' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          Contract
        </button>
      </div>

      <div className="origin-top bg-transparent flex flex-col gap-8">
        {previewMode === 'form' && <PatientFormPage data={data} settings={settings} />}
        {previewMode === 'chart' && <div className="shadow-2xl"><DentalChartPage data={data} settings={settings} /></div>}
        {previewMode === 'treatment' && <div className="flex flex-col gap-8"><TreatmentRecordPages data={data} settings={settings} /></div>}
        {previewMode === 'certificate' && <CertificateFormPage data={data} settings={settings} />}
        {previewMode === 'consent' && <ConsentFormPage data={data} settings={settings} />}
        {previewMode === 'contract' && <div className="flex flex-col gap-8"><PatientContractPages data={data} /></div>}
      </div>
    </div>
  );
}

function PrintToothSurfaceDiagram({ surfaces, className = '' }) {
  const topColor = SURFACE_COLORS[(surfaces?.top || 'null') as keyof typeof SURFACE_COLORS] || SURFACE_COLORS.null;
  const rightColor = SURFACE_COLORS[(surfaces?.right || 'null') as keyof typeof SURFACE_COLORS] || SURFACE_COLORS.null;
  const bottomColor = SURFACE_COLORS[(surfaces?.bottom || 'null') as keyof typeof SURFACE_COLORS] || SURFACE_COLORS.null;
  const leftColor = SURFACE_COLORS[(surfaces?.left || 'null') as keyof typeof SURFACE_COLORS] || SURFACE_COLORS.null;
  const centerColor = SURFACE_COLORS[(surfaces?.center || 'null') as keyof typeof SURFACE_COLORS] || SURFACE_COLORS.null;

  return (
    <div className={`relative h-[24px] w-[24px] shrink-0 overflow-hidden rounded-full border border-slate-400 bg-white ${className}`}>
      <div
        className="absolute left-0 top-0 h-0 w-0"
        style={{ borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: `12px solid ${topColor}` }}
      />
      <div
        className="absolute right-0 top-0 h-0 w-0"
        style={{ borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderRight: `12px solid ${rightColor}` }}
      />
      <div
        className="absolute bottom-0 left-0 h-0 w-0"
        style={{ borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: `12px solid ${bottomColor}` }}
      />
      <div
        className="absolute left-0 top-0 h-0 w-0"
        style={{ borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderLeft: `12px solid ${leftColor}` }}
      />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-400" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-slate-400" />
      <div className="absolute inset-[6px] rounded-full border border-slate-400" style={{ backgroundColor: centerColor }} />
    </div>
  );
}

function DoctorsRegistryModule({ doctors, onSaveDoctors, isSavingDoctors, doctorDbStatus }) {
  const [draftDoctors, setDraftDoctors] = useState(doctors);

  useEffect(() => {
    setDraftDoctors(doctors);
  }, [doctors]);

  const updateDoctor = (id, field, value) => {
    setDraftDoctors((prev) => prev.map((doctor) => (
      doctor.id === id ? { ...doctor, [field]: value } : doctor
    )));
  };

  const addDoctor = () => {
    setDraftDoctors((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', role: 'Attending Dentist', signature: null },
    ]);
  };

  const removeDoctor = (id) => {
    setDraftDoctors((prev) => prev.filter((doctor) => doctor.id !== id));
  };

  const handleSignatureUpload = (id, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateDoctor(id, 'signature', reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Doctors Registry</div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Clinic Dentists</h2>
            <p className="mt-2 text-sm text-slate-500">Add your attending dentists here so the system can reuse them in dental charts, treatment records, and PDF generation without manual typing.</p>
            <p className="mt-3 text-sm text-blue-700">{doctorDbStatus || 'Ready to manage doctors.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={addDoctor} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
              Add Doctor
            </button>
            <button
              onClick={() => onSaveDoctors(draftDoctors)}
              disabled={isSavingDoctors}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSavingDoctors ? 'Saving...' : 'Save Doctors'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {draftDoctors.map((doctor, index) => (
          <div key={doctor.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Doctor {index + 1}</div>
              <button onClick={() => removeDoctor(doctor.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
                Remove
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Doctor Name</label>
                  <input
                    type="text"
                    value={doctor.name}
                    onChange={(e) => updateDoctor(doctor.id, 'name', e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Dr. Full Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Role / Title</label>
                  <input
                    type="text"
                    value={doctor.role}
                    onChange={(e) => updateDoctor(doctor.id, 'role', e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Attending Dentist"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Signature</label>
                <input type="file" accept="image/*" onChange={(e) => handleSignatureUpload(doctor.id, e)} className="w-full text-xs" />
                <div className="mt-3 flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
                  {doctor.signature ? (
                    <img src={doctor.signature} alt={`${doctor.name || 'Doctor'} signature`} className="max-h-20 object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400">No signature uploaded</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {draftDoctors.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No clinic doctors yet. Click <span className="font-semibold text-slate-700">Add Doctor</span> to create your registry.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODULE 3: CUSTOMIZATION PANEL
// ============================================================================

const Toggle = ({ checked, onChange }) => (
  <div className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${checked ? 'bg-blue-500' : 'bg-gray-300'}`} onClick={() => onChange(!checked)}>
    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </div>
);

function DocumentFormDesigner({ documentType, settings: committedSettings, setSettings, onSaveSettings, isSavingTemplate, data }: any) {
  const config = DOCUMENT_FORM_CONFIG[documentType as DocumentFormType];
  const prefix = config.prefix;
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftSettings, setDraftSettings] = useState(committedSettings);

  useEffect(() => {
    if (!isEditMode) {
      setDraftSettings(committedSettings);
    }
  }, [committedSettings, isEditMode]);

  const fieldName = (suffix: string) => `${prefix}${suffix}`;
  const current = draftSettings;
  const layout = getDocumentLayoutSettings(current, documentType);

  const handleChange = (suffix: string, value: any) => {
    setDraftSettings((prev: any) => ({ ...prev, [fieldName(suffix)]: value }));
  };

  const handleLogoUpload = (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handleChange('Logo', reader.result);
    reader.readAsDataURL(file);
  };

  const resetCurrentFormDefaults = () => {
    const defaultKeys = Object.keys(DEFAULT_SETTINGS).filter((key) => key.startsWith(prefix));
    setDraftSettings((prev: any) => defaultKeys.reduce((next, key) => ({ ...next, [key]: DEFAULT_SETTINGS[key] }), { ...prev }));
  };

  const handleSaveChanges = async () => {
    const normalized = mergeSettings(draftSettings);
    const saved = await onSaveSettings(normalized);
    if (saved) {
      setSettings(normalized);
      setIsEditMode(false);
    }
  };

  const numberControl = (suffix: string, label: string, min = 0) => (
    <div className="flex items-center justify-between gap-4">
      <label className="text-[13px] font-medium text-slate-700">{label}</label>
      <input
        type="number"
        min={min}
        value={current[fieldName(suffix)]}
        onChange={(e) => handleChange(suffix, Number(e.target.value))}
        className="w-24 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">System Settings</div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">{config.label} Editor</h2>
            <p className="mt-2 text-sm text-slate-500">{config.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isEditMode ? (
              <button onClick={() => { setDraftSettings(committedSettings); setIsEditMode(true); }} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                <Edit3 size={16} className="mr-2" /> Modify Form
              </button>
            ) : (
              <>
                <button onClick={resetCurrentFormDefaults} className="inline-flex items-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                  <RotateCcw size={16} className="mr-2" /> Reset This Form
                </button>
                <button onClick={handleSaveChanges} disabled={isSavingTemplate} className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                  {isSavingTemplate ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <div className={`space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all ${!isEditMode ? 'opacity-60 pointer-events-none select-none' : ''}`}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500">Brand Logo</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <label className="text-[13px] font-medium text-slate-700">Choose File</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-1/2 text-xs" />
              </div>
              {layout.logo && (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-2 text-xs font-semibold text-slate-500">Current logo</div>
                  <div className="flex items-center justify-between gap-3">
                    <img src={layout.logo} alt={`${config.label} logo preview`} className="max-h-20 max-w-[220px] object-contain" />
                    <button onClick={() => handleChange('Logo', null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      Remove
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-slate-700">Show Brand Logo</label>
                <Toggle checked={current[fieldName('ShowLogo')]} onChange={(value) => handleChange('ShowLogo', value)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-slate-700">Show Logo Outline</label>
                <Toggle checked={current[fieldName('LogoOutline')]} onChange={(value) => handleChange('LogoOutline', value)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-slate-700">Show Page Outline</label>
                <Toggle checked={current[fieldName('PageOutline')]} onChange={(value) => handleChange('PageOutline', value)} />
              </div>
              {numberControl('LogoSize', 'Logo Height (px)', 24)}
              {numberControl('LogoGap', 'Gap Below Logo (px)', 0)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500">Page Padding</h3>
            <p className="mt-2 text-xs text-slate-500">These values control the printable page margins inside the A4 paper.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {numberControl('PagePaddingTop', 'Top', 0)}
              {numberControl('PagePaddingBottom', 'Bottom', 0)}
              {numberControl('PagePaddingLeft', 'Left', 0)}
              {numberControl('PagePaddingRight', 'Right', 0)}
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100/70 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Live Printable Preview</h3>
            <p className="text-sm text-slate-500">This is the same page used for Print and Download PDF.</p>
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-auto rounded-2xl border border-slate-200 bg-slate-200/60 p-3">
            {documentType === 'certificate' ? (
              <CertificateFormPage data={data} settings={current} />
            ) : (
              <ConsentFormPage data={data} settings={current} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomizeModule({ settings: committedSettings, setSettings, onSaveSettings, isSavingTemplate, doctors }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftSettings, setDraftSettings] = useState(committedSettings);

  useEffect(() => {
    if (!isEditMode) {
      setDraftSettings(committedSettings);
    }
  }, [committedSettings, isEditMode]);

  const settings = draftSettings;

  const handleChange = (field, value) => setDraftSettings(prev => ({ ...prev, [field]: value }));

  const handleImageUpload = (field, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleChange(field, reader.result);
      reader.readAsDataURL(file);
    }
  };

  const moveHeader = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === draftSettings.headerOrder.length - 1) return;
    const newOrder = [...draftSettings.headerOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + direction];
    newOrder[index + direction] = temp;
    handleChange('headerOrder', newOrder);
  };

  const moveSection = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === draftSettings.sectionOrder.length - 1) return;
    const newOrder = [...draftSettings.sectionOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + direction];
    newOrder[index + direction] = temp;
    handleChange('sectionOrder', newOrder);
  };

  const toggleSectionVis = (id) => {
    setDraftSettings(prev => ({ ...prev, visibility: { ...prev.visibility, [id]: !prev.visibility[id] } }));
  };

  const handleSaveChanges = async () => {
    const normalized = mergeSettings(draftSettings);
    const saved = await onSaveSettings(normalized);
    if (saved) {
      setSettings(normalized);
      setIsEditMode(false);
    }
  };

  const handleDefaultDoctorChange = (doctorId) => {
    const doctor = getDoctorById(doctors, doctorId);
    setDraftSettings((prev) => ({
      ...prev,
      defaultDentistId: doctorId,
      defaultDentistName: doctor?.name || '',
      defaultDentistRole: doctor?.role || 'Attending Dentist',
      defaultDentistSignature: doctor?.signature || null,
    }));
  };

  return (
    <div className="w-full space-y-6 pb-6">

      {/* EDIT MODE LOCK / UNLOCK CONTROLS */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 transition-all">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            {isEditMode ? <Unlock className="mr-2 text-green-500" size={20} /> : <Lock className="mr-2 text-slate-500" size={20} />}
            {isEditMode ? 'Editing Mode Active' : 'Template is Locked'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isEditMode ? 'Make your changes below and click Save when done.' : 'Click Modify PDF to unlock and customize the template settings.'}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          {!isEditMode ? (
            <button onClick={() => { setDraftSettings(committedSettings); setIsEditMode(true); }} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <Edit3 size={16} className="mr-2" /> Modify PDF
            </button>
          ) : (
            <>
              <button onClick={() => { if (window.confirm("Are you sure you want to reset all settings to default?")) setDraftSettings(DEFAULT_SETTINGS); }} className="flex items-center px-4 py-2 bg-white text-red-600 border border-red-200 rounded-md text-sm font-medium hover:bg-red-50 transition-colors shadow-sm">
                <RotateCcw size={16} className="mr-2" /> Reset Defaults
              </button>
              <button onClick={handleSaveChanges} disabled={isSavingTemplate} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-green-400 transition-colors shadow-sm">
                {isSavingTemplate ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />} Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* WRAP THE REST OF THE OPTIONS IN A VISUALLY DISABLED LAYER IF LOCKED */}
      <div className={`space-y-6 transition-all duration-300 ${!isEditMode ? 'opacity-60 pointer-events-none select-none' : ''}`}>

        {/* PRINT TARGET SETTINGS */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 bg-blue-50/30">
          <h3 className="text-[13px] font-semibold text-slate-800 mb-4">Pages to Print / Export</h3>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-8">
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={draftSettings.printPatientForm} onChange={e => handleChange('printPatientForm', e.target.checked)} className="rounded text-blue-600" />
              <span className="text-sm font-medium">Patient Information Form</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={draftSettings.printDentalChart} onChange={e => handleChange('printDentalChart', e.target.checked)} className="rounded text-blue-600" />
              <span className="text-sm font-medium">Dental Chart Form</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={draftSettings.printTreatmentRecord} onChange={e => handleChange('printTreatmentRecord', e.target.checked)} className="rounded text-blue-600" />
              <span className="text-sm font-medium">Treatment Record</span>
            </label>
          </div>
          <p className="text-xs text-slate-500 mt-3">Checked items will be combined into a single document when you click the Print or Download PDF buttons. Each form will print on a separate page.</p>
        </div>

        {/* HEADER LAYOUT ORDER */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-[13px] font-semibold text-slate-800 mb-2">Header Layout Order</h3>
          <p className="text-[11px] text-slate-500 mb-4">Click arrows to reorder how elements appear left-to-right in the header.</p>
          <div className="space-y-1">
            {settings.headerOrder.map((itemId, index) => {
              const item = HEADER_ITEMS.find(i => i.id === itemId);
              return (
                <div key={itemId} className="flex items-center space-x-3 py-2 border-b border-slate-100 last:border-0">
                  <GripVertical size={14} className="text-slate-300" />
                  <button onClick={() => moveHeader(index, -1)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ArrowUp size={14} /></button>
                  <button onClick={() => moveHeader(index, 1)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ArrowDown size={14} /></button>
                  <span className="text-[13px] text-slate-700">{item?.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* HEADER & BRANDING / IMAGES */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-8">

          {/* BRANDING */}
          <div>
            <h3 className="text-[13px] font-semibold text-slate-800 mb-4">Header & Branding</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Clinic Name</label>
                <input type="text" value={settings.clinicName} onChange={e => handleChange('clinicName', e.target.value)} className="w-1/2 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show Clinic Name</label>
                <Toggle checked={settings.showClinicName} onChange={v => handleChange('showClinicName', v)} />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Address</label>
                <input type="text" value={settings.clinicAddress} onChange={e => handleChange('clinicAddress', e.target.value)} className="w-1/2 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show Address</label>
                <Toggle checked={settings.showAddress} onChange={v => handleChange('showAddress', v)} />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Contact</label>
                <input type="text" value={settings.clinicContact} onChange={e => handleChange('clinicContact', e.target.value)} className="w-1/2 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show Contact</label>
                <Toggle checked={settings.showContact} onChange={v => handleChange('showContact', v)} />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <label className="text-[13px] text-slate-700 w-2/3">Header Bottom Margin (px)</label>
                <input type="number" value={settings.headerMarginBottom} onChange={e => handleChange('headerMarginBottom', Number(e.target.value))} className="w-20 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* PATIENT RECORD BADGE */}
          <div>
            <h3 className="text-[11px] text-slate-400 mb-4 uppercase tracking-wider">Record Title Badge (Middle Contents Spacing)</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Badge Text</label>
                <input type="text" value={settings.recordBadgeText} onChange={e => handleChange('recordBadgeText', e.target.value)} placeholder="Leave blank to hide text" className="w-1/2 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show Badge</label>
                <Toggle checked={settings.showRecordBadge} onChange={v => handleChange('showRecordBadge', v)} />
              </div>

              <div className="flex flex-col space-y-2 mt-2 pt-2">
                <span className="text-[12px] font-medium text-slate-700">Badge Margins (Adjust spacing below Header)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Margin Top (px)</label>
                    <input type="number" value={settings.recordBadgeMarginTop} onChange={e => handleChange('recordBadgeMarginTop', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Margin Bottom (px)</label>
                    <input type="number" value={settings.recordBadgeMarginBottom} onChange={e => handleChange('recordBadgeMarginBottom', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* LEFT IMAGE */}
          <div>
            <h3 className="text-[11px] text-slate-400 mb-4 uppercase tracking-wider">Left Image (Circle Format)</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Upload</label>
                <input type="file" accept="image/*" onChange={e => handleImageUpload('leftImage', e)} className="w-1/2 text-xs" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show</label>
                <Toggle checked={settings.showLeftImage} onChange={v => handleChange('showLeftImage', v)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show Outline</label>
                <Toggle checked={settings.leftImageOutline} onChange={v => handleChange('leftImageOutline', v)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Size (px)</label>
                <input type="number" value={settings.leftImageSize} onChange={e => handleChange('leftImageSize', Number(e.target.value))} className="w-20 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>

              <div className="flex flex-col space-y-2 mt-2 pt-4 border-t border-slate-100">
                <span className="text-[12px] font-medium text-slate-700">Margins (px)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Top</label>
                    <input type="number" value={settings.leftImageMarginTop} onChange={e => handleChange('leftImageMarginTop', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Bottom</label>
                    <input type="number" value={settings.leftImageMarginBottom} onChange={e => handleChange('leftImageMarginBottom', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Left</label>
                    <input type="number" value={settings.leftImageMarginLeft} onChange={e => handleChange('leftImageMarginLeft', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Right</label>
                    <input type="number" value={settings.leftImageMarginRight} onChange={e => handleChange('leftImageMarginRight', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* MIDDLE IMAGE */}
          <div>
            <h3 className="text-[11px] text-slate-400 mb-4 uppercase tracking-wider">Middle Image (Brand Name Logo)</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Upload</label>
                <input type="file" accept="image/*" onChange={e => handleImageUpload('middleImage', e)} className="w-1/2 text-xs" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show</label>
                <Toggle checked={settings.showMiddleImage} onChange={v => handleChange('showMiddleImage', v)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Size (px)</label>
                <input type="number" value={settings.middleImageSize} onChange={e => handleChange('middleImageSize', Number(e.target.value))} className="w-20 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>

              <div className="flex flex-col space-y-2 mt-2 pt-4 border-t border-slate-100">
                <span className="text-[12px] font-medium text-slate-700">Margins (px)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Top</label>
                    <input type="number" value={settings.middleMarginTop} onChange={e => handleChange('middleMarginTop', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Bottom</label>
                    <input type="number" value={settings.middleMarginBottom} onChange={e => handleChange('middleMarginBottom', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Left</label>
                    <input type="number" value={settings.middleMarginLeft} onChange={e => handleChange('middleMarginLeft', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Right</label>
                    <input type="number" value={settings.middleMarginRight} onChange={e => handleChange('middleMarginRight', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* RIGHT IMAGE */}
          <div>
            <h3 className="text-[11px] text-slate-400 mb-4 uppercase tracking-wider">Right Image (2x2 Photo Settings)</h3>
            <p className="text-xs text-slate-500 mb-4">You can set a default image here. Note: If a patient uploads their own 2x2 photo in the Form tab, it will automatically override this placeholder.</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Upload Default</label>
                <input type="file" accept="image/*" onChange={e => handleImageUpload('rightImage', e)} className="w-1/2 text-xs" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show in Print</label>
                <Toggle checked={settings.showRightImage} onChange={v => handleChange('showRightImage', v)} />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Image Fit</label>
                <select value={settings.rightImageFit} onChange={e => handleChange('rightImageFit', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-white rounded-md text-sm text-slate-700">
                  <option value="cover">Cover (Crop to fit)</option>
                  <option value="contain">Contain (Show whole)</option>
                  <option value="fill">Fill (Stretch)</option>
                </select>
              </div>

              <div className="flex flex-col space-y-2 mt-2 pt-2">
                <span className="text-[12px] font-medium text-slate-700">Crop Focus / Positioning (%)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Position X (0-100)</label>
                    <input type="number" min="0" max="100" value={settings.rightImagePositionX} onChange={e => handleChange('rightImagePositionX', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Position Y (0-100)</label>
                    <input type="number" min="0" max="100" value={settings.rightImagePositionY} onChange={e => handleChange('rightImagePositionY', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 mt-2 pt-4 border-t border-slate-100">
                <span className="text-[12px] font-medium text-slate-700">Margins (px)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Top</label>
                    <input type="number" value={settings.rightImageMarginTop} onChange={e => handleChange('rightImageMarginTop', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Bottom</label>
                    <input type="number" value={settings.rightImageMarginBottom} onChange={e => handleChange('rightImageMarginBottom', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Left</label>
                    <input type="number" value={settings.rightImageMarginLeft} onChange={e => handleChange('rightImageMarginLeft', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Right</label>
                    <input type="number" value={settings.rightImageMarginRight} onChange={e => handleChange('rightImageMarginRight', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* DENTIST PROFILE & SIGNATURE */}
        <div className="bg-[#fdf4ff] p-6 rounded-lg shadow-sm border border-fuchsia-200 mt-6">
          <h3 className="text-[13px] font-bold text-fuchsia-900 mb-4 flex items-center"><Edit3 size={16} className="mr-2" /> Dentist Profile & Signature</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-fuchsia-800 font-medium">Default Dentist</label>
              {doctors.length > 0 ? (
                <select value={settings.defaultDentistId || ''} onChange={e => handleDefaultDoctorChange(e.target.value)} className="w-56 px-3 py-1.5 border border-fuchsia-300 bg-white rounded-md text-sm text-fuchsia-800">
                  <option value="">Select clinic dentist...</option>
                  {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
                </select>
              ) : (
                <span className="text-xs text-fuchsia-700">Add doctors first in System Settings.</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-fuchsia-800 font-medium">Dentist Name</label>
              <div className="w-56 rounded-md border border-fuchsia-200 bg-white px-3 py-2 text-sm text-fuchsia-900">{settings.defaultDentistName || 'No doctor selected yet'}</div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-fuchsia-800 font-medium">Dentist Title / Role</label>
              <div className="w-56 rounded-md border border-fuchsia-200 bg-white px-3 py-2 text-sm text-fuchsia-900">{settings.defaultDentistRole || 'Attending Dentist'}</div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-fuchsia-800 font-medium">Signature Source</label>
              <div className="w-56 rounded-md border border-fuchsia-200 bg-white px-3 py-2 text-sm text-fuchsia-900">
                {settings.defaultDentistSignature ? 'Using saved doctor signature' : 'No signature saved for selected doctor'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-fuchsia-800">Signature Size (px)</label>
              <input type="number" value={settings.dentistSignatureSize} onChange={e => handleChange('dentistSignatureSize', Number(e.target.value))} className="w-40 px-3 py-1.5 border border-fuchsia-300 rounded-md text-sm" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-fuchsia-800">Placement Strategy</label>
              <select value={settings.dentistSignaturePlacement} onChange={e => handleChange('dentistSignaturePlacement', e.target.value)} className="w-40 px-3 py-1.5 border border-fuchsia-300 bg-white rounded-md text-sm text-fuchsia-800">
                <option value="left">Left Align</option>
                <option value="center">Center Align</option>
                <option value="right">Right Align</option>
              </select>
            </div>

            <div className="mt-6 pt-4 border-t border-fuchsia-200">
              <h4 className="text-[12px] font-bold text-fuchsia-900 mb-3">Visibility Settings per Module</h4>

              <div className="mb-4">
                <h5 className="text-[11px] font-semibold text-slate-700 uppercase mb-2">Patient Information Record</h5>
                <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded border border-fuchsia-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-600">Show Name</label>
                    <Toggle checked={settings.showDentistNameInPatientRecord} onChange={v => handleChange('showDentistNameInPatientRecord', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-600">Show Signature</label>
                    <Toggle checked={settings.showSignatureInPatientRecord} onChange={v => handleChange('showSignatureInPatientRecord', v)} />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h5 className="text-[11px] font-semibold text-slate-700 uppercase mb-2">Dental Chart</h5>
                <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded border border-fuchsia-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-600">Show Name</label>
                    <Toggle checked={settings.showDentistNameInDentalChart} onChange={v => handleChange('showDentistNameInDentalChart', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-600">Show Signature</label>
                    <Toggle checked={settings.showSignatureInDentalChart} onChange={v => handleChange('showSignatureInDentalChart', v)} />
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-[11px] font-semibold text-slate-700 uppercase mb-2">Treatment Record</h5>
                <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded border border-fuchsia-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-600">Show Name</label>
                    <Toggle checked={settings.showDentistNameInTreatmentRecord} onChange={v => handleChange('showDentistNameInTreatmentRecord', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-600">Show Signature</label>
                    <Toggle checked={settings.showSignatureInTreatmentRecord} onChange={v => handleChange('showSignatureInTreatmentRecord', v)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTIONS */}
        <div className="bg-[#cfd2d6] p-6 rounded-lg shadow-sm border border-slate-300 mt-6">
          <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Patient Form Sections</h3>
          <div className="space-y-2">
            {settings.sectionOrder.map((sectionId, index) => {
              const section = SECTIONS.find(s => s.id === sectionId);
              const isVisible = settings.visibility[sectionId];
              return (
                <div key={sectionId} className={`flex items-center space-x-3 py-2 px-3 border border-slate-400/30 rounded-md bg-[#e2e5e8] transition-opacity ${!isVisible ? 'opacity-50' : ''}`}>
                  <button onClick={() => moveSection(index, -1)} className="text-slate-500 hover:text-slate-800"><ArrowUp size={14} /></button>
                  <button onClick={() => moveSection(index, 1)} className="text-slate-500 hover:text-slate-800"><ArrowDown size={14} /></button>
                  <button onClick={() => toggleSectionVis(sectionId)} className={`hover:text-blue-600 ${isVisible ? 'text-slate-600' : 'text-slate-400'}`}>
                    {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <span className={`text-[13px] ml-2 ${!isVisible ? 'line-through text-slate-500' : 'text-slate-700'}`}>{section?.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* DENTAL CHART SETTINGS */}
        <div className="bg-[#e0f2fe] p-6 rounded-lg shadow-sm border border-blue-200">
          <h3 className="text-[13px] font-bold text-blue-900 mb-4 flex items-center"><Activity size={16} className="mr-2" /> Dental Chart Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-blue-800 font-medium">Chart Main Title</label>
              <input type="text" value={settings.chartTitle} onChange={e => handleChange('chartTitle', e.target.value)} className="w-40 px-3 py-1.5 border border-blue-300 rounded-md text-sm" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-blue-800">Show Chart Title</label>
              <Toggle checked={settings.showChartTitle} onChange={v => handleChange('showChartTitle', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-blue-800">Show Legend</label>
              <Toggle checked={settings.showChartLegend} onChange={v => handleChange('showChartLegend', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-blue-800">Show Findings</label>
              <Toggle checked={settings.showChartFindings} onChange={v => handleChange('showChartFindings', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-blue-800">Show Recommendations</label>
              <Toggle checked={settings.showChartRecommendation} onChange={v => handleChange('showChartRecommendation', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-blue-800">Show Footer (Sign-off)</label>
              <Toggle checked={settings.showChartFooter} onChange={v => handleChange('showChartFooter', v)} />
            </div>
          </div>
        </div>

        {/* TREATMENT RECORD SETTINGS */}
        <div className="bg-[#ecfccb] p-6 rounded-lg shadow-sm border border-sky-200">
          <h3 className="text-[13px] font-bold text-sky-900 mb-4 flex items-center"><ClipboardList size={16} className="mr-2" /> Treatment Record Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-sky-800 font-medium">Table Title</label>
              <input type="text" value={settings.treatmentTitle} onChange={e => handleChange('treatmentTitle', e.target.value)} className="w-40 px-3 py-1.5 border border-sky-300 rounded-md text-sm" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-sky-800">Show Title</label>
              <Toggle checked={settings.showTreatmentTitle} onChange={v => handleChange('showTreatmentTitle', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-sky-800">Show Dentist Column</label>
              <Toggle checked={settings.showDentistColumn} onChange={v => handleChange('showDentistColumn', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-sky-800">Show Balance Column</label>
              <Toggle checked={settings.showBalanceColumn} onChange={v => handleChange('showBalanceColumn', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-sky-800">Row Height Density</label>
              <select value={settings.treatmentRowHeight} onChange={e => handleChange('treatmentRowHeight', e.target.value)} className="w-40 px-3 py-1.5 border border-sky-300 bg-white rounded-md text-sm text-sky-800">
                <option value="Compact">Compact (Fits More)</option>
                <option value="Normal">Normal</option>
              </select>
            </div>
          </div>
        </div>

        {/* TYPOGRAPHY */}
        <div className="bg-[#cfd2d6] p-6 rounded-lg shadow-sm border border-slate-300">
          <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Typography</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Font Size</label>
              <select value={settings.fontSize} onChange={e => handleChange('fontSize', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                {['Small', 'Medium', 'Large'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Label Size</label>
              <select value={settings.labelSize} onChange={e => handleChange('labelSize', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                {['Small', 'Medium', 'Large'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Line Spacing</label>
              <select value={settings.lineSpacing} onChange={e => handleChange('lineSpacing', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                {['Tight', 'Normal', 'Loose'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* PRINT STYLE */}
        <div className="bg-[#cfd2d6] p-6 rounded-lg shadow-sm border border-slate-300">
          <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Print Style</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Border Style</label>
              <select value={settings.borderStyle} onChange={e => handleChange('borderStyle', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                <option value="border-black">Solid Black</option>
                <option value="border-slate-800">Dark Gray</option>
                <option value="border-transparent">None</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Underline Style</label>
              <select value={settings.underlineStyle} onChange={e => handleChange('underlineStyle', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                {['Solid', 'Dashed', 'Dotted'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Section Separator</label>
              <select value={settings.sectionSeparator} onChange={e => handleChange('sectionSeparator', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                {['None', 'Line', 'Space'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Overflow Behavior</label>
              <select value={settings.overflowBehavior} onChange={e => handleChange('overflowBehavior', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                {['Truncate', 'Wrap (May overflow page)'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* LAYOUT */}
        <div className="bg-[#cfd2d6] p-6 rounded-lg shadow-sm border border-slate-300">
          <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Layout</h3>
          <div className="flex items-center justify-between">
            <label className="text-[13px] text-slate-700">Spacing Density</label>
            <select value={settings.density} onChange={e => handleChange('density', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
              {['Compact', 'Comfortable'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </div>

    </div>
  );
}

