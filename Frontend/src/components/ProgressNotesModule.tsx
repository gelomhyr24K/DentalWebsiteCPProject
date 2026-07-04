import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Download,
  Plus,
  X,
  Paperclip,
  Trash2,
  Upload,
  MoreVertical,
  CheckSquare,
  Copy,
  Printer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ServiceRow {
  id: string;
  procedure: string;
  teeth: string;
  unitPrice: number;
  discount: number;
}

interface ProgressNote {
  id: string;
  date: string;
  visitTime: string;
  recallDate: string;
  recallTime: string;
  recallReason: string;
  remarks: string;
  procedure: string;
  services: ServiceRow[];
  totalCost: number;
  totalDiscount: number;
  netCost: number;
  attachmentIds: string[];
  signature: string;
  status: string;
  dentistOnDuty: string;
  linkedBillId: string;
}

interface ProgressNotesModuleProps {
  patientData: any;
  setPatientData: (updater: any) => void;
  doctors: any[];
  saveToDatabase: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatCurrency = (n: number): string =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDisplayDate = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDisplayTime = (t: string): string => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
};

const todayISO = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const nowTime = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const statusBadge = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'paid' || s === 'completed' || s === 'saved')
    return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
  if (s === 'unpaid') return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-zinc-100 text-zinc-500 border border-zinc-200';
};

const statusLabel = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return 'Saved';
  return status;
};

const RECALL_REASONS = [
  'Orthodontic Adjustment',
  'Post-Extraction Review',
  'Root Canal Follow-up',
  'General Checkup',
  'Crown/Bridge Adjustment',
  'Periodontal Maintenance',
  'Other',
];

