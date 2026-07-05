import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, 
  X, Check, AlertTriangle, FileSpreadsheet, Heart, 
  Smile, DollarSign, FileText, Upload, Calendar, Users, 
  PenTool, Activity, ShieldAlert, Sparkles, Filter,
  Layers, Shield, Syringe, Sliders, Settings, RefreshCw, Palette, Scissors, Camera, Info
} from 'lucide-react';
import TreatmentRulesManager, { PRELOADED_RULES } from './TreatmentRulesManager';
import { TreatmentRule } from '../../types';
import { clinicStorage } from '../../lib/indexedDBStorage';
const localStorage = clinicStorage;

// Interfaces for Master Records
export interface MasterService {
  id: string;
  name: string;
  details: string;
  defaultAmount: number;
  autoAdd: boolean;
}

export interface MasterMedicine {
  id: string;
  name: string;
  description: string;
  dosage: string;
}

export interface MasterMedicalCondition {
  id: string;
  name: string;
  remarks: string;
}

export interface MasterDentalHabit {
  id: string;
  name: string;
  remarks: string;
}

export interface MasterTag {
  id: string;
  name: string;
  remarks: string;
}

export interface MasterPrescriptionTemplate {
  id: string;
  name: string;
  prescription: string;
  remarks: string;
}

// Recall Items Interfaces
export interface MasterRecallAppliance {
  id: string;
  name: string;
  remarks: string;
}

export interface MasterRecallOcclusion {
  id: string;
  name: string;
  remarks: string;
}

export interface MasterPeriodontalScreening {
  id: string;
  name: string;
  remarks: string;
}

export interface MasterRecallTMD {
  id: string;
  name: string;
  remarks: string;
}

// Tooth Items Interfaces
export interface MasterToothStatus {
  id: string;
  code: string;
  name: string;
  color: string;
  remarks: string;
}

export interface MasterToothCondition {
  id: string;
  code: string;
  name: string;
  color: string;
  remarks: string;
}

export interface MasterToothProsthodontics {
  id: string;
  code: string;
  name: string;
  remarks: string;
}

export interface MasterToothSurgery {
  id: string;
  code: string;
  name: string;
  remarks: string;
}

export interface MasterToothXray {
  id: string;
  code: string;
  name: string;
  remarks: string;
}

// Preloaded data helpers
const PRELOADED_SERVICES: MasterService[] = [
  { id: 'srv-1', name: 'Consultation Fee', details: '', defaultAmount: 500, autoAdd: false },
  { id: 'srv-2', name: 'Pediatric Extraction (Anterior)', details: 'Bata Front Teeth', defaultAmount: 1000, autoAdd: false },
  { id: 'srv-3', name: 'Composite Filling (Mild/Shallow)', details: '', defaultAmount: 1000, autoAdd: false },
  { id: 'srv-4', name: 'Oral Prophylaxis with Topical Fluoride', details: '', defaultAmount: 1800, autoAdd: false },
  { id: 'srv-5', name: 'Oral Prophylaxis (Mild)', details: 'Mild Calculus Deposit', defaultAmount: 1000, autoAdd: false },
  { id: 'srv-6', name: 'Oral Prophylaxis (Moderate)', details: '', defaultAmount: 1500, autoAdd: false },
  { id: 'srv-7', name: 'Oral Prophylaxis (Severe)', details: '', defaultAmount: 2500, autoAdd: false },
  { id: 'srv-8', name: 'Composite Filling (Moderate)', details: '', defaultAmount: 1500, autoAdd: false },
  { id: 'srv-9', name: 'Composite Veneers', details: '', defaultAmount: 7000, autoAdd: false },
  { id: 'srv-10', name: 'Pediatric Extraction (Posterior)', details: 'Bata Pangil to Bagang na Ngipin', defaultAmount: 1500, autoAdd: false },
  { id: 'srv-11', name: 'Extraction (Anterior)', details: '', defaultAmount: 1000, autoAdd: false },
  { id: 'srv-12', name: 'Extraction (Posterior)', details: '', defaultAmount: 1500, autoAdd: false },
  { id: 'srv-13', name: 'With Surgery Machine', details: '', defaultAmount: 1000, autoAdd: false },
  { id: 'srv-14', name: 'Extraction (Upper Wisdom Tooth)', details: '', defaultAmount: 5000, autoAdd: false },
  { id: 'srv-15', name: 'Follow-up Check-up', details: '', defaultAmount: 600, autoAdd: false },
  { id: 'srv-16', name: 'Consultation (Labxpert-Yazaki)', details: '', defaultAmount: 200, autoAdd: false },
  { id: 'srv-17', name: 'Consultation (Labxpert-Liwayway)', details: '', defaultAmount: 150, autoAdd: false },
  { id: 'srv-18', name: 'Braces Impression', details: '', defaultAmount: 5000, autoAdd: false },
  { id: 'srv-19', name: 'Adjust Braces 1', details: '', defaultAmount: 1500, autoAdd: false },
  { id: 'srv-20', name: 'Adjust Braces 2', details: '', defaultAmount: 1000, autoAdd: false },
  { id: 'srv-21', name: 'Repaste Bracket', details: '', defaultAmount: 250, autoAdd: false },
  { id: 'srv-22', name: 'Replace Bracket', details: '', defaultAmount: 500, autoAdd: false },
  { id: 'srv-23', name: 'Sealant', details: '', defaultAmount: 1000, autoAdd: false },
  { id: 'srv-24', name: 'Periapical Radiograph', details: '', defaultAmount: 700, autoAdd: false },
  { id: 'srv-25', name: 'Odontectomy (Easy)', details: '', defaultAmount: 5000, autoAdd: false },
  { id: 'srv-26', name: 'Consultation (Labxpert-CAVSU)', details: '', defaultAmount: 200, autoAdd: false },
  { id: 'srv-27', name: 'Consultation (Labxpert-Lyceum)', details: '', defaultAmount: 200, autoAdd: false },
  { id: 'srv-28', name: 'Consultation (Labxpert-DepEd)', details: '', defaultAmount: 200, autoAdd: false },
  { id: 'srv-29', name: 'Consultation (Labxpert)', details: '', defaultAmount: 200, autoAdd: false },
  { id: 'srv-30', name: 'Dental Certificate', details: '', defaultAmount: 100, autoAdd: false },
  { id: 'srv-31', name: 'Braces Removal', details: '', defaultAmount: 3500, autoAdd: false },
  { id: 'srv-32', name: 'Impression for Denture', details: '', defaultAmount: 0, autoAdd: false },
];

const PRELOADED_MEDICINES: MasterMedicine[] = [
  { id: 'med-1', name: 'Amoxicillin Trihydrate 500mg (Amoxil)', description: 'Localized Infection', dosage: 'Take 1 capsule every 8 hours for 7 days' },
  { id: 'med-2', name: 'Mefenamic Acid 500mg (Ponstan SF)', description: 'Pain Reliever', dosage: 'Take 1 capsule every 6 hours or as needed' },
  { id: 'med-3', name: 'Tranexamic Acid 500mg (Hemostan)', description: 'For Bleeding', dosage: 'Take 1 capsule every 8 hours or as needed' },
  { id: 'med-4', name: 'Paracetamol 500mg (Biogesic)', description: 'Pain Reliever', dosage: 'Take 1 tablet every 4 hours or as needed' },
  { id: 'med-5', name: 'Co-Amoxiclav 625mg (Augmentin)', description: 'Broad Infection', dosage: 'Take 1 capsule every 12 hours for 7 days' },
  { id: 'med-6', name: 'Chlorhexidine (Orahex AF)', description: 'Mouthwash', dosage: 'Gargle twice daily, 30 minutes before brushing. Start after 3 days. Continue for 90 days.' },
  { id: 'med-7', name: 'Clindamycin 300mg', description: 'Alternative for patients allergic to Amoxicillin', dosage: 'Take 1 capsule every 8 hours for 7 days' }
];

const PRELOADED_CONDITIONS: string[] = [
  "High Blood Pressure", "Low Blood Pressure", "Epilepsy or Convulsion", "AIDS/HIV Infection",
  "Sexually Transmitted Disease", "Stomach Troubles or Ulcers", "Fainting Seizures", "Rapid Weight Loss",
  "Radiation Therapy", "Joint Replacement or Implant", "Heart Surgery", "Heart Attack", "Heart Disease",
  "Heart Murmur", "Hepatitis or Liver Disease", "Rheumatic Fever", "Allergies", "Respiratory Problems",
  "Tuberculosis", "Gout or Swollen Ankles", "Kidney Disease", "Chest Pain", "Stroke", "Cancer or Tumors",
  "Anemia", "Angina", "Asthma", "Bleeding Problems", "Emphysema", "Head Injuries", "Arthritis or Rheumatism",
  "Thyroid Problem", "Diabetes", "Others"
];

const PRELOADED_HABITS: string[] = [
  "Night-time Bottle Feeding", "Thumb Sucking", "Tongue Thrusting", "Teeth Grinding", 
  "Nail Biting", "Mouth Breathing", "Smoking"
];

const PRELOADED_TAGS: { name: string; remarks: string }[] = [
  { name: 'CAVSU', remarks: '' },
  { name: 'Liwayway', remarks: '' },
  { name: 'Yazaki', remarks: '' },
  { name: 'LabXpert-OPD', remarks: '' },
  { name: 'Braces', remarks: 'Braces Patients' },
  { name: 'Oral Prophylaxis', remarks: '' },
  { name: 'Lyceum', remarks: '' }
];

const PRELOADED_PRESCRIPTION_TEMPLATES: MasterPrescriptionTemplate[] = [
  { 
    id: 'rx-tmpl-1', 
    name: 'Post-Extraction Antibiotic & Painkiller', 
    prescription: 'Amoxicillin Trihydrate 500mg\nTake 1 capsule every 8 hours for 7 days\n\nMefenamic Acid 500mg\nTake 1 capsule every 6 hours as needed for pain', 
    remarks: 'Standard post-op medication template' 
  },
  { 
    id: 'rx-tmpl-2', 
    name: 'Orthodontic Soreness Management', 
    prescription: 'Paracetamol 500mg\nTake 1 tablet every 4 to 6 hours as needed for dental soreness', 
    remarks: 'Standard post-adjustment discomfort template' 
  },
  { 
    id: 'rx-tmpl-3', 
    name: 'Root Canal Antibiotic Treatment', 
    prescription: 'Co-Amoxiclav 625mg\nTake 1 tablet every 12 hours for 7 days\n\nMefenamic Acid 500mg\nTake 1 capsule every 6 hours or as needed for pain', 
    remarks: 'Standard severe infection treatment prescription' 
  }
];

// Preloaded Data for Recall Items
const PRELOADED_RECALL_APPLIANCES: MasterRecallAppliance[] = [
  { id: 'app-1', name: 'Orthodontic', remarks: '' },
  { id: 'app-2', name: 'Stayplate', remarks: '' },
  { id: 'app-3', name: 'Other', remarks: '' }
];

const PRELOADED_RECALL_OCCLUSIONS: MasterRecallOcclusion[] = [
  { id: 'occ-1', name: 'Class (Molar)', remarks: '' },
  { id: 'occ-2', name: 'Overjet', remarks: '' },
  { id: 'occ-3', name: 'Overbite', remarks: '' },
  { id: 'occ-4', name: 'Midline Deviation', remarks: '' },
  { id: 'occ-5', name: 'Crossbite', remarks: '' }
];

