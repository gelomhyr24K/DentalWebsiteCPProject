import { isSupabaseConfigured, supabase } from '../../supabase';

export type DentalChartSurfaceKey = 'top' | 'right' | 'bottom' | 'left' | 'center';
export type DentalChartSurfaceValue = 'cavity' | 'pasta' | null;

export interface DentalChartToothEntry {
  toothId: string;
  surfaces: Record<DentalChartSurfaceKey, DentalChartSurfaceValue>;
  summary: string;
  conditions: string[];
  restorations: string[];
  surgery: string[];
  xray: string[];
}

export interface DentalChartData {
  teeth: Record<string, DentalChartToothEntry>;
  periodontal: {
    gingivitis: boolean;
    early: boolean;
    moderate: boolean;
    advanced: boolean;
  };
  occlusion: {
    class: string;
    overjet: boolean;
    overbite: boolean;
    midline: boolean;
    crossbite: boolean;
  };
  appliances: {
    orthodontic: boolean;
    stayplate: boolean;
    others: string;
  };
  tmd: {
    clenching: boolean;
    clicking: boolean;
    trismus: boolean;
    muscleSpasm: boolean;
  };
  recommendationPlan: {
    oralProphylaxis: boolean;
    prosthodonticsManagement: boolean;
    rootCanalTreatment: boolean;
    others: boolean;
    restorativeFilling: boolean;
    restorativeFillingToothNo: string;
    toothExtraction: boolean;
    toothExtractionToothNo: string;
  };
  xrayTaken: {
    periapical: boolean;
    periapicalToothNo: string;
    panoramic: boolean;
    cephalometric: boolean;
    occlusalUpperLower: boolean;
    others: boolean;
    othersText: string;
  };
  remarks: {
    status: string;
  };
  findings: string;
  recommendation: string;
  checkedBy: string;
  chartDate: string;
}

export interface DentalChartRecord {
  id: string;
  patient_id: string;
  chart_data: DentalChartData;
  summary: string | null;
  chart_mode: string | null;
  version: number;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
  recall_date?: string | null;
  medical_condition?: string | null;
  medications?: string | null;
  allergies?: string | null;
  extraoral_exam?: string | null;
  archived_at?: string | null;
}

export const DENTAL_CHART_TOOTH_IDS = [
  '55', '54', '53', '52', '51', '61', '62', '63', '64', '65',
  '18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28',
  '48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38',
  '85', '84', '83', '82', '81', '71', '72', '73', '74', '75',
] as const;

const createDefaultToothChartEntry = (toothId: string): DentalChartToothEntry => ({
  toothId,
  surfaces: { top: null, right: null, bottom: null, left: null, center: null },
  summary: '',
  conditions: [],
  restorations: [],
  surgery: [],
  xray: [],
});

export const createEmptyDentalChartData = (): DentalChartData => ({
  teeth: Object.fromEntries(DENTAL_CHART_TOOTH_IDS.map((toothId) => [toothId, createDefaultToothChartEntry(toothId)])),
  periodontal: { gingivitis: false, early: false, moderate: false, advanced: false },
  occlusion: { class: '', overjet: false, overbite: false, midline: false, crossbite: false },
  appliances: { orthodontic: false, stayplate: false, others: '' },
  tmd: { clenching: false, clicking: false, trismus: false, muscleSpasm: false },
  recommendationPlan: {
    oralProphylaxis: false,
    prosthodonticsManagement: false,
    rootCanalTreatment: false,
    others: false,
    restorativeFilling: false,
    restorativeFillingToothNo: '',
    toothExtraction: false,
    toothExtractionToothNo: '',
  },
  xrayTaken: {
    periapical: false,
    periapicalToothNo: '',
    panoramic: false,
    cephalometric: false,
    occlusalUpperLower: false,
    others: false,
    othersText: '',
  },
  remarks: { status: '' },
  findings: '',
  recommendation: '',
  checkedBy: '',
  chartDate: new Date().toISOString().split('T')[0],
});

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

const normalizeToothEntry = (toothId: string, rawEntry: unknown): any => {
  const base = createDefaultToothChartEntry(toothId);
  if (!rawEntry || typeof rawEntry !== 'object') return base;

  const typedEntry = rawEntry as any;

  return {
    ...base,
    ...typedEntry,
    surfaces: { ...base.surfaces, ...(typedEntry.surfaces || {}) },
    status: Array.isArray(typedEntry.status) ? typedEntry.status.map(normalizeSavedDentalTag).filter(Boolean) : [],
    conditions: Array.isArray(typedEntry.conditions) ? typedEntry.conditions.map(normalizeSavedDentalTag).filter(Boolean) : [],
    restorations: Array.isArray(typedEntry.restorations) ? typedEntry.restorations.map(normalizeSavedDentalTag).filter(Boolean) : [],
    surgery: Array.isArray(typedEntry.surgery) ? typedEntry.surgery.map(normalizeSavedDentalTag).filter(Boolean) : [],
    xray: Array.isArray(typedEntry.xray) ? typedEntry.xray.map(normalizeSavedDentalTag).filter(Boolean) : [],
  };
};

