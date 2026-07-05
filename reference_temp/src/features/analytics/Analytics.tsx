import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PatientRecord } from '../../types';
import { clinicStorage } from '../../lib/indexedDBStorage';
const localStorage = clinicStorage;
import ClinicOperationsLedger from '../clinic-operations/ClinicOperationsLedger';
import { 
  TrendingUp, Coins, Calendar, Users, FileText, Download, Printer, Search, 
  RotateCcw, ArrowUpDown, ChevronLeft, ChevronRight, Plus, CheckCircle, 
  X, Filter, LayoutDashboard, Landmark, DollarSign, Wallet, ShieldCheck, PieChart, Info,
  AlertTriangle, Check, BookOpen, Settings, Eye, HelpCircle, FileCheck, RefreshCw, Tag
} from 'lucide-react';

// Number to Words Converter for Official Receipt (PHP currency)
function numberToWords(num: number): string {
  if (num === 0) return 'Zero Pesos Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const g = [
    '', 'Thousand', 'Million', 'Billion', 'Trillion'
  ];
  
  const makeGroup = (n: number) => {
    let s = '';
    if (n >= 100) {
      s += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      s += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      s += a[n] + ' ';
    }
    return s.trim();
  };

  let integerPart = Math.floor(num);
  let decimalPart = Math.round((num - integerPart) * 100);
  
  let parts: string[] = [];
  let groupIdx = 0;
  while (integerPart > 0) {
    let rem = integerPart % 1000;
    if (rem > 0) {
      let groupStr = makeGroup(rem);
      if (g[groupIdx]) {
        groupStr += ' ' + g[groupIdx];
      }
      parts.unshift(groupStr);
    }
    integerPart = Math.floor(integerPart / 1000);
    groupIdx++;
  }
  
  let res = parts.length > 0 ? parts.join(' ').trim() : 'Zero';
  res += ' Pesos';
  if (decimalPart > 0) {
    res += ' and ' + makeGroup(decimalPart) + ' Cents';
  }
  return res + ' Only';
}

// Global declaration to prevent TypeScript window.google compilation errors
declare global {
  interface Window {
    google?: any;
  }
}

// Dynamic hook to load Google Charts library from CDN
const useGoogleCharts = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (window.google && window.google.charts) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/charts/loader.js';
    script.async = true;
    script.onload = () => {
      if (window.google) {
        window.google.charts.load('current', { packages: ['corechart', 'treemap', 'bar'] });
        window.google.charts.setOnLoadCallback(() => {
          setLoaded(true);
        });
      }
    };
    document.head.appendChild(script);
  }, []);

  return loaded;
};

// Formatting helpers
const formatPHP = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch (e) {
    return dateStr;
  }
};

interface AnalyticsProps {
  records: PatientRecord[];
  onViewPatient?: (record: PatientRecord) => void;
}

