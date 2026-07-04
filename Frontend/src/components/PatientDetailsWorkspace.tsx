import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Edit3, Printer, Search, User, Plus, Trash2, 
  ChevronDown, X, RotateCcw, AlertTriangle, Check
} from 'lucide-react';

interface PatientDetailsWorkspaceProps {
  patientData: any;
  setPatientData: (updater: any) => void;
  doctors: any[];
  settings: any;
  currentRecordId: string | null;
  patientCode: string;
  favoriteStatuses: string[];
  setFavoriteStatuses: (favs: string[]) => void;
  isSavingToDb: boolean;
  saveToDatabase: (saveAsNew?: boolean) => Promise<void>;
  handlePrint: () => void;
  handleDownloadPDF: () => void;
  isDownloading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onBack: () => void;
  children: React.ReactNode;
}

export const PatientDetailsWorkspace: React.FC<PatientDetailsWorkspaceProps> = ({
  patientData,
  setPatientData,
  doctors,
  settings,
  currentRecordId,
  patientCode,
  favoriteStatuses,
  setFavoriteStatuses,
  isSavingToDb,
  saveToDatabase,
  handlePrint,
  handleDownloadPDF,
  isDownloading,
  activeTab,
  setActiveTab,
  onBack,
  children
}) => {
  // --- States ---
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);
  const [showMedicalAlertModal, setShowMedicalAlertModal] = useState(false);
  const [tempTags, setTempTags] = useState<string[]>(patientData.tags || []);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isMoreTabsOpen, setIsMoreTabsOpen] = useState(false);
  
  // Quick Update Form State
  const [quickUpdateForm, setQuickUpdateForm] = useState({
    lastName: patientData.lastName || '',
    firstName: patientData.firstName || '',
    middleName: patientData.middleName || '',
    extensionName: patientData.extensionName || '',
    nickname: patientData.nickname || '',
    birthDate: patientData.birthDate || '',
    sex: patientData.sex || 'Male',
    mobile: patientData.mobile || '',
    email: patientData.email || '',
    address: patientData.address || '',
    alternateIds: patientData.alternateIds || ''
  });

  // Smart Search & Command Palette States
  const [searchText, setSearchText] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync state if patientData changes
  useEffect(() => {
    setTempTags(patientData.tags || []);
    setQuickUpdateForm({
      lastName: patientData.lastName || '',
      firstName: patientData.firstName || '',
      middleName: patientData.middleName || '',
      extensionName: patientData.extensionName || '',
      nickname: patientData.nickname || '',
      birthDate: patientData.birthDate || '',
      sex: patientData.sex || 'Male',
      mobile: patientData.mobile || '',
      email: patientData.email || '',
      address: patientData.address || '',
      alternateIds: patientData.alternateIds || ''
    });
  }, [patientData]);

  // Dynamic Age and Minor Calculation
  const calculateAgeAndCheckMinor = (bdate: string) => {
    if (!bdate) return { age: '0', isMinor: false };
    const birth = new Date(bdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return { age: age >= 0 ? age.toString() : '0', isMinor: age < 18 };
  };

  const { age, isMinor } = calculateAgeAndCheckMinor(patientData.birthDate);

  // Dynamic Financial Balance
  const calculateOutstandingBalance = () => {
    // Legacy treatment records balance
    const treatmentBalance = (patientData.treatmentRecords || []).reduce((sum: number, row: any) => {
      // Skip records that are linked to a bill (avoid double counting)
      if (row.billId) return sum;
      const charged = parseFloat(row.amountCharged) || 0;
      const paid = parseFloat(row.amountPaid) || 0;
      const bal = parseFloat(row.balance) || (charged - paid);
      return sum + (isNaN(bal) ? 0 : bal);
    }, 0);
    // New bills system balance
    const billsBalance = (patientData.bills || []).reduce((sum: number, bill: any) => {
      const bal = parseFloat(bill.balance) || 0;
      return sum + (isNaN(bal) ? 0 : bal);
    }, 0);
    return treatmentBalance + billsBalance;
  };

  const outstandingBalance = calculateOutstandingBalance();

  // Medical Alert Detector
  const hasMedicalAlerts = () => {
    const allergiesList = patientData.allergies || {};
    const hasAllergies = allergiesList.penicillin || allergiesList.latex || allergiesList.aspirin || allergiesList.sulfa || allergiesList.others;
    const questionsList = patientData.questions || {};
    const activeQuestions = Object.values(questionsList).some(val => val === 'Yes' || val === true);
    return hasAllergies || activeQuestions;
  };

  const isAlertActive = hasMedicalAlerts();

  // Hotkey listener for Ctrl+K and /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quick Update submit
  const handleQuickUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPatientData((prev: any) => ({
      ...prev,
      ...quickUpdateForm
    }));
    setShowQuickUpdate(false);
    // Trigger IndexedDB/Supabase save
    setTimeout(() => saveToDatabase(false), 50);
  };

  // Tag Management Logic
  const handleAddTag = () => {
    if (newTagInput.trim() && !tempTags.includes(newTagInput.trim())) {
      setTempTags([...tempTags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTempTags(tempTags.filter(t => t !== tagToRemove));
  };

  const handleSaveTags = () => {
    setPatientData((prev: any) => ({
      ...prev,
      tags: tempTags
    }));
    setIsEditingTags(false);
    setTimeout(() => saveToDatabase(false), 50);
  };

  const handleCancelTags = () => {
    setTempTags(patientData.tags || []);
    setIsEditingTags(false);
  };

  // Search autocomplete & commands
  const handleSearchChange = (val: string) => {
    setSearchText(val);
    if (val.startsWith('/')) {
      setShowCommandPalette(true);
    } else {
      setShowCommandPalette(false);
    }
  };

  const executeCommand = (command: string) => {
    setShowCommandPalette(false);
    setSearchText('');
    if (command === 'newnote') {
      setActiveTab('treatment');
      // Trigger new progress note modal by dispatching custom event
      window.dispatchEvent(new CustomEvent('open-progress-note-modal'));
    } else if (command === 'prescription') {
      setActiveTab('prescriptions');
      window.dispatchEvent(new CustomEvent('open-prescription-modal'));
    } else if (command === 'payment') {
      setActiveTab('ledger');
      window.dispatchEvent(new CustomEvent('open-payment-modal'));
    }
  };

  // Jump to Section logic
  const handleJumpToSection = (tabId: string) => {
    setActiveTab(tabId);
    setTimeout(() => {
      const el = document.getElementById(`section-${tabId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Dynamic Tab definitions with nested length queries
  const getTabBadgeCount = (tabId: string) => {
    switch (tabId) {
      case 'progress_notes':
        return (patientData.progressNotes || []).length;
      case 'smart_support':
        // length of active alerts / recommendations
        let alerts = 0;
        if (patientData.allergies?.penicillin) alerts++;
        if (patientData.allergies?.latex) alerts++;
        if (patientData.allergies?.aspirin) alerts++;
        if (patientData.allergies?.sulfa) alerts++;
        if (isMinor) alerts++; // pediatric recommendation
        return alerts;
      case 'charting':
        return Object.keys(patientData.dentalChart?.teeth || {}).length;
      case 'prescriptions':
        return (patientData.prescriptions || []).length;
      case 'ledger':
        return (patientData.treatmentRecords || []).filter((r: any) => r.procedure).length;
      case 'certificates':
        return (patientData.certificates || []).length;
      case 'uploads':
        return (patientData.attachments || []).length;
      case 'recalls':
        return (patientData.recalls || []).length;
      case 'appointments':
        return (patientData.appointments || []).length;
      case 'scratchpad':
        return (patientData.notes || []).length;
      case 'followup':
        return (patientData.followups || []).length;
      default:
        return 0;
    }
  };

  const CLINICAL_TABS = [
    { id: 'progress_notes', label: 'Progress Notes' },
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
  ];

  return (
    <div className="space-y-6 font-sans text-zinc-900 bg-zinc-50/30 p-2 sm:p-4 rounded-3xl">
      
      {/* ================= PART 2: UPPER CONTROL HEADER ================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold px-4 py-2 rounded-lg transition-all text-sm shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>Return</span>
          </button>
          
          <div className="px-3.5 py-2 bg-zinc-100 rounded-lg text-xs font-bold font-mono text-zinc-600 shadow-sm border border-zinc-200/40">
            Code: {patientCode}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Update Button */}
          <button
            onClick={() => setShowQuickUpdate(true)}
            className="border border-teal-200 text-teal-600 hover:bg-teal-50 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm transition-all shadow-sm"
          >
            <Edit3 size={16} />
            <span>Quick Update</span>
          </button>

          {/* Update Record (Full Wizard Trigger) */}
          <button
            onClick={() => setActiveTab('form')}
            className="border border-zinc-200 text-zinc-800 hover:bg-zinc-50 px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm"
          >
            Update Record
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all shadow-sm"
          >
            <Printer size={16} />
            <span>Print Full Patient Record</span>
          </button>
        </div>
      </div>

      {/* ================= PART 3: PATIENT BIO CARD (IDENTITY HEADER) ================= */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm relative overflow-hidden">
        {/* Decorative Alert Flag for Minors */}
        {isMinor && (
          <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-200/50 px-6 py-1.5 text-xs text-amber-700 font-semibold flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>Minor Account Detected - Requires Parent/Guardian Registration verification (Guardian tab active)</span>
          </div>
        )}

        <div className={`flex flex-col md:flex-row justify-between gap-6 ${isMinor ? 'mt-4' : ''}`}>
          {/* Left / Center Metadata */}
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold font-display text-zinc-900 uppercase tracking-tight flex flex-wrap items-center gap-3">
              <span>{patientData.lastName || 'UNTITLED'}, {patientData.firstName || 'PATIENT'} {patientData.middleName || ''}</span>
              <span className="text-sm font-normal text-zinc-500 normal-case px-2.5 py-0.5 bg-zinc-100 rounded-full font-sans">
                {patientData.sex || 'Male'}, {age} yrs old, Born {patientData.birthDate || '2002-12-11'}
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs border-t border-zinc-100 pt-4">
              {/* Col 1 */}
              <div className="space-y-2 font-mono">
                <div>
                  <span className="font-semibold text-zinc-400 font-sans uppercase">Last Updated:</span>{' '}
                  <span className="text-zinc-800">{patientData.lastVisit || '6/23/2026'}</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-400 font-sans uppercase">Location:</span>{' '}
                  <span className="text-zinc-800 uppercase">{patientData.address || 'IMUS CAVITE'}</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-400 font-sans uppercase">At Clinic:</span>{' '}
                  <span className="text-zinc-800 font-sans">P&J Tanarte Dental Clinic</span>
                </div>
              </div>

              {/* Col 2 */}
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-zinc-400 uppercase">Added:</span>{' '}
                  <span className="text-zinc-800 font-mono">7/2/2026</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-400 uppercase">At Doctor:</span>{' '}
                  <span className="text-zinc-800">Dr. Maria Jessica Tanarte</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-400 uppercase">Last Visit:</span>{' '}
                  <span className="text-zinc-800 font-mono">{patientData.lastVisit || 'None'}</span>
                </div>
              </div>

              {/* Col 3 */}
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-zinc-400 uppercase">Contact Number:</span>{' '}
                  <span className="text-zinc-800 font-mono">{patientData.mobile || patientData.contact || '09538343052'}</span>
                </div>
                
                {/* Medical Alert Status Detector */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-400 uppercase">Medical Alert:</span>{' '}
                  {isAlertActive ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-700 animate-pulse uppercase">
                      ACTIVE ALERTS
                    </span>
                  ) : (
                    <span className="text-zinc-500 font-semibold">None</span>
                  )}
                  <button 
                    onClick={() => setShowMedicalAlertModal(true)}
                    className="text-teal-600 hover:underline font-bold text-[11px] ml-1"
                  >
                    Show more
                  </button>
                </div>

                {/* Financial outstanding balance calculation */}
                <div className="font-mono">
                  <span className="font-semibold text-zinc-400 font-sans uppercase">Balance:</span>{' '}
                  <span className={`font-bold text-sm ${outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₱{outstandingBalance.toFixed(2)}
                  </span>
                  <span className="text-zinc-400 font-sans text-[10px] ml-1">(Remaining)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Profile Photo / Avatar */}
          <div className="flex shrink-0 items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 shadow-inner">
              {patientData.patientPhoto ? (
                <img src={patientData.patientPhoto} alt="Patient Avatar" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <User size={32} />
              )}
            </div>
          </div>
        </div>

        {/* Live Tag Management Sub-Module (Isolated Transaction State) */}
        <div className="mt-6 border-t border-zinc-100 pt-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-zinc-400 uppercase tracking-wider font-display">Tags:</span>
          <div className="flex flex-wrap gap-1.5">
            {tempTags.length > 0 ? (
              tempTags.map(tag => (
                <span 
                  key={tag}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 transition-all"
                >
                  <span>{tag}</span>
                  {isEditingTags && (
                    <button 
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-zinc-300 p-0.5 rounded-full"
                    >
                      <X size={10} />
                    </button>
                  )}
                </span>
              ))
            ) : (
              <span className="text-zinc-400 italic">No Tag Assigned</span>
            )}
          </div>

          {!isEditingTags ? (
            <button 
              onClick={() => setIsEditingTags(true)}
              className="text-teal-600 hover:text-teal-700 font-bold ml-2 hover:underline"
            >
              Manage Tags
            </button>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="text"
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                placeholder="New tag..."
                className="px-2 py-1 border border-zinc-200 rounded-[6px] outline-none text-xs focus:ring-1 focus:ring-teal-500 w-24"
                onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); }}
              />
              <button 
                onClick={handleAddTag}
                className="bg-teal-50 hover:bg-teal-100 text-teal-700 px-2 py-1 rounded-[6px] font-bold"
              >
                Add
              </button>
              <button 
                onClick={handleSaveTags}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-[6px] font-bold"
              >
                Save Changes
              </button>
              <button 
                onClick={handleCancelTags}
                className="border border-zinc-200 hover:bg-zinc-50 text-zinc-600 px-2 py-1 rounded-[6px] font-bold"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>



      {/* ================= PART 5: UNIFIED TAB BAR ================= */}
      <div className="border-b border-zinc-200 no-print">
        <div className="flex items-center gap-2 py-1.5 px-1 relative">
          {CLINICAL_TABS.slice(0, 5).map((tab) => {
            const isActive = activeTab === tab.id;
            const count = getTabBadgeCount(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMoreTabsOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                    isActive ? 'bg-white text-teal-600' : 'bg-teal-50 text-teal-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* More Dropdown Trigger */}
          <div className="relative">
            {(() => {
              const hiddenTabs = CLINICAL_TABS.slice(5);
              const isAnyHiddenActive = hiddenTabs.some(t => t.id === activeTab);
              const activeHiddenTabLabel = hiddenTabs.find(t => t.id === activeTab)?.label;
              const totalHiddenCount = hiddenTabs.reduce((sum, t) => sum + getTabBadgeCount(t.id), 0);

              return (
                <>
                  <button
                    onClick={() => setIsMoreTabsOpen(!isMoreTabsOpen)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border relative ${
                      isAnyHiddenActive
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <span>{isAnyHiddenActive ? activeHiddenTabLabel : 'More'}</span>
                    <ChevronDown size={14} className={`transition-transform ${isMoreTabsOpen ? 'rotate-180' : ''}`} />
                    {totalHiddenCount > 0 && !isAnyHiddenActive && (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono bg-teal-50 text-teal-700`}>
                        {totalHiddenCount}
                      </span>
                    )}
                  </button>

                  {isMoreTabsOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5">
                      {hiddenTabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const count = getTabBadgeCount(tab.id);
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setActiveTab(tab.id);
                              setIsMoreTabsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                              isActive
                                ? 'bg-teal-50 text-teal-700'
                                : 'text-zinc-600 hover:bg-zinc-50'
                            }`}
                          >
                            <span>{tab.label}</span>
                            {count > 0 && (
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono bg-teal-50 text-teal-700">
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ================= PART 6: ACTIVE WORKSPACE CONTENT ================= */}
      <div id={`section-${activeTab}`} className="mt-4">
        {children}
      </div>

      {/* ================= MODAL: QUICK UPDATE OVERLAY ================= */}
      {showQuickUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm px-4">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowQuickUpdate(false)}
              className="absolute top-4 right-4 p-1 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold font-display text-zinc-900 mb-1 uppercase">
              Update Patient Profile
            </h3>
            <p className="text-[11px] text-zinc-400 mb-4">Personal Profile and alternative identifiers.</p>
            
            <form onSubmit={handleQuickUpdateSubmit} className="space-y-4 text-xs">
              <div className="bg-zinc-50 p-4 rounded-xl space-y-3">
                <h4 className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Personal Profile</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Lastname</label>
                    <input
                      type="text"
                      value={quickUpdateForm.lastName}
                      onChange={e => setQuickUpdateForm({...quickUpdateForm, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Firstname</label>
                    <input
                      type="text"
                      value={quickUpdateForm.firstName}
                      onChange={e => setQuickUpdateForm({...quickUpdateForm, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Middlename</label>
                    <input
                      type="text"
                      value={quickUpdateForm.middleName}
                      onChange={e => setQuickUpdateForm({...quickUpdateForm, middleName: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Extension Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Jr., Sr., III"
                      value={quickUpdateForm.extensionName}
                      onChange={e => setQuickUpdateForm({...quickUpdateForm, extensionName: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Nickname</label>
                    <input
                      type="text"
                      value={quickUpdateForm.nickname}
                      onChange={e => setQuickUpdateForm({...quickUpdateForm, nickname: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Birthdate</label>
                    <input
                      type="date"
                      value={quickUpdateForm.birthDate}
                      onChange={e => setQuickUpdateForm({...quickUpdateForm, birthDate: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Gender</label>
                    <select
                      value={quickUpdateForm.sex}
                      onChange={e => setQuickUpdateForm({...quickUpdateForm, sex: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-teal-500 text-zinc-700 font-medium"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Mobile</label>
                    <input
                      type="text"
                      value={quickUpdateForm.mobile}
                      onChange={e => setQuickUpdateForm({...quickUpdateForm, mobile: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Email</label>
                    <input
                      type="email"
                      value={quickUpdateForm.email}
                      onChange={e => setQuickUpdateForm({...quickUpdateForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Address</label>
                  <input
                    type="text"
                    value={quickUpdateForm.address}
                    onChange={e => setQuickUpdateForm({...quickUpdateForm, address: e.target.value})}
                    className="w-full px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="bg-zinc-50 p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Alternate Patient IDs</h4>
                <div>
                  <label className="block text-[9px] text-zinc-400 mb-1">Enter comma-separated patient IDs (e.g., 101, 202, 303)</label>
                  <input
                    type="text"
                    value={quickUpdateForm.alternateIds}
                    onChange={e => setQuickUpdateForm({...quickUpdateForm, alternateIds: e.target.value})}
                    placeholder="Enter comma-separated patient IDs that are alternate to this patient"
                    className="w-full px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-1 focus:ring-teal-500 text-[10px]"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowQuickUpdate(false)}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: MEDICAL ALERT DETAILS ================= */}
      {showMedicalAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm px-4">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowMedicalAlertModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-bold font-display text-zinc-900 mb-1 uppercase flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-500" />
              <span>Additional Clinical Information</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mb-4">Detailed bio data, pathology warnings, and systemic conditions.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Bio Details Box */}
              <div className="bg-zinc-50 p-4 rounded-xl space-y-2 border border-zinc-200/40">
                <h4 className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Clinical Registration & Bio</h4>
                <div className="space-y-1.5 font-medium text-zinc-600">
                  <div className="flex justify-between border-b border-zinc-200/50 pb-1">
                    <span className="text-zinc-400">Mobile Phone:</span>
                    <span className="text-zinc-800 font-mono">{patientData.mobile || patientData.contact || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/50 pb-1">
                    <span className="text-zinc-400">Email Address:</span>
                    <span className="text-zinc-800">{patientData.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/50 pb-1">
                    <span className="text-zinc-400">Civil Status:</span>
                    <span className="text-zinc-800">{patientData.civilStatus || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/50 pb-1">
                    <span className="text-zinc-400">Blood Type:</span>
                    <span className="text-zinc-800 font-mono">{patientData.bloodType || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/50 pb-1">
                    <span className="text-zinc-400">Height & Weight:</span>
                    <span className="text-zinc-800 font-mono">N/A / N/A</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/50 pb-1">
                    <span className="text-zinc-400">Occupation:</span>
                    <span className="text-zinc-800">{patientData.occupation || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/50 pb-1">
                    <span className="text-zinc-400">School:</span>
                    <span className="text-zinc-800">N/A</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/50 pb-1">
                    <span className="text-zinc-400">Referred By:</span>
                    <span className="text-zinc-800">{patientData.referral || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col pt-1">
                    <span className="text-zinc-400">Address:</span>
                    <span className="text-zinc-800 font-sans uppercase mt-0.5">{patientData.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Pathological box */}
              <div className="bg-zinc-50 p-4 rounded-xl space-y-3 border border-zinc-200/40">
                <h4 className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Pathological History</h4>
                
                <div>
                  <span className="block text-[10px] font-semibold text-zinc-400 uppercase">Medication Allergies</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(patientData.allergies || {}).some(([k, v]) => v) ? (
                      Object.entries(patientData.allergies || {})
                        .filter(([k, v]) => v)
                        .map(([k, v]) => (
                          <span key={k} className="px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-700 text-[9px] font-bold capitalize">
                            {k}
                          </span>
                        ))
                    ) : (
                      <span className="text-zinc-500 font-medium italic">None declared</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-zinc-400 uppercase">Previous Hospitalizations</span>
                  <span className="text-zinc-800 font-medium italic block mt-0.5">None declared</span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-zinc-400 uppercase">Prescribed Medications</span>
                  <span className="text-zinc-800 font-medium italic block mt-0.5">None</span>
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-zinc-400 uppercase">Other Medical Concerns</span>
                  <span className="text-zinc-800 font-medium italic block mt-0.5">None</span>
                </div>
              </div>

              {/* Questionnaire History */}
              <div className="col-span-full bg-zinc-50 p-4 rounded-xl space-y-2 border border-zinc-200/40">
                <h4 className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Diagnosed Conditions & Systemic History</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 max-h-[160px] overflow-y-auto pr-2">
                  {Object.keys(patientData.questions || {}).length > 0 ? (
                    Object.entries(patientData.questions || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between border-b border-zinc-200/30 pb-1.5">
                        <span className="capitalize text-zinc-600 font-medium text-[11px]">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] uppercase ${
                          val === 'Yes' || val === true ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'text-zinc-400'
                        }`}>
                          {val === 'Yes' || val === true ? 'Yes' : 'No'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-zinc-400 italic font-medium col-span-2">No system conditions checked</div>
                  )}
                </div>
              </div>

            </div>

            <div className="pt-4 flex justify-end border-t border-zinc-100 mt-4">
              <button
                type="button"
                onClick={() => setShowMedicalAlertModal(false)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold text-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
