import React from 'react';
import { DentalHistory } from '../../../types';
import { DENTAL_HABITS_LIST } from '../../../constants/medicalConditions';
import { Smile, ArrowLeft, Check, Sparkles } from 'lucide-react';

interface DentalHistoryFormProps {
  data: DentalHistory;
  onChange: (updates: Partial<DentalHistory>) => void;
  onSave: () => void;
  onPrev: () => void;
  isSubmitting?: boolean;
}

export default function DentalHistoryForm({ 
  data, 
  onChange, 
  onSave, 
  onPrev,
  isSubmitting = false 
}: DentalHistoryFormProps) {

  const handleHabitChange = (habit: string, checked: boolean) => {
    let updatedHabits = [...data.habits];
    if (checked) {
      if (!updatedHabits.includes(habit)) {
        updatedHabits.push(habit);
      }
    } else {
      updatedHabits = updatedHabits.filter(h => h !== habit);
    }
    onChange({ habits: updatedHabits });
  };

  const selectAllHabits = () => {
    onChange({ habits: [...DENTAL_HABITS_LIST] });
  };

  const clearAllHabits = () => {
    onChange({ habits: [] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <form id="dental-history-form" onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 md:p-8 shadow-xs space-y-6">
        
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2 font-display tracking-tight">
            <span className="p-1.5 bg-zinc-100 text-zinc-800 rounded-lg">
              <Smile className="w-5 h-5" />
            </span>
            Dental History & Habits
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Please provide information about past dental sessions, teeth habits, and daily food diet.</p>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          <div>
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
              Reason for Check-up
            </label>
            <input
              type="text"
              id="reason-for-checkup"
              value={data.reasonForCheckup}
              onChange={(e) => onChange({ reasonForCheckup: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
              Last Dental Visit
            </label>
            <input
              type="text"
              id="last-dental-visit"
              value={data.lastVisit}
              onChange={(e) => onChange({ lastVisit: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
              Previous Bad Dental Experience (if any)
            </label>
            <textarea
              id="bad-dental-experience"
              rows={2}
              value={data.badDentalExperience}
              onChange={(e) => onChange({ badDentalExperience: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
              Brushing Difficulties (e.g., bleeding, sensitivity)
            </label>
            <input
              type="text"
              id="brushing-difficulties"
              value={data.brushingDifficulties}
              onChange={(e) => onChange({ brushingDifficulties: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
              Fluorides Received (Childhood or Treatment)
            </label>
            <input
              type="text"
              id="fluorides-received"
              value={data.fluoridesReceived}
              onChange={(e) => onChange({ fluoridesReceived: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
              Patient's Diet / Sugar Intake Summary
            </label>
            <textarea
              id="patient-diet"
              rows={2}
              value={data.patientsDiet}
              onChange={(e) => onChange({ patientsDiet: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

        </div>

        {/* DENTAL HABITS CHECKBOX SECTION */}
        <div className="pt-4 border-t border-zinc-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-955 uppercase tracking-wider flex items-center gap-2">
                Dental Habits
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Please check any recurring oral habits.</p>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                id="select-all-habits"
                onClick={selectAllHabits}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl hover:bg-zinc-100 hover:text-zinc-900 transition-all cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                id="clear-all-habits"
                onClick={clearAllHabits}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl hover:bg-zinc-100 hover:text-zinc-900 transition-all cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Habits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
            {DENTAL_HABITS_LIST.map((habit) => {
              const isChecked = data.habits.includes(habit);
              return (
                <label
                  key={habit}
                  className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
                    isChecked
                      ? 'bg-zinc-900 border-zinc-900 text-white font-semibold shadow-xs'
                      : 'bg-white border-zinc-200/60 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleHabitChange(habit, e.target.checked)}
                    className={`mt-0.5 rounded-sm focus:ring-1 w-4 h-4 ${
                      isChecked ? 'accent-zinc-100 text-zinc-950 focus:ring-zinc-950' : 'accent-zinc-900 text-zinc-900 focus:ring-zinc-100'
                    }`}
                  />
                  <span className="text-xs leading-relaxed capitalize">{habit}</span>
                </label>
              );
            })}
          </div>
        </div>

      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          id="dental-prev-btn"
          onClick={onPrev}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold px-5 py-3 rounded-xl transition-all cursor-pointer duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Previous: Medical History
        </button>
        
        <button
          type="submit"
          id="dental-save-btn"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer duration-150"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving Record...
            </span>
          ) : (
            <>
              <Check className="w-5 h-5 stroke-[3px]" /> Save Dental Record
            </>
          )}
        </button>
      </div>
    </form>
  );
}
