import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User, Phone, ShieldAlert, ArrowLeft, Landmark, Eye, EyeOff } from 'lucide-react';
import { ClinicUser, Clinic } from '../../types';

interface LoginScreenProps {
  onLoginSuccess: (user: ClinicUser, clinicName: string) => void;
  registeredUsers: ClinicUser[];
  onRegisterOwner: (newOwner: ClinicUser, clinic: Clinic) => void;
}

export default function LoginScreen({ onLoginSuccess, registeredUsers, onRegisterOwner }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regClinicName, setRegClinicName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const user = registeredUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password
    );

    if (!user) {
      setError('Invalid email address or password.');
      return;
    }

    if (user.status === 'Inactive') {
      setError('Your account is currently deactivated. Please contact your Clinic Owner.');
      return;
    }

    // Retrieve clinic name
    const clinics = JSON.parse(localStorage.getItem('DENTAL_CLINICS') || '[]');
    const userClinic = clinics.find((c: Clinic) => c.id === user.clinicId);
    const clinicName = userClinic ? userClinic.name : 'P&J Tanarte Dental Clinic';

    onLoginSuccess(user, clinicName);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!regName || !regEmail || !regPhone || !regClinicName || !regPassword || !regConfirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (registeredUsers.some(u => u.email.toLowerCase() === regEmail.toLowerCase())) {
      setError('This email address is already registered.');
      return;
    }

    const newClinicId = `clinic-${Date.now()}`;
    const newOwnerId = `user-owner-${Date.now()}`;

    const newClinic: Clinic = {
      id: newClinicId,
      name: regClinicName,
      phone: regPhone,
      address: 'Suite 101, Medical Plaza'
    };

    const newOwner: ClinicUser = {
      id: newOwnerId,
      clinicId: newClinicId,
      name: regName,
      email: regEmail,
      phone: regPhone,
      role: 'Clinic Owner',
      status: 'Active',
      passwordHash: regPassword,
      createdAt: new Date().toISOString()
    };

    onRegisterOwner(newOwner, newClinic);
    setIsRegistering(false);
    setEmail(regEmail);
    setPassword(regPassword);
    setInfoMessage('Clinic and Owner registered successfully! You can now log in.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-300">
        
        {/* Banner Logo Section */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-8 py-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 rounded-full bg-white/10 blur-lg"></div>
          
          <div className="relative flex items-center gap-3">
            <div className="bg-white/15 p-2.5 rounded-xl backdrop-blur-md border border-white/20 shadow-inner shrink-0">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-200 tracking-widest uppercase block">Clinic Ledger Secure</span>
              <h1 className="text-xl font-black tracking-tight">P&J Tanarte System</h1>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-500 animate-pulse" />
              <span>{infoMessage}</span>
            </div>
          )}

          {!isRegistering ? (
            /* LOGIN SCREEN */
            <form onSubmit={handleLogin} className="space-y-5" id="login-form">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-850 tracking-tight">Secure Portal</h2>
                <p className="text-xs text-slate-400 font-medium">Please enter your clinic staff credentials to gain access.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="email-input">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="pnjtanartedentalclinic@gmail.com"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="password-input">
                      Secure Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        alert('Password reset requested. Please ask the Clinic Owner to reset your password or write "pnjtanarte2020" to gain default access.');
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:underline hover:text-blue-700 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-semibold outline-none text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                id="login-btn"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-1.5"
              >
                Sign In Securely
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-400 font-semibold">
                  New clinic owner?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(true);
                      setError('');
                    }}
                    className="text-blue-600 hover:underline hover:text-blue-700 cursor-pointer font-bold"
                  >
                    Register Clinic & Owner
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* OWNER REGISTRATION SCREEN */
            <form onSubmit={handleRegister} className="space-y-4" id="register-form">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setError('');
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm font-bold text-slate-850 tracking-tight">Register New Clinic Owner</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Create a new independent clinic database.</p>
                </div>
              </div>

              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="reg-name">
                    Full Name (Owner)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input
                      id="reg-name"
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Maria Jessica David Tanarte"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none text-slate-800 focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="reg-clinic-name">
                    Dental Clinic Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <Landmark className="w-3.5 h-3.5" />
                    </span>
                    <input
                      id="reg-clinic-name"
                      type="text"
                      value={regClinicName}
                      onChange={(e) => setRegClinicName(e.target.value)}
                      placeholder="P&J Tanarte Dental Clinic"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none text-slate-800 focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="reg-email">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="pnjtanartedentalclinic@gmail.com"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none text-slate-800 focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="reg-phone">
                    Contact Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <Phone className="w-3.5 h-3.5" />
                    </span>
                    <input
                      id="reg-phone"
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="(02) 8123-4567"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none text-slate-800 focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="reg-password">
                      Password
                    </label>
                    <input
                      id="reg-password"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-slate-800 focus:bg-white focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" htmlFor="reg-confirm">
                      Confirm
                    </label>
                    <input
                      id="reg-confirm"
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none text-slate-800 focus:bg-white focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                Register & Initialize Owner
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