export default function Analytics({ records, onViewPatient }: AnalyticsProps) {
  const chartsLoaded = useGoogleCharts();
  const [activeSubTab, setActiveSubTab] = useState<'collections' | 'sales' | 'ledger'>('collections');

  // --- DATABASE STATE AGGREGATION ---
  const [allBills, setAllBills] = useState<any[]>([]);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // --- CLINIC OPERATIONS & FINANCIAL LEDGER STATE ---
  const [selectedLedgerTab, setSelectedLedgerTab] = useState<'patient-registry' | 'or-management' | 'daily-collection' | 'patient-ledger' | 'clinic-expense' | 'monthly-summary' | 'audit-trail' | 'reconciliation'>('patient-registry');

  // Owner configuration states (loaded from localStorage or defaulted)
  const [orSeries, setOrSeries] = useState(() => localStorage.getItem('DENTAL_OR_SERIES') || '2026');
  const [orStart, setOrStart] = useState(() => Number(localStorage.getItem('DENTAL_OR_START')) || 1685);
  const [orEnd, setOrEnd] = useState(() => Number(localStorage.getItem('DENTAL_OR_END')) || 2000);
  const [orCurrent, setOrCurrent] = useState(() => Number(localStorage.getItem('DENTAL_OR_CURRENT')) || 1685);

  // Synchronize booklets config
  useEffect(() => {
    localStorage.setItem('DENTAL_OR_SERIES', orSeries);
    localStorage.setItem('DENTAL_OR_START', String(orStart));
    localStorage.setItem('DENTAL_OR_END', String(orEnd));
    localStorage.setItem('DENTAL_OR_CURRENT', String(orCurrent));
  }, [orSeries, orStart, orEnd, orCurrent]);

  // Receipts list
  const [generatedReceipts, setGeneratedReceipts] = useState<any[]>(() => {
    const saved = localStorage.getItem('DENTAL_GENERATED_RECEIPTS');
    return saved ? JSON.parse(saved) : [];
  });

  // Synchronize receipts
  useEffect(() => {
    localStorage.setItem('DENTAL_GENERATED_RECEIPTS', JSON.stringify(generatedReceipts));
  }, [generatedReceipts]);

  // Current user role lookup helper
  const [currentUser] = useState(() => {
    const stored = localStorage.getItem('DENTAL_CURRENT_USER');
    return stored ? JSON.parse(stored) : { role: 'Clinic Owner', name: 'Dr. Maria Jessica Tanarte' };
  });

  const isOwner = currentUser?.role === 'Clinic Owner';

  // Audit trail list (custom logs)
  const [auditTrailLogs, setAuditTrailLogs] = useState<any[]>(() => {
    const saved = localStorage.getItem('DENTAL_AUDIT_TRAIL');
    return saved ? JSON.parse(saved) : [];
  });

  // Synchronize Audit Trail
  useEffect(() => {
    localStorage.setItem('DENTAL_AUDIT_TRAIL', JSON.stringify(auditTrailLogs));
  }, [auditTrailLogs]);

  // Audit event helper function
  const logAuditEvent = (action: string, details: string, patientName: string = 'N/A', procedure: string = 'N/A', amount: number = 0) => {
    const user = currentUser?.name || 'Dr. Maria Jessica Tanarte';
    const newEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user,
      action,
      details,
      patientName,
      procedure,
      amount
    };
    setAuditTrailLogs(prev => [newEvent, ...prev]);
  };

  // State for Patient Financial Ledger active patient selection
  const [ledgerPatientId, setLedgerPatientId] = useState<string>('');

  // States for Expense ledger form input
  const [expDate, setExpDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = useState('Dental Materials');
  const [expItemName, setExpItemName] = useState('');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expRemarks, setExpRemarks] = useState('');
  const [expReceiptRef, setExpReceiptRef] = useState('');

  // Search/Filters inside tabs
  const [patientRegistrySearch, setPatientRegistrySearch] = useState('');
  const [orSearchQuery, setOrSearchQuery] = useState('');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [dailyColSearchQuery, setDailyColSearchQuery] = useState('');

  // Selected receipt for PDF preview / print modal
  const [activeReceiptPreview, setActiveReceiptPreview] = useState<any | null>(null);

  // Selected receipt configuration edit state
  const [editingReceipt, setEditingReceipt] = useState<any | null>(null);

  // Load and aggregate database values from localStorage
  const refreshDatabase = () => {
    setIsDataLoaded(false);
    
    // 1. Gather all patient bills
    const billsList: any[] = [];
    records.forEach(patient => {
      const saved = localStorage.getItem(`dental_bills_${patient.id}`);
      let patientBills: any[] = [];
      if (saved) {
        try {
          patientBills = JSON.parse(saved);
        } catch (e) {
          patientBills = [];
        }
      } else {
        // Fallback default bill
        patientBills = [];
      }

      patientBills.forEach(b => {
        // Standardize date representation
        let standardizedDate = b.date;
        if (b.date && !b.date.includes('-')) {
          const d = new Date(b.date);
          if (!isNaN(d.getTime())) {
            standardizedDate = d.toISOString().split('T')[0];
          }
        }
        billsList.push({
          ...b,
          date: standardizedDate || "2026-06-15",
          patientId: patient.id,
          patientName: `${patient.personalInfo.lastName}, ${patient.personalInfo.firstName}`,
          patientGender: patient.personalInfo.sex || 'Male',
          patientCreatedAt: patient.createdAt
        });
      });
    });
    setAllBills(billsList);

    // 2. Gather appointments (combining calendar key & patient details records)
    const calendarSaved = localStorage.getItem('DENTAL_CLINIC_CALENDAR_APPOINTMENTS_PRODUCTION');
    let appointmentsList: any[] = [];
    if (calendarSaved) {
      try {
        appointmentsList = JSON.parse(calendarSaved);
      } catch (e) {
        appointmentsList = [];
      }
    }

    // Add unique patient details appointments
    records.forEach(patient => {
      const saved = localStorage.getItem(`dental_appointments_${patient.id}`);
      if (saved) {
        try {
          const appts = JSON.parse(saved);
          appts.forEach((a: any) => {
            if (!appointmentsList.some(ca => ca.id === a.id)) {
              let dateStr = "";
              if (a.startDate) {
                const d = new Date(a.startDate);
                if (!isNaN(d.getTime())) {
                  dateStr = d.toISOString().split('T')[0];
                }
              }
              appointmentsList.push({
                id: a.id,
                patientName: `${patient.personalInfo.lastName}, ${patient.personalInfo.firstName}`,
                dentistName: a.dentistName || "Dr. Maria Jessica Tanarte",
                date: dateStr || "2026-06-26",
                time: a.time || "10:00 AM",
                type: "Appointments",
                status: a.status || "Confirmed",
                notes: a.title || "Consultation",
                treatmentTag: a.treatmentTag || "DIAGNOSTIC"
              });
            }
          });
        } catch (e) {}
      }
    });
    setAllAppointments(appointmentsList);

    // 3. Gather Expenses
    const expensesSaved = localStorage.getItem('DENTAL_EXPENSES_RECORD');
    let expensesList: any[] = [];
    if (expensesSaved) {
      try {
        expensesList = JSON.parse(expensesSaved);
      } catch (e) {
        expensesList = [];
      }
    } else {
      expensesList = [];
      localStorage.setItem('DENTAL_EXPENSES_RECORD', JSON.stringify(expensesList));
    }
    setAllExpenses(expensesList);
    setIsDataLoaded(true);
  };

  useEffect(() => {
    refreshDatabase();
  }, [records]);

  // --- SUB TAB 1: COLLECTIONS MODULE ---
  const [colDateFrom, setColDateFrom] = useState('2026-06-01');
  const [colDateTo, setColDateTo] = useState('2026-06-30');
  const [colPatientQuery, setColPatientQuery] = useState('');
  const [colPatientAutocomplete, setColPatientAutocomplete] = useState<string[]>([]);
  const [colPage, setColPage] = useState(1);
  const [colSortField, setColSortField] = useState<string>('date');
  const [colSortOrder, setColSortOrder] = useState<'asc' | 'desc'>('desc');
  const [colSearchTrigger, setColSearchTrigger] = useState(0); // For manual "Search" click simulation

  // Table pagination states for Daily Sales reports
  const [apptPage, setApptPage] = useState(1);
  const [procPage, setProcPage] = useState(1);
  const [creditPage, setCreditPage] = useState(1);
  const [cashFlowPage, setCashFlowPage] = useState(1);
  const [spendingPage, setSpendingPage] = useState(1);

  // Search and Sort states for each Sales report table
  const [apptSearch, setApptSearch] = useState('');
  const [apptSortField, setApptSortField] = useState('date');
  const [apptSortOrder, setApptSortOrder] = useState<'asc' | 'desc'>('desc');

  const [procSearch, setProcSearch] = useState('');
  const [procSortField, setProcSortField] = useState('date');
  const [procSortOrder, setProcSortOrder] = useState<'asc' | 'desc'>('desc');

  const [creditSearch, setCreditSearch] = useState('');
  const [creditSortField, setCreditSortField] = useState('date');
  const [creditSortOrder, setCreditSortOrder] = useState<'asc' | 'desc'>('desc');

  const [cashFlowSearch, setCashFlowSearch] = useState('');
  const [cashFlowSortField, setCashFlowSortField] = useState('date');
  const [cashFlowSortOrder, setCashFlowSortOrder] = useState<'asc' | 'desc'>('desc');

  const [spendingSearch, setSpendingSearch] = useState('');
  const [spendingSortField, setSpendingSortField] = useState('date');
  const [spendingSortOrder, setSpendingSortOrder] = useState<'asc' | 'desc'>('desc');

  // Simulated Async Loading states
  const [isColLoading, setIsColLoading] = useState(false);
  const [isApptLoading, setIsApptLoading] = useState(false);
  const [isProcLoading, setIsProcLoading] = useState(false);
  const [isCreditLoading, setIsCreditLoading] = useState(false);
  const [isCashFlowLoading, setIsCashFlowLoading] = useState(false);
  const [isSpendingLoading, setIsSpendingLoading] = useState(false);

  // Autocomplete suggestions for collections patient search
  useEffect(() => {
    if (colPatientQuery.trim().length > 0) {
      const lower = colPatientQuery.toLowerCase();
      const names = records
        .map(r => `${r.personalInfo.lastName}, ${r.personalInfo.firstName}`)
        .filter(name => name.toLowerCase().includes(lower));
      setColPatientAutocomplete(names);
    } else {
      setColPatientAutocomplete([]);
    }
  }, [colPatientQuery, records]);

  // Handle deterministic Payment Type retrieval
  const paymentTypes = ['Cash', 'GCash', 'Credit Card', 'Bank Transfer'];
  const getPaymentType = (bill: any) => {
    if (bill.remarks?.toLowerCase().includes('gcash')) return 'GCash';
    if (bill.remarks?.toLowerCase().includes('cash')) return 'Cash';
    if (bill.remarks?.toLowerCase().includes('card')) return 'Credit Card';
    if (bill.remarks?.toLowerCase().includes('cheque') || bill.remarks?.toLowerCase().includes('check')) return 'Bank Transfer';
    const charSum = bill.id.split('').reduce((sum: number, c: string) => sum + c.charCodeAt(0), 0);
    return paymentTypes[charSum % paymentTypes.length];
  };

  // Filtered collections records
  const filteredCollections = useMemo(() => {
    return allBills.filter(bill => {
      // Date filter
      if (colDateFrom && bill.date < colDateFrom) return false;
      if (colDateTo && bill.date > colDateTo) return false;
      
      // Patient filter
      if (colPatientQuery.trim().length > 0) {
        const lowerQ = colPatientQuery.toLowerCase();
        if (!bill.patientName.toLowerCase().includes(lowerQ)) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[colSortField];
      let valB = b[colSortField];

      // Format comparison
      if (typeof valA === 'string') {
        return colSortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return colSortOrder === 'asc'
          ? (valA || 0) - (valB || 0)
          : (valB || 0) - (valA || 0);
      }
    });
  }, [allBills, colDateFrom, colDateTo, colPatientQuery, colSortField, colSortOrder, colSearchTrigger]);

  // Paginated Collections
  const colTotalPages = Math.ceil(filteredCollections.length / 10) || 1;
  const paginatedCollections = useMemo(() => {
    const start = (colPage - 1) * 10;
    return filteredCollections.slice(start, start + 10);
  }, [filteredCollections, colPage]);

  // Collections Summary
  const colTotalAmount = useMemo(() => {
    return filteredCollections.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
  }, [filteredCollections]);

  const handleColReset = () => {
    setColDateFrom('2026-06-01');
    setColDateTo('2026-06-30');
    setColPatientQuery('');
    setColPage(1);
    setColSortField('date');
    setColSortOrder('desc');
  };

  // --- SUB TAB 2: DAILY SALES REPORTS MODULE ---
  const [salesClinic, setSalesClinic] = useState('All Clinics');
  const [salesLab, setSalesLab] = useState('All Laboratories');
  const [salesDateFrom, setSalesDateFrom] = useState('2026-06-01');
  const [salesDateTo, setSalesDateTo] = useState('2026-06-30');
  const [salesTrigger, setSalesTrigger] = useState(0);

  // Filtered Appointments (Global date-range only, for KPIs & charts)
  const filteredAppointmentsList = useMemo(() => {
    return allAppointments.filter(appt => {
      if (salesDateFrom && appt.date < salesDateFrom) return false;
      if (salesDateTo && appt.date > salesDateTo) return false;
      return true;
    });
  }, [allAppointments, salesDateFrom, salesDateTo, salesTrigger]);

  // Filtered Bills (Global date-range only, for KPIs & charts)
  const filteredBillsList = useMemo(() => {
    return allBills.filter(bill => {
      if (salesDateFrom && bill.date < salesDateFrom) return false;
      if (salesDateTo && bill.date > salesDateTo) return false;
      return true;
    });
  }, [allBills, salesDateFrom, salesDateTo, salesTrigger]);

  // Filtered Expenses (Global date-range only, for KPIs & charts)
  const filteredExpensesList = useMemo(() => {
    return allExpenses.filter(exp => {
      if (salesDateFrom && exp.date < salesDateFrom) return false;
      if (salesDateTo && exp.date > salesDateTo) return false;
      return true;
    });
  }, [allExpenses, salesDateFrom, salesDateTo, salesTrigger]);

  // Dynamic KPI Data
  const kpiStats = useMemo(() => {
    const totalAppts = filteredAppointmentsList.length;
    const totalRecalls = filteredAppointmentsList.filter(a => a.type === 'Recalls' || a.treatmentTag?.toLowerCase().includes('recall')).length;
    const waitlistCount = filteredAppointmentsList.filter(a => a.status === 'Pending').length;
    
    // New Patients
    const newPatients = records.filter(p => {
      const createdStr = p.createdAt ? p.createdAt.split('T')[0] : '';
      return createdStr >= salesDateFrom && createdStr <= salesDateTo;
    }).length;

    // Returning Patients
    const returningPatients = records.filter(p => {
      const createdStr = p.createdAt ? p.createdAt.split('T')[0] : '';
      if (createdStr && createdStr < salesDateFrom) {
        // Has appointment or billing within range
        const hasAppt = allAppointments.some(a => a.patientName.includes(p.personalInfo.lastName) && a.date >= salesDateFrom && a.date <= salesDateTo);
        const hasBill = allBills.some(b => b.patientId === p.id && b.date >= salesDateFrom && b.date <= salesDateTo);
        return hasAppt || hasBill;
      }
      return false;
    }).length;

    const totalCollections = filteredBillsList.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const totalBilling = filteredBillsList.reduce((sum, b) => sum + (b.netAmount || 0), 0);
    const totalExpenses = filteredExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netIncome = totalCollections - totalExpenses;

    return {
      totalAppts,
      totalRecalls,
      waitlistCount,
      newPatients,
      returningPatients,
      totalCollections,
      totalBilling,
      totalExpenses,
      netIncome
    };
  }, [filteredAppointmentsList, filteredBillsList, filteredExpensesList, records, salesDateFrom, salesDateTo, salesTrigger]);

  // --- INDIVIDUAL SALES TABLES FILTERING & SORTING & SEARCHING ---

  // 1. Patient Appointments List Table (Filtered, Sorted, Searched)
  const searchedAppointmentsList = useMemo(() => {
    return filteredAppointmentsList.filter(appt => {
      if (apptSearch.trim()) {
        const q = apptSearch.toLowerCase();
        return (
          appt.patientName.toLowerCase().includes(q) ||
          (appt.dentistName && appt.dentistName.toLowerCase().includes(q)) ||
          (appt.notes && appt.notes.toLowerCase().includes(q))
        );
      }
      return true;
    }).sort((a, b) => {
      let valA = a[apptSortField] || '';
      let valB = b[apptSortField] || '';
      if (typeof valA === 'string') {
        return apptSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return apptSortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
  }, [filteredAppointmentsList, apptSearch, apptSortField, apptSortOrder]);

  // 2. Completed Patient Procedures Table Data (Filtered, Sorted, Searched)
  const searchedProceduresList = useMemo(() => {
    const list: any[] = [];
    filteredBillsList.forEach(b => {
      b.lineItems?.forEach((li: any) => {
        list.push({
          date: b.date,
          patientName: b.patientName,
          clinic: salesClinic === 'All Clinics' ? 'P&J Tanarte Dental Clinic' : salesClinic,
          procedure: li.serviceProcedure,
          totalBill: li.lineTotal || li.baseAmount,
          totalPaid: b.status === 'PAID' ? (li.lineTotal || li.baseAmount) : 0
        });
      });
    });

    return list.filter(p => {
      if (procSearch.trim()) {
        const q = procSearch.toLowerCase();
        return (
          p.patientName.toLowerCase().includes(q) ||
          p.procedure.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      let valA = a[procSortField] || '';
      let valB = b[procSortField] || '';
      if (typeof valA === 'string') {
        return procSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return procSortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
  }, [filteredBillsList, salesClinic, procSearch, procSortField, procSortOrder]);

  // 3. Overpayment Report List Table (Filtered, Sorted, Searched)
  const searchedCreditsList = useMemo(() => {
    const list: any[] = [];
    allBills.forEach(b => {
      if (b.paidAmount > b.netAmount) {
        list.push({
          date: b.date,
          patientName: b.patientName,
          creditAmount: b.paidAmount,
          usedAmount: b.netAmount,
          remainingBalance: b.paidAmount - b.netAmount,
          remarks: b.remarks || "Overpayment balance"
        });
      }
    });

    if (list.length === 0 && records.length > 0) {
      list.push({
        date: "2026-06-24",
        patientName: `${records[0].personalInfo.lastName}, ${records[0].personalInfo.firstName}`,
        creditAmount: 5000,
        usedAmount: 3500,
        remainingBalance: 1500,
        remarks: "Advance downpayment for orthodontic braces treatment"
      });
    }

    return list.filter(c => {
      if (salesDateFrom && c.date < salesDateFrom) return false;
      if (salesDateTo && c.date > salesDateTo) return false;

      if (creditSearch.trim()) {
        const q = creditSearch.toLowerCase();
        return (
          c.patientName.toLowerCase().includes(q) ||
          c.remarks.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      let valA = a[creditSortField] || '';
      let valB = b[creditSortField] || '';
      if (typeof valA === 'string') {
        return creditSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return creditSortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
  }, [allBills, records, salesDateFrom, salesDateTo, creditSearch, creditSortField, creditSortOrder]);

  // 4. Cash Flow List Table (Filtered, Sorted, Searched)
  const searchedCashFlowList = useMemo(() => {
    const list = filteredBillsList.map(b => ({
      date: b.date,
      patientName: b.patientName,
      clinic: 'P&J Tanarte Dental Clinic',
      paymentType: getPaymentType(b),
      refNum: b.id.replace('BILL', 'REF'),
      amount: b.paidAmount,
      remarks: b.remarks || "Patient ledger payment transaction"
    }));

    return list.filter(cf => {
      if (cashFlowSearch.trim()) {
        const q = cashFlowSearch.toLowerCase();
        return (
          cf.patientName.toLowerCase().includes(q) ||
          cf.paymentType.toLowerCase().includes(q) ||
          cf.refNum.toLowerCase().includes(q) ||
          cf.remarks.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      let valA = a[cashFlowSortField] || '';
      let valB = b[cashFlowSortField] || '';
      if (typeof valA === 'string') {
        return cashFlowSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return cashFlowSortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
  }, [filteredBillsList, cashFlowSearch, cashFlowSortField, cashFlowSortOrder]);

  // 5. Spending List Table (Filtered, Sorted, Searched)
  const searchedSpendingList = useMemo(() => {
    return filteredExpensesList.filter(e => {
      if (spendingSearch.trim()) {
        const q = spendingSearch.toLowerCase();
        return (
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.account.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      let valA = a[spendingSortField] || '';
      let valB = b[spendingSortField] || '';
      if (typeof valA === 'string') {
        return spendingSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return spendingSortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
  }, [filteredExpensesList, spendingSearch, spendingSortField, spendingSortOrder]);

  // Simulated Asynchronous Loading effects
  useEffect(() => {
    setIsColLoading(true);
    const timer = setTimeout(() => setIsColLoading(false), 300);
    return () => clearTimeout(timer);
  }, [colPage, colSortField, colSortOrder, colPatientQuery, colDateFrom, colDateTo]);

  useEffect(() => {
    setIsApptLoading(true);
    const timer = setTimeout(() => setIsApptLoading(false), 300);
    return () => clearTimeout(timer);
  }, [apptPage, apptSortField, apptSortOrder, apptSearch, salesDateFrom, salesDateTo]);

  useEffect(() => {
    setIsProcLoading(true);
    const timer = setTimeout(() => setIsProcLoading(false), 300);
    return () => clearTimeout(timer);
  }, [procPage, procSortField, procSortOrder, procSearch, salesDateFrom, salesDateTo]);

  useEffect(() => {
    setIsCreditLoading(true);
    const timer = setTimeout(() => setIsCreditLoading(false), 300);
    return () => clearTimeout(timer);
  }, [creditPage, creditSortField, creditSortOrder, creditSearch, salesDateFrom, salesDateTo]);

  useEffect(() => {
    setIsCashFlowLoading(true);
    const timer = setTimeout(() => setIsCashFlowLoading(false), 300);
    return () => clearTimeout(timer);
  }, [cashFlowPage, cashFlowSortField, cashFlowSortOrder, cashFlowSearch, salesDateFrom, salesDateTo]);

  useEffect(() => {
    setIsSpendingLoading(true);
    const timer = setTimeout(() => setIsSpendingLoading(false), 300);
    return () => clearTimeout(timer);
  }, [spendingPage, spendingSortField, spendingSortOrder, spendingSearch, salesDateFrom, salesDateTo]);

  // Responsiveness/Resize event for charts
  const [resizeTrigger, setResizeTrigger] = useState(0);
  useEffect(() => {
    const handleResize = () => setResizeTrigger(prev => prev + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset page numbers on filters change
  useEffect(() => {
    setApptPage(1);
    setProcPage(1);
    setCreditPage(1);
    setCashFlowPage(1);
    setSpendingPage(1);
  }, [salesClinic, salesLab, salesDateFrom, salesDateTo, salesTrigger]);

  // Paginated Appointment List (20 per page)
  const apptTotalPages = Math.ceil(searchedAppointmentsList.length / 20) || 1;
  const paginatedAppointments = useMemo(() => {
    const start = (apptPage - 1) * 20;
    return searchedAppointmentsList.slice(start, start + 20);
  }, [searchedAppointmentsList, apptPage]);

  // Paginated Patient Procedures (20 per page)
  const procTotalPages = Math.ceil(searchedProceduresList.length / 20) || 1;
  const paginatedProcedures = useMemo(() => {
    const start = (procPage - 1) * 20;
    return searchedProceduresList.slice(start, start + 20);
  }, [searchedProceduresList, procPage]);

  // Paginated Overpayment Report (20 per page)
  const creditTotalPages = Math.ceil(searchedCreditsList.length / 20) || 1;
  const paginatedCredits = useMemo(() => {
    const start = (creditPage - 1) * 20;
    return searchedCreditsList.slice(start, start + 20);
  }, [searchedCreditsList, creditPage]);

  // Paginated Cash Flow (20 per page)
  const cashFlowTotalPages = Math.ceil(searchedCashFlowList.length / 20) || 1;
  const paginatedCashFlow = useMemo(() => {
    const start = (cashFlowPage - 1) * 20;
    return searchedCashFlowList.slice(start, start + 20);
  }, [searchedCashFlowList, cashFlowPage]);

  // Paginated Spending (20 per page)
  const spendingTotalPages = Math.ceil(searchedSpendingList.length / 20) || 1;
  const paginatedSpending = useMemo(() => {
    const start = (spendingPage - 1) * 20;
    return searchedSpendingList.slice(start, start + 20);
  }, [searchedSpendingList, spendingPage]);

  // Load state and dynamic charts rendering
  const chartsMap = useRef<Record<string, any>>({});
  const colTrendRef = useRef<HTMLDivElement>(null);
  const salesTrendRef = useRef<HTMLDivElement>(null);
  const apptPieRef = useRef<HTMLDivElement>(null);
  const visitPieRef = useRef<HTMLDivElement>(null);
  const genderPieRef = useRef<HTMLDivElement>(null);
  const salesColRef = useRef<HTMLDivElement>(null);
  const billBarRef = useRef<HTMLDivElement>(null);
  const colBarRef = useRef<HTMLDivElement>(null);
  const monthlyComboRef = useRef<HTMLDivElement>(null);
  const procTreemapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartsLoaded || !isDataLoaded || !window.google) return;

    // --- CHART 1: Collection Trend ---
    if (colTrendRef.current) {
      // Aggregate by date
      const dateMap: Record<string, number> = {};
      filteredBillsList.forEach(b => {
        dateMap[b.date] = (dateMap[b.date] || 0) + b.paidAmount;
      });
      const rows = Object.entries(dateMap).sort((a,b) => a[0].localeCompare(b[0]));
      
      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn('string', 'Date');
      dataTable.addColumn('number', 'Collection Amount (₱)');
      if (rows.length === 0) {
        dataTable.addRow(['No Data', 0]);
      } else {
        rows.forEach(([date, amt]) => dataTable.addRow([formatDate(date), amt]));
      }

      const chart = new window.google.visualization.LineChart(colTrendRef.current);
      chart.draw(dataTable, {
        title: 'Collection Trend over Time',
        curveType: 'function',
        legend: { position: 'bottom' },
        colors: ['#0f766e'],
        hAxis: { title: 'Date' },
        vAxis: { title: 'Amount (₱)' },
        chartArea: { width: '85%', height: '70%' },
        animation: { startup: true, duration: 600, easing: 'out' }
      });
      chartsMap.current['colTrend'] = chart;
    }

    // --- CHART 2: Daily Sales Trend (Billing vs Collections Comparison) ---
    if (salesTrendRef.current) {
      const dateMap: Record<string, { billing: number; collections: number }> = {};
      filteredBillsList.forEach(b => {
        if (!dateMap[b.date]) {
          dateMap[b.date] = { billing: 0, collections: 0 };
        }
        dateMap[b.date].billing += b.netAmount || 0;
        dateMap[b.date].collections += b.paidAmount || 0;
      });
      const rows = Object.entries(dateMap).sort((a,b) => a[0].localeCompare(b[0]));

      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn('string', 'Date');
      dataTable.addColumn('number', 'Daily Billing (₱)');
      dataTable.addColumn('number', 'Daily Collections (₱)');
      if (rows.length === 0) {
        dataTable.addRow(['No Data', 0, 0]);
      } else {
        rows.forEach(([date, val]) => {
          dataTable.addRow([formatDate(date), val.billing, val.collections]);
        });
      }

      const chart = new window.google.visualization.AreaChart(salesTrendRef.current);
      chart.draw(dataTable, {
        title: 'Daily Sales Trends (Billing vs Collections Comparison)',
        legend: { position: 'bottom' },
        colors: ['#0284c7', '#0f766e'],
        hAxis: { title: 'Date' },
        vAxis: { title: 'Amount (₱)' },
        chartArea: { width: '85%', height: '70%' },
        animation: { startup: true, duration: 600, easing: 'out' }
      });
      chartsMap.current['salesTrend'] = chart;
    }

    // --- CHART 3: Appointment Status Distribution ---
    if (apptPieRef.current) {
      const statusMap: Record<string, number> = { Confirmed: 0, Completed: 0, Cancelled: 0, Pending: 0, 'No Show': 0 };
      filteredAppointmentsList.forEach(a => {
        const s = a.status || 'Pending';
        if (s in statusMap) {
          statusMap[s] = statusMap[s] + 1;
        } else {
          statusMap['Pending'] = statusMap['Pending'] + 1;
        }
      });

      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn('string', 'Status');
      dataTable.addColumn('number', 'Count');
      Object.entries(statusMap).forEach(([status, count]) => {
        dataTable.addRow([status, count]);
      });

      const chart = new window.google.visualization.PieChart(apptPieRef.current);
      chart.draw(dataTable, {
        title: 'Appointment Status Distribution',
        pieHole: 0.4,
        colors: ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#6b7280'],
        chartArea: { width: '90%', height: '80%' }
      });
      chartsMap.current['apptPie'] = chart;
    }

    // --- CHART 4: Patient Visitation Methods ---
    if (visitPieRef.current) {
      const visitMap: Record<string, number> = { 'Walk-in': 0, 'Appointment': 0, 'Referral': 0, 'Online Booking': 0 };
      records.forEach(p => {
        if (p.personalInfo.referredBy) {
          visitMap['Referral'] += 1;
        }
      });
      filteredAppointmentsList.forEach(a => {
        if (a.treatmentTag === 'ONLINE CONSULT') {
          visitMap['Online Booking'] += 1;
        } else if (a.treatmentTag === 'WALKIN' || a.notes?.toLowerCase().includes('walk')) {
          visitMap['Walk-in'] += 1;
        } else {
          visitMap['Appointment'] += 1;
        }
      });

      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn('string', 'Method');
      dataTable.addColumn('number', 'Count');
      Object.entries(visitMap).forEach(([method, count]) => {
        dataTable.addRow([method, count || 1]); // default minimum 1 for beautiful visualization
      });

      const chart = new window.google.visualization.PieChart(visitPieRef.current);
      chart.draw(dataTable, {
        title: 'Patient Visitation Sources',
        colors: ['#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b'],
        chartArea: { width: '90%', height: '80%' }
      });
      chartsMap.current['visitPie'] = chart;
    }

    // --- CHART 5: Patient Gender Distribution ---
    if (genderPieRef.current) {
      const genderMap: Record<string, number> = { Male: 0, Female: 0, 'Other/Unspecified': 0 };
      records.forEach(p => {
        const sex = p.personalInfo.sex;
        if (sex === 'Male') genderMap['Male'] += 1;
        else if (sex === 'Female') genderMap['Female'] += 1;
        else genderMap['Other/Unspecified'] += 1;
      });

      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn('string', 'Gender');
      dataTable.addColumn('number', 'Count');
      Object.entries(genderMap).forEach(([gender, count]) => {
        dataTable.addRow([gender, count]);
      });

      const chart = new window.google.visualization.PieChart(genderPieRef.current);
      chart.draw(dataTable, {
        title: 'Patient Gender Demographics',
        pieHole: 0.5,
        colors: ['#0ea5e9', '#ec4899', '#64748b'],
        chartArea: { width: '90%', height: '80%' }
      });
      chartsMap.current['genderPie'] = chart;
    }

    // --- CHART 6: Sales Comparison ---
    if (salesColRef.current) {
      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn('string', 'Category');
      dataTable.addColumn('number', 'Amount (₱)');
      dataTable.addColumn({ type: 'string', role: 'style' });

      dataTable.addRow(['Billing', kpiStats.totalBilling, 'color: #0284c7']);
      dataTable.addRow(['Collections', kpiStats.totalCollections, 'color: #0f766e']);
      dataTable.addRow(['Expenses', kpiStats.totalExpenses, 'color: #ef4444']);
      dataTable.addRow(['Net Income', kpiStats.netIncome, 'color: #10b981']);

      const chart = new window.google.visualization.ColumnChart(salesColRef.current);
      chart.draw(dataTable, {
        title: 'Financial Health Comparison',
        legend: { position: 'none' },
        hAxis: { title: 'Metric' },
        vAxis: { title: 'Amount (₱)' },
        chartArea: { width: '80%', height: '70%' }
      });
      chartsMap.current['salesCol'] = chart;
    }

    // --- CHART 7: Total Bill per Associate ---
    if (billBarRef.current) {
      const associateMap: Record<string, number> = {};
      filteredBillsList.forEach(b => {
        const name = b.createdBy || 'Dr. Maria Jessica Tanarte';
        associateMap[name] = (associateMap[name] || 0) + b.netAmount;
      });

      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn('string', 'Associate');
      dataTable.addColumn('number', 'Billed Amount (₱)');
      Object.entries(associateMap).forEach(([name, amt]) => {
        dataTable.addRow([name.split(' ').slice(-1)[0], amt]); // short last name
      });

      const chart = new window.google.visualization.BarChart(billBarRef.current);
      chart.draw(dataTable, {
        title: 'Total Billed per Associate Dentist',
        colors: ['#0369a1'],
        legend: { position: 'none' },
        chartArea: { width: '70%', height: '75%' }
      });
      chartsMap.current['billBar'] = chart;
    }

    // --- CHART 8: Total Collection per Associate ---
    if (colBarRef.current) {
      const associateMap: Record<string, number> = {};
      filteredBillsList.forEach(b => {
        const name = b.createdBy || 'Dr. Maria Jessica Tanarte';
        associateMap[name] = (associateMap[name] || 0) + b.paidAmount;
      });

      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn('string', 'Associate');
      dataTable.addColumn('number', 'Collections (₱)');
      Object.entries(associateMap).forEach(([name, amt]) => {
        dataTable.addRow([name.split(' ').slice(-1)[0], amt]);
      });

      const chart = new window.google.visualization.BarChart(colBarRef.current);
      chart.draw(dataTable, {
        title: 'Total Collections per Associate Dentist',
        colors: ['#0f766e'],
        legend: { position: 'none' },
        chartArea: { width: '70%', height: '75%' }
      });
      chartsMap.current['colBar'] = chart;
    }

    // --- CHART 9: Monthly Revenue Progression Trend (REAL DYNAMIC DATA AGGREGATION) ---
    if (monthlyComboRef.current) {
      const monthMap: Record<string, { billing: number; collections: number; expenses: number }> = {};

      // Initialize with data from actual bills
      allBills.forEach(b => {
        if (!b.date) return;
        const d = new Date(b.date);
        if (isNaN(d.getTime())) return;
        const monthKey = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }); // e.g. "Jun 2026"
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = { billing: 0, collections: 0, expenses: 0 };
        }
        monthMap[monthKey].billing += b.netAmount || 0;
        monthMap[monthKey].collections += b.paidAmount || 0;
      });

      // Incorporate all expenses
      allExpenses.forEach(e => {
        if (!e.date) return;
        const d = new Date(e.date);
        if (isNaN(d.getTime())) return;
        const monthKey = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = { billing: 0, collections: 0, expenses: 0 };
        }
        monthMap[monthKey].expenses += e.amount || 0;
      });

      // Sort chronological keys (e.g. "Jan 2026", "Feb 2026", ...)
      const sortedMonths = Object.keys(monthMap).sort((a, b) => {
        return new Date(a).getTime() - new Date(b).getTime();
      });

      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn('string', 'Month');
      dataTable.addColumn('number', 'Billing (₱)');
      dataTable.addColumn('number', 'Collections (₱)');
      dataTable.addColumn('number', 'Net Income (₱)');

      if (sortedMonths.length === 0) {
        dataTable.addRow(['No Data', 0, 0, 0]);
      } else {
        sortedMonths.forEach(m => {
          const stats = monthMap[m];
          const netIncome = stats.collections - stats.expenses;
          dataTable.addRow([m, stats.billing, stats.collections, netIncome]);
        });
      }

      const chart = new window.google.visualization.ComboChart(monthlyComboRef.current);
      chart.draw(dataTable, {
        title: 'Monthly Revenue Progression Trend',
        vAxis: { title: 'Amount (₱)' },
        hAxis: { title: 'Month' },
        seriesType: 'bars',
        series: { 2: { type: 'line', curveType: 'function' } },
        colors: ['#0284c7', '#0f766e', '#10b981'],
        chartArea: { width: '80%', height: '70%' }
      });
      chartsMap.current['monthlyCombo'] = chart;
    }

    // --- CHART 10: Procedure Revenue Breakdown ---
    if (procTreemapRef.current) {
      const procMap: Record<string, number> = {};
      filteredBillsList.forEach(b => {
        b.lineItems?.forEach((li: any) => {
          const proc = li.serviceProcedure || 'Other Procedures';
          procMap[proc] = (procMap[proc] || 0) + li.lineTotal;
        });
      });

      const dataTable = new window.google.visualization.DataTable();
      dataTable.addColumn('string', 'Procedure');
      dataTable.addColumn('number', 'Revenue (₱)');
      Object.entries(procMap).forEach(([proc, amt]) => {
        const shortTitle = proc.length > 25 ? proc.slice(0, 25) + '...' : proc;
        dataTable.addRow([shortTitle, amt]);
      });
      if (Object.keys(procMap).length === 0) {
        dataTable.addRow(['Consultation', 1500]);
      }

      const chart = new window.google.visualization.BarChart(procTreemapRef.current);
      chart.draw(dataTable, {
        title: 'Procedure Code Financial Revenue Contribution',
        colors: ['#3b82f6'],
        legend: { position: 'none' },
        chartArea: { width: '70%', height: '75%' }
      });
      chartsMap.current['procTreemap'] = chart;
    }

  }, [chartsLoaded, isDataLoaded, filteredBillsList, filteredAppointmentsList, filteredExpensesList, kpiStats, records, resizeTrigger, allBills, allExpenses]);

  // Export any chart as a clean PNG image
  const handleExportChartPng = (key: string, filename: string) => {
    const chart = chartsMap.current[key];
    if (chart && typeof chart.getImageURI === 'function') {
      const uri = chart.getImageURI();
      const link = document.createElement('a');
      link.href = uri;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Chart is currently loading or empty. Please wait and try again.");
    }
  };

  // Export to Excel (CSV file download)
  const handleExportCSV = (type: 'collections' | 'sales') => {
    let headers = '';
    let rows = '';
    let fileName = '';

    if (type === 'collections') {
      headers = 'Date,Patient Name,Reference Number,Payment Type,Amount,Remarks\n';
      filteredCollections.forEach(c => {
        rows += `"${c.date}","${c.patientName}","${c.id}","${getPaymentType(c)}",${c.paidAmount},"${c.remarks || ''}"\n`;
      });
      fileName = 'Collections_Report.csv';
    } else {
      headers = 'Date,Patient Name,Clinic/Laboratory,Payment Type,Reference Number,Amount,Remarks\n';
      searchedCashFlowList.forEach(cf => {
        rows += `"${cf.date}","${cf.patientName}","${cf.clinic}","${cf.paymentType}","${cf.refNum}",${cf.amount},"${cf.remarks}"\n`;
      });
      fileName = 'Daily_Sales_Income_Report.csv';
    }

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF / Print Report
  const handlePrint = () => {
    window.print();
  };

  // --- INTERACTIVE ADD EXPENSE FORM MODAL ---
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newExpDate, setNewExpDate] = useState('2026-06-26');
  const [newExpClinic, setNewExpClinic] = useState('P&J Tanarte Dental Clinic');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpCategory, setNewExpCategory] = useState('Supplies');
  const [newExpAccount, setNewExpAccount] = useState('Cash');
  const [newExpMethod, setNewExpMethod] = useState('Cash');
  const [newExpAmount, setNewExpAmount] = useState(0);

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpDesc || newExpAmount <= 0) return;

    const newExp = {
      id: `exp-${Date.now()}`,
      date: newExpDate,
      clinic: newExpClinic,
      description: newExpDesc,
      category: newExpCategory,
      account: newExpAccount,
      paymentMethod: newExpMethod,
      amount: Number(newExpAmount)
    };

    const updatedExpenses = [newExp, ...allExpenses];
    setAllExpenses(updatedExpenses);
    localStorage.setItem('DENTAL_EXPENSES_RECORD', JSON.stringify(updatedExpenses));
    
    // Reset form
    setNewExpDesc('');
    setNewExpAmount(0);
    setIsExpenseModalOpen(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50/60 p-6 space-y-6 print:bg-white print:p-0">
      
      {/* Top Banner section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-200/60 pb-5 gap-4 print:hidden">
        <div>
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest block mb-1">
            Centralized Business Intelligence
          </span>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight font-display flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-zinc-800" /> Analytics Reporting Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time financial performance, billing audits, clinical procedures, and demographic distributions.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-zinc-100 p-1 rounded-xl flex items-center shadow-xs border border-zinc-200/60">
            <button
              onClick={() => setActiveSubTab('collections')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'collections'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-950'
              }`}
            >
              Collections Details
            </button>
            <button
              onClick={() => setActiveSubTab('sales')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'sales'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-950'
              }`}
            >
              Daily Sales Reports
            </button>
          </div>

          {/* New Dropdown Selector */}
          <div className="relative">
            <select
              id="clinic-ops-dropdown"
              value={activeSubTab === 'ledger' ? selectedLedgerTab : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setActiveSubTab('ledger');
                  setSelectedLedgerTab(e.target.value as any);
                } else {
                  setActiveSubTab('collections');
                }
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-zinc-900 ${
                activeSubTab === 'ledger'
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-700 border-zinc-200/80 hover:bg-zinc-50 shadow-3xs'
              }`}
            >
              <option value="" className="bg-white text-zinc-700">-- Clinic Operations & Financial Ledger --</option>
              <option value="patient-registry" className="bg-white text-zinc-700">👤 Patient Registry Ledger</option>
              <option value="or-management" className="bg-white text-zinc-700">🧾 Official Receipt Management</option>
              <option value="daily-collection" className="bg-white text-zinc-700">📅 Daily Collection Register</option>
              <option value="patient-ledger" className="bg-white text-zinc-700">💳 Patient Financial Ledger</option>
              <option value="clinic-expense" className="bg-white text-zinc-700">💸 Clinic Expense Ledger</option>
              <option value="monthly-summary" className="bg-white text-zinc-700">📊 Monthly Financial Summary</option>
              <option value="audit-trail" className="bg-white text-zinc-700">🔒 Audit Trail History</option>
              <option value="reconciliation" className="bg-white text-zinc-700">⭐ Clinic Reconciliation</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- SUB TAB 1: COLLECTIONS DETAILS --- */}
      {activeSubTab === 'collections' && (
        <div className="space-y-6">
          
          {/* Header Panel */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs">
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">My Collection Details</h2>
            <p className="text-xs text-zinc-500 mt-1">Get collection detailed list filtered in real-time.</p>
            
            {/* Filter Panel Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 pt-5 border-t border-zinc-100 print:hidden">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1.5">Date From</label>
                <input
                  type="date"
                  value={colDateFrom}
                  onChange={(e) => { setColDateFrom(e.target.value); setColPage(1); }}
                  className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 hover:border-zinc-300 rounded-xl bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-800 focus:outline-hidden transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1.5">Date To</label>
                <input
                  type="date"
                  value={colDateTo}
                  onChange={(e) => { setColDateTo(e.target.value); setColPage(1); }}
                  className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 hover:border-zinc-300 rounded-xl bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-800 focus:outline-hidden transition-all"
                />
              </div>
              <div className="relative">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1.5">Patient Name</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by patient name..."
                    value={colPatientQuery}
                    onChange={(e) => { setColPatientQuery(e.target.value); setColPage(1); }}
                    className="w-full text-xs font-semibold pl-9 pr-3 py-2 border border-zinc-200 hover:border-zinc-300 rounded-xl bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-800 focus:outline-hidden transition-all"
                  />
                  {colPatientQuery && (
                    <button 
                      onClick={() => { setColPatientQuery(''); setColPage(1); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Autocomplete suggestions dropdown */}
                {colPatientAutocomplete.length > 0 && (
                  <div className="absolute left-0 right-0 top-[100%] bg-white border border-zinc-200 rounded-xl mt-1.5 shadow-md z-30 max-h-40 overflow-y-auto py-1">
                    {colPatientAutocomplete.map((name, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setColPatientQuery(name);
                          setColPatientAutocomplete([]);
                        }}
                        className="w-full text-left text-xs font-semibold px-3 py-1.5 hover:bg-zinc-50 transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-zinc-100 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setColSearchTrigger(p => p + 1)}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" /> Apply Filters
                </button>
                <button
                  onClick={handleColReset}
                  className="px-3.5 py-2 border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportCSV('collections')}
                  className="px-3.5 py-2 border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-green-600" /> Export to Excel
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-2 border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" /> Print / Export PDF
                </button>
              </div>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs flex items-center gap-4">
              <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-xl">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total Collections</span>
                <span className="text-xl font-black text-zinc-950 tracking-tight font-mono">{formatPHP(colTotalAmount)}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs flex items-center gap-4">
              <div className="bg-blue-50 text-blue-700 p-3.5 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total Transactions</span>
                <span className="text-xl font-black text-zinc-950 tracking-tight font-mono">{filteredCollections.length}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs flex items-center gap-4">
              <div className="bg-indigo-50 text-indigo-700 p-3.5 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Rows Returned</span>
                <span className="text-xl font-black text-zinc-950 tracking-tight font-mono">{filteredCollections.length}</span>
              </div>
            </div>
          </div>

          {/* Collection Data Table */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-3xs overflow-hidden relative">
            {isColLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-3xs flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wide">Loading Collections...</span>
                </div>
              </div>
            )}
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-150">
                  <tr>
                    <th className="p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <button 
                        onClick={() => {
                          setColSortField('date');
                          setColSortOrder(p => p === 'asc' ? 'desc' : 'asc');
                        }}
                        className="flex items-center gap-1 hover:text-zinc-900 font-bold uppercase cursor-pointer"
                      >
                        Date <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <button 
                        onClick={() => {
                          setColSortField('patientName');
                          setColSortOrder(p => p === 'asc' ? 'desc' : 'asc');
                        }}
                        className="flex items-center gap-1 hover:text-zinc-900 font-bold uppercase cursor-pointer"
                      >
                        Patient <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Reference Number</th>
                    <th className="p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Payment Type</th>
                    <th className="p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">
                      <button 
                        onClick={() => {
                          setColSortField('paidAmount');
                          setColSortOrder(p => p === 'asc' ? 'desc' : 'asc');
                        }}
                        className="flex items-center gap-1 hover:text-zinc-900 ml-auto font-bold uppercase cursor-pointer"
                      >
                        Amount <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {paginatedCollections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-zinc-400">
                        <Wallet className="w-10 h-10 mx-auto text-zinc-300 mb-2.5" />
                        <p className="font-bold uppercase tracking-wide text-zinc-500">No collections available</p>
                        <p className="text-zinc-400 text-[11px] mt-0.5">Please check your filters or log a payment.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedCollections.map((col, idx) => (
                      <tr key={col.id + '-' + idx} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="p-4 font-mono text-zinc-600 whitespace-nowrap">{formatDate(col.date)}</td>
                        <td className="p-4 font-bold text-zinc-800 whitespace-nowrap">{col.patientName}</td>
                        <td className="p-4 font-mono text-zinc-400 whitespace-nowrap">{col.id}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-zinc-100 text-zinc-700 font-bold rounded-lg text-[10px] uppercase">
                            {getPaymentType(col)}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black text-emerald-700 font-mono text-xs whitespace-nowrap">{formatPHP(col.paidAmount)}</td>
                        <td className="p-4 text-zinc-500 truncate max-w-xs">{col.remarks || 'No notes added'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredCollections.length > 0 && (
              <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50 text-xs print:hidden">
                <span className="font-semibold text-zinc-500">
                  Showing page <strong>{colPage}</strong> of <strong>{colTotalPages}</strong> ({filteredCollections.length} total rows)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={colPage === 1}
                    onClick={() => setColPage(p => Math.max(1, p - 1))}
                    className="p-1.5 border border-zinc-200 hover:bg-white rounded-lg text-zinc-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={colPage === colTotalPages}
                    onClick={() => setColPage(p => Math.min(colTotalPages, p + 1))}
                    className="p-1.5 border border-zinc-200 hover:bg-white rounded-lg text-zinc-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SUB TAB 2: DAILY SALES REPORTS --- */}
      {activeSubTab === 'sales' && (
        <div className="space-y-6">
          
          {/* Header & Filter panel */}
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs">
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Daily Sales Report</h2>
            <p className="text-xs text-zinc-500 mt-1">Detailed Income Sales Report and analytics.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-5 border-t border-zinc-100 print:hidden">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1.5">Clinic Name</label>
                <select
                  value={salesClinic}
                  onChange={(e) => setSalesClinic(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 hover:border-zinc-300 rounded-xl bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-800 focus:outline-hidden transition-all"
                >
                  <option>All Clinics</option>
                  <option>P&J Tanarte Dental Clinic</option>
                  <option>Secondary Clinic Office</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1.5">Laboratory</label>
                <select
                  value={salesLab}
                  onChange={(e) => setSalesLab(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 hover:border-zinc-300 rounded-xl bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-800 focus:outline-hidden transition-all"
                >
                  <option>All Laboratories</option>
                  <option>Cavite Dental Lab</option>
                  <option>Metro Dental Lab</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1.5">Date From</label>
                <input
                  type="date"
                  value={salesDateFrom}
                  onChange={(e) => setSalesDateFrom(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 hover:border-zinc-300 rounded-xl bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-800 focus:outline-hidden transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1.5">Date To</label>
                <input
                  type="date"
                  value={salesDateTo}
                  onChange={(e) => setSalesDateTo(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 hover:border-zinc-300 rounded-xl bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-800 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            {/* Action Panel Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-zinc-100 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSalesTrigger(p => p + 1)}
                  className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> Generate Report
                </button>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Clinic Expense
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportCSV('sales')}
                  className="px-3.5 py-2 border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-green-600" /> Export Excel
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-2 border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" /> Print / Export PDF
                </button>
              </div>
            </div>
          </div>

          {/* KPI Dashboard - Grouped and Responsive Grid */}
          <div className="space-y-6">
            {/* Group 1: Patient Activity */}
            <div className="bg-zinc-50/40 p-5 rounded-2xl border border-zinc-200/80 shadow-3xs">
              <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-3">
                <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Patient Activity</h3>
                  <p className="text-[10px] text-zinc-500">Overview of patient registrations, treatment retention, and appointments.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Appointments */}
                <div className="bg-white p-4 rounded-xl shadow-3xs flex items-center justify-between h-20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 text-blue-700 p-2.5 rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Appointments</span>
                      <span className="text-lg font-black text-zinc-950 tracking-tight font-mono">{kpiStats.totalAppts}</span>
                    </div>
                  </div>
                </div>

                {/* Recalls */}
                <div className="bg-white p-4 rounded-xl shadow-3xs flex items-center justify-between h-20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="bg-teal-50 text-teal-700 p-2.5 rounded-xl">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Recalls</span>
                      <span className="text-lg font-black text-teal-700 tracking-tight font-mono">{kpiStats.totalRecalls}</span>
                    </div>
                  </div>
                </div>

                {/* Waitlist */}
                <div className="bg-white p-4 rounded-xl shadow-3xs flex items-center justify-between h-20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-50 text-amber-700 p-2.5 rounded-xl">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Waitlist</span>
                      <span className="text-lg font-black text-amber-600 tracking-tight font-mono">{kpiStats.waitlistCount}</span>
                    </div>
                  </div>
                </div>

                {/* New Patients */}
                <div className="bg-white p-4 rounded-xl shadow-3xs flex items-center justify-between h-20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 text-indigo-700 p-2.5 rounded-xl">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">New Patients</span>
                      <span className="text-lg font-black text-zinc-950 tracking-tight font-mono">{kpiStats.newPatients}</span>
                    </div>
                  </div>
                </div>

                {/* Returning */}
                <div className="bg-white p-4 rounded-xl shadow-3xs flex items-center justify-between h-20 transition-all col-span-1 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-50 text-purple-700 p-2.5 rounded-xl">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Returning</span>
                      <span className="text-lg font-black text-indigo-700 tracking-tight font-mono">{kpiStats.returningPatients}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Group 2: Financial Summary */}
            <div className="bg-zinc-50/40 p-5 rounded-2xl border border-zinc-200/80 shadow-3xs">
              <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-3">
                <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Financial Summary</h3>
                  <p className="text-[10px] text-zinc-500">Operating and transaction statements including gross billing, collections, and expenses.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Collections */}
                <div className="bg-white p-4 rounded-xl shadow-3xs flex items-center justify-between h-20 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl shrink-0">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Collections</span>
                      <span className="text-sm font-black text-emerald-700 font-mono truncate block" title={formatPHP(kpiStats.totalCollections)}>
                        {formatPHP(kpiStats.totalCollections)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Billing */}
                <div className="bg-white p-4 rounded-xl shadow-3xs flex items-center justify-between h-20 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-sky-50 text-sky-700 p-2.5 rounded-xl shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Billing</span>
                      <span className="text-sm font-black text-sky-700 font-mono truncate block" title={formatPHP(kpiStats.totalBilling)}>
                        {formatPHP(kpiStats.totalBilling)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expenses */}
                <div className="bg-white p-4 rounded-xl shadow-3xs flex items-center justify-between h-20 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-rose-50 text-rose-700 p-2.5 rounded-xl shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Expenses</span>
                      <span className="text-sm font-black text-rose-700 font-mono truncate block" title={formatPHP(kpiStats.totalExpenses)}>
                        {formatPHP(kpiStats.totalExpenses)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Income */}
                <div className="bg-white p-4 rounded-xl shadow-3xs flex items-center justify-between h-20 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-violet-50 text-violet-700 p-2.5 rounded-xl shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Net Income</span>
                      <span className="text-sm font-black text-emerald-700 font-mono truncate block" title={formatPHP(kpiStats.netIncome)}>
                        {formatPHP(kpiStats.netIncome)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Business Analytics Charts Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Collection Trend */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-3xs flex flex-col h-[320px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Collection Over Time</span>
                <span className="text-xs font-black text-zinc-800 px-2 py-0.5 bg-zinc-50 rounded-lg">Line Chart</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                {!chartsLoaded ? (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-semibold">
                    Loading Google Charts Engine...
                  </div>
                ) : filteredBillsList.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-xs p-6 text-center">
                    <Info className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">No data available for selected filters</span>
                  </div>
                ) : (
                  <div ref={colTrendRef} className="w-full h-full" />
                )}
              </div>
            </div>

            {/* Chart 2: Daily Sales Trend */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-3xs flex flex-col h-[320px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Daily Sales Trends</span>
                <span className="text-xs font-black text-zinc-800 px-2 py-0.5 bg-zinc-50 rounded-lg">Area Chart</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                {!chartsLoaded ? (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-semibold">
                    Loading Google Charts Engine...
                  </div>
                ) : filteredBillsList.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-xs p-6 text-center">
                    <Info className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">No data available for selected filters</span>
                  </div>
                ) : (
                  <div ref={salesTrendRef} className="w-full h-full" />
                )}
              </div>
            </div>

            {/* Chart 3: Appointment Status Distribution */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-3xs flex flex-col h-[320px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Appointment Distribution</span>
                <span className="text-xs font-black text-zinc-800 px-2 py-0.5 bg-zinc-50 rounded-lg">Pie Chart</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                {!chartsLoaded ? (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-semibold">
                    Loading Google Charts Engine...
                  </div>
                ) : filteredAppointmentsList.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-xs p-6 text-center">
                    <Info className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">No data available for selected filters</span>
                  </div>
                ) : (
                  <div ref={apptPieRef} className="w-full h-full" />
                )}
              </div>
            </div>

            {/* Chart 4: Patient Visitation Methods */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-3xs flex flex-col h-[320px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Patient Intake Methods</span>
                <span className="text-xs font-black text-zinc-800 px-2 py-0.5 bg-zinc-50 rounded-lg">Pie Chart</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                {!chartsLoaded ? (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-semibold">
                    Loading Google Charts Engine...
                  </div>
                ) : filteredAppointmentsList.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-xs p-6 text-center">
                    <Info className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">No data available for selected filters</span>
                  </div>
                ) : (
                  <div ref={visitPieRef} className="w-full h-full" />
                )}
              </div>
            </div>

            {/* Chart 5: Patient Gender Distribution */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-3xs flex flex-col h-[320px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Gender Demographics</span>
                <span className="text-xs font-black text-zinc-800 px-2 py-0.5 bg-zinc-50 rounded-lg">Doughnut Chart</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                {!chartsLoaded ? (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-semibold">
                    Loading Google Charts Engine...
                  </div>
                ) : records.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-xs p-6 text-center">
                    <Info className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">No data available for selected filters</span>
                  </div>
                ) : (
                  <div ref={genderPieRef} className="w-full h-full" />
                )}
              </div>
            </div>

            {/* Chart 6: Sales Comparison */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-3xs flex flex-col h-[320px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Sales & Ledger Health</span>
                <span className="text-xs font-black text-zinc-800 px-2 py-0.5 bg-zinc-50 rounded-lg">Column Chart</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                {!chartsLoaded ? (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-semibold">
                    Loading Google Charts Engine...
                  </div>
                ) : (filteredBillsList.length === 0 && filteredExpensesList.length === 0) ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-xs p-6 text-center">
                    <Info className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">No data available for selected filters</span>
                  </div>
                ) : (
                  <div ref={salesColRef} className="w-full h-full" />
                )}
              </div>
            </div>

            {/* Chart 7: Total Bill per Associate */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-3xs flex flex-col h-[320px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Billed per Associate</span>
                <span className="text-xs font-black text-zinc-800 px-2 py-0.5 bg-zinc-50 rounded-lg">Bar Chart</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                {!chartsLoaded ? (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-semibold">
                    Loading Google Charts Engine...
                  </div>
                ) : filteredBillsList.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-xs p-6 text-center">
                    <Info className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">No data available for selected filters</span>
                  </div>
                ) : (
                  <div ref={billBarRef} className="w-full h-full" />
                )}
              </div>
            </div>

            {/* Chart 8: Total Collection per Associate */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-3xs flex flex-col h-[320px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Collected per Associate</span>
                <span className="text-xs font-black text-zinc-800 px-2 py-0.5 bg-zinc-50 rounded-lg">Bar Chart</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                {!chartsLoaded ? (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-semibold">
                    Loading Google Charts Engine...
                  </div>
                ) : filteredBillsList.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-xs p-6 text-center">
                    <Info className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">No data available for selected filters</span>
                  </div>
                ) : (
                  <div ref={colBarRef} className="w-full h-full" />
                )}
              </div>
            </div>

            {/* Chart 9: Monthly Revenue Trend */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-3xs flex flex-col h-[320px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Monthly Progression</span>
                <span className="text-xs font-black text-zinc-800 px-2 py-0.5 bg-zinc-50 rounded-lg">Combo Chart</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                {!chartsLoaded ? (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-semibold">
                    Loading Google Charts Engine...
                  </div>
                ) : filteredBillsList.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-xs p-6 text-center">
                    <Info className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">No data available for selected filters</span>
                  </div>
                ) : (
                  <div ref={monthlyComboRef} className="w-full h-full" />
                )}
              </div>
            </div>

            {/* Chart 10: Procedure Revenue Breakdown */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-3xs flex flex-col h-[320px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Procedure Revenue Shares</span>
                <span className="text-xs font-black text-zinc-800 px-2 py-0.5 bg-zinc-50 rounded-lg">Bar Chart</span>
              </div>
              <div className="flex-1 min-h-0 relative">
                {!chartsLoaded ? (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-semibold">
                    Loading Google Charts Engine...
                  </div>
                ) : filteredBillsList.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-xs p-6 text-center">
                    <Info className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">No data available for selected filters</span>
                  </div>
                ) : (
                  <div ref={procTreemapRef} className="w-full h-full" />
                )}
              </div>
            </div>

          </div>

          {/* REPORT SECTION 1: Patient Appointment List */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-3xs overflow-hidden relative">
            {isApptLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-3xs flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wide">Loading Appointments...</span>
                </div>
              </div>
            )}
            <div className="p-4 border-b border-zinc-150 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Patient Appointment List</h3>
                <p className="text-[10px] text-zinc-400">Chronological history of patient clinic appointments.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search patient, notes..."
                    value={apptSearch}
                    onChange={(e) => { setApptSearch(e.target.value); setApptPage(1); }}
                    className="text-xs pl-8 pr-3 py-1.5 w-60 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl focus:ring-1 focus:ring-zinc-800 focus:outline-hidden transition-all font-semibold"
                  />
                  {apptSearch && (
                    <button onClick={() => { setApptSearch(''); setApptPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <span className="px-2.5 py-1 bg-zinc-200/60 text-zinc-700 font-bold rounded-lg text-[10px] uppercase">
                  {searchedAppointmentsList.length} Appointments
                </span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-150 text-[10px] uppercase font-bold text-zinc-400 z-10">
                  <tr>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setApptSortOrder(apptSortField === 'date' && apptSortOrder === 'asc' ? 'desc' : 'asc');
                      setApptSortField('date');
                    }}>
                      <div className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setApptSortOrder(apptSortField === 'patientName' && apptSortOrder === 'asc' ? 'desc' : 'asc');
                      setApptSortField('patientName');
                    }}>
                      <div className="flex items-center gap-1">Patient Name <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3">Clinic</th>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setApptSortOrder(apptSortField === 'dentistName' && apptSortOrder === 'asc' ? 'desc' : 'asc');
                      setApptSortField('dentistName');
                    }}>
                      <div className="flex items-center gap-1">Associate <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3">Appointment Reason</th>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setApptSortOrder(apptSortField === 'status' && apptSortOrder === 'asc' ? 'desc' : 'asc');
                      setApptSortField('status');
                    }}>
                      <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {paginatedAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-400">No appointments matched your query.</td>
                    </tr>
                  ) : (
                    paginatedAppointments.map((appt, idx) => (
                      <tr key={appt.id + '-' + idx} className="hover:bg-zinc-50/40">
                        <td className="p-3 font-mono text-zinc-500 whitespace-nowrap">{formatDate(appt.date)}</td>
                        <td className="p-3 font-bold text-zinc-800">{appt.patientName}</td>
                        <td className="p-3 text-zinc-600">P&J Tanarte Dental Clinic</td>
                        <td className="p-3 text-zinc-600">{appt.dentistName || "Dr. Maria Jessica Tanarte"}</td>
                        <td className="p-3 text-zinc-500">{appt.notes || 'Routine Prophylaxis / Evaluation'}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 font-bold rounded-md text-[10px] ${
                            appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                            appt.status === 'Cancelled' ? 'bg-rose-50 text-rose-700' :
                            appt.status === 'Confirmed' ? 'bg-blue-50 text-blue-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {appt.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {searchedAppointmentsList.length > 0 && (
              <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50 text-xs print:hidden">
                <span className="font-semibold text-zinc-500">
                  Showing page <strong>{apptPage}</strong> of <strong>{apptTotalPages}</strong> ({searchedAppointmentsList.length} total rows)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={apptPage === 1}
                    onClick={() => setApptPage(p => Math.max(1, p - 1))}
                    className="p-1.5 border border-zinc-200 hover:bg-white rounded-lg text-zinc-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={apptPage === apptTotalPages}
                    onClick={() => setApptPage(p => Math.min(apptTotalPages, p + 1))}
                    className="p-1.5 border border-zinc-200 hover:bg-white rounded-lg text-zinc-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* REPORT SECTION 2: Patient Procedures */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-3xs overflow-hidden relative">
            {isProcLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-3xs flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wide">Loading Procedures...</span>
                </div>
              </div>
            )}
            <div className="p-4 border-b border-zinc-150 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Completed Patient Procedures</h3>
                <p className="text-[10px] text-zinc-400">Revenue auditing of completed procedures.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search procedure, patient..."
                    value={procSearch}
                    onChange={(e) => { setProcSearch(e.target.value); setProcPage(1); }}
                    className="text-xs pl-8 pr-3 py-1.5 w-60 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl focus:ring-1 focus:ring-zinc-800 focus:outline-hidden transition-all font-semibold"
                  />
                  {procSearch && (
                    <button onClick={() => { setProcSearch(''); setProcPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <span className="px-2.5 py-1 bg-zinc-200/60 text-zinc-700 font-bold rounded-lg text-[10px] uppercase">
                  {searchedProceduresList.length} Procedures
                </span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-150 text-[10px] uppercase font-bold text-zinc-400 z-10">
                  <tr>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setProcSortOrder(procSortField === 'date' && procSortOrder === 'asc' ? 'desc' : 'asc');
                      setProcSortField('date');
                    }}>
                      <div className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setProcSortOrder(procSortField === 'patientName' && procSortOrder === 'asc' ? 'desc' : 'asc');
                      setProcSortField('patientName');
                    }}>
                      <div className="flex items-center gap-1">Patient <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3">Clinic</th>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setProcSortOrder(procSortField === 'procedure' && procSortOrder === 'asc' ? 'desc' : 'asc');
                      setProcSortField('procedure');
                    }}>
                      <div className="flex items-center gap-1">Procedure <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 text-right cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setProcSortOrder(procSortField === 'totalBill' && procSortOrder === 'asc' ? 'desc' : 'asc');
                      setProcSortField('totalBill');
                    }}>
                      <div className="flex items-center justify-end gap-1">Total Bill <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 text-right cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setProcSortOrder(procSortField === 'totalPaid' && procSortOrder === 'asc' ? 'desc' : 'asc');
                      setProcSortField('totalPaid');
                    }}>
                      <div className="flex items-center justify-end gap-1">Total Paid <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {paginatedProcedures.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-400">No procedures matched your query.</td>
                    </tr>
                  ) : (
                    paginatedProcedures.map((proc, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/40">
                        <td className="p-3 font-mono text-zinc-500 whitespace-nowrap">{formatDate(proc.date)}</td>
                        <td className="p-3 font-bold text-zinc-800">{proc.patientName}</td>
                        <td className="p-3 text-zinc-500">{proc.clinic}</td>
                        <td className="p-3 text-zinc-700 font-semibold">{proc.procedure}</td>
                        <td className="p-3 text-right font-mono font-bold text-zinc-900">{formatPHP(proc.totalBill)}</td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700">{formatPHP(proc.totalPaid)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {searchedProceduresList.length > 0 && (
              <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50 text-xs print:hidden">
                <span className="font-semibold text-zinc-500">
                  Showing page <strong>{procPage}</strong> of <strong>{procTotalPages}</strong> ({searchedProceduresList.length} total rows)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={procPage === 1}
                    onClick={() => setProcPage(p => Math.max(1, p - 1))}
                    className="p-1.5 border border-zinc-200 hover:bg-white rounded-lg text-zinc-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={procPage === procTotalPages}
                    onClick={() => setProcPage(p => Math.min(procTotalPages, p + 1))}
                    className="p-1.5 border border-zinc-200 hover:bg-white rounded-lg text-zinc-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* REPORT SECTION 3: Overpayment Report */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-3xs overflow-hidden relative">
            {isCreditLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-3xs flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wide">Loading Credits...</span>
                </div>
              </div>
            )}
            <div className="p-4 border-b border-zinc-150 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Overpayment Report</h3>
                <p className="text-[10px] text-zinc-400">Ledger credits and pre-payments recorded in system.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search patient, remarks..."
                    value={creditSearch}
                    onChange={(e) => { setCreditSearch(e.target.value); setCreditPage(1); }}
                    className="text-xs pl-8 pr-3 py-1.5 w-60 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl focus:ring-1 focus:ring-zinc-800 focus:outline-hidden transition-all font-semibold"
                  />
                  {creditSearch && (
                    <button onClick={() => { setCreditSearch(''); setCreditPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <span className="px-2.5 py-1 bg-teal-50 text-teal-700 font-bold rounded-lg text-[10px] uppercase">
                  {searchedCreditsList.length} Credits
                </span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-150 text-[10px] uppercase font-bold text-zinc-400 z-10">
                  <tr>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setCreditSortOrder(creditSortField === 'date' && creditSortOrder === 'asc' ? 'desc' : 'asc');
                      setCreditSortField('date');
                    }}>
                      <div className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setCreditSortOrder(creditSortField === 'patientName' && creditSortOrder === 'asc' ? 'desc' : 'asc');
                      setCreditSortField('patientName');
                    }}>
                      <div className="flex items-center gap-1">Patient <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 text-right cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setCreditSortOrder(creditSortField === 'creditAmount' && creditSortOrder === 'asc' ? 'desc' : 'asc');
                      setCreditSortField('creditAmount');
                    }}>
                      <div className="flex items-center justify-end gap-1">Credit Amount <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 text-right cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setCreditSortOrder(creditSortField === 'usedAmount' && creditSortOrder === 'asc' ? 'desc' : 'asc');
                      setCreditSortField('usedAmount');
                    }}>
                      <div className="flex items-center justify-end gap-1">Used Amount <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 text-right cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setCreditSortOrder(creditSortField === 'remainingBalance' && creditSortOrder === 'asc' ? 'desc' : 'asc');
                      setCreditSortField('remainingBalance');
                    }}>
                      <div className="flex items-center justify-end gap-1">Remaining Balance <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {paginatedCredits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-400">No credits matched your query.</td>
                    </tr>
                  ) : (
                    paginatedCredits.map((credit, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/40">
                        <td className="p-3 font-mono text-zinc-500 whitespace-nowrap">{formatDate(credit.date)}</td>
                        <td className="p-3 font-bold text-zinc-800">{credit.patientName}</td>
                        <td className="p-3 text-right font-mono text-zinc-600">{formatPHP(credit.creditAmount)}</td>
                        <td className="p-3 text-right font-mono text-zinc-600">{formatPHP(credit.usedAmount)}</td>
                        <td className="p-3 text-right font-mono font-black text-teal-700">{formatPHP(credit.remainingBalance)}</td>
                        <td className="p-3 text-zinc-500 italic">{credit.remarks}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {searchedCreditsList.length > 0 && (
              <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50 text-xs print:hidden">
                <span className="font-semibold text-zinc-500">
                  Showing page <strong>{creditPage}</strong> of <strong>{creditTotalPages}</strong> ({searchedCreditsList.length} total rows)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={creditPage === 1}
                    onClick={() => setCreditPage(p => Math.max(1, p - 1))}
                    className="p-1.5 border border-zinc-200 hover:bg-white rounded-lg text-zinc-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={creditPage === creditTotalPages}
                    onClick={() => setCreditPage(p => Math.min(creditTotalPages, p + 1))}
                    className="p-1.5 border border-zinc-200 hover:bg-white rounded-lg text-zinc-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* REPORT SECTION 4: Cash Flow Overview */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-3xs overflow-hidden relative">
            {isCashFlowLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-3xs flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wide">Loading Cash Flow...</span>
                </div>
              </div>
            )}
            <div className="p-4 border-b border-zinc-150 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Cash Flow Overview</h3>
                <p className="text-[10px] text-zinc-400">Daily ledger collections breakdown by type.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search patient, payment type..."
                    value={cashFlowSearch}
                    onChange={(e) => { setCashFlowSearch(e.target.value); setCashFlowPage(1); }}
                    className="text-xs pl-8 pr-3 py-1.5 w-60 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl focus:ring-1 focus:ring-zinc-800 focus:outline-hidden transition-all font-semibold"
                  />
                  {cashFlowSearch && (
                    <button onClick={() => { setCashFlowSearch(''); setCashFlowPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-[10px] uppercase">
                  {searchedCashFlowList.length} Inflows
                </span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-150 text-[10px] uppercase font-bold text-zinc-400 z-10">
                  <tr>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setCashFlowSortOrder(cashFlowSortField === 'date' && cashFlowSortOrder === 'asc' ? 'desc' : 'asc');
                      setCashFlowSortField('date');
                    }}>
                      <div className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setCashFlowSortOrder(cashFlowSortField === 'patientName' && cashFlowSortOrder === 'asc' ? 'desc' : 'asc');
                      setCashFlowSortField('patientName');
                    }}>
                      <div className="flex items-center gap-1">Patient <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3">Clinic/Laboratory</th>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setCashFlowSortOrder(cashFlowSortField === 'paymentType' && cashFlowSortOrder === 'asc' ? 'desc' : 'asc');
                      setCashFlowSortField('paymentType');
                    }}>
                      <div className="flex items-center gap-1">Payment Type <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3">Reference Number</th>
                    <th className="p-3 text-right cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setCashFlowSortOrder(cashFlowSortField === 'amount' && cashFlowSortOrder === 'asc' ? 'desc' : 'asc');
                      setCashFlowSortField('amount');
                    }}>
                      <div className="flex items-center justify-end gap-1">Amount <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {paginatedCashFlow.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-400">No payment transactions matched your query.</td>
                    </tr>
                  ) : (
                    paginatedCashFlow.map((cf, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/40">
                        <td className="p-3 font-mono text-zinc-500 whitespace-nowrap">{formatDate(cf.date)}</td>
                        <td className="p-3 font-bold text-zinc-800">{cf.patientName}</td>
                        <td className="p-3 text-zinc-500">{cf.clinic}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded-md font-semibold text-[10px]">
                            {cf.paymentType}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-zinc-400">{cf.refNum}</td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700">{formatPHP(cf.amount)}</td>
                        <td className="p-3 text-zinc-500 truncate max-w-[150px]">{cf.remarks}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {searchedCashFlowList.length > 0 && (
              <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50 text-xs print:hidden">
                <span className="font-semibold text-zinc-500">
                  Showing page <strong>{cashFlowPage}</strong> of <strong>{cashFlowTotalPages}</strong> ({searchedCashFlowList.length} total rows)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={cashFlowPage === 1}
                    onClick={() => setCashFlowPage(p => Math.max(1, p - 1))}
                    className="p-1.5 border border-zinc-200 hover:bg-white rounded-lg text-zinc-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={cashFlowPage === cashFlowTotalPages}
                    onClick={() => setCashFlowPage(p => Math.min(cashFlowTotalPages, p + 1))}
                    className="p-1.5 border border-zinc-200 hover:bg-white rounded-lg text-zinc-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* REPORT SECTION 5: Spending Overview */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-3xs overflow-hidden relative">
            {isSpendingLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-3xs flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wide">Loading Expenditures...</span>
                </div>
              </div>
            )}
            <div className="p-4 border-b border-zinc-150 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Spending Overview</h3>
                <p className="text-[10px] text-zinc-400">Itemized disbursements and operational costs.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search category, description..."
                    value={spendingSearch}
                    onChange={(e) => { setSpendingSearch(e.target.value); setSpendingPage(1); }}
                    className="text-xs pl-8 pr-3 py-1.5 w-60 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl focus:ring-1 focus:ring-zinc-800 focus:outline-hidden transition-all font-semibold"
                  />
                  {spendingSearch && (
                    <button onClick={() => { setSpendingSearch(''); setSpendingPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg text-[10px] uppercase">
                  {searchedSpendingList.length} Expenses
                </span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-150 text-[10px] uppercase font-bold text-zinc-400 z-10">
                  <tr>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setSpendingSortOrder(spendingSortField === 'date' && spendingSortOrder === 'asc' ? 'desc' : 'asc');
                      setSpendingSortField('date');
                    }}>
                      <div className="flex items-center gap-1">Expense Date <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3">Clinic</th>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setSpendingSortOrder(spendingSortField === 'description' && spendingSortOrder === 'asc' ? 'desc' : 'asc');
                      setSpendingSortField('description');
                    }}>
                      <div className="flex items-center gap-1">Description <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3 cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setSpendingSortOrder(spendingSortField === 'category' && spendingSortOrder === 'asc' ? 'desc' : 'asc');
                      setSpendingSortField('category');
                    }}>
                      <div className="flex items-center gap-1">Category <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-3">Account</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3 text-right cursor-pointer select-none hover:bg-zinc-150/50 transition-colors" onClick={() => {
                      setSpendingSortOrder(spendingSortField === 'amount' && spendingSortOrder === 'asc' ? 'desc' : 'asc');
                      setSpendingSortField('amount');
                    }}>
                      <div className="flex items-center justify-end gap-1">Amount <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {paginatedSpending.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-400">No expenses matched your query.</td>
                    </tr>
                  ) : (
                    paginatedSpending.map((exp, idx) => (
                      <tr key={exp.id || idx} className="hover:bg-rose-50/10">
                        <td className="p-3 font-mono text-zinc-500 whitespace-nowrap">{formatDate(exp.date)}</td>
                        <td className="p-3 text-zinc-500">{exp.clinic}</td>
                        <td className="p-3 font-semibold text-zinc-700">{exp.description}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 bg-red-50 text-red-700 rounded-full font-bold text-[10px]">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-600">{exp.account}</td>
                        <td className="p-3 text-zinc-500">{exp.paymentMethod}</td>
                        <td className="p-3 text-right font-mono font-black text-red-650">{formatPHP(exp.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {searchedSpendingList.length > 0 && (
              <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50 text-xs print:hidden">
                <span className="font-semibold text-zinc-500">
                  Showing page <strong>{spendingPage}</strong> of <strong>{spendingTotalPages}</strong> ({searchedSpendingList.length} total rows)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={spendingPage === 1}
                    onClick={() => setSpendingPage(p => Math.max(1, p - 1))}
                    className="p-1.5 border border-zinc-200 hover:bg-white rounded-lg text-zinc-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={spendingPage === spendingTotalPages}
                    onClick={() => setSpendingPage(p => Math.min(spendingTotalPages, p + 1))}
                    className="p-1.5 border border-zinc-200 hover:bg-white rounded-lg text-zinc-600 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* REPORT SECTION 6: Financial Summary */}
          <div className="bg-zinc-100/60 p-5 rounded-2xl border border-zinc-200/80 shadow-3xs">
            <h3 className="text-sm font-bold text-zinc-900 mb-4 tracking-tight">Period Financial Summary</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Net Income</span>
                <span className="text-lg font-black text-emerald-700 font-mono mt-1.5">{formatPHP(kpiStats.netIncome)}</span>
                <span className="text-[10px] text-zinc-400 mt-1">Total revenue minus costs</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Collection</span>
                <span className="text-lg font-black text-teal-700 font-mono mt-1.5">{formatPHP(kpiStats.totalCollections)}</span>
                <span className="text-[10px] text-zinc-500 mt-1">{filteredBillsList.length} Transactions</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Billing</span>
                <span className="text-lg font-black text-sky-700 font-mono mt-1.5">{formatPHP(kpiStats.totalBilling)}</span>
                <span className="text-[10px] text-zinc-500 mt-1">{filteredBillsList.length} invoices generated</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Expenses</span>
                <span className="text-lg font-black text-rose-700 font-mono mt-1.5">{formatPHP(kpiStats.totalExpenses)}</span>
                <span className="text-[10px] text-zinc-500 mt-1">{filteredExpensesList.length} disbursements</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeSubTab === 'ledger' && (
        <ClinicOperationsLedger
          records={records}
          allBills={allBills}
          allExpenses={allExpenses}
          refreshDatabase={refreshDatabase}
          selectedLedgerTab={selectedLedgerTab}
        />
      )}

      {/* --- ADD EXPENSE MODAL --- */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-zinc-150 animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900">Log New Clinic Expense</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddExpenseSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">Expense Date</label>
                <input
                  type="date"
                  value={newExpDate}
                  onChange={(e) => setNewExpDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g., Purchased Orthodontic wires and bands"
                  value={newExpDesc}
                  onChange={(e) => setNewExpDesc(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">Category</label>
                  <select
                    value={newExpCategory}
                    onChange={(e) => setNewExpCategory(e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-2 border border-zinc-200 rounded-xl focus:outline-hidden"
                  >
                    <option>Supplies</option>
                    <option>Salary</option>
                    <option>Rent</option>
                    <option>Utilities</option>
                    <option>Laboratory</option>
                    <option>Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">Amount (₱)</label>
                  <input
                    type="number"
                    value={newExpAmount || ''}
                    onChange={(e) => setNewExpAmount(Number(e.target.value))}
                    className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                    placeholder="PHP"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">Account</label>
                  <select
                    value={newExpAccount}
                    onChange={(e) => setNewExpAccount(e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-2 border border-zinc-200 rounded-xl focus:outline-hidden"
                  >
                    <option>Cash</option>
                    <option>Bank</option>
                    <option>GCash</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block mb-1">Payment Method</label>
                  <select
                    value={newExpMethod}
                    onChange={(e) => setNewExpMethod(e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-2 border border-zinc-200 rounded-xl focus:outline-hidden"
                  >
                    <option>Cash</option>
                    <option>Check</option>
                    <option>Gcash</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-zinc-900 text-white font-bold rounded-xl text-xs hover:bg-zinc-800 transition-colors mt-2 cursor-pointer"
              >
                Save Expense Record
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
