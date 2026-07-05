import { isSupabaseConfigured, supabase } from '../../supabase';
import { loadClinicAppointments, mapClinicAppointmentRowToCalendarItem } from './clinicCalendarService';
import { calculatePatientRemainingBalance, formatPatientCurrency } from '../utils/patientFinance';

export type GlobalSearchPatientResult = {
  kind: 'patient';
  id: string;
  title: string;
  detail: string;
  patientCode: string;
  address: string;
  age: string;
  hmo: string;
  raw: any;
};

export type GlobalSearchMasterDirectoryResult = {
  kind: 'master_directory';
  id: string;
  title: string;
  detail: string;
  directoryType: string;
  code: string;
  raw: any;
};

export type GlobalSearchAppointmentResult = {
  kind: 'appointment';
  id: string;
  title: string;
  detail: string;
  patientId: string | null;
  raw: any;
};

export type GlobalSearchResult =
  | GlobalSearchPatientResult
  | GlobalSearchMasterDirectoryResult
  | GlobalSearchAppointmentResult;

export type GlobalSearchResponse = {
  patients: GlobalSearchPatientResult[];
  masterDirectory: GlobalSearchMasterDirectoryResult[];
  appointments: GlobalSearchAppointmentResult[];
  combined: GlobalSearchResult[];
};

const cleanString = (value: unknown) => String(value || '').trim();

const asObject = (value: unknown): Record<string, any> => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
);

