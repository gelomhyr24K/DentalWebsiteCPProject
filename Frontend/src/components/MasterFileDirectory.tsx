import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BellRing,
  CalendarDays,
  Check,
  CircleDot,
  Copy,
  CreditCard,
  Database,
  Edit3,
  FileText,
  Keyboard,
  Pill,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Stethoscope,
  Tags,
  Trash2,
  UserRoundCheck,
  X,
} from 'lucide-react';
import {
  archiveMasterDirectoryItem,
  createMasterDirectoryItem,
  deleteMasterDirectoryItem,
  duplicateMasterDirectoryItem,
  getClinicalDirectoryCode,
  loadMasterDirectoryItems,
  restoreMasterDirectoryItem,
  seedDefaultMasterDirectoryItemsIfEmpty,
  updateMasterDirectoryItem,
  type MasterDirectoryInput,
  type MasterDirectoryItem,
  type MasterDirectoryType,
} from '../services/masterDirectoryService';

type DirectoryStatus = 'all' | 'active' | 'inactive' | 'archived';
type ModalMode = 'create' | 'edit' | 'view';

interface DirectoryConfig {
  type: MasterDirectoryType;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

type DraftItem = MasterDirectoryInput & {
  id?: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  archived_at?: string | null;
};

interface CategoryGroup {
  title: string;
  items: DirectoryConfig[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    title: 'Core Modules',
    items: [
      { type: 'services', label: 'Services / Procedures', shortLabel: 'Services', description: 'Treatment services, procedures, and default prices.', icon: Stethoscope },
      { type: 'medicines', label: 'Medicines', shortLabel: 'Medicines', description: 'Medication defaults, dosage, and prescription instructions.', icon: Pill },
      { type: 'medical_conditions', label: 'Medical Conditions', shortLabel: 'Medical Conditions', description: 'Reusable medical checklist and warning conditions.', icon: AlertTriangle },
      { type: 'dental_habits', label: 'Dental Habits', shortLabel: 'Dental Habits', description: 'Patient dental habits checklist.', icon: AlertTriangle },
      { type: 'tags', label: 'Patient Tags', shortLabel: 'Tags', description: 'Patient labels, colors, and priority markers.', icon: Tags },
      { type: 'prescription_templates', label: 'Prescription Templates', shortLabel: 'Rx Templates', description: 'Reusable prescription sets and diagnosis notes.', icon: FileText },
    ]
  },
  {
    title: 'Recall Items',
    items: [
      { type: 'recall_appliance', label: 'Recall Appliance', shortLabel: 'Recall Appliance', description: 'Ortho, stayplate, other appliances.', icon: CircleDot },
      { type: 'recall_occlusion', label: 'Recall Occlusion', shortLabel: 'Recall Occlusion', description: 'Molar class, overjet, overbite, etc.', icon: Stethoscope },
      { type: 'periodontal_screening', label: 'Periodontal Screening', shortLabel: 'Periodontal Screening', description: 'Gingivitis, periodontitis, calculus, hygiene.', icon: Stethoscope },
      { type: 'recall_tmd', label: 'Recall TMD', shortLabel: 'Recall TMD', description: 'Clenching, clicking, trismus, muscle spasm.', icon: Stethoscope },
    ]
  },
  {
    title: 'Tooth Items',
    items: [
      { type: 'tooth_status', label: 'Tooth Status', shortLabel: 'Tooth Status', description: 'Cavity, OK/Pasta, etc.', icon: CircleDot },
      { type: 'tooth_conditions', label: 'Tooth Conditions', shortLabel: 'Tooth Condition', description: 'Dental chart condition meanings and colors.', icon: CircleDot },
      { type: 'tooth_prosthodontics', label: 'Tooth Prosthodontics', shortLabel: 'Tooth Prosthodontics', description: 'Crowns, fillings, dentures, veneer, etc.', icon: CircleDot },
      { type: 'tooth_surgery', label: 'Tooth Surgery', shortLabel: 'Tooth Surgery', description: 'Extraction due to caries, other causes.', icon: Stethoscope },
      { type: 'tooth_xray', label: 'Tooth X-Ray', shortLabel: 'Tooth X-Ray', description: 'Panoramic, cephalometric, occlusal, periapical.', icon: CircleDot },
    ]
  }
];

const CATEGORIES: DirectoryConfig[] = CATEGORY_GROUPS.flatMap(group => group.items);

const PAGE_SIZE = 10;

const emptyDraft = (type: MasterDirectoryType): DraftItem => ({
  directory_type: type,
  code: '',
  name: '',
  description: '',
  price: null,
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
  color: '',
  icon: '',
  is_active: true,
  sort_order: 0,
  metadata: {},
  archived_at: null,
});

const toDraft = (item: MasterDirectoryItem): DraftItem => ({
  directory_type: item.directory_type,
  id: item.id,
  code: item.code || '',
  name: item.name || '',
  description: item.description || '',
  price: item.price ?? null,
  dosage: item.dosage || '',
  frequency: item.frequency || '',
  duration: item.duration || '',
  instructions: item.instructions || '',
  color: item.color || '',
  icon: item.icon || '',
  is_active: item.is_active,
  sort_order: item.sort_order || 0,
  metadata: item.metadata || {},
  archived_at: item.archived_at || null,
});

const toInput = (draft: DraftItem): MasterDirectoryInput => ({
  directory_type: draft.directory_type,
  code: draft.code || null,
  name: draft.name,
  description: draft.description || null,
  price: draft.price ?? null,
  dosage: draft.dosage || null,
  frequency: draft.frequency || null,
  duration: draft.duration || null,
  instructions: draft.instructions || null,
  color: draft.color || null,
  icon: draft.icon || null,
  is_active: draft.is_active,
  sort_order: Number(draft.sort_order) || 0,
  metadata: draft.metadata || {},
  archived_at: draft.archived_at || null,
});

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatMoney = (value?: number | null) => {
  if (value === null || value === undefined) return '-';
  return `PHP ${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const textValue = (value: unknown) => value === null || value === undefined ? '' : String(value);
const boolValue = (value: unknown) => value === true;

const includesText = (item: MasterDirectoryItem, query: string) => {
  const haystack = [
    item.code,
    item.name,
    item.description,
    item.dosage,
    item.frequency,
    item.duration,
    item.instructions,
    JSON.stringify(item.metadata || {}),
  ].filter(Boolean).join(' ').toLowerCase();

  return haystack.includes(query);
};

const itemDetails = (item: MasterDirectoryItem) => {
  const metadata = item.metadata || {};
  switch (item.directory_type) {
    case 'services':
      return `${formatMoney(item.price)}${metadata.category ? ` / ${metadata.category}` : ''}`;
    case 'medicines':
      return [item.dosage, item.frequency, item.duration].filter(Boolean).join(' / ') || '-';
    case 'medical_conditions':
      return [metadata.severity, boolValue(metadata.isAlert) ? 'Alert' : null].filter(Boolean).join(' / ') || '-';
    case 'dental_habits':
      return item.description || textValue(metadata.category) || '-';
    case 'tags':
      return item.color || textValue(metadata.priority) || '-';
    case 'recall_appliance':
    case 'recall_occlusion':
    case 'periodontal_screening':
    case 'recall_tmd':
      return item.description || textValue(metadata.group) || '-';
    case 'tooth_status':
    case 'tooth_conditions':
    case 'tooth_prosthodontics':
    case 'tooth_surgery':
    case 'tooth_xray':
      return item.color || '-';
    case 'payment_methods':
      return boolValue(metadata.requiresReferenceNumber) ? 'Requires reference number' : 'No reference required';
    case 'doctors':
      return [metadata.specialty, metadata.prcNo || metadata.licenseNo].filter(Boolean).join(' / ') || '-';
    case 'appointment_types':
      return `${textValue(metadata.defaultDurationMinutes) || '-'} min${boolValue(metadata.requiresPatient) ? ' / patient required' : ''}`;
    case 'clinical_snippets':
      return item.code || textValue(metadata.category) || '-';
    case 'prescription_templates':
    case 'certificate_templates':
      return item.instructions ? item.instructions.slice(0, 80) : textValue(metadata.templateBody).slice(0, 80) || '-';
    default:
      return '-';
  }
};

const csvEscape = (value: unknown) => `"${textValue(value).replace(/"/g, '""')}"`;

