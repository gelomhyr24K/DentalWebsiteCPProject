import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Printer, Search, Download, Calendar, DollarSign, FileText, Check, X, Paperclip } from 'lucide-react';
import { loadActiveMasterDirectoryItems } from '../services/masterDirectoryService';

interface TreatmentRecordsModuleProps {
  patientData: any;
  setPatientData: (updater: any) => void;
  doctors: any[];
  saveToDatabase: () => Promise<void>;
}

export const TreatmentRecordsModule: React.FC<TreatmentRecordsModuleProps> = ({
  patientData,
  setPatientData,
  doctors,
  saveToDatabase
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [searchText, setSearchText] = useState('');

  // Form states for progress note
  const [linkedAppointmentId, setLinkedAppointmentId] = useState('');
  const [clinicalRemarks, setClinicalRemarks] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);

  // Itemized billing ledger
  const [ledgerItems, setLedgerItems] = useState([
    { procedure: '', quantity: 1, unitPrice: 0, discount: 0 }
  ]);
  const [checkoutPaidAmount, setCheckoutPaidAmount] = useState('0.00');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchMethods = async () => {
      const result = await loadActiveMasterDirectoryItems('payment_methods');
      if (isMounted) {
        if (result.ok && result.data.length > 0) {
          setPaymentMethods(result.data.map(item => item.name));
        } else {
          setPaymentMethods(['Cash', 'GCash', 'Card', 'Bank Transfer']);
        }
      }
    };
    void fetchMethods();
    return () => { isMounted = false; };
  }, []);

  const notesList = patientData.progressNotes || [];
  const attachmentsList = patientData.attachments || [];

  // Filter notes
  const filteredNotes = notesList.filter((note: any) =>
    (note.remarks || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (note.procedure || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const handleAddLedgerRow = () => {
    setLedgerItems([...ledgerItems, { procedure: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  };

  const handleRemoveLedgerRow = (idx: number) => {
    setLedgerItems(ledgerItems.filter((_, i) => i !== idx));
  };

  const handleLedgerChange = (idx: number, field: string, value: any) => {
    const updated = ledgerItems.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setLedgerItems(updated);
  };

  const calculateTotalCost = () => {
    return ledgerItems.reduce((sum, item) => {
      const lineCost = (item.quantity * item.unitPrice) - item.discount;
      return sum + (lineCost > 0 ? lineCost : 0);
    }, 0);
  };

  const handleOpenAddModal = () => {
    setEditingNote(null);
    setClinicalRemarks('');
    setLinkedAppointmentId('');
    setNoteDate(new Date().toISOString().split('T')[0]);
    setSelectedAttachmentIds([]);
    setLedgerItems([{ procedure: '', quantity: 1, unitPrice: 0, discount: 0 }]);
    setCheckoutPaidAmount('0.00');
    setPaymentMethod('Cash');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (note: any) => {
    setEditingNote(note);
    setClinicalRemarks(note.remarks || '');
    setLinkedAppointmentId(note.linkedAppointmentId || '');
    setNoteDate(note.date || new Date().toISOString().split('T')[0]);
    setSelectedAttachmentIds(note.attachmentIds || []);
    // Reconstruct ledger items if possible, otherwise map procedures
    if (note.ledgerItems) {
      setLedgerItems(note.ledgerItems);
    } else {
      setLedgerItems([{ procedure: note.procedure || '', quantity: 1, unitPrice: parseFloat(note.totalAmount) || 0, discount: 0 }]);
    }
    setCheckoutPaidAmount(note.paidAmount || '0.00');
    setPaymentMethod(note.paymentMethod || 'Cash');
    setShowAddModal(true);
  };

  const handleDeleteProgressNote = (id: string) => {
    setPatientData((prev: any) => ({
      ...prev,
      progressNotes: (prev.progressNotes || []).filter((n: any) => n.id !== id),
      treatmentRecords: (prev.treatmentRecords || []).filter((r: any) => r.progressNoteId !== id)
    }));
    setTimeout(() => saveToDatabase(), 50);
  };

  const handleSaveProgressNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicalRemarks.trim()) return;

    const computedTotalCost = calculateTotalCost();
    const paidVal = parseFloat(checkoutPaidAmount) || 0;
    const remainingBalance = computedTotalCost - paidVal;
    
    const createdNoteId = editingNote ? editingNote.id : ('NOTE-' + Math.random().toString(36).substring(2, 9));
    const invoiceNo = editingNote ? editingNote.invoiceNo : (`INV-${Date.now()}`);

    // 1. Create/Update progress note item
    const newProgressNote = {
      id: createdNoteId,
      date: noteDate,
      remarks: clinicalRemarks,
      procedure: ledgerItems.map(item => `${item.procedure} (x${item.quantity})`).join(', '),
      totalAmount: computedTotalCost.toFixed(2),
      paidAmount: paidVal.toFixed(2),
      balance: remainingBalance.toFixed(2),
      paymentMethod,
      invoiceNo,
      linkedAppointmentId,
      attachmentIds: selectedAttachmentIds,
      ledgerItems // preserve structure for editing
    };

    // 2. Compile into Bill (Treatment Record) to sync with ledger
    const newBill = {
      id: editingNote ? (patientData.treatmentRecords || []).find((r: any) => r.progressNoteId === editingNote.id)?.id || Math.random().toString(36).substring(2, 9) : Math.random().toString(36).substring(2, 9),
      date: noteDate,
      toothNumbers: '',
      procedure: ledgerItems.map(item => `${item.procedure} (x${item.quantity})`).join(', '),
      dentist: doctors[0]?.name || 'Dr. Maria Jessica Tanarte',
      amountCharged: computedTotalCost.toFixed(2),
      amountPaid: paidVal.toFixed(2),
      balance: remainingBalance.toFixed(2),
      paymentMethod: paymentMethod,
      invoiceNo,
      progressNoteId: createdNoteId,
      status: remainingBalance <= 0 ? 'Completed' : 'Ongoing'
    };

    // 3. Update patient data
    setPatientData((prev: any) => {
      // Auto-update linked appointment status to Completed
      const updatedAppointments = (prev.appointments || []).map((app: any) => {
        if (app.id === linkedAppointmentId) {
          return { ...app, status: 'Completed' };
        }
        return app;
      });

      const cleanNotes = (prev.progressNotes || []).filter((n: any) => n.id !== createdNoteId);
      const cleanBills = (prev.treatmentRecords || []).filter((r: any) => r.progressNoteId !== createdNoteId);

      return {
        ...prev,
        progressNotes: [...cleanNotes, newProgressNote],
        treatmentRecords: [...cleanBills, newBill],
        appointments: updatedAppointments
      };
    });

    // Close and clear
    setShowAddModal(false);
    setEditingNote(null);
    setClinicalRemarks('');
    setLinkedAppointmentId('');
    setLedgerItems([{ procedure: '', quantity: 1, unitPrice: 0, discount: 0 }]);
    setCheckoutPaidAmount('0.00');

    // Trigger persistence save
    setTimeout(() => saveToDatabase(), 50);
  };

  const toggleAttachmentSelection = (id: string) => {
    if (selectedAttachmentIds.includes(id)) {
      setSelectedAttachmentIds(selectedAttachmentIds.filter(aid => aid !== id));
    } else {
      setSelectedAttachmentIds([...selectedAttachmentIds, id]);
    }
  };

  // Export report CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Progress Note,Procedures,Invoice No,Net Cost,Paid Amount,Balance,Status\n';
    
    filteredNotes.forEach((n: any) => {
      const billed = parseFloat(n.totalAmount) || 0;
      const paid = parseFloat(n.paidAmount) || 0;
      const bal = billed - paid;
      const status = bal <= 0 ? 'Paid' : 'Unpaid';
      csvContent += `"${n.date}","${n.remarks.replace(/"/g, '""')}","${n.procedure}","${n.invoiceNo || 'N/A'}","â‚±${billed.toFixed(2)}","â‚±${paid.toFixed(2)}","â‚±${bal.toFixed(2)}","${status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Progress_Notes_${patientData.lastName || 'Patient'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintNote = (note: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Progress Note Invoice Receipt</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #18181b; }
            .header { text-align: center; margin-bottom: 20px; }
            .details { margin-bottom: 20px; }
            .line-item { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .total { border-t: 1px dashed #000; padding-top: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>P&J TANARTE DENTAL CLINIC</h3>
            <p>Clinical Progress Receipt</p>
          </div>
          <div class="details">
            <p>Date: ${note.date}</p>
            <p>Patient: ${patientData.lastName}, ${patientData.firstName}</p>
            <p>Invoice: ${note.invoiceNo}</p>
          </div>
          <hr/>
          <p><strong>Remarks:</strong></p>
          <p>${note.remarks}</p>
          <hr/>
          <p><strong>Billed Procedures:</strong></p>
          <p>${note.procedure}</p>
          <hr/>
          <div class="line-item">
            <span>Total Cost:</span>
            <span>â‚±${parseFloat(note.totalAmount).toFixed(2)}</span>
          </div>
          <div class="line-item">
            <span>Paid checkout:</span>
            <span>â‚±${parseFloat(note.paidAmount || 0).toFixed(2)}</span>
          </div>
          <div class="line-item total">
            <span>Remaining balance:</span>
            <span>â‚±${parseFloat(note.balance || 0).toFixed(2)}</span>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Search progress notes or remarks..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-zinc-200 bg-white rounded-xl text-xs placeholder-zinc-300 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="border border-zinc-200 text-zinc-600 hover:bg-zinc-50 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Download size={14} />
            <span>Export Report</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus size={14} />
            <span>New Progress Note</span>
          </button>
        </div>
      </div>

      {/* Chronological Progress Notes Table */}
      <div className="overflow-hidden border border-zinc-200 bg-white rounded-2xl shadow-sm">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200">
            <tr>
              <th className="px-4 py-3">DATE</th>
              <th className="px-4 py-3">PROGRESS NOTE & CLINICAL REMARKS</th>
              <th className="px-4 py-3">ATTACHMENTS</th>
              <th className="px-4 py-3">NET TREATMENT COST</th>
              <th className="px-4 py-3">STATUS</th>
              <th className="px-4 py-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
            {filteredNotes.map((note: any) => {
              const billed = parseFloat(note.totalAmount) || 0;
              const paid = parseFloat(note.paidAmount) || 0;
              const debt = parseFloat(note.balance) || (billed - paid);
              const isPaid = debt <= 0;

              return (
                <tr key={note.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-4 font-mono text-zinc-800 font-bold whitespace-nowrap">{note.date}</td>
                  <td className="px-4 py-4 font-sans text-zinc-800 leading-relaxed max-w-sm whitespace-pre-wrap">
                    <div>{note.remarks}</div>
                    <div className="text-[10px] text-zinc-400 mt-1 font-mono">{note.procedure}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(note.attachmentIds || []).map((aid: string) => {
                        const file = attachmentsList.find((a: any) => a.id === aid);
                        if (!file) return null;
                        return (
                          <span key={aid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-600 text-[9px]">
                            <Paperclip size={10} />
                            <span className="truncate max-w-[80px]" title={file.title}>{file.title}</span>
                          </span>
                        );
                      })}
                      {(note.attachmentIds || []).length === 0 && <span className="text-zinc-400 italic">None</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono font-bold text-zinc-900">â‚±{billed.toFixed(2)}</td>
                  <td className="px-4 py-4 font-sans">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right space-x-1.5 font-sans whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEditModal(note)}
                      className="p-1 hover:bg-zinc-100 rounded text-zinc-600"
                      title="Edit Progress Note"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handlePrintNote(note)}
                      className="p-1 hover:bg-zinc-100 rounded text-zinc-600"
                      title="Print Details / Receipt"
                    >
                      <Printer size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteProgressNote(note.id)}
                      className="p-1 hover:bg-zinc-100 rounded text-red-600"
                      title="Delete Progress Note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredNotes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-400 italic font-medium">
                  No chronological progress notes found. Create a new progress note to log patient clinical history.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* modal note creator add / edit */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm px-4">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-zinc-100 rounded-full text-zinc-400"
            >
              <X size={16} />
            </button>
            <h3 className="text-sm font-bold font-display text-zinc-900 mb-1 uppercase flex items-center gap-2">
              <FileText size={18} className="text-teal-600" />
              <span>{editingNote ? 'Edit Clinical Progress Note' : 'Create New Clinical Progress Note'}</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mb-4">Enter operation notes, link scheduled appointment, and sync billing ledger records.</p>
            
            <form onSubmit={handleSaveProgressNote} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Visit Date</label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={e => setNoteDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none font-medium text-zinc-700 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Link Active Appointment</label>
                  <select
                    value={linkedAppointmentId}
                    onChange={e => setLinkedAppointmentId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none font-medium text-zinc-700 focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">Select Scheduled Appointment...</option>
                    {(patientData.appointments || [])
                      .filter((app: any) => app.status !== 'Completed' || app.id === linkedAppointmentId)
                      .map((app: any) => (
                        <option key={app.id} value={app.id}>
                          {app.date} â€” {app.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Clinical Remarks & Operation Notes</label>
                <textarea
                  required
                  rows={4}
                  value={clinicalRemarks}
                  onChange={e => setClinicalRemarks(e.target.value)}
                  placeholder="Record treatment procedures executed, status of oral hygiene, medication updates..."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-500 font-sans"
                />
              </div>

              {/* Attachments Selector */}
              <div className="bg-zinc-50 p-4 rounded-xl space-y-2 border border-zinc-200/40">
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase">Attach Diagnostic Files / X-Rays</label>
                <div className="grid grid-cols-2 gap-2 max-h-[100px] overflow-y-auto pr-2 mt-1">
                  {attachmentsList.map((a: any) => {
                    const isSelected = selectedAttachmentIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAttachmentSelection(a.id)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                          isSelected 
                            ? 'bg-teal-50 border-teal-200 text-teal-700 font-bold' 
                            : 'bg-white border-zinc-200 text-zinc-600'
                        }`}
                      >
                        <span className="truncate max-w-[120px]">{a.title}</span>
                        {isSelected && <Check size={12} />}
                      </button>
                    );
                  })}
                  {attachmentsList.length === 0 && (
                    <span className="text-zinc-400 italic text-[11px] col-span-2">No files uploaded yet in the Media Library.</span>
                  )}
                </div>
              </div>

              {/* Billing ledger array form */}
              <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <h4 className="font-bold text-zinc-700 uppercase tracking-wider text-[10px]">Itemized Visit Ledger</h4>
                  <button
                    type="button"
                    onClick={handleAddLedgerRow}
                    className="text-[10px] bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold px-2 py-1 rounded-[6px]"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {ledgerItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <input
                          type="text"
                          required
                          placeholder="Procedure name..."
                          value={item.procedure}
                          onChange={e => handleLedgerChange(idx, 'procedure', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg outline-none bg-white focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={e => handleLedgerChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg outline-none bg-white focus:ring-1 focus:ring-teal-500 font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          required
                          min="0"
                          placeholder="Price"
                          value={item.unitPrice || ''}
                          onChange={e => handleLedgerChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg outline-none bg-white focus:ring-1 focus:ring-teal-500 font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Disc"
                          value={item.discount || ''}
                          onChange={e => handleLedgerChange(idx, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg outline-none bg-white focus:ring-1 focus:ring-teal-500 font-mono"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLedgerRow(idx)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded-full"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between border-t border-zinc-200 pt-3 text-xs font-bold text-zinc-700 font-mono">
                  <span>Computed Total Cost:</span>
                  <span className="text-sm font-bold text-zinc-950">â‚±{calculateTotalCost().toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout sync */}
              <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Checkout Payment (â‚±)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={checkoutPaidAmount}
                    onChange={e => setCheckoutPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-white outline-none font-mono text-xs focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-white outline-none font-medium text-zinc-75 focus:ring-1 focus:ring-teal-500"
                  >
                    {paymentMethods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-zinc-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
                >
                  Save Progress Note
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