const parseLocalDate = (value: unknown) => {
  const raw = cleanString(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const parsed = new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateAge = (birthDate: string) => {
  const parsed = parseLocalDate(birthDate);
  if (!parsed) return '';

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) age -= 1;
  return age >= 0 ? String(age) : '';
};

const getPatientData = (record: any) => (
  record?.patient_data && typeof record.patient_data === 'object'
    ? record.patient_data
    : record?.patientData && typeof record.patientData === 'object'
      ? record.patientData
      : {}
);

const getPatientTags = (record: any) => {
  const data = getPatientData(record);
  const sources = [
    record?.favorite_statuses,
    data.tags,
    data.favorite_statuses,
    record?.tags,
    record?.patientData?.tags,
  ];

  const values = sources.flatMap((source) => {
    if (Array.isArray(source)) return source;
    if (typeof source === 'string') return source.split(',');
    return [];
  });

  return Array.from(
    new Set(
      values
        .map((value) => cleanString(typeof value === 'object' ? (value as any)?.name || (value as any)?.label || (value as any)?.code : value))
        .filter(Boolean)
    )
  );
};

const getPatientName = (record: any) => {
  const data = getPatientData(record);
  const lastName = cleanString(record?.patient_last_name || data.lastName);
  const firstName = cleanString(record?.patient_first_name || data.firstName);
  const middleName = cleanString(data.middleName);

  if (lastName && firstName) return `${lastName}, ${firstName}${middleName ? ` ${middleName.charAt(0)}.` : ''}`;
  if (lastName || firstName) return `${lastName}${firstName}`.trim();
  return cleanString(record?.record_name) || 'Untitled Patient';
};

const getPatientCode = (record: any) => {
  const year = cleanString(record?.created_at).slice(0, 4) || String(new Date().getFullYear());
  const shortId = cleanString(record?.id).split('-')[0]?.slice(0, 4).toUpperCase() || '0000';
  return `PAT-${year}-${shortId}`;
};

const getPatientAddress = (record: any) => {
  const data = getPatientData(record);
  return cleanString(data.address || data.homeAddress || data.currentAddress || data.personalInfo?.address);
};

const getPatientBirthDate = (record: any) => {
  const data = getPatientData(record);
  const personalInfo = asObject(data.personalInfo);
  return cleanString(data.birthDate || data.birthdate || personalInfo.birthDate || personalInfo.birthdate);
};

const getPatientAge = (record: any) => {
  const data = getPatientData(record);
  const birthDate = getPatientBirthDate(record);
  const fromBirthDate = calculateAge(birthDate);
  if (fromBirthDate) return fromBirthDate;

  const numericAge = Number(data.age ?? data.patientAge ?? data.personalInfo?.age);
  return Number.isFinite(numericAge) && numericAge >= 0 ? String(numericAge) : '';
};

const getPatientHmo = (record: any) => {
  const data = getPatientData(record);
  return cleanString(data.hmo || data.HMO || data.insurance || data.dentalInsurance || data.healthcard);
};

const getPatientMobile = (record: any) => {
  const data = getPatientData(record);
  return cleanString(data.mobile || data.contact || data.phone || data.telephone);
};

const getPatientNickname = (record: any) => {
  const data = getPatientData(record);
  return cleanString(data.nickname);
};

const patientMatchesQuery = (record: any, query: string) => {
  const data = getPatientData(record);
  const tags = getPatientTags(record);
  const searchFields = [
    record?.record_name,
    record?.patient_last_name,
    record?.patient_first_name,
    record?.search_text,
    record?.id,
    getPatientName(record),
    getPatientNickname(record),
    getPatientMobile(record),
    getPatientBirthDate(record),
    getPatientAge(record),
    getPatientAddress(record),
    getPatientHmo(record),
    formatPatientCurrency(calculatePatientRemainingBalance(record)),
    ...tags,
    data.address,
    data.homeAddress,
    data.nickname,
    data.age,
    data.birthDate,
    data.birthdate,
    data.hmo,
    data.HMO,
    data.mobile,
    data.search_text,
    JSON.stringify(data),
  ]
    .map((value) => cleanString(value).toLowerCase())
    .filter(Boolean);

  return searchFields.some((field) => field.includes(query));
};

const rankPatient = (record: any, query: string) => {
  const name = getPatientName(record).toLowerCase();
  const code = getPatientCode(record).toLowerCase();
  const nickname = getPatientNickname(record).toLowerCase();
  if (name.startsWith(query)) return 0;
  if (code.startsWith(query)) return 1;
  if (nickname.startsWith(query)) return 2;
  if (name.includes(query)) return 3;
  return 4;
};

const directoryTypeLabel = (value: string) => (
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
);

export const searchPatients = async (query: string): Promise<GlobalSearchPatientResult[]> => {
  const normalized = cleanString(query).toLowerCase();
  if (!normalized || !isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('patient_records')
    .select('*')
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data || [])
    .filter((record) => patientMatchesQuery(record, normalized))
    .sort((a, b) => rankPatient(a, normalized) - rankPatient(b, normalized))
    .slice(0, 8)
    .map((record) => {
      const address = getPatientAddress(record) || 'No address';
      const age = getPatientAge(record) ? `${getPatientAge(record)} yrs old` : 'Age -';
      const hmo = getPatientHmo(record) || 'No HMO';
      return {
        kind: 'patient' as const,
        id: String(record.id),
        title: getPatientName(record),
        detail: `${address} • ${age} • ${hmo}`,
        patientCode: getPatientCode(record),
        address,
        age,
        hmo,
        raw: record,
      };
    });
};

export const searchMasterDirectory = async (query: string): Promise<GlobalSearchMasterDirectoryResult[]> => {
  const normalized = cleanString(query).toLowerCase();
  if (!normalized || !isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('master_directory_items')
    .select('*')
    .eq('is_active', true)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .limit(150);

  if (error) throw error;

  return (data || [])
    .filter((item) => {
      const metadataText = JSON.stringify(item.metadata || {}).toLowerCase();
      const fields = [
        item.code,
        item.name,
        item.description,
        item.instructions,
        item.directory_type,
        metadataText,
      ]
        .map((value) => cleanString(value).toLowerCase())
        .filter(Boolean);
      return fields.some((field) => field.includes(normalized));
    })
    .slice(0, 8)
    .map((item) => ({
      kind: 'master_directory' as const,
      id: String(item.id),
      title: cleanString(item.name) || cleanString(item.code) || 'Untitled Item',
      detail: [cleanString(item.code), directoryTypeLabel(cleanString(item.directory_type)), cleanString(item.description || item.instructions)]
        .filter(Boolean)
        .join(' • '),
      directoryType: cleanString(item.directory_type),
      code: cleanString(item.code),
      raw: item,
    }));
};

const searchAppointments = async (query: string): Promise<GlobalSearchAppointmentResult[]> => {
  const normalized = cleanString(query).toLowerCase();
  if (!normalized) return [];

  try {
    const rows = await loadClinicAppointments();
    return rows
      .map(mapClinicAppointmentRowToCalendarItem)
      .filter((appointment) => {
        const fields = [
          appointment.patientName,
          appointment.title,
          appointment.notes,
          appointment.type,
          appointment.status,
          appointment.date,
          appointment.time,
          appointment.dentistName,
          appointment.treatmentTag,
        ]
          .map((value) => cleanString(value).toLowerCase())
          .filter(Boolean);
        return fields.some((field) => field.includes(normalized));
      })
      .slice(0, 5)
      .map((appointment) => ({
        kind: 'appointment' as const,
        id: appointment.id,
        title: appointment.title || appointment.patientName,
        detail: [appointment.patientName, appointment.date, appointment.time, appointment.status].filter(Boolean).join(' • '),
        patientId: appointment.patientId || null,
        raw: appointment,
      }));
  } catch {
    return [];
  }
};

export const searchGlobal = async (query: string): Promise<GlobalSearchResponse> => {
  const normalized = cleanString(query);
  if (!normalized) {
    return {
      patients: [],
      masterDirectory: [],
      appointments: [],
      combined: [],
    };
  }

  const [patients, masterDirectory, appointments] = await Promise.all([
    searchPatients(normalized),
    searchMasterDirectory(normalized),
    searchAppointments(normalized),
  ]);

  return {
    patients,
    masterDirectory,
    appointments,
    combined: [...patients, ...masterDirectory, ...appointments],
  };
};
