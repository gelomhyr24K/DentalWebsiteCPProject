import { loadPatientRecord } from './patientService';
import {
  archiveClinicAppointment,
  createClinicAppointment,
  loadClinicAppointmentsByPatientId,
  mapClinicAppointmentRowToCalendarItem,
  normalizeAppointmentStatus,
  updateClinicAppointment,
} from './clinicCalendarService';
import type { CalendarAppointment, ClinicAppointmentInput } from '../types/calendar';

export type AppointmentStatus =
  | 'pending'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'missed'
  | 'no_show';

export interface Appointment {
  id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
  status: AppointmentStatus;
  date: string;
  time: string;
  title: string;
  details: string;
  dentist_name?: string | null;
  end_time?: string | null;
}

type AppointmentStatusInput =
  | AppointmentStatus
  | 'Pending'
  | 'Scheduled'
  | 'Completed'
  | 'Cancelled'
  | 'Canceled'
  | 'Rescheduled'
  | 'Missed'
  | 'No Show'
  | 'No-Show'
  | 'no show'
  | 'no-show';

type AppointmentDraft = Partial<Pick<
  Appointment,
  'appointment_date' | 'appointment_time' | 'reason' | 'status' | 'date' | 'time' | 'title' | 'details' | 'dentist_name' | 'end_time'
>> & {
  id?: string;
};

type StoredAppointment = Partial<Appointment> & {
  appointment_date?: string;
  appointment_time?: string;
  reason?: string | null;
  status?: AppointmentStatusInput | string | null;
  date?: string;
  time?: string;
  title?: string;
  details?: string;
};

type PatientDataRecord = {
  appointments?: StoredAppointment[];
  [key: string]: unknown;
};

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const ok = <T,>(data: T): ServiceResult<T> => ({ ok: true, data });
const fail = <T,>(error: string): ServiceResult<T> => ({ ok: false, error });

const cleanString = (value: unknown) => String(value || '').trim();

const isValidDate = (value: string) => {
  if (!value?.trim()) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
};

const isValidTime = (value: string) => /^\d{2}:\d{2}$/.test(cleanString(value));

const getPatientData = (patientData: unknown): PatientDataRecord => (
  patientData && typeof patientData === 'object' ? { ...(patientData as Record<string, unknown>) } : {}
);

const normalizeStatus = (value: unknown): AppointmentStatus =>
  normalizeAppointmentStatus(value) as AppointmentStatus;

