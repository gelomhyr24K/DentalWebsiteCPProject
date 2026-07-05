import { isSupabaseConfigured, supabase } from '../../supabase';

export type PatientListItem = {
  id: string;
  record_name: string;
  patient_last_name: string | null;
  patient_first_name: string | null;
  patient_data?: any;
  favorite_statuses?: string[];
  created_at?: string;
  updated_at: string;
  archived_at?: string | null;
};

export type PatientRecordRow = {
  id: string;
  record_name: string;
  patient_last_name: string | null;
  patient_first_name: string | null;
  patient_data: unknown;
  favorite_statuses: string[];
  created_at?: string;
  updated_at?: string;
};

export type SavePatientRecordInput = {
  id?: string;
  record_name: string;
  patient_last_name: string | null;
  patient_first_name: string | null;
  patient_data: unknown;
  favorite_statuses: string[];
};

const ensureSupabase = () => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet.');
  }
  return supabase;
};

export const loadActivePatientRecords = async (): Promise<PatientListItem[]> => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('patient_records')
    .select('id, record_name, patient_last_name, patient_first_name, patient_data, favorite_statuses, created_at, updated_at')
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const loadArchivedPatientRecords = async (): Promise<PatientListItem[]> => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('patient_records')
    .select('id, record_name, patient_last_name, patient_first_name, patient_data, favorite_statuses, created_at, updated_at, archived_at')
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const loadPatientRecord = async (recordId?: string | null): Promise<PatientRecordRow | null> => {
  const client = ensureSupabase();
  const query = client
    .from('patient_records')
    .select('id, record_name, patient_last_name, patient_first_name, patient_data, favorite_statuses, created_at, updated_at')
    .is('archived_at', null);

  const { data, error } = recordId
    ? await query.eq('id', recordId).maybeSingle()
    : await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();

  if (error) throw error;
  return data || null;
};

export const savePatientRecord = async (payload: SavePatientRecordInput): Promise<PatientRecordRow> => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('patient_records')
    .upsert({
      id: payload.id,
      record_name: payload.record_name,
      patient_last_name: payload.patient_last_name,
      patient_first_name: payload.patient_first_name,
      patient_data: payload.patient_data,
      favorite_statuses: payload.favorite_statuses,
    })
    .select('id, record_name, patient_last_name, patient_first_name, patient_data, favorite_statuses, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
};

export const archivePatientRecord = async (recordId: string): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client
    .from('patient_records')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', recordId)
    .is('archived_at', null);

  if (error) throw error;
};

export const restorePatientRecord = async (recordId: string): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client
    .from('patient_records')
    .update({ archived_at: null })
    .eq('id', recordId)
    .not('archived_at', 'is', null);

  if (error) throw error;
};

export const deletePatientRecord = async (recordId: string): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client
    .from('patient_records')
    .delete()
    .eq('id', recordId);

  if (error) throw error;
};
