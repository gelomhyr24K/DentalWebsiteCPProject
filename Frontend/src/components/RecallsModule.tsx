import React, { useState } from 'react';
import { Clock, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

interface RecallsProps {
  patientData: any;
  setPatientData: (updater: any) => void;
}

export const RecallsModule: React.FC<RecallsProps> = ({
  patientData,
  setPatientData
}) => {
  const [timeframe, setTimeframe] = useState('6 Months');
  const [logNotes, setLogNotes] = useState('');
  const [logStatus, setLogStatus] = useState('SMS Dispatched');

  const recalls = patientData.recalls || [];

  const handleAddRecall = (e: React.FormEvent) => {
    e.preventDefault();
    const months = timeframe === '3 Months' ? 3 : timeframe === '6 Months' ? 6 : 12;
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + months);

    const newRecall = {
      id: Math.random().toString(36).substring(2, 9),
      dateCreated: new Date().toISOString().split('T')[0],
      targetDate: targetDate.toISOString().split('T')[0],
      timeframe,
      status: logStatus,
      notes: logNotes || 'Routine recall log entry.'
    };

    setPatientData((prev: any) => ({
      ...prev,
      recalls: [...(prev.recalls || []), newRecall]
    }));

    setLogNotes('');
  };

  const handleDeleteRecall = (id: string) => {
    setPatientData((prev: any) => ({
      ...prev,
      recalls: prev.recalls.filter((r: any) => r.id !== id)
    }));
  };

  const handleStatusUpdate = (id: string, nextStatus: string) => {
    setPatientData((prev: any) => ({
      ...prev,
      recalls: prev.recalls.map((r: any) => r.id === id ? { ...r, status: nextStatus } : r)
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-zinc-900 font-display">Routine Recalls & Prophylaxis Monitoring</h3>
        <p className="text-xs text-zinc-500">Track routine dental check-up recall cycles, contact channels, and scheduling pipelines.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Scheduler Action Card */}
        <div className="md:col-span-1">
          <form onSubmit={handleAddRecall} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-bold text-zinc-800 text-sm font-display uppercase mb-2">Schedule Next Recall</h4>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Timeframe Period</label>
              <select
                value={timeframe}
                onChange={e => setTimeframe(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-teal-500 font-medium text-zinc-700"
              >
                <option value="3 Months">3 Months (Post-Ortho Clean)</option>
                <option value="6 Months">6 Months (Standard Prophylaxis)</option>
                <option value="1 Year">1 Year (Comprehensive Exam)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Action Out-reach Status</label>
              <select
                value={logStatus}
                onChange={e => setLogStatus(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-teal-500 font-medium text-zinc-700"
              >
                <option value="SMS Dispatched">SMS Dispatched</option>
                <option value="Called - No Answer">Called - No Answer</option>
                <option value="Scheduled">Scheduled Appointment</option>
                <option value="Pending Outreach">Pending Outreach</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Outreach Remarks</label>
              <textarea
                value={logNotes}
                onChange={e => setLogNotes(e.target.value)}
                placeholder="Log notes (e.g., patient requests weekend booking)..."
                rows={3}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <Plus size={14} />
              <span>Log Follow-Up Recall</span>
            </button>
          </form>
        </div>

        {/* Recalls Pipeline History */}
        <div className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <h4 className="font-bold text-zinc-800 text-sm font-display mb-4 uppercase">Routine Tracking Pipeline</h4>
          <div className="overflow-hidden border border-zinc-150 rounded-xl">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold">
                <tr>
                  <th className="px-4 py-3">TARGET DATE</th>
                  <th className="px-4 py-3">CYCLE</th>
                  <th className="px-4 py-3">LOG NOTE</th>
                  <th className="px-4 py-3">STATUS</th>
                  <th className="px-4 py-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {recalls.map((rec: any) => {
                  const isExpired = new Date(rec.targetDate) < new Date() && rec.status !== 'Scheduled';
                  
                  return (
                    <tr key={rec.id} className={`hover:bg-zinc-50 transition-colors ${isExpired ? 'bg-rose-50/30' : ''}`}>
                      <td className={`px-4 py-4 font-mono font-bold ${isExpired ? 'text-rose-600' : 'text-zinc-800'}`}>
                        <div className="flex items-center gap-1.5">
                          {isExpired && <AlertCircle size={12} className="text-rose-500 animate-bounce" />}
                          <span>{rec.targetDate}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-sans text-zinc-500">{rec.timeframe}</td>
                      <td className="px-4 py-4 text-zinc-600 max-w-[180px] truncate" title={rec.notes}>{rec.notes}</td>
                      <td className="px-4 py-4">
                        <select
                          value={rec.status}
                          onChange={e => handleStatusUpdate(rec.id, e.target.value)}
                          className="bg-transparent font-semibold focus:outline-none border-b border-dashed border-zinc-300 hover:border-zinc-500 cursor-pointer"
                        >
                          <option value="SMS Dispatched">SMS Dispatched</option>
                          <option value="Called - No Answer">Called - No Answer</option>
                          <option value="Scheduled">Scheduled</option>
                          <option value="Pending Outreach">Pending</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleDeleteRecall(rec.id)}
                          className="text-zinc-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {recalls.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-400 italic">
                      No routine recall checks logged yet. Schedule a prophylaxis timeframe to begin tracking.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
