import { isSupabaseConfigured, supabase } from '../../supabase';
import type { MasterDirectoryInput, MasterDirectoryItem, MasterDirectoryType } from '../types/masterDirectory';

export type { MasterDirectoryInput, MasterDirectoryItem, MasterDirectoryType };

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const ok = <T,>(data: T): ServiceResult<T> => ({ ok: true, data });
const fail = <T,>(error: string): ServiceResult<T> => ({ ok: false, error });

const TOOTH_ITEM_DIRECTORY_TYPES: MasterDirectoryType[] = [
  'tooth_status',
  'tooth_conditions',
  'tooth_prosthodontics',
  'tooth_surgery',
  'tooth_xray',
];

const ensureSupabase = () => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured yet.');
  }
  return supabase;
};

const normalizeItem = (row: any): MasterDirectoryItem => ({
  id: String(row.id),
  directory_type: row.directory_type as MasterDirectoryType,
  code: row.code || null,
  name: String(row.name || '').trim(),
  description: row.description || null,
  price: row.price === null || row.price === undefined ? null : Number(row.price),
  dosage: row.dosage || null,
  frequency: row.frequency || null,
  duration: row.duration || null,
  instructions: row.instructions || null,
  color: row.color || null,
  icon: row.icon || null,
  is_active: row.is_active !== false,
  sort_order: Number(row.sort_order) || 0,
  metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
  created_at: row.created_at,
  updated_at: row.updated_at,
  archived_at: row.archived_at || null,
});

const normalizePayload = (input: Partial<MasterDirectoryInput>) => {
  const payload: Record<string, unknown> = { ...input };

  if ('code' in input) payload.code = input.code?.trim() || null;
  if ('name' in input) payload.name = input.name?.trim();
  if ('description' in input) payload.description = input.description?.trim() || null;
  if ('price' in input) payload.price = input.price === undefined || input.price === null || Number.isNaN(Number(input.price)) ? null : Number(input.price);
  if ('dosage' in input) payload.dosage = input.dosage?.trim() || null;
  if ('frequency' in input) payload.frequency = input.frequency?.trim() || null;
  if ('duration' in input) payload.duration = input.duration?.trim() || null;
  if ('instructions' in input) payload.instructions = input.instructions?.trim() || null;
  if ('color' in input) payload.color = input.color?.trim() || null;
  if ('icon' in input) payload.icon = input.icon?.trim() || null;
  if ('is_active' in input) payload.is_active = input.is_active !== false;
  if ('sort_order' in input) payload.sort_order = Number(input.sort_order) || 0;
  if ('metadata' in input) payload.metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {};

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
};

