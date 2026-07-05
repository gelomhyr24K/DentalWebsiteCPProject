import * as XLSX from 'xlsx';
import { PatientRecord } from '../../types';

export interface ValidationError {
  row: number;
  patientId: string;
  column: string;
  error: string;
  suggestedFix: string;
  severity: 'warning' | 'error';
}

export interface MappedColumn {
  legacyHeader: string;
  internalKey: string;
  isMapped: boolean;
}

export interface TransformationReport {
  detectedFile: string;
  detectedTemplate: string;
  detectedLegacyVersion: string;
  mappedColumns: MappedColumn[];
  unmappedColumns: string[];
  autoCorrectedFields: Array<{ row: number; field: string; original: string; corrected: string }>;
  warnings: Array<{ row: number; message: string }>;
  criticalErrors: Array<{ row: number; message: string }>;
  transformationSummary: string;
  importSummary: string;
  savedAt: string;
}

export interface TemplateProfile {
  name: string;
  filePatterns: string[];
  requiredFields: string[];
  optionalFields: string[];
  mappings: Record<string, string[]>; // internalKey -> legacy synonyms
  transformationRules: Record<string, (val: any) => any>;
  validationRules: Record<string, (val: any, row: any) => string | null>;
}

// Global list of modular template profiles
export const TEMPLATE_PROFILES: TemplateProfile[] = [
  {
    name: 'Patients',
    filePatterns: ['patient', 'pat_reg', 'demographics'],
    requiredFields: ['firstName', 'lastName'],
    optionalFields: [
      'patientId', 'middleName', 'birthday', 'gender', 'mobile', 'email', 'address',
      'school', 'occupation', 'civilStatus', 'emergencyContact', 'emergencyNumber',
      'medicalCondition', 'previousHospitalization', 'medications', 'allergies',
      'medicalConcerns', 'familyMedicalConcerns', 'physician', 'physicianContact',
      'consultationReason', 'dentalExperience', 'brushingDifficulty', 'fluorideDetails',
      'childDiet', 'lastRecall', 'lastRecallSummary', 'hmo', 'bloodType'
    ],
    mappings: {
      patientId: ['PATIENT ID', 'PATIENT_ID', 'PATIENTID', 'PAT ID', 'PAT_ID', 'ID', 'LEGACY ID', 'LEGACY_ID', 'PATIENT_ID_LINK', 'PATIENT_REF', 'PATIENT_NUMBER'],
      firstName: ['FIRSTNAME', 'FIRST NAME', 'FIRST_NAME', 'GIVEN NAME', 'GIVEN_NAME', 'FNAME', 'FIRSTNAME_LEGACY'],
      lastName: ['LASTNAME', 'LAST NAME', 'LAST_NAME', 'SURNAME', 'LNAME', 'LASTNAME_LEGACY'],
      middleName: ['MIDDLENAME', 'MIDDLE NAME', 'MIDDLE_NAME', 'MNAME', 'MID_NAME'],
      birthday: ['BIRTHDAY', 'BIRTH DATE', 'BIRTH_DATE', 'DOB', 'BORN', 'DATE_OF_BIRTH', 'BIRTH_DT'],
      gender: ['GENDER', 'SEX', 'M/F', 'SEX_TYPE'],
      mobile: ['MOBILE', 'PHONE', 'CONTACT', 'MOBILE NUMBER', 'MOBILE_NUMBER', 'TEL', 'TELEPHONE', 'MOBILE_PHONE', 'PHONE_NUMBER'],
      email: ['EMAIL', 'EMAIL ADDRESS', 'EMAIL_ADDRESS'],
      address: ['ADDRESS', 'HOME ADDRESS', 'HOME_ADDRESS', 'LOCATION', 'CITY'],
      school: ['SCHOOL', 'COLLEGE', 'UNIVERSITY', 'INSTITUTION'],
      occupation: ['OCCUPATION', 'JOB', 'PROFESSION', 'WORK'],
      civilStatus: ['CIVIL STATUS', 'CIVIL_STATUS', 'MARITAL STATUS', 'MARITAL_STATUS', 'STATUS'],
      emergencyContact: ['PERSON TO CONTACT', 'EMERGENCY CONTACT', 'CONTACT_PERSON', 'GUARDIAN'],
      emergencyNumber: ['EMERGENCY NUMBER', 'EMERGENCY_NUMBER', 'EMERGENCY CONTACT PHONE', 'EMERGENCY_PHONE'],
      medicalCondition: ['MEDICAL CONDITION', 'MEDICAL_CONDITION', 'DISEASES', 'ILLNESS'],
      previousHospitalization: ['PREVIOUS HOSPITALIZATION', 'PREVIOUS_HOSPITALIZATION', 'HOSPITALIZED', 'HOSPITALIZATION_HISTORY'],
      medications: ['MEDICATIONS', 'PRESCRIBED MEDICATIONS', 'CURRENT_MEDICATIONS', 'DRUGS'],
      allergies: ['ALLEGIES', 'ALLERGIES', 'MEDICATION_ALLERGIES', 'ALLERGIC_TO'],
      medicalConcerns: ['MEDICAL CONCERNS', 'MEDICAL_CONCERNS', 'CONCERNS', 'OTHER_MEDICAL_CONCERNS'],
      familyMedicalConcerns: ['FAMILY MEDICAL CONCERNS', 'FAMILY_MEDICAL_CONCERNS', 'FAMILY_HISTORY', 'HEREDITARY_DISEASES'],
      physician: ['PHYSICIAN', 'DOCTOR', 'FAMILY_PHYSICIAN', 'MD'],
      physicianContact: ['PHYSICIAN CONTACT', 'PHYSICIAN_CONTACT', 'DOCTOR_PHONE', 'PHYSICIAN_PHONE'],
      consultationReason: ['CONSULTATION REASON', 'CONSULTATION_REASON', 'CHIEF_COMPLAINT', 'REASON_FOR_VISIT'],
      dentalExperience: ['DENTAL EXPERIENCE', 'DENTAL_EXPERIENCE', 'PREVIOUS_DENTAL_EXPERIENCE', 'BAD_EXPERIENCE'],
      brushingDifficulty: ['BRUSHING DIFFICULTY', 'BRUSHING_DIFFICULTY', 'ORAL_HYGIENE_ISSUES'],
      fluorideDetails: ['FLUORIDE DETAILS', 'FLUORIDE_DETAILS', 'FLUORIDES_RECEIVED', 'FLUORIDE_HISTORY'],
      childDiet: ['CHILD DIET', 'CHILD_DIET', 'DIET_HABITS', 'PATIENTS_DIET'],
      lastRecall: ['LAST RECALL', 'LAST_RECALL', 'LAST_RECALL_DATE', 'RECALL_DATETIME'],
      lastRecallSummary: ['LAST RECALL SUMMARY', 'LAST_RECALL_SUMMARY', 'RECALL_REMARKS', 'LAST_RECALL_DETAILS'],
      hmo: ['HMO', 'HEALTH CARD', 'INSURANCE', 'HEALTH_INSURANCE', 'HMO_PROVIDER'],
      bloodType: ['BLOOD TYPE', 'BLOOD_TYPE', 'BLOOD', 'BG']
    },
    transformationRules: {
      birthday: (val) => formatDate(val),
      lastRecall: (val) => formatDate(val),
      gender: (val) => {
        if (!val) return 'Male';
        const str = String(val).trim().toUpperCase();
        if (str.startsWith('F') || str === 'FEMALE') return 'Female';
        return 'Male';
      },
      mobile: (val) => cleanDigits(val)
    },
    validationRules: {
      firstName: (val) => !val ? 'First name is required' : null,
      lastName: (val) => !val ? 'Last name is required' : null,
      email: (val) => (val && !String(val).includes('@')) ? 'Invalid email format' : null
    }
  },
  {
    name: 'Bills',
    filePatterns: ['bill', 'invoice', 'ledger', 'payment', 'charge'],
    requiredFields: ['patientId', 'serviceType'],
    optionalFields: ['firstName', 'lastName', 'middleName', 'billDate', 'item', 'quantity', 'unit', 'unitPrice', 'discount', 'discountPercent', 'netTotal', 'remarks', 'status'],
    mappings: {
      patientId: ['PATIENT ID', 'PATIENT_ID', 'PATIENTID', 'PAT ID', 'PAT_ID', 'ID', 'LEGACY ID', 'LEGACY_ID', 'PATIENT_REF'],
      firstName: ['FIRSTNAME', 'FIRST NAME', 'FIRST_NAME', 'FNAME'],
      lastName: ['LASTNAME', 'LAST NAME', 'LAST_NAME', 'LNAME'],
      middleName: ['MIDDLENAME', 'MIDDLE NAME', 'MIDDLE_NAME'],
      billDate: ['BILL_DT', 'BILL DATE', 'BILL_DATE', 'DATE', 'INVOICE DATE', 'INVOICE_DATE', 'DATETIME', 'DATE_TIME'],
      serviceType: ['SERVICE_TYPE', 'SERVICE TYPE', 'SERVICE', 'PROCEDURE', 'TREATMENT', 'PLAN_PROCEDURE', 'PROCEDURE_NAME'],
      item: ['ITEM', 'PARTICULAR', 'PRODUCT'],
      quantity: ['QTY', 'QUANTITY', 'COUNT'],
      unit: ['UNIT', 'PIECE', 'MEASURE'],
      unitPrice: ['UNIT_PRICE', 'UNIT PRICE', 'PRICE', 'COST', 'AMOUNT', 'RATE'],
      discount: ['DISCOUNT', 'DISCOUNT_AMOUNT', 'DISCOUNT AMOUNT', 'SERVICE_DISCOUNT_AMOUNT'],
      discountPercent: ['DISCOUNT_PERCENT', 'DISCOUNT PERCENT', 'DISCOUNT_PERCENTAGE', 'SERVICE_DISCOUNT_PERCENT'],
      netTotal: ['NET_TOTAL', 'NET TOTAL', 'NET_COST', 'NET COST', 'TOTAL_AMOUNT', 'TOTAL AMOUNT', 'SUB_TOTAL', 'SUBTOTAL', 'COST', 'AMOUNT'],
      remarks: ['REMARKS', 'NOTE', 'NOTES', 'REMARK', 'COMMENTS', 'COMMENT'],
      status: ['STATUS', 'PAYMENT_STATUS', 'BILL_STATUS']
    },
    transformationRules: {
      billDate: (val) => formatDate(val),
      unitPrice: (val) => cleanNumber(val),
      discount: (val) => cleanNumber(val),
      discountPercent: (val) => cleanNumber(val),
      netTotal: (val) => cleanNumber(val),
      quantity: (val) => cleanNumber(val) || 1
    },
    validationRules: {
      patientId: (val) => !val ? 'Patient ID reference is missing' : null,
      serviceType: (val) => !val ? 'Service procedure is required' : null
    }
  },
  {
    name: 'Progress Notes',
    filePatterns: ['progress_note', 'visit_note', 'treatment_note', 'clinical_note', 'consultation'],
    requiredFields: ['patientId'],
    optionalFields: ['firstName', 'lastName', 'middleName', 'visitDate', 'serviceType', 'toothNumber', 'unitPrice', 'netTotal', 'remarks'],
    mappings: {
      patientId: ['PATIENT ID', 'PATIENT_ID', 'PATIENTID', 'PAT ID', 'PAT_ID', 'ID', 'LEGACY ID', 'LEGACY_ID', 'PATIENT_REF'],
      firstName: ['FIRSTNAME', 'FIRST NAME', 'FIRST_NAME', 'FNAME'],
      lastName: ['LASTNAME', 'LAST NAME', 'LAST_NAME', 'LNAME'],
      middleName: ['MIDDLENAME', 'MIDDLE NAME', 'MIDDLE_NAME'],
      visitDate: ['VISIT_DT', 'VISIT DATE', 'VISIT_DATE', 'DATE_OF_VISIT', 'DATETIME', 'DATE', 'DATE_TIME'],
      serviceType: ['SERVICE_TYPE', 'SERVICE TYPE', 'SERVICE', 'PROCEDURE', 'TREATMENT', 'PLAN_PROCEDURE'],
      toothNumber: ['TOOTH_NO', 'TOOTH NO', 'TOOTH_NUMBER', 'TOOTH NUMBER', 'TOOTH', 'TEETH'],
      unitPrice: ['UNIT_PRICE', 'UNIT PRICE', 'PRICE', 'COST', 'AMOUNT'],
      netTotal: ['NET_TOTAL', 'NET TOTAL', 'NET_COST', 'NET COST', 'TOTAL', 'SUB_TOTAL', 'SUBTOTAL', 'COST', 'AMOUNT'],
      remarks: ['PROGRESS_NOTES', 'PROGRESS NOTES', 'REMARKS', 'NOTE', 'NOTES', 'REMARK', 'COMMENTS', 'COMMENT', 'CLINICAL_SUMMARY']
    },
    transformationRules: {
      visitDate: (val) => formatDate(val),
      unitPrice: (val) => cleanNumber(val),
      netTotal: (val) => cleanNumber(val)
    },
    validationRules: {
      patientId: (val) => !val ? 'Patient ID is required' : null
    }
  },
  {
    name: 'Treatment Plans',
    filePatterns: ['treatment_plan', 'dental_plan', 'plan_catalog'],
    requiredFields: ['patientId', 'finding'],
    optionalFields: ['firstName', 'lastName', 'middleName', 'planDate', 'finding', 'remarks'],
    mappings: {
      patientId: ['PATIENT ID', 'PATIENT_ID', 'PATIENTID', 'PAT ID', 'PAT_ID', 'ID', 'LEGACY ID', 'LEGACY_ID', 'PATIENT_REF'],
      firstName: ['FIRSTNAME', 'FIRST NAME', 'FIRST_NAME', 'FNAME'],
      lastName: ['LASTNAME', 'LAST NAME', 'LAST_NAME', 'LNAME'],
      middleName: ['MIDDLENAME', 'MIDDLE NAME', 'MIDDLE_NAME'],
      planDate: ['Date/Time', 'DATE_TIME', 'DATE TIME', 'DATE', 'DATETIME', 'PLAN_DATE', 'PLAN DATE', 'PLAN_DATE_TIME'],
      finding: ['FINDING', 'DIAGNOSIS', 'FINDINGS', 'CERTIFICATE', 'PLAN_PROCEDURE', 'SERVICE_TYPE', 'SERVICE'],
      remarks: ['REMARKS', 'NOTE', 'NOTES', 'REMARK', 'COMMENTS', 'COMMENT']
    },
    transformationRules: {
      planDate: (val) => formatDate(val)
    },
    validationRules: {
      patientId: (val) => !val ? 'Patient ID is required' : null,
      finding: (val) => !val ? 'Clinical finding description is required' : null
    }
  },
  {
    name: 'Prescriptions',
    filePatterns: ['prescription', 'rx_list', 'medicine_order', 'rx'],
    requiredFields: ['patientId', 'medicine'],
    optionalFields: ['firstName', 'lastName', 'middleName', 'prescriptionDate', 'medicine', 'dosage', 'quantity', 'remarks'],
    mappings: {
      patientId: ['PATIENT ID', 'PATIENT_ID', 'PATIENTID', 'PAT ID', 'PAT_ID', 'ID', 'LEGACY ID', 'LEGACY_ID', 'PATIENT_REF'],
      firstName: ['FIRSTNAME', 'FIRST NAME', 'FIRST_NAME', 'FNAME'],
      lastName: ['LASTNAME', 'LAST NAME', 'LAST_NAME', 'LNAME'],
      middleName: ['MIDDLENAME', 'MIDDLE NAME', 'MIDDLE_NAME'],
      prescriptionDate: ['PRESCRIBED_DATE', 'PRESCRIBED DATE', 'PRESCRIBE_DATE', 'DATE_PRESCRIBED', 'DATE', 'DATETIME', 'DATE_TIME'],
      medicine: ['MEDICINE', 'DRUG', 'MEDICATION', 'DRUG_NAME', 'MEDICINE_NAME'],
      dosage: ['DOSAGE', 'DOSE', 'FREQUENCY', 'INSTRUCTIONS'],
      quantity: ['QTY', 'QUANTITY', 'COUNT', 'AMOUNT'],
      remarks: ['REMARKS', 'NOTE', 'NOTES', 'REMARK', 'COMMENTS', 'COMMENT']
    },
    transformationRules: {
      prescriptionDate: (val) => formatDate(val),
      quantity: (val) => cleanNumber(val) || 1
    },
    validationRules: {
      patientId: (val) => !val ? 'Patient ID is required' : null,
      medicine: (val) => !val ? 'Medicine description is required' : null
    }
  },
  {
    name: 'Certificates',
    filePatterns: ['certificate', 'dental_cert', 'med_cert', 'clearance'],
    requiredFields: ['patientId', 'certificateType'],
    optionalFields: ['firstName', 'lastName', 'middleName', 'certificateDate', 'certificateType', 'remarks'],
    mappings: {
      patientId: ['PATIENT ID', 'PATIENT_ID', 'PATIENTID', 'PAT ID', 'PAT_ID', 'ID', 'LEGACY ID', 'LEGACY_ID', 'PATIENT_REF'],
      firstName: ['FIRSTNAME', 'FIRST NAME', 'FIRST_NAME', 'FNAME'],
      lastName: ['LASTNAME', 'LAST NAME', 'LAST_NAME', 'LNAME'],
      middleName: ['MIDDLENAME', 'MIDDLE NAME', 'MIDDLE_NAME'],
      certificateDate: ['Date/Time', 'DATE_TIME', 'DATE TIME', 'DATE', 'DATETIME', 'CERTIFICATE_DATE', 'CERT_DATE'],
      certificateType: ['CERTIFICATE', 'CERTIFICATE_TYPE', 'CERT_TYPE', 'DIAGNOSIS', 'PURPOSE'],
      remarks: ['REMARKS', 'NOTE', 'NOTES', 'REMARK', 'COMMENTS', 'COMMENT']
    },
    transformationRules: {
      certificateDate: (val) => formatDate(val)
    },
    validationRules: {
      patientId: (val) => !val ? 'Patient ID is required' : null,
      certificateType: (val) => !val ? 'Certificate type is required' : null
    }
  },
  {
    name: 'Notes',
    filePatterns: ['notes', 'clinical_note', 'general_notes', 'patient_note'],
    requiredFields: ['patientId', 'noteText'],
    optionalFields: ['firstName', 'lastName', 'middleName', 'noteDate', 'noteText'],
    mappings: {
      patientId: ['PATIENT ID', 'PATIENT_ID', 'PATIENTID', 'PAT ID', 'PAT_ID', 'ID', 'LEGACY ID', 'LEGACY_ID', 'PATIENT_REF'],
      firstName: ['FIRSTNAME', 'FIRST NAME', 'FIRST_NAME', 'FNAME'],
      lastName: ['LASTNAME', 'LAST NAME', 'LAST_NAME', 'LNAME'],
      middleName: ['MIDDLENAME', 'MIDDLE NAME', 'MIDDLE_NAME'],
      noteDate: ['Date/Time', 'DATE_TIME', 'DATE TIME', 'DATE', 'DATETIME', 'NOTE_DATE', 'NOTE_DATE_TIME'],
      noteText: ['NOTE', 'NOTES', 'NOTE_TEXT', 'CONTENT', 'GENERAL_NOTE']
    },
    transformationRules: {
      noteDate: (val) => formatDate(val)
    },
    validationRules: {
      patientId: (val) => !val ? 'Patient ID is required' : null,
      noteText: (val) => !val ? 'Note content text is required' : null
    }
  },
  {
    name: 'Appointments',
    filePatterns: ['appointment', 'sched', 'booking', 'appt'],
    requiredFields: ['patientId', 'title'],
    optionalFields: ['firstName', 'lastName', 'middleName', 'startDate', 'endDate', 'status', 'remarks'],
    mappings: {
      patientId: ['PATIENT ID', 'PATIENT_ID', 'PATIENTID', 'PAT ID', 'PAT_ID', 'ID', 'LEGACY ID', 'LEGACY_ID', 'PATIENT_REF'],
      firstName: ['FIRSTNAME', 'FIRST NAME', 'FIRST_NAME', 'FNAME'],
      lastName: ['LASTNAME', 'LAST NAME', 'LAST_NAME', 'LNAME'],
      middleName: ['MIDDLENAME', 'MIDDLE_NAME', 'MIDDLE NAME'],
      startDate: ['START_DATE', 'START DATE', 'START_DATETIME', 'DATE', 'APPOINTMENT DATE', 'APPOINTMENT_DATE', 'DATETIME', 'START'],
      endDate: ['END_DATE', 'END DATE', 'END_DATETIME', 'END'],
      title: ['TITLE', 'PURPOSE', 'REASON_FOR_VISIT', 'CHIEF_COMPLAINT', 'REASON', 'SERVICE_TYPE', 'SERVICE'],
      status: ['STATUS', 'APPOINTMENT_STATUS', 'STATE'],
      remarks: ['REMARKS', 'NOTE', 'NOTES', 'REMARK', 'COMMENTS', 'COMMENT']
    },
    transformationRules: {
      startDate: (val) => formatDate(val),
      endDate: (val) => formatDate(val)
    },
    validationRules: {
      patientId: (val) => !val ? 'Patient ID reference is required' : null,
      title: (val) => !val ? 'Appointment purpose/title is required' : null
    }
  },
  {
    name: 'Export Errors',
    filePatterns: ['export_errors', 'migration_errors', 'import_errors', 'error_log'],
    requiredFields: ['errorMessage'],
    optionalFields: ['sheetName', 'errorMessage'],
    mappings: {
      sheetName: ['SHEET', 'SHEETNAME', 'WORKSHEET', 'FILE', 'SOURCE'],
      errorMessage: ['ERROR', 'ERROR_MESSAGE', 'MESSAGE', 'EXCEPTION', 'FAULT']
    },
    transformationRules: {},
    validationRules: {
      errorMessage: (val) => !val ? 'Error message content is required' : null
    }
  }
];

