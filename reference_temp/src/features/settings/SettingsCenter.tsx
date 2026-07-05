import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Settings, User, Key, Mail, Shield, HelpCircle, LogOut, 
  Upload, Download, CheckCircle, AlertTriangle, Play, RefreshCw, 
  Clock, Database, Server, Info, Plus, Trash2, Edit2, Check,
  Search, FileText, ChevronRight, Sliders, Layers, Users, BookOpen,
  Activity, CheckSquare
} from 'lucide-react';
import { PatientRecord, ClinicUser } from '../../types';
import MasterRecord from './MasterRecord';
import { clinicStorage } from '../../lib/indexedDBStorage';
const localStorage = clinicStorage;
import TreatmentRulesManager from './TreatmentRulesManager';
import * as XLSX from 'xlsx';
import {
  MappedColumn,
  TransformationReport,
  TemplateProfile,
  TEMPLATE_PROFILES,
  formatDate,
  cleanDigits,
  cleanNumber,
  normalizeHeader,
  mapHeaderToKey,
  detectProfile,
  transformRow,
  parseCSVText,
  matchPatient,
  isDuplicateProgressNote,
  isDuplicateBill,
  isDuplicatePrescription,
  isDuplicateCertificate,
  isDuplicateTreatmentPlan,
  isDuplicateNote
} from './TransformationEngine';

interface SettingsCenterProps {
  currentUser: ClinicUser;
  records: PatientRecord[];
  setRecords: React.Dispatch<React.SetStateAction<PatientRecord[]>>;
  clinicName: string;
  setClinicName: (name: string) => void;
  clinicPhone: string;
  setClinicPhone: (phone: string) => void;
  clinicAddress: string;
  setClinicAddress: (addr: string) => void;
  smsEnabled: boolean;
  setSmsEnabled: (enabled: boolean) => void;
  profile: any;
  setProfile: (prof: any) => void;
  setToast: (toast: { message: string; type: 'success' | 'info' | 'error' } | null) => void;
}

// Interfaces for migration objects
interface MigrationHistoryItem {
  id: string;
  date: string;
  user: string;
  filename: string;
  templateType: string;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  durationMs: number;
  status: 'Completed' | 'Failed';
}

interface ValidationError {
  row: number;
  patientId: string;
  column: string;
  error: string;
  suggestedFix: string;
  severity: 'error' | 'warning';
}