export const loadMasterDirectoryItems = async (type?: MasterDirectoryType): Promise<ServiceResult<MasterDirectoryItem[]>> => {
  try {
    const client = ensureSupabase();
    let query: any = client
      .from('master_directory_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (type) query = query.eq('directory_type', type);

    const { data, error } = await query;
    if (error) throw error;
    return ok((data || []).map(normalizeItem));
  } catch (error: any) {
    return fail(error?.message || 'Failed to load master directory items.');
  }
};

export const loadActiveMasterDirectoryItems = async (type: MasterDirectoryType): Promise<ServiceResult<MasterDirectoryItem[]>> => {
  try {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('master_directory_items')
      .select('*')
      .eq('directory_type', type)
      .eq('is_active', true)
      .is('archived_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return ok((data || []).map(normalizeItem));
  } catch (error: any) {
    return fail(error?.message || 'Failed to load active master directory items.');
  }
};

export const createMasterDirectoryItem = async (input: MasterDirectoryInput): Promise<ServiceResult<MasterDirectoryItem>> => {
  try {
    const client = ensureSupabase();
    const payload = normalizePayload(input);
    const { data, error } = await client
      .from('master_directory_items')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return ok(normalizeItem(data));
  } catch (error: any) {
    return fail(error?.message || 'Failed to create master directory item.');
  }
};

export const updateMasterDirectoryItem = async (
  id: string,
  updates: Partial<MasterDirectoryInput> & { archived_at?: string | null },
): Promise<ServiceResult<MasterDirectoryItem>> => {
  try {
    const client = ensureSupabase();
    const payload = normalizePayload(updates);
    if ('archived_at' in updates) {
      (payload as any).archived_at = updates.archived_at;
    }

    const { data, error } = await client
      .from('master_directory_items')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return ok(normalizeItem(data));
  } catch (error: any) {
    return fail(error?.message || 'Failed to update master directory item.');
  }
};

export const archiveMasterDirectoryItem = async (id: string): Promise<ServiceResult<void>> => {
  try {
    const client = ensureSupabase();
    const { error } = await client
      .from('master_directory_items')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .is('archived_at', null);

    if (error) throw error;
    return ok(undefined);
  } catch (error: any) {
    return fail(error?.message || 'Failed to archive master directory item.');
  }
};

export const restoreMasterDirectoryItem = async (id: string): Promise<ServiceResult<void>> => {
  try {
    const client = ensureSupabase();
    const { error } = await client
      .from('master_directory_items')
      .update({ archived_at: null })
      .eq('id', id);

    if (error) throw error;
    return ok(undefined);
  } catch (error: any) {
    return fail(error?.message || 'Failed to restore master directory item.');
  }
};

export const deleteMasterDirectoryItem = async (id: string): Promise<ServiceResult<void>> => {
  try {
    const client = ensureSupabase();
    const { error } = await client
      .from('master_directory_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return ok(undefined);
  } catch (error: any) {
    return fail(error?.message || 'Failed to delete master directory item.');
  }
};

export const duplicateMasterDirectoryItem = async (id: string): Promise<ServiceResult<MasterDirectoryItem>> => {
  try {
    const allResult = await loadMasterDirectoryItems();
    if ('error' in allResult) return fail(allResult.error);
    const source = allResult.data.find((item) => item.id === id);
    if (!source) return fail('Master directory item not found.');
    const siblings = allResult.data.filter((item) => item.directory_type === source.directory_type && !item.archived_at);
    let copyIndex = 1;
    let copyName = `${source.name} Copy`;
    while (siblings.some((item) => item.name.trim().toLowerCase() === copyName.trim().toLowerCase())) {
      copyIndex += 1;
      copyName = `${source.name} Copy ${copyIndex}`;
    }

    let copyCode = source.code ? `${source.code}-COPY` : null;
    if (copyCode) {
      copyIndex = 1;
      while (siblings.some((item) => (item.code || '').trim().toLowerCase() === copyCode?.trim().toLowerCase())) {
        copyIndex += 1;
        copyCode = `${source.code}-COPY-${copyIndex}`;
      }
    }

    return createMasterDirectoryItem({
      directory_type: source.directory_type,
      name: copyName,
      code: copyCode,
      description: source.description,
      price: source.price,
      dosage: source.dosage,
      frequency: source.frequency,
      duration: source.duration,
      instructions: source.instructions,
      color: source.color,
      icon: source.icon,
      is_active: source.is_active,
      metadata: source.metadata,
      sort_order: source.sort_order + 1,
      archived_at: null,
    });
  } catch (error: any) {
    return fail(error?.message || 'Failed to duplicate master directory item.');
  }
};

export const mapMasterItemToSuggestion = (item: MasterDirectoryItem) => {
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    description: item.description,
    price: item.price,
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    instructions: item.instructions,
    color: item.color,
    icon: item.icon,
    metadata: item.metadata
  };
};

export const searchMasterDirectoryItems = async (
  directoryType: MasterDirectoryType,
  query: string,
  limit: number = 10,
): Promise<ServiceResult<MasterDirectoryItem[]>> => {
  const result = await loadActiveMasterDirectoryItems(directoryType);
  if (!result.ok) return result;

  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return ok(result.data.slice(0, limit));
  }

  const filtered = result.data.filter((item) => {
    const metadataText = JSON.stringify(item.metadata || {}).toLowerCase();
    const searchFields = [
      item.code,
      item.name,
      item.description,
      item.instructions,
      item.dosage,
      item.frequency,
      item.duration,
      metadataText
    ].map(s => String(s || '').toLowerCase());
    return searchFields.some(field => field.includes(normalized));
  });

  // Sort best matches first: startsWith query gets priority, then name contains, then code contains
  const sorted = [...filtered].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aCode = (a.code || '').toLowerCase();
    const bCode = (b.code || '').toLowerCase();

    // 1. Name starts with query
    const aNameStarts = aName.startsWith(normalized);
    const bNameStarts = bName.startsWith(normalized);
    if (aNameStarts && !bNameStarts) return -1;
    if (!aNameStarts && bNameStarts) return 1;

    // 2. Code starts with query
    const aCodeStarts = aCode.startsWith(normalized);
    const bCodeStarts = bCode.startsWith(normalized);
    if (aCodeStarts && !bCodeStarts) return -1;
    if (!aCodeStarts && bCodeStarts) return 1;

    // 3. Name includes query
    const aNameIncludes = aName.includes(normalized);
    const bNameIncludes = bName.includes(normalized);
    if (aNameIncludes && !bNameIncludes) return -1;
    if (!aNameIncludes && bNameIncludes) return 1;

    return 0;
  });

  return ok(sorted.slice(0, limit));
};

