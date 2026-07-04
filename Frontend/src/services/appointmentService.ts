import { loadPatientRecord, savePatientRecord } from './patientService';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

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
}

type AppointmentStatusInput =
  | AppointmentStatus
  | 'Scheduled'
  | 'Completed'
  | 'Cancelled'
  | 'No Show'
  | 'No-Show'
  | 'no show'
  | 'no-show';

type AppointmentDraft = Partial<Pick<Appointment, 'appointment_date' | 'appointment_time' | 'reason' | 'status' | 'date' | 'time' | 'title' | 'details'>> & {
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

type LoadedPatientRecord = NonNullable<Awaited<ReturnType<typeof loadPatientRecord>>>;

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const ALLOWED_STATUSES: AppointmentStatus[] = ['scheduled', 'completed', 'cancelled'];

const ok = <T,>(data: T): ServiceResult<T> => ({ ok: true, data });
const fail = <T,>(error: string): ServiceResult<T> => ({ ok: false, error });

const normalizeStatus = (value: unknown): AppointmentStatus | null => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'no show' || normalized === 'no-show' || normalized === 'noshow') {
    return 'cancelled';
  }
  return ALLOWED_STATUSES.includes(normalized as AppointmentStatus) ? (normalized as AppointmentStatus) : null;
};

const isValidDate = (value: string) => {
  if (!value?.trim()) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const isValidTime = (value: string) => /^\d{2}:\d{2}$/.test(String(value || '').trim());

const getPatientData = (patientData: unknown): PatientDataRecord => (
  patientData && typeof patientData === 'object' ? { ...(patientData as Record<string, unknown>) } : {}
);

const readStoredAppointments = (patientData: unknown, patientId?: string): Appointment[] => {
  const data = getPatientData(patientData);
  return Array.isArray(data.appointments)
    ? data.appointments.map((appointment) => normalizeStoredAppointment(appointment, patientId)).filter(Boolean)
    : [];
};

const normalizeStoredAppointment = (raw: StoredAppointment, patientId?: string): Appointment => {
  const appointmentDate = String(raw?.appointment_date || raw?.date || '').trim();
  const appointmentTime = String(raw?.appointment_time || raw?.time || '').trim();
  const status = normalizeStatus(raw?.status) || 'scheduled';
  const reason = raw?.reason ?? raw?.title ?? null;
  const details = String(raw?.details ?? '').trim();

  return {
    id: String(raw?.id || crypto.randomUUID()),
    patient_id: String(raw?.patient_id || patientId || '').trim(),
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    reason: reason ? String(reason).trim() : null,
    status,
    date: appointmentDate,
    time: appointmentTime,
    title: String(raw?.title || reason || 'Appointment').trim() || 'Appointment',
    details,
  };
};

const normalizeAppointmentInput = (patientId: string, input: AppointmentDraft): Appointment => {
  const appointmentDate = String(input.appointment_date || input.date || '').trim();
  const appointmentTime = String(input.appointment_time || input.time || '').trim();
  const status = normalizeStatus(input.status) || 'scheduled';
  const reason = input.reason ?? input.title ?? null;
  const details = String(input.details ?? '').trim();

  return {
    id: String(input.id || crypto.randomUUID()),
    patient_id: patientId,
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    reason: reason ? String(reason).trim() : null,
    status,
    date: appointmentDate,
    time: appointmentTime,
    title: String(input.title || reason || 'Appointment').trim() || 'Appointment',
    details,
  };
};

const saveAppointments = async (patientRecord: LoadedPatientRecord, appointments: Appointment[]): Promise<ServiceResult<Appointment[]>> => {
  const patientData = getPatientData(patientRecord.patient_data);
  const nextPatientData = {
    ...patientData,
    appointments,
  };

  const saveResult = await savePatientRecord({
    id: patientRecord.id,
    record_name: patientRecord.record_name,
    patient_last_name: patientRecord.patient_last_name,
    patient_first_name: patientRecord.patient_first_name,
    patient_data: nextPatientData,
    favorite_statuses: patientRecord.favorite_statuses,
  });

  return ok(readStoredAppointments(saveResult.patient_data, patientRecord.id));
};

export const getAppointments = async (patientId: string): Promise<ServiceResult<Appointment[]>> => {
  if (!patientId?.trim()) {
    return fail('Patient ID is required.');
  }

  const patientRecord = await loadPatientRecord(patientId);
  if (!patientRecord) {
    return fail('Patient record not found.');
  }

  return ok(readStoredAppointments(patientRecord.patient_data, patientRecord.id));
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

  const appointmentDate = String(appointmentInput.appointment_date || appointmentInput.date || '').trim();
  const appointmentTime = String(appointmentInput.appointment_time || appointmentInput.time || '').trim();
  const status = normalizeStatus(appointmentInput.status);

  if (!appointmentDate || !isValidDate(appointmentDate)) {
    return fail('Appointment date is required and must be valid.');
  }

  if (!appointmentTime || !isValidTime(appointmentTime)) {
    return fail('Appointment time is required and must be valid.');
  }

  if (!status) {
    return fail('Appointment status must be scheduled, completed, or cancelled.');
  }

  const patientRecord = await loadPatientRecord(patientId);
  if (!patientRecord) {
    return fail('Patient record not found.');
  }

  const appointments = readStoredAppointments(patientRecord.patient_data, patientRecord.id);
  const nextAppointment = normalizeAppointmentInput(patientId, {
    ...appointmentInput,
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    status,
  });

  appointments.push(nextAppointment);
  const saveResult = await saveAppointments(patientRecord, appointments);
  if ('error' in saveResult) return fail(saveResult.error);

  return ok(nextAppointment);
};

export const updateAppointment = async (
  patientId: string,
  appointmentId: string,
  updates: AppointmentDraft,
): Promise<ServiceResult<Appointment>> => {
  if (!patientId?.trim()) {
    return fail('Patient ID is required.');
  }

  const patientRecord = await loadPatientRecord(patientId);
  if (!patientRecord) {
    return fail('Patient record not found.');
  }

  const appointments = readStoredAppointments(patientRecord.patient_data, patientRecord.id);
  const index = appointments.findIndex((entry) => entry.id === appointmentId);
  if (index === -1) {
    return fail('Appointment not found.');
  }

  const merged = normalizeAppointmentInput(patientId, {
    ...appointments[index],
    ...updates,
    id: appointmentId,
  });

  if (!merged.appointment_date || !isValidDate(merged.appointment_date)) {
    return fail('Appointment date is required and must be valid.');
  }

  if (!merged.appointment_time || !isValidTime(merged.appointment_time)) {
    return fail('Appointment time is required and must be valid.');
  }

  if (!ALLOWED_STATUSES.includes(merged.status)) {
    return fail('Appointment status must be scheduled, completed, or cancelled.');
  }

  appointments[index] = merged;
  const saveResult = await saveAppointments(patientRecord, appointments);
  if ('error' in saveResult) return fail(saveResult.error);

  return ok(merged);
};

export const deleteAppointment = async (patientId: string, appointmentId: string): Promise<ServiceResult<Appointment[]>> => {
  if (!patientId?.trim()) {
    return fail('Patient ID is required.');
  }

  const patientRecord = await loadPatientRecord(patientId);
  if (!patientRecord) {
    return fail('Patient record not found.');
  }

  const appointments = readStoredAppointments(patientRecord.patient_data, patientRecord.id).filter((entry) => entry.id !== appointmentId);
  return saveAppointments(patientRecord, appointments);
};