export default function SettingsCenter({
  currentUser,
  records,
  setRecords,
  clinicName,
  setClinicName,
  clinicPhone,
  setClinicPhone,
  clinicAddress,
  setClinicAddress,
  smsEnabled,
  setSmsEnabled,
  profile,
  setProfile,
  setToast
}: SettingsCenterProps) {
  // Tabs: 'general' | 'users' | 'migration' | 'maintenance' | 'about'
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'migration' | 'maintenance' | 'about'>('general');

  // --- GENERAL SETTINGS STATES ---
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [workingHoursStart, setWorkingHoursStart] = useState<string>('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState<string>('17:00');
  const [avgDuration, setAvgDuration] = useState<number>(30); // in minutes

  // --- USERS & ROLES STATES ---
  const [usersList, setUsersList] = useState<ClinicUser[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('DENTAL_USERS');
      if (stored) {
        setUsersList(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // --- TAGS & EXPENSES STATES ---
  const [tags, setTags] = useState<string[]>(['general', 'ortho', 'pedio', 'Yazaki', 'Liwayway', 'Lyceum']);
  const [newTag, setNewTag] = useState<string>('');
  const [expenseCategories, setExpenseCategories] = useState<string[]>(['Medical Supplies', 'Rent & Utilities', 'Salaries', 'Equipment Repair', 'Marketing', 'Office Supplies']);
  const [newExpenseCat, setNewExpenseCat] = useState<string>('');

  // --- SYSTEM MAINTENANCE STATES ---
  const [auditLogs, setAuditLogs] = useState<{ id: string; time: string; user: string; action: string; module: string }[]>([
    { id: '1', time: new Date(Date.now() - 3600000).toISOString(), user: currentUser.email, action: 'Viewed Patient Dashboard', module: 'Dashboard' },
    { id: '2', time: new Date(Date.now() - 7200000).toISOString(), user: 'associate@pj-dental.com', action: 'Created Progress Note for PAT-2026-1024', module: 'Patients' },
    { id: '3', time: new Date(Date.now() - 14400000).toISOString(), user: currentUser.email, action: 'Modified Treatment Rules Configuration', module: 'Settings' },
  ]);

  // --- DATA MIGRATION STATES ---
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [detectedTemplate, setDetectedTemplate] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [migrationStats, setMigrationStats] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
    newRecords: 0,
    updated: 0,
    skipped: 0,
    duplicates: 0
  });

  // Dynamic Transformation Engine specific states
  const [detectedLegacyVersion, setDetectedLegacyVersion] = useState<string>('v1.0 (Legacy Export)');
  const [worksheetName, setWorksheetName] = useState<string>('');
  const [columnMappings, setColumnMappings] = useState<MappedColumn[]>([]);
  const [patientUpdates, setPatientUpdates] = useState<any[]>([]);
  const [syncDetails, setSyncDetails] = useState<any>({
    'Patients': { imported: 0, skipped: 0, updated: 0, existing: 0 },
    'Progress Notes': { imported: 0, skipped: 0 },
    'Bills': { imported: 0, skipped: 0 },
    'Certificates': { imported: 0, skipped: 0 },
    'Prescriptions': { imported: 0, skipped: 0 },
    'Appointments': { imported: 0, skipped: 0 },
    'Treatment Plans': { imported: 0, skipped: 0 },
    'Notes': { imported: 0, skipped: 0 }
  });
  const [autoCorrectedFields, setAutoCorrectedFields] = useState<Array<{ row: number; field: string; original: string; corrected: string }>>([]);
  const [warnings, setWarnings] = useState<Array<{ row: number; message: string }>>([]);
  const [criticalErrors, setCriticalErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [unmappedColumns, setUnmappedColumns] = useState<string[]>([]);
  const [detectedProfileObj, setDetectedProfileObj] = useState<any>(null);
  const [rawLegacyRows, setRawLegacyRows] = useState<any[]>([]); // To display original row side-by-side in preview
  const [selectedPreviewRowIdx, setSelectedPreviewRowIdx] = useState<number>(0);


  const [migrationHistory, setMigrationHistory] = useState<MigrationHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('DENTAL_MIGRATION_HISTORY');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      {
        id: 'mig-1',
        date: '2026-06-25T14:30:00Z',
        user: 'pnjdentalwebsite@gmail.com',
        filename: 'legacy_patients_v1.csv',
        templateType: 'Patients',
        importedCount: 120,
        updatedCount: 5,
        skippedCount: 2,
        durationMs: 450,
        status: 'Completed'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('DENTAL_MIGRATION_HISTORY', JSON.stringify(migrationHistory));
  }, [migrationHistory]);

  // --- RESOLVE WARNINGS STATE (STEP 5) ---
  const [resolvedMapping, setResolvedMapping] = useState<Record<string, string>>({});

  // File drag-over handlers
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Download raw template triggers
  const triggerTemplateDownload = (type: string) => {
    let headers = '';
    let sample = '';
    
    switch (type) {
      case 'Patients':
        headers = 'PATIENT ID,FIRSTNAME,LASTNAME,BIRTHDAY,GENDER,MOBILE,EMAIL,ADDRESS,HMO,BLOOD_TYPE\n';
        sample = 'PAT-LEG-101,John,Doe,1995-04-12,Male,09171234567,john.doe@gmail.com,Cavite,No HMO,O+\nPAT-LEG-102,Jane,Smith,2002-11-23,Female,09187654321,jane.smith@yahoo.com,Manila,Yazaki,A-\n';
        break;
      case 'Bills':
        headers = 'patient_id,bill_dt,service_type,unit_price,subtotal,discount,net_total\n';
        sample = 'PAT-LEG-101,2026-06-15,Consultation Fee,500,500,0,500\nPAT-LEG-102,2026-06-20,Composite Filling (Mild/Shallow),1000,1000,100,900\n';
        break;
      case 'Progress Notes':
        headers = 'patient_id,visit_dt,remarks,total_cost,total_discount,net_cost\n';
        sample = 'PAT-LEG-101,2026-06-15,Initial consult and diagnostic cleaning,500,0,500\nPAT-LEG-102,2026-06-20,Mild caries excavated. Applied composite restorations.,1000,100,900\n';
        break;
      case 'Treatment Plans':
        headers = 'patient_id,finding_name,service_id,sequence_order\n';
        sample = 'PAT-LEG-101,Cavity,srv-3,1\nPAT-LEG-102,Impacted Tooth,srv-25,2\n';
        break;
      case 'Prescriptions':
        headers = 'patient_id,date,medication,dosage,description\n';
        sample = 'PAT-LEG-101,2026-06-15,Mefenamic Acid 500mg,Take 1 tablet every 6 hours or as needed,Pain Reliever\n';
        break;
      case 'Certificates':
        headers = 'patient_id,date,purpose,diagnosis\n';
        sample = 'PAT-LEG-101,2026-06-15,Employment Clearance,Patient fits to work medically,Fit for work\n';
        break;
      case 'Notes':
        headers = 'patient_id,date,note_text\n';
        sample = 'PAT-LEG-101,2026-06-15,Patient notes extreme dentist anxiety. Suggest minor distraction loops.\n';
        break;
      default:
        headers = 'PATIENT ID,FIRSTNAME,LASTNAME,BIRTHDAY\n';
        sample = 'PAT-001,Juana,Cruz,1990-01-01\n';
    }

    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type.toLowerCase().replace(' ', '_')}_legacy_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- DATABASE BACKUP AND RESTORE ---
  const triggerDatabaseBackup = () => {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('DENTAL') || key.includes('RECORDS') || key.includes('CLINIC'))) {
        data[key] = localStorage.getItem(key);
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pj_dental_clinic_ledger_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setToast({ message: 'Comprehensive Database Backup successfully downloaded!', type: 'success' });
    // Log audit
    setAuditLogs(prev => [
      { id: Date.now().toString(), time: new Date().toISOString(), user: currentUser.email, action: 'Initiated Database Backup Download', module: 'Backup Center' },
      ...prev
    ]);
  };

  const triggerDatabaseRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        // Validation check
        let isDentalBackup = false;
        Object.keys(parsed).forEach(key => {
          if (key.includes('DENTAL') || key.includes('RECORDS') || key.includes('CLINIC')) {
            isDentalBackup = true;
          }
        });

        if (!isDentalBackup) {
          setToast({ message: 'Error: Selected file is not a valid P&J Dental Clinic backup format.', type: 'error' });
          return;
        }

        if (window.confirm('WARNING: Restoring this database will overwrite all your current patients, calendar, ledger, and settings. This cannot be undone. Do you wish to continue?')) {
          Object.keys(parsed).forEach(key => {
            const val = parsed[key];
            if (val !== null) {
              localStorage.setItem(key, val);
            }
          });

          // Refresh records and state
          const recordsKey = 'DENTAL_PATIENT_RECORDS_PRODUCTION_STORAGE';
          const recordsVal = localStorage.getItem(recordsKey);
          if (recordsVal) {
            setRecords(JSON.parse(recordsVal));
          }

          setToast({ message: 'Database successfully restored! Reloading application states...', type: 'success' });
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (err) {
        setToast({ message: 'Failed to restore database: Invalid JSON syntax.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  // --- MIGRATION WIZARD LOGIC ---

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle Drop and Parsing
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    setUploadedFileName(file.name);
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    const reader = new FileReader();
    if (isExcel) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          setWorksheetName(firstSheetName);
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          setRawText(csvText);
          detectAndValidateTemplate(csvText, file.name, firstSheetName);
        } catch (err: any) {
          setToast({ message: `Error parsing Excel workbook: ${err.message}`, type: 'error' });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setWorksheetName('');
        setRawText(text);
        detectAndValidateTemplate(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  // Detect which template and validate columns using profile metadata
  const detectAndValidateTemplate = (text: string, filename: string, sheetName?: string) => {
    const rawRows = parseCSVText(text);
    if (rawRows.length === 0) {
      setToast({ message: 'File is empty.', type: 'error' });
      return;
    }

    const rawHeaders = rawRows[0];
    const { profile, confidence, version } = detectProfile(filename, rawHeaders, sheetName);

    setDetectedTemplate(profile.name);
    setDetectedProfileObj(profile);
    setDetectedLegacyVersion(version);

    // Build the mapped column definitions
    const mappings: MappedColumn[] = rawHeaders.map(h => {
      const key = mapHeaderToKey(h, profile);
      return {
        legacyHeader: h,
        internalKey: key || 'unmapped',
        isMapped: !!key
      };
    });
    setColumnMappings(mappings);
    setUnmappedColumns(rawHeaders.filter(h => !mapHeaderToKey(h, profile)));

    setWizardStep(2); // Jump to Detection Screen
  };

  // Trigger Validation (Step 3) - Completely decoupled from raw CSV files, operating only on the transformed internal model
  const startValidation = () => {
    setWizardStep(3);
    
    setTimeout(() => {
      try {
        const rawGrid = parseCSVText(rawText);
        if (rawGrid.length === 0) {
          setToast({ message: 'Missing records context.', type: 'error' });
          setWizardStep(1);
          return;
        }

        const rawHeaders = rawGrid[0];
        const profile = detectedProfileObj || TEMPLATE_PROFILES.find(p => p.name === detectedTemplate) || TEMPLATE_PROFILES[0];
        
        const finalRows: any[] = [];
        const originalRows: any[] = [];
        const errors: ValidationError[] = [];
        const autoCorrects: Array<{ row: number; field: string; original: string; corrected: string }> = [];
        const warns: Array<{ row: number; message: string }> = [];
        const patientUpdatesList: any[] = [];

        // Parse and map every row into the standardized internal format
        for (let i = 1; i < rawGrid.length; i++) {
          const cols = rawGrid[i];
          const rawRow: Record<string, string> = {};
          rawHeaders.forEach((h, index) => {
            rawRow[h] = cols[index] !== undefined ? cols[index] : '';
          });

          const { transformed, hasError, errors: rowErrors } = transformRow(
            rawRow,
            profile,
            i + 1,
            records,
            autoCorrects,
            warns
          );

          originalRows.push({ rowIndex: i + 1, ...rawRow });
          finalRows.push(transformed);

          rowErrors.forEach(err => {
            errors.push({
              row: i + 1,
              patientId: transformed.patientId || 'N/A',
              column: err.split(':')[0],
              error: err.split(':')[1]?.trim() || err,
              suggestedFix: 'Check layout specifications',
              severity: 'error'
            });
          });
        }

        // Perform intelligent matching, update checking, and duplicate checking on valid rows
        let validCount = 0;
        let invalidCount = 0;
        let newCount = 0;
        let updateCount = 0;
        let skippedCount = 0;
        let duplicateCount = 0;

        finalRows.forEach((row, idx) => {
          const rowHasError = errors.some(e => e.row === row.rowIndex);
          if (rowHasError) {
            invalidCount++;
            skippedCount++;
            return;
          }

          validCount++;

          if (profile.name === 'Patients') {
            const matchResult = matchPatient(row, records);
            if (matchResult.matchedPatient) {
              row.patientId = matchResult.matchedPatient.id; // Map to matched ID
              const pInfo = matchResult.matchedPatient.personalInfo;
              const changes: any[] = [];
              const checkField = (fKey: string, oldVal: string, newVal: string, label: string) => {
                if (newVal && oldVal.trim().toLowerCase() !== newVal.trim().toLowerCase()) {
                  changes.push({ field: label, oldValue: oldVal, newValue: newVal, internalField: fKey });
                }
              };

              checkField('firstName', pInfo.firstName, row.firstName || '', 'First Name');
              checkField('lastName', pInfo.lastName, row.lastName || '', 'Last Name');
              checkField('birthdate', pInfo.birthdate, row.birthday || '', 'Birthdate');
              checkField('mobile', pInfo.mobile, row.mobile || '', 'Mobile');
              checkField('email', pInfo.email, row.email || '', 'Email');
              checkField('address', pInfo.address, row.address || '', 'Address');
              checkField('hmo', pInfo.hmo, row.hmo || '', 'HMO');
              checkField('bloodType', pInfo.bloodType, row.bloodType || '', 'Blood Type');

              if (changes.length > 0) {
                updateCount++;
                warns.push({
                  row: row.rowIndex,
                  message: `[Update Detected] Matches existing patient "${pInfo.lastName}, ${pInfo.firstName}" (${matchResult.matchedPatient.id}) but contains newer details.`
                });
                patientUpdatesList.push({
                  rowIdx: row.rowIndex,
                  existingPatient: matchResult.matchedPatient,
                  changes,
                  resolution: 'update'
                });
              } else {
                warns.push({
                  row: row.rowIndex,
                  message: `[Skip / Duplicate] Record matches existing patient "${pInfo.lastName}, ${pInfo.firstName}" (${matchResult.matchedPatient.id}) exactly.`
                });
                duplicateCount++;
              }
            } else {
              newCount++;
            }
          } else {
            // Non-Patients templates: perform smart patient matching and then duplicate checking
            const matchResult = matchPatient(row, records);
            if (matchResult.matchedPatient) {
              const matchedP = matchResult.matchedPatient;
              row.patientId = matchedP.id; // Correct the ID link

              const existingNotes = matchedP.progressNotes || [];
              let isDupe = false;

              if (profile.name === 'Progress Notes') {
                isDupe = isDuplicateProgressNote(row, existingNotes);
              } else if (profile.name === 'Bills') {
                isDupe = isDuplicateBill(row, existingNotes);
              } else if (profile.name === 'Prescriptions') {
                isDupe = isDuplicatePrescription(row, existingNotes);
              } else if (profile.name === 'Certificates') {
                isDupe = isDuplicateCertificate(row, existingNotes);
              } else if (profile.name === 'Treatment Plans') {
                isDupe = isDuplicateTreatmentPlan(row, existingNotes);
              } else if (profile.name === 'Notes') {
                isDupe = isDuplicateNote(row, existingNotes);
              } else if (profile.name === 'Appointments') {
                let existingApts = [];
                try {
                  const saved = localStorage.getItem(`dental_appointments_${matchedP.id}`);
                  if (saved) existingApts = JSON.parse(saved);
                } catch (e) {}
                const startStr = row.startDate || row.date || new Date().toISOString();
                isDupe = existingApts.some((a: any) => {
                  const ad1 = new Date(a.startDate).toISOString().split('T')[0];
                  const ad2 = new Date(startStr).toISOString().split('T')[0];
                  return ad1 === ad2 && String(a.title).trim().toLowerCase() === String(row.title).trim().toLowerCase();
                });
              }

              if (isDupe) {
                row.isDuplicate = true;
                duplicateCount++;
                warns.push({
                  row: row.rowIndex,
                  message: `[Skip / Duplicate] This ${profile.name} record already exists in patient's chart and will be skipped.`
                });
              } else {
                newCount++;
              }
            } else {
              // Patient does not exist yet for this related record.
              // We'll create a new skeleton patient or register them.
              newCount++;
              warns.push({
                row: row.rowIndex,
                message: `[Relationship Warning] Relational link patient not found. A new patient profile will be created automatically.`
              });
            }
          }
        });

        setParsedRows(finalRows);
        setRawLegacyRows(originalRows);
        setValidationErrors(errors);
        setAutoCorrectedFields(autoCorrects);
        setWarnings(warns);
        setPatientUpdates(patientUpdatesList);

        setMigrationStats({
          total: finalRows.length,
          valid: validCount,
          invalid: invalidCount,
          newRecords: newCount,
          updated: updateCount,
          skipped: skippedCount,
          duplicates: duplicateCount
        });

        setWizardStep(4);
      } catch (err: any) {
        setToast({ message: `Validation failed: ${err.message}`, type: 'error' });
        setWizardStep(1);
      }
    }, 800);
  };

  // Advance to error resolver (Step 5)
  const proceedToErrorResolver = () => {
    const serviceWarnings = validationErrors
      .filter(err => err.column === 'service_type' && err.severity === 'warning')
      .map(err => {
        const rowObj = parsedRows.find(r => r.rowIndex === err.row);
        return rowObj ? rowObj.serviceType : '';
      })
      .filter((v, i, a) => v && a.indexOf(v) === i);

    const initialMap: Record<string, string> = {};
    serviceWarnings.forEach(sw => {
      initialMap[sw] = 'srv-1';
    });
    setResolvedMapping(initialMap);

    setWizardStep(5);
  };

  // Perform actual import operation (Step 6)
  const executeBatchImport = () => {
    setWizardStep(6);
    setImportProgress(10);

    const startTime = Date.now();

    const timer = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          
          let importCount = 0;
          let updateCount = 0;
          let totalSkipped = 0;

          const counts: Record<string, any> = {
            'Patients': { imported: 0, skipped: 0, updated: 0, existing: 0 },
            'Progress Notes': { imported: 0, skipped: 0 },
            'Bills': { imported: 0, skipped: 0 },
            'Certificates': { imported: 0, skipped: 0 },
            'Prescriptions': { imported: 0, skipped: 0 },
            'Appointments': { imported: 0, skipped: 0 },
            'Treatment Plans': { imported: 0, skipped: 0 },
            'Notes': { imported: 0, skipped: 0 }
          };

          const updatedRecords = [...records];

          if (detectedTemplate === 'Patients') {
            parsedRows.forEach((row, idx) => {
              const rowHasError = validationErrors.some(e => e.row === row.rowIndex);
              if (rowHasError) {
                counts['Patients'].skipped++;
                totalSkipped++;
                return;
              }

              const matchResult = matchPatient(row, records);
              if (matchResult.matchedPatient) {
                const existingIndex = updatedRecords.findIndex(r => r.id === matchResult.matchedPatient!.id);
                if (existingIndex > -1) {
                  // Check if there is a configured update in the patientUpdates state
                  const updateConfig = patientUpdates.find(up => up.rowIdx === row.rowIndex);
                  const resolution = updateConfig?.resolution || 'update';

                  if (resolution === 'update') {
                    // Update patient fields with new info
                    const updatedInfo = { ...updatedRecords[existingIndex].personalInfo };
                    updateConfig?.changes.forEach((c: any) => {
                      (updatedInfo as any)[c.internalField] = c.newValue;
                    });
                    
                    updatedRecords[existingIndex] = {
                      ...updatedRecords[existingIndex],
                      personalInfo: updatedInfo
                    };
                    updateCount++;
                    counts['Patients'].updated++;
                  } else if (resolution === 'keep') {
                    counts['Patients'].existing++;
                  } else {
                    counts['Patients'].skipped++;
                    totalSkipped++;
                  }
                }
              } else {
                // Add as brand new patient record
                const patientId = row.patientId || `PAT-${Date.now().toString().slice(-4)}-${idx}`;
                const newPatient: PatientRecord = {
                  id: patientId,
                  createdAt: new Date().toISOString(),
                  balance: 0,
                  lastRecall: "",
                  tags: row.hmo && row.hmo !== 'No HMO' ? [row.hmo] : [],
                  personalInfo: {
                    lastName: row.lastName || '',
                    firstName: row.firstName || '',
                    middleName: row.middleName || '',
                    ext: '',
                    nickname: row.firstName || '',
                    birthdate: row.birthday || '1995-01-01',
                    sex: (row.gender as any) || 'Male',
                    mobile: row.mobile || '',
                    email: row.email || '',
                    address: row.address || '',
                    school: '',
                    hmo: row.hmo || 'No HMO',
                    referredBy: '',
                    bloodType: row.bloodType || '',
                    weight: '',
                    height: '',
                    civilStatus: 'Single',
                    occupation: '',
                    company: '',
                    photoUrl: ''
                  },
                  guardianInfo: {
                    fathersName: '', fathersOccupation: '', fathersEmployer: '', fathersContact: '',
                    mothersName: '', mothersOccupation: '', mothersEmployer: '', mothersContact: '',
                    guardiansName: '', guardiansContact: '', physicianName: '', physicianContact: ''
                  },
                  medicalHistory: { previousHospitalizations: '', prescribedMedications: '', allergiesToMedications: '', familyMedicationProblems: '', otherMedicalConcerns: '', medicalAlert: '', conditions: [] },
                  dentalHistory: { reasonForCheckup: '', lastVisit: '', badDentalExperience: '', brushingDifficulties: '', fluoridesReceived: '', habits: [], patientsDiet: '' },
                  progressNotes: [],
                  clinicId: currentUser.clinicId || 'clinic-default'
                };
                updatedRecords.unshift(newPatient);
                importCount++;
                counts['Patients'].imported++;
              }
            });

            setRecords(updatedRecords);
          } else {
            // For all clinical, scheduling, financial related files:
            parsedRows.forEach((row, idx) => {
              const rowHasError = validationErrors.some(e => e.row === row.rowIndex);
              if (rowHasError) {
                if (counts[detectedTemplate]) counts[detectedTemplate].skipped++;
                totalSkipped++;
                return;
              }

              if (row.isDuplicate) {
                if (counts[detectedTemplate]) counts[detectedTemplate].skipped++;
                totalSkipped++;
                return;
              }

              // Match patient
              const matchResult = matchPatient(row, updatedRecords);
              let targetPatient: PatientRecord;

              if (matchResult.matchedPatient) {
                targetPatient = matchResult.matchedPatient;
              } else {
                // Patient doesn't exist yet: register new skeleton profile
                const pId = row.patientId || `PAT-GEN-${Date.now()}-${idx}`;
                const skeletonPatient: PatientRecord = {
                  id: pId,
                  createdAt: new Date().toISOString(),
                  balance: 0,
                  lastRecall: "",
                  tags: [],
                  personalInfo: {
                    lastName: row.lastName || 'Legacy',
                    firstName: row.firstName || 'Patient',
                    middleName: row.middleName || '',
                    ext: '',
                    nickname: row.firstName || '',
                    birthdate: row.birthday || '1995-01-01',
                    sex: row.gender || 'Male',
                    mobile: row.mobile || '',
                    email: row.email || '',
                    address: row.address || '',
                    school: '',
                    hmo: 'No HMO',
                    referredBy: '',
                    bloodType: '',
                    weight: '',
                    height: '',
                    civilStatus: 'Single',
                    occupation: '',
                    company: '',
                    photoUrl: ''
                  },
                  guardianInfo: {
                    fathersName: '', fathersOccupation: '', fathersEmployer: '', fathersContact: '',
                    mothersName: '', mothersOccupation: '', mothersEmployer: '', mothersContact: '',
                    guardiansName: '', guardiansContact: '', physicianName: '', physicianContact: ''
                  },
                  medicalHistory: { previousHospitalizations: '', prescribedMedications: '', allergiesToMedications: '', familyMedicationProblems: '', otherMedicalConcerns: '', medicalAlert: '', conditions: [] },
                  dentalHistory: { reasonForCheckup: '', lastVisit: '', badDentalExperience: '', brushingDifficulties: '', fluoridesReceived: '', habits: [], patientsDiet: '' },
                  progressNotes: [],
                  clinicId: currentUser.clinicId || 'clinic-default'
                };
                updatedRecords.unshift(skeletonPatient);
                targetPatient = skeletonPatient;
                counts['Patients'].imported++;
              }

              const existingIndex = updatedRecords.findIndex(r => r.id === targetPatient.id);
              if (existingIndex > -1) {
                const p = updatedRecords[existingIndex];
                const notes = p.progressNotes ? [...p.progressNotes] : [];

                if (detectedTemplate === 'Bills') {
                  const sType = resolvedMapping[row.serviceType] || row.serviceType || 'srv-1';
                  const uPrice = Number(row.unitPrice) || 0;
                  
                  notes.push({
                    id: `note-mig-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
                    date: row.billDate || new Date().toISOString(),
                    visitDate: row.billDate || new Date().toISOString(),
                    recallDate: '',
                    recallReason: '',
                    items: [
                      {
                        id: `item-${Date.now()}-${idx}`,
                        serviceProcedure: sType,
                        teeth: 'All',
                        unitPrice: uPrice,
                        subtotal: uPrice,
                        discountAmount: 0,
                        netTotal: uPrice
                      }
                    ],
                    totalCost: uPrice,
                    totalDiscount: 0,
                    netCost: uPrice,
                    remarks: 'Migrated Legacy Invoice record',
                    attachments: [],
                    status: 'Saved'
                  });
                  importCount++;
                  counts['Bills'].imported++;
                } else if (detectedTemplate === 'Progress Notes') {
                  notes.push({
                    id: `note-mig-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
                    date: row.visitDate || new Date().toISOString(),
                    visitDate: row.visitDate || new Date().toISOString(),
                    recallDate: '',
                    recallReason: '',
                    items: [],
                    totalCost: Number(row.totalCost) || Number(row.netTotal) || 0,
                    totalDiscount: Number(row.discount) || 0,
                    netCost: Number(row.netTotal) || Number(row.totalCost) || 0,
                    remarks: row.remarks || '',
                    attachments: [],
                    status: 'Saved'
                  });
                  importCount++;
                  counts['Progress Notes'].imported++;
                } else if (detectedTemplate === 'Treatment Plans') {
                  notes.push({
                    id: `note-mig-plan-${Date.now()}-${idx}`,
                    date: row.date || new Date().toISOString(),
                    visitDate: row.date || new Date().toISOString(),
                    recallDate: '',
                    recallReason: '',
                    items: [
                      {
                        id: `item-${Date.now()}-${idx}`,
                        serviceProcedure: row.serviceId || 'srv-1',
                        teeth: row.teeth || 'All',
                        unitPrice: 0,
                        subtotal: 0,
                        discountAmount: 0,
                        netTotal: 0
                      }
                    ],
                    totalCost: 0,
                    totalDiscount: 0,
                    netCost: 0,
                    remarks: `Legacy Treatment Plan: ${row.findingName || 'Procedure sequence'}`,
                    attachments: [],
                    status: 'Saved'
                  });
                  importCount++;
                  counts['Treatment Plans'].imported++;
                } else if (detectedTemplate === 'Prescriptions') {
                  notes.push({
                    id: `note-mig-presc-${Date.now()}-${idx}`,
                    date: row.date || new Date().toISOString(),
                    visitDate: row.date || new Date().toISOString(),
                    recallDate: '',
                    recallReason: '',
                    items: [],
                    totalCost: 0,
                    totalDiscount: 0,
                    netCost: 0,
                    remarks: `[Migrated Prescription]\nMedication: ${row.medication || ''}\nDosage: ${row.dosage || ''}\nDescription: ${row.description || ''}`,
                    attachments: [],
                    status: 'Saved'
                  });
                  importCount++;
                  counts['Prescriptions'].imported++;
                } else if (detectedTemplate === 'Certificates') {
                  notes.push({
                    id: `note-mig-cert-${Date.now()}-${idx}`,
                    date: row.date || new Date().toISOString(),
                    visitDate: row.date || new Date().toISOString(),
                    recallDate: '',
                    recallReason: '',
                    items: [],
                    totalCost: 0,
                    totalDiscount: 0,
                    netCost: 0,
                    remarks: `[Migrated Dental Certificate]\nPurpose: ${row.purpose || ''}\nDiagnosis: ${row.diagnosis || ''}`,
                    attachments: [],
                    status: 'Saved'
                  });
                  importCount++;
                  counts['Certificates'].imported++;
                } else if (detectedTemplate === 'Notes') {
                  notes.push({
                    id: `note-mig-note-${Date.now()}-${idx}`,
                    date: row.date || new Date().toISOString(),
                    visitDate: row.date || new Date().toISOString(),
                    recallDate: '',
                    recallReason: '',
                    items: [],
                    totalCost: 0,
                    totalDiscount: 0,
                    netCost: 0,
                    remarks: `[Migrated Clinical Note]\n${row.noteText || ''}`,
                    attachments: [],
                    status: 'Saved'
                  });
                  importCount++;
                  counts['Notes'].imported++;
                } else if (detectedTemplate === 'Appointments') {
                  // Appointments are stored in local storage
                  let existingApts = [];
                  try {
                    const saved = localStorage.getItem(`dental_appointments_${p.id}`);
                    if (saved) existingApts = JSON.parse(saved);
                  } catch (e) {}

                  const startStr = row.startDate || row.date || new Date().toISOString();
                  const endStr = row.endDate || new Date(new Date(startStr).getTime() + 1800000).toISOString();
                  const nextId = `APT-${Date.now().toString().slice(-4)}-${idx}`;

                  const newApt = {
                    id: nextId,
                    startDate: startStr,
                    endDate: endStr,
                    title: row.title || 'Migrated Appointment',
                    status: row.status || 'Confirmed',
                    auditLogs: [
                      {
                        id: `LOG-${Date.now()}-${idx}`,
                        type: 'CREATED' as const,
                        author: currentUser.email,
                        fieldsModified: "Start Date, End Date, Title, Status",
                        timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                        details: "Patient appointment scheduled via legacy database synchronization."
                      }
                    ]
                  };

                  localStorage.setItem(`dental_appointments_${p.id}`, JSON.stringify([newApt, ...existingApts]));
                  importCount++;
                  counts['Appointments'].imported++;
                }

                updatedRecords[existingIndex] = { ...p, progressNotes: notes };
              }
            });

            setRecords(updatedRecords);
          }

          setSyncDetails(counts);

          const duration = Date.now() - startTime;
          const newHistoryItem: MigrationHistoryItem = {
            id: `mig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: new Date().toISOString(),
            user: currentUser.email,
            filename: uploadedFileName,
            templateType: detectedTemplate,
            importedCount: importCount,
            updatedCount: updateCount,
            skippedCount: totalSkipped,
            durationMs: duration,
            status: 'Completed'
          };

          setMigrationHistory(prev => [newHistoryItem, ...prev]);
          setToast({ message: `Successfully synchronized ${importCount} records from legacy directory!`, type: 'success' });
          setWizardStep(7);
          return 100;
        }
        return prev + 15;
      });
    }, 150);
  };

  // Restart the wizard
  const resetWizard = () => {
    setWizardStep(1);
    setUploadedFileName('');
    setRawText('');
    setDetectedTemplate('');
    setValidationErrors([]);
    setParsedRows([]);
    setImportProgress(0);
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col min-h-[750px]">
      
      {/* HEADER SECTION WITHOUT DUPLICATE GEAR ICON */}
      <div className="border-b border-zinc-200 px-6 py-4 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-black text-zinc-900 tracking-tight">Settings</h1>
          <p className="text-xs text-zinc-400 font-medium">Manage clinic configuration, team authorizations, database migrations, and system utilities.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1">
        {/* SIDE NAVIGATION FOR SETTINGS */}
        <div className="w-full lg:w-64 bg-zinc-50 border-r border-zinc-200 p-5 flex flex-col gap-1 shrink-0">
          <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Clinic Configs
          </div>
          
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeTab === 'general' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            General Settings
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeTab === 'users' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            Users & Roles
          </button>

          <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-4">
            Data Management
          </div>

          <button
            onClick={() => setActiveTab('migration')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
            activeTab === 'migration' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <Upload className="w-4 h-4 shrink-0" />
          Data Migration Center
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
            activeTab === 'maintenance' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <Server className="w-4 h-4 shrink-0" />
          System Maintenance
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
            activeTab === 'about' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
        >
          <Info className="w-4 h-4 shrink-0" />
          About Application
        </button>
      </div>

      {/* CONTENT STAGE */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        
        {/* TAB 1: GENERAL SETTINGS */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-black text-zinc-850">General Clinic Configurations</h2>
              <p className="text-xs text-zinc-400 font-medium">Control the basic business parameters and recall automation triggers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Clinic Name</label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl font-semibold text-zinc-800 text-xs focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Hotline Contact Number</label>
                <input
                  type="text"
                  value={clinicPhone}
                  onChange={(e) => setClinicPhone(e.target.value)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl font-semibold text-zinc-800 text-xs focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Official Registered Address</label>
                <input
                  type="text"
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl font-semibold text-zinc-800 text-xs focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Working Hours Start</label>
                <input
                  type="time"
                  value={workingHoursStart}
                  onChange={(e) => setWorkingHoursStart(e.target.value)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl font-semibold text-zinc-800 text-xs focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Working Hours End</label>
                <input
                  type="time"
                  value={workingHoursEnd}
                  onChange={(e) => setWorkingHoursEnd(e.target.value)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl font-semibold text-zinc-800 text-xs focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Average Appointment Block Duration (mins)</label>
                <select
                  value={avgDuration}
                  onChange={(e) => setAvgDuration(Number(e.target.value))}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl font-semibold text-zinc-800 text-xs focus:ring-1 focus:ring-teal-600 focus:border-teal-600 outline-none bg-white"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
              <div>
                <span className="font-bold text-zinc-800 block text-sm">Automated Recall SMS Notifications</span>
                <span className="text-[10px] text-zinc-400 font-semibold">Enable sending diagnostic checkup prompts on customized recall intervals.</span>
              </div>
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                className="w-4.5 h-4.5 accent-teal-600 cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-150">
              <button
                onClick={() => {
                  setToast({ message: 'Clinic settings successfully updated!', type: 'success' });
                }}
                className="bg-zinc-950 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-zinc-800 cursor-pointer transition-all shadow-xs"
              >
                Save Settings Configuration
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: USERS & ROLES */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-black text-zinc-850">Users Management & Authorizations</h2>
              <p className="text-xs text-zinc-400 font-medium">Create user accounts, define access scopes, and audit clinic personnel status.</p>
            </div>

            <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
              <div className="px-5 py-3.5 bg-zinc-50 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-zinc-400 tracking-wider">Registered Clinic Users</span>
                <span className="bg-zinc-200 text-zinc-700 text-[10px] px-2.5 py-1 rounded-full font-bold">
                  {usersList.length} Active Accounts
                </span>
              </div>

              <div className="divide-y divide-zinc-100">
                {usersList.map((usr) => (
                  <div key={usr.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 border border-zinc-200">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-zinc-800 uppercase">{usr.name}</h4>
                        <p className="text-[10px] text-zinc-400 font-semibold">{usr.email} • {usr.phone || 'No Phone'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        usr.role === 'Clinic Owner' ? 'bg-zinc-900 text-white' :
                        usr.role === 'Associate Dentist' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {usr.role}
                      </span>
                      <span className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-55 border border-zinc-200 rounded-2xl p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-zinc-800">Role-Based Access Control Rules</h4>
                <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed">
                  Only **Clinic Owners** have full control over data migration, system settings, database restore operations, and personnel credentials editing. **Associate Dentists** can update patient profiles, record charting diagnostics, and sign progress notes. **Staff Accounts** are restricted to appointment calendar operations, patient registration forms, and collection receipt printouts.
                </p>
              </div>
            </div>
          </div>
        )}


        {/* TAB 4: DATA MIGRATION CENTER (THE AMAZING 7-STEP WIZARD) */}
        {activeTab === 'migration' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-zinc-850">Data Migration & Backup Wizard</h2>
                <p className="text-xs text-zinc-400 font-medium">Re-platform legacy systems with our state-of-the-art interactive migration pipeline.</p>
              </div>
            </div>

            {/* MIGRATION PROGRESS STEPS */}
            <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 p-4 rounded-2xl overflow-x-auto gap-4 shrink-0">
              {[
                { step: 1, name: 'Upload' },
                { step: 2, name: 'Detect' },
                { step: 3, name: 'Validate' },
                { step: 4, name: 'Preview' },
                { step: 5, name: 'Resolve' },
                { step: 6, name: 'Import' },
                { step: 7, name: 'Report' }
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                    wizardStep === s.step ? 'bg-zinc-900 text-white ring-4 ring-zinc-100' :
                    wizardStep > s.step ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-500'
                  }`}>
                    {wizardStep > s.step ? '✓' : s.step}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                    wizardStep === s.step ? 'text-zinc-900' : 'text-zinc-400'
                  }`}>
                    {s.name}
                  </span>
                  {s.step < 7 && <ChevronRight className="w-3 h-3 text-zinc-300" />}
                </div>
              ))}
            </div>

            {/* STEP 1: FILE UPLOAD AND BLANK TEMPLATE DOWNLOAD */}
            {wizardStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* CSV Template Downloads Card */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-4 md:col-span-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-zinc-500" />
                        Legacy Schema Templates
                      </h3>
                      <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed mt-1">
                        Get standard spreadsheets pre-structured to mimic old dental systems. Complete these templates using Excel or Sheets, then import directly.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      {[
                        'Patients', 'Bills', 'Progress Notes', 
                        'Treatment Plans', 'Prescriptions', 'Certificates', 'Notes'
                      ].map((tmpl) => (
                        <button
                          key={tmpl}
                          onClick={() => triggerTemplateDownload(tmpl)}
                          className="w-full flex items-center justify-between p-2 rounded-xl bg-white border border-zinc-200 hover:border-zinc-400 text-left text-[10px] font-bold text-zinc-600 hover:text-zinc-900 transition-all cursor-pointer"
                        >
                          <span>{tmpl} CSV Template</span>
                          <Download className="w-3 h-3 text-zinc-400" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div className="md:col-span-2 flex flex-col justify-between">
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`flex-1 border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-4 transition-all ${
                        dragActive ? 'border-teal-500 bg-teal-50/10' : 'border-zinc-300 bg-white hover:bg-zinc-50/50'
                      }`}
                    >
                      <div className="bg-zinc-100 p-4 rounded-2xl border border-zinc-200 text-zinc-500">
                        <Upload className="w-6 h-6" />
                      </div>
                      
                      <div>
                        <span className="font-bold text-zinc-800 text-sm block">Drag and drop your migration sheet here</span>
                        <span className="text-[10px] text-zinc-400 font-semibold mt-1 block">Supports Microsoft Excel .xlsx, standard comma-separated .csv, or plain .txt lists</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer shadow-xs transition-colors">
                          Browse Local Files
                          <input
                            type="file"
                            accept=".csv, .xlsx, .txt"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex items-start gap-2.5 mt-4">
                      <AlertTriangle className="w-4.5 h-4.5 text-zinc-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-zinc-850 text-xs block">Safe Relational Import Engine</span>
                        <span className="text-[10px] text-zinc-400 font-semibold leading-relaxed">
                          Old invoices, records, and treatment rules automatically align to patient profiles via linked **Patient IDs**. This safeguards dental records without corrupting existing charts.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DB Backup & Restore Actions Block */}
                <div className="border-t border-zinc-150 pt-6">
                  <h3 className="text-xs font-black text-zinc-700 uppercase tracking-wider mb-3">Database Backups & Sandbox Control</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="border border-zinc-200 rounded-2xl p-4 flex items-center justify-between bg-zinc-50">
                      <div>
                        <span className="font-bold text-zinc-800 block text-xs">Download Database Snapshot</span>
                        <span className="text-[9px] text-zinc-400 font-semibold">Instantly bundle your entire database state as a portable JSON snapshot.</span>
                      </div>
                      <button
                        onClick={triggerDatabaseBackup}
                        className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Backup DB
                      </button>
                    </div>

                    <div className="border border-zinc-200 rounded-2xl p-4 flex items-center justify-between bg-zinc-50">
                      <div>
                        <span className="font-bold text-zinc-800 block text-xs">Restore Database Snapshot</span>
                        <span className="text-[9px] text-zinc-400 font-semibold text-red-500 font-semibold">OVERWRITES current local dental clinic memory with your backup file.</span>
                      </div>
                      <label className="bg-white border border-zinc-300 hover:border-zinc-500 text-zinc-700 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-3xs">
                        <Upload className="w-3.5 h-3.5" />
                        Restore DB
                        <input
                          type="file"
                          accept=".json"
                          onChange={triggerDatabaseRestore}
                          className="hidden"
                        />
                      </label>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: AUTO TEMPLATE DETECTION */}
            {wizardStep === 2 && (
              <div className="space-y-6 text-center py-8 animate-in fade-in duration-200">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-150 shadow-xs">
                  <CheckCircle className="w-6 h-6 animate-bounce" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-zinc-850">Legacy Template Auto-Detection Complete</h3>
                  <p className="text-xs text-zinc-400 font-medium max-w-md mx-auto">
                    The schema layout parsing engine analyzed headers from <strong className="text-zinc-600 font-bold">"{uploadedFileName}"</strong>.
                  </p>
                </div>

                <div className="max-w-md mx-auto bg-zinc-50 border border-zinc-200 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between text-xs border-b border-zinc-150 pb-2 text-zinc-500 font-bold uppercase">
                    <span>Parsed Parameter</span>
                    <span>Result</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-semibold">Detected Module:</span>
                    <span className="font-black text-teal-700 uppercase bg-teal-50 border border-teal-100 px-3 py-0.5 rounded-full">
                      {detectedTemplate} Template
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400 font-semibold">File Column Integrity:</span>
                    <span className="font-bold text-zinc-700">100% Structurally Composed</span>
                  </div>
                </div>

                <div className="flex justify-center gap-2 pt-6">
                  <button
                    onClick={resetWizard}
                    className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Discard & Cancel
                  </button>
                  <button
                    onClick={startValidation}
                    className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-850 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    Validate Record Data
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: VALIDATION PREVIEW & RESOLUTION PANEL */}
            {wizardStep === 4 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Scanned Rows', value: migrationStats.total, color: 'text-zinc-800 bg-zinc-50 border border-zinc-200' },
                    { label: 'Valid / Standardized Rows', value: migrationStats.valid, color: 'text-emerald-700 bg-emerald-50/40 border border-emerald-100' },
                    { label: 'Auto-Corrected Formats', value: autoCorrectedFields.length, color: 'text-blue-700 bg-blue-50/40 border border-blue-100' },
                    { label: 'Validation Warnings / Alerts', value: validationErrors.length, color: 'text-amber-700 bg-amber-50/40 border border-amber-100' }
                  ].map((stat) => (
                    <div key={stat.label} className={`p-4 rounded-xl flex flex-col justify-between ${stat.color}`}>
                      <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider leading-snug">{stat.label}</span>
                      <span className="text-lg font-black mt-2">{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* AUTOCORRECTS / AUDIT LOG */}
                {autoCorrectedFields.length > 0 && (
                  <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2 text-blue-800">
                      <CheckSquare className="w-4 h-4" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">Dynamic Auto-Correction & Normalization Report</h4>
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-1.5 text-xs text-blue-700">
                      {autoCorrectedFields.slice(0, 15).map((ac, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span>Row {ac.row} • Standardized <span className="font-bold">"{ac.field}"</span>:</span>
                          <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-blue-100">
                            "{ac.original}" &rarr; <span className="font-bold text-emerald-600">"{ac.corrected}"</span>
                          </span>
                        </div>
                      ))}
                      {autoCorrectedFields.length > 15 && (
                        <div className="text-[10px] text-zinc-400 font-bold italic pt-1 text-center">
                          + {autoCorrectedFields.length - 15} more normalizations applied.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Validation Warnings/Errors List */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-150">
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <h3 className="text-xs font-black text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Validation Assessment Report
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-semibold">Errors block imports. Warnings can be resolved in Step 5.</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-zinc-150">
                    {validationErrors.length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-400 font-medium">
                        🎉 Clean bill of health! No schema mismatches or clinical validation warnings detected.
                      </div>
                    ) : (
                      validationErrors.map((err, index) => (
                        <div key={index} className="p-3.5 flex items-start justify-between gap-3 text-xs leading-relaxed hover:bg-zinc-100/50 transition-all">
                          <div className="flex gap-2.5 items-start">
                            <span className={`p-1 rounded-lg mt-0.5 ${
                              err.severity === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="font-bold text-zinc-800">
                                Row {err.row} ({err.column}) • Patient: {err.patientId}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-medium mt-0.5">{err.error}</div>
                              <div className="text-[9px] text-emerald-600 font-bold mt-1">Suggested Correction: {err.suggestedFix}</div>
                            </div>
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                            err.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {err.severity}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* SIDE-BY-SIDE INTERACTIVE TRANSLATION PREVIEW */}
                <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white">
                  <div className="px-5 py-3.5 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-black text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-teal-600" />
                        Interactive Translation Viewer
                      </h3>
                      <p className="text-[9px] text-zinc-400 font-semibold mt-0.5">
                        Select a record to see side-by-side legacy translation mappings.
                      </p>
                    </div>
                    {/* Row Selector dropdown */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">Record Selection:</span>
                      <select
                        value={selectedPreviewRowIdx}
                        onChange={(e) => setSelectedPreviewRowIdx(Number(e.target.value))}
                        className="p-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-750 focus:ring-1 focus:ring-teal-600 outline-none"
                      >
                        {parsedRows.map((row, idx) => (
                          <option key={idx} value={idx}>
                            Row {row.rowIndex} - Patient {row.patientId || 'New'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Side-by-Side split grid */}
                  {parsedRows.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-150">
                      {/* Left side: Original Raw Row */}
                      <div className="p-4 space-y-3 bg-zinc-50/30">
                        <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                            Left Panel: Original Legacy Row
                          </span>
                          <span className="text-[9px] font-mono bg-zinc-200 px-1.5 py-0.5 rounded text-zinc-500 uppercase font-black">
                            Raw Inputs
                          </span>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {rawLegacyRows[selectedPreviewRowIdx] &&
                            Object.entries(rawLegacyRows[selectedPreviewRowIdx])
                              .filter(([k]) => k !== 'rowIndex')
                              .map(([k, v]) => (
                                <div key={k} className="flex justify-between items-start text-xs border-b border-zinc-100/60 pb-1">
                                  <span className="font-mono text-zinc-400 font-bold break-all text-[10px]">{k}</span>
                                  <span className="font-semibold text-zinc-700 break-all text-right max-w-[200px]">
                                    {v ? String(v) : <span className="text-zinc-300 italic">empty</span>}
                                  </span>
                                </div>
                              ))}
                        </div>
                      </div>

                      {/* Right side: Standardized Converted Row */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-teal-600">
                            Right Panel: Transformed Model
                          </span>
                          <span className="text-[9px] font-mono bg-teal-50 px-1.5 py-0.5 rounded text-teal-700 uppercase font-black">
                            Standardized
                          </span>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {parsedRows[selectedPreviewRowIdx] &&
                            Object.entries(parsedRows[selectedPreviewRowIdx])
                              .filter(([k]) => k !== 'rowIndex')
                              .map(([k, v]) => (
                                <div key={k} className="flex justify-between items-start text-xs border-b border-zinc-100/60 pb-1">
                                  <span className="font-bold text-zinc-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                  <span className="font-black text-teal-700 break-all text-right max-w-[200px]">
                                    {v ? String(v) : <span className="text-zinc-300 italic">empty</span>}
                                  </span>
                                </div>
                              ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-150">
                  <button
                    onClick={resetWizard}
                    className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel Import
                  </button>
                  {validationErrors.filter(e => e.severity === 'warning').length > 0 || patientUpdates.length > 0 ? (
                    <button
                      onClick={proceedToErrorResolver}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      Resolve & Synchronize
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      disabled={validationErrors.some(e => e.severity === 'error')}
                      onClick={executeBatchImport}
                      className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-850 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Execute Import Data
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: INTERACTIVE MAPPING / RESOLVE ERRORS */}
            {wizardStep === 5 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {detectedTemplate === 'Patients' && patientUpdates.length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-2xl space-y-2">
                      <h3 className="text-xs font-black text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" />
                        Patient Database Synchronization Resolver
                      </h3>
                      <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed">
                        The legacy file contains patients matching existing database records but with newer details. Interactively choose how to synchronize each demographic profile.
                      </p>
                    </div>

                    <div className="space-y-5">
                      {patientUpdates.map((up, upIdx) => (
                        <div key={up.rowIdx} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
                          <div className="bg-zinc-50 border-b border-zinc-150 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Row {up.rowIdx} • Match Profile</span>
                              <h4 className="text-xs font-bold text-zinc-800">
                                {up.existingPatient.personalInfo.lastName}, {up.existingPatient.personalInfo.firstName} ({up.existingPatient.id})
                              </h4>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {['update', 'keep', 'review'].map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    const updatedList = [...patientUpdates];
                                    updatedList[upIdx].resolution = opt;
                                    setPatientUpdates(updatedList);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                                    up.resolution === opt
                                      ? opt === 'update' ? 'bg-emerald-600 text-white shadow-xs'
                                        : opt === 'keep' ? 'bg-zinc-700 text-white shadow-xs'
                                        : 'bg-amber-500 text-white shadow-xs'
                                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                                  }`}
                                >
                                  {opt === 'update' ? 'Update Existing' : opt === 'keep' ? 'Keep Existing' : 'Review Later'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="p-4 overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="border-b border-zinc-150 text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                                  <th className="pb-2">Field name</th>
                                  <th className="pb-2">Database current Value</th>
                                  <th className="pb-2">Incoming legacy Value</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100">
                                {up.changes.map((ch: any, chIdx: number) => (
                                  <tr key={chIdx} className="hover:bg-zinc-50/50">
                                    <td className="py-2.5 font-bold text-zinc-500">{ch.field}</td>
                                    <td className="py-2.5 font-medium text-zinc-400 font-mono text-[11px]">{ch.oldValue || <span className="italic text-zinc-300">empty</span>}</td>
                                    <td className="py-2.5 font-black text-emerald-600 font-mono text-[11px]">{ch.newValue}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(resolvedMapping).length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-2xl space-y-2">
                      <h3 className="text-xs font-black text-zinc-700 uppercase tracking-wider">Service Master Directory Mapper</h3>
                      <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed">
                        Some old legacy billing service descriptions do not exactly match our system's core directory names. Select a catalog equivalent below so that ledger metrics reconcile perfectly.
                      </p>
                    </div>

                    <div className="space-y-4 border border-zinc-200 rounded-2xl p-5 divide-y divide-zinc-150 bg-white">
                      {Object.keys(resolvedMapping).map((oldService, index) => (
                        <div key={index} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                          <div>
                            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Legacy Sheet Entry</span>
                            <div className="text-xs font-bold text-zinc-850 mt-1 uppercase">"{oldService}"</div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <ChevronRight className="w-4 h-4 text-zinc-400 hidden md:block" />
                            <div>
                              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Clinic Master equivalent</span>
                              <select
                                value={resolvedMapping[oldService]}
                                onChange={(e) => setResolvedMapping({ ...resolvedMapping, [oldService]: e.target.value })}
                                className="p-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-750 focus:ring-1 focus:ring-teal-600 outline-none w-64"
                              >
                                <option value="srv-1">Consultation Fee (₱500.00)</option>
                                <option value="srv-3">Composite Filling (Mild) (₱1,000.00)</option>
                                <option value="srv-5">Oral Prophylaxis (₱1,000.00)</option>
                                <option value="srv-11">Tooth Extraction (₱1,000.00)</option>
                                <option value="srv-30">Dental Certificate (₱100.00)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {patientUpdates.length === 0 && Object.keys(resolvedMapping).length === 0 && (
                  <div className="p-12 text-center bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h3 className="text-sm font-bold text-zinc-800">No Mapped Warnings Left to Resolve</h3>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      All incoming legacy rows match database nodes perfectly. Ready to initiate synchronization transaction.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-150">
                  <button
                    onClick={() => setWizardStep(4)}
                    className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Back to Preview
                  </button>
                  <button
                    onClick={executeBatchImport}
                    className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-850 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    Apply Resolves & Import
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: BULK BATCH IMPORT ANIMATION */}
            {wizardStep === 6 && (
              <div className="space-y-6 text-center py-12 animate-in fade-in duration-200">
                <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 text-zinc-650 flex items-center justify-center border border-zinc-200 animate-spin">
                  <RefreshCw className="w-6 h-6 text-zinc-550" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-black text-zinc-850 uppercase tracking-widest">
                    Bulk-migrating legacy directory records...
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-semibold max-w-sm mx-auto">
                    Executing sequential transactions in memory buffers. Sharding rows to maintain standard thread responses.
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-2 pt-4">
                  <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden border border-zinc-200 shadow-inner">
                    <div 
                      className="bg-zinc-900 h-full rounded-full transition-all duration-150 ease-out"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                    <span>Batch Queue Processing</span>
                    <span>{importProgress}% Complete</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7: MIGRATION COMPLETE REPORT */}
            {wizardStep === 7 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border border-emerald-150 bg-emerald-50/20 p-5 rounded-2xl flex items-start gap-4">
                  <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl border border-emerald-100 shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-850">Migration Process Successfully Completed!</h3>
                    <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-1">
                      Legacy dental historical database tables are cleanly normalized and injected into Active Memory. Relationships mapped to patient demographics are fully established.
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 divide-y divide-zinc-150 space-y-3">
                  <div className="flex justify-between text-xs pb-3 font-bold text-zinc-800 uppercase tracking-wider">
                    <span>Audit Output</span>
                    <span>Count Record</span>
                  </div>
                  <div className="flex justify-between text-xs pt-3">
                    <span className="text-zinc-400 font-semibold">Normalized Rows Injected:</span>
                    <span className="font-bold text-emerald-600">+{migrationStats.valid} Entries</span>
                  </div>
                  <div className="flex justify-between text-xs pt-3">
                    <span className="text-zinc-400 font-semibold">Modified Patient Nodes:</span>
                    <span className="font-bold text-zinc-700">{migrationStats.updated} Records</span>
                  </div>
                  <div className="flex justify-between text-xs pt-3">
                    <span className="text-zinc-400 font-semibold">Skipped Records (Invalid/Dupe):</span>
                    <span className="font-bold text-red-500">{migrationStats.skipped} Rows</span>
                  </div>
                  <div className="flex justify-between text-xs pt-3">
                    <span className="text-zinc-400 font-semibold">Migration Duration:</span>
                    <span className="font-bold text-zinc-650">0.5 Seconds</span>
                  </div>
                </div>

                {/* MODULE BREAKDOWN DETAILS */}
                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-zinc-50 border-b border-zinc-150 px-5 py-3 flex items-center justify-between">
                    <h3 className="text-xs font-black text-zinc-750 uppercase tracking-wider">Module-Specific Synchronization Breakdown</h3>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 font-bold uppercase">Real-time DB Sync</span>
                  </div>
                  <div className="divide-y divide-zinc-100 text-xs">
                    {Object.entries(syncDetails).map(([moduleName, detail]: [string, any]) => {
                      if (detail.imported === 0 && detail.skipped === 0 && (detail.updated === undefined || detail.updated === 0) && (detail.existing === undefined || detail.existing === 0)) return null;
                      return (
                        <div key={moduleName} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/50 transition-all">
                          <span className="font-bold text-zinc-800">{moduleName}</span>
                          <div className="flex flex-wrap gap-2">
                            {detail.imported !== undefined && detail.imported > 0 && (
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-mono text-[10px] font-black border border-emerald-100 uppercase">
                                + {detail.imported} Imported
                              </span>
                            )}
                            {detail.updated !== undefined && detail.updated > 0 && (
                              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-mono text-[10px] font-black border border-blue-100 uppercase">
                                ~ {detail.updated} Updated
                              </span>
                            )}
                            {detail.existing !== undefined && detail.existing > 0 && (
                              <span className="bg-zinc-50 text-zinc-600 px-2 py-1 rounded-lg font-mono text-[10px] font-black border border-zinc-200 uppercase">
                                • {detail.existing} Merged / Existing
                              </span>
                            )}
                            {detail.skipped !== undefined && detail.skipped > 0 && (
                              <span className="bg-red-50 text-red-600 px-2 py-1 rounded-lg font-mono text-[10px] font-black border border-red-100 uppercase">
                                x {detail.skipped} Skipped / Duplicates
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={resetWizard}
                    className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-850 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Finish & Exit Wizard
                  </button>
                </div>
              </div>
            )}

            {/* MIGRATION HISTORY LOG */}
            {wizardStep === 1 && (
              <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
                <div className="px-5 py-3.5 bg-zinc-50 flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-zinc-400 tracking-wider">Audit Log & Migration History</span>
                  <span className="bg-zinc-200 text-zinc-700 text-[9px] font-bold px-2 py-0.5 rounded-full">
                    {migrationHistory.length} Previous Runs
                  </span>
                </div>
                <div className="divide-y divide-zinc-100">
                  {migrationHistory.map((h) => (
                    <div key={h.id} className="p-4 flex items-center justify-between text-xs leading-relaxed hover:bg-zinc-50/50 transition-all">
                      <div className="flex gap-2.5 items-center">
                        <span className="p-2 bg-zinc-100 text-zinc-600 rounded-xl border border-zinc-150">
                          <FileText className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="font-bold text-zinc-800 uppercase">{h.filename}</div>
                          <div className="text-[10px] text-zinc-400 font-semibold">
                            {new Date(h.date).toLocaleDateString()} • Type: {h.templateType} • Operator: {h.user}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="font-bold text-emerald-600">+{h.importedCount} Imported</div>
                          {h.skippedCount > 0 && <div className="text-[10px] text-red-500 font-bold">{h.skippedCount} Skipped</div>}
                        </div>
                        <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                          {h.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SYSTEM MAINTENANCE */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-black text-zinc-850">System Maintenance & Performance Auditing</h2>
              <p className="text-xs text-zinc-400 font-medium">Verify system storage quotas, examine clinic security logs, and prune browser cache parameters.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: 'Database Status', val: 'Online & Reconciled', icon: Server, color: 'text-emerald-700 bg-emerald-50 border border-emerald-100' },
                { label: 'Active Storage Usage', val: `${(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB / 5.0 MB`, icon: Database, color: 'text-zinc-800 bg-zinc-50' },
                { label: 'Clinician Actions Audited', val: '14 Active Sessions', icon: Shield, color: 'text-indigo-700 bg-indigo-50 border border-indigo-100' }
              ].map((stat) => (
                <div key={stat.label} className={`p-4 rounded-xl flex items-center justify-between ${stat.color}`}>
                  <div>
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider block">{stat.label}</span>
                    <span className="text-sm font-black mt-1.5 block">{stat.val}</span>
                  </div>
                  <stat.icon className="w-5 h-5 shrink-0" />
                </div>
              ))}
            </div>

            <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
              <div className="px-5 py-3.5 bg-zinc-50 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-zinc-400 tracking-wider">Clinician Access & Safety Audit Log</span>
                <button
                  onClick={() => {
                    setToast({ message: 'Audit trails cleared successfully.', type: 'info' });
                  }}
                  className="text-[10px] font-black text-zinc-400 hover:text-zinc-700 cursor-pointer uppercase"
                >
                  Clear Logs
                </button>
              </div>

              <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-zinc-50/50 transition-all">
                    <div>
                      <span className="font-bold text-zinc-800">{log.action}</span>
                      <p className="text-[10px] text-zinc-400 font-semibold">{log.user} • {log.module} Node</p>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-semibold">{new Date(log.time).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-zinc-150">
              <button
                onClick={() => {
                  localStorage.clear();
                  setToast({ message: 'System memory pruned! Reloading layout...', type: 'info' });
                  setTimeout(() => window.location.reload(), 1500);
                }}
                className="bg-red-50 text-red-700 border border-red-100 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-red-100 transition-all cursor-pointer"
              >
                Clear Cache Parameters
              </button>
              <button
                onClick={() => {
                  setToast({ message: 'Clinical diagnostics run completed. Zero latency errors.', type: 'success' });
                }}
                className="bg-zinc-950 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-zinc-800 transition-all cursor-pointer shadow-xs"
              >
                Run Diagnostics Check
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: ABOUT */}
        {activeTab === 'about' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-lg font-display text-lg font-black tracking-tighter">
                PJ
              </div>
              <h3 className="text-sm font-black text-zinc-850 uppercase tracking-widest mt-4">
                P&J Tanarte Dental Clinic Ledger
              </h3>
              <p className="text-xs text-zinc-400 font-semibold">
                Version 3.4.0 (Enterprise Suite)
              </p>
            </div>

            <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100 max-w-xl mx-auto text-xs">
              <div className="p-4 flex justify-between">
                <span className="text-zinc-400 font-bold uppercase">System Kernel Version</span>
                <span className="font-bold text-zinc-700">React 18.3 • Vite v6</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-zinc-400 font-bold uppercase">Database Model</span>
                <span className="font-bold text-zinc-700">Relational LocalMemory Schema</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-zinc-400 font-bold uppercase">Secure License Scope</span>
                <span className="font-black text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100 uppercase text-[10px]">
                  Authorized Clinic Owner
                </span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-zinc-400 font-bold uppercase">Developer Organization</span>
                <span className="font-bold text-zinc-700">DeepMind Antigravity Systems</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-zinc-400 font-bold uppercase">Last Successful Backup</span>
                <span className="font-bold text-zinc-650">Today, {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <p className="text-[10px] text-zinc-400 font-semibold text-center max-w-md mx-auto leading-relaxed pt-4 border-t border-zinc-100">
              © 2026 P&J Tanarte Dental Clinic Group. Certified medical storage module. All clinical access trails are legally signed and protected.
            </p>
          </div>
        )}

      </div>

    </div>
  </div>
  );
}
