import React, { useEffect, useState } from 'react';
import { CheckSquare, Plus, Trash2, CheckCircle } from 'lucide-react';

interface FollowupProps {
  patientData: any;
  setPatientData: (updater: any) => void;
}

export const FollowupModule: React.FC<FollowupProps> = ({
  patientData,
  setPatientData
}) => {
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [outreachLog, setOutreachLog] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const followups = patientData.followups || [];
  const itemsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(followups.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, followups.length);
  const paginatedFollowups = followups.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;

    const newItem = {
      id: Math.random().toString(36).substring(2, 9),
      dateCreated: new Date().toISOString().split('T')[0],
      task: newChecklistItem.trim(),
      checked: false,
      log: ''
    };

    setPatientData((prev: any) => ({
      ...prev,
      followups: [...(prev.followups || []), newItem]
    }));

    setNewChecklistItem('');
  };

  const handleToggleCheck = (id: string) => {
    setPatientData((prev: any) => ({
      ...prev,
      followups: prev.followups.map((f: any) => 
        f.id === id ? { ...f, checked: !f.checked } : f
      )
    }));
  };

  const handleLogChange = (id: string, logText: string) => {
    setPatientData((prev: any) => ({
      ...prev,
      followups: prev.followups.map((f: any) => 
        f.id === id ? { ...f, log: logText } : f
      )
    }));
  };

  const handleDeleteItem = (id: string) => {
    setPatientData((prev: any) => ({
      ...prev,
      followups: prev.followups.filter((f: any) => f.id !== id)
    }));
  };

  const checkedCount = followups.filter((f: any) => f.checked).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-zinc-900 font-display">Post-Procedure Outreach Follow Ups</h3>
        <p className="text-xs text-zinc-500">Post-surgical outreach checklist tracking and safety checks logs.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* outreach controller add */}
        <div className="md:col-span-1">
          <form onSubmit={handleAddChecklistItem} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-bold text-zinc-800 text-sm font-display uppercase mb-2">Add Checklist Item</h4>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Checklist Outreach task</label>
              <input
                type="text"
                value={newChecklistItem}
                onChange={e => setNewChecklistItem(e.target.value)}
                placeholder="e.g. Check bleeding 24h post-extraction"
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <Plus size={14} />
              <span>Add Checklist Duty</span>
            </button>
          </form>
        </div>

        {/* lists checks grid */}
        <div className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h4 className="font-bold text-zinc-800 text-sm font-display uppercase">Outreach Safety Checklists</h4>
            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold">
              Progress: {checkedCount}/{followups.length} Done
            </span>
          </div>

          <div className="space-y-4">
            {paginatedFollowups.map((item: any) => (
              <div key={item.id} className="border border-zinc-150 rounded-xl p-4 space-y-3 hover:shadow-sm transition-all bg-zinc-50/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleCheck(item.id)}
                      className={`w-5 h-5 rounded-[6px] flex items-center justify-center border transition-all ${
                        item.checked 
                          ? 'bg-teal-600 border-teal-600 text-white shadow-sm' 
                          : 'border-zinc-300 hover:border-zinc-400 bg-white'
                      }`}
                    >
                      {item.checked && <CheckCircle size={14} className="fill-current" />}
                    </button>
                    <div>
                      <span className={`text-xs font-bold ${item.checked ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                        {item.task}
                      </span>
                      <span className="block text-[9px] text-zinc-400 font-mono mt-0.5">Created: {item.dateCreated}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-zinc-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Outreach Log Remarks</label>
                  <input
                    type="text"
                    value={item.log || ''}
                    onChange={e => handleLogChange(item.id, e.target.value)}
                    placeholder="Outreach details (e.g. Spoke to guardian, swelling reduced)..."
                    className="w-full bg-white px-3 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-teal-500 font-medium text-zinc-700"
                  />
                </div>
              </div>
            ))}
            {followups.length === 0 && (
              <div className="py-12 text-center text-zinc-400 italic text-xs">
                No surgical check logs initialized yet. Create checklists to log patient recovery details.
              </div>
            )}
          </div>
          {followups.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[10px] font-semibold text-zinc-500">
                Showing {startIndex + 1}-{endIndex} of {followups.length} follow-up items
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                >
                  &lt; Prev
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${page === safeCurrentPage ? 'bg-teal-600 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                >
                  Next &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
