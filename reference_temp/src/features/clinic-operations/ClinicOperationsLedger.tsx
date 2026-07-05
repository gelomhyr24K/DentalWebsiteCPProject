import React, { useState, useMemo, useEffect } from 'react';
import { PatientRecord } from '../../types';
import { clinicStorage } from '../../lib/indexedDBStorage';
const localStorage = clinicStorage;
import { 
  TrendingUp, Coins, Calendar, Users, FileText, Download, Printer, Search, 
  RotateCcw, ArrowUpDown, ChevronLeft, ChevronRight, Plus, CheckCircle, 
  X, Filter, LayoutDashboard, Landmark, DollarSign, Wallet, ShieldCheck, PieChart, Info,
  AlertTriangle, Check, BookOpen, Settings, Eye, HelpCircle, FileCheck, RefreshCw, Tag
} from 'lucide-react';

interface ClinicOperationsLedgerProps {
  records: PatientRecord[];
  allBills: any[];
  allExpenses: any[];
  refreshDatabase: () => void;
  selectedLedgerTab: 'patient-registry' | 'or-management' | 'daily-collection' | 'patient-ledger' | 'clinic-expense' | 'monthly-summary' | 'audit-trail' | 'reconciliation';
}

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

export default function ClinicOperationsLedger({
  records,
  allBills,
  allExpenses,
  refreshDatabase,
  selectedLedgerTab
}: ClinicOperationsLedgerProps) {
  
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

  // Deterministic payment type resolver
  const paymentTypes = ['Cash', 'GCash', 'Credit Card', 'Bank Transfer'];
  const getPaymentType = (bill: any) => {
    if (bill.remarks?.toLowerCase().includes('gcash')) return 'GCash';
    if (bill.remarks?.toLowerCase().includes('cash')) return 'Cash';
    if (bill.remarks?.toLowerCase().includes('card')) return 'Credit Card';
    if (bill.remarks?.toLowerCase().includes('cheque') || bill.remarks?.toLowerCase().includes('check')) return 'Bank Transfer';
    const charSum = bill.id.split('').reduce((sum: number, c: string) => sum + c.charCodeAt(0), 0);
    return paymentTypes[charSum % paymentTypes.length];
  };

  return (
    <div className="space-y-6">
      
      {/* Inner Information Ribbon */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-3xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
              {selectedLedgerTab === 'patient-registry' && <>👤 Patient Registry Ledger</>}
              {selectedLedgerTab === 'or-management' && <>🧾 Official Receipt Management</>}
              {selectedLedgerTab === 'daily-collection' && <>📅 Daily Collection Register</>}
              {selectedLedgerTab === 'patient-ledger' && <>💳 Patient Financial Ledger</>}
              {selectedLedgerTab === 'clinic-expense' && <>💸 Clinic Expense Ledger</>}
              {selectedLedgerTab === 'monthly-summary' && <>📊 Monthly Financial Summary</>}
              {selectedLedgerTab === 'audit-trail' && <>🔒 Audit Trail History</>}
              {selectedLedgerTab === 'reconciliation' && <>⭐ Clinic Reconciliation</>}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {selectedLedgerTab === 'patient-registry' && "Digitized daily patient logbook generated automatically from clinical data."}
              {selectedLedgerTab === 'or-management' && "Configure receipt series booklets, manage receipt statuses, and issue official receipts."}
              {selectedLedgerTab === 'daily-collection' && "Real-time daily collection ledger with running totals and payment method breakdown."}
              {selectedLedgerTab === 'patient-ledger' && "Detailed individual accounting ledger showing diagnostic and financial records for each patient."}
              {selectedLedgerTab === 'clinic-expense' && "Track and categorize daily clinic operations expenses with automatic summary aggregation."}
              {selectedLedgerTab === 'monthly-summary' && "Consolidated monthly performance report covering collections, expenses, and transaction audits."}
              {selectedLedgerTab === 'audit-trail' && "Chronological, read-only system log tracking every single financial modification and action."}
              {selectedLedgerTab === 'reconciliation' && "Smart diagnostic suite cross-checking record integrity across all clinical and financial modules."}
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => refreshDatabase()}
              className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync Data
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print view
            </button>
          </div>
        </div>
      </div>

      {/* --- SUB-SECTION 1: PATIENT REGISTRY --- */}
      {selectedLedgerTab === 'patient-registry' && (() => {
        const sortedBills = [...allBills].sort((a, b) => b.date.localeCompare(a.date));
        const groupedByDate: Record<string, any[]> = {};
        sortedBills.forEach(b => {
          if (!groupedByDate[b.date]) groupedByDate[b.date] = [];
          groupedByDate[b.date].push(b);
        });

        const processedRegistry: any[] = [];
        Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a)).forEach(date => {
          const daily = groupedByDate[date].sort((a, b) => a.id.localeCompare(b.id));
          daily.forEach((bill, index) => {
            const patient = records.find(p => p.id === bill.patientId);
            const birthday = patient?.personalInfo.birthdate || 'N/A';
            let age = 'N/A';
            if (birthday && birthday !== 'N/A') {
              const birthYear = new Date(birthday).getFullYear();
              if (!isNaN(birthYear)) {
                age = String(new Date().getFullYear() - birthYear);
              }
            }

            processedRegistry.push({
              date,
              dailyNumber: index + 1,
              patientName: bill.patientName,
              address: patient?.personalInfo.address || 'Metro Manila',
              age,
              birthday,
              assignedDentist: bill.createdBy || 'Dr. Maria Jessica Tanarte',
              associatedDentist: patient?.personalInfo.referredBy || 'None',
              performedProcedure: bill.services || 'Dental Checkup',
              totalCharged: bill.netAmount,
              paymentStatus: bill.status || 'UNPAID'
            });
          });
        });

        const filteredRegistry = processedRegistry.filter(entry => 
          entry.patientName.toLowerCase().includes(patientRegistrySearch.toLowerCase()) ||
          entry.performedProcedure.toLowerCase().includes(patientRegistrySearch.toLowerCase()) ||
          entry.assignedDentist.toLowerCase().includes(patientRegistrySearch.toLowerCase())
        );

        return (
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-3xs overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
              <h3 className="text-sm font-bold text-zinc-950">Patient Registry Daily Logbook</h3>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search patient, procedure, dentist..."
                  value={patientRegistrySearch}
                  onChange={(e) => setPatientRegistrySearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 font-bold uppercase text-[10px]">
                    <th className="p-4">Date</th>
                    <th className="p-4">Daily Patient No.</th>
                    <th className="p-4">Patient Name</th>
                    <th className="p-4">Address</th>
                    <th className="p-4">Age / Birthday</th>
                    <th className="p-4">Assigned Dentist</th>
                    <th className="p-4">Associated Dentist</th>
                    <th className="p-4">Performed Procedure</th>
                    <th className="p-4 text-right">Total Charged</th>
                    <th className="p-4 text-center">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700 font-semibold">
                  {filteredRegistry.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-zinc-400">No registry entries found.</td>
                    </tr>
                  ) : (
                    filteredRegistry.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/40">
                        <td className="p-4 font-mono text-zinc-500">{formatDate(entry.date)}</td>
                        <td className="p-4 text-teal-600 font-mono font-bold">Patient #{entry.dailyNumber}</td>
                        <td className="p-4 text-zinc-900 font-bold">{entry.patientName}</td>
                        <td className="p-4 text-zinc-500 max-w-[120px] truncate">{entry.address}</td>
                        <td className="p-4 font-mono text-zinc-500">
                          {entry.age} yrs <span className="text-[10px] text-zinc-400">({formatDate(entry.birthday)})</span>
                        </td>
                        <td className="p-4 text-zinc-600">{entry.assignedDentist}</td>
                        <td className="p-4 text-zinc-500 font-normal">{entry.associatedDentist}</td>
                        <td className="p-4 text-zinc-600 truncate max-w-[150px]">{entry.performedProcedure}</td>
                        <td className="p-4 text-right font-mono text-zinc-900">{formatPHP(entry.totalCharged)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            entry.paymentStatus === 'PAID' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' 
                              : entry.paymentStatus === 'PARTIALLY PAID'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/50'
                          }`}>
                            {entry.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* --- SUB-SECTION 2: OFFICIAL RECEIPTS --- */}
      {selectedLedgerTab === 'or-management' && (() => {
        const isBookletCompleted = orCurrent > orEnd;
        
        const pendingReceiptBills = allBills.filter(b => {
          const hasOR = generatedReceipts.some(r => r.billId === b.id);
          const hasPayment = b.paidAmount > 0;
          return !hasOR && hasPayment;
        });

        const filteredIssuedReceipts = generatedReceipts.filter(r => 
          r.id.toLowerCase().includes(orSearchQuery.toLowerCase()) ||
          r.patientName.toLowerCase().includes(orSearchQuery.toLowerCase()) ||
          r.status.toLowerCase().includes(orSearchQuery.toLowerCase())
        );

        const handleGenerateOR = (bill: any, discountType: string = 'None') => {
          if (isBookletCompleted) {
            alert("Receipt Booklet Completed! Please configure/register a new series booklet first.");
            return;
          }

          let discountPercent = 0;
          if (discountType === 'Senior Citizen' || discountType === 'PWD') {
            discountPercent = 20;
          }

          const baseAmount = bill.paidAmount;
          const discountValue = baseAmount * (discountPercent / 100);
          const netTotal = baseAmount - discountValue;

          const newReceipt = {
            id: `OR-${orSeries}-${orCurrent}`,
            date: new Date().toISOString().split('T')[0],
            billId: bill.id,
            patientId: bill.patientId,
            patientName: bill.patientName,
            doctor: bill.createdBy || 'Dr. Maria Jessica Tanarte',
            services: bill.services,
            subtotal: baseAmount,
            discount: discountValue,
            discountType,
            netTotal,
            amountInWords: numberToWords(netTotal),
            attendedBy: currentUser?.name || 'Dr. Maria Jessica Tanarte',
            status: 'Paid',
            createdAt: new Date().toISOString()
          };

          const updatedReceipts = [newReceipt, ...generatedReceipts];
          setGeneratedReceipts(updatedReceipts);
          setOrCurrent(prev => prev + 1);

          logAuditEvent(
            'Generate Receipt',
            `Generated Official Receipt ${newReceipt.id} for patient ${bill.patientName}`,
            bill.patientName,
            bill.services,
            netTotal
          );

          alert(`Official Receipt ${newReceipt.id} successfully generated!`);
        };

        const handleUpdateReceiptStatus = (receiptId: string, newStatus: 'Draft' | 'Paid' | 'Cancelled' | 'Void' | 'Reprinted') => {
          const updated = generatedReceipts.map(r => {
            if (r.id === receiptId) {
              return { ...r, status: newStatus };
            }
            return r;
          });
          setGeneratedReceipts(updated);

          const rec = generatedReceipts.find(r => r.id === receiptId);
          logAuditEvent(
            'Update Receipt Status',
            `Modified receipt status of ${receiptId} to ${newStatus}`,
            rec?.patientName || 'N/A',
            rec?.services || 'N/A',
            rec?.netTotal || 0
          );
        };

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-4 self-start">
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2 border-b border-zinc-100 pb-3">
                <Settings className="w-4 h-4 text-zinc-500" /> Receipt Series Management
              </h3>
              
              {!isOwner && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-[11px] font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Configuration is restricted to the <strong>Clinic Owner</strong> role.</span>
                </div>
              )}

              {isBookletCompleted && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[11px] font-bold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p>Receipt Booklet Completed!</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Receipt Series Code</label>
                  <input
                    type="text"
                    value={orSeries}
                    disabled={!isOwner}
                    onChange={(e) => setOrSeries(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 rounded-xl focus:outline-hidden disabled:bg-zinc-50 disabled:text-zinc-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Starting OR No.</label>
                    <input
                      type="number"
                      value={orStart}
                      disabled={!isOwner}
                      onChange={(e) => setOrStart(Number(e.target.value))}
                      className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 rounded-xl focus:outline-hidden disabled:bg-zinc-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Ending OR No.</label>
                    <input
                      type="number"
                      value={orEnd}
                      disabled={!isOwner}
                      onChange={(e) => setOrEnd(Number(e.target.value))}
                      className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 rounded-xl focus:outline-hidden disabled:bg-zinc-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Next OR Number</label>
                  <input
                    type="number"
                    value={orCurrent}
                    disabled={!isOwner}
                    onChange={(e) => setOrCurrent(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold text-teal-700 px-3 py-2 border border-zinc-200 rounded-xl focus:outline-hidden disabled:bg-zinc-50"
                  />
                </div>

                {isOwner && (
                  <button
                    onClick={() => {
                      setOrCurrent(orStart);
                      logAuditEvent('Register Booklet', `Registered new booklet series ${orSeries} starting at ${orStart}`);
                      alert("Receipt Series Booklet successfully configured!");
                    }}
                    className="w-full py-2 bg-teal-600 text-white font-bold rounded-xl text-xs hover:bg-teal-700 transition-colors cursor-pointer"
                  >
                    Register / Reset Booklet Series
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-4">
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-teal-600" /> Generate Official Receipts
                </h3>
                
                <div className="overflow-x-auto border border-zinc-100 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">Patient</th>
                        <th className="p-3">Billing Reference</th>
                        <th className="p-3">Amount Paid</th>
                        <th className="p-3">Discount Category</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-700 font-semibold">
                      {pendingReceiptBills.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-zinc-400">All patient payments have active Official Receipts.</td>
                        </tr>
                      ) : (
                        pendingReceiptBills.map((bill) => (
                          <tr key={bill.id} className="hover:bg-zinc-50/40">
                            <td className="p-3 text-zinc-900 font-bold">{bill.patientName}</td>
                            <td className="p-3 font-mono text-zinc-500">{bill.id}</td>
                            <td className="p-3 font-mono text-zinc-900">{formatPHP(bill.paidAmount)}</td>
                            <td className="p-3">
                              <select
                                id={`disc-select-${bill.id}`}
                                className="text-xs font-semibold px-2 py-1 border border-zinc-200 rounded-lg focus:outline-hidden"
                                defaultValue="None"
                              >
                                <option value="None">None (Regular)</option>
                                <option value="Senior Citizen">Senior Citizen (20%)</option>
                                <option value="PWD">PWD (20%)</option>
                                <option value="Solo Parent">Solo Parent</option>
                                <option value="Others">Others</option>
                              </select>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                disabled={isBookletCompleted}
                                onClick={() => {
                                  const selectElem = document.getElementById(`disc-select-${bill.id}`) as HTMLSelectElement;
                                  handleGenerateOR(bill, selectElem ? selectElem.value : 'None');
                                }}
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold disabled:opacity-50 cursor-pointer"
                              >
                                Issue OR
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-zinc-600" /> Issued Receipts Archive
                  </h3>
                  <div className="relative max-w-xs w-full">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search OR number, patient..."
                      value={orSearchQuery}
                      onChange={(e) => setOrSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">Receipt No.</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Patient Name</th>
                        <th className="p-3">Net Sum</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-700 font-semibold">
                      {filteredIssuedReceipts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-zinc-400">No issued receipts match search.</td>
                        </tr>
                      ) : (
                        filteredIssuedReceipts.map((receipt) => (
                          <tr key={receipt.id} className="hover:bg-zinc-50/40">
                            <td className="p-3 font-mono font-bold text-teal-700">{receipt.id}</td>
                            <td className="p-3 font-mono text-zinc-500">{formatDate(receipt.date)}</td>
                            <td className="p-3 text-zinc-900 font-bold">{receipt.patientName}</td>
                            <td className="p-3 font-mono text-zinc-900">{formatPHP(receipt.netTotal)}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                                receipt.status === 'Paid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                  : receipt.status === 'Cancelled'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200/50'
                                  : receipt.status === 'Void'
                                  ? 'bg-zinc-100 text-zinc-500 border border-zinc-200/50'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200/50'
                              }`}>
                                {receipt.status}
                              </span>
                            </td>
                            <td className="p-3 text-right flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setActiveReceiptPreview(receipt)}
                                className="p-1 border border-zinc-200 hover:bg-zinc-50 rounded-lg text-zinc-600 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              
                              {receipt.status !== 'Cancelled' && receipt.status !== 'Void' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateReceiptStatus(receipt.id, 'Cancelled')}
                                    className="px-1.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleUpdateReceiptStatus(receipt.id, 'Void')}
                                    className="px-1.5 py-1 text-zinc-600 hover:bg-zinc-50 rounded-lg text-[10px] font-bold cursor-pointer"
                                  >
                                    Void
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- SUB-SECTION 3: DAILY COLLECTION REGISTER --- */}
      {selectedLedgerTab === 'daily-collection' && (() => {
        const registryByDate: Record<string, any[]> = {};
        [...allBills].sort((a, b) => a.date.localeCompare(b.date)).forEach(b => {
          if (!registryByDate[b.date]) registryByDate[b.date] = [];
          registryByDate[b.date].push(b);
        });

        const processedCollections: any[] = [];
        Object.keys(registryByDate).sort((a, b) => b.localeCompare(a)).forEach(date => {
          const daily = registryByDate[date].sort((a, b) => a.id.localeCompare(b.id));
          let dailyTotal = 0;
          daily.forEach((bill, index) => {
            dailyTotal += bill.paidAmount || 0;
            const receipt = generatedReceipts.find(r => r.billId === bill.id);
            
            processedCollections.push({
              date,
              dailyNumber: index + 1,
              patientName: bill.patientName,
              treatment: bill.services || 'Consultation',
              chargedAmount: bill.netAmount,
              paidAmount: bill.paidAmount,
              paymentMethod: getPaymentType(bill),
              receiptNumber: receipt ? receipt.id : 'Pending OR',
              collectedBy: bill.createdBy || 'Dr. Maria Jessica Tanarte',
              runningDailyTotal: dailyTotal
            });
          });
        });

        const filteredCollections = processedCollections.filter(c => 
          c.patientName.toLowerCase().includes(dailyColSearchQuery.toLowerCase()) ||
          c.treatment.toLowerCase().includes(dailyColSearchQuery.toLowerCase()) ||
          c.receiptNumber.toLowerCase().includes(dailyColSearchQuery.toLowerCase())
        );

        const totalCollectionsSum = filteredCollections.reduce((sum, c) => sum + c.paidAmount, 0);

        return (
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-3xs overflow-hidden space-y-4">
            <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Daily Collections Cash Ledger</h3>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search patient, receipt, procedure..."
                  value={dailyColSearchQuery}
                  onChange={(e) => setDailyColSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 font-bold uppercase text-[10px]">
                    <th className="p-4">Date</th>
                    <th className="p-4">Daily Patient No.</th>
                    <th className="p-4">Patient Name</th>
                    <th className="p-4">Treatment/Procedure</th>
                    <th className="p-4 text-right">Charged Amount</th>
                    <th className="p-4 text-right">Paid/Collected</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4">Receipt Number</th>
                    <th className="p-4">Collected By</th>
                    <th className="p-4 text-right">Running Daily Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700 font-semibold">
                  {filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-zinc-400 font-medium">No collection data recorded.</td>
                    </tr>
                  ) : (
                    filteredCollections.map((col, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/40">
                        <td className="p-4 font-mono text-zinc-500">{formatDate(col.date)}</td>
                        <td className="p-4 text-zinc-400 font-mono">Patient #{col.dailyNumber}</td>
                        <td className="p-4 text-zinc-900 font-bold">{col.patientName}</td>
                        <td className="p-4 text-zinc-600 truncate max-w-[150px]">{col.treatment}</td>
                        <td className="p-4 text-right font-mono text-zinc-500">{formatPHP(col.chargedAmount)}</td>
                        <td className="p-4 text-right font-mono font-black text-emerald-700">{formatPHP(col.paidAmount)}</td>
                        <td className="p-4 font-bold text-zinc-600">
                          <span className="px-2 py-0.5 bg-zinc-100 rounded-lg text-[10px]">{col.paymentMethod}</span>
                        </td>
                        <td className="p-4 font-mono font-bold text-teal-700">
                          {col.receiptNumber}
                        </td>
                        <td className="p-4 text-zinc-500">{col.collectedBy}</td>
                        <td className="p-4 text-right font-mono text-teal-800 font-bold">{formatPHP(col.runningDailyTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-5 border-t border-zinc-100 bg-zinc-50/40 flex items-center justify-between text-xs font-bold text-zinc-900">
              <span>Consolidated Register Total:</span>
              <span className="font-mono text-lg text-emerald-800 font-black">{formatPHP(totalCollectionsSum)}</span>
            </div>
          </div>
        );
      })()}

      {/* --- SUB-SECTION 4: PATIENT FINANCIAL LEDGER --- */}
      {selectedLedgerTab === 'patient-ledger' && (() => {
        const selectedPatient = records.find(p => p.id === ledgerPatientId);
        const patientBills = allBills.filter(b => b.patientId === ledgerPatientId);
        
        let patientAge = 'N/A';
        if (selectedPatient?.personalInfo.birthdate) {
          const birthYear = new Date(selectedPatient.personalInfo.birthdate).getFullYear();
          if (!isNaN(birthYear)) {
            patientAge = String(new Date().getFullYear() - birthYear);
          }
        }

        const totalCharged = patientBills.reduce((sum, b) => sum + b.netAmount, 0);
        const totalPaid = patientBills.reduce((sum, b) => sum + b.paidAmount, 0);
        const totalOutstanding = totalCharged - totalPaid;

        return (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-4 print:hidden">
              <h3 className="text-sm font-bold text-zinc-950">Select Patient Ledger Card</h3>
              <div className="max-w-md">
                <select
                  value={ledgerPatientId}
                  onChange={(e) => setLedgerPatientId(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 border border-zinc-200 rounded-xl focus:outline-hidden"
                >
                  <option value="">-- Search and Select Patient --</option>
                  {records.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.personalInfo.lastName}, {p.personalInfo.firstName} (ID: {p.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedPatient ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Patient Information</span>
                    <h4 className="text-base font-black text-zinc-900 mt-2">{selectedPatient.personalInfo.lastName}, {selectedPatient.personalInfo.firstName}</h4>
                    <p className="text-xs text-zinc-500 mt-1">Age / Sex: {patientAge} yrs / {selectedPatient.personalInfo.sex || 'N/A'}</p>
                    <p className="text-xs text-zinc-500">Address: {selectedPatient.personalInfo.address || 'N/A'}</p>
                  </div>
                  
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Total Historical Balance</span>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-zinc-500">Total Charged:</span>
                        <span className="font-mono text-zinc-800">{formatPHP(totalCharged)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-emerald-600">Total Collected:</span>
                        <span className="font-mono text-emerald-700">{formatPHP(totalPaid)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Patient Outstanding Balance</span>
                    <div className="mt-1.5">
                      <span className={`text-2xl font-black font-mono ${totalOutstanding > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {formatPHP(totalOutstanding)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-3xs overflow-hidden">
                  <div className="p-5 border-b border-zinc-100">
                    <h3 className="text-sm font-bold text-zinc-950">Patient Accounting Card History</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 font-bold uppercase text-[10px]">
                          <th className="p-4">Date</th>
                          <th className="p-4">Reference ID</th>
                          <th className="p-4">Treatment / Procedure</th>
                          <th className="p-4 text-right">Quotation Amount</th>
                          <th className="p-4 text-right">Paid Amount</th>
                          <th className="p-4 text-right">Remaining Balance</th>
                          <th className="p-4">Receipt Number</th>
                          <th className="p-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-zinc-700 font-semibold">
                        {patientBills.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-6 text-center text-zinc-400">No ledger records found for this patient.</td>
                          </tr>
                        ) : (
                          patientBills.map((b) => {
                            const outstanding = b.netAmount - b.paidAmount;
                            const receipt = generatedReceipts.find(r => r.billId === b.id);
                            return (
                              <tr key={b.id} className="hover:bg-zinc-50/40">
                                <td className="p-4 font-mono text-zinc-500">{formatDate(b.date)}</td>
                                <td className="p-4 font-mono text-zinc-400">{b.id}</td>
                                <td className="p-4 text-zinc-900 font-bold">{b.services}</td>
                                <td className="p-4 text-right font-mono text-zinc-800">{formatPHP(b.netAmount)}</td>
                                <td className="p-4 text-right font-mono text-emerald-700">{formatPHP(b.paidAmount)}</td>
                                <td className="p-4 text-right font-mono text-rose-700">{outstanding > 0 ? formatPHP(outstanding) : '₱0.00'}</td>
                                <td className="p-4 font-mono font-bold text-teal-700">{receipt ? receipt.id : 'Pending OR'}</td>
                                <td className="p-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    b.status === 'PAID' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' 
                                      : b.status === 'PARTIALLY PAID'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200/50'
                                  }`}>
                                    {b.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-zinc-200/80 text-center text-zinc-400 shadow-3xs">
                <Users className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
                <p className="text-xs font-bold">Please select a patient from the dropdown menu to inspect their ledger account card.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* --- SUB-SECTION 5: CLINIC EXPENSE --- */}
      {selectedLedgerTab === 'clinic-expense' && (() => {
        const categories = ["Meals", "Bookstore", "Materials", "Dental Materials", "Dental Laboratory", "Dental Technician", "Drugstore", "Clinic Maintenance", "Laundry"];
        
        const todayStr = new Date().toISOString().split('T')[0];
        const activeMonthStr = todayStr.substring(0, 7);
        const activeYearStr = todayStr.substring(0, 4);

        const dailySum = allExpenses.filter(e => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0);
        const monthlySum = allExpenses.filter(e => e.date && e.date.substring(0, 7) === activeMonthStr).reduce((sum, e) => sum + e.amount, 0);
        const yearlySum = allExpenses.filter(e => e.date && e.date.substring(0, 4) === activeYearStr).reduce((sum, e) => sum + e.amount, 0);

        const filteredExpenses = allExpenses.filter(e => 
          e.description.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
          e.category.toLowerCase().includes(expenseSearchQuery.toLowerCase())
        );

        const handleCreateExpense = (e: React.FormEvent) => {
          e.preventDefault();
          if (!expItemName || expAmount <= 0) return;

          const newExp = {
            id: `exp-${Date.now()}`,
            date: expDate,
            clinic: 'P&J Tanarte Dental Clinic',
            description: expItemName,
            category: expCategory,
            account: 'Cash',
            paymentMethod: 'Cash',
            amount: Number(expAmount),
            remarks: expRemarks,
            receiptRef: expReceiptRef
          };

          const updatedExpenses = [newExp, ...allExpenses];
          localStorage.setItem('DENTAL_EXPENSES_RECORD', JSON.stringify(updatedExpenses));
          
          logAuditEvent(
            'Add Expense',
            `Logged Operational Expense: ${expItemName} (${expCategory})`,
            'N/A',
            expItemName,
            expAmount
          );

          setExpItemName('');
          setExpAmount(0);
          setExpRemarks('');
          setExpReceiptRef('');
          
          refreshDatabase();
          alert("Expense record successfully recorded!");
        };

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs flex items-center gap-4">
                <div className="p-3.5 bg-rose-50 text-rose-700 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Today's Operating Expenses</span>
                  <span className="text-xl font-black font-mono text-rose-700 mt-1 block">{formatPHP(dailySum)}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs flex items-center gap-4">
                <div className="p-3.5 bg-rose-50 text-rose-700 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Current Month Expenses</span>
                  <span className="text-xl font-black font-mono text-rose-700 mt-1 block">{formatPHP(monthlySum)}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs flex items-center gap-4">
                <div className="p-3.5 bg-rose-50 text-rose-700 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Yearly Operational Expenses</span>
                  <span className="text-xl font-black font-mono text-rose-700 mt-1 block">{formatPHP(yearlySum)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-4 self-start print:hidden">
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2 border-b border-zinc-100 pb-3">
                  <Plus className="w-4 h-4 text-rose-600" /> Record Clinic Expense
                </h3>
                
                <form onSubmit={handleCreateExpense} className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Transaction Date</label>
                    <input
                      type="date"
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-zinc-950"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Expense Category</label>
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-2 border border-zinc-200 rounded-xl focus:outline-hidden"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Description / Item Name</label>
                    <input
                      type="text"
                      value={expItemName}
                      onChange={(e) => setExpItemName(e.target.value)}
                      placeholder="e.g. Purchase of Orthodontic Wires"
                      className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 rounded-xl focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Amount (₱ PHP)</label>
                    <input
                      type="number"
                      value={expAmount || ''}
                      onChange={(e) => setExpAmount(Number(e.target.value))}
                      className="w-full text-xs font-mono font-bold px-3 py-2 border border-zinc-200 rounded-xl focus:outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Receipt Reference (Ref No.)</label>
                    <input
                      type="text"
                      value={expReceiptRef}
                      onChange={(e) => setExpReceiptRef(e.target.value)}
                      placeholder="e.g. Inv #98124"
                      className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 rounded-xl focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Remarks / Note</label>
                    <textarea
                      value={expRemarks}
                      onChange={(e) => setExpRemarks(e.target.value)}
                      placeholder="Specific operation notes..."
                      rows={2}
                      className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 rounded-xl focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-zinc-950 text-white font-bold rounded-xl text-xs hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Log Operational Expense
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-500" /> Operational Disbursements Ledger
                  </h3>
                  <div className="relative max-w-xs w-full print:hidden">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search item, category..."
                      value={expenseSearchQuery}
                      onChange={(e) => setExpenseSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 font-bold uppercase text-[10px]">
                        <th className="p-3">Date</th>
                        <th className="p-3">Item / Description</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Receipt Ref</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-700 font-semibold">
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-zinc-400">No disbursements recorded.</td>
                        </tr>
                      ) : (
                        filteredExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-zinc-50/40">
                            <td className="p-3 font-mono text-zinc-500">{formatDate(exp.date)}</td>
                            <td className="p-3 text-zinc-900 font-bold">{exp.description}</td>
                            <td className="p-3 font-bold text-zinc-600">
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/40 rounded-lg text-[10px] font-bold">{exp.category}</span>
                            </td>
                            <td className="p-3 font-mono text-zinc-400">{exp.receiptRef || 'N/A'}</td>
                            <td className="p-3 text-right font-mono text-rose-700 font-bold">{formatPHP(exp.amount)}</td>
                            <td className="p-3 text-zinc-400 font-normal truncate max-w-[120px]">{exp.remarks || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- SUB-SECTION 6: MONTHLY FINANCIAL SUMMARY --- */}
      {selectedLedgerTab === 'monthly-summary' && (() => {
        const activeMonth = "2026-06";
        
        const monthlyBills = allBills.filter(b => b.date && b.date.substring(0, 7) === activeMonth);
        const monthlyExpenses = allExpenses.filter(e => e.date && e.date.substring(0, 7) === activeMonth);
        const monthlyReceipts = generatedReceipts.filter(r => r.date && r.date.substring(0, 7) === activeMonth);

        const totalMonthlyIncome = monthlyBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
        const totalMonthlyExpenses = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const netProfit = totalMonthlyIncome - totalMonthlyExpenses;

        const outstandingReceivables = monthlyBills.reduce((sum, b) => sum + (b.netAmount - b.paidAmount), 0);
        const totalPatients = new Set(monthlyBills.map(b => b.patientId)).size;
        const cancelledReceiptsCount = monthlyReceipts.filter(r => r.status === 'Cancelled' || r.status === 'Void').length;

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Monthly Net Profit Margin</span>
                <h3 className={`text-xl font-black font-mono mt-2 ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatPHP(netProfit)}
                </h3>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Gross Collections</span>
                <h3 className="text-xl font-black font-mono text-teal-700 mt-2">
                  {formatPHP(totalMonthlyIncome)}
                </h3>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Outstanding Receivables</span>
                <h3 className="text-xl font-black font-mono text-rose-700 mt-2">
                  {formatPHP(outstandingReceivables)}
                </h3>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Total Patients Seen</span>
                <h3 className="text-xl font-black font-mono text-zinc-900 mt-2">
                  {totalPatients} Patients
                </h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-4">
              <h3 className="text-sm font-bold text-zinc-950">Visual Monthly Cashflow Summary ({activeMonth})</h3>
              
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-800 mb-1.5">
                    <span>🟢 Gross Collections:</span>
                    <span className="font-mono">{formatPHP(totalMonthlyIncome)}</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-6 rounded-xl overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-xl transition-all" style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-zinc-800 mb-1.5">
                    <span>🔴 Operating Expenses:</span>
                    <span className="font-mono">{formatPHP(totalMonthlyExpenses)}</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-6 rounded-xl overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-xl transition-all" 
                      style={{ width: `${Math.min(100, (totalMonthlyExpenses / (totalMonthlyIncome || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- SUB-SECTION 7: AUDIT TRAIL --- */}
      {selectedLedgerTab === 'audit-trail' && (() => {
        const filteredLogs = auditTrailLogs.filter(log => 
          log.action.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
          log.details.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
          log.user.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
          log.patientName.toLowerCase().includes(auditSearchQuery.toLowerCase())
        );

        return (
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-3xs overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Clinic Financial Operations Audit Ledger
                </h3>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by action, user, details..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-400 font-bold uppercase text-[10px]">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Authorized User</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Patient</th>
                    <th className="p-4">Procedure/Item</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4">System Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700 font-semibold font-mono">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-zinc-400 font-sans font-normal">No audit actions recorded yet. New actions are logged dynamically.</td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/40">
                        <td className="p-4 text-zinc-500">
                          {formatDate(log.date)} <span className="text-[10px] text-zinc-400 font-normal">{log.time}</span>
                        </td>
                        <td className="p-4 text-zinc-900 font-bold font-sans">{log.user}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            log.action.includes('Generate') 
                              ? 'bg-teal-50 text-teal-700 border border-teal-200/40'
                              : log.action.includes('Status')
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/40'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/40'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-800 font-sans">{log.patientName}</td>
                        <td className="p-4 text-zinc-600 font-sans max-w-[120px] truncate">{log.procedure}</td>
                        <td className="p-4 text-right text-zinc-900 font-bold">
                          {log.amount > 0 ? formatPHP(log.amount) : '-'}
                        </td>
                        <td className="p-4 text-zinc-500 font-normal font-sans max-w-[200px] truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* --- SUB-SECTION 8: CLINIC RECONCILIATION --- */}
      {selectedLedgerTab === 'reconciliation' && (() => {
        const quotationsWithoutPayment = allBills.filter(b => b.status === 'UNPAID' || b.netAmount > b.paidAmount);

        const paymentsWithoutOR = allBills.filter(b => {
          const hasOR = generatedReceipts.some(r => r.id && r.billId === b.id && r.status !== 'Cancelled' && r.status !== 'Void');
          return b.paidAmount > 0 && !hasOR;
        });

        const orWithoutCollection = generatedReceipts.filter(r => {
          if (r.status === 'Cancelled' || r.status === 'Void') return false;
          const matchingBill = allBills.find(b => b.id === r.billId);
          return !matchingBill || matchingBill.paidAmount === 0;
        });

        const collectionOutsideMonth = allBills.filter(b => b.paidAmount > 0 && b.date && b.date.substring(0, 7) !== "2026-06");

        const progressNotesWithoutBill: any[] = [];
        records.forEach(patient => {
          const notes = patient.progressNotes || [];
          const patientBills = allBills.filter(b => b.patientId === patient.id);
          
          notes.forEach(note => {
            if (note.status === 'Saved') {
              const matchingBill = patientBills.some(b => b.date === note.visitDate || Math.abs(b.netAmount - note.netCost) < 5);
              if (!matchingBill) {
                progressNotesWithoutBill.push({
                  patientName: `${patient.personalInfo.lastName}, ${patient.personalInfo.firstName}`,
                  date: note.visitDate,
                  procedure: note.items?.map((it: any) => it.serviceProcedure).join(', ') || 'Dental Treatment',
                  amount: note.netCost
                });
              }
            }
          });
        });

        const orCounts: Record<string, number> = {};
        generatedReceipts.forEach(r => {
          orCounts[r.id] = (orCounts[r.id] || 0) + 1;
        });
        const duplicateORs = Object.keys(orCounts).filter(id => orCounts[id] > 1);

        const leakCancelledORPaid = generatedReceipts.filter(r => {
          if (r.status !== 'Cancelled' && r.status !== 'Void') return false;
          const bill = allBills.find(b => b.id === r.billId);
          return bill && bill.status === 'PAID' && bill.paidAmount > 0;
        });

        const totalIssuesCount = 
          (quotationsWithoutPayment.length > 0 ? 1 : 0) +
          (paymentsWithoutOR.length > 0 ? 1 : 0) +
          (orWithoutCollection.length > 0 ? 1 : 0) +
          (collectionOutsideMonth.length > 0 ? 1 : 0) +
          (progressNotesWithoutBill.length > 0 ? 1 : 0) +
          (duplicateORs.length > 0 ? 1 : 0) +
          (leakCancelledORPaid.length > 0 ? 1 : 0);

        return (
          <div className="space-y-6">
            <div className={`p-6 rounded-2xl border ${totalIssuesCount === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'} shadow-3xs`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${totalIssuesCount === 0 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                  {totalIssuesCount === 0 ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    {totalIssuesCount === 0 ? "Perfect System Balance Detected!" : `Audit Alerts: ${totalIssuesCount} Inconsistencies Flagged`}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Smart reconciliation checks cross-referencing notes, quotes, collections, and receipt books.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-black text-zinc-900 uppercase">1. Quotations without Payment</h4>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${quotationsWithoutPayment.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {quotationsWithoutPayment.length === 0 ? 'Consistent' : `${quotationsWithoutPayment.length} Flagged`}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">Unpaid/partially-paid quotes with outstanding balance.</p>
                {quotationsWithoutPayment.length > 0 && (
                  <div className="pt-2 max-h-[140px] overflow-y-auto space-y-1.5 divide-y divide-zinc-50">
                    {quotationsWithoutPayment.slice(0, 5).map(q => (
                      <div key={q.id} className="text-[11px] pt-1.5 flex justify-between font-semibold">
                        <span className="text-zinc-700">{q.patientName}</span>
                        <span className="font-mono text-rose-700">Bal: {formatPHP(q.netAmount - q.paidAmount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-black text-zinc-900 uppercase">2. Payments without OR</h4>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${paymentsWithoutOR.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {paymentsWithoutOR.length === 0 ? 'Consistent' : `${paymentsWithoutOR.length} Missing`}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">Confirmed collections missing an Official Receipt.</p>
                {paymentsWithoutOR.length > 0 && (
                  <div className="pt-2 max-h-[140px] overflow-y-auto space-y-1.5 divide-y divide-zinc-50">
                    {paymentsWithoutOR.slice(0, 5).map(p => (
                      <div key={p.id} className="text-[11px] pt-1.5 flex justify-between font-semibold">
                        <span className="text-zinc-700">{p.patientName}</span>
                        <span className="font-mono text-zinc-500">Paid: {formatPHP(p.paidAmount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-black text-zinc-900 uppercase">3. OR without Daily Collection</h4>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${orWithoutCollection.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {orWithoutCollection.length === 0 ? 'Consistent' : `${orWithoutCollection.length} Flagged`}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">Receipt is recorded but corresponding collections are missing.</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-black text-zinc-900 uppercase">4. Out-of-Scope Collections</h4>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${collectionOutsideMonth.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {collectionOutsideMonth.length === 0 ? 'Consistent' : `${collectionOutsideMonth.length} Out-of-Scope`}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">Collections recorded outside the standard active month scope.</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-black text-zinc-900 uppercase">5. Patient Treatment without Bill</h4>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${progressNotesWithoutBill.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {progressNotesWithoutBill.length === 0 ? 'Consistent' : `${progressNotesWithoutBill.length} Flagged`}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">Progress notes saved without matching bill/financial logs.</p>
                {progressNotesWithoutBill.length > 0 && (
                  <div className="pt-2 max-h-[140px] overflow-y-auto space-y-1.5 divide-y divide-zinc-50">
                    {progressNotesWithoutBill.slice(0, 5).map((n, idx) => (
                      <div key={idx} className="text-[11px] pt-1.5 flex justify-between font-semibold">
                        <span className="text-zinc-700">{n.patientName}</span>
                        <span className="font-mono text-zinc-500">Pending Bill</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-black text-zinc-900 uppercase">6. Duplicate OR Numbering</h4>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${duplicateORs.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {duplicateORs.length === 0 ? 'Consistent' : `${duplicateORs.length} Conflicted`}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">Duplicate receipts generated with overlapping numbering codes.</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-3xs space-y-3 md:col-span-2">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-black text-zinc-900 uppercase">⚠️ 7. Cancelled OR with Active Payment (Revenue Leak Check)</h4>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${leakCancelledORPaid.length === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {leakCancelledORPaid.length === 0 ? 'Consistent' : `${leakCancelledORPaid.length} Danger Leak`}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">Receipt canceled or voided but patient payment is still marked PAID.</p>
                {leakCancelledORPaid.length > 0 && (
                  <div className="pt-2 space-y-1.5 divide-y divide-zinc-50">
                    {leakCancelledORPaid.slice(0, 3).map(l => (
                      <div key={l.id} className="text-[11px] pt-1.5 flex justify-between font-semibold">
                        <span className="text-rose-700 font-bold">{l.id} (Patient: {l.patientName})</span>
                        <span className="font-mono text-zinc-700">Leak Value: {formatPHP(l.netTotal)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* --- OFFICIAL RECEIPT PRINT PREVIEW MODAL --- */}
      {activeReceiptPreview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-zinc-200/80 flex flex-col print:shadow-none print:border-none print:rounded-none">
            
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50 print:hidden">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Official Receipt Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800 flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setActiveReceiptPreview(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 border border-zinc-200 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 print:p-4 bg-zinc-50/20 print:bg-white flex-1 overflow-y-auto">
              <div className="border border-dashed border-zinc-300 p-6 bg-white rounded-xl space-y-5 print:border-solid print:border-zinc-400">
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-black text-zinc-900 uppercase">P&J Tanarte Dental Clinic</h2>
                  <p className="text-[10px] text-zinc-500">3F Central Medical Plaza, Manila, Philippines</p>
                  <p className="text-[10px] text-zinc-500">TIN: 123-456-789-000</p>
                </div>

                <div className="flex justify-between items-start text-xs border-y border-dashed border-zinc-200 py-3 mt-4">
                  <div>
                    <p><span className="text-zinc-400 font-bold uppercase text-[9px] block">Patient Name</span> <strong>{activeReceiptPreview.patientName}</strong></p>
                    <p className="text-[11px] text-zinc-500">ID: {activeReceiptPreview.patientId}</p>
                  </div>
                  <div className="text-right">
                    <p><span className="text-zinc-400 font-bold uppercase text-[9px] block">Official Receipt No.</span> <strong className="text-rose-700 font-mono text-sm">{activeReceiptPreview.id}</strong></p>
                    <p className="text-[11px] text-zinc-500">Date: {formatDate(activeReceiptPreview.date)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Clinical Services Tendered</span>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[10px] text-zinc-400 uppercase font-bold">
                        <th className="p-2">Description</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Unit Cost</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                      <tr>
                        <td className="p-2 text-zinc-950 font-bold">{activeReceiptPreview.services}</td>
                        <td className="p-2 text-center">1</td>
                        <td className="p-2 text-right font-mono">{formatPHP(activeReceiptPreview.subtotal)}</td>
                        <td className="p-2 text-right font-mono text-zinc-950">{formatPHP(activeReceiptPreview.subtotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-dashed border-zinc-200">
                  <div className="space-y-1 self-center">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase block">Amount in words</span>
                    <p className="text-xs font-bold text-zinc-800 italic leading-snug">
                      "{activeReceiptPreview.amountInWords}"
                    </p>
                  </div>
                  <div className="text-right text-xs space-y-1">
                    <div className="flex justify-between text-zinc-500">
                      <span>Subtotal:</span>
                      <span className="font-mono">{formatPHP(activeReceiptPreview.subtotal)}</span>
                    </div>
                    {activeReceiptPreview.discount > 0 && (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>Discount ({activeReceiptPreview.discountType}):</span>
                        <span className="font-mono">-{formatPHP(activeReceiptPreview.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-zinc-950 font-black text-sm border-t border-zinc-100 pt-2">
                      <span>Net Collected:</span>
                      <span className="font-mono text-teal-800">{formatPHP(activeReceiptPreview.netTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 mt-4 text-[10px]">
                  <div className="text-center border-t border-zinc-200 pt-2">
                    <p className="font-bold text-zinc-800">{activeReceiptPreview.doctor}</p>
                    <p className="text-[8px] text-zinc-400 uppercase">Verified Dentist</p>
                  </div>
                  <div className="text-center border-t border-zinc-200 pt-2">
                    <p className="font-bold text-zinc-800">{activeReceiptPreview.attendedBy}</p>
                    <p className="text-[8px] text-zinc-400 uppercase">Attended By</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