const defaultItems: MasterDirectoryInput[] = [
  { directory_type: 'services', code: 'PROPHY', name: 'Oral Prophylaxis', price: 1000, metadata: { category: 'Preventive' } },
  { directory_type: 'services', code: 'EXT', name: 'Tooth Extraction', price: 1000, metadata: { category: 'Surgery' } },
  { directory_type: 'services', code: 'RESTO', name: 'Composite Restoration', price: 1500, metadata: { category: 'Restorative' } },
  { directory_type: 'services', code: 'RCT', name: 'Root Canal Treatment', price: 5000, metadata: { category: 'Endodontics' } },
  { directory_type: 'services', code: 'ORTHO-ADJ', name: 'Orthodontic Adjustment', price: 1000, metadata: { category: 'Orthodontics' } },
  { directory_type: 'medicines', name: 'Amoxicillin', dosage: '500mg', frequency: 'Every 8 hours', duration: '7 days', instructions: 'Take after meals.' },
  { directory_type: 'medicines', name: 'Mefenamic Acid', dosage: '500mg', frequency: 'Every 8 hours as needed', duration: '3 days', instructions: 'Take for pain after meals.' },
  { directory_type: 'medicines', name: 'Clindamycin', dosage: '300mg', frequency: 'Every 6 hours', duration: '7 days', instructions: 'Use when clinically indicated.' },
  { directory_type: 'medicines', name: 'Paracetamol', dosage: '500mg', frequency: 'Every 6 hours as needed', duration: '3 days' },
  { directory_type: 'medicines', name: 'Ibuprofen', dosage: '400mg', frequency: 'Every 8 hours as needed', duration: '3 days', instructions: 'Avoid if contraindicated.' },
  { directory_type: 'medical_conditions', name: 'Hypertension', metadata: { severity: 'medium', isAlert: true } },
  { directory_type: 'medical_conditions', name: 'Diabetes', metadata: { severity: 'medium', isAlert: true } },
  { directory_type: 'medical_conditions', name: 'Asthma', metadata: { severity: 'medium', isAlert: true } },
  { directory_type: 'medical_conditions', name: 'Heart Disease', metadata: { severity: 'high', isAlert: true } },
  { directory_type: 'medical_conditions', name: 'Bleeding Disorder', metadata: { severity: 'critical', isAlert: true } },
  { directory_type: 'medical_conditions', name: 'Drug Allergy', metadata: { severity: 'high', isAlert: true } },
  { directory_type: 'medical_conditions', name: 'Pregnancy', metadata: { severity: 'medium', isAlert: true } },
  { directory_type: 'dental_habits', code: 'bruxism', name: 'Bruxism' },
  { directory_type: 'dental_habits', code: 'nail-biting', name: 'Nail Biting' },
  { directory_type: 'dental_habits', code: 'mouth-breathing', name: 'Mouth Breathing' },
  { directory_type: 'dental_habits', code: 'thumb-sucking', name: 'Thumb Sucking' },
  { directory_type: 'tags', name: 'VIP', color: '#0ea5e9' },
  { directory_type: 'tags', name: 'CAVSU', color: '#22c55e' },
  { directory_type: 'tags', name: 'Highly Anxious', color: '#f97316' },
  { directory_type: 'tags', name: 'Senior Citizen', color: '#8b5cf6' },
  { directory_type: 'tags', name: 'Pediatric', color: '#ec4899' },
  { directory_type: 'recall_appliance', code: 'orthodontic', name: 'Orthodontic Appliance' },
  { directory_type: 'recall_appliance', code: 'stayplate', name: 'Stayplate' },
  { directory_type: 'recall_appliance', code: 'others', name: 'Other Appliance' },
  { directory_type: 'recall_occlusion', code: 'class-1', name: 'Class I' },
  { directory_type: 'recall_occlusion', code: 'class-2', name: 'Class II' },
  { directory_type: 'recall_occlusion', code: 'class-3', name: 'Class III' },
  { directory_type: 'recall_occlusion', code: 'overjet', name: 'Overjet' },
  { directory_type: 'recall_occlusion', code: 'overbite', name: 'Overbite' },
  { directory_type: 'recall_occlusion', code: 'midline', name: 'Midline Deviation' },
  { directory_type: 'recall_occlusion', code: 'crossbite', name: 'Crossbite' },
  { directory_type: 'periodontal_screening', code: 'gingivitis', name: 'Gingivitis' },
  { directory_type: 'periodontal_screening', code: 'early', name: 'Early Periodontitis' },
  { directory_type: 'periodontal_screening', code: 'moderate', name: 'Moderate Periodontitis' },
  { directory_type: 'periodontal_screening', code: 'advanced', name: 'Advanced Periodontitis' },
  { directory_type: 'recall_tmd', code: 'clenching', name: 'Clenching' },
  { directory_type: 'recall_tmd', code: 'clicking', name: 'Clicking' },
  { directory_type: 'recall_tmd', code: 'trismus', name: 'Trismus' },
  { directory_type: 'recall_tmd', code: 'muscle-spasm', name: 'Muscle Spasm' },
  { directory_type: 'tooth_status', code: 'cv', name: 'Cavity', color: '#FF0000' },
  { directory_type: 'tooth_status', code: 'ok', name: 'OK / Pasta', color: '#0433FF' },
  { directory_type: 'tooth_conditions', code: '/', name: 'Present Teeth', color: '#00C853' },
  { directory_type: 'tooth_conditions', code: 'm', name: 'Missing Due to Caries', color: '#D50000' },
  { directory_type: 'tooth_conditions', code: 'mo', name: 'Missing Due to Other Cause', color: '#AA00FF' },
  { directory_type: 'tooth_conditions', code: 'im', name: 'Impacted Tooth', color: '#FF6D00' },
  { directory_type: 'tooth_conditions', code: 'sp', name: 'Supernumerary Tooth', color: '#00B0FF' },
  { directory_type: 'tooth_conditions', code: 'rf', name: 'Root Fragment', color: '#FFD600' },
  { directory_type: 'tooth_conditions', code: 'un', name: 'Unerupted Tooth', color: '#C6FF00' },
  { directory_type: 'tooth_conditions', code: 'pt', name: 'Pulpless Tooth', color: '#00E5FF' },
  { directory_type: 'tooth_conditions', code: 'd', name: 'Decayed (Caries Indicated for Filling)', color: '#FF1744' },
  { directory_type: 'tooth_conditions', code: 'rct', name: 'Root Canal Treatment', color: '#2979FF' },
  { directory_type: 'tooth_prosthodontics', code: 'mc', name: 'Metal Crown' },
  { directory_type: 'tooth_prosthodontics', code: 'pj', name: 'Plastic Jacket Crown' },
  { directory_type: 'tooth_prosthodontics', code: 'am', name: 'Amalgam Filling' },
  { directory_type: 'tooth_prosthodontics', code: 'lcf', name: 'Light Cure Filling' },
  { directory_type: 'tooth_prosthodontics', code: 'porjc', name: 'Porcelain Crown' },
  { directory_type: 'tooth_prosthodontics', code: 'ab', name: 'Abutment' },
  { directory_type: 'tooth_prosthodontics', code: 'att', name: 'Attachment' },
  { directory_type: 'tooth_prosthodontics', code: 'p', name: 'Pontic' },
  { directory_type: 'tooth_prosthodontics', code: 'ic', name: 'Inlay' },
  { directory_type: 'tooth_prosthodontics', code: 'imp', name: 'Implant' },
  { directory_type: 'tooth_prosthodontics', code: 's', name: 'Sealants' },
  { directory_type: 'tooth_prosthodontics', code: 'rm', name: 'Removable Denture' },
  { directory_type: 'tooth_prosthodontics', code: 'gi', name: 'Glass Ionomer' },
  { directory_type: 'tooth_prosthodontics', code: 'v', name: 'Veneer' },
  { directory_type: 'tooth_prosthodontics', code: 'tf', name: 'Temporary Filling' },
  { directory_type: 'tooth_surgery', code: 'x', name: 'Extraction Due to Caries' },
  { directory_type: 'tooth_surgery', code: 'xo', name: 'Extraction Due to Other Causes' },
  { directory_type: 'tooth_xray', code: 'pano', name: 'Panoramic' },
  { directory_type: 'tooth_xray', code: 'cepha', name: 'Cephalometric' },
  { directory_type: 'tooth_xray', code: 'occ', name: 'Occlusal (Upper/Lower)' },
  { directory_type: 'tooth_xray', code: 'peri', name: 'Periapical' },
  { directory_type: 'payment_methods', code: 'CASH', name: 'Cash' },
  { directory_type: 'payment_methods', code: 'GCASH', name: 'GCash', metadata: { requiresReferenceNumber: true } },
  { directory_type: 'payment_methods', code: 'CARD', name: 'Card', metadata: { requiresReferenceNumber: true } },
  { directory_type: 'payment_methods', code: 'BANK', name: 'Bank Transfer', metadata: { requiresReferenceNumber: true } },
  { directory_type: 'clinical_snippets', code: '/ortho', name: 'Ortho Adjustment', instructions: 'Orthodontic adjustment completed. Oral hygiene instructions reinforced.' },
  { directory_type: 'clinical_snippets', code: '/extract', name: 'Extraction Note', instructions: 'Tooth extraction performed under local anesthesia. Post-operative instructions given.' },
  { directory_type: 'clinical_snippets', code: '/restore', name: 'Restoration Note', instructions: 'Composite restoration completed. Occlusion checked and polished.' },
  { directory_type: 'clinical_snippets', code: '/prophy', name: 'Prophylaxis Note', instructions: 'Oral prophylaxis completed. Calculus deposits removed and polishing done.' },
  { directory_type: 'appointment_types', name: 'Consultation', color: '#0ea5e9', metadata: { defaultDurationMinutes: 30, requiresPatient: true } },
  { directory_type: 'appointment_types', name: 'Orthodontics Adjustment', color: '#8b5cf6', metadata: { defaultDurationMinutes: 60, requiresPatient: true } },
  { directory_type: 'appointment_types', name: 'Clinic Event', color: '#f97316', metadata: { defaultDurationMinutes: 60, requiresPatient: false } },
];