// Helper transformation utilities
export function formatDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  const str = String(val).trim();
  
  // Handle Excel serialized dates
  if (!isNaN(Number(str)) && Number(str) > 30000 && Number(str) < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const msSinceEpoch = Number(str) * 24 * 60 * 60 * 1000;
    const finalDate = new Date(excelEpoch.getTime() + msSinceEpoch);
    if (!isNaN(finalDate.getTime())) {
      return finalDate.toISOString().split('T')[0];
    }
  }
  
  // Try parsing directly
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  
  // Handle formats like DD/MM/YYYY or MM/DD/YYYY
  const parts = str.split(/[\/\-.]/);
  if (parts.length === 3) {
    // Check if it starts with year
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    // Assume MM/DD/YYYY or DD/MM/YYYY. Let's assume MM/DD/YYYY for US standard, DD/MM/YYYY for others
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    if (p0 > 12) {
      // Must be DD/MM/YYYY
      return `${p2}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
    } else {
      // MM/DD/YYYY
      return `${p2}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
  }
  
  return new Date().toISOString().split('T')[0];
}

export function cleanDigits(val: any): string {
  if (!val) return '';
  return String(val).replace(/\D/g, '');
}

export function cleanNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function normalizeHeader(h: string): string {
  return h.trim().toUpperCase().replace(/[\s_\-\[\]]+/g, ' ');
}