const PRELOADED_PERIODONTAL_SCREENINGS: MasterPeriodontalScreening[] = [
  { id: 'perio-1', name: 'Gingivitis', remarks: '' },
  { id: 'perio-2', name: 'Early Periodontitis', remarks: '' },
  { id: 'perio-3', name: 'Moderate Periodontitis', remarks: '' },
  { id: 'perio-4', name: 'Advanced Periodontitis', remarks: '' },
  { id: 'perio-5', name: 'Presence of Calculus Deposit', remarks: '' },
  { id: 'perio-6', name: 'Good Oral Hygiene', remarks: '' }
];

const PRELOADED_RECALL_TMDS: MasterRecallTMD[] = [
  { id: 'tmd-1', name: 'Clenching', remarks: '' },
  { id: 'tmd-2', name: 'Clicking', remarks: '' },
  { id: 'tmd-3', name: 'Trismus', remarks: '' },
  { id: 'tmd-4', name: 'Muscle Spasm', remarks: '' }
];

// Preloaded Data for Tooth Items
const PRELOADED_TOOTH_STATUSES: MasterToothStatus[] = [
  { id: 'stat-1', code: 'cv', name: 'Cavity', color: '#FF0000', remarks: '' },
  { id: 'stat-2', code: 'ok', name: 'OK / Pasta', color: '#0433FF', remarks: '' }
];

const PRELOADED_TOOTH_CONDITIONS: MasterToothCondition[] = [
  { id: 'cond-t-1', code: '/', name: 'Present Teeth', color: '#00C853', remarks: '' },
  { id: 'cond-t-2', code: 'm', name: 'Missing Due to Caries', color: '#D50000', remarks: '' },
  { id: 'cond-t-3', code: 'mo', name: 'Missing Due to Other Cause', color: '#AA00FF', remarks: '' },
  { id: 'cond-t-4', code: 'im', name: 'Impacted Tooth', color: '#FF6D00', remarks: '' },
  { id: 'cond-t-5', code: 'sp', name: 'Supernumerary Tooth', color: '#00B0FF', remarks: '' },
  { id: 'cond-t-6', code: 'rf', name: 'Root Fragment', color: '#FFD600', remarks: '' },
  { id: 'cond-t-7', code: 'un', name: 'Unerupted Tooth', color: '#C6FF00', remarks: '' },
  { id: 'cond-t-8', code: 'pt', name: 'Pulpless Tooth', color: '#00E5FF', remarks: '' },
  { id: 'cond-t-9', code: 'd', name: 'Decayed (Caries Indicated for Filling)', color: '#FF1744', remarks: '' },
  { id: 'cond-t-10', code: 'rct', name: 'Root Canal Treatment', color: '#2979FF', remarks: '' }
];

const PRELOADED_TOOTH_PROSTHODONTICS: MasterToothProsthodontics[] = [
  { id: 'prost-1', code: 'mc', name: 'Metal Crown', remarks: '' },
  { id: 'prost-2', code: 'pj', name: 'Plastic Jacket Crown', remarks: '' },
  { id: 'prost-3', code: 'am', name: 'Amalgam Filling', remarks: '' },
  { id: 'prost-4', code: 'lcf', name: 'Light Cure Filling', remarks: '' },
  { id: 'prost-5', code: 'porjc', name: 'Porcelain Crown', remarks: '' },
  { id: 'prost-6', code: 'ab', name: 'Abutment', remarks: '' },
  { id: 'prost-7', code: 'att', name: 'Attachment', remarks: '' },
  { id: 'prost-8', code: 'p', name: 'Pontic', remarks: '' },
  { id: 'prost-9', code: 'ic', name: 'Inlay', remarks: '' },
  { id: 'prost-10', code: 'imp', name: 'Implant', remarks: '' },
  { id: 'prost-11', code: 's', name: 'Sealants', remarks: '' },
  { id: 'prost-12', code: 'rm', name: 'Removable Denture', remarks: '' },
  { id: 'prost-13', code: 'gi', name: 'Glass Ionomer', remarks: '' },
  { id: 'prost-14', code: 'v', name: 'Veneer', remarks: '' },
  { id: 'prost-15', code: 'tf', name: 'Temporary Filling', remarks: '' }
];

const PRELOADED_TOOTH_SURGERIES: MasterToothSurgery[] = [
  { id: 'surg-1', code: 'x', name: 'Extraction Due to Caries', remarks: '' },
  { id: 'surg-2', code: 'xo', name: 'Extraction Due to Other Causes', remarks: '' }
];

const PRELOADED_TOOTH_XRAYS: MasterToothXray[] = [
  { id: 'xray-1', code: 'pano', name: 'Panoramic', remarks: '' },
  { id: 'xray-2', code: 'cepha', name: 'Cephalometric', remarks: '' },
  { id: 'xray-3', code: 'occ', name: 'Occlusal (Upper/Lower)', remarks: '' },
  { id: 'xray-4', code: 'peri', name: 'Periapical', remarks: '' }
];

const ENTITY_LABELS = {
  SERVICES: {
    single: 'Service',
    plural: 'Services',
    button: 'Create New Service',
    modalAdd: 'Create New Service',
    modalEdit: 'Edit Service',
    modalDelete: 'Delete Service',
    placeholder: 'Search Services...'
  },
  MEDICINES: {
    single: 'Medicine',
    plural: 'Medicines',
    button: 'Create New Medicine',
    modalAdd: 'Create New Medicine',
    modalEdit: 'Edit Medicine',
    modalDelete: 'Delete Medicine',
    placeholder: 'Search Medicines...'
  },
  CONDITIONS: {
    single: 'Medical Condition',
    plural: 'Medical Conditions',
    button: 'Create New Medical Condition',
    modalAdd: 'Create New Medical Condition',
    modalEdit: 'Edit Medical Condition',
    modalDelete: 'Delete Medical Condition',
    placeholder: 'Search Medical Conditions...'
  },
  HABITS: {
    single: 'Dental Habit',
    plural: 'Dental Habits',
    button: 'Create New Dental Habit',
    modalAdd: 'Create New Dental Habit',
    modalEdit: 'Edit Dental Habit',
    modalDelete: 'Delete Dental Habit',
    placeholder: 'Search Dental Habits...'
  },
  TAGS: {
    single: 'Tag',
    plural: 'Tags',
    button: 'Create New Tag',
    modalAdd: 'Create New Tag',
    modalEdit: 'Edit Tag',
    modalDelete: 'Delete Tag',
    placeholder: 'Search Tags...'
  },
  PRESCRIPTIONS: {
    single: 'Prescription Template',
    plural: 'Prescription Templates',
    button: 'Create New Prescription Template',
    modalAdd: 'Create New Prescription Template',
    modalEdit: 'Edit Prescription Template',
    modalDelete: 'Delete Prescription Template',
    placeholder: 'Search Prescription Templates...'
  },
  RECALL_APPLIANCES: {
    single: 'Recall Appliance',
    plural: 'Recall Appliances',
    button: 'Create New Recall Appliance',
    modalAdd: 'Create New Recall Appliance',
    modalEdit: 'Edit Recall Appliance',
    modalDelete: 'Delete Recall Appliance',
    placeholder: 'Search Recall Appliances...'
  },
  RECALL_OCCLUSIONS: {
    single: 'Recall Occlusion',
    plural: 'Recall Occlusions',
    button: 'Create New Recall Occlusion',
    modalAdd: 'Create New Recall Occlusion',
    modalEdit: 'Edit Recall Occlusion',
    modalDelete: 'Delete Recall Occlusion',
    placeholder: 'Search Recall Occlusions...'
  },
  PERIODONTAL_SCREENINGS: {
    single: 'Periodontal Screening Item',
    plural: 'Periodontal Screenings',
    button: 'Create New Periodontal Screening Item',
    modalAdd: 'Create New Periodontal Screening Item',
    modalEdit: 'Edit Periodontal Screening Item',
    modalDelete: 'Delete Periodontal Screening Item',
    placeholder: 'Search Periodontal Screenings...'
  },
  RECALL_TMDS: {
    single: 'Recall TMD',
    plural: 'Recall TMD Items',
    button: 'Create New Recall TMD Item',
    modalAdd: 'Create New Recall TMD Item',
    modalEdit: 'Edit Recall TMD Item',
    modalDelete: 'Delete Recall TMD Item',
    placeholder: 'Search Recall TMD Items...'
  },
  TOOTH_STATUSES: {
    single: 'Tooth Status',
    plural: 'Tooth Statuses',
    button: 'Create New Tooth Status Item',
    modalAdd: 'Create New Tooth Status Item',
    modalEdit: 'Edit Tooth Status Item',
    modalDelete: 'Delete Tooth Status Item',
    placeholder: 'Search Tooth Statuses...'
  },
  TOOTH_CONDITIONS: {
    single: 'Tooth Condition',
    plural: 'Tooth Conditions',
    button: 'Create New Tooth Condition Item',
    modalAdd: 'Create New Tooth Condition Item',
    modalEdit: 'Edit Tooth Condition Item',
    modalDelete: 'Delete Tooth Condition Item',
    placeholder: 'Search Tooth Conditions...'
  },
  TOOTH_PROSTHODONTICS: {
    single: 'Tooth Prosthodontic',
    plural: 'Tooth Prosthodontics',
    button: 'Create New Tooth Prosthodontic Item',
    modalAdd: 'Create New Tooth Prosthodontic Item',
    modalEdit: 'Edit Tooth Prosthodontic Item',
    modalDelete: 'Delete Tooth Prosthodontic Item',
    placeholder: 'Search Tooth Prosthodontics...'
  },
  TOOTH_SURGERIES: {
    single: 'Tooth Surgery',
    plural: 'Tooth Surgeries',
    button: 'Create New Tooth Surgery Item',
    modalAdd: 'Create New Tooth Surgery Item',
    modalEdit: 'Edit Tooth Surgery Item',
    modalDelete: 'Delete Tooth Surgery Item',
    placeholder: 'Search Tooth Surgeries...'
  },
  TOOTH_XRAYS: {
    single: 'Tooth X-Ray',
    plural: 'Tooth X-Rays',
    button: 'Create New Tooth X-Ray Item',
    modalAdd: 'Create New Tooth X-Ray Item',
    modalEdit: 'Edit Tooth X-Ray Item',
    modalDelete: 'Delete Tooth X-Ray Item',
    placeholder: 'Search Tooth X-Rays...'
  }
};

// Main Component
interface MasterRecordProps {
  navbarSearchQuery?: string;
}

