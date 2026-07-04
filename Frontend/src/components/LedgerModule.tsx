import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign,
  RefreshCw,
  Search,
  Edit,
  Printer,
  Trash2,
  Plus,
  X,
  MoreVertical,
  Copy,
  Download,
  Link,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BillItem {
  procedure: string;
  detail: string;
  qty: number;
  baseAmount: number;
  discount: number;
  lineTotal: number;
}

interface Bill {
  id: string;
  date: string;
  items: BillItem[];
  services: string;
  createdBy: string;
  totalCost: number;
  discount: number;
  payable: number;
  paidAmount: number;
  balance: number;
  remarks: string;
  signature: string;
  status: 'Paid' | 'Partially Paid' | 'Unpaid';
  linkedProgressNoteId?: string;
  source: 'progress_note' | 'manual';
}

interface LedgerModuleProps {
  patientData: any;
  setPatientData: (updater: any) => void;
  doctors: any[];
  saveToDatabase: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = (n: number) =>
  '₱' +
  n.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const today = () => new Date().toISOString().slice(0, 10);

const formatDateDisplay = (dateStr: string) => {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const LedgerModule: React.FC<LedgerModuleProps> = ({
  patientData,
  setPatientData,
  doctors,
  saveToDatabase,
}) => {
  /* ---------- derived bills list ---------- */
  const bills: Bill[] = useMemo(
    () => patientData.bills || [],
    [patientData.bills],
  );

  /* ---------- search ---------- */
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBills = useMemo(() => {
    if (!searchQuery.trim()) return bills;
    const q = searchQuery.toLowerCase();
    return bills.filter(
      (b) =>
        (b.services || '').toLowerCase().includes(q) ||
        (b.createdBy || '').toLowerCase().includes(q) ||
        (b.remarks || '').toLowerCase().includes(q) ||
        (b.date || '').includes(q) ||
        (b.id || '').toLowerCase().includes(q),
    );
  }, [bills, searchQuery]);

  /* ---------- pagination ---------- */
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / ITEMS_PER_PAGE));

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, bills.length]);

  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBills.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBills, currentPage]);

  const showingStart = filteredBills.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingEnd = Math.min(currentPage * ITEMS_PER_PAGE, filteredBills.length);

  /* ---------- selection ---------- */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (selectedIds.size === paginatedBills.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedBills.map((b) => b.id)));
    }
  };

  /* ---------- summary ---------- */
  const totalInvoiced = useMemo(
    () => bills.reduce((s, b) => s + (b.payable || 0), 0),
    [bills],
  );
  const totalPayments = useMemo(
    () => bills.reduce((s, b) => s + (b.paidAmount || 0), 0),
    [bills],
  );
  const outstanding = totalInvoiced - totalPayments;

  /* ---------- action overlay modal ---------- */
  const [activeActionBill, setActiveActionBill] = useState<Bill | null>(null);

  /* ---------- modal ---------- */
  const [showModal, setShowModal] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  /* ---------- modal form state ---------- */
  const [billDate, setBillDate] = useState(today());
  const [billItems, setBillItems] = useState<BillItem[]>([]);

  // staged row
  const [stageProcedure, setStageProcedure] = useState('');
  const [stageDetail, setStageDetail] = useState('');
  const [stageQty, setStageQty] = useState(1);
  const [stageBase, setStageBase] = useState(0);
  const [stageDiscount, setStageDiscount] = useState(0);
  const stageLineTotal = stageQty * stageBase - stageDiscount;

  // totals
  const [extraDiscount, setExtraDiscount] = useState(0);
  const [paidValue, setPaidValue] = useState(0);
  const totalCost = useMemo(
    () => billItems.reduce((s, i) => s + i.lineTotal, 0),
    [billItems],
  );
  const payable = totalCost - extraDiscount;
  const balance = payable - paidValue;

  // remarks
  const [billRemarks, setBillRemarks] = useState('');

  /* ---------- signature canvas ---------- */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  /* resize canvas to container */
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showModal) return;
    const resize = () => {
      const canvas = canvasRef.current;
      const container = canvasContainerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    const t = setTimeout(resize, 50);
    window.addEventListener('resize', resize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', resize);
    };
  }, [showModal]);

  /* ---------- staged add ---------- */
  const addStagedItem = () => {
    if (!stageProcedure.trim()) return;
    setBillItems((prev) => [
      ...prev,
      {
        procedure: stageProcedure.trim(),
        detail: stageDetail.trim(),
        qty: stageQty,
        baseAmount: stageBase,
        discount: stageDiscount,
        lineTotal: stageLineTotal,
      },
    ]);
    setStageProcedure('');
    setStageDetail('');
    setStageQty(1);
    setStageBase(0);
    setStageDiscount(0);
  };

  const removeItem = (idx: number) =>
    setBillItems((prev) => prev.filter((_, i) => i !== idx));

  /* ---------- delete bill ---------- */
  const deleteBill = (id: string) => {
    setPatientData((prev: any) => ({
      ...prev,
      bills: (prev.bills || []).filter((b: Bill) => b.id !== id),
    }));
    setTimeout(() => saveToDatabase(), 50);
  };

  /* ---------- duplicate bill ---------- */
  const duplicateBill = (bill: Bill) => {
    const newBill: Bill = {
      ...bill,
      id: 'BILL-' + Date.now(),
      date: today(),
    };
    setPatientData((prev: any) => ({
      ...prev,
      bills: [...(prev.bills || []), newBill],
    }));
    setTimeout(() => saveToDatabase(), 50);
  };

  /* ---------- export JSON ---------- */
  const exportBillJSON = (bill: Bill) => {
    const blob = new Blob([JSON.stringify(bill, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bill.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- shareable link (copy id) ---------- */
  const copyShareableLink = (bill: Bill) => {
    const link = `${window.location.origin}/bill/${bill.id}`;
    navigator.clipboard.writeText(link).catch(() => { });
  };

  /* ---------- reset modal ---------- */
  const resetModal = useCallback(() => {
    setBillDate(today());
    setBillItems([]);
    setStageProcedure('');
    setStageDetail('');
    setStageQty(1);
    setStageBase(0);
    setStageDiscount(0);
    setExtraDiscount(0);
    setPaidValue(0);
    setBillRemarks('');
    setEditingBillId(null);
  }, []);

  const openModal = () => {
    resetModal();
    setShowModal(true);
  };

  const openEditModal = (bill: Bill) => {
    setEditingBillId(bill.id);
    setBillDate(bill.date);
    setBillItems([...(bill.items || [])]);
    setExtraDiscount(bill.discount);
    setPaidValue(bill.paidAmount);
    setBillRemarks(bill.remarks);
    setStageProcedure('');
    setStageDetail('');
    setStageQty(1);
    setStageBase(0);
    setStageDiscount(0);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBillId(null);
  };

  /* ---------- save ---------- */
  const handleSave = () => {
    const servicesStr = billItems.map((i) => i.procedure).join(', ');
    const createdBy = doctors[0]?.name || 'Dr. Maria Jessica Tanarte';
    const signatureDataUrl = canvasRef.current?.toDataURL('image/png') || '';

    const computedStatus: Bill['status'] =
      paidValue >= payable
        ? 'Paid'
        : paidValue > 0
          ? 'Partially Paid'
          : 'Unpaid';

    if (editingBillId) {
      // UPDATE existing bill
      const updatedBill: Bill = {
        id: editingBillId,
        date: billDate,
        items: billItems,
        services: servicesStr,
        createdBy,
        totalCost,
        discount: extraDiscount,
        payable,
        paidAmount: paidValue,
        balance,
        remarks: billRemarks,
        signature: signatureDataUrl,
        status: computedStatus,
        source: 'manual',
      };

      setPatientData((prev: any) => ({
        ...prev,
        bills: (prev.bills || []).map((b: Bill) =>
          b.id === editingBillId ? updatedBill : b,
        ),
        treatmentRecords: (prev.treatmentRecords || []).map((tr: any) =>
          tr.billId === editingBillId
            ? {
              ...tr,
              date: billDate,
              procedure: servicesStr,
              dentist: createdBy,
              amountCharged: payable.toFixed(2),
              amountPaid: paidValue.toFixed(2),
              balance: balance.toFixed(2),
              status: computedStatus,
            }
            : tr,
        ),
      }));
    } else {
      // CREATE new bill
      const billId = 'BILL-' + Date.now();

      const newBill: Bill = {
        id: billId,
        date: billDate,
        items: billItems,
        services: servicesStr,
        createdBy,
        totalCost,
        discount: extraDiscount,
        payable,
        paidAmount: paidValue,
        balance,
        remarks: billRemarks,
        signature: signatureDataUrl,
        status: computedStatus,
        source: 'manual',
      };

      const treatmentRecord = {
        id: 'TR-' + Date.now(),
        date: billDate,
        procedure: servicesStr,
        dentist: createdBy,
        amountCharged: payable.toFixed(2),
        amountPaid: paidValue.toFixed(2),
        balance: balance.toFixed(2),
        paymentMethod: 'Cash',
        billId,
        status: computedStatus,
      };

      setPatientData((prev: any) => ({
        ...prev,
        bills: [...(prev.bills || []), newBill],
        treatmentRecords: [...(prev.treatmentRecords || []), treatmentRecord],
      }));
    }

    setShowModal(false);
    setEditingBillId(null);

    setTimeout(() => {
      saveToDatabase();
    }, 50);
  };

  /* ---------- print ---------- */
  const printBill = (bill: Bill) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Bill ${bill.id}</title>
      <style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#f5f5f5}</style></head>
      <body>
      <h2>Bill ${bill.id}</h2>
      <p><strong>Date:</strong> ${bill.date}</p>
      <p><strong>Created By:</strong> ${bill.createdBy}</p>
      <table><thead><tr><th>Procedure</th><th>Detail</th><th>Qty</th><th>Base</th><th>Discount</th><th>Total</th></tr></thead>
      <tbody>${(bill.items || []).map((i) => `<tr><td>${i.procedure}</td><td>${i.detail}</td><td>${i.qty}</td><td>${fmt(i.baseAmount)}</td><td>${fmt(i.discount)}</td><td>${fmt(i.lineTotal)}</td></tr>`).join('')}</tbody></table>
      <p><strong>Total Cost:</strong> ${fmt(bill.totalCost)}</p>
      <p><strong>Discount:</strong> ${fmt(bill.discount)}</p>
      <p><strong>Payable:</strong> ${fmt(bill.payable)}</p>
      <p><strong>Paid:</strong> ${fmt(bill.paidAmount)}</p>
      <p><strong>Balance:</strong> ${fmt(bill.balance)}</p>
      <p><strong>Remarks:</strong> ${bill.remarks}</p>
      ${bill.signature ? `<p><strong>Signature:</strong></p><img src="${bill.signature}" style="max-width:200px"/>` : ''}
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  /* ---------- patient name ---------- */
  const patientName = [
    patientData.firstName,
    patientData.middleName,
    patientData.lastName,
  ]
    .filter(Boolean)
    .join(' ') || 'N/A';

  /* ---------- page buttons ---------- */
  const pageButtons = useMemo(() => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }, [totalPages]);

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="flex flex-col gap-4">
      {/* ============================================================ */}
      {/* SECTION 1 – HEADER TOOLBAR                                   */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        {/* left */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
            <DollarSign className="h-5 w-5 text-zinc-500" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-zinc-900">
              Patient Bills and Payments
            </h2>
            <p className="text-sm text-zinc-500">
              Manage and generate patient invoices and check-out ledger records.
            </p>
          </div>
        </div>

        {/* right */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search Bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-zinc-200 py-2 pl-9 pr-3 text-sm text-zinc-700 outline-none focus:border-zinc-400"
            />
          </div>

          <button
            onClick={() => {
              setPatientData((prev: any) => ({ ...prev }));
            }}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold uppercase text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Update List
          </button>

          <button
            onClick={openModal}
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold uppercase text-white hover:bg-teal-700"
          >
            + NEW PATIENT BILL
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 2 – SUMMARY CARDS                                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-3 gap-4">
        {/* Card 1 – Total Invoiced Net */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            TOTAL INVOICED NET
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-zinc-900">
            {fmt(totalInvoiced)}
          </p>
        </div>

        {/* Card 2 – Total Payments Received */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            TOTAL PAYMENTS RECEIVED
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-emerald-500">
            {fmt(totalPayments)}
          </p>
        </div>

        {/* Card 3 – Outstanding Ledger Due */}
        <div className="rounded-2xl bg-zinc-900 p-5 text-white shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            OUTSTANDING LEDGER DUE
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-emerald-400">
            {fmt(outstanding)}
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 3 – BILLS TABLE                                      */}
      {/* ============================================================ */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm min-h-[560px] flex flex-col">
        <div className="flex-grow overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={
                      paginatedBills.length > 0 &&
                      selectedIds.size === paginatedBills.length
                    }
                    onChange={toggleAll}
                    className="accent-teal-600"
                  />
                </th>
                <th className="px-3 py-3 text-xs font-bold uppercase text-zinc-500">
                  Action
                </th>
                <th className="px-3 py-3 text-xs font-bold uppercase text-zinc-500">
                  Date
                </th>
                <th className="px-3 py-3 text-xs font-bold uppercase text-zinc-500">
                  Services
                </th>
                <th className="px-3 py-3 text-xs font-bold uppercase text-zinc-500">
                  Created By
                </th>
                <th className="px-3 py-3 text-xs font-bold uppercase text-zinc-500">
                  Net Amount
                </th>
                <th className="px-3 py-3 text-xs font-bold uppercase text-zinc-500">
                  Paid Amount
                </th>
                <th className="px-3 py-3 text-xs font-bold uppercase text-zinc-500">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className="h-8 w-8 text-zinc-300" />
                      <p className="italic text-zinc-400">
                        No billing records available.
                      </p>
                      <p className="text-xs text-zinc-400">
                        Adjust your search query or click &apos;+ New Patient
                        Bill&apos; to register billing plans.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBills.map((bill, index) => (
                  <tr
                    key={bill.id}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60"
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(bill.id)}
                        onChange={() => toggleSelect(bill.id)}
                        className="accent-teal-600"
                      />
                    </td>

                    {/* ACTION – three-dot menu */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => setActiveActionBill(bill)}
                        className="rounded p-1 hover:bg-zinc-100"
                      >
                        <MoreVertical className="h-4 w-4 text-zinc-500" />
                      </button>
                    </td>

                    {/* DATE with status badge */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-zinc-800">
                          {formatDateDisplay(bill.date)}
                        </span>
                        {bill.balance > 0 ? (
                          <span className="inline-block w-fit rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-500">
                            DUE
                          </span>
                        ) : (
                          <span className="inline-block w-fit rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-500">
                            PAID
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-3 font-sans text-zinc-700">
                      {bill.services || <span className="italic text-zinc-400">None</span>}
                    </td>
                    <td className="px-3 py-3 font-medium text-zinc-500">
                      {bill.createdBy || 'Unknown'}
                    </td>
                    <td className="px-3 py-3 font-mono font-bold text-zinc-900">
                      {fmt(bill.payable || 0)}
                    </td>
                    <td className="px-3 py-3 font-mono font-bold text-teal-500">
                      {fmt(bill.paidAmount || 0)}
                    </td>
                    <td className="max-w-[150px] truncate px-3 py-3 text-zinc-500">
                      {bill.remarks ? (
                        bill.remarks
                      ) : (
                        <span className="italic text-zinc-400">No notes</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ---- Pagination ---- */}
        {filteredBills.length > 0 && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
            <p className="text-xs font-medium text-zinc-500">
              Showing {showingStart}-{showingEnd} of {filteredBills.length}{' '}
              billing ledgers
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              {pageButtons.map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${page === currentPage
                    ? 'bg-teal-600 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SECTION 4 – NEW / EDIT BILL MODAL                            */}
      {/* ============================================================ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
            {/* ---- header ---- */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <h3 className="font-display text-xl font-bold text-zinc-900">
                {editingBillId ? 'Edit Bill' : 'New Bill'}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 hover:bg-zinc-100"
              >
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>

            {/* ---- scrollable body ---- */}
            <div className="max-h-[80vh] overflow-y-auto p-6">
              {/* top 2-col */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    PATIENT NAME
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={patientName}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    BILL DATE
                  </label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              {/* ---- Bill Details ---- */}
              <h4 className="mb-3 text-sm font-bold uppercase text-zinc-900">
                Bill Details
              </h4>

              <div className="mb-4 overflow-hidden rounded-xl border border-zinc-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50">
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Service / Procedure
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Remarks / Detail
                      </th>
                      <th className="w-16 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Base Amount
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Discount
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Line Total
                      </th>
                      <th className="w-10 px-1 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {/* STAGED INPUT ROW */}
                    <tr className="border-b border-zinc-100 bg-white">
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          placeholder="e.g. Oral Prophylaxis"
                          value={stageProcedure}
                          onChange={(e) => setStageProcedure(e.target.value)}
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-400"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          placeholder="Remarks"
                          value={stageDetail}
                          onChange={(e) => setStageDetail(e.target.value)}
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-400"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={1}
                          value={stageQty}
                          onChange={(e) =>
                            setStageQty(Math.max(1, Number(e.target.value)))
                          }
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-zinc-400"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center rounded-lg border border-zinc-200">
                          <span className="pl-2 text-xs text-zinc-400">₱</span>
                          <input
                            type="number"
                            min={0}
                            value={stageBase}
                            onChange={(e) =>
                              setStageBase(Math.max(0, Number(e.target.value)))
                            }
                            className="w-full rounded-r-lg px-1 py-1.5 text-sm outline-none"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center rounded-lg border border-zinc-200">
                          <span className="pl-2 text-xs text-zinc-400">₱</span>
                          <input
                            type="number"
                            min={0}
                            value={stageDiscount}
                            onChange={(e) =>
                              setStageDiscount(
                                Math.max(0, Number(e.target.value)),
                              )
                            }
                            className="w-full rounded-r-lg px-1 py-1.5 text-sm outline-none"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-sm font-bold text-zinc-700">
                        {fmt(stageLineTotal)}
                      </td>
                      <td className="px-1 py-2">
                        <button
                          onClick={addStagedItem}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-white hover:bg-teal-600"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>

                    {/* COMMITTED ITEMS */}
                    {billItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-6 text-center text-sm italic text-zinc-400"
                        >
                          No items added. Enter a procedure in the row above and
                          click &apos;+&apos; to add.
                        </td>
                      </tr>
                    ) : (
                      billItems.map((item, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-zinc-50 last:border-0"
                        >
                          <td className="px-3 py-2 text-sm text-zinc-800">
                            {item.procedure}
                          </td>
                          <td className="px-3 py-2 text-sm text-zinc-600">
                            {item.detail}
                          </td>
                          <td className="px-3 py-2 text-center text-sm text-zinc-700">
                            {item.qty}
                          </td>
                          <td className="px-3 py-2 font-mono text-sm text-zinc-700">
                            {fmt(item.baseAmount)}
                          </td>
                          <td className="px-3 py-2 font-mono text-sm text-zinc-700">
                            {fmt(item.discount)}
                          </td>
                          <td className="px-3 py-2 font-mono text-sm font-bold text-zinc-900">
                            {fmt(item.lineTotal)}
                          </td>
                          <td className="px-1 py-2">
                            <button
                              onClick={() => removeItem(idx)}
                              className="rounded p-1 hover:bg-zinc-100"
                            >
                              <Trash2 className="h-4 w-4 text-rose-400" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ---- Total Accumulation Box ---- */}
              <div className="ml-auto max-w-sm rounded-xl border border-zinc-200 p-4">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Total Cost
                  </span>
                  <span className="font-mono font-bold text-zinc-900">
                    {fmt(totalCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Discount
                  </span>
                  <div className="flex items-center">
                    <span className="mr-1 text-sm text-zinc-500">₱</span>
                    <input
                      type="number"
                      min={0}
                      value={extraDiscount}
                      onChange={(e) =>
                        setExtraDiscount(Math.max(0, Number(e.target.value)))
                      }
                      className="w-20 rounded-lg border border-zinc-200 px-2 py-1 text-right font-mono text-sm outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-100 py-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Payable
                  </span>
                  <span className="font-mono font-bold text-teal-600">
                    {fmt(payable)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Paid
                  </span>
                  <div className="flex items-center">
                    <span className="mr-1 text-sm text-teal-600">₱</span>
                    <input
                      type="number"
                      min={0}
                      value={paidValue}
                      onChange={(e) =>
                        setPaidValue(Math.max(0, Number(e.target.value)))
                      }
                      className="w-20 rounded-lg border border-zinc-200 px-2 py-1 text-right font-mono text-sm text-teal-600 outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-100 py-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Balance
                  </span>
                  <span className="font-mono font-bold text-teal-600">
                    {fmt(balance)}
                  </span>
                </div>
              </div>

              {/* ---- Bottom 2-col: Remarks + Signature ---- */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                {/* Remarks */}
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    BILL REMARKS
                  </label>
                  <textarea
                    rows={4}
                    value={billRemarks}
                    onChange={(e) => setBillRemarks(e.target.value)}
                    placeholder="Provide internal notes, check numbers, or dynamic billing terms here..."
                    className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-400"
                  />
                </div>

                {/* Signature */}
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    SIGNATURE
                  </label>
                  <div
                    ref={canvasContainerRef}
                    className="relative h-32 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
                  >
                    <canvas
                      ref={canvasRef}
                      className="h-full w-full cursor-crosshair touch-none"
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={stopDraw}
                      onMouseLeave={stopDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={stopDraw}
                      onTouchCancel={stopDraw}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      PATIENT SIGNATURE
                    </span>
                    <button
                      onClick={clearCanvas}
                      className="text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-rose-500"
                    >
                      ⊘ CLEAR
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ---- footer ---- */}
            <div className="flex justify-end gap-3 border-t border-zinc-100 p-5">
              <button
                onClick={closeModal}
                className="rounded-xl bg-rose-400 px-5 py-2.5 text-xs font-bold uppercase text-white hover:bg-rose-500"
              >
                ✕ CANCEL
              </button>
              <button
                onClick={handleSave}
                className="rounded-xl bg-teal-500 px-5 py-2.5 text-xs font-bold uppercase text-white hover:bg-teal-600"
              >
                ✓ SAVE
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ============================================================ */}
      {/* SECTION 5 – ACTION OVERLAY MODAL                             */}
      {/* ============================================================ */}
      {activeActionBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4" onClick={() => setActiveActionBill(null)}>
          <div className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-zinc-100 pb-2">
              <h4 className="text-sm font-bold text-zinc-900">Bill Options</h4>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{activeActionBill.id} ({formatDateDisplay(activeActionBill.date)})</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => { openEditModal(activeActionBill); setActiveActionBill(null); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-teal-600 hover:bg-teal-50 transition-colors"
              >
                <Edit className="h-4 w-4" />
                Edit Bill
              </button>
              <button
                onClick={() => { duplicateBill(activeActionBill); setActiveActionBill(null); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Copy className="h-4 w-4" />
                Duplicate Bill
              </button>
              <button
                onClick={() => { printBill(activeActionBill); setActiveActionBill(null); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-teal-600 hover:bg-teal-50 transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print Record
              </button>
              <button
                onClick={() => { exportBillJSON(activeActionBill); setActiveActionBill(null); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-teal-600 hover:bg-teal-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </button>
              <button
                onClick={() => { copyShareableLink(activeActionBill); setActiveActionBill(null); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-teal-600 hover:bg-teal-50 transition-colors"
              >
                <Link className="h-4 w-4" />
                Shareable Link
              </button>
              <div className="my-1 border-t border-zinc-100" />
              <button
                onClick={() => { deleteBill(activeActionBill.id); setActiveActionBill(null); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete / Archive
              </button>
            </div>
            <button
              onClick={() => setActiveActionBill(null)}
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

export default LedgerModule;
