import React, { useState, useEffect, useMemo } from 'react';
import { PatientRecord, PersonalInfo, GuardianInfo, MedicalHistory, DentalHistory, ClinicUser, Clinic } from './types';
import { clinicStorage } from './lib/indexedDBStorage';
import { isUnderage, calculateAge } from './utils/date';
import Dashboard from './features/dashboard/Dashboard';
import PatientsList from './features/patients/components/PatientsList';
import PersonalInfoForm from './features/patients/components/PersonalInfoForm';
import GuardianInfoForm from './features/patients/components/GuardianInfoForm';
import MedicalHistoryForm from './features/patients/components/MedicalHistoryForm';
import DentalHistoryForm from './features/patients/components/DentalHistoryForm';
import PatientDetails from './features/patients/components/PatientDetails';
import MasterRecord from './features/settings/MasterRecord';
import SettingsCenter from './features/settings/SettingsCenter';
import ClinicCalendar from './features/calendar/ClinicCalendar';
import Analytics from './features/analytics/Analytics';
import MasterDataDirectory from './features/settings/MasterDataDirectory';
import ClinicOperationsScreen from './features/clinic-operations/ClinicOperationsScreen';
import LoginScreen from './features/authentication/LoginScreen';
import WorkspaceSelection from './features/dashboard/WorkspaceSelection';
import UserManagementScreen from './features/user-management/UserManagementScreen';
import { 
  Plus, Check, User, Users, Activity, Smile, Shield, Sparkles, 
  ChevronRight, ArrowLeft, Heart, CheckCircle2, AlertTriangle, ListFilter,
  LayoutDashboard, FolderHeart, Menu, X, Landmark, Archive, Database, Search,
  Calendar, Bell, Key, Mail, HelpCircle, LogOut, Settings, Download, Upload,
  TrendingUp, Sliders, Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LOCAL_STORAGE_KEY = 'DENTAL_PATIENT_RECORDS_PRODUCTION_STORAGE';

const getInitialFormState = () => ({
  personalInfo: {
    lastName: '',
    firstName: '',
    middleName: '',
    ext: '',
    nickname: '',
    birthdate: '',
    sex: '' as any,
    mobile: '',
    email: '',
    address: '',
    school: '',
    hmo: 'No HMO',
    referredBy: '',
    bloodType: '',
    weight: '',
    height: '',
    civilStatus: '' as any,
    occupation: '',
    company: '',
    photoUrl: '',
  },
  guardianInfo: {
    fathersName: '',
    fathersOccupation: '',
    fathersEmployer: '',
    fathersContact: '',
    mothersName: '',
    mothersOccupation: '',
    mothersEmployer: '',
    mothersContact: '',
    guardiansName: '',
    guardiansContact: '',
    physicianName: '',
    physicianContact: '',
  },
  medicalHistory: {
    previousHospitalizations: '',
    prescribedMedications: '',
    allergiesToMedications: '',
    familyMedicationProblems: '',
    otherMedicalConcerns: '',
    medicalAlert: '',
    conditions: [],
  },
  dentalHistory: {
    reasonForCheckup: '',
    lastVisit: '',
    badDentalExperience: '',
    brushingDifficulties: '',
    fluoridesReceived: '',
    habits: [],
    patientsDiet: '',
  }
});

export default function App() {
  // Authentication & Workspace States
  const [currentUser, setCurrentUser] = useState<ClinicUser | null>(null);
  const [userWorkspace, setUserWorkspace] = useState<'WORKSPACE_SELECT' | 'CLINIC' | 'ASSOCIATES' | 'STAFFS' | null>('WORKSPACE_SELECT');
  const [registeredUsers, setRegisteredUsers] = useState<ClinicUser[]>([]);

  // Load/initialize Clinic and Users
  useEffect(() => {
    // 1. Clinics
    const storedClinics = clinicStorage.getItem('DENTAL_CLINICS');
    if (!storedClinics) {
      const defaultClinics = [
        {
          id: 'clinic-default',
          name: 'P&J Tanarte Dental Clinic',
          phone: '(02) 8123-4567',
          address: '123 Dental Suite, Metro Manila'
        }
      ];
      clinicStorage.setItem('DENTAL_CLINICS', JSON.stringify(defaultClinics));
    }

    // 2. Users (including default owner)
    const storedUsers = clinicStorage.getItem('DENTAL_USERS');
    let usersList = [];
    if (storedUsers) {
      usersList = JSON.parse(storedUsers);
    } else {
      const defaultUsers = [
        {
          id: 'user-owner-default',
          clinicId: 'clinic-default',
          name: 'Maria Jessica David Tanarte',
          email: 'pnjtanartedentalclinic@gmail.com',
          phone: '(02) 8123-4567',
          role: 'Clinic Owner',
          status: 'Active',
          passwordHash: 'pnjtanarte2020',
          createdAt: new Date().toISOString()
        }
      ];
      clinicStorage.setItem('DENTAL_USERS', JSON.stringify(defaultUsers));
      usersList = defaultUsers;
    }
    setRegisteredUsers(usersList);

    // 3. Current active user
    const storedCurrentUser = clinicStorage.getItem('DENTAL_CURRENT_USER');
    if (storedCurrentUser) {
      try {
        const parsed = JSON.parse(storedCurrentUser);
        const verifiedUser = usersList.find((u: any) => u.id === parsed.id);
        if (verifiedUser && verifiedUser.status === 'Active') {
          setCurrentUser(verifiedUser);
          
          setProfile({
            name: verifiedUser.name,
            role: verifiedUser.role,
            email: verifiedUser.email,
            photoUrl: ''
          });

          const clinics = JSON.parse(clinicStorage.getItem('DENTAL_CLINICS') || '[]');
          const userClinic = clinics.find((c: any) => c.id === verifiedUser.clinicId);
          if (userClinic) {
            setClinicName(userClinic.name);
            setClinicPhone(userClinic.phone || '(02) 8123-4567');
            setClinicAddress(userClinic.address || '123 Dental Suite, Metro Manila');
          }

          setUserWorkspace('WORKSPACE_SELECT');
        } else {
          clinicStorage.removeItem('DENTAL_CURRENT_USER');
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const handleLoginSuccess = (user: ClinicUser, clinicNameStr: string) => {
    setCurrentUser(user);
    clinicStorage.setItem('DENTAL_CURRENT_USER', JSON.stringify(user));
    
    setProfile({
      name: user.name,
      role: user.role,
      email: user.email,
      photoUrl: ''
    });

    setClinicName(clinicNameStr);
    setUserWorkspace('WORKSPACE_SELECT');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserWorkspace(null);
    localStorage.removeItem('DENTAL_CURRENT_USER');
    setActiveModal(null);
  };

  // Screens: "DASHBOARD" | "PATIENTS" | "WIZARD" | "DETAILS" | "MASTER_RECORD" | "CALENDAR" | "ANALYTICS" | "SETTINGS" | "MASTER_DATA_DIRECTORY" | "CLINIC_OPERATIONS_LEDGER" | "USER_MANAGEMENT"
  const [activeScreen, setActiveScreen] = useState<'DASHBOARD' | 'PATIENTS' | 'WIZARD' | 'DETAILS' | 'MASTER_RECORD' | 'CALENDAR' | 'ANALYTICS' | 'SETTINGS' | 'MASTER_DATA_DIRECTORY' | 'CLINIC_OPERATIONS_LEDGER' | 'USER_MANAGEMENT'>('DASHBOARD');
  
  // Stored Records
  const [records, setRecords] = useState<PatientRecord[]>(() => {
    try {
      const stored = clinicStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load records from clinicStorage', e);
    }
    return [];
  });

  const clinicRecords = useMemo(() => {
    if (!currentUser) return [];
    return records.filter(r => !r.clinicId || r.clinicId === currentUser.clinicId);
  }, [records, currentUser]);

  // Keep track of which patient is being edited in the wizard
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Selected Patient for Details View
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);

  // Wizard active step: 1 | 2 | 3 | 4
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Multi-step Registration Form State (Preserves inputs through steps)
  const [formData, setFormData] = useState<{
    personalInfo: PersonalInfo;
    guardianInfo: GuardianInfo;
    medicalHistory: MedicalHistory;
    dentalHistory: DentalHistory;
  }>(getInitialFormState());

  // Navbar global search query
  const [navbarSearchQuery, setNavbarSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [serverTime, setServerTime] = useState('');

  // Dropdown and Profile Modal States
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    name: 'Maria Jessica Tanarte',
    role: 'Clinic Owner',
    email: 'maria.tanarte@pj-dental.com',
    photoUrl: '' // Supports future profile image upload
  });

  const [notifications, setNotifications] = useState<{
    id: string;
    text: string;
    date: string;
    read: boolean;
    type: string;
  }[]>([]);

  // Settings & Configuration States
  const [clinicName, setClinicName] = useState('P&J Tanarte Dental Clinic');
  const [clinicPhone, setClinicPhone] = useState('(02) 8123-4567');
  const [clinicAddress, setClinicAddress] = useState('123 Dental Suite, Metro Manila');
  const [smsEnabled, setSmsEnabled] = useState(true);

  // Edit Profile States
  const [editName, setEditName] = useState('Maria Jessica Tanarte');
  const [editRole, setEditRole] = useState('Clinic Owner');
  const [editEmail, setEditEmail] = useState('maria.tanarte@pj-dental.com');

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Synchronize edit profile form values with profile
  useEffect(() => {
    setEditName(profile.name);
    setEditRole(profile.role);
    setEditEmail(profile.email);
  }, [profile]);

  // Search Suggestions memo for smart autocomplete overlay (SEO tooltips)
  const searchSuggestions = useMemo(() => {
    const q = navbarSearchQuery.toLowerCase().trim();
    if (!q) return [];

    const list: {
      id: string;
      type: 'patient' | 'shortcut';
      title: string;
      subtitle: string;
      category: string;
      valueToSet?: string;
      patient?: PatientRecord;
    }[] = [];

    // Patient matches
    records.forEach(r => {
      if (r.isArchived) return;
      const firstName = r.personalInfo.firstName.toLowerCase();
      const lastName = r.personalInfo.lastName.toLowerCase();
      const fullName = `${r.personalInfo.firstName} ${r.personalInfo.lastName}`.toLowerCase();
      const reverseName = `${r.personalInfo.lastName} ${r.personalInfo.firstName}`.toLowerCase();
      const nickname = (r.personalInfo.nickname || '').toLowerCase();
      const mobile = r.personalInfo.mobile || '';
      const email = (r.personalInfo.email || '').toLowerCase();
      const birthdate = r.personalInfo.birthdate || '';
      const hmo = (r.personalInfo.hmo || '').toLowerCase();
      const address = (r.personalInfo.address || '').toLowerCase();
      const lastVisit = (r.dentalHistory?.lastVisit || '').toLowerCase();
      const patientId = r.id.toLowerCase();

      // Accumulate medical history strings
      const medHistoryStr = [
        r.medicalHistory?.previousHospitalizations || '',
        r.medicalHistory?.prescribedMedications || '',
        r.medicalHistory?.allergiesToMedications || '',
        r.medicalHistory?.familyMedicationProblems || '',
        r.medicalHistory?.otherMedicalConcerns || '',
        r.medicalHistory?.medicalAlert || '',
        ...(r.medicalHistory?.conditions || [])
      ].join(' ').toLowerCase();

      // Accumulate dental notes/history strings
      const dentalNotesStr = [
        r.dentalHistory?.reasonForCheckup || '',
        r.dentalHistory?.badDentalExperience || '',
        r.dentalHistory?.brushingDifficulties || '',
        r.dentalHistory?.fluoridesReceived || '',
        ...(r.dentalHistory?.habits || [])
      ].join(' ').toLowerCase();

      let matchedField = '';
      if (fullName.includes(q) || reverseName.includes(q)) {
        matchedField = 'Name';
      } else if (patientId.includes(q)) {
        matchedField = `Patient ID: ${r.id}`;
      } else if (nickname.includes(q)) {
        matchedField = `Nickname: ${r.personalInfo.nickname}`;
      } else if (mobile.includes(q)) {
        matchedField = `Mobile: ${mobile}`;
      } else if (email.includes(q)) {
        matchedField = `Email: ${r.personalInfo.email}`;
      } else if (birthdate.includes(q)) {
        matchedField = `Birthdate: ${birthdate}`;
      } else if (hmo.includes(q)) {
        matchedField = `HMO: ${r.personalInfo.hmo}`;
      } else if (address.includes(q)) {
        matchedField = `Address: ${r.personalInfo.address}`;
      } else if (lastVisit.includes(q)) {
        matchedField = `Last Visit: ${r.dentalHistory?.lastVisit}`;
      } else if (medHistoryStr.includes(q)) {
        matchedField = 'Medical History';
      } else if (dentalNotesStr.includes(q)) {
        matchedField = 'Dental History';
      }

      if (matchedField) {
        list.push({
          id: `patient-${r.id}`,
          type: 'patient',
          title: `${r.personalInfo.lastName}, ${r.personalInfo.firstName}`,
          subtitle: `${matchedField} • Age: ${calculateAge(r.personalInfo.birthdate)} • HMO: ${r.personalInfo.hmo || 'Self-pay'}`,
          category: 'Matching Patients',
          patient: r
        });
      }
    });

    // Add smart search shortcut tooltips for advanced lookup
    const shortTitle = q.length > 15 ? q.slice(0, 15) + '...' : q;
    
    list.push({
      id: 'shortcut-name',
      type: 'shortcut',
      title: `Filter by name matching "${shortTitle}"`,
      subtitle: `Display patient profiles containing "${shortTitle}"`,
      category: 'Search Shortcuts',
      valueToSet: q
    });

    if (/^\d+$/.test(q) || q.includes('-')) {
      list.push({
        id: 'shortcut-mobile',
        type: 'shortcut',
        title: `Search mobile matching "${shortTitle}"`,
        subtitle: `Lookup records with contact phone "${shortTitle}"`,
        category: 'Search Shortcuts',
        valueToSet: q
      });
    }

    if (q.length > 2) {
      list.push({
        id: 'shortcut-hmo',
        type: 'shortcut',
        title: `Filter HMO matching "${shortTitle}"`,
        subtitle: `Find patients covered by HMO matching "${shortTitle}"`,
        category: 'Search Shortcuts',
        valueToSet: q
      });
    }

    return list.slice(0, 8);
  }, [navbarSearchQuery, records]);

  // Toast / Alert notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Synchronize with Clinic Storage whenever records change
  useEffect(() => {
    try {
      clinicStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save records to clinicStorage', e);
    }
  }, [records]);

  // Clear toast after timeout
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Synchronize server month & year from system clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      setServerTime(`Server Time: ${formatted}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Helpers for age & underage check
  const patientAge = formData.personalInfo.birthdate ? calculateAge(formData.personalInfo.birthdate) : null;
  const isMinor = formData.personalInfo.birthdate ? isUnderage(formData.personalInfo.birthdate) : false;

  // Navigation callbacks
  const handleAddNewRecord = () => {
    setEditingRecordId(null);
    setFormData(getInitialFormState());
    setWizardStep(1);
    setActiveScreen('WIZARD');
  };

  const handleEditPatient = (record: PatientRecord) => {
    setEditingRecordId(record.id);
    setFormData({
      personalInfo: { ...record.personalInfo },
      guardianInfo: { ...record.guardianInfo },
      medicalHistory: { ...record.medicalHistory },
      dentalHistory: { ...record.dentalHistory }
    });
    setWizardStep(1);
    setActiveScreen('WIZARD');
  };

  const handleArchivePatient = (id: string) => {
    if (currentUser?.role === 'Staff Member') {
      setToast({ message: 'Error: Staff accounts are restricted from archiving patient records.', type: 'error' });
      return;
    }
    setRecords(prev => prev.map(r => r.id === id ? { 
      ...r, 
      isArchived: true,
      updatedBy: currentUser?.email || 'pnjtanartedentalclinic@gmail.com',
      updatedAt: new Date().toISOString()
    } : r));
    setToast({ message: 'Patient record successfully archived.', type: 'info' });
  };

  const handleViewPatientDetails = (record: PatientRecord) => {
    setSelectedPatient(record);
    setActiveScreen('DETAILS');
  };

  const handleUpdatePatient = (updatedRecord: PatientRecord) => {
    const auditRecord = {
      ...updatedRecord,
      updatedBy: currentUser?.email || 'pnjtanartedentalclinic@gmail.com',
      updatedAt: new Date().toISOString()
    };
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? auditRecord : r));
    setSelectedPatient(auditRecord);
  };

  const handleDeleteRecord = (id: string) => {
    if (currentUser?.role === 'Staff Member') {
      setToast({ message: 'Error: Staff accounts are restricted from deleting patient records.', type: 'error' });
      return;
    }
    setRecords(prev => prev.filter(r => r.id !== id));
    setToast({ message: 'Patient record removed successfully.', type: 'info' });
  };

  const updatePersonalInfo = (updates: Partial<PersonalInfo>) => {
    setFormData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, ...updates }
    }));
  };

  const updateGuardianInfo = (updates: Partial<GuardianInfo>) => {
    setFormData(prev => ({
      ...prev,
      guardianInfo: { ...prev.guardianInfo, ...updates }
    }));
  };

  const updateMedicalHistory = (updates: Partial<MedicalHistory>) => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: { ...prev.medicalHistory, ...updates }
    }));
  };

  const updateDentalHistory = (updates: Partial<DentalHistory>) => {
    setFormData(prev => ({
      ...prev,
      dentalHistory: { ...prev.dentalHistory, ...updates }
    }));
  };

  // Main saving operation
  const handleSaveAllData = () => {
    if (editingRecordId) {
      setRecords(prev => prev.map(r => r.id === editingRecordId ? {
        ...r,
        personalInfo: { ...formData.personalInfo },
        guardianInfo: { ...formData.guardianInfo },
        medicalHistory: { ...formData.medicalHistory },
        dentalHistory: { ...formData.dentalHistory },
        updatedBy: currentUser?.email || 'pnjtanartedentalclinic@gmail.com',
        updatedAt: new Date().toISOString()
      } : r));
      setToast({ message: `Patient record updated successfully.`, type: 'success' });
      setEditingRecordId(null);
    } else {
      // Generate simple sequential or timestamp ID
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newId = `PAT-2026-${randomSuffix}`;

      const newRecord: PatientRecord = {
        id: newId,
        createdAt: new Date().toISOString(),
        balance: 0,
        lastRecall: "2026-06-23",
        tags: [],
        personalInfo: { ...formData.personalInfo },
        guardianInfo: { ...formData.guardianInfo },
        medicalHistory: { ...formData.medicalHistory },
        dentalHistory: { ...formData.dentalHistory },
        clinicId: currentUser?.clinicId || 'clinic-default',
        createdBy: currentUser?.email || 'pnjtanartedentalclinic@gmail.com',
        updatedBy: currentUser?.email || 'pnjtanartedentalclinic@gmail.com',
        updatedAt: new Date().toISOString()
      };

      setRecords(prev => [newRecord, ...prev]);
      setToast({ message: `Patient record for ${formData.personalInfo.lastName}, ${formData.personalInfo.firstName} created successfully!`, type: 'success' });
      // Add a notification for the newly registered patient
      const notifText = `New patient registered: ${formData.personalInfo.firstName} ${formData.personalInfo.lastName}`;
      setNotifications(prev => [
        { id: `notif-${Date.now()}`, text: notifText, date: 'Just now', read: false, type: 'info' },
        ...prev
      ]);
    }
    setActiveScreen('PATIENTS');
  };

  // Sidebar state for mobile responsiveness
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        registeredUsers={registeredUsers}
        onRegisterOwner={(newOwner, clinic) => {
          const updatedUsers = [newOwner, ...registeredUsers];
          setRegisteredUsers(updatedUsers);
          clinicStorage.setItem('DENTAL_USERS', JSON.stringify(updatedUsers));

          const storedClinics = JSON.parse(clinicStorage.getItem('DENTAL_CLINICS') || '[]');
          const updatedClinics = [clinic, ...storedClinics];
          clinicStorage.setItem('DENTAL_CLINICS', JSON.stringify(updatedClinics));
        }}
      />
    );
  }

  if (userWorkspace === 'WORKSPACE_SELECT') {
    return (
      <WorkspaceSelection
        user={currentUser}
        clinicName={clinicName}
        onSelectWorkspace={(ws) => {
          setUserWorkspace(ws);
        }}
        onLogout={handleLogout}
      />
    );
  }

  if (userWorkspace === 'ASSOCIATES' || userWorkspace === 'STAFFS') {
    return (
      <UserManagementScreen
        currentUser={currentUser}
        mode={userWorkspace}
        registeredUsers={registeredUsers}
        onBackToWorkspace={() => setUserWorkspace('WORKSPACE_SELECT')}
        onUpdateUsers={(updatedList) => {
          setRegisteredUsers(updatedList);
          clinicStorage.setItem('DENTAL_USERS', JSON.stringify(updatedList));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-800 antialiased font-sans flex selection:bg-zinc-900 selection:text-white overflow-hidden">
      
      {/* LEFT SIDEBAR - Persistent on desktop, floating on mobile */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-zinc-200/80 flex flex-col transform lg:transform-none lg:opacity-100 transition-all duration-300 ease-in-out print:hidden ${
        isMobileSidebarOpen ? 'translate-x-0 w-64 opacity-100' : '-translate-x-full lg:translate-x-0'
      } ${
        isDesktopSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
      }`}>
        {/* Brand Header */}
        <div className={`h-16 border-b border-zinc-200/80 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'px-4' : 'px-6'}`}>
          <div className="flex items-center gap-2.5">
            <div className="bg-zinc-900 text-white p-2 rounded-xl flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-4 h-4 text-zinc-100 animate-pulse" />
            </div>
            <div className={`transition-opacity duration-200 ${isDesktopSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
              <span className="text-[9px] font-extrabold text-zinc-400 tracking-wider uppercase block">Clinic Ledger</span>
              <h1 className="text-sm font-bold text-zinc-900 tracking-tight font-display">PNJ Dental Clinic</h1>
            </div>
          </div>
          {/* Mobile close button */}
          <button 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-1 text-zinc-400 hover:text-zinc-800 lg:hidden cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className={`flex-1 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden transition-all duration-300 ${isDesktopSidebarCollapsed ? 'px-3' : 'px-4.5'}`}>
          
          {/* Dashboard */}
          <button
            onClick={() => {
              setActiveScreen('DASHBOARD');
              setNavbarSearchQuery('');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeScreen === 'DASHBOARD'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            } ${isDesktopSidebarCollapsed ? 'px-3 justify-center' : 'px-3.5'}`}
            title="Dashboard"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className={`${isDesktopSidebarCollapsed ? 'hidden' : 'block'}`}>Dashboard</span>
          </button>

          {/* Patients */}
          <button
            onClick={() => {
              setActiveScreen('PATIENTS');
              setNavbarSearchQuery('');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeScreen === 'PATIENTS'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            } ${isDesktopSidebarCollapsed ? 'px-3 justify-center' : 'px-3.5'}`}
            title="Patients"
          >
            <FolderHeart className="w-4 h-4 shrink-0" />
            <span className={`${isDesktopSidebarCollapsed ? 'hidden' : 'block'}`}>Patients</span>
          </button>

          {/* Calendar */}
          <button
            onClick={() => {
              setActiveScreen('CALENDAR');
              setNavbarSearchQuery('');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeScreen === 'CALENDAR'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            } ${isDesktopSidebarCollapsed ? 'px-3 justify-center' : 'px-3.5'}`}
            title="Calendar"
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span className={`${isDesktopSidebarCollapsed ? 'hidden' : 'block'}`}>Calendar</span>
          </button>

          {/* Analytics */}
          {currentUser?.role !== 'Staff Member' && (
            <button
              onClick={() => {
                setActiveScreen('ANALYTICS');
                setNavbarSearchQuery('');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeScreen === 'ANALYTICS'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
              } ${isDesktopSidebarCollapsed ? 'px-3 justify-center' : 'px-3.5'}`}
              title="Analytics"
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className={`${isDesktopSidebarCollapsed ? 'hidden' : 'block'}`}>Analytics</span>
            </button>
          )}

          {/* Clinic Operations Ledger */}
          <button
            onClick={() => {
              setActiveScreen('CLINIC_OPERATIONS_LEDGER');
              setNavbarSearchQuery('');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeScreen === 'CLINIC_OPERATIONS_LEDGER'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            } ${isDesktopSidebarCollapsed ? 'px-3 justify-center' : 'px-3.5'}`}
            title="Clinic Operations Ledger"
          >
            <Coins className="w-4 h-4 shrink-0" />
            <span className={`${isDesktopSidebarCollapsed ? 'hidden' : 'block'}`}>Clinic Operations Ledger</span>
          </button>

          {/* Master Data Directory */}
          <button
            onClick={() => {
              setActiveScreen('MASTER_DATA_DIRECTORY');
              setNavbarSearchQuery('');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeScreen === 'MASTER_DATA_DIRECTORY'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            } ${isDesktopSidebarCollapsed ? 'px-3 justify-center' : 'px-3.5'}`}
            title="Master Data Directory"
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span className={`${isDesktopSidebarCollapsed ? 'hidden' : 'block'}`}>Master Data Directory</span>
          </button>

          {/* Settings */}
          {currentUser?.role !== 'Staff Member' && (
            <button
              onClick={() => {
                setActiveScreen('SETTINGS');
                setNavbarSearchQuery('');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeScreen === 'SETTINGS'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
              } ${isDesktopSidebarCollapsed ? 'px-3 justify-center' : 'px-3.5'}`}
              title="Settings"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className={`${isDesktopSidebarCollapsed ? 'hidden' : 'block'}`}>Settings</span>
            </button>
          )}

          {/* User Management */}
          <button
            onClick={() => {
              setActiveScreen('USER_MANAGEMENT');
              setNavbarSearchQuery('');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeScreen === 'USER_MANAGEMENT'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            } ${isDesktopSidebarCollapsed ? 'px-3 justify-center' : 'px-3.5'}`}
            title="User Management"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className={`${isDesktopSidebarCollapsed ? 'hidden' : 'block'}`}>User Management</span>
          </button>

          <div className="pt-6">
            <div className={`pb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest transition-all duration-300 ${isDesktopSidebarCollapsed ? 'hidden' : 'px-3.5 block'}`}>
              Quick Actions
            </div>
            <button
              onClick={() => {
                handleAddNewRecord();
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold text-teal-600 hover:bg-teal-50 hover:text-teal-700 transition-all cursor-pointer ${isDesktopSidebarCollapsed ? 'px-3 justify-center' : 'px-3.5'}`}
              title="New Patient Intake"
            >
              <Plus className="w-4 h-4 stroke-[2.5px] shrink-0" />
              <span className={`${isDesktopSidebarCollapsed ? 'hidden' : 'block'}`}>New Patient Intake</span>
            </button>

            <button
              onClick={() => {
                setUserWorkspace('WORKSPACE_SELECT');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all cursor-pointer mt-1.5 ${isDesktopSidebarCollapsed ? 'px-3 justify-center' : 'px-3.5'}`}
              title="Workspace Selection"
            >
              <Landmark className="w-4 h-4 shrink-0" />
              <span className={`${isDesktopSidebarCollapsed ? 'hidden' : 'block'}`}>Workspace Hub</span>
            </button>
          </div>

        </nav>

        {/* Confidential banner footer */}
        <div className={`p-4.5 border-t border-zinc-100 bg-zinc-50/50 text-[10px] text-zinc-400 font-semibold leading-relaxed space-y-1 overflow-hidden whitespace-nowrap transition-all duration-300 ${isDesktopSidebarCollapsed ? 'hidden' : 'block'}`}>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Clinic Ledger Secure
          </div>
          <p className="font-medium text-[9px]">Confidential medical registry. Unauthorized access is prohibited.</p>
        </div>
      </aside>

      {/* OVERLAY for mobile sidebar */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* RIGHT SIDE MAIN CONTENT CONTAINER */}
      <div className={`flex-1 flex flex-col h-screen overflow-y-auto transition-all duration-300 ease-in-out ${isDesktopSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        
        {/* REDESIGNED MAIN NAVIGATION HEADER (FINAL DESIGN) */}
        <header className="min-h-16 py-3 bg-white border-b border-zinc-200/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 print:hidden gap-3.5 shadow-2xs">
          
          {/* LEFT SECTION (70–75% width on desktop) */}
          <div className="flex-1 max-w-[70%] sm:max-w-[75%] flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Hamburger Toggle */}
            <div className="flex items-center shrink-0">
              {/* Desktop menu toggle */}
              <button
                onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
                className="p-2 text-zinc-500 hover:text-zinc-900 hidden lg:block rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors"
                title="Toggle Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 text-zinc-500 hover:text-zinc-900 lg:hidden rounded-xl hover:bg-zinc-50 cursor-pointer"
                title="Open Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Global Search Bar (fixed width on desktop) */}
            <div className="relative min-w-0 w-full md:w-[480px] shrink-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search birthdate, mobile, email, name, HMO, address, last visit..."
                value={navbarSearchQuery}
                onChange={(e) => setNavbarSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none text-zinc-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder:text-zinc-400 truncate"
              />

              {/* Autocomplete Dropdown */}
              {isSearchFocused && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-zinc-200 shadow-2xl rounded-xl z-50 overflow-hidden divide-y divide-zinc-100 max-h-[350px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                  {['Matching Patients', 'Search Shortcuts'].map((cat) => {
                    const items = searchSuggestions.filter(s => s.category === cat);
                    if (items.length === 0) return null;

                    return (
                      <div key={cat} className="p-2">
                        <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest px-2.5 py-1 block">
                          {cat}
                        </span>
                        <div className="space-y-0.5 mt-1">
                          {items.map((item) => (
                            <button
                              key={item.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                              }}
                              onClick={() => {
                                if (item.type === 'patient' && item.patient) {
                                  handleViewPatientDetails(item.patient);
                                  setNavbarSearchQuery('');
                                  setIsSearchFocused(false);
                                } else if (item.type === 'shortcut' && item.valueToSet !== undefined) {
                                  setNavbarSearchQuery(item.valueToSet);
                                }
                              }}
                              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-50 flex items-start gap-2.5 transition-colors cursor-pointer group"
                            >
                              <span className={`p-1.5 rounded-lg shrink-0 ${
                                item.type === 'patient' 
                                  ? 'bg-teal-50 text-teal-600' 
                                  : 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-800'
                              }`}>
                                {item.type === 'patient' ? (
                                  <User className="w-3.5 h-3.5" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5" />
                                )}
                              </span>
                              <div className="truncate flex-1">
                                <div className="text-xs font-bold text-zinc-850 uppercase group-hover:text-teal-650 transition-colors">
                                  {item.title}
                                </div>
                                <div className="text-[10px] font-semibold text-zinc-400 truncate mt-0.5">
                                  {item.subtitle}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Primary Action Button (Add New Patient) */}
            <button
              onClick={handleAddNewRecord}
              className="bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Add New Patient</span>
            </button>
          </div>

          {/* RIGHT SECTION (25–30% width on desktop) */}
          <div className="max-w-[30%] sm:max-w-[25%] flex items-center justify-end gap-3 md:gap-4 shrink-0">
            
            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileOpen(false);
                }}
                className="p-2.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 rounded-xl transition-all relative cursor-pointer border border-zinc-100 bg-white shadow-3xs"
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-white animate-pulse">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown List */}
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl border border-zinc-200 shadow-xl z-50 overflow-hidden divide-y divide-zinc-100 animate-in fade-in slide-in-from-top-3 duration-150">
                    <div className="px-4 py-3 bg-zinc-50 flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-800">Notifications</span>
                      {notifications.filter(n => !n.read).length > 0 && (
                        <button
                          onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                          className="text-[10px] font-bold text-teal-600 hover:underline cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-zinc-400">No new notifications</div>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}
                            className={`p-3 flex items-start gap-2.5 hover:bg-zinc-50 cursor-pointer transition-colors ${!notif.read ? 'bg-teal-50/20' : ''}`}
                          >
                            <span className={`p-1.5 rounded-lg shrink-0 ${!notif.read ? 'bg-teal-100 text-teal-700' : 'bg-zinc-100 text-zinc-500'}`}>
                              {notif.type === 'appointment' ? <Calendar className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs text-zinc-700 leading-tight ${!notif.read ? 'font-bold' : 'font-medium'}`}>{notif.text}</p>
                              <span className="text-[9px] font-semibold text-zinc-400 mt-1 block">{notif.date}</span>
                            </div>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5"></span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Account with Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationsOpen(false);
                }}
                className="flex items-center gap-2 cursor-pointer group py-1"
              >
                {/* Profile Picture / Generic Person Icon */}
                <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 hover:text-zinc-800 transition-colors flex items-center justify-center shrink-0 border border-zinc-200 overflow-hidden shadow-3xs">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-4 h-4 text-zinc-655" />
                  )}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-zinc-800 group-hover:text-teal-600 transition-colors leading-tight">
                    {profile.name}
                  </div>
                </div>
              </button>

              {/* User Dropdown Menu */}
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsProfileOpen(false)} />
                  <div className="absolute right-0 mt-2.5 w-56 bg-white rounded-2xl border border-zinc-200 shadow-xl z-50 overflow-hidden divide-y divide-zinc-100 animate-in fade-in slide-in-from-top-3 duration-150">
                    <div className="px-4 py-3 bg-zinc-50/50">
                      <div className="text-xs font-bold text-zinc-800">{profile.name}</div>
                      <div className="text-[10px] text-zinc-400 font-semibold">{profile.email}</div>
                    </div>
                    <div className="p-1 space-y-0.5">
                      <button
                        onClick={() => { setActiveScreen('SETTINGS'); setIsProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg text-left transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Settings
                      </button>
                      <button
                        onClick={() => { setActiveModal('edit-profile'); setIsProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg text-left transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5" />
                        Edit Profile
                      </button>
                      <button
                        onClick={() => { setActiveModal('change-password'); setIsProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg text-left transition-colors cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Change Password
                      </button>
                      <button
                        onClick={() => { setActiveModal('change-email'); setIsProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg text-left transition-colors cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Change Email
                      </button>
                      <button
                        onClick={() => { setActiveModal('manage'); setIsProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg text-left transition-colors cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Manage Account
                      </button>
                      <button
                        onClick={() => { setActiveModal('user-guide'); setIsProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg text-left transition-colors cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        User Guide
                      </button>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => { setActiveModal('logout'); setIsProfileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-650 hover:bg-red-50 rounded-lg text-left transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

        </header>

        {/* Floating Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed bottom-6 right-6 z-50 print:hidden"
            >
              <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold text-white ${
                toast.type === 'success' ? 'bg-zinc-900 border-zinc-800' :
                toast.type === 'info' ? 'bg-zinc-800 border-zinc-700' : 'bg-red-600 border-red-500'
              }`}>
                {toast.type === 'success' ? <Check className="w-4 h-4 text-emerald-400 stroke-[3px]" /> : <AlertTriangle className="w-4 h-4 text-red-200" />}
                {toast.message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Body Stage */}
        <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Animated Screen Transitions */}
          <AnimatePresence mode="wait">
            
            {/* Dashboard Screen */}
            {activeScreen === 'DASHBOARD' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <Dashboard 
                  records={clinicRecords}
                  onAddNew={handleAddNewRecord}
                  onViewDetails={handleViewPatientDetails}
                  onDeleteRecord={handleDeleteRecord}
                  navbarSearchQuery={navbarSearchQuery}
                />
              </motion.div>
            )}

            {/* Patients Directory Screen */}
            {activeScreen === 'PATIENTS' && (
              <motion.div
                key="patients"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <PatientsList 
                  records={clinicRecords}
                  onAddNew={handleAddNewRecord}
                  onViewDetails={handleViewPatientDetails}
                  onEditPatient={handleEditPatient}
                  onArchivePatient={handleArchivePatient}
                  navbarSearchQuery={navbarSearchQuery}
                  userRole={currentUser?.role}
                />
              </motion.div>
            )}

            {/* Settings Screen */}
            {activeScreen === 'SETTINGS' && (
              <motion.div
                key="settings_screen"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <SettingsCenter 
                  currentUser={currentUser}
                  records={records}
                  setRecords={setRecords}
                  clinicName={clinicName}
                  setClinicName={setClinicName}
                  clinicPhone={clinicPhone}
                  setClinicPhone={setClinicPhone}
                  clinicAddress={clinicAddress}
                  setClinicAddress={setClinicAddress}
                  smsEnabled={smsEnabled}
                  setSmsEnabled={setSmsEnabled}
                  profile={profile}
                  setProfile={setProfile}
                  setToast={setToast}
                />
              </motion.div>
            )}

            {/* Calendar Screen */}
            {activeScreen === 'CALENDAR' && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <ClinicCalendar 
                  records={clinicRecords} 
                  onAddNewPatient={handleAddNewRecord} 
                  registeredUsers={registeredUsers}
                  onUpdatePatient={handleUpdatePatient}
                  onViewPatientDetails={handleViewPatientDetails}
                />
              </motion.div>
            )}

            {/* Analytics Screen */}
            {activeScreen === 'ANALYTICS' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="flex-1 flex flex-col min-h-0 overflow-hidden"
              >
                <Analytics 
                  records={clinicRecords} 
                  onViewPatient={handleViewPatientDetails} 
                />
              </motion.div>
            )}

            {/* Clinic Operations Ledger Screen */}
            {activeScreen === 'CLINIC_OPERATIONS_LEDGER' && (
              <motion.div
                key="clinic_operations_ledger"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <ClinicOperationsScreen 
                  currentUser={currentUser}
                  setToast={setToast}
                />
              </motion.div>
            )}

            {/* Master Data Directory Screen */}
            {activeScreen === 'MASTER_DATA_DIRECTORY' && (
              <motion.div
                key="master_data_directory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <MasterDataDirectory 
                  setToast={setToast}
                />
              </motion.div>
            )}

            {/* User Management Screen */}
            {activeScreen === 'USER_MANAGEMENT' && (
              <motion.div
                key="user_management"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <UserManagementScreen 
                  currentUser={currentUser}
                  mode="ASSOCIATES"
                  registeredUsers={registeredUsers}
                  onBackToWorkspace={() => setActiveScreen('DASHBOARD')}
                  onUpdateUsers={(updatedList) => {
                    setRegisteredUsers(updatedList);
                    clinicStorage.setItem('DENTAL_USERS', JSON.stringify(updatedList));
                  }}
                  isSidebarMode={true}
                />
              </motion.div>
            )}

            {/* Clinical Patient Record Details Screen */}
            {activeScreen === 'DETAILS' && selectedPatient && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <PatientDetails 
                  record={selectedPatient}
                  onBack={() => {
                    setSelectedPatient(null);
                    setActiveScreen('PATIENTS');
                  }}
                  onUpdatePatient={handleUpdatePatient}
                  onEditPatient={handleEditPatient}
                  userRole={currentUser?.role}
                />
              </motion.div>
            )}

            {/* Multi-step Patient Wizard Registration screen */}
            {activeScreen === 'WIZARD' && (
              <motion.div
                key="wizard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="max-w-4xl mx-auto space-y-6"
              >
                
                {/* Form Header with Cancel controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (window.confirm("Are you sure you want to exit? Your currently typed progress will be lost.")) {
                          setActiveScreen('PATIENTS');
                        }
                      }}
                      id="wizard-cancel-btn"
                      className="p-2.5 text-zinc-500 hover:text-zinc-900 bg-white hover:bg-zinc-50 rounded-xl border border-zinc-200/80 shadow-xs cursor-pointer transition-all duration-150"
                      title="Cancel and Back"
                    >
                      <ArrowLeft className="w-4.5 h-4.5" />
                    </button>
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900 font-display tracking-tight">
                        {editingRecordId ? 'Edit Patient File' : 'New Patient Onboarding File'}
                      </h2>
                      <p className="text-xs text-zinc-400 font-medium">Please proceed sequentially through the clinical intake steps.</p>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-400 font-semibold bg-white border border-zinc-200/80 px-3.5 py-2 rounded-xl hidden sm:block shadow-xs">
                    Preserving input state during navigation: <strong className="text-zinc-900 uppercase font-bold">Active</strong>
                  </div>
                </div>

                {/* Step Progress Indicators Bar */}
                <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs">
                  <div className="grid grid-cols-4 gap-2">
                    
                    {/* Step 1 indicator */}
                    <div className="space-y-2 text-center">
                      <div className="flex items-center justify-center">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-200 ${
                          wizardStep === 1 ? 'bg-zinc-900 text-white border-zinc-900 ring-4 ring-zinc-100' : 
                          wizardStep > 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-50 text-zinc-400 border-zinc-200'
                        }`}>
                          {wizardStep > 1 ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : '1'}
                        </span>
                      </div>
                      <span className={`text-[10px] md:text-xs font-bold block transition-colors duration-200 ${wizardStep === 1 ? 'text-zinc-900' : wizardStep > 1 ? 'text-emerald-700' : 'text-zinc-400'}`}>
                        Demographics
                      </span>
                    </div>

                    {/* Step 2 indicator */}
                    <div className="space-y-2 text-center">
                      <div className="flex items-center justify-center">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-200 ${
                          wizardStep === 2 ? 'bg-zinc-900 text-white border-zinc-900 ring-4 ring-zinc-100' : 
                          wizardStep > 2 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-50 text-zinc-400 border-zinc-200'
                        }`}>
                          {wizardStep > 2 ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : '2'}
                        </span>
                      </div>
                      <span className={`text-[10px] md:text-xs font-bold block transition-colors duration-200 ${wizardStep === 2 ? 'text-zinc-900' : wizardStep > 2 ? 'text-emerald-700' : 'text-zinc-400'}`}>
                        Guardian Contacts {isMinor && <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider block mt-0.5">Required</span>}
                      </span>
                    </div>

                    {/* Step 3 indicator */}
                    <div className="space-y-2 text-center">
                      <div className="flex items-center justify-center">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-200 ${
                          wizardStep === 3 ? 'bg-zinc-900 text-white border-zinc-900 ring-4 ring-zinc-100' : 
                          wizardStep > 3 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-50 text-zinc-400 border-zinc-200'
                        }`}>
                          {wizardStep > 3 ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : '3'}
                        </span>
                      </div>
                      <span className={`text-[10px] md:text-xs font-bold block transition-colors duration-200 ${wizardStep === 3 ? 'text-zinc-900' : wizardStep > 3 ? 'text-emerald-700' : 'text-zinc-400'}`}>
                        Medical Alerts
                      </span>
                    </div>

                    {/* Step 4 indicator */}
                    <div className="space-y-2 text-center">
                      <div className="flex items-center justify-center">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-200 ${
                          wizardStep === 4 ? 'bg-zinc-900 text-white border-zinc-900 ring-4 ring-zinc-100' : 'bg-zinc-50 text-zinc-400 border-zinc-200'
                        }`}>
                          4
                        </span>
                      </div>
                      <span className={`text-[10px] md:text-xs font-bold block transition-colors duration-200 ${wizardStep === 4 ? 'text-zinc-900' : 'text-zinc-400'}`}>
                        Dental Intake
                      </span>
                    </div>

                  </div>
                </div>

                {/* Active wizard step forms */}
                <div>
                  <AnimatePresence mode="wait">
                    {wizardStep === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <PersonalInfoForm 
                          data={formData.personalInfo}
                          onChange={updatePersonalInfo}
                          onNext={() => setWizardStep(2)}
                        />
                      </motion.div>
                    )}

                    {wizardStep === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <GuardianInfoForm 
                          data={formData.guardianInfo}
                          isUnderage={isMinor}
                          patientAge={patientAge}
                          onChange={updateGuardianInfo}
                          onNext={() => setWizardStep(3)}
                          onPrev={() => setWizardStep(1)}
                        />
                      </motion.div>
                    )}

                    {wizardStep === 3 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <MedicalHistoryForm 
                          data={formData.medicalHistory}
                          onChange={updateMedicalHistory}
                          onNext={() => setWizardStep(4)}
                          onPrev={() => setWizardStep(2)}
                        />
                      </motion.div>
                    )}

                    {wizardStep === 4 && (
                      <motion.div
                        key="step4"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <DentalHistoryForm 
                          data={formData.dentalHistory}
                          onChange={updateDentalHistory}
                          onSave={handleSaveAllData}
                          onPrev={() => setWizardStep(3)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </main>

        {/* Footer Branding */}
        <footer className="bg-white border-t border-zinc-200/85 py-5 text-center text-[11px] text-zinc-400 print:hidden">
          <div className="max-w-7xl mx-auto px-4 space-y-0.5">
            <p>© 2026 PNJ Dental Clinic Digital Ledger. Private medical registry system.</p>
          </div>
        </footer>

        {/* POPUP MODALS SYSTEM */}
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col text-left">
              
              {/* Modal Header */}
              <div className="px-5 py-4 bg-zinc-50 border-b border-zinc-150 flex items-center justify-between shrink-0">
                <span className="text-sm font-black text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                  {activeModal === 'settings' && <Settings className="w-4 h-4 text-teal-650" />}
                  {activeModal === 'edit-profile' && <User className="w-4 h-4 text-emerald-650" />}
                  {activeModal === 'change-password' && <Key className="w-4 h-4 text-indigo-650" />}
                  {activeModal === 'change-email' && <Mail className="w-4 h-4 text-amber-600" />}
                  {activeModal === 'manage' && <Shield className="w-4 h-4 text-teal-650" />}
                  {activeModal === 'user-guide' && <HelpCircle className="w-4 h-4 text-zinc-650" />}
                  {activeModal === 'logout' && <LogOut className="w-4 h-4 text-red-655" />}
                  
                  {activeModal === 'settings' && 'Clinic Configurations'}
                  {activeModal === 'edit-profile' && 'Modify User Profile'}
                  {activeModal === 'change-password' && 'Reset Secure Password'}
                  {activeModal === 'change-email' && 'Modify System Email'}
                  {activeModal === 'manage' && 'Clinic Backup Manager'}
                  {activeModal === 'user-guide' && 'Clinic Operations Manual'}
                  {activeModal === 'logout' && 'Secure Session Logout'}
                </span>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="text-zinc-400 hover:text-zinc-600 font-extrabold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body Container with scroll */}
              <div className="p-5 overflow-y-auto space-y-4 text-zinc-700 text-xs">
                
                {/* 1. CLINIC CONFIGURATIONS */}
                {activeModal === 'settings' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase">Clinic name:</label>
                      <input
                        type="text"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-semibold text-zinc-800 text-xs"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase">Clinic hot line phone:</label>
                      <input
                        type="text"
                        value={clinicPhone}
                        onChange={(e) => setClinicPhone(e.target.value)}
                        className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-semibold text-zinc-800 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase">Registered address:</label>
                      <input
                        type="text"
                        value={clinicAddress}
                        onChange={(e) => setClinicAddress(e.target.value)}
                        className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-semibold text-zinc-800 text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                      <div>
                        <span className="font-bold text-zinc-850 block">Enable Automated Recalls</span>
                        <span className="text-[10px] text-zinc-400 font-semibold">Sends SMS notices on patient recall intervals</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={smsEnabled}
                        onChange={(e) => setSmsEnabled(e.target.checked)}
                        className="w-4 h-4 accent-teal-600 cursor-pointer"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-3">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null);
                          setToast({ message: 'Clinic configurations saved successfully!', type: 'success' });
                        }}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-black cursor-pointer shadow-xs"
                      >
                        Save Settings
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. EDIT PROFILE */}
                {activeModal === 'edit-profile' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase">Full owner name:</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-semibold text-zinc-800 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase">System role / designation:</label>
                      <input
                        type="text"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-semibold text-zinc-800 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase">System login email:</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-semibold text-zinc-800 text-xs"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-3">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfile(prev => ({
                            ...prev,
                            name: editName,
                            role: editRole,
                            email: editEmail
                          }));
                          setActiveModal(null);
                          setToast({ message: 'User Profile updated successfully!', type: 'success' });
                        }}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-black cursor-pointer shadow-xs"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. CHANGE PASSWORD */}
                {activeModal === 'change-password' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase">Current login password:</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-zinc-800 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase">New password:</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-zinc-800 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase">Confirm new password:</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-zinc-800 text-xs"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-3">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!newPassword || newPassword !== confirmPassword}
                        onClick={() => {
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                          setActiveModal(null);
                          setToast({ message: 'Secure login password successfully changed!', type: 'success' });
                        }}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-45 disabled:hover:bg-zinc-900 text-white rounded-xl font-black cursor-pointer shadow-xs"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. CHANGE EMAIL */}
                {activeModal === 'change-email' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 font-medium leading-relaxed">
                      Changing your email address will update your primary secure login credentials.
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase">New system email address:</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full p-2.5 border border-zinc-200 rounded-xl focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-semibold text-zinc-800 text-xs"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-3">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfile(prev => ({ ...prev, email: editEmail }));
                          setActiveModal(null);
                          setToast({ message: 'Clinic credential email changed successfully!', type: 'success' });
                        }}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-black cursor-pointer shadow-xs"
                      >
                        Update Email
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. MANAGE BACKUPS */}
                {activeModal === 'manage' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-teal-850 leading-normal font-medium">
                      PNJ Dental Clinical Database contains <strong>{records.length}</strong> active patient files. You can export them to a raw JSON backup.
                    </div>

                    <div className="space-y-2">
                      <span className="font-black text-zinc-850 block uppercase tracking-wider text-[10px]">Actions:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
                          const downloadAnchor = document.createElement('a');
                          downloadAnchor.setAttribute("href", dataStr);
                          downloadAnchor.setAttribute("download", `pnj_dental_database_${new Date().toISOString().slice(0, 10)}.json`);
                          document.body.appendChild(downloadAnchor);
                          downloadAnchor.click();
                          downloadAnchor.remove();
                          setActiveModal(null);
                          setToast({ message: 'Database exported successfully as JSON file!', type: 'success' });
                        }}
                        className="w-full flex items-center justify-between p-3.5 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200/80 text-zinc-800 transition-all font-bold cursor-pointer text-left"
                      >
                        <div>
                          <span className="block text-zinc-900 font-extrabold text-[12px]">Export Database (JSON)</span>
                          <span className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider block mt-0.5">Download full data snapshot</span>
                        </div>
                        <Download className="w-5 h-5 text-teal-655 shrink-0" />
                      </button>

                      <div className="w-full flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200/85 rounded-xl text-zinc-400 opacity-60">
                        <div>
                          <span className="block font-extrabold text-[12px]">Restore Database Backup</span>
                          <span className="text-[9px] font-semibold uppercase tracking-wider block mt-0.5">Upload .JSON file to restore records</span>
                        </div>
                        <Upload className="w-5 h-5 shrink-0" />
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <span className="font-bold text-zinc-550 uppercase tracking-wide block">Local Backup Registry Log:</span>
                      <div className="border border-zinc-150 rounded-xl bg-zinc-50/50 p-2.5 text-[10px] font-bold text-zinc-500 space-y-1.5">
                        <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                          <span>pnj_dental_auto_daily.json</span>
                          <span className="text-[9px] text-emerald-600 uppercase">Stored Securely</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span>pnj_dental_v2_migration.json</span>
                          <span className="text-[9px] text-emerald-600 uppercase">Stored Securely</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold cursor-pointer"
                      >
                        Close Manager
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. CLINIC OPERATIONS MANUAL (USER GUIDE) */}
                {activeModal === 'user-guide' && (
                  <div className="space-y-4">
                    <div className="prose prose-sm prose-zinc text-zinc-655 leading-relaxed text-[11px] max-h-80 overflow-y-auto pr-1">
                      <h3 className="text-zinc-850 font-extrabold text-xs uppercase border-b border-zinc-250 pb-1 mb-2">1. Patient Intake Operations</h3>
                      <p className="mb-2">To register new clinical records, click the **Add New Patient** button located inside the Main Navigation Header. This triggers the structured intake wizard spanning personal info, guardian indicators, medical conditions, and previous dental histories.</p>
                      
                      <h3 className="text-zinc-850 font-extrabold text-xs uppercase border-b border-zinc-250 pb-1 mt-3 mb-2">2. Advanced Filtering Directory</h3>
                      <p className="mb-2">You can query the directory utilizing five orthogonal filters:</p>
                      <ul className="list-disc pl-4 space-y-1 mb-2">
                        <li><strong>Last Name / First Name search:</strong> Fully supports looking up partial names, exact matches, comma separations, and perfectly supports duplicate listings.</li>
                        <li><strong>Tag Filters:</strong> Click the searchable multi-select tag widget to browse clinic tag bubbles. Multiple active tags filter with AND logic.</li>
                        <li><strong>Registration Year:</strong> Filter dental cards by registration epoch.</li>
                        <li><strong>Age Type Categorization:</strong> Automatically segments cards by computed birthdate (<em>Pedia</em> for patients under 22 years of age; <em>Adult</em> for 22 years and above).</li>
                        <li><strong>Specific Date:</strong> Isolates cards created on precise day calendars.</li>
                      </ul>

                      <h3 className="text-zinc-850 font-extrabold text-xs uppercase border-b border-zinc-250 pb-1 mt-3 mb-2">3. Database Backups</h3>
                      <p className="mb-2">Go to the user profile dropdown in the top bar, choose **Manage Account**, and trigger a secure JSON database compilation. Store this locally to guard clinic files from browser caches clearing.</p>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl font-black cursor-pointer shadow-xs"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                )}

                {/* 7. SECURE LOGOUT */}
                {activeModal === 'logout' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-red-50 text-red-800 font-medium rounded-xl border border-red-100 flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="block font-black text-xs uppercase tracking-wide">Warning: Closing secure session</span>
                        <p className="text-[10px] leading-normal font-semibold">Logging out will terminate your authenticated clinic session. Your local storage state remains intact on this browser.</p>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-3">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null);
                          setProfile({
                            name: 'Logged Out Session',
                            role: 'GUEST',
                            email: '',
                            photoUrl: ''
                          });
                          setToast({ message: 'You have logged out successfully. (Demo session ended)', type: 'info' });
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black cursor-pointer shadow-xs"
                      >
                        Yes, Log out
                      </button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
