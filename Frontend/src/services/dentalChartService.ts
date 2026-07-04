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

const normalizeToothEntry = (toothId: string, rawEntry: unknown): DentalChartToothEntry => {
  const base = createDefaultToothChartEntry(toothId);
  if (!rawEntry || typeof rawEntry !== 'object') return base;

  const typedEntry = rawEntry as Partial<DentalChartToothEntry> & {
    surfaces?: Partial<Record<DentalChartSurfaceKey, DentalChartSurfaceValue>>;
  };

  return {
    ...base,
    ...typedEntry,
    surfaces: { ...base.surfaces, ...(typedEntry.surfaces || {}) },
    conditions: Array.isArray(typedEntry.conditions) ? typedEntry.conditions : [],
    restorations: Array.isArray(typedEntry.restorations) ? typedEntry.restorations : [],
    surgery: Array.isArray(typedEntry.surgery) ? typedEntry.surgery : [],
    xray: Array.isArray(typedEntry.xray) ? typedEntry.xray : [],
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

export const getDentalChartByPatientId = async (patientId: string): Promise<DentalChartRecord | null> => {
  if (!patientId?.trim()) {
    throw new Error('Patient record ID is required to load a dental chart.');
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('dental_charts')
    .select('id, patient_id, chart_data, summary, chart_mode, version, last_edited_by, created_at, updated_at')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    chart_data: normalizeDentalChartData(data.chart_data),
  } as DentalChartRecord;
};

export const createDentalChart = async (patientId: string, initialChartData?: Partial<DentalChartData>): Promise<DentalChartRecord> => {
  if (!patientId?.trim()) {
    throw new Error('Patient record ID is required to create a dental chart.');
  }

  const client = ensureSupabase();
  const nextChartData = normalizeDentalChartData(initialChartData || createEmptyDentalChartData());
  const { data, error } = await client
    .from('dental_charts')
    .insert({
      patient_id: patientId,
      chart_data: nextChartData,
      summary: nextChartData.findings || null,
      version: 1,
    })
    .select('id, patient_id, chart_data, summary, chart_mode, version, last_edited_by, created_at, updated_at')
    .single();

  if (error) throw error;

  return {
    ...data,
    chart_data: normalizeDentalChartData(data.chart_data),
  } as DentalChartRecord;
};

export const upsertDentalChart = async (
  patientId: string,
  chartData: Partial<DentalChartData>,
  summary?: string | null,
  chartMode?: string | null,
): Promise<DentalChartRecord> => {
  if (!patientId?.trim()) {
    throw new Error('Patient record ID is required to save a dental chart.');
  }

  const client = ensureSupabase();
  const normalizedChartData = normalizeDentalChartData(chartData);
  const { data, error } = await client
    .from('dental_charts')
    .upsert(
      {
        patient_id: patientId,
        chart_data: normalizedChartData,
        summary: summary ?? normalizedChartData.findings ?? null,
        chart_mode: chartMode ?? null,
      },
      { onConflict: 'patient_id' },
    )
    .select('id, patient_id, chart_data, summary, chart_mode, version, last_edited_by, created_at, updated_at')
    .single();

  if (error) throw error;

  return {
    ...data,
    chart_data: normalizeDentalChartData(data.chart_data),
  } as DentalChartRecord;
};

export const saveDentalChart = upsertDentalChart;

export const loadDentalChart = async (patientId: string): Promise<DentalChartData> => {
  const record = await getDentalChartByPatientId(patientId);
  return record?.chart_data || createEmptyDentalChartData();
};
