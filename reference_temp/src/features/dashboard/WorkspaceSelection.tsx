import React from 'react';
import { Landmark, Users, Stethoscope, LogOut, ArrowRight } from 'lucide-react';
import { ClinicUser } from '../../types';

interface WorkspaceSelectionProps {
  user: ClinicUser;
  clinicName: string;
  onSelectWorkspace: (workspace: 'CLINIC' | 'ASSOCIATES' | 'STAFFS') => void;
  onLogout: () => void;
}

export default function WorkspaceSelection({ user, clinicName, onSelectWorkspace, onLogout }: WorkspaceSelectionProps) {
  const isOwner = user.role === 'Clinic Owner';
  const isAssociate = user.role === 'Associate Dentist';

  // Load dynamic counts from database (localStorage)
  const stats = React.useMemo(() => {
    let totalPatients = 0;
    let appointmentsToday = 0;
    let totalAssociates = 0;
    let totalStaffs = 0;

    // 1. Patients count
    try {
      const patientsStr = localStorage.getItem('DENTAL_PATIENT_RECORDS_PRODUCTION_STORAGE');
      if (patientsStr) {
        const patients = JSON.parse(patientsStr);
        if (Array.isArray(patients)) {
          totalPatients = patients.filter((p: any) => !p.isArchived).length;
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Appointments today
    try {
      const apptsStr = localStorage.getItem('DENTAL_CLINIC_CALENDAR_APPOINTMENTS_PRODUCTION');
      const todayStr = '2026-06-28'; // Current local time is June 28, 2026 based on metadata
      const todayObj = new Date();
      const dynamicTodayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
      
      let appts = [];
      if (apptsStr) {
        appts = JSON.parse(apptsStr);
      } else {
        // Fallback or initial appointments
        appts = [];
      }
      
      if (Array.isArray(appts)) {
        appointmentsToday = appts.filter((a: any) => a.date === todayStr || a.date === dynamicTodayStr).length;
      }
    } catch (e) {
      console.error(e);
    }

    // 3. Users count
    try {
      const usersStr = localStorage.getItem('DENTAL_USERS');
      if (usersStr) {
        const usersList = JSON.parse(usersStr);
        if (Array.isArray(usersList)) {
          const clinicUsers = usersList.filter((u: any) => u.clinicId === user.clinicId);
          totalAssociates = clinicUsers.filter((u: any) => u.role === 'Associate Dentist').length;
          totalStaffs = clinicUsers.filter((u: any) => u.role === 'Staff Member').length;
        }
      }
    } catch (e) {
      console.error(e);
    }

    return {
      totalPatients,
      appointmentsToday,
      totalAssociates,
      totalStaffs
    };
  }, [user.clinicId]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col justify-between p-6 md:p-12 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md shadow-blue-500/10">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight">{clinicName}</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Multi-User Console</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-red-655 hover:bg-red-50/50 transition-all cursor-pointer border border-transparent hover:border-red-100"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Main Selector */}
      <div className="flex-1 flex flex-col justify-center items-center py-12 max-w-4xl w-full mx-auto">
        <div className="text-center max-w-md mx-auto mb-10 space-y-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider">
            Verified Account
          </span>
          <h2 className="text-2xl font-black text-slate-850 tracking-tight">
            Welcome back, <span className="text-blue-600">{user.name}</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            Logged in as <strong className="text-slate-600">{user.role}</strong>. Please select a workspace to manage records or clinical operations.
          </p>
        </div>

        {/* Cards Grid */}
        <div className={`grid gap-6 w-full ${
          isOwner ? 'grid-cols-1 md:grid-cols-3' : isAssociate ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-md'
        }`}>
          
          {/* Card 1: CLINIC (ALL ROLES) */}
          <button
            onClick={() => onSelectWorkspace('CLINIC')}
            className="group relative bg-white border border-slate-200 hover:border-blue-500 rounded-2xl p-7 text-left transition-all duration-300 shadow-sm hover:shadow-xl cursor-pointer flex flex-col justify-between min-h-[190px] overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-300 -z-0 opacity-40"></div>
            
            <div className="relative z-10 space-y-4">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl inline-block group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <Landmark className="w-6 h-6" />
              </div>
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-700 transition-colors">🏥 Clinic Workspace</h3>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Total Patients</span>
                    <span className="text-slate-900 font-extrabold text-sm">{stats.totalPatients}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Total Appointments Today</span>
                    <span className="text-slate-900 font-extrabold text-sm">{stats.appointmentsToday}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-1 text-[11px] font-bold text-blue-600 group-hover:text-blue-700 pt-4">
              <span>Launch Clinic Ledger</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card 2: ASSOCIATES (OWNER ONLY) */}
          {isOwner && (
            <button
              onClick={() => onSelectWorkspace('ASSOCIATES')}
              className="group relative bg-white border border-slate-200 hover:border-violet-500 rounded-2xl p-7 text-left transition-all duration-300 shadow-sm hover:shadow-xl cursor-pointer flex flex-col justify-between min-h-[190px] overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-300 -z-0 opacity-40"></div>
              
              <div className="relative z-10 space-y-4">
                <div className="bg-violet-50 text-violet-600 p-3 rounded-xl inline-block group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-violet-700 transition-colors">👨‍⚕️ Associates</h3>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-1">
                    <span>Total Associates</span>
                    <span className="text-slate-900 font-extrabold text-sm">{stats.totalAssociates}</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex items-center gap-1 text-[11px] font-bold text-violet-600 group-hover:text-violet-700 pt-4">
                <span>Manage Dentist Staff</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}

          {/* Card 3: STAFFS (OWNER & ASSOCIATE ONLY) */}
          {(isOwner || isAssociate) && (
            <button
              onClick={() => onSelectWorkspace('STAFFS')}
              className="group relative bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-7 text-left transition-all duration-300 shadow-sm hover:shadow-xl cursor-pointer flex flex-col justify-between min-h-[190px] overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-300 -z-0 opacity-40"></div>
              
              <div className="relative z-10 space-y-4">
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl inline-block group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">👥 Clinic Staffs</h3>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-1">
                    <span>Total Staff Members</span>
                    <span className="text-slate-900 font-extrabold text-sm">{stats.totalStaffs}</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex items-center gap-1 text-[11px] font-bold text-emerald-600 group-hover:text-emerald-700 pt-4">
                <span>Manage Clerical Staff</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="text-center max-w-md w-full mx-auto border-t border-slate-100 pt-4">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          © 2026 PNJ Tanarte Dental Clinic. Secured connection active.
        </p>
      </div>
    </div>
  );
}
