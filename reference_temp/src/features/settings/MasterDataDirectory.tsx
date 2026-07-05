import React, { useState, useEffect } from 'react';
import { Sliders, Tag, FolderHeart, Plus, Trash2, Layers, BookOpen } from 'lucide-react';
import MasterRecord from './MasterRecord';
import TreatmentRulesManager from './TreatmentRulesManager';
import { clinicStorage } from '../../lib/indexedDBStorage';
const localStorage = clinicStorage;

interface MasterDataDirectoryProps {
  setToast: (toast: { message: string; type: 'success' | 'info' | 'error' } | null) => void;
}

export default function MasterDataDirectory({ setToast }: MasterDataDirectoryProps) {
  const [masterSubTab, setMasterSubTab] = useState<'services' | 'rules' | 'tags' | 'expenses'>('services');
  const [newTag, setNewTag] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState('');

  const [tags, setTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('DENTAL_TAGS');
    return saved ? JSON.parse(saved) : ['general', 'ortho', 'pedio', 'Yazaki', 'Liwayway', 'Lyceum'];
  });
  
  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('DENTAL_EXPENSE_CATEGORIES');
    return saved ? JSON.parse(saved) : ['Medical Supplies', 'Rent & Utilities', 'Salaries', 'Equipment Repair', 'Marketing', 'Office Supplies'];
  });

  useEffect(() => {
    localStorage.setItem('DENTAL_TAGS', JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    localStorage.setItem('DENTAL_EXPENSE_CATEGORIES', JSON.stringify(expenseCategories));
  }, [expenseCategories]);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col min-h-[750px]">
      
      {/* HEADER SECTION WITHOUT DUPLICATE GEAR ICON */}
      <div className="border-b border-zinc-200 px-6 py-4 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-black text-zinc-900 tracking-tight">Master Data Directory</h1>
          <p className="text-xs text-zinc-400 font-medium">Configure clinic business reference parameters, billing structures, and rule trees.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1">
        {/* LEFT SUB-NAVIGATION */}
        <div className="w-full lg:w-64 bg-zinc-50 border-r border-zinc-200 p-5 flex flex-col gap-1 shrink-0">
          <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Reference Data
          </div>

          <button
            onClick={() => setMasterSubTab('services')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              masterSubTab === 'services' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            Procedure Records
          </button>

          <button
            onClick={() => setMasterSubTab('rules')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              masterSubTab === 'rules' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            Smart Treatment Rules
          </button>

          <button
            onClick={() => setMasterSubTab('tags')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              masterSubTab === 'tags' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            Patient Tag Pools
          </button>

          <button
            onClick={() => setMasterSubTab('expenses')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              masterSubTab === 'expenses' ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <FolderHeart className="w-4 h-4 shrink-0" />
            Expense Categories
          </button>
        </div>

        {/* MAIN STAGE */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          {/* PROCEDURE MASTER RECORDS */}
          {masterSubTab === 'services' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h2 className="text-sm font-black text-zinc-800 uppercase tracking-wide mb-1">Procedure Master Records</h2>
                <p className="text-xs text-zinc-400 font-medium mb-4">View and configure diagnostic, preventative, and therapeutic dental procedures.</p>
              </div>
              <MasterRecord navbarSearchQuery="" />
            </div>
          )}

          {/* SMART TREATMENT RULES */}
          {masterSubTab === 'rules' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h2 className="text-sm font-black text-zinc-800 uppercase tracking-wide mb-1">Smart Treatment Rules</h2>
                <p className="text-xs text-zinc-400 font-medium mb-4">Establish treatment pathways and rule triggers based on patient profiles.</p>
              </div>
              <TreatmentRulesManager />
            </div>
          )}

          {/* PATIENT TAG POOLS */}
          {masterSubTab === 'tags' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-sm font-black text-zinc-800 uppercase tracking-wide mb-1">Patient Tag Pools</h2>
                <p className="text-xs text-zinc-400 font-medium">Define custom classification bubbles for patient profile categorization.</p>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-700 uppercase">Manage Active Tag Options</h3>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom tag bubble..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="flex-1 p-2.5 border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-teal-600 outline-none"
                  />
                  <button
                    onClick={() => {
                      if (newTag.trim() && !tags.includes(newTag.trim())) {
                        setTags([...tags, newTag.trim()]);
                        setNewTag('');
                        setToast({ message: 'New patient tag template created!', type: 'success' });
                      }
                    }}
                    className="bg-zinc-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-zinc-800 cursor-pointer"
                  >
                    Add Tag Bubble
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {tags.map((tag, idx) => (
                    <span key={`${tag}-${idx}-${Date.now()}`} className="bg-white text-zinc-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 border border-zinc-200 shadow-3xs">
                      {tag}
                      <button
                        onClick={() => {
                          setTags(tags.filter(t => t !== tag));
                          setToast({ message: 'Tag option removed.', type: 'info' });
                        }}
                        className="text-zinc-400 hover:text-zinc-750 text-[10px]"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* EXPENSE CATEGORIES */}
          {masterSubTab === 'expenses' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="text-sm font-black text-zinc-800 uppercase tracking-wide mb-1">Expense Categories</h2>
                <p className="text-xs text-zinc-400 font-medium">Configure classification tags for operational disbursement ledgers.</p>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-700 uppercase">Manage Expense Ledger Categories</h3>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Create general ledger expense category..."
                    value={newExpenseCat}
                    onChange={(e) => setNewExpenseCat(e.target.value)}
                    className="flex-1 p-2.5 border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-teal-600 outline-none"
                  />
                  <button
                    onClick={() => {
                      if (newExpenseCat.trim() && !expenseCategories.includes(newExpenseCat.trim())) {
                        setExpenseCategories([...expenseCategories, newExpenseCat.trim()]);
                        setNewExpenseCat('');
                        setToast({ message: 'Expense category added!', type: 'success' });
                      }
                    }}
                    className="bg-zinc-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-zinc-800 cursor-pointer"
                  >
                    Add Category
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                  {expenseCategories.map((cat, idx) => (
                    <div key={`${cat}-${idx}-${Date.now()}`} className="bg-white p-3 rounded-xl border border-zinc-200 flex items-center justify-between text-xs font-bold text-zinc-700">
                      {cat}
                      <button
                        onClick={() => {
                          setExpenseCategories(expenseCategories.filter(c => c !== cat));
                          setToast({ message: 'Category removed.', type: 'info' });
                        }}
                        className="text-zinc-400 hover:text-red-600 font-extrabold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
