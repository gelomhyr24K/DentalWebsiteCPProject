import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit2, Check, AlertTriangle, Info, Sparkles, 
  Sliders, Save, X, Layers, ShieldAlert 
} from 'lucide-react';
import { TreatmentRule, RuleServiceItem } from '../../types';
import { clinicStorage } from '../../lib/indexedDBStorage';
const localStorage = clinicStorage;

interface TreatmentRulesManagerProps {
  onRulesChange?: (rules: TreatmentRule[]) => void;
  inlineMode?: boolean; // If rendered inside other tabs
}

export const PRELOADED_RULES: TreatmentRule[] = [
  {
    id: 'rule-1',
    findingName: 'Cavity',
    remarks: 'Standard carious lesion interventions',
    services: [
      { serviceId: 'srv-3', priority: 1, condition: 'Small lesion only, shallow' },
      { serviceId: 'srv-8', priority: 2, condition: 'Moderate cavity, deep dentin involvement' },
      { serviceId: 'srv-12', priority: 3, condition: 'Severe decay, non-restorable tooth' }
    ]
  },
  {
    id: 'rule-2',
    findingName: 'Missing Due to Caries',
    remarks: 'Rehabilitation options for missing teeth',
    services: [
      { serviceId: 'srv-32', priority: 1, condition: 'Single or multiple missing teeth, removable' }
    ]
  },
  {
    id: 'rule-3',
    findingName: 'Impacted Tooth',
    remarks: 'Surgical options for impacted/unerupted teeth',
    services: [
      { serviceId: 'srv-25', priority: 1, condition: 'Surgical extraction, bone removal' },
      { serviceId: 'srv-14', priority: 2, condition: 'Upper wisdom tooth extraction' }
    ]
  }
];

