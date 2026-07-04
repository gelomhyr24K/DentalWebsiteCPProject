import { isSupabaseConfigured, supabase } from '../../supabase';

export type DoctorRecord = {
  id: string;
  name: string;
  role: string;
  signature: string | null;
};

const ensureSupabase = () => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet.');
  }
  return supabase;
};

const normalizeDoctors = (snapshot: unknown): DoctorRecord[] => (
  Array.isArray(snapshot)
    ? snapshot
        .map((entry: any) => ({
          id: entry?.id || crypto.randomUUID(),
          name: String(entry?.name || '').trim(),
          role: String(entry?.role || 'Attending Dentist').trim() || 'Attending Dentist',
          signature: entry?.signature || null,
        }))
        .filter((doctor) => doctor.name.trim())
    : []
);

export const loadAppPreferenceSettings = async (preferenceKey: string): Promise<any | null> => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('app_preferences')
    .select('settings')
    .eq('preference_key', preferenceKey)
    .maybeSingle();

  if (error) throw error;
  return data?.settings || null;
};

export const saveAppPreferenceSettings = async (preferenceKey: string, settings: unknown): Promise<void> => {
  const client = ensureSupabase();
  const { error } = await client
    .from('app_preferences')
    .upsert({
      preference_key: preferenceKey,
      settings,
    });

  if (error) throw error;
};

export const loadTemplateSettings = async (): Promise<any | null> => loadAppPreferenceSettings('pdf_template');

export const saveTemplateSettings = async (nextSettings: unknown): Promise<void> => {
  await saveAppPreferenceSettings('pdf_template', nextSettings);
};

export const loadDoctorsRegistry = async (): Promise<DoctorRecord[]> => {
  const settings = await loadAppPreferenceSettings('doctors_registry');
  return normalizeDoctors(settings?.doctors);
};

export const saveDoctorsRegistry = async (nextDoctors: DoctorRecord[]): Promise<DoctorRecord[]> => {
  const normalizedDoctors = normalizeDoctors(nextDoctors);
  await saveAppPreferenceSettings('doctors_registry', { doctors: normalizedDoctors });
  return normalizedDoctors;
};

export const getDoctorById = (doctors: DoctorRecord[], doctorId?: string | null) =>
  doctors.find((doctor) => doctor.id === doctorId) || null;
