import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Check, AlertTriangle, Info, Sparkles, 
  Sliders, X, ShieldAlert, Activity, ArrowRight, FileSpreadsheet, 
  Heart, CheckCircle2, ChevronRight, RefreshCw, Clipboard, ShieldCheck,
  Edit3, Eye, FileText, CheckSquare, Square, CheckCircle, Calculator,
  Calendar, Clock, DollarSign, UserCheck
} from 'lucide-react';
import { PatientRecord, TreatmentRule, ProgressNote, TreatmentItem } from '../../types';
import { PRELOADED_RULES } from '../settings/TreatmentRulesManager';
import { motion, AnimatePresence } from 'motion/react';

interface SmartRecommendationEngineProps {
  patient: PatientRecord;
  toothData: Record<string, { surfaces: Record<string, string>; options: string[] }>;
  onAddProgressNote?: (note: any) => void;
}

// Interfaces for our clinical findings and treatment plan
export interface ClinicalFinding {
  id: string;
  source: 'Dental Chart' | 'Progress Notes' | 'Patient Information';
  name: string;
  details: string;
  affectedTeeth: string[];
  isAccepted: boolean;
  urgency: 'Low' | 'Medium' | 'High';
}

export interface RecommendedProcedure {
  id: string;
  serviceId: string;
  serviceName: string;
  unitPrice: number;
  teeth: string[];
  reason: string;
  confidenceScore: number;
  priorityRank: 'Conservative' | 'Standard' | 'Comprehensive';
  findingName: string;
  selected: boolean;
}

export interface SuggestiveTreatmentPlan {
  careLevel: 'Level 1 – Normal Care' | 'Level 2 – Monitoring Required' | 'Level 3 – Immediate Clinical Attention';
  levelColor: string;
  levelBadge: string;
  clinicalSummary: string;
  affectedTeeth: string[];
  procedures: RecommendedProcedure[];
  sequence: { step: number; description: string; procedures: string[] }[];
  estimatedVisits: number;
  estimatedTimeline: string;
  warnings: string[];
  estimatedCost: number;
}