interface MasterFileDirectoryProps {
  activeType: MasterDirectoryType;
  setActiveType: (type: MasterDirectoryType) => void;
  showDevTools: boolean;
  onCountsChange: (counts: Record<MasterDirectoryType, number>) => void;
}

export function MasterFileDirectory({
  activeType,
  setActiveType,
  showDevTools,
  onCountsChange,
}: MasterFileDirectoryProps) {
  const [items, setItems] = useState<MasterDirectoryItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<DirectoryStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'sort_order' | 'name' | 'updated_at'>('sort_order');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [draft, setDraft] = useState<DraftItem>(emptyDraft('services'));

  const activeCategory = CATEGORIES.find((category) => category.type === activeType) || CATEGORIES[0];
  const ActiveIcon = activeCategory.icon;

  const loadItems = async (clearBanner = true) => {
    setIsLoading(true);
    const result = await loadMasterDirectoryItems();
    setIsLoading(false);
    if (!('error' in result)) {
      setItems(result.data);
      if (clearBanner) setBanner(null);
    } else {
      setItems([]);
      setBanner({ type: 'error', message: result.error });
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeType, statusFilter, searchQuery, sortBy]);

  const counts = useMemo(() => {
    return CATEGORIES.reduce<Record<MasterDirectoryType, number>>((acc, category) => {
      acc[category.type] = items.filter((item) => item.directory_type === category.type && !item.archived_at).length;
      return acc;
    }, {} as Record<MasterDirectoryType, number>);
  }, [items]);

  useEffect(() => {
    onCountsChange(counts);
  }, [counts, onCountsChange]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const next = items.filter((item) => {
      if (item.directory_type !== activeType) return false;
      if (statusFilter === 'active' && (!item.is_active || item.archived_at)) return false;
      if (statusFilter === 'inactive' && (item.is_active || item.archived_at)) return false;
      if (statusFilter === 'archived' && !item.archived_at) return false;
      if (query && !includesText(item, query)) return false;
      return true;
    });

    return [...next].sort((a, b) => {
      if (sortBy === 'updated_at') {
        return new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime();
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name);
    });
  }, [activeType, items, searchQuery, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const isReadonly = modalMode === 'view';

  const updateDraft = <K extends keyof DraftItem>(field: K, value: DraftItem[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updateMetadata = (field: string, value: unknown) => {
    setDraft((prev) => ({
      ...prev,
      metadata: {
        ...(prev.metadata || {}),
        [field]: value,
      },
    }));
  };

  const openCreate = () => {
    setDraft(emptyDraft(activeType));
    setModalMode('create');
  };

  const openView = (item: MasterDirectoryItem) => {
    setDraft(toDraft(item));
    setModalMode('view');
  };

  const openEdit = (item: MasterDirectoryItem) => {
    setDraft(toDraft(item));
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setDraft(emptyDraft(activeType));
  };

  const validateDraft = () => {
    if (!draft.name.trim()) return 'Name is required.';
    if (draft.price !== null && draft.price !== undefined && Number(draft.price) < 0) return 'Price cannot be negative.';

    const normalizedName = draft.name.trim().toLowerCase();
    const normalizedCode = (draft.code || '').trim().toLowerCase();
    const duplicateName = items.some((item) => (
      item.directory_type === draft.directory_type &&
      item.id !== draft.id &&
      !item.archived_at &&
      item.name.trim().toLowerCase() === normalizedName
    ));
    if (duplicateName) return 'A record with this name already exists in this category.';

    if (normalizedCode) {
      const duplicateCode = items.some((item) => (
        item.directory_type === draft.directory_type &&
        item.id !== draft.id &&
        !item.archived_at &&
        (item.code || '').trim().toLowerCase() === normalizedCode
      ));
      if (duplicateCode) return 'A record with this code already exists in this category.';
    }

    return '';
  };

  const saveDraft = async () => {
    const validation = validateDraft();
    if (validation) {
      setBanner({ type: 'error', message: validation });
      return;
    }

    setIsSaving(true);
    const payload = toInput(draft);
    const result = modalMode === 'edit' && draft.id
      ? await updateMasterDirectoryItem(draft.id, payload)
      : await createMasterDirectoryItem(payload);
    setIsSaving(false);

    if ('error' in result) {
      setBanner({ type: 'error', message: result.error });
      return;
    }

    setBanner({ type: 'success', message: modalMode === 'edit' ? 'Master record updated.' : 'Master record created.' });
    closeModal();
    await loadItems(false);
  };

  const handleArchive = async (item: MasterDirectoryItem) => {
    if (!window.confirm(`Archive "${item.name}"? It can be restored later.`)) return;
    const result = await archiveMasterDirectoryItem(item.id);
    setBanner('error' in result ? { type: 'error', message: result.error } : { type: 'success', message: 'Master record archived.' });
    await loadItems(false);
  };

  const handleRestore = async (item: MasterDirectoryItem) => {
    const result = await restoreMasterDirectoryItem(item.id);
    setBanner('error' in result ? { type: 'error', message: result.error } : { type: 'success', message: 'Master record restored.' });
    await loadItems(false);
  };

  const handleDelete = async (item: MasterDirectoryItem) => {
    if (!window.confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return;
    const result = await deleteMasterDirectoryItem(item.id);
    setBanner('error' in result ? { type: 'error', message: result.error } : { type: 'success', message: 'Master record permanently deleted.' });
    await loadItems(false);
  };

  const handleDuplicate = async (item: MasterDirectoryItem) => {
    const result = await duplicateMasterDirectoryItem(item.id);
    setBanner('error' in result ? { type: 'error', message: result.error } : { type: 'success', message: 'Master record duplicated.' });
    await loadItems(false);
  };

  const handleSeed = async () => {
    const result = await seedDefaultMasterDirectoryItemsIfEmpty();
    if (!('error' in result)) {
      setBanner({ type: 'success', message: result.data > 0 ? `Seeded ${result.data} default records.` : 'All default categories already have records.' });
      await loadItems(false);
    } else {
      setBanner({ type: 'error', message: result.error });
    }
  };

  const exportCsv = () => {
    const headers = ['directory_type', 'code', 'name', 'description', 'details', 'status', 'updated_at'];
    const body = filteredItems.map((item) => [
      item.directory_type,
      item.code || '',
      item.name,
      item.description || '',
      itemDetails(item),
      item.archived_at ? 'archived' : item.is_active ? 'active' : 'inactive',
      item.updated_at || '',
    ].map(csvEscape).join(','));

    const blob = new Blob([[headers.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeType}-master-directory.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderTextInput = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder = '',
    multiline = false,
  ) => (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {multiline ? (
        <textarea
          rows={4}
          value={value}
          disabled={isReadonly}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
        />
      ) : (
        <input
          type="text"
          value={value}
          disabled={isReadonly}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
        />
      )}
    </label>
  );

  const renderNumberInput = (
    label: string,
    value: number | null | undefined,
    onChange: (value: number | null) => void,
    placeholder = '',
  ) => (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input
        type="number"
        value={value ?? ''}
        disabled={isReadonly}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
      />
    </label>
  );

  const renderCheckbox = (label: string, checked: boolean, onChange: (checked: boolean) => void) => (
    <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={isReadonly}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
      />
    </label>
  );

  const renderCategoryFields = () => {
    const metadata = draft.metadata || {};

    switch (draft.directory_type) {
      case 'services':
        return (
          <>
            {renderNumberInput('Default Price', draft.price, (value) => updateDraft('price', value), '1000')}
            {renderTextInput('Treatment Category', textValue(metadata.category), (value) => updateMetadata('category', value), 'Preventive, Surgery, Restorative')}
            {renderCheckbox('Auto add to bill', boolValue(metadata.autoAddToBill), (checked) => updateMetadata('autoAddToBill', checked))}
            {renderTextInput('Common Teeth / Surfaces', textValue(metadata.commonTeeth), (value) => updateMetadata('commonTeeth', value), 'Optional')}
          </>
        );
      case 'medicines':
        return (
          <>
            {renderTextInput('Generic Name', textValue(metadata.genericName), (value) => updateMetadata('genericName', value), 'Amoxicillin')}
            {renderTextInput('Indication', textValue(metadata.indication), (value) => updateMetadata('indication', value), 'Pain, infection, inflammation')}
            {renderTextInput('Dosage', draft.dosage || '', (value) => updateDraft('dosage', value), '500mg')}
            {renderTextInput('Frequency', draft.frequency || '', (value) => updateDraft('frequency', value), 'Every 8 hours')}
            {renderTextInput('Duration', draft.duration || '', (value) => updateDraft('duration', value), '7 days')}
            {renderTextInput('Contraindications', textValue(metadata.contraindications), (value) => updateMetadata('contraindications', value), 'Allergy, pregnancy, etc.')}
          </>
        );
      case 'medical_conditions':
        return (
          <>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Severity</span>
              <select
                value={textValue(metadata.severity) || 'low'}
                disabled={isReadonly}
                onChange={(event) => updateMetadata('severity', event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            {renderCheckbox('Show as clinical alert', boolValue(metadata.isAlert), (checked) => updateMetadata('isAlert', checked))}
            {renderTextInput('Dental Warning Notes', textValue(metadata.dentalWarning), (value) => updateMetadata('dentalWarning', value), 'Clinical warning notes', true)}
          </>
        );
      case 'prescription_templates':
        return (
          <>
            {renderTextInput('Diagnosis / Indication', textValue(metadata.indication), (value) => updateMetadata('indication', value), 'Diagnosis or indication')}
            {renderTextInput('Template Medicines JSON', textValue(metadata.medicines), (value) => updateMetadata('medicines', value), '[{\"name\":\"Amoxicillin\"}]', true)}
            {renderTextInput('Notes / Instructions', draft.instructions || '', (value) => updateDraft('instructions', value), 'Prescription notes', true)}
          </>
        );
      case 'tags':
        return (
          <>
            {renderTextInput('Color', draft.color || '', (value) => updateDraft('color', value), '#0ea5e9')}
            {renderTextInput('Priority', textValue(metadata.priority), (value) => updateMetadata('priority', value), 'Optional')}
          </>
        );
      case 'dental_habits':
        return (
          <>
            {renderTextInput('Habit Description', draft.description || '', (value) => updateDraft('description', value), 'Optional note')}
            {renderTextInput('Category', textValue(metadata.category), (value) => updateMetadata('category', value), 'Habit group')}
          </>
        );
      case 'recall_appliance':
      case 'recall_occlusion':
      case 'periodontal_screening':
      case 'recall_tmd':
        return (
          <>
            {renderTextInput('Description', draft.description || '', (value) => updateDraft('description', value), 'Optional details')}
            {renderTextInput('Group', textValue(metadata.group), (value) => updateMetadata('group', value), 'Optional grouping')}
          </>
        );
      case 'tooth_status':
      case 'tooth_conditions':
      case 'tooth_prosthodontics':
      case 'tooth_surgery':
      case 'tooth_xray':
        return (
          <>
            {renderTextInput('Clinical Code', draft.code || '', (value) => updateDraft('code', value.toLowerCase()), 'cv / ok / d / m')}
            {renderTextInput('Color', draft.color || '', (value) => updateDraft('color', value), '#ef4444')}
            {renderTextInput('Clinical Code Override', textValue(metadata.clinicalCode), (value) => updateMetadata('clinicalCode', value.toLowerCase()), 'Leave blank to use Code')}
            {renderTextInput('Legacy Code', textValue(metadata.legacyCode), (value) => updateMetadata('legacyCode', value), 'Optional legacy code')}
            {renderTextInput('Chart Meaning', textValue(metadata.chartMeaning), (value) => updateMetadata('chartMeaning', value), 'Optional chart meaning', true)}
          </>
        );
      case 'certificate_templates':
        return (
          <>
            {renderTextInput('Template Body', textValue(metadata.templateBody) || draft.instructions || '', (value) => {
              updateMetadata('templateBody', value);
              updateDraft('instructions', value);
            }, 'Certificate body', true)}
            {renderNumberInput('Default Validity Days', Number(metadata.defaultValidityDays) || null, (value) => updateMetadata('defaultValidityDays', value), '30')}
          </>
        );
      case 'clinical_snippets':
        return (
          <>
            {renderTextInput('Shortcut Code', draft.code || '', (value) => updateDraft('code', value), '/ortho')}
            {renderTextInput('Snippet Category', textValue(metadata.category), (value) => updateMetadata('category', value), 'Progress notes')}
            {renderTextInput('Snippet Body', draft.instructions || textValue(metadata.body), (value) => {
              updateDraft('instructions', value);
              updateMetadata('body', value);
            }, 'Snippet text', true)}
          </>
        );
      case 'payment_methods':
        return (
          <>
            {renderCheckbox('Requires Reference Number', boolValue(metadata.requiresReferenceNumber), (checked) => updateMetadata('requiresReferenceNumber', checked))}
          </>
        );
      case 'doctors':
        return (
          <>
            {renderTextInput('License Number', textValue(metadata.licenseNo), (value) => updateMetadata('licenseNo', value), 'License no.')}
            {renderTextInput('PTR Number', textValue(metadata.ptrNo), (value) => updateMetadata('ptrNo', value), 'PTR no.')}
            {renderTextInput('PRC Number', textValue(metadata.prcNo), (value) => updateMetadata('prcNo', value), 'PRC no.')}
            {renderTextInput('Specialty', textValue(metadata.specialty), (value) => updateMetadata('specialty', value), 'General Dentistry')}
            {renderCheckbox('Display in Calendar', metadata.displayInCalendar !== false, (checked) => updateMetadata('displayInCalendar', checked))}
          </>
        );
      case 'appointment_types':
        return (
          <>
            {renderTextInput('Color', draft.color || '', (value) => updateDraft('color', value), '#0ea5e9')}
            {renderTextInput('Icon', draft.icon || '', (value) => updateDraft('icon', value), 'calendar')}
            {renderNumberInput('Default Duration Minutes', Number(metadata.defaultDurationMinutes) || null, (value) => updateMetadata('defaultDurationMinutes', value), '30')}
            {renderCheckbox('Requires Patient', metadata.requiresPatient !== false, (checked) => updateMetadata('requiresPatient', checked))}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1760px] space-y-6 pb-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">
              <Database size={16} />
              Clinic Configuration
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Master File Directory</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage reusable clinic records, dropdowns, procedures, medicines, templates, and tags.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadItems()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            {showDevTools && (
              <button
                onClick={handleSeed}
                className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
              >
                <Settings2 size={16} />
                Seed Defaults
              </button>
            )}
            {showDevTools && (
              <button
                onClick={exportCsv}
                disabled={filteredItems.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText size={16} />
                Export CSV
              </button>
            )}
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={16} />
              New Item
            </button>
          </div>
        </div>

        {banner && (
          <div className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}>
            {banner.message}
          </div>
        )}
      </div>

      <div className="w-full">

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <ActiveIcon size={16} />
                  {activeCategory.label}
                </div>
                <h3 className="mt-1 text-xl font-bold text-slate-900">{activeCategory.shortLabel}</h3>
                <p className="text-sm text-slate-500">{activeCategory.description}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_160px_160px_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search name, code, description..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as DirectoryStatus)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as 'sort_order' | 'name' | 'updated_at')}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="sort_order">Sort Order</option>
                  <option value="name">Name</option>
                  <option value="updated_at">Updated</option>
                </select>
                <button
                  onClick={openCreate}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Code</th>
                  <th className="px-5 py-3 font-bold">Name</th>
                  <th className="px-5 py-3 font-bold">Description</th>
                  <th className="px-5 py-3 font-bold">Details</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Updated</th>
                  <th className="px-5 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">Loading master records...</td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Database size={22} />
                      </div>
                      <div className="mt-3 font-semibold text-slate-800">No master records found for this category.</div>
                      <button onClick={openCreate} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        Add first item
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 align-top">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">
                          {['tooth_status', 'tooth_conditions', 'tooth_prosthodontics', 'tooth_surgery', 'tooth_xray'].includes(item.directory_type)
                            ? (getClinicalDirectoryCode(item) || '-')
                            : (item.code || '-')}
                        </span>
                      </td>
                      <td className="px-5 py-3 align-top">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        {item.color && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span>{item.color}</span>
                          </div>
                        )}
                      </td>
                      <td className="max-w-sm px-5 py-3 align-top text-slate-600">
                        <div className="line-clamp-2">
                          {(() => {
                            const isTooth = ['tooth_status', 'tooth_conditions', 'tooth_prosthodontics', 'tooth_surgery', 'tooth_xray'].includes(item.directory_type);
                            if (isTooth) {
                              const codeVal = getClinicalDirectoryCode(item);
                              const hasRealDesc = item.description && item.description.trim() !== codeVal;
                              return hasRealDesc ? item.description : '-';
                            }
                            return item.description || item.instructions || '-';
                          })()}
                        </div>
                      </td>
                      <td className="px-5 py-3 align-top text-slate-600">{itemDetails(item)}</td>
                      <td className="px-5 py-3 align-top">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          item.archived_at
                            ? 'bg-slate-100 text-slate-500'
                            : item.is_active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                        }`}>
                          {item.archived_at ? 'Archived' : item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3 align-top text-slate-500">{formatDate(item.updated_at || item.created_at)}</td>
                      <td className="px-5 py-3 align-top">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openView(item)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="View">
                            <Database size={15} />
                          </button>
                          <button onClick={() => openEdit(item)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Edit">
                            <Edit3 size={15} />
                          </button>
                          <button onClick={() => handleDuplicate(item)} className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-600" title="Duplicate">
                            <Copy size={15} />
                          </button>
                          {item.archived_at ? (
                            <button onClick={() => handleRestore(item)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Restore">
                              <RotateCcw size={15} />
                            </button>
                          ) : (
                            <button onClick={() => handleArchive(item)} className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title="Archive">
                              <Archive size={15} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(item)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Permanent delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredItems.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-700">{(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filteredItems.length)}</span> of <span className="font-semibold text-slate-700">{filteredItems.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safePage <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-sm font-semibold text-slate-600">Page {safePage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safePage >= totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{activeCategory.label}</div>
                <h3 className="text-xl font-bold text-slate-900">
                  {modalMode === 'create' ? 'New Master Record' : modalMode === 'edit' ? 'Edit Master Record' : 'View Master Record'}
                </h3>
              </div>
              <button onClick={closeModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                {renderTextInput('Name', draft.name, (value) => updateDraft('name', value), 'Record name')}
                {renderTextInput('Code', draft.code || '', (value) => updateDraft('code', value), 'Optional code')}
                {renderTextInput('Description', draft.description || '', (value) => updateDraft('description', value), 'Short description', true)}
                {renderTextInput('Instructions', draft.instructions || '', (value) => updateDraft('instructions', value), 'Default notes or instructions', true)}
                {renderNumberInput('Sort Order', Number(draft.sort_order) || 0, (value) => updateDraft('sort_order', value || 0), '0')}
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Active</span>
                  <button
                    type="button"
                    disabled={isReadonly}
                    onClick={() => updateDraft('is_active', !draft.is_active)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      draft.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    <span>{draft.is_active ? 'Active' : 'Inactive'}</span>
                    {draft.is_active && <Check size={16} />}
                  </button>
                </label>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Category Fields</div>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderCategoryFields()}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button onClick={closeModal} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Cancel
              </button>
              {modalMode === 'view' ? (
                <button onClick={() => setModalMode('edit')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                  <Edit3 size={16} />
                  Edit
                </button>
              ) : (
                <button
                  onClick={saveDraft}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Record'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MasterFileDirectory;
