import React, { useState, useMemo } from 'react';
import { 
  Users, Stethoscope, Search, Plus, Edit3, Trash2, ShieldAlert, Check, 
  ArrowLeft, X, Mail, Phone, Lock, Eye, EyeOff, User, RefreshCw, EyeIcon, 
  CheckCircle, HelpCircle, UserCheck
} from 'lucide-react';
import { ClinicUser } from '../../types';

interface UserManagementScreenProps {
  currentUser: ClinicUser;
  mode: 'ASSOCIATES' | 'STAFFS';
  registeredUsers: ClinicUser[];
  onBackToWorkspace: () => void;
  onUpdateUsers: (users: ClinicUser[]) => void;
  isSidebarMode?: boolean;
}

export default function UserManagementScreen({ 
  currentUser, mode, registeredUsers, onBackToWorkspace, onUpdateUsers, isSidebarMode = false 
}: UserManagementScreenProps) {
  
  const [currentMode, setCurrentMode] = useState<'ASSOCIATES' | 'STAFFS'>(mode || 'ASSOCIATES');
  const targetRole = currentMode === 'ASSOCIATES' ? 'Associate Dentist' : 'Staff Member';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Modals / Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClinicUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  // Fields for Register/Edit Form
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [formRole, setFormRole] = useState<'Associate Dentist' | 'Staff Member'>(targetRole);
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formDisplayInCalendar, setFormDisplayInCalendar] = useState(true);
  
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return registeredUsers.filter(user => {
      // Must be same clinic
      if (user.clinicId !== currentUser.clinicId) return false;
      
      // Must match target role type for this management mode
      const roleType = user.role;
      if (currentMode === 'ASSOCIATES' && roleType !== 'Associate Dentist') return false;
      if (currentMode === 'STAFFS' && roleType !== 'Staff Member') return false;

      // Filter by active status tab
      if (activeTab === 'ACTIVE' && user.status !== 'Active') return false;
      if (activeTab === 'INACTIVE' && user.status === 'Active') return false;

      // Filter by query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = user.name.toLowerCase().includes(query);
        const matchesEmail = user.email.toLowerCase().includes(query);
        const matchesPhone = user.phone && user.phone.includes(query);
        return matchesName || matchesEmail || matchesPhone;
      }

      return true;
    });
  }, [registeredUsers, currentMode, activeTab, searchQuery, currentUser.clinicId]);

  const openRegisterForm = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormConfirmPassword('');
    setFormRole(currentMode === 'ASSOCIATES' ? 'Associate Dentist' : 'Staff Member');
    setFormStatus('Active');
    setFormDisplayInCalendar(true);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: ClinicUser) => {
    setIsEditing(true);
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone || '');
    setFormPassword('');
    setFormConfirmPassword('');
    setFormRole(user.role);
    setFormStatus(user.status);
    setFormDisplayInCalendar(user.displayInCalendar !== false);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenView = (user: ClinicUser) => {
    setSelectedUser(user);
    setIsViewOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Please fill out all required name and email fields.');
      return;
    }

    if (!isEditing) {
      // Registration checks
      if (!formPassword) {
        setFormError('Please enter a secure password.');
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }
      // Check duplicate email
      const isDuplicate = registeredUsers.some(u => u.email.toLowerCase() === formEmail.toLowerCase());
      if (isDuplicate) {
        setFormError('An account with this email address is already registered.');
        return;
      }

      const newUser: ClinicUser = {
        id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        passwordHash: formPassword, // For simulation purposes stored directly
        role: formRole,
        status: formStatus,
        clinicId: currentUser.clinicId,
        createdAt: new Date().toISOString(),
        displayInCalendar: formRole === 'Associate Dentist' ? formDisplayInCalendar : false
      };

      onUpdateUsers([newUser, ...registeredUsers]);
    } else {
      // Editing
      if (formPassword && formPassword !== formConfirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }

      const updated = registeredUsers.map(u => {
        if (u.id === selectedUser?.id) {
          const updatedUser = {
            ...u,
            name: formName.trim(),
            phone: formPhone.trim(),
            role: formRole,
            status: formStatus,
            displayInCalendar: formRole === 'Associate Dentist' ? formDisplayInCalendar : false
          } as ClinicUser;

          if (formPassword && formPassword.trim()) {
            updatedUser.passwordHash = formPassword;
          }
          return updatedUser;
        }
        return u;
      });

      onUpdateUsers(updated);
    }

    setIsFormOpen(false);
  };

  const handleToggleStatus = (user: ClinicUser) => {
    const updated = registeredUsers.map(u => {
      if (u.id === user.id) {
        return {
          ...u,
          status: u.status === 'Active' ? 'Inactive' : 'Active'
        } as ClinicUser;
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you absolutely sure you want to delete this account? This action is irreversible.')) {
      onUpdateUsers(registeredUsers.filter(u => u.id !== userId));
    }
  };

  const handleResetPassword = (user: ClinicUser) => {
    const newPass = prompt(`Enter a new secure password for ${user.name}:`, 'pnjtanarte2020');
    if (newPass) {
      const updated = registeredUsers.map(u => {
        if (u.id === user.id) {
          return { ...u, passwordHash: newPass };
        }
        return u;
      });
      onUpdateUsers(updated);
      alert('Password has been successfully updated.');
    }
  };

  const renderModals = () => {
    return (
      <>
        {/* REGISTER/EDIT MODAL */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className={`p-5 text-white flex items-center justify-between ${
                currentMode === 'ASSOCIATES' ? 'bg-zinc-900' : 'bg-zinc-800'
              }`}>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-white" />
                  <h3 className="font-bold text-sm">
                    {isEditing ? `Edit ${targetRole} Profile` : `Register New ${targetRole}`}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="form-fullname">
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                        <User className="w-3.5 h-3.5" />
                      </span>
                      <input
                        id="form-fullname"
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none text-slate-800 focus:bg-white focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="form-email">
                      Secure Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                        <Mail className="w-3.5 h-3.5" />
                      </span>
                      <input
                        id="form-email"
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="e.g. john.doe@pj-dental.com"
                        disabled={isEditing}
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none text-slate-800 focus:bg-white focus:border-blue-500 transition-all disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="form-phone">
                      Contact Phone Number
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                        <Phone className="w-3.5 h-3.5" />
                      </span>
                      <input
                        id="form-phone"
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="e.g. 0917-123-4567"
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none text-slate-800 focus:bg-white focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password fields */}
                  {(!isEditing || formPassword || formConfirmPassword) ? (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="form-pass">
                          {isEditing ? 'New Password' : 'Password'}
                        </label>
                        <input
                          id="form-pass"
                          type="password"
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-slate-800 focus:bg-white focus:border-blue-500 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="form-confirm">
                          Confirm
                        </label>
                        <input
                          id="form-confirm"
                          type="password"
                          value={formConfirmPassword}
                          onChange={(e) => setFormConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-slate-800 focus:bg-white focus:border-blue-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setFormPassword(' '); setFormConfirmPassword(' '); }}
                      className="text-[10px] font-black text-blue-600 hover:underline block pt-1.5 cursor-pointer"
                    >
                      + Change Password fields
                    </button>
                  )}

                  {/* Status Toggle */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 mt-2">
                    <span className="text-xs font-bold text-slate-700">Account Active Status</span>
                    <button
                      type="button"
                      onClick={() => setFormStatus(formStatus === 'Active' ? 'Inactive' : 'Active')}
                      className={`px-3 py-1 rounded-full text-[10px] font-black cursor-pointer transition-all ${
                        formStatus === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {formStatus}
                    </button>
                  </div>

                  {/* Display in Calendar Toggle (Associate Dentist Only) */}
                  {currentMode === 'ASSOCIATES' && (
                    <div className="pt-2.5 flex items-center justify-between border-t border-slate-100">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-700 block">Display in Calendar</span>
                        <span className="text-[10px] text-slate-400 font-medium block">Show inside calendar's Associate filter</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormDisplayInCalendar(!formDisplayInCalendar)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black cursor-pointer transition-all ${
                          formDisplayInCalendar ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'bg-slate-50 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {formDisplayInCalendar ? 'Yes' : 'No'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-md ${
                      currentMode === 'ASSOCIATES' 
                        ? 'bg-zinc-900 hover:bg-zinc-850' 
                        : 'bg-zinc-900 hover:bg-zinc-850'
                    }`}
                  >
                    Save Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW PROFILE PROFILE DETAILS MODAL */}
        {isViewOpen && selectedUser && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Cover Header */}
              <div className={`p-8 text-center text-white relative ${
                currentMode === 'ASSOCIATES' ? 'bg-zinc-900' : 'bg-zinc-800'
              }`}>
                <button 
                  onClick={() => setIsViewOpen(false)}
                  className="absolute top-4 right-4 p-1 rounded-lg bg-black/10 hover:bg-black/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <div className="w-20 h-20 rounded-full bg-white text-slate-800 mx-auto flex items-center justify-center text-xl font-extrabold border-4 border-white/20 shadow-md">
                  {selectedUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>

                <h3 className="text-base font-black tracking-tight mt-3">{selectedUser.name}</h3>
                <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest mt-1">
                  {selectedUser.role}
                </p>
              </div>

              {/* Profile Fields List */}
              <div className="p-6 space-y-4">
                <div className="space-y-3.5 text-xs font-semibold text-slate-700">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-400">Database ID</span>
                    <span className="text-slate-800 font-mono text-[10px] bg-slate-50 px-2 py-0.5 rounded-lg">{selectedUser.id}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-400">Email Address</span>
                    <span className="text-slate-800">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-400">Mobile Phone</span>
                    <span className="text-slate-800">{selectedUser.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-400">Active Status</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      selectedUser.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {selectedUser.status}
                    </span>
                  </div>
                  {selectedUser.createdAt && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-400">Registered Date</span>
                      <span className="text-slate-500">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setIsViewOpen(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer text-center"
                  >
                    Close Profile View
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  if (isSidebarMode) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col min-h-[750px]">
        {/* HEADER SECTION WITHOUT DUPLICATE GEAR ICON */}
        <div className="border-b border-zinc-200 px-6 py-4 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-black text-zinc-900 tracking-tight">User Management Directory</h1>
            <p className="text-xs text-zinc-400 font-medium">Manage clinic associates, dental specialists, receptionists, and assistant profiles.</p>
          </div>
          <button
            onClick={openRegisterForm}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{currentMode === 'ASSOCIATES' ? 'Register Associate' : 'Register Staff'}</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1">
          {/* LEFT SUB-NAVIGATION */}
          <div className="w-full lg:w-64 bg-zinc-50 border-r border-zinc-200 p-5 flex flex-col gap-1 shrink-0">
            <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Staff Categories
            </div>

            <button
              onClick={() => {
                setCurrentMode('ASSOCIATES');
                setFormRole('Associate Dentist');
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                currentMode === 'ASSOCIATES' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Stethoscope className="w-4 h-4 shrink-0" />
              Associate Dentists
            </button>

            <button
              onClick={() => {
                setCurrentMode('STAFFS');
                setFormRole('Staff Member');
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                currentMode === 'STAFFS' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              Clinic Staff
            </button>
          </div>

          {/* MAIN STAGE */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-white">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-50 p-4 rounded-2xl border border-zinc-200 shadow-3xs">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-zinc-200/50 rounded-xl w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('ALL')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeTab === 'ALL' ? 'bg-white text-zinc-900 shadow-3xs' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  All Accounts
                </button>
                <button
                  onClick={() => setActiveTab('ACTIVE')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeTab === 'ACTIVE' ? 'bg-white text-emerald-600 shadow-3xs' : 'text-zinc-500 hover:text-emerald-600'
                  }`}
                >
                  Active Only
                </button>
                <button
                  onClick={() => setActiveTab('INACTIVE')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    activeTab === 'INACTIVE' ? 'bg-white text-red-600 shadow-3xs' : 'text-zinc-500 hover:text-red-600'
                  }`}
                >
                  Inactive
                </button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search name, phone, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-zinc-900 outline-none bg-white"
                />
              </div>
            </div>

            {/* List */}
            {filteredUsers.length === 0 ? (
              <div className="bg-zinc-50/50 border border-zinc-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="p-3 bg-zinc-100 rounded-full text-zinc-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-800">No Clinic Users Registered</h3>
                  <p className="text-[11px] text-zinc-400 font-medium">Get started by creating your first associate dentist or staff user credential profile.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-3xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Account Profile</th>
                        <th className="px-6 py-4">Role Designation</th>
                        <th className="px-6 py-4">Security Level</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-600">
                      {filteredUsers.map((user, idx) => (
                        <tr key={`${user.id}-${idx}`} className="hover:bg-zinc-50/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white capitalize bg-zinc-800">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="text-zinc-950 font-bold">{user.name}</h4>
                                <p className="text-[10px] text-zinc-400">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-zinc-800">{user.role}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-zinc-100 text-zinc-700 px-2 py-1 rounded-md text-[10px] font-bold border border-zinc-200">
                              {user.role === 'Associate Dentist' ? 'Clinical Practitioner' : 'Administrative staff'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${
                              user.status === 'Active' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-600' : 'bg-red-600'}`}></span>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenView(user)}
                                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-950 transition-colors cursor-pointer"
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(user)}
                                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-950 transition-colors cursor-pointer"
                                title="Edit profile"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleResetPassword(user)}
                                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-orange-600 transition-colors cursor-pointer"
                                title="Reset credentials"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(user)}
                                className={`p-1.5 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer ${
                                  user.status === 'Active' ? 'text-red-500 hover:text-red-700' : 'text-emerald-500 hover:text-emerald-700'
                                }`}
                                title={user.status === 'Active' ? 'Deactivate user' : 'Activate user'}
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                              {currentUser.email !== user.email && (
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Delete account record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODALS RENDER */}
        {renderModals()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Admin Workspace Navbar */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToWorkspace}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Back to Workspace Console"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-5 w-[1px] bg-slate-200"></div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              {currentMode === 'ASSOCIATES' ? (
                <>
                  <Stethoscope className="w-4 h-4 text-violet-600" />
                  <span>Dentist Associates Panel</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Clinic Staff Directory</span>
                </>
              )}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {currentMode === 'ASSOCIATES' ? 'Clinic Dentists Management' : 'Reception & Nursing Staff'}
            </p>
          </div>
        </div>

        <button
          onClick={openRegisterForm}
          className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
            currentMode === 'ASSOCIATES' 
              ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/10' 
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{currentMode === 'ASSOCIATES' ? 'Register Associate' : 'Register Staff'}</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-150 shadow-3xs">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeTab === 'ALL' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Accounts
            </button>
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeTab === 'ACTIVE' ? 'bg-white text-emerald-600 shadow-3xs' : 'text-slate-500 hover:text-emerald-600'
              }`}
            >
              Active Only
            </button>
            <button
              onClick={() => setActiveTab('INACTIVE')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeTab === 'INACTIVE' ? 'bg-white text-red-600 shadow-3xs' : 'text-slate-500 hover:text-red-600'
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50"
            />
          </div>
        </div>

        {/* List */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white border border-slate-150 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-slate-50 rounded-full text-slate-400">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800">No Registered Records</h3>
              <p className="text-[11px] text-slate-400 font-medium">Create a profile to begin managing user login credentials.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-3xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Account Profile</th>
                    <th className="px-6 py-4">Role Designation</th>
                    <th className="px-6 py-4">Security Level</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-650">
                  {filteredUsers.map((user, idx) => (
                    <tr key={`${user.id}-${idx}`} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white capitalize ${
                            currentMode === 'ASSOCIATES' ? 'bg-violet-600' : 'bg-emerald-600'
                          }`}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-slate-900 font-black">{user.name}</h4>
                            <p className="text-[10px] text-slate-450 font-medium">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-800">{user.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-55 bg-zinc-50 text-slate-700 px-2 py-1 rounded-md text-[10px] font-bold border border-slate-200">
                          {user.role === 'Associate Dentist' ? 'Clinical Practitioner' : 'Administrative staff'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black border ${
                          user.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-600' : 'bg-red-600'}`}></span>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenView(user)}
                            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Edit profile"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-orange-600 transition-colors cursor-pointer"
                            title="Reset credentials"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer ${
                              user.status === 'Active' ? 'text-red-500 hover:text-red-700' : 'text-emerald-500 hover:text-emerald-700'
                            }`}
                            title={user.status === 'Active' ? 'Deactivate user' : 'Activate user'}
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          {currentUser.email !== user.email && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 hover:bg-slate-55 rounded-lg text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Delete account record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODALS RENDER */}
      {renderModals()}
    </div>
  );
}