export default function SmartRecommendationEngine({ 
  patient, 
  toothData = {}, 
  onAddProgressNote 
}: SmartRecommendationEngineProps) {
  
  // Load dynamic lists from storage
  const [services, setServices] = useState<any[]>(() => {
    const stored = localStorage.getItem('DENTAL_SERVICES_MASTER');
    return stored ? JSON.parse(stored) : [];
  });

  const [rules, setRules] = useState<TreatmentRule[]>(() => {
    const stored = localStorage.getItem('DENTAL_TREATMENT_RULES_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_RULES;
  });

  // Steps state: 'REVIEW' | 'PLAN' | 'MAP' | 'QUOTATION'
  const [activeStep, setActiveStep] = useState<'REVIEW' | 'PLAN'>('REVIEW');
  const [isAnalysisConfirmed, setIsAnalysisConfirmed] = useState<boolean>(false);
  const [isPlanGenerated, setIsPlanGenerated] = useState<boolean>(false);

  // Findings list
  const [detectedFindings, setDetectedFindings] = useState<ClinicalFinding[]>([]);
  const [editingFinding, setEditingFinding] = useState<ClinicalFinding | null>(null);
  
  // Manual finding inputs
  const [isAddingFinding, setIsAddingFinding] = useState(false);
  const [newFindingName, setNewFindingName] = useState('');
  const [newFindingSource, setNewFindingSource] = useState<'Dental Chart' | 'Progress Notes' | 'Patient Information'>('Dental Chart');
  const [newFindingDetails, setNewFindingDetails] = useState('');
  const [newFindingTeeth, setNewFindingTeeth] = useState('');
  const [newFindingUrgency, setNewFindingUrgency] = useState<'Low' | 'Medium' | 'High'>('Medium');

  // Confirmed Suggestive Plan
  const [treatmentPlan, setTreatmentPlan] = useState<SuggestiveTreatmentPlan | null>(null);

  // Active Philosophy Filter (Conservative vs Standard vs Comprehensive)
  const [activePhilosophy, setActivePhilosophy] = useState<'Conservative' | 'Standard' | 'Comprehensive'>('Standard');

  // Quotation States
  const [quotationItems, setQuotationItems] = useState<any[]>([]);
  const [isQuotationGenerated, setIsQuotationGenerated] = useState<boolean>(false);
  const [isQuotationApproved, setIsQuotationApproved] = useState<boolean>(false);
  const [dentistNotes, setDentistNotes] = useState<string>('');
  const [editQuotationIndex, setEditQuotationIndex] = useState<number | null>(null);
  const [editQuotationPrice, setEditQuotationPrice] = useState<number>(0);
  const [editQuotationQty, setEditQuotationQty] = useState<number>(1);
  const [estimatedVisitsInput, setEstimatedVisitsInput] = useState<number>(1);
  const [estimatedTimelineInput, setEstimatedTimelineInput] = useState<string>('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // Run Clinical Analysis to extract findings on mount or patient change
  useEffect(() => {
    initializeFindings();
    setIsAnalysisConfirmed(false);
    setIsPlanGenerated(false);
    setTreatmentPlan(null);
    setIsQuotationGenerated(false);
    setIsQuotationApproved(false);
    setActiveStep('REVIEW');
  }, [patient, toothData, rules]);

  // Read services on focus/mount
  useEffect(() => {
    const stored = localStorage.getItem('DENTAL_SERVICES_MASTER');
    if (stored) {
      setServices(JSON.parse(stored));
    }
  }, []);

  // Extraction of all clinical findings
  const initializeFindings = () => {
    const findingsList: ClinicalFinding[] = [];

    // Helper to generate unique IDs
    const makeId = () => `find-${Math.random().toString(36).substr(2, 9)}`;

    // --- 1. PATIENT INFORMATION EXTRACTION ---
    if (patient.personalInfo) {
      const birthdate = patient.personalInfo.birthdate;
      if (birthdate) {
        const birthYear = new Date(birthdate).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
        if (age < 18) {
          findingsList.push({
            id: makeId(),
            source: 'Patient Information',
            name: 'Minor Patient Status',
            details: `Patient age is ${age}. Pediatric clinical procedures and behavioral guidance may apply.`,
            affectedTeeth: [],
            isAccepted: true,
            urgency: 'Low'
          });
        }
      }

      const allergyStr = patient.medicalHistory?.allergiesToMedications || '';
      if (allergyStr && allergyStr.toLowerCase() !== 'none' && allergyStr.toLowerCase() !== 'n/a' && allergyStr.trim() !== '') {
        findingsList.push({
          id: makeId(),
          source: 'Patient Information',
          name: 'Medical Allergy Alert',
          details: `Known drug allergies: "${allergyStr}". Special care required in prescriptions.`,
          affectedTeeth: [],
          isAccepted: true,
          urgency: 'High'
        });
      }

      const conditions = patient.medicalHistory?.conditions || [];
      conditions.forEach(cond => {
        let urg: 'Low' | 'Medium' | 'High' = 'Medium';
        if (['heart attack', 'heart disease', 'bleeding problems', 'stroke', 'high blood pressure'].some(c => cond.toLowerCase().includes(c))) {
          urg = 'High';
        }
        findingsList.push({
          id: makeId(),
          source: 'Patient Information',
          name: `Systemic Condition: ${cond}`,
          details: `Patient has history of ${cond}. Monitor vital signs prior to surgery.`,
          affectedTeeth: [],
          isAccepted: true,
          urgency: urg
        });
      });

      // Pregnancy detection
      const otherConcerns = (patient.medicalHistory?.otherMedicalConcerns || '').toLowerCase();
      const medAlert = (patient.medicalHistory?.medicalAlert || '').toLowerCase();
      if (otherConcerns.includes('pregnan') || medAlert.includes('pregnan')) {
        findingsList.push({
          id: makeId(),
          source: 'Patient Information',
          name: 'Pregnancy Status',
          details: 'Patient reports pregnancy. Restrict radiographs to absolute emergencies and consult OB-GYN.',
          affectedTeeth: [],
          isAccepted: true,
          urgency: 'High'
        });
      }
    }

    // --- 2. DENTAL CHART FINDINGS (Odontogram) ---
    const toothFindingsGrouped: Record<string, string[]> = {};
    const toothCariesGrouped: string[] = [];
    const toothMissingCariesGrouped: string[] = [];
    const toothMissingOtherGrouped: string[] = [];
    const toothImpactedGrouped: string[] = [];
    const toothRootFragmentGrouped: string[] = [];

    Object.keys(toothData).forEach(toothNum => {
      const tooth = toothData[toothNum];
      if (!tooth) return;

      // Scan surfaces for red color or decay
      const hasCavitySurface = Object.keys(tooth.surfaces).some(
        surf => tooth.surfaces[surf] === 'red' || tooth.surfaces[surf] === 'cv'
      );
      const hasCavityOption = tooth.options.includes('Cavity');

      if (hasCavitySurface || hasCavityOption) {
        toothCariesGrouped.push(toothNum);
      }
      if (tooth.options.includes('Missing Due to Caries')) {
        toothMissingCariesGrouped.push(toothNum);
      }
      if (tooth.options.includes('Missing Due to Other Cause')) {
        toothMissingOtherGrouped.push(toothNum);
      }
      if (tooth.options.includes('Impacted Tooth')) {
        toothImpactedGrouped.push(toothNum);
      }
      if (tooth.options.includes('Root Fragment')) {
        toothRootFragmentGrouped.push(toothNum);
      }

      // Add other non-grouped custom options if any
      tooth.options.forEach(opt => {
        if (!['Cavity', 'Missing Due to Caries', 'Missing Due to Other Cause', 'Impacted Tooth', 'Root Fragment'].includes(opt)) {
          if (!toothFindingsGrouped[opt]) {
            toothFindingsGrouped[opt] = [];
          }
          toothFindingsGrouped[opt].push(toothNum);
        }
      });
    });

    if (toothCariesGrouped.length > 0) {
      findingsList.push({
        id: makeId(),
        source: 'Dental Chart',
        name: 'Cavity / Active Caries',
        details: `Carious tooth structure recorded on ${toothCariesGrouped.length} teeth. Immediate restoration indicated.`,
        affectedTeeth: [...toothCariesGrouped].sort((a,b)=>Number(a)-Number(b)),
        isAccepted: true,
        urgency: 'Medium'
      });
    }

    if (toothMissingCariesGrouped.length > 0) {
      findingsList.push({
        id: makeId(),
        source: 'Dental Chart',
        name: 'Missing Due to Caries',
        details: `Tooth lost due to caries. Dental arch rehabilitation recommended to prevent drifting.`,
        affectedTeeth: [...toothMissingCariesGrouped].sort((a,b)=>Number(a)-Number(b)),
        isAccepted: true,
        urgency: 'Low'
      });
    }

    if (toothMissingOtherGrouped.length > 0) {
      findingsList.push({
        id: makeId(),
        source: 'Dental Chart',
        name: 'Missing Due to Other Cause',
        details: `Tooth missing due to trauma or congenitally. Restorative options could restore mastication.`,
        affectedTeeth: [...toothMissingOtherGrouped].sort((a,b)=>Number(a)-Number(b)),
        isAccepted: true,
        urgency: 'Low'
      });
    }

    if (toothImpactedGrouped.length > 0) {
      findingsList.push({
        id: makeId(),
        source: 'Dental Chart',
        name: 'Impacted Tooth',
        details: `Wisdom or unerupted teeth locked in bone. Odontectomy may prevent cyst formation.`,
        affectedTeeth: [...toothImpactedGrouped].sort((a,b)=>Number(a)-Number(b)),
        isAccepted: true,
        urgency: 'Medium'
      });
    }

    if (toothRootFragmentGrouped.length > 0) {
      findingsList.push({
        id: makeId(),
        source: 'Dental Chart',
        name: 'Root Fragment',
        details: `Retained root structure presenting severe local infection and sepsis risks. Surgical extraction strongly indicated.`,
        affectedTeeth: [...toothRootFragmentGrouped].sort((a,b)=>Number(a)-Number(b)),
        isAccepted: true,
        urgency: 'High'
      });
    }

    // Append other tooth findings
    Object.keys(toothFindingsGrouped).forEach(findingKey => {
      findingsList.push({
        id: makeId(),
        source: 'Dental Chart',
        name: findingKey,
        details: `Recorded status: "${findingKey}" detected during clinical odontogram mapping.`,
        affectedTeeth: toothFindingsGrouped[findingKey].sort((a,b)=>Number(a)-Number(b)),
        isAccepted: true,
        urgency: 'Medium'
      });
    });

    // --- 3. PROGRESS NOTES KEYWORDS PARSING ---
    const progressNotes = patient.progressNotes || [];
    const notesKeywords: { keyword: string; name: string; details: string; urgency: 'Low' | 'Medium' | 'High' }[] = [
      { keyword: 'pain', name: 'Reported Dental Pain', details: 'Patient reported persistent dental pain or toothache.', urgency: 'High' },
      { keyword: 'swelling', name: 'Facial / Gingival Swelling', details: 'Acute or chronic swelling reported. Abscess risk high.', urgency: 'High' },
      { keyword: 'bleed', name: 'Gingival Bleeding', details: 'Bleeding gums when brushing or clinical bleeding indices high.', urgency: 'Medium' },
      { keyword: 'sensit', name: 'Dentin Sensitivity', details: 'Hypersensitivity to thermal, electrical, or sweet triggers.', urgency: 'Medium' },
      { keyword: 'mobil', name: 'Tooth Mobility', details: 'Tooth loose or showing grade 1-3 mobility. Periodontal bone loss risk.', urgency: 'High' },
      { keyword: 'broken', name: 'Broken Tooth Crown', details: 'Fractured enamel/dentin from mechanical load or secondary decay.', urgency: 'Medium' },
      { keyword: 'calculus', name: 'Calculus Accumulation', details: 'Mineralized plaque requiring mechanical scaling and root planing.', urgency: 'Low' }
    ];

    const processedKeywords = new Set<string>();
    progressNotes.forEach(note => {
      const remarks = (note.remarks || '').toLowerCase();
      const reason = (note.recallReason || '').toLowerCase();
      const combinedText = `${remarks} ${reason}`;

      notesKeywords.forEach(nk => {
        if (combinedText.includes(nk.keyword) && !processedKeywords.has(nk.keyword)) {
          processedKeywords.add(nk.keyword);
          findingsList.push({
            id: makeId(),
            source: 'Progress Notes',
            name: nk.name,
            details: `${nk.details} (Extracted dynamically from progress notes: "${note.visitDate}")`,
            affectedTeeth: [],
            isAccepted: true,
            urgency: nk.urgency
          });
        }
      });
    });

    // Baseline fallbacks if no findings exist - add Preventive cleaning if dental chart is empty
    if (findingsList.length === 0) {
      findingsList.push({
        id: makeId(),
        source: 'Patient Information',
        name: 'Routine Prevention Need',
        details: 'No acute active carious lesions or surgical cases declared. Standard prophylaxis indicated.',
        affectedTeeth: [],
        isAccepted: true,
        urgency: 'Low'
      });
    }

    setDetectedFindings(findingsList);
  };

  // Accepted toggles
  const handleToggleFinding = (id: string) => {
    setDetectedFindings(prev => prev.map(f => f.id === id ? { ...f, isAccepted: !f.isAccepted } : f));
  };

  // Dismiss / Remove finding
  const handleRemoveFinding = (id: string) => {
    setDetectedFindings(prev => prev.filter(f => f.id !== id));
    showToast('Finding dismissed from current review cycle.');
  };

  // Modify a finding
  const handleSaveModifiedFinding = (updated: ClinicalFinding) => {
    setDetectedFindings(prev => prev.map(f => f.id === updated.id ? updated : f));
    setEditingFinding(null);
    showToast('Finding parameters modified successfully.');
  };

  // Add custom manual finding
  const handleAddManualFinding = () => {
    if (!newFindingName.trim()) {
      showToast('Finding name cannot be empty.', 'error');
      return;
    }
    const teethArr = newFindingTeeth.trim()
      ? newFindingTeeth.split(/[\s,]+/).map(t => t.trim()).filter(Boolean)
      : [];

    const custom: ClinicalFinding = {
      id: `manual-find-${Date.now()}`,
      source: newFindingSource,
      name: newFindingName.trim(),
      details: newFindingDetails.trim() || 'Custom finding added by treating dentist.',
      affectedTeeth: teethArr,
      isAccepted: true,
      urgency: newFindingUrgency
    };

    setDetectedFindings(prev => [...prev, custom]);
    setIsAddingFinding(false);
    setNewFindingName('');
    setNewFindingDetails('');
    setNewFindingTeeth('');
    setNewFindingUrgency('Medium');
    showToast('Dentist finding appended successfully!');
  };

  // Confirm analysis review list
  const handleConfirmAnalysis = () => {
    const acceptedCount = detectedFindings.filter(f => f.isAccepted).length;
    if (acceptedCount === 0) {
      showToast('Please accept at least one diagnostic finding to proceed.', 'error');
      return;
    }
    setIsAnalysisConfirmed(true);
    showToast('Clinical Findings List Confirmed. Ready to generate treatment plan.');
  };

  // Dynamic Rule Execution & Planning
  const handleGenerateTreatmentPlan = () => {
    const confirmedFindings = detectedFindings.filter(f => f.isAccepted);
    if (confirmedFindings.length === 0) {
      showToast('Please confirm some accepted findings first.', 'error');
      return;
    }

    // Load fresh master catalog dynamically
    const storedServices = localStorage.getItem('DENTAL_SERVICES_MASTER');
    const dbServices = storedServices ? JSON.parse(storedServices) : [];

    // Define helper to get catalog service details
    const findService = (id: string) => dbServices.find((s: any) => s.id === id);

    // Dynamic confidence calculators
    const calcCompletenessBonus = () => {
      let score = 0;
      if (patient.personalInfo.birthdate) score += 3;
      if (patient.personalInfo.sex) score += 2;
      if (patient.medicalHistory?.conditions && patient.medicalHistory.conditions.length > 0) score += 5;
      if (patient.medicalHistory?.allergiesToMedications) score += 3;
      return score;
    };

    const completenessBonus = calcCompletenessBonus();
    const hasXray = (patient.progressNotes || []).some(note => 
      (note.remarks || '').toLowerCase().includes('x-ray') || 
      (note.remarks || '').toLowerCase().includes('radiograph') ||
      (note.attachments || []).some(att => att.name.toLowerCase().includes('xray') || att.name.toLowerCase().includes('x-ray'))
    );

    const procs: RecommendedProcedure[] = [];
    const warningsSet = new Set<string>();

    // Apply known warnings
    const allergyStr = patient.medicalHistory?.allergiesToMedications || '';
    if (allergyStr && allergyStr.toLowerCase() !== 'none' && allergyStr.toLowerCase() !== 'n/a') {
      warningsSet.add(`ALLERGY WARNING: Patient reports sensitivity to: ${allergyStr}. Verify prescription medications and topical application materials.`);
    }
    const hasHeartDisease = (patient.medicalHistory?.conditions || []).some(c => c.toLowerCase().includes('heart') || c.toLowerCase().includes('cardiac'));
    if (hasHeartDisease) {
      warningsSet.add("CARDIAC PROTOCOL: Prophylactic antibiotic cover may be indicated prior to extraction or invasive scaling. Check with treating cardiologist.");
    }
    const otherConcernsText = (patient.medicalHistory?.otherMedicalConcerns || '').toLowerCase();
    if (otherConcernsText.includes('pregnan')) {
      warningsSet.add("PREGNANCY PROTOCOL: Restrict radiographs to emergency dental cases. Keep treatments short, position patient with left lateral tilt to avoid supine hypotensive syndrome.");
    }

    // Execute Rules Engine on findings
    confirmedFindings.forEach(finding => {
      // 1. Try to find matched Treatment Rule in the database
      const matchedRule = rules.find(r => r.findingName.toLowerCase() === finding.name.toLowerCase());
      
      if (matchedRule && matchedRule.services.length > 0) {
        // Map based on Philosophy choice (Conservative priority 1, Standard priority 2, Comprehensive priority 3)
        let mappedServiceItem = matchedRule.services.find(s => 
          (activePhilosophy === 'Conservative' && s.priority === 1) ||
          (activePhilosophy === 'Standard' && s.priority === 2) ||
          (activePhilosophy === 'Comprehensive' && s.priority === 3)
        );

        // Fallback if that specific priority is not mapped
        if (!mappedServiceItem) {
          mappedServiceItem = matchedRule.services[0]; // default to first mapped service
        }

        const srv = findService(mappedServiceItem.serviceId);
        if (srv) {
          // Calculate confidence score
          let baseConfidence = 90;
          let calculatedReason = `Suggested Treatment for recorded ${finding.name}. Subject to Dentist Evaluation.`;

          if (mappedServiceItem.priority === 1) {
            calculatedReason = `Suggested Treatment: Conservative, minimally invasive restoration to preserve enamel structure. Subject to Dentist Evaluation.`;
            baseConfidence = 94;
          } else if (mappedServiceItem.priority === 2) {
            calculatedReason = `Suggested Treatment: Standard protocol returning regular physiological mastication. May Be Considered. Requires Clinical Confirmation.`;
            baseConfidence = 88;
          } else if (mappedServiceItem.priority === 3) {
            calculatedReason = `Suggested Treatment: Comprehensive therapy for advanced tissue involvement. Subject to Dentist Evaluation.`;
            baseConfidence = 75;
          }

          // Apply modifiers
          let conf = baseConfidence + completenessBonus;
          if (finding.source === 'Progress Notes') conf += 5; // supported by progress logs consistency
          if (srv.name.toLowerCase().includes('extraction') || srv.name.toLowerCase().includes('odontectomy')) {
            if (!hasXray) {
              conf -= 20;
              calculatedReason += " WARNING: Periapical radiograph not detected. Pre-operative imaging strongly recommended to evaluate root apex.";
            } else {
              conf += 5;
            }
          }

          procs.push({
            id: `proc-${finding.id}-${srv.id}`,
            serviceId: srv.id,
            serviceName: srv.name,
            unitPrice: srv.defaultAmount,
            teeth: finding.affectedTeeth.length > 0 ? finding.affectedTeeth : ['General'],
            reason: calculatedReason,
            confidenceScore: Math.min(99, Math.max(50, conf)),
            priorityRank: mappedServiceItem.priority === 1 ? 'Conservative' : mappedServiceItem.priority === 2 ? 'Standard' : 'Comprehensive',
            findingName: finding.name,
            selected: true
          });
        }
      } else {
        // --- Clinical Fallback Rules Engine ---
        if (finding.name.toLowerCase().includes('cavity') || finding.name.toLowerCase().includes('caries')) {
          const defaultFilling = findService('srv-8') || findService('srv-3');
          if (defaultFilling) {
            procs.push({
              id: `proc-fallback-${finding.id}-filling`,
              serviceId: defaultFilling.id,
              serviceName: defaultFilling.name,
              unitPrice: defaultFilling.defaultAmount,
              teeth: finding.affectedTeeth.length > 0 ? finding.affectedTeeth : ['General'],
              reason: 'Suggested Treatment: Direct composite resin filling to block localized decay. Subject to Dentist Evaluation.',
              confidenceScore: 85 + completenessBonus,
              priorityRank: 'Standard',
              findingName: finding.name,
              selected: true
            });
          }
        }
        else if (finding.name.toLowerCase().includes('root fragment') || finding.name.toLowerCase().includes('remnant')) {
          const extService = findService('srv-12') || findService('srv-11');
          if (extService) {
            procs.push({
              id: `proc-fallback-${finding.id}-extraction`,
              serviceId: extService.id,
              serviceName: extService.name,
              unitPrice: extService.defaultAmount,
              teeth: finding.affectedTeeth.length > 0 ? finding.affectedTeeth : ['General'],
              reason: 'Suggested Treatment: Surgical extraction of retained root fragments to eliminate chronic sub-clinical abscess risk. May Be Considered. Requires Clinical Confirmation.',
              confidenceScore: 92 + (hasXray ? 5 : -15),
              priorityRank: 'Standard',
              findingName: finding.name,
              selected: true
            });
          }
        }
        else if (finding.name.toLowerCase().includes('missing')) {
          const dentureService = findService('srv-32');
          if (dentureService) {
            procs.push({
              id: `proc-fallback-${finding.id}-denture`,
              serviceId: dentureService.id,
              serviceName: dentureService.name,
              unitPrice: dentureService.defaultAmount || 1500, // standard stayplate base
              teeth: finding.affectedTeeth.length > 0 ? finding.affectedTeeth : ['General'],
              reason: 'Suggested Treatment: Prosthetic rehabilitation (stayplate or removable flexible denture). May Be Considered. Subject to Dentist Evaluation.',
              confidenceScore: 80 + completenessBonus,
              priorityRank: 'Standard',
              findingName: finding.name,
              selected: true
            });
          }
        }
        else if (finding.name.toLowerCase().includes('pain') || finding.name.toLowerCase().includes('swelling')) {
          const consultSrv = findService('srv-1');
          if (consultSrv) {
            procs.push({
              id: `proc-fallback-${finding.id}-consult`,
              serviceId: consultSrv.id,
              serviceName: consultSrv.name,
              unitPrice: consultSrv.defaultAmount,
              teeth: ['General'],
              reason: 'Suggested Treatment: Focused consultation and clinical evaluation with pharmacological pain management script. Subject to Dentist Evaluation.',
              confidenceScore: 95,
              priorityRank: 'Conservative',
              findingName: finding.name,
              selected: true
            });
          }
        }
        else if (finding.name.toLowerCase().includes('calculus') || finding.name.toLowerCase().includes('bleeding')) {
          const opSrv = findService('srv-6') || findService('srv-5') || findService('srv-4');
          if (opSrv) {
            procs.push({
              id: `proc-fallback-${finding.id}-op`,
              serviceId: opSrv.id,
              serviceName: opSrv.name,
              unitPrice: opSrv.defaultAmount,
              teeth: ['General'],
              reason: 'Suggested Treatment: Full-mouth scaling (Oral Prophylaxis) to remove irritants causing inflammation. Requires Clinical Confirmation.',
              confidenceScore: 96,
              priorityRank: 'Conservative',
              findingName: finding.name,
              selected: true
            });
          }
        }
      }
    });

    // Make sure there's at least a consultation if list is empty
    if (procs.length === 0) {
      const defaultSrv = findService('srv-1');
      if (defaultSrv) {
        procs.push({
          id: `proc-baseline`,
          serviceId: defaultSrv.id,
          serviceName: defaultSrv.name,
          unitPrice: defaultSrv.defaultAmount,
          teeth: ['General'],
          reason: 'Suggested Treatment: Standard dental consultation and wellness evaluation. Subject to Dentist Evaluation.',
          confidenceScore: 99,
          priorityRank: 'Conservative',
          findingName: 'Wellness General',
          selected: true
        });
      }
    }

    // --- 3. PATIENT CARE LEVEL CLASSIFICATION ---
    // Rule:
    // Level 3: Any root fragments, any high-urgency findings, or more than 5 total findings, or multiple extractions/impacted teeth.
    // Level 2: Moderate findings (3-5 findings), or multiple cavities, or missing teeth needing rehabilitation.
    // Level 1: Minimal findings (1-2 findings), routine treatments, prophylaxis, simple shallow restorations.
    let careLevel: 'Level 1 – Normal Care' | 'Level 2 – Monitoring Required' | 'Level 3 – Immediate Clinical Attention' = 'Level 1 – Normal Care';
    let levelColor = 'border-emerald-200 bg-emerald-50 text-emerald-800';
    let levelBadge = 'bg-emerald-600';

    const highUrgencyFindings = confirmedFindings.filter(f => f.urgency === 'High');
    const cavitiesCount = confirmedFindings.find(f => f.name.includes('Cavity'))?.affectedTeeth?.length || 0;
    const rootFragmentsCount = confirmedFindings.find(f => f.name.includes('Root Fragment'))?.affectedTeeth?.length || 0;

    if (highUrgencyFindings.length > 0 || rootFragmentsCount > 0 || confirmedFindings.length > 5 || cavitiesCount >= 5) {
      careLevel = 'Level 3 – Immediate Clinical Attention';
      levelColor = 'border-red-200 bg-red-50 text-red-800';
      levelBadge = 'bg-red-600 animate-pulse';
    } else if (confirmedFindings.length >= 3 || cavitiesCount >= 2 || confirmedFindings.some(f => f.name.includes('Missing'))) {
      careLevel = 'Level 2 – Monitoring Required';
      levelColor = 'border-amber-200 bg-amber-50 text-amber-800';
      levelBadge = 'bg-amber-600';
    }

    // Clinical Summary Generator
    let clinicalSummary = `Patient ${patient.personalInfo.firstName} ${patient.personalInfo.lastName} has been evaluated. Based on the ${confirmedFindings.length} confirmed findings, the case is classified under ${careLevel}.`;
    if (cavitiesCount > 0) {
      clinicalSummary += ` Active decay exists on ${cavitiesCount} teeth requiring restoratives.`;
    }
    if (rootFragmentsCount > 0) {
      clinicalSummary += ` Sepsis risk detected due to ${rootFragmentsCount} root remnants indicating immediate extractions.`;
    }
    if (highUrgencyFindings.length > 0) {
      clinicalSummary += ` Medical history lists systemic warnings requiring pre-operative protocols.`;
    } else {
      clinicalSummary += ` Recommended procedures focus on standard conservative dental rehabilitation.`;
    }

    // Treatment Sequence
    const seq = [
      { step: 1, description: 'Diagnostic & Preventive Phase', procedures: procs.filter(p => p.serviceName.toLowerCase().includes('consult') || p.serviceName.toLowerCase().includes('radiograph') || p.serviceName.toLowerCase().includes('prophylaxis')).map(p => p.serviceName) },
      { step: 2, description: 'Surgical & Urgent Care Phase', procedures: procs.filter(p => p.serviceName.toLowerCase().includes('extraction') || p.serviceName.toLowerCase().includes('odontectomy')).map(p => p.serviceName) },
      { step: 3, description: 'Restorative & Conservative Phase', procedures: procs.filter(p => p.serviceName.toLowerCase().includes('filling') || p.serviceName.toLowerCase().includes('sealant')).map(p => p.serviceName) },
      { step: 4, description: 'Prosthodontics & Rehabilitation Phase', procedures: procs.filter(p => p.serviceName.toLowerCase().includes('denture') || p.serviceName.toLowerCase().includes('impression') || p.serviceName.toLowerCase().includes('braces')).map(p => p.serviceName) }
    ].filter(s => s.procedures.length > 0);

    // Dynamic timeline and visits
    let estimatedVisits = 1;
    let estimatedTimeline = '1 day';
    if (careLevel === 'Level 3 – Immediate Clinical Attention') {
      estimatedVisits = Math.max(3, Math.ceil(procs.length / 1.5));
      estimatedTimeline = '4 to 6 weeks';
    } else if (careLevel === 'Level 2 – Monitoring Required') {
      estimatedVisits = Math.max(2, Math.ceil(procs.length / 2));
      estimatedTimeline = '1 to 2 weeks';
    }

    const allTeethArr = Array.from(new Set(procs.flatMap(p => p.teeth).filter(t => t !== 'General'))).sort((a,b)=>Number(a)-Number(b));

    const estCost = procs.reduce((sum, p) => sum + p.unitPrice, 0);

    setTreatmentPlan({
      careLevel,
      levelColor,
      levelBadge,
      clinicalSummary,
      affectedTeeth: allTeethArr,
      procedures: procs,
      sequence: seq,
      estimatedVisits,
      estimatedTimeline,
      warnings: Array.from(warningsSet),
      estimatedCost: estCost
    });

    setEstimatedVisitsInput(estimatedVisits);
    setEstimatedTimelineInput(estimatedTimeline);

    setIsPlanGenerated(true);
    setActiveStep('PLAN');
    setIsQuotationGenerated(false);
    setIsQuotationApproved(false);
  };

  // Toggle procedures selection inside plan
  const handleToggleProcedure = (procId: string) => {
    if (!treatmentPlan) return;
    const updatedProcs = treatmentPlan.procedures.map(p => p.id === procId ? { ...p, selected: !p.selected } : p);
    const cost = updatedProcs.filter(p => p.selected).reduce((sum, p) => sum + p.unitPrice, 0);
    setTreatmentPlan({
      ...treatmentPlan,
      procedures: updatedProcs,
      estimatedCost: cost
    });
    setIsQuotationGenerated(false);
  };

  // Quotation compiler
  const handleGenerateQuotation = () => {
    if (!treatmentPlan) return;
    const selectedProcs = treatmentPlan.procedures.filter(p => p.selected);
    if (selectedProcs.length === 0) {
      showToast('Please select at least one recommended procedure to compile a quotation.', 'error');
      return;
    }

    // Group by Service to build line items
    const items: any[] = [];
    selectedProcs.forEach(p => {
      // Find if item already added
      const existing = items.find(item => item.serviceId === p.serviceId);
      if (existing) {
        existing.qty += 1;
        existing.subtotal = existing.unitPrice * existing.qty;
        existing.teeth = Array.from(new Set([...existing.teeth, ...p.teeth]));
      } else {
        items.push({
          id: `quote-item-${p.serviceId}`,
          serviceId: p.serviceId,
          name: p.serviceName,
          unitPrice: p.unitPrice,
          qty: 1,
          subtotal: p.unitPrice,
          teeth: [...p.teeth]
        });
      }
    });

    setQuotationItems(items);
    setIsQuotationGenerated(true);
    setIsQuotationApproved(false);
    showToast('Quotation compiled dynamically from selected procedures.');
  };

  // Edit Quotation item inline (modal / inputs)
  const openEditItemModal = (index: number) => {
    const item = quotationItems[index];
    setEditQuotationIndex(index);
    setEditQuotationPrice(item.unitPrice);
    setEditQuotationQty(item.qty);
  };

  const handleSaveQuotationItem = () => {
    if (editQuotationIndex === null) return;
    setQuotationItems(prev => prev.map((item, idx) => {
      if (idx === editQuotationIndex) {
        const up = Number(editQuotationPrice) || 0;
        const q = Number(editQuotationQty) || 1;
        return {
          ...item,
          unitPrice: up,
          qty: q,
          subtotal: up * q
        };
      }
      return item;
    }));
    setEditQuotationIndex(null);
    showToast('Quotation item updated.');
  };

  const handleRemoveQuotationItem = (index: number) => {
    setQuotationItems(prev => prev.filter((_, idx) => idx !== index));
    showToast('Item removed from quotation.');
  };

  const grandTotal = quotationItems.reduce((sum, item) => sum + item.subtotal, 0);

  // Locking Approval
  const handleApproveQuotation = () => {
    setIsQuotationApproved(true);
    showToast('Quotation locked and approved by treating dentist. Ready to synchronize.');
  };

  // Sync to Patient Active Records
  const handleSyncToRecords = () => {
    if (!isQuotationApproved) return;
    if (!onAddProgressNote) {
      showToast('Synchronization action handler not attached.', 'error');
      return;
    }

    const treatmentItems: TreatmentItem[] = quotationItems.map((item, idx) => ({
      id: `ti-${Date.now()}-${idx}`,
      serviceProcedure: item.name,
      teeth: item.teeth.join(', '),
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      discountAmount: 0,
      netTotal: item.subtotal
    }));

    const newNote: ProgressNote = {
      id: `note-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      visitDate: new Date().toISOString().split('T')[0],
      visitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recallDate: '',
      recallReason: 'SDSS Recommended Treatment Plan',
      items: treatmentItems,
      totalCost: grandTotal,
      totalDiscount: 0,
      netCost: grandTotal,
      remarks: `SDSS APPROVED TREATMENT PLAN (${treatmentPlan?.careLevel}). Dentist clinical notes: ${dentistNotes || 'None'}`,
      attachments: [],
      status: 'Saved'
    };

    onAddProgressNote(newNote);
    showToast('Treatment Plan synchronized to Patient Progress Notes successfully!');
  };

  return (
    <div className="space-y-6" id="sdss-dashboard">
      
      {/* 1. CLINICAL HEADER & VITALS INTEGRATION */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-zinc-900 text-white p-3 rounded-2xl shadow-md shrink-0">
            <Sliders className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-zinc-900 font-display tracking-tight uppercase flex items-center gap-2">
              Smart Decision Support System (SDSS)
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-sans uppercase font-black tracking-wider">Active Assistant</span>
            </h1>
            <p className="text-xs text-zinc-400 font-semibold mt-1 max-w-2xl leading-normal">
              Analyzing patient's clinical records (odontogram chart, medical alerts, allergies, and progress notes logs) to suggest patient-care options under full dentist override.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0 bg-zinc-50 border border-zinc-150 p-3.5 rounded-2xl">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">Patient Demographics</span>
          <div className="text-right">
            <div className="text-xs font-black text-zinc-800 uppercase">{patient.personalInfo.lastName}, {patient.personalInfo.firstName}</div>
            <div className="text-[11px] text-zinc-400 font-bold mt-0.5">
              ID: {patient.id} • Age: {patient.personalInfo.birthdate ? `${new Date().getFullYear() - new Date(patient.personalInfo.birthdate).getFullYear()} Yrs` : 'N/A'} • {patient.personalInfo.sex}
            </div>
          </div>
        </div>
      </div>

      {/* WORKFLOW STEPS TABS */}
      <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveStep('REVIEW')}
          className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeStep === 'REVIEW' 
              ? 'bg-white text-zinc-900 shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> Step 1: Clinical Findings Review
        </button>
        <button
          disabled={!isAnalysisConfirmed}
          onClick={() => {
            if (isAnalysisConfirmed) {
              if (!isPlanGenerated) handleGenerateTreatmentPlan();
              setActiveStep('PLAN');
            }
          }}
          className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            isAnalysisConfirmed 
              ? activeStep === 'PLAN'
                ? 'bg-white text-zinc-900 shadow-sm cursor-pointer' 
                : 'text-zinc-600 hover:text-zinc-800 cursor-pointer'
              : 'text-zinc-300 pointer-events-none'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" /> Step 2: Suggestive Treatment Plan
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeStep === 'REVIEW' && (
          <motion.div
            key="step-review"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* INSTRUCTION */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 text-xs font-bold leading-normal">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="uppercase tracking-wider font-extrabold text-[10px] text-amber-900 mb-1">Dentist Validation Mandatory</p>
                The SDSS has analyzed the patient file and detected the following clinical findings. Please review each finding below. 
                You can <strong className="text-amber-950">Accept</strong> or <strong className="text-amber-950">Reject</strong> each finding, 
                modify details, or append missing clinical findings before compiling the Treatment Plan.
              </div>
            </div>

            {/* MAIN FINDINGS BOARD */}
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-150 pb-4">
                <div>
                  <h2 className="text-sm font-black text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-zinc-600" />
                    Patient Clinical Findings Inventory
                  </h2>
                  <p className="text-[11px] text-zinc-400 font-medium mt-1">Accept or configure each observation to drive the configurable treatment rules.</p>
                </div>
                
                <button
                  onClick={() => setIsAddingFinding(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-3xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Add Missing Finding
                </button>
              </div>

              {/* LIST OF FINDINGS */}
              <div className="space-y-3">
                {detectedFindings.map((finding) => (
                  <div 
                    key={finding.id} 
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      finding.isAccepted 
                        ? 'bg-zinc-50 border-zinc-200' 
                        : 'bg-white border-zinc-100 opacity-45 line-through'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Checkbox button */}
                      <button
                        onClick={() => handleToggleFinding(finding.id)}
                        className={`p-1 rounded-lg shrink-0 mt-0.5 cursor-pointer border ${
                          finding.isAccepted ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-zinc-100 border-zinc-300 text-zinc-400'
                        }`}
                        title={finding.isAccepted ? "Reject Finding" : "Accept Finding"}
                      >
                        <Check className="w-4 h-4 stroke-[3px]" />
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            finding.source === 'Dental Chart' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                            finding.source === 'Progress Notes' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            'bg-teal-50 border-teal-200 text-teal-700'
                          }`}>
                            {finding.source}
                          </span>

                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm ${
                            finding.urgency === 'High' ? 'bg-red-100 text-red-800' :
                            finding.urgency === 'Medium' ? 'bg-amber-100 text-amber-800' :
                            'bg-zinc-100 text-zinc-600'
                          }`}>
                            {finding.urgency} Urgency
                          </span>

                          {finding.affectedTeeth.length > 0 && (
                            <span className="text-[10px] font-mono font-bold bg-zinc-200/80 px-2 py-0.5 rounded text-zinc-700">
                              Teeth: {finding.affectedTeeth.join(', ')}
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-black text-zinc-800 uppercase tracking-tight">{finding.name}</div>
                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">{finding.details}</p>
                      </div>
                    </div>

                    {/* Actions panel */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                      <button
                        onClick={() => setEditingFinding(finding)}
                        className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/60 rounded-xl transition-all cursor-pointer"
                        title="Modify Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveFinding(finding.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        title="Remove Finding"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ACTION: CONFIRM FINDINGS */}
              <div className="pt-4 border-t border-zinc-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-xs text-zinc-400 font-semibold">
                  Accepted findings to analyze: <strong className="text-zinc-700">{detectedFindings.filter(f=>f.isAccepted).length}</strong> / {detectedFindings.length} findings verified.
                </div>

                <div className="flex items-center gap-3">
                  {isAnalysisConfirmed && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-emerald-600 stroke-[2.5px]" /> Analysis List Confirmed
                    </span>
                  )}
                  
                  <button
                    onClick={handleConfirmAnalysis}
                    className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2"
                  >
                    Confirm Analysis
                  </button>
                </div>
              </div>
            </div>

            {/* ACTION TO GENERATE TREATMENT PLAN (ONLY IF CONFIRMED) */}
            {isAnalysisConfirmed && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900 text-white rounded-3xl p-6 shadow-xl space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 p-2 rounded-xl text-amber-400">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Configure Care Philosophy & Execute Rule Engine</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Select standard dental philosophy, which automatically maps corresponding service pricing lines.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {([
                    { val: 'Conservative', desc: 'Focuses on non-invasive tissue preservation and localized treatments.' },
                    { val: 'Standard', desc: 'Balanced procedures focused on returning regular physiological function.' },
                    { val: 'Comprehensive', desc: 'Complete rehabilitation mapping advanced restorative or prosthetic options.' }
                  ] as const).map(p => (
                    <button
                      key={p.val}
                      onClick={() => setActivePhilosophy(p.val)}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between h-28 ${
                        activePhilosophy === p.val 
                          ? 'bg-white text-zinc-900 border-white shadow-lg scale-102 ring-4 ring-white/10' 
                          : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-xs uppercase tracking-wider">{p.val} Template</div>
                        <p className={`text-[10px] leading-relaxed mt-1 font-semibold ${
                          activePhilosophy === p.val ? 'text-zinc-500' : 'text-zinc-400'
                        }`}>
                          {p.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleGenerateTreatmentPlan}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
                  >
                    Generate Suggestive Treatment Plan <ChevronRight className="w-4 h-4 stroke-[2.5px]" />
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeStep === 'PLAN' && treatmentPlan && (
          <motion.div
            key="step-plan"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* INSTRUCTION */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 text-emerald-800 text-xs font-bold leading-normal">
              <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="uppercase tracking-wider font-extrabold text-[10px] text-emerald-900 mb-1">Suggestive Plan Generated Successfully</p>
                The rule engine processed the <strong className="text-emerald-950">{detectedFindings.filter(f=>f.isAccepted).length} confirmed findings</strong> using your active <strong className="text-emerald-950">{activePhilosophy} care philosophy</strong> rules. Review the structured timeline and pricing below before building a quotation.
              </div>
            </div>

            {/* TREATMENT PLAN DISPLAY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: CARE LEVEL SUMMARY (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* CASE CATEGORIZATION */}
                <div className={`border rounded-3xl p-5 shadow-xs space-y-4 ${treatmentPlan.levelColor}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full ${treatmentPlan.levelBadge}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Case Classification Level</span>
                  </div>
                  <h3 className="text-base font-black uppercase font-display tracking-tight leading-none mt-1">
                    {treatmentPlan.careLevel}
                  </h3>
                  <p className="text-xs font-bold leading-relaxed">{treatmentPlan.clinicalSummary}</p>
                </div>

                {/* TIMELINE STATS */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-xs space-y-4">
                  <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2 pb-2.5 border-b border-zinc-100">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    Timeline & Visit Estimates
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-150">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Est. Visits</span>
                      <span className="font-mono text-base font-black text-zinc-800">{treatmentPlan.estimatedVisits} Sessions</span>
                    </div>
                    <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-150">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Timeline Span</span>
                      <span className="font-mono text-base font-black text-zinc-800">{treatmentPlan.estimatedTimeline}</span>
                    </div>
                  </div>

                  {treatmentPlan.sequence.length > 0 && (
                    <div className="space-y-3.5 pt-2">
                      <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">Suggested Sequencing order</span>
                      <div className="relative border-l-2 border-zinc-100 pl-4 ml-2.5 space-y-4">
                        {treatmentPlan.sequence.map((step, idx) => (
                          <div key={idx} className="relative text-xs">
                            <span className="absolute -left-6.5 top-0 w-3.5 h-3.5 rounded-full bg-zinc-900 border-2 border-white flex items-center justify-center text-[8px] text-white font-black">
                              {step.step}
                            </span>
                            <div className="font-black text-zinc-800 uppercase text-[10px]">{step.description}</div>
                            <div className="text-[11px] text-zinc-500 font-semibold mt-0.5">{step.procedures.join(', ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* CLINICAL SYSTEM WARNINGS */}
                {treatmentPlan.warnings.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-3xl p-5 shadow-xs space-y-3">
                    <span className="text-[10px] font-extrabold text-red-600 uppercase tracking-widest block">CRITICAL CLINICAL ADVISORIES</span>
                    <div className="space-y-2">
                      {treatmentPlan.warnings.map((warning, i) => (
                        <div key={i} className="text-xs font-bold text-red-900 leading-normal flex gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div>{warning}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: DETAILED PLAN & DENTAL MAP COMPARISON (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* DENTAL CHART RECOMMENDATION MAP (VISUAL VERIFICATION SECTION) */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                      <Sliders className="w-4.5 h-4.5 text-zinc-600" />
                      Dental Chart Recommendation Map
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Visually cross-reference each detected tooth/finding with the suggested intervention.</p>
                  </div>

                  <div className="border border-zinc-150 rounded-2xl overflow-hidden bg-white shadow-3xs max-h-[360px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-150 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          <th className="px-4 py-2.5 text-center w-20">Tooth No</th>
                          <th className="px-4 py-2.5">Recorded Finding</th>
                          <th className="px-4 py-2.5">Suggested Treatment</th>
                          <th className="px-4 py-2.5 text-right">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                        {treatmentPlan.procedures.map((p) => (
                          <tr key={p.id} className="hover:bg-zinc-50/40 transition-colors">
                            <td className="px-4 py-3 text-center">
                              <span className="font-mono bg-zinc-900 text-white px-2 py-0.5 rounded text-[11px] font-bold">
                                {p.teeth.join(', ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-900 font-black uppercase text-[11px] truncate max-w-40">
                              {p.findingName}
                            </td>
                            <td className="px-4 py-3 text-zinc-500 font-medium">
                              {p.serviceName}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-mono text-[11px] font-black ${
                                p.confidenceScore >= 85 ? 'text-emerald-600' :
                                p.confidenceScore >= 70 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {p.confidenceScore}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PROCEDURES CHECKLIST (DENTIST REVIEW SELECTION) */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="border-b border-zinc-150 pb-3">
                    <h3 className="text-sm font-black text-zinc-800 uppercase tracking-wider">Suggested Procedures Checklist</h3>
                    <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">Toggle procedures off or on. Mapped service catalog values update the total quote values.</p>
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {treatmentPlan.procedures.map((proc) => (
                      <div 
                        key={proc.id} 
                        className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                          proc.selected 
                            ? 'bg-zinc-50 border-zinc-200' 
                            : 'bg-white border-zinc-100 opacity-40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Toggle checkbox */}
                            <button
                              onClick={() => handleToggleProcedure(proc.id)}
                              className={`p-1 rounded-lg shrink-0 mt-0.5 cursor-pointer border ${
                                proc.selected ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-zinc-100 border-zinc-300 text-zinc-400'
                              }`}
                              title={proc.selected ? "Disable procedure" : "Enable procedure"}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3.5px]" />
                            </button>

                            <div className="min-w-0">
                              <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block">Tooth {proc.teeth.join(', ')} • {proc.priorityRank}</span>
                              <div className="text-xs font-black text-zinc-900 uppercase tracking-tight truncate">{proc.serviceName}</div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-xs font-black text-zinc-800">₱{proc.unitPrice.toLocaleString()}</span>
                            <span className={`block text-[10px] font-extrabold ${
                              proc.confidenceScore >= 85 ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {proc.confidenceScore}% Confidence
                            </span>
                          </div>
                        </div>

                        {proc.selected && (
                          <div className="text-[11px] text-zinc-500 font-semibold bg-white border border-zinc-150 p-2.5 rounded-xl leading-relaxed">
                            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block mb-0.5">CDSS CLINICAL REASON:</span>
                            {proc.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* ACTION BAR FOR QUOTATION GENERATION */}
                  <div className="pt-4 border-t border-zinc-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Total Plan Estimate</span>
                      <span className="font-mono text-lg font-black text-zinc-900">₱{treatmentPlan.estimatedCost.toLocaleString()}</span>
                    </div>

                    <button
                      onClick={handleGenerateQuotation}
                      className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4 stroke-[2px]" /> Generate Quotation
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* STEP 3: DENTIST REVIEW & QUOTATION */}
            {isQuotationGenerated && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-md space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-150 pb-4">
                  <div>
                    <h3 className="text-base font-black text-zinc-800 uppercase tracking-wider">Dentist Review & Quotation Builder</h3>
                    <p className="text-xs text-zinc-400 font-semibold mt-0.5">Compile invoice lists dynamically. Line items and total prices remain fully editable.</p>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-800 uppercase tracking-widest">Interactive Invoice</span>
                </div>

                {/* QUOTATION ITEMS TABLE */}
                {quotationItems.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 font-bold text-xs">All items cleared. Select procedures from the plan checklist above.</div>
                ) : (
                  <div className="border border-zinc-150 rounded-2xl overflow-hidden shadow-3xs bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-150 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          <th className="px-4 py-2.5 text-center w-12">Seq</th>
                          <th className="px-4 py-2.5 w-24 text-center">Teeth Involved</th>
                          <th className="px-4 py-2.5">Service Description</th>
                          <th className="px-4 py-2.5 text-right w-24">Unit Price</th>
                          <th className="px-4 py-2.5 text-center w-20">Quantity</th>
                          <th className="px-4 py-2.5 text-right w-28">Subtotal</th>
                          <th className="px-4 py-2.5 text-right w-28">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                        {quotationItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-zinc-50/40 transition-colors">
                            <td className="px-4 py-3 text-center font-mono text-zinc-400">{idx + 1}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800 text-[11px]">
                                {item.teeth.join(', ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-zinc-900 uppercase text-[11px]">{item.name}</td>
                            <td className="px-4 py-3 text-right font-mono text-zinc-600">₱{item.unitPrice.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center font-mono">{item.qty}</td>
                            <td className="px-4 py-3 text-right font-mono text-zinc-900 font-black">₱{item.subtotal.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditItemModal(idx)}
                                  className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg cursor-pointer"
                                  title="Edit Price/Qty"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveQuotationItem(idx)}
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                  title="Remove Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* EDIT TIMELINE DETAILS BAR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-50 p-4.5 rounded-2xl border border-zinc-150">
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Estimated Visits Required</label>
                    <input
                      type="number"
                      value={estimatedVisitsInput}
                      onChange={(e) => setEstimatedVisitsInput(Number(e.target.value))}
                      className="w-full px-3 py-1.8 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-zinc-800 focus:border-zinc-800 outline-hidden transition-all shadow-3xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Estimated Treatment Timeline Span</label>
                    <input
                      type="text"
                      value={estimatedTimelineInput}
                      onChange={(e) => setEstimatedTimelineInput(e.target.value)}
                      placeholder="e.g. 1 to 2 weeks"
                      className="w-full px-3 py-1.8 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-zinc-800 focus:border-zinc-800 outline-hidden transition-all shadow-3xs"
                    />
                  </div>
                </div>

                {/* CLINICAL DISCLAIMER */}
                <div className="bg-zinc-50 border border-zinc-150 p-4.5 rounded-2xl text-[10px] leading-relaxed text-zinc-400 italic">
                  <strong className="text-zinc-500 font-black uppercase block tracking-widest mb-1.5 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-zinc-400" />
                    Clinical Decision Support Disclaimer
                  </strong>
                  "This treatment recommendation and quotation are automatically generated based on the patient's recorded clinical findings, clinic treatment rules, and configured services. They are intended solely as clinical decision support. Final diagnosis, treatment planning, and quotation approval remain the sole responsibility of the licensed treating dentist."
                </div>

                {/* DENTIST COMMENT */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Dentist Clinical Remarks</label>
                  <textarea
                    value={dentistNotes}
                    onChange={(e) => setDentistNotes(e.target.value)}
                    placeholder="Enter customized sequencing reasons, anesthesia notes, or dental material specifications..."
                    rows={2.5}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-zinc-800 focus:border-zinc-800 focus:bg-white outline-hidden transition-all shadow-3xs"
                  />
                </div>

                {/* ACTION ROW */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-zinc-150">
                  <div className="text-right">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">GRAND TOTAL QUOTE</span>
                    <span className="font-mono text-2xl font-black text-zinc-900">₱{grandTotal.toLocaleString()}</span>
                  </div>

                  {!isQuotationApproved && (
                    <button
                      onClick={handleApproveQuotation}
                      className="px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 stroke-[3.5px] text-emerald-400" /> Approve & Lock Quotation
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 4: TREATMENT RECORD SYNCHRONIZATION */}
            {isQuotationApproved && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 shadow-sm space-y-4 animate-pulse-slow"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shadow-md shrink-0">
                    <ShieldCheck className="w-5 h-5 stroke-[2.5px]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider">Treatment Plan Approved Clinically</h3>
                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">Ready to file and synchronize directly into patient active records.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <button
                    onClick={handleSyncToRecords}
                    className="px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Synchronize to Patient's Active Records
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL FOR MODIFYING FINDING DETAILS */}
      {editingFinding && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full border border-zinc-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50">
              <span className="text-xs font-black text-zinc-800 uppercase tracking-widest">Modify Clinical Finding</span>
              <button onClick={() => setEditingFinding(null)} className="p-1 hover:bg-zinc-100 rounded-lg cursor-pointer text-zinc-400 hover:text-zinc-700">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Finding Name</label>
                <input
                  type="text"
                  value={editingFinding.name}
                  onChange={(e) => setEditingFinding({ ...editingFinding, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Urgency Status</label>
                <select
                  value={editingFinding.urgency}
                  onChange={(e) => setEditingFinding({ ...editingFinding, urgency: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold"
                >
                  <option value="Low">Low Urgency</option>
                  <option value="Medium">Medium Urgency</option>
                  <option value="High">High Urgency</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Finding Details / Explanation</label>
                <textarea
                  value={editingFinding.details}
                  onChange={(e) => setEditingFinding({ ...editingFinding, details: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-150 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setEditingFinding(null)}
                className="px-3 py-1.8 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveModifiedFinding(editingFinding)}
                className="px-4 py-1.8 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR ADDING FINDINGS */}
      {isAddingFinding && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full border border-zinc-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50">
              <span className="text-xs font-black text-zinc-800 uppercase tracking-widest">Append Custom Clinical Finding</span>
              <button onClick={() => setIsAddingFinding(false)} className="p-1 hover:bg-zinc-100 rounded-lg cursor-pointer text-zinc-400 hover:text-zinc-700">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-semibold text-zinc-700">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Finding Name</label>
                <input
                  type="text"
                  placeholder="e.g. Oral Abscess, Severe Calculus"
                  value={newFindingName}
                  onChange={(e) => setNewFindingName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-zinc-800 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Information Source</label>
                  <select
                    value={newFindingSource}
                    onChange={(e) => setNewFindingSource(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1"
                  >
                    <option value="Dental Chart">Dental Chart</option>
                    <option value="Progress Notes">Progress Notes</option>
                    <option value="Patient Information">Patient Info</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Urgency Status</label>
                  <select
                    value={newFindingUrgency}
                    onChange={(e) => setNewFindingUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Teeth Involved (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. 16, 17"
                  value={newFindingTeeth}
                  onChange={(e) => setNewFindingTeeth(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Finding Details / Explanation</label>
                <textarea
                  placeholder="Describe patient status or clinical notes..."
                  value={newFindingDetails}
                  onChange={(e) => setNewFindingDetails(e.target.value)}
                  rows={2.5}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-150 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsAddingFinding(false)}
                className="px-3 py-1.8 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManualFinding}
                className="px-4 py-1.8 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Append Finding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR EDITING QUOTATION LINE ITEM */}
      {editQuotationIndex !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-zinc-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50">
              <span className="text-xs font-black text-zinc-800 uppercase tracking-widest">Edit Quotation Item</span>
              <button onClick={() => setEditQuotationIndex(null)} className="p-1 hover:bg-zinc-100 rounded-lg cursor-pointer text-zinc-400 hover:text-zinc-700">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-semibold text-zinc-700">
              <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-150 text-[11px] font-bold">
                Item: {quotationItems[editQuotationIndex]?.name}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Unit Price (₱)</label>
                <input
                  type="number"
                  value={editQuotationPrice}
                  onChange={(e) => setEditQuotationPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Quantity</label>
                <input
                  type="number"
                  value={editQuotationQty}
                  onChange={(e) => setEditQuotationQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-150 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setEditQuotationIndex(null)}
                className="px-3 py-1.8 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuotationItem}
                className="px-4 py-1.8 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-xs font-black uppercase tracking-wider text-white animate-in fade-in slide-in-from-bottom-5 duration-200 ${
          toast.type === 'success' ? 'bg-zinc-950 border-zinc-800' : 'bg-red-600 border-red-500'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 stroke-[3px]" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-200 animate-bounce" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
