import React, { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  FileText, LayoutTemplate, Settings, Printer, Edit3,
  GripVertical, Image as ImageIcon, Eye, EyeOff, Download, Loader2,
  ArrowUp, ArrowDown, Camera, Upload, Lock, Unlock, Save, RotateCcw, Activity, ClipboardList, Plus, Trash2, Menu, ChevronDown, ChevronRight, Archive, ArrowLeft, Search, Bell, User, MessageSquare
} from 'lucide-react';
import { isSupabaseConfigured, supabaseConfigError, supabaseHost } from './supabase';
import { createAppointment, deleteAppointment, getAppointments, type Appointment } from './src/services/appointmentService';
import { createEmptyDentalChartData, getDentalChartByPatientId, saveDentalChart } from './src/services/dentalChartService';
import { archivePatientRecord as archivePatientRecordService, loadActivePatientRecords, loadArchivedPatientRecords, loadPatientRecord, restorePatientRecord as restorePatientRecordService, savePatientRecord } from './src/services/patientService';
import { loadDoctorsRegistry as loadDoctorsRegistryService, loadTemplateSettings as loadTemplateSettingsService, saveDoctorsRegistry as saveDoctorsRegistryService, saveTemplateSettings as saveTemplateSettingsService } from './src/services/settingsService';
import { PatientDetailsWorkspace } from './src/components/PatientDetailsWorkspace';
import { SmartSupportModule } from './src/components/SmartSupportModule';
import LedgerModule from './src/components/LedgerModule';
import { UploadsModule } from './src/components/UploadsModule';
import { RecallsModule } from './src/components/RecallsModule';
import { ScratchpadModule } from './src/components/ScratchpadModule';
import { FollowupModule } from './src/components/FollowupModule';
import ProgressNotesModule from './src/components/ProgressNotesModule';
import { TreatmentRecordsModule } from './src/components/TreatmentRecordsModule';

declare global {
  interface Window {
    html2pdf?: () => {
      set: (options: unknown) => {
        from: (element: HTMLElement) => {
          save: () => Promise<void>;
        };
      };
    };
  }
}

// --- CONSTANTS & DATA STRUCTURES ---
const MEDICAL_QUESTIONS = [
  { id: 'q1', text: 'Are you in good condition?' },
  { id: 'q2', text: 'Are you under medical treatment now?' },
  { id: 'q3', text: 'Have you ever had serious illness or surgical operation?' },
  { id: 'q4', text: 'Have you ever been hospitalized?' },
  { id: 'q5', text: 'Are you taking any prescription / non-prescription medication?' },
  { id: 'q6', text: 'Do you use tobacco products?' },
  { id: 'q7', text: 'Do you use alcohol, cocaine or other dangerous drugs?' }
];

const CONDITIONS = [
  'High Blood Pressure', 'Heart Disease', 'Cancer / Tumors',
  'Low Blood Pressure', 'Heart Murmur', 'Anemia',
  'Epilepsy / Convulsion', 'Hepatitis / Liver Disease', 'Angina',
  'AIDS or HIV Infection', 'Rheumatic Fever', 'Asthma',
  'Sexually Transmitted Disease', 'Hay Fever / Allergies', 'Emphysema',
  'Stomach Troubles / Ulcers', 'Respiratory Problems', 'Bleeding Problems',
  'Fainting Seizure', 'Hepatitis / Jaundice', 'Blood Disease',
  'Rapid Weight Loss', 'Tuberculosis', 'Head Injuries',
  'Radiation Therapy', 'Swollen Ankles', 'Arthritis / Rheumatism',
  'Joint Replacement / Implant', 'Kidney Disease', 'Thyroid Problem',
  'Heart Surgery', 'Chest Pain', 'Diabetes',
  'Heart Attack', 'Stroke', 'Others'
];

const SECTIONS = [
  { id: 'personal', title: 'Patient Information Record' },
  { id: 'referral', title: 'Minor / Referral Details' },
  { id: 'dentalHistory', title: 'Dental History' },
  { id: 'medicalHistory', title: 'Medical History' },
  { id: 'questions', title: 'Medical Questions' },
  { id: 'allergies', title: 'Allergies' },
  { id: 'healthDetails', title: 'Health Details' },
  { id: 'womenOnly', title: 'For Women Only' },
  { id: 'conditions', title: 'Medical Conditions Checklist' },
  { id: 'signature', title: 'Signature & Consent' }
];

const HEADER_ITEMS = [
  { id: 'left', label: 'Left Image (Circle)' },
  { id: 'middle', label: 'Clinic Info & Logo' },
  { id: 'right', label: 'Right Photo (2x2)' }
];

const PATIENT_WORKFLOW_TABS = [
  { id: 'progress_notes', label: 'Progress Notes' },
  { id: 'treatment_records', label: 'Treatment Records' },
  { id: 'charting', label: 'Dental Charts' },
  { id: 'prescriptions', label: 'Prescriptions' },
  { id: 'ledger', label: 'Bills & Payments' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'uploads', label: 'Uploads / X-Rays' },
  { id: 'recalls', label: 'Dental Recalls' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'scratchpad', label: 'Scratchpad Notes' },
  { id: 'followup', label: 'Follow Up Lists' },
  { id: 'smart_support', label: 'Smart Support' },
  { id: 'form', label: 'Patient Info' }
] as const;

const PRIMARY_PATIENT_WORKFLOW_TABS = PATIENT_WORKFLOW_TABS.slice(0, 6);
const OVERFLOW_PATIENT_WORKFLOW_TABS = PATIENT_WORKFLOW_TABS.slice(6);
const PATIENT_WORKFLOW_TAB_IDS = PATIENT_WORKFLOW_TABS.map((tab) => tab.id);

type DocumentFormType = 'certificate' | 'consent';
type SystemSettingsTab = 'general' | 'doctors' | 'pdf' | 'certificateForm' | 'consentForm';
type ExportMode = 'record' | DocumentFormType | 'contract';

const DOCUMENT_FORM_CONFIG: Record<DocumentFormType, { prefix: string; label: string; fileSuffix: string; description: string }> = {
  certificate: {
    prefix: 'certificateForm',
    label: 'Certificate Form',
    fileSuffix: 'CertificateForm',
    description: 'Brand and spacing settings for the printable dental certificate.',
  },
  consent: {
    prefix: 'consentForm',
    label: 'Consent Form',
    fileSuffix: 'ConsentForm',
    description: 'Brand and spacing settings for the printable oral surgery consent form.',
  },
};

// DENTAL CHART CONSTANTS
const TEMP_UPPER_RIGHT = [55, 54, 53, 52, 51];
const TEMP_UPPER_LEFT = [61, 62, 63, 64, 65];
const PERM_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const PERM_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const PERM_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const PERM_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
const TEMP_LOWER_RIGHT = [85, 84, 83, 82, 81];
const TEMP_LOWER_LEFT = [71, 72, 73, 74, 75];

const CHART_LEGENDS = {
  condition: [
    { code: 'D', label: 'Decayed (Caries Indicated for Filling)' },
    { code: 'M', label: 'Missing due to Caries' },
    { code: 'F', label: 'Filled' },
    { code: 'I', label: 'Caries Indicated for Extraction' },
    { code: 'RF', label: 'Root Fragment' },
    { code: 'MO', label: 'Missing due to Other Causes' },
    { code: 'IM', label: 'Impacted Tooth' }
  ],
  restoration: [
    { code: 'J', label: 'Jacket Crown' },
    { code: 'A', label: 'Amalgam Filling' },
    { code: 'AB', label: 'Abutment' },
    { code: 'P', label: 'Pontic' },
    { code: 'In', label: 'Inlay' },
    { code: 'FX', label: 'Fixed Cure Composite' },
    { code: 'Rm', label: 'Removable Denture' }
  ],
  surgery: [
    { code: 'X', label: 'Extraction due to Caries' },
    { code: 'XO', label: 'Extraction due to Other Causes' },
    { code: '✓', label: 'Present Teeth' },
    { code: 'Cm', label: 'Congenitally Missing' },
    { code: 'Sp', label: 'Supernumerary' }
  ]
};

const DENTAL_CHART_ROWS = [
  { index: 0, label: 'Upper Arc (Primary)', layout: 'top', teeth: [null, null, null, '55', '54', '53', '52', '51', '61', '62', '63', '64', '65', null, null, null] },
  { index: 1, label: 'Upper Arc (Permanent)', layout: 'top', teeth: ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'] },
  { index: 2, label: 'Lower Arc (Permanent)', layout: 'bottom', teeth: ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'] },
  { index: 3, label: 'Lower Arc (Primary)', layout: 'bottom', teeth: [null, null, null, '85', '84', '83', '82', '81', '71', '72', '73', '74', '75', null, null, null] },
] as const;

const DENTAL_CHART_PROCEDURES = {
  Conditions: ['/', 'M', 'MO', 'IM', 'SP', 'RF', 'UN', 'PT', 'D', 'RCT'],
  'Restoration & Prosthodontics': ['MC', 'PJ', 'AM', 'LCF', 'PORJC', 'AB', 'ATT', 'P', 'IC', 'IMP', 'S', 'RM', 'GI', 'V', 'TF'],
  Surgery: ['X', 'XO'],
  Xray: ['PANO', 'CEPHA', 'OCC', 'PERI'],
};

const DENTAL_CHART_LEGEND_GUIDE = [
  {
    title: 'Condition',
    items: [
      { code: 'D', meaning: 'Decayed (Caries Indicated for Filling)' },
      { code: 'M', meaning: 'Missing due to Caries' },
      { code: 'F', meaning: 'Filled' },
      { code: 'I', meaning: 'Caries Indicated for Extraction' },
      { code: 'RF', meaning: 'Root Fragment' },
      { code: 'MO', meaning: 'Missing due to Other Causes' },
      { code: 'IM', meaning: 'Impacted Tooth' },
      { code: 'UN', meaning: 'Unerupted' },
      { code: '/', meaning: 'Present Teeth' },
      { code: 'PT', meaning: 'Pulpless Tooth' },
    ],
  },
  {
    title: 'Restoration & Prosthetics',
    items: [
      { code: 'Jacket Crown', meaning: 'Jacket Crown' },
      { code: 'A', meaning: 'Amalgam Filling' },
      { code: 'AB', meaning: 'Abutment' },
      { code: 'P', meaning: 'Pontic' },
      { code: 'Inlay', meaning: 'Inlay' },
      { code: 'FX', meaning: 'Fixed Cure Composite' },
      { code: 'RM', meaning: 'Removable Composite' },
    ],
  },
  {
    title: 'Surgery',
    items: [
      { code: 'X', meaning: 'Extraction due to Caries' },
      { code: 'XO', meaning: 'Extraction due to Other Causes' },
      { code: 'C', meaning: 'Present Teeth' },
      { code: 'Sp', meaning: 'Supernumerary Missing' },
    ],
  },
] as const;

const TOOTH_CATEGORY_FIELD_MAP = {
  Conditions: 'conditions',
  'Restoration & Prosthodontics': 'restorations',
  Surgery: 'surgery',
  Xray: 'xray',
} as const;

const SURFACE_COLORS = {
  cavity: '#ef4444',
  pasta: '#3b82f6',
  null: '#ffffff',
} as const;

const DENTAL_RECORD_LEGEND_COLUMNS = [
  {
    title: 'Condition',
    items: [
      { code: '/', label: 'Present Teeth' },
      { code: 'D', label: 'Decayed (Caries Indicated for Filling)' },
      { code: 'M', label: 'Missing Due to Caries' },
      { code: 'MO', label: 'Missing due to Other Causes' },
      { code: 'Im', label: 'Impacted Teeth' },
      { code: 'Sp', label: 'Supernumerary Tooth' },
      { code: 'Rf', label: 'Root Fragment' },
      { code: 'Un', label: 'Unerupted' },
    ],
  },
  {
    title: 'Restorations & Prosthetics',
    items: [
      { code: 'Am', label: 'Amalgam Filling' },
      { code: 'Co', label: 'Composite Filling' },
      { code: 'JC', label: 'Jacket Crown' },
      { code: 'Ab', label: 'Abutment' },
      { code: 'Att', label: 'Attachment' },
      { code: 'P', label: 'Pontic' },
      { code: 'In', label: 'Inlay' },
      { code: 'Imp', label: 'Implant' },
      { code: 'S', label: 'Sealants' },
      { code: 'Rm', label: 'Removal Denture' },
    ],
  },
  {
    title: 'Surgery',
    items: [
      { code: 'X', label: 'Extraction Due to Caries' },
      { code: 'XO', label: 'Extraction Due to Other Causes' },
    ],
  },
] as const;

const DENTAL_RECORD_RECOMMENDATIONS = [
  { key: 'oralProphylaxis', label: 'ORAL PROPHYLAXIS' },
  { key: 'prosthodonticsManagement', label: 'PROSTHODONTICS MANAGEMENT' },
  { key: 'rootCanalTreatment', label: 'ROOT CANAL TREATMENT (RCT)' },
  { key: 'others', label: 'OTHERS' },
] as const;

const DENTAL_RECORD_REMARK_OPTIONS = [
  { value: 'dentallyFit', label: 'DENTALLY FIT' },
  { value: 'forCompliance', label: 'FOR COMPLIANCE' },
] as const;

const ALL_DENTAL_CHART_TOOTH_IDS = DENTAL_CHART_ROWS.flatMap((row) => row.teeth).filter(Boolean) as string[];

const DEFAULT_SETTINGS = {
  clinicName: 'P & J  T A N A R T E', showClinicName: true,
  clinicAddress: 'BAYAN LUMA IV IMUS CAVITE', showAddress: true,
  clinicContact: '0953 834 3062', showContact: true,
  recordBadgeText: 'PATIENT RECORD', showRecordBadge: true,
  recordBadgeMarginTop: 8, recordBadgeMarginBottom: 8,
  leftImage: null, showLeftImage: true, leftImageSize: 65, leftImageOutline: true,
  middleImage: null, showMiddleImage: false, middleImageSize: 50,
  rightImage: null, showRightImage: true, rightImageFit: 'cover', rightImagePositionX: 50, rightImagePositionY: 50,
  headerMarginBottom: 8,
  leftImageMarginTop: 0, leftImageMarginBottom: 0, leftImageMarginLeft: 0, leftImageMarginRight: 0,
  middleMarginTop: 0, middleMarginBottom: 0, middleMarginLeft: 16, middleMarginRight: 16,
  rightImageMarginTop: 0, rightImageMarginBottom: 0, rightImageMarginLeft: 0, rightImageMarginRight: 0,
  headerOrder: ['left', 'middle', 'right'],
  sectionOrder: SECTIONS.map(s => s.id),
  visibility: SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: true }), {}),
  fontSize: 'Medium', labelSize: 'Medium', lineSpacing: 'Normal',
  borderStyle: 'border-black', underlineStyle: 'Solid', sectionSeparator: 'None', overflowBehavior: 'Truncate', density: 'Compact',

  printPatientForm: true, printDentalChart: true, printTreatmentRecord: true,
  chartTitle: 'DENTAL CHART', showChartTitle: false,
  showChartLegend: true, showChartFindings: true, showChartRecommendation: true, showChartFooter: true,

  treatmentTitle: 'TREATMENT RECORD', showTreatmentTitle: true,
  showDentistColumn: true, showBalanceColumn: true, treatmentRowHeight: 'Compact',

  // DENTIST PROFILE SETTINGS
  defaultDentistId: '',
  defaultDentistName: '',
  defaultDentistRole: 'Attending Dentist',
  defaultDentistSignature: null,

  showDentistNameInPatientRecord: false,
  showSignatureInPatientRecord: false,

  showDentistNameInDentalChart: true,
  showSignatureInDentalChart: false,

  showDentistNameInTreatmentRecord: true,
  showSignatureInTreatmentRecord: false,

  dentistSignatureSize: 100,
  dentistSignaturePlacement: 'right',

  // CERTIFICATE FORM DESIGNER SETTINGS
  certificateFormLogo: null,
  certificateFormShowLogo: true,
  certificateFormLogoOutline: false,
  certificateFormPageOutline: false,
  certificateFormLogoSize: 96,
  certificateFormLogoGap: 18,
  certificateFormPagePaddingTop: 54,
  certificateFormPagePaddingRight: 58,
  certificateFormPagePaddingBottom: 54,
  certificateFormPagePaddingLeft: 58,

  // CONSENT FORM DESIGNER SETTINGS
  consentFormLogo: null,
  consentFormShowLogo: true,
  consentFormLogoOutline: false,
  consentFormPageOutline: false,
  consentFormLogoSize: 84,
  consentFormLogoGap: 14,
  consentFormPagePaddingTop: 44,
  consentFormPagePaddingRight: 44,
  consentFormPagePaddingBottom: 44,
  consentFormPagePaddingLeft: 44,
};

const generateEmptyTreatmentRow = () => ({ id: crypto.randomUUID(), date: '', toothNumbers: '', procedure: '', dentist: '', amountCharged: '', amountPaid: '', balance: '' });

const DEFAULT_FAVORITE_STATUSES = ['âœ“', 'D', 'M', 'F', 'X', 'Cm'];

const DEFAULT_DOCTORS: Array<{ id: string; name: string; role: string; signature: string | null }> = [];

const createDefaultCertificateDocument = () => ({
  date: new Date().toISOString().split('T')[0],
  patientName: '',
  age: '',
  diagnosis: '',
  recommendation: '',
  dentistName: 'Maria Jessica David - Tanarte, DMD',
  licenseNo: '0052369',
});

const createDefaultConsentDocument = () => ({
  date: new Date().toISOString().split('T')[0],
  patientName: '',
  birthDate: '',
  age: '',
  status: '',
  doctorName: '',
  otherDentists: '',
  procedure: '',
  procedureType: '',
  medicalHistory: {},
  allergies: {},
  medications: '',
  physicianTreatment: '',
  previousExtraction: '',
  otherRisk: '',
  anesthesiaConsent: false,
});

const createEmptyContractPackageRow = () => ({
  id: crypto.randomUUID(),
  date: '',
  amountCharged: '',
  amountPaid: '',
  remarks: '',
  signature: '',
});

const createDefaultPatientContractDocument = () => ({
  patientName: '',
  age: '',
  address: '',
  mobileNo: '',
  birthDate: '',
  acknowledgementName: '',
  acknowledgementAddress: '',
  acknowledgementAge: '',
  dentistName: 'Maria Jessica David - Tanarte, DMD',
  associateDentistRole: 'Associate Dentist',
  orthodonticPackage: '',
  downPaymentTerms: ['', '', '', '', ''],
  balanceTerms: '',
  packageRows: Array.from({ length: 14 }, createEmptyContractPackageRow),
});

const ORTHO_CONTRACT_FEES = [
  'The Orthodontic Treatment Package (OTP) shall be determined by the dentist or orthodontist or doctor. Prices may vary due to the nature of each patient case.',
  'Cost of Orthodontic Treatment Package: Initial Down Payment, Monthly Installment, and Estimated Duration of Treatment.',
  'The Orthodontic Treatment Package will include all cost of the material needed for the patient case, dentist or orthodontist or doctor professional fees and all other expenses, fees and charges necessary for or incidental to the specific treatment.',
  'All minor patients must have written consent form from the parents or guardians before the treatment commences.',
  'Payment of the Orthodontic Treatment Package fees shall be made on a monthly basis. If a patient fails to pay on the specific monthly visit, it is understood that such payment must be settled on the patient next visit.',
  'Prices/Cost shall be kept confidential at all times, even after the termination of the doctor-patient relationship.',
  'The Orthodontic Treatment Package fees should be settled upon completion of the treatment.',
];

const ORTHO_CONTRACT_INCLUSIONS = [
  'Oral prophylaxis (cleaning) every dental check-up during the orthodontic treatment.',
  'A minimum of two (2) restorations or tooth filling of tooth caries present during the time of consultation. However, extensive or deep restorations and other teeth that have carious lesions must be charged accordingly.',
];

const ORTHO_CONTRACT_NON_INCLUSIONS = [
  'Serial extractions needed for the treatment',
  'Odontectomy (surgical removal of impacted teeth) and extraction of 3rd molars (wisdom teeth)',
  'Frenectomy',
  'Temporary Anchorage Device (TADS)',
  'Splints',
  'Temporary Dentures',
  'Panoramic and Cephalometric X-rays',
  'Fixed Porcelain or Plastic Crowns',
  'Root Canal Treatment (RCT)',
  'Gingivectomy',
  'Retainers after treatment. This is due to the unpredictable cost of manufacturing of retainers; however, if a patient refers to a person for possible orthodontic treatment commences, it shall be converted into points and thus deducted from the total cost of the retainers of the patients who referred the individual.',
  'Painless anaesthesia for any root canal treatment, periodontal and other surgery procedures and tooth extraction.',
];

const ORTHO_CONTRACT_TERMS = [
  'The clinic follows a strict rule of "FIRST COME, FIRST SERVE WITH APPOINTMENT" rules. Clinic only accepts patients on an appointment basis.',
  'The clinic strictly follows the CHART TIME RULE. This is determined based on how many times the patient comes in for the treatment; the clinic does not use CALENDAR TIME in determining treatment duration.',
  'Six (6) months or more of non-appearance and treatment, despite repetitive reminders from the clinic staff, entitles the clinic to automatically put the patient case in our dormant file. No notices will be sent afterwards. No paid fees shall be refunded.',
  'The clinic reserves the right not to accept delinquent patients of six (6) months or more. No paid fees shall be refunded.',
  'The patient must advise the dentist/orthodontist/doctor of any temporary cessation of treatment due to illness, pregnancy and/or any other health conditions prior to the next scheduled appointment/treatment. Failure to notify and to keep the appointment shall result in an additional 10% of cost package, which shall be collected upon resumption of treatment.',
  'However, if a patient notifies the clinic of the above mentioned circumstances, treatment and payment of fees will resume. No additional fees shall be collected.',
  'In all cases of the above mentioned, the dentist/orthodontist/doctor WILL NOT BE HELD LIABLE FOR WHATEVER CONSEQUENCES THAT MAY ARISE DUE TO NON-APPEARANCE OF THE PATIENT FOR TREATMENT.',
  'There shall be NO REFUND OF FEES that are already paid for.',
  'There shall be NO REFUND OF FEES for patients who wish to pre-terminate treatment and contract for whatever reason. Patient shall have to pay the running cost incurred by the dentist/orthodontist/doctor at the time of pre-termination.',
  'No release of diagnostic aids (panoramic, periapical, cephalometric radiograph), working and study casts and patient chart during and after the treatment.',
  'The clinic and/or dentist/orthodontist/doctor reserve the right to refuse treatment to an individual who is unruly in behavior and to pre-terminate contract if the patient is proven to be uncooperative.',
  'The clinic only accepts referral from current or previous patients.',
  'If the patient intends to leave for another country or migrates while still undergoing treatment, the patient shall advise the dentist/orthodontist/doctor of his/her intentions and make arrangements with the clinic. No records shall be released except for the patient profile.',
  'The dentist/orthodontist/doctor shall not be liable for relapse of any dental condition, whether or not covered by the OTP, for which the patient has sought any treatment.',
  'Lost, misplaced, or damaged brackets, buccal tubes, and molar bands shall be charged to patient: repaste - PHP 200/each; replacement - PHP 500/each.',
  'Patients who wish to have their appliance removed temporarily for an occasion will be charged with a minimum fee for removal and reinstallation. The dentist/orthodontist/doctor DO NOT use same appliance for reinstallation.',
];

const ORAL_SURGERY_HISTORY_COLUMNS = [
  ['High Blood Pressure', 'A Heart Condition', 'Rheumatic Fever', 'Venereal Disease', 'Kidney Disease', 'Fainting History', 'Thyroid Disease', 'Liver Disease', 'Rheumatism'],
  ['Asthma', 'Anemia', 'Diabetes', 'Hepatitis', 'Epilepsy', 'Arthritis', 'Allergies', 'Tonsillitis', 'Glaucoma'],
  ['Hay Fever', 'Tuberculosis', 'Stomach Ulcer', 'Sinus Problem', 'Clotting Disorder', 'Nervous Disorder', 'Bleeding Disorder', 'Enlarged Adenoids'],
] as const;

const ORAL_SURGERY_ALLERGY_ITEMS = ['Penicillin', 'Other Antibiotics', 'Local Anesthesia', 'Others'] as const;

const createInitialPatientData = () => ({
  patientPhoto: '', lastName: '', firstName: '', middleName: '', nickname: '',
  birthDate: '', age: '', sex: '', religion: '', nationality: '', civilStatus: '',
  address: '', contact: '', parentGuardian: '', referral: '', company: '', occupation: '', officeContact: '',
  dentalInsurance: '', effectiveDate: '', fax: '', mobile: '', email: '',
  dentalReason: '', previousDentist: '', lastVisit: '', physicianName: '', physicianSpecialty: '', physicianContact: '', physicianAddress: '',
  questions: {}, questionDetails: {}, bloodType: '', bloodPressure: '',
  allergies: { penicillin: false, latex: false, aspirin: false, sulfa: false, others: '' },
  womenOnly: { pregnant: false, nursing: false, birthControl: false }, conditions: {},
  signatureName: '', signatureDate: new Date().toISOString().split('T')[0],
  dentalChart: createEmptyDentalChartData(),
  treatmentRecords: [],
  progressNotes: [],
  bills: [],
  prescriptions: [],
  certificateDocument: createDefaultCertificateDocument(),
  consentDocument: createDefaultConsentDocument(),
  patientContractDocument: createDefaultPatientContractDocument(),
  certificates: [],
  attachments: [],
  notes: [],
  consents: [],
  appointments: [],
  recalls: [],
  followups: []
});

const createDefaultToothChartEntry = (toothId: string) => ({
  toothId,
  surfaces: { top: null, left: null, right: null, bottom: null, center: null },
  summary: '',
  conditions: [] as string[],
  restorations: [] as string[],
  surgery: [] as string[],
  xray: [] as string[],
});

const mapLegacyChartCodeToEntry = (toothId: string, legacyCode: string) => {
  const entry = createDefaultToothChartEntry(toothId);
  if (!legacyCode) return entry;

  if (DENTAL_CHART_PROCEDURES.Conditions.includes(legacyCode)) {
    entry.conditions = [legacyCode];
  } else if (DENTAL_CHART_PROCEDURES['Restoration & Prosthodontics'].includes(legacyCode)) {
    entry.restorations = [legacyCode];
  } else if (DENTAL_CHART_PROCEDURES.Surgery.includes(legacyCode)) {
    entry.surgery = [legacyCode];
  } else if (DENTAL_CHART_PROCEDURES.Xray.includes(legacyCode)) {
    entry.xray = [legacyCode];
  } else {
    entry.summary = legacyCode;
  }

  return entry;
};

const normalizeToothChartEntry = (toothId: string, rawEntry: any) => {
  if (!rawEntry) return createDefaultToothChartEntry(toothId);
  if (typeof rawEntry === 'string') return mapLegacyChartCodeToEntry(toothId, rawEntry);

  const base = createDefaultToothChartEntry(toothId);
  return {
    ...base,
    ...rawEntry,
    surfaces: { ...base.surfaces, ...(rawEntry?.surfaces || {}) },
    conditions: Array.isArray(rawEntry?.conditions) ? rawEntry.conditions : [],
    restorations: Array.isArray(rawEntry?.restorations) ? rawEntry.restorations : [],
    surgery: Array.isArray(rawEntry?.surgery) ? rawEntry.surgery : [],
    xray: Array.isArray(rawEntry?.xray) ? rawEntry.xray : [],
  };
};

const normalizeDentalChartTeeth = (rawTeeth: any) => {
  const normalized: Record<string, any> = {};
  ALL_DENTAL_CHART_TOOTH_IDS.forEach((toothId) => {
    normalized[toothId] = normalizeToothChartEntry(toothId, rawTeeth?.[toothId]);
  });
  return normalized;
};

const mergeDentalChartData = (snapshot: any) => {
  const defaults = createEmptyDentalChartData();
  return {
    ...defaults,
    ...(snapshot || {}),
    teeth: normalizeDentalChartTeeth(snapshot?.teeth),
    periodontal: { ...defaults.periodontal, ...(snapshot?.periodontal || {}) },
    occlusion: { ...defaults.occlusion, ...(snapshot?.occlusion || {}) },
    appliances: { ...defaults.appliances, ...(snapshot?.appliances || {}) },
    tmd: { ...defaults.tmd, ...(snapshot?.tmd || {}) },
    recommendationPlan: { ...defaults.recommendationPlan, ...(snapshot?.recommendationPlan || {}) },
    xrayTaken: { ...defaults.xrayTaken, ...(snapshot?.xrayTaken || {}) },
    remarks: { ...defaults.remarks, ...(snapshot?.remarks || {}) },
  };
};

const mergePatientContractDocument = (snapshot: any) => {
  const defaults = createDefaultPatientContractDocument();
  const rawRows = Array.isArray(snapshot?.packageRows) ? snapshot.packageRows : [];
  const mergedRows = rawRows.map((row: any) => ({
    ...createEmptyContractPackageRow(),
    ...(row || {}),
    id: row?.id || crypto.randomUUID(),
  }));

  return {
    ...defaults,
    ...(snapshot || {}),
    downPaymentTerms: Array.from({ length: 5 }, (_, index) => snapshot?.downPaymentTerms?.[index] || ''),
    packageRows: mergedRows.length > 0 ? mergedRows : defaults.packageRows,
  };
};

const getToothFlatTags = (toothEntry: any) => [
  ...(toothEntry?.conditions || []),
  ...(toothEntry?.restorations || []),
  ...(toothEntry?.surgery || []),
  ...(toothEntry?.xray || []),
];

const getToothCategoryValues = (toothEntry: any, category: keyof typeof TOOTH_CATEGORY_FIELD_MAP) => {
  const field = TOOTH_CATEGORY_FIELD_MAP[category];
  return toothEntry?.[field] || [];
};

const setToothCategoryValues = (toothEntry: any, category: keyof typeof TOOTH_CATEGORY_FIELD_MAP, values: string[]) => {
  const field = TOOTH_CATEGORY_FIELD_MAP[category];
  return { ...toothEntry, [field]: values };
};

const mergePatientData = (snapshot: any) => {
  const defaults = createInitialPatientData();
  return {
    ...defaults,
    ...snapshot,
    allergies: { ...defaults.allergies, ...(snapshot?.allergies || {}) },
    womenOnly: { ...defaults.womenOnly, ...(snapshot?.womenOnly || {}) },
    dentalChart: mergeDentalChartData(snapshot?.dentalChart),
    certificateDocument: { ...defaults.certificateDocument, ...(snapshot?.certificateDocument || {}) },
    patientContractDocument: mergePatientContractDocument(snapshot?.patientContractDocument),
    consentDocument: {
      ...defaults.consentDocument,
      ...(snapshot?.consentDocument || {}),
      medicalHistory: { ...defaults.consentDocument.medicalHistory, ...(snapshot?.consentDocument?.medicalHistory || {}) },
      allergies: { ...defaults.consentDocument.allergies, ...(snapshot?.consentDocument?.allergies || {}) },
    },
  };
};

const mergeSettings = (snapshot: any) => ({
  ...DEFAULT_SETTINGS,
  ...snapshot,
  visibility: { ...DEFAULT_SETTINGS.visibility, ...(snapshot?.visibility || {}) },
});

const normalizeDoctors = (snapshot: any) => (
  Array.isArray(snapshot)
    ? snapshot
      .map((doctor) => ({
        id: doctor?.id || crypto.randomUUID(),
        name: doctor?.name || '',
        role: doctor?.role || 'Attending Dentist',
        signature: doctor?.signature || null,
      }))
      .filter((doctor) => doctor.name.trim())
    : DEFAULT_DOCTORS
);

const getDoctorById = (doctors: Array<{ id: string; name: string; role: string; signature: string | null }>, doctorId?: string | null) =>
  doctors.find((doctor) => doctor.id === doctorId) || null;

const formatSupabaseError = (error: any) => {
  const message = error?.message || 'Unknown Supabase error';
  if (message === 'Failed to fetch' || message.includes('fetch')) {
    return supabaseHost
      ? `Network error talking to Supabase. The configured host \`${supabaseHost}\` could not be reached. Update \`VITE_SUPABASE_URL\` in \`.env.local\` or confirm that the Supabase project still exists.`
      : 'Network error talking to Supabase. Check `VITE_SUPABASE_URL` in `.env.local` and confirm your project is active.';
  }
  return message;
};

const formatClinicRecordName = (data: any) => {
  const lastName = (data?.lastName || '').trim();
  const firstName = (data?.firstName || '').trim();
  const middleName = (data?.middleName || '').trim();
  const signatureName = (data?.signatureName || '').trim();

  if (lastName && firstName) {
    return `${lastName}, ${firstName}${middleName ? ` ${middleName}` : ''}`;
  }

  if (lastName) return lastName;
  if (firstName) return firstName;
  if (signatureName) return signatureName;
  return 'Untitled Patient';
};