export const seedDefaultMasterDirectoryItemsIfEmpty = async (): Promise<ServiceResult<number>> => {
  try {
    const client = ensureSupabase();
    let inserted = 0;
    const types = Array.from(new Set(defaultItems.map((item) => item.directory_type)));

    for (const type of types) {
      const existing = await loadMasterDirectoryItems(type);
      if ('error' in existing) return fail(existing.error);
      if (existing.data.length > 0) continue;

      const rows = defaultItems
        .filter((item) => item.directory_type === type)
        .map((item, index) => normalizePayload({ ...item, sort_order: item.sort_order ?? index + 1 }));

      const { error } = await client.from('master_directory_items').insert(rows);
      if (error) throw error;
      inserted += rows.length;
    }

    return ok(inserted);
  } catch (error: any) {
    return fail(error?.message || 'Failed to seed master directory items.');
  }
};

export interface NormalizedToothMasterItem {
  id: string;
  directoryType: MasterDirectoryType;
  code: string;
  label: string;
  color: string | null;
  legacyCode: string | null;
  name: string;
}

export const getClinicalDirectoryCode = (item: Pick<MasterDirectoryItem, 'code' | 'description' | 'metadata'>): string => {
  const metadataCode = String(item.metadata?.clinicalCode || '').trim();
  if (metadataCode) return metadataCode;

  const code = String(item.code || '').trim();
  const description = String(item.description || '').trim();
  const codeLooksLikeCatalogId = /^[A-Z]{2,}\d+$/i.test(code);
  const descriptionLooksLikeClinicalCode = description.length > 0 && description.length <= 10 && !/\s/.test(description);

  if (code && !codeLooksLikeCatalogId) return code;
  if (descriptionLooksLikeClinicalCode) return description;
  return code || description;
};

