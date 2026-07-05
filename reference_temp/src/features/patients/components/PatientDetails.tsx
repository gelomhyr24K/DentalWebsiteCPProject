import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PatientRecord, ProgressNote, TreatmentItem, RecallRecord } from '../../../types';
import { clinicStorage } from '../../../lib/indexedDBStorage';
const localStorage = clinicStorage;
import { calculateAge, isUnderage } from '../../../utils/date';
import { 
  ArrowLeft, Printer, Calendar, ShieldAlert, Heart, Activity, Users, Smile, User, 
  CheckCircle2, AlertCircle, Trash2, Edit, Plus, RotateCcw, FileText, ChevronLeft, 
  ChevronRight, FileSpreadsheet, Send, ShieldCheck, DollarSign, PenTool, Upload, 
  RefreshCw, MoreVertical, MoreHorizontal, X, Sparkles, Download, Check, FileCode, CheckCircle, Info, Phone, MapPin, AlertTriangle,
  Link, Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify, Search, ChevronDown, History, Copy, Bookmark, Archive
} from 'lucide-react';
import { SmartAutocomplete, CommandPalette } from '../../../components/SmartAutocomplete';
import SmartRecommendationEngine from '../../smart-decision-support/SmartRecommendationEngine';

interface PatientDetailsProps {
  record: PatientRecord;
  onBack: () => void;
  onUpdatePatient: (updatedRecord: PatientRecord) => void;
  onEditPatient?: (record: PatientRecord) => void;
  userRole?: string;
}

