import { isSupabaseConfigured, supabase } from '../../supabase';
import type {
  CalendarAppointment,
  CalendarAppointmentStatus,
  CalendarAppointmentType,
  CalendarAppointmentSource,
  ClinicAppointmentInput,
  ClinicAppointmentRow,
  ClinicAppointmentStatus,
  ClinicAppointmentType,
} from '../types/calendar';

export type {
  CalendarAppointment,
  CalendarAppointmentStatus,
  CalendarAppointmentType,
  ClinicAppointmentInput,
  ClinicAppointmentRow,
  ClinicAppointmentStatus,
  ClinicAppointmentType,
};

export type LoadClinicAppointmentsParams = {
  patientId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  includeArchived?: boolean;
};

type ProgressNoteRecallInput = {
  patientId: string;
  progressNoteId: string;
  linkedBillId?: string | null;
  appointmentDate: string;
  startTime?: string | null;
  endTime?: string | null;
  title?: string | null;
  notes?: string | null;
  dentistName?: string | null;
  treatmentTag?: string | null;
  lastEditedBy?: string | null;
  metadata?: Record<string, unknown> | null;
};

const TYPE_LABELS: Record<ClinicAppointmentType, CalendarAppointmentType> = {
  appointment: 'Appointments',
  recall: 'Recalls',
  birthday: 'Birthdays',
  event: 'Events / Schedules',
  online_booking: 'Online Bookings',
  google_calendar: 'Google Calendar',
};

const STATUS_LABELS: Record<ClinicAppointmentStatus, CalendarAppointmentStatus> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
  missed: 'Missed',
  no_show: 'No-Show',
};

const ensureSupabase = () => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet.');
  }
  return supabase;
};

const asMetadata = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
);

const cleanString = (value: unknown) => String(value || '').trim();

export const normalizeAppointmentType = (type: unknown): ClinicAppointmentType => {
  const normalized = cleanString(type).toLowerCase().replace(/\s+/g, '_');
  const aliases: Record<string, ClinicAppointmentType> = {
    appointment: 'appointment',
    appointments: 'appointment',
    patient_appointment: 'appointment',
    recall: 'recall',
    recalls: 'recall',
    birthday: 'birthday',
    birthdays: 'birthday',
    event: 'event',
    events: 'event',
    events_schedules: 'event',
    'events_/_schedules': 'event',
    schedule: 'event',
    schedules: 'event',
    online: 'online_booking',
    online_booking: 'online_booking',
    online_bookings: 'online_booking',
    google: 'google_calendar',
    google_calendar: 'google_calendar',
  };

  return aliases[normalized] || 'appointment';
};

export const normalizeAppointmentStatus = (status: unknown): ClinicAppointmentStatus => {
  const normalized = cleanString(status).toLowerCase().replace(/[\s-]+/g, '_');
  const aliases: Record<string, ClinicAppointmentStatus> = {
    pending: 'pending',
    scheduled: 'scheduled',
    completed: 'completed',
    complete: 'completed',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    rescheduled: 'rescheduled',
    missed: 'missed',
    no_show: 'no_show',
    noshow: 'no_show',
  };

  return aliases[normalized] || 'scheduled';
};

export const appointmentTypeToCalendarLabel = (type: unknown): CalendarAppointmentType =>
  TYPE_LABELS[normalizeAppointmentType(type)];

export const appointmentStatusToCalendarLabel = (status: unknown): CalendarAppointmentStatus =>
  STATUS_LABELS[normalizeAppointmentStatus(status)];

const getPatientNameFromJoinedRecord = (row: ClinicAppointmentRow) => {
  const joined = row.patient_records;
  const data = asMetadata(joined?.patient_data);
  const lastName = cleanString(joined?.patient_last_name || data.lastName);
  const firstName = cleanString(joined?.patient_first_name || data.firstName);

  if (lastName && firstName) return `${lastName}, ${firstName}`;
  if (lastName || firstName) return `${lastName}${firstName}`.trim();
  return cleanString(joined?.record_name);
};

export const mapClinicAppointmentRowToCalendarItem = (row: ClinicAppointmentRow): CalendarAppointment => {
  const metadata = asMetadata(row.metadata);
  const type = appointmentTypeToCalendarLabel(row.appointment_type);
  const patientName = cleanString(metadata.patientName)
    || getPatientNameFromJoinedRecord(row)
    || (type === 'Events / Schedules' ? cleanString(row.title || row.notes) : '')
    || 'Unassigned Patient';

  return {
    id: row.id,
    patientId: row.patient_id || null,
    patientName,
    dentistName: cleanString(row.dentist_name),
    date: cleanString(row.appointment_date),
    time: cleanString(row.start_time),
    endTime: row.end_time || null,
    type,
    status: appointmentStatusToCalendarLabel(row.status),
    title: cleanString(row.title || row.reason) || type,
    notes: cleanString(row.notes || row.reason),
    treatmentTag: row.treatment_tag || null,
    source: (row.source || 'manual') as CalendarAppointmentSource,
    linkedProgressNoteId: row.linked_progress_note_id || null,
    linkedBillId: row.linked_bill_id || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    archivedAt: row.archived_at || null,
    metadata,
  };
};

