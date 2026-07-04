import React, { useState, useEffect } from 'react';
import { Sparkles, Check, ChevronRight } from 'lucide-react';

interface SmartSupportProps {
  patientData: any;
  setPatientData: (updater: any) => void;
  doctors: any[];
}

export const SmartSupportModule: React.FC<SmartSupportProps> = ({
  patientData,
  setPatientData,
  doctors
}) => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate recommendations locally based on allergies/conditions and age
  const generateRecommendations = () => {
    const list: any[] = [];
    const allergies = patientData.allergies || {};
    const bdate = patientData.birthDate;
    
    // Age check
    if (bdate) {
      const birth = new Date(bdate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      if (age < 18) {
        list.push({
          id: 'rec-pediatric',
          title: 'Pediatric Prophylaxis & Sealants',
          recommendation: 'Recommend pediatric fluoride therapy and dental sealants for permanent molars.',
          justification: `Patient is minor (${age} years old) in developmental dentition stage. Preventive sealants prevent pit caries.`,
          actionLabel: 'Schedule Sealants Prophylaxis'
        });
      } else {
        list.push({
          id: 'rec-crown',
          title: 'Routine Adult Periodontal Status Assessment',
          recommendation: 'Perform full periodontal charting and screen for early adult onset periodontitis.',
          justification: `Adult patient (${age} years old). Annual PSR screening is standard protocol.`,
          actionLabel: 'Add Periodontal Evaluation'
        });
      }
    }

    // Allergies check
    if (allergies.penicillin) {
      list.push({
        id: 'rec-allergy-pen',
        title: 'Safety alert: Alternative Prophylaxis Protocol',
        recommendation: 'Avoid Penicillin derivatives. Use Clindamycin (600mg) or Azithromycin (500mg) for endocarditis prophylaxis if surgery is scheduled.',
        justification: 'Patient has a registered allergy to Penicillin.',
        actionLabel: 'Apply Rx Guidelines'
      });
    }

    // Custom condition alerts
    if (patientData.questions?.bleedingHistory || patientData.questions?.heartTrouble) {
      list.push({
        id: 'rec-bleeding',
        title: 'Hemostasis Precautions & Medical Clearance',
        recommendation: 'Obtain medical clearance from physician. Monitor bleeding times; apply local hemostatic agents (Gelfoam, sutures) post-extraction.',
        justification: 'Patient answered positive to Bleeding History or Heart Troubles questionnaire.',
        actionLabel: 'Flag Bleeding Risk'
      });
    }

    setRecommendations(list);
  };

  useEffect(() => {
    generateRecommendations();
  }, [patientData]);

  const handleAddRecommendationToPlan = (rec: any) => {
    // Add to treatmentRecords
    const newRecord = {
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString().split('T')[0],
      toothNumbers: '',
      procedure: rec.title,
      dentist: doctors[0]?.name || '',
      amountCharged: '0.00',
      amountPaid: '0.00',
      balance: '0.00'
    };

    setPatientData((prev: any) => ({
      ...prev,
      treatmentRecords: [...(prev.treatmentRecords || []), newRecord]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 font-display">Clinical Recommendation Engine</h3>
            <p className="text-xs text-zinc-500">Automated diagnostic pathways parsed from demographic histories and allergy profiles.</p>
          </div>
        </div>

        <div className="space-y-4">
          {recommendations.length > 0 ? (
            recommendations.map(rec => (
              <div key={rec.id} className="bg-white border border-zinc-200/60 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-zinc-800 text-sm">{rec.title}</h4>
                    <p className="text-xs text-zinc-600 mt-1">{rec.recommendation}</p>
                  </div>
                  <button
                    onClick={() => handleAddRecommendationToPlan(rec)}
                    className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all shadow-sm"
                  >
                    <span>Add to Plan</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="text-[11px] bg-zinc-50 px-3 py-2 rounded-lg text-zinc-500 font-medium border border-zinc-100">
                  <span className="font-semibold text-zinc-600 uppercase">Justification:</span> {rec.justification}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-zinc-100 p-6 text-center text-zinc-400 text-sm italic">
              No recommendations active for this profile.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