const ITEMS_PER_PAGE = 5;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ProgressNotesModule: React.FC<ProgressNotesModuleProps> = ({
  patientData,
  setPatientData,
  doctors,
  saveToDatabase,
}) => {
  /* ---- state ---- */
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeActionNote, setActiveActionNote] = useState<ProgressNote | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // form state
  const [visitDate, setVisitDate] = useState(todayISO());
  const [visitTime, setVisitTime] = useState(nowTime());
  const [recallDate, setRecallDate] = useState('');
  const [recallTime, setRecallTime] = useState('');
  const [recallReason, setRecallReason] = useState('');
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([]);
  const [clinicalRemarks, setClinicalRemarks] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');

  // canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sigFileRef = useRef<HTMLInputElement | null>(null);

  /* ---- derived data ---- */
  const notes: ProgressNote[] = patientData?.progressNotes || [];

  const filtered = notes.filter((n: ProgressNote) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (n.remarks || '').toLowerCase().includes(q) ||
      (n.procedure || '').toLowerCase().includes(q) ||
      (n.date || '').toLowerCase().includes(q) ||
      (n.status || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
  const paginatedNotes = filtered.slice(startIndex, endIndex);

  const totalCostCalc = serviceRows.reduce((s, r) => s + (Number(r.unitPrice) || 0), 0);
  const totalDiscountCalc = serviceRows.reduce((s, r) => s + (Number(r.discount) || 0), 0);
  const netCostCalc = totalCostCalc - totalDiscountCalc;

  /* ---- service rows ---- */
  const addServiceRow = () => {
    setServiceRows((prev) => [
      ...prev,
      { id: `SVC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, procedure: '', teeth: '', unitPrice: 0, discount: 0 },
    ]);
  };

  const updateServiceRow = (id: string, field: keyof ServiceRow, value: string | number) => {
    setServiceRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const removeServiceRow = (id: string) => {
    setServiceRows((prev) => prev.filter((r) => r.id !== id));
  };

  /* ---- signature canvas ---- */
  const getCanvasCtx = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return null;
    return cvs.getContext('2d');
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const cvs = canvasRef.current!;
    const rect = cvs.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = getCanvasCtx();
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    if (isDrawing.current && canvasRef.current) {
      setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
    }
    isDrawing.current = false;
    lastPos.current = null;
  };

  const clearSignature = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, cvs.width, cvs.height);
    setSignatureDataUrl('');
  };

  const handleSigUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setSignatureDataUrl(url);
      const cvs = canvasRef.current;
      if (cvs) {
        const ctx = cvs.getContext('2d');
        if (ctx) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
          };
          img.src = url;
        }
      }
    };
    reader.readAsDataURL(file);
  };

  /* ---- resize canvas on mount ---- */
  useEffect(() => {
    if (modalOpen && canvasRef.current) {
      const cvs = canvasRef.current;
      const parent = cvs.parentElement;
      if (parent) {
        cvs.width = parent.clientWidth;
        cvs.height = 128;
      }
    }
  }, [modalOpen]);

  /* ---- reset form ---- */
  const resetForm = () => {
    setVisitDate(todayISO());
    setVisitTime(nowTime());
    setRecallDate('');
    setRecallTime('');
    setRecallReason('');
    setServiceRows([]);
    setClinicalRemarks('');
    setSignatureDataUrl('');
    setEditingNoteId(null);
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  /* ---- populate form for editing ---- */
  const openEditModal = (note: ProgressNote) => {
    setEditingNoteId(note.id);
    setVisitDate(note.date || todayISO());
    setVisitTime(note.visitTime || nowTime());
    setRecallDate(note.recallDate || '');
    setRecallTime(note.recallTime || '');
    setRecallReason(note.recallReason || '');
    setServiceRows(
      (note.services || []).map((s) => ({ ...s })),
    );
    setClinicalRemarks(note.remarks || '');
    setSignatureDataUrl(note.signature || '');
    setModalOpen(true);
  };

  /* ---- duplicate note ---- */
  const duplicateNote = (note: ProgressNote) => {
    const ts = Date.now();
    const clone: ProgressNote = {
      ...note,
      id: `NOTE-${ts}`,
      services: (note.services || []).map((s) => ({ ...s, id: `SVC-${ts}-${Math.random().toString(36).slice(2, 6)}` })),
      linkedBillId: '',
      status: 'Draft',
    };
    setPatientData((prev: any) => ({
      ...prev,
      progressNotes: [...(prev.progressNotes || []), clone],
    }));
    setTimeout(() => saveToDatabase(), 50);
  };

  /* ---- delete note ---- */
  const deleteNote = (noteId: string) => {
    setPatientData((prev: any) => ({
      ...prev,
      progressNotes: (prev.progressNotes || []).filter((n: ProgressNote) => n.id !== noteId),
    }));
    setTimeout(() => saveToDatabase(), 50);
  };

  /* ---- print note ---- */
  const printNote = (note: ProgressNote) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Progress Note - ${note.id}</title>
      <style>body{font-family:sans-serif;padding:40px;color:#333}
      h1{font-size:18px;margin-bottom:8px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}
      th{background:#f5f5f5;font-weight:600;text-transform:uppercase;font-size:11px}
      .meta{font-size:13px;color:#555;margin-bottom:4px}
      </style></head><body>
      <h1>Clinical Progress Note</h1>
      <p class="meta"><strong>Date:</strong> ${formatDisplayDate(note.date)} ${formatDisplayTime(note.visitTime)}</p>
      <p class="meta"><strong>Procedure:</strong> ${note.procedure || '—'}</p>
      <p class="meta"><strong>Remarks:</strong> ${note.remarks || '—'}</p>
      <p class="meta"><strong>Status:</strong> ${note.status}</p>
      <table><thead><tr><th>Service</th><th>Teeth</th><th>Unit Price</th><th>Discount</th><th>Net</th></tr></thead><tbody>
      ${(note.services || []).map((s) => `<tr><td>${s.procedure}</td><td>${s.teeth}</td><td>₱${(Number(s.unitPrice) || 0).toFixed(2)}</td><td>₱${(Number(s.discount) || 0).toFixed(2)}</td><td>₱${((Number(s.unitPrice) || 0) - (Number(s.discount) || 0)).toFixed(2)}</td></tr>`).join('')}
      </tbody></table>
      <p style="margin-top:16px;font-weight:bold">Net Cost: ₱${(note.netCost ?? 0).toFixed(2)}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  /* ---- save ---- */
  const handleSave = (draft: boolean) => {
    const ts = Date.now();
    const noteId = editingNoteId || `NOTE-${ts}`;
    const billId = `BILL-${ts}`;

    const noteObj: ProgressNote = {
      id: noteId,
      date: visitDate,
      visitTime,
      recallDate,
      recallTime,
      recallReason,
      remarks: clinicalRemarks,
      procedure: serviceRows.map((s) => s.procedure).filter(Boolean).join(', '),
      services: serviceRows,
      totalCost: totalCostCalc,
      totalDiscount: totalDiscountCalc,
      netCost: netCostCalc,
      attachmentIds: [],
      signature: signatureDataUrl,
      status: draft ? 'Draft' : 'Completed',
      dentistOnDuty: doctors[0]?.name || 'Dr. Maria Jessica Tanarte',
      linkedBillId: draft ? '' : billId,
    };

    setPatientData((prev: any) => {
      const updated = { ...prev };

      if (editingNoteId) {
        // update existing
        updated.progressNotes = (updated.progressNotes || []).map((n: ProgressNote) =>
          n.id === editingNoteId ? noteObj : n,
        );
      } else {
        updated.progressNotes = [...(updated.progressNotes || []), noteObj];
      }

      if (!draft && !editingNoteId) {
        // bill
        const payable = totalCostCalc - totalDiscountCalc;
        const billObj = {
          id: billId,
          date: visitDate,
          items: serviceRows.map((s) => ({
            procedure: s.procedure,
            detail: '',
            qty: 1,
            baseAmount: Number(s.unitPrice) || 0,
            discount: Number(s.discount) || 0,
            lineTotal: (Number(s.unitPrice) || 0) - (Number(s.discount) || 0),
          })),
          services: serviceRows.map((s) => s.procedure).filter(Boolean).join(', '),
          createdBy: doctors[0]?.name || 'Dr. Maria Jessica Tanarte',
          totalCost: totalCostCalc,
          discount: totalDiscountCalc,
          payable,
          paidAmount: 0,
          balance: payable,
          remarks: '',
          signature: '',
          status: 'Unpaid',
          linkedProgressNoteId: noteId,
          source: 'progress_note',
        };
        updated.bills = [...(updated.bills || []), billObj];

        // recall appointment
        if (recallDate) {
          const apptObj = {
            id: `APPT-${ts}`,
            date: recallDate,
            time: recallTime,
            title: recallReason || 'Recall Visit',
            details: `Auto-generated recall from progress note ${noteId}`,
            status: 'Scheduled',
            type: 'Recall',
          };
          updated.appointments = [...(updated.appointments || []), apptObj];
        }
      }

      return updated;
    });

    setTimeout(() => {
      saveToDatabase();
    }, 50);

    setModalOpen(false);
    resetForm();
  };

  /* ---- CSV export ---- */
  const handleExportCSV = () => {
    const headers = ['Date', 'Visit Time', 'Procedure', 'Remarks', 'Total Cost', 'Discount', 'Net Cost', 'Status', 'Dentist'];
    const rows = notes.map((n: ProgressNote) => [
      n.date,
      n.visitTime,
      `"${(n.procedure || '').replace(/"/g, '""')}"`,
      `"${(n.remarks || '').replace(/"/g, '""')}"`,
      n.totalCost,
      n.totalDiscount,
      n.netCost,
      n.status,
      `"${(n.dentistOnDuty || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress_notes_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---- refresh ---- */
  const handleRefresh = () => setRefreshKey((k) => k + 1);

  /* ---- pagination helpers ---- */
  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  const pageButtons = () => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  };

  /* ---- extract teeth badges from services ---- */
  const getTeethBadges = (note: ProgressNote): string[] => {
    const teeth: string[] = [];
    (note.services || []).forEach((s) => {
      if (s.teeth) {
        s.teeth.split(',').forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) teeth.push(trimmed);
        });
      }
    });
    return teeth;
  };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-5" key={refreshKey}>
      {/* ============================================================ */}
      {/* SECTION 1 – HEADER TOOLBAR                                    */}
      {/* ============================================================ */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-3 shadow-sm">
        {/* left */}
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-teal-600" />
          <h2 className="font-display font-bold text-zinc-900 text-base">Clinical Progress Notes</h2>
        </div>

        {/* center – search */}
        <div className="relative w-full max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search Treatment Plans..."
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
        </div>

        {/* right – actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
          >
            <RefreshCw size={14} />
            Refresh Data
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
          >
            <Download size={14} />
            Export Report
          </button>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700"
          >
            <Plus size={14} />
            New Progress Note
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 2 – TABLE                                             */}
      {/* ============================================================ */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white min-h-[800px] flex flex-col">
        <div className="flex-grow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">Date</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">Progress Note &amp; Clinical Remarks</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">Attachments</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-zinc-500">Net Treatment Cost</th>
                <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-zinc-500">Status</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedNotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={32} className="text-zinc-400" />
                      <p className="italic text-zinc-400">No progress notes logged yet</p>
                      <p className="text-xs text-zinc-400">
                        Click &lsquo;+ New Progress Note&rsquo; above to register clinical visits and billing plans.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedNotes.map((note: ProgressNote, index: number) => {
                  const teethBadges = getTeethBadges(note);
                  return (
                    <tr key={note.id} className="transition hover:bg-zinc-50">
                      {/* DATE */}
                      <td className="whitespace-nowrap px-5 py-3">
                        <p className="font-mono font-bold text-zinc-800">{formatDisplayDate(note.date)}</p>
                        {note.visitTime && (
                          <p className="mt-0.5 text-xs text-zinc-400">{formatDisplayTime(note.visitTime)}</p>
                        )}
                      </td>

                      {/* REMARKS */}
                      <td className="px-5 py-3">
                        {note.procedure && (
                          <p className="font-sans font-bold text-zinc-800">{note.procedure}</p>
                        )}
                        <p className="mt-0.5 text-sm italic text-zinc-400">
                          {note.remarks || 'No notes documented.'}
                        </p>
                        {teethBadges.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {teethBadges.map((tooth, i) => (
                              <span
                                key={i}
                                className="inline-block rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600"
                              >
                                {tooth} □
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* ATTACHMENTS */}
                      <td className="px-5 py-3">
                        {note.attachmentIds && note.attachmentIds.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                            <Paperclip size={12} />
                            {note.attachmentIds.length}
                          </span>
                        ) : (
                          <span className="italic text-zinc-400 text-xs">None</span>
                        )}
                      </td>

                      {/* NET COST */}
                      <td className="whitespace-nowrap px-5 py-3 text-right font-mono font-bold text-zinc-900">
                        {formatCurrency(note.netCost ?? 0)}
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${statusBadge(note.status)}`}
                        >
                          {statusLabel(note.status)}
                        </span>
                      </td>

                      {/* THREE-DOT MENU */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => setActiveActionNote(note)}
                          className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ---- PAGINATION ---- */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-3">
            <p className="text-xs text-zinc-500">
              Showing {startIndex + 1}–{endIndex} of {filtered.length} progress notes
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              {pageButtons().map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`min-w-[28px] rounded-lg px-2 py-1.5 text-xs font-semibold transition ${p === safePage
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SECTION 3 – MODAL                                             */}
      {/* ============================================================ */}
      {modalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-[80vw] flex-col rounded-2xl bg-white shadow-2xl">
            {/* ---- modal header ---- */}
            <div className="flex items-start justify-between border-b border-zinc-200 px-6 pt-6 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold uppercase text-zinc-900">
                  {editingNoteId ? 'Edit Clinical Progress Note' : 'New Clinical Progress Note & Treatment Plan'}
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Complete the patient progress notes, treatments, teeth, remarks, and signature.
                </p>
              </div>
              <button
                onClick={() => { setModalOpen(false); resetForm(); }}
                className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* ---- scrollable body ---- */}
            <div className="flex-1 overflow-y-auto px-6 py-5" style={{ maxHeight: '75vh' }}>
              <div className="space-y-8">
                {/* ===== 1. GENERAL VISIT ===== */}
                <section>
                  <div className="mb-4 border-b-2 border-teal-500 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                      1. General Visit &amp; Recall Information
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* patient name */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Patient Name</label>
                      <input
                        type="text"
                        readOnly
                        value={`${patientData?.lastName || ''}, ${patientData?.firstName || ''}`}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-700"
                      />
                    </div>
                    {/* visit date + time */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Visit Date</label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={visitDate}
                          onChange={(e) => setVisitDate(e.target.value)}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                        />
                        <input
                          type="time"
                          value={visitTime}
                          onChange={(e) => setVisitTime(e.target.value)}
                          className="w-28 shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                        />
                      </div>
                      {visitDate && visitTime && (
                        <p className="mt-1 text-[10px] text-zinc-400">
                          {formatDisplayDate(visitDate)} • {formatDisplayTime(visitTime)}
                        </p>
                      )}
                    </div>
                    {/* recall date + time */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Recall Date</label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={recallDate}
                          onChange={(e) => setRecallDate(e.target.value)}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                        />
                        <input
                          type="time"
                          value={recallTime}
                          onChange={(e) => setRecallTime(e.target.value)}
                          className="w-28 shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                        />
                      </div>
                      {recallDate && recallTime && (
                        <p className="mt-1 text-[10px] text-zinc-400">
                          {formatDisplayDate(recallDate)} • {formatDisplayTime(recallTime)}
                        </p>
                      )}
                    </div>
                    {/* recall reason */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Recall Reason</label>
                      <select
                        value={recallReason}
                        onChange={(e) => setRecallReason(e.target.value)}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                      >
                        <option value="">— Select —</option>
                        {RECALL_REASONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {/* ===== 2. SERVICES ===== */}
                <section>
                  <div className="mb-4 flex items-center justify-between border-b-2 border-teal-500 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                      2. Service / Dental Procedure Details
                    </h4>
                    <button
                      onClick={addServiceRow}
                      className="inline-flex items-center gap-1 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-800"
                    >
                      <Plus size={12} />
                      Add Service Row
                    </button>
                  </div>

                  {serviceRows.length === 0 ? (
                    <p className="py-6 text-center text-xs italic text-zinc-400">
                      No services added yet. Click &lsquo;+ Add Service Row&rsquo; above to append treatments.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-50">
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Service / Procedure</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">Teeth</th>
                            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-500">Unit Price</th>
                            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-500">Discount Amt</th>
                            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-500">Net Total</th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {serviceRows.map((row) => {
                            const net = (Number(row.unitPrice) || 0) - (Number(row.discount) || 0);
                            return (
                              <tr key={row.id}>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    placeholder="e.g. Oral Prophylaxis"
                                    value={row.procedure}
                                    onChange={(e) => updateServiceRow(row.id, 'procedure', e.target.value)}
                                    className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    placeholder="e.g. 11, 12, 21"
                                    value={row.teeth}
                                    onChange={(e) => updateServiceRow(row.id, 'teeth', e.target.value)}
                                    className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min={0}
                                    value={row.unitPrice || ''}
                                    onChange={(e) => updateServiceRow(row.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-right font-mono text-sm text-zinc-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min={0}
                                    value={row.discount || ''}
                                    onChange={(e) => updateServiceRow(row.id, 'discount', parseFloat(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-right font-mono text-sm text-zinc-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                                  />
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-right font-mono font-bold text-zinc-900">
                                  {formatCurrency(net)}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <button
                                    onClick={() => removeServiceRow(row.id)}
                                    className="rounded-lg p-1 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-500"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* totals */}
                  <div className="ml-auto mt-4 max-w-xs rounded-xl border border-zinc-200 p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Accumulation</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Total Cost</span>
                        <span className="font-bold text-zinc-800">{formatCurrency(totalCostCalc)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Discount Amount</span>
                        <span className="text-teal-600">- {formatCurrency(totalDiscountCalc)}</span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-200 pt-1">
                        <span className="font-bold text-zinc-700">Net Cost</span>
                        <span className="text-lg font-bold text-teal-600">{formatCurrency(netCostCalc)}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ===== 3. REMARKS ===== */}
                <section>
                  <div className="mb-4 border-b-2 border-teal-500 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                      3. Remarks Notes (Type &lsquo;/&rsquo; for Templates)
                    </h4>
                  </div>
                  <textarea
                    rows={5}
                    value={clinicalRemarks}
                    onChange={(e) => setClinicalRemarks(e.target.value)}
                    placeholder="Type any detailed clinical comments, surgical reactions, or general treatment observations..."
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                  />
                </section>

                {/* ===== 4. ATTACHMENTS ===== */}
                <section>
                  <div className="mb-4 border-b-2 border-teal-500 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                      4. Upload Clinical Attachments
                    </h4>
                  </div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center transition hover:border-teal-400 hover:bg-teal-50/30"
                  >
                    <Upload size={28} className="text-zinc-400" />
                    <p className="text-sm font-medium text-zinc-600">
                      Drag &amp; drop files here, or <span className="text-teal-600 underline">click to browse</span>
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Supports JPG, PNG, PDF, DOC (Max 15MB)
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                    className="hidden"
                  />
                </section>

                {/* ===== 5. SIGNATURE ===== */}
                <section>
                  <div className="mb-4 border-b-2 border-teal-500 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                      5. Patient or Legal Guardian Signature
                    </h4>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                    <canvas
                      ref={canvasRef}
                      className="h-32 w-full cursor-crosshair rounded-lg bg-white"
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={stopDraw}
                      onMouseLeave={stopDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={stopDraw}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-semibold text-zinc-500">Write / Draw Signature</span>
                    <button
                      onClick={clearSignature}
                      className="font-semibold text-rose-500 transition hover:text-rose-600"
                    >
                      Clear Signature
                    </button>
                    <span className="text-zinc-400">|</span>
                    <span className="text-zinc-400">Or Upload Signature Image</span>
                    <button
                      onClick={() => sigFileRef.current?.click()}
                      className="rounded-lg border border-zinc-200 px-2.5 py-1 font-semibold text-zinc-600 transition hover:bg-zinc-50"
                    >
                      Browse Signature Image
                    </button>
                    <input
                      ref={sigFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleSigUpload}
                    />
                  </div>
                </section>
              </div>
            </div>

            {/* ---- modal footer ---- */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-zinc-200 bg-white px-6 py-5">
              <button
                onClick={() => { setModalOpen(false); resetForm(); }}
                className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(true)}
                className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleSave(false)}
                className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
              >
                Save Progress Note
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ============================================================ */}
      {/* SECTION 5 – ACTION OVERLAY MODAL                             */}
      {/* ============================================================ */}
      {activeActionNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4" onClick={() => setActiveActionNote(null)}>
          <div className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-zinc-100 pb-2">
              <h4 className="text-sm font-bold text-zinc-900">Note Options</h4>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{activeActionNote.id} ({formatDisplayDate(activeActionNote.date)})</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => { openEditModal(activeActionNote); setActiveActionNote(null); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-teal-600 hover:bg-teal-50 transition-colors"
              >
                <CheckSquare className="h-4 w-4" />
                Edit Note
              </button>
              <button
                onClick={() => { duplicateNote(activeActionNote); setActiveActionNote(null); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </button>
              <button
                onClick={() => { printNote(activeActionNote); setActiveActionNote(null); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-teal-600 hover:bg-teal-50 transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <div className="my-1 border-t border-zinc-100" />
              <button
                onClick={() => { deleteNote(activeActionNote.id); setActiveActionNote(null); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
            <button
              onClick={() => setActiveActionNote(null)}
              className="w-full rounded-xl border border-zinc-200 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressNotesModule;