const statusLabel = (status: AppointmentStatus) => {
  if (status === 'no_show') return 'No-Show';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const normalizeTimeInput = (time: string) => {
  const value = cleanString(time);
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
};

const normalizePatientDisplayName = (record: Awaited<ReturnType<typeof loadPatientRecord>>) => {
  const data = getPatientData(record?.patient_data);
  const lastName = cleanString(record?.patient_last_name || data.lastName);
  const firstName = cleanString(record?.patient_first_name || data.firstName);

  if (lastName && firstName) return `${lastName}, ${firstName}`;
  if (lastName || firstName) return `${lastName}${firstName}`.trim();
  return cleanString(record?.record_name) || 'Patient';
};

const readLegacyAppointments = (patientData: unknown, patientId?: string): Appointment[] => {
  const data = getPatientData(patientData);
  return Array.isArray(data.appointments)
    ? data.appointments.map((appointment) => normalizeStoredAppointment(appointment, patientId)).filter(Boolean)
    : [];
};

const normalizeStoredAppointment = (raw: StoredAppointment, patientId?: string): Appointment => {
  const appointmentDate = cleanString(raw?.appointment_date || raw?.date);
  const appointmentTime = normalizeTimeInput(cleanString(raw?.appointment_time || raw?.time));
  const status = normalizeStatus(raw?.status);
  const reason = raw?.reason ?? raw?.title ?? null;
  const details = cleanString(raw?.details);

  return {
    id: cleanString(raw?.id || crypto.randomUUID()),
    patient_id: cleanString(raw?.patient_id || patientId),
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    reason: reason ? cleanString(reason) : null,
    status,
    date: appointmentDate,
    time: appointmentTime,
    title: cleanString(raw?.title || reason || 'Appointment') || 'Appointment',
    details,
    dentist_name: raw?.dentist_name || null,
    end_time: raw?.end_time || null,
  };
};

const mapCalendarAppointmentToPatientAppointment = (item: CalendarAppointment): Appointment => {
  const status = normalizeStatus(item.status);
  const notes = cleanString(item.notes);

  return {
    id: item.id,
    patient_id: cleanString(item.patientId),
    appointment_date: item.date,
    appointment_time: normalizeTimeInput(item.time),
    reason: item.title || null,
    status,
    date: item.date,
    time: normalizeTimeInput(item.time),
    title: item.title || 'Appointment',
    details: `${statusLabel(status)}${notes ? ` | ${notes}` : ''}`,
    dentist_name: item.dentistName || null,
    end_time: item.endTime || null,
  };
};

const buildClinicPayload = (
  patientId: string,
  patientName: string,
  input: AppointmentDraft,
): ClinicAppointmentInput => {
  const title = cleanString(input.title || input.reason) || 'Appointment';
  const appointmentDate = cleanString(input.appointment_date || input.date);
  const appointmentTime = normalizeTimeInput(cleanString(input.appointment_time || input.time));

  return {
    patient_id: patientId,
    title,
    appointment_type: 'appointment',
    source: 'patient_appointment',
    status: normalizeStatus(input.status),
    dentist_name: cleanString(input.dentist_name) || null,
    appointment_date: appointmentDate,
    start_time: appointmentTime,
    end_time: normalizeTimeInput(cleanString(input.end_time)) || null,
    reason: cleanString(input.reason || title) || null,
    notes: cleanString(input.details) || null,
    metadata: {
      patientName,
    },
  };
};

const loadPatientOrFail = async (patientId: string) => {
  const patientRecord = await loadPatientRecord(patientId);
  if (!patientRecord) {
    return { error: 'Patient record not found.' } as const;
  }
  return { patientRecord } as const;
};

export const getAppointments = async (patientId: string): Promise<ServiceResult<Appointment[]>> => {
  if (!patientId?.trim()) {
    return fail('Patient ID is required.');
  }

  try {
    const rows = await loadClinicAppointmentsByPatientId(patientId);
    if (rows.length > 0) {
      return ok(rows
        .map(mapClinicAppointmentRowToCalendarItem)
        .filter((item) => item.type !== 'Birthdays')
        .map(mapCalendarAppointmentToPatientAppointment));
    }
  } catch (error) {
    console.warn('Falling back to legacy patient appointments:', error);
  }

  const patientResult = await loadPatientOrFail(patientId);
  if ('error' in patientResult) return fail(patientResult.error);

  return ok(readLegacyAppointments(patientResult.patientRecord.patient_data, patientResult.patientRecord.id));
};

export const getAppointmentsByPatientId = async (patientId: string): Promise<ServiceResult<Appointment[]>> =>
  getAppointments(patientId);

export const getAppointmentById = async (patientId: string, appointmentId: string): Promise<ServiceResult<Appointment | null>> => {
  const appointmentsResult = await getAppointments(patientId);
  if ('error' in appointmentsResult) return fail(appointmentsResult.error);

  const appointment = appointmentsResult.data.find((entry) => entry.id === appointmentId) || null;
  return ok(appointment);
};

export const createAppointment = async (
  patientId: string,
  appointmentInput: AppointmentDraft,
): Promise<ServiceResult<Appointment>> => {
  if (!patientId?.trim()) {
    return fail('Patient ID is required.');
  }

  const appointmentDate = cleanString(appointmentInput.appointment_date || appointmentInput.date);
  const appointmentTime = normalizeTimeInput(cleanString(appointmentInput.appointment_time || appointmentInput.time));

  if (!appointmentDate || !isValidDate(appointmentDate)) {
    return fail('Appointment date is required and must be valid.');
  }

  if (!appointmentTime || !isValidTime(appointmentTime)) {
    return fail('Appointment time is required and must be valid.');
  }

  const patientResult = await loadPatientOrFail(patientId);
  if ('error' in patientResult) return fail(patientResult.error);

  try {
    const row = await createClinicAppointment(buildClinicPayload(
      patientId,
      normalizePatientDisplayName(patientResult.patientRecord),
      {
        ...appointmentInput,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: normalizeStatus(appointmentInput.status),
      },
    ));

    return ok(mapCalendarAppointmentToPatientAppointment(mapClinicAppointmentRowToCalendarItem(row)));
  } catch (error: any) {
    return fail(error?.message || 'Failed to create appointment.');
  }
};

export const updateAppointment = async (
  patientId: string,
  appointmentId: string,
  updates: AppointmentDraft,
): Promise<ServiceResult<Appointment>> => {
  if (!patientId?.trim()) {
    return fail('Patient ID is required.');
  }

  const patientResult = await loadPatientOrFail(patientId);
  if ('error' in patientResult) return fail(patientResult.error);

  const appointmentDate = cleanString(updates.appointment_date || updates.date);
  const appointmentTime = normalizeTimeInput(cleanString(updates.appointment_time || updates.time));

  if (!appointmentDate || !isValidDate(appointmentDate)) {
    return fail('Appointment date is required and must be valid.');
  }

  if (!appointmentTime || !isValidTime(appointmentTime)) {
    return fail('Appointment time is required and must be valid.');
  }

  try {
    const row = await updateClinicAppointment(appointmentId, buildClinicPayload(
      patientId,
      normalizePatientDisplayName(patientResult.patientRecord),
      {
        ...updates,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: normalizeStatus(updates.status),
      },
    ));

    return ok(mapCalendarAppointmentToPatientAppointment(mapClinicAppointmentRowToCalendarItem(row)));
  } catch (error: any) {
    return fail(error?.message || 'Failed to update appointment.');
  }
};

export const deleteAppointment = async (patientId: string, appointmentId: string): Promise<ServiceResult<Appointment[]>> => {
  if (!patientId?.trim()) {
    return fail('Patient ID is required.');
  }

  try {
    await archiveClinicAppointment(appointmentId);
    return getAppointments(patientId);
  } catch (error: any) {
    return fail(error?.message || 'Failed to archive appointment.');
  }
};