export default function PatientDetails({ record, onBack, onUpdatePatient: parentOnUpdatePatient, onEditPatient, userRole }: PatientDetailsProps) {
  const onUpdatePatient = (updatedRecord: PatientRecord) => {
    if (userRole === 'Staff Member') {
      alert('Access Denied: Staff credentials permit scheduling and registration but restrict editing clinical charting, treatment records, or billing ledger.');
      return;
    }
    parentOnUpdatePatient(updatedRecord);
  };

  const age = calculateAge(record.personalInfo.birthdate);
  const minor = isUnderage(record.personalInfo.birthdate);

  // Active Tab: "PROGRESS_NOTE" | "TREATMENT_PLANS" | "CHARTS" | "PRESCRIPTIONS" | "BILLS" | "CERTIFICATES" | "UPLOADS" | "NOTES" | "RECALLS" | "APPOINTMENTS" | "FOLLOW_UP"
  const [activeTab, setActiveTab] = useState<string>('TREATMENT_PLANS');

  // Tab scroll and dropdown refs/states
  const tabsRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleScroll = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 240;
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const checkScroll = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  // Run checkScroll on mount, resize, and when activeTab changes
  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  useEffect(() => {
    // Check scroll state after tab changes or DOM updates
    const timer = setTimeout(checkScroll, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Handle outside click for More menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setIsMoreOpen(false);
    setTimeout(() => {
      const el = document.getElementById(`tab-btn-${tabId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 50);
  };

  // Tag editing state in details header
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [tempTags, setTempTags] = useState<string[]>(record.tags || []);

  useEffect(() => {
    setTempTags(record.tags || []);
  }, [record.tags]);

  // Handle tags save or cancel
  const handleSaveTags = () => {
    const updatedRecord = {
      ...record,
      tags: tempTags
    };
    onUpdatePatient(updatedRecord);
    setIsAddingTag(false);
    setNewTagInput('');
  };

  const handleCancelTags = () => {
    setTempTags(record.tags || []);
    setIsAddingTag(false);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tempTags.filter(t => t !== tagToRemove);
    setTempTags(updatedTags);
    // Auto-save tag removals immediately for user convenience
    const updatedRecord = {
      ...record,
      tags: updatedTags
    };
    onUpdatePatient(updatedRecord);
  };

  const handleAddTagBubble = () => {
    if (newTagInput.trim() && !tempTags.includes(newTagInput.trim().toLowerCase())) {
      setTempTags([...tempTags, newTagInput.trim().toLowerCase()]);
      setNewTagInput('');
    }
  };

  // Treatment plan lists & progress notes state
  const progressNotes = record.progressNotes || [];
  const [currentPage, setCurrentPage] = useState(1);
  const notesPerPage = 5;

  // Refresh Simulation
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 3000);
    }, 8000);
  };

  // Export report as JSON/Text
  const handleExportReport = () => {
    const reportData = {
      patientId: record.id,
      patientName: `${record.personalInfo.lastName}, ${record.personalInfo.firstName}`,
      exportedAt: new Date().toLocaleString(),
      progressNotes: progressNotes,
      outstandingBalance: record.balance || 0
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Dental_Report_${record.personalInfo.lastName}_${record.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Row option popovers (3 dots)
  const [activeRowOptionId, setActiveRowOptionId] = useState<string | null>(null);

  // New Progress Note Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Note Field states
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [visitTime, setVisitTime] = useState<string>('10:00 AM');
  const [recallDate, setRecallDate] = useState<string>('2026-06-26');
  const [recallTime, setRecallTime] = useState<string>('02:00 PM');
  const [recallReason, setRecallReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formItems, setFormItems] = useState<TreatmentItem[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; size: string }[]>([]);
  const [signatureData, setSignatureData] = useState<string>('');
  const [signatureType, setSignatureType] = useState<'drawn' | 'uploaded' | undefined>(undefined);

  // Popover calendar states for form
  const [isVisitCalendarOpen, setIsVisitCalendarOpen] = useState(false);
  const [isRecallCalendarOpen, setIsRecallCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 5)); // June 2026

  const visitCalendarRef = useRef<HTMLDivElement>(null);
  const recallCalendarRef = useRef<HTMLDivElement>(null);

  // Canvas drawing ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // File Upload Drag & Drop states
  const [isDragging, setIsDragging] = useState(false);

  // Patient profile quick edit states
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState(false);
  const [editLastName, setEditLastName] = useState(record.personalInfo.lastName);
  const [editFirstName, setEditFirstName] = useState(record.personalInfo.firstName);
  const [editMiddleName, setEditMiddleName] = useState(record.personalInfo.middleName);
  const [editExt, setEditExt] = useState(record.personalInfo.ext || '');
  const [editNickname, setEditNickname] = useState(record.personalInfo.nickname || '');
  const [editBirthdate, setEditBirthdate] = useState(record.personalInfo.birthdate);
  const [editSex, setEditSex] = useState(record.personalInfo.sex);
  const [editMobile, setEditMobile] = useState(record.personalInfo.mobile);
  const [editEmail, setEditEmail] = useState(record.personalInfo.email || '');
  const [editAddress, setEditAddress] = useState(record.personalInfo.address);
  const [editAlternateIds, setEditAlternateIds] = useState(record.alternatePatientIds || '');

  // Synchronize edit states when record prop changes
  useEffect(() => {
    setEditLastName(record.personalInfo.lastName);
    setEditFirstName(record.personalInfo.firstName);
    setEditMiddleName(record.personalInfo.middleName);
    setEditExt(record.personalInfo.ext || '');
    setEditNickname(record.personalInfo.nickname || '');
    setEditBirthdate(record.personalInfo.birthdate);
    setEditSex(record.personalInfo.sex);
    setEditMobile(record.personalInfo.mobile);
    setEditEmail(record.personalInfo.email || '');
    setEditAddress(record.personalInfo.address);
    setEditAlternateIds(record.alternatePatientIds || '');
  }, [record]);

  // Click outside detector for custom form calendars to automatically close them
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isVisitCalendarOpen && visitCalendarRef.current && !visitCalendarRef.current.contains(event.target as Node)) {
        const trigger = document.getElementById('visit-date-trigger');
        if (!trigger || !trigger.contains(event.target as Node)) {
          setIsVisitCalendarOpen(false);
        }
      }
      if (isRecallCalendarOpen && recallCalendarRef.current && !recallCalendarRef.current.contains(event.target as Node)) {
        const trigger = document.getElementById('recall-date-trigger');
        if (!trigger || !trigger.contains(event.target as Node)) {
          setIsRecallCalendarOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisitCalendarOpen, isRecallCalendarOpen]);

  const handleOpenEditProfile = () => {
    setEditLastName(record.personalInfo.lastName);
    setEditFirstName(record.personalInfo.firstName);
    setEditMiddleName(record.personalInfo.middleName);
    setEditExt(record.personalInfo.ext || '');
    setEditNickname(record.personalInfo.nickname || '');
    setEditBirthdate(record.personalInfo.birthdate);
    setEditSex(record.personalInfo.sex);
    setEditMobile(record.personalInfo.mobile);
    setEditEmail(record.personalInfo.email || '');
    setEditAddress(record.personalInfo.address);
    setEditAlternateIds(record.alternatePatientIds || '');
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = () => {
    const updatedRecord: PatientRecord = {
      ...record,
      personalInfo: {
        ...record.personalInfo,
        lastName: editLastName,
        firstName: editFirstName,
        middleName: editMiddleName,
        ext: editExt,
        nickname: editNickname,
        birthdate: editBirthdate,
        sex: editSex as any,
        mobile: editMobile,
        email: editEmail,
        address: editAddress,
      },
      alternatePatientIds: editAlternateIds,
    };
    onUpdatePatient(updatedRecord);
    setIsEditProfileOpen(false);
  };

  // --- PRESCRIPTIONS MODULE STATES ---
  interface MedicineItem {
    medication: string;
    dose: string;
    qty: number;
  }
  interface PrescriptionRecord {
    id: string;
    dateTime: string;
    medicines: MedicineItem[];
    remarks: string;
  }
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [rxPage, setRxPage] = useState(1);
  const rxPerPage = 5;
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [rxTemplateSearch, setRxTemplateSearch] = useState('');
  const [rxMedication, setRxMedication] = useState('');
  const [rxDose, setRxDose] = useState('');
  const [rxQty, setRxQty] = useState(1);
  const [rxRemarks, setRxRemarks] = useState('');
  const [rxMedicinesList, setRxMedicinesList] = useState<MedicineItem[]>([]);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);
  const [activePrescriptionPopoverId, setActivePrescriptionPopoverId] = useState<string | null>(null);

  // --- BILLS AND PAYMENTS MODULE STATES ---
  interface BillLineItem {
    serviceProcedure: string;
    remarksDetail: string;
    qty: number;
    baseAmount: number;
    discount: number;
    lineTotal: number;
  }
  interface BillRecord {
    id: string;
    date: string;
    status: 'PAID' | 'DUE';
    services: string;
    createdBy: string;
    netAmount: number;
    paidAmount: number;
    remarks: string;
    patientSignature?: string; // data URL
    lineItems: BillLineItem[];
    progressNoteId?: string;
  }
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [billPage, setBillPage] = useState(1);
  const billPerPage = 5;
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [billRemarks, setBillRemarks] = useState('');
  const [billDiscountInput, setBillDiscountInput] = useState<number>(0);
  const [billPaidInput, setBillPaidInput] = useState<number>(0);
  const [billLineItems, setBillLineItems] = useState<BillLineItem[]>([]);
  // Row input states for adding a line item
  const [billLineService, setBillLineService] = useState('');
  const [billLineRemarks, setBillLineRemarks] = useState('');
  const [billLineQty, setBillLineQty] = useState(1);
  const [billLineBaseAmount, setBillLineBaseAmount] = useState(0);
  const [billLineDiscount, setBillLineDiscount] = useState(0);

  // Derived billing values
  const billTotalCost = billLineItems.reduce((sum, item) => sum + (item.baseAmount * item.qty), 0);
  const billPayable = Math.max(0, billTotalCost - billDiscountInput);
  const billBalance = Math.max(0, billPayable - billPaidInput);

  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [activeBillPopoverId, setActiveBillPopoverId] = useState<string | null>(null);

  // --- PATIENT RECALLS TAB STATES ---
  interface RecallTabRecord {
    id: string;
    dateTime: string;
    recallType: string;
    interval: string;
    sessions: string;
    recallReason: string;
    remarks: string;
    descriptionNotes: string;
  }
  const [recallsTabList, setRecallsTabList] = useState<RecallTabRecord[]>([]);
  const [recallsTabPage, setRecallsTabPage] = useState(1);
  const recallsTabPerPage = 5;
  const [isNewRecallModalOpen, setIsNewRecallModalOpen] = useState(false);
  const [newRecallDate, setNewRecallDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newRecallType, setNewRecallType] = useState<string>('Orthodontic Checkup');
  const [newRecallReason, setNewRecallReason] = useState<string>('');
  const [newRecallRemarks, setNewRecallRemarks] = useState<string>('');
  const [newRecallNotes, setNewRecallNotes] = useState<string>('Insert notes here...');
  const [newRecallInterval, setNewRecallInterval] = useState<string>('4 Weeks');
  const [newRecallSessions, setNewRecallSessions] = useState<string>('1 of 12 Sessions');

  // Rich Text Editor Mock Settings for Recalls Modal
  const [rtFont, setRtFont] = useState('Inter');
  const [rtSize, setRtSize] = useState('Normal');
  const [rtAlign, setRtAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [rtBold, setRtBold] = useState(false);
  const [rtItalic, setRtItalic] = useState(false);
  const [rtUnderline, setRtUnderline] = useState(false);
  const [rtStrike, setRtStrike] = useState(false);

  // --- PATIENT APPOINTMENTS TAB STATES ---
  interface AuditLog {
    id: string;
    type: 'CREATED' | 'UPDATED' | 'RESCHEDULED';
    author: string;
    fieldsModified: string;
    timestamp: string;
    details: string;
  }
  interface AppointmentRecord {
    id: string;
    startDate: string;
    endDate: string;
    title: string;
    status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
    auditLogs: AuditLog[];
  }
  const [appointmentsList, setAppointmentsList] = useState<AppointmentRecord[]>([]);
  const [activeAppointmentForAudit, setActiveAppointmentForAudit] = useState<AppointmentRecord | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isAuditExpandedAll, setIsAuditExpandedAll] = useState(false);
  const [expandedAuditLogIds, setExpandedAuditLogIds] = useState<Record<string, boolean>>({});

  // --- FOLLOW-UP TAB STATES ---
  interface FollowUpRecord {
    id: string;
    date: string;
    reason: string;
    notes: string;
  }
  const [followUpsList, setFollowUpsList] = useState<FollowUpRecord[]>([]);
  const [followUpSearchQuery, setFollowUpSearchQuery] = useState('');
  const [followUpSortField, setFollowUpSortField] = useState<'date' | 'reason' | 'notes'>('date');
  const [followUpSortOrder, setFollowUpSortOrder] = useState<'asc' | 'desc'>('desc');
  const [followUpPage, setFollowUpPage] = useState(1);
  const [followUpPerPage, setFollowUpPerPage] = useState(5);
  const [activeFollowUpOptionId, setActiveFollowUpOptionId] = useState<string | null>(null);
  const [activeUploadPopoverId, setActiveUploadPopoverId] = useState<string | null>(null);
  const [activeScratchpadPopoverId, setActiveScratchpadPopoverId] = useState<string | null>(null);

  // --- CERTIFICATES MODULE STATES ---
  interface CertificateRecord {
    id: string;
    dateTime: string;
    content: string;
    label: string;
    remarks: string;
  }
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [certPage, setCertPage] = useState(1);
  const certPerPage = 5;
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [selectedCertTemplate, setSelectedCertTemplate] = useState('');
  const [certBody, setCertBody] = useState('');
  const [certLabel, setCertLabel] = useState('Fit to Work / Return to Duty');
  const [certRemarks, setCertRemarks] = useState('');
  const [certFont, setCertFont] = useState('Sans Serif');
  const [certAlign, setCertAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [certBold, setCertBold] = useState(false);
  const [certItalic, setCertItalic] = useState(false);
  const [certUnderline, setCertUnderline] = useState(false);
  const [certStrike, setCertStrike] = useState(false);

  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [activeCertPopoverId, setActiveCertPopoverId] = useState<string | null>(null);

  const [activeRecallPopoverId, setActiveRecallPopoverId] = useState<string | null>(null);
  const [editingRecallId, setEditingRecallId] = useState<string | null>(null);

  const [activeAppointmentPopoverId, setActiveAppointmentPopoverId] = useState<string | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [appointmentTitle, setAppointmentTitle] = useState('Orthodontics Adjustment');
  const [appointmentDate, setAppointmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [appointmentStartTime, setAppointmentStartTime] = useState('10:00 AM');
  const [appointmentEndTime, setAppointmentEndTime] = useState('11:00 AM');
  const [appointmentStatus, setAppointmentStatus] = useState<'Confirmed' | 'Pending' | 'Completed' | 'Cancelled'>('Confirmed');

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);
  const [followUpDateInput, setFollowUpDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [followUpReasonInput, setFollowUpReasonInput] = useState('');
  const [followUpNotesInput, setFollowUpNotesInput] = useState('');
  const [followUpDentistInput, setFollowUpDentistInput] = useState('Dr. Maria Jessica Tanarte');
  const [followUpPriorityInput, setFollowUpPriorityInput] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [followUpStatusInput, setFollowUpStatusInput] = useState<'Pending' | 'Completed'>('Pending');

  // --- INDEPENDENT MODULES STATE VARIABLES & TYPES ---
  // Search state variables for ALL modules
  const [treatmentPlanSearchQuery, setTreatmentPlanSearchQuery] = useState('');
  const [odontogramSearchQuery, setOdontogramSearchQuery] = useState('');
  const [prescriptionSearchQuery, setPrescriptionSearchQuery] = useState('');
  const [billSearchQuery, setBillSearchQuery] = useState('');
  const [certSearchQuery, setCertSearchQuery] = useState('');
  const [uploadSearchQuery, setUploadSearchQuery] = useState('');
  const [recallSearchQuery, setRecallSearchQuery] = useState('');
  const [appointmentSearchQuery, setAppointmentSearchQuery] = useState('');
  const [scratchpadSearchQuery, setScratchpadSearchQuery] = useState('');

  // Additional Page states
  const [odontogramPage, setOdontogramPage] = useState(1);
  const odontogramPerPage = 5;
  const [appointmentPage, setAppointmentPage] = useState(1);
  const appointmentPerPage = 5;

  // New Upload Record Type & State
  interface UploadRecord {
    id: string;
    name: string;
    type: string;
    size: string;
    date: string;
    dataUrl: string;
  }
  const [uploadsList, setUploadsList] = useState<UploadRecord[]>([]);
  const [uploadPage, setUploadPage] = useState(1);
  const uploadPerPage = 8;
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadNameInput, setUploadNameInput] = useState('');
  const [uploadTypeInput, setUploadTypeInput] = useState('image/png');
  const [uploadDataUrlInput, setUploadDataUrlInput] = useState('');
  const [editingUploadId, setEditingUploadId] = useState<string | null>(null);

  // New Scratchpad Record Type & State
  interface ScratchpadRecord {
    id: string;
    content: string;
    author: string;
    timestamp: string;
    isPinned: boolean;
    isArchived: boolean;
  }
  const [scratchpadNotesList, setScratchpadNotesList] = useState<ScratchpadRecord[]>([]);
  const [scratchpadPage, setScratchpadPage] = useState(1);
  const scratchpadPerPage = 5;
  const [isScratchpadModalOpen, setIsScratchpadModalOpen] = useState(false);
  const [scratchpadContentInput, setScratchpadContentInput] = useState('');
  const [scratchpadAuthorInput, setScratchpadAuthorInput] = useState('Dr. Maria Jessica Tanarte');
  const [scratchpadIsPinnedInput, setScratchpadIsPinnedInput] = useState(false);
  const [scratchpadIsArchivedInput, setScratchpadIsArchivedInput] = useState(false);
  const [editingScratchpadId, setEditingScratchpadId] = useState<string | null>(null);

  // --- CUSTOM ROBUST CONFIRMATION MODAL STATE ---
  interface ConfirmDialogState {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }) => {
    setConfirmDialog({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Yes, Delete',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'danger',
      onConfirm: () => {
        options.onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const filteredProgressNotes = useMemo(() => {
    if (!treatmentPlanSearchQuery.trim()) return progressNotes;
    const query = treatmentPlanSearchQuery.toLowerCase();
    return progressNotes.filter(note => 
      note.recallReason.toLowerCase().includes(query) ||
      (note.remarks && note.remarks.toLowerCase().includes(query)) ||
      note.items.some(srv => srv.serviceProcedure.toLowerCase().includes(query))
    );
  }, [progressNotes, treatmentPlanSearchQuery]);

  const totalPages = Math.ceil(filteredProgressNotes.length / notesPerPage) || 1;
  const paginatedNotes = useMemo(() => {
    const startIdx = (currentPage - 1) * notesPerPage;
    return filteredProgressNotes.slice(startIdx, startIdx + notesPerPage);
  }, [filteredProgressNotes, currentPage]);

  // --- INITIALIZE & SYNCHRONIZE LOCALSTORAGE ---
  useEffect(() => {
    if (!record.id) return;
    
    // Load Prescriptions
    const savedRx = localStorage.getItem(`dental_prescriptions_${record.id}`);
    if (savedRx) {
      setPrescriptions(JSON.parse(savedRx));
    } else {
      const defaultRx: PrescriptionRecord[] = [];
      setPrescriptions(defaultRx);
      localStorage.setItem(`dental_prescriptions_${record.id}`, JSON.stringify(defaultRx));
    }

    // Load Bills
    const savedBills = localStorage.getItem(`dental_bills_${record.id}`);
    if (savedBills) {
      setBills(JSON.parse(savedBills));
    } else {
      const defaultBills: BillRecord[] = [];
      setBills(defaultBills);
      localStorage.setItem(`dental_bills_${record.id}`, JSON.stringify(defaultBills));
    }

    // Load Certificates
    const savedCerts = localStorage.getItem(`dental_certificates_${record.id}`);
    if (savedCerts) {
      setCertificates(JSON.parse(savedCerts));
    } else {
      const defaultCerts: CertificateRecord[] = [];
      setCertificates(defaultCerts);
      localStorage.setItem(`dental_certificates_${record.id}`, JSON.stringify(defaultCerts));
    }

    // Load Recalls Tab list
    const savedRecallsTab = localStorage.getItem(`dental_recalls_tab_${record.id}`);
    if (savedRecallsTab) {
      setRecallsTabList(JSON.parse(savedRecallsTab));
    } else {
      const defaultRecallsTab: RecallTabRecord[] = [];
      setRecallsTabList(defaultRecallsTab);
      localStorage.setItem(`dental_recalls_tab_${record.id}`, JSON.stringify(defaultRecallsTab));
    }

    // Load Appointments list
    const savedAppts = localStorage.getItem(`dental_appointments_${record.id}`);
    if (savedAppts) {
      setAppointmentsList(JSON.parse(savedAppts));
    } else {
      const defaultAppts: AppointmentRecord[] = [];
      setAppointmentsList(defaultAppts);
      localStorage.setItem(`dental_appointments_${record.id}`, JSON.stringify(defaultAppts));
    }

    // Load Follow Ups list
    const savedFollowUps = localStorage.getItem(`dental_followups_${record.id}`);
    if (savedFollowUps) {
      setFollowUpsList(JSON.parse(savedFollowUps));
    } else {
      const defaultFollowUps: FollowUpRecord[] = [];
      setFollowUpsList(defaultFollowUps);
      localStorage.setItem(`dental_followups_${record.id}`, JSON.stringify(defaultFollowUps));
    }

    // Load Uploads List
    const savedUploads = localStorage.getItem(`dental_uploads_${record.id}`);
    if (savedUploads) {
      setUploadsList(JSON.parse(savedUploads));
    } else {
      const defaultUploads: UploadRecord[] = [];
      setUploadsList(defaultUploads);
      localStorage.setItem(`dental_uploads_${record.id}`, JSON.stringify(defaultUploads));
    }

    // Load Scratchpad List
    const savedScratchpad = localStorage.getItem(`dental_scratchpad_${record.id}`);
    if (savedScratchpad) {
      setScratchpadNotesList(JSON.parse(savedScratchpad));
    } else {
      const defaultScratchpad: ScratchpadRecord[] = [];
      setScratchpadNotesList(defaultScratchpad);
      localStorage.setItem(`dental_scratchpad_${record.id}`, JSON.stringify(defaultScratchpad));
    }

    // Reset pagination to page 1
    setRxPage(1);
    setBillPage(1);
    setCertPage(1);
    setRecallsTabPage(1);
    setFollowUpPage(1);
    setOdontogramPage(1);
    setAppointmentPage(1);
    setUploadPage(1);
    setScratchpadPage(1);
  }, [record.id]);

  // Reconcile Bills & Payments with Progress Notes to ensure absolute consistency
  const reconcileBillsWithProgressNotes = (currentNotes: ProgressNote[], currentBills: BillRecord[]): BillRecord[] => {
    let updatedBills = [...currentBills];
    
    // 1. Process all notes that should have bills
    currentNotes.forEach(note => {
      if (note.items && note.items.length > 0) {
        const lineItems: BillLineItem[] = note.items.map(item => ({
          serviceProcedure: item.serviceProcedure,
          remarksDetail: item.teeth === 'All' ? 'Teeth: All' : `Teeth: ${item.teeth}`,
          qty: 1,
          baseAmount: item.unitPrice,
          discount: item.discountAmount || 0,
          lineTotal: item.netTotal
        }));

        const existingBillIdx = updatedBills.findIndex(b => b.progressNoteId === note.id);
        const existingBill = existingBillIdx > -1 ? updatedBills[existingBillIdx] : null;
        const paidAmount = existingBill ? existingBill.paidAmount : 0;
        const netAmount = note.netCost;
        const statusStr: 'PAID' | 'DUE' = paidAmount >= netAmount ? 'PAID' : 'DUE';

        const updatedBill: BillRecord = {
          id: existingBill ? existingBill.id : `BILL-2026-${String(updatedBills.length + 1 + Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          date: note.visitDate || note.date,
          status: statusStr,
          services: note.items.map(item => item.serviceProcedure).join(', '),
          createdBy: "Dr. Maria Jessica Tanarte",
          netAmount: netAmount,
          paidAmount: paidAmount,
          remarks: existingBill ? existingBill.remarks : (note.remarks || ''),
          patientSignature: existingBill ? existingBill.patientSignature : note.signatureDataUrl,
          lineItems: lineItems,
          progressNoteId: note.id
        };

        if (existingBillIdx > -1) {
          updatedBills[existingBillIdx] = updatedBill;
        } else {
          updatedBills = [updatedBill, ...updatedBills];
        }
      } else {
        // If progress note has no items, remove its bill
        updatedBills = updatedBills.filter(b => b.progressNoteId !== note.id);
      }
    });

    // 2. Remove any bills that are linked to progress notes that no longer exist
    updatedBills = updatedBills.filter(b => {
      if (!b.progressNoteId) return true; // Keep manually created bills (not linked to notes)
      return currentNotes.some(n => n.id === b.progressNoteId);
    });

    return updatedBills;
  };

  // Helper to save data back to localStorage and state
  const savePrescriptionsList = (updated: PrescriptionRecord[]) => {
    setPrescriptions(updated);
    localStorage.setItem(`dental_prescriptions_${record.id}`, JSON.stringify(updated));
  };

  const saveBillsList = (updated: BillRecord[]) => {
    setBills(updated);
    localStorage.setItem(`dental_bills_${record.id}`, JSON.stringify(updated));
    const updatedBalance = updated.reduce((acc, b) => acc + (b.netAmount - b.paidAmount), 0);
    onUpdatePatient({
      ...record,
      balance: updatedBalance
    });
  };

  const saveCertificatesList = (updated: CertificateRecord[]) => {
    setCertificates(updated);
    localStorage.setItem(`dental_certificates_${record.id}`, JSON.stringify(updated));
  };

  const saveRecallsTabList = (updated: RecallTabRecord[]) => {
    setRecallsTabList(updated);
    localStorage.setItem(`dental_recalls_tab_${record.id}`, JSON.stringify(updated));
  };

  const saveAppointmentsList = (updated: AppointmentRecord[]) => {
    setAppointmentsList(updated);
    localStorage.setItem(`dental_appointments_${record.id}`, JSON.stringify(updated));
  };

  const saveFollowUpsList = (updated: FollowUpRecord[]) => {
    setFollowUpsList(updated);
    localStorage.setItem(`dental_followups_${record.id}`, JSON.stringify(updated));
  };

  const saveUploadsList = (updated: UploadRecord[]) => {
    setUploadsList(updated);
    localStorage.setItem(`dental_uploads_${record.id}`, JSON.stringify(updated));
  };

  const saveScratchpadNotesList = (updated: ScratchpadRecord[]) => {
    setScratchpadNotesList(updated);
    localStorage.setItem(`dental_scratchpad_${record.id}`, JSON.stringify(updated));
  };

  // --- GLOBAL LOOKUP & COMMAND PALETTE ENGINE STATES ---
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [commandPaletteTarget, setCommandPaletteTarget] = useState<'progressNoteRemarks' | 'rxRemarks' | 'scratchpad' | null>(null);
  const [scratchpadNote, setScratchpadNote] = useState(() => localStorage.getItem(`scratchpad_note_${record.id}`) || '');

  // Smart multiline prescription parser
  const parsePrescriptionTemplate = (prescriptionText: string) => {
    const blocks = prescriptionText.split(/\n\s*\n/);
    const items: any[] = [];
    blocks.forEach(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        const medication = lines[0];
        const dose = lines.slice(1).join(', ') || 'Take as directed';
        let qty = 10;
        const qtyMatch = dose.match(/(?:qty|quantity|total|#)\s*[:=-]?\s*(\d+)/i) || dose.match(/(\d+)\s*(?:caps|tabs|pills|capsules|tablets|days)/i);
        if (qtyMatch) {
          qty = parseInt(qtyMatch[1], 10);
        }
        items.push({ medication, dose, qty });
      }
    });
    return items;
  };

  // Global search result filter matching all master items & patient record details
  const getGlobalSearchResults = (query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: { category: string; title: string; subtitle: string; action: () => void }[] = [];

    // 1. Services lookup
    try {
      const services = JSON.parse(localStorage.getItem('DENTAL_SERVICES_MASTER') || '[]');
      services.forEach((s: any) => {
        if (s.name.toLowerCase().includes(q) || (s.remarks && s.remarks.toLowerCase().includes(q))) {
          results.push({
            category: 'Master Services',
            title: s.name,
            subtitle: `Default Price: ₱${(s.amount || s.defaultAmount || 0).toLocaleString()} — ${s.remarks || ''}`,
            action: () => {
              setActiveTab('TREATMENT_PLANS');
              setIsFormOpen(true);
              const price = s.amount || s.defaultAmount || 0;
              const newRow = {
                id: Math.random().toString(),
                serviceProcedure: s.name,
                teeth: 'All',
                unitPrice: price,
                subtotal: price,
                discountAmount: 0,
                netTotal: price
              };
              setFormItems(prev => [...prev, newRow]);
            }
          });
        }
      });
    } catch (e) {}

    // 2. Medicines lookup
    try {
      const medicines = JSON.parse(localStorage.getItem('DENTAL_MEDICINES_MASTER') || '[]');
      medicines.forEach((m: any) => {
        if (m.name.toLowerCase().includes(q) || (m.dosage && m.dosage.toLowerCase().includes(q))) {
          results.push({
            category: 'Master Medicines',
            title: m.name,
            subtitle: `Dosage: ${m.dosage || ''} — ${m.remarks || ''}`,
            action: () => {
              setActiveTab('PRESCRIPTIONS');
              setIsPrescriptionModalOpen(true);
              setRxMedication(m.name);
              setRxDose(m.dosage || '');
            }
          });
        }
      });
    } catch (e) {}

    // 3. Prescription templates lookup
    try {
      const templates = JSON.parse(localStorage.getItem('DENTAL_PRESCRIPTION_TEMPLATES_MASTER') || '[]');
      templates.forEach((t: any) => {
        if (t.name.toLowerCase().includes(q) || (t.remarks && t.remarks.toLowerCase().includes(q))) {
          results.push({
            category: 'Rx Templates',
            title: t.name,
            subtitle: t.remarks || 'Standard prescription template',
            action: () => {
              setActiveTab('PRESCRIPTIONS');
              setIsPrescriptionModalOpen(true);
              setRxTemplateSearch(t.name);
              const items = parsePrescriptionTemplate(t.prescription);
              setRxMedicinesList(prev => [...prev, ...items]);
              setRxRemarks(t.prescription);
            }
          });
        }
      });
    } catch (e) {}

    // 4. Patient progress notes & treatments
    if (record.progressNotes) {
      record.progressNotes.forEach((note: any) => {
        note.items.forEach((item: any) => {
          if (item.serviceProcedure.toLowerCase().includes(q)) {
            results.push({
              category: 'Patient Treatment History',
              title: item.serviceProcedure,
              subtitle: `Performed on: ${new Date(note.visitDate).toLocaleDateString()} — Tooth: ${item.teeth} — Net Cost: ₱${item.netTotal}`,
              action: () => {
                setActiveTab('TREATMENT_PLANS');
              }
            });
          }
        });
      });
    }

    // 5. Patient Notes / Scratchpad Matcher
    const savedScratch = localStorage.getItem(`scratchpad_note_${record.id}`);
    if (savedScratch && savedScratch.toLowerCase().includes(q)) {
      results.push({
        category: 'Scratchpad Notes',
        title: 'Matched content inside Private Scratchpad',
        subtitle: savedScratch.substring(0, 60) + '...',
        action: () => {
          setActiveTab('NOTES');
        }
      });
    }

    return results;
  };

  // Keyboard listener for "/" key trigger
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleTextareaChange = (value: string, type: 'progressNoteRemarks' | 'rxRemarks' | 'scratchpad') => {
    if (type === 'progressNoteRemarks') {
      setRemarks(value);
    } else if (type === 'rxRemarks') {
      setRxRemarks(value);
    } else if (type === 'scratchpad') {
      setScratchpadNote(value);
      localStorage.setItem(`scratchpad_note_${record.id}`, value);
    }

    if (value.endsWith('/')) {
      setCommandPaletteTarget(type);
    }
  };

  const handleSelectSnippet = (snippet: string) => {
    if (commandPaletteTarget === 'progressNoteRemarks') {
      setRemarks(prev => prev.replace(/\/$/, '') + snippet);
    } else if (commandPaletteTarget === 'rxRemarks') {
      setRxRemarks(prev => prev.replace(/\/$/, '') + snippet);
    } else if (commandPaletteTarget === 'scratchpad') {
      setScratchpadNote(prev => {
        const updated = prev.replace(/\/$/, '') + snippet;
        localStorage.setItem(`scratchpad_note_${record.id}`, updated);
        return updated;
      });
    }
    setCommandPaletteTarget(null);
  };

  // Recall & Odontogram states
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [recallIdBeingEdited, setRecallIdBeingEdited] = useState<string | null>(null);
  const [presentMedicalCondition, setPresentMedicalCondition] = useState('');
  const [presentMedications, setPresentMedications] = useState('');
  const [allergiesToMedications, setAllergiesToMedications] = useState('');
  const [recallDateInput, setRecallDateInput] = useState('06/24/2026');
  const [extraoralExamination, setExtraoralExamination] = useState('');
  const [inlineChartingMode, setInlineChartingMode] = useState<'inline' | 'multiple'>('inline');
  const [activeToothStatus, setActiveToothStatus] = useState<string>('red');
  const [toothData, setToothData] = useState<Record<string, { surfaces: Record<string, string>, options: string[] }>>({});
  const [recallSelections, setRecallSelections] = useState<Record<string, boolean>>({});

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Shadow window.alert to automatically route through our styled in-app Toast notification system
  const alert = (message: string) => {
    const lowercase = message.toLowerCase();
    const isSuccess = lowercase.includes('success') || lowercase.includes('complete') || lowercase.includes('save') || lowercase.includes('add') && !lowercase.includes('please') && !lowercase.includes('error') && !lowercase.includes('at least') && !lowercase.includes('invalid');
    const isError = lowercase.includes('please') || lowercase.includes('error') || lowercase.includes('invalid') || lowercase.includes('denied') || lowercase.includes('restrict') || lowercase.includes('at least') || lowercase.includes('write') || lowercase.includes('fill') || lowercase.includes('maximum');
    showToast(message, isError ? 'error' : isSuccess ? 'success' : 'info');
  };

  const isStatusEquivalent = (val1: string, val2: string) => {
    if (!val1 || !val2) return false;
    if (val1 === val2) return true;
    const normalize = (v: string) => {
      const lower = v.toLowerCase();
      if (lower === 'red' || lower === '#ef4444') return 'red';
      if (lower === 'blue' || lower === '#2563eb') return 'blue';
      return lower;
    };
    return normalize(val1) === normalize(val2);
  };

  // Helper getters/loaders for dynamic master items
  const getPeriodontalScreenings = () => {
    const stored = localStorage.getItem('DENTAL_PERIODONTAL_SCREENINGS_MASTER');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { console.error(e); }
    }
    return [
      { id: 'perio-1', name: 'Gingivitis' },
      { id: 'perio-2', name: 'Early Periodontitis' },
      { id: 'perio-3', name: 'Moderate Periodontitis' },
      { id: 'perio-4', name: 'Advance Periodontitis' },
      { id: 'perio-5', name: 'Presence of Calcular Deposit' },
      { id: 'perio-6', name: 'Good Oral Hygiene' }
    ];
  };

  const getRecallOcclusions = () => {
    const stored = localStorage.getItem('DENTAL_RECALL_OCCLUSIONS_MASTER');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { console.error(e); }
    }
    return [
      { id: 'occ-1', name: 'Class (Molar)' },
      { id: 'occ-2', name: 'Overjet' },
      { id: 'occ-3', name: 'Overbite' },
      { id: 'occ-4', name: 'Medline Deviation' },
      { id: 'occ-5', name: 'Crossbite' }
    ];
  };

  const getRecallAppliances = () => {
    const stored = localStorage.getItem('DENTAL_RECALL_APPLIANCES_MASTER');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { console.error(e); }
    }
    return [
      { id: 'app-1', name: 'Orthodontic' },
      { id: 'app-2', name: 'Stayplate' },
      { id: 'app-3', name: 'Other' }
    ];
  };

  const getRecallTmds = () => {
    const stored = localStorage.getItem('DENTAL_RECALL_TMDS_MASTER');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { console.error(e); }
    }
    return [
      { id: 'tmd-1', name: 'Clenching' },
      { id: 'tmd-2', name: 'Clicking' },
      { id: 'tmd-3', name: 'Trismus' },
      { id: 'tmd-4', name: 'Muscle Spasm' }
    ];
  };

  const getScreeningState = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('gingivitis')) return screeningGingivitis;
    if (n.includes('early periodontitis')) return screeningEarlyPeriodontitis;
    if (n.includes('moderate periodontitis')) return screeningModeratePeriodontitis;
    if (n.includes('advance periodontitis')) return screeningAdvancePeriodontitis;
    if (n.includes('calcular')) return screeningPresenceOfCalcular;
    if (n.includes('good oral')) return screeningGoodOralHygiene;
    return recallSelections[`screening_${name}`] || false;
  };

  const setScreeningState = (name: string, checked: boolean) => {
    const n = name.toLowerCase();
    if (n.includes('gingivitis')) setScreeningGingivitis(checked);
    else if (n.includes('early periodontitis')) setScreeningEarlyPeriodontitis(checked);
    else if (n.includes('moderate periodontitis')) setScreeningModeratePeriodontitis(checked);
    else if (n.includes('advance periodontitis')) setScreeningAdvancePeriodontitis(checked);
    else if (n.includes('calcular')) setScreeningPresenceOfCalcular(checked);
    else if (n.includes('good oral')) setScreeningGoodOralHygiene(checked);
    else {
      setRecallSelections(prev => ({ ...prev, [`screening_${name}`]: checked }));
    }
  };

  const getOcclusionState = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('class') || n.includes('molar')) return occlusionClassMolar;
    if (n.includes('overjet')) return occlusionOverjet;
    if (n.includes('overbite')) return occlusionOverbite;
    if (n.includes('medline') || n.includes('deviation')) return occlusionMedlineDeviation;
    if (n.includes('crossbite')) return occlusionCrossbite;
    return recallSelections[`occlusion_${name}`] || false;
  };

  const setOcclusionState = (name: string, checked: boolean) => {
    const n = name.toLowerCase();
    if (n.includes('class') || n.includes('molar')) setOcclusionClassMolar(checked);
    else if (n.includes('overjet')) setOcclusionOverjet(checked);
    else if (n.includes('overbite')) setOcclusionOverbite(checked);
    else if (n.includes('medline') || n.includes('deviation')) setOcclusionMedlineDeviation(checked);
    else if (n.includes('crossbite')) setOcclusionCrossbite(checked);
    else {
      setRecallSelections(prev => ({ ...prev, [`occlusion_${name}`]: checked }));
    }
  };

  const getApplianceState = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('orthodontic')) return applianceOrthodontic;
    if (n.includes('stayplate')) return applianceStayplate;
    if (n.includes('other')) return applianceOther;
    return recallSelections[`appliance_${name}`] || false;
  };

  const setApplianceState = (name: string, checked: boolean) => {
    const n = name.toLowerCase();
    if (n.includes('orthodontic')) setApplianceOrthodontic(checked);
    else if (n.includes('stayplate')) setApplianceStayplate(checked);
    else if (n.includes('other')) setApplianceOther(checked);
    else {
      setRecallSelections(prev => ({ ...prev, [`appliance_${name}`]: checked }));
    }
  };

  const getTmdState = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('clenching')) return tmdClenching;
    if (n.includes('clicking')) return tmdClicking;
    if (n.includes('trismus')) return tmdTrismus;
    if (n.includes('spasm') || n.includes('muscle')) return tmdMuscleSpasm;
    return recallSelections[`tmd_${name}`] || false;
  };

  const setTmdState = (name: string, checked: boolean) => {
    const n = name.toLowerCase();
    if (n.includes('clenching')) setTmdClenching(checked);
    else if (n.includes('clicking')) setTmdClicking(checked);
    else if (n.includes('trismus')) setTmdTrismus(checked);
    else if (n.includes('spasm') || n.includes('muscle')) setTmdMuscleSpasm(checked);
    else {
      setRecallSelections(prev => ({ ...prev, [`tmd_${name}`]: checked }));
    }
  };

  const getToothStatuses = () => {
    const stored = localStorage.getItem('DENTAL_TOOTH_STATUSES_MASTER');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 'stat-1', code: 'cv', name: 'Cavity', color: '#ef4444', remarks: '' },
      { id: 'stat-2', code: 'ok', name: 'OK / Pasta', color: '#2563eb', remarks: '' }
    ];
  };

  const getToothXrays = () => {
    const stored = localStorage.getItem('DENTAL_TOOTH_XRAYS_MASTER');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((item: any) => item.code.toUpperCase());
      } catch (e) {
        console.error(e);
      }
    }
    return ['PANO', 'CEPHA', 'OCC', 'PERI'];
  };

  const getToothSurgeries = () => {
    const stored = localStorage.getItem('DENTAL_TOOTH_SURGERIES_MASTER');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((item: any) => item.code.toUpperCase());
      } catch (e) {
        console.error(e);
      }
    }
    return ['X', 'XO'];
  };

  const getToothProsthodontics = () => {
    const stored = localStorage.getItem('DENTAL_TOOTH_PROSTHODONTICS_MASTER');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((item: any) => item.code.toUpperCase());
      } catch (e) {
        console.error(e);
      }
    }
    return ['MC', 'PJ', 'AM', 'LCF', 'PORJC', 'AB', 'ATT', 'P', 'IC', 'IMP', 'S', 'RM', 'GI', 'V', 'TF'];
  };

  const getToothConditions = () => {
    const stored = localStorage.getItem('DENTAL_TOOTH_CONDITIONS_MASTER');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((item: any) => item.code.toUpperCase());
      } catch (e) {
        console.error(e);
      }
    }
    return ['/', 'M', 'MO', 'IM', 'SP', 'RF', 'UN', 'PT', 'D', 'RCT'];
  };

  const getPrescriptionTemplates = () => {
    const stored = localStorage.getItem('DENTAL_PRESCRIPTION_TEMPLATES_MASTER');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { 
        name: 'Post-Extraction Antibiotic & Painkiller', 
        prescription: 'Amoxicillin Trihydrate 500mg\nTake 1 capsule every 8 hours for 7 days\n\nMefenamic Acid 500mg\nTake 1 capsule every 6 hours as needed for pain', 
        remarks: 'Standard post-op medication template' 
      },
      { 
        name: 'Orthodontic Soreness Management', 
        prescription: 'Paracetamol 500mg\nTake 1 tablet every 4 to 6 hours as needed for dental soreness', 
        remarks: 'Standard post-adjustment discomfort template' 
      },
      { 
        name: 'Root Canal Antibiotic Treatment', 
        prescription: 'Co-Amoxiclav 625mg\nTake 1 tablet every 12 hours for 7 days\n\nMefenamic Acid 500mg\nTake 1 capsule every 6 hours or as needed for pain', 
        remarks: 'Standard severe infection treatment prescription' 
      }
    ];
  };

  
  // Predental Screening checkbox states
  const [screeningGingivitis, setScreeningGingivitis] = useState(false);
  const [screeningEarlyPeriodontitis, setScreeningEarlyPeriodontitis] = useState(false);
  const [screeningModeratePeriodontitis, setScreeningModeratePeriodontitis] = useState(false);
  const [screeningAdvancePeriodontitis, setScreeningAdvancePeriodontitis] = useState(false);
  const [screeningPresenceOfCalcular, setScreeningPresenceOfCalcular] = useState(false);
  const [screeningGoodOralHygiene, setScreeningGoodOralHygiene] = useState(false);

  // Occlusion checkbox states
  const [occlusionClassMolar, setOcclusionClassMolar] = useState(false);
  const [occlusionOverjet, setOcclusionOverjet] = useState(false);
  const [occlusionOverbite, setOcclusionOverbite] = useState(false);
  const [occlusionMedlineDeviation, setOcclusionMedlineDeviation] = useState(false);
  const [occlusionCrossbite, setOcclusionCrossbite] = useState(false);

  // Appliance checkbox states
  const [applianceOrthodontic, setApplianceOrthodontic] = useState(false);
  const [applianceStayplate, setApplianceStayplate] = useState(false);
  const [applianceOther, setApplianceOther] = useState(false);

  // TMD checkbox states
  const [tmdClenching, setTmdClenching] = useState(false);
  const [tmdClicking, setTmdClicking] = useState(false);
  const [tmdTrismus, setTmdTrismus] = useState(false);
  const [tmdMuscleSpasm, setTmdMuscleSpasm] = useState(false);

  const [recallSummaryText, setRecallSummaryText] = useState('');
  const [selectedToothForOptions, setSelectedToothForOptions] = useState<string | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number; position: 'top' | 'bottom' } | null>(null);
  const [activeRowRecallOptionId, setActiveRowRecallOptionId] = useState<string | null>(null);

  // List of all teeth numbers
  const upperPrimaryTeeth = ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'];
  const upperPermanentTeeth = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
  const lowerPermanentTeeth = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];
  const lowerPrimaryTeeth = ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75'];

  // Initialize a blank tooth database if empty
  const getBlankToothData = () => {
    const initialData: Record<string, { surfaces: Record<string, string>, options: string[] }> = {};
    const allTeeth = [...upperPrimaryTeeth, ...upperPermanentTeeth, ...lowerPermanentTeeth, ...lowerPrimaryTeeth];
    allTeeth.forEach(num => {
      initialData[num] = {
        surfaces: { top: 'clear', left: 'clear', right: 'clear', bottom: 'clear', middle: 'clear' },
        options: []
      };
    });
    return initialData;
  };

  const handleToggleOption = (toothNum: string, option: string) => {
    const current = toothData[toothNum]?.options || [];
    if (current.includes(option)) {
      setToothData(prev => ({
        ...prev,
        [toothNum]: {
          ...prev[toothNum],
          options: current.filter(o => o !== option)
        }
      }));
    } else {
      if (current.length >= 4) {
        alert("Maximum of 4 options can be selected for a single tooth.");
        return;
      }
      setToothData(prev => ({
        ...prev,
        [toothNum]: {
          ...prev[toothNum],
          options: [...current, option]
        }
      }));
    }
  };

  const handleToggleToothPopover = (toothNum: string, boxPosition: 'top' | 'bottom', element: HTMLElement) => {
    if (selectedToothForOptions === toothNum) {
      setSelectedToothForOptions(null);
      setPopoverCoords(null);
    } else {
      const rect = element.getBoundingClientRect();
      setSelectedToothForOptions(toothNum);
      setPopoverCoords({
        top: rect.top,
        left: rect.left + rect.width / 2,
        position: boxPosition
      });
    }
  };

  const renderToothCell = (toothNum: string, boxPosition: 'top' | 'bottom') => {
    const currentTooth = toothData[toothNum] || { surfaces: {}, options: [] };
    const surfaces = {
      top: currentTooth.surfaces?.top || 'clear',
      left: currentTooth.surfaces?.left || 'clear',
      right: currentTooth.surfaces?.right || 'clear',
      bottom: currentTooth.surfaces?.bottom || 'clear',
      middle: currentTooth.surfaces?.middle || 'clear',
    };
    const options = currentTooth.options || [];
    const isSelected = selectedToothForOptions === toothNum;

    const handleSurfaceClick = (surf: 'top' | 'left' | 'right' | 'bottom' | 'middle') => {
      if (inlineChartingMode === 'inline') {
        setToothData(prev => {
          const oldTooth = prev[toothNum] || { surfaces: {}, options: [] };
          const oldSurfaces = oldTooth.surfaces || {};
          // 'gray' represents the Clear function
          const nextStatus = activeToothStatus === 'gray' 
            ? 'clear' 
            : (isStatusEquivalent(oldSurfaces[surf], activeToothStatus) ? 'clear' : activeToothStatus);
          return {
            ...prev,
            [toothNum]: {
              ...oldTooth,
              surfaces: {
                ...oldSurfaces,
                [surf]: nextStatus
              }
            }
          };
        });
      } else {
        // Trigger options selector popover
        const element = document.getElementById(`tooth-box-${toothNum}`);
        if (element) {
          handleToggleToothPopover(toothNum, boxPosition, element);
        }
      }
    };

    const optionBox = (
      <div 
        id={`tooth-box-${toothNum}`}
        onClick={(e) => {
          e.stopPropagation();
          handleToggleToothPopover(toothNum, boxPosition, e.currentTarget);
        }}
        className={`w-10 h-[22px] border rounded-[3px] bg-white hover:border-teal-500 transition-all flex flex-col justify-center items-center overflow-hidden cursor-pointer p-0.5 ${isSelected ? 'border-teal-500 ring-2 ring-teal-200 scale-105 shadow-xs' : 'border-zinc-300'}`}
      >
        {options.length > 0 ? (
          <div className="grid grid-cols-2 gap-[1px] w-full h-full">
            {options.slice(0, 4).map((opt, i) => (
              <span key={i} className="text-[6px] font-black text-teal-800 bg-teal-50/50 border border-teal-100/60 rounded-[1px] text-center leading-none flex items-center justify-center truncate">
                {opt}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );

    return (
      <div key={toothNum} className="flex flex-col items-center gap-1 w-10">
        {boxPosition === 'top' && (
          <>
            {optionBox}
            <span className="text-[9px] font-bold text-zinc-500 select-none leading-none h-3 flex items-center justify-center">{toothNum}</span>
            <ToothSvg 
              toothNum={toothNum} 
              surfaces={surfaces} 
              onSurfaceClick={handleSurfaceClick}
            />
          </>
        )}
        {boxPosition === 'bottom' && (
          <>
            <ToothSvg 
              toothNum={toothNum} 
              surfaces={surfaces} 
              onSurfaceClick={handleSurfaceClick}
            />
            <span className="text-[9px] font-bold text-zinc-500 select-none leading-none h-3 flex items-center justify-center">{toothNum}</span>
            {optionBox}
          </>
        )}
      </div>
    );
  };

  const handleOpenNewRecall = () => {
    setRecallIdBeingEdited(null);
    setPresentMedicalCondition('');
    setPresentMedications('');
    setAllergiesToMedications('');
    setRecallDateInput('06/24/2026');
    setExtraoralExamination('');
    setInlineChartingMode('inline');
    setActiveToothStatus('red');
    setToothData(getBlankToothData());
    
    // Screening Reset
    setScreeningGingivitis(false);
    setScreeningEarlyPeriodontitis(false);
    setScreeningModeratePeriodontitis(false);
    setScreeningAdvancePeriodontitis(false);
    setScreeningPresenceOfCalcular(false);
    setScreeningGoodOralHygiene(false);

    // Occlusion Reset
    setOcclusionClassMolar(false);
    setOcclusionOverjet(false);
    setOcclusionOverbite(false);
    setOcclusionMedlineDeviation(false);
    setOcclusionCrossbite(false);

    // Appliance Reset
    setApplianceOrthodontic(false);
    setApplianceStayplate(false);
    setApplianceOther(false);

    // TMD Reset
    setTmdClenching(false);
    setTmdClicking(false);
    setTmdTrismus(false);
    setTmdMuscleSpasm(false);

    setRecallSummaryText('');
    setSelectedToothForOptions(null);
    setIsRecallModalOpen(true);
  };

  const handleEditRecall = (recall: RecallRecord) => {
    setRecallIdBeingEdited(recall.id);
    setPresentMedicalCondition(recall.presentMedicalCondition || '');
    setPresentMedications(recall.presentMedications || '');
    setAllergiesToMedications(recall.allergiesToMedications || '');
    setRecallDateInput(recall.recallDate || '06/24/2026');
    setExtraoralExamination(recall.extraoralExamination || '');
    setInlineChartingMode(recall.inlineChartingMode || 'inline');
    setActiveToothStatus(recall.activeToothStatus || 'red');
    
    // Ensure all teeth have valid structures
    const mergedToothData = { ...getBlankToothData() };
    if (recall.toothData) {
      Object.keys(recall.toothData).forEach(num => {
        if (recall.toothData[num]) {
          mergedToothData[num] = {
            surfaces: { ...mergedToothData[num].surfaces, ...recall.toothData[num].surfaces },
            options: [...(recall.toothData[num].options || [])]
          };
        }
      });
    }
    setToothData(mergedToothData);

    // Screening Checks
    const ps = recall.predentalScreening || {};
    setScreeningGingivitis(!!ps.gingivitis);
    setScreeningEarlyPeriodontitis(!!ps.earlyPeriodontitis);
    setScreeningModeratePeriodontitis(!!ps.moderatePeriodontitis);
    setScreeningAdvancePeriodontitis(!!ps.advancePeriodontitis);
    setScreeningPresenceOfCalcular(!!ps.presenceOfCalcularDeposit);
    setScreeningGoodOralHygiene(!!ps.goodOralHygiene);

    // Occlusion Checks
    const occ = recall.occlusion || {};
    setOcclusionClassMolar(!!occ.classMolar);
    setOcclusionOverjet(!!occ.overjet);
    setOcclusionOverbite(!!occ.overbite);
    setOcclusionMedlineDeviation(!!occ.medlineDeviation);
    setOcclusionCrossbite(!!occ.crossbite);

    // Appliance Checks
    const app = recall.appliance || {};
    setApplianceOrthodontic(!!app.orthodontic);
    setApplianceStayplate(!!app.stayplate);
    setApplianceOther(!!app.other);

    // TMD Checks
    const tmd = recall.tmd || {};
    setTmdClenching(!!tmd.clenching);
    setTmdClicking(!!tmd.clicking);
    setTmdTrismus(!!tmd.trismus);
    setTmdMuscleSpasm(!!tmd.muscleSpasm);

    setRecallSummaryText(recall.recallSummary || '');
    setSelectedToothForOptions(null);
    setIsRecallModalOpen(true);
    setActiveRowRecallOptionId(null);
  };

  const handleSaveRecall = () => {
    const newRecall: RecallRecord = {
      id: recallIdBeingEdited || `recall-${Date.now()}`,
      recallDate: recallDateInput,
      presentMedicalCondition,
      presentMedications,
      allergiesToMedications,
      extraoralExamination,
      inlineChartingMode,
      activeToothStatus,
      toothData,
      predentalScreening: {
        gingivitis: screeningGingivitis,
        earlyPeriodontitis: screeningEarlyPeriodontitis,
        moderatePeriodontitis: screeningModeratePeriodontitis,
        advancePeriodontitis: screeningAdvancePeriodontitis,
        presenceOfCalcularDeposit: screeningPresenceOfCalcular,
        goodOralHygiene: screeningGoodOralHygiene,
      },
      occlusion: {
        classMolar: occlusionClassMolar,
        overjet: occlusionOverjet,
        overbite: occlusionOverbite,
        medlineDeviation: occlusionMedlineDeviation,
        crossbite: occlusionCrossbite,
      },
      appliance: {
        orthodontic: applianceOrthodontic,
        stayplate: applianceStayplate,
        other: applianceOther,
      },
      tmd: {
        clenching: tmdClenching,
        clicking: tmdClicking,
        trismus: tmdTrismus,
        muscleSpasm: tmdMuscleSpasm,
      },
      recallSummary: recallSummaryText,
    };

    let updatedRecalls = [...(record.recalls || [])];
    if (recallIdBeingEdited) {
      updatedRecalls = updatedRecalls.map(r => r.id === recallIdBeingEdited ? newRecall : r);
    } else {
      updatedRecalls.unshift(newRecall);
    }

    const updatedRecord: PatientRecord = {
      ...record,
      recalls: updatedRecalls
    };
    onUpdatePatient(updatedRecord);
    setIsRecallModalOpen(false);
  };

  const handleDeleteRecall = (id: string) => {
    showConfirm({
      title: "Delete Recall Record",
      message: "Are you sure you want to delete this recall record? This will permanently remove the associated odontogram chart history.",
      confirmText: "Delete Recall",
      cancelText: "Keep Recall",
      variant: "danger",
      onConfirm: () => {
        const updatedRecalls = (record.recalls || []).filter(r => r.id !== id);
        const updatedRecord: PatientRecord = {
          ...record,
          recalls: updatedRecalls
        };
        onUpdatePatient(updatedRecord);
        setActiveRowRecallOptionId(null);
      }
    });
  };

  const handleDuplicateRecall = (recall: RecallRecord) => {
    const duplicated: RecallRecord = {
      ...recall,
      id: `recall-${Date.now()}`,
      recallDate: new Date().toLocaleDateString('en-US'),
      recallSummary: `${recall.recallSummary || ''} (Copy)`
    };
    const updatedRecalls = [duplicated, ...(record.recalls || [])];
    const updatedRecord: PatientRecord = {
      ...record,
      recalls: updatedRecalls
    };
    onUpdatePatient(updatedRecord);
    alert("Odontogram chart duplicated successfully!");
  };

  const handlePrintRecall = (recall: RecallRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // Quick summarize of conditions checked
    const screenings: string[] = [];
    if (recall.predentalScreening?.gingivitis) screenings.push("Gingivitis");
    if (recall.predentalScreening?.earlyPeriodontitis) screenings.push("Early Periodontitis");
    if (recall.predentalScreening?.moderatePeriodontitis) screenings.push("Moderate Periodontitis");
    if (recall.predentalScreening?.advancePeriodontitis) screenings.push("Advance Periodontitis");
    if (recall.predentalScreening?.presenceOfCalcularDeposit) screenings.push("Presence of Calcular Deposit");
    if (recall.predentalScreening?.goodOralHygiene) screenings.push("Good Oral Hygiene");

    const occlusions: string[] = [];
    if (recall.occlusion?.classMolar) occlusions.push("Class Molar");
    if (recall.occlusion?.overjet) occlusions.push("Overjet");
    if (recall.occlusion?.overbite) occlusions.push("Overbite");
    if (recall.occlusion?.medlineDeviation) occlusions.push("Medline Deviation");
    if (recall.occlusion?.crossbite) occlusions.push("Crossbite");

    const appliances: string[] = [];
    if (recall.appliance?.orthodontic) appliances.push("Orthodontic");
    if (recall.appliance?.stayplate) appliances.push("Stayplate");
    if (recall.appliance?.other) appliances.push("Other");

    const tmds: string[] = [];
    if (recall.tmd?.clenching) tmds.push("Clenching");
    if (recall.tmd?.clicking) tmds.push("Clicking");
    if (recall.tmd?.trismus) tmds.push("Trismus");
    if (recall.tmd?.muscleSpasm) tmds.push("Muscle Spasm");

    printWindow.document.write(`
      <html>
        <head>
          <title>Patient Recall / Odontogram Record - ${record.personalInfo.lastName}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 30px; color: #18181b; line-height: 1.5; font-size: 12px; }
            h1 { font-size: 18px; border-b: 1px solid #e4e4e7; padding-bottom: 8px; margin-bottom: 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            .section { border: 1px solid #e4e4e7; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; }
            .section-title { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #71717a; margin-bottom: 10px; border-bottom: 1px solid #f4f4f5; padding-bottom: 4px; }
            .field { margin-bottom: 8px; }
            .label { font-weight: bold; color: #71717a; display: block; font-size: 10px; text-transform: uppercase; }
            .val { font-size: 12px; font-weight: 600; color: #18181b; }
            .chip-container { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
            .chip { background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Patient Recall & Clinical Examination Record</h1>
          <div class="grid">
            <div>
              <div class="label">Patient Name</div>
              <div class="val">${record.personalInfo.lastName}, ${record.personalInfo.firstName} ${record.personalInfo.middleName}</div>
            </div>
            <div>
              <div class="label">Recall Date</div>
              <div class="val">${recall.recallDate}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Presenting Clinical History</div>
            <div class="grid">
              <div class="field">
                <span class="label">Medical Condition</span>
                <span class="val">${recall.presentMedicalCondition || 'None declared'}</span>
              </div>
              <div class="field">
                <span class="label">Medications</span>
                <span class="val">${recall.presentMedications || 'None declared'}</span>
              </div>
              <div class="field">
                <span class="label">Medication Allergies</span>
                <span class="val">${recall.allergiesToMedications || 'None declared'}</span>
              </div>
              <div class="field">
                <span class="label">Extraoral Examination</span>
                <span class="val">${recall.extraoralExamination || 'None declared'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Clinical Screening & Diagnostics</div>
            <div class="field">
              <span class="label">Predental Screening Checks</span>
              <div class="chip-container">
                ${screenings.length > 0 ? screenings.map(s => `<span class="chip">${s}</span>`).join('') : '<span class="val">None Checked</span>'}
              </div>
            </div>
            <div class="field" style="margin-top: 10px;">
              <span class="label">Occlusion Checks</span>
              <div class="chip-container">
                ${occlusions.length > 0 ? occlusions.map(o => `<span class="chip">${o}</span>`).join('') : '<span class="val">None Checked</span>'}
              </div>
            </div>
            <div class="field" style="margin-top: 10px;">
              <span class="label">Appliances</span>
              <div class="chip-container">
                ${appliances.length > 0 ? appliances.map(a => `<span class="chip">${a}</span>`).join('') : '<span class="val">None Checked</span>'}
              </div>
            </div>
            <div class="field" style="margin-top: 10px;">
              <span class="label">TMD Indications</span>
              <div class="chip-container">
                ${tmds.length > 0 ? tmds.map(t => `<span class="chip">${t}</span>`).join('') : '<span class="val">None Checked</span>'}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Recall Summary & Clinical Impression</div>
            <div class="val" style="white-space: pre-wrap;">${recall.recallSummary || 'No clinical summary written.'}</div>
          </div>

          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setActiveRowRecallOptionId(null);
  };

  // Open the new progress note / treatment plan modal/form
  const handleOpenNewNoteForm = () => {
    setEditingNoteId(null);
    const today = new Date().toISOString().split('T')[0];
    setVisitDate(today);
    setVisitTime('10:00 AM');
    setRecallDate('2026-06-26');
    setRecallTime('02:00 PM');
    setCalendarMonth(new Date(2026, 5));
    setRecallReason('');
    setRemarks('');
    setFormItems([]);
    setUploadedFiles([]);
    setSignatureData('');
    setSignatureType(undefined);
    setIsFormOpen(true);
  };

  const handleEditNoteForm = (note: ProgressNote) => {
    setEditingNoteId(note.id);
    setVisitDate(note.visitDate);
    setVisitTime(note.visitTime || '10:00 AM');
    setRecallDate(note.recallDate);
    setRecallTime(note.recallTime || '02:00 PM');
    if (note.visitDate) {
      const d = new Date(note.visitDate);
      if (!isNaN(d.getTime())) {
        setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
    setRecallReason(note.recallReason);
    setRemarks(note.remarks);
    setFormItems(note.items);
    setUploadedFiles(note.attachments as any);
    setSignatureData(note.signatureDataUrl || '');
    setSignatureType(note.signatureType);
    setIsFormOpen(true);
    setActiveRowOptionId(null);
  };

  const handleDeleteNote = (id: string) => {
    showConfirm({
      title: "Delete Clinical Progress Note",
      message: "Are you sure you want to delete this clinical progress note? This will also remove any billing statements linked to this note.",
      confirmText: "Delete Note",
      cancelText: "Keep Note",
      variant: "danger",
      onConfirm: () => {
        const updatedNotes = progressNotes.filter(n => n.id !== id);
        const updatedBills = bills.filter(b => b.progressNoteId !== id);
        const updatedBalance = updatedBills.reduce((acc, b) => acc + (b.netAmount - b.paidAmount), 0);
        
        setBills(updatedBills);
        localStorage.setItem(`dental_bills_${record.id}`, JSON.stringify(updatedBills));

        onUpdatePatient({
          ...record,
          balance: updatedBalance,
          progressNotes: updatedNotes
        });
        setActiveRowOptionId(null);
      }
    });
  };

  const handleDuplicateNote = (note: ProgressNote) => {
    const duplicated: ProgressNote = {
      ...note,
      id: `note-${Date.now()}`,
      visitDate: new Date().toISOString().split('T')[0],
      visitTime: note.visitTime || '10:00 AM',
      recallTime: note.recallTime || '02:00 PM',
      recallReason: `${note.recallReason} (Copy)`
    };
    const updatedNotes = [duplicated, ...progressNotes];
    onUpdatePatient({
      ...record,
      progressNotes: updatedNotes
    });
    alert("Progress note duplicated successfully!");
  };

  // Signature Pad logic
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
    saveCanvasData();
  };

  const saveCanvasData = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setSignatureData(dataUrl);
      setSignatureType('drawn');
    }
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setSignatureData('');
    setSignatureType(undefined);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSignatureData(reader.result);
          setSignatureType('uploaded');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add Row to treatments
  const handleAddServiceRow = () => {
    const newId = (formItems.length + 1).toString();
    setFormItems([
      ...formItems,
      { id: newId, serviceProcedure: '', teeth: '', unitPrice: 0, subtotal: 0, discountAmount: 0, netTotal: 0 }
    ]);
  };

  const handleRemoveServiceRow = (id: string) => {
    setFormItems(formItems.filter(item => item.id !== id));
  };

  const handleUpdateServiceField = (id: string, field: keyof TreatmentItem, value: any) => {
    setFormItems(formItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'unitPrice') {
          const price = parseFloat(value) || 0;
          updated.subtotal = price;
          updated.netTotal = price - (updated.discountAmount || 0);
        } else if (field === 'discountAmount') {
          const discount = parseFloat(value) || 0;
          updated.netTotal = (updated.subtotal || 0) - discount;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSelectServiceForFormItem = (itemId: string, selectedService: any) => {
    const price = parseFloat(selectedService.amount || selectedService.defaultAmount || selectedService.defaultPrice) || 0;
    setFormItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          serviceProcedure: selectedService.name,
          unitPrice: price,
          subtotal: price,
          discountAmount: 0,
          netTotal: price
        };
      }
      return item;
    }));
  };

  // Calculations
  const accumulation = useMemo(() => {
    let totalCost = 0;
    let discountAmount = 0;
    let netCost = 0;

    formItems.forEach(item => {
      totalCost += item.subtotal;
      discountAmount += item.discountAmount;
      netCost += item.netTotal;
    });

    return { totalCost, discountAmount, netCost };
  }, [formItems]);

  // File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newList = [...uploadedFiles];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        newList.push({
          name: file.name,
          url: URL.createObjectURL(file),
          size: (file.size / 1024).toFixed(1) + ' KB'
        });
      }
      setUploadedFiles(newList);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files) {
      const newList = [...uploadedFiles];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        newList.push({
          name: file.name,
          url: URL.createObjectURL(file),
          size: (file.size / 1024).toFixed(1) + ' KB'
        });
      }
      setUploadedFiles(newList);
    }
  };

  const handleRemoveUploadedFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  // Save/Draft Note trigger
  const handleSaveProgressNote = (status: 'Draft' | 'Saved') => {
    const newNote: ProgressNote = {
      id: editingNoteId || `NOTE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      visitDate: visitDate,
      visitTime: visitTime,
      recallDate: recallDate,
      recallTime: recallTime,
      recallReason: recallReason,
      items: formItems,
      totalCost: accumulation.totalCost,
      totalDiscount: accumulation.discountAmount,
      netCost: accumulation.netCost,
      remarks: remarks,
      attachments: uploadedFiles,
      signatureDataUrl: signatureData,
      signatureType: signatureType,
      status: status
    };

    let updatedNotes = [...progressNotes];
    if (editingNoteId) {
      updatedNotes = updatedNotes.map(n => n.id === editingNoteId ? newNote : n);
    } else {
      updatedNotes = [newNote, ...updatedNotes];
    }

    // Synchronize Bills and Payments immediately
    let updatedBills = [...bills];
    if (newNote.items && newNote.items.length > 0) {
      const existingBillIdx = updatedBills.findIndex(b => b.progressNoteId === newNote.id);
      
      const lineItems: BillLineItem[] = newNote.items.map(item => ({
        serviceProcedure: item.serviceProcedure,
        remarksDetail: item.teeth === 'All' ? 'Teeth: All' : `Teeth: ${item.teeth}`,
        qty: 1,
        baseAmount: item.unitPrice,
        discount: item.discountAmount,
        lineTotal: item.netTotal
      }));
      
      const netAmount = newNote.netCost;
      const existingBill = existingBillIdx > -1 ? updatedBills[existingBillIdx] : null;
      const paidAmount = existingBill ? existingBill.paidAmount : 0;
      const statusStr: 'PAID' | 'DUE' = paidAmount >= netAmount ? 'PAID' : 'DUE';
      
      const updatedBill: BillRecord = {
        id: existingBill ? existingBill.id : `BILL-2026-${String(updatedBills.length + 1 + Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        date: newNote.visitDate || newNote.date,
        status: statusStr,
        services: newNote.items.map(item => item.serviceProcedure).join(', '),
        createdBy: "Dr. Maria Jessica Tanarte",
        netAmount: netAmount,
        paidAmount: paidAmount,
        remarks: existingBill ? existingBill.remarks : (newNote.remarks || ''),
        patientSignature: existingBill ? existingBill.patientSignature : newNote.signatureDataUrl,
        lineItems: lineItems,
        progressNoteId: newNote.id
      };
      
      if (existingBillIdx > -1) {
        updatedBills[existingBillIdx] = updatedBill;
      } else {
        updatedBills = [updatedBill, ...updatedBills];
      }
    } else {
      // If the edited note has 0 items, make sure we remove any existing bill for it
      updatedBills = updatedBills.filter(b => b.progressNoteId !== newNote.id);
    }

    // Calculate outstanding balance based on remaining due on all bills
    const updatedBalance = updatedBills.reduce((acc, b) => acc + (b.netAmount - b.paidAmount), 0);
    
    // Save bills list to local state & localStorage
    setBills(updatedBills);
    localStorage.setItem(`dental_bills_${record.id}`, JSON.stringify(updatedBills));

    onUpdatePatient({
      ...record,
      balance: updatedBalance,
      progressNotes: updatedNotes
    });

    setIsFormOpen(false);
    setEditingNoteId(null);
  };

  // Custom calendar days helper with leading and trailing filler days
  const getCalendarDaysWithFiller = (month: Date) => {
    const yr = month.getFullYear();
    const mn = month.getMonth();
    
    const firstDayIndex = new Date(yr, mn, 1).getDay(); // Sunday-start index (0-6)
    const totalDaysCurrent = new Date(yr, mn + 1, 0).getDate();
    const totalDaysPrev = new Date(yr, mn, 0).getDate();
    
    const cells: { day: number; isFiller: boolean; monthOffset: -1 | 0 | 1; dateStr: string }[] = [];
    
    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = totalDaysPrev - i;
      const prevMonthDate = new Date(yr, mn - 1, d);
      const yStr = prevMonthDate.getFullYear();
      const mStr = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      cells.push({
        day: d,
        isFiller: true,
        monthOffset: -1,
        dateStr: `${yStr}-${mStr}-${dStr}`
      });
    }
    
    // Current month days
    for (let d = 1; d <= totalDaysCurrent; d++) {
      const yStr = yr;
      const mStr = String(mn + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      cells.push({
        day: d,
        isFiller: false,
        monthOffset: 0,
        dateStr: `${yStr}-${mStr}-${dStr}`
      });
    }
    
    // Next month filler days
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonthDate = new Date(yr, mn + 1, d);
      const yStr = nextMonthDate.getFullYear();
      const mStr = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      cells.push({
        day: d,
        isFiller: true,
        monthOffset: 1,
        dateStr: `${yStr}-${mStr}-${dStr}`
      });
    }
    
    return cells;
  };

  const handleSelectFormDate = (day: number, target: 'visit' | 'recall', monthOffset: -1 | 0 | 1 = 0) => {
    let year = calendarMonth.getFullYear();
    let month = calendarMonth.getMonth();
    
    if (monthOffset !== 0) {
      const offsetDate = new Date(year, month + monthOffset, 1);
      year = offsetDate.getFullYear();
      month = offsetDate.getMonth();
      setCalendarMonth(offsetDate);
    }
    
    const yearStr = year;
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
    
    if (target === 'visit') {
      setVisitDate(dateStr);
      setIsVisitCalendarOpen(false);
    } else {
      setRecallDate(dateStr);
      setIsRecallCalendarOpen(false);
    }
  };

  const parseTimeStr = (timeStr: string) => {
    const parts = (timeStr || '10:00 AM').split(' ');
    const ampm = parts[1] || 'AM';
    const timeParts = (parts[0] || '10:00').split(':');
    const hour = timeParts[0] || '10';
    const minute = timeParts[1] || '00';
    return { hour, minute, ampm };
  };

  const handlePrintNote = (note: ProgressNote) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Clinical Progress Note - ${record.personalInfo.lastName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1f2937; }
            h1 { font-size: 24px; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; }
            .meta { display: grid; grid-cols: 2; margin-bottom: 30px; gap: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
            th { background-color: #f3f4f6; }
            .totals { text-align: right; margin-top: 20px; font-weight: bold; }
            .sig { margin-top: 50px; text-align: right; }
          </style>
        </head>
        <body>
          <h1>P&J Tanarte Dental Clinic - Clinical Progress Note</h1>
          <div class="meta">
            <p><strong>Patient ID:</strong> ${record.id}</p>
            <p><strong>Patient Name:</strong> ${record.personalInfo.lastName}, ${record.personalInfo.firstName}</p>
            <p><strong>Visit Date:</strong> ${note.visitDate}</p>
            <p><strong>Recall Date:</strong> ${note.recallDate}</p>
            <p><strong>Recall Reason:</strong> ${note.recallReason}</p>
          </div>
          <h3>Treatments & Services Rendered</h3>
          <table>
            <thead>
              <tr>
                <th>Service/Procedure</th>
                <th>Teeth</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th>Net Price</th>
              </tr>
            </thead>
            <tbody>
              ${note.items.map(i => `
                <tr>
                  <td>${i.serviceProcedure}</td>
                  <td>${i.teeth}</td>
                  <td>₱${i.unitPrice.toLocaleString()}</td>
                  <td>₱${i.discountAmount.toLocaleString()}</td>
                  <td>₱${i.netTotal.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <p>Total Cost: ₱${note.totalCost.toLocaleString()}</p>
            <p>Total Discount: ₱${note.totalDiscount.toLocaleString()}</p>
            <p>Net Cost: ₱${note.netCost.toLocaleString()}</p>
          </div>
          <p><strong>Clinical Remarks:</strong> ${note.remarks || 'None'}</p>
          ${note.signatureDataUrl ? `<div class="sig"><img src="${note.signatureDataUrl}" style="max-height: 80px;" /><p>Patient/Guardian Signature</p></div>` : ''}
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintPrescription = (rx: PrescriptionRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Prescription RX - ${record.personalInfo.lastName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #009688; padding-bottom: 20px; }
            .title { color: #009688; font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { font-size: 14px; color: #666; }
            .info { margin-top: 20px; display: grid; grid-template-cols: 1fr 1fr; gap: 10px; font-size: 14px; }
            .rx-symbol { font-size: 48px; font-weight: bold; color: #009688; margin: 20px 0; }
            .item { margin-bottom: 15px; font-size: 16px; font-weight: bold; }
            .dose { font-weight: normal; font-size: 14px; color: #555; margin-left: 20px; }
            .remarks { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 14px; }
            .footer { margin-top: 100px; text-align: right; font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">SMILE DENTAL CLINIC</div>
            <div class="subtitle">123 Health Ave, Medical District | Tel: (02) 8123-4567</div>
          </div>
          <div class="info">
            <div><strong>Patient Name:</strong> ${record.personalInfo.lastName}, ${record.personalInfo.firstName}</div>
            <div style="text-align: right;"><strong>Date:</strong> ${rx.dateTime}</div>
            <div><strong>Age / Sex:</strong> ${age} / ${record.personalInfo.sex}</div>
            <div style="text-align: right;"><strong>Rx ID:</strong> ${rx.id}</div>
          </div>
          <div class="rx-symbol">℞</div>
          <div>
            ${rx.medicines.map((m, i) => `
              <div class="item">
                ${i + 1}. ${m.medication} &nbsp; (Qty: ${m.qty})
                <div class="dose">Dosage: ${m.dose}</div>
              </div>
            `).join('')}
          </div>
          <div class="remarks">
            <strong>REMARKS:</strong><br/>
            ${rx.remarks || "No special remarks."}
          </div>
          <div class="footer">
            <br/><br/>
            ___________________________<br/>
            Dr. Maria Jessica Tanarte, DDM<br/>
            Lic No. 123456
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintCertificate = (c: CertificateRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Dental Certificate - ${record.personalInfo.lastName}</title>
          <style>
            body { font-family: 'Georgia', serif; padding: 50px; line-height: 1.6; color: #222; }
            .border-wrap { border: 4px double #00acc1; padding: 40px; }
            .clinic-title { text-align: center; font-size: 24px; font-weight: bold; color: #00acc1; font-family: sans-serif; }
            .clinic-sub { text-align: center; font-size: 12px; color: #666; margin-bottom: 40px; font-family: sans-serif; }
            .title { text-align: center; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px; font-weight: bold; }
            .date { text-align: right; font-size: 14px; margin-bottom: 20px; }
            .content { font-size: 16px; margin-bottom: 40px; text-align: justify; }
            .remarks { font-style: italic; color: #555; margin-top: 20px; font-size: 14px; border-top: 1px solid #eee; padding-top: 15px; }
            .footer-sig { margin-top: 80px; display: flex; justify-content: space-between; font-size: 14px; font-family: sans-serif; }
          </style>
        </head>
        <body>
          <div class="border-wrap">
            <div class="clinic-title">SMILE DENTAL CLINIC</div>
            <div class="clinic-sub">123 Health Ave, Medical District | Tel: (02) 8123-4567</div>
            <div class="title">DENTAL CERTIFICATE</div>
            <div class="date">Date: ${c.dateTime.split(',')[0]}</div>
            <div class="content">${c.content}</div>
            <div class="remarks"><strong>Remarks:</strong> ${c.remarks || "None"}</div>
            <div class="footer-sig">
              <div>
                <strong>Label / Purpose:</strong> ${c.label}
              </div>
              <div style="text-align: center;">
                ___________________________<br/>
                <strong>Dr. Maria Jessica Tanarte, DDM</strong><br/>
                Attending Dentist
              </div>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintBill = (b: BillRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Dental Invoice - ${b.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            .clinic-name { font-size: 20px; font-weight: bold; color: #00acc1; }
            .bill-details { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #eee; padding: 12px; text-align: left; font-size: 13px; }
            th { background-color: #f9f9f9; font-weight: bold; }
            .total-section { text-align: right; margin-top: 30px; font-size: 14px; font-weight: bold; line-height: 1.8; }
            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="clinic-name">SMILE DENTAL CLINIC</div>
            <div>123 Health Ave, Medical District | Tel: (02) 8123-4567</div>
          </div>
          <h2 style="font-size: 18px; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Invoice / Billing Ledger</h2>
          <div class="bill-details">
            <div>
              <strong>PATIENT BILL TO:</strong><br/>
              Name: ${record.personalInfo.lastName}, ${record.personalInfo.firstName}<br/>
              Patient ID: ${record.id}<br/>
              Age/Sex: ${age} / ${record.personalInfo.sex}
            </div>
            <div style="text-align: right;">
              <strong>INVOICE DETAILS:</strong><br/>
              Invoice No: ${b.id}<br/>
              Invoice Date: ${new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}<br/>
              Created By: ${b.createdBy}<br/>
              Status: <span style="font-weight: bold; color: ${b.status === 'PAID' ? '#10b981' : '#f43f5e'};">${b.status}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Service / Procedure</th>
                <th>Remarks/Details</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Base Price</th>
                <th style="text-align: right;">Line Discount</th>
                <th style="text-align: right;">Total Price</th>
              </tr>
            </thead>
            <tbody>
              ${b.lineItems.map(item => `
                <tr>
                  <td>${item.serviceProcedure}</td>
                  <td style="color: #666; font-style: italic;">${item.remarksDetail || '-'}</td>
                  <td style="text-align: center;">${item.qty}</td>
                  <td style="text-align: right;">₱${item.baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style="text-align: right;">₱${item.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style="text-align: right; font-weight: bold;">₱${item.lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-section">
            <div>Total Invoiced Cost: ₱${b.lineItems.reduce((sum, i) => sum + (i.baseAmount * i.qty), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div>Overall Discount applied: ₱${(b.lineItems.reduce((sum, i) => sum + (i.baseAmount * i.qty), 0) - b.netAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div style="font-size: 16px; color: #00acc1; margin-top: 5px;">Net Payable: ₱${b.netAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div style="font-size: 16px; color: #10b981;">Payments Received: ₱${b.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div style="border-top: 1px solid #ccc; display: inline-block; padding-top: 5px; margin-top: 5px;">
              Remaining Balance Due: ₱${Math.max(0, b.netAmount - b.paidAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div class="footer">
            Thank you for trusting Smile Dental Clinic with your dental healthcare requirements.<br/>
            This document serves as an official billing ledger and payment history statement.
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Mock structures for interactive display of other tabs
  const tabContent = {
    CHARTS: (() => {
      const recalls = record.recalls || [];
      const filteredRecalls = recalls.filter(r => {
        const q = odontogramSearchQuery.toLowerCase();
        return (
          r.recallDate.toLowerCase().includes(q) ||
          (r.extraoralExamination && r.extraoralExamination.toLowerCase().includes(q)) ||
          (r.recallSummary && r.recallSummary.toLowerCase().includes(q))
        );
      });
      const itemsPerPage = 5;
      const totalRecallsPages = Math.ceil(filteredRecalls.length / itemsPerPage) || 1;
      const paginatedRecalls = filteredRecalls.slice((odontogramPage - 1) * itemsPerPage, odontogramPage * itemsPerPage);

      return (
        <div className="space-y-6">
          {/* Charting history, update list, new recall / consult Card */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-100 pb-3 gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 font-display">Charting History, Update List, New Recall / Consult</h3>
                <p className="text-xs text-zinc-400">Track patients' clinical status updates, extraoral findings, and dental screening history.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={odontogramSearchQuery}
                    onChange={(e) => {
                      setOdontogramSearchQuery(e.target.value);
                      setOdontogramPage(1);
                    }}
                    placeholder="Search Odontogram..."
                    className="pl-8.5 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-xs w-48"
                  />
                </div>
                <button 
                  type="button"
                  onClick={handleOpenNewRecall}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> New Recall / Consult
                </button>
              </div>
            </div>

            <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white min-h-[320px] flex flex-col justify-between">
              <div className="overflow-x-auto flex-1 pb-12">
              <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-zinc-400 tracking-wider">
                <tr>
                  <th className="p-3 w-[120px]">Recall Date</th>
                  <th className="p-3">Extra Oral Examination</th>
                  <th className="p-3">Recall Summary</th>
                  <th className="p-3 text-center w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 font-medium text-zinc-700">
                {paginatedRecalls.length > 0 ? (
                  paginatedRecalls.map((recall) => (
                    <tr key={recall.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="p-3 font-bold text-zinc-900">{recall.recallDate}</td>
                      <td className="p-3 truncate max-w-[200px]">{recall.extraoralExamination || <span className="text-zinc-400 italic">None</span>}</td>
                      <td className="p-3 truncate max-w-[300px]">{recall.recallSummary || <span className="text-zinc-400 italic">No summary recorded</span>}</td>
                      <td className="p-3 text-center relative overflow-visible">
                        <button
                          type="button"
                          onClick={() => setActiveRowRecallOptionId(activeRowRecallOptionId === recall.id ? null : recall.id)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {activeRowRecallOptionId === recall.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setActiveRowRecallOptionId(null)} />
                            <div className="absolute right-3 mt-1 w-36 bg-white rounded-xl border border-zinc-200 shadow-lg py-1.5 z-40 text-xs animate-in fade-in slide-in-from-top-1 duration-100 text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRowRecallOptionId(null);
                                  handleEditRecall(recall);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 font-semibold text-zinc-700 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-zinc-400" /> Edit Recall
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRowRecallOptionId(null);
                                  handleDuplicateRecall(recall);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 font-semibold text-teal-650 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-teal-500" /> Duplicate
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRowRecallOptionId(null);
                                  handlePrintRecall(recall);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 font-semibold text-zinc-700 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5 text-zinc-400" /> Print Record
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRowRecallOptionId(null);
                                  handleDeleteRecall(recall.id);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-zinc-50 font-semibold text-red-600 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" /> Delete / Archive
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Smile className="w-8 h-8 text-zinc-300" />
                        <span className="font-semibold text-xs">No Odontograms Match Query</span>
                        <p className="text-[11px] text-zinc-400 max-w-[320px]">Adjust your search query or create a new recall/consult.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {filteredRecalls.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-semibold py-4 px-6 bg-zinc-50 border-t border-zinc-200 rounded-b-2xl gap-4">
              <span className="text-zinc-500">
                Showing <strong className="text-zinc-800">{Math.min(filteredRecalls.length, (odontogramPage - 1) * itemsPerPage + 1)}-{Math.min(filteredRecalls.length, odontogramPage * itemsPerPage)}</strong> of <strong className="text-zinc-800">{filteredRecalls.length}</strong> odontogram records
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setOdontogramPage(p => Math.max(1, p - 1))}
                  disabled={odontogramPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                >
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalRecallsPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setOdontogramPage(pageNum)}
                      className={`w-7 h-7 rounded-lg border font-extrabold text-xs transition-all flex items-center justify-center cursor-pointer ${
                        odontogramPage === pageNum
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setOdontogramPage(p => Math.min(totalRecallsPages, p + 1))}
                  disabled={odontogramPage === totalRecallsPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
})(),
    PRESCRIPTIONS: (() => {
      const rxList = prescriptions || [];
      const filteredRx = rxList.filter(rx => {
        const q = prescriptionSearchQuery.toLowerCase();
        return (
          rx.dateTime.toLowerCase().includes(q) ||
          (rx.remarks && rx.remarks.toLowerCase().includes(q)) ||
          rx.medicines.some(m => m.medication.toLowerCase().includes(q))
        );
      });
      const totalRxPages = Math.ceil(filteredRx.length / rxPerPage) || 1;
      const paginatedRx = filteredRx.slice((rxPage - 1) * rxPerPage, rxPage * rxPerPage);

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4.5 rounded-2xl border border-zinc-200/80 shadow-3xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-zinc-100 text-zinc-800 rounded-lg">
                <Heart className="w-4 h-4 text-teal-600" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Prescriptions History</h2>
                <p className="text-[11px] text-zinc-400 font-medium">Track and print prescriptions given to this patient.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={prescriptionSearchQuery}
                  onChange={(e) => {
                    setPrescriptionSearchQuery(e.target.value);
                    setRxPage(1);
                  }}
                  placeholder="Search Prescriptions..."
                  className="pl-8.5 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-xs w-48 font-medium"
                />
              </div>
              <button
                onClick={() => {
                  const current = prescriptions;
                  setPrescriptions([]);
                  setTimeout(() => setPrescriptions(current), 300);
                }}
                className="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-500" /> Update List
              </button>
              <button
                onClick={() => {
                  setEditingPrescriptionId(null);
                  setRxMedicinesList([]);
                  setRxMedication('');
                  setRxDose('');
                  setRxQty(1);
                  setRxRemarks('');
                  setRxTemplateSearch('');
                  setIsPrescriptionModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-[#00acc1] hover:bg-[#0097a7] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors uppercase animate-pulse-subtle"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5px]" /> New Prescription
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-visible min-h-[360px] flex flex-col justify-between">
            <div className="overflow-x-auto pb-28 flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200">
                    <th className="py-4.5 px-6">DateTime</th>
                    <th className="py-4.5 px-6">Medicines Summary</th>
                    <th className="py-4.5 px-6">Remarks</th>
                    <th className="py-4.5 px-6 w-32 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700 font-medium">
                  {paginatedRx.length > 0 ? (
                    paginatedRx.map((rx) => (
                      <tr key={rx.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-5 px-6 font-bold text-zinc-500 whitespace-nowrap">
                          {rx.dateTime}
                        </td>
                        <td className="py-5 px-6">
                          <div className="space-y-1">
                            {rx.medicines.map((m, idx) => (
                              <div key={idx} className="font-extrabold text-zinc-900 uppercase">
                                {m.medication} <span className="text-teal-600 font-black text-[10px] lowercase bg-teal-50 px-1.5 py-0.2 rounded ml-1">{m.dose} (Qty: {m.qty})</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-5 px-6 text-zinc-500 max-w-sm truncate font-medium">
                          {rx.remarks || <span className="text-zinc-300 italic">No remarks</span>}
                        </td>
                        <td className="py-5 px-6 text-center relative overflow-visible">
                          <button
                            type="button"
                            onClick={() => setActivePrescriptionPopoverId(activePrescriptionPopoverId === rx.id ? null : rx.id)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer inline-flex items-center"
                            id={`rx-action-trigger-${rx.id}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {activePrescriptionPopoverId === rx.id && (
                            <>
                              {/* Click-away backdrop */}
                              <div 
                                className="fixed inset-0 z-30 bg-transparent" 
                                onClick={() => setActivePrescriptionPopoverId(null)}
                              />
                              <div className="absolute right-6 top-10 w-44 bg-white rounded-xl border border-zinc-200 shadow-lg py-1.5 z-40 text-xs text-left animate-in fade-in slide-in-from-top-1 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePrescriptionPopoverId(null);
                                    setEditingPrescriptionId(rx.id);
                                    setRxMedicinesList(rx.medicines);
                                    setRxRemarks(rx.remarks);
                                    setRxMedication('');
                                    setRxDose('');
                                    setRxQty(1);
                                    setIsPrescriptionModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-orange-500 font-bold transition-colors cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5 text-orange-500" />
                                  Edit Prescription
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePrescriptionPopoverId(null);
                                    const duplicated = {
                                      ...rx,
                                      id: `rx-${Date.now()}`,
                                      dateTime: new Date().toLocaleString(),
                                    };
                                    savePrescriptionsList([duplicated, ...prescriptions]);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-teal-650 font-bold transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-teal-500" />
                                  Duplicate Prescription
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePrescriptionPopoverId(null);
                                    handlePrintPrescription(rx);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-cyan-600 font-bold transition-colors cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5 text-cyan-600" />
                                  Print Record
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePrescriptionPopoverId(null);
                                    showConfirm({
                                      title: "Delete Prescription",
                                      message: "Are you sure you want to delete this prescription? This action is permanent and cannot be undone.",
                                      confirmText: "Delete Prescription",
                                      cancelText: "Keep Prescription",
                                      variant: "danger",
                                      onConfirm: () => {
                                        const updated = prescriptions.filter(p => p.id !== rx.id);
                                        savePrescriptionsList(updated);
                                      }
                                    });
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-red-500 font-bold transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  Delete / Archive
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-zinc-400 italic">
                        <div className="max-w-sm mx-auto space-y-1.5">
                          <Heart className="w-8 h-8 text-zinc-300 mx-auto" />
                          <p className="text-xs font-bold">No prescriptions have been created.</p>
                          <p className="text-[11px] font-medium text-zinc-400 leading-normal">
                            Adjust your search query or click "+ New Prescription" to write medications for this patient.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredRx.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-semibold py-4 px-6 bg-zinc-50 border-t border-zinc-200 rounded-b-2xl gap-4">
                <span className="text-zinc-500">
                  Showing <strong className="text-zinc-800">{Math.min(filteredRx.length, (rxPage - 1) * rxPerPage + 1)}-{Math.min(filteredRx.length, rxPage * rxPerPage)}</strong> of <strong className="text-zinc-800">{filteredRx.length}</strong> prescription records
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRxPage(p => Math.max(1, p - 1))}
                    disabled={rxPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                  >
                    Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalRxPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setRxPage(pageNum)}
                        className={`w-7 h-7 rounded-lg border font-extrabold text-xs transition-all flex items-center justify-center cursor-pointer ${
                          rxPage === pageNum
                            ? 'border-teal-600 bg-teal-600 text-white'
                            : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRxPage(p => Math.min(totalRxPages, p + 1))}
                    disabled={rxPage === totalRxPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    })(),
    BILLS: (() => {
      const billsList = bills || [];
      const filteredBills = billsList.filter(b => {
        const q = billSearchQuery.toLowerCase();
        return (
          b.date.toLowerCase().includes(q) ||
          b.status.toLowerCase().includes(q) ||
          b.services.toLowerCase().includes(q) ||
          b.createdBy.toLowerCase().includes(q) ||
          (b.remarks && b.remarks.toLowerCase().includes(q))
        );
      });
      const totalBillPages = Math.ceil(filteredBills.length / billPerPage) || 1;
      const paginatedBills = filteredBills.slice((billPage - 1) * billPerPage, billPage * billPerPage);

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4.5 rounded-2xl border border-zinc-200/80 shadow-3xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-zinc-100 text-zinc-800 rounded-lg">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Patient Bills and Payments</h2>
                <p className="text-[11px] text-zinc-400 font-medium">Manage and generate patient invoices and check-out ledger records.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={billSearchQuery}
                  onChange={(e) => {
                    setBillSearchQuery(e.target.value);
                    setBillPage(1);
                  }}
                  placeholder="Search Bills..."
                  className="pl-8.5 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-xs w-48 font-medium"
                />
              </div>
              <button
                onClick={() => {
                  const current = bills;
                  setBills([]);
                  setTimeout(() => setBills(current), 300);
                }}
                className="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-500" /> Update List
              </button>
              <button
                onClick={() => {
                  setEditingBillId(null);
                  setBillDate(new Date().toISOString().split('T')[0]);
                  setBillRemarks('');
                  setBillDiscountInput(0);
                  setBillPaidInput(0);
                  setBillLineItems([]);
                  setBillLineService('');
                  setBillLineRemarks('');
                  setBillLineQty(1);
                  setBillLineBaseAmount(0);
                  setBillLineDiscount(0);
                  setIsBillModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-[#00acc1] hover:bg-[#0097a7] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors uppercase animate-pulse-subtle"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5px]" /> New Patient Bill
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-3xs">
              <span className="text-[10px] font-bold text-zinc-400 block uppercase">Total Invoiced Net</span>
              <div className="text-lg font-extrabold text-zinc-900 mt-1">
                ₱{filteredBills.reduce((acc, b) => acc + b.netAmount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-3xs">
              <span className="text-[10px] font-bold text-zinc-400 block uppercase">Total Payments Received</span>
              <div className="text-lg font-extrabold text-emerald-600 mt-1">
                ₱{filteredBills.reduce((acc, b) => acc + b.paidAmount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-4 bg-zinc-900 text-white border border-zinc-900 rounded-2xl shadow-3xs">
              <span className="text-[10px] font-bold text-zinc-350 block uppercase">Outstanding Ledger Due</span>
              <div className="text-lg font-extrabold text-teal-400 mt-1">
                ₱{Math.max(0, filteredBills.reduce((acc, b) => acc + b.netAmount - b.paidAmount, 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-visible min-h-[550px] flex flex-col justify-between">
            <div className="overflow-x-auto pb-28 flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200">
                    <th className="py-5 px-6 w-12">
                      <input type="checkbox" className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500" defaultChecked />
                    </th>
                    <th className="py-5 px-3 w-16 text-center">Action</th>
                    <th className="py-5 px-4 w-36">Date</th>
                    <th className="py-5 px-6">Services</th>
                    <th className="py-5 px-6">Created by</th>
                    <th className="py-5 px-6 text-right">Net Amount</th>
                    <th className="py-5 px-6 text-right">Paid Amount</th>
                    <th className="py-5 px-6">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700 font-medium">
                  {paginatedBills.length > 0 ? (
                    paginatedBills.map((b) => (
                      <tr key={b.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-6.5 px-6">
                          <input type="checkbox" className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500" />
                        </td>
                        <td className="py-6.5 px-3 text-center relative overflow-visible">
                          <button
                            type="button"
                            onClick={() => setActiveBillPopoverId(activeBillPopoverId === b.id ? null : b.id)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer inline-flex items-center"
                            id={`bill-action-trigger-${b.id}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {activeBillPopoverId === b.id && (
                            <>
                              {/* Click-away backdrop */}
                              <div 
                                className="fixed inset-0 z-30 bg-transparent" 
                                onClick={() => setActiveBillPopoverId(null)}
                              />
                              <div className="absolute left-6 top-10 w-44 bg-white rounded-xl border border-zinc-200 shadow-lg py-1.5 z-40 text-xs text-left animate-in fade-in slide-in-from-top-1 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveBillPopoverId(null);
                                    setEditingBillId(b.id);
                                    setBillDate(b.date);
                                    setBillRemarks(b.remarks);
                                    const baseAmountTotal = b.lineItems.reduce((sum, item) => sum + (item.baseAmount * item.qty), 0);
                                    setBillDiscountInput(baseAmountTotal - b.netAmount);
                                    setBillPaidInput(b.paidAmount);
                                    setBillLineItems(b.lineItems);
                                    setIsBillModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-orange-500 font-bold transition-colors cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5 text-orange-500" />
                                  Edit Bill
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveBillPopoverId(null);
                                    const duplicated = {
                                      ...b,
                                      id: `bill-${Date.now()}`,
                                      date: new Date().toISOString().split('T')[0],
                                    };
                                    saveBillsList([duplicated, ...bills]);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-teal-650 font-bold transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-teal-500" />
                                  Duplicate Bill
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveBillPopoverId(null);
                                    handlePrintBill(b);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-cyan-600 font-bold transition-colors cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5 text-cyan-600" />
                                  Print Record
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveBillPopoverId(null);
                                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(b, null, 2));
                                    const dl = document.createElement('a');
                                    dl.setAttribute("href", dataStr);
                                    dl.setAttribute("download", `Invoice-${b.id}.json`);
                                    document.body.appendChild(dl);
                                    dl.click();
                                    dl.remove();
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-cyan-600 font-bold transition-colors cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5 text-cyan-600" />
                                  Export JSON
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveBillPopoverId(null);
                                    const link = `${window.location.origin}/invoice/${b.id}`;
                                    navigator.clipboard.writeText(link);
                                    alert(`Shareable invoice link copied to clipboard:\n${link}`);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-cyan-600 font-bold transition-colors cursor-pointer"
                                >
                                  <Link className="w-3.5 h-3.5 text-cyan-600" />
                                  Shareable Link
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveBillPopoverId(null);
                                    showConfirm({
                                      title: "Delete Bill & Invoice",
                                      message: "Are you sure you want to delete this bill? It will also update the patient's outstanding balance accordingly.",
                                      confirmText: "Delete Bill",
                                      cancelText: "Keep Bill",
                                      variant: "danger",
                                      onConfirm: () => {
                                        const updated = bills.filter(x => x.id !== b.id);
                                        saveBillsList(updated);
                                      }
                                    });
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-red-500 font-bold transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  Delete / Archive
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                        <td className="py-6.5 px-4 whitespace-nowrap">
                          <div className="font-extrabold text-zinc-900">
                            {new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <span className={`inline-block mt-1 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                            b.status === 'PAID' 
                              ? 'bg-emerald-50 text-emerald-600' 
                              : 'bg-rose-50 text-rose-600'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-6.5 px-6 font-extrabold text-zinc-900 uppercase">
                          {b.services}
                        </td>
                        <td className="py-6.5 px-6 text-zinc-500 whitespace-nowrap">
                          {b.createdBy}
                        </td>
                        <td className="py-6.5 px-6 text-right font-black text-zinc-900">
                          ₱{b.netAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-6.5 px-6 text-right font-black text-emerald-600">
                          ₱{b.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-6.5 px-6 text-zinc-500 max-w-xs truncate font-semibold">
                          {b.remarks || <span className="text-zinc-300 italic">No notes</span>}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-400 italic">
                        <div className="max-w-sm mx-auto space-y-1.5">
                          <DollarSign className="w-8 h-8 text-zinc-300 mx-auto" />
                          <p className="text-xs font-bold">No billing records available.</p>
                          <p className="text-[11px] font-medium text-zinc-400 leading-normal">
                            Adjust your search query or click "+ New Patient Bill" to register billing plans.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Numerical pagination */}
            {filteredBills.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-semibold py-4 px-6 bg-zinc-50 border-t border-zinc-200 rounded-b-2xl gap-4">
                <span className="text-zinc-500">
                  Showing <strong className="text-zinc-800">{Math.min(filteredBills.length, (billPage - 1) * billPerPage + 1)}-{Math.min(filteredBills.length, billPage * billPerPage)}</strong> of <strong className="text-zinc-800">{filteredBills.length}</strong> billing ledgers
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBillPage(p => Math.max(1, p - 1))}
                    disabled={billPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                  >
                    Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalBillPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setBillPage(pageNum)}
                        className={`w-7 h-7 rounded-lg border font-extrabold text-xs transition-all flex items-center justify-center cursor-pointer ${
                          billPage === pageNum
                            ? 'border-teal-600 bg-teal-600 text-white'
                            : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBillPage(p => Math.min(totalBillPages, p + 1))}
                    disabled={billPage === totalBillPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    })(),
    CERTIFICATES: (() => {
      const certList = certificates || [];
      const filteredCerts = certList.filter(c => {
        const q = certSearchQuery.toLowerCase();
        return (
          c.dateTime.toLowerCase().includes(q) ||
          c.content.toLowerCase().includes(q) ||
          c.label.toLowerCase().includes(q) ||
          (c.remarks && c.remarks.toLowerCase().includes(q))
        );
      });
      const totalCertPages = Math.ceil(filteredCerts.length / certPerPage) || 1;
      const paginatedCerts = filteredCerts.slice((certPage - 1) * certPerPage, certPage * certPerPage);

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4.5 rounded-2xl border border-zinc-200/80 shadow-3xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-zinc-100 text-zinc-800 rounded-lg">
                <FileText className="w-4 h-4 text-cyan-600" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Patient Certificates</h2>
                <p className="text-[11px] text-zinc-400 font-medium">Create and print Fit-to-Work forms or clinical excuses.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={certSearchQuery}
                  onChange={(e) => {
                    setCertSearchQuery(e.target.value);
                    setCertPage(1);
                  }}
                  placeholder="Search Certificates..."
                  className="pl-8.5 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-xs w-48 font-medium"
                />
              </div>
              <button
                onClick={() => {
                  const current = certificates;
                  setCertificates([]);
                  setTimeout(() => setCertificates(current), 300);
                }}
                className="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-500" /> Update List
              </button>
              <button
                onClick={() => {
                  setEditingCertId(null);
                  setSelectedCertTemplate('');
                  setCertBody('');
                  setCertLabel('Fit to Work / Return to Duty');
                  setCertRemarks('');
                  setCertBold(false);
                  setCertItalic(false);
                  setCertUnderline(false);
                  setCertStrike(false);
                  setCertAlign('left');
                  setCertFont('Sans Serif');
                  setIsCertificateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-[#00acc1] hover:bg-[#0097a7] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors uppercase animate-pulse-subtle"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5px]" /> New Certificate
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-visible min-h-[650px] flex flex-col justify-between">
            <div className="overflow-x-auto overflow-visible flex-1 pb-44">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200">
                    <th className="py-4 px-6 w-48">Date/Time</th>
                    <th className="py-4 px-6">Content</th>
                    <th className="py-4 px-6">Label</th>
                    <th className="py-4 px-6">Remarks</th>
                    <th className="py-4 px-6 w-32 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700 font-medium">
                  {paginatedCerts.length > 0 ? (
                    paginatedCerts.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-5 px-6 font-bold text-zinc-500 whitespace-nowrap">
                          {c.dateTime}
                        </td>
                        <td className="py-5 px-6 font-semibold text-zinc-900 max-w-sm truncate">
                          {c.content}
                        </td>
                        <td className="py-5 px-6">
                          <span className="bg-cyan-50 text-cyan-700 border border-cyan-100 font-bold px-2.5 py-0.5 rounded-md text-[10px] uppercase">
                            {c.label}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-zinc-400 font-medium">
                          {c.remarks || <span className="italic">No remarks</span>}
                        </td>
                        <td className="py-5 px-6 text-center relative overflow-visible">
                          <button
                            type="button"
                            onClick={() => setActiveCertPopoverId(activeCertPopoverId === c.id ? null : c.id)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer inline-flex items-center"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeCertPopoverId === c.id && (
                            <>
                              {/* Click-away backdrop */}
                              <div 
                                className="fixed inset-0 z-30 bg-transparent" 
                                onClick={() => setActiveCertPopoverId(null)}
                              />
                              <div className="absolute right-6 top-10 w-44 bg-white rounded-xl border border-zinc-200 shadow-xl py-1.5 z-40 text-xs text-left animate-in fade-in slide-in-from-top-1 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCertPopoverId(null);
                                    setEditingCertId(c.id);
                                    setCertBody(c.content);
                                    setCertLabel(c.label);
                                    setCertRemarks(c.remarks);
                                    setIsCertificateModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-orange-500 font-bold transition-colors cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Edit Certificate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCertPopoverId(null);
                                    const duplicated = {
                                      ...c,
                                      id: `cert-${Date.now()}`,
                                      dateTime: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                                    };
                                    saveCertificatesList([duplicated, ...certificates]);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-teal-600 font-bold transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCertPopoverId(null);
                                    handlePrintCertificate(c);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-cyan-600 font-bold transition-colors cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  Print Record
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCertPopoverId(null);
                                    showConfirm({
                                      title: "Delete Medical Certificate",
                                      message: "Are you sure you want to delete this certificate? Any printable history of this document will be lost.",
                                      confirmText: "Delete Certificate",
                                      cancelText: "Keep Certificate",
                                      variant: "danger",
                                      onConfirm: () => {
                                        const updated = certificates.filter(item => item.id !== c.id);
                                        saveCertificatesList(updated);
                                      }
                                    });
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-red-600 font-bold transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete Certificate
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-400 italic">
                        <div className="max-w-sm mx-auto space-y-1.5">
                          <FileText className="w-8 h-8 text-zinc-300 mx-auto" />
                          <p className="text-xs font-bold">No certificates issued.</p>
                          <p className="text-[11px] font-medium text-zinc-400 leading-normal">
                            Adjust your search query or click "+ New Certificate" to create fit-to-work letters.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredCerts.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-semibold py-4 px-6 bg-zinc-50 border-t border-zinc-200 rounded-b-2xl gap-4">
                <span className="text-zinc-500">
                  Showing <strong className="text-zinc-800">{Math.min(filteredCerts.length, (certPage - 1) * certPerPage + 1)}-{Math.min(filteredCerts.length, certPage * certPerPage)}</strong> of <strong className="text-zinc-800">{filteredCerts.length}</strong> certificates
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCertPage(p => Math.max(1, p - 1))}
                    disabled={certPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                  >
                    Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalCertPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCertPage(pageNum)}
                        className={`w-7 h-7 rounded-lg border font-extrabold text-xs transition-all flex items-center justify-center cursor-pointer ${
                          certPage === pageNum
                            ? 'border-teal-600 bg-teal-600 text-white'
                            : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCertPage(p => Math.min(totalCertPages, p + 1))}
                    disabled={certPage === totalCertPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    })(),
    UPLOADS: (() => {
      const filteredUploads = uploadsList.filter(u => {
        const q = uploadSearchQuery.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.type.toLowerCase().includes(q);
      });
      const totalUploadPages = Math.ceil(filteredUploads.length / uploadPerPage) || 1;
      const paginatedUploads = filteredUploads.slice((uploadPage - 1) * uploadPerPage, uploadPage * uploadPerPage);

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4.5 rounded-2xl border border-zinc-200/80 shadow-3xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-zinc-100 text-zinc-800 rounded-lg">
                <Upload className="w-4 h-4 text-teal-600" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Media Library & Panorama X-rays</h2>
                <p className="text-[11px] text-zinc-400 font-medium font-sans">Clinical photographs, periapical scans, panoramas, or cephalometric records.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={uploadSearchQuery}
                  onChange={(e) => {
                    setUploadSearchQuery(e.target.value);
                    setUploadPage(1);
                  }}
                  placeholder="Search Uploads..."
                  className="pl-8.5 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-xs w-48 font-medium"
                />
              </div>
              <button
                onClick={() => {
                  const current = uploadsList;
                  setUploadsList([]);
                  setTimeout(() => setUploadsList(current), 300);
                }}
                className="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-500" /> Update List
              </button>
              <button
                onClick={() => {
                  setEditingUploadId(null);
                  setUploadNameInput('');
                  setUploadTypeInput('image/png');
                  setUploadDataUrlInput('');
                  setIsUploadModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-[#00acc1] hover:bg-[#0097a7] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors uppercase animate-pulse-subtle"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5px]" /> Upload File
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-visible min-h-[450px] flex flex-col justify-between">
            <div className="overflow-x-auto pb-28 flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200">
                    <th className="py-4.5 px-6 w-24">Preview</th>
                    <th className="py-4.5 px-6">File Name</th>
                    <th className="py-4.5 px-6">Category / Type</th>
                    <th className="py-4.5 px-6">Size</th>
                    <th className="py-4.5 px-6">Upload Date</th>
                    <th className="py-4.5 px-6 w-32 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700 font-medium">
                  {paginatedUploads.length > 0 ? (
                    paginatedUploads.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="w-12 h-12 bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden flex items-center justify-center text-lg select-none">
                            {u.dataUrl ? (
                              <img src={u.dataUrl} alt={u.name} className="w-full h-full object-cover" />
                            ) : u.type.startsWith('image/') ? (
                              '🖼'
                            ) : (
                              '📄'
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-bold text-zinc-900 truncate max-w-xs">
                          {u.name}
                        </td>
                        <td className="py-4 px-6">
                          <span className="bg-teal-50 text-teal-700 border border-teal-100 font-bold px-2.5 py-0.5 rounded-md text-[10px] uppercase">
                            {u.type}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-zinc-500 font-bold">
                          {u.size}
                        </td>
                        <td className="py-4 px-6 text-zinc-400">
                          {u.date}
                        </td>
                        <td className="py-4 px-6 text-center relative overflow-visible">
                          <button
                            type="button"
                            onClick={() => setActiveUploadPopoverId(activeUploadPopoverId === u.id ? null : u.id)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer inline-flex items-center"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeUploadPopoverId === u.id && (
                            <>
                              <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setActiveUploadPopoverId(null)} />
                              <div className="absolute right-6 top-10 w-44 bg-white rounded-xl border border-zinc-200 shadow-xl py-1.5 z-40 text-xs text-left animate-in fade-in slide-in-from-top-1 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveUploadPopoverId(null);
                                    setEditingUploadId(u.id);
                                    setUploadNameInput(u.name);
                                    setUploadTypeInput(u.type);
                                    setUploadDataUrlInput(u.dataUrl || '');
                                    setIsUploadModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-orange-500 font-bold transition-colors cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Edit/Rename
                                </button>
                                {u.dataUrl && (
                                  <a
                                    href={u.dataUrl}
                                    download={u.name}
                                    onClick={() => setActiveUploadPopoverId(null)}
                                    className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-cyan-600 font-bold transition-colors cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveUploadPopoverId(null);
                                    showConfirm({
                                      title: "Delete Uploaded File",
                                      message: "Are you sure you want to delete this diagnostic document or dental scan?",
                                      confirmText: "Delete File",
                                      cancelText: "Keep File",
                                      variant: "danger",
                                      onConfirm: () => {
                                        const updated = uploadsList.filter(item => item.id !== u.id);
                                        saveUploadsList(updated);
                                      }
                                    });
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-red-650 font-bold transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete File
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400 italic">
                        <div className="max-w-sm mx-auto space-y-1.5">
                          <Upload className="w-8 h-8 text-zinc-300 mx-auto" />
                          <p className="text-xs font-bold">No uploaded X-rays.</p>
                          <p className="text-[11px] font-medium text-zinc-400 leading-normal">
                            Try adjusting your search filters or click "+ Upload File" to add scans.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {uploadsList.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-semibold py-4 px-6 bg-zinc-50 border-t border-zinc-200 gap-4">
                <span className="text-zinc-500">
                  Showing <strong className="text-zinc-800">{Math.min(filteredUploads.length, (uploadPage - 1) * uploadPerPage + 1)}-{Math.min(filteredUploads.length, uploadPage * uploadPerPage)}</strong> of <strong className="text-zinc-800">{filteredUploads.length}</strong> uploads
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUploadPage(p => Math.max(1, p - 1))}
                    disabled={uploadPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                  >
                    Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalUploadPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setUploadPage(pageNum)}
                        className={`w-7 h-7 rounded-lg border font-extrabold text-xs transition-all flex items-center justify-center cursor-pointer ${
                          uploadPage === pageNum
                            ? 'border-teal-600 bg-teal-600 text-white'
                            : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadPage(p => Math.min(totalUploadPages, p + 1))}
                    disabled={uploadPage === totalUploadPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    })(),
    NOTES: (() => {
      const sortedNotes = [...scratchpadNotesList].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      const filteredNotes = sortedNotes.filter(n => {
        const q = scratchpadSearchQuery.toLowerCase();
        return n.content.toLowerCase().includes(q) || n.author.toLowerCase().includes(q);
      });

      const totalNotesPages = Math.ceil(filteredNotes.length / scratchpadPerPage) || 1;
      const paginatedNotes = filteredNotes.slice((scratchpadPage - 1) * scratchpadPerPage, scratchpadPage * scratchpadPerPage);

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4.5 rounded-2xl border border-zinc-200/80 shadow-3xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-zinc-100 text-zinc-800 rounded-lg">
                <PenTool className="w-4 h-4 text-teal-600" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Clinical Scratchpad Notes</h2>
                <p className="text-[11px] text-zinc-400 font-medium font-sans">Private clinical annotations, reminders, or miscellaneous medical remarks.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={scratchpadSearchQuery}
                  onChange={(e) => {
                    setScratchpadSearchQuery(e.target.value);
                    setScratchpadPage(1);
                  }}
                  placeholder="Search Notes..."
                  className="pl-8.5 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-xs w-48 font-medium"
                />
              </div>
              <button
                onClick={() => {
                  const current = scratchpadNotesList;
                  setScratchpadNotesList([]);
                  setTimeout(() => setScratchpadNotesList(current), 300);
                }}
                className="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-500" /> Update List
              </button>
              <button
                onClick={() => {
                  setEditingScratchpadId(null);
                  setScratchpadContentInput('');
                  setScratchpadAuthorInput('Dr. Maria Jessica Tanarte');
                  setScratchpadIsPinnedInput(false);
                  setScratchpadIsArchivedInput(false);
                  setIsScratchpadModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-[#00acc1] hover:bg-[#0097a7] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors uppercase animate-pulse-subtle"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5px]" /> Create Note
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-visible min-h-[450px] flex flex-col justify-between">
            <div className="overflow-x-auto pb-28 flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200">
                    <th className="py-4.5 px-6 w-12 text-center">Pin</th>
                    <th className="py-4.5 px-6 w-48">Timestamp</th>
                    <th className="py-4.5 px-6">Note Content</th>
                    <th className="py-4.5 px-6 w-48">Author</th>
                    <th className="py-4.5 px-6 w-32 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700 font-medium">
                  {paginatedNotes.length > 0 ? (
                    paginatedNotes.map((n) => (
                      <tr key={n.id} className={`transition-colors ${n.isPinned ? 'bg-amber-50/20 hover:bg-amber-50/35' : 'hover:bg-zinc-50/50'}`}>
                        <td className="py-4 px-6 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = scratchpadNotesList.map(item => item.id === n.id ? { ...item, isPinned: !item.isPinned } : item);
                              saveScratchpadNotesList(updated);
                            }}
                            className={`p-1 rounded-md transition-colors ${n.isPinned ? 'text-amber-500 hover:text-amber-600' : 'text-zinc-300 hover:text-zinc-500'}`}
                          >
                            <Bookmark className="w-4 h-4 fill-current" />
                          </button>
                        </td>
                        <td className="py-4 px-6 font-bold text-zinc-500 whitespace-nowrap">
                          {n.timestamp}
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-zinc-800 font-medium whitespace-pre-wrap leading-relaxed max-w-lg">
                            {n.content}
                          </div>
                          {n.isArchived && (
                            <span className="inline-flex mt-1 bg-zinc-100 text-zinc-500 text-[9px] font-bold px-1.5 py-0.2 rounded border border-zinc-200 uppercase">
                              Archived
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-zinc-500 font-semibold whitespace-nowrap">
                          👤 {n.author}
                        </td>
                        <td className="py-4 px-6 text-center relative overflow-visible">
                          <button
                            type="button"
                            onClick={() => setActiveScratchpadPopoverId(activeScratchpadPopoverId === n.id ? null : n.id)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer inline-flex items-center"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeScratchpadPopoverId === n.id && (
                            <>
                              <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setActiveScratchpadPopoverId(null)} />
                              <div className="absolute right-6 top-10 w-44 bg-white rounded-xl border border-zinc-200 shadow-xl py-1.5 z-40 text-xs text-left animate-in fade-in slide-in-from-top-1 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveScratchpadPopoverId(null);
                                    setEditingScratchpadId(n.id);
                                    setScratchpadContentInput(n.content);
                                    setScratchpadAuthorInput(n.author);
                                    setScratchpadIsPinnedInput(n.isPinned);
                                    setScratchpadIsArchivedInput(n.isArchived);
                                    setIsScratchpadModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-orange-500 font-bold transition-colors cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Edit Note
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveScratchpadPopoverId(null);
                                    const updated = scratchpadNotesList.map(item => item.id === n.id ? { ...item, isPinned: !item.isPinned } : item);
                                    saveScratchpadNotesList(updated);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-amber-600 font-bold transition-colors cursor-pointer"
                                >
                                  <Bookmark className="w-3.5 h-3.5" />
                                  {n.isPinned ? 'Unpin Note' : 'Pin to Top'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveScratchpadPopoverId(null);
                                    const updated = scratchpadNotesList.map(item => item.id === n.id ? { ...item, isArchived: !item.isArchived } : item);
                                    saveScratchpadNotesList(updated);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-zinc-650 font-bold transition-colors cursor-pointer"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  {n.isArchived ? 'Activate Note' : 'Archive Note'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveScratchpadPopoverId(null);
                                    showConfirm({
                                      title: "Delete Scratchpad Note",
                                      message: "Are you sure you want to delete this scratchpad note? This private annotation will be permanently removed.",
                                      confirmText: "Delete Note",
                                      cancelText: "Keep Note",
                                      variant: "danger",
                                      onConfirm: () => {
                                        const updated = scratchpadNotesList.filter(item => item.id !== n.id);
                                        saveScratchpadNotesList(updated);
                                      }
                                    });
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-red-650 font-bold transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete Note
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-400 italic">
                        <div className="max-w-sm mx-auto space-y-1.5">
                          <PenTool className="w-8 h-8 text-zinc-300 mx-auto" />
                          <p className="text-xs font-bold">No scratchpad notes.</p>
                          <p className="text-[11px] font-medium text-zinc-400 leading-normal">
                            Try adjusting your search filter or click "+ Create Note" to document clinical reminders.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {scratchpadNotesList.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-semibold py-4 px-6 bg-zinc-50 border-t border-zinc-200 gap-4">
                <span className="text-zinc-500">
                  Showing <strong className="text-zinc-800">{Math.min(filteredNotes.length, (scratchpadPage - 1) * scratchpadPerPage + 1)}-{Math.min(filteredNotes.length, scratchpadPage * scratchpadPerPage)}</strong> of <strong className="text-zinc-800">{filteredNotes.length}</strong> scratchpad notes
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setScratchpadPage(p => Math.max(1, p - 1))}
                    disabled={scratchpadPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                  >
                    Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalNotesPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setScratchpadPage(pageNum)}
                        className={`w-7 h-7 rounded-lg border font-extrabold text-xs transition-all flex items-center justify-center cursor-pointer ${
                          scratchpadPage === pageNum
                            ? 'border-teal-600 bg-teal-600 text-white'
                            : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setScratchpadPage(p => Math.min(totalNotesPages, p + 1))}
                    disabled={scratchpadPage === totalNotesPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    })(),
    RECALLS: (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4.5 rounded-2xl border border-zinc-200/80 shadow-3xs">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-zinc-100 text-zinc-850 rounded-lg">
              <RefreshCw className="w-4 h-4 text-teal-600 animate-spin-slow" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Patient Dental Recalls</h2>
              <p className="text-[11px] text-zinc-400 font-medium">Recall timelines to schedule prophylaxis, orthodontic brackets tightening, or dental surgery checks.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const current = recallsTabList;
                setRecallsTabList([]);
                setTimeout(() => setRecallsTabList(current), 300);
              }}
              className="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" /> Update List
            </button>
            <button
              onClick={() => {
                setNewRecallDate(new Date().toISOString().split('T')[0]);
                setNewRecallType('Orthodontic Checkup');
                setNewRecallReason('');
                setNewRecallRemarks('');
                setNewRecallNotes('Insert notes here...');
                setNewRecallInterval('4 Weeks');
                setNewRecallSessions('1 of 12 Sessions');
                setIsNewRecallModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors uppercase"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5px]" /> Setup Next Recall
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-visible min-h-[650px] flex flex-col justify-between">
          <div className="overflow-x-auto overflow-visible flex-1 pb-44">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200">
                  <th className="py-4 px-6">Planned Recall Date</th>
                  <th className="py-4 px-6">Recall Type</th>
                  <th className="py-4 px-6 text-center">Interval</th>
                  <th className="py-4 px-6 text-center">Sessions Status</th>
                  <th className="py-4 px-6">Recall Reason</th>
                  <th className="py-4 px-6">Remarks</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700 font-medium">
                {recallsTabList.length > 0 ? (
                  recallsTabList.slice((recallsTabPage - 1) * recallsTabPerPage, recallsTabPage * recallsTabPerPage).map((rec) => (
                    <tr key={rec.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-5 px-6 font-bold text-zinc-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{rec.dateTime}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 font-extrabold text-zinc-900 uppercase">
                        {rec.recallType}
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md font-bold text-[10px]">
                          {rec.interval}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-center font-bold text-teal-600">
                        {rec.sessions}
                      </td>
                      <td className="py-5 px-6 text-zinc-500 max-w-xs truncate">
                        {rec.recallReason}
                      </td>
                      <td className="py-5 px-6 text-zinc-400 max-w-xs truncate italic">
                        {rec.remarks || 'None'}
                      </td>
                      <td className="py-5 px-6 text-center relative overflow-visible">
                        <button
                          type="button"
                          onClick={() => setActiveRecallPopoverId(activeRecallPopoverId === rec.id ? null : rec.id)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer inline-flex items-center"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeRecallPopoverId === rec.id && (
                          <>
                            {/* Click-away backdrop */}
                            <div 
                              className="fixed inset-0 z-30 bg-transparent" 
                              onClick={() => setActiveRecallPopoverId(null)}
                            />
                            <div className="absolute right-6 top-10 w-44 bg-white rounded-xl border border-zinc-200 shadow-xl py-1.5 z-50 text-xs text-left animate-in fade-in slide-in-from-top-1 duration-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRecallPopoverId(null);
                                  setEditingRecallId(rec.id);
                                  let dVal = new Date().toISOString().split('T')[0];
                                  try {
                                    dVal = new Date(rec.dateTime).toISOString().split('T')[0];
                                  } catch (e) {}
                                  setNewRecallDate(dVal);
                                  setNewRecallType(rec.recallType);
                                  setNewRecallInterval(rec.interval);
                                  setNewRecallSessions(rec.sessions);
                                  setNewRecallReason(rec.recallReason);
                                  setNewRecallRemarks(rec.remarks);
                                  setNewRecallNotes(rec.descriptionNotes || "");
                                  setIsNewRecallModalOpen(true);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-orange-500 font-bold transition-colors cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Edit Recall
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRecallPopoverId(null);
                                  alert(`Reminder SMS sent successfully to patient ${record.personalInfo.lastName} for Recall ID: ${rec.id}!`);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-cyan-600 font-bold transition-colors cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Send SMS
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRecallPopoverId(null);
                                  showConfirm({
                                    title: "Delete Recall Record",
                                    message: "Are you sure you want to delete this recall appointment record? This will clear the recall date and interval configuration.",
                                    confirmText: "Delete Recall",
                                    cancelText: "Keep Recall",
                                    variant: "danger",
                                    onConfirm: () => {
                                      const updated = recallsTabList.filter(item => item.id !== rec.id);
                                      saveRecallsTabList(updated);
                                    }
                                  });
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-red-600 font-bold transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Recall
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 italic">
                      <div className="max-w-sm mx-auto space-y-1.5">
                        <RefreshCw className="w-8 h-8 text-zinc-300 mx-auto" />
                        <p className="text-xs font-bold">No dental recalls scheduled</p>
                        <p className="text-[11px] font-medium text-zinc-400 leading-normal">
                          Click "Setup Next Recall" to establish future prophylaxis or tightening session schedules.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Recalls Pagination */}
          {recallsTabList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-semibold py-4 px-6 bg-zinc-50 border-t border-zinc-200 gap-4">
              <span className="text-zinc-500">
                Showing <strong className="text-zinc-800">{Math.min(recallsTabList.length, (recallsTabPage - 1) * recallsTabPerPage + 1)}-{Math.min(recallsTabList.length, recallsTabPage * recallsTabPerPage)}</strong> of <strong className="text-zinc-800">{recallsTabList.length}</strong> recalls
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRecallsTabPage(p => Math.max(1, p - 1))}
                  disabled={recallsTabPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                >
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(recallsTabList.length / recallsTabPerPage) }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setRecallsTabPage(pageNum)}
                      className={`w-7 h-7 rounded-lg border font-extrabold text-xs transition-all flex items-center justify-center cursor-pointer ${
                        recallsTabPage === pageNum
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setRecallsTabPage(p => Math.min(Math.ceil(recallsTabList.length / recallsTabPerPage), p + 1))}
                  disabled={recallsTabPage === Math.ceil(recallsTabList.length / recallsTabPerPage)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    APPOINTMENTS: (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4.5 rounded-2xl border border-zinc-200/80 shadow-3xs">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-zinc-100 text-zinc-800 rounded-lg">
              <Calendar className="w-4 h-4 text-[#00acc1]" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Dental Appointment Ledger</h2>
              <p className="text-[11px] text-zinc-400 font-medium">Calendar slots, patient attendance statuses, and clinical logs.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEditingAppointmentId(null);
                setAppointmentTitle('Orthodontics Adjustment');
                setAppointmentDate(new Date().toISOString().split('T')[0]);
                setAppointmentStartTime('10:00 AM');
                setAppointmentEndTime('11:00 AM');
                setAppointmentStatus('Confirmed');
                setIsAppointmentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-[#00acc1] hover:bg-[#0097a7] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors uppercase"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5px]" /> Set Appointment
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-visible min-h-[400px] flex flex-col justify-between">
          <div className="overflow-x-auto overflow-visible flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-zinc-50 font-bold uppercase text-zinc-400 border-b border-zinc-200">
                <tr>
                  <th className="py-4 px-6">Schedule Slot</th>
                  <th className="py-4 px-6">Dental Category / Title</th>
                  <th className="py-4 px-6">Timeframe</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium">
                {appointmentsList.length > 0 ? (
                  appointmentsList.map((apt) => (
                    <tr key={apt.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-5 px-6 font-bold text-zinc-900 whitespace-nowrap">
                        {apt.startDate.split(',')[0]} {apt.startDate.split(',')[1]}
                      </td>
                      <td className="py-5 px-6 font-bold text-zinc-800">
                        {apt.title}
                      </td>
                      <td className="py-5 px-6 text-zinc-500 font-mono">
                        {apt.startDate.split(',')[2]?.trim() || apt.startDate} - {apt.endDate.split(',')[2]?.trim() || apt.endDate}
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wide ${
                          apt.status === 'Confirmed' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                          apt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          apt.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-center relative overflow-visible">
                        <button
                          type="button"
                          onClick={() => setActiveAppointmentPopoverId(activeAppointmentPopoverId === apt.id ? null : apt.id)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer inline-flex items-center"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeAppointmentPopoverId === apt.id && (
                          <>
                            {/* Click-away backdrop */}
                            <div 
                              className="fixed inset-0 z-30 bg-transparent" 
                              onClick={() => setActiveAppointmentPopoverId(null)}
                            />
                            <div className="absolute right-6 top-10 w-52 bg-white rounded-xl border border-zinc-200 shadow-xl py-1.5 z-50 text-xs text-left animate-in fade-in slide-in-from-top-1 duration-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAppointmentPopoverId(null);
                                  let dVal = new Date().toISOString().split('T')[0];
                                  try {
                                    dVal = new Date(apt.startDate).toISOString().split('T')[0];
                                  } catch (e) {}
                                  setAppointmentDate(dVal);
                                  setAppointmentTitle(apt.title);
                                  const startParts = apt.startDate.split(',');
                                  const endParts = apt.endDate.split(',');
                                  setAppointmentStartTime(startParts[2] ? startParts[2].trim() : "10:00 AM");
                                  setAppointmentEndTime(endParts[2] ? endParts[2].trim() : "11:00 AM");
                                  setAppointmentStatus(apt.status);
                                  setEditingAppointmentId(apt.id);
                                  setIsAppointmentModalOpen(true);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-orange-500 font-bold transition-colors cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Edit Appointment
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAppointmentPopoverId(null);
                                  setActiveAppointmentForAudit(apt);
                                  setIsAuditModalOpen(true);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-cyan-600 font-bold transition-colors cursor-pointer"
                              >
                                <History className="w-3.5 h-3.5" />
                                View Audit History ({apt.auditLogs.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAppointmentPopoverId(null);
                                  showConfirm({
                                    title: "Cancel Appointment",
                                    message: "Are you sure you want to mark this appointment as Cancelled? An audit log entry will be added to track this modification.",
                                    confirmText: "Cancel Appointment",
                                    cancelText: "Keep Active",
                                    variant: "warning",
                                    onConfirm: () => {
                                      const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                      const cancellationLog = {
                                        id: `LOG-${Date.now()}-cancel`,
                                        type: 'UPDATED' as const,
                                        author: "Dr. Maria Jessica Tanarte",
                                        fieldsModified: "Status",
                                        timestamp,
                                        details: "Appointment status marked as Cancelled via context quick-actions."
                                      };
                                      const updated = appointmentsList.map(a => a.id === apt.id ? {
                                        ...a,
                                        status: 'Cancelled' as const,
                                        auditLogs: [cancellationLog, ...a.auditLogs]
                                      } : a);
                                      saveAppointmentsList(updated);
                                    }
                                  });
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-amber-650 font-bold transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5 text-amber-500" />
                                Cancel Appointment
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAppointmentPopoverId(null);
                                  showConfirm({
                                    title: "Delete Appointment",
                                    message: "Are you sure you want to completely delete this appointment record? This action will permanently remove it from the patient's schedule history.",
                                    confirmText: "Delete Appointment",
                                    cancelText: "Keep Appointment",
                                    variant: "danger",
                                    onConfirm: () => {
                                      const updated = appointmentsList.filter(item => item.id !== apt.id);
                                      saveAppointmentsList(updated);
                                    }
                                  });
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-red-650 font-bold transition-colors cursor-pointer border-t border-zinc-100"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                Delete Appointment
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-400 italic">
                      <div className="max-w-sm mx-auto space-y-1.5">
                        <Calendar className="w-8 h-8 text-zinc-300 mx-auto" />
                        <p className="text-xs font-bold">No appointments recorded</p>
                        <p className="text-[11px] font-medium text-zinc-400">
                          Use "+ Set Appointment" to organize next visit schedules.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ),
    FOLLOW_UP: (
      <div className="space-y-6">
        <div className="bg-white p-4.5 rounded-2xl border border-zinc-200/80 shadow-3xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-zinc-100 text-zinc-850 rounded-lg">
                <Heart className="w-4 h-4 text-rose-500" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Post-Operative Follow-up Lists</h2>
                <p className="text-[11px] text-zinc-400 font-medium">Track clinical recovery feedback loops for deep scaling or tooth extraction patients.</p>
              </div>
            </div>

            {/* Interactive Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={followUpSearchQuery}
                  onChange={(e) => {
                    setFollowUpSearchQuery(e.target.value);
                    setFollowUpPage(1);
                  }}
                  placeholder="Search recovery logs..."
                  className="pl-8.5 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-xs w-44"
                />
              </div>

              <select
                value={followUpSortField}
                onChange={(e) => setFollowUpSortField(e.target.value as any)}
                className="bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-2.5 font-bold text-zinc-700 cursor-pointer text-xs focus:ring-1 focus:ring-teal-500"
              >
                <option value="date">Sort: Date</option>
                <option value="reason">Sort: Reason</option>
                <option value="notes">Sort: Clinical Notes</option>
              </select>

              <button
                onClick={() => setFollowUpSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center justify-center p-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl font-bold cursor-pointer transition-colors text-zinc-700"
                title={`Order: ${followUpSortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                {followUpSortOrder === 'asc' ? '▲ ASC' : '▼ DESC'}
              </button>

              <button
                onClick={() => {
                  setEditingFollowUpId(null);
                  setFollowUpDateInput(new Date().toISOString().split('T')[0]);
                  setFollowUpReasonInput('');
                  setFollowUpNotesInput('');
                  setIsFollowUpModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-[#00acc1] hover:bg-[#0097a7] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-colors uppercase"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5px]" /> Log Follow-up
              </button>
            </div>
          </div>
        </div>

        {/* Follow Ups Data Card Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-visible min-h-[650px] flex flex-col justify-between">
          <div className="overflow-x-auto overflow-visible flex-1 pb-44">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-zinc-50 font-bold uppercase text-zinc-400 border-b border-zinc-200">
                <tr>
                  <th className="py-4 px-6 w-36">Checked Date</th>
                  <th className="py-4 px-6">Follow-up Reason</th>
                  <th className="py-4 px-6">Clinical Recovery Feedback Notes</th>
                  <th className="py-4 px-6 text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium">
                {(() => {
                  let filtered = followUpsList.filter(item => 
                    item.reason.toLowerCase().includes(followUpSearchQuery.toLowerCase()) ||
                    item.notes.toLowerCase().includes(followUpSearchQuery.toLowerCase())
                  );

                  filtered.sort((a, b) => {
                    let fieldA = a[followUpSortField].toLowerCase();
                    let fieldB = b[followUpSortField].toLowerCase();
                    if (followUpSortField === 'date') {
                      fieldA = new Date(a.date).getTime().toString();
                      fieldB = new Date(b.date).getTime().toString();
                    }
                    if (fieldA < fieldB) return followUpSortOrder === 'asc' ? -1 : 1;
                    if (fieldA > fieldB) return followUpSortOrder === 'asc' ? 1 : -1;
                    return 0;
                  });

                  const paginated = filtered.slice((followUpPage - 1) * followUpPerPage, followUpPage * followUpPerPage);

                  if (paginated.length > 0) {
                    return paginated.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-5 px-6 font-bold text-zinc-900 whitespace-nowrap">
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-5 px-6 font-extrabold text-zinc-900 uppercase">
                          {item.reason}
                        </td>
                        <td className="py-5 px-6 text-zinc-500 max-w-sm font-medium leading-relaxed">
                          {item.notes}
                        </td>
                        <td className="py-5 px-6 text-center relative overflow-visible">
                          <button
                            type="button"
                            onClick={() => setActiveFollowUpOptionId(activeFollowUpOptionId === item.id ? null : item.id)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer inline-flex items-center"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeFollowUpOptionId === item.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-30 bg-transparent" 
                                onClick={() => setActiveFollowUpOptionId(null)}
                              />
                              <div className="absolute right-6 top-10 w-48 bg-white rounded-xl border border-zinc-200 shadow-xl py-1.5 z-50 text-xs text-left animate-in fade-in slide-in-from-top-1 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveFollowUpOptionId(null);
                                    let dVal = new Date().toISOString().split('T')[0];
                                    try {
                                      dVal = new Date(item.date).toISOString().split('T')[0];
                                    } catch (e) {}
                                    setFollowUpDateInput(dVal);
                                    setFollowUpReasonInput(item.reason);
                                    setFollowUpNotesInput(item.notes);
                                    setEditingFollowUpId(item.id);
                                    setIsFollowUpModalOpen(true);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-orange-500 font-bold transition-colors cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Edit Follow-up
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveFollowUpOptionId(null);
                                    alert(`Postoperative case for ${item.reason} successfully marked as Resolved/Completed!`);
                                    const updated = followUpsList.filter(f => f.id !== item.id);
                                    saveFollowUpsList(updated);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-emerald-600 font-bold transition-colors cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Mark as Resolved / Complete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveFollowUpOptionId(null);
                                    showConfirm({
                                      title: "Remove Follow-up Case",
                                      message: `Are you sure you want to remove the postoperative tracking report for "${item.reason}"?`,
                                      confirmText: "Remove Report",
                                      cancelText: "Keep Report",
                                      variant: "danger",
                                      onConfirm: () => {
                                        const updated = followUpsList.filter(f => f.id !== item.id);
                                        saveFollowUpsList(updated);
                                      }
                                    });
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center gap-2 text-red-600 font-bold transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Remove from List
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ));
                  } else {
                    return (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-zinc-400 italic">
                          <div className="max-w-sm mx-auto space-y-1.5">
                            <Heart className="w-8 h-8 text-zinc-300 mx-auto" />
                            <p className="text-xs font-bold">No follow-up records.</p>
                            <p className="text-[11px] font-medium text-zinc-400">
                              Adjust your query filters or add more postoperative reports.
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                })()}
              </tbody>
            </table>
          </div>

          {/* Follow-up pagination */}
          {followUpsList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-semibold py-4 px-6 bg-zinc-50 border-t border-zinc-200 gap-4">
              <span className="text-zinc-500">
                Total postoperative tracking cases: <strong className="text-zinc-800">{followUpsList.length}</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFollowUpPage(p => Math.max(1, p - 1))}
                  disabled={followUpPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                >
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(followUpsList.length / followUpPerPage) }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setFollowUpPage(pageNum)}
                      className={`w-7 h-7 rounded-lg border font-extrabold text-xs transition-all flex items-center justify-center cursor-pointer ${
                        followUpPage === pageNum
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFollowUpPage(p => Math.min(Math.ceil(followUpsList.length / followUpPerPage), p + 1))}
                  disabled={followUpPage === Math.ceil(followUpsList.length / followUpPerPage)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:p-0">
      
      {userRole === 'Staff Member' && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl text-xs font-semibold flex items-start gap-2.5 shadow-2xs print:hidden">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="block font-black uppercase tracking-wide">Read-Only Clinical Console</span>
            <p className="leading-normal font-semibold text-[10px]">
              You are logged in with Staff credentials. You can view patient records, HMO details, and schedule appointments, but clinical charting (recalls), treatment planning (progress notes), and billing ledger modifications are restricted to Dentist Associates and the Clinic Owner.
            </p>
          </div>
        </div>
      )}
      
      {/* Top action header mirroring clinical ledger dashboard tools */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs print:hidden">
        <button
          onClick={onBack}
          id="detail-back-btn"
          className="inline-flex items-center gap-2 text-zinc-700 hover:text-zinc-950 font-bold text-xs px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-all cursor-pointer duration-150"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Patient Database
        </button>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleOpenEditProfile}
            id="detail-update-profile-btn"
            className="inline-flex items-center gap-2 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs duration-150"
          >
            <Edit className="w-4 h-4" /> Quick Update
          </button>
          {onEditPatient && (
            <button
              onClick={() => onEditPatient(record)}
              id="detail-update-record-btn"
              className="inline-flex items-center gap-2 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs duration-150"
            >
              <RefreshCw className="w-4 h-4" /> Update Record
            </button>
          )}
          <button
            onClick={() => window.print()}
            id="detail-print-btn"
            className="inline-flex items-center gap-2 text-white bg-zinc-900 hover:bg-zinc-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs duration-150"
          >
            <Printer className="w-4 h-4" /> Print Full Patient Record
          </button>
        </div>
      </div>

      {/* NEW HEADER SPECIFIED BY USER:
          "Fullname, gender, age, birthday"
          "last updated:, added:, contact number:, location:, last visit:, at clinic, at doctor, medical alert:, balance:, (remaining), add a tag..." */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/90 shadow-xs space-y-4">
        
        {/* Medical warning header if any alert is active */}
        {record.medicalHistory.medicalAlert && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2.5">
            <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
            <div className="text-xs font-bold uppercase tracking-wide">
              Medical Warning Alert: {record.medicalHistory.medicalAlert}
            </div>
          </div>
        )}

        {/* Clinical details Layout */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-2">
          
          <div className="space-y-1.5 flex-1">
            {/* 1. Fullname, gender, age, birthday */}
            <div className="flex flex-wrap items-baseline gap-x-2.5">
              <h1 className="text-xl font-extrabold text-zinc-900 font-display uppercase tracking-tight">
                {record.personalInfo.lastName}, {record.personalInfo.firstName} {record.personalInfo.middleName}
              </h1>
              <span className="text-xs font-bold text-zinc-400">
                ({record.personalInfo.sex}, {age} yrs old, Born {record.personalInfo.birthdate})
              </span>
            </div>

            {/* 2. List of details: last updated:, added:, contact number:, location:, last visit:, at clinic, at doctor, medical alert:, balance:, remaining */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4 text-[11px] font-semibold text-zinc-500 pt-1">
              <div className="flex items-center gap-1">
                <span className="text-zinc-400 font-bold uppercase text-[9px]">Last Updated:</span>
                <span className="text-zinc-800">{record.lastRecall ? new Date(record.lastRecall).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-400 font-bold uppercase text-[9px]">Added:</span>
                <span className="text-zinc-800">{new Date(record.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-400 font-bold uppercase text-[9px]">Contact Number:</span>
                <span className="text-zinc-800 font-mono">{record.personalInfo.mobile}</span>
              </div>
              <div className="flex items-center gap-1 col-span-1 lg:col-span-2">
                <span className="text-zinc-400 font-bold uppercase text-[9px] shrink-0">Location:</span>
                <span className="text-zinc-800 truncate uppercase" title={record.personalInfo.address}>{record.personalInfo.address}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-400 font-bold uppercase text-[9px]">Last Visit:</span>
                <span className="text-zinc-800">{record.dentalHistory.lastVisit || 'None'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-400 font-bold uppercase text-[9px]">At Clinic:</span>
                <span className="text-zinc-800">P&J Tanarte Dental Clinic</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-400 font-bold uppercase text-[9px]">At Doctor:</span>
                <span className="text-zinc-800">Dr. Maria Jessica Tanarte</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-zinc-400 font-bold uppercase text-[9px]">Medical Alert:</span>
                <span className={`px-1.5 py-0.2 rounded font-extrabold ${record.medicalHistory.medicalAlert ? 'bg-red-50 text-red-600 border border-red-100' : 'text-zinc-800 bg-zinc-50 border border-zinc-200'}`}>
                  {record.medicalHistory.medicalAlert || "None"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsMoreInfoOpen(true)}
                  className="text-[10px] font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer inline-flex items-center gap-0.5 ml-1"
                >
                  Show more ...
                </button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-400 font-bold uppercase text-[9px]">Balance:</span>
                <span className="text-zinc-900 font-extrabold">
                  ₱{(record.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-zinc-400 font-medium">(Remaining)</span>
                </span>
              </div>
              {record.alternatePatientIds && (
                <div className="flex items-center gap-1 col-span-1 lg:col-span-2">
                  <span className="text-zinc-400 font-bold uppercase text-[9px]">Alternate IDs:</span>
                  <span className="text-zinc-800 font-mono font-bold bg-zinc-100 px-2 py-0.5 rounded text-[10px] text-zinc-700">{record.alternatePatientIds}</span>
                </div>
              )}
            </div>

          </div>

          {/* Right Section Profile Photo */}
          <div className="w-16 h-16 rounded-xl bg-zinc-50 border border-zinc-200 overflow-hidden shrink-0 shadow-3xs hidden sm:block">
            {record.personalInfo.photoUrl ? (
              <img 
                src={record.personalInfo.photoUrl} 
                alt={record.personalInfo.firstName} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-300">
                <User className="w-7 h-7" />
              </div>
            )}
          </div>

        </div>

        {/* 3. Interactive Tag Manager inside header */}
        <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mr-1">Tags:</span>
          
          {/* Tag bubbles */}
          {tempTags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 bg-cyan-50 border border-cyan-100 text-cyan-700 text-[10px] font-bold px-2 py-0.8 rounded-full uppercase tracking-wider">
              {tag}
              <button 
                onClick={() => handleRemoveTag(tag)}
                className="text-cyan-500 hover:text-cyan-900 rounded-full hover:bg-cyan-100 p-0.5 transition-colors cursor-pointer"
                title="Remove tag"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}

          {tempTags.length === 0 && (
            <span className="text-[11px] text-zinc-400 font-medium italic mr-2">No Tag Assigned</span>
          )}

          {/* Add Tag Toggle / Input */}
          {!isAddingTag ? (
            <button
              onClick={() => setIsAddingTag(true)}
              className="inline-flex items-center gap-1 text-[10px] font-extrabold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100/70 border border-teal-200 px-2.5 py-0.8 rounded-full uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Plus className="w-2.5 h-2.5 stroke-[3px]" /> Add Tag
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl p-1 animate-in fade-in duration-100">
              <SmartAutocomplete
                placeholder="New tag..."
                value={newTagInput}
                onChange={(val) => setNewTagInput(val)}
                onSelect={(item) => {
                  setNewTagInput(item.name);
                }}
                masterKey="DENTAL_TAGS_MASTER"
                fallbackData={[]}
                searchField="name"
                className="relative"
                inputClassName="bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-[11px] outline-hidden w-28 text-zinc-800"
              />
              <button
                onClick={handleAddTagBubble}
                className="bg-zinc-900 text-white hover:bg-zinc-800 px-2 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
              >
                Add
              </button>
              <button
                onClick={handleSaveTags}
                className="bg-teal-600 text-white hover:bg-teal-700 px-2.5 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-0.5"
              >
                <Check className="w-3 h-3 stroke-[2.5px]" /> Save
              </button>
              <button
                onClick={handleCancelTags}
                className="bg-zinc-200 text-zinc-600 hover:bg-zinc-300 px-2.5 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

      </div>

      {/* GLOBAL SEARCH & QUICK-JUMP CONTROL CENTER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-gradient-to-br from-zinc-50 to-zinc-100/50 p-4.5 rounded-2xl border border-zinc-200 shadow-3xs print:hidden mb-1">
        {/* Left Column: Global Smart Search Engine */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">Global Smart Search Engine</span>
            <span className="text-[9px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Ctrl + K / Press '/'</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-zinc-400 w-4 h-4" />
            <input
              type="text"
              readOnly
              placeholder="Search anything (Services, Bills, Notes, Recall modules...) Or press '/' in notes to trigger command palette..."
              onClick={() => setGlobalSearchOpen(true)}
              className="w-full bg-white border border-zinc-250 hover:border-zinc-300 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-400 cursor-pointer shadow-3xs"
            />
          </div>
        </div>

        {/* Right Column: Jump to Section */}
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">Jump to Section</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'TREATMENT_PLANS', label: 'Treatments' },
              { id: 'CHARTS', label: 'Odontogram' },
              { id: 'PRESCRIPTIONS', label: 'Prescriptions' },
              { id: 'BILLS', label: 'Bills' },
              { id: 'RECALLS', label: 'Recalls' },
              { id: 'NOTES', label: 'Scratchpad' }
            ].map(sect => (
              <button
                key={sect.id}
                type="button"
                onClick={() => {
                  setActiveTab(sect.id);
                  const el = document.getElementById(`tab-btn-${sect.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === sect.id 
                    ? 'bg-zinc-900 text-white shadow-3xs' 
                    : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
                }`}
              >
                {sect.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* HORIZONTAL TAB MENU PANEL BAR */}
      <div className="relative flex items-center border-b border-zinc-200 print:hidden bg-zinc-50/30">
        
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-0 bottom-0 z-10 px-2.5 bg-gradient-to-r from-zinc-50 to-transparent text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer flex items-center justify-center shrink-0 border-r border-zinc-200/50"
            title="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4 bg-white rounded-full shadow-xs p-0.5 border border-zinc-200" />
          </button>
        )}

        {/* Scrollable Tabs Container */}
        {(() => {
          const getTabCount = (tabId: string): number => {
            switch (tabId) {
              case 'TREATMENT_PLANS': return progressNotes.length;
              case 'RECOMMENDATIONS': return 0;
              case 'CHARTS': return (record.recalls || []).length;
              case 'PRESCRIPTIONS': return prescriptions.length;
              case 'BILLS': return bills.length;
              case 'CERTIFICATES': return certificates.length;
              case 'UPLOADS': return uploadsList.length;
              case 'RECALLS': return recallsTabList.length;
              case 'APPOINTMENTS': return appointmentsList.length;
              case 'NOTES': return scratchpadNotesList.length;
              case 'FOLLOW_UP': return followUpsList.length;
              default: return 0;
            }
          };
          return (
            <div 
              ref={tabsRef}
              onScroll={checkScroll}
              className="overflow-x-auto scroll-smooth whitespace-nowrap scrollbar-none flex gap-0.5 flex-1 select-none pr-12 pl-1"
            >
              {[
                { id: 'TREATMENT_PLANS', label: 'Treatment Plans', icon: FileSpreadsheet },
                { id: 'RECOMMENDATIONS', label: 'Smart Decision Support', icon: Sparkles },
                { id: 'CHARTS', label: 'Odontogram Charts', icon: Smile },
                { id: 'PRESCRIPTIONS', label: 'Prescriptions', icon: Heart },
                { id: 'BILLS', label: 'Bills & Payments', icon: DollarSign },
                { id: 'CERTIFICATES', label: 'Certificates', icon: FileText },
                { id: 'UPLOADS', label: 'Uploads / X-Rays', icon: Upload },
                { id: 'RECALLS', label: 'Dental Recalls', icon: Calendar },
                { id: 'APPOINTMENTS', label: 'Appointments', icon: Users },
                { id: 'NOTES', label: 'Scratchpad Notes', icon: PenTool },
                { id: 'FOLLOW_UP', label: 'Follow Up Lists', icon: Activity },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-btn-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                      isActive 
                        ? 'border-zinc-900 text-zinc-900 bg-white' 
                        : 'border-transparent text-zinc-400 hover:text-zinc-700 hover:border-zinc-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {getTabCount(tab.id) > 0 && (
                      <span className="bg-zinc-900 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                        {getTabCount(tab.id)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* Scroll Right Button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="absolute right-12 top-0 bottom-0 z-10 px-2.5 bg-gradient-to-l from-zinc-50 to-transparent text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer flex items-center justify-center shrink-0 border-l border-zinc-200/50"
            title="Scroll Right"
          >
            <ChevronRight className="w-4 h-4 bg-white rounded-full shadow-xs p-0.5 border border-zinc-200" />
          </button>
        )}

        {/* "3-dots" More Tabs Dropdown Button */}
        <div ref={moreMenuRef} className="relative shrink-0 border-l border-zinc-200 z-20">
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`px-3 py-3 hover:bg-zinc-100/80 transition-all cursor-pointer flex items-center gap-1.5 font-bold text-xs ${
              isMoreOpen ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-800 bg-white'
            }`}
            title="Show All Tabs"
          >
            <MoreHorizontal className="w-4 h-4" />
            <ChevronDown className={`w-3 h-3 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isMoreOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-40 w-56 bg-white border border-zinc-200 rounded-2xl shadow-xl py-2 animate-in fade-in duration-100 max-h-80 overflow-y-auto">
              <div className="px-3.5 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 mb-1">
                Jump to Section
              </div>
              {(() => {
                const getTabCount = (tabId: string): number => {
                  switch (tabId) {
                    case 'TREATMENT_PLANS': return progressNotes.length;
                    case 'RECOMMENDATIONS': return 0;
                    case 'CHARTS': return (record.recalls || []).length;
                    case 'PRESCRIPTIONS': return prescriptions.length;
                    case 'BILLS': return bills.length;
                    case 'CERTIFICATES': return certificates.length;
                    case 'UPLOADS': return uploadsList.length;
                    case 'RECALLS': return recallsTabList.length;
                    case 'APPOINTMENTS': return appointmentsList.length;
                    case 'NOTES': return scratchpadNotesList.length;
                    case 'FOLLOW_UP': return followUpsList.length;
                    default: return 0;
                  }
                };
                return [
                  { id: 'TREATMENT_PLANS', label: 'Treatment Plans', icon: FileSpreadsheet },
                  { id: 'RECOMMENDATIONS', label: 'Smart Decision Support', icon: Sparkles },
                  { id: 'CHARTS', label: 'Odontogram Charts', icon: Smile },
                  { id: 'PRESCRIPTIONS', label: 'Prescriptions', icon: Heart },
                  { id: 'BILLS', label: 'Bills & Payments', icon: DollarSign },
                  { id: 'CERTIFICATES', label: 'Certificates', icon: FileText },
                  { id: 'UPLOADS', label: 'Uploads / X-Rays', icon: Upload },
                  { id: 'RECALLS', label: 'Dental Recalls', icon: Calendar },
                  { id: 'APPOINTMENTS', label: 'Appointments', icon: Users },
                  { id: 'NOTES', label: 'Scratchpad Notes', icon: PenTool },
                  { id: 'FOLLOW_UP', label: 'Follow Up Lists', icon: Activity },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const count = getTabCount(tab.id);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectTab(tab.id)}
                      className={`w-full px-4 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-zinc-50 transition-colors cursor-pointer text-left ${
                        isActive ? 'text-[#00acc1] bg-cyan-50/30 font-bold' : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#00acc1]' : 'text-zinc-400'}`} />
                      <span className="flex-1">{tab.label}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00acc1]" />
                      )}
                      {count > 0 && (
                        <span className="bg-zinc-200 text-zinc-700 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      {/* FORM MODAL / INLINE PANEL FOR "NEW PROGRESS NOTE" / "TREATMENT PLAN" */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-zinc-950/45 backdrop-blur-xs z-50 flex items-center justify-center p-0 md:p-4 print:hidden animate-fade-in">
          <div 
            className="bg-white rounded-none md:rounded-3xl border-b border-zinc-200 md:border md:shadow-2xl max-w-full md:max-w-5xl lg:max-w-6xl w-full h-full md:h-[88vh] md:max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-150 p-6 bg-zinc-50/50">
              <div>
                <h3 className="text-base font-extrabold text-zinc-900 tracking-tight font-display">
                  {editingNoteId ? 'Edit Clinical Progress Note & Treatment Plan' : 'New Clinical Progress Note & Treatment Plan'}
                </h3>
                <p className="text-xs text-zinc-400">Complete the patient progress notes, treatments, teeth, remarks, and signature.</p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 min-h-0 p-6 md:p-8 overflow-y-auto space-y-6 md:space-y-8 pb-24 md:pb-32">

          {/* Section 1: General Intake & Recall */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider pb-1.5 border-b border-zinc-150">
              1. General Visit & Recall Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Patient Name (Read-only) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Patient Name</label>
                <input 
                  type="text" 
                  value={`${record.personalInfo.lastName}, ${record.personalInfo.firstName}`} 
                  readOnly 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-500 font-bold outline-hidden"
                />
              </div>

              {/* Visit Date Custom Calendar */}
              <div className="space-y-1 relative" ref={visitCalendarRef}>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Visit Date</label>
                <button
                  type="button"
                  id="visit-date-trigger"
                  onClick={() => {
                    if (!isVisitCalendarOpen && visitDate) {
                      const d = new Date(visitDate);
                      if (!isNaN(d.getTime())) {
                        setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                      }
                    }
                    setIsVisitCalendarOpen(p => !p);
                    setIsRecallCalendarOpen(false);
                  }}
                  className="w-full bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-700 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    {visitDate ? (
                      <span>
                        {new Date(visitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="text-zinc-400 font-bold ml-1.5 mr-1.5">•</span>
                        <span className="text-teal-600 font-extrabold">{visitTime}</span>
                      </span>
                    ) : 'Select Date'}
                  </span>
                </button>

                {isVisitCalendarOpen && (
                  <div className="absolute top-full mt-2 left-0 z-50 w-72 bg-white border border-zinc-200 rounded-2xl shadow-xl p-3.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between mb-3 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const prevMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
                          setCalendarMonth(prevMonth);
                        }}
                        className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-600 cursor-pointer flex items-center justify-center border border-zinc-200"
                        title="Previous Month"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <div className="flex gap-1.5">
                        <select
                          value={calendarMonth.getMonth()}
                          onChange={(e) => {
                            const newMonth = new Date(calendarMonth.getFullYear(), parseInt(e.target.value), 1);
                            setCalendarMonth(newMonth);
                          }}
                          className="text-[11px] font-bold text-zinc-850 bg-zinc-50 border border-zinc-200 rounded-lg py-1 px-2 cursor-pointer outline-hidden focus:ring-1 focus:ring-zinc-400"
                        >
                          {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={calendarMonth.getFullYear()}
                          onChange={(e) => {
                            const newMonth = new Date(parseInt(e.target.value), calendarMonth.getMonth(), 1);
                            setCalendarMonth(newMonth);
                          }}
                          className="text-[11px] font-bold text-zinc-850 bg-zinc-50 border border-zinc-200 rounded-lg py-1 px-2 cursor-pointer outline-hidden focus:ring-1 focus:ring-zinc-400"
                        >
                          {Array.from({ length: 131 }, (_, i) => 1930 + i).map((yr) => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
                          setCalendarMonth(nextMonth);
                        }}
                        className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-600 cursor-pointer flex items-center justify-center border border-zinc-200"
                        title="Next Month"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-zinc-400 mb-1 tracking-wider uppercase">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {getCalendarDaysWithFiller(calendarMonth).map((cell, idx) => {
                        const isToday = new Date().toISOString().split('T')[0] === cell.dateStr;
                        const isSelected = visitDate === cell.dateStr;
                        return (
                          <button
                            key={`d-${idx}`}
                            type="button"
                            onClick={() => handleSelectFormDate(cell.day, 'visit', cell.monthOffset)}
                            className={`py-1 text-xs font-semibold rounded-lg hover:bg-zinc-100 cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-zinc-900 text-white hover:bg-zinc-800' 
                                : cell.isFiller
                                ? 'text-zinc-300 opacity-50 font-normal'
                                : isToday 
                                ? 'bg-teal-50 text-teal-700 border border-teal-150' 
                                : 'text-zinc-700'
                            }`}
                          >
                            {cell.day}
                          </button>
                        );
                      })}
                    </div>

                    {/* Time Picker Section */}
                    <div className="mt-4 pt-3.5 border-t border-zinc-100 flex flex-col items-center gap-1.5">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Time Selection</span>
                      <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1">
                        <select
                          value={parseTimeStr(visitTime).hour}
                          onChange={(e) => {
                            const current = parseTimeStr(visitTime);
                            setVisitTime(`${e.target.value}:${current.minute} ${current.ampm}`);
                          }}
                          className="bg-transparent text-xs font-extrabold text-zinc-800 outline-hidden cursor-pointer hover:bg-zinc-200/50 px-1 py-0.5 rounded"
                        >
                          {["01","02","03","04","05","06","07","08","09","10","11","12"].map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="text-zinc-400 font-extrabold text-xs">:</span>
                        <select
                          value={parseTimeStr(visitTime).minute}
                          onChange={(e) => {
                            const current = parseTimeStr(visitTime);
                            setVisitTime(`${current.hour}:${e.target.value} ${current.ampm}`);
                          }}
                          className="bg-transparent text-xs font-extrabold text-zinc-800 outline-hidden cursor-pointer hover:bg-zinc-200/50 px-1 py-0.5 rounded"
                        >
                          {["00","05","10","15","20","25","30","35","40","45","50","55"].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <div className="flex bg-zinc-200/50 p-0.5 rounded-lg border border-zinc-250 ml-1">
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseTimeStr(visitTime);
                              setVisitTime(`${current.hour}:${current.minute} AM`);
                            }}
                            className={`px-1.5 py-0.5 text-[9px] font-black rounded ${parseTimeStr(visitTime).ampm === 'AM' ? 'bg-white text-zinc-800 shadow-3xs' : 'text-zinc-400 hover:text-zinc-650'}`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseTimeStr(visitTime);
                              setVisitTime(`${current.hour}:${current.minute} PM`);
                            }}
                            className={`px-1.5 py-0.5 text-[9px] font-black rounded ${parseTimeStr(visitTime).ampm === 'PM' ? 'bg-white text-zinc-800 shadow-3xs' : 'text-zinc-400 hover:text-zinc-650'}`}
                          >
                            PM
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Recall Date Custom Calendar */}
              <div className="space-y-1 relative" ref={recallCalendarRef}>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Recall Date</label>
                <button
                  type="button"
                  id="recall-date-trigger"
                  onClick={() => {
                    if (!isRecallCalendarOpen && recallDate) {
                      const d = new Date(recallDate);
                      if (!isNaN(d.getTime())) {
                        setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                      }
                    }
                    setIsRecallCalendarOpen(p => !p);
                    setIsVisitCalendarOpen(false);
                  }}
                  className="w-full bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-700 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    {recallDate ? (
                      <span>
                        {new Date(recallDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="text-zinc-400 font-bold ml-1.5 mr-1.5">•</span>
                        <span className="text-teal-600 font-extrabold">{recallTime}</span>
                      </span>
                    ) : 'Select Date'}
                  </span>
                </button>

                {isRecallCalendarOpen && (
                  <div className="absolute top-full mt-2 left-0 z-50 w-72 bg-white border border-zinc-200 rounded-2xl shadow-xl p-3.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between mb-3 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const prevMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
                          setCalendarMonth(prevMonth);
                        }}
                        className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-600 cursor-pointer flex items-center justify-center border border-zinc-200"
                        title="Previous Month"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <div className="flex gap-1.5">
                        <select
                          value={calendarMonth.getMonth()}
                          onChange={(e) => {
                            const newMonth = new Date(calendarMonth.getFullYear(), parseInt(e.target.value), 1);
                            setCalendarMonth(newMonth);
                          }}
                          className="text-[11px] font-bold text-zinc-850 bg-zinc-50 border border-zinc-200 rounded-lg py-1 px-2 cursor-pointer outline-hidden focus:ring-1 focus:ring-zinc-400"
                        >
                          {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={calendarMonth.getFullYear()}
                          onChange={(e) => {
                            const newMonth = new Date(parseInt(e.target.value), calendarMonth.getMonth(), 1);
                            setCalendarMonth(newMonth);
                          }}
                          className="text-[11px] font-bold text-zinc-850 bg-zinc-50 border border-zinc-200 rounded-lg py-1 px-2 cursor-pointer outline-hidden focus:ring-1 focus:ring-zinc-400"
                        >
                          {Array.from({ length: 131 }, (_, i) => 1930 + i).map((yr) => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
                          setCalendarMonth(nextMonth);
                        }}
                        className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-600 cursor-pointer flex items-center justify-center border border-zinc-200"
                        title="Next Month"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-zinc-400 mb-1 tracking-wider uppercase">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {getCalendarDaysWithFiller(calendarMonth).map((cell, idx) => {
                        const isToday = new Date().toISOString().split('T')[0] === cell.dateStr;
                        const isSelected = recallDate === cell.dateStr;
                        return (
                          <button
                            key={`d-${idx}`}
                            type="button"
                            onClick={() => handleSelectFormDate(cell.day, 'recall', cell.monthOffset)}
                            className={`py-1 text-xs font-semibold rounded-lg hover:bg-zinc-100 cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-zinc-900 text-white hover:bg-zinc-800' 
                                : cell.isFiller
                                ? 'text-zinc-300 opacity-50 font-normal'
                                : isToday 
                                ? 'bg-teal-50 text-teal-700 border border-teal-150' 
                                : 'text-zinc-700'
                            }`}
                          >
                            {cell.day}
                          </button>
                        );
                      })}
                    </div>

                    {/* Time Picker Section */}
                    <div className="mt-4 pt-3.5 border-t border-zinc-100 flex flex-col items-center gap-1.5">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Time Selection</span>
                      <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1">
                        <select
                          value={parseTimeStr(recallTime).hour}
                          onChange={(e) => {
                            const current = parseTimeStr(recallTime);
                            setRecallTime(`${e.target.value}:${current.minute} ${current.ampm}`);
                          }}
                          className="bg-transparent text-xs font-extrabold text-zinc-800 outline-hidden cursor-pointer hover:bg-zinc-200/50 px-1 py-0.5 rounded"
                        >
                          {["01","02","03","04","05","06","07","08","09","10","11","12"].map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="text-zinc-400 font-extrabold text-xs">:</span>
                        <select
                          value={parseTimeStr(recallTime).minute}
                          onChange={(e) => {
                            const current = parseTimeStr(recallTime);
                            setRecallTime(`${current.hour}:${e.target.value} ${current.ampm}`);
                          }}
                          className="bg-transparent text-xs font-extrabold text-zinc-800 outline-hidden cursor-pointer hover:bg-zinc-200/50 px-1 py-0.5 rounded"
                        >
                          {["00","05","10","15","20","25","30","35","40","45","50","55"].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <div className="flex bg-zinc-200/50 p-0.5 rounded-lg border border-zinc-250 ml-1">
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseTimeStr(recallTime);
                              setRecallTime(`${current.hour}:${current.minute} AM`);
                            }}
                            className={`px-1.5 py-0.5 text-[9px] font-black rounded ${parseTimeStr(recallTime).ampm === 'AM' ? 'bg-white text-zinc-800 shadow-3xs' : 'text-zinc-400 hover:text-zinc-650'}`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseTimeStr(recallTime);
                              setRecallTime(`${current.hour}:${current.minute} PM`);
                            }}
                            className={`px-1.5 py-0.5 text-[9px] font-black rounded ${parseTimeStr(recallTime).ampm === 'PM' ? 'bg-white text-zinc-800 shadow-3xs' : 'text-zinc-400 hover:text-zinc-650'}`}
                          >
                            PM
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Recall Reason */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Recall Reason</label>
                <SmartAutocomplete
                  placeholder="e.g. Orthodontic Adjustment"
                  value={recallReason}
                  onChange={(val) => setRecallReason(val)}
                  onSelect={(item) => setRecallReason(item.name)}
                  masterKey="RECALL_REASONS_MASTER"
                  fallbackData={[
                    { name: 'Orthodontic Adjustment' },
                    { name: 'Prophylaxis Clean-up' },
                    { name: 'Decay Restoration View' },
                    { name: 'Extraction Post-Op Check' },
                    { name: 'Prosthodontics Fit Test' }
                  ]}
                  searchField="name"
                  inputClassName="w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:outline-hidden rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-700 transition-colors shadow-3xs"
                />
              </div>

            </div>
          </div>

          {/* Section 2: Interactive Service/Procedure Dynamic Rows */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-150 pb-1.5">
              <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                2. Service / Dental Procedure Details
              </h4>
              <button
                type="button"
                onClick={handleAddServiceRow}
                className="bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3 stroke-[2.5px]" /> Add Service Row
              </button>
            </div>

            <div className="border border-zinc-200 rounded-2xl shadow-3xs bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-zinc-400 tracking-wider">
                  <tr>
                    <th className="p-3 w-5/12 rounded-tl-2xl">Service / Procedure</th>
                    <th className="p-3 w-2/12">Teeth</th>
                    <th className="p-3 w-2/12">Unit Price</th>
                    <th className="p-3 w-2/12">Discount Amount</th>
                    <th className="p-3 w-2/12 text-right">Net Total</th>
                    <th className="p-3 w-12 text-center rounded-tr-2xl"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150">
                  {formItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="p-2.5">
                        <SmartAutocomplete
                          placeholder="e.g. Oral Prophylaxis"
                          value={item.serviceProcedure}
                          onChange={(val) => handleUpdateServiceField(item.id, 'serviceProcedure', val)}
                          onSelect={(s) => handleSelectServiceForFormItem(item.id, s)}
                          masterKey="DENTAL_SERVICES_MASTER"
                          fallbackData={[
                            { name: 'Oral Prophylaxis', amount: 1500 },
                            { name: 'Tooth Extraction', amount: 1200 },
                            { name: 'Composite Restoration', amount: 1000 },
                            { name: 'Orthodontic Adjustment', amount: 2000 },
                            { name: 'Dental Braces Consultation', amount: 500 }
                          ]}
                          searchField="name"
                          inputClassName="w-full bg-white border-2 border-zinc-300 hover:border-zinc-450 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-800 transition-all shadow-3xs"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.teeth}
                          onChange={(e) => handleUpdateServiceField(item.id, 'teeth', e.target.value)}
                          placeholder="e.g. 18 / Upper"
                          className="w-full bg-white border-2 border-zinc-300 hover:border-zinc-450 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-800 transition-all shadow-3xs"
                        />
                      </td>
                      <td className="p-2.5">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2.5 text-zinc-400 font-bold">₱</span>
                          <input
                            type="number"
                            value={item.unitPrice || ''}
                            onChange={(e) => handleUpdateServiceField(item.id, 'unitPrice', e.target.value)}
                            placeholder="0"
                            className="w-full bg-white border-2 border-zinc-300 hover:border-zinc-450 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-bold text-zinc-800 transition-all shadow-3xs"
                          />
                        </div>
                      </td>
                      <td className="p-2.5">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2.5 text-zinc-400 font-bold">₱</span>
                          <input
                            type="number"
                            value={item.discountAmount || ''}
                            onChange={(e) => handleUpdateServiceField(item.id, 'discountAmount', e.target.value)}
                            placeholder="0"
                            className="w-full bg-white border-2 border-zinc-300 hover:border-zinc-450 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-bold text-zinc-800 transition-all shadow-3xs"
                          />
                        </div>
                      </td>
                      <td className="p-2.5 text-right font-extrabold text-zinc-900 text-xs">
                        ₱{item.netTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveServiceRow(item.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {formItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-400 italic">
                        No services added yet. Click "+ Add Service Row" above to append treatments.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total accumulation block */}
            <div className="flex justify-end pt-2">
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 w-full max-w-sm space-y-2.5 shadow-3xs">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Total Accumulation</span>
                <div className="flex items-center justify-between text-xs text-zinc-650">
                  <span>Total Cost:</span>
                  <span className="font-bold text-zinc-900">₱{accumulation.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-650">
                  <span>Discount Amount:</span>
                  <span className="font-bold text-red-600">- ₱{accumulation.discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-zinc-200 pt-2 flex items-center justify-between text-sm font-extrabold text-zinc-900">
                  <span>Net Cost:</span>
                  <span className="text-teal-600">₱{accumulation.netCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Remarks Notes */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider pb-1.5 border-b border-zinc-150">
              3. Remarks Notes (Type '/' for templates)
            </h4>
            <textarea
              placeholder="Type any detailed clinical comments, surgical reactions, or general treatment observations..."
              value={remarks}
              onChange={(e) => handleTextareaChange(e.target.value, 'progressNoteRemarks')}
              className="w-full h-44 md:h-52 rounded-2xl border border-zinc-200 p-3.5 text-xs outline-hidden text-zinc-800 focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950"
            />
          </div>

          {/* Section 4: Attachments File Upload */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider pb-1.5 border-b border-zinc-150">
              4. Upload Clinical Attachments
            </h4>
            
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-zinc-900 bg-zinc-50' 
                  : 'border-zinc-200 hover:border-zinc-400 bg-white'
              }`}
            >
              <input 
                type="file" 
                id="clinical-file-input" 
                multiple 
                onChange={handleFileSelect} 
                className="hidden" 
              />
              <label htmlFor="clinical-file-input" className="cursor-pointer space-y-2 block">
                <Upload className="w-8 h-8 text-zinc-350 mx-auto animate-bounce" />
                <p className="text-xs font-bold text-zinc-800">Drag & drop files here, or click to browse</p>
                <p className="text-[10px] text-zinc-400 font-medium">Supports JPG, PNG, PDF, DOC (Max 15MB)</p>
              </label>
            </div>

            {/* List of uploaded files */}
            {uploadedFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs font-semibold">
                    <span className="text-zinc-700 truncate max-w-[200px]">{file.name} ({file.size})</span>
                    <button 
                      onClick={() => handleRemoveUploadedFile(index)}
                      className="text-red-500 hover:text-red-700 font-extrabold cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Signature Drawing Canvas or Upload */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider pb-1.5 border-b border-zinc-150">
              5. Patient or Legal Guardian Signature
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Write Signature Canvas */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Write / Draw Signature</span>
                <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-zinc-50 relative">
                  <canvas
                    ref={canvasRef}
                    width={350}
                    height={120}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    className="w-full h-[120px] bg-white cursor-crosshair"
                  />
                  <button
                    type="button"
                    onClick={handleClearSignature}
                    className="absolute bottom-2 right-2 bg-zinc-900/10 text-zinc-800 hover:bg-zinc-900/20 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
                  >
                    Clear Signature
                  </button>
                </div>
              </div>

              {/* Upload Signature Image */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Or Upload Signature Image</span>
                <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-4 text-center h-[120px] flex flex-col justify-center bg-white hover:border-zinc-400 transition-colors relative">
                  <input
                    type="file"
                    accept="image/*"
                    id="signature-image-upload"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                  <label htmlFor="signature-image-upload" className="cursor-pointer space-y-1 block">
                    <PenTool className="w-5 h-5 text-zinc-400 mx-auto" />
                    <p className="text-xs font-bold text-zinc-800">Browse Signature Image</p>
                  </label>
                </div>
              </div>

            </div>

            {/* Signature Preview if generated */}
            {signatureData && (
              <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl border border-emerald-150 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                  <span>Signature attached via <strong>{signatureType}</strong> format.</span>
                </div>
                <img src={signatureData} alt="Signature Preview" className="h-8 max-w-[120px] object-contain border bg-white rounded-md px-1" />
              </div>
            )}
          </div>

          </div>

          {/* Section 6: Action buttons (Draft, Cancel, Save) - Fixed Sticky Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-zinc-200 p-6 md:p-8 bg-zinc-50/90 backdrop-blur-xs shrink-0">
            <button
              onClick={() => {
                showConfirm({
                  title: "Discard Changes",
                  message: "Are you sure you want to cancel? Any unsaved changes made to this progress note form will be lost.",
                  confirmText: "Discard Changes",
                  cancelText: "Continue Editing",
                  variant: "warning",
                  onConfirm: () => {
                    setIsFormOpen(false);
                  }
                });
              }}
              className="w-full sm:w-auto bg-white border border-zinc-250 hover:bg-zinc-100 text-zinc-700 text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSaveProgressNote('Draft')}
              className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-colors"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSaveProgressNote('Saved')}
              className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-sm transition-colors"
            >
              Save Progress Note
            </button>
          </div>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE TAB CONTENT */}
      {activeTab === 'TREATMENT_PLANS' ? (
        <div className="space-y-6">
          
          {/* Sub-toolbar inside Treatment Plans tab */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4.5 rounded-2xl border border-zinc-200/80 shadow-3xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-zinc-100 text-zinc-800 rounded-lg">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-zinc-900">Clinical Progress Notes</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search Progress Notes */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={treatmentPlanSearchQuery}
                  onChange={(e) => {
                    setTreatmentPlanSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search Treatment Plans..."
                  className="pl-8.5 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-xs w-48"
                />
              </div>

              {/* Refresh data button */}
              <button
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className={`inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer transition-colors disabled:opacity-40`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-zinc-400' : 'text-zinc-500'}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </button>

              {/* Export report button */}
              <button
                onClick={handleExportReport}
                className="inline-flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-zinc-500" /> Export Report
              </button>

              {/* New Progress Note Button */}
              <button
                onClick={handleOpenNewNoteForm}
                className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5px]" /> New Progress Note
              </button>
            </div>
          </div>

          {/* Toast indicating refreshed data */}
          {refreshSuccess && (
            <div className="bg-emerald-55 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in duration-200 bg-zinc-900">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Clinical progress notes and odontograms synchronized successfully with the secure server database session.
            </div>
          )}

          {/* Progress Notes Master Table */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-visible min-h-[320px]">
            <div className="overflow-x-auto overflow-y-visible pb-16">
              <table className="w-full text-left border-collapse" id="clinical-notes-table">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200">
                    <th className="py-4.5 px-6 w-36">Date</th>
                    <th className="py-4.5 px-6">Progress Note & Clinical Remarks</th>
                    <th className="py-4.5 px-6 w-52">Attachments</th>
                    <th className="py-4.5 px-6 w-40 text-right">Net Treatment Cost</th>
                    <th className="py-4.5 px-6 w-24 text-center">Status</th>
                    <th className="py-4.5 px-6 w-14 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700 font-medium">
                  {paginatedNotes.map((note) => (
                    <tr key={note.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-5 px-6 font-bold text-zinc-500 whitespace-nowrap">
                        <div className="text-zinc-850 font-extrabold">{new Date(note.visitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        {note.visitTime && <div className="text-[10px] text-zinc-400 font-bold mt-0.5">{note.visitTime}</div>}
                      </td>
                      <td className="py-5 px-6 space-y-1.5">
                        <div className="font-extrabold text-zinc-900 uppercase tracking-wide">
                          {note.recallReason}
                        </div>
                        {note.remarks ? (
                          <p className="text-zinc-600 leading-relaxed font-medium whitespace-pre-wrap">
                            {note.remarks}
                          </p>
                        ) : (
                          <span className="text-zinc-400 italic">No notes documented.</span>
                        )}
                        {/* Service tags nested inside progress notes */}
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {note.items.map((srv, idx) => (
                            <span key={idx} className="text-[9px] font-bold uppercase bg-zinc-100 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded-md">
                              {srv.serviceProcedure} ({srv.teeth})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex flex-wrap gap-1.5">
                          {note.attachments && note.attachments.length > 0 ? (
                            note.attachments.map((file, fIdx) => (
                              <a 
                                key={fIdx} 
                                href={file.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-600 font-bold text-[10px] truncate max-w-[120px]"
                              >
                                📎 {file.name}
                              </a>
                            ))
                          ) : (
                            <span className="text-zinc-400 italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="py-5 px-6 text-right font-extrabold text-zinc-900">
                        ₱{note.netCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-5 px-6 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          note.status === 'Saved' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {note.status}
                        </span>
                      </td>

                      {/* 3 dots action menu column */}
                      <td className="py-5 px-6 text-center relative">
                        <button
                          onClick={() => setActiveRowOptionId(activeRowOptionId === note.id ? null : note.id)}
                          className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-800 cursor-pointer relative z-40"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeRowOptionId === note.id && (
                          <>
                            {/* Transparent overlay for click-outside closure */}
                            <div 
                              className="fixed inset-0 z-30 cursor-default"
                              onClick={() => setActiveRowOptionId(null)}
                            />
                            <div className="absolute right-[45px] -top-1.5 z-40 w-36 bg-white border border-zinc-200 rounded-xl shadow-lg p-1.5 text-left font-bold text-[11px] animate-in fade-in duration-100">
                              <button
                                onClick={() => handleEditNoteForm(note)}
                                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-zinc-700 hover:bg-zinc-50 rounded-lg cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-zinc-400" /> Edit Note
                              </button>
                              <button
                                onClick={() => handleDuplicateNote(note)}
                                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-teal-650 hover:bg-zinc-50 rounded-lg cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-teal-500" /> Duplicate
                              </button>
                              <button
                                onClick={() => handlePrintNote(note)}
                                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-zinc-700 hover:bg-zinc-50 rounded-lg cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5 text-zinc-400" /> Print
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer border-t border-zinc-100 pt-1.5 mt-1"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}

                  {progressNotes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400 italic">
                        <div className="max-w-sm mx-auto space-y-1.5">
                          <FileText className="w-8 h-8 text-zinc-300 mx-auto" />
                          <p className="text-xs font-bold">No progress notes logged yet</p>
                          <p className="text-[11px] font-medium text-zinc-400 leading-normal">
                            Click "+ New Progress Note" above to register clinical visits and billing plans.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination for progress notes */}
          {progressNotes.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs font-semibold py-4 px-6 bg-zinc-50 border-t border-zinc-200 rounded-b-2xl gap-4">
              <span className="text-zinc-500">
                Showing <strong className="text-zinc-800">{Math.min(progressNotes.length, (currentPage - 1) * notesPerPage + 1)}-{Math.min(progressNotes.length, currentPage * notesPerPage)}</strong> of <strong className="text-zinc-800">{progressNotes.length}</strong> progress notes
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border-2 border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8.5 h-8.5 rounded-xl border-2 font-extrabold text-xs transition-all flex items-center justify-center cursor-pointer ${
                        currentPage === pageNum
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border-2 border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-45 disabled:pointer-events-none transition-all cursor-pointer font-bold text-zinc-700"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      ) : activeTab === 'RECOMMENDATIONS' ? (
        <SmartRecommendationEngine 
          patient={record} 
          toothData={toothData} 
          onAddProgressNote={(newNote) => {
            onUpdatePatient({
              ...record,
              progressNotes: [newNote, ...(record.progressNotes || [])]
            });
          }}
        />
      ) : (
        tabContent[activeTab as keyof typeof tabContent]
      )}



      {isEditProfileOpen && (
        <div 
          className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden"
          onClick={() => setIsEditProfileOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 p-6">
              <div>
                <h3 className="text-base font-extrabold text-zinc-900 tracking-tight font-display flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-600" /> Update Patient Profile
                </h3>
                <p className="text-xs text-zinc-400">Personal Profile and alternative identifiers.</p>
              </div>
              <button 
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-850 hover:bg-zinc-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider pb-1.5 border-b border-zinc-100">
                  Personal Profile
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Lastname */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Lastname</label>
                    <input 
                      type="text" 
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full bg-white border-2 border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-all shadow-3xs uppercase"
                    />
                  </div>

                  {/* Firstname */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Firstname</label>
                    <input 
                      type="text" 
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full bg-white border-2 border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-all shadow-3xs uppercase"
                    />
                  </div>

                  {/* Middlename */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Middlename</label>
                    <input 
                      type="text" 
                      value={editMiddleName}
                      onChange={(e) => setEditMiddleName(e.target.value)}
                      className="w-full bg-white border-2 border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-all shadow-3xs uppercase"
                    />
                  </div>

                  {/* Extension Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Extension Name</label>
                    <input 
                      type="text" 
                      value={editExt}
                      onChange={(e) => setEditExt(e.target.value)}
                      placeholder="e.g. Jr., Sr., III"
                      className="w-full bg-white border-2 border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-all shadow-3xs uppercase"
                    />
                  </div>

                  {/* Nickname */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Nickname</label>
                    <input 
                      type="text" 
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      className="w-full bg-white border-2 border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-all shadow-3xs uppercase"
                    />
                  </div>

                  {/* Birthdate */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Birthdate</label>
                    <input 
                      type="text" 
                      value={editBirthdate}
                      onChange={(e) => setEditBirthdate(e.target.value)}
                      placeholder="MM/DD/YYYY or YYYY-MM-DD"
                      className="w-full bg-white border-2 border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-all shadow-3xs"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Gender</label>
                    <select
                      value={editSex}
                      onChange={(e) => setEditSex(e.target.value as any)}
                      className="w-full bg-white border-2 border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-all shadow-3xs cursor-pointer"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Mobile */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Mobile</label>
                    <input 
                      type="text" 
                      value={editMobile}
                      onChange={(e) => setEditMobile(e.target.value)}
                      className="w-full bg-white border-2 border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-all shadow-3xs"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Email</label>
                    <input 
                      type="email" 
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-white border-2 border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-all shadow-3xs"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Address</label>
                    <textarea 
                      rows={2}
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full bg-white border-2 border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-all shadow-3xs resize-none uppercase"
                    />
                  </div>

                  {/* Alternate Patient IDs */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Alternate Patient IDs</label>
                    <input 
                      type="text" 
                      value={editAlternateIds}
                      onChange={(e) => setEditAlternateIds(e.target.value)}
                      placeholder="Enter comma-separated patient IDs (e.g., 101, 202, 303)"
                      className="w-full bg-white border-2 border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 focus:outline-none rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-all shadow-3xs font-mono"
                    />
                    <p className="text-[10px] text-zinc-400 font-medium">Enter comma-separated patient IDs that are alternate to this patient</p>
                  </div>

                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-zinc-100 p-6 flex items-center justify-end gap-3 bg-zinc-50">
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="px-4.5 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Patient Recall & Consult Modal */}
      {isRecallModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-xs z-[45] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 p-6 shrink-0 bg-zinc-50/50">
              <div>
                <h3 className="text-base font-extrabold text-zinc-900 tracking-tight font-display">
                  {recallIdBeingEdited ? 'Edit Clinical Patient Recall / Consult' : 'New Patient Recall / Consult'}
                </h3>
                <p className="text-xs text-zinc-400">Complete clinical checkups, Odontogram teeth charting, and screening diagnostics.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsRecallModalOpen(false)} 
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Patient Basic History Form row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-200/60">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Present Medical Condition</label>
                  <SmartAutocomplete
                    placeholder="Describe condition (e.g. Hypertension)"
                    value={presentMedicalCondition}
                    onChange={setPresentMedicalCondition}
                    onSelect={(c) => setPresentMedicalCondition(c.name)}
                    masterKey="DENTAL_MEDICAL_CONDITIONS_MASTER"
                    fallbackData={[
                      { name: 'Hypertension' },
                      { name: 'Diabetes Mellitus' },
                      { name: 'Asthma' },
                      { name: 'Heart Disease' },
                      { name: 'Bleeding Disorders' }
                    ]}
                    searchField="name"
                    inputClassName="w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Present Medications</label>
                  <input
                    type="text"
                    value={presentMedications}
                    onChange={(e) => setPresentMedications(e.target.value)}
                    placeholder="Active medications"
                    className="w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Allergies to Medications</label>
                  <input
                    type="text"
                    value={allergiesToMedications}
                    onChange={(e) => setAllergiesToMedications(e.target.value)}
                    placeholder="Allergies (e.g. Penicillin)"
                    className="w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Recall Date</label>
                  <input
                    type="text"
                    value={recallDateInput}
                    onChange={(e) => setRecallDateInput(e.target.value)}
                    className="w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-800 font-semibold focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Extraoral Examination</label>
                  <input
                    type="text"
                    value={extraoralExamination}
                    onChange={(e) => setExtraoralExamination(e.target.value)}
                    placeholder="Asymmetry, lymph nodes, joints..."
                    className="w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-800 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Tab & Attachment Buttons Row */}
              <div className="flex items-center gap-3 border border-zinc-200 rounded-xl p-2 bg-zinc-50/50">
                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg px-4 py-1.5 text-xs font-black text-zinc-800 shadow-xs">
                  <span>Chart</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-extrabold text-teal-600 hover:text-teal-700 cursor-pointer">
                  <span>Draw from Teeth Model</span>
                  <span className="text-red-500 font-extrabold text-[10px]">❌</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#009688] hover:bg-[#00796b] text-white text-[11px] font-black rounded-lg shadow-xs cursor-pointer transition-colors uppercase"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Add Image
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#00bcd4] hover:bg-[#0097a7] text-white text-[11px] font-black rounded-lg shadow-xs cursor-pointer transition-colors uppercase"
                  >
                    <Upload className="w-3.5 h-3.5 stroke-[3px]" /> Upload Patient Chart
                  </button>
                </div>
              </div>

              {/* Charting Mode and Tool selector row */}
              <div className="border border-zinc-200 rounded-2xl p-5 space-y-4 bg-white shadow-3xs">
                {/* Mode Selector Centered */}
                <div className="flex justify-center w-full">
                  <div className="flex border border-[#00acc1] rounded-md overflow-hidden text-[10px] font-black tracking-wider uppercase shadow-3xs">
                    <button
                      type="button"
                      onClick={() => setInlineChartingMode('inline')}
                      className={`px-4 py-2 cursor-pointer transition-colors ${inlineChartingMode === 'inline' ? 'bg-[#00acc1] text-white' : 'bg-white text-[#00acc1]'}`}
                    >
                      Inline Charting
                    </button>
                    <button
                      type="button"
                      onClick={() => setInlineChartingMode('multiple')}
                      className={`px-4 py-2 cursor-pointer border-l border-[#00acc1] transition-colors ${inlineChartingMode === 'multiple' ? 'bg-[#00acc1] text-white' : 'bg-white text-[#00acc1]'}`}
                    >
                      Charting w/ Multiple Selection
                    </button>
                  </div>
                </div>

                {/* Tooth Status Toolbar */}
                <div className="flex items-center justify-start gap-3 border-t border-zinc-100 pt-3 select-none">
                  <span className="text-sm font-bold text-zinc-500">Tooth Status:</span>
                  <div className="flex items-center gap-2">
                    {getToothStatuses().map((stat: any) => {
                      const isActive = isStatusEquivalent(activeToothStatus, stat.color) || 
                                       isStatusEquivalent(activeToothStatus, stat.code) || 
                                       (stat.code === 'cv' && isStatusEquivalent(activeToothStatus, 'red')) || 
                                       (stat.code === 'ok' && isStatusEquivalent(activeToothStatus, 'blue'));
                      return (
                        <button
                          key={stat.id}
                          type="button"
                          onClick={() => setActiveToothStatus(stat.color)}
                          className={`px-3 py-1.5 rounded text-[11px] font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs`}
                          style={{
                            backgroundColor: isActive ? stat.color : '#ffffff',
                            color: isActive ? '#ffffff' : stat.color,
                            border: `1px solid ${stat.color}`,
                            boxShadow: isActive ? `0 0 0 2px ${stat.color}40` : 'none'
                          }}
                        >
                          <span className="text-[10px]">{stat.code === 'cv' ? '❌' : stat.code === 'ok' ? '✔' : '⭐'}</span> {stat.name}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setActiveToothStatus('gray')}
                      className={`px-3 py-1.5 rounded text-[11px] font-extrabold bg-[#78909c] hover:bg-[#607d8b] text-white shadow-3xs transition-all cursor-pointer ${activeToothStatus === 'gray' ? 'ring-2 ring-zinc-300' : ''}`}
                    >
                      CLEAR
                    </button>
                  </div>
                </div>

                {/* Odontogram Grid (NO horizontal scrolling / Compact Grid alignment) */}
                <div className="flex flex-col items-center w-full select-none pt-4 border-t border-zinc-150">
                  <span className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-1">STATUS</span>
                  
                  <div className="flex items-center justify-between w-full max-w-[736px] px-2 mb-1.5 text-[10px] font-black text-zinc-450 tracking-wider">
                    <span>RIGHT</span>
                    <span>LEFT</span>
                  </div>

                  <div className="w-full max-w-[736px] bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col gap-5 shadow-3xs">
                    {/* Row 1: Primary Upper (55-51, 61-65) - Text boxes ABOVE tooth numbers */}
                    <div className="flex justify-center items-center gap-8">
                      {/* RIGHT SIDE: 8 columns (3 empty, 5 teeth) */}
                      <div className="grid grid-cols-8 gap-1.5">
                        <div className="w-10 h-[76px]" /> {/* Empty 18 column placeholder */}
                        <div className="w-10 h-[76px]" /> {/* Empty 17 column placeholder */}
                        <div className="w-10 h-[76px]" /> {/* Empty 16 column placeholder */}
                        {renderToothCell('55', 'top')}
                        {renderToothCell('54', 'top')}
                        {renderToothCell('53', 'top')}
                        {renderToothCell('52', 'top')}
                        {renderToothCell('51', 'top')}
                      </div>
                      
                      {/* Midline vertical line */}
                      <div className="w-[1.5px] bg-zinc-200 self-stretch min-h-[76px]" />
                      
                      {/* LEFT SIDE: 8 columns (5 teeth, 3 empty) */}
                      <div className="grid grid-cols-8 gap-1.5">
                        {renderToothCell('61', 'top')}
                        {renderToothCell('62', 'top')}
                        {renderToothCell('63', 'top')}
                        {renderToothCell('64', 'top')}
                        {renderToothCell('65', 'top')}
                        <div className="w-10 h-[76px]" /> {/* Empty 26 column placeholder */}
                        <div className="w-10 h-[76px]" /> {/* Empty 27 column placeholder */}
                        <div className="w-10 h-[76px]" /> {/* Empty 28 column placeholder */}
                      </div>
                    </div>

                    {/* Row 2: Permanent Upper (18-11, 21-28) - Text boxes ABOVE tooth numbers */}
                    <div className="flex justify-center items-center gap-8">
                      {/* RIGHT SIDE: 8 columns (8 teeth) */}
                      <div className="grid grid-cols-8 gap-1.5">
                        {renderToothCell('18', 'top')}
                        {renderToothCell('17', 'top')}
                        {renderToothCell('16', 'top')}
                        {renderToothCell('15', 'top')}
                        {renderToothCell('14', 'top')}
                        {renderToothCell('13', 'top')}
                        {renderToothCell('12', 'top')}
                        {renderToothCell('11', 'top')}
                      </div>
                      
                      {/* Midline vertical line */}
                      <div className="w-[1.5px] bg-zinc-200 self-stretch min-h-[76px]" />
                      
                      {/* LEFT SIDE: 8 columns (8 teeth) */}
                      <div className="grid grid-cols-8 gap-1.5">
                        {renderToothCell('21', 'top')}
                        {renderToothCell('22', 'top')}
                        {renderToothCell('23', 'top')}
                        {renderToothCell('24', 'top')}
                        {renderToothCell('25', 'top')}
                        {renderToothCell('26', 'top')}
                        {renderToothCell('27', 'top')}
                        {renderToothCell('28', 'top')}
                      </div>
                    </div>

                    {/* Row 3: Permanent Lower (48-41, 31-38) - Text boxes BELOW tooth numbers */}
                    <div className="flex justify-center items-center gap-8 border-t border-zinc-100 pt-5">
                      {/* RIGHT SIDE: 8 columns (8 teeth) */}
                      <div className="grid grid-cols-8 gap-1.5">
                        {renderToothCell('48', 'bottom')}
                        {renderToothCell('47', 'bottom')}
                        {renderToothCell('46', 'bottom')}
                        {renderToothCell('45', 'bottom')}
                        {renderToothCell('44', 'bottom')}
                        {renderToothCell('43', 'bottom')}
                        {renderToothCell('42', 'bottom')}
                        {renderToothCell('41', 'bottom')}
                      </div>
                      
                      {/* Midline vertical line */}
                      <div className="w-[1.5px] bg-zinc-200 self-stretch min-h-[76px]" />
                      
                      {/* LEFT SIDE: 8 columns (8 teeth) */}
                      <div className="grid grid-cols-8 gap-1.5">
                        {renderToothCell('31', 'bottom')}
                        {renderToothCell('32', 'bottom')}
                        {renderToothCell('33', 'bottom')}
                        {renderToothCell('34', 'bottom')}
                        {renderToothCell('35', 'bottom')}
                        {renderToothCell('36', 'bottom')}
                        {renderToothCell('37', 'bottom')}
                        {renderToothCell('38', 'bottom')}
                      </div>
                    </div>

                    {/* Row 4: Primary Lower (85-81, 71-75) - Text boxes BELOW tooth numbers */}
                    <div className="flex justify-center items-center gap-8">
                      {/* RIGHT SIDE: 8 columns (3 empty, 5 teeth) */}
                      <div className="grid grid-cols-8 gap-1.5">
                        <div className="w-10 h-[76px]" /> {/* Empty 48 column placeholder */}
                        <div className="w-10 h-[76px]" /> {/* Empty 47 column placeholder */}
                        <div className="w-10 h-[76px]" /> {/* Empty 46 column placeholder */}
                        {renderToothCell('85', 'bottom')}
                        {renderToothCell('84', 'bottom')}
                        {renderToothCell('83', 'bottom')}
                        {renderToothCell('82', 'bottom')}
                        {renderToothCell('81', 'bottom')}
                      </div>
                      
                      {/* Midline vertical line */}
                      <div className="w-[1.5px] bg-zinc-200 self-stretch min-h-[76px]" />
                      
                      {/* LEFT SIDE: 8 columns (5 teeth, 3 empty) */}
                      <div className="grid grid-cols-8 gap-1.5">
                        {renderToothCell('71', 'bottom')}
                        {renderToothCell('72', 'bottom')}
                        {renderToothCell('73', 'bottom')}
                        {renderToothCell('74', 'bottom')}
                        {renderToothCell('75', 'bottom')}
                        <div className="w-10 h-[76px]" /> {/* Empty 36 column placeholder */}
                        <div className="w-10 h-[76px]" /> {/* Empty 37 column placeholder */}
                        <div className="w-10 h-[76px]" /> {/* Empty 38 column placeholder */}
                      </div>
                    </div>
                  </div>

                  {/* Elegant dynamic status legend */}
                  <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 bg-zinc-50 border border-zinc-150 rounded-2xl p-3.5 max-w-[736px] w-full text-xs shadow-3xs">
                    <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px] mr-1">Status Legend:</span>
                    {getToothStatuses().map((stat: any) => (
                      <div key={stat.id} className="flex items-center gap-1.5 font-bold text-zinc-700">
                        <span className="w-3 h-3 rounded-full border border-zinc-300" style={{ backgroundColor: stat.color }} />
                        <span>{stat.name}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 font-bold text-zinc-700">
                      <span className="w-3 h-3 rounded-full border border-zinc-300 bg-white" />
                      <span>Clear / Healthy</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Questionnaires & Clinical Indicators (Predental, Occlusion, Appliance, TMD) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 border border-zinc-200 rounded-2xl p-6 bg-white shadow-3xs">
                {/* Predental Screening */}
                <div className="space-y-2.5">
                  <h5 className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider border-b border-zinc-100 pb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" /> Predental Screening
                  </h5>
                  <div className="space-y-2 text-xs text-zinc-650 font-semibold">
                    {getPeriodontalScreenings().map((scr: any) => (
                      <label key={scr.id} className="flex items-center gap-2 cursor-pointer hover:text-zinc-900">
                        <input
                          type="checkbox"
                          checked={getScreeningState(scr.name)}
                          onChange={(e) => setScreeningState(scr.name, e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 border-zinc-300"
                        />
                        <span>{scr.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Occlusion */}
                <div className="space-y-2.5">
                  <h5 className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider border-b border-zinc-100 pb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" /> Occlusion
                  </h5>
                  <div className="space-y-2 text-xs text-zinc-650 font-semibold">
                    {getRecallOcclusions().map((occ: any) => (
                      <label key={occ.id} className="flex items-center gap-2 cursor-pointer hover:text-zinc-900">
                        <input
                          type="checkbox"
                          checked={getOcclusionState(occ.name)}
                          onChange={(e) => setOcclusionState(occ.name, e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 border-zinc-300"
                        />
                        <span>{occ.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Appliance */}
                <div className="space-y-2.5">
                  <h5 className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider border-b border-zinc-100 pb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" /> Appliance
                  </h5>
                  <div className="space-y-2 text-xs text-zinc-650 font-semibold">
                    {getRecallAppliances().map((app: any) => (
                      <label key={app.id} className="flex items-center gap-2 cursor-pointer hover:text-zinc-900">
                        <input
                          type="checkbox"
                          checked={getApplianceState(app.name)}
                          onChange={(e) => setApplianceState(app.name, e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 border-zinc-300"
                        />
                        <span>{app.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* TMD */}
                <div className="space-y-2.5">
                  <h5 className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider border-b border-zinc-100 pb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" /> TMD
                  </h5>
                  <div className="space-y-2 text-xs text-zinc-650 font-semibold">
                    {getRecallTmds().map((tmdItem: any) => (
                      <label key={tmdItem.id} className="flex items-center gap-2 cursor-pointer hover:text-zinc-900">
                        <input
                          type="checkbox"
                          checked={getTmdState(tmdItem.name)}
                          onChange={(e) => setTmdState(tmdItem.name, e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 border-zinc-300"
                        />
                        <span>{tmdItem.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recall Summary Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Recall Summary Notes / Clinical Impression</label>
                <textarea
                  value={recallSummaryText}
                  onChange={(e) => setRecallSummaryText(e.target.value)}
                  placeholder="Record summary remarks, diagnostic conclusions, or patient recall advice..."
                  rows={3}
                  className="w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800 font-medium leading-relaxed shadow-3xs"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-zinc-100 p-6 flex items-center justify-end gap-3 bg-zinc-50 shrink-0 select-none">
              <button
                type="button"
                onClick={() => setIsRecallModalOpen(false)}
                className="px-5 py-2 bg-[#f88e74] hover:bg-[#e57d64] text-white rounded-lg text-xs font-black shadow-xs transition-colors cursor-pointer uppercase flex items-center gap-1.5"
              >
                <span>❌</span> Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecall}
                className="px-6 py-2 bg-[#00acc1] hover:bg-[#0097a7] text-white rounded-lg text-xs font-black shadow-xs transition-colors cursor-pointer uppercase flex items-center gap-1.5"
              >
                <span>✔</span> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Floating Popover for Tooth Options (completely bypasses layout clipping) */}
      {isRecallModalOpen && selectedToothForOptions && popoverCoords && (
        <>
          {/* Backdrop layer */}
          <div 
            className="fixed inset-0 z-[100] bg-transparent cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedToothForOptions(null);
              setPopoverCoords(null);
            }}
          />
          {/* Floating Popover panel */}
          <div 
            className="fixed z-[101] w-[310px] bg-white border-2 border-zinc-200 shadow-2xl rounded-2xl p-4 text-center space-y-3.5 animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: popoverCoords.position === 'top' 
                ? `${popoverCoords.top - 8}px` 
                : `${popoverCoords.top + 32}px`,
              left: `${popoverCoords.left}px`,
              transform: popoverCoords.position === 'top' 
                ? 'translate(-50%, -100%)' 
                : 'translate(-50%, 0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
              <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Tooth {selectedToothForOptions} Options</span>
              <button 
                type="button"
                onClick={() => {
                  setSelectedToothForOptions(null);
                  setPopoverCoords(null);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Popover Body */}
            <div className="space-y-3 text-left">
              {/* Xray & Surgery Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[9px] text-zinc-400 font-extrabold block uppercase tracking-wider mb-1">Xray</span>
                  <div className="flex flex-wrap gap-1">
                    {getToothXrays().map(opt => {
                      const toothOpts = toothData[selectedToothForOptions]?.options || [];
                      const selected = toothOpts.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleToggleOption(selectedToothForOptions, opt)}
                          className={`px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase transition-colors cursor-pointer ${selected ? 'bg-teal-600 text-white border-teal-700' : 'bg-white text-teal-600 border-teal-200 hover:bg-teal-50'}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-400 font-extrabold block uppercase tracking-wider mb-1">Surgery</span>
                  <div className="flex flex-wrap gap-1">
                    {getToothSurgeries().map(opt => {
                      const toothOpts = toothData[selectedToothForOptions]?.options || [];
                      const selected = toothOpts.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleToggleOption(selectedToothForOptions, opt)}
                          className={`px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase transition-colors cursor-pointer ${selected ? 'bg-teal-600 text-white border-teal-700' : 'bg-white text-teal-600 border-teal-200 hover:bg-teal-50'}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Restoration & Prostodontics */}
              <div>
                <span className="text-[9px] text-zinc-400 font-extrabold block uppercase tracking-wider mb-1">Restoration & Prostodontics</span>
                <div className="flex flex-wrap gap-1">
                  {getToothProsthodontics().map(opt => {
                    const toothOpts = toothData[selectedToothForOptions]?.options || [];
                    const selected = toothOpts.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleToggleOption(selectedToothForOptions, opt)}
                        className={`px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase transition-colors cursor-pointer ${selected ? 'bg-teal-600 text-white border-teal-700' : 'bg-white text-teal-600 border-teal-200 hover:bg-teal-50'}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditions */}
              <div>
                <span className="text-[9px] text-zinc-400 font-extrabold block uppercase tracking-wider mb-1">Conditions</span>
                <div className="flex flex-wrap gap-1">
                  {getToothConditions().map(opt => {
                    const toothOpts = toothData[selectedToothForOptions]?.options || [];
                    const selected = toothOpts.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleToggleOption(selectedToothForOptions, opt)}
                        className={`px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase transition-colors cursor-pointer ${selected ? 'bg-teal-600 text-white border-teal-700' : 'bg-white text-teal-600 border-teal-200 hover:bg-teal-50'}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Popover Footer */}
            <div className="border-t border-zinc-100 pt-2 flex items-center justify-between text-[9px] text-zinc-400">
              <span className="font-bold text-zinc-500">Selected: {(toothData[selectedToothForOptions]?.options || []).length}/4</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedToothForOptions(null);
                  setPopoverCoords(null);
                }}
                className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[9px] font-bold transition-colors cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}



      {/* --- NEW PRESCRIPTION MODAL --- */}
      {isPrescriptionModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-fade-in">
          <div 
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-150 p-6 bg-zinc-50/50">
              <div>
                <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" /> {editingPrescriptionId ? 'Edit Patient Prescription (Rx)' : 'New Patient Prescription (Rx)'}
                </h3>
                <p className="text-xs text-zinc-400">Generate digital pharmacotherapy, prescription guidelines, and clinical dosage schedules.</p>
              </div>
              <button 
                onClick={() => setIsPrescriptionModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Load From Template Combobox Row */}
              <div className="p-4 bg-teal-50/40 border border-teal-100 rounded-2xl flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Load From Clinic Rx Templates</label>
                  <select
                    value={rxTemplateSearch}
                    onChange={(e) => setRxTemplateSearch(e.target.value)}
                    className="w-full bg-white border border-teal-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">-- Choose a standard dental prescription template --</option>
                    {getPrescriptionTemplates().map((t: any) => (
                      <option key={t.name} value={t.name}>{t.name} ({t.remarks || 'No remarks'})</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const templatesList = getPrescriptionTemplates();
                    const selected = templatesList.find((t: any) => t.name === rxTemplateSearch);

                    if (selected) {
                      const items = parsePrescriptionTemplate(selected.prescription);
                      setRxMedicinesList([...rxMedicinesList, ...items]);
                    } else if (rxTemplateSearch) {
                      alert("Template loaded successfully.");
                    }
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors shrink-0 uppercase"
                >
                  Load Medicines
                </button>
              </div>

              {/* Form Fields Grid - 3 Column Layout */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest">Active Medicine Form Fields</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRxMedication('');
                        setRxDose('');
                        setRxQty(1);
                        setRxMedicinesList([]);
                      }}
                      className="text-[10px] font-bold text-zinc-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!rxMedication.trim()) {
                          alert("Please fill in the Medication name.");
                          return;
                        }
                        const newItem: MedicineItem = {
                          medication: rxMedication.trim(),
                          dose: rxDose.trim() || 'Take as directed',
                          qty: rxQty
                        };
                        setRxMedicinesList([...rxMedicinesList, newItem]);
                        setRxMedication('');
                        setRxDose('');
                        setRxQty(1);
                      }}
                      className="text-[10px] font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Medicine
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Medication Name / Strength</label>
                    <SmartAutocomplete
                      placeholder="e.g. Amoxicillin 500mg Cap"
                      value={rxMedication}
                      onChange={setRxMedication}
                      onSelect={(m) => {
                        setRxMedication(m.name);
                        if (m.dosage) {
                          setRxDose(m.dosage);
                        }
                      }}
                      masterKey="DENTAL_MEDICINES_MASTER"
                      fallbackData={[
                        { name: 'Amoxicillin 500mg Capsule', dosage: '1 capsule every 8 hours for 7 days' },
                        { name: 'Mefenamic Acid 500mg Tablet', dosage: '1 tablet every 8 hours as needed for pain' },
                        { name: 'Ibuprofen 400mg Tablet', dosage: '1 tablet every 6 hours as needed' },
                        { name: 'Clindamycin 300mg Capsule', dosage: '1 capsule every 8 hours for 7 days' },
                        { name: 'Paracetamol 500mg Tablet', dosage: '1 tablet every 4 hours as needed for fever' }
                      ]}
                      searchField="name"
                      inputClassName="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Dosage & Frequency</label>
                    <input
                      type="text"
                      placeholder="e.g. 1 capsule every 8 hours"
                      value={rxDose}
                      onChange={(e) => setRxDose(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total Quantity (Qty)</label>
                    <input
                      type="number"
                      min={1}
                      value={rxQty}
                      onChange={(e) => setRxQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                </div>
              </div>

              {/* List of Added Medicines */}
              {rxMedicinesList.length > 0 && (
                <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-50 text-[9px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200">
                      <tr>
                        <th className="py-2.5 px-4">Medicine</th>
                        <th className="py-2.5 px-4">Instructions / Dose</th>
                        <th className="py-2.5 px-4 text-center w-16">Qty</th>
                        <th className="py-2.5 px-4 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150 text-xs font-medium text-zinc-700">
                      {rxMedicinesList.map((med, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50">
                          <td className="py-2.5 px-4 font-extrabold uppercase text-zinc-900">{med.medication}</td>
                          <td className="py-2.5 px-4 text-zinc-500">{med.dose}</td>
                          <td className="py-2.5 px-4 text-center font-bold">{med.qty}</td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setRxMedicinesList(rxMedicinesList.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Remarks Textarea */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">CLINICAL REMARKS & PHARMACOTHERAPY DIRECTIONS (Type '/' for templates)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Complete full 7 days course. Take after heavy meals. Drink plenty of water."
                  value={rxRemarks}
                  onChange={(e) => handleTextareaChange(e.target.value, 'rxRemarks')}
                  className="w-full bg-white border border-zinc-200 rounded-2xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="border-t border-zinc-150 p-6 flex items-center justify-end bg-zinc-50 gap-2.5">
              <button
                type="button"
                onClick={() => setIsPrescriptionModalOpen(false)}
                className="bg-[#ff7043] hover:bg-[#f4511e] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-3xs transition-all uppercase flex items-center gap-1.5"
              >
                ✕ Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (rxMedicinesList.length === 0) {
                    alert("Please add at least one medicine to the prescription.");
                    return;
                  }
                  if (editingPrescriptionId) {
                    const updated = prescriptions.map(p => p.id === editingPrescriptionId ? {
                      ...p,
                      medicines: rxMedicinesList,
                      remarks: rxRemarks
                    } : p);
                    savePrescriptionsList(updated);
                    setIsPrescriptionModalOpen(false);
                    const rxRecord = updated.find(p => p.id === editingPrescriptionId);
                    if (rxRecord) {
                      setTimeout(() => handlePrintPrescription(rxRecord), 100);
                    }
                  } else {
                    const newRx: PrescriptionRecord = {
                      id: `RX-2026-${String(prescriptions.length + 1).padStart(3, '0')}`,
                      dateTime: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                      medicines: rxMedicinesList,
                      remarks: rxRemarks
                    };
                    savePrescriptionsList([newRx, ...prescriptions]);
                    setIsPrescriptionModalOpen(false);
                    setTimeout(() => handlePrintPrescription(newRx), 100);
                  }
                }}
                className="bg-[#00bcd4] hover:bg-[#0097a7] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-3xs transition-all uppercase flex items-center gap-1.5"
              >
                🖨 Save and Print
              </button>
              <button
                type="button"
                onClick={() => {
                  if (rxMedicinesList.length === 0) {
                    alert("Please add at least one medicine to the prescription.");
                    return;
                  }
                  if (editingPrescriptionId) {
                    const updated = prescriptions.map(p => p.id === editingPrescriptionId ? {
                      ...p,
                      medicines: rxMedicinesList,
                      remarks: rxRemarks
                    } : p);
                    savePrescriptionsList(updated);
                  } else {
                    const newRx: PrescriptionRecord = {
                      id: `RX-2026-${String(prescriptions.length + 1).padStart(3, '0')}`,
                      dateTime: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                      medicines: rxMedicinesList,
                      remarks: rxRemarks
                    };
                    savePrescriptionsList([newRx, ...prescriptions]);
                  }
                  setIsPrescriptionModalOpen(false);
                }}
                className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-3xs transition-all uppercase flex items-center gap-1.5"
              >
                ✔ Save Only
              </button>
            </div>
          </div>
        </div>
      )}
                �      {/* --- NEW PATIENT BILL MODAL --- */}
      {isBillModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-fade-in">
          <div 
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-5xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-150 px-6 py-4 bg-white">
              <h3 className="text-base font-bold text-zinc-900 tracking-tight font-display">
                {editingBillId ? 'Edit Bill' : 'New Bill'}
              </h3>
              <button 
                onClick={() => setIsBillModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Patient Name and Bill Date row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">PATIENT NAME</label>
                  <input
                    type="text"
                    readOnly
                    value={`${record.personalInfo.lastName}, ${record.personalInfo.firstName} ${record.personalInfo.middleName}`}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-600 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">BILL DATE</label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </div>
              </div>

              {/* Bill Details Section */}
              <div className="border-t border-zinc-100 pt-5">
                <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-4">Bill Details</h4>
                
                <div className="space-y-6">
                  
                  {/* Table & Entry Form - Takes full width */}
                  <div className="w-full space-y-4">
                    
                    {/* Line Items Table with Inline Creation Row */}
                    <div className="border border-zinc-200 rounded-xl bg-white shadow-3xs">
                      <div className="overflow-visible">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200">
                            <tr>
                              <th className="py-2.5 px-3 w-[28%] rounded-tl-xl">Service/Procedure</th>
                              <th className="py-2.5 px-3 w-[28%]">Remarks/Detail</th>
                              <th className="py-2.5 px-3 text-center w-[10%]">Qty</th>
                              <th className="py-2.5 px-3 text-right w-[12%]">Base Amount</th>
                              <th className="py-2.5 px-3 text-right w-[12%]">Discount</th>
                              <th className="py-2.5 px-3 text-right w-[12%]">Line Total</th>
                              <th className="py-2.5 px-3 text-center w-[6%] rounded-tr-xl"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-150 text-xs font-medium text-zinc-700">
                            {/* Entry Row at the top */}
                            <tr className="bg-zinc-50/40">
                              <td className="p-2">
                                <SmartAutocomplete
                                  placeholder="e.g. Oral Prophylaxis"
                                  value={billLineService}
                                  onChange={setBillLineService}
                                  onSelect={(s) => {
                                    setBillLineService(s.name);
                                    setBillLineBaseAmount(parseFloat(s.amount || s.defaultAmount || s.defaultPrice) || 0);
                                    if (s.remarks) {
                                      setBillLineRemarks(s.remarks);
                                    }
                                  }}
                                  masterKey="DENTAL_SERVICES_MASTER"
                                  fallbackData={[
                                    { name: 'Oral Prophylaxis', amount: 1500 },
                                    { name: 'Tooth Extraction', amount: 1200 },
                                    { name: 'Composite Restoration', amount: 1000 },
                                    { name: 'Orthodontic Adjustment', amount: 2000 },
                                    { name: 'Dental Braces Consultation', amount: 500 }
                                  ]}
                                  searchField="name"
                                  inputClassName="w-full bg-white border border-zinc-200 rounded-md px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  placeholder="Remarks"
                                  value={billLineRemarks}
                                  onChange={(e) => setBillLineRemarks(e.target.value)}
                                  className="w-full bg-white border border-zinc-200 rounded-md px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  value={billLineQty}
                                  onChange={(e) => setBillLineQty(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-full bg-white border border-zinc-200 rounded-md py-1.5 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  placeholder="₱0"
                                  value={billLineBaseAmount || ''}
                                  onChange={(e) => setBillLineBaseAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full bg-white border border-zinc-200 rounded-md py-1.5 text-xs font-bold text-right px-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  placeholder="₱0"
                                  value={billLineDiscount || ''}
                                  onChange={(e) => setBillLineDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full bg-white border border-zinc-200 rounded-md py-1.5 text-xs font-bold text-right px-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              </td>
                              <td className="p-2 text-right font-bold text-zinc-700 whitespace-nowrap">
                                ₱{Math.max(0, (billLineBaseAmount * billLineQty) - (billLineDiscount || 0)).toLocaleString()}
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!billLineService.trim()) {
                                      alert("Please input a service/procedure name.");
                                      return;
                                    }
                                    const newLine: BillLineItem = {
                                      serviceProcedure: billLineService.trim(),
                                      remarksDetail: billLineRemarks.trim() || 'Standard service',
                                      qty: billLineQty,
                                      baseAmount: billLineBaseAmount,
                                      discount: billLineDiscount,
                                      lineTotal: Math.max(0, (billLineBaseAmount * billLineQty) - billLineDiscount)
                                    };
                                    setBillLineItems([...billLineItems, newLine]);
                                    setBillLineService('');
                                    setBillLineRemarks('');
                                    setBillLineQty(1);
                                    setBillLineBaseAmount(0);
                                    setBillLineDiscount(0);
                                  }}
                                  className="bg-[#00acc1] hover:bg-[#0097a7] text-white p-1.5 rounded-full flex items-center justify-center cursor-pointer transition-colors mx-auto"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5px]" />
                                </button>
                              </td>
                            </tr>

                            {/* Added rows */}
                            {billLineItems.length > 0 ? (
                              billLineItems.map((line, idx) => (
                                <tr key={idx} className="hover:bg-zinc-50/50">
                                  <td className="py-2.5 px-3 font-bold text-zinc-800 uppercase">{line.serviceProcedure}</td>
                                  <td className="py-2.5 px-3 text-zinc-400 text-[10px]">{line.remarksDetail}</td>
                                  <td className="py-2.5 px-3 text-center font-bold text-zinc-500">{line.qty}</td>
                                  <td className="py-2.5 px-3 text-right font-semibold">₱{line.baseAmount.toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right font-semibold text-zinc-400">₱{line.discount.toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right font-black text-zinc-950">₱{line.lineTotal.toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setBillLineItems(billLineItems.filter((_, i) => i !== idx))}
                                      className="text-red-500 hover:text-red-700 font-bold hover:scale-110 transition-transform cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="py-10 text-center text-zinc-400 italic font-medium text-xs">
                                  No items added. Enter a procedure in the row above and click "+" to add.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right portion: Financial Summary calculations stack - rendered underneath the table, aligned to the right */}
                  <div className="flex justify-end w-full">
                    <div className="w-full sm:w-80 bg-zinc-50 p-5 border border-zinc-200 rounded-2xl shadow-3xs">
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-500 uppercase tracking-wide">Total Cost:</span>
                          <span className="font-extrabold text-zinc-900 text-sm">₱{billTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-500 uppercase tracking-wide">Discount:</span>
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-400 font-bold">₱</span>
                            <input
                              type="number"
                              value={billDiscountInput || 0}
                              onChange={(e) => setBillDiscountInput(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-24 bg-white border border-zinc-200 rounded-md px-2 py-1 text-right font-bold text-zinc-700 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-zinc-200/60 pt-3">
                          <span className="font-bold text-[#00acc1] uppercase tracking-wide">Payable:</span>
                          <span className="font-black text-[#00acc1] text-sm">₱{billPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-zinc-200/60 pt-3">
                          <span className="font-bold text-emerald-600 uppercase tracking-wide">Paid:</span>
                          <div className="flex items-center gap-1">
                            <span className="text-emerald-500 font-bold">₱</span>
                            <input
                              type="number"
                              value={billPaidInput || 0}
                              onChange={(e) => setBillPaidInput(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-24 bg-white border border-zinc-200 rounded-md px-2 py-1 text-right font-bold text-emerald-600 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-zinc-200 pt-3 mt-1">
                        <span className="font-bold text-[#ff7043] uppercase tracking-wide">Balance:</span>
                        <span className={`font-black text-sm ${billBalance > 0 ? 'text-[#ff7043]' : 'text-emerald-600'}`}>
                          ₱{billBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Bottom Section: Remarks & Signature Canvas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-zinc-100">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">BILL REMARKS</label>
                  <textarea
                    rows={3}
                    placeholder="Provide internal notes, check numbers, or dynamic billing terms here..."
                    value={billRemarks}
                    onChange={(e) => setBillRemarks(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-1 focus:ring-teal-500 h-[140px]"
                  />
                </div>

                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">SIGNATURE</label>
                  <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white relative h-[140px] flex-grow flex flex-col justify-between">
                    <canvas
                      id="bill-signature-canvas"
                      width={450}
                      height={140}
                      onMouseDown={(e) => {
                        const canvas = e.currentTarget;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        ctx.strokeStyle = '#18181b';
                        ctx.lineWidth = 2.5;
                        ctx.lineCap = 'round';
                        const rect = canvas.getBoundingClientRect();
                        ctx.beginPath();
                        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                        (canvas as any).drawing = true;
                      }}
                      onMouseMove={(e) => {
                        const canvas = e.currentTarget;
                        if (!(canvas as any).drawing) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        const rect = canvas.getBoundingClientRect();
                        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                        ctx.stroke();
                      }}
                      onMouseUp={(e) => {
                        (e.currentTarget as any).drawing = false;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as any).drawing = false;
                      }}
                      onTouchStart={(e) => {
                        const canvas = e.currentTarget;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        ctx.strokeStyle = '#18181b';
                        ctx.lineWidth = 2.5;
                        ctx.lineCap = 'round';
                        const rect = canvas.getBoundingClientRect();
                        const touch = e.touches[0];
                        ctx.beginPath();
                        ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                        (canvas as any).drawing = true;
                      }}
                      onTouchMove={(e) => {
                        const canvas = e.currentTarget;
                        if (!(canvas as any).drawing) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        const rect = canvas.getBoundingClientRect();
                        const touch = e.touches[0];
                        ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                        ctx.stroke();
                      }}
                      onTouchEnd={(e) => {
                        (e.currentTarget as any).drawing = false;
                      }}
                      className="w-full h-full cursor-crosshair block touch-none bg-white"
                    />
                  </div>
                  {/* Styled Clear & Label Row below Canvas box, exactly like attachment format */}
                  <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-zinc-400 select-none uppercase tracking-wider mt-1.5">
                    <span>PATIENT SIGNATURE</span>
                    <button
                      type="button"
                      onClick={() => {
                        const canvas = document.getElementById('bill-signature-canvas') as HTMLCanvasElement;
                        if (canvas) {
                          const ctx = canvas.getContext('2d');
                          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-zinc-500 hover:text-[#ff7043] transition-colors cursor-pointer uppercase font-bold"
                    >
                      <RotateCcw className="w-3 h-3 text-[#ff7043]" /> Clear
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="border-t border-zinc-150 p-5 flex items-center justify-end bg-zinc-50 gap-2.5">
              <button
                type="button"
                onClick={() => setIsBillModalOpen(false)}
                className="bg-[#ff7043] hover:bg-[#f4511e] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-colors uppercase shadow-2xs"
              >
                ✕ Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (billLineItems.length === 0) {
                    alert("Please add at least one line item to save invoice.");
                    return;
                  }
                  const canvas = document.getElementById('bill-signature-canvas') as HTMLCanvasElement;
                  const sigUrl = canvas ? canvas.toDataURL() : undefined;

                  if (editingBillId) {
                    const updated = bills.map(b => b.id === editingBillId ? {
                      ...b,
                      date: billDate,
                      status: billBalance === 0 ? 'PAID' : 'DUE',
                      services: billLineItems.map(item => item.serviceProcedure).join(', '),
                      netAmount: billPayable,
                      paidAmount: billPaidInput,
                      remarks: billRemarks,
                      lineItems: billLineItems,
                      patientSignature: sigUrl || b.patientSignature
                    } : b);
                    saveBillsList(updated);
                    setEditingBillId(null);
                  } else {
                    const newBill: BillRecord = {
                      id: `BILL-2026-${String(bills.length + 1).padStart(3, '0')}`,
                      date: billDate,
                      status: billBalance === 0 ? 'PAID' : 'DUE',
                      services: billLineItems.map(item => item.serviceProcedure).join(', '),
                      createdBy: "Dr. Maria Jessica Tanarte",
                      netAmount: billPayable,
                      paidAmount: billPaidInput,
                      remarks: billRemarks,
                      lineItems: billLineItems,
                      patientSignature: sigUrl
                    };
                    saveBillsList([newBill, ...bills]);
                  }
                  setIsBillModalOpen(false);
                }}
                className="bg-[#00acc1] hover:bg-[#0097a7] text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-colors uppercase shadow-2xs"
              >
                ✔ Save
              </button>
            </div>
          </div>
        </div>
      )}


      {/* --- NEW CERTIFICATE MODAL --- */}
      {isCertificateModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-fade-in">
          <div 
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-150 p-6 bg-zinc-50/50">
              <div>
                <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-500" /> New Certificate For {record.personalInfo.firstName} {record.personalInfo.lastName}
                </h3>
                <p className="text-xs text-zinc-400">Generate, customize, and stylize oral clearance, excuse letters, or fit-to-work certifications.</p>
              </div>
              <button 
                onClick={() => setIsCertificateModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Load Certificate Template Dropdown */}
              <div className="p-4 bg-cyan-50/40 border border-cyan-100 rounded-2xl flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider block">Select Professional Template</label>
                  <select
                    value={selectedCertTemplate}
                    onChange={(e) => setSelectedCertTemplate(e.target.value)}
                    className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">-- Choose a custom letter template --</option>
                    <option value="Fit to Work / Return to Duty">Fit to Work / Return to Duty Letter</option>
                    <option value="Dental Clearance (Surgery/Medical)">Dento-Oral Focal Clearance Form</option>
                    <option value="Excused from School/Work">School / Work Absence Excuse Letter</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const matched = [
                      {
                        name: "Fit to Work / Return to Duty",
                        label: "Fit to Work / Return to Duty",
                        body: `This is to certify that ${record.personalInfo.firstName} ${record.personalInfo.lastName} has undergone dental examination and treatment on the specified date. Upon completion of treatment, the patient is hereby declared dentally fit to return to school, work, or active duties. Recommendation: Continue standard oral hygiene and regular dental checkups every 6 months.`
                      },
                      {
                        name: "Dental Clearance (Surgery/Medical)",
                        label: "Dental Clearance (Surgery/Medical)",
                        body: `This is to certify that ${record.personalInfo.firstName} ${record.personalInfo.lastName} has been thoroughly examined for focal infection points today. The patient is found to be dentally sound and is cleared of any active dentoalveolar infections. Hence, the patient is cleared to undergo the planned medical procedure or surgical intervention.`
                      },
                      {
                        name: "Excused from School/Work",
                        label: "Excused from School/Work",
                        body: `This is to certify that ${record.personalInfo.firstName} ${record.personalInfo.lastName} has received essential dental treatment today. Due to the nature of the clinical procedure, the patient is strongly advised to rest and recuperate. The patient is excused from work, classes, or school responsibilities for 2 consecutive days.`
                      }
                    ].find(t => t.name === selectedCertTemplate);

                    if (matched) {
                      setCertBody(matched.body);
                      setCertLabel(matched.label);
                    } else if (selectedCertTemplate) {
                      alert("Template set successfully.");
                    }
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors shrink-0 uppercase"
                >
                  Use Template
                </button>
              </div>

              {/* Rich Text Editor Style Toolbar */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-3xs">
                
                {/* Formatted Toolbar Tray */}
                <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex flex-wrap items-center gap-1 sm:gap-2 text-zinc-500">
                  <button
                    type="button"
                    onClick={() => setCertBold(!certBold)}
                    className={`p-1.5 rounded hover:bg-zinc-200 font-black text-xs h-7.5 w-7.5 flex items-center justify-center transition-colors cursor-pointer ${certBold ? 'bg-zinc-200 text-zinc-950 border border-zinc-300' : ''}`}
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => setCertItalic(!certItalic)}
                    className={`p-1.5 rounded hover:bg-zinc-200 italic font-bold text-xs h-7.5 w-7.5 flex items-center justify-center transition-colors cursor-pointer ${certItalic ? 'bg-zinc-200 text-zinc-950 border border-zinc-300' : ''}`}
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => setCertUnderline(!certUnderline)}
                    className={`p-1.5 rounded hover:bg-zinc-200 underline font-bold text-xs h-7.5 w-7.5 flex items-center justify-center transition-colors cursor-pointer ${certUnderline ? 'bg-zinc-200 text-zinc-950 border border-zinc-300' : ''}`}
                    title="Underline"
                  >
                    U
                  </button>
                  <button
                    type="button"
                    onClick={() => setCertStrike(!certStrike)}
                    className={`p-1.5 rounded hover:bg-zinc-200 line-through font-bold text-xs h-7.5 w-7.5 flex items-center justify-center transition-colors cursor-pointer ${certStrike ? 'bg-zinc-200 text-zinc-950 border border-zinc-300' : ''}`}
                    title="Strikethrough"
                  >
                    S
                  </button>

                  <div className="h-4.5 w-[1px] bg-zinc-200 mx-1"></div>

                  <select
                    value={certFont}
                    onChange={(e) => setCertFont(e.target.value)}
                    className="bg-white border border-zinc-200 rounded px-2 py-0.5 text-[11px] font-bold focus:outline-none"
                  >
                    <option value="Sans Serif">Sans Serif (Inter)</option>
                    <option value="Serif">Serif (Georgia)</option>
                    <option value="Monospace">Monospace (Fira Code)</option>
                  </select>

                  <div className="h-4.5 w-[1px] bg-zinc-200 mx-1"></div>

                  <button
                    type="button"
                    onClick={() => setCertAlign('left')}
                    className={`p-1 h-7 w-7 rounded flex items-center justify-center hover:bg-zinc-200 transition-colors cursor-pointer ${certAlign === 'left' ? 'bg-zinc-200 text-zinc-900 border border-zinc-300' : ''}`}
                    title="Align Left"
                  >
                    ⇤
                  </button>
                  <button
                    type="button"
                    onClick={() => setCertAlign('center')}
                    className={`p-1 h-7 w-7 rounded flex items-center justify-center hover:bg-zinc-200 transition-colors cursor-pointer ${certAlign === 'center' ? 'bg-zinc-200 text-zinc-900 border border-zinc-300' : ''}`}
                    title="Align Center"
                  >
                    ⇥⇤
                  </button>
                  <button
                    type="button"
                    onClick={() => setCertAlign('right')}
                    className={`p-1 h-7 w-7 rounded flex items-center justify-center hover:bg-zinc-200 transition-colors cursor-pointer ${certAlign === 'right' ? 'bg-zinc-200 text-zinc-900 border border-zinc-300' : ''}`}
                    title="Align Right"
                  >
                    ⇥
                  </button>

                  <div className="h-4.5 w-[1px] bg-zinc-200 mx-1"></div>

                  <span className="text-[10px] font-bold text-zinc-400 select-none uppercase tracking-wide">
                    🎨 Color: Teal Theme
                  </span>
                </div>

                {/* Editor Document Canvas Panel */}
                <div className="p-6 bg-zinc-100 flex justify-center">
                  <div className="bg-white rounded-xl shadow-md border border-zinc-200 max-w-2xl w-full p-8 min-h-[280px] flex flex-col relative">
                    <div className="border-b border-zinc-150 pb-4 text-center select-none pointer-events-none mb-6">
                      <div className="text-sm font-black text-cyan-600 tracking-wider">SMILE DENTAL CLINIC</div>
                      <div className="text-[10px] text-zinc-400">123 Medical Avenue, District IV</div>
                    </div>

                    <textarea
                      value={certBody}
                      onChange={(e) => setCertBody(e.target.value)}
                      placeholder="Type certificate text content here, or load a template above..."
                      style={{
                        fontFamily: certFont === 'Serif' ? 'Georgia, serif' : certFont === 'Monospace' ? 'monospace' : 'sans-serif',
                        textAlign: certAlign,
                        fontWeight: certBold ? 'bold' : 'normal',
                        fontStyle: certItalic ? 'italic' : 'normal',
                        textDecoration: `${certUnderline ? 'underline' : ''} ${certStrike ? 'line-through' : ''}`.trim() || undefined
                      }}
                      className="w-full flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed text-zinc-800 placeholder-zinc-300 border-none focus:ring-0 focus:border-none p-0"
                      rows={8}
                    />

                    <div className="absolute bottom-6 right-8 text-[9px] text-zinc-350 select-none pointer-events-none uppercase font-extrabold tracking-widest border-t border-zinc-100 pt-2.5">
                      Attending Dentist Signature Block
                    </div>
                  </div>
                </div>

              </div>

              {/* Form Footer Fields */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">OFFICIAL CLINICAL REMARKS / PURPOSE</label>
                <input
                  type="text"
                  placeholder="e.g. Requested for employment pre-clearance or school leave record."
                  value={certRemarks}
                  onChange={(e) => setCertRemarks(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="border-t border-zinc-150 p-6 flex items-center justify-end bg-zinc-50 gap-2.5">
              <button
                type="button"
                onClick={() => setIsCertificateModalOpen(false)}
                className="bg-[#ff7043] hover:bg-[#f4511e] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-3xs transition-all uppercase flex items-center gap-1.5"
              >
                ✕ Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!certBody.trim()) {
                    alert("Please write the certificate content.");
                    return;
                  }
                  if (editingCertId) {
                    const updated = certificates.map(cert => cert.id === editingCertId ? {
                      ...cert,
                      content: certBody.trim(),
                      label: certLabel,
                      remarks: certRemarks
                    } : cert);
                    saveCertificatesList(updated);
                    setEditingCertId(null);
                    setIsCertificateModalOpen(false);
                    const editedCert = updated.find(cert => cert.id === editingCertId);
                    if (editedCert) {
                      setTimeout(() => handlePrintCertificate(editedCert), 100);
                    }
                  } else {
                    const newCert: CertificateRecord = {
                      id: `CERT-2026-${String(certificates.length + 1).padStart(3, '0')}`,
                      dateTime: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                      content: certBody.trim(),
                      label: certLabel,
                      remarks: certRemarks
                    };
                    saveCertificatesList([newCert, ...certificates]);
                    setIsCertificateModalOpen(false);
                    setTimeout(() => handlePrintCertificate(newCert), 100);
                  }
                }}
                className="bg-[#00bcd4] hover:bg-[#0097a7] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-3xs transition-all uppercase flex items-center gap-1.5"
              >
                🖨 Save and Print
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!certBody.trim()) {
                    alert("Please write the certificate content.");
                    return;
                  }
                  if (editingCertId) {
                    const updated = certificates.map(cert => cert.id === editingCertId ? {
                      ...cert,
                      content: certBody.trim(),
                      label: certLabel,
                      remarks: certRemarks
                    } : cert);
                    saveCertificatesList(updated);
                    setEditingCertId(null);
                    setIsCertificateModalOpen(false);
                  } else {
                    const newCert: CertificateRecord = {
                      id: `CERT-2026-${String(certificates.length + 1).padStart(3, '0')}`,
                      dateTime: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                      content: certBody.trim(),
                      label: certLabel,
                      remarks: certRemarks
                    };
                    saveCertificatesList([newCert, ...certificates]);
                    setIsCertificateModalOpen(false);
                  }
                }}
                className="bg-[#009688] hover:bg-[#00796b] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-3xs transition-all uppercase flex items-center gap-1.5"
              >
                ✔ Save Only
              </button>
            </div>
          </div>
        </div>
      )}

      {isMoreInfoOpen && (
        <div 
          className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden"
          onClick={() => setIsMoreInfoOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 p-6">
              <div>
                <h3 className="text-base font-extrabold text-zinc-900 tracking-tight font-display flex items-center gap-2">
                  <Info className="w-5 h-5 text-teal-600" /> Additional Clinical Information
                </h3>
                <p className="text-xs text-zinc-400">Detailed bio data, pathology warnings, and systemic conditions.</p>
              </div>
              <button 
                onClick={() => setIsMoreInfoOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-850 hover:bg-zinc-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Module 1: Clinical Registration Record & Bio details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 pb-2">
                  <span className="p-1 bg-zinc-100 text-zinc-800 rounded">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  Clinical Registration Record & Bio details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Mobile Phone</span>
                    <span className="font-semibold text-zinc-850">{record.personalInfo.mobile || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Email Address</span>
                    <span className="font-semibold text-zinc-850 break-all">{record.personalInfo.email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Civil Status</span>
                    <span className="font-semibold text-zinc-850">{record.personalInfo.civilStatus || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Blood Type</span>
                    <span className="font-semibold text-zinc-850 bg-red-50 text-red-600 border border-red-150 px-1.5 py-0.2 rounded font-extrabold w-max block mt-0.5">{record.personalInfo.bloodType || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Height & Weight</span>
                    <span className="font-semibold text-zinc-850">{record.personalInfo.height ? `${record.personalInfo.height} cm` : "N/A"} / {record.personalInfo.weight ? `${record.personalInfo.weight} kg` : "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Occupation</span>
                    <span className="font-semibold text-zinc-850">{record.personalInfo.occupation || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">School</span>
                    <span className="font-semibold text-zinc-850">{record.personalInfo.school || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Referred By</span>
                    <span className="font-semibold text-zinc-850">{record.personalInfo.referredBy || "N/A"}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Address</span>
                    <span className="font-semibold text-zinc-850 uppercase">{record.personalInfo.address || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Module 2: Pathological History & Systemic Conditions */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 pb-2">
                  <span className="p-1 bg-zinc-100 text-zinc-800 rounded">
                    <Activity className="w-3.5 h-3.5" />
                  </span>
                  Pathological History & Systemic Conditions
                </h4>
                
                {/* Alert Level Banner */}
                {record.medicalHistory.medicalAlert && (
                  <div className="p-3.5 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block uppercase tracking-wider text-[10px] text-red-600 mb-0.5">Critical Medical Alert</span>
                      <p className="font-extrabold text-[13px]">{record.medicalHistory.medicalAlert}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Medication Allergies</span>
                    <p className={`p-3 rounded-xl mt-1 font-bold ${record.medicalHistory.allergiesToMedications ? 'bg-red-50/50 text-red-700 border border-red-100' : 'bg-zinc-50 border border-zinc-200 text-zinc-600'}`}>
                      {record.medicalHistory.allergiesToMedications || "None declared"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Previous Hospitalizations</span>
                    <p className="p-3 bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl mt-1">
                      {record.medicalHistory.previousHospitalizations || "None declared"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Prescribed Medications</span>
                    <p className="p-3 bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl mt-1">
                      {record.medicalHistory.prescribedMedications || "None"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Other Medical Concerns</span>
                    <p className="p-3 bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl mt-1">
                      {record.medicalHistory.otherMedicalConcerns || "None"}
                    </p>
                  </div>
                </div>

                {/* Checked Conditions Chips */}
                <div className="space-y-2 mt-4">
                  <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Diagnosed Conditions / History</span>
                  <div className="flex flex-wrap gap-2">
                    {record.medicalHistory.conditions && record.medicalHistory.conditions.length > 0 ? (
                      record.medicalHistory.conditions.map((cond, idx) => (
                        <span key={idx} className="bg-zinc-100 border border-zinc-200 text-zinc-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide animate-in fade-in duration-100">
                          {cond}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-400 text-xs italic font-medium">No system conditions checked</span>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-zinc-100 p-6 flex items-center justify-end bg-zinc-50">
              <button
                type="button"
                onClick={() => setIsMoreInfoOpen(false)}
                className="px-6 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* --- NEW APPOINTMENT SETUP / EDIT MODAL --- */}
      {isAppointmentModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-fade-in">
          <div 
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-150 p-6 bg-zinc-50/50">
              <div>
                <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" /> {editingAppointmentId ? "Edit Patient Appointment Slot" : "Set Patient Appointment Slot"}
                </h3>
                <p className="text-xs text-zinc-400">Schedule dental consultations, orthodontic adjustments, or prophylaxis visits.</p>
              </div>
              <button 
                onClick={() => setIsAppointmentModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Dental Category / Title</label>
                <select
                  value={appointmentTitle}
                  onChange={(e) => setAppointmentTitle(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="Orthodontics Adjustment">Orthodontics Adjustment</option>
                  <option value="Prophylaxis and Scaling">Prophylaxis and Scaling</option>
                  <option value="General Dental Consultation">General Dental Consultation</option>
                  <option value="Deep Scaling and Curettage">Deep Scaling and Curettage</option>
                  <option value="Wisdom Tooth Surgical Extraction">Wisdom Tooth Surgical Extraction</option>
                  <option value="Dental Crown & Veneers Placement">Dental Crown & Veneers Placement</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Appointment Date</label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Start Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 09:30 AM"
                    value={appointmentStartTime}
                    onChange={(e) => setAppointmentStartTime(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">End Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:30 AM"
                    value={appointmentEndTime}
                    onChange={(e) => setAppointmentEndTime(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Status</label>
                <select
                  value={appointmentStatus}
                  onChange={(e) => setAppointmentStatus(e.target.value as any)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-150 p-6 flex items-center justify-end bg-zinc-50 gap-2.5">
              <button
                type="button"
                onClick={() => setIsAppointmentModalOpen(false)}
                className="bg-[#ff7043] hover:bg-[#f4511e] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-3xs transition-all uppercase flex items-center gap-1.5"
              >
                ✕ Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!appointmentStartTime.trim() || !appointmentEndTime.trim()) {
                    alert("Please fill in start and end times.");
                    return;
                  }
                  
                  // Construct date-time strings
                  const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  const startStr = `${formattedDate}, ${appointmentStartTime}`;
                  const endStr = `${formattedDate}, ${appointmentEndTime}`;

                  if (editingAppointmentId) {
                    const existing = appointmentsList.find(a => a.id === editingAppointmentId);
                    if (existing) {
                      // Compare modifications for audit trail logs
                      const modifications: string[] = [];
                      if (existing.title !== appointmentTitle) modifications.push("Title");
                      if (existing.startDate !== startStr) modifications.push("Start Date");
                      if (existing.endDate !== endStr) modifications.push("End Date");
                      if (existing.status !== appointmentStatus) modifications.push("Status");

                      const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                      const newLog = {
                        id: `LOG-${Date.now()}-update`,
                        type: 'UPDATED' as const,
                        author: "Dr. Maria Jessica Tanarte",
                        fieldsModified: modifications.length > 0 ? modifications.join(", ") : "None",
                        timestamp,
                        details: modifications.length > 0 
                          ? `Manually updated: ${modifications.map(m => `${m} changed`).join(", ")}.`
                          : "Opened and re-saved without changing details."
                      };

                      const updated = appointmentsList.map(a => a.id === editingAppointmentId ? {
                        ...a,
                        title: appointmentTitle,
                        startDate: startStr,
                        endDate: endStr,
                        status: appointmentStatus,
                        auditLogs: [newLog, ...a.auditLogs]
                      } : a);
                      saveAppointmentsList(updated);
                      alert("Successfully updated patient appointment record!");
                    }
                  } else {
                    const nextId = `APT-${Date.now().toString().slice(-4)}`;
                    const newApt: AppointmentRecord = {
                      id: nextId,
                      startDate: startStr,
                      endDate: endStr,
                      title: appointmentTitle,
                      status: appointmentStatus,
                      auditLogs: [
                        {
                          id: `LOG-${Date.now()}-1`,
                          type: 'CREATED' as const,
                          author: "Dr. Maria Jessica Tanarte",
                          fieldsModified: "Start Date, End Date, Title, Status",
                          timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                          details: "Patient appointment scheduled via booking form."
                        }
                      ]
                    };
                    saveAppointmentsList([newApt, ...appointmentsList]);
                    alert("Successfully scheduled new patient appointment!");
                  }
                  setIsAppointmentModalOpen(false);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-colors uppercase shadow-xs flex items-center gap-1.5"
              >
                ✔ Save Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- NEW FOLLOW-UP SETUP / EDIT MODAL --- */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-fade-in">
          <div 
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-150 p-6 bg-zinc-50/50">
              <div>
                <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500" /> {editingFollowUpId ? "Edit Postoperative Case Tracking" : "Setup Postoperative Case Tracking"}
                </h3>
                <p className="text-xs text-zinc-400">Track extraction healing, deep scaling recovery details, and patient feedback.</p>
              </div>
              <button 
                onClick={() => setIsFollowUpModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Checked Date</label>
                <input
                  type="date"
                  value={followUpDateInput}
                  onChange={(e) => setFollowUpDateInput(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Follow-up Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Wisdom Tooth Extraction Healing Review"
                  value={followUpReasonInput}
                  onChange={(e) => setFollowUpReasonInput(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Clinical Recovery Feedback Notes</label>
                <textarea
                  placeholder="Add healing notes, postoperative discomfort comments, or checkup reminders..."
                  value={followUpNotesInput}
                  onChange={(e) => setFollowUpNotesInput(e.target.value)}
                  rows={4}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-150 p-6 flex items-center justify-end bg-zinc-50 gap-2.5">
              <button
                type="button"
                onClick={() => setIsFollowUpModalOpen(false)}
                className="bg-[#ff7043] hover:bg-[#f4511e] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-3xs transition-all uppercase flex items-center gap-1.5"
              >
                ✕ Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!followUpReasonInput.trim()) {
                    alert("Please input a clinical follow-up reason.");
                    return;
                  }
                  if (!followUpNotesInput.trim()) {
                    alert("Please provide recovery feedback notes.");
                    return;
                  }

                  if (editingFollowUpId) {
                    const updated = followUpsList.map(f => f.id === editingFollowUpId ? {
                      ...f,
                      date: followUpDateInput,
                      reason: followUpReasonInput.trim(),
                      notes: followUpNotesInput.trim()
                    } : f);
                    saveFollowUpsList(updated);
                    alert("Successfully modified postoperative follow-up case!");
                  } else {
                    const nextId = `FUP-${Date.now().toString().slice(-4)}`;
                    const newFup: FollowUpRecord = {
                      id: nextId,
                      date: followUpDateInput,
                      reason: followUpReasonInput.trim(),
                      notes: followUpNotesInput.trim()
                    };
                    saveFollowUpsList([newFup, ...followUpsList]);
                    alert("Successfully logged new postoperative follow-up case!");
                  }
                  setIsFollowUpModalOpen(false);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-colors uppercase shadow-xs flex items-center gap-1.5"
              >
                ✔ Save Case Details
              </button>
            </div>
          </div>
        </div>
      )}


      {/* --- NEW DENTAL RECALL SETUP MODAL --- */}
      {isNewRecallModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-fade-in">
          <div 
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-150 p-6 bg-zinc-50/50">
              <div>
                <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-teal-600" /> Setup Patient Dental Recall & Sessions
                </h3>
                <p className="text-xs text-zinc-400">Configure appointment intervals, session metrics, and clinical tracking reasons.</p>
              </div>
              <button 
                onClick={() => setIsNewRecallModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Planned Date</label>
                  <input
                    type="date"
                    value={newRecallDate}
                    onChange={(e) => setNewRecallDate(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Recall Type</label>
                  <select
                    value={newRecallType}
                    onChange={(e) => setNewRecallType(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="Orthodontic Checkup">Orthodontic Checkup</option>
                    <option value="Prophylaxis Session">Prophylaxis Session</option>
                    <option value="Deep Scaling Review">Deep Scaling Review</option>
                    <option value="Surgical Checkup">Surgical Checkup</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Interval Rate</label>
                  <select
                    value={newRecallInterval}
                    onChange={(e) => setNewRecallInterval(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 cursor-pointer focus:outline-none"
                  >
                    <option value="2 Weeks">2 Weeks</option>
                    <option value="4 Weeks">4 Weeks</option>
                    <option value="6 Weeks">6 Weeks</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total Sessions Status</label>
                  <input
                    type="text"
                    placeholder="e.g. 5 of 12 Sessions"
                    value={newRecallSessions}
                    onChange={(e) => setNewRecallSessions(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Clinical Reason for Recall</label>
                  <SmartAutocomplete
                    placeholder="Provide specific procedural aims..."
                    value={newRecallReason}
                    onChange={(val) => setNewRecallReason(val)}
                    onSelect={(item) => setNewRecallReason(item.name)}
                    masterKey="RECALL_REASONS_MASTER"
                    fallbackData={[
                      { name: 'Orthodontic Adjustment' },
                      { name: 'Prophylaxis Clean-up' },
                      { name: 'Decay Restoration View' },
                      { name: 'Extraction Post-Op Check' },
                      { name: 'Prosthodontics Fit Test' }
                    ]}
                    searchField="name"
                    inputClassName="w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 focus:outline-hidden rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors shadow-3xs"
                  />
                </div>
              </div>

              {/* Rich Text Editor Container */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white">
                {/* Editor Tool Shelf */}
                <div className="bg-zinc-50 border-b border-zinc-200 p-2.5 flex flex-wrap items-center gap-1.5">
                  <select
                    value={rtFont}
                    onChange={(e) => setRtFont(e.target.value)}
                    className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-[10px] font-bold text-zinc-600 cursor-pointer"
                  >
                    <option value="Inter">Sans (Inter)</option>
                    <option value="Georgia">Serif (Georgia)</option>
                    <option value="JetBrains Mono">Mono (JetBrains)</option>
                  </select>

                  <select
                    value={rtSize}
                    onChange={(e) => setRtSize(e.target.value)}
                    className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-[10px] font-bold text-zinc-600 cursor-pointer"
                  >
                    <option value="Small">Small</option>
                    <option value="Normal">Normal</option>
                    <option value="Large">Large</option>
                  </select>

                  <div className="h-4.5 w-px bg-zinc-300 mx-1" />

                  <button
                    type="button"
                    onClick={() => setRtBold(!rtBold)}
                    className={`p-1.5 rounded-md transition-all ${rtBold ? 'bg-zinc-200 text-zinc-950 font-black' : 'hover:bg-zinc-100 text-zinc-500'}`}
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setRtItalic(!rtItalic)}
                    className={`p-1.5 rounded-md transition-all ${rtItalic ? 'bg-zinc-200 text-zinc-950 italic' : 'hover:bg-zinc-100 text-zinc-500'}`}
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setRtUnderline(!rtUnderline)}
                    className={`p-1.5 rounded-md transition-all ${rtUnderline ? 'bg-zinc-200 text-zinc-950 underline' : 'hover:bg-zinc-100 text-zinc-500'}`}
                    title="Underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setRtStrike(!rtStrike)}
                    className={`p-1.5 rounded-md transition-all ${rtStrike ? 'bg-zinc-200 text-zinc-950 line-through' : 'hover:bg-zinc-100 text-zinc-500'}`}
                    title="Strikethrough"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4.5 w-px bg-zinc-300 mx-1" />

                  <button
                    type="button"
                    onClick={() => setRtAlign('left')}
                    className={`p-1.5 rounded-md transition-all ${rtAlign === 'left' ? 'bg-zinc-200 text-zinc-950' : 'hover:bg-zinc-100 text-zinc-500'}`}
                    title="Align Left"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setRtAlign('center')}
                    className={`p-1.5 rounded-md transition-all ${rtAlign === 'center' ? 'bg-zinc-200 text-zinc-950' : 'hover:bg-zinc-100 text-zinc-500'}`}
                    title="Align Center"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setRtAlign('right')}
                    className={`p-1.5 rounded-md transition-all ${rtAlign === 'right' ? 'bg-zinc-200 text-zinc-950' : 'hover:bg-zinc-100 text-zinc-500'}`}
                    title="Align Right"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setRtAlign('justify')}
                    className={`p-1.5 rounded-md transition-all ${rtAlign === 'justify' ? 'bg-zinc-200 text-zinc-950' : 'hover:bg-zinc-100 text-zinc-500'}`}
                    title="Align Justify"
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4.5 w-px bg-zinc-300 mx-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setNewRecallNotes(prev => prev + "\n- New checklist action item\n");
                    }}
                    className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500"
                    title="Bullet List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Editor Text Area Canvas */}
                <textarea
                  rows={6}
                  value={newRecallNotes}
                  onChange={(e) => setNewRecallNotes(e.target.value)}
                  placeholder="Draft post-op guidelines, symptoms to report, medication instructions, and general clinical recall notes here..."
                  style={{
                    fontFamily: rtFont === 'Georgia' ? 'Georgia, serif' : rtFont === 'JetBrains Mono' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
                    fontSize: rtSize === 'Small' ? '11px' : rtSize === 'Large' ? '15px' : '13px',
                    textAlign: rtAlign,
                    fontWeight: rtBold ? 'bold' : 'normal',
                    fontStyle: rtItalic ? 'italic' : 'normal',
                    textDecoration: `${rtUnderline ? 'underline' : ''} ${rtStrike ? 'line-through' : ''}`.trim() || undefined
                  }}
                  className="w-full p-4 focus:outline-none bg-zinc-50/20 text-zinc-800 leading-relaxed resize-none border-0 focus:ring-0"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Internal Staff Remarks</label>
                <input
                  type="text"
                  placeholder="Optional private remarks (e.g. patient prefers morning calls only)..."
                  value={newRecallRemarks}
                  onChange={(e) => setNewRecallRemarks(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-150 p-6 flex items-center justify-end bg-zinc-50 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEditingRecallId(null);
                  setIsNewRecallModalOpen(false);
                }}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-colors uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newRecallReason.trim()) {
                    alert("Please input a clinical reason for scheduling this recall.");
                    return;
                  }
                  const formattedDate = new Date(newRecallDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  if (editingRecallId) {
                    const updated = recallsTabList.map(rec => rec.id === editingRecallId ? {
                      ...rec,
                      dateTime: formattedDate,
                      recallType: newRecallType,
                      interval: newRecallInterval,
                      sessions: newRecallSessions || "1 of 1 Sessions",
                      recallReason: newRecallReason,
                      remarks: newRecallRemarks,
                      descriptionNotes: newRecallNotes
                    } : rec);
                    saveRecallsTabList(updated);
                    setEditingRecallId(null);
                  } else {
                    const newRec: RecallTabRecord = {
                      id: `REC-2026-${String(recallsTabList.length + 1).padStart(3, '0')}`,
                      dateTime: formattedDate,
                      recallType: newRecallType,
                      interval: newRecallInterval,
                      sessions: newRecallSessions || "1 of 1 Sessions",
                      recallReason: newRecallReason,
                      remarks: newRecallRemarks,
                      descriptionNotes: newRecallNotes
                    };
                    saveRecallsTabList([newRec, ...recallsTabList]);
                  }
                  setIsNewRecallModalOpen(false);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-colors uppercase shadow-xs"
              >
                Save Recall Setup
              </button>
            </div>
          </div>
        </div>
      )}


      {/* --- BOOKING AUDIT HISTORY MODAL --- */}
      {isAuditModalOpen && activeAppointmentForAudit && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-fade-in">
          <div 
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-150 p-6 bg-zinc-50/50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#00acc1]/10 text-[#00acc1] rounded-lg">
                  <History className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-zinc-900 tracking-tight">
                    Booking Audit History & Logs
                  </h3>
                  <p className="text-xs text-zinc-400">Appointment ID: <strong className="text-zinc-600 font-mono">{activeAppointmentForAudit.id}</strong> | Title: <strong className="text-zinc-600">{activeAppointmentForAudit.title}</strong></p>
                </div>
              </div>
              <button 
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Global controls to expand/collapse all */}
            <div className="px-6 py-2.5 bg-zinc-50 border-b border-zinc-150 flex items-center justify-between text-[11px] font-bold text-zinc-500">
              <span>ACTIVE SYSTEM AUDIT LOGS</span>
              <button
                type="button"
                onClick={() => {
                  const targetState = !isAuditExpandedAll;
                  setIsAuditExpandedAll(targetState);
                  const updated: Record<string, boolean> = {};
                  activeAppointmentForAudit.auditLogs.forEach(log => {
                    updated[log.id] = targetState;
                  });
                  setExpandedAuditLogIds(updated);
                }}
                className="text-[#00acc1] hover:underline cursor-pointer uppercase tracking-wider"
              >
                {isAuditExpandedAll ? "Collapse All Logs" : "Expand All Logs"}
              </button>
            </div>

            {/* List Body */}
            <div className="p-6 overflow-y-auto space-y-4 bg-zinc-50/30">
              {activeAppointmentForAudit.auditLogs.map((log) => {
                const isExpanded = expandedAuditLogIds[log.id];
                return (
                  <div key={log.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden transition-all shadow-3xs hover:border-zinc-300">
                    {/* Header Row clickable */}
                    <div 
                      onClick={() => setExpandedAuditLogIds(prev => ({ ...prev, [log.id]: !isExpanded }))}
                      className="p-4 flex items-center justify-between cursor-pointer select-none gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`p-1 rounded text-white font-extrabold text-[8px] uppercase tracking-wider mt-0.5 ${
                          log.type === 'CREATED' ? 'bg-emerald-600' :
                          log.type === 'UPDATED' ? 'bg-blue-600' :
                          'bg-indigo-600'
                        }`}>
                          {log.type}
                        </span>
                        <div>
                          <p className="text-xs font-black text-zinc-950 uppercase">{log.author}</p>
                          <p className="text-[10px] text-zinc-400 font-bold mt-0.5">{log.timestamp}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400">
                        <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md max-w-[150px] truncate">
                          {log.fieldsModified}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Collapsible details section */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-zinc-100 bg-zinc-50/50 text-xs text-zinc-600 font-medium leading-relaxed">
                        <p className="font-extrabold text-[10px] text-zinc-400 uppercase tracking-widest mb-1.5">Action Details & Notes:</p>
                        <p className="bg-white p-3 border border-zinc-150 rounded-xl text-zinc-800 font-semibold">{log.details}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-150 p-6 flex items-center justify-end bg-zinc-50">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer uppercase"
              >
                Close Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- GLOBAL SEARCH ENGINE OVERLAY DIALOG --- */}
      {globalSearchOpen && (
        <div className="fixed inset-0 bg-zinc-950/45 backdrop-blur-xs z-50 flex items-start justify-center p-4 pt-16 md:pt-24 print:hidden animate-fade-in" onClick={() => setGlobalSearchOpen(false)}>
          <div 
            className="bg-white rounded-3xl border border-zinc-250 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[75vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Search bar input */}
            <div className="relative border-b border-zinc-150 p-4 bg-zinc-50/50 flex items-center gap-3">
              <Search className="w-5 h-5 text-zinc-400 shrink-0" />
              <input 
                type="text"
                autoFocus
                placeholder="Search master records, templates, treatments, scratchpad..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-zinc-800 focus:outline-none placeholder:text-zinc-400"
              />
              <button 
                onClick={() => setGlobalSearchOpen(false)}
                className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-md transition-colors"
              >
                ESC
              </button>
            </div>

            {/* Results Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-zinc-50/30">
              {getGlobalSearchResults(globalSearchQuery).length > 0 ? (
                getGlobalSearchResults(globalSearchQuery).map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      res.action();
                      setGlobalSearchOpen(false);
                      setGlobalSearchQuery('');
                    }}
                    className="w-full flex items-start gap-3 p-3 hover:bg-zinc-100/80 rounded-2xl border border-transparent hover:border-zinc-200 transition-all text-left cursor-pointer group"
                  >
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[8px] uppercase tracking-wider font-extrabold rounded-md border border-zinc-200 shrink-0 mt-0.5 group-hover:bg-zinc-200">
                      {res.category}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-zinc-950 group-hover:text-teal-600 transition-colors truncate">{res.title}</p>
                      <p className="text-[10px] text-zinc-400 font-semibold truncate mt-0.5">{res.subtitle}</p>
                    </div>
                  </button>
                ))
              ) : globalSearchQuery.trim() ? (
                <div className="py-12 text-center text-zinc-400 space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-zinc-300 animate-pulse" />
                  <p className="text-xs font-bold">No master records or treatments found matching "{globalSearchQuery}"</p>
                  <p className="text-[10px]">Try typing "cleaning", "amox", "extraction" or custom notes...</p>
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-400 space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-zinc-300" />
                  <p className="text-xs font-bold">Search Central Clinic Master Data</p>
                  <p className="text-[10px]">Type any keywords to instantly filter master services, medicines, templates, and histories</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-150 px-5 py-3 bg-zinc-150/40 text-[9px] text-zinc-400 font-bold flex items-center justify-between">
              <span>PROMPT TIP: USE ESCAPE OR CLICK OUTSIDE TO CLOSE</span>
              <span>DENTAL CLINIC SMART ENGINE</span>
            </div>
          </div>
        </div>
      )}

      {/* --- FILE UPLOAD / RENAMING MODAL --- */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-fade-in">
          <div 
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-150 p-6 bg-zinc-50/50">
              <div>
                <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  <Upload className="w-5 h-5 text-teal-600" /> {editingUploadId ? "Edit/Rename File" : "Upload File / Dental Scan"}
                </h3>
                <p className="text-xs text-zinc-400">Save clinical panoramic scans, photographs, and diagnostic documents.</p>
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {!editingUploadId && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Select File Content (Simulated Drag & Drop)</label>
                  <div className="border-2 border-dashed border-zinc-200 hover:border-[#00acc1] rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2 bg-zinc-50/50 animate-pulse-subtle"
                       onClick={() => {
                         const options = [
                           { name: 'Panoramic Dental Scan', url: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901d?q=80&w=300&auto=format&fit=crop' },
                           { name: 'Intraoral Photos Upper Jaw', url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=300&auto=format&fit=crop' },
                           { name: 'Cephalometric X-ray Record', url: 'https://images.unsplash.com/photo-1516062423079-7ca13cca775f?q=80&w=300&auto=format&fit=crop' }
                         ];
                         const selected = options[Math.floor(Math.random() * options.length)];
                         setUploadNameInput(selected.name);
                         setUploadDataUrlInput(selected.url);
                       }}>
                    <Upload className="w-8 h-8 text-zinc-300 mx-auto" />
                    <p className="font-bold text-zinc-700">Click to pick a preset scan, or drop document here</p>
                    <p className="text-[10px] text-zinc-400 font-semibold">Simulates actual physical file attachment securely</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">File Name</label>
                <input
                  type="text"
                  value={uploadNameInput}
                  onChange={(e) => setUploadNameInput(e.target.value)}
                  placeholder="e.g., patient_jaw_panoramic_scan.png"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">File Type / Category</label>
                  <select
                    value={uploadTypeInput}
                    onChange={(e) => setUploadTypeInput(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="Panoramic Scan">Panoramic Scan</option>
                    <option value="Intraoral Photo">Intraoral Photo</option>
                    <option value="Cephalometric Scan">Cephalometric Scan</option>
                    <option value="Dental Photograph">Dental Photograph</option>
                    <option value="Treatment Agreement">Treatment Agreement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Estimated File Size</label>
                  <input
                    type="text"
                    disabled
                    value={editingUploadId ? "Unchanged" : "1.8 MB (Simulated)"}
                    className="w-full bg-zinc-100 border border-zinc-200 rounded-xl p-3 text-xs font-semibold text-zinc-400"
                  />
                </div>
              </div>

              {uploadDataUrlInput && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Visual Preview</label>
                  <div className="w-full h-32 rounded-xl border border-zinc-200 overflow-hidden bg-zinc-100 flex items-center justify-center">
                    <img src={uploadDataUrlInput} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-150 p-6 bg-zinc-50/30 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!uploadNameInput.trim()) {
                    alert("Please enter a valid file name.");
                    return;
                  }
                  if (editingUploadId) {
                    const updated = uploadsList.map(u => u.id === editingUploadId ? {
                      ...u,
                      name: uploadNameInput.trim(),
                      type: uploadTypeInput
                    } : u);
                    saveUploadsList(updated);
                  } else {
                    const newFile: UploadRecord = {
                      id: `FILE-${Date.now()}`,
                      name: uploadNameInput.trim(),
                      type: uploadTypeInput,
                      size: "1.8 MB",
                      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                      dataUrl: uploadDataUrlInput || "https://images.unsplash.com/photo-1579684389782-64d84b5e901d?q=80&w=300&auto=format&fit=crop"
                    };
                    saveUploadsList([newFile, ...uploadsList]);
                  }
                  setIsUploadModalOpen(false);
                }}
                className="bg-[#00acc1] hover:bg-[#0097a7] text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs uppercase border-none"
              >
                ✔ {editingUploadId ? "Save Changes" : "Confirm Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CLINICAL SCRATCHPAD NOTE MODAL --- */}
      {isScratchpadModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-fade-in">
          <div 
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-150 p-6 bg-zinc-50/50">
              <div>
                <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-teal-600" /> {editingScratchpadId ? "Edit Scratchpad Note" : "Create Clinical Scratchpad Note"}
                </h3>
                <p className="text-xs text-zinc-400">Save private clinical notes, medical reminders, or miscellaneous warnings.</p>
              </div>
              <button 
                onClick={() => setIsScratchpadModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Author (Doctor / Clinician)</label>
                <input
                  type="text"
                  value={scratchpadAuthorInput}
                  onChange={(e) => setScratchpadAuthorInput(e.target.value)}
                  placeholder="e.g., Dr. Maria Jessica Tanarte"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#00acc1]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">Clinical Annotations & Content</label>
                  <span className="text-[9px] text-zinc-400 font-bold">Press '/' for shortcuts</span>
                </div>
                <textarea
                  value={scratchpadContentInput}
                  onChange={(e) => setScratchpadContentInput(e.target.value)}
                  placeholder="Type random remarks, clinical notes, medical anomalies, treatment options..."
                  className="w-full h-36 bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-[#00acc1] leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 select-none">
                  <input
                    type="checkbox"
                    checked={scratchpadIsPinnedInput}
                    onChange={(e) => setScratchpadIsPinnedInput(e.target.checked)}
                    className="w-4 h-4 rounded-md border-zinc-350 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <span>Pin Note to Top</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-700 select-none">
                  <input
                    type="checkbox"
                    checked={scratchpadIsArchivedInput}
                    onChange={(e) => setScratchpadIsArchivedInput(e.target.checked)}
                    className="w-4 h-4 rounded-md border-zinc-350 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <span>Archive Note</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-150 p-6 bg-zinc-50/30 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsScratchpadModalOpen(false)}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!scratchpadContentInput.trim()) {
                    alert("Please enter note content.");
                    return;
                  }
                  const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                  if (editingScratchpadId) {
                    const updated = scratchpadNotesList.map(item => item.id === editingScratchpadId ? {
                      ...item,
                      content: scratchpadContentInput.trim(),
                      author: scratchpadAuthorInput.trim(),
                      isPinned: scratchpadIsPinnedInput,
                      isArchived: scratchpadIsArchivedInput
                    } : item);
                    saveScratchpadNotesList(updated);
                  } else {
                    const newNote: ScratchpadRecord = {
                      id: `NOTE-${Date.now()}`,
                      content: scratchpadContentInput.trim(),
                      author: scratchpadAuthorInput.trim(),
                      timestamp,
                      isPinned: scratchpadIsPinnedInput,
                      isArchived: scratchpadIsArchivedInput
                    };
                    saveScratchpadNotesList([newNote, ...scratchpadNotesList]);
                  }
                  setIsScratchpadModalOpen(false);
                }}
                className="bg-[#00acc1] hover:bg-[#0097a7] text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs uppercase border-none"
              >
                ✔ {editingScratchpadId ? "Save Note" : "Add Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating slash command palette trigger targeting textareas */}
      {commandPaletteTarget && (
        <CommandPalette 
          onSelect={handleSelectSnippet}
          onClose={() => setCommandPaletteTarget(null)}
        />
      )}

      {/* --- CUSTOM STATE-DRIVEN CONFIRMATION DIALOG MODAL --- */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden animate-fade-in">
          <div 
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
            id="custom-confirm-modal"
          >
            {/* Header / Icon */}
            <div className="p-6 pb-0 flex flex-col items-center text-center space-y-3">
              <div className={`p-3 rounded-full ${
                confirmDialog.variant === 'danger' 
                  ? 'bg-red-50 text-red-600 border border-red-100' 
                  : confirmDialog.variant === 'warning'
                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                  : 'bg-cyan-50 text-cyan-600 border border-cyan-100'
              }`}>
                {confirmDialog.variant === 'danger' ? (
                  <Trash2 className="w-6 h-6" />
                ) : confirmDialog.variant === 'warning' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>
              <h3 className="text-base font-black text-zinc-900 tracking-tight">
                {confirmDialog.title}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {confirmDialog.message}
              </p>
            </div>

            {/* Footer with actions */}
            <div className="p-6 flex flex-col gap-2 mt-4 border-t border-zinc-150 bg-zinc-50/40">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none uppercase ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                    : confirmDialog.variant === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                    : 'bg-[#00acc1] hover:bg-[#0097a7] text-white shadow-xs'
                }`}
              >
                {confirmDialog.confirmText || 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold cursor-pointer transition-colors"
              >
                {confirmDialog.cancelText || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold text-white animate-in fade-in slide-in-from-bottom-5 duration-200 ${
          toast.type === 'success' ? 'bg-zinc-900 border-zinc-800' : toast.type === 'error' ? 'bg-red-600 border-red-500' : 'bg-cyan-600 border-cyan-500'
        }`}>
          {toast.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 stroke-[3px]" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-200 animate-bounce" />
          ) : (
            <Info className="w-4 h-4 text-cyan-200" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}

const ToothSvg = ({ toothNum, surfaces, onSurfaceClick, isReadOnly }: {
  toothNum: string;
  surfaces: { top: string; left: string; right: string; bottom: string; middle: string };
  onSurfaceClick?: (surface: 'top' | 'left' | 'right' | 'bottom' | 'middle') => void;
  isReadOnly?: boolean;
}) => {
  const getFill = (surf: 'top' | 'left' | 'right' | 'bottom' | 'middle') => {
    const val = surfaces[surf] || 'clear';
    if (val === 'red') return '#ef4444';
    if (val === 'blue') return '#2563eb';
    if (val === 'clear' || val === 'gray') return '#ffffff';
    if (val.startsWith('#') || val === 'green' || val === 'orange' || val === 'purple' || val === 'yellow' || val === 'black' || val === 'gray') {
      return val;
    }
    try {
      const stored = localStorage.getItem('DENTAL_TOOTH_STATUSES_MASTER');
      if (stored) {
        const statuses = JSON.parse(stored);
        const found = statuses.find((s: any) => 
          s.code?.toLowerCase() === val.toLowerCase() || 
          s.name?.toLowerCase() === val.toLowerCase() || 
          s.color?.toLowerCase() === val.toLowerCase()
        );
        if (found) return found.color;
      }
    } catch (e) {
      console.error(e);
    }
    return '#ffffff';
  };

  const handleClick = (surf: 'top' | 'left' | 'right' | 'bottom' | 'middle') => {
    if (isReadOnly || !onSurfaceClick) return;
    onSurfaceClick(surf);
  };

  return (
    <svg width="34" height="34" viewBox="0 0 40 40" className="select-none overflow-visible">
      <defs>
        <clipPath id={`clip-${toothNum}`}>
          <circle cx="20" cy="20" r="18" />
        </clipPath>
      </defs>
      
      {/* Clip Group for wedges */}
      <g clipPath={`url(#clip-${toothNum})`}>
        {/* Top Wedge */}
        <path
          d="M 4 4 L 36 4 L 27 13 L 13 13 Z"
          fill={getFill('top')}
          onClick={() => handleClick('top')}
          className={`transition-colors duration-100 ${!isReadOnly ? 'cursor-pointer hover:opacity-85' : ''}`}
        />
        {/* Left Wedge */}
        <path
          d="M 4 4 L 13 13 L 13 27 L 4 36 Z"
          fill={getFill('left')}
          onClick={() => handleClick('left')}
          className={`transition-colors duration-100 ${!isReadOnly ? 'cursor-pointer hover:opacity-85' : ''}`}
        />
        {/* Bottom Wedge */}
        <path
          d="M 4 36 L 13 27 L 27 27 L 36 36 Z"
          fill={getFill('bottom')}
          onClick={() => handleClick('bottom')}
          className={`transition-colors duration-100 ${!isReadOnly ? 'cursor-pointer hover:opacity-85' : ''}`}
        />
        {/* Right Wedge */}
        <path
          d="M 36 4 L 27 13 L 27 27 L 36 36 Z"
          fill={getFill('right')}
          onClick={() => handleClick('right')}
          className={`transition-colors duration-100 ${!isReadOnly ? 'cursor-pointer hover:opacity-85' : ''}`}
        />
      </g>

      {/* Dividers */}
      <line x1="5" y1="5" x2="35" y2="35" stroke="#d4d4d8" strokeWidth="1" className="pointer-events-none" />
      <line x1="35" y1="5" x2="5" y2="35" stroke="#d4d4d8" strokeWidth="1" className="pointer-events-none" />

      {/* Center Circle */}
      <circle
        cx="20"
        cy="20"
        r="7.5"
        stroke="#d4d4d8"
        strokeWidth="1"
        fill={getFill('middle')}
        onClick={() => handleClick('middle')}
        className={`transition-colors duration-100 ${!isReadOnly ? 'cursor-pointer hover:opacity-85' : ''}`}
      />
      
      {/* Outer boundary circle */}
      <circle cx="20" cy="20" r="18" stroke="#a1a1aa" strokeWidth="1.5" fill="none" className="pointer-events-none" />
    </svg>
  );
};