// Map any legacy column header to its internal target key using synonyms
export function mapHeaderToKey(header: string, profile: TemplateProfile): string | null {
  const norm = normalizeHeader(header);
  for (const [internalKey, synonyms] of Object.entries(profile.mappings)) {
    if (synonyms.some(s => normalizeHeader(s) === norm)) {
      return internalKey;
    }
  }
  // Trimmed exact lowercase matches
  const exactKey = header.trim();
  if (profile.optionalFields.includes(exactKey) || profile.requiredFields.includes(exactKey)) {
    return exactKey;
  }
  // Case-insensitive match on camelCase standard keys
  const lowerHeader = exactKey.toLowerCase();
  const foundKey = [...profile.requiredFields, ...profile.optionalFields].find(
    f => f.toLowerCase() === lowerHeader
  );
  if (foundKey) {
    return foundKey;
  }
  return null;
}

// Intelligent template profile detection based on file metadata and headers
export function detectProfile(
  filename: string,
  headers: string[],
  sheetName?: string
): { profile: TemplateProfile; confidence: number; version: string } {
  let bestProfile = TEMPLATE_PROFILES[0];
  let maxScore = -1;
  const lowerName = filename.toLowerCase();
  const lowerSheet = sheetName ? sheetName.toLowerCase() : '';

  for (const p of TEMPLATE_PROFILES) {
    let score = 0;
    
    // Pattern matches in filename or sheetname
    const matchesPattern = p.filePatterns.some(
      pat => lowerName.includes(pat) || lowerSheet.includes(pat)
    );
    if (matchesPattern) score += 50;

    // Header column match score
    let mappedCount = 0;
    headers.forEach(h => {
      if (mapHeaderToKey(h, p)) {
        mappedCount++;
      }
    });

    const headerRatio = headers.length > 0 ? mappedCount / headers.length : 0;
    score += Math.round(headerRatio * 40);

    // Required fields presence
    const mappedKeys = headers.map(h => mapHeaderToKey(h, p)).filter(Boolean) as string[];
    const hasAllRequired = p.requiredFields.every(req => mappedKeys.includes(req));
    if (hasAllRequired) score += 30;

    if (score > maxScore) {
      maxScore = score;
      bestProfile = p;
    }
  }

  // Version detection
  let version = 'v1.0 (Legacy Export)';
  if (headers.includes('GIC Resto') || headers.includes('Odontectomy') || headers.includes('service_discount_percent')) {
    version = 'v2.4 (Enterprise Suite)';
  } else if (headers.includes('GENDER') || headers.includes('MEDICAL CONDITION')) {
    version = 'v1.2 (P&J Standard)';
  }

  return { profile: bestProfile, confidence: maxScore, version };
}