export const loadClinicAppointments = async (
  params: LoadClinicAppointmentsParams = {},
): Promise<ClinicAppointmentRow[]> => {
  const client = ensureSupabase();
  let query: any = client
    .from('clinic_appointments')
    .select(`
      *,
      patient_records (
        record_name,
        patient_last_name,
        patient_first_name,
        patient_data
      )
    `)
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true });

  if (!params.includeArchived) {
    query = query.is('archived_at', null);
  }
  if (params.patientId) {
    query = query.eq('patient_id', params.patientId);
  }
  if (params.dateFrom) {
    query = query.gte('appointment_date', params.dateFrom);
  }
  if (params.dateTo) {
    query = query.lte('appointment_date', params.dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ClinicAppointmentRow[];
};

export const loadClinicAppointmentsByPatientId = async (patientId: string): Promise<ClinicAppointmentRow[]> => {
  if (!patientId?.trim()) return [];
  return loadClinicAppointments({ patientId });
};

export const loadClinicAppointmentsByDateRange = async (
  dateFrom: string,
  dateTo: string,
): Promise<ClinicAppointmentRow[]> =>
  loadClinicAppointments({ dateFrom, dateTo });

export const createClinicAppointment = async (input: ClinicAppointmentInput): Promise<ClinicAppointmentRow> => {
  const client = ensureSupabase();
  const payload = {
    ...input,
    appointment_type: normalizeAppointmentType(input.appointment_type),
    status: normalizeAppointmentStatus(input.status),
  };

  const { data, error } = await client
    .from('clinic_appointments')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as ClinicAppointmentRow;
};

export const updateClinicAppointment = async (
  id: string,
  updates: Partial<ClinicAppointmentInput>,
): Promise<ClinicAppointmentRow> => {
  const client = ensureSupabase();
  const payload = {
    ...updates,
    ...(updates.appointment_type ? { appointment_type: normalizeAppointmentType(updates.appointment_type) } : {}),
    ...(updates.status ? { status: normalizeAppointmentStatus(updates.status) } : {}),
  };

  const { data, error } = await client
    .from('clinic_appointments')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as ClinicAppointmentRow;
};

export const archiveClinicAppointment = async (id: string): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client
    .from('clinic_appointments')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .is('archived_at', null);

  if (error) throw error;
};

export const cancelClinicAppointment = async (id: string): Promise<ClinicAppointmentRow> =>
  updateClinicAppointment(id, { status: 'cancelled' });

export const deleteClinicAppointment = async (id: string): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client
    .from('clinic_appointments')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const upsertProgressNoteRecallAppointment = async (
  input: ProgressNoteRecallInput,
): Promise<ClinicAppointmentRow | null> => {
  if (!input.patientId?.trim() || !input.progressNoteId?.trim() || !input.appointmentDate?.trim()) {
    return null;
  }

  const client = ensureSupabase();
  const { data: existing, error: findError } = await client
    .from('clinic_appointments')
    .select('*')
    .eq('patient_id', input.patientId)
    .eq('linked_progress_note_id', input.progressNoteId)
    .eq('source', 'progress_note_recall')
    .maybeSingle();

  if (findError) throw findError;

  const payload: ClinicAppointmentInput & { archived_at?: string | null } = {
    patient_id: input.patientId,
    title: input.title?.trim() || 'Recall Visit',
    appointment_type: 'recall',
    source: 'progress_note_recall',
    status: 'scheduled',
    dentist_name: input.dentistName || null,
    appointment_date: input.appointmentDate,
    start_time: input.startTime || null,
    end_time: input.endTime || null,
    reason: input.title?.trim() || 'Recall Visit',
    notes: input.notes || `Recall linked to progress note ${input.progressNoteId}`,
    treatment_tag: input.treatmentTag || null,
    linked_progress_note_id: input.progressNoteId,
    linked_bill_id: input.linkedBillId || null,
    metadata: input.metadata || null,
    last_edited_by: input.lastEditedBy || null,
    archived_at: null,
  };

  if (existing?.id) {
    const { data, error } = await client
      .from('clinic_appointments')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw error;
    return data as ClinicAppointmentRow;
  }

  return createClinicAppointment(payload);
};

export const archiveProgressNoteRecallAppointment = async (
  patientId: string,
  progressNoteId: string,
): Promise<void> => {
  if (!patientId?.trim() || !progressNoteId?.trim()) return;

  const client = ensureSupabase();
  const { error } = await client
    .from('clinic_appointments')
    .update({ archived_at: new Date().toISOString() })
    .eq('patient_id', patientId)
    .eq('linked_progress_note_id', progressNoteId)
    .eq('source', 'progress_note_recall')
    .is('archived_at', null);

  if (error) throw error;
};