export const normalizeToothMasterItem = (item: MasterDirectoryItem): NormalizedToothMasterItem => {
  const clinicalCode = getClinicalDirectoryCode(item);
  return {
    id: item.id,
    directoryType: item.directory_type,
    code: clinicalCode,
    label: item.name,
    color: item.color || (item.metadata?.color as string) || null,
    legacyCode: (item.metadata?.legacyCode as string) || item.code || null,
    name: item.name,
  };
};

export const loadDentalChartMasterItems = async (): Promise<ServiceResult<{
  toothStatus: NormalizedToothMasterItem[];
  toothConditions: NormalizedToothMasterItem[];
  toothProsthodontics: NormalizedToothMasterItem[];
  toothSurgery: NormalizedToothMasterItem[];
  toothXray: NormalizedToothMasterItem[];
}>> => {
  try {
    const client = ensureSupabase();
    const { data, error } = await client
      .from('master_directory_items')
      .select('*')
      .in('directory_type', TOOTH_ITEM_DIRECTORY_TYPES)
      .eq('is_active', true)
      .is('archived_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    const items = (data || []).map(normalizeItem).map(normalizeToothMasterItem);

    return ok({
      toothStatus: items.filter((i) => i.directoryType === 'tooth_status'),
      toothConditions: items.filter((i) => i.directoryType === 'tooth_conditions'),
      toothProsthodontics: items.filter((i) => i.directoryType === 'tooth_prosthodontics'),
      toothSurgery: items.filter((i) => i.directoryType === 'tooth_surgery'),
      toothXray: items.filter((i) => i.directoryType === 'tooth_xray'),
    });
  } catch (error: any) {
    return fail(error?.message || 'Failed to load dental chart master items.');
  }
};