export const normalizeDentalChartData = (rawChartData: unknown): DentalChartData => {
  const base = createEmptyDentalChartData();
  const typedChart = (rawChartData && typeof rawChartData === 'object' ? rawChartData : {}) as Partial<DentalChartData>;

  return {
    ...base,
    ...typedChart,
    teeth: Object.fromEntries(
      DENTAL_CHART_TOOTH_IDS.map((toothId) => [toothId, normalizeToothEntry(toothId, typedChart.teeth?.[toothId])]),
    ),
    periodontal: { ...base.periodontal, ...(typedChart.periodontal || {}) },
    occlusion: { ...base.occlusion, ...(typedChart.occlusion || {}) },
    appliances: { ...base.appliances, ...(typedChart.appliances || {}) },
    tmd: { ...base.tmd, ...(typedChart.tmd || {}) },
    recommendationPlan: { ...base.recommendationPlan, ...(typedChart.recommendationPlan || {}) },
    xrayTaken: { ...base.xrayTaken, ...(typedChart.xrayTaken || {}) },
    remarks: { ...base.remarks, ...(typedChart.remarks || {}) },
  };
};

const ensureSupabase = () => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet.');
  }
  return supabase;
};

export const getDentalChartsByPatientId = async (patientId: string): Promise<DentalChartRecord[]> => {
  if (!patientId?.trim()) {
    throw new Error('Patient record ID is required to load dental charts.');
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('dental_charts')
    .select('*')
    .eq('patient_id', patientId)
    .is('archived_at', null)
    .order('recall_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map(record => ({
    ...record,
    chart_data: normalizeDentalChartData(record.chart_data),
  })) as DentalChartRecord[];
};

export const getDentalChartById = async (chartId: string): Promise<DentalChartRecord | null> => {
  if (!chartId?.trim()) {
    throw new Error('Chart ID is required.');
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('dental_charts')
    .select('*')
    .eq('id', chartId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    chart_data: normalizeDentalChartData(data.chart_data),
  } as DentalChartRecord;
};

export const createDentalChartRecord = async (
  patientId: string,
  chartPayload: any,
  options?: { source?: string }
): Promise<DentalChartRecord> => {
  if (!patientId?.trim()) {
    throw new Error('Patient record ID is required.');
  }

  // Guard: only allow explicit user-initiated saves
  if (options?.source !== 'explicit-dental-chart-save') {
    throw new Error(
      'Blocked automatic dental chart insert. Dental charts can only be created from an explicit save action.'
    );
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('dental_charts')
    .insert({
      patient_id: patientId,
      chart_data: chartPayload.chartData,
      summary: chartPayload.summary || null,
      recall_date: chartPayload.recallDate || new Date().toISOString().slice(0, 10),
      medical_condition: chartPayload.medicalCondition || null,
      medications: chartPayload.medications || null,
      allergies: chartPayload.allergies || null,
      extraoral_exam: chartPayload.extraoralExam || null
    })
    .select()
    .single();

  if (error) throw error;

  console.log('Only explicit dental chart save should insert row');
  console.log('ALL CHARTS AFTER INSERT:', data);

  return {
    ...data,
    chart_data: normalizeDentalChartData(data.chart_data),
  } as DentalChartRecord;
};

export const updateDentalChartRecord = async (chartId: string, chartPayload: any): Promise<DentalChartRecord> => {
  if (!chartId?.trim()) {
    throw new Error('Chart ID is required for updating.');
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('dental_charts')
    .update({
      chart_data: chartPayload.chartData,
      summary: chartPayload.summary || null,
      recall_date: chartPayload.recallDate,
      medical_condition: chartPayload.medicalCondition || null,
      medications: chartPayload.medications || null,
      allergies: chartPayload.allergies || null,
      extraoral_exam: chartPayload.extraoralExam || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', chartId)
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    chart_data: normalizeDentalChartData(data.chart_data),
  } as DentalChartRecord;
};

export const deleteDentalChartRecord = async (chartId: string): Promise<void> => {
  if (!chartId?.trim()) throw new Error('Chart ID is required.');
  
  const client = ensureSupabase();
  const { error } = await client
    .from('dental_charts')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', chartId);

  if (error) throw error;
};

export const saveDentalChart = async (
  patientId: string,
  chartId: string,
  chartPayload: any,
): Promise<DentalChartRecord> => {
  if (!patientId?.trim() || !chartId?.trim()) {
    throw new Error('Patient ID and Chart ID are required to save a dental chart.');
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('dental_charts')
    .upsert(
      {
        id: chartId,
        patient_id: patientId,
        chart_data: chartPayload.chartData,
        summary: chartPayload.summary || null,
        recall_date: chartPayload.recallDate || new Date().toISOString().slice(0, 10),
        medical_condition: chartPayload.medicalCondition || null,
        medications: chartPayload.medications || null,
        allergies: chartPayload.allergies || null,
        extraoral_exam: chartPayload.extraoralExam || null
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    chart_data: normalizeDentalChartData(data.chart_data),
  } as DentalChartRecord;
};

export const loadDentalChart = async (patientId: string): Promise<DentalChartData> => {
  const records = await getDentalChartsByPatientId(patientId);
  return records.length > 0 ? records[0].chart_data : createEmptyDentalChartData();
};