export default function MasterRecord({ navbarSearchQuery = '' }: MasterRecordProps) {
  const [activeTab, setActiveTab] = useState<
    'SERVICES' | 'MEDICINES' | 'CONDITIONS' | 'HABITS' | 'TAGS' | 'PRESCRIPTIONS' |
    'RECALL_APPLIANCES' | 'RECALL_OCCLUSIONS' | 'PERIODONTAL_SCREENINGS' | 'RECALL_TMDS' |
    'TOOTH_STATUSES' | 'TOOTH_CONDITIONS' | 'TOOTH_PROSTHODONTICS' | 'TOOTH_SURGERIES' | 'TOOTH_XRAYS' |
    'TREATMENT_RULES'
  >('SERVICES');
  
  const [searchQueries, setSearchQueries] = useState({
    SERVICES: '',
    MEDICINES: '',
    CONDITIONS: '',
    HABITS: '',
    TAGS: '',
    PRESCRIPTIONS: '',
    RECALL_APPLIANCES: '',
    RECALL_OCCLUSIONS: '',
    PERIODONTAL_SCREENINGS: '',
    RECALL_TMDS: '',
    TOOTH_STATUSES: '',
    TOOTH_CONDITIONS: '',
    TOOTH_PROSTHODONTICS: '',
    TOOTH_SURGERIES: '',
    TOOTH_XRAYS: '',
    TREATMENT_RULES: ''
  });

  const [currentPages, setCurrentPages] = useState({
    SERVICES: 1,
    MEDICINES: 1,
    CONDITIONS: 1,
    HABITS: 1,
    TAGS: 1,
    PRESCRIPTIONS: 1,
    RECALL_APPLIANCES: 1,
    RECALL_OCCLUSIONS: 1,
    PERIODONTAL_SCREENINGS: 1,
    RECALL_TMDS: 1,
    TOOTH_STATUSES: 1,
    TOOTH_CONDITIONS: 1,
    TOOTH_PROSTHODONTICS: 1,
    TOOTH_SURGERIES: 1,
    TOOTH_XRAYS: 1,
    TREATMENT_RULES: 1
  });

  const itemsPerPage = 30;

  const searchQuery = searchQueries[activeTab];
  const currentPage = currentPages[activeTab];

  const handleSearchChange = (tab: typeof activeTab, value: string) => {
    setSearchQueries(prev => ({ ...prev, [tab]: value }));
    setCurrentPages(prev => ({ ...prev, [tab]: 1 }));
  };

  const handlePageChange = (tab: typeof activeTab, pageNum: number) => {
    setCurrentPages(prev => ({ ...prev, [tab]: pageNum }));
  };

  // Real Database Persistence using localStorage
  const [services, setServices] = useState<MasterService[]>(() => {
    const stored = localStorage.getItem('DENTAL_SERVICES_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_SERVICES;
  });

  const [medicines, setMedicines] = useState<MasterMedicine[]>(() => {
    const stored = localStorage.getItem('DENTAL_MEDICINES_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_MEDICINES;
  });

  const [conditions, setConditions] = useState<MasterMedicalCondition[]>(() => {
    const stored = localStorage.getItem('DENTAL_CONDITIONS_MASTER');
    if (stored) return JSON.parse(stored);
    return PRELOADED_CONDITIONS.map((c, idx) => ({
      id: `cond-${idx + 1}`,
      name: c,
      remarks: ''
    }));
  });

  const [habits, setHabits] = useState<MasterDentalHabit[]>(() => {
    const stored = localStorage.getItem('DENTAL_HABITS_MASTER');
    if (stored) return JSON.parse(stored);
    return PRELOADED_HABITS.map((h, idx) => ({
      id: `hab-${idx + 1}`,
      name: h,
      remarks: ''
    }));
  });

  const [tags, setTags] = useState<MasterTag[]>(() => {
    const stored = localStorage.getItem('DENTAL_TAGS_MASTER');
    if (stored) return JSON.parse(stored);
    return PRELOADED_TAGS.map((t, idx) => ({
      id: `tag-${idx + 1}`,
      name: t.name,
      remarks: t.remarks
    }));
  });

  const [prescriptionTemplates, setPrescriptionTemplates] = useState<MasterPrescriptionTemplate[]>(() => {
    const stored = localStorage.getItem('DENTAL_PRESCRIPTION_TEMPLATES_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_PRESCRIPTION_TEMPLATES;
  });

  // Recall Items State Hooks
  const [recallAppliances, setRecallAppliances] = useState<MasterRecallAppliance[]>(() => {
    const stored = localStorage.getItem('DENTAL_RECALL_APPLIANCES_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_RECALL_APPLIANCES;
  });

  const [recallOcclusions, setRecallOcclusions] = useState<MasterRecallOcclusion[]>(() => {
    const stored = localStorage.getItem('DENTAL_RECALL_OCCLUSIONS_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_RECALL_OCCLUSIONS;
  });

  const [periodontalScreenings, setPeriodontalScreenings] = useState<MasterPeriodontalScreening[]>(() => {
    const stored = localStorage.getItem('DENTAL_PERIODONTAL_SCREENINGS_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_PERIODONTAL_SCREENINGS;
  });

  const [recallTmds, setRecallTmds] = useState<MasterRecallTMD[]>(() => {
    const stored = localStorage.getItem('DENTAL_RECALL_TMDS_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_RECALL_TMDS;
  });

  // Tooth Items State Hooks
  const [toothStatuses, setToothStatuses] = useState<MasterToothStatus[]>(() => {
    const stored = localStorage.getItem('DENTAL_TOOTH_STATUSES_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_TOOTH_STATUSES;
  });

  const [toothConditions, setToothConditions] = useState<MasterToothCondition[]>(() => {
    const stored = localStorage.getItem('DENTAL_TOOTH_CONDITIONS_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_TOOTH_CONDITIONS;
  });

  const [toothProsthodontics, setToothProsthodontics] = useState<MasterToothProsthodontics[]>(() => {
    const stored = localStorage.getItem('DENTAL_TOOTH_PROSTHODONTICS_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_TOOTH_PROSTHODONTICS;
  });

  const [toothSurgeries, setToothSurgeries] = useState<MasterToothSurgery[]>(() => {
    const stored = localStorage.getItem('DENTAL_TOOTH_SURGERIES_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_TOOTH_SURGERIES;
  });

  const [toothXrays, setToothXrays] = useState<MasterToothXray[]>(() => {
    const stored = localStorage.getItem('DENTAL_TOOTH_XRAYS_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_TOOTH_XRAYS;
  });

  const [treatmentRules, setTreatmentRules] = useState<TreatmentRule[]>(() => {
    const stored = localStorage.getItem('DENTAL_TREATMENT_RULES_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_RULES;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('DENTAL_SERVICES_MASTER', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('DENTAL_MEDICINES_MASTER', JSON.stringify(medicines));
  }, [medicines]);

  useEffect(() => {
    localStorage.setItem('DENTAL_CONDITIONS_MASTER', JSON.stringify(conditions));
  }, [conditions]);

  useEffect(() => {
    localStorage.setItem('DENTAL_HABITS_MASTER', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('DENTAL_TAGS_MASTER', JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    localStorage.setItem('DENTAL_PRESCRIPTION_TEMPLATES_MASTER', JSON.stringify(prescriptionTemplates));
  }, [prescriptionTemplates]);

  useEffect(() => {
    localStorage.setItem('DENTAL_RECALL_APPLIANCES_MASTER', JSON.stringify(recallAppliances));
  }, [recallAppliances]);

  useEffect(() => {
    localStorage.setItem('DENTAL_RECALL_OCCLUSIONS_MASTER', JSON.stringify(recallOcclusions));
  }, [recallOcclusions]);

  useEffect(() => {
    localStorage.setItem('DENTAL_PERIODONTAL_SCREENINGS_MASTER', JSON.stringify(periodontalScreenings));
  }, [periodontalScreenings]);

  useEffect(() => {
    localStorage.setItem('DENTAL_RECALL_TMDS_MASTER', JSON.stringify(recallTmds));
  }, [recallTmds]);

  useEffect(() => {
    localStorage.setItem('DENTAL_TOOTH_STATUSES_MASTER', JSON.stringify(toothStatuses));
  }, [toothStatuses]);

  useEffect(() => {
    localStorage.setItem('DENTAL_TOOTH_CONDITIONS_MASTER', JSON.stringify(toothConditions));
  }, [toothConditions]);

  useEffect(() => {
    localStorage.setItem('DENTAL_TOOTH_PROSTHODONTICS_MASTER', JSON.stringify(toothProsthodontics));
  }, [toothProsthodontics]);

  useEffect(() => {
    localStorage.setItem('DENTAL_TOOTH_SURGERIES_MASTER', JSON.stringify(toothSurgeries));
  }, [toothSurgeries]);

  useEffect(() => {
    localStorage.setItem('DENTAL_TOOTH_XRAYS_MASTER', JSON.stringify(toothXrays));
  }, [toothXrays]);



  // Alert/Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // CRUD Dialog States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Field States
  const [formFields, setFormFields] = useState({
    serviceName: '',
    serviceDetails: '',
    serviceAmount: '',
    serviceAutoAdd: false,

    medicineName: '',
    medicineDescription: '',
    medicineDosage: '',

    conditionName: '',
    conditionRemarks: '',

    habitName: '',
    habitRemarks: '',

    tagName: '',
    tagRemarks: '',

    templateName: '',
    templatePrescription: '',
    templateRemarks: '',

    // Recall Items
    recallApplianceName: '',
    recallApplianceRemarks: '',

    recallOcclusionName: '',
    recallOcclusionRemarks: '',

    periodontalScreeningName: '',
    periodontalScreeningRemarks: '',

    recallTmdName: '',
    recallTmdRemarks: '',

    // Tooth Items
    toothStatusCode: '',
    toothStatusName: '',
    toothStatusColor: '#FF0000',
    toothStatusRemarks: '',

    toothConditionCode: '',
    toothConditionName: '',
    toothConditionColor: '#CCCCCC',
    toothConditionRemarks: '',

    toothProsthodonticsCode: '',
    toothProsthodonticsName: '',
    toothProsthodonticsRemarks: '',

    toothSurgeryCode: '',
    toothSurgeryName: '',
    toothSurgeryRemarks: '',

    toothXrayCode: '',
    toothXrayName: '',
    toothXrayRemarks: ''
  });

  // Open Add Modal
  const openAddModal = () => {
    setModalMode('ADD');
    setEditingId(null);
    setFormFields({
      serviceName: '',
      serviceDetails: '',
      serviceAmount: '',
      serviceAutoAdd: false,
      medicineName: '',
      medicineDescription: '',
      medicineDosage: '',
      conditionName: '',
      conditionRemarks: '',
      habitName: '',
      habitRemarks: '',
      tagName: '',
      tagRemarks: '',
      templateName: '',
      templatePrescription: '',
      templateRemarks: '',

      // Recall Items
      recallApplianceName: '',
      recallApplianceRemarks: '',
      recallOcclusionName: '',
      recallOcclusionRemarks: '',
      periodontalScreeningName: '',
      periodontalScreeningRemarks: '',
      recallTmdName: '',
      recallTmdRemarks: '',

      // Tooth Items
      toothStatusCode: '',
      toothStatusName: '',
      toothStatusColor: '#FF0000',
      toothStatusRemarks: '',
      toothConditionCode: '',
      toothConditionName: '',
      toothConditionColor: '#CCCCCC',
      toothConditionRemarks: '',
      toothProsthodonticsCode: '',
      toothProsthodonticsName: '',
      toothProsthodonticsRemarks: '',
      toothSurgeryCode: '',
      toothSurgeryName: '',
      toothSurgeryRemarks: '',
      toothXrayCode: '',
      toothXrayName: '',
      toothXrayRemarks: ''
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: any) => {
    setModalMode('EDIT');
    setEditingId(item.id);
    
    if (activeTab === 'SERVICES') {
      setFormFields(prev => ({
        ...prev,
        serviceName: item.name,
        serviceDetails: item.details,
        serviceAmount: String(item.defaultAmount),
        serviceAutoAdd: item.autoAdd
      }));
    } else if (activeTab === 'MEDICINES') {
      setFormFields(prev => ({
        ...prev,
        medicineName: item.name,
        medicineDescription: item.description,
        medicineDosage: item.dosage
      }));
    } else if (activeTab === 'CONDITIONS') {
      setFormFields(prev => ({
        ...prev,
        conditionName: item.name,
        conditionRemarks: item.remarks
      }));
    } else if (activeTab === 'HABITS') {
      setFormFields(prev => ({
        ...prev,
        habitName: item.name,
        habitRemarks: item.remarks
      }));
    } else if (activeTab === 'TAGS') {
      setFormFields(prev => ({
        ...prev,
        tagName: item.name,
        tagRemarks: item.remarks
      }));
    } else if (activeTab === 'PRESCRIPTIONS') {
      setFormFields(prev => ({
        ...prev,
        templateName: item.name,
        templatePrescription: item.prescription,
        templateRemarks: item.remarks
      }));
    } else if (activeTab === 'RECALL_APPLIANCES') {
      setFormFields(prev => ({
        ...prev,
        recallApplianceName: item.name,
        recallApplianceRemarks: item.remarks
      }));
    } else if (activeTab === 'RECALL_OCCLUSIONS') {
      setFormFields(prev => ({
        ...prev,
        recallOcclusionName: item.name,
        recallOcclusionRemarks: item.remarks
      }));
    } else if (activeTab === 'PERIODONTAL_SCREENINGS') {
      setFormFields(prev => ({
        ...prev,
        periodontalScreeningName: item.name,
        periodontalScreeningRemarks: item.remarks
      }));
    } else if (activeTab === 'RECALL_TMDS') {
      setFormFields(prev => ({
        ...prev,
        recallTmdName: item.name,
        recallTmdRemarks: item.remarks
      }));
    } else if (activeTab === 'TOOTH_STATUSES') {
      setFormFields(prev => ({
        ...prev,
        toothStatusCode: item.code,
        toothStatusName: item.name,
        toothStatusColor: item.color,
        toothStatusRemarks: item.remarks
      }));
    } else if (activeTab === 'TOOTH_CONDITIONS') {
      setFormFields(prev => ({
        ...prev,
        toothConditionCode: item.code,
        toothConditionName: item.name,
        toothConditionColor: item.color || '#CCCCCC',
        toothConditionRemarks: item.remarks
      }));
    } else if (activeTab === 'TOOTH_PROSTHODONTICS') {
      setFormFields(prev => ({
        ...prev,
        toothProsthodonticsCode: item.code,
        toothProsthodonticsName: item.name,
        toothProsthodonticsRemarks: item.remarks
      }));
    } else if (activeTab === 'TOOTH_SURGERIES') {
      setFormFields(prev => ({
        ...prev,
        toothSurgeryCode: item.code,
        toothSurgeryName: item.name,
        toothSurgeryRemarks: item.remarks
      }));
    } else if (activeTab === 'TOOTH_XRAYS') {
      setFormFields(prev => ({
        ...prev,
        toothXrayCode: item.code,
        toothXrayName: item.name,
        toothXrayRemarks: item.remarks
      }));
    }
    setIsModalOpen(true);
  };

  // Form Validation & Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'SERVICES') {
      const { serviceName, serviceDetails, serviceAmount, serviceAutoAdd } = formFields;
      if (!serviceName.trim()) {
        showToast('Service name is required!', 'error');
        return;
      }
      const amountVal = parseFloat(serviceAmount.replace(/[₱,\s]/g, ''));
      if (isNaN(amountVal) || amountVal < 0) {
        showToast('Please enter a valid amount!', 'error');
        return;
      }

      // Check for duplicate name
      const exists = services.some(s => s.name.toLowerCase() === serviceName.trim().toLowerCase() && s.id !== editingId);
      if (exists) {
        showToast(`A service with the name "${serviceName.trim()}" already exists!`, 'error');
        return;
      }

      if (modalMode === 'ADD') {
        const newSrv: MasterService = {
          id: `srv-${Date.now()}`,
          name: serviceName.trim(),
          details: serviceDetails.trim(),
          defaultAmount: amountVal,
          autoAdd: serviceAutoAdd
        };
        setServices(prev => [newSrv, ...prev]);
        showToast('Service added successfully!');
      } else {
        setServices(prev => prev.map(s => s.id === editingId ? {
          ...s,
          name: serviceName.trim(),
          details: serviceDetails.trim(),
          defaultAmount: amountVal,
          autoAdd: serviceAutoAdd
        } : s));
        showToast('Service updated successfully!');
      }

    } else if (activeTab === 'MEDICINES') {
      const { medicineName, medicineDescription, medicineDosage } = formFields;
      if (!medicineName.trim()) {
        showToast('Medicine name is required!', 'error');
        return;
      }

      const exists = medicines.some(m => m.name.toLowerCase() === medicineName.trim().toLowerCase() && m.id !== editingId);
      if (exists) {
        showToast(`A medicine with the name "${medicineName.trim()}" already exists!`, 'error');
        return;
      }

      if (modalMode === 'ADD') {
        const newMed: MasterMedicine = {
          id: `med-${Date.now()}`,
          name: medicineName.trim(),
          description: medicineDescription.trim(),
          dosage: medicineDosage.trim()
        };
        setMedicines(prev => [newMed, ...prev]);
        showToast('Medicine added successfully!');
      } else {
        setMedicines(prev => prev.map(m => m.id === editingId ? {
          ...m,
          name: medicineName.trim(),
          description: medicineDescription.trim(),
          dosage: medicineDosage.trim()
        } : m));
        showToast('Medicine updated successfully!');
      }

    } else if (activeTab === 'CONDITIONS') {
      const { conditionName, conditionRemarks } = formFields;
      if (!conditionName.trim()) {
        showToast('Medical condition name is required!', 'error');
        return;
      }

      const exists = conditions.some(c => c.name.toLowerCase() === conditionName.trim().toLowerCase() && c.id !== editingId);
      if (exists) {
        showToast(`The medical condition "${conditionName.trim()}" already exists!`, 'error');
        return;
      }

      if (modalMode === 'ADD') {
        const newCond: MasterMedicalCondition = {
          id: `cond-${Date.now()}`,
          name: conditionName.trim(),
          remarks: conditionRemarks.trim()
        };
        setConditions(prev => [newCond, ...prev]);
        showToast('Medical condition added successfully!');
      } else {
        setConditions(prev => prev.map(c => c.id === editingId ? {
          ...c,
          name: conditionName.trim(),
          remarks: conditionRemarks.trim()
        } : c));
        showToast('Medical condition updated successfully!');
      }

    } else if (activeTab === 'HABITS') {
      const { habitName, habitRemarks } = formFields;
      if (!habitName.trim()) {
        showToast('Dental habit name is required!', 'error');
        return;
      }

      const exists = habits.some(h => h.name.toLowerCase() === habitName.trim().toLowerCase() && h.id !== editingId);
      if (exists) {
        showToast(`The dental habit "${habitName.trim()}" already exists!`, 'error');
        return;
      }

      if (modalMode === 'ADD') {
        const newHab: MasterDentalHabit = {
          id: `hab-${Date.now()}`,
          name: habitName.trim(),
          remarks: habitRemarks.trim()
        };
        setHabits(prev => [newHab, ...prev]);
        showToast('Dental habit added successfully!');
      } else {
        setHabits(prev => prev.map(h => h.id === editingId ? {
          ...h,
          name: habitName.trim(),
          remarks: habitRemarks.trim()
        } : h));
        showToast('Dental habit updated successfully!');
      }

    } else if (activeTab === 'TAGS') {
      const { tagName, tagRemarks } = formFields;
      if (!tagName.trim()) {
        showToast('Tag name is required!', 'error');
        return;
      }

      const exists = tags.some(t => t.name.toLowerCase() === tagName.trim().toLowerCase() && t.id !== editingId);
      if (exists) {
        showToast(`The tag "${tagName.trim()}" already exists!`, 'error');
        return;
      }

      if (modalMode === 'ADD') {
        const newTag: MasterTag = {
          id: `tag-${Date.now()}`,
          name: tagName.trim(),
          remarks: tagRemarks.trim()
        };
        setTags(prev => [newTag, ...prev]);
        showToast('Tag added successfully!');
      } else {
        setTags(prev => prev.map(t => t.id === editingId ? {
          ...t,
          name: tagName.trim(),
          remarks: tagRemarks.trim()
        } : t));
        showToast('Tag updated successfully!');
      }

    } else if (activeTab === 'PRESCRIPTIONS') {
      const { templateName, templatePrescription, templateRemarks } = formFields;
      if (!templateName.trim()) {
        showToast('Template name is required!', 'error');
        return;
      }
      if (!templatePrescription.trim()) {
        showToast('Prescription instructions cannot be empty!', 'error');
        return;
      }

      const exists = prescriptionTemplates.some(p => p.name.toLowerCase() === templateName.trim().toLowerCase() && p.id !== editingId);
      if (exists) {
        showToast(`A template with the name "${templateName.trim()}" already exists!`, 'error');
        return;
      }

      if (modalMode === 'ADD') {
        const newTmpl: MasterPrescriptionTemplate = {
          id: `rx-tmpl-${Date.now()}`,
          name: templateName.trim(),
          prescription: templatePrescription.trim(),
          remarks: templateRemarks.trim()
        };
        setPrescriptionTemplates(prev => [newTmpl, ...prev]);
        showToast('Prescription template added successfully!');
      } else {
        setPrescriptionTemplates(prev => prev.map(p => p.id === editingId ? {
          ...p,
          name: templateName.trim(),
          prescription: templatePrescription.trim(),
          remarks: templateRemarks.trim()
        } : p));
        showToast('Prescription template updated successfully!');
      }

    } else if (activeTab === 'RECALL_APPLIANCES') {
      const { recallApplianceName, recallApplianceRemarks } = formFields;
      if (!recallApplianceName.trim()) {
        showToast('Recall appliance is required!', 'error');
        return;
      }
      const exists = recallAppliances.some(a => a.name.toLowerCase() === recallApplianceName.trim().toLowerCase() && a.id !== editingId);
      if (exists) {
        showToast(`A recall appliance with the name "${recallApplianceName.trim()}" already exists!`, 'error');
        return;
      }
      if (modalMode === 'ADD') {
        const newItem: MasterRecallAppliance = {
          id: `app-${Date.now()}`,
          name: recallApplianceName.trim(),
          remarks: recallApplianceRemarks.trim()
        };
        setRecallAppliances(prev => [newItem, ...prev]);
        showToast('Recall appliance added successfully!');
      } else {
        setRecallAppliances(prev => prev.map(a => a.id === editingId ? {
          ...a,
          name: recallApplianceName.trim(),
          remarks: recallApplianceRemarks.trim()
        } : a));
        showToast('Recall appliance updated successfully!');
      }

    } else if (activeTab === 'RECALL_OCCLUSIONS') {
      const { recallOcclusionName, recallOcclusionRemarks } = formFields;
      if (!recallOcclusionName.trim()) {
        showToast('Recall occlusion is required!', 'error');
        return;
      }
      const exists = recallOcclusions.some(o => o.name.toLowerCase() === recallOcclusionName.trim().toLowerCase() && o.id !== editingId);
      if (exists) {
        showToast(`A recall occlusion item with the name "${recallOcclusionName.trim()}" already exists!`, 'error');
        return;
      }
      if (modalMode === 'ADD') {
        const newItem: MasterRecallOcclusion = {
          id: `occ-${Date.now()}`,
          name: recallOcclusionName.trim(),
          remarks: recallOcclusionRemarks.trim()
        };
        setRecallOcclusions(prev => [newItem, ...prev]);
        showToast('Recall occlusion item added successfully!');
      } else {
        setRecallOcclusions(prev => prev.map(o => o.id === editingId ? {
          ...o,
          name: recallOcclusionName.trim(),
          remarks: recallOcclusionRemarks.trim()
        } : o));
        showToast('Recall occlusion item updated successfully!');
      }

    } else if (activeTab === 'PERIODONTAL_SCREENINGS') {
      const { periodontalScreeningName, periodontalScreeningRemarks } = formFields;
      if (!periodontalScreeningName.trim()) {
        showToast('Periodontal screening is required!', 'error');
        return;
      }
      const exists = periodontalScreenings.some(p => p.name.toLowerCase() === periodontalScreeningName.trim().toLowerCase() && p.id !== editingId);
      if (exists) {
        showToast(`A periodontal screening with the name "${periodontalScreeningName.trim()}" already exists!`, 'error');
        return;
      }
      if (modalMode === 'ADD') {
        const newItem: MasterPeriodontalScreening = {
          id: `perio-${Date.now()}`,
          name: periodontalScreeningName.trim(),
          remarks: periodontalScreeningRemarks.trim()
        };
        setPeriodontalScreenings(prev => [newItem, ...prev]);
        showToast('Periodontal screening added successfully!');
      } else {
        setPeriodontalScreenings(prev => prev.map(p => p.id === editingId ? {
          ...p,
          name: periodontalScreeningName.trim(),
          remarks: periodontalScreeningRemarks.trim()
        } : p));
        showToast('Periodontal screening updated successfully!');
      }

    } else if (activeTab === 'RECALL_TMDS') {
      const { recallTmdName, recallTmdRemarks } = formFields;
      if (!recallTmdName.trim()) {
        showToast('Recall TMD item is required!', 'error');
        return;
      }
      const exists = recallTmds.some(t => t.name.toLowerCase() === recallTmdName.trim().toLowerCase() && t.id !== editingId);
      if (exists) {
        showToast(`A recall TMD item with the name "${recallTmdName.trim()}" already exists!`, 'error');
        return;
      }
      if (modalMode === 'ADD') {
        const newItem: MasterRecallTMD = {
          id: `tmd-${Date.now()}`,
          name: recallTmdName.trim(),
          remarks: recallTmdRemarks.trim()
        };
        setRecallTmds(prev => [newItem, ...prev]);
        showToast('Recall TMD item added successfully!');
      } else {
        setRecallTmds(prev => prev.map(t => t.id === editingId ? {
          ...t,
          name: recallTmdName.trim(),
          remarks: recallTmdRemarks.trim()
        } : t));
        showToast('Recall TMD item updated successfully!');
      }

    } else if (activeTab === 'TOOTH_STATUSES') {
      const { toothStatusCode, toothStatusName, toothStatusColor, toothStatusRemarks } = formFields;
      if (!toothStatusCode.trim()) {
        showToast('Code is required!', 'error');
        return;
      }
      if (!toothStatusName.trim()) {
        showToast('Name is required!', 'error');
        return;
      }
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexRegex.test(toothStatusColor)) {
        showToast('Color must be a valid hexadecimal format (e.g. #FF0000)!', 'error');
        return;
      }
      const codeExists = toothStatuses.some(t => t.code.toLowerCase() === toothStatusCode.trim().toLowerCase() && t.id !== editingId);
      if (codeExists) {
        showToast(`A tooth status with the code "${toothStatusCode.trim()}" already exists!`, 'error');
        return;
      }
      const nameExists = toothStatuses.some(t => t.name.toLowerCase() === toothStatusName.trim().toLowerCase() && t.id !== editingId);
      if (nameExists) {
        showToast(`A tooth status with the name "${toothStatusName.trim()}" already exists!`, 'error');
        return;
      }

      if (modalMode === 'ADD') {
        const newItem: MasterToothStatus = {
          id: `stat-${Date.now()}`,
          code: toothStatusCode.trim(),
          name: toothStatusName.trim(),
          color: toothStatusColor,
          remarks: toothStatusRemarks.trim()
        };
        setToothStatuses(prev => [newItem, ...prev]);
        showToast('Tooth status item added successfully!');
      } else {
        setToothStatuses(prev => prev.map(t => t.id === editingId ? {
          ...t,
          code: toothStatusCode.trim(),
          name: toothStatusName.trim(),
          color: toothStatusColor,
          remarks: toothStatusRemarks.trim()
        } : t));
        showToast('Tooth status item updated successfully!');
      }

    } else if (activeTab === 'TOOTH_CONDITIONS') {
      const { toothConditionCode, toothConditionName, toothConditionColor, toothConditionRemarks } = formFields;
      if (!toothConditionCode.trim()) {
        showToast('Code is required!', 'error');
        return;
      }
      if (!toothConditionName.trim()) {
        showToast('Name is required!', 'error');
        return;
      }
      if (toothConditionColor && toothConditionColor.trim()) {
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexRegex.test(toothConditionColor)) {
          showToast('Color must be a valid hexadecimal format (e.g. #CCCCCC)!', 'error');
          return;
        }
      }
      const codeExists = toothConditions.some(t => t.code.toLowerCase() === toothConditionCode.trim().toLowerCase() && t.id !== editingId);
      if (codeExists) {
        showToast(`A tooth condition with the code "${toothConditionCode.trim()}" already exists!`, 'error');
        return;
      }
      const nameExists = toothConditions.some(t => t.name.toLowerCase() === toothConditionName.trim().toLowerCase() && t.id !== editingId);
      if (nameExists) {
        showToast(`A tooth condition with the name "${toothConditionName.trim()}" already exists!`, 'error');
        return;
      }

      if (modalMode === 'ADD') {
        const newItem: MasterToothCondition = {
          id: `cond-t-${Date.now()}`,
          code: toothConditionCode.trim(),
          name: toothConditionName.trim(),
          color: toothConditionColor || '#CCCCCC',
          remarks: toothConditionRemarks.trim()
        };
        setToothConditions(prev => [newItem, ...prev]);
        showToast('Tooth condition item added successfully!');
      } else {
        setToothConditions(prev => prev.map(t => t.id === editingId ? {
          ...t,
          code: toothConditionCode.trim(),
          name: toothConditionName.trim(),
          color: toothConditionColor || '#CCCCCC',
          remarks: toothConditionRemarks.trim()
        } : t));
        showToast('Tooth condition item updated successfully!');
      }

    } else if (activeTab === 'TOOTH_PROSTHODONTICS') {
      const { toothProsthodonticsCode, toothProsthodonticsName, toothProsthodonticsRemarks } = formFields;
      if (!toothProsthodonticsCode.trim()) {
        showToast('Code is required!', 'error');
        return;
      }
      if (!toothProsthodonticsName.trim()) {
        showToast('Name is required!', 'error');
        return;
      }
      const codeExists = toothProsthodontics.some(t => t.code.toLowerCase() === toothProsthodonticsCode.trim().toLowerCase() && t.id !== editingId);
      if (codeExists) {
        showToast(`A tooth prosthodontic item with the code "${toothProsthodonticsCode.trim()}" already exists!`, 'error');
        return;
      }
      const nameExists = toothProsthodontics.some(t => t.name.toLowerCase() === toothProsthodonticsName.trim().toLowerCase() && t.id !== editingId);
      if (nameExists) {
        showToast(`A tooth prosthodontic item with the name "${toothProsthodonticsName.trim()}" already exists!`, 'error');
        return;
      }

      if (modalMode === 'ADD') {
        const newItem: MasterToothProsthodontics = {
          id: `prost-${Date.now()}`,
          code: toothProsthodonticsCode.trim(),
          name: toothProsthodonticsName.trim(),
          remarks: toothProsthodonticsRemarks.trim()
        };
        setToothProsthodontics(prev => [newItem, ...prev]);
        showToast('Tooth prosthodontic item added successfully!');
      } else {
        setToothProsthodontics(prev => prev.map(t => t.id === editingId ? {
          ...t,
          code: toothProsthodonticsCode.trim(),
          name: toothProsthodonticsName.trim(),
          remarks: toothProsthodonticsRemarks.trim()
        } : t));
        showToast('Tooth prosthodontic item updated successfully!');
      }

    } else if (activeTab === 'TOOTH_SURGERIES') {
      const { toothSurgeryCode, toothSurgeryName, toothSurgeryRemarks } = formFields;
      if (!toothSurgeryCode.trim()) {
        showToast('Code is required!', 'error');
        return;
      }
      if (!toothSurgeryName.trim()) {
        showToast('Name is required!', 'error');
        return;
      }
      const codeExists = toothSurgeries.some(t => t.code.toLowerCase() === toothSurgeryCode.trim().toLowerCase() && t.id !== editingId);
      if (codeExists) {
        showToast(`A tooth surgery item with the code "${toothSurgeryCode.trim()}" already exists!`, 'error');
        return;
      }
      const nameExists = toothSurgeries.some(t => t.name.toLowerCase() === toothSurgeryName.trim().toLowerCase() && t.id !== editingId);
      if (nameExists) {
        showToast(`A tooth surgery item with the name "${toothSurgeryName.trim()}" already exists!`, 'error');
        return;
      }

      if (modalMode === 'ADD') {
        const newItem: MasterToothSurgery = {
          id: `surg-${Date.now()}`,
          code: toothSurgeryCode.trim(),
          name: toothSurgeryName.trim(),
          remarks: toothSurgeryRemarks.trim()
        };
        setToothSurgeries(prev => [newItem, ...prev]);
        showToast('Tooth surgery item added successfully!');
      } else {
        setToothSurgeries(prev => prev.map(t => t.id === editingId ? {
          ...t,
          code: toothSurgeryCode.trim(),
          name: toothSurgeryName.trim(),
          remarks: toothSurgeryRemarks.trim()
        } : t));
        showToast('Tooth surgery item updated successfully!');
      }

    } else if (activeTab === 'TOOTH_XRAYS') {
      const { toothXrayCode, toothXrayName, toothXrayRemarks } = formFields;
      if (!toothXrayCode.trim()) {
        showToast('Code is required!', 'error');
        return;
      }
      if (!toothXrayName.trim()) {
        showToast('Name is required!', 'error');
        return;
      }
      const codeExists = toothXrays.some(t => t.code.toLowerCase() === toothXrayCode.trim().toLowerCase() && t.id !== editingId);
      if (codeExists) {
        showToast(`A tooth X-ray item with the code "${toothXrayCode.trim()}" already exists!`, 'error');
        return;
      }
      const nameExists = toothXrays.some(t => t.name.toLowerCase() === toothXrayName.trim().toLowerCase() && t.id !== editingId);
      if (nameExists) {
        showToast(`A tooth X-ray item with the name "${toothXrayName.trim()}" already exists!`, 'error');
        return;
      }

      if (modalMode === 'ADD') {
        const newItem: MasterToothXray = {
          id: `xray-${Date.now()}`,
          code: toothXrayCode.trim(),
          name: toothXrayName.trim(),
          remarks: toothXrayRemarks.trim()
        };
        setToothXrays(prev => [newItem, ...prev]);
        showToast('Tooth X-ray item added successfully!');
      } else {
        setToothXrays(prev => prev.map(t => t.id === editingId ? {
          ...t,
          code: toothXrayCode.trim(),
          name: toothXrayName.trim(),
          remarks: toothXrayRemarks.trim()
        } : t));
        showToast('Tooth X-ray item updated successfully!');
      }
    }

    setIsModalOpen(false);
  };

  // Delete Action Handler
  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;

    if (activeTab === 'SERVICES') {
      setServices(prev => prev.filter(s => s.id !== deleteConfirmId));
      showToast('Service deleted successfully!');
    } else if (activeTab === 'MEDICINES') {
      setMedicines(prev => prev.filter(m => m.id !== deleteConfirmId));
      showToast('Medicine deleted successfully!');
    } else if (activeTab === 'CONDITIONS') {
      setConditions(prev => prev.filter(c => c.id !== deleteConfirmId));
      showToast('Medical condition deleted successfully!');
    } else if (activeTab === 'HABITS') {
      setHabits(prev => prev.filter(h => h.id !== deleteConfirmId));
      showToast('Dental habit deleted successfully!');
    } else if (activeTab === 'TAGS') {
      setTags(prev => prev.filter(t => t.id !== deleteConfirmId));
      showToast('Tag deleted successfully!');
    } else if (activeTab === 'PRESCRIPTIONS') {
      setPrescriptionTemplates(prev => prev.filter(p => p.id !== deleteConfirmId));
      showToast('Prescription template deleted successfully!');
    } else if (activeTab === 'RECALL_APPLIANCES') {
      setRecallAppliances(prev => prev.filter(a => a.id !== deleteConfirmId));
      showToast('Recall appliance deleted successfully!');
    } else if (activeTab === 'RECALL_OCCLUSIONS') {
      setRecallOcclusions(prev => prev.filter(o => o.id !== deleteConfirmId));
      showToast('Recall occlusion item deleted successfully!');
    } else if (activeTab === 'PERIODONTAL_SCREENINGS') {
      setPeriodontalScreenings(prev => prev.filter(p => p.id !== deleteConfirmId));
      showToast('Periodontal screening deleted successfully!');
    } else if (activeTab === 'RECALL_TMDS') {
      setRecallTmds(prev => prev.filter(t => t.id !== deleteConfirmId));
      showToast('Recall TMD item deleted successfully!');
    } else if (activeTab === 'TOOTH_STATUSES') {
      setToothStatuses(prev => prev.filter(t => t.id !== deleteConfirmId));
      showToast('Tooth status item deleted successfully!');
    } else if (activeTab === 'TOOTH_CONDITIONS') {
      setToothConditions(prev => prev.filter(t => t.id !== deleteConfirmId));
      showToast('Tooth condition item deleted successfully!');
    } else if (activeTab === 'TOOTH_PROSTHODONTICS') {
      setToothProsthodontics(prev => prev.filter(t => t.id !== deleteConfirmId));
      showToast('Tooth prosthodontic item deleted successfully!');
    } else if (activeTab === 'TOOTH_SURGERIES') {
      setToothSurgeries(prev => prev.filter(t => t.id !== deleteConfirmId));
      showToast('Tooth surgery item deleted successfully!');
    } else if (activeTab === 'TOOTH_XRAYS') {
      setToothXrays(prev => prev.filter(t => t.id !== deleteConfirmId));
      showToast('Tooth X-ray item deleted successfully!');
    }

    setDeleteConfirmId(null);
  };

  // Formatting currency helper (Philippine Peso)
  const formatPHP = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Instant filtering across visible columns
  const filteredItems = useMemo(() => {
    const q = (navbarSearchQuery || searchQuery).toLowerCase().trim();
    if (!q) {
      if (activeTab === 'SERVICES') return services;
      if (activeTab === 'MEDICINES') return medicines;
      if (activeTab === 'CONDITIONS') return conditions;
      if (activeTab === 'HABITS') return habits;
      if (activeTab === 'TAGS') return tags;
      if (activeTab === 'PRESCRIPTIONS') return prescriptionTemplates;
      if (activeTab === 'RECALL_APPLIANCES') return recallAppliances;
      if (activeTab === 'RECALL_OCCLUSIONS') return recallOcclusions;
      if (activeTab === 'PERIODONTAL_SCREENINGS') return periodontalScreenings;
      if (activeTab === 'RECALL_TMDS') return recallTmds;
      if (activeTab === 'TOOTH_STATUSES') return toothStatuses;
      if (activeTab === 'TOOTH_CONDITIONS') return toothConditions;
      if (activeTab === 'TOOTH_PROSTHODONTICS') return toothProsthodontics;
      if (activeTab === 'TOOTH_SURGERIES') return toothSurgeries;
      if (activeTab === 'TOOTH_XRAYS') return toothXrays;
      return [];
    }

    if (activeTab === 'SERVICES') {
      return services.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.details.toLowerCase().includes(q) || 
        formatPHP(s.defaultAmount).toLowerCase().includes(q) ||
        (s.autoAdd ? 'yes' : 'no').includes(q)
      );
    }
    if (activeTab === 'MEDICINES') {
      return medicines.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.description.toLowerCase().includes(q) || 
        m.dosage.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'CONDITIONS') {
      return conditions.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.remarks.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'HABITS') {
      return habits.filter(h => 
        h.name.toLowerCase().includes(q) || 
        h.remarks.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'TAGS') {
      return tags.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.remarks.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'PRESCRIPTIONS') {
      return prescriptionTemplates.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.prescription.toLowerCase().includes(q) || 
        p.remarks.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'RECALL_APPLIANCES') {
      return recallAppliances.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.remarks.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'RECALL_OCCLUSIONS') {
      return recallOcclusions.filter(o =>
        o.name.toLowerCase().includes(q) ||
        o.remarks.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'PERIODONTAL_SCREENINGS') {
      return periodontalScreenings.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.remarks.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'RECALL_TMDS') {
      return recallTmds.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.remarks.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'TOOTH_STATUSES') {
      return toothStatuses.filter(t =>
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.remarks.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'TOOTH_CONDITIONS') {
      return toothConditions.filter(t =>
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.remarks.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'TOOTH_PROSTHODONTICS') {
      return toothProsthodontics.filter(t =>
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.remarks.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'TOOTH_SURGERIES') {
      return toothSurgeries.filter(t =>
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.remarks.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'TOOTH_XRAYS') {
      return toothXrays.filter(t =>
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.remarks.toLowerCase().includes(q)
      );
    }
    return [];
  }, [
    activeTab, searchQuery, services, medicines, conditions, habits, tags, prescriptionTemplates,
    recallAppliances, recallOcclusions, periodontalScreenings, recallTmds,
    toothStatuses, toothConditions, toothProsthodontics, toothSurgeries, toothXrays
  ]);

  // Pagination calculation
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredItems, currentPage]);

  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(totalItems, currentPage * itemsPerPage);

  // Tabs structure grouped by categories
  const tabCategories = [
    {
      title: 'Core Modules',
      items: [
        { id: 'SERVICES', label: 'Services', icon: FileSpreadsheet, count: services.length },
        { id: 'MEDICINES', label: 'Medicines', icon: Heart, count: medicines.length },
        { id: 'CONDITIONS', label: 'Medical Conditions', icon: ShieldAlert, count: conditions.length },
        { id: 'HABITS', label: 'Dental Habits', icon: Smile, count: habits.length },
        { id: 'TAGS', label: 'Tags', icon: Activity, count: tags.length },
        { id: 'PRESCRIPTIONS', label: 'Prescription Templates', icon: FileText, count: prescriptionTemplates.length }
      ]
    },
    {
      title: 'Recall Items',
      items: [
        { id: 'RECALL_APPLIANCES', label: 'Recall Appliance', icon: Shield, count: recallAppliances.length },
        { id: 'RECALL_OCCLUSIONS', label: 'Recall Occlusion', icon: Layers, count: recallOcclusions.length },
        { id: 'PERIODONTAL_SCREENINGS', label: 'Periodontal Screening', icon: Info, count: periodontalScreenings.length },
        { id: 'RECALL_TMDS', label: 'Recall TMD', icon: Sliders, count: recallTmds.length }
      ]
    },
    {
      title: 'Tooth Items',
      items: [
        { id: 'TOOTH_STATUSES', label: 'Tooth Status', icon: Sparkles, count: toothStatuses.length },
        { id: 'TOOTH_CONDITIONS', label: 'Tooth Condition', icon: ShieldAlert, count: toothConditions.length },
        { id: 'TOOTH_PROSTHODONTICS', label: 'Tooth Prosthodontics', icon: Palette, count: toothProsthodontics.length },
        { id: 'TOOTH_SURGERIES', label: 'Tooth Surgery', icon: Scissors, count: toothSurgeries.length },
        { id: 'TOOTH_XRAYS', label: 'Tooth X-Ray', icon: Camera, count: toothXrays.length }
      ]
    },
    {
      title: 'Decision Support Rules',
      items: [
        { id: 'TREATMENT_RULES', label: 'Treatment Rules Manager', icon: Sliders, count: treatmentRules.length }
      ]
    }
  ] as const;

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="bg-zinc-900 text-white p-3 rounded-2xl shadow-xs">
            <Sparkles className="w-5 h-5 text-zinc-100 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 font-display tracking-tight">Master Record Directory</h1>
            <p className="text-xs text-zinc-400 font-medium">Configure and manage clinical definitions, fees, pharmacy parameters, medical lists, and templates.</p>
          </div>
        </div>
      </div>

      {/* QUICK STATUS TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold text-white animate-in fade-in slide-in-from-bottom-5 duration-200 ${
          toast.type === 'success' ? 'bg-zinc-900 border-zinc-800' : 'bg-red-600 border-red-500'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4 text-emerald-400 stroke-[3px]" /> : <AlertTriangle className="w-4 h-4 text-red-200" />}
          {toast.message}
        </div>
      )}

      {/* MASTER DATA GRID CONTROLS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT NAV TABS PANEL */}
        <div className="xl:col-span-3 bg-white border border-zinc-200/80 rounded-2xl p-4 space-y-4 shadow-xs">
          <div className="px-3 pb-2 border-b border-zinc-100">
            <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest">Master Directory</h3>
          </div>
          
          <div className="space-y-4">
            {tabCategories.map((category) => (
              <div key={category.title} className="space-y-1.5">
                <div className="px-3 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                  {category.title}
                </div>
                <div className="space-y-1">
                  {category.items.map((tab) => {
                    const Icon = tab.icon;
                    const isSel = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-left ${
                          isSel 
                            ? 'bg-zinc-900 text-white shadow-xs' 
                            : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{tab.label}</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isSel ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-500'}`}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT DATA MANAGEMENT MODULE */}
        <div className="xl:col-span-9 space-y-4">
          {activeTab === 'TREATMENT_RULES' ? (
            <TreatmentRulesManager onRulesChange={(updatedRules) => setTreatmentRules(updatedRules)} />
          ) : (
            <>
              {/* SEARCH AND CREATE ACTION CARD */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            
            {/* Search Input */}
            <div className="w-full sm:max-w-md relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder={ENTITY_LABELS[activeTab].placeholder}
                value={searchQuery}
                onChange={(e) => handleSearchChange(activeTab, e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => handleSearchChange(activeTab, '')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Context-Aware Create Button */}
            <button
              onClick={openAddModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold px-5 py-3 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer uppercase tracking-wider shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3px]" /> {ENTITY_LABELS[activeTab].button}
            </button>

          </div>

          {/* MAIN DATA TABLE CARD */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto min-h-[360px]">
              <table className="w-full text-left border-collapse">
                
                {/* STICKY HEADER */}
                <thead className="bg-zinc-50 border-b border-zinc-100 sticky top-0 z-10 select-none">
                  
                  {activeTab === 'SERVICES' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Name</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Details</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Default Amount</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center w-28">Auto Add?</th>
                    </tr>
                  )}

                  {activeTab === 'MEDICINES' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Medicine</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Description</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Dosage</th>
                    </tr>
                  )}

                  {activeTab === 'CONDITIONS' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Medical Condition</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  )}

                  {activeTab === 'HABITS' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Habit</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  )}

                  {activeTab === 'TAGS' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Name</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  )}

                  {activeTab === 'PRESCRIPTIONS' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Template Name</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Prescription</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  )}

                  {activeTab === 'RECALL_APPLIANCES' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Recall Appliance</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  )}

                  {activeTab === 'RECALL_OCCLUSIONS' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Recall Occlusion Item</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  )}

                  {activeTab === 'PERIODONTAL_SCREENINGS' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Periodontal Screening Item</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  )}

                  {activeTab === 'RECALL_TMDS' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Recall TMD Item</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  )}

                  {activeTab === 'TOOTH_STATUSES' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Code</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Name</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-32">Color</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  )}

                  {activeTab === 'TOOTH_CONDITIONS' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Code</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Name</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-32">Color</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  )}

                  {activeTab === 'TOOTH_PROSTHODONTICS' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Code</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Name</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  )}

                  {activeTab === 'TOOTH_SURGERIES' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Code</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Name</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  )}

                  {activeTab === 'TOOTH_XRAYS' && (
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Actions</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-16">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider w-24">Code</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Name</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                    </tr>
                  )}

                </thead>

                {/* TABLE BODY */}
                <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-700">
                  
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-zinc-400">
                        <AlertTriangle className="w-8 h-8 mx-auto text-zinc-300 mb-2.5" />
                        <p className="text-xs font-bold text-zinc-400">No definitions found match your criteria.</p>
                        <p className="text-[10px] text-zinc-400">Try checking for typos or clear current filter query parameters.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, index) => {
                      const absoluteIndex = (currentPage - 1) * itemsPerPage + index + 1;
                      return (
                        <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors group">
                          
                          {/* ACTIONS */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 text-zinc-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg cursor-pointer transition-colors"
                                title="Edit Record"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                          {/* ABSOLUTE INDEX NUMBER */}
                          <td className="px-5 py-3.5 text-zinc-400 font-bold">{absoluteIndex}</td>

                          {/* SERVICES FIELDS */}
                          {activeTab === 'SERVICES' && (
                            <>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterService).name}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterService).details || '—'}</td>
                              <td className="px-5 py-3.5 font-bold text-right text-zinc-900">{formatPHP((item as MasterService).defaultAmount)}</td>
                              <td className="px-5 py-3.5 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                  (item as MasterService).autoAdd 
                                    ? 'bg-emerald-50 text-emerald-700' 
                                    : 'bg-zinc-100 text-zinc-400'
                                }`}>
                                  {(item as MasterService).autoAdd ? 'YES' : 'NO'}
                                </span>
                              </td>
                            </>
                          )}

                          {/* MEDICINES FIELDS */}
                          {activeTab === 'MEDICINES' && (
                            <>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterMedicine).name}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterMedicine).description || '—'}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-600">{(item as MasterMedicine).dosage || '—'}</td>
                            </>
                          )}

                          {/* MEDICAL CONDITIONS FIELDS */}
                          {activeTab === 'CONDITIONS' && (
                            <>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterMedicalCondition).name}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterMedicalCondition).remarks || '—'}</td>
                            </>
                          )}

                          {/* DENTAL HABITS FIELDS */}
                          {activeTab === 'HABITS' && (
                            <>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterDentalHabit).name}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterDentalHabit).remarks || '—'}</td>
                            </>
                          )}

                          {/* TAGS FIELDS */}
                          {activeTab === 'TAGS' && (
                            <>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">
                                <span className="px-2 py-1 bg-zinc-100 text-zinc-800 rounded-lg text-[11px] font-bold uppercase tracking-wide">
                                  {(item as MasterTag).name}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterTag).remarks || '—'}</td>
                            </>
                          )}

                          {/* PRESCRIPTION TEMPLATES FIELDS */}
                          {activeTab === 'PRESCRIPTIONS' && (
                            <>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterPrescriptionTemplate).name}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-600">
                                <div className="whitespace-pre-line max-w-sm font-mono text-[11px] leading-relaxed bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 text-zinc-600">
                                  {(item as MasterPrescriptionTemplate).prescription}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterPrescriptionTemplate).remarks || '—'}</td>
                            </>
                          )}

                          {/* RECALL APPLIANCES FIELDS */}
                          {activeTab === 'RECALL_APPLIANCES' && (
                            <>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterRecallAppliance).name}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterRecallAppliance).remarks || '—'}</td>
                            </>
                          )}

                          {/* RECALL OCCLUSIONS FIELDS */}
                          {activeTab === 'RECALL_OCCLUSIONS' && (
                            <>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterRecallOcclusion).name}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterRecallOcclusion).remarks || '—'}</td>
                            </>
                          )}

                          {/* PERIODONTAL SCREENINGS FIELDS */}
                          {activeTab === 'PERIODONTAL_SCREENINGS' && (
                            <>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterPeriodontalScreening).name}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterPeriodontalScreening).remarks || '—'}</td>
                            </>
                          )}

                          {/* RECALL TMDS FIELDS */}
                          {activeTab === 'RECALL_TMDS' && (
                            <>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterRecallTMD).name}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterRecallTMD).remarks || '—'}</td>
                            </>
                          )}

                          {/* TOOTH STATUSES FIELDS */}
                          {activeTab === 'TOOTH_STATUSES' && (
                            <>
                              <td className="px-5 py-3.5 font-mono text-zinc-500 font-bold">{(item as MasterToothStatus).code}</td>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterToothStatus).name}</td>
                              <td className="px-5 py-3.5 text-zinc-600 font-mono">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3.5 h-3.5 rounded-full border border-zinc-200 shrink-0" 
                                    style={{ backgroundColor: (item as MasterToothStatus).color }} 
                                  />
                                  <span>{(item as MasterToothStatus).color}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterToothStatus).remarks || '—'}</td>
                            </>
                          )}

                          {/* TOOTH CONDITIONS FIELDS */}
                          {activeTab === 'TOOTH_CONDITIONS' && (
                            <>
                              <td className="px-5 py-3.5 font-mono text-zinc-500 font-bold">{(item as MasterToothCondition).code}</td>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterToothCondition).name}</td>
                              <td className="px-5 py-3.5 text-zinc-600 font-mono">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3.5 h-3.5 rounded-full border border-zinc-200 shrink-0" 
                                    style={{ backgroundColor: (item as MasterToothCondition).color }} 
                                  />
                                  <span>{(item as MasterToothCondition).color || '#CCCCCC'}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterToothCondition).remarks || '—'}</td>
                            </>
                          )}

                          {/* TOOTH PROSTHODONTICS FIELDS */}
                          {activeTab === 'TOOTH_PROSTHODONTICS' && (
                            <>
                              <td className="px-5 py-3.5 font-mono text-zinc-500 font-bold">{(item as MasterToothProsthodontics).code}</td>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterToothProsthodontics).name}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterToothProsthodontics).remarks || '—'}</td>
                            </>
                          )}

                          {/* TOOTH SURGERIES FIELDS */}
                          {activeTab === 'TOOTH_SURGERIES' && (
                            <>
                              <td className="px-5 py-3.5 font-mono text-zinc-500 font-bold">{(item as MasterToothSurgery).code}</td>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterToothSurgery).name}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterToothSurgery).remarks || '—'}</td>
                            </>
                          )}

                          {/* TOOTH XRAYS FIELDS */}
                          {activeTab === 'TOOTH_XRAYS' && (
                            <>
                              <td className="px-5 py-3.5 font-mono text-zinc-500 font-bold">{(item as MasterToothXray).code}</td>
                              <td className="px-5 py-3.5 font-bold text-zinc-900">{(item as MasterToothXray).name}</td>
                              <td className="px-5 py-3.5 font-medium text-zinc-500 italic">{(item as MasterToothXray).remarks || '—'}</td>
                            </>
                          )}

                        </tr>
                      );
                    })
                  )}

                </tbody>

              </table>
            </div>

            {/* PAGINATION PANEL */}
            {totalItems > 0 && (
              <div className="bg-zinc-50/50 border-t border-zinc-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
                <span className="text-xs text-zinc-400 font-bold">
                  Showing <strong className="text-zinc-700">{rangeStart}–{rangeEnd}</strong> of <strong className="text-zinc-700">{totalItems}</strong> {ENTITY_LABELS[activeTab].plural}
                </span>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  
                  {/* Previous button */}
                  <button
                    onClick={() => handlePageChange(activeTab, Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer font-bold text-xs text-zinc-600"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    const isCurrent = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(activeTab, pageNum)}
                        className={`w-8 h-8 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center ${
                          isCurrent 
                            ? 'bg-zinc-900 text-white shadow-xs' 
                            : 'bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Next button */}
                  <button
                    onClick={() => handlePageChange(activeTab, Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer font-bold text-xs text-zinc-600"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                </div>
              </div>
            )}

          </div>
          </>
          )}
        </div>

      </div>

      {/* CRUD DIALOG / MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-zinc-900 text-white rounded-xl">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-100" />
                </span>
                <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wide">
                  {modalMode === 'ADD' ? ENTITY_LABELS[activeTab].modalAdd : ENTITY_LABELS[activeTab].modalEdit}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              {/* Active Tab Forms */}
              {activeTab === 'SERVICES' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Service/Procedure Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formFields.serviceName}
                      onChange={(e) => setFormFields(prev => ({ ...prev, serviceName: e.target.value }))}
                      placeholder="e.g. Tooth Extraction"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Details/Remarks</label>
                    <input
                      type="text"
                      value={formFields.serviceDetails}
                      onChange={(e) => setFormFields(prev => ({ ...prev, serviceDetails: e.target.value }))}
                      placeholder="e.g. Anterior or Front Teeth only"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Default Amount (₱) <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formFields.serviceAmount}
                        onChange={(e) => setFormFields(prev => ({ ...prev, serviceAmount: e.target.value }))}
                        placeholder="1500.00"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all text-right"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Auto Add to Plan?</label>
                      <div className="h-11 flex items-center">
                        <button
                          type="button"
                          onClick={() => setFormFields(prev => ({ ...prev, serviceAutoAdd: !prev.serviceAutoAdd }))}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                            formFields.serviceAutoAdd 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                              : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                          }`}
                        >
                          <Check className={`w-4 h-4 transition-transform ${formFields.serviceAutoAdd ? 'scale-100' : 'scale-0'}`} />
                          {formFields.serviceAutoAdd ? 'Yes (Auto Add)' : 'No'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'MEDICINES' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Medicine Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formFields.medicineName}
                      onChange={(e) => setFormFields(prev => ({ ...prev, medicineName: e.target.value }))}
                      placeholder="e.g. Amoxicillin Trihydrate 500mg"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Description / Indication</label>
                    <input
                      type="text"
                      value={formFields.medicineDescription}
                      onChange={(e) => setFormFields(prev => ({ ...prev, medicineDescription: e.target.value }))}
                      placeholder="e.g. Broad-spectrum infection treatment"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Dosage instructions</label>
                    <input
                      type="text"
                      value={formFields.medicineDosage}
                      onChange={(e) => setFormFields(prev => ({ ...prev, medicineDosage: e.target.value }))}
                      placeholder="e.g. Take 1 capsule every 8 hours for 7 days"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'CONDITIONS' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Condition Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formFields.conditionName}
                      onChange={(e) => setFormFields(prev => ({ ...prev, conditionName: e.target.value }))}
                      placeholder="e.g. High Blood Pressure"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remarks/Notes</label>
                    <input
                      type="text"
                      value={formFields.conditionRemarks}
                      onChange={(e) => setFormFields(prev => ({ ...prev, conditionRemarks: e.target.value }))}
                      placeholder="Remarks or clinical significance"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'HABITS' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Habit Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formFields.habitName}
                      onChange={(e) => setFormFields(prev => ({ ...prev, habitName: e.target.value }))}
                      placeholder="e.g. Thumb Sucking"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remarks/Notes</label>
                    <input
                      type="text"
                      value={formFields.habitRemarks}
                      onChange={(e) => setFormFields(prev => ({ ...prev, habitRemarks: e.target.value }))}
                      placeholder="Clinical remarks or concerns"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'TAGS' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tag Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formFields.tagName}
                      onChange={(e) => setFormFields(prev => ({ ...prev, tagName: e.target.value }))}
                      placeholder="e.g. Ortho Patient"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remarks/Notes</label>
                    <input
                      type="text"
                      value={formFields.tagRemarks}
                      onChange={(e) => setFormFields(prev => ({ ...prev, tagRemarks: e.target.value }))}
                      placeholder="Special description of the patient category"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'PRESCRIPTIONS' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Template Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formFields.templateName}
                      onChange={(e) => setFormFields(prev => ({ ...prev, templateName: e.target.value }))}
                      placeholder="e.g. Standard Post-Extraction Prescription"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Prescription instructions (Multiline supported) <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      rows={5}
                      value={formFields.templatePrescription}
                      onChange={(e) => setFormFields(prev => ({ ...prev, templatePrescription: e.target.value }))}
                      placeholder="Enter multiline medication guidelines, dosage schedules, and therapy intervals..."
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remarks/Notes</label>
                    <input
                      type="text"
                      value={formFields.templateRemarks}
                      onChange={(e) => setFormFields(prev => ({ ...prev, templateRemarks: e.target.value }))}
                      placeholder="e.g. Give for adult routine tooth extractions"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'RECALL_APPLIANCES' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Appliance Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formFields.recallApplianceName}
                      onChange={(e) => setFormFields(prev => ({ ...prev, recallApplianceName: e.target.value }))}
                      placeholder="e.g. Night Guard"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remarks/Notes</label>
                    <input
                      type="text"
                      value={formFields.recallApplianceRemarks}
                      onChange={(e) => setFormFields(prev => ({ ...prev, recallApplianceRemarks: e.target.value }))}
                      placeholder="e.g. Standard rigid dental nightguard"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'RECALL_OCCLUSIONS' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Occlusion Item Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formFields.recallOcclusionName}
                      onChange={(e) => setFormFields(prev => ({ ...prev, recallOcclusionName: e.target.value }))}
                      placeholder="e.g. Class I Malocclusion"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remarks/Notes</label>
                    <input
                      type="text"
                      value={formFields.recallOcclusionRemarks}
                      onChange={(e) => setFormFields(prev => ({ ...prev, recallOcclusionRemarks: e.target.value }))}
                      placeholder="e.g. Description of occlusion condition"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'PERIODONTAL_SCREENINGS' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Periodontal Screening Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formFields.periodontalScreeningName}
                      onChange={(e) => setFormFields(prev => ({ ...prev, periodontalScreeningName: e.target.value }))}
                      placeholder="e.g. PSR Code 2"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remarks/Notes</label>
                    <input
                      type="text"
                      value={formFields.periodontalScreeningRemarks}
                      onChange={(e) => setFormFields(prev => ({ ...prev, periodontalScreeningRemarks: e.target.value }))}
                      placeholder="e.g. Subgingival calculus present, defective margins"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'RECALL_TMDS' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Recall TMD Item Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formFields.recallTmdName}
                      onChange={(e) => setFormFields(prev => ({ ...prev, recallTmdName: e.target.value }))}
                      placeholder="e.g. Clicking Joint Sounds"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remarks/Notes</label>
                    <input
                      type="text"
                      value={formFields.recallTmdRemarks}
                      onChange={(e) => setFormFields(prev => ({ ...prev, recallTmdRemarks: e.target.value }))}
                      placeholder="e.g. Noticed during opening and chewing"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'TOOTH_STATUSES' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Status Code <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formFields.toothStatusCode}
                        onChange={(e) => setFormFields(prev => ({ ...prev, toothStatusCode: e.target.value }))}
                        placeholder="e.g. S"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all uppercase text-center"
                      />
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Status Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formFields.toothStatusName}
                        onChange={(e) => setFormFields(prev => ({ ...prev, toothStatusName: e.target.value }))}
                        placeholder="e.g. Sound/Healthy"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Status Color Representation</label>
                    <div className="flex items-center gap-3 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                      <input
                        type="color"
                        value={formFields.toothStatusColor}
                        onChange={(e) => setFormFields(prev => ({ ...prev, toothStatusColor: e.target.value }))}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
                      />
                      <div>
                        <input
                          type="text"
                          value={formFields.toothStatusColor}
                          onChange={(e) => setFormFields(prev => ({ ...prev, toothStatusColor: e.target.value }))}
                          placeholder="#FF0000"
                          className="w-24 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-mono font-bold text-center"
                        />
                      </div>
                      <span className="text-[11px] text-zinc-400 font-medium">Color code used to render this status on odontogram maps.</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remarks/Notes</label>
                    <input
                      type="text"
                      value={formFields.toothStatusRemarks}
                      onChange={(e) => setFormFields(prev => ({ ...prev, toothStatusRemarks: e.target.value }))}
                      placeholder="e.g. Indicated for pristine fully erupted healthy teeth"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'TOOTH_CONDITIONS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Condition Code <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formFields.toothConditionCode}
                        onChange={(e) => setFormFields(prev => ({ ...prev, toothConditionCode: e.target.value }))}
                        placeholder="e.g. CAR"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all uppercase text-center"
                      />
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Condition Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formFields.toothConditionName}
                        onChange={(e) => setFormFields(prev => ({ ...prev, toothConditionName: e.target.value }))}
                        placeholder="e.g. Dental Caries (Decay)"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Condition Color Representation</label>
                    <div className="flex items-center gap-3 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                      <input
                        type="color"
                        value={formFields.toothConditionColor}
                        onChange={(e) => setFormFields(prev => ({ ...prev, toothConditionColor: e.target.value }))}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
                      />
                      <div>
                        <input
                          type="text"
                          value={formFields.toothConditionColor}
                          onChange={(e) => setFormFields(prev => ({ ...prev, toothConditionColor: e.target.value }))}
                          placeholder="#CCCCCC"
                          className="w-24 px-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-mono font-bold text-center"
                        />
                      </div>
                      <span className="text-[11px] text-zinc-400 font-medium">Color code used to render this condition on odontogram maps.</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remarks/Notes</label>
                    <input
                      type="text"
                      value={formFields.toothConditionRemarks}
                      onChange={(e) => setFormFields(prev => ({ ...prev, toothConditionRemarks: e.target.value }))}
                      placeholder="e.g. Cavitation or active carious lesion"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'TOOTH_PROSTHODONTICS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Prosthetics Code <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formFields.toothProsthodonticsCode}
                        onChange={(e) => setFormFields(prev => ({ ...prev, toothProsthodonticsCode: e.target.value }))}
                        placeholder="e.g. FPD"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all uppercase text-center"
                      />
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Prosthetic Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formFields.toothProsthodonticsName}
                        onChange={(e) => setFormFields(prev => ({ ...prev, toothProsthodonticsName: e.target.value }))}
                        placeholder="e.g. Fixed Partial Denture"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remarks/Notes</label>
                    <input
                      type="text"
                      value={formFields.toothProsthodonticsRemarks}
                      onChange={(e) => setFormFields(prev => ({ ...prev, toothProsthodonticsRemarks: e.target.value }))}
                      placeholder="e.g. Bridges, crowns, or dentures"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'TOOTH_SURGERIES' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Surgery Code <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formFields.toothSurgeryCode}
                        onChange={(e) => setFormFields(prev => ({ ...prev, toothSurgeryCode: e.target.value }))}
                        placeholder="e.g. SUR"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all uppercase text-center"
                      />
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Surgery Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formFields.toothSurgeryName}
                        onChange={(e) => setFormFields(prev => ({ ...prev, toothSurgeryName: e.target.value }))}
                        placeholder="e.g. Surgical Extraction"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remarks/Notes</label>
                    <input
                      type="text"
                      value={formFields.toothSurgeryRemarks}
                      onChange={(e) => setFormFields(prev => ({ ...prev, toothSurgeryRemarks: e.target.value }))}
                      placeholder="e.g. Operative tooth extraction with osteotomy"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'TOOTH_XRAYS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">X-Ray Code <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formFields.toothXrayCode}
                        onChange={(e) => setFormFields(prev => ({ ...prev, toothXrayCode: e.target.value }))}
                        placeholder="e.g. PA"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all uppercase text-center"
                      />
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">X-Ray Type <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formFields.toothXrayName}
                        onChange={(e) => setFormFields(prev => ({ ...prev, toothXrayName: e.target.value }))}
                        placeholder="e.g. Periapical Radiograph"
                        className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Remarks/Notes</label>
                    <input
                      type="text"
                      value={formFields.toothXrayRemarks}
                      onChange={(e) => setFormFields(prev => ({ ...prev, toothXrayRemarks: e.target.value }))}
                      placeholder="e.g. Single tooth root-and-crown assessment"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 bg-white hover:bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-850 rounded-xl cursor-pointer shadow-xs hover:shadow-md transition-all uppercase tracking-wider"
                >
                  {modalMode === 'ADD' ? 'Save Record' : 'Save Changes'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-xs border border-red-100">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-zinc-900 uppercase tracking-tight">
                  {ENTITY_LABELS[activeTab].modalDelete}
                </h4>
                <p className="text-xs text-zinc-400 font-medium">Are you sure you want to permanently delete this {ENTITY_LABELS[activeTab].single.toLowerCase()}? This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-zinc-50/50 px-5 py-3 border-t border-zinc-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer"
              >
                No, Keep It
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer shadow-xs"
              >
                Yes, Delete
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