export default function TreatmentRulesManager({ onRulesChange, inlineMode = false }: TreatmentRulesManagerProps) {
  const [rules, setRules] = useState<TreatmentRule[]>(() => {
    const stored = localStorage.getItem('DENTAL_TREATMENT_RULES_MASTER');
    return stored ? JSON.parse(stored) : PRELOADED_RULES;
  });

  const [services, setServices] = useState<any[]>(() => {
    const stored = localStorage.getItem('DENTAL_SERVICES_MASTER');
    return stored ? JSON.parse(stored) : [];
  });

  const [toothStatuses, setToothStatuses] = useState<any[]>(() => {
    const stored = localStorage.getItem('DENTAL_TOOTH_STATUSES_MASTER');
    return stored ? JSON.parse(stored) : [];
  });

  const [toothConditions, setToothConditions] = useState<any[]>(() => {
    const stored = localStorage.getItem('DENTAL_TOOTH_CONDITIONS_MASTER');
    return stored ? JSON.parse(stored) : [];
  });

  // State for active form/modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TreatmentRule | null>(null);

  // Form Fields
  const [findingName, setFindingName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [ruleServices, setRuleServices] = useState<RuleServiceItem[]>([]);

  // Sub-form for adding service items to rule
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<number>(1);
  const [serviceCondition, setServiceCondition] = useState('');

  // Toast inside rules manager
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const saveRulesToStorage = (updatedRules: TreatmentRule[]) => {
    setRules(updatedRules);
    localStorage.setItem('DENTAL_TREATMENT_RULES_MASTER', JSON.stringify(updatedRules));
    if (onRulesChange) {
      onRulesChange(updatedRules);
    }
  };

  // Open modal for add or edit
  const handleOpenModal = (rule: TreatmentRule | null = null) => {
    // Refresh services and statuses from localStorage first
    const storedServices = localStorage.getItem('DENTAL_SERVICES_MASTER');
    if (storedServices) setServices(JSON.parse(storedServices));
    const storedStatuses = localStorage.getItem('DENTAL_TOOTH_STATUSES_MASTER');
    if (storedStatuses) setToothStatuses(JSON.parse(storedStatuses));
    const storedConditions = localStorage.getItem('DENTAL_TOOTH_CONDITIONS_MASTER');
    if (storedConditions) setToothConditions(JSON.parse(storedConditions));

    if (rule) {
      setEditingRule(rule);
      setFindingName(rule.findingName);
      setRemarks(rule.remarks || '');
      setRuleServices([...rule.services]);
    } else {
      setEditingRule(null);
      setFindingName('');
      setRemarks('');
      setRuleServices([]);
    }
    setSelectedServiceId('');
    setSelectedPriority(1);
    setServiceCondition('');
    setIsModalOpen(true);
  };

  // Add service item to the active rule being created/edited
  const handleAddServiceToRule = () => {
    if (!selectedServiceId) {
      showToast('Please select a clinic service to map.', 'error');
      return;
    }

    if (ruleServices.some(item => item.serviceId === selectedServiceId)) {
      showToast('This service is already mapped to this finding.', 'error');
      return;
    }

    const newItem: RuleServiceItem = {
      serviceId: selectedServiceId,
      priority: selectedPriority,
      condition: serviceCondition.trim()
    };

    setRuleServices([...ruleServices, newItem].sort((a, b) => a.priority - b.priority));
    setSelectedServiceId('');
    setSelectedPriority(1);
    setServiceCondition('');
  };

  // Remove mapped service from rule
  const handleRemoveServiceFromRule = (index: number) => {
    setRuleServices(prev => prev.filter((_, i) => i !== index));
  };

  // Save the full rule to state and localStorage
  const handleSaveRule = () => {
    if (!findingName.trim()) {
      showToast('Please specify a finding name (e.g. Cavity).', 'error');
      return;
    }

    if (ruleServices.length === 0) {
      showToast('Please map at least one service to this finding.', 'error');
      return;
    }

    let updated: TreatmentRule[];
    if (editingRule) {
      updated = rules.map(r => r.id === editingRule.id 
        ? { ...r, findingName: findingName.trim(), remarks: remarks.trim(), services: ruleServices }
        : r
      );
      showToast('Treatment rule updated successfully!');
    } else {
      const newRule: TreatmentRule = {
        id: `rule-${Date.now()}`,
        findingName: findingName.trim(),
        remarks: remarks.trim(),
        services: ruleServices
      };
      updated = [...rules, newRule];
      showToast('New treatment rule added successfully!');
    }

    saveRulesToStorage(updated);
    setIsModalOpen(false);
  };

  const handleDeleteRule = (id: string) => {
    if (window.confirm('Are you sure you want to delete this treatment rule?')) {
      const updated = rules.filter(r => r.id !== id);
      saveRulesToStorage(updated);
      showToast('Treatment rule deleted successfully.');
    }
  };

  // List of pre-configured finding options to help the user auto-complete
  const availableFindingOptions = Array.from(new Set([
    'Cavity',
    'OK / Pasta',
    'Missing Due to Caries',
    'Missing Due to Other Cause',
    'Impacted Tooth',
    'Supernumerary Tooth',
    'Root Fragment',
    'Unerupted Tooth',
    'Pulpless Tooth',
    'Decayed (Caries Indicated for Filling)',
    'Root Canal Treatment',
    ...toothStatuses.map(s => s.name),
    ...toothConditions.map(c => c.name)
  ].filter(Boolean)));

  return (
    <div className={`space-y-6 ${inlineMode ? '' : 'bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs'}`}>
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-150 pb-4">
        <div>
          <h2 className="text-base font-black text-zinc-800 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4.5 h-4.5 text-zinc-500" />
            Treatment Rules Engine
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Map specific dental findings directly to configurable clinic services to power the Smart Clinical Decision Support & Quotation Engine.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal(null)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3px]" /> Create Mapped Rule
        </button>
      </div>

      {/* RULES LISTING */}
      {rules.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
          <Sliders className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-zinc-700">No Mapped Treatment Rules</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
            Configure rules to automatically generate customized patient treatment options and estimated costs based on Odontogram findings.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-zinc-150 rounded-2xl bg-white shadow-3xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-150 text-zinc-400 font-extrabold uppercase tracking-widest text-[10px]">
                <th className="px-5 py-3">Dental Finding</th>
                <th className="px-5 py-3">Remarks</th>
                <th className="px-5 py-3">Mapped Services & Priorities</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-4 font-bold text-zinc-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-400" />
                    {rule.findingName}
                  </td>
                  <td className="px-5 py-4 text-zinc-500 font-medium italic">
                    {rule.remarks || '—'}
                  </td>
                  <td className="px-5 py-4 space-y-1.5">
                    {rule.services.map((item, idx) => {
                      const srv = services.find(s => s.id === item.serviceId);
                      return (
                        <div key={idx} className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            item.priority === 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            item.priority === 2 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {item.priority === 1 ? 'Conservative' : 
                             item.priority === 2 ? 'Standard' : 'Comprehensive'}
                          </span>
                          <span className="font-bold text-zinc-700">
                            {srv ? srv.name : `Service ID: ${item.serviceId}`}
                          </span>
                          {srv && srv.defaultAmount > 0 && (
                            <span className="font-mono text-zinc-400 text-[10px]">
                              (₱{srv.defaultAmount.toLocaleString()})
                            </span>
                          )}
                          {item.condition && (
                            <span className="text-zinc-400 italic text-[11px] font-medium bg-zinc-50 px-1.5 py-0.2 rounded border border-zinc-100">
                              {item.condition}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(rule)}
                        className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Rule"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-zinc-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-zinc-900 text-white rounded-xl shadow-xs">
                  <Sliders className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">
                    {editingRule ? 'Edit Mapped Rule' : 'Create Mapped Rule'}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                    Configure clinical findings and link them to corresponding services.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Finding Picker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Dental Finding (Status/Condition)</label>
                  <div className="relative">
                    <input
                      type="text"
                      list="finding-choices"
                      value={findingName}
                      onChange={(e) => setFindingName(e.target.value)}
                      placeholder="e.g. Cavity, Impacted Tooth"
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-zinc-800 focus:border-zinc-800 outline-hidden transition-all shadow-3xs"
                    />
                    <datalist id="finding-choices">
                      {availableFindingOptions.map(choice => (
                        <option key={choice} value={choice} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Remarks / Notes</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Brief description of the finding or rule context"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-zinc-800 focus:border-zinc-800 outline-hidden transition-all shadow-3xs"
                  />
                </div>
              </div>

              {/* Mapped Services Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Currently Mapped Services</span>
                
                {ruleServices.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-zinc-150 rounded-xl bg-zinc-50/50 text-[11px] font-bold text-zinc-400">
                    No services mapped yet. Use the tool below to add mapped options.
                  </div>
                ) : (
                  <div className="border border-zinc-150 rounded-xl overflow-hidden shadow-3xs bg-white">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-50/80 border-b border-zinc-150 text-[9px] font-black uppercase text-zinc-400 tracking-wider">
                          <th className="px-4 py-2">Priority Level</th>
                          <th className="px-4 py-2">Service Name</th>
                          <th className="px-4 py-2">Price</th>
                          <th className="px-4 py-2">Condition Limit / Context</th>
                          <th className="px-4 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                        {ruleServices.map((item, idx) => {
                          const srv = services.find(s => s.id === item.serviceId);
                          return (
                            <tr key={idx} className="hover:bg-zinc-50/45">
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                  item.priority === 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  item.priority === 2 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                  'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                }`}>
                                  {item.priority === 1 ? 'Conservative (1)' : 
                                   item.priority === 2 ? 'Standard (2)' : 'Comprehensive (3)'}
                                </span>
                              </td>
                              <td className="px-4 py-2 font-bold text-zinc-900">{srv?.name || `Service: ${item.serviceId}`}</td>
                              <td className="px-4 py-2 font-mono text-zinc-500">₱{srv ? srv.defaultAmount.toLocaleString() : '0'}</td>
                              <td className="px-4 py-2 italic font-medium text-zinc-500">{item.condition || '—'}</td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveServiceFromRule(idx)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remove Service"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add Service Section */}
              <div className="bg-zinc-50 border border-zinc-150 p-4.5 rounded-2xl space-y-3.5">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-zinc-400 stroke-[3px]" /> Map New Service Option
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Select Clinic Service</label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full px-2.5 py-1.8 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-zinc-800 focus:border-zinc-800 outline-hidden transition-all shadow-3xs"
                    >
                      <option value="">-- Choose Service --</option>
                      {services.map(srv => (
                        <option key={srv.id} value={srv.id}>
                          {srv.name} (₱{srv.defaultAmount.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Priority Rank</label>
                    <select
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(Number(e.target.value))}
                      className="w-full px-2.5 py-1.8 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-zinc-800 focus:border-zinc-800 outline-hidden transition-all shadow-3xs"
                    >
                      <option value={1}>1 - Conservative (Lowest Cost / Least Invasive)</option>
                      <option value={2}>2 - Standard (Balanced Approach)</option>
                      <option value={3}>3 - Comprehensive (Highest Cost / Complete Care)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Specific Condition Context</label>
                    <input
                      type="text"
                      value={serviceCondition}
                      onChange={(e) => setServiceCondition(e.target.value)}
                      placeholder="e.g. Small lesion, if pulp is healthy"
                      className="w-full px-2.5 py-1.8 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-zinc-800 focus:border-zinc-800 outline-hidden transition-all shadow-3xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddServiceToRule}
                    className="px-3.5 py-1.8 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-all shadow-3xs cursor-pointer flex items-center gap-1.5"
                  >
                    Add Service Option
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-150 bg-zinc-50 flex items-center justify-between">
              <div className="flex items-center text-[10px] font-semibold text-zinc-400 gap-1.5">
                <Info className="w-3.5 h-3.5 text-zinc-300" />
                Rules prioritize treatment planning choices for the dentist.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRule}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save Rule Mappings
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Dynamic notifications popup */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold text-white animate-in fade-in slide-in-from-bottom-5 duration-200 ${
          toast.type === 'success' ? 'bg-zinc-900 border-zinc-800' : 'bg-red-600 border-red-500'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4 text-emerald-400 stroke-[3px]" /> : <AlertTriangle className="w-4 h-4 text-red-200" />}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