const sanitizeFileNamePart = (value: string | null | undefined, fallback = 'Patient') => {
  const safe = (value || '').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_');
  return safe || fallback;
};

const getNumberSetting = (settings: any, key: string, fallback: number) => {
  const parsed = Number(settings?.[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getDocumentFormPrefix = (documentType: DocumentFormType) => DOCUMENT_FORM_CONFIG[documentType].prefix;

const getDocumentLayoutSettings = (settings: any, documentType: DocumentFormType) => {
  const prefix = getDocumentFormPrefix(documentType);
  return {
    logo: settings?.[`${prefix}Logo`] || null,
    showLogo: settings?.[`${prefix}ShowLogo`] ?? true,
    logoOutline: settings?.[`${prefix}LogoOutline`] ?? false,
    pageOutline: settings?.[`${prefix}PageOutline`] ?? false,
    logoSize: getNumberSetting(settings, `${prefix}LogoSize`, documentType === 'certificate' ? 96 : 84),
    logoGap: getNumberSetting(settings, `${prefix}LogoGap`, documentType === 'certificate' ? 18 : 14),
    pagePaddingTop: getNumberSetting(settings, `${prefix}PagePaddingTop`, documentType === 'certificate' ? 54 : 44),
    pagePaddingRight: getNumberSetting(settings, `${prefix}PagePaddingRight`, documentType === 'certificate' ? 58 : 44),
    pagePaddingBottom: getNumberSetting(settings, `${prefix}PagePaddingBottom`, documentType === 'certificate' ? 54 : 44),
    pagePaddingLeft: getNumberSetting(settings, `${prefix}PagePaddingLeft`, documentType === 'certificate' ? 58 : 44),
  };
};

const getDocumentPageStyle = (settings: any, documentType: DocumentFormType) => {
  const layout = getDocumentLayoutSettings(settings, documentType);
  return {
    paddingTop: `${layout.pagePaddingTop}px`,
    paddingRight: `${layout.pagePaddingRight}px`,
    paddingBottom: `${layout.pagePaddingBottom}px`,
    paddingLeft: `${layout.pagePaddingLeft}px`,
    border: layout.pageOutline ? '1.5px solid #0f172a' : '0 solid transparent',
  };
};

const resolveExportModeFromTab = (activeTab: string): ExportMode => {
  if (activeTab === 'certificates') return 'certificate';
  if (activeTab === 'consents') return 'consent';
  if (activeTab === 'contract') return 'contract';
  return 'record';
};

const getExportElementId = (mode: ExportMode) => {
  if (mode === 'certificate') return 'certificate-pdf-export-container';
  if (mode === 'consent') return 'consent-pdf-export-container';
  if (mode === 'contract') return 'contract-pdf-export-container';
  return 'pdf-export-container';
};

const getExportFileName = (mode: ExportMode, data: any) => {
  const lastName = sanitizeFileNamePart(data?.lastName, 'Patient');
  if (mode === 'certificate') return `${lastName}_CertificateForm.pdf`;
  if (mode === 'consent') return `${lastName}_ConsentForm.pdf`;
  if (mode === 'contract') return `${lastName}_PatientContract.pdf`;
  return `${lastName}_Record.pdf`;
};

// --- MAIN APP COMPONENT ---
export default function DentalSaaS() {
  const loadRequestIdRef = useRef(0);
  const supabaseUnavailableMessage = supabaseConfigError || 'Supabase is not configured yet.';
  const [activeTab, setActiveTab] = useState('form');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [patientsMenuOpen, setPatientsMenuOpen] = useState(true);
  const [patientsActionMenuOpen, setPatientsActionMenuOpen] = useState(false);
  const [patientTabsMoreOpen, setPatientTabsMoreOpen] = useState(false);
  const [systemSettingsView, setSystemSettingsView] = useState<'overview' | 'pdf'>('overview');
  const [systemSettingsTab, setSystemSettingsTab] = useState<SystemSettingsTab>('general');

  const [patientData, setPatientData] = useState(createInitialPatientData);
  const patientDataRef = useRef(patientData);
  useEffect(() => {
    patientDataRef.current = patientData;
  }, [patientData]);

  const [isDownloading, setIsDownloading] = useState(false);
  const [printExportMode, setPrintExportMode] = useState<ExportMode>('record');
  const [printRequestId, setPrintRequestId] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [favoriteStatuses, setFavoriteStatuses] = useState(['✓', 'D', 'M', 'F', 'X', 'Cm']);
  const [doctors, setDoctors] = useState(DEFAULT_DOCTORS);

  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isRefreshingRecords, setIsRefreshingRecords] = useState(false);
  const [isRefreshingArchivedRecords, setIsRefreshingArchivedRecords] = useState(false);
  const [isSavingDoctors, setIsSavingDoctors] = useState(false);
  const [patientDbStatus, setPatientDbStatus] = useState('');
  const [dentalChartDbStatus, setDentalChartDbStatus] = useState('');
  const [templateDbStatus, setTemplateDbStatus] = useState('');
  const [doctorDbStatus, setDoctorDbStatus] = useState('');
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [archivedRecords, setArchivedRecords] = useState<any[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | { type: 'archive' | 'restore'; record: any }>(null);
  const [toast, setToast] = useState<{ open: boolean; tone: 'success' | 'error'; message: string }>({
    open: false,
    tone: 'success',
    message: '',
  });

  const [searchName, setSearchName] = useState('');
  const [searchTag, setSearchTag] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterYear, setFilterYear] = useState('All Years');
  const [filterCategory, setFilterCategory] = useState('All Types');
  const [filterDate, setFilterDate] = useState('');
  const [sortField, setSortField] = useState<'id' | 'name' | 'lastRecall' | 'balance'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const handleOpenPatientTab = (record: any) => {
    window.open(`/?patientId=${record.id}`, '_blank');
  };

  const formatPatientId = (record: any) => {
    const year = record.created_at ? new Date(record.created_at).getFullYear() : 2026;
    const shortId = record.id ? record.id.split('-')[0].substring(0, 4).toUpperCase() : '0000';
    return `PAT-${year}-${shortId}`;
  };

  const getPatientBalance = (record: any) => {
    const patientData = record.patient_data;
    if (!patientData || !patientData.treatmentRecords) return 0;
    return patientData.treatmentRecords.reduce((sum: number, row: any) => {
      const bal = parseFloat(row.balance) || (parseFloat(row.amountCharged) || 0) - (parseFloat(row.amountPaid) || 0);
      return sum + (isNaN(bal) ? 0 : bal);
    }, 0);
  };

  const handleSort = (field: 'id' | 'name' | 'lastRecall' | 'balance') => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getProcessedRecords = () => {
    let list = [...savedRecords];

    if (searchName.trim()) {
      const query = searchName.toLowerCase();
      list = list.filter((r) => {
        const fullName = `${r.patient_data?.lastName || ''} ${r.patient_data?.firstName || ''}`.toLowerCase();
        return fullName.includes(query) || (r.record_name && r.record_name.toLowerCase().includes(query));
      });
    }

    if (searchTag.trim()) {
      const query = searchTag.toLowerCase();
      list = list.filter((r) => {
        const tagsStr = (r.patient_data?.notes || []).map((n: any) => n.text || '').join(' ').toLowerCase();
        return tagsStr.includes(query);
      });
    }

    if (filterCategory !== 'All Types') {
      list = list.filter((r) => {
        const age = parseInt(r.patient_data?.age);
        if (isNaN(age)) return false;
        if (filterCategory === 'Pedia') return age >= 18 && age <= 21;
        if (filterCategory === 'Adult') return age >= 22;
        return false;
      });
    }

    if (filterYear !== 'All Years') {
      list = list.filter((r) => {
        const year = r.created_at ? new Date(r.created_at).getFullYear() : 2026;
        return year.toString() === filterYear;
      });
    }

    if (filterDate) {
      list = list.filter((r) => {
        const dateStr = r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '';
        return dateStr === filterDate;
      });
    }

    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'id') {
        valA = a.created_at || a.updated_at || '';
        valB = b.created_at || b.updated_at || '';
      } else if (sortField === 'name') {
        valA = `${a.patient_data?.lastName || ''}, ${a.patient_data?.firstName || ''}`.toLowerCase();
        valB = `${b.patient_data?.lastName || ''}, ${b.patient_data?.firstName || ''}`.toLowerCase();
      } else if (sortField === 'lastRecall') {
        valA = a.patient_data?.lastVisit || '';
        valB = b.patient_data?.lastVisit || '';
      } else if (sortField === 'balance') {
        valA = getPatientBalance(a);
        valB = getPatientBalance(b);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  };

  const processedList = getProcessedRecords();
  const totalPages = Math.ceil(processedList.length / 30) || 1;
  const paginatedRecords = processedList.slice((currentPage - 1) * 30, currentPage * 30);

  const recordName = formatClinicRecordName(patientData);

  const applySnapshot = (record: any) => {
    setCurrentRecordId(record.id);
    setSelectedRecordId(record.id);
    setPatientData(mergePatientData(record.patient_data));
    setFavoriteStatuses(Array.isArray(record.favorite_statuses) && record.favorite_statuses.length > 0 ? record.favorite_statuses : DEFAULT_FAVORITE_STATUSES);
  };

  const loadDentalChartForRecord = async (patientRecordId: string, patientName?: string) => {
    if (!patientRecordId) return;

    try {
      const chartRecord = await getDentalChartByPatientId(patientRecordId);
      if (!chartRecord) {
        setPatientData((prev: any) => ({ ...prev, dentalChart: mergeDentalChartData(prev.dentalChart) }));
        setPatientDbStatus(`Loaded patient record: ${patientName || 'Untitled Patient'} • No dedicated dental chart row yet, using the current patient chart data.`);
        setDentalChartDbStatus('Using fallback chart data from the patient snapshot. Save this patient to create a dedicated dental chart row.');
        return;
      }

      setPatientData((prev: any) => ({
        ...prev,
        dentalChart: mergeDentalChartData(chartRecord.chart_data),
      }));
      setPatientDbStatus(`Loaded patient record: ${patientName || 'Untitled Patient'} • Dental chart synced from Supabase.`);
      setDentalChartDbStatus(`Loaded dedicated dental chart row for this patient. Last updated ${new Date(chartRecord.updated_at).toLocaleString()}.`);
    } catch (error) {
      console.error('Error loading dental chart:', error);
      setPatientData((prev: any) => ({ ...prev, dentalChart: mergeDentalChartData(prev.dentalChart) }));
      setPatientDbStatus(`Loaded patient record: ${patientName || 'Untitled Patient'} • Dental chart load failed: ${formatSupabaseError(error)}`);
      setDentalChartDbStatus(`Dental chart load failed: ${formatSupabaseError(error)}`);
    }
  };

  const refreshSavedRecords = async () => {
    if (!isSupabaseConfigured) {
      setPatientDbStatus(supabaseUnavailableMessage);
      return;
    }

    setIsRefreshingRecords(true);

    try {
      const data = await loadActivePatientRecords();
      setSavedRecords(data || []);
    } catch (error) {
      console.error('Error loading patient list:', error);
      setPatientDbStatus(`Failed to load patient list: ${formatSupabaseError(error)}`);
      setToast({ open: true, tone: 'error', message: 'Failed to refresh patient list.' });
    } finally {
      setIsRefreshingRecords(false);
    }
  };

  const refreshArchivedRecords = async () => {
    if (!isSupabaseConfigured) {
      setPatientDbStatus(supabaseUnavailableMessage);
      return;
    }

    setIsRefreshingArchivedRecords(true);

    try {
      const data = await loadArchivedPatientRecords();
      setArchivedRecords(data || []);
    } catch (error) {
      console.error('Error loading archived patient list:', error);
      setPatientDbStatus(`Failed to load archived patient list: ${formatSupabaseError(error)}`);
      setToast({ open: true, tone: 'error', message: 'Failed to refresh archived records.' });
    } finally {
      setIsRefreshingArchivedRecords(false);
    }
  };

  const loadTemplateSettings = async () => {
    if (!isSupabaseConfigured) {
      setTemplateDbStatus(supabaseUnavailableMessage);
      return;
    }

    try {
      const settingsData = await loadTemplateSettingsService();
      if (settingsData) {
        setSettings(mergeSettings(settingsData));
        setTemplateDbStatus('Loaded latest PDF template settings.');
      } else {
        setTemplateDbStatus('No saved PDF template yet. Using local defaults.');
      }
    } catch (error) {
      console.error('Error loading template settings:', error);
      setTemplateDbStatus(`Template load failed: ${formatSupabaseError(error)}`);
    }
  };

  const loadDoctorsRegistry = async () => {
    if (!isSupabaseConfigured) {
      setDoctorDbStatus(supabaseUnavailableMessage);
      return;
    }

    try {
      const normalizedDoctors = await loadDoctorsRegistryService();
      setDoctors(normalizedDoctors);
      setDoctorDbStatus(normalizedDoctors.length > 0 ? 'Loaded clinic doctors registry.' : 'No doctors saved yet. Add doctors in System Settings.');
    } catch (error) {
      console.error('Error loading doctors registry:', error);
      setDoctorDbStatus(`Failed to load doctors: ${formatSupabaseError(error)}`);
    }
  };

  const saveDoctorsRegistry = async (nextDoctors: Array<{ id: string; name: string; role: string; signature: string | null }>) => {
    if (!isSupabaseConfigured) {
      setDoctorDbStatus(supabaseUnavailableMessage);
      return false;
    }

    setIsSavingDoctors(true);
    setDoctorDbStatus('Saving doctors registry...');

    try {
      const normalizedDoctors = await saveDoctorsRegistryService(nextDoctors);
      setDoctors(normalizedDoctors);
      setDoctorDbStatus(`Saved ${normalizedDoctors.length} clinic doctor${normalizedDoctors.length === 1 ? '' : 's'}.`);

      const defaultDoctor = getDoctorById(normalizedDoctors, settings.defaultDentistId) || normalizedDoctors[0] || null;
      if (defaultDoctor) {
        setSettings((prev) => ({
          ...prev,
          defaultDentistId: defaultDoctor.id,
          defaultDentistName: defaultDoctor.name,
          defaultDentistRole: defaultDoctor.role,
          defaultDentistSignature: defaultDoctor.signature,
        }));
      }

      return true;
    } catch (error) {
      console.error('Error saving doctors registry:', error);
      setDoctorDbStatus(`Failed to save doctors: ${formatSupabaseError(error)}`);
      return false;
    } finally {
      setIsSavingDoctors(false);
    }
  };

  const saveTemplateSettings = async (nextSettings: any) => {
    if (!isSupabaseConfigured) {
      setTemplateDbStatus(supabaseUnavailableMessage);
      return false;
    }

    setIsSavingTemplate(true);
    setTemplateDbStatus('Saving PDF template settings...');

    try {
      await saveTemplateSettingsService(nextSettings);
      setSettings(mergeSettings(nextSettings));
      setTemplateDbStatus('Saved PDF template settings.');
      return true;
    } catch (error) {
      console.error('Error saving template settings:', error);
      setTemplateDbStatus(`Failed to save template settings: ${formatSupabaseError(error)}`);
      return false;
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const loadRecordFromDatabase = async (recordId?: string | null) => {
    if (!isSupabaseConfigured) {
      setPatientDbStatus(supabaseUnavailableMessage);
      return;
    }

    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    setIsLoadingFromDb(true);
    setPatientDbStatus(recordId ? 'Loading selected patient record...' : 'Loading latest patient record...');

    try {
      const data = await loadPatientRecord(recordId);

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      if (!data) {
        setCurrentRecordId(null);
        setSelectedRecordId(null);
        setPatientDbStatus('Supabase is connected, but there are no patient records yet.');
        setDentalChartDbStatus('No patient selected yet, so no dental chart is loaded.');
        setToast({ open: true, tone: 'error', message: 'No patient record found.' });
        return;
      }

      applySnapshot(data);
      await loadDentalChartForRecord(data.id, data.record_name || 'Untitled Patient');
      await refreshSavedRecords();
      setToast({ open: true, tone: 'success', message: `Loaded ${data.record_name || 'patient record'}.` });
    } catch (error) {
      console.error('Error loading Supabase record:', error);
      setPatientDbStatus(`Failed to load data: ${formatSupabaseError(error)}`);
      setToast({ open: true, tone: 'error', message: 'Failed to load patient record.' });
    } finally {
      setIsLoadingFromDb(false);
    }
  };

  const saveToDatabase = async (saveAsNew = false) => {
    if (!isSupabaseConfigured) {
      setPatientDbStatus(supabaseUnavailableMessage);
      return;
    }

    setIsSavingToDb(true);
    setPatientDbStatus(saveAsNew ? 'Saving as new patient record...' : 'Saving patient record...');

    const payload = {
      id: saveAsNew ? undefined : currentRecordId || undefined,
      record_name: recordName,
      patient_last_name: patientDataRef.current.lastName || null,
      patient_first_name: patientDataRef.current.firstName || null,
      patient_data: patientDataRef.current,
      favorite_statuses: favoriteStatuses,
    };

    let savedRecord: Awaited<ReturnType<typeof savePatientRecord>> | null = null;

    try {
      savedRecord = await savePatientRecord({
        ...payload,
        id: saveAsNew ? undefined : currentRecordId || undefined,
      });
      await saveDentalChart(savedRecord.id, patientData.dentalChart, patientData.dentalChart?.findings || null);
      setDentalChartDbStatus(`Saved dedicated dental chart row for ${savedRecord.record_name || 'Untitled Patient'}.`);
      applySnapshot(savedRecord);
      await loadDentalChartForRecord(savedRecord.id, savedRecord.record_name || 'Untitled Patient');
      await refreshSavedRecords();
      setPatientDbStatus(`${saveAsNew ? 'Saved new' : 'Saved'} patient record and dental chart: ${savedRecord.record_name || 'Untitled Patient'}`);
      setToast({ open: true, tone: 'success', message: `${saveAsNew ? 'Saved new' : 'Updated'} ${savedRecord.record_name || 'patient record'}.` });
    } catch (chartError) {
      console.error('Error saving dental chart:', chartError);
      setPatientDbStatus(`${saveAsNew ? 'Saved new' : 'Saved'} patient record, but dental chart sync failed: ${formatSupabaseError(chartError)}`);
      setDentalChartDbStatus(`Dental chart save failed: ${formatSupabaseError(chartError)}`);
      setToast({ open: true, tone: 'error', message: 'Patient saved, but dental chart sync failed.' });
      return;
    } finally {
      setIsSavingToDb(false);
    }
  };

  const startNewPatientRecord = () => {
    loadRequestIdRef.current += 1;
    setCurrentRecordId(null);
    setSelectedRecordId(null);
    setPatientData(createInitialPatientData());
    setFavoriteStatuses(DEFAULT_FAVORITE_STATUSES);
    setDentalChartDbStatus('No patient selected yet, so no dental chart is loaded.');
    setPatientDbStatus('Started a new blank patient record. Save it when ready.');
    setToast({ open: true, tone: 'success', message: 'Started a new blank patient record.' });
    setPatientsActionMenuOpen(false);
    setActiveTab('form');
  };

  const archivePatientRecord = async (record: any) => {
    if (!isSupabaseConfigured) {
      setPatientDbStatus(supabaseUnavailableMessage);
      setToast({ open: true, tone: 'error', message: supabaseUnavailableMessage });
      return;
    }

    setPatientDbStatus(`Archiving ${record.record_name || 'patient record'}...`);

    try {
      await archivePatientRecordService(record.id);
    } catch (error) {
      console.error('Error archiving patient record:', error);
      setPatientDbStatus(`Failed to archive patient record: ${formatSupabaseError(error)}`);
      setToast({ open: true, tone: 'error', message: `Failed to archive ${record.record_name || 'patient record'}.` });
      return;
    }

    if (currentRecordId === record.id || selectedRecordId === record.id) {
      startNewPatientRecord();
    }

    await refreshSavedRecords();
    await refreshArchivedRecords();
    setPatientDbStatus(`Archived patient record: ${record.record_name || 'Untitled Patient'}`);
    setToast({ open: true, tone: 'success', message: `${record.record_name || 'Patient record'} archived.` });
  };

  const restorePatientRecord = async (record: any) => {
    if (!isSupabaseConfigured) {
      setPatientDbStatus(supabaseUnavailableMessage);
      setToast({ open: true, tone: 'error', message: supabaseUnavailableMessage });
      return;
    }

    setPatientDbStatus(`Restoring ${record.record_name || 'patient record'}...`);

    try {
      await restorePatientRecordService(record.id);
    } catch (error) {
      console.error('Error restoring patient record:', error);
      setPatientDbStatus(`Failed to restore patient record: ${formatSupabaseError(error)}`);
      setToast({ open: true, tone: 'error', message: `Failed to restore ${record.record_name || 'patient record'}.` });
      return;
    }

    await refreshSavedRecords();
    await refreshArchivedRecords();
    setSelectedRecordId(record.id);
    setPatientDbStatus(`Restored patient record: ${record.record_name || 'Untitled Patient'}`);
    setToast({ open: true, tone: 'success', message: `${record.record_name || 'Patient record'} restored to active list.` });
    setActiveTab('patients');
  };

  const openSystemSettings = () => {
    setSystemSettingsTab('general');
    setSystemSettingsView('overview');
    setActiveTab('customize');
  };

  useEffect(() => {
    if (isSupabaseConfigured) {
      loadTemplateSettings();
      loadDoctorsRegistry();
      refreshSavedRecords();
      refreshArchivedRecords();

      const params = new URLSearchParams(window.location.search);
      const patientIdParam = params.get('patientId');
      if (patientIdParam) {
        setSelectedRecordId(patientIdParam);
        loadRecordFromDatabase(patientIdParam);
        setActiveTab('form');
      } else {
        loadRecordFromDatabase();
      }
    } else {
      setPatientDbStatus(supabaseUnavailableMessage);
      setDentalChartDbStatus(supabaseUnavailableMessage);
      setTemplateDbStatus(supabaseUnavailableMessage);
      setDoctorDbStatus(supabaseUnavailableMessage);
    }
  }, []);

  useEffect(() => {
    const defaultDoctor = getDoctorById(doctors, settings.defaultDentistId);
    if (defaultDoctor) {
      setSettings((prev) => ({
        ...prev,
        defaultDentistName: defaultDoctor.name,
        defaultDentistRole: defaultDoctor.role,
        defaultDentistSignature: defaultDoctor.signature,
      }));
    } else if (doctors.length > 0 && !settings.defaultDentistId) {
      const firstDoctor = doctors[0];
      setSettings((prev) => ({
        ...prev,
        defaultDentistId: firstDoctor.id,
        defaultDentistName: firstDoctor.name,
        defaultDentistRole: firstDoctor.role,
        defaultDentistSignature: firstDoctor.signature,
      }));
    }
  }, [doctors, settings.defaultDentistId]);

  useEffect(() => {
    if (['patients', 'archived', ...PATIENT_WORKFLOW_TAB_IDS, 'preview'].includes(activeTab)) {
      setPatientsMenuOpen(true);
    }
  }, [activeTab]);

  useEffect(() => {
    setPatientTabsMoreOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (patientData && (patientData.lastName || patientData.firstName)) {
      const fullName = `${patientData.lastName || ''}, ${patientData.firstName || ''}`.trim().toUpperCase();
      document.title = fullName || 'Patient Record';
    } else {
      document.title = 'DentalFlow';
    }
  }, [patientData]);

  useEffect(() => {
    if (!toast.open) return;
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [toast.open, toast.message]);

  useLayoutEffect(() => {
    if (printRequestId === 0) return;
    window.print();
  }, [printRequestId, printExportMode]);

  const handlePrint = () => {
    setPrintExportMode(resolveExportModeFromTab(activeTab));
    setPrintRequestId((prev) => prev + 1);
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const exportMode = resolveExportModeFromTab(activeTab);
      const element = document.getElementById(getExportElementId(exportMode));
      if (!element) return;
      if (!window.html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const opt = {
        margin: 0,
        filename: getExportFileName(exportMode, patientData),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'css', before: '.page-break' }
      };
      await window.html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('May error sa pag-download ng PDF. Pakisubukan muli.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-only { display: block !important; position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 9999; background: white; }
          .print-export-document { display: none !important; }
          .print-export-document.is-print-target { display: block !important; }
          .a4-page { box-shadow: none !important; transform: none !important; margin: 0 !important; width: 210mm; height: 297mm; position: relative; }
          .page-break { page-break-before: always; }
        }
      `}</style>



      {/* Main Content Area */}
      <main className="hidden flex-1 overflow-y-auto p-4 sm:p-6 no-print bg-[#f8f9fa]">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <div className="font-medium">Patient record sync</div>
              <div>{patientDbStatus || 'Ready to connect.'}</div>
              <div className="text-xs text-emerald-700 mt-1">Current record ID: {currentRecordId || 'New unsaved record'}</div>
              <div className="text-xs text-emerald-700">Clinic file name: {recordName}</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <div className="font-medium">PDF template sync</div>
              <div>{templateDbStatus || 'Ready to connect.'}</div>
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Saved Patient Records</label>
                <select
                  value={selectedRecordId || ''}
                  onChange={(e) => setSelectedRecordId(e.target.value || null)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Latest record</option>
                  {savedRecords.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.record_name} {record.updated_at ? `• ${new Date(record.updated_at).toLocaleString()}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={refreshSavedRecords} disabled={isRefreshingRecords} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                  {isRefreshingRecords ? 'Refreshing...' : 'Refresh List'}
                </button>
                <button onClick={() => loadRecordFromDatabase(selectedRecordId)} disabled={isLoadingFromDb} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
                  {isLoadingFromDb ? 'Loading...' : 'Load Selected'}
                </button>
              </div>
            </div>
          </div>
          {activeTab === 'form' && <FormModule data={patientData} setData={setPatientData} />}
          {activeTab === 'charting' && <DentalChartModule data={patientData} setData={setPatientData} favoriteStatuses={favoriteStatuses} setFavoriteStatuses={setFavoriteStatuses} doctors={doctors} />}
          {activeTab === 'treatment' && <TreatmentRecordModule data={patientData} setData={setPatientData} doctors={doctors} />}
          {activeTab === 'customize' && <CustomizeModule settings={settings} setSettings={setSettings} onSaveSettings={saveTemplateSettings} isSavingTemplate={isSavingTemplate} doctors={doctors} />}
        </div>

        {activeTab === 'preview' && <LivePreviewContainer data={patientData} settings={settings} />}
      </main>

      <div className="flex flex-1 min-h-0 no-print">
        <aside className={`${sidebarCollapsed ? 'w-20' : 'w-72'} shrink-0 border-r border-slate-200 bg-white transition-all duration-300`}>
          <div className="border-b border-slate-100 px-4 py-4">
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} gap-3 rounded-xl p-2 text-blue-600 hover:bg-slate-50`}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
                  <LayoutTemplate size={22} />
                </div>
                {!sidebarCollapsed && (
                  <div className="text-left">
                    <div className="text-lg font-semibold text-slate-900">P&J Tanarte</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Dental Clinic</div>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && <Menu size={18} className="text-slate-500" />}
            </button>
          </div>

          <nav className="space-y-2 px-3 py-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              title="Dashboard"
            >
              <LayoutTemplate size={18} />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </button>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setPatientsMenuOpen(prev => !prev);
                  if (activeTab === 'dashboard') setActiveTab('patients');
                }}
                className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${['patients_record', 'patients', 'archived', ...PATIENT_WORKFLOW_TAB_IDS, 'preview'].includes(activeTab)
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                title="Patients"
              >
                <FileText size={18} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1">Patients</span>
                    {patientsMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </>
                )}
              </button>

              {!sidebarCollapsed && patientsMenuOpen && (
                <div className="ml-4 space-y-1 border-l border-slate-200 pl-3">
                  {[
                    { id: 'patients_record', label: 'Patients Record', icon: ClipboardList },
                    { id: 'archived', label: 'Archived Records', icon: Archive },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                      <tab.icon size={16} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={openSystemSettings}
              className={`flex w-full items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === 'customize' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              title="System Settings"
            >
              <Settings size={18} />
              {!sidebarCollapsed && <span>System Settings</span>}
            </button>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Global Navbar */}
          <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0 no-print">
            {/* Left Side: Search Bar and Add Patient Button */}
            <div className="flex items-center border border-slate-200 bg-slate-50 rounded-[10px] overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
              {/* Search Input */}
              <div className="relative flex items-center">
                <Search className="absolute left-3 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search patients..."
                  className="pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none w-64"
                />
              </div>
              {/* Add New Patient Button */}
              <button
                onClick={startNewPatientRecord}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors border-l border-slate-200 self-stretch"
              >
                <Plus size={16} />
                <span className="whitespace-nowrap">Add New Patient</span>
              </button>
            </div>

            {/* Right Side: Notification Bell, Profile Icon and Clinic Owner Name */}
            <div className="flex items-center gap-4">
              <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <User size={18} />
                </div>
                <span className="text-sm font-medium text-slate-700">Clinic Owner</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-[#f8f9fa]">
            <div className="border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {activeTab === 'dashboard' && 'Dashboard'}
                  {activeTab === 'patients_record' && 'Patients'}
                  {activeTab === 'patients' && 'Patients'}
                  {activeTab === 'archived' && 'Archived Records'}
                  {activeTab === 'form' && 'Patient Information'}
                  {activeTab === 'charting' && 'Dental Charting'}
                  {activeTab === 'treatment' && 'Treatment Record'}
                  {activeTab === 'prescriptions' && 'Prescriptions'}
                  {activeTab === 'certificates' && 'Certificates'}
                  {activeTab === 'contract' && 'Patient Contract'}
                  {activeTab === 'attachments' && 'File Attachments'}
                  {activeTab === 'notes' && 'Notes'}
                  {activeTab === 'consents' && 'Consents'}
                  {activeTab === 'appointments' && 'Appointments'}
                  {activeTab === 'preview' && 'Live Preview'}
                  {activeTab === 'customize' && 'System Settings'}
                </h1>
                <p className="text-sm text-slate-500">
                  {activeTab === 'dashboard' && 'Overview of records, template sync, and receptionist activity.'}
                  {activeTab === 'patients_record' && 'Clinic patients list.'}
                  {activeTab === 'patients' && 'Manage clinic patient files in a receptionist-friendly table.'}
                  {activeTab === 'archived' && 'Review and restore archived patient records from Supabase.'}
                  {activeTab === 'form' && 'Register and update patient information.'}
                  {activeTab === 'charting' && 'Maintain the dental chart for the current patient.'}
                  {activeTab === 'treatment' && 'Track treatment history and billing details.'}
                  {activeTab === 'prescriptions' && 'Manage patient medication and prescription records.'}
                  {activeTab === 'certificates' && 'Manage patient certificate records.'}
                  {activeTab === 'contract' && 'Prepare and print the orthodontic treatment contract and package ledger.'}
                  {activeTab === 'attachments' && 'Manage patient file attachments and uploaded documents.'}
                  {activeTab === 'notes' && 'Track internal patient notes and reminders.'}
                  {activeTab === 'consents' && 'Track signed consent forms and statuses.'}
                  {activeTab === 'appointments' && 'Manage patient appointment history and schedules.'}
                  {activeTab === 'preview' && 'Review the printable output before export.'}
                  {activeTab === 'customize' && 'Manage clinic-wide settings, doctor registry, and document configuration.'}
                </p>
              </div>
            </div>

            <div className="p-6">
              {activeTab !== 'patients_record' && !PATIENT_WORKFLOW_TAB_IDS.includes(activeTab as any) && (
                <div className="mb-6 grid gap-4 xl:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                    <div className="font-semibold">Patient Record Sync</div>
                    <div className="mt-1">{patientDbStatus || 'Ready to connect.'}</div>
                    <div className="mt-2 text-xs text-emerald-800">Clinic file name: {recordName}</div>
                    <div className="text-xs text-emerald-800">Current record ID: {currentRecordId || 'New unsaved record'}</div>
                  </div>
                  <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4 text-sm text-cyan-900">
                    <div className="font-semibold">Dental Chart Sync</div>
                    <div className="mt-1">{dentalChartDbStatus || 'Waiting for a patient chart to load.'}</div>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                    <div className="font-semibold">PDF Template Sync</div>
                    <div className="mt-1">{templateDbStatus || 'Ready to connect.'}</div>
                  </div>
                </div>
              )}

              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-sm font-medium text-slate-500">Saved Patients</div>
                      <div className="mt-2 text-3xl font-bold text-slate-900">{savedRecords.length}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-sm font-medium text-slate-500">Current File</div>
                      <div className="mt-2 text-lg font-bold text-slate-900 break-words">{recordName}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="text-sm font-medium text-slate-500">Template Status</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{templateDbStatus || 'Waiting for template sync.'}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-900">Recent Patient Files</h2>
                      <button onClick={refreshSavedRecords} disabled={isRefreshingRecords} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                        {isRefreshingRecords ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {savedRecords.slice(0, 5).map((record) => (
                        <button
                          key={record.id}
                          onClick={() => { setSelectedRecordId(record.id); loadRecordFromDatabase(record.id); }}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <div>
                            <div className="font-medium text-slate-900">{record.record_name}</div>
                            <div className="text-xs text-slate-500">{record.updated_at ? new Date(record.updated_at).toLocaleString() : 'No date'}</div>
                          </div>
                          <FileText size={16} className="text-slate-400" />
                        </button>
                      ))}
                      {savedRecords.length === 0 && <div className="text-sm text-slate-500">No patient files yet.</div>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'patients_record' && (
                <div className="space-y-6">
                  {/* Main Filter Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    {/* First Row: Text Filters */}
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Left Side: Filter by Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Filter by: Last Name / First Name
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="text"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            placeholder="Type name (e.g. Dela Cruz, Juan)"
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-[10px] text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>

                      {/* Right Side: Filter by Tags */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Filter by Tags:
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="text"
                            value={searchTag}
                            onChange={(e) => setSearchTag(e.target.value)}
                            placeholder="Search tags..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-[10px] text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="my-6 border-t border-slate-100"></div>

                    {/* Second Row: Dropdowns & Action Buttons */}
                    <div className="flex flex-wrap items-end gap-3">
                      {/* Patient Of */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Patient of:
                        </label>
                        <div className="flex border border-slate-200 rounded-[10px] overflow-hidden bg-white focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                          <div className="bg-slate-50 border-r border-slate-200 px-3 py-2 text-slate-500 text-sm font-medium flex items-center justify-center">
                            Year
                          </div>
                          <select
                            value={filterDoctor}
                            onChange={(e) => setFilterDoctor(e.target.value)}
                            className="flex-1 px-3 py-2 bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer"
                          >
                            <option value="">All Years</option>
                            {doctors.map((doc) => (
                              <option key={doc.id} value={doc.id}>
                                {doc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Type (Category) */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Type:
                        </label>
                        <div className="flex border border-slate-200 rounded-[10px] overflow-hidden bg-white focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                          <div className="bg-slate-50 border-r border-slate-200 px-3 py-2 text-slate-500 text-sm font-medium flex items-center justify-center">
                            Category
                          </div>
                          <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="flex-1 px-3 py-2 bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer"
                          >
                            <option value="All Types">All Types</option>
                            <option value="Pedia">Pedia (18-21)</option>
                            <option value="Adult">Adult (22+)</option>
                          </select>
                        </div>
                      </div>

                      {/* Select Specific Date */}
                      <div className="flex-[1.5] min-w-[260px]">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Select Specific Date:
                        </label>
                        <div className="flex items-center border border-slate-200 rounded-[10px] overflow-hidden bg-white px-3 py-2 gap-2 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                          <ClipboardList className="text-slate-400" size={16} />
                          <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            placeholder="Select Specific Date"
                            className="w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Go & Clear Buttons */}
                      <div className="flex gap-2 min-w-[180px]">
                        <button
                          onClick={() => {
                            setCurrentPage(1);
                          }}
                          className="flex-1 px-5 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-[10px] text-sm font-semibold shadow-sm transition-colors h-10"
                        >
                          Go
                        </button>
                        <button
                          onClick={() => {
                            setSearchName('');
                            setSearchTag('');
                            setFilterDoctor('');
                            setFilterYear('All Years');
                            setFilterCategory('All Types');
                            setFilterDate('');
                            setCurrentPage(1);
                          }}
                          className="flex-1 px-5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-[10px] text-sm font-semibold transition-colors h-10"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Bottom Actions: New Patient */}
                    <div className="mt-8 flex justify-end border-t border-slate-100 pt-4">
                      <button
                        onClick={startNewPatientRecord}
                        className="flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white px-4 py-2.5 rounded-[12px] text-sm font-semibold transition-colors shadow-sm"
                      >
                        <Plus size={16} />
                        <span>New Patient</span>
                      </button>
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between mb-2 mt-4 px-1">
                    {/* Left: Previous, page numbers, Next */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        &lt; Previous
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${currentPage === page
                              ? 'bg-[#0284c7] text-white shadow-sm'
                              : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        Next &gt;
                      </button>
                    </div>

                    {/* Right: Total Patients Count Badge */}
                    <div className="px-4 py-2 border border-slate-200 rounded-[12px] bg-white text-sm font-bold text-slate-700 shadow-sm">
                      Total Patients: {processedList.length}
                    </div>
                  </div>

                  {/* Patients Table Container */}
                  <div className="overflow-x-auto rounded-[15px] border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider">#</th>
                          <th className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider">ACTIONS</th>
                          <th
                            onClick={() => handleSort('id')}
                            className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                          >
                            <div className="flex items-center gap-1">
                              <span>ID</span>
                              <span>{sortField === 'id' ? (sortDirection === 'asc' ? '↑' : '↓') : '↑↓'}</span>
                            </div>
                          </th>
                          <th
                            onClick={() => handleSort('name')}
                            className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                          >
                            <div className="flex items-center gap-1">
                              <span>NAME</span>
                              <span>{sortField === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : '↑↓'}</span>
                            </div>
                          </th>
                          <th className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider">ADDRESS</th>
                          <th className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider">MOBILE</th>
                          <th className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider">FIRST VISIT</th>
                          <th
                            onClick={() => handleSort('lastRecall')}
                            className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                          >
                            <div className="flex items-center gap-1">
                              <span>LAST RECALL</span>
                              <span>{sortField === 'lastRecall' ? (sortDirection === 'asc' ? '↑' : '↓') : '↑↓'}</span>
                            </div>
                          </th>
                          <th
                            onClick={() => handleSort('balance')}
                            className="px-4 py-4 text-left font-bold text-[11px] text-slate-400 tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                          >
                            <div className="flex items-center gap-1">
                              <span>BALANCE</span>
                              <span>{sortField === 'balance' ? (sortDirection === 'asc' ? '↑' : '↓') : '↑↓'}</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {paginatedRecords.map((record, index) => {
                          const globalIndex = (currentPage - 1) * 30 + index + 1;
                          const pData = record.patient_data || {};
                          const fullName = `${pData.lastName || ''}, ${pData.firstName || ''} ${pData.middleName || ''}`.trim().toUpperCase();
                          const address = (pData.address || '').trim().toUpperCase();
                          const mobile = pData.mobile || pData.contact || '-';

                          let visitDay = '-';
                          let visitYear = '';
                          if (pData.lastVisit) {
                            try {
                              const d = new Date(pData.lastVisit);
                              visitDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              visitYear = d.getFullYear().toString();
                            } catch {
                              // ignore
                            }
                          }

                          const lastRecall = pData.lastVisit ? new Date(pData.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

                          const balanceVal = getPatientBalance(record);
                          const balanceFormatted = `₱${balanceVal.toFixed(2)}`;

                          return (
                            <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-4 text-slate-400 font-medium">{globalIndex}</td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => handleOpenPatientTab(record)}
                                    className="text-emerald-500 hover:text-emerald-700 transition-colors"
                                    title="Edit patient record"
                                  >
                                    <Edit3 size={18} />
                                  </button>
                                  <button
                                    onClick={() => setConfirmAction({ type: 'archive', record })}
                                    className="text-rose-500 hover:text-rose-700 transition-colors"
                                    title="Archive patient record"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-4 font-bold text-slate-700">{formatPatientId(record)}</td>
                              <td
                                onClick={() => handleOpenPatientTab(record)}
                                className="px-4 py-4 font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer select-none"
                              >
                                {fullName || 'UNTITLED PATIENT'}
                              </td>
                              <td className="px-4 py-4 text-slate-500 font-medium">{address || '-'}</td>
                              <td className="px-4 py-4 text-slate-700 font-medium">{mobile}</td>
                              <td className="px-4 py-4">
                                {visitYear ? (
                                  <div>
                                    <span className="font-bold text-slate-800 text-sm">{visitDay}</span>
                                    <span className="block text-slate-400 text-xs">{visitYear}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-slate-700 font-medium">{lastRecall}</td>
                              <td className="px-4 py-4 font-bold text-slate-800">{balanceFormatted}</td>
                            </tr>
                          );
                        })}
                        {paginatedRecords.length === 0 && (
                          <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">
                              No matching patient records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'patients' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex-1">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Patient Registry</div>
                      <h2 className="mt-1 text-xl font-semibold text-slate-900">Saved Patient Records</h2>
                      <p className="text-sm text-slate-500">Receptionist-friendly patient list pulled from Supabase.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={startNewPatientRecord} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">Add New Patient</button>
                      <button onClick={refreshSavedRecords} disabled={isRefreshingRecords} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                        {isRefreshingRecords ? 'Refreshing...' : 'Refresh List'}
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setPatientsActionMenuOpen((open) => !open)}
                          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          title="More patient actions"
                        >
                          <Settings size={16} />
                          <ChevronDown size={14} className={`transition-transform ${patientsActionMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {patientsActionMenuOpen && (
                          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                            <button
                              onClick={() => {
                                setPatientsActionMenuOpen(false);
                                loadRecordFromDatabase(selectedRecordId);
                              }}
                              disabled={isLoadingFromDb}
                              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              {isLoadingFromDb ? 'Loading...' : 'Load Selected'}
                            </button>
                            <button
                              onClick={() => {
                                setPatientsActionMenuOpen(false);
                                saveToDatabase(false);
                              }}
                              disabled={isSavingToDb}
                              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              {isSavingToDb ? 'Saving...' : 'Save DB'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Patient File</th>
                          <th className="px-4 py-3 text-left font-semibold">Last Name</th>
                          <th className="px-4 py-3 text-left font-semibold">First Name</th>
                          <th className="px-4 py-3 text-left font-semibold">Updated</th>
                          <th className="px-4 py-3 text-left font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {savedRecords.map((record) => (
                          <tr key={record.id} className={selectedRecordId === record.id ? 'bg-blue-50' : ''}>
                            <td className="px-4 py-3 font-medium text-slate-900">{record.record_name}</td>
                            <td className="px-4 py-3 text-slate-600">{record.patient_last_name || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{record.patient_first_name || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{record.updated_at ? new Date(record.updated_at).toLocaleString() : '-'}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedRecordId(record.id);
                                    loadRecordFromDatabase(record.id);
                                    setActiveTab('form');
                                  }}
                                  className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
                                  title="Modify patient record"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => setConfirmAction({ type: 'archive', record })}
                                  className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
                                  title="Archive patient record"
                                >
                                  <Archive size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {savedRecords.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No patient records found yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'archived' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex-1">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Patient Archive</div>
                      <h2 className="mt-1 text-xl font-semibold text-slate-900">Archived Records</h2>
                      <p className="text-sm text-slate-500">Retrieve archived patient files and return them to the active registry.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={refreshArchivedRecords}
                        disabled={isRefreshingArchivedRecords}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {isRefreshingArchivedRecords ? 'Refreshing...' : 'Refresh List'}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Patient File</th>
                          <th className="px-4 py-3 text-left font-semibold">Last Name</th>
                          <th className="px-4 py-3 text-left font-semibold">First Name</th>
                          <th className="px-4 py-3 text-left font-semibold">Archived</th>
                          <th className="px-4 py-3 text-left font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {archivedRecords.map((record) => (
                          <tr key={record.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{record.record_name}</td>
                            <td className="px-4 py-3 text-slate-600">{record.patient_last_name || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{record.patient_first_name || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{record.archived_at ? new Date(record.archived_at).toLocaleString() : '-'}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setConfirmAction({ type: 'restore', record })}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                                title="Restore patient record"
                              >
                                Restore
                              </button>
                            </td>
                          </tr>
                        ))}
                        {archivedRecords.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No archived patient records found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}



              {PATIENT_WORKFLOW_TAB_IDS.includes(activeTab as any) && (
                <PatientDetailsWorkspace
                  patientData={patientData}
                  setPatientData={setPatientData}
                  doctors={doctors}
                  settings={settings}
                  currentRecordId={currentRecordId}
                  patientCode={formatPatientId(savedRecords.find((r) => r.id === currentRecordId) || { id: currentRecordId })}
                  favoriteStatuses={favoriteStatuses}
                  setFavoriteStatuses={setFavoriteStatuses}
                  isSavingToDb={isSavingToDb}
                  saveToDatabase={saveToDatabase}
                  handlePrint={handlePrint}
                  handleDownloadPDF={handleDownloadPDF}
                  isDownloading={isDownloading}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onBack={() => {
                    setActiveTab('patients_record');
                    setSelectedRecordId(null);
                    setPatientData(createInitialPatientData());
                  }}
                >
                  {activeTab === 'form' && <div className="mx-auto w-full max-w-[1680px]"><FormModule data={patientData} setData={setPatientData} /></div>}
                  {activeTab === 'charting' && <div className="mx-auto w-full max-w-[1720px]"><DentalChartModule data={patientData} setData={setPatientData} favoriteStatuses={favoriteStatuses} setFavoriteStatuses={setFavoriteStatuses} doctors={doctors} /></div>}
                  {activeTab === 'certificates' && <CertificateDocumentModule data={patientData} setData={setPatientData} settings={settings} />}
                  {activeTab === 'consents' && <ConsentDocumentModule data={patientData} setData={setPatientData} settings={settings} />}
                  {activeTab === 'contract' && <PatientContractModule data={patientData} setData={setPatientData} />}
                  {activeTab === 'prescriptions' && <div className="mx-auto w-full max-w-[1680px]"><PatientAuxTableModule data={patientData} setData={setPatientData} sectionKey="prescriptions" title="Prescriptions" subtitle="Medication and prescription records for this patient." columns={[{ key: 'date', label: 'Date' }, { key: 'title', label: 'Prescription' }, { key: 'details', label: 'Remarks' }]} newLabel="New Prescription" emptyLabel="No prescriptions recorded yet." /></div>}
                  {activeTab === 'attachments' && <div className="mx-auto w-full max-w-[1680px]"><PatientAuxTableModule data={patientData} setData={setPatientData} sectionKey="attachments" title="File Attachments" subtitle="Uploaded files and attachment references for this patient." columns={[{ key: 'date', label: 'Date' }, { key: 'title', label: 'File Name' }, { key: 'details', label: 'Remarks' }]} newLabel="New File Attachment" emptyLabel="No file attachments recorded yet." /></div>}
                  {activeTab === 'notes' && <div className="mx-auto w-full max-w-[1680px]"><PatientAuxTableModule data={patientData} setData={setPatientData} sectionKey="notes" title="Notes" subtitle="Internal patient notes and follow-up reminders." columns={[{ key: 'date', label: 'Date' }, { key: 'title', label: 'Note Title' }, { key: 'details', label: 'Details' }]} newLabel="New Note" emptyLabel="No notes recorded yet." /></div>}
                  {activeTab === 'appointments' && <div className="mx-auto w-full max-w-[1680px]"><PatientAuxTableModule data={patientData} setData={setPatientData} sectionKey="appointments" title="Appointments" subtitle="Scheduled and completed appointment records for this patient." columns={[{ key: 'date', label: 'Date' }, { key: 'title', label: 'Appointment' }, { key: 'details', label: 'Remarks' }]} newLabel="New Appointment" emptyLabel="No appointments recorded yet." patientId={currentRecordId} /></div>}

                  {/* New Clinical Tab Modules */}
                  {activeTab === 'progress_notes' && <ProgressNotesModule patientData={patientData} setPatientData={setPatientData} doctors={doctors} saveToDatabase={() => saveToDatabase(false)} />}
                  {activeTab === 'smart_support' && <SmartSupportModule patientData={patientData} setPatientData={setPatientData} doctors={doctors} />}
                  {activeTab === 'ledger' && <LedgerModule patientData={patientData} setPatientData={setPatientData} doctors={doctors} saveToDatabase={() => saveToDatabase(false)} />}
                  {activeTab === 'uploads' && <UploadsModule patientData={patientData} setPatientData={setPatientData} />}
                  {activeTab === 'recalls' && <RecallsModule patientData={patientData} setPatientData={setPatientData} />}
                  {activeTab === 'scratchpad' && <ScratchpadModule patientData={patientData} setPatientData={setPatientData} />}
                  {activeTab === 'followup' && <FollowupModule patientData={patientData} setPatientData={setPatientData} />}
                </PatientDetailsWorkspace>
              )}
              {activeTab === 'customize' && (
                <div className="mx-auto w-full max-w-[1760px]">
                  <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    {[
                      { id: 'general', label: 'General Settings' },
                      { id: 'doctors', label: 'Add Doctors' },
                      { id: 'pdf', label: 'PDF Designer' },
                      { id: 'certificateForm', label: 'Certificate Form' },
                      { id: 'consentForm', label: 'Consent Form' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setSystemSettingsTab(tab.id as SystemSettingsTab);
                          if (tab.id !== 'pdf') setSystemSettingsView('overview');
                        }}
                        className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${systemSettingsTab === tab.id
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {systemSettingsTab === 'general' && (
                    <div className="space-y-6 pb-12">
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="max-w-3xl">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">System Settings</div>
                          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Clinic General Details</h2>
                          <p className="mt-2 text-sm text-slate-500">Manage your core clinic setup here, including doctor availability, document tools, and reusable system defaults that power the receptionist workflow.</p>
                        </div>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                          <h3 className="text-lg font-semibold text-slate-900">Doctors Registry</h3>
                          <p className="mt-2 text-sm text-slate-500">Current saved doctors: <span className="font-semibold text-slate-800">{doctors.length}</span></p>
                          <p className="mt-2 text-sm text-slate-500">{doctorDbStatus || 'Save clinic dentists to reuse them across the system.'}</p>
                          <button
                            onClick={() => setSystemSettingsTab('doctors')}
                            className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                          >
                            Manage Doctors
                          </button>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900">Modify PDF</h3>
                              <p className="mt-2 text-sm text-slate-500">Open the PDF designer to adjust branding, layout, and final preview output for the clinic forms.</p>
                            </div>
                            <button
                              onClick={() => {
                                setSystemSettingsTab('pdf');
                                setSystemSettingsView('pdf');
                              }}
                              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
                            >
                              Open
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                          <h3 className="text-lg font-semibold text-slate-900">Form Brand Editors</h3>
                          <p className="mt-2 text-sm text-slate-500">Upload logos and tune page spacing for the consent and certificate PDFs.</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button onClick={() => setSystemSettingsTab('certificateForm')} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
                              Certificate
                            </button>
                            <button onClick={() => setSystemSettingsTab('consentForm')} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200">
                              Consent
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {systemSettingsTab === 'doctors' && (
                    <DoctorsRegistryModule
                      doctors={doctors}
                      onSaveDoctors={saveDoctorsRegistry}
                      isSavingDoctors={isSavingDoctors}
                      doctorDbStatus={doctorDbStatus}
                    />
                  )}

                  {systemSettingsTab === 'pdf' && (
                    <div className="space-y-6 pb-12">
                      {systemSettingsView === 'overview' ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-4">
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                <Settings size={24} />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-semibold text-slate-900">Modify PDF</h3>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Open</span>
                                </div>
                                <p className="mt-2 text-sm text-slate-500">Adjust the printable PDF layout and preview the exact format before generating the file.</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setSystemSettingsView('pdf')}
                              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">System Settings</div>
                              <h2 className="mt-1 text-xl font-semibold text-slate-900">Modify PDF</h2>
                              <p className="text-sm text-slate-500">Edit the template on the left and inspect the live printable output on the right.</p>
                            </div>
                            <button
                              onClick={() => setSystemSettingsView('overview')}
                              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <ArrowLeft size={16} className="mr-2" />
                              Back
                            </button>
                          </div>

                          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
                            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                              <CustomizeModule settings={settings} setSettings={setSettings} onSaveSettings={saveTemplateSettings} isSavingTemplate={isSavingTemplate} doctors={doctors} />
                            </div>
                            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100/70 p-5 shadow-sm">
                              <div className="mb-4 flex items-center justify-between">
                                <div>
                                  <h3 className="text-lg font-semibold text-slate-900">PDF Format Preview</h3>
                                  <p className="text-sm text-slate-500">Switch pages below to review how the exported document will look.</p>
                                </div>
                              </div>
                              <div className="max-h-[calc(100vh-240px)] overflow-auto rounded-2xl border border-slate-200 bg-slate-200/60 p-3">
                                <LivePreviewContainer data={patientData} settings={settings} />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {systemSettingsTab === 'certificateForm' && (
                    <DocumentFormDesigner
                      documentType="certificate"
                      settings={settings}
                      setSettings={setSettings}
                      onSaveSettings={saveTemplateSettings}
                      isSavingTemplate={isSavingTemplate}
                      data={patientData}
                    />
                  )}

                  {systemSettingsTab === 'consentForm' && (
                    <DocumentFormDesigner
                      documentType="consent"
                      settings={settings}
                      setSettings={setSettings}
                      onSaveSettings={saveTemplateSettings}
                      isSavingTemplate={isSavingTemplate}
                      data={patientData}
                    />
                  )}
                </div>
              )}
              {activeTab === 'preview' && <div className="mx-auto w-full max-w-[1500px]"><LivePreviewContainer data={patientData} settings={settings} /></div>}
            </div>
          </main>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.type === 'archive' ? 'Archive Patient Record' : 'Restore Patient Record'}
        message={
          confirmAction
            ? confirmAction.type === 'archive'
              ? `Archive ${confirmAction.record.record_name || 'this patient record'}? You can retrieve it later from Archived Records.`
              : `Restore ${confirmAction.record.record_name || 'this patient record'} to the active patient list?`
            : ''
        }
        confirmLabel={confirmAction?.type === 'archive' ? 'Archive' : 'Restore'}
        confirmTone={confirmAction?.type === 'archive' ? 'danger' : 'success'}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const pendingAction = confirmAction;
          setConfirmAction(null);
          if (!pendingAction) return;
          if (pendingAction.type === 'archive') {
            archivePatientRecord(pendingAction.record);
            return;
          }
          restorePatientRecord(pendingAction.record);
        }}
      />

      <ToastNotice open={toast.open} tone={toast.tone} message={toast.message} />

      {/* Hidden container for pure printing */}
      <div className="absolute left-[-10000px] top-[-10000px] print:static print:left-auto print:top-auto print:block print:w-full print:h-full print:z-[9999] print:bg-white overflow-hidden">
        <div id="pdf-export-container" className={`print-export-document ${printExportMode === 'record' ? 'is-print-target' : ''}`}>
          {settings.printPatientForm && <PatientFormPage data={patientData} settings={settings} />}
          {settings.printDentalChart && (
            <div className={settings.printPatientForm ? 'page-break' : ''}>
              <DentalChartPage data={patientData} settings={settings} />
            </div>
          )}
          {settings.printTreatmentRecord && (
            <div className={(settings.printPatientForm || settings.printDentalChart) ? 'page-break' : ''}>
              <TreatmentRecordPages data={patientData} settings={settings} />
            </div>
          )}
        </div>
        <div id="certificate-pdf-export-container" className={`print-export-document ${printExportMode === 'certificate' ? 'is-print-target' : ''}`}>
          <CertificateFormPage data={patientData} settings={settings} />
        </div>
        <div id="consent-pdf-export-container" className={`print-export-document ${printExportMode === 'consent' ? 'is-print-target' : ''}`}>
          <ConsentFormPage data={patientData} settings={settings} />
        </div>
        <div id="contract-pdf-export-container" className={`print-export-document ${printExportMode === 'contract' ? 'is-print-target' : ''}`}>
          <PatientContractPages data={patientData} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODULE 1: FORM INPUT SYSTEM
// ============================================================================
const FormInput = ({ label, field, data, handleChange, type = 'text', width = 'w-full' }) => (
  <div className={`${width}`}>
    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">{label}</label>
    <input type={type} value={data[field] || ''} onChange={(e) => handleChange(field, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white" />
  </div>
);

const FormSelect = ({ label, field, data, handleChange, options, width = 'w-full' }) => (
  <div className={`${width}`}>
    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">{label}</label>
    <select value={data[field] || ''} onChange={(e) => handleChange(field, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white">
      <option value="">Select...</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

function FormModule({ data, setData }) {
  const handleChange = (field, value) => setData(prev => ({ ...prev, [field]: value }));
  const handleNested = (category, field, value) => setData(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } }));

  const handleBirthDateChange = (field, val) => {
    handleChange('birthDate', val);
    if (val) {
      const today = new Date();
      const birthDate = new Date(val);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      handleChange('age', age >= 0 ? age.toString() : '');
    } else {
      handleChange('age', '');
    }
  };

  const handlePatientPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleChange('patientPhoto', reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-[1560px] mx-auto space-y-8 pb-12">
      <div className="mb-6"><h2 className="text-2xl font-bold text-slate-900">Patient Registration</h2></div>

      <SectionCard title="1. Patient Information">
        <div className="mb-6 flex flex-col sm:flex-row gap-6 items-start bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="w-28 h-28 bg-white border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center overflow-hidden shrink-0">
            {data.patientPhoto ? <img src={data.patientPhoto} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300" size={32} />}
          </div>
          <div className="flex flex-col space-y-3 pt-2">
            <div><h3 className="text-sm font-semibold text-slate-800">Patient 2x2 Photo</h3></div>
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer flex items-center bg-white border border-slate-300 px-3 py-1.5 rounded-md text-sm hover:bg-slate-100 shadow-sm"><Upload size={14} className="mr-2" /> Upload Image<input type="file" accept="image/*" className="hidden" onChange={handlePatientPhotoUpload} /></label>
              <label className="cursor-pointer flex items-center bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-md text-sm hover:bg-blue-100 shadow-sm"><Camera size={14} className="mr-2" /> Take Photo<input type="file" accept="image/*" capture="user" className="hidden" onChange={handlePatientPhotoUpload} /></label>
            </div>
            {data.patientPhoto && <button onClick={() => handleChange('patientPhoto', '')} className="text-xs text-red-500 underline w-max">Remove Photo</button>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormInput label="Last Name" field="lastName" data={data} handleChange={handleChange} />
          <FormInput label="First Name" field="firstName" data={data} handleChange={handleChange} />
          <FormInput label="Middle Name" field="middleName" data={data} handleChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <FormInput label="Nickname" field="nickname" data={data} handleChange={handleChange} />
          <FormInput label="Birth Date" field="birthDate" type="date" data={data} handleChange={handleBirthDateChange} />
          <FormInput label="Age" field="age" type="number" data={data} handleChange={handleChange} />
          <FormSelect label="Sex" field="sex" data={data} handleChange={handleChange} options={['M', 'F']} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormInput label="Religion" field="religion" data={data} handleChange={handleChange} />
          <FormInput label="Nationality" field="nationality" data={data} handleChange={handleChange} />
          <FormSelect label="Civil Status" field="civilStatus" data={data} handleChange={handleChange} options={['Single', 'Married', 'Widowed', 'Separated']} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormInput label="Home Address" field="address" width="md:col-span-2" data={data} handleChange={handleChange} />
          <FormInput label="Tel. No/s." field="contact" data={data} handleChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormInput label="Company" field="company" data={data} handleChange={handleChange} />
          <FormInput label="Occupation" field="occupation" data={data} handleChange={handleChange} />
          <FormInput label="Office No/s." field="officeContact" data={data} handleChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormInput label="Dental Insurance" field="dentalInsurance" width="md:col-span-2" data={data} handleChange={handleChange} />
          <FormInput label="Fax No/s." field="fax" data={data} handleChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormInput label="Effective Date" field="effectiveDate" type="date" width="md:col-span-2" data={data} handleChange={handleChange} />
          <FormInput label="Mobile No/s." field="mobile" data={data} handleChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormInput label="Email Add." field="email" width="md:col-span-3" data={data} handleChange={handleChange} />
        </div>
      </SectionCard>

      <SectionCard title="2. Minor / Referral Details">
        <div className="space-y-4">
          <FormInput label="Parent / Guardian's Name (for minors)" field="parentGuardian" data={data} handleChange={handleChange} />
          <FormInput label="Whom may we thank for referring you?" field="referral" data={data} handleChange={handleChange} />
          <FormInput label="What is your reason for dental consultation?" field="dentalReason" data={data} handleChange={handleChange} />
        </div>
      </SectionCard>

      <SectionCard title="3. Dental & Medical History">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FormInput label="Previous Dentist" field="previousDentist" data={data} handleChange={handleChange} />
          <FormInput label="Last Dental Visit" field="lastVisit" type="date" data={data} handleChange={handleChange} />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FormInput label="Physician's Name" field="physicianName" data={data} handleChange={handleChange} />
          <FormInput label="Specialty, if applicable" field="physicianSpecialty" data={data} handleChange={handleChange} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Office Address" field="physicianAddress" data={data} handleChange={handleChange} />
          <FormInput label="Office No/s." field="physicianContact" data={data} handleChange={handleChange} />
        </div>
      </SectionCard>

      <SectionCard title="4. Medical Questions">
        <div className="space-y-4">
          {MEDICAL_QUESTIONS.map((q) => (
            <div key={q.id} className="py-3 border-b border-slate-100 last:border-0 flex flex-col">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">{q.text}</span>
                <div className="flex space-x-4">
                  <label className="flex items-center text-sm"><input type="radio" name={q.id} checked={data.questions[q.id] === true} onChange={() => handleNested('questions', q.id, true)} className="mr-1" /> Yes</label>
                  <label className="flex items-center text-sm"><input type="radio" name={q.id} checked={data.questions[q.id] === false} onChange={() => handleNested('questions', q.id, false)} className="mr-1" /> No</label>
                </div>
              </div>
              {data.questions[q.id] !== undefined && (
                <div className="mt-2 pl-4"><input type="text" placeholder="Optional comment / specify details..." className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-slate-50 outline-none" value={data.questionDetails?.[q.id] || ''} onChange={(e) => handleNested('questionDetails', q.id, e.target.value)} /></div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="5. Health Details & Allergies">
        <label className="block text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">Are you allergic to any of the following?</label>
        <div className="flex flex-wrap gap-4 mb-6">
          {['penicillin', 'latex', 'aspirin', 'sulfa', 'local anesthetic'].map(allergy => (
            <label key={allergy} className="flex items-center capitalize text-sm"><input type="checkbox" checked={data.allergies[allergy] || false} onChange={e => handleNested('allergies', allergy, e.target.checked)} className="mr-2 rounded text-blue-600" />{allergy}</label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormSelect label="Blood Type" field="bloodType" data={data} handleChange={handleChange} options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']} />
          <FormInput label="Blood Pressure" field="bloodPressure" data={data} handleChange={handleChange} />
        </div>
      </SectionCard>

      {data.sex === 'F' && (
        <SectionCard title="6. For Women Only">
          <div className="flex flex-col sm:flex-row sm:space-x-8 space-y-2 sm:space-y-0">
            <label className="flex items-center text-sm"><input type="checkbox" checked={data.womenOnly.pregnant} onChange={e => handleNested('womenOnly', 'pregnant', e.target.checked)} className="mr-2" /> Are you pregnant?</label>
            <label className="flex items-center text-sm"><input type="checkbox" checked={data.womenOnly.nursing} onChange={e => handleNested('womenOnly', 'nursing', e.target.checked)} className="mr-2" /> Are you nursing?</label>
            <label className="flex items-center text-sm"><input type="checkbox" checked={data.womenOnly.birthControl} onChange={e => handleNested('womenOnly', 'birthControl', e.target.checked)} className="mr-2" /> Taking birth control pills?</label>
          </div>
        </SectionCard>
      )}

      <SectionCard title="7. Medical Conditions Checklist">
        <p className="text-xs text-slate-500 mb-4">Check all that apply.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
          {CONDITIONS.map((condition) => (
            <label key={condition} className="flex items-start space-x-2">
              <input type="checkbox" checked={data.conditions[condition] || false} onChange={e => handleNested('conditions', condition, e.target.checked)} className="mt-1 rounded text-blue-600 focus:ring-blue-500" />
              <span className="text-sm leading-tight text-slate-700">{condition}</span>
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="8. Signature & Consent">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="Signature / Printed Name" field="signatureName" data={data} handleChange={handleChange} />
          <FormInput label="Date" field="signatureDate" type="date" data={data} handleChange={handleChange} />
        </div>
      </SectionCard>
    </div>
  );
}

const SectionCard = ({ title, children, className = "" }: { title?: ReactNode; children?: ReactNode; className?: string }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {title && <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">{title}</h3>}
    {children}
  </div>
);

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  confirmTone = 'danger',
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmTone?: 'danger' | 'success';
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-slate-600">{message}</p>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onCancel} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${confirmTone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const ToastNotice = ({
  open,
  tone,
  message,
}: {
  open: boolean;
  tone: 'success' | 'error';
  message: string;
}) => {
  if (!open || !message) return null;

  return (
    <div className="fixed right-4 top-4 z-[80] max-w-sm rounded-2xl shadow-xl">
      <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
        {message}
      </div>
    </div>
  );
};

// ============================================================================
// MODULE 1B: DENTAL CHARTING SYSTEM
// ============================================================================
const ToothSurfaceSVG = ({ toothId, surfaces, onSurfaceClick, isInteractive, className = 'h-[42px] w-[42px]', strokeColor = '#94a3b8', strokeWidth = 2 }: any) => {
  const getFill = (surface: keyof typeof surfaces) => SURFACE_COLORS[(surfaces?.[surface] || 'null') as keyof typeof SURFACE_COLORS] || SURFACE_COLORS.null;
  const handleClick = (event: any, surface: string) => {
    event.stopPropagation();
    if (isInteractive && onSurfaceClick) onSurfaceClick(toothId, surface);
  };

  return (
    <svg viewBox="0 0 100 100" className={`${className} shrink-0`}>
      <path d="M 16 16 A 48 48 0 0 1 84 16 L 50 50 Z" fill={getFill('top')} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" className={isInteractive ? 'cursor-pointer hover:opacity-80' : ''} onClick={(e) => handleClick(e, 'top')} />
      <path d="M 84 16 A 48 48 0 0 1 84 84 L 50 50 Z" fill={getFill('right')} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" className={isInteractive ? 'cursor-pointer hover:opacity-80' : ''} onClick={(e) => handleClick(e, 'right')} />
      <path d="M 84 84 A 48 48 0 0 1 16 84 L 50 50 Z" fill={getFill('bottom')} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" className={isInteractive ? 'cursor-pointer hover:opacity-80' : ''} onClick={(e) => handleClick(e, 'bottom')} />
      <path d="M 16 84 A 48 48 0 0 1 16 16 L 50 50 Z" fill={getFill('left')} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" className={isInteractive ? 'cursor-pointer hover:opacity-80' : ''} onClick={(e) => handleClick(e, 'left')} />
      <circle cx="50" cy="50" r="18" fill={getFill('center')} stroke={strokeColor} strokeWidth={strokeWidth} className={isInteractive ? 'cursor-pointer hover:opacity-80' : ''} onClick={(e) => handleClick(e, 'center')} />
    </svg>
  );
};

const ToothInfoBox = ({ toothId, toothEntry, mode, onBoxClick, bStyle = 'border-slate-300' }: any) => {
  const flatTags = getToothFlatTags(toothEntry).slice(0, 4);
  return (
    <div
      id={`box-${toothId}`}
      onClick={(event) => mode === 'INLINE' && onBoxClick?.(event, toothId)}
      className={`h-[42px] w-[42px] shrink-0 rounded-[4px] border-2 ${bStyle} ${mode === 'INLINE' ? 'grid cursor-pointer grid-cols-2 grid-rows-2 gap-[1px] overflow-hidden bg-slate-200 hover:border-cyan-400' : 'bg-white'}`}
    >
      {mode === 'INLINE' && [0, 1, 2, 3].map((index) => (
        <div key={`${toothId}-${index}`} className="flex items-center justify-center overflow-hidden bg-white text-[9px] font-bold text-slate-700">
          {flatTags[index] || ''}
        </div>
      ))}
    </div>
  );
};

const InlineProcedurePopup = ({ isOpen, onClose, popupToothId, toothEntry, anchorElement, onToggleTag }: any) => {
  const popupRef = useRef<any>(null);
  const [style, setStyle] = useState({ top: -9999, left: -9999, opacity: 0 });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const handleOutsideClick = (event: MouseEvent) => {
      if (popupRef.current?.contains(event.target)) return;
      if ((event.target as HTMLElement)?.closest('.tooth-cell-container')) return;
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  useLayoutEffect(() => {
    if (!isOpen || !popupToothId || !popupRef.current || !anchorElement) return;
    const updatePosition = () => {
      if (!popupRef.current || !anchorElement?.isConnected) return;
      const anchorRect = anchorElement.getBoundingClientRect();
      const popupRect = popupRef.current.getBoundingClientRect();

      const gutter = 12;
      const viewportPadding = 12;
      const availableRight = window.innerWidth - anchorRect.right;
      const availableLeft = anchorRect.left;

      let left = anchorRect.right + gutter;
      if (availableRight < popupRect.width + viewportPadding && availableLeft >= popupRect.width + gutter) {
        left = anchorRect.left - popupRect.width - gutter;
      }

      let top = anchorRect.top + (anchorRect.height / 2) - (popupRect.height / 2);
      const maxLeft = Math.max(viewportPadding, window.innerWidth - popupRect.width - viewportPadding);
      const maxTop = Math.max(viewportPadding, window.innerHeight - popupRect.height - viewportPadding);

      left = Math.min(Math.max(left, viewportPadding), maxLeft);
      top = Math.min(Math.max(top, viewportPadding), maxTop);

      setStyle({ top, left, opacity: 1 });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorElement, isOpen, popupToothId]);

  if (!isOpen || !popupToothId) return null;

  const flatTags = getToothFlatTags(toothEntry);
  return (
    <div ref={popupRef} style={{ position: 'fixed', top: style.top, left: style.left, opacity: style.opacity, zIndex: 60 }} className="w-[280px] rounded-lg border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      <div className="flex items-center justify-between rounded-t-lg bg-slate-800 px-3 py-2 text-white">
        <div>
          <div className="text-xs font-bold">Procedures & Tags</div>
          <div className="text-[10px] text-slate-300">Tooth {popupToothId} • Tags {flatTags.length}/4</div>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-white">×</button>
      </div>
      <div className="max-h-[350px] overflow-y-auto p-3">
        {Object.entries(DENTAL_CHART_PROCEDURES).map(([category, items]) => (
          <div key={category} className="mb-4 last:mb-0">
            <h3 className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{category}</h3>
            <div className="flex flex-wrap gap-1.5">
              {items.map((item) => {
                const currentValues = getToothCategoryValues(toothEntry, category as keyof typeof TOOTH_CATEGORY_FIELD_MAP);
                const isActive = currentValues.includes(item);
                const isDisabled = !isActive && flatTags.length >= 4;
                return (
                  <button key={`${category}-${item}`} onClick={() => onToggleTag(category, item)} disabled={isDisabled} className={`rounded border px-2 py-1 text-[10px] font-bold transition-colors ${isActive ? 'border-cyan-600 bg-cyan-600 text-white' : isDisabled ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300' : 'border-slate-300 bg-white text-slate-600 hover:border-cyan-400 hover:bg-cyan-50'}`}>
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ToothCell = ({ toothId, layout, toothEntry, isActive, mode, onToothClick, onBoxClick, onSurfaceClick, allowSurfaceClick }: any) => {
  if (!toothId) return <div className="h-[110px] w-[52px]" />;

  return (
    <div className={`tooth-cell-container flex h-[110px] w-[52px] cursor-pointer flex-col items-center justify-between rounded p-1 transition-colors ${isActive ? 'bg-cyan-50 ring-2 ring-cyan-500' : 'hover:bg-slate-50'}`} onClick={() => onToothClick(toothId)}>
      {layout === 'top' && <ToothInfoBox toothId={toothId} toothEntry={toothEntry} mode={mode} onBoxClick={onBoxClick} />}
      <span className="select-none text-xs font-bold text-slate-700">{toothId}</span>
      <ToothSurfaceSVG toothId={toothId} surfaces={toothEntry?.surfaces} onSurfaceClick={onSurfaceClick} isInteractive={allowSurfaceClick} />
      {layout === 'bottom' && <ToothInfoBox toothId={toothId} toothEntry={toothEntry} mode={mode} onBoxClick={onBoxClick} />}
    </div>
  );
};

function DentalLegendGuide() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">Clinical Legend / Meaning Guide</h3>
        <p className="mt-1 text-xs text-slate-500">
          Reference guide for the clinic&apos;s preferred dental chart notation.
        </p>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-3">
        {DENTAL_CHART_LEGEND_GUIDE.map((group) => (
          <section key={group.title} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h4 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</h4>
            <div className="space-y-2.5">
              {group.items.map((item) => (
                <div key={`${group.title}-${item.code}`} className="grid grid-cols-[minmax(76px,auto)_1fr] items-start gap-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-slate-200">
                  <span className="text-xs font-bold text-slate-900">{item.code}</span>
                  <span className="text-xs leading-5 text-slate-600">{item.meaning}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function DentalRecordLegendColumns({ print = false }: { print?: boolean }) {
  // PDF LEGEND TEXT KNOBS:
  // text-[8.5px] controls legend font size in Download PDF only.
  // leading-[1.32] and py-[1.5px] add row breathing room between legend items.
  const baseText = print ? 'text-[8.5px] leading-[1.32]' : 'text-xs leading-5';
  const titleText = print ? 'text-[8.5px]' : 'text-xs';

  return (
    <>
      {DENTAL_RECORD_LEGEND_COLUMNS.map((group) => (
        <section key={group.title} className={print ? '' : 'rounded-lg border border-slate-200 bg-slate-50 p-4'}>
          <h4 className={`${titleText} mb-1 font-black`}>{group.title}</h4>
          <div className={baseText}>
            {group.items.map((item) => (
              <div
                key={`${group.title}-${item.code}`}
                className={print ? 'grid grid-cols-[28px_1fr] gap-x-3 py-[1.5px]' : 'grid grid-cols-[24px_1fr] gap-1'}
              >
                <span className="font-black">{item.code}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

// EDITOR / SYSTEM VIEW ONLY:
// Adjust this component when you want to change what appears on the Dental Chart tab in the app.
// Changes here affect the on-screen editor controls, not the downloadable PDF layout.
function DentalRecordRevisionEditor({ data, handleChartChange, handleNested, doctors }: any) {
  const chart = data.dentalChart || {};
  const recommendationPlan = chart.recommendationPlan || {};
  const xrayTaken = chart.xrayTaken || {};
  const remarksStatus = chart.remarks?.status || '';

  const setRecommendation = (field: string, value: boolean | string) => handleNested('recommendationPlan', field, value);
  const setXray = (field: string, value: boolean | string) => handleNested('xrayTaken', field, value);
  const setRemarksStatus = (value: string) => handleNested('remarks', 'status', remarksStatus === value ? '' : value);

  return (
    /* Editor layout controls:
       - mt-6 moves this whole editor footer section closer/farther from the tooth chart on screen.
       - space-y-4 changes the vertical gap between editor cards.
       - SectionCard blocks below are editor-only panels. */
    <div className="mt-6 space-y-4">
      <SectionCard title="Dental Record Legend">
        <div className="grid gap-4 lg:grid-cols-4">
          <DentalRecordLegendColumns />
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="mb-1 text-xs font-black">X-ray Taken</h4>
            <div className="space-y-2 text-xs leading-5">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!xrayTaken.periapical} onChange={(e) => setXray('periapical', e.target.checked)} />
                <span>Periapical Taken</span>
              </label>
              <label className="flex items-center gap-2 pl-5">
                <span className="whitespace-nowrap">Tth no.</span>
                <input value={xrayTaken.periapicalToothNo || ''} onChange={(e) => setXray('periapicalToothNo', e.target.value)} className="w-24 border-b border-slate-300 bg-transparent px-1 outline-none" />
              </label>
              {[
                ['panoramic', 'Panoramic'],
                ['cephalometric', 'Cephalometric'],
                ['occlusalUpperLower', 'Occlusal (Upper/Lower)'],
                ['others', 'Others'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" checked={!!xrayTaken[key]} onChange={(e) => setXray(key, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
              <input value={xrayTaken.othersText || ''} onChange={(e) => setXray('othersText', e.target.value)} placeholder="Other X-ray note" className="w-full border-b border-slate-300 bg-transparent px-1 py-1 text-xs outline-none" />
            </div>
          </section>
        </div>
      </SectionCard>

      <SectionCard title="Recommendation">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            {DENTAL_RECORD_RECOMMENDATIONS.map((item) => (
              <label key={item.key} className="flex items-center gap-2 text-xs font-semibold">
                <input type="checkbox" checked={!!recommendationPlan[item.key]} onChange={(e) => setRecommendation(item.key, e.target.checked)} />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <div className="space-y-3 text-xs font-semibold">
            <label className="grid grid-cols-[82px_1fr] items-center gap-3">
              <span>TOOTH #</span>
              <input value={recommendationPlan.restorativeFillingToothNo || ''} onChange={(e) => setRecommendation('restorativeFillingToothNo', e.target.value)} className="border-b border-slate-300 bg-transparent px-1 py-1 outline-none" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!recommendationPlan.restorativeFilling} onChange={(e) => setRecommendation('restorativeFilling', e.target.checked)} />
              <span>RESTORATIVE FILLING</span>
            </label>
            <label className="grid grid-cols-[82px_1fr] items-center gap-3">
              <span>TOOTH #</span>
              <input value={recommendationPlan.toothExtractionToothNo || ''} onChange={(e) => setRecommendation('toothExtractionToothNo', e.target.value)} className="border-b border-slate-300 bg-transparent px-1 py-1 outline-none" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!recommendationPlan.toothExtraction} onChange={(e) => setRecommendation('toothExtraction', e.target.checked)} />
              <span>TOOTH EXTRACTION</span>
            </label>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Remarks & Sign-off">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Remarks</div>
            <div className="flex flex-wrap gap-4">
              {DENTAL_RECORD_REMARK_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-xs font-semibold">
                  <input type="radio" checked={remarksStatus === option.value} onChange={() => setRemarksStatus(option.value)} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Checked By</label>
              {doctors.length > 0 ? (
                <select value={chart.checkedBy || ''} onChange={(e) => handleChartChange('checkedBy', e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 sm:text-sm">
                  <option value="">Select dentist...</option>
                  {doctors.map((doctor: any) => <option key={doctor.id} value={doctor.name}>{doctor.name}</option>)}
                </select>
              ) : (
                <input type="text" value={chart.checkedBy || ''} onChange={(e) => handleChartChange('checkedBy', e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 sm:text-sm" placeholder="Dr. Name" />
              )}
            </div>
            <FormInput label="Date" field="chartDate" type="date" data={chart} handleChange={(field: string, value: string) => handleChartChange(field, value)} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function DentalChartModule({ data, setData, doctors }: { data: any; setData: any; doctors: any; favoriteStatuses?: string[]; setFavoriteStatuses?: any }) {
  const [chartMode, setChartMode] = useState<'INLINE' | 'MULTIPLE'>('INLINE');
  const [inlineActiveTool, setInlineActiveTool] = useState<'CAVITY' | 'PASTA' | 'CLEAR'>('CAVITY');
  const [multipleActiveTool, setMultipleActiveTool] = useState<'CAVITY' | 'PASTA' | 'CLEAR'>('CAVITY');
  const [activeToothId, setActiveToothId] = useState<string | null>(null);
  const [inlinePopupToothId, setInlinePopupToothId] = useState<string | null>(null);
  const [inlinePopupAnchor, setInlinePopupAnchor] = useState<HTMLElement | null>(null);
  const [currentRowIndex, setCurrentRowIndex] = useState<number | null>(null);
  const [editMultiple, setEditMultiple] = useState(false);
  const [selectedToothIds, setSelectedToothIds] = useState<string[]>([]);

  const handleNested = (cat: string, field: string, value: any) => {
    setData((prev: any) => ({ ...prev, dentalChart: { ...prev.dentalChart, [cat]: { ...prev.dentalChart[cat], [field]: value } } }));
  };

  const handleChartChange = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, dentalChart: { ...prev.dentalChart, [field]: value } }));
  };

  const updateToothEntries = (toothIds: string[], updater: (entry: any) => any) => {
    setData((prev: any) => {
      const nextTeeth = { ...prev.dentalChart.teeth };
      toothIds.forEach((toothId) => {
        nextTeeth[toothId] = updater(normalizeToothChartEntry(toothId, nextTeeth[toothId]));
      });
      return { ...prev, dentalChart: { ...prev.dentalChart, teeth: nextTeeth } };
    });
  };

  const applySurfaceTool = (toothIds: string[], surface: string, tool: 'CAVITY' | 'PASTA' | 'CLEAR') => {
    const nextValue = tool === 'CAVITY' ? 'cavity' : tool === 'PASTA' ? 'pasta' : null;
    updateToothEntries(toothIds, (entry) => ({ ...entry, surfaces: { ...entry.surfaces, [surface]: nextValue } }));
  };

  const handleInlineSurfaceClick = (toothId: string, surface: string) => {
    setActiveToothId(toothId);
    setInlinePopupToothId(null);
    setInlinePopupAnchor(null);
    applySurfaceTool([toothId], surface, inlineActiveTool);
  };

  const handleInlineBoxClick = (event: any, toothId: string) => {
    event.stopPropagation();
    setActiveToothId(toothId);
    if (inlinePopupToothId === toothId) {
      setInlinePopupToothId(null);
      setInlinePopupAnchor(null);
      return;
    }
    setInlinePopupAnchor(event.currentTarget as HTMLElement);
    setInlinePopupToothId(toothId);
  };

  const handleInlineTagToggle = (category: string, item: string) => {
    if (!inlinePopupToothId) return;
    updateToothEntries([inlinePopupToothId], (entry) => {
      const currentValues = getToothCategoryValues(entry, category as keyof typeof TOOTH_CATEGORY_FIELD_MAP);
      const isActive = currentValues.includes(item);
      const flatTags = getToothFlatTags(entry);
      if (!isActive && flatTags.length >= 4) return entry;
      const nextValues = isActive ? currentValues.filter((value: string) => value !== item) : [...currentValues, item];
      return setToothCategoryValues(entry, category as keyof typeof TOOTH_CATEGORY_FIELD_MAP, nextValues);
    });
  };

  const handleMultipleToothClick = (toothId: string) => {
    const rowIndex = DENTAL_CHART_ROWS.findIndex((row) => (row.teeth as readonly (string | null)[]).includes(toothId));
    setCurrentRowIndex(rowIndex);
    setInlinePopupToothId(null);
    setActiveToothId(toothId);
    setSelectedToothIds((prev) => {
      const rowToothIds = DENTAL_CHART_ROWS[rowIndex].teeth.filter(Boolean) as string[];
      const rowSelections = prev.filter((id) => rowToothIds.includes(id));
      if (!editMultiple) return [toothId];
      return rowSelections.includes(toothId) ? rowSelections.filter((id) => id !== toothId) : [...rowSelections, toothId];
    });
  };

  const handleMultipleTagToggle = (category: string, item: string) => {
    if (selectedToothIds.length === 0) return;
    const firstEntry = data.dentalChart.teeth[selectedToothIds[0]];
    const isActive = getToothCategoryValues(firstEntry, category as keyof typeof TOOTH_CATEGORY_FIELD_MAP).includes(item);
    updateToothEntries(selectedToothIds, (entry) => {
      const currentValues = getToothCategoryValues(entry, category as keyof typeof TOOTH_CATEGORY_FIELD_MAP);
      const nextValues = isActive ? currentValues.filter((value: string) => value !== item) : [...currentValues, item];
      return setToothCategoryValues(entry, category as keyof typeof TOOTH_CATEGORY_FIELD_MAP, nextValues);
    });
  };

  const handleSummaryChange = (value: string) => {
    if (selectedToothIds.length === 0) return;
    updateToothEntries(selectedToothIds, (entry) => ({ ...entry, summary: value }));
  };

  const selectedRow = currentRowIndex === null ? null : DENTAL_CHART_ROWS[currentRowIndex];
  const selectedToothEntries = selectedToothIds.map((toothId) => data.dentalChart.teeth[toothId]).filter(Boolean);
  const aggregatedSurfaces = selectedToothEntries[0]?.surfaces || createDefaultToothChartEntry('reference').surfaces;
  const currentSummary = selectedToothEntries[0]?.summary || '';
  const visibleRows = chartMode === 'MULTIPLE' && currentRowIndex !== null ? [DENTAL_CHART_ROWS[currentRowIndex]] : DENTAL_CHART_ROWS;

  useEffect(() => {
    if (chartMode === 'INLINE') {
      setCurrentRowIndex(null);
      setSelectedToothIds([]);
      setEditMultiple(false);
    } else {
      setInlinePopupToothId(null);
      setInlinePopupAnchor(null);
    }
  }, [chartMode]);

  return (
    <div className="w-full max-w-[1660px] mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Clinical Dental Chart</h2>
        <p className="text-sm text-slate-500">Inline single-tooth charting plus row-focused multiple-selection editing.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setChartMode('INLINE')} className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${chartMode === 'INLINE' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>Inline Surfaces</button>
          <button onClick={() => setChartMode('MULTIPLE')} className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${chartMode === 'MULTIPLE' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>Charting w/ Multiple Selection</button>
        </div>
      </div>

      {chartMode === 'INLINE' && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {[
            { id: 'CAVITY', label: 'Cavity', dot: 'bg-red-500' },
            { id: 'PASTA', label: 'OK/Pasta', dot: 'bg-blue-500' },
            { id: 'CLEAR', label: 'Clear', dot: 'border border-slate-400 bg-white' },
          ].map((tool) => (
            <button key={tool.id} onClick={() => setInlineActiveTool(tool.id as any)} className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${inlineActiveTool === tool.id ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              <span className={`h-3 w-3 rounded-full ${tool.dot}`}></span>{tool.label}
            </button>
          ))}
        </div>
      )}

      {chartMode === 'MULTIPLE' && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <button onClick={() => { setCurrentRowIndex((prev) => prev === null || prev === 0 ? DENTAL_CHART_ROWS.length - 1 : prev - 1); setSelectedToothIds([]); }} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Prev</button>
          <button onClick={() => { setEditMultiple((prev) => !prev); if (editMultiple) setSelectedToothIds([]); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${editMultiple ? 'bg-emerald-100 text-emerald-800' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>Edit Multiple</button>
          <button onClick={() => { setCurrentRowIndex(null); setSelectedToothIds([]); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${currentRowIndex === null ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>View Chart</button>
          <button onClick={() => { setCurrentRowIndex((prev) => prev === null || prev === DENTAL_CHART_ROWS.length - 1 ? 0 : prev + 1); setSelectedToothIds([]); }} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Next</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto flex min-w-[1080px] max-w-[1240px] flex-col gap-6">
          {visibleRows.map((row) => (
            <div key={row.index} className="space-y-3">
              {chartMode === 'MULTIPLE' && currentRowIndex !== null && <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{row.label}</div>}
              <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-2">
                {row.teeth.map((toothId, index) => {
                  const entry = toothId ? data.dentalChart.teeth[toothId] : null;
                  const isActive = chartMode === 'INLINE' ? activeToothId === toothId : selectedToothIds.includes(toothId as string);
                  return (
                    <ToothCell
                      key={toothId || `${row.index}-empty-${index}`}
                      toothId={toothId}
                      layout={row.layout}
                      toothEntry={entry}
                      isActive={isActive}
                      mode={chartMode}
                      onToothClick={chartMode === 'INLINE' ? (tooth: string) => { setActiveToothId(tooth); setInlinePopupToothId(null); setInlinePopupAnchor(null); } : handleMultipleToothClick}
                      onBoxClick={handleInlineBoxClick}
                      onSurfaceClick={chartMode === 'INLINE' ? handleInlineSurfaceClick : undefined}
                      allowSurfaceClick={chartMode === 'INLINE'}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {chartMode === 'MULTIPLE' && selectedToothIds.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="grid gap-0 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
            <div className="border-r border-slate-200 bg-slate-50 p-6">
              <h3 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Tooth Status</h3>
              <div className="space-y-3">
                {[
                  { id: 'CAVITY', label: 'Cavity', dot: 'bg-red-500' },
                  { id: 'PASTA', label: 'OK/Pasta', dot: 'bg-blue-500' },
                  { id: 'CLEAR', label: 'Reset/Clear', dot: 'border border-slate-400 bg-white' },
                ].map((tool) => (
                  <button key={tool.id} onClick={() => setMultipleActiveTool(tool.id as any)} className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 font-bold transition-colors ${multipleActiveTool === tool.id ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                    <span className={`h-4 w-4 rounded-full ${tool.dot}`}></span>{tool.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border-r border-slate-200 p-6">
              <div className="self-start text-xs font-black uppercase tracking-[0.18em] text-slate-400">Selected Tooth</div>
              <div className="mb-4 self-start text-xl font-black text-cyan-700">{selectedToothIds.join(', ')}</div>
              <p className="mb-4 text-xs font-medium text-slate-500">Click a surface to apply {multipleActiveTool.toLowerCase()} to the selected tooth/teeth.</p>
              <ToothSurfaceSVG toothId="multiple-editor" surfaces={aggregatedSurfaces} onSurfaceClick={(_: string, surface: string) => applySurfaceTool(selectedToothIds, surface, multipleActiveTool)} isInteractive={true} className="h-[180px] w-[180px]" />
            </div>

            <div className="max-h-[420px] overflow-y-auto bg-slate-50 p-6">
              <h3 className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Summary</h3>
              <input value={currentSummary} onChange={(e) => handleSummaryChange(e.target.value)} placeholder="Enter condition notes..." className="mb-6 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
              {Object.entries(DENTAL_CHART_PROCEDURES).map(([category, items]) => {
                const activeValues = getToothCategoryValues(selectedToothEntries[0], category as keyof typeof TOOTH_CATEGORY_FIELD_MAP);
                return (
                  <div key={category} className="mb-6 last:mb-0">
                    <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{category}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((item) => (
                        <button key={`${category}-${item}`} onClick={() => handleMultipleTagToggle(category, item)} className={`rounded border px-2.5 py-1 text-xs font-bold transition-colors ${activeValues.includes(item) ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-400'}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* EDITOR / SYSTEM VIEW: this renders the lower dental-record controls inside the app only. */}
      <DentalRecordRevisionEditor data={data} handleChartChange={handleChartChange} handleNested={handleNested} doctors={doctors} />

      <InlineProcedurePopup isOpen={inlinePopupToothId !== null} onClose={() => { setInlinePopupToothId(null); setInlinePopupAnchor(null); }} popupToothId={inlinePopupToothId} toothEntry={inlinePopupToothId ? data.dentalChart.teeth[inlinePopupToothId] : null} anchorElement={inlinePopupAnchor} onToggleTag={handleInlineTagToggle} />
    </div>
  );
}

function LegacyDentalChartModule({ data, setData, favoriteStatuses, setFavoriteStatuses, doctors }) {
  const [activeTooth, setActiveTooth] = useState(null);
  const [paintMode, setPaintMode] = useState(null);

  const handleNested = (cat, field, value) => {
    setData(prev => ({ ...prev, dentalChart: { ...prev.dentalChart, [cat]: { ...prev.dentalChart[cat], [field]: value } } }));
  };
  const handleChartChange = (field, value) => {
    setData(prev => ({ ...prev, dentalChart: { ...prev.dentalChart, [field]: value } }));
  };
  const setToothCondition = (code) => {
    if (!activeTooth) return;
    setData(prev => ({ ...prev, dentalChart: { ...prev.dentalChart, teeth: { ...prev.dentalChart.teeth, [activeTooth]: code } } }));
  };

  const handleFavoriteClick = (code) => {
    if (paintMode === code) {
      setPaintMode(null);
      return;
    }
    if (activeTooth) {
      setToothCondition(code);
    } else {
      setPaintMode(code);
    }
  };

  const getLegendLabel = (code) => {
    for (const group of Object.values(CHART_LEGENDS)) {
      const item = group.find(l => l.code === code);
      if (item) return item.label;
    }
    return code;
  };

  const InteractiveTooth = ({ t }: { t: number }) => {
    const status = data.dentalChart.teeth[t] || '';
    const isActive = activeTooth === t;
    const isPaintTarget = paintMode && !isActive;

    return (
      <div onClick={() => {
        if (paintMode) {
          setData(prev => ({ ...prev, dentalChart: { ...prev.dentalChart, teeth: { ...prev.dentalChart.teeth, [t]: paintMode } } }));
          setActiveTooth(t);
        } else {
          setActiveTooth(t);
        }
      }} className={`flex flex-col items-center mx-[2px] cursor-pointer p-1 rounded transition-colors ${isActive ? 'bg-blue-100 ring-2 ring-blue-400' : isPaintTarget ? 'hover:bg-orange-100' : 'hover:bg-slate-100'}`}>
        <span className="text-[10px] font-bold text-slate-600 mb-0.5">{t}</span>
        <div className={`w-6 h-6 border border-slate-400 flex items-center justify-center bg-white shadow-sm text-xs font-bold ${status ? 'text-blue-700' : 'text-transparent'}`}>
          {status}
        </div>
        <div className="mt-1 w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center bg-slate-50">
          <div className="w-2.5 h-2.5 rounded-full border border-slate-400 bg-white"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1660px] mx-auto space-y-6 pb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Clinical Dental Chart</h2>
        <p className="text-slate-500 text-sm">Select a tooth to mark its condition based on the legend.</p>
      </div>

      <div className="grid grid-cols-1 min-[1450px]:grid-cols-[minmax(0,1.7fr)_360px] gap-6 items-start">
        {/* CHART GRID AREA */}
        <div className="w-full bg-white p-6 border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <div className="relative mx-auto flex w-full min-w-[1080px] max-w-[1240px] flex-col items-center pb-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Maxillary (Upper)</h4>
            <div className="absolute left-1/2 top-10 bottom-10 w-px bg-slate-300"></div>
            <div className="absolute top-1/2 left-4 right-4 h-px bg-slate-300"></div>
            <span className="absolute left-4 top-4 text-xs font-bold text-slate-400">RIGHT</span>
            <span className="absolute right-4 top-4 text-xs font-bold text-slate-400">LEFT</span>

            <div className="flex items-center space-x-4 mb-4 z-10 relative">
              <span className="absolute -left-24 text-[9px] font-bold text-slate-400 uppercase w-20 text-right pr-2">Temporary</span>
              <div className="flex">{TEMP_UPPER_RIGHT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
              <div className="w-2"></div>
              <div className="flex">{TEMP_UPPER_LEFT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
            </div>

            <div className="flex items-center space-x-4 mb-6 z-10 relative">
              <span className="absolute -left-24 text-[9px] font-bold text-slate-400 uppercase w-20 text-right pr-2">Permanent</span>
              <div className="flex">{PERM_UPPER_RIGHT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
              <div className="w-2"></div>
              <div className="flex">{PERM_UPPER_LEFT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
            </div>

            <div className="flex items-center space-x-4 mt-6 mb-4 z-10 relative">
              <span className="absolute -left-24 text-[9px] font-bold text-slate-400 uppercase w-20 text-right pr-2">Permanent</span>
              <div className="flex">{PERM_LOWER_RIGHT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
              <div className="w-2"></div>
              <div className="flex">{PERM_LOWER_LEFT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
            </div>

            <div className="flex items-center space-x-4 z-10 relative">
              <span className="absolute -left-24 text-[9px] font-bold text-slate-400 uppercase w-20 text-right pr-2">Temporary</span>
              <div className="flex">{TEMP_LOWER_RIGHT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
              <div className="w-2"></div>
              <div className="flex">{TEMP_LOWER_LEFT.map(t => <InteractiveTooth key={t} t={t} />)}</div>
            </div>

            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-8">Mandibular (Lower)</h4>
          </div>
        </div>

        {/* EDITOR SIDEBAR */}
        <div className="w-full xl:w-[340px] shrink-0 space-y-4">
          <div className="w-full bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm">
            <h3 className="font-bold text-blue-900 mb-2">Edit Tooth</h3>
            {activeTooth ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm">Tooth Selected: <strong className="text-lg bg-white px-2 py-0.5 rounded border border-blue-200">{activeTooth}</strong></div>
                  <button onClick={() => setActiveTooth(null)} className="text-[10px] text-slate-500 hover:text-slate-800 underline">Clear Selection</button>
                </div>
                <div className="text-xs font-semibold mb-2 uppercase text-slate-500">Set Condition:</div>
                <select
                  className="w-full p-2 text-sm border border-slate-300 rounded outline-none"
                  value={data.dentalChart.teeth[activeTooth] || ''}
                  onChange={(e) => setToothCondition(e.target.value)}
                >
                  <option value="">- Clear Status -</option>
                  <optgroup label="Condition">
                    {CHART_LEGENDS.condition.map(l => <option key={l.code} value={l.code}>{l.code} - {l.label}</option>)}
                  </optgroup>
                  <optgroup label="Restoration & Prosthetics">
                    {CHART_LEGENDS.restoration.map(l => <option key={l.code} value={l.code}>{l.code} - {l.label}</option>)}
                  </optgroup>
                  <optgroup label="Surgery">
                    {CHART_LEGENDS.surgery.map(l => <option key={l.code} value={l.code}>{l.code} - {l.label}</option>)}
                  </optgroup>
                </select>
              </div>
            ) : (
              <div className="text-sm text-blue-600/70 italic py-2">Click a tooth on the chart to assign a condition.</div>
            )}

            {/* QUICK APPLY / FAVORITES */}
            <div className="mt-4 border-t border-blue-200 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-blue-900 text-sm">Quick Apply (Favorites)</h4>
                {(activeTooth && data.dentalChart.teeth[activeTooth] && !favoriteStatuses.includes(data.dentalChart.teeth[activeTooth])) ? (
                  <button onClick={() => setFavoriteStatuses([...favoriteStatuses, data.dentalChart.teeth[activeTooth]])} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded shadow-sm hover:bg-blue-700 transition-colors">+ Add Current</button>
                ) : null}
              </div>

              {paintMode && (
                <div className="text-xs text-orange-700 bg-orange-100 border border-orange-200 p-2 rounded mb-3 font-medium flex justify-between items-center shadow-sm">
                  <span className="animate-pulse"><strong>Paint Mode Active:</strong> Click teeth to apply "{paintMode}"</span>
                  <button onClick={() => setPaintMode(null)} className="text-orange-500 hover:text-orange-800 ml-2 font-bold text-lg leading-none">&times;</button>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {favoriteStatuses.map(fav => (
                  <div key={fav} className={`flex items-center rounded overflow-hidden shadow-sm border transition-colors ${paintMode === fav ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-300'}`}>
                    <button onClick={() => handleFavoriteClick(fav)} className={`flex-1 flex items-center px-2 py-1.5 text-left transition-colors ${paintMode === fav ? 'bg-orange-100' : 'bg-white hover:bg-slate-50'}`}>
                      <span className={`w-6 text-center font-bold text-xs ${paintMode === fav ? 'text-orange-700' : 'text-blue-700'}`}>{fav}</span>
                      <span className="text-[10px] text-slate-600 truncate ml-1">{getLegendLabel(fav)}</span>
                    </button>
                    <button onClick={() => setFavoriteStatuses(favoriteStatuses.filter(f => f !== fav))} className="bg-slate-100 px-2 py-1.5 hover:bg-red-100 hover:text-red-600 text-slate-400 border-l border-slate-200 transition-colors" title="Remove">
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-3 leading-tight">
                <strong>Tip:</strong> Select a tooth and click a favorite to apply. Clear your selection and click a favorite to enter <strong>Paint Mode</strong>.
              </p>
            </div>
          </div>

          <div className="w-full bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs h-64 overflow-y-auto">
            <h4 className="font-bold border-b border-slate-100 pb-1 mb-2">Legend Reference</h4>
            <div className="font-semibold text-slate-500 mt-2">Condition</div>
            {CHART_LEGENDS.condition.map(l => <div key={l.code} className="flex"><span className="w-6 font-bold">{l.code}</span><span className="truncate">{l.label}</span></div>)}
            <div className="font-semibold text-slate-500 mt-3">Restoration</div>
            {CHART_LEGENDS.restoration.map(l => <div key={l.code} className="flex"><span className="w-6 font-bold">{l.code}</span><span className="truncate">{l.label}</span></div>)}
            <div className="font-semibold text-slate-500 mt-3">Surgery</div>
            {CHART_LEGENDS.surgery.map(l => <div key={l.code} className="flex"><span className="w-6 font-bold">{l.code}</span><span className="truncate">{l.label}</span></div>)}
          </div>
        </div>
      </div>

      {/* ADDITIONAL CLINICAL CHECKLISTS (Restored) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <SectionCard title="Periodontal" className="md:col-span-1">
          <div className="flex flex-col space-y-2">
            {['gingivitis', 'early', 'moderate', 'advanced'].map(k => (
              <label key={k} className="flex items-center text-xs"><input type="checkbox" checked={data.dentalChart.periodontal[k]} onChange={e => handleNested('periodontal', k, e.target.checked)} className="mr-2" /> <span className="capitalize">{k}</span></label>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Occlusion" className="md:col-span-1">
          <div className="flex flex-col space-y-2 text-xs">
            <label className="flex items-center"><span className="w-12">Class</span><input type="text" value={data.dentalChart.occlusion.class} onChange={e => handleNested('occlusion', 'class', e.target.value)} className="border-b border-slate-300 w-16 px-1 outline-none bg-transparent" /></label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.occlusion.overjet} onChange={e => handleNested('occlusion', 'overjet', e.target.checked)} className="mr-2" /> Overjet</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.occlusion.overbite} onChange={e => handleNested('occlusion', 'overbite', e.target.checked)} className="mr-2" /> Overbite</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.occlusion.midline} onChange={e => handleNested('occlusion', 'midline', e.target.checked)} className="mr-2" /> Midline Deviation</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.occlusion.crossbite} onChange={e => handleNested('occlusion', 'crossbite', e.target.checked)} className="mr-2" /> Crossbite</label>
          </div>
        </SectionCard>
        <SectionCard title="Appliances" className="md:col-span-1">
          <div className="flex flex-col space-y-2 text-xs">
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.appliances.orthodontic} onChange={e => handleNested('appliances', 'orthodontic', e.target.checked)} className="mr-2" /> Orthodontic</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.appliances.stayplate} onChange={e => handleNested('appliances', 'stayplate', e.target.checked)} className="mr-2" /> Stayplate</label>
            <label className="flex items-center mt-2">Others <input type="text" value={data.dentalChart.appliances.others} onChange={e => handleNested('appliances', 'others', e.target.value)} className="border-b border-slate-300 ml-2 w-full outline-none bg-transparent" /></label>
          </div>
        </SectionCard>
        <SectionCard title="TMD" className="md:col-span-1">
          <div className="flex flex-col space-y-2 text-xs">
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.tmd.clenching} onChange={e => handleNested('tmd', 'clenching', e.target.checked)} className="mr-2" /> Clenching</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.tmd.clicking} onChange={e => handleNested('tmd', 'clicking', e.target.checked)} className="mr-2" /> Clicking</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.tmd.trismus} onChange={e => handleNested('tmd', 'trismus', e.target.checked)} className="mr-2" /> Trismus</label>
            <label className="flex items-center"><input type="checkbox" checked={data.dentalChart.tmd.muscleSpasm} onChange={e => handleNested('tmd', 'muscleSpasm', e.target.checked)} className="mr-2" /> Muscle Spasm</label>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <SectionCard title="Clinical Findings">
          <textarea rows={4} value={data.dentalChart.findings} onChange={(e) => handleChartChange('findings', e.target.value)} placeholder="Enter clinical findings..." className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm outline-none text-sm" />
        </SectionCard>
        <SectionCard title="Treatment Recommendations">
          <textarea rows={4} value={data.dentalChart.recommendation} onChange={(e) => handleChartChange('recommendation', e.target.value)} placeholder="Enter treatment recommendations..." className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm outline-none text-sm" />
        </SectionCard>
      </div>

      <SectionCard title="Sign-off & Date" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Checked By (Dentist)</label>
            {doctors.length > 0 ? (
              <select
                value={data.dentalChart.checkedBy || ''}
                onChange={(e) => handleChartChange('checkedBy', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white"
              >
                <option value="">Select dentist...</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.name}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={data.dentalChart.checkedBy || ''}
                onChange={(e) => handleChartChange('checkedBy', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white"
                placeholder="Dr. Name"
              />
            )}
          </div>
          <FormInput label="Chart Date" field="chartDate" type="date" data={data.dentalChart} handleChange={(f, v) => handleChartChange(f, v)} />
        </div>
      </SectionCard>

    </div>
  );
}

// ============================================================================
// MODULE 1C: TREATMENT RECORD SYSTEM
// ============================================================================
function TreatmentRecordModule({ data, setData, doctors }) {
  const updateRow = (id, field, value) => {
    setData(prev => {
      const newRecords = prev.treatmentRecords.map(record => {
        if (record.id === id) {
          const newRecord = { ...record, [field]: value };
          if (field === 'amountCharged' || field === 'amountPaid') {
            const charged = parseFloat(newRecord.amountCharged) || 0;
            const paid = parseFloat(newRecord.amountPaid) || 0;
            if (newRecord.amountCharged || newRecord.amountPaid) {
              newRecord.balance = (charged - paid).toFixed(2);
            } else {
              newRecord.balance = '';
            }
          }
          return newRecord;
        }
        return record;
      });
      return { ...prev, treatmentRecords: newRecords };
    });
  };

  const addRow = () => {
    setData(prev => ({
      ...prev,
      treatmentRecords: [...prev.treatmentRecords, generateEmptyTreatmentRow()]
    }));
  };

  const deleteRow = (id) => {
    setData(prev => ({
      ...prev,
      treatmentRecords: prev.treatmentRecords.filter(r => r.id !== id)
    }));
  };

  return (
    <div className="w-full max-w-[1560px] mx-auto space-y-6 pb-12">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Treatment Record</h2>
          <p className="text-slate-500 text-sm">Ledger for {data.lastName ? `${data.lastName}, ${data.firstName}` : 'the patient'}.</p>
        </div>
        <button onClick={addRow} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">
          <Plus size={16} className="mr-2" /> Add Entry
        </button>
      </div>

      <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700 w-32">Date</th>
              <th className="px-4 py-3 font-semibold text-slate-700 w-24">Tooth No./s</th>
              <th className="px-4 py-3 font-semibold text-slate-700 min-w-[200px]">Procedure</th>
              <th className="px-4 py-3 font-semibold text-slate-700 w-32">Dentist/s</th>
              <th className="px-4 py-3 font-semibold text-slate-700 w-28">Amt Charged</th>
              <th className="px-4 py-3 font-semibold text-slate-700 w-28">Amt Paid</th>
              <th className="px-4 py-3 font-semibold text-slate-700 w-28">Balance</th>
              <th className="px-2 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.treatmentRecords.map((record) => (
              <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-2 py-1"><input type="date" value={record.date} onChange={e => updateRow(record.id, 'date', e.target.value)} className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded" /></td>
                <td className="px-2 py-1"><input type="text" value={record.toothNumbers} onChange={e => updateRow(record.id, 'toothNumbers', e.target.value)} className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded" placeholder="e.g. 18, 17" /></td>
                <td className="px-2 py-1"><input type="text" value={record.procedure} onChange={e => updateRow(record.id, 'procedure', e.target.value)} className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded" placeholder="Description..." /></td>
                <td className="px-2 py-1">
                  {doctors.length > 0 ? (
                    <select
                      value={record.dentist}
                      onChange={e => updateRow(record.id, 'dentist', e.target.value)}
                      className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded"
                    >
                      <option value="">Select dentist...</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.name}>
                          {doctor.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={record.dentist} onChange={e => updateRow(record.id, 'dentist', e.target.value)} className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded" placeholder="Dr. Name" />
                  )}
                </td>
                <td className="px-2 py-1"><input type="number" value={record.amountCharged} onChange={e => updateRow(record.id, 'amountCharged', e.target.value)} className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded" placeholder="0.00" /></td>
                <td className="px-2 py-1"><input type="number" value={record.amountPaid} onChange={e => updateRow(record.id, 'amountPaid', e.target.value)} className="w-full bg-transparent p-1 outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded" placeholder="0.00" /></td>
                <td className="px-2 py-1"><input type="number" value={record.balance} readOnly className="w-full bg-transparent p-1 outline-none text-slate-500 font-medium" placeholder="0.00" /></td>
                <td className="px-2 py-1 text-center">
                  <button onClick={() => deleteRow(record.id)} className="text-slate-400 hover:text-red-500 p-1 transition-colors"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {data.treatmentRecords.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400 italic">No treatment records yet. Click "Add Entry" to begin.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const createSectionDraft = (sectionKey) => {
  const today = new Date().toISOString().split('T')[0];
  if (sectionKey === 'prescriptions') {
    return {
      date: today,
      template: '',
      medicines: [{ id: crypto.randomUUID(), medication: '', dose: '', qty: '1' }],
      remarks: '',
    };
  }

  if (sectionKey === 'certificates') {
    return { date: today, template: '', title: 'Medical Certificate', body: '', remarks: '' };
  }

  if (sectionKey === 'attachments') {
    return { date: today, files: [], fileNames: '', remarks: '' };
  }

  if (sectionKey === 'notes') {
    return { date: today, title: '', details: '' };
  }

  if (sectionKey === 'consents') {
    return { date: today, title: '', status: 'Pending', details: '' };
  }

  return { date: today, title: '', time: '', status: 'Scheduled', details: '' };
};

const buildSectionRow = (sectionKey, draft) => {
  if (sectionKey === 'prescriptions') {
    const filledMedicines = draft.medicines.filter((medicine) => medicine.medication.trim());
    return {
      id: crypto.randomUUID(),
      date: draft.date,
      title: filledMedicines.map((medicine) => medicine.medication).join(', ') || 'Untitled Prescription',
      details: draft.remarks,
      medicines: filledMedicines,
      remarks: draft.remarks,
    };
  }

  if (sectionKey === 'certificates') {
    return {
      id: crypto.randomUUID(),
      date: draft.date,
      title: draft.title || 'Certificate',
      details: draft.remarks,
      body: draft.body,
      template: draft.template,
    };
  }

  if (sectionKey === 'attachments') {
    const uploadedFiles = Array.isArray(draft.files) ? draft.files : [];
    const typedNames = draft.fileNames || '';
    const title = uploadedFiles.length > 0
      ? uploadedFiles.map((file: any) => file.name).join(', ')
      : typedNames || 'Uploaded File';

    return {
      id: crypto.randomUUID(),
      date: draft.date,
      title,
      details: draft.remarks,
      files: uploadedFiles,
    };
  }

  if (sectionKey === 'notes') {
    return {
      id: crypto.randomUUID(),
      date: draft.date,
      title: draft.title || 'Patient Note',
      details: draft.details,
    };
  }

  if (sectionKey === 'consents') {
    return {
      id: crypto.randomUUID(),
      date: draft.date,
      title: `${draft.title || 'Consent'} (${draft.status})`,
      details: draft.details,
      status: draft.status,
    };
  }

  return {
    id: crypto.randomUUID(),
    date: draft.date,
    title: `${draft.title || 'Appointment'}${draft.time ? ` - ${draft.time}` : ''}`,
    details: `${draft.status}${draft.details ? ` | ${draft.details}` : ''}`,
    status: draft.status,
    time: draft.time,
  };
};

const patientDisplayName = (data: any) => (
  [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ').trim()
);

function MiniDocumentEditorShell({
  title,
  subtitle,
  children,
  settings,
  documentType,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  settings?: any;
  documentType?: DocumentFormType;
}) {
  const pageStyle = documentType ? getDocumentPageStyle(settings || DEFAULT_SETTINGS, documentType) : undefined;
  const pageOutline = documentType ? getDocumentLayoutSettings(settings || DEFAULT_SETTINGS, documentType).pageOutline : false;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-6 shadow-inner">
        <div
          className={`mx-auto min-h-[980px] w-[760px] max-w-full bg-white text-black shadow-xl ${pageOutline ? 'ring-2 ring-slate-700' : 'ring-1 ring-slate-200'}`}
          style={pageStyle}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function DocumentBrandHeader({ settings, documentType }: { settings: any; documentType: DocumentFormType }) {
  const layout = getDocumentLayoutSettings(settings, documentType);
  if (!layout.showLogo) return null;

  const clinicName = settings?.clinicName || DEFAULT_SETTINGS.clinicName;
  const isCertificate = documentType === 'certificate';

  return (
    <div className="text-center" style={{ marginBottom: `${layout.logoGap}px` }}>
      {layout.logo ? (
        <div
          className="inline-flex max-w-full items-center justify-center"
          style={{
            border: layout.logoOutline ? '1px dashed #64748b' : '0 solid transparent',
            padding: layout.logoOutline ? '6px' : 0,
          }}
        >
          <img
            src={layout.logo}
            alt={`${DOCUMENT_FORM_CONFIG[documentType].label} brand logo`}
            className="max-w-full object-contain"
            style={{ maxHeight: `${layout.logoSize}px` }}
          />
        </div>
      ) : (
        <div
          className="inline-flex flex-col items-center justify-center px-5 py-3"
          style={{
            minHeight: `${layout.logoSize}px`,
            border: layout.logoOutline ? '1px dashed #64748b' : '0 solid transparent',
          }}
        >
          {isCertificate ? (
            <>
              <div className="text-[24px] font-bold uppercase tracking-[0.28em] text-teal-500">{clinicName}</div>
              <div className="text-[23px] uppercase tracking-[0.22em] text-slate-500">Dental Clinic</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-slate-600">General Dentistry - Orthodontics - Endodontics - Oral Surgery</div>
            </>
          ) : (
            <div className="text-[20px] font-bold uppercase tracking-[0.2em] text-slate-500">{clinicName}</div>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentA4Page({ data, settings, documentType, children, className = '' }: any) {
  return (
    <div
      className={`a4-page bg-white w-[210mm] h-[297mm] mx-auto shadow-2xl relative box-border overflow-hidden text-black ${className}`}
      style={getDocumentPageStyle(settings, documentType)}
    >
      {children}
    </div>
  );
}

const PrintLineValue = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span className={`inline-block min-h-[1.35em] border-b border-black px-1 align-bottom ${className}`}>{children}</span>
);

const PrintTextAreaValue = ({ value, className = '' }: { value?: string; className?: string }) => (
  <div className={`whitespace-pre-wrap border-b border-black px-1 leading-7 ${className}`}>{value || '\u00a0'}</div>
);

const PrintCheckbox = ({ checked }: { checked: boolean }) => (
  <span className="inline-flex h-[12px] w-[12px] items-center justify-center border border-black text-[9px] font-bold leading-none">
    {checked ? '/' : ''}
  </span>
);

function CertificateDocumentModule({ data, setData, settings }: any) {
  const certificate = data.certificateDocument || createDefaultCertificateDocument();
  const fallbackPatientName = patientDisplayName(data);
  const updateCertificate = (field: string, value: string) => {
    setData((prev: any) => ({
      ...prev,
      certificateDocument: { ...(prev.certificateDocument || createDefaultCertificateDocument()), [field]: value },
    }));
  };

  return (
    <MiniDocumentEditorShell
      title="Dental Certificate"
      subtitle="Mini Word-style certificate editor. Brand logo and spacing are controlled in System Settings."
      settings={settings}
      documentType="certificate"
    >
      <div className="text-[15px] leading-6" style={{ fontFamily: 'Times New Roman, serif' }}>
        <DocumentBrandHeader settings={settings} documentType="certificate" />

        <div className="mb-5 grid grid-cols-2 gap-10 text-[14px] leading-5">
          <div>
            Unit 11, 2F The Ford Arcade, Amparo Subd.<br />
            cor. Aguinaldo Highway, Bayan Luma 4,<br />
            Imus, Cavite<br />
            Tel. Nos. (046) 884-7593 ; 0917-8071853
          </div>
          <div>
            Monday - Saturday<br />
            9AM - 5PM<br />
            Sunday - By Appointment
          </div>
        </div>

        <div className="mb-9 border-t-2 border-black" />

        <h3 className="mb-10 text-center text-[18px] font-bold uppercase tracking-wide text-[#8b5a44]">Dental Certificate</h3>

        <label className="mb-10 flex items-end gap-2">
          <span>Date:</span>
          <input value={certificate.date || ''} onChange={(e) => updateCertificate('date', e.target.value)} type="date" className="w-44 border-b border-black bg-transparent px-1 text-[14px] outline-none" />
        </label>

        <p className="mb-7">To Whom It May Concern:</p>

        <div className="mb-6">
          <div className="flex flex-wrap items-end gap-x-2">
            <span>This is to certify that Mr./Mrs./Ms.</span>
            <input value={certificate.patientName || fallbackPatientName} onChange={(e) => updateCertificate('patientName', e.target.value)} className="min-w-[310px] flex-1 border-b border-black bg-transparent px-1 outline-none" />
            <input value={certificate.age || data.age || ''} onChange={(e) => updateCertificate('age', e.target.value)} className="w-16 border-b border-black bg-transparent px-1 text-center outline-none" />
            <span>years of age, was</span>
          </div>
          <p>examined and treated at P&amp;J Tanarte Dental Clinic on with the following diagnosis:</p>
          <textarea value={certificate.diagnosis || ''} onChange={(e) => updateCertificate('diagnosis', e.target.value)} rows={4} className="mt-2 w-full resize-none border-0 border-b border-black bg-transparent leading-7 outline-none [background-image:linear-gradient(to_bottom,transparent_26px,#111_27px)] [background-size:100%_28px]" />
        </div>

        <div className="mb-7">
          <p className="mb-2">I therefore recommend:</p>
          <textarea value={certificate.recommendation || ''} onChange={(e) => updateCertificate('recommendation', e.target.value)} rows={4} className="w-full resize-none border-0 border-b border-black bg-transparent leading-7 outline-none [background-image:linear-gradient(to_bottom,transparent_26px,#111_27px)] [background-size:100%_28px]" />
        </div>

        <p className="mb-10">This certificate was issued upon the request of the patient, for whichever legal purpose/s it may serve (excluding legal matters).</p>
        <p className="mb-16">Thank you very much.</p>
        <p className="mb-16">Respectfully yours,</p>

        <div className="w-72">
          <input value={certificate.dentistName || ''} onChange={(e) => updateCertificate('dentistName', e.target.value)} className="w-full border-b border-black bg-transparent px-1 font-semibold outline-none" />
          <div className="flex items-center gap-1">
            <span>License #</span>
            <input value={certificate.licenseNo || ''} onChange={(e) => updateCertificate('licenseNo', e.target.value)} className="flex-1 bg-transparent outline-none" />
          </div>
        </div>
      </div>
    </MiniDocumentEditorShell>
  );
}

function ConsentDocumentModule({ data, setData, settings }: any) {
  const consent = data.consentDocument || createDefaultConsentDocument();
  const fallbackPatientName = patientDisplayName(data);
  const updateConsent = (field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      consentDocument: { ...(prev.consentDocument || createDefaultConsentDocument()), [field]: value },
    }));
  };
  const updateNestedConsent = (group: 'medicalHistory' | 'allergies', field: string, value: string) => {
    setData((prev: any) => ({
      ...prev,
      consentDocument: {
        ...(prev.consentDocument || createDefaultConsentDocument()),
        [group]: { ...((prev.consentDocument || {})[group] || {}), [field]: value },
      },
    }));
  };
  const yesNoValue = (group: 'medicalHistory' | 'allergies', item: string) => consent[group]?.[item] || '';

  return (
    <MiniDocumentEditorShell
      title="Oral Surgery Consent Form"
      subtitle="Mini Word-style consent editor. Brand logo and spacing are controlled in System Settings."
      settings={settings}
      documentType="consent"
    >
      <div className="text-[12px] leading-[1.2]" style={{ fontFamily: 'Arial, sans-serif' }}>
        <DocumentBrandHeader settings={settings} documentType="consent" />
        <div className="border-t-2 border-black" />
        <h3 className="mb-5 text-center text-[26px] font-black uppercase leading-none">Oral Surgery Consent Form</h3>

        <div className="mb-4 grid grid-cols-[1fr_150px_80px_120px] gap-4 text-[14px]">
          <label className="flex items-end gap-1">Patient Name:<input value={consent.patientName || fallbackPatientName} onChange={(e) => updateConsent('patientName', e.target.value)} className="flex-1 border-b border-black bg-transparent outline-none" /></label>
          <label className="flex items-end gap-1">Date of Birth:<input value={consent.birthDate || data.birthDate || ''} onChange={(e) => updateConsent('birthDate', e.target.value)} className="w-full border-b border-black bg-transparent outline-none" /></label>
          <label className="flex items-end gap-1">Age:<input value={consent.age || data.age || ''} onChange={(e) => updateConsent('age', e.target.value)} className="w-full border-b border-black bg-transparent outline-none" /></label>
          <label className="flex items-end gap-1">Status:<input value={consent.status || data.civilStatus || ''} onChange={(e) => updateConsent('status', e.target.value)} className="w-full border-b border-black bg-transparent outline-none" /></label>
        </div>

        <h4 className="text-center text-[18px] font-black uppercase">Medical History</h4>
        <div className="mb-5 grid grid-cols-[1.8fr_1fr] gap-4 border border-black p-3">
          <div>
            <div className="mb-2 font-bold">Do you have or have you had any of the following? (Please check)</div>
            <div className="grid grid-cols-3 gap-3">
              {ORAL_SURGERY_HISTORY_COLUMNS.map((column, columnIndex) => (
                <div key={columnIndex} className="space-y-1">
                  <div className="grid grid-cols-[24px_24px_1fr] gap-1 text-[10px] font-semibold"><span>YES</span><span>NO</span><span /></div>
                  {column.map((item) => (
                    <div key={item} className="grid grid-cols-[24px_24px_1fr] items-center gap-1">
                      <input type="checkbox" checked={yesNoValue('medicalHistory', item) === 'yes'} onChange={() => updateNestedConsent('medicalHistory', item, yesNoValue('medicalHistory', item) === 'yes' ? '' : 'yes')} />
                      <input type="checkbox" checked={yesNoValue('medicalHistory', item) === 'no'} onChange={() => updateNestedConsent('medicalHistory', item, yesNoValue('medicalHistory', item) === 'no' ? '' : 'no')} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-center font-bold">Do you have any allergies?</div>
            <div className="grid grid-cols-[24px_24px_1fr] gap-1 text-[10px] font-semibold"><span>YES</span><span>NO</span><span /></div>
            <div className="space-y-1">
              {ORAL_SURGERY_ALLERGY_ITEMS.map((item) => (
                <div key={item} className="grid grid-cols-[24px_24px_1fr] items-center gap-1">
                  <input type="checkbox" checked={yesNoValue('allergies', item) === 'yes'} onChange={() => updateNestedConsent('allergies', item, yesNoValue('allergies', item) === 'yes' ? '' : 'yes')} />
                  <input type="checkbox" checked={yesNoValue('allergies', item) === 'no'} onChange={() => updateNestedConsent('allergies', item, yesNoValue('allergies', item) === 'no' ? '' : 'no')} />
                  <span>{item}</span>
                </div>
              ))}
              <label className="mt-3 block">Are you taking medications at present?<input value={consent.medications || ''} onChange={(e) => updateConsent('medications', e.target.value)} className="ml-2 w-28 border-b border-black bg-transparent outline-none" /></label>
              <label className="block">Are you being treated by a Physician?<input value={consent.physicianTreatment || ''} onChange={(e) => updateConsent('physicianTreatment', e.target.value)} className="ml-2 w-28 border-b border-black bg-transparent outline-none" /></label>
              <label className="block">Previous Extraction?<input value={consent.previousExtraction || ''} onChange={(e) => updateConsent('previousExtraction', e.target.value)} className="ml-2 w-32 border-b border-black bg-transparent outline-none" /></label>
            </div>
          </div>
        </div>

        <p className="mb-3">
          I hereby authorize Dr. <input value={consent.doctorName || ''} onChange={(e) => updateConsent('doctorName', e.target.value)} className="w-56 border-b border-black bg-transparent outline-none" /> and any other dentists of
          <input value={consent.otherDentists || ''} onChange={(e) => updateConsent('otherDentists', e.target.value)} className="mx-1 w-48 border-b border-black bg-transparent outline-none" /> to perform the following treatment or surgical procedure
          <input value={consent.procedure || ''} onChange={(e) => updateConsent('procedure', e.target.value)} className="mx-1 w-60 border-b border-black bg-transparent outline-none" />, and I understand that this is an elective, urgent, or emergency procedure
          <input value={consent.procedureType || ''} onChange={(e) => updateConsent('procedureType', e.target.value)} className="mx-1 w-32 border-b border-black bg-transparent outline-none" />.
        </p>

        <p className="mb-2">I have been informed that the risks to my health if this procedure is not performed include, but are not limited to pain, infection, cyst formation, loss or bone around the teeth causing their loss, and an increased risks of complications if surgery is postpone.</p>
        <p className="mb-2">I have been informed of any possible alternative methods of treatment should any exist. Further, I understand that there are certain inherent and potential risks in any treatment or procedure, and that in this specific instance, such risks may include the following:</p>

        <ol className="mb-3 list-decimal space-y-[1px] pl-9">
          {[
            'Postoperative discomfort and swelling that may necessitate several days of home recuperation.',
            'Restricted mouth opening for several days or weeks.',
            'Heavy bleeding that may be prolonged.',
            'Nausea and vomiting (usually associated with medications prescribed for pain).',
            'Postoperative infection requiring additional treatment.',
            'Decision to leave a small piece of root in the jaw when its removal would require extensive surgery.',
            'Damage to adjacent teeth, fillings, and crowns.',
            'Stretching of the corners of the mouth with resulting cracking and bruising.',
            'Change in occlusion and temporo-mandibular joint difficulty.',
            'Prolonged drowsiness.',
            'With surgery and extractions of the upper jaw, an opening into the maxillary nasal sinus or nose requiring additional surgery.',
            'With surgery and extractions of the lower jaw, injury to the nerve underlying the teeth resulting in numbness or tingling.',
            'Breakage / fracture of the jaw.',
            'Cardiac arrest.',
          ].map((risk) => <li key={risk}>{risk}</li>)}
          <li>Other: <input value={consent.otherRisk || ''} onChange={(e) => updateConsent('otherRisk', e.target.value)} className="w-96 border-b border-black bg-transparent outline-none" /></li>
        </ol>

        <p className="mb-1"><input type="checkbox" checked={!!consent.anesthesiaConsent} onChange={(e) => updateConsent('anesthesiaConsent', e.target.checked)} className="mr-2" />I consent to the administration of local anesthesia, nitrous oxide analgesia or oral sedation in connection to the procedure referred to above.</p>
        <p className="mb-1 text-center">I certify that I have read the above and fully understand this consent for surgery, and that I understand that a perfect result cannot be guaranteed.</p>
        <p className="mb-8 text-center">Drugs given at the time of surgery for sedative purposes or control of pain may cause drowsiness and lack of awareness or coordination.</p>

        <div className="grid grid-cols-2 gap-x-24 gap-y-10 text-center">
          {["Patient's Signature / Date", 'Witness or Interpreter / Date', "Parent or Legal Guardian\n(If patient under 18 years of age) / Date", "Dentist's Signature / Date"].map((label) => (
            <div key={label}>
              <div className="border-b border-black">&nbsp;</div>
              <div className="whitespace-pre-line font-semibold">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </MiniDocumentEditorShell>
  );
}

function CertificateFormPage({ data, settings }: any) {
  const certificate = data.certificateDocument || createDefaultCertificateDocument();
  const fallbackPatientName = patientDisplayName(data);

  return (
    <DocumentA4Page settings={settings} documentType="certificate">
      <div className="h-full text-[15px] leading-6" style={{ fontFamily: 'Times New Roman, serif' }}>
        <DocumentBrandHeader settings={settings} documentType="certificate" />

        <div className="mb-5 grid grid-cols-2 gap-10 text-[14px] leading-5">
          <div>
            Unit 11, 2F The Ford Arcade, Amparo Subd.<br />
            cor. Aguinaldo Highway, Bayan Luma 4,<br />
            Imus, Cavite<br />
            Tel. Nos. (046) 884-7593 ; 0917-8071853
          </div>
          <div>
            Monday - Saturday<br />
            9AM - 5PM<br />
            Sunday - By Appointment
          </div>
        </div>

        <div className="mb-9 border-t-2 border-black" />
        <h3 className="mb-10 text-center text-[18px] font-bold uppercase tracking-wide text-[#8b5a44]">Dental Certificate</h3>

        <div className="mb-10 flex items-end gap-2">
          <span>Date:</span>
          <PrintLineValue className="w-44 text-[14px]">{certificate.date || ''}</PrintLineValue>
        </div>

        <p className="mb-7">To Whom It May Concern:</p>

        <div className="mb-6">
          <div className="flex flex-wrap items-end gap-x-2">
            <span>This is to certify that Mr./Mrs./Ms.</span>
            <PrintLineValue className="min-w-[310px] flex-1">{certificate.patientName || fallbackPatientName}</PrintLineValue>
            <PrintLineValue className="w-16 text-center">{certificate.age || data.age || ''}</PrintLineValue>
            <span>years of age, was</span>
          </div>
          <p>examined and treated at P&amp;J Tanarte Dental Clinic on with the following diagnosis:</p>
          <PrintTextAreaValue value={certificate.diagnosis || ''} className="mt-2 min-h-[112px]" />
        </div>

        <div className="mb-7">
          <p className="mb-2">I therefore recommend:</p>
          <PrintTextAreaValue value={certificate.recommendation || ''} className="min-h-[112px]" />
        </div>

        <p className="mb-10">This certificate was issued upon the request of the patient, for whichever legal purpose/s it may serve (excluding legal matters).</p>
        <p className="mb-16">Thank you very much.</p>
        <p className="mb-16">Respectfully yours,</p>

        <div className="w-72">
          <PrintLineValue className="w-full font-semibold">{certificate.dentistName || ''}</PrintLineValue>
          <div className="flex items-center gap-1">
            <span>License #</span>
            <span className="flex-1">{certificate.licenseNo || ''}</span>
          </div>
        </div>
      </div>
    </DocumentA4Page>
  );
}

function ConsentFormPage({ data, settings }: any) {
  const consent = data.consentDocument || createDefaultConsentDocument();
  const fallbackPatientName = patientDisplayName(data);
  const yesNoValue = (group: 'medicalHistory' | 'allergies', item: string) => consent[group]?.[item] || '';

  return (
    <DocumentA4Page settings={settings} documentType="consent">
      <div className="h-full text-[12px] leading-[1.2]" style={{ fontFamily: 'Arial, sans-serif' }}>
        <DocumentBrandHeader settings={settings} documentType="consent" />
        <div className="border-t-2 border-black" />
        <h3 className="mb-5 text-center text-[26px] font-black uppercase leading-none">Oral Surgery Consent Form</h3>

        <div className="mb-4 grid grid-cols-[1fr_150px_80px_120px] gap-4 text-[14px]">
          <label className="flex items-end gap-1">Patient Name:<PrintLineValue className="flex-1">{consent.patientName || fallbackPatientName}</PrintLineValue></label>
          <label className="flex items-end gap-1">Date of Birth:<PrintLineValue className="w-full">{consent.birthDate || data.birthDate || ''}</PrintLineValue></label>
          <label className="flex items-end gap-1">Age:<PrintLineValue className="w-full">{consent.age || data.age || ''}</PrintLineValue></label>
          <label className="flex items-end gap-1">Status:<PrintLineValue className="w-full">{consent.status || data.civilStatus || ''}</PrintLineValue></label>
        </div>

        <h4 className="text-center text-[18px] font-black uppercase">Medical History</h4>
        <div className="mb-5 grid grid-cols-[1.8fr_1fr] gap-4 border border-black p-3">
          <div>
            <div className="mb-2 font-bold">Do you have or have you had any of the following? (Please check)</div>
            <div className="grid grid-cols-3 gap-3">
              {ORAL_SURGERY_HISTORY_COLUMNS.map((column, columnIndex) => (
                <div key={columnIndex} className="space-y-1">
                  <div className="grid grid-cols-[24px_24px_1fr] gap-1 text-[10px] font-semibold"><span>YES</span><span>NO</span><span /></div>
                  {column.map((item) => (
                    <div key={item} className="grid grid-cols-[24px_24px_1fr] items-center gap-1">
                      <PrintCheckbox checked={yesNoValue('medicalHistory', item) === 'yes'} />
                      <PrintCheckbox checked={yesNoValue('medicalHistory', item) === 'no'} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-center font-bold">Do you have any allergies?</div>
            <div className="grid grid-cols-[24px_24px_1fr] gap-1 text-[10px] font-semibold"><span>YES</span><span>NO</span><span /></div>
            <div className="space-y-1">
              {ORAL_SURGERY_ALLERGY_ITEMS.map((item) => (
                <div key={item} className="grid grid-cols-[24px_24px_1fr] items-center gap-1">
                  <PrintCheckbox checked={yesNoValue('allergies', item) === 'yes'} />
                  <PrintCheckbox checked={yesNoValue('allergies', item) === 'no'} />
                  <span>{item}</span>
                </div>
              ))}
              <div className="mt-3">Are you taking medications at present?<PrintLineValue className="ml-2 w-28">{consent.medications || ''}</PrintLineValue></div>
              <div>Are you being treated by a Physician?<PrintLineValue className="ml-2 w-28">{consent.physicianTreatment || ''}</PrintLineValue></div>
              <div>Previous Extraction?<PrintLineValue className="ml-2 w-32">{consent.previousExtraction || ''}</PrintLineValue></div>
            </div>
          </div>
        </div>

        <p className="mb-3">
          I hereby authorize Dr. <PrintLineValue className="w-56">{consent.doctorName || ''}</PrintLineValue> and any other dentists of
          <PrintLineValue className="mx-1 w-48">{consent.otherDentists || ''}</PrintLineValue> to perform the following treatment or surgical procedure
          <PrintLineValue className="mx-1 w-60">{consent.procedure || ''}</PrintLineValue>, and I understand that this is an elective, urgent, or emergency procedure
          <PrintLineValue className="mx-1 w-32">{consent.procedureType || ''}</PrintLineValue>.
        </p>

        <p className="mb-2">I have been informed that the risks to my health if this procedure is not performed include, but are not limited to pain, infection, cyst formation, loss or bone around the teeth causing their loss, and an increased risks of complications if surgery is postpone.</p>
        <p className="mb-2">I have been informed of any possible alternative methods of treatment should any exist. Further, I understand that there are certain inherent and potential risks in any treatment or procedure, and that in this specific instance, such risks may include the following:</p>

        <ol className="mb-3 list-decimal space-y-[1px] pl-9">
          {[
            'Postoperative discomfort and swelling that may necessitate several days of home recuperation.',
            'Restricted mouth opening for several days or weeks.',
            'Heavy bleeding that may be prolonged.',
            'Nausea and vomiting (usually associated with medications prescribed for pain).',
            'Postoperative infection requiring additional treatment.',
            'Decision to leave a small piece of root in the jaw when its removal would require extensive surgery.',
            'Damage to adjacent teeth, fillings, and crowns.',
            'Stretching of the corners of the mouth with resulting cracking and bruising.',
            'Change in occlusion and temporo-mandibular joint difficulty.',
            'Prolonged drowsiness.',
            'With surgery and extractions of the upper jaw, an opening into the maxillary nasal sinus or nose requiring additional surgery.',
            'With surgery and extractions of the lower jaw, injury to the nerve underlying the teeth resulting in numbness or tingling.',
            'Breakage / fracture of the jaw.',
            'Cardiac arrest.',
          ].map((risk) => <li key={risk}>{risk}</li>)}
          <li>Other: <PrintLineValue className="w-96">{consent.otherRisk || ''}</PrintLineValue></li>
        </ol>

        <p className="mb-1"><PrintCheckbox checked={!!consent.anesthesiaConsent} /> <span className="ml-1">I consent to the administration of local anesthesia, nitrous oxide analgesia or oral sedation in connection to the procedure referred to above.</span></p>
        <p className="mb-1 text-center">I certify that I have read the above and fully understand this consent for surgery, and that I understand that a perfect result cannot be guaranteed.</p>
        <p className="mb-8 text-center">Drugs given at the time of surgery for sedative purposes or control of pain may cause drowsiness and lack of awareness or coordination.</p>

        <div className="grid grid-cols-2 gap-x-24 gap-y-10 text-center">
          {["Patient's Signature / Date", 'Witness or Interpreter / Date', "Parent or Legal Guardian\n(If patient under 18 years of age) / Date", "Dentist's Signature / Date"].map((label) => (
            <div key={label}>
              <div className="border-b border-black">&nbsp;</div>
              <div className="whitespace-pre-line font-semibold">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </DocumentA4Page>
  );
}

const ContractLine = ({ children, className = '' }: { children?: ReactNode; className?: string }) => (
  <span className={`inline-block min-h-[16px] border-b border-black px-1 align-bottom ${className}`}>{children || '\u00a0'}</span>
);

const OrderedContractList = ({ items, start = 1 }: { items: string[]; start?: number }) => (
  <ol className="space-y-[5px]" style={{ listStyleType: 'upper-roman', paddingLeft: '34px' }} start={start}>
    {items.map((item) => <li key={item} className="pl-3">{item}</li>)}
  </ol>
);

const ContractA4Page = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`a4-page bg-white w-[210mm] h-[297mm] mx-auto shadow-2xl relative box-border overflow-hidden p-[18mm] text-black ${className}`}>
    {children}
  </div>
);

const getPatientContractValues = (data: any) => {
  const contract = mergePatientContractDocument(data.patientContractDocument);
  const patientName = contract.patientName || patientDisplayName(data);
  const age = contract.age || data.age || '';
  const address = contract.address || data.address || '';
  const mobileNo = contract.mobileNo || data.mobile || data.contact || '';
  const birthDate = contract.birthDate || data.birthDate || '';

  return {
    ...contract,
    patientName,
    age,
    address,
    mobileNo,
    birthDate,
    acknowledgementName: contract.acknowledgementName || patientName,
    acknowledgementAddress: contract.acknowledgementAddress || address,
    acknowledgementAge: contract.acknowledgementAge || age,
  };
};

function PatientContractPages({ data }: any) {
  const contract = getPatientContractValues(data);
  const nonInclusionFirstPage = ORTHO_CONTRACT_NON_INCLUSIONS.slice(0, 10);
  const nonInclusionSecondPage = ORTHO_CONTRACT_NON_INCLUSIONS.slice(10);
  const termsPageTwo = ORTHO_CONTRACT_TERMS.slice(0, 13);
  const termsPageThree = ORTHO_CONTRACT_TERMS.slice(13);

  return (
    <>
      <ContractA4Page>
        <div className="text-[11px] leading-[1.45]" style={{ fontFamily: 'Arial, sans-serif' }}>
          <h2 className="mb-10 mt-8 text-center text-[12px] font-black uppercase tracking-wide">Contract for Orthodontic Treatment</h2>

          <div className="mb-10 grid grid-cols-[1.4fr_1fr] gap-x-16 gap-y-3 text-[11px] font-semibold uppercase">
            <div>Name: <ContractLine className="min-w-[260px] normal-case font-normal">{contract.patientName}</ContractLine></div>
            <div>Age: <ContractLine className="min-w-[110px] normal-case font-normal">{contract.age}</ContractLine></div>
            <div>Address: <ContractLine className="min-w-[245px] normal-case font-normal">{contract.address}</ContractLine></div>
            <div>Tel/Mobile No: <ContractLine className="min-w-[130px] normal-case font-normal">{contract.mobileNo}</ContractLine></div>
            <div>Date of Birth: <ContractLine className="min-w-[210px] normal-case font-normal">{contract.birthDate}</ContractLine></div>
          </div>

          <h3 className="mb-7 text-center text-[12px] font-semibold uppercase">Orthodontic Treatment Package Fees</h3>
          <OrderedContractList items={ORTHO_CONTRACT_FEES} />

          <h3 className="mb-4 mt-10 text-[11px] font-semibold uppercase">Inclusions</h3>
          <p className="mb-3">The Orthodontic Treatment Package includes the following:</p>
          <OrderedContractList items={ORTHO_CONTRACT_INCLUSIONS} />

          <h3 className="mb-4 mt-8 text-[11px] font-semibold uppercase">Non Inclusions</h3>
          <OrderedContractList items={nonInclusionFirstPage} />
        </div>
      </ContractA4Page>

      <div className="page-break">
        <ContractA4Page>
          <div className="text-[11px] leading-[1.45]" style={{ fontFamily: 'Arial, sans-serif' }}>
            <OrderedContractList items={nonInclusionSecondPage} start={11} />
            <p className="mb-9 mt-6">All Standard rates apply hereafter, however, discounts may be given at the discretion of the dentist/orthodontist/doctor.</p>
            <h3 className="mb-4 text-[11px] font-semibold uppercase">Terms and Conditions</h3>
            <OrderedContractList items={termsPageTwo} />
          </div>
        </ContractA4Page>
      </div>

      <div className="page-break">
        <ContractA4Page>
          <div className="text-[11px] leading-[1.45]" style={{ fontFamily: 'Arial, sans-serif' }}>
            <OrderedContractList items={termsPageThree} start={14} />

            <p className="mt-16 leading-7">
              I, <ContractLine className="w-[250px]">{contract.acknowledgementName}</ContractLine>, with address at,
              <ContractLine className="mx-1 w-[190px]">{contract.acknowledgementAddress}</ContractLine>, age,
              <ContractLine className="mx-1 w-[110px]">{contract.acknowledgementAge}</ContractLine>, have read, understood and conform all the term and conditions stated in this contract.
            </p>

            <div className="mt-16 grid grid-cols-2 gap-x-20">
              <div className="pt-28">
                <div className="mb-20">
                  <div className="w-72 border-b border-black">&nbsp;</div>
                  <div className="mt-2">{contract.dentistName}</div>
                </div>
                <div>
                  <div className="w-72 border-b border-black">&nbsp;</div>
                  <div className="mt-2">{contract.associateDentistRole}</div>
                </div>
              </div>

              <div className="space-y-14 text-center">
                <div>
                  <div className="mx-auto w-72 border-b border-black">&nbsp;</div>
                  <div className="mt-2">Signature over printed name</div>
                </div>
                <div>
                  <div className="mx-auto w-72 border-b border-black">&nbsp;</div>
                  <div className="mt-2">Signature over printed name of Legal Guardian</div>
                  <div className="mt-2">if the patient is minor</div>
                </div>
              </div>
            </div>
          </div>
        </ContractA4Page>
      </div>

      <div className="page-break">
        <ContractA4Page>
          <div className="text-[11px] leading-[1.45]" style={{ fontFamily: 'Arial, sans-serif' }}>
            <h2 className="mb-8 mt-3 text-center text-[12px] font-black uppercase tracking-wide">Orthodontic Treatment Package</h2>

            <div className="mx-auto mb-8 max-w-[620px] space-y-2">
              <div>Name of the Patient: <ContractLine className="w-[390px]">{contract.patientName}</ContractLine></div>
              <div>Tel./Mobile No.: <ContractLine className="w-[410px]">{contract.mobileNo}</ContractLine></div>
              <div>Age: <ContractLine className="w-[150px]">{contract.age}</ContractLine></div>
            </div>

            <div className="mx-auto mb-8 max-w-[680px] space-y-2">
              <div>Orthodontic Treatment Package: <ContractLine className="w-[420px]">{contract.orthodonticPackage}</ContractLine></div>
              <div>Down payment Terms: <ContractLine className="w-[470px]">{contract.downPaymentTerms[0]}</ContractLine></div>
              {contract.downPaymentTerms.slice(1).map((term, index) => (
                <div key={`down-${index}`} className="pl-[138px]"><ContractLine className="w-[470px]">{term}</ContractLine></div>
              ))}
              <div className="pt-5">Balance Terms: <ContractLine className="w-[450px]">{contract.balanceTerms}</ContractLine></div>
            </div>

            <table className="w-full border-collapse text-center text-[11px]">
              <thead>
                <tr>
                  {['DATE', 'AMOUNT\nCHARGED', 'AMOUNT PAID', 'REMARKS', 'SIGNATURE'].map((header) => (
                    <th key={header} className="whitespace-pre-line border border-black px-2 py-2 font-black">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contract.packageRows.map((row: any) => (
                  <tr key={row.id}>
                    <td className="h-[27px] border border-black px-1">{row.date}</td>
                    <td className="border border-black px-1">{row.amountCharged}</td>
                    <td className="border border-black px-1">{row.amountPaid}</td>
                    <td className="border border-black px-1">{row.remarks}</td>
                    <td className="border border-black px-1">{row.signature}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContractA4Page>
      </div>
    </>
  );
}

function PatientContractModule({ data, setData }: any) {
  const contract = getPatientContractValues(data);

  const updateContract = (field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      patientContractDocument: {
        ...mergePatientContractDocument(prev.patientContractDocument),
        [field]: value,
      },
    }));
  };

  const updateDownPaymentTerm = (index: number, value: string) => {
    const nextTerms = [...contract.downPaymentTerms];
    nextTerms[index] = value;
    updateContract('downPaymentTerms', nextTerms);
  };

  const updatePackageRow = (id: string, field: string, value: string) => {
    updateContract('packageRows', contract.packageRows.map((row: any) => (
      row.id === id ? { ...row, [field]: value } : row
    )));
  };

  const addPackageRow = () => updateContract('packageRows', [...contract.packageRows, createEmptyContractPackageRow()]);
  const removePackageRow = (id: string) => updateContract('packageRows', contract.packageRows.filter((row: any) => row.id !== id));

  const editableField = (label: string, field: string, fallbackHint: string, type = 'text') => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-2">{label}</label>
      <input
        type={type}
        value={contract[field] || ''}
        onChange={(e) => updateContract(field, e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder={fallbackHint}
      />
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1760px] space-y-6 pb-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Patient Contract</div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Orthodontic Treatment Contract</h2>
            <p className="mt-2 text-sm text-slate-500">Patient details auto-fill from the Patient Information tab. Type here only when you need an override for this contract.</p>
          </div>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Download or Print while this tab is open to export <span className="font-semibold">Patient Contract</span>.
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Auto-filled Patient Details</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {editableField('Patient Name', 'patientName', patientDisplayName(data) || 'Uses patient information name')}
              {editableField('Age', 'age', data.age || 'Uses patient information age')}
              {editableField('Address', 'address', data.address || 'Uses patient information address')}
              {editableField('Tel./Mobile No.', 'mobileNo', data.mobile || data.contact || 'Uses mobile/contact')}
              {editableField('Date of Birth', 'birthDate', data.birthDate || 'Uses date of birth', 'date')}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Page 3 Acknowledgement</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {editableField('Printed Name', 'acknowledgementName', contract.patientName || 'Patient name')}
              {editableField('Address at', 'acknowledgementAddress', contract.address || 'Patient address')}
              {editableField('Age', 'acknowledgementAge', contract.age || 'Patient age')}
              {editableField('Dentist Name', 'dentistName', 'Maria Jessica David - Tanarte, DMD')}
              {editableField('Dentist Role', 'associateDentistRole', 'Associate Dentist')}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Orthodontic Treatment Package</h3>
                <p className="mt-1 text-xs text-slate-500">These fields appear on the package ledger page.</p>
              </div>
              <button onClick={addPackageRow} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800">Add Row</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {editableField('Treatment Package', 'orthodonticPackage', 'Package description / fee')}
              {editableField('Balance Terms', 'balanceTerms', 'Balance payment terms')}
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Down Payment Terms</label>
              {contract.downPaymentTerms.map((term: string, index: number) => (
                <input
                  key={`down-edit-${index}`}
                  value={term}
                  onChange={(e) => updateDownPaymentTerm(index, e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder={`Down payment term line ${index + 1}`}
                />
              ))}
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    {['Date', 'Amount Charged', 'Amount Paid', 'Remarks', 'Signature', ''].map((header) => (
                      <th key={header} className="px-3 py-2 text-left font-semibold">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contract.packageRows.map((row: any) => (
                    <tr key={row.id}>
                      <td className="px-2 py-2"><input type="date" value={row.date} onChange={(e) => updatePackageRow(row.id, 'date', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5" /></td>
                      <td className="px-2 py-2"><input value={row.amountCharged} onChange={(e) => updatePackageRow(row.id, 'amountCharged', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5" placeholder="0.00" /></td>
                      <td className="px-2 py-2"><input value={row.amountPaid} onChange={(e) => updatePackageRow(row.id, 'amountPaid', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5" placeholder="0.00" /></td>
                      <td className="px-2 py-2"><input value={row.remarks} onChange={(e) => updatePackageRow(row.id, 'remarks', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5" /></td>
                      <td className="px-2 py-2"><input value={row.signature} onChange={(e) => updatePackageRow(row.id, 'signature', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5" /></td>
                      <td className="px-2 py-2 text-center"><button onClick={() => removePackageRow(row.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100/70 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Printable Preview</h3>
            <p className="text-sm text-slate-500">This exact contract is used for Print and Download PDF.</p>
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-auto rounded-2xl border border-slate-200 bg-slate-200/60 p-3">
            <div className="flex flex-col gap-8">
              <PatientContractPages data={{ ...data, patientContractDocument: contract }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientAuxTableModule({
  data,
  setData,
  sectionKey,
  title,
  subtitle,
  columns,
  newLabel,
  emptyLabel,
  patientId,
}: {
  data: Record<string, any>;
  setData: React.Dispatch<React.SetStateAction<any>>;
  sectionKey: string;
  title: string;
  subtitle: string;
  columns: Array<{ key: string; label: string }>;
  newLabel: string;
  emptyLabel: string;
  patientId?: string | null;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<any>(() => createSectionDraft(sectionKey));
  const isAppointmentsSection = sectionKey === 'appointments';
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const rows = data[sectionKey] || [];
  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, rows.length);
  const paginatedRows = rows.slice(startIndex, endIndex);

  useEffect(() => {
    if (!isAppointmentsSection || !patientId) return;

    let isActive = true;
    const loadAppointments = async () => {
      const result = await getAppointments(patientId);
      if (!isActive) return;
      if ('data' in result) {
        setData((prev) => ({ ...prev, [sectionKey]: result.data }));
        return;
      }
      console.error('Error loading appointments:', result.error);
    };

    void loadAppointments();

    return () => {
      isActive = false;
    };
  }, [isAppointmentsSection, patientId, sectionKey, setData]);

  const refreshList = async () => {
    if (isAppointmentsSection && patientId) {
      const result = await getAppointments(patientId);
      if ('data' in result) {
        setData((prev) => ({ ...prev, [sectionKey]: result.data }));
      } else {
        console.error('Error loading appointments:', result.error);
      }
      return;
    }

    setData((prev) => ({ ...prev, [sectionKey]: [...(prev[sectionKey] || [])] }));
  };

  const openModal = () => {
    setDraft(createSectionDraft(sectionKey));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setDraft(createSectionDraft(sectionKey));
    setIsModalOpen(false);
  };

  const saveModalEntry = async () => {
    if (isAppointmentsSection && patientId) {
      const result = await createAppointment(patientId, {
        appointment_date: draft.date,
        appointment_time: draft.time,
        reason: draft.title?.trim() || null,
        status: draft.status,
        details: draft.details,
        title: draft.title,
      });

      if ('error' in result) {
        console.error('Error saving appointment:', result.error);
        return;
      }

      setData((prev) => ({
        ...prev,
        [sectionKey]: [...(prev[sectionKey] || []), result.data],
      }));
      closeModal();
      return;
    }

    setData((prev) => ({
      ...prev,
      [sectionKey]: [...(prev[sectionKey] || []), buildSectionRow(sectionKey, draft)],
    }));
    closeModal();
  };

  const deleteItem = async (id: string) => {
    if (isAppointmentsSection && patientId) {
      const result = await deleteAppointment(patientId, id);
      if ('error' in result) {
        console.error('Error deleting appointment:', result.error);
        return;
      }

      setData((prev) => ({
        ...prev,
        [sectionKey]: result.data,
      }));
      return;
    }

    setData((prev) => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter((item) => item.id !== id),
    }));
  };

  const updateMedicine = (id, field, value) => {
    setDraft((prev: any) => ({
      ...prev,
      medicines: prev.medicines.map((medicine) => (
        medicine.id === id ? { ...medicine, [field]: value } : medicine
      )),
    }));
  };

  const addMedicine = () => {
    setDraft((prev: any) => ({
      ...prev,
      medicines: [...prev.medicines, { id: crypto.randomUUID(), medication: '', dose: '', qty: '1' }],
    }));
  };

  const resetPrescription = () => {
    setDraft(createSectionDraft(sectionKey));
  };

  const handleAttachmentUpload = async (event: any) => {
    const selectedFiles = Array.from(event.target.files || []) as File[];
    if (selectedFiles.length === 0) return;

    const files = await Promise.all(selectedFiles.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: reader.result,
      });
      reader.readAsDataURL(file);
    })));

    setDraft((prev: any) => ({
      ...prev,
      files: [...(Array.isArray(prev.files) ? prev.files : []), ...files],
      fileNames: [...(Array.isArray(prev.files) ? prev.files : []), ...files].map((file: any) => file.name).join(', '),
    }));
  };

  const removeDraftAttachment = (id: string) => {
    setDraft((prev: any) => {
      const nextFiles = (Array.isArray(prev.files) ? prev.files : []).filter((file: any) => file.id !== id);
      return { ...prev, files: nextFiles, fileNames: nextFiles.map((file: any) => file.name).join(', ') };
    });
  };

  return (
    <div className="w-full max-w-[1560px] mx-auto space-y-6 pb-12">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="text-slate-500 text-sm">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={refreshList} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Refresh List
          </button>
          <button onClick={openModal} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            {newLabel}
          </button>
        </div>
      </div>

      <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-semibold text-slate-700">
                  {column.label}
                </th>
              ))}
              <th className="px-2 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 align-top text-slate-700">
                    {sectionKey === 'attachments' && column.key === 'title' && Array.isArray(row.files) && row.files.length > 0 ? (
                      <div className="space-y-1">
                        {row.files.map((file: any) => (
                          <a
                            key={file.id || file.name}
                            href={file.dataUrl}
                            download={file.name}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-blue-700 hover:underline"
                          >
                            {file.name}
                            <span className="ml-2 text-xs text-slate-400">{file.type || 'file'}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      row[column.key] || '-'
                    )}
                  </td>
                ))}
                <td className="px-2 py-3 text-center">
                  <button onClick={() => deleteItem(row.id)} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-8 text-slate-400 italic">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between px-1 pt-3">
          <span className="text-xs text-zinc-500 font-medium">Showing <span className="font-bold text-zinc-700">{startIndex + 1}-{endIndex}</span> of <span className="font-bold text-zinc-700">{rows.length}</span> {title.toLowerCase()}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-40 font-medium"
            >
              &lt; Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                  page === safeCurrentPage ? 'bg-teal-600 text-white' : 'text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-40 font-medium"
            >
              Next &gt;
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-2xl font-semibold text-slate-900">{newLabel}</h3>
              <button onClick={closeModal} className="text-2xl leading-none text-slate-400 hover:text-slate-700">×</button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
              {sectionKey === 'prescriptions' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Load From Template</label>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <input type="text" value={draft.template} onChange={(e) => setDraft((prev: any) => ({ ...prev, template: e.target.value }))} className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search prescription template here" />
                      <button className="rounded-md border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">Load Medicines</button>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button onClick={resetPrescription} className="rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600">
                      <RotateCcw size={15} className="mr-2 inline" />Reset
                    </button>
                    <button onClick={addMedicine} className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                      <Plus size={15} className="mr-2 inline" />Add Medicine
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Medication</th>
                          <th className="px-4 py-3 text-left font-semibold">Dose</th>
                          <th className="px-4 py-3 text-left font-semibold">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {draft.medicines.map((medicine) => (
                          <tr key={medicine.id}>
                            <td className="px-3 py-2"><input type="text" value={medicine.medication} onChange={(e) => updateMedicine(medicine.id, 'medication', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Search medicine here" /></td>
                            <td className="px-3 py-2"><input type="text" value={medicine.dose} onChange={(e) => updateMedicine(medicine.id, 'dose', e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" placeholder="Prescribe dosage here" /></td>
                            <td className="px-3 py-2"><input type="number" min="1" value={medicine.qty} onChange={(e) => updateMedicine(medicine.id, 'qty', e.target.value)} className="w-24 rounded-md border border-slate-300 px-3 py-2" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Remarks</label>
                    <textarea rows={4} value={draft.remarks} onChange={(e) => setDraft((prev: any) => ({ ...prev, remarks: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {sectionKey === 'certificates' && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Load From Template</label>
                      <div className="flex gap-2">
                        <input type="text" value={draft.template} onChange={(e) => setDraft((prev: any) => ({ ...prev, template: e.target.value }))} className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search certificate template here" />
                        <button className="rounded-md border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">Use Template</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Date</label>
                      <input type="date" value={draft.date} onChange={(e) => setDraft((prev: any) => ({ ...prev, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Certificate Title</label>
                    <input type="text" value={draft.title} onChange={(e) => setDraft((prev: any) => ({ ...prev, title: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Medical Certificate" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Certificate Body</label>
                    <textarea rows={12} value={draft.body} onChange={(e) => setDraft((prev: any) => ({ ...prev, body: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Remarks</label>
                    <input type="text" value={draft.remarks} onChange={(e) => setDraft((prev: any) => ({ ...prev, remarks: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {sectionKey === 'attachments' && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Files</label>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                        onChange={handleAttachmentUpload}
                        className="w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={draft.fileNames || ''}
                        onChange={(e) => setDraft((prev: any) => ({ ...prev, fileNames: e.target.value }))}
                        className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Or type file names / references manually"
                      />
                      {Array.isArray(draft.files) && draft.files.length > 0 && (
                        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                          {draft.files.map((file: any) => (
                            <div key={file.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
                              <div className="min-w-0">
                                <div className="truncate font-medium text-slate-800">{file.name}</div>
                                <div className="text-xs text-slate-500">{file.type || 'file'} | {Math.max(1, Math.round((file.size || 0) / 1024))} KB</div>
                              </div>
                              <button onClick={() => removeDraftAttachment(file.id)} className="text-slate-400 hover:text-red-500">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Date</label>
                      <input type="date" value={draft.date} onChange={(e) => setDraft((prev: any) => ({ ...prev, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Remarks</label>
                    <input type="text" value={draft.remarks} onChange={(e) => setDraft((prev: any) => ({ ...prev, remarks: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {sectionKey === 'notes' && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Date</label>
                      <input type="date" value={draft.date} onChange={(e) => setDraft((prev: any) => ({ ...prev, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Note Title</label>
                      <input type="text" value={draft.title} onChange={(e) => setDraft((prev: any) => ({ ...prev, title: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Details</label>
                    <textarea rows={8} value={draft.details} onChange={(e) => setDraft((prev: any) => ({ ...prev, details: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {sectionKey === 'consents' && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)_180px]">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Date</label>
                      <input type="date" value={draft.date} onChange={(e) => setDraft((prev: any) => ({ ...prev, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Consent Name</label>
                      <input type="text" value={draft.title} onChange={(e) => setDraft((prev: any) => ({ ...prev, title: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Status</label>
                      <select value={draft.status} onChange={(e) => setDraft((prev: any) => ({ ...prev, status: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
                        <option>Pending</option>
                        <option>Signed</option>
                        <option>Declined</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Remarks</label>
                    <textarea rows={6} value={draft.details} onChange={(e) => setDraft((prev: any) => ({ ...prev, details: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {sectionKey === 'appointments' && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-[160px_160px_minmax(0,1fr)_180px]">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Date</label>
                      <input type="date" value={draft.date} onChange={(e) => setDraft((prev: any) => ({ ...prev, date: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Time</label>
                      <input type="time" value={draft.time} onChange={(e) => setDraft((prev: any) => ({ ...prev, time: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Appointment</label>
                      <input type="text" value={draft.title} onChange={(e) => setDraft((prev: any) => ({ ...prev, title: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Consultation / Procedure" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Status</label>
                      <select value={draft.status} onChange={(e) => setDraft((prev: any) => ({ ...prev, status: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white">
                        <option>Scheduled</option>
                        <option>Completed</option>
                        <option>Cancelled</option>
                        <option>No Show</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Remarks</label>
                    <textarea rows={6} value={draft.details} onChange={(e) => setDraft((prev: any) => ({ ...prev, details: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button onClick={closeModal} className="rounded-lg bg-orange-400 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-500">
                Cancel
              </button>
              <button onClick={saveModalEntry} className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
                <Save size={15} className="mr-2 inline" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MODULE 2: LIVE A4 PREVIEW (DYNAMIC RENDER ENGINE)
// ============================================================================

const PrintHeader = ({ settings, data }) => {
  const bStyle = settings.borderStyle || 'border-black';
  return (
    <div className="flex justify-between items-center shrink-0" style={{ marginBottom: `${settings.headerMarginBottom}px` }}>
      {settings.headerOrder.map(part => {
        if (part === 'left') {
          return (
            <div key="left" className="shrink-0" style={{ marginTop: `${settings.leftImageMarginTop}px`, marginBottom: `${settings.leftImageMarginBottom}px`, marginLeft: `${settings.leftImageMarginLeft}px`, marginRight: `${settings.leftImageMarginRight}px` }}>
              {settings.showLeftImage && (
                <div className={`bg-slate-50 rounded-full flex items-center justify-center overflow-hidden ${settings.leftImageOutline ? 'border border-slate-300' : ''}`} style={{ width: `${settings.leftImageSize}px`, height: `${settings.leftImageSize}px` }}>
                  {settings.leftImage ? <img src={settings.leftImage} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300" size={24} />}
                </div>
              )}
            </div>
          );
        }
        if (part === 'middle') {
          return (
            <div key="middle" className="text-center flex-1 flex flex-col items-center justify-center" style={{ marginTop: `${settings.middleMarginTop}px`, marginBottom: `${settings.middleMarginBottom}px`, marginLeft: `${settings.middleMarginLeft}px`, marginRight: `${settings.middleMarginRight}px` }}>
              {settings.showMiddleImage && (
                <div className="mb-2" style={{ height: `${settings.middleImageSize}px` }}>
                  {settings.middleImage ? <img src={settings.middleImage} className="h-full object-contain" /> : <div className="h-full w-24 bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-[8px] text-slate-400">Logo</div>}
                </div>
              )}
              {settings.showClinicName && <h1 className="text-xl font-bold tracking-widest text-[#56C5C0] uppercase">{settings.clinicName}</h1>}
              {settings.showAddress && <h2 className="text-[9px] tracking-widest text-slate-600 uppercase mt-0.5">{settings.clinicAddress}</h2>}
              {settings.showContact && <p className="text-[8px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wider">{settings.clinicContact}</p>}
            </div>
          );
        }
        if (part === 'right') {
          const photoToDisplay = data.patientPhoto || settings.rightImage;
          return (
            <div key="right" className="shrink-0" style={{ marginTop: `${settings.rightImageMarginTop}px`, marginBottom: `${settings.rightImageMarginBottom}px`, marginLeft: `${settings.rightImageMarginLeft}px`, marginRight: `${settings.rightImageMarginRight}px` }}>
              {settings.showRightImage && (
                <div className={`w-[2in] h-[1.5in] max-w-[100px] max-h-[100px] border-[1.5px] ${bStyle} rounded-md flex items-center justify-center text-[8px] text-slate-400 border-dashed overflow-hidden bg-slate-50`}>
                  {photoToDisplay ? (
                    <img src={photoToDisplay} className="w-full h-full" style={{ objectFit: settings.rightImageFit, objectPosition: `${settings.rightImagePositionX}% ${settings.rightImagePositionY}%` }} />
                  ) : '2x2 Photo'}
                </div>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

const InlineLine = ({
  label,
  value,
  sublabel,
  flex = "1",
  width,
  settings
}: {
  label?: ReactNode;
  value?: ReactNode;
  sublabel?: ReactNode;
  flex?: string;
  width?: string;
  settings: any;
}) => {
  const labelSizeMap = { 'Small': 'text-[8.5px]', 'Medium': 'text-[9.5px]', 'Large': 'text-[10px]' };
  const underlineMap = { 'Solid': 'border-solid', 'Dashed': 'border-dashed', 'Dotted': 'border-dotted' };
  const labelFontSize = labelSizeMap[settings.labelSize] || 'text-[9.5px]';
  const uStyle = underlineMap[settings.underlineStyle] || 'border-solid';
  const bStyle = settings.borderStyle || 'border-black';

  return (
    <div className={`flex flex-col ${width ? width : `flex-${flex}`} px-1`}>
      <div className="flex items-end">
        {label && <span className={`whitespace-nowrap mr-1 leading-none ${labelFontSize}`}>{label}</span>}
        <div className={`flex-1 border-b ${bStyle} ${uStyle} text-center min-h-[12px] leading-tight pb-[1px]`}>
          {value}
        </div>
      </div>
      {sublabel && <span className="text-[8px] italic text-center w-full block pt-[1px] leading-none">{sublabel}</span>}
    </div>
  );
};

const DentistSignatureBlock = ({
  settings,
  manualName,
  bStyle,
  uStyle = 'border-solid',
  showName,
  showSignature
}: {
  settings: any;
  manualName?: ReactNode;
  bStyle: string;
  uStyle?: string;
  showName?: boolean;
  showSignature?: boolean;
}) => {
  const nameToUse = showName ? (manualName || settings.defaultDentistName) : manualName;
  const roleToUse = showName ? (settings.defaultDentistRole || 'Attending Dentist') : 'Checked By (Dentist)';

  let alignContainer = 'items-center';
  let justifyText = 'justify-center';

  if (settings.dentistSignaturePlacement === 'left') { alignContainer = 'items-start'; justifyText = 'justify-start'; }
  if (settings.dentistSignaturePlacement === 'right') { alignContainer = 'items-end'; justifyText = 'justify-end'; }

  return (
    <div className={`text-center w-64 relative flex flex-col justify-end mt-4 ${alignContainer}`}>
      {showSignature && settings.defaultDentistSignature && (
        <img
          src={settings.defaultDentistSignature}
          alt="Dentist Signature"
          className="absolute bottom-4 object-contain z-10 mix-blend-multiply"
          style={{ width: `${settings.dentistSignatureSize}px`, maxHeight: '60px' }}
        />
      )}
      <div className={`border-b ${bStyle} ${uStyle} h-5 w-full flex items-end ${justifyText} text-[10px] font-bold uppercase pb-0.5 z-0 relative px-1`}>
        {nameToUse}
      </div>
      <span className="text-[10px] leading-tight mt-1 block">{roleToUse}</span>
    </div>
  );
};


// 2A: PATIENT FORM PREVIEW PAGE
function PatientFormPage({ data, settings }) {
  const fontSizeMap = { 'Small': 'text-[9px]', 'Medium': 'text-[10px]', 'Large': 'text-[11px]' };
  const labelSizeMap = { 'Small': 'text-[8.5px]', 'Medium': 'text-[9.5px]', 'Large': 'text-[10px]' };
  const baseFontSize = fontSizeMap[settings.fontSize] || 'text-[10px]';
  const labelFontSize = labelSizeMap[settings.labelSize] || 'text-[9.5px]';
  const bStyle = settings.borderStyle || 'border-black';
  const uStyle = settings.underlineStyle === 'Dashed' ? 'border-dashed' : settings.underlineStyle === 'Dotted' ? 'border-dotted' : 'border-solid';
  const A4_CLASSES = "a4-page bg-white w-[210mm] h-[297mm] mx-auto shadow-2xl relative box-border overflow-hidden";

  return (
    <div className={`${A4_CLASSES} ${baseFontSize} text-black font-sans flex flex-col p-[10mm] pb-[12mm]`}>

      <PrintHeader settings={settings} data={data} />

      {settings.showRecordBadge && settings.sectionOrder.includes('personal') && settings.visibility['personal'] && (
        <h3 className="text-sm font-bold uppercase tracking-wider text-center bg-black text-white w-max mx-auto px-4 py-0.5 rounded-full" style={{ marginTop: `${settings.recordBadgeMarginTop}px`, marginBottom: `${settings.recordBadgeMarginBottom}px` }}>
          {settings.recordBadgeText || 'PATIENT RECORD'}
        </h3>
      )}

      <div className={`flex-1 flex flex-col ${settings.density === 'Compact' ? 'space-y-1' : 'space-y-2'} overflow-hidden leading-tight`}>
        {settings.sectionOrder.map((sectionId) => {
          if (!settings.visibility[sectionId]) return null;

          switch (sectionId) {
            case 'personal': return (
              <div key={sectionId} className="w-full shrink-0">
                <div className="flex w-full">
                  <span className={`whitespace-nowrap mr-2 leading-none self-start mt-1 ${labelFontSize}`}>Name:</span>
                  <div className="flex flex-1">
                    <InlineLine settings={settings} value={data.lastName} sublabel="Last Name" flex="1" />
                    <InlineLine settings={settings} value={data.firstName} sublabel="First Name" flex="1" />
                    <InlineLine settings={settings} value={data.middleName} sublabel="Middle" flex="1" />
                  </div>
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Birthday(mm/dd/yy):" value={data.birthDate} flex="1" />
                  <InlineLine settings={settings} label="Nickname:" value={data.nickname} flex="1" />
                  <InlineLine settings={settings} label="Age:" value={data.age} width="w-20" />
                  <InlineLine settings={settings} label="Sex: M / F" value={data.sex} width="w-28" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Religion:" value={data.religion} flex="1" />
                  <InlineLine settings={settings} label="Nationality:" value={data.nationality} flex="1" />
                  <InlineLine settings={settings} label="Civil Status:" value={data.civilStatus} width="w-48" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Home Address:" value={data.address} flex="1" />
                  <InlineLine settings={settings} label="Tel. No/s.:" value={data.contact} width="w-48" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Company:" value={data.company} flex="1" />
                  <InlineLine settings={settings} label="Occupation:" value={data.occupation} flex="1" />
                  <InlineLine settings={settings} label="Office No/s.:" value={data.officeContact} width="w-48" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Dental Insurance:" value={data.dentalInsurance} flex="1" />
                  <InlineLine settings={settings} label="Fax No/s.:" value={data.fax} width="w-48" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Effective Date:" value={data.effectiveDate} flex="1" />
                  <InlineLine settings={settings} label="Mobile No/s.:" value={data.mobile} width="w-48" />
                </div>
                <div className="flex w-full mt-1">
                  <div className="font-bold italic text-[10px] mr-2 self-end">For Minors:</div>
                  <InlineLine settings={settings} label="Email Add.:" value={data.email} width="w-64" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Parents / Guardian's Name:" value={data.parentGuardian} flex="1" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Whom may we thank for referring you?:" value={data.referral} flex="1" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="What is your reason for dental consultation?:" value={data.dentalReason} flex="1" />
                </div>
              </div>
            );

            case 'referral': return null;

            case 'dentalHistory': return (
              <div key={sectionId} className="w-full shrink-0">
                <div className="font-bold uppercase mt-2 mb-1">Dental History</div>
                <div className="flex w-full">
                  <InlineLine settings={settings} label="Previous Dentist: Dr." value={data.previousDentist} flex="1" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Last Dental visit:" value={data.lastVisit} flex="1" />
                </div>
              </div>
            );

            case 'medicalHistory': return (
              <div key={sectionId} className="w-full shrink-0">
                <div className="font-bold uppercase mt-2 mb-1">Medical History</div>
                <div className="flex w-full">
                  <InlineLine settings={settings} label="Name of the Physician: Dr." value={data.physicianName} flex="1" />
                  <InlineLine settings={settings} label="Specialty, if applicable:" value={data.physicianSpecialty} flex="1" />
                </div>
                <div className="flex w-full mt-1">
                  <InlineLine settings={settings} label="Office Address:" value={data.physicianAddress} flex="1" />
                  <InlineLine settings={settings} label="Office No/s.:" value={data.physicianContact} width="w-48" />
                </div>
              </div>
            );

            case 'questions': return (
              <div key={sectionId} className="w-full shrink-0">
                <div className="flex justify-between items-end mt-2 pr-6">
                  <span className={labelFontSize}>Please place (✓) under "YES" or "NO".</span>
                  <div className="flex space-x-4 text-center font-semibold text-[9px]">
                    <span className="w-8">YES</span>
                    <span className="w-8">NO</span>
                  </div>
                </div>
                {MEDICAL_QUESTIONS.map((q, idx) => (
                  <div key={q.id} className="flex flex-col pr-6 mt-0.5">
                    <div className="flex justify-between items-center">
                      <span className="truncate pr-2">{idx + 1}. {q.text}</span>
                      <div className="flex space-x-4">
                        <span className="w-8 text-center font-mono">{data.questions[q.id] === true ? '(✓)' : 'O'}</span>
                        <span className="w-8 text-center font-mono">{data.questions[q.id] === false ? '(✓)' : 'O'}</span>
                      </div>
                    </div>
                    {idx === 1 && <div className="pl-4 mt-[1px]"><InlineLine settings={settings} label="If so, what is the condition being treated?" value={data.questionDetails?.[q.id]} flex="1" /></div>}
                    {idx === 2 && <div className="pl-4 mt-[1px]"><InlineLine settings={settings} label="If so, what illness or operation?" value={data.questionDetails?.[q.id]} flex="1" /></div>}
                    {idx === 3 && <div className="pl-4 mt-[1px]"><InlineLine settings={settings} label="If so, when and why?" value={data.questionDetails?.[q.id]} flex="1" /></div>}
                    {idx === 4 && <div className="pl-4 mt-[1px]"><InlineLine settings={settings} label="If so, please specify:" value={data.questionDetails?.[q.id]} flex="1" /></div>}
                    {[0, 5, 6].includes(idx) && data.questionDetails?.[q.id] && (
                      <div className="pl-4 mt-[1px]"><InlineLine settings={settings} label="Comment:" value={data.questionDetails?.[q.id]} flex="1" /></div>
                    )}
                  </div>
                ))}
              </div>
            );

            case 'allergies': return (
              <div key={sectionId} className="w-full shrink-0 mt-1">
                <span className={labelFontSize}>Are you allergic to any of the following:</span>
                <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 pl-4 mt-1">
                  <div className="flex items-center"><span className="font-mono mr-1">{data.allergies['local anesthetic'] ? '(✓)' : '( )'}</span> Local Anesthetic</div>
                  <div className="flex items-center"><span className="font-mono mr-1">{data.allergies['sulfa'] ? '(✓)' : '( )'}</span> Sulfa Drugs</div>
                  <div className="flex items-center"><span className="font-mono mr-1">{data.allergies['latex'] ? '(✓)' : '( )'}</span> Latex</div>
                  <div className="flex items-center"><span className="font-mono mr-1">{data.allergies['penicillin'] ? '(✓)' : '( )'}</span> Penicillin / Antibiotics</div>
                  <div className="flex items-center"><span className="font-mono mr-1">{data.allergies['aspirin'] ? '(✓)' : '( )'}</span> Aspirin</div>
                  <div className="flex items-center"><span className="font-mono mr-1">{data.allergies['others'] ? '(✓)' : '( )'}</span> Other: <div className={`flex-1 border-b ${bStyle} ${uStyle} ml-1 min-h-[1em]`}>{data.allergies.others}</div></div>
                </div>
              </div>
            );

            case 'healthDetails': return (
              <div key={sectionId} className="w-full shrink-0 flex mt-2 space-x-6">
                <InlineLine settings={settings} label="Blood Type:" value={data.bloodType} flex="1" />
                <InlineLine settings={settings} label="Blood Pressure:" value={data.bloodPressure} flex="1" />
              </div>
            );

            case 'womenOnly': return (
              <div key={sectionId} className="w-full shrink-0 mt-2 flex pr-6 border border-slate-200 p-1.5">
                <span className={`w-32 ${labelFontSize}`}>For women only:</span>
                <div className="flex-1 flex flex-col items-end">
                  <div className="flex justify-between w-full pl-8 max-w-[300px]">
                    <span>Are you pregnant?</span>
                    <div className="flex space-x-4"><span className="w-8 text-center font-mono">{data.womenOnly.pregnant ? '(✓)' : 'O'}</span><span className="w-8 text-center font-mono">{!data.womenOnly.pregnant && data.womenOnly.pregnant !== undefined ? 'O' : 'O'}</span></div>
                  </div>
                  <div className="flex justify-between w-full pl-8 max-w-[300px]">
                    <span>Are you nursing?</span>
                    <div className="flex space-x-4"><span className="w-8 text-center font-mono">{data.womenOnly.nursing ? '(✓)' : 'O'}</span><span className="w-8 text-center font-mono">O</span></div>
                  </div>
                  <div className="flex justify-between w-full pl-8 max-w-[300px]">
                    <span>Are you taking birth control pills?</span>
                    <div className="flex space-x-4"><span className="w-8 text-center font-mono">{data.womenOnly.birthControl ? '(✓)' : 'O'}</span><span className="w-8 text-center font-mono">O</span></div>
                  </div>
                </div>
              </div>
            );

            case 'conditions': return (
              <div key={sectionId} className="w-full flex-1 flex flex-col mt-2">
                <span className={labelFontSize}>Do you have or have you had any of the following? Check which apply.</span>
                <div className="grid grid-cols-3 gap-x-2 gap-y-[2px] pl-4 mt-2">
                  {CONDITIONS.map((cond) => (
                    <div key={cond} className="flex items-start text-[9.5px]">
                      <span className="mr-2 font-mono leading-none pt-[1px]">{data.conditions[cond] ? '(✓)' : '( )'}</span>
                      <span className="truncate leading-tight">{cond}</span>
                    </div>
                  ))}
                </div>
              </div>
            );

            case 'signature': return (
              <div key={sectionId} className="w-full flex justify-between px-8 pt-6 pb-2 shrink-0 mt-auto items-end">
                <div className="text-center w-40">
                  <div className={`border-b ${bStyle} ${uStyle} h-5 flex items-end justify-center text-[10px] pb-0.5`}>
                    {data.signatureDate}
                  </div>
                  <span className="text-[10px]">Date</span>
                </div>
                <div className="text-center w-64">
                  <div className={`border-b ${bStyle} ${uStyle} h-5 flex items-end justify-center text-[10px] font-bold uppercase pb-0.5`}>
                    {data.signatureName}
                  </div>
                  <span className="text-[10px] leading-tight mt-1 block">Patient / Parent / Guardian Signature<br />Over Printed Name</span>
                </div>

                {(settings.showDentistNameInPatientRecord || settings.showSignatureInPatientRecord) && (
                  <DentistSignatureBlock
                    settings={settings}
                    manualName=""
                    bStyle={bStyle}
                    uStyle={uStyle}
                    showName={settings.showDentistNameInPatientRecord}
                    showSignature={settings.showSignatureInPatientRecord}
                  />
                )}
              </div>
            );

            default: return null;
          }
        })}
      </div>
    </div>
  );
}

// 2B: DENTAL CHART PREVIEW PAGE
function DentalChartPage({ data, settings }) {
  const fontSizeMap = { 'Small': 'text-[8px]', 'Medium': 'text-[9px]', 'Large': 'text-[10px]' };
  const baseFontSize = fontSizeMap[settings.fontSize] || 'text-[9px]';
  const bStyle = settings.borderStyle || 'border-black';
  const A4_CLASSES = "a4-page bg-white w-[210mm] h-[297mm] mx-auto shadow-2xl relative box-border overflow-hidden";
  const printRows = [
    { key: 'upper-temp', right: TEMP_UPPER_RIGHT, left: TEMP_UPPER_LEFT, layout: 'top', spacing: 'mb-5' },
    { key: 'upper-perm', right: PERM_UPPER_RIGHT, left: PERM_UPPER_LEFT, layout: 'top', spacing: 'mb-7' },
    { key: 'lower-perm', right: PERM_LOWER_RIGHT, left: PERM_LOWER_LEFT, layout: 'bottom', spacing: 'mb-5' },
    { key: 'lower-temp', right: TEMP_LOWER_RIGHT, left: TEMP_LOWER_LEFT, layout: 'bottom', spacing: '' },
  ];

  const renderPrintToothCard = (toothId, toothEntry, layout) => {
    const flatTags = getToothFlatTags(toothEntry).slice(0, 4);
    const gridValues = flatTags.length > 0 ? flatTags : ['/', '', '', ''];

    return (
      <div key={`pt-${toothId}`} className="flex w-[34px] flex-col items-center px-[1px]">
        {layout === 'top' && (
          <>
            <div className={`grid h-[22px] w-[22px] grid-cols-2 grid-rows-2 overflow-hidden rounded-[3px] border border-slate-300 bg-white text-[5.5px] font-bold text-slate-800`}>
              {[0, 1, 2, 3].map((index) => (
                <div key={`${toothId}-box-top-${index}`} className="flex items-center justify-center border-[0.5px] border-slate-200 leading-none">
                  {gridValues[index] || ''}
                </div>
              ))}
            </div>
            <div className="mt-[2px] text-center text-[7px] font-semibold leading-none text-slate-900">{toothId}</div>
            <PrintToothSurfaceDiagram surfaces={toothEntry.surfaces} className="mt-[2px]" />
          </>
        )}

        {layout === 'bottom' && (
          <>
            <PrintToothSurfaceDiagram surfaces={toothEntry.surfaces} />
            <div className="mt-[2px] text-center text-[7px] font-semibold leading-none text-slate-900">{toothId}</div>
            <div className={`mt-[2px] grid h-[22px] w-[22px] grid-cols-2 grid-rows-2 overflow-hidden rounded-[3px] border border-slate-300 bg-white text-[5.5px] font-bold text-slate-800`}>
              {[0, 1, 2, 3].map((index) => (
                <div key={`${toothId}-box-bottom-${index}`} className="flex items-center justify-center border-[0.5px] border-slate-200 leading-none">
                  {gridValues[index] || ''}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderToothTop = (t) => {
    const toothEntry = normalizeToothChartEntry(String(t), data.dentalChart.teeth[t]);
    return renderPrintToothCard(t, toothEntry, 'top');
  };

  const renderToothBottom = (t) => {
    const toothEntry = normalizeToothChartEntry(String(t), data.dentalChart.teeth[t]);
    return renderPrintToothCard(t, toothEntry, 'bottom');
  };

  const renderPrintRow = ({ key, right, left, layout, spacing }) => {
    const renderer = layout === 'top' ? renderToothTop : renderToothBottom;
    return (
      <div key={key} className={`flex items-center justify-center ${spacing}`}>
        <div className="flex items-center justify-end gap-[2px] pr-3">
          {right.map(renderer)}
        </div>
        <div className="h-[56px] w-px bg-black"></div>
        <div className="flex items-center justify-start gap-[2px] pl-3">
          {left.map(renderer)}
        </div>
      </div>
    );
  };

  return (
    <div className={`${A4_CLASSES} ${baseFontSize} text-black font-sans flex flex-col p-[10mm] pb-[12mm]`}>

      <PrintHeader settings={settings} data={data} />

      {settings.showChartTitle && (
        <h3 className="text-sm font-bold uppercase tracking-wider text-center w-full mb-6 mt-4">
          {settings.chartTitle || 'DENTAL CHART'}
        </h3>
      )}

      {/* PATIENT INFO STRIP */}
      <div className={`flex w-full mb-4 pb-1 border-b-2 ${bStyle}`}>
        <div className="flex-1 flex items-end">
          <span className="font-semibold mr-1">Patient:</span>
          <div className="flex-1 font-bold px-1 border-b border-black">{data.lastName ? `${data.lastName}, ${data.firstName} ${data.middleName}` : ''}</div>
        </div>
        <div className="w-32 flex items-end ml-4">
          <span className="font-semibold mr-1">Age/Sex:</span>
          <div className="flex-1 font-bold px-1 border-b border-black">{data.age} / {data.sex}</div>
        </div>
        <div className="w-48 flex items-end ml-4">
          <span className="font-semibold mr-1">Date:</span>
          <div className="flex-1 font-bold px-1 border-b border-black text-right">{data.dentalChart.chartDate}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">

        {/* CLINICAL CHART GRAPHIC AREA */}
        <div className="mb-4 rounded-[12px] border border-transparent px-4 py-4">
          <div className="grid grid-cols-[58px_1fr_58px] items-center mb-3 text-[7px] font-bold uppercase tracking-[0.08em] text-slate-500">
            <div className="text-left leading-tight">Status<br />Right</div>
            <div className="text-center">Dental Status Chart</div>
            <div className="text-right">Left</div>
          </div>

          <div className="relative">
            <div className="absolute left-1/2 top-[56px] bottom-[56px] w-px -translate-x-1/2 bg-black"></div>
            <div className="absolute left-[10%] right-[10%] top-1/2 h-px -translate-y-1/2 bg-black"></div>

            <div className="absolute -left-1 top-[44px] text-[6.5px] font-bold uppercase leading-tight text-slate-500">
              Temporary<br />Teeth
            </div>
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 text-[6.5px] font-bold uppercase leading-tight text-slate-500">
              Permanent<br />Teeth
            </div>
            <div className="absolute -left-1 bottom-[44px] text-[6.5px] font-bold uppercase leading-tight text-slate-500">
              Temporary<br />Teeth
            </div>

            {printRows.map(renderPrintRow)}
          </div>
        </div>

        <DentalRecordChartFooterPrint data={data} bStyle={bStyle} />
      </div>

    </div>
  );
}

function DentalRecordChartFooterPrint({ data, bStyle }: any) {
  const chart = data.dentalChart || {};
  const recommendationPlan = chart.recommendationPlan || {};
  const xrayTaken = chart.xrayTaken || {};
  const remarksStatus = chart.remarks?.status || '';
  const checked = (value: boolean) => (value ? '/' : '');

  const PrintCheckLine = ({ isChecked, label, children }: any) => (
    <div className="flex items-center leading-[1.18]">
      <span className={`mr-1 inline-block h-[9px] w-[24px] border-b ${bStyle} text-center text-[7px] font-black leading-[8px]`}>
        {checked(isChecked)}
      </span>
      <span>{label}</span>
      {children}
    </div>
  );

  return (
    /* PDF footer layout controls:
       - mt-3 moves the whole bottom section closer/farther from the tooth chart.
       - text-[8px] changes the printed text size for this whole bottom section.
       - leading-[1.25] changes vertical line spacing across the footer. */
    <div className="mt-3 flex flex-1 flex-col text-[8px] leading-[1.25] text-black">
      {/* Legend/X-ray row controls:
          - grid-cols controls the width of: Legend label, Condition, Restorations, Surgery, X-ray.
          - gap-x-8 controls horizontal spacing between those columns.
          - pt-4 controls the top padding after the horizontal separator line. */}
      <div className={`grid grid-cols-[44px_1.12fr_1.24fr_1fr_1.35fr] gap-x-8 border-t ${bStyle} pt-4`}>
        <div className="font-black">Legend:</div>
        <DentalRecordLegendColumns print />
        <section>
          <h4 className="mb-1 text-[8.5px] font-black">X-ray Taken</h4>
          {/* PDF X-RAY GAP KNOB: space-y-[2px] adds small spacing between X-ray rows. */}
          <div className="space-y-[2px]">
            <PrintCheckLine isChecked={xrayTaken.periapical} label="Periapical Taken">
              <span className="ml-1">(Tth no.</span>
              <span className={`mx-1 inline-block min-w-[40px] border-b ${bStyle} text-center leading-[9px]`}>{xrayTaken.periapicalToothNo || ''}</span>
              <span>)</span>
            </PrintCheckLine>
            <PrintCheckLine isChecked={xrayTaken.panoramic} label="Panoramic" />
            <PrintCheckLine isChecked={xrayTaken.cephalometric} label="Cephalometric" />
            <PrintCheckLine isChecked={xrayTaken.occlusalUpperLower} label="Occlusal (Upper/Lower)" />
            <PrintCheckLine isChecked={xrayTaken.others} label="Others:">
              <span className={`ml-1 inline-block min-w-[48px] border-b ${bStyle}`}>{xrayTaken.othersText || ''}</span>
            </PrintCheckLine>
          </div>
        </section>
      </div>

      {/* Recommendation area controls:
          - mt-4 moves Recommendation up/down relative to the legend row.
          - gap-x-14 changes the space between left checklist and right tooth-number lines.
          - pl-14 / pr-12 move the left and right groups inward/outward. */}
      <div className="mt-4">
        <div className="mb-2 text-center text-[8px] font-black">RECOMMENDATION:</div>
        <div className="grid grid-cols-[1fr_1fr] gap-x-14">
          <div className="space-y-[2.5px] pl-14">
            {DENTAL_RECORD_RECOMMENDATIONS.map((item) => (
              <PrintCheckLine key={item.key} isChecked={recommendationPlan[item.key]} label={item.label} />
            ))}
          </div>
          <div className="space-y-[2.5px] pr-12">
            <div className="flex items-center leading-tight">
              <span className="mr-1">TOOTH #</span>
              <span className={`mr-2 inline-block min-w-[54px] border-b ${bStyle} text-center`}>{recommendationPlan.restorativeFillingToothNo || ''}</span>
              <span>{checked(recommendationPlan.restorativeFilling)}</span>
              <span className="ml-1">RESTORATIVE FILLING</span>
            </div>
            <div className="flex items-center leading-tight">
              <span className="mr-1">TOOTH #</span>
              <span className={`mr-2 inline-block min-w-[54px] border-b ${bStyle} text-center`}>{recommendationPlan.toothExtractionToothNo || ''}</span>
              <span>{checked(recommendationPlan.toothExtraction)}</span>
              <span className="ml-1">TOOTH EXTRACTION</span>
            </div>
          </div>
        </div>
      </div>

      {/* Remarks controls:
          - mt-4 moves Remarks up/down.
          - grid-cols-[70px_1fr] controls label width vs option width.
          - space-y controls distance between DENTALLY FIT and FOR COMPLIANCE. */}
      <div className="mt-4 grid grid-cols-[70px_1fr] items-start">
        <div className="font-semibold">REMARKS:</div>
        <div className="space-y-[1.5px]">
          {DENTAL_RECORD_REMARK_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center leading-tight">
              <span className={`mr-1 inline-block h-[8px] w-[8px] rounded-full border ${bStyle} text-center text-[6px] leading-[6px]`}>
                {remarksStatus === option.value ? '/' : ''}
              </span>
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Paper footer controls:
          - mt-auto pushes Checked By / Date to the bottom of the dental chart PDF page.
          - grid-cols-[1fr_260px] controls line width: 1fr is Checked By, 260px is Date.
          - text-[8.5px] controls Checked By / Date label and value font size.
          - gap-16 controls space between Checked By and Date.
          - pt-8 / pb-1 controls vertical spacing above and below this footer row. */}
      <div className="mt-auto grid grid-cols-[1fr_260px] items-end gap-16 pt-8 pb-1 text-[9.5px]">
        <div className="flex items-end">
          <span className="mr-1 whitespace-nowrap">Checked By:</span>
          <span className={`block min-h-[13px] flex-1 border-b ${bStyle} px-1 leading-[13px]`}>{chart.checkedBy || ''}</span>
        </div>
        <div className="flex items-end">
          <span className="mr-1 whitespace-nowrap">Date:</span>
          <span className={`block min-h-[13px] flex-1 border-b ${bStyle} px-1 text-right leading-[13px]`}>{chart.chartDate || ''}</span>
        </div>
      </div>
    </div>
  );
}

// 2C: TREATMENT RECORD PREVIEW PAGE
function TreatmentRecordPages({ data, settings }) {
  const fontSizeMap = { 'Small': 'text-[9px]', 'Medium': 'text-[10px]', 'Large': 'text-[11px]' };
  const baseFontSize = fontSizeMap[settings.fontSize] || 'text-[10px]';
  const bStyle = settings.borderStyle || 'border-black';
  const A4_CLASSES = "a4-page bg-white w-[210mm] h-[297mm] mx-auto shadow-2xl relative box-border overflow-hidden flex flex-col";

  const ROWS_PER_PAGE = settings.treatmentRowHeight === 'Compact' ? 40 : 30;

  let displayRecords = [...data.treatmentRecords];
  if (displayRecords.length < ROWS_PER_PAGE) {
    const blanksNeeded = ROWS_PER_PAGE - displayRecords.length;
    displayRecords = [...displayRecords, ...Array.from({ length: blanksNeeded }, generateEmptyTreatmentRow)];
  }

  const pages: typeof displayRecords[] = [];
  for (let i = 0; i < displayRecords.length; i += ROWS_PER_PAGE) {
    pages.push(displayRecords.slice(i, i + ROWS_PER_PAGE));
  }

  return (
    <>
      {pages.map((pageRows, pageIndex) => (
        <div key={`tr-page-${pageIndex}`} className={`${A4_CLASSES} ${baseFontSize} text-black font-sans flex flex-col p-[10mm] ${pageIndex > 0 ? 'page-break' : ''}`}>

          <PrintHeader settings={settings} data={data} />

          {pageIndex === 0 && settings.showTreatmentTitle && (
            <h2 className="text-center font-bold text-lg uppercase mb-4 tracking-widest">{settings.treatmentTitle}</h2>
          )}

          <table className={`w-full border-collapse border ${bStyle} text-left`}>
            <thead>
              <tr className={`border-b ${bStyle} bg-slate-50`}>
                <th className={`border-r ${bStyle} px-2 py-1.5 w-24 font-bold`}>Date</th>
                <th className={`border-r ${bStyle} px-2 py-1.5 w-16 font-bold`}>Tooth No./s</th>
                <th className={`border-r ${bStyle} px-2 py-1.5 font-bold`}>Procedure</th>
                {settings.showDentistColumn && <th className={`border-r ${bStyle} px-2 py-1.5 w-28 font-bold`}>Dentist/s</th>}
                <th className={`border-r ${bStyle} px-2 py-1.5 w-24 font-bold text-right`}>Amount Charged</th>
                <th className={`border-r ${bStyle} px-2 py-1.5 w-24 font-bold text-right`}>Amount Paid</th>
                {settings.showBalanceColumn && <th className={`px-2 py-1.5 w-24 font-bold text-right`}>Balance</th>}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, idx) => (
                <tr key={`row-${pageIndex}-${idx}`} className={`border-b ${bStyle}`}>
                  <td className={`border-r ${bStyle} px-2 ${settings.treatmentRowHeight === 'Compact' ? 'py-1' : 'py-2'}`}>{row.date}</td>
                  <td className={`border-r ${bStyle} px-2`}>{row.toothNumbers}</td>
                  <td className={`border-r ${bStyle} px-2 truncate max-w-[200px]`}>{row.procedure}</td>
                  {settings.showDentistColumn && <td className={`border-r ${bStyle} px-2`}>{row.dentist}</td>}
                  <td className={`border-r ${bStyle} px-2 text-right`}>{row.amountCharged ? Number(row.amountCharged).toFixed(2) : ''}</td>
                  <td className={`border-r ${bStyle} px-2 text-right`}>{row.amountPaid ? Number(row.amountPaid).toFixed(2) : ''}</td>
                  {settings.showBalanceColumn && <td className={`px-2 text-right`}>{row.balance ? Number(row.balance).toFixed(2) : ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>

          {pageIndex === pages.length - 1 && (settings.showDentistNameInTreatmentRecord || settings.showSignatureInTreatmentRecord) && (
            <div className={`flex ${settings.dentistSignaturePlacement === 'left' ? 'justify-start' : settings.dentistSignaturePlacement === 'center' ? 'justify-center' : 'justify-end'} mt-auto pt-8`}>
              <DentistSignatureBlock
                settings={settings}
                manualName=""
                bStyle={bStyle}
                showName={settings.showDentistNameInTreatmentRecord}
                showSignature={settings.showSignatureInTreatmentRecord}
              />
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// 2D: LIVE PREVIEW CONTAINER
function LivePreviewContainer({ data, settings }) {
  const [previewMode, setPreviewMode] = useState('form');

  return (
    <div className="flex flex-col items-center py-4 sm:py-8 min-h-full">
      <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex mb-6 sticky top-20 z-10 flex-wrap justify-center gap-1">
        <button onClick={() => setPreviewMode('form')} className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-all ${previewMode === 'form' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          Patient Form
        </button>
        <button onClick={() => setPreviewMode('chart')} className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-all ${previewMode === 'chart' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          Dental Chart
        </button>
        <button onClick={() => setPreviewMode('treatment')} className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-all ${previewMode === 'treatment' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          Treatment Record
        </button>
        <button onClick={() => setPreviewMode('certificate')} className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-all ${previewMode === 'certificate' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          Certificate
        </button>
        <button onClick={() => setPreviewMode('consent')} className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-all ${previewMode === 'consent' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          Consent
        </button>
        <button onClick={() => setPreviewMode('contract')} className={`px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-all ${previewMode === 'contract' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          Contract
        </button>
      </div>

      <div className="origin-top bg-transparent flex flex-col gap-8">
        {previewMode === 'form' && <PatientFormPage data={data} settings={settings} />}
        {previewMode === 'chart' && <div className="shadow-2xl"><DentalChartPage data={data} settings={settings} /></div>}
        {previewMode === 'treatment' && <div className="flex flex-col gap-8"><TreatmentRecordPages data={data} settings={settings} /></div>}
        {previewMode === 'certificate' && <CertificateFormPage data={data} settings={settings} />}
        {previewMode === 'consent' && <ConsentFormPage data={data} settings={settings} />}
        {previewMode === 'contract' && <div className="flex flex-col gap-8"><PatientContractPages data={data} /></div>}
      </div>
    </div>
  );
}

function PrintToothSurfaceDiagram({ surfaces, className = '' }) {
  const topColor = SURFACE_COLORS[(surfaces?.top || 'null') as keyof typeof SURFACE_COLORS] || SURFACE_COLORS.null;
  const rightColor = SURFACE_COLORS[(surfaces?.right || 'null') as keyof typeof SURFACE_COLORS] || SURFACE_COLORS.null;
  const bottomColor = SURFACE_COLORS[(surfaces?.bottom || 'null') as keyof typeof SURFACE_COLORS] || SURFACE_COLORS.null;
  const leftColor = SURFACE_COLORS[(surfaces?.left || 'null') as keyof typeof SURFACE_COLORS] || SURFACE_COLORS.null;
  const centerColor = SURFACE_COLORS[(surfaces?.center || 'null') as keyof typeof SURFACE_COLORS] || SURFACE_COLORS.null;

  return (
    <div className={`relative h-[24px] w-[24px] shrink-0 overflow-hidden rounded-full border border-slate-400 bg-white ${className}`}>
      <div
        className="absolute left-0 top-0 h-0 w-0"
        style={{ borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: `12px solid ${topColor}` }}
      />
      <div
        className="absolute right-0 top-0 h-0 w-0"
        style={{ borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderRight: `12px solid ${rightColor}` }}
      />
      <div
        className="absolute bottom-0 left-0 h-0 w-0"
        style={{ borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: `12px solid ${bottomColor}` }}
      />
      <div
        className="absolute left-0 top-0 h-0 w-0"
        style={{ borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderLeft: `12px solid ${leftColor}` }}
      />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-400" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-slate-400" />
      <div className="absolute inset-[6px] rounded-full border border-slate-400" style={{ backgroundColor: centerColor }} />
    </div>
  );
}

function DoctorsRegistryModule({ doctors, onSaveDoctors, isSavingDoctors, doctorDbStatus }) {
  const [draftDoctors, setDraftDoctors] = useState(doctors);

  useEffect(() => {
    setDraftDoctors(doctors);
  }, [doctors]);

  const updateDoctor = (id, field, value) => {
    setDraftDoctors((prev) => prev.map((doctor) => (
      doctor.id === id ? { ...doctor, [field]: value } : doctor
    )));
  };

  const addDoctor = () => {
    setDraftDoctors((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', role: 'Attending Dentist', signature: null },
    ]);
  };

  const removeDoctor = (id) => {
    setDraftDoctors((prev) => prev.filter((doctor) => doctor.id !== id));
  };

  const handleSignatureUpload = (id, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateDoctor(id, 'signature', reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Doctors Registry</div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Clinic Dentists</h2>
            <p className="mt-2 text-sm text-slate-500">Add your attending dentists here so the system can reuse them in dental charts, treatment records, and PDF generation without manual typing.</p>
            <p className="mt-3 text-sm text-blue-700">{doctorDbStatus || 'Ready to manage doctors.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={addDoctor} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
              Add Doctor
            </button>
            <button
              onClick={() => onSaveDoctors(draftDoctors)}
              disabled={isSavingDoctors}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSavingDoctors ? 'Saving...' : 'Save Doctors'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {draftDoctors.map((doctor, index) => (
          <div key={doctor.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Doctor {index + 1}</div>
              <button onClick={() => removeDoctor(doctor.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
                Remove
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Doctor Name</label>
                  <input
                    type="text"
                    value={doctor.name}
                    onChange={(e) => updateDoctor(doctor.id, 'name', e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Dr. Full Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Role / Title</label>
                  <input
                    type="text"
                    value={doctor.role}
                    onChange={(e) => updateDoctor(doctor.id, 'role', e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Attending Dentist"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Signature</label>
                <input type="file" accept="image/*" onChange={(e) => handleSignatureUpload(doctor.id, e)} className="w-full text-xs" />
                <div className="mt-3 flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
                  {doctor.signature ? (
                    <img src={doctor.signature} alt={`${doctor.name || 'Doctor'} signature`} className="max-h-20 object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400">No signature uploaded</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {draftDoctors.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No clinic doctors yet. Click <span className="font-semibold text-slate-700">Add Doctor</span> to create your registry.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODULE 3: CUSTOMIZATION PANEL
// ============================================================================

const Toggle = ({ checked, onChange }) => (
  <div className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${checked ? 'bg-blue-500' : 'bg-gray-300'}`} onClick={() => onChange(!checked)}>
    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </div>
);

function DocumentFormDesigner({ documentType, settings: committedSettings, setSettings, onSaveSettings, isSavingTemplate, data }: any) {
  const config = DOCUMENT_FORM_CONFIG[documentType as DocumentFormType];
  const prefix = config.prefix;
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftSettings, setDraftSettings] = useState(committedSettings);

  useEffect(() => {
    if (!isEditMode) {
      setDraftSettings(committedSettings);
    }
  }, [committedSettings, isEditMode]);

  const fieldName = (suffix: string) => `${prefix}${suffix}`;
  const current = draftSettings;
  const layout = getDocumentLayoutSettings(current, documentType);

  const handleChange = (suffix: string, value: any) => {
    setDraftSettings((prev: any) => ({ ...prev, [fieldName(suffix)]: value }));
  };

  const handleLogoUpload = (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handleChange('Logo', reader.result);
    reader.readAsDataURL(file);
  };

  const resetCurrentFormDefaults = () => {
    const defaultKeys = Object.keys(DEFAULT_SETTINGS).filter((key) => key.startsWith(prefix));
    setDraftSettings((prev: any) => defaultKeys.reduce((next, key) => ({ ...next, [key]: DEFAULT_SETTINGS[key] }), { ...prev }));
  };

  const handleSaveChanges = async () => {
    const normalized = mergeSettings(draftSettings);
    const saved = await onSaveSettings(normalized);
    if (saved) {
      setSettings(normalized);
      setIsEditMode(false);
    }
  };

  const numberControl = (suffix: string, label: string, min = 0) => (
    <div className="flex items-center justify-between gap-4">
      <label className="text-[13px] font-medium text-slate-700">{label}</label>
      <input
        type="number"
        min={min}
        value={current[fieldName(suffix)]}
        onChange={(e) => handleChange(suffix, Number(e.target.value))}
        className="w-24 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">System Settings</div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">{config.label} Editor</h2>
            <p className="mt-2 text-sm text-slate-500">{config.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isEditMode ? (
              <button onClick={() => { setDraftSettings(committedSettings); setIsEditMode(true); }} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                <Edit3 size={16} className="mr-2" /> Modify Form
              </button>
            ) : (
              <>
                <button onClick={resetCurrentFormDefaults} className="inline-flex items-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                  <RotateCcw size={16} className="mr-2" /> Reset This Form
                </button>
                <button onClick={handleSaveChanges} disabled={isSavingTemplate} className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                  {isSavingTemplate ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <div className={`space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all ${!isEditMode ? 'opacity-60 pointer-events-none select-none' : ''}`}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500">Brand Logo</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <label className="text-[13px] font-medium text-slate-700">Choose File</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-1/2 text-xs" />
              </div>
              {layout.logo && (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-2 text-xs font-semibold text-slate-500">Current logo</div>
                  <div className="flex items-center justify-between gap-3">
                    <img src={layout.logo} alt={`${config.label} logo preview`} className="max-h-20 max-w-[220px] object-contain" />
                    <button onClick={() => handleChange('Logo', null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      Remove
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-slate-700">Show Brand Logo</label>
                <Toggle checked={current[fieldName('ShowLogo')]} onChange={(value) => handleChange('ShowLogo', value)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-slate-700">Show Logo Outline</label>
                <Toggle checked={current[fieldName('LogoOutline')]} onChange={(value) => handleChange('LogoOutline', value)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-slate-700">Show Page Outline</label>
                <Toggle checked={current[fieldName('PageOutline')]} onChange={(value) => handleChange('PageOutline', value)} />
              </div>
              {numberControl('LogoSize', 'Logo Height (px)', 24)}
              {numberControl('LogoGap', 'Gap Below Logo (px)', 0)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500">Page Padding</h3>
            <p className="mt-2 text-xs text-slate-500">These values control the printable page margins inside the A4 paper.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {numberControl('PagePaddingTop', 'Top', 0)}
              {numberControl('PagePaddingBottom', 'Bottom', 0)}
              {numberControl('PagePaddingLeft', 'Left', 0)}
              {numberControl('PagePaddingRight', 'Right', 0)}
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100/70 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Live Printable Preview</h3>
            <p className="text-sm text-slate-500">This is the same page used for Print and Download PDF.</p>
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-auto rounded-2xl border border-slate-200 bg-slate-200/60 p-3">
            {documentType === 'certificate' ? (
              <CertificateFormPage data={data} settings={current} />
            ) : (
              <ConsentFormPage data={data} settings={current} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomizeModule({ settings: committedSettings, setSettings, onSaveSettings, isSavingTemplate, doctors }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftSettings, setDraftSettings] = useState(committedSettings);

  useEffect(() => {
    if (!isEditMode) {
      setDraftSettings(committedSettings);
    }
  }, [committedSettings, isEditMode]);

  const settings = draftSettings;

  const handleChange = (field, value) => setDraftSettings(prev => ({ ...prev, [field]: value }));

  const handleImageUpload = (field, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleChange(field, reader.result);
      reader.readAsDataURL(file);
    }
  };

  const moveHeader = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === draftSettings.headerOrder.length - 1) return;
    const newOrder = [...draftSettings.headerOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + direction];
    newOrder[index + direction] = temp;
    handleChange('headerOrder', newOrder);
  };

  const moveSection = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === draftSettings.sectionOrder.length - 1) return;
    const newOrder = [...draftSettings.sectionOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + direction];
    newOrder[index + direction] = temp;
    handleChange('sectionOrder', newOrder);
  };

  const toggleSectionVis = (id) => {
    setDraftSettings(prev => ({ ...prev, visibility: { ...prev.visibility, [id]: !prev.visibility[id] } }));
  };

  const handleSaveChanges = async () => {
    const normalized = mergeSettings(draftSettings);
    const saved = await onSaveSettings(normalized);
    if (saved) {
      setSettings(normalized);
      setIsEditMode(false);
    }
  };

  const handleDefaultDoctorChange = (doctorId) => {
    const doctor = getDoctorById(doctors, doctorId);
    setDraftSettings((prev) => ({
      ...prev,
      defaultDentistId: doctorId,
      defaultDentistName: doctor?.name || '',
      defaultDentistRole: doctor?.role || 'Attending Dentist',
      defaultDentistSignature: doctor?.signature || null,
    }));
  };

  return (
    <div className="w-full space-y-6 pb-6">

      {/* EDIT MODE LOCK / UNLOCK CONTROLS */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 transition-all">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            {isEditMode ? <Unlock className="mr-2 text-green-500" size={20} /> : <Lock className="mr-2 text-slate-500" size={20} />}
            {isEditMode ? 'Editing Mode Active' : 'Template is Locked'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isEditMode ? 'Make your changes below and click Save when done.' : 'Click Modify PDF to unlock and customize the template settings.'}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          {!isEditMode ? (
            <button onClick={() => { setDraftSettings(committedSettings); setIsEditMode(true); }} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <Edit3 size={16} className="mr-2" /> Modify PDF
            </button>
          ) : (
            <>
              <button onClick={() => { if (window.confirm("Are you sure you want to reset all settings to default?")) setDraftSettings(DEFAULT_SETTINGS); }} className="flex items-center px-4 py-2 bg-white text-red-600 border border-red-200 rounded-md text-sm font-medium hover:bg-red-50 transition-colors shadow-sm">
                <RotateCcw size={16} className="mr-2" /> Reset Defaults
              </button>
              <button onClick={handleSaveChanges} disabled={isSavingTemplate} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-green-400 transition-colors shadow-sm">
                {isSavingTemplate ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />} Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* WRAP THE REST OF THE OPTIONS IN A VISUALLY DISABLED LAYER IF LOCKED */}
      <div className={`space-y-6 transition-all duration-300 ${!isEditMode ? 'opacity-60 pointer-events-none select-none' : ''}`}>

        {/* PRINT TARGET SETTINGS */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-200 bg-blue-50/30">
          <h3 className="text-[13px] font-semibold text-slate-800 mb-4">Pages to Print / Export</h3>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-8">
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={draftSettings.printPatientForm} onChange={e => handleChange('printPatientForm', e.target.checked)} className="rounded text-blue-600" />
              <span className="text-sm font-medium">Patient Information Form</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={draftSettings.printDentalChart} onChange={e => handleChange('printDentalChart', e.target.checked)} className="rounded text-blue-600" />
              <span className="text-sm font-medium">Dental Chart Form</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={draftSettings.printTreatmentRecord} onChange={e => handleChange('printTreatmentRecord', e.target.checked)} className="rounded text-blue-600" />
              <span className="text-sm font-medium">Treatment Record</span>
            </label>
          </div>
          <p className="text-xs text-slate-500 mt-3">Checked items will be combined into a single document when you click the Print or Download PDF buttons. Each form will print on a separate page.</p>
        </div>

        {/* HEADER LAYOUT ORDER */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-[13px] font-semibold text-slate-800 mb-2">Header Layout Order</h3>
          <p className="text-[11px] text-slate-500 mb-4">Click arrows to reorder how elements appear left-to-right in the header.</p>
          <div className="space-y-1">
            {settings.headerOrder.map((itemId, index) => {
              const item = HEADER_ITEMS.find(i => i.id === itemId);
              return (
                <div key={itemId} className="flex items-center space-x-3 py-2 border-b border-slate-100 last:border-0">
                  <GripVertical size={14} className="text-slate-300" />
                  <button onClick={() => moveHeader(index, -1)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ArrowUp size={14} /></button>
                  <button onClick={() => moveHeader(index, 1)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ArrowDown size={14} /></button>
                  <span className="text-[13px] text-slate-700">{item?.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* HEADER & BRANDING / IMAGES */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-8">

          {/* BRANDING */}
          <div>
            <h3 className="text-[13px] font-semibold text-slate-800 mb-4">Header & Branding</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Clinic Name</label>
                <input type="text" value={settings.clinicName} onChange={e => handleChange('clinicName', e.target.value)} className="w-1/2 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show Clinic Name</label>
                <Toggle checked={settings.showClinicName} onChange={v => handleChange('showClinicName', v)} />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Address</label>
                <input type="text" value={settings.clinicAddress} onChange={e => handleChange('clinicAddress', e.target.value)} className="w-1/2 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show Address</label>
                <Toggle checked={settings.showAddress} onChange={v => handleChange('showAddress', v)} />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Contact</label>
                <input type="text" value={settings.clinicContact} onChange={e => handleChange('clinicContact', e.target.value)} className="w-1/2 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show Contact</label>
                <Toggle checked={settings.showContact} onChange={v => handleChange('showContact', v)} />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <label className="text-[13px] text-slate-700 w-2/3">Header Bottom Margin (px)</label>
                <input type="number" value={settings.headerMarginBottom} onChange={e => handleChange('headerMarginBottom', Number(e.target.value))} className="w-20 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* PATIENT RECORD BADGE */}
          <div>
            <h3 className="text-[11px] text-slate-400 mb-4 uppercase tracking-wider">Record Title Badge (Middle Contents Spacing)</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Badge Text</label>
                <input type="text" value={settings.recordBadgeText} onChange={e => handleChange('recordBadgeText', e.target.value)} placeholder="Leave blank to hide text" className="w-1/2 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show Badge</label>
                <Toggle checked={settings.showRecordBadge} onChange={v => handleChange('showRecordBadge', v)} />
              </div>

              <div className="flex flex-col space-y-2 mt-2 pt-2">
                <span className="text-[12px] font-medium text-slate-700">Badge Margins (Adjust spacing below Header)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Margin Top (px)</label>
                    <input type="number" value={settings.recordBadgeMarginTop} onChange={e => handleChange('recordBadgeMarginTop', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Margin Bottom (px)</label>
                    <input type="number" value={settings.recordBadgeMarginBottom} onChange={e => handleChange('recordBadgeMarginBottom', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* LEFT IMAGE */}
          <div>
            <h3 className="text-[11px] text-slate-400 mb-4 uppercase tracking-wider">Left Image (Circle Format)</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Upload</label>
                <input type="file" accept="image/*" onChange={e => handleImageUpload('leftImage', e)} className="w-1/2 text-xs" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show</label>
                <Toggle checked={settings.showLeftImage} onChange={v => handleChange('showLeftImage', v)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show Outline</label>
                <Toggle checked={settings.leftImageOutline} onChange={v => handleChange('leftImageOutline', v)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Size (px)</label>
                <input type="number" value={settings.leftImageSize} onChange={e => handleChange('leftImageSize', Number(e.target.value))} className="w-20 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>

              <div className="flex flex-col space-y-2 mt-2 pt-4 border-t border-slate-100">
                <span className="text-[12px] font-medium text-slate-700">Margins (px)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Top</label>
                    <input type="number" value={settings.leftImageMarginTop} onChange={e => handleChange('leftImageMarginTop', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Bottom</label>
                    <input type="number" value={settings.leftImageMarginBottom} onChange={e => handleChange('leftImageMarginBottom', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Left</label>
                    <input type="number" value={settings.leftImageMarginLeft} onChange={e => handleChange('leftImageMarginLeft', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Right</label>
                    <input type="number" value={settings.leftImageMarginRight} onChange={e => handleChange('leftImageMarginRight', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* MIDDLE IMAGE */}
          <div>
            <h3 className="text-[11px] text-slate-400 mb-4 uppercase tracking-wider">Middle Image (Brand Name Logo)</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Upload</label>
                <input type="file" accept="image/*" onChange={e => handleImageUpload('middleImage', e)} className="w-1/2 text-xs" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show</label>
                <Toggle checked={settings.showMiddleImage} onChange={v => handleChange('showMiddleImage', v)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Size (px)</label>
                <input type="number" value={settings.middleImageSize} onChange={e => handleChange('middleImageSize', Number(e.target.value))} className="w-20 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
              </div>

              <div className="flex flex-col space-y-2 mt-2 pt-4 border-t border-slate-100">
                <span className="text-[12px] font-medium text-slate-700">Margins (px)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Top</label>
                    <input type="number" value={settings.middleMarginTop} onChange={e => handleChange('middleMarginTop', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Bottom</label>
                    <input type="number" value={settings.middleMarginBottom} onChange={e => handleChange('middleMarginBottom', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Left</label>
                    <input type="number" value={settings.middleMarginLeft} onChange={e => handleChange('middleMarginLeft', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Right</label>
                    <input type="number" value={settings.middleMarginRight} onChange={e => handleChange('middleMarginRight', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* RIGHT IMAGE */}
          <div>
            <h3 className="text-[11px] text-slate-400 mb-4 uppercase tracking-wider">Right Image (2x2 Photo Settings)</h3>
            <p className="text-xs text-slate-500 mb-4">You can set a default image here. Note: If a patient uploads their own 2x2 photo in the Form tab, it will automatically override this placeholder.</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Upload Default</label>
                <input type="file" accept="image/*" onChange={e => handleImageUpload('rightImage', e)} className="w-1/2 text-xs" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Show in Print</label>
                <Toggle checked={settings.showRightImage} onChange={v => handleChange('showRightImage', v)} />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[13px] text-slate-700 w-1/3">Image Fit</label>
                <select value={settings.rightImageFit} onChange={e => handleChange('rightImageFit', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-white rounded-md text-sm text-slate-700">
                  <option value="cover">Cover (Crop to fit)</option>
                  <option value="contain">Contain (Show whole)</option>
                  <option value="fill">Fill (Stretch)</option>
                </select>
              </div>

              <div className="flex flex-col space-y-2 mt-2 pt-2">
                <span className="text-[12px] font-medium text-slate-700">Crop Focus / Positioning (%)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Position X (0-100)</label>
                    <input type="number" min="0" max="100" value={settings.rightImagePositionX} onChange={e => handleChange('rightImagePositionX', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Position Y (0-100)</label>
                    <input type="number" min="0" max="100" value={settings.rightImagePositionY} onChange={e => handleChange('rightImagePositionY', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 mt-2 pt-4 border-t border-slate-100">
                <span className="text-[12px] font-medium text-slate-700">Margins (px)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Top</label>
                    <input type="number" value={settings.rightImageMarginTop} onChange={e => handleChange('rightImageMarginTop', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Bottom</label>
                    <input type="number" value={settings.rightImageMarginBottom} onChange={e => handleChange('rightImageMarginBottom', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Left</label>
                    <input type="number" value={settings.rightImageMarginLeft} onChange={e => handleChange('rightImageMarginLeft', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-500">Right</label>
                    <input type="number" value={settings.rightImageMarginRight} onChange={e => handleChange('rightImageMarginRight', Number(e.target.value))} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* DENTIST PROFILE & SIGNATURE */}
        <div className="bg-[#fdf4ff] p-6 rounded-lg shadow-sm border border-fuchsia-200 mt-6">
          <h3 className="text-[13px] font-bold text-fuchsia-900 mb-4 flex items-center"><Edit3 size={16} className="mr-2" /> Dentist Profile & Signature</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-fuchsia-800 font-medium">Default Dentist</label>
              {doctors.length > 0 ? (
                <select value={settings.defaultDentistId || ''} onChange={e => handleDefaultDoctorChange(e.target.value)} className="w-56 px-3 py-1.5 border border-fuchsia-300 bg-white rounded-md text-sm text-fuchsia-800">
                  <option value="">Select clinic dentist...</option>
                  {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
                </select>
              ) : (
                <span className="text-xs text-fuchsia-700">Add doctors first in System Settings.</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-fuchsia-800 font-medium">Dentist Name</label>
              <div className="w-56 rounded-md border border-fuchsia-200 bg-white px-3 py-2 text-sm text-fuchsia-900">{settings.defaultDentistName || 'No doctor selected yet'}</div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-fuchsia-800 font-medium">Dentist Title / Role</label>
              <div className="w-56 rounded-md border border-fuchsia-200 bg-white px-3 py-2 text-sm text-fuchsia-900">{settings.defaultDentistRole || 'Attending Dentist'}</div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-fuchsia-800 font-medium">Signature Source</label>
              <div className="w-56 rounded-md border border-fuchsia-200 bg-white px-3 py-2 text-sm text-fuchsia-900">
                {settings.defaultDentistSignature ? 'Using saved doctor signature' : 'No signature saved for selected doctor'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-fuchsia-800">Signature Size (px)</label>
              <input type="number" value={settings.dentistSignatureSize} onChange={e => handleChange('dentistSignatureSize', Number(e.target.value))} className="w-40 px-3 py-1.5 border border-fuchsia-300 rounded-md text-sm" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-fuchsia-800">Placement Strategy</label>
              <select value={settings.dentistSignaturePlacement} onChange={e => handleChange('dentistSignaturePlacement', e.target.value)} className="w-40 px-3 py-1.5 border border-fuchsia-300 bg-white rounded-md text-sm text-fuchsia-800">
                <option value="left">Left Align</option>
                <option value="center">Center Align</option>
                <option value="right">Right Align</option>
              </select>
            </div>

            <div className="mt-6 pt-4 border-t border-fuchsia-200">
              <h4 className="text-[12px] font-bold text-fuchsia-900 mb-3">Visibility Settings per Module</h4>

              <div className="mb-4">
                <h5 className="text-[11px] font-semibold text-slate-700 uppercase mb-2">Patient Information Record</h5>
                <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded border border-fuchsia-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-600">Show Name</label>
                    <Toggle checked={settings.showDentistNameInPatientRecord} onChange={v => handleChange('showDentistNameInPatientRecord', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-600">Show Signature</label>
                    <Toggle checked={settings.showSignatureInPatientRecord} onChange={v => handleChange('showSignatureInPatientRecord', v)} />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h5 className="text-[11px] font-semibold text-slate-700 uppercase mb-2">Dental Chart</h5>
                <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded border border-fuchsia-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-600">Show Name</label>
                    <Toggle checked={settings.showDentistNameInDentalChart} onChange={v => handleChange('showDentistNameInDentalChart', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-600">Show Signature</label>
                    <Toggle checked={settings.showSignatureInDentalChart} onChange={v => handleChange('showSignatureInDentalChart', v)} />
                  </div>
                </div>
              </div>

              <div>
                <h5 className="text-[11px] font-semibold text-slate-700 uppercase mb-2">Treatment Record</h5>
                <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded border border-fuchsia-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-600">Show Name</label>
                    <Toggle checked={settings.showDentistNameInTreatmentRecord} onChange={v => handleChange('showDentistNameInTreatmentRecord', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-600">Show Signature</label>
                    <Toggle checked={settings.showSignatureInTreatmentRecord} onChange={v => handleChange('showSignatureInTreatmentRecord', v)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTIONS */}
        <div className="bg-[#cfd2d6] p-6 rounded-lg shadow-sm border border-slate-300 mt-6">
          <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Patient Form Sections</h3>
          <div className="space-y-2">
            {settings.sectionOrder.map((sectionId, index) => {
              const section = SECTIONS.find(s => s.id === sectionId);
              const isVisible = settings.visibility[sectionId];
              return (
                <div key={sectionId} className={`flex items-center space-x-3 py-2 px-3 border border-slate-400/30 rounded-md bg-[#e2e5e8] transition-opacity ${!isVisible ? 'opacity-50' : ''}`}>
                  <button onClick={() => moveSection(index, -1)} className="text-slate-500 hover:text-slate-800"><ArrowUp size={14} /></button>
                  <button onClick={() => moveSection(index, 1)} className="text-slate-500 hover:text-slate-800"><ArrowDown size={14} /></button>
                  <button onClick={() => toggleSectionVis(sectionId)} className={`hover:text-blue-600 ${isVisible ? 'text-slate-600' : 'text-slate-400'}`}>
                    {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <span className={`text-[13px] ml-2 ${!isVisible ? 'line-through text-slate-500' : 'text-slate-700'}`}>{section?.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* DENTAL CHART SETTINGS */}
        <div className="bg-[#e0f2fe] p-6 rounded-lg shadow-sm border border-blue-200">
          <h3 className="text-[13px] font-bold text-blue-900 mb-4 flex items-center"><Activity size={16} className="mr-2" /> Dental Chart Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-blue-800 font-medium">Chart Main Title</label>
              <input type="text" value={settings.chartTitle} onChange={e => handleChange('chartTitle', e.target.value)} className="w-40 px-3 py-1.5 border border-blue-300 rounded-md text-sm" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-blue-800">Show Chart Title</label>
              <Toggle checked={settings.showChartTitle} onChange={v => handleChange('showChartTitle', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-blue-800">Show Legend</label>
              <Toggle checked={settings.showChartLegend} onChange={v => handleChange('showChartLegend', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-blue-800">Show Findings</label>
              <Toggle checked={settings.showChartFindings} onChange={v => handleChange('showChartFindings', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-blue-800">Show Recommendations</label>
              <Toggle checked={settings.showChartRecommendation} onChange={v => handleChange('showChartRecommendation', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-blue-800">Show Footer (Sign-off)</label>
              <Toggle checked={settings.showChartFooter} onChange={v => handleChange('showChartFooter', v)} />
            </div>
          </div>
        </div>

        {/* TREATMENT RECORD SETTINGS */}
        <div className="bg-[#ecfccb] p-6 rounded-lg shadow-sm border border-sky-200">
          <h3 className="text-[13px] font-bold text-sky-900 mb-4 flex items-center"><ClipboardList size={16} className="mr-2" /> Treatment Record Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-sky-800 font-medium">Table Title</label>
              <input type="text" value={settings.treatmentTitle} onChange={e => handleChange('treatmentTitle', e.target.value)} className="w-40 px-3 py-1.5 border border-sky-300 rounded-md text-sm" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-sky-800">Show Title</label>
              <Toggle checked={settings.showTreatmentTitle} onChange={v => handleChange('showTreatmentTitle', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-sky-800">Show Dentist Column</label>
              <Toggle checked={settings.showDentistColumn} onChange={v => handleChange('showDentistColumn', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-sky-800">Show Balance Column</label>
              <Toggle checked={settings.showBalanceColumn} onChange={v => handleChange('showBalanceColumn', v)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-sky-800">Row Height Density</label>
              <select value={settings.treatmentRowHeight} onChange={e => handleChange('treatmentRowHeight', e.target.value)} className="w-40 px-3 py-1.5 border border-sky-300 bg-white rounded-md text-sm text-sky-800">
                <option value="Compact">Compact (Fits More)</option>
                <option value="Normal">Normal</option>
              </select>
            </div>
          </div>
        </div>

        {/* TYPOGRAPHY */}
        <div className="bg-[#cfd2d6] p-6 rounded-lg shadow-sm border border-slate-300">
          <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Typography</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Font Size</label>
              <select value={settings.fontSize} onChange={e => handleChange('fontSize', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                {['Small', 'Medium', 'Large'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Label Size</label>
              <select value={settings.labelSize} onChange={e => handleChange('labelSize', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                {['Small', 'Medium', 'Large'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Line Spacing</label>
              <select value={settings.lineSpacing} onChange={e => handleChange('lineSpacing', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                {['Tight', 'Normal', 'Loose'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* PRINT STYLE */}
        <div className="bg-[#cfd2d6] p-6 rounded-lg shadow-sm border border-slate-300">
          <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Print Style</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Border Style</label>
              <select value={settings.borderStyle} onChange={e => handleChange('borderStyle', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                <option value="border-black">Solid Black</option>
                <option value="border-slate-800">Dark Gray</option>
                <option value="border-transparent">None</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Underline Style</label>
              <select value={settings.underlineStyle} onChange={e => handleChange('underlineStyle', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                {['Solid', 'Dashed', 'Dotted'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Section Separator</label>
              <select value={settings.sectionSeparator} onChange={e => handleChange('sectionSeparator', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                {['None', 'Line', 'Space'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-slate-700">Overflow Behavior</label>
              <select value={settings.overflowBehavior} onChange={e => handleChange('overflowBehavior', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
                {['Truncate', 'Wrap (May overflow page)'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* LAYOUT */}
        <div className="bg-[#cfd2d6] p-6 rounded-lg shadow-sm border border-slate-300">
          <h3 className="text-[13px] font-semibold text-slate-700 mb-4">Layout</h3>
          <div className="flex items-center justify-between">
            <label className="text-[13px] text-slate-700">Spacing Density</label>
            <select value={settings.density} onChange={e => handleChange('density', e.target.value)} className="w-40 px-3 py-1.5 border border-slate-300 bg-[#e2e5e8] rounded-md text-sm text-slate-700">
              {['Compact', 'Comfortable'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </div>

    </div>
  );
}
