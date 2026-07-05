import React, { useState } from 'react';
import { MedicalHistory } from '../../../types';
import { MEDICAL_CONDITIONS_LIST } from '../../../constants/medicalConditions';
import { FileText, ArrowLeft, ArrowRight, Activity, Search, AlertCircle, Sparkles } from 'lucide-react';

interface MedicalHistoryFormProps {
  data: MedicalHistory;
  onChange: (updates: Partial<MedicalHistory>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const CONDITION_CATEGORIES = [
  {
    name: "Cardiovascular (Heart & Blood)",
    conditions: [
      "High Blood Pressure",
      "Low Blood Pressure",
      "Heart Surgery",
      "Heart Attack",
      "Heart Disease",
      "Heart Murmur",
      "Rheumatic Fever",
      "Stroke",
      "Chest Pain",
      "Angina"
    ]
  },
  {
    name: "Respiratory / Lungs",
    conditions: [
      "Respiratory Problems",
      "Tuberculosis",
      "Asthma",
      "Emphysema"
    ]
  },
  {
    name: "Endocrine & Metabolic",
    conditions: [
      "Diabetes",
      "Thyroid Problem",
      "Gout or Swollen Ankles"
    ]
  },
  {
    name: "Neurological & Psychiatric",
    conditions: [
      "Epilepsy or Convulsion",
      "Fainting Seizures",
      "Head Injuries"
    ]
  },
  {
    name: "Infectious Diseases",
    conditions: [
      "AIDS or HIV Infection",
      "Sexually Transmitted Disease",
      "Hepatitis or Liver Disease"
    ]
  },
  {
    name: "Immunology, Oncology & Blood",
    conditions: [
      "Allergies",
      "Cancer or Tumors",
      "Radiation Therapy",
      "Anemia",
      "Bleeding Problems"
    ]
  },
  {
    name: "Gastrointestinal & Renal",
    conditions: [
      "Stomach Troubles or Ulcers",
      "Kidney Disease"
    ]
  },
  {
    name: "Musculoskeletal & Others",
    conditions: [
      "Joint Replacement or Implant",
      "Arthritis or Rheumatism",
      "Rapid Weight Loss"
    ]
  }
];

export default function MedicalHistoryForm({ data, onChange, onNext, onPrev }: MedicalHistoryFormProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleConditionChange = (condition: string, checked: boolean) => {
    let updatedConditions = [...data.conditions];
    if (checked) {
      if (!updatedConditions.includes(condition)) {
        updatedConditions.push(condition);
      }
    } else {
      updatedConditions = updatedConditions.filter(c => c !== condition);
    }
    onChange({ conditions: updatedConditions });
  };

  const toggleAllCommon = () => {
    const common = ["High Blood Pressure", "Asthma", "Allergies", "Diabetes"];
    const allSelected = common.every(c => data.conditions.includes(c));
    let updated = [...data.conditions];
    
    if (allSelected) {
      // remove common
      updated = updated.filter(c => !common.includes(c));
    } else {
      // add missing common
      common.forEach(c => {
        if (!updated.includes(c)) updated.push(c);
      });
    }
    onChange({ conditions: updated });
  };

  const clearAllConditions = () => {
    onChange({ conditions: [] });
  };

  // Filter conditions inside each category for search
  const filteredCategories = CONDITION_CATEGORIES.map(category => {
    const matched = category.conditions.filter(c =>
      c.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return {
      ...category,
      conditions: matched
    };
  }).filter(cat => cat.conditions.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form id="medical-history-form" onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 md:p-8 shadow-xs space-y-6">
        
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2 font-display tracking-tight">
            <span className="p-1.5 bg-zinc-100 text-zinc-800 rounded-lg">
              <Activity className="w-5 h-5" />
            </span>
            Medical History & Health Alert
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Please record any existing systemic conditions, medication alerts, or previous hospitalizations.</p>
        </div>

        {/* MEDICAL ALERT HIGHLIGHT FIELD */}
        <div className="bg-red-50/40 border border-red-200/60 rounded-2xl p-5 space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-red-900 uppercase tracking-wider">
            <AlertCircle className="w-4.5 h-4.5 text-red-600 animate-pulse" />
            CRITICAL MEDICAL ALERT / CONTRAINDICATIONS
          </label>
          <p className="text-xs text-red-700">
            Write any critical conditions, high-risk drug interactions, or anesthetic reactions here (e.g., "ALLERGIC TO PENICILLIN", "TAKING COUMADIN / BLOOD THINNERS").
          </p>
          <textarea
            id="medical-alert-textarea"
            rows={2}
            value={data.medicalAlert}
            onChange={(e) => onChange({ medicalAlert: e.target.value })}
            className="w-full rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-100 outline-hidden transition-all text-red-900 font-semibold"
          />
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          
          <div>
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
              Previous Hospitalizations
            </label>
            <textarea
              id="previous-hospitalizations"
              rows={2}
              value={data.previousHospitalizations}
              onChange={(e) => onChange({ previousHospitalizations: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
              Current Prescribed Medications
            </label>
            <textarea
              id="prescribed-medications"
              rows={2}
              value={data.prescribedMedications}
              onChange={(e) => onChange({ prescribedMedications: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
              Allergies to Medications
            </label>
            <textarea
              id="allergies-medications"
              rows={2}
              value={data.allergiesToMedications}
              onChange={(e) => onChange({ allergiesToMedications: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
              Family Medication Problems / Hereditary Issues
            </label>
            <textarea
              id="family-medication-problems"
              rows={2}
              value={data.familyMedicationProblems}
              onChange={(e) => onChange({ familyMedicationProblems: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1.5">
              Other Medical Concerns / Notes
            </label>
            <input
              type="text"
              id="other-medical-concerns"
              value={data.otherMedicalConcerns}
              onChange={(e) => onChange({ otherMedicalConcerns: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all duration-150 bg-white"
            />
          </div>

        </div>

        {/* MEDICAL CONDITIONS SELECTION SECTION */}
        <div className="pt-4 border-t border-zinc-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
                Systemic Medical Conditions
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Check all conditions that apply to the patient's past or present medical history.</p>
            </div>

            {/* Quick selectors */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                id="toggle-common-conditions"
                onClick={toggleAllCommon}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl hover:bg-zinc-100 hover:text-zinc-900 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-zinc-700" /> Toggle Common
              </button>
              <button
                type="button"
                id="clear-all-conditions"
                onClick={clearAllConditions}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl hover:bg-zinc-100 hover:text-zinc-900 transition-all cursor-pointer"
              >
                Clear All ({data.conditions.length})
              </button>
            </div>
          </div>

          {/* Search bar for conditions */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="w-4 h-4 text-zinc-400" />
            </span>
            <input
              type="text"
              id="search-conditions-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 pl-9 pr-4 py-2.5 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 outline-hidden transition-all bg-white"
            />
          </div>

          {/* Categorized Layout */}
          <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
            {filteredCategories.map((category) => (
              <div key={category.name} className="space-y-2.5">
                <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-100 pb-1 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                  {category.name}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {category.conditions.map((condition) => {
                    const isChecked = data.conditions.includes(condition);
                    return (
                      <label
                        key={condition}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                          isChecked
                            ? 'bg-zinc-900 border-zinc-900 text-white font-semibold shadow-xs'
                            : 'bg-white border-zinc-200/60 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleConditionChange(condition, e.target.checked)}
                          className={`mt-0.5 rounded-sm focus:ring-1 w-4 h-4 ${
                            isChecked ? 'accent-zinc-100 text-zinc-950 focus:ring-zinc-950' : 'accent-zinc-900 text-zinc-900 focus:ring-zinc-100'
                          }`}
                        />
                        <span className="text-xs leading-normal">{condition}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {filteredCategories.length === 0 && (
              <div className="py-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                <p className="text-sm text-zinc-400 font-medium">No medical conditions matching current search filter</p>
                <button
                  type="button"
                  id="reset-search-btn"
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-zinc-900 hover:underline mt-1.5 font-semibold cursor-pointer"
                >
                  Show all conditions
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          id="medical-prev-btn"
          onClick={onPrev}
          className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold px-5 py-3 rounded-xl transition-all cursor-pointer duration-150 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Previous: Guardian Details
        </button>
        
        <button
          type="submit"
          id="medical-next-btn"
          className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer duration-150"
        >
          Next: Dental Habits <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
