export type CalendarAppointmentType = string;

export type ClinicAppointmentType = string;

export type CalendarAppointmentStatus =
  | 'Pending'
  | 'Scheduled'
  | 'Completed'
  | 'Cancelled'
  | 'Rescheduled'
  | 'Missed'
  | 'No-Show';

export type ClinicAppointmentStatus =
  | 'pending'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'missed'
  | 'no_show';

export type CalendarAppointmentSource =
  | 'manual'
  | 'patient_appointment'
  | 'progress_note_recall'
  | 'birthday'
  | 'event'
  | 'online_booking'
  | 'google_calendar';

export interface CalendarAppointment {
  id: string;
  patientId?: string | null;
  patientName: string;
  dentistName: string;
  date: string;
  time: string;
  endTime?: string | null;
  type: CalendarAppointmentType;
  status: CalendarAppointmentStatus;
  title: string;
  notes: string;
  treatmentTag?: string | null;
  source: CalendarAppointmentSource;
  linkedProgressNoteId?: string | null;
  linkedBillId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  archivedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ClinicAppointmentInput {
  patient_id?: string | null;
  title: string;
  appointment_type: ClinicAppointmentType;
  source: CalendarAppointmentSource;
  status: ClinicAppointmentStatus;
  dentist_name?: string | null;
  appointment_date: string;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
  notes?: string | null;
  treatment_tag?: string | null;
  linked_progress_note_id?: string | null;
  linked_bill_id?: string | null;
  google_event_id?: string | null;
  online_booking_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
  last_edited_by?: string | null;
}

export interface ClinicAppointmentRow extends ClinicAppointmentInput {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  archived_at: string | null;
  patient_records?: {
    record_name?: string | null;
    patient_last_name?: string | null;
    patient_first_name?: string | null;
    patient_data?: Record<string, unknown> | null;
  } | null;
}