// Transform raw fields into internal structured data format
export function transformRow(
  rowObj: Record<string, string>,
  profile: TemplateProfile,
  rowNo: number,
  records: PatientRecord[],
  autoCorrectLogs: Array<{ row: number; field: string; original: string; corrected: string }>,
  warnings: Array<{ row: number; message: string }>
): { transformed: Record<string, any>; hasError: boolean; errors: string[] } {
  const transformed: Record<string, any> = { rowIndex: rowNo };
  const errors: string[] = [];

  // 1. Build standardized field entries
  Object.entries(rowObj).forEach(([legacyHeader, rawValue]) => {
    const internalKey = mapHeaderToKey(legacyHeader, profile);
    if (internalKey) {
      transformed[internalKey] = rawValue;
    } else {
      // Keep unmapped fields as-is so they are visible
      transformed[legacyHeader] = rawValue;
    }
  });

  // 2. Perform transformation rules (cleaning dates, numbers, etc.)
  Object.keys(profile.transformationRules).forEach((key) => {
    if (transformed[key] !== undefined) {
      const orig = transformed[key];
      const rule = profile.transformationRules[key];
      const result = rule(orig);
      if (orig !== result && String(orig).trim() !== String(result).trim()) {
        autoCorrectLogs.push({
          row: rowNo,
          field: key,
          original: String(orig),
          corrected: String(result)
        });
      }
      transformed[key] = result;
    }
  });

  // 3. Smart Relationship Matching & Entity Resolution
  if (profile.name !== 'Patients' && transformed.patientId) {
    const rawId = String(transformed.patientId).trim();
    const existing = records.find(r => String(r.id).trim() === rawId);
    
    if (!existing) {
      // Try smart matching on patient name details in the row (if they are provided)
      const fName = (transformed.firstName || rowObj.firstname || rowObj.FIRSTNAME || '').trim();
      const lName = (transformed.lastName || rowObj.lastname || rowObj.LASTNAME || '').trim();
      
      if (fName && lName) {
        const smartMatch = records.find(
          r => r.personalInfo.firstName.trim().toLowerCase() === fName.toLowerCase() &&
               r.personalInfo.lastName.trim().toLowerCase() === lName.toLowerCase()
        );
        if (smartMatch) {
          transformed.patientId = smartMatch.id;
          autoCorrectLogs.push({
            row: rowNo,
            field: 'patientId',
            original: rawId,
            corrected: `${smartMatch.id} (Smart Matched by Name)`
          });
        } else {
          warnings.push({
            row: rowNo,
            message: `Patient ID "${rawId}" (${lName}, ${fName}) is not found in database. A new Patient node will be registered.`
          });
        }
      } else {
        warnings.push({
          row: rowNo,
          message: `Relational link Patient ID "${rawId}" has no matching patient node in database.`
        });
      }
    }
  }

  // 4. Set default values for missing keys
  profile.optionalFields.forEach(f => {
    if (transformed[f] === undefined) {
      transformed[f] = '';
    }
  });

  // 5. Patient ID generation for Patients profile if missing
  if (profile.name === 'Patients' && !transformed.patientId) {
    const fName = String(transformed.firstName || '').trim();
    const lName = String(transformed.lastName || '').trim();
    if (fName || lName) {
      const generatedId = `PAT-MIG-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      transformed.patientId = generatedId;
      autoCorrectLogs.push({
        row: rowNo,
        field: 'patientId',
        original: 'N/A',
        corrected: generatedId
      });
    }
  }

  // 6. Validation on transformed standard models
  let hasError = false;
  Object.keys(profile.validationRules).forEach((key) => {
    const rule = profile.validationRules[key];
    const valErr = rule(transformed[key], transformed);
    if (valErr) {
      errors.push(`${key}: ${valErr}`);
      hasError = true;
    }
  });

  return { transformed, hasError, errors };
}

// Reads CSV text with quote support and returns array of arrays
export function parseCSVText(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      row.push(currentVal.trim());
      result.push(row);
      row = [];
      currentVal = '';
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
    } else {
      currentVal += char;
    }
  }
  
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    result.push(row);
  }

  return result.filter(r => r.length > 0 && r.some(cell => cell.length > 0));
}

export interface MatchResult {
  matchedPatient: PatientRecord | null;
  confidence: number; // 0 to 100
  matchedBy: string; // 'Legacy Patient ID' | 'Full Name' | 'Birthday' | 'Mobile Number' | 'Email Address' | 'Gender' | 'Address' | 'None'
}

// 1. Permanent Patient Identity Matching Strategy (MPI)
export function matchPatient(
  row: any,
  records: PatientRecord[]
): MatchResult {
  let bestPatient: PatientRecord | null = null;
  let maxConfidence = 0;
  let bestMatchedBy = 'None';

  const rowPatId = String(row.patientId || '').trim().toUpperCase();
  const rowFName = String(row.firstName || '').trim().toLowerCase();
  const rowLName = String(row.lastName || '').trim().toLowerCase();
  const rowBday = String(row.birthday || '').trim();
  const rowMobile = String(row.mobile || '').replace(/\D/g, '');
  const rowEmail = String(row.email || '').trim().toLowerCase();
  const rowGender = String(row.gender || '').trim().toLowerCase();
  const rowAddress = String(row.address || '').trim().toLowerCase();

  for (const p of records) {
    let score = 0;
    let matchedBy = 'None';

    const pId = String(p.id || '').trim().toUpperCase();
    const pAltIds = String(p.alternatePatientIds || '').trim().toUpperCase();
    const pFName = String(p.personalInfo.firstName || '').trim().toLowerCase();
    const pLName = String(p.personalInfo.lastName || '').trim().toLowerCase();
    const pBday = String(p.personalInfo.birthdate || '').trim();
    const pMobile = String(p.personalInfo.mobile || '').replace(/\D/g, '');
    const pEmail = String(p.personalInfo.email || '').trim().toLowerCase();
    const pGender = String(p.personalInfo.sex || '').trim().toLowerCase();
    const pAddress = String(p.personalInfo.address || '').trim().toLowerCase();

    // Strategy 1: Legacy Patient ID Match
    if (rowPatId && (rowPatId === pId || rowPatId === pAltIds)) {
      score = 100;
      matchedBy = 'Legacy Patient ID';
    }
    // Strategy 2: Full Name Match + Secondary Checkers
    else if (rowFName && rowLName && rowFName === pFName && rowLName === pLName) {
      const bdaysMatch = rowBday && pBday && (
        rowBday === pBday || 
        new Date(rowBday).getTime() === new Date(pBday).getTime()
      );
      if (bdaysMatch) {
        score = 98; // Very High Match
        matchedBy = 'Birthday';
      }
      else if ((rowMobile && pMobile && rowMobile === pMobile) || (rowEmail && pEmail && rowEmail === pEmail)) {
        score = 95; // High Match
        matchedBy = rowMobile === pMobile ? 'Mobile Number' : 'Email Address';
      }
      else if ((rowGender && pGender && rowGender === pGender) || (rowAddress && pAddress && (rowAddress.includes(pAddress) || pAddress.includes(rowAddress)))) {
        score = 90; // Possible Match
        matchedBy = 'Gender / Address';
      }
      else {
        score = 90; // Possible Match
        matchedBy = 'Full Name';
      }
    }

    if (score > maxConfidence) {
      maxConfidence = score;
      bestPatient = p;
      bestMatchedBy = matchedBy;
    }
  }

  return {
    matchedPatient: maxConfidence >= 90 ? bestPatient : null,
    confidence: maxConfidence,
    matchedBy: maxConfidence >= 90 ? bestMatchedBy : 'None'
  };
}

// 2. Composite Duplicate Checking for Progress Notes
export function isDuplicateProgressNote(pn: any, existingNotes: any[]): boolean {
  if (!existingNotes || existingNotes.length === 0) return false;
  return existingNotes.some(existing => {
    // Match date
    const d1 = new Date(pn.visitDate || pn.date || new Date()).toISOString().split('T')[0];
    const d2 = new Date(existing.visitDate || existing.date || new Date()).toISOString().split('T')[0];
    if (d1 !== d2) return false;

    // Match remarks
    const r1 = String(pn.remarks || '').trim().toLowerCase();
    const r2 = String(existing.remarks || '').trim().toLowerCase();
    if (r1 !== r2) {
      // If remarks are very different, they are different visits unless they have identical items
      return false;
    }

    // Match items
    if (pn.items && pn.items.length > 0 && existing.items && existing.items.length > 0) {
      const serviceMatches = pn.items.some((item1: any) => 
        existing.items.some((item2: any) => 
          String(item1.serviceProcedure).trim().toLowerCase() === String(item2.serviceProcedure).trim().toLowerCase() &&
          String(item1.teeth).trim().toLowerCase() === String(item2.teeth).trim().toLowerCase()
        )
      );
      if (!serviceMatches) return false;
    }

    return true;
  });
}

// 3. Composite Duplicate Checking for Bills
export function isDuplicateBill(bill: any, existingNotes: any[]): boolean {
  if (!existingNotes || existingNotes.length === 0) return false;
  return existingNotes.some(existing => {
    const d1 = new Date(bill.billDate || bill.date || new Date()).toISOString().split('T')[0];
    const d2 = new Date(existing.visitDate || existing.date || new Date()).toISOString().split('T')[0];
    if (d1 !== d2) return false;

    const bPrice = Number(bill.netTotal) || Number(bill.unitPrice) || 0;
    const ePrice = Number(existing.netCost) || Number(existing.totalCost) || 0;
    if (Math.abs(bPrice - ePrice) > 0.01) return false;

    const s1 = String(bill.serviceType || '').trim().toLowerCase();
    if (s1 && existing.items && existing.items.length > 0) {
      const hasServiceMatch = existing.items.some((item: any) =>
        String(item.serviceProcedure).trim().toLowerCase().includes(s1) ||
        s1.includes(String(item.serviceProcedure).trim().toLowerCase())
      );
      if (!hasServiceMatch) return false;
    }

    return true;
  });
}

// 4. Composite Duplicate Checking for Prescriptions
export function isDuplicatePrescription(presc: any, existingNotes: any[]): boolean {
  if (!existingNotes || existingNotes.length === 0) return false;
  return existingNotes.some(existing => {
    const d1 = new Date(presc.prescriptionDate || presc.date || new Date()).toISOString().split('T')[0];
    const d2 = new Date(existing.visitDate || existing.date || new Date()).toISOString().split('T')[0];
    if (d1 !== d2) return false;

    const r1 = String(presc.medicine || '').trim().toLowerCase();
    const r2 = String(existing.remarks || '').trim().toLowerCase();
    if (r2.includes(r1) || r1.includes(r2)) return true;

    return false;
  });
}

// 5. Composite Duplicate Checking for Certificates
export function isDuplicateCertificate(cert: any, existingNotes: any[]): boolean {
  if (!existingNotes || existingNotes.length === 0) return false;
  return existingNotes.some(existing => {
    const d1 = new Date(cert.certificateDate || cert.date || new Date()).toISOString().split('T')[0];
    const d2 = new Date(existing.visitDate || existing.date || new Date()).toISOString().split('T')[0];
    if (d1 !== d2) return false;

    const type1 = String(cert.certificateType || '').trim().toLowerCase();
    const r2 = String(existing.remarks || '').trim().toLowerCase();
    if (r2.includes(type1) || type1.includes(r2)) return true;

    return false;
  });
}

// 6. Composite Duplicate Checking for Treatment Plans
export function isDuplicateTreatmentPlan(plan: any, existingNotes: any[]): boolean {
  if (!existingNotes || existingNotes.length === 0) return false;
  return existingNotes.some(existing => {
    const d1 = new Date(plan.planDate || plan.date || new Date()).toISOString().split('T')[0];
    const d2 = new Date(existing.visitDate || existing.date || new Date()).toISOString().split('T')[0];
    if (d1 !== d2) return false;

    const finding1 = String(plan.finding || '').trim().toLowerCase();
    const r2 = String(existing.remarks || '').trim().toLowerCase();
    if (r2.includes(finding1) || finding1.includes(r2)) return true;

    return false;
  });
}

// 7. Composite Duplicate Checking for Notes
export function isDuplicateNote(nt: any, existingNotes: any[]): boolean {
  if (!existingNotes || existingNotes.length === 0) return false;
  return existingNotes.some(existing => {
    const d1 = new Date(nt.noteDate || nt.date || new Date()).toISOString().split('T')[0];
    const d2 = new Date(existing.visitDate || existing.date || new Date()).toISOString().split('T')[0];
    if (d1 !== d2) return false;

    const text1 = String(nt.noteText || '').trim().toLowerCase();
    const r2 = String(existing.remarks || '').trim().toLowerCase();
    if (r2.includes(text1) || text1.includes(r2)) return true;

    return false;
  });
}

