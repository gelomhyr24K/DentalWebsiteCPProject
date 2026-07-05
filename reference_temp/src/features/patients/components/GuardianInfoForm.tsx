import React from 'react';
import { GuardianInfo } from '../../../types';
import { Users, ShieldAlert, ArrowLeft, ArrowRight, HeartPulse } from 'lucide-react';

interface GuardianInfoFormProps {
  data: GuardianInfo;
  isUnderage: boolean;
  patientAge: number | null;
  onChange: (updates: Partial<GuardianInfo>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function GuardianInfoForm({ 
  data, 
  isUnderage, 
  patientAge, 
  onChange, 
  onNext, 
  onPrev 
}: GuardianInfoFormProps) {

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form id="guardian-info-form" onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 md:p-8 shadow-xs space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4.5 border-b border-zinc-100">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2 font-display tracking-tight">
              <span className="p-1.5 bg-zinc-100 text-zinc-800 rounded-lg">
                <Users className="w-5 h-5" />
              </span>
              Parent, Guardian & Physician Details
            </h2>
            <p className="text-sm text-zinc-500 mt-1">Please fill in emergency contact, parent, and professional medical information.</p>
          </div>
          
          {/* Underage Notice Badge */}
          {patientAge !== null && (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${
              isUnderage 
                ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {isUnderage ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span>Minor (Age: {patientAge}) — Guardian Info Required</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Adult Patient (Age: {patientAge}) — Fields Optional</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Warning Alert if minor */}
        {isUnderage && (
          <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-4 text-sm text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              Guardian Authorization Required
            </p>
            <p className="text-xs text-amber-700">
              As the patient is under 18 years of age, pediatric guidelines require designated parent or guardian information and signatures before clinical dental procedures can be administered.
            </p>
          </div>
        )}

        {/* SECTION 1: Father's Information */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-zinc-900 border-l-2 border-zinc-900 pl-2 uppercase tracking-wider">
            Father's Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">FATHER'S FULL NAME</label>
              <input
                type="text"
                id="father-name"
                value={data.fathersName}
                onChange={(e) => onChange({ fathersName: e.target.value })}
                required={isUnderage && !data.guardiansName && !data.mothersName}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">OCCUPATION</label>
              <input
                type="text"
                id="father-occupation"
                value={data.fathersOccupation}
                onChange={(e) => onChange({ fathersOccupation: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">EMPLOYER</label>
              <input
                type="text"
                id="father-employer"
                value={data.fathersEmployer}
                onChange={(e) => onChange({ fathersEmployer: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">CONTACT NUMBER</label>
              <input
                type="tel"
                id="father-contact"
                value={data.fathersContact}
                onChange={(e) => onChange({ fathersContact: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Mother's Information */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <h3 className="text-xs font-bold text-zinc-900 border-l-2 border-zinc-900 pl-2 uppercase tracking-wider">
            Mother's Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">MOTHER'S MAIDEN NAME</label>
              <input
                type="text"
                id="mother-name"
                value={data.mothersName}
                onChange={(e) => onChange({ mothersName: e.target.value })}
                required={isUnderage && !data.guardiansName && !data.fathersName}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">OCCUPATION</label>
              <input
                type="text"
                id="mother-occupation"
                value={data.mothersOccupation}
                onChange={(e) => onChange({ mothersOccupation: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">EMPLOYER</label>
              <input
                type="text"
                id="mother-employer"
                value={data.mothersEmployer}
                onChange={(e) => onChange({ mothersEmployer: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">CONTACT NUMBER</label>
              <input
                type="tel"
                id="mother-contact"
                value={data.mothersContact}
                onChange={(e) => onChange({ mothersContact: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Legal Guardian (if different) */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <h3 className="text-xs font-bold text-zinc-900 border-l-2 border-zinc-900 pl-2 uppercase tracking-wider">
            Designated Legal Guardian
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">GUARDIAN'S FULL NAME</label>
              <input
                type="text"
                id="guardian-name"
                value={data.guardiansName}
                onChange={(e) => onChange({ guardiansName: e.target.value })}
                required={isUnderage && !data.fathersName && !data.mothersName}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">GUARDIAN'S CONTACT NUMBER</label>
              <input
                type="tel"
                id="guardian-contact"
                value={data.guardiansContact}
                onChange={(e) => onChange({ guardiansContact: e.target.value })}
                required={isUnderage && !!data.guardiansName}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Personal Physician */}
        <div className="space-y-4 pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-1.5">
            <HeartPulse className="w-4.5 h-4.5 text-zinc-900" />
            <h3 className="text-xs font-bold text-zinc-900 border-l-2 border-zinc-900 pl-2 uppercase tracking-wider">
              Personal Physician Info
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">PHYSICIAN NAME</label>
              <input
                type="text"
                id="physician-name"
                value={data.physicianName}
                onChange={(e) => onChange({ physicianName: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">PHYSICIAN CONTACT NUMBER</label>
              <input
                type="tel"
                id="physician-contact"
                value={data.physicianContact}
                onChange={(e) => onChange({ physicianContact: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          id="guardian-prev-btn"
          onClick={onPrev}
          className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold px-5 py-3 rounded-xl transition-all cursor-pointer duration-150 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Previous: Personal Info
        </button>
        
        <button
          type="submit"
          id="guardian-next-btn"
          className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer duration-150"
        >
          Next: Medical History <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
