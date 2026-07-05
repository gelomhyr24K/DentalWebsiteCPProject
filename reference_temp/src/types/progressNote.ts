export interface TreatmentItem {
  id: string;
  serviceProcedure: string;
  teeth: string;
  unitPrice: number;
  subtotal: number;
  discountAmount: number;
  netTotal: number;
}

export interface ProgressNote {
  id: string;
  date: string;
  visitDate: string;
  visitTime?: string;
  recallDate: string;
  recallTime?: string;
  recallReason: string;
  items: TreatmentItem[];
  totalCost: number;
  totalDiscount: number;
  netCost: number;
  remarks: string;
  attachments: { name: string; url: string; size?: string }[];
  signatureDataUrl?: string;
  signatureType?: 'drawn' | 'uploaded';
  status: 'Draft' | 'Saved';
  recallStatus?: 'Scheduled' | 'Completed' | 'Rescheduled' | 'Cancelled' | 'Missed';
}
