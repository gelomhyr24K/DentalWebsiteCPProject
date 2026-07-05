type PatientLike = {
  patient_data?: Record<string, any> | null;
  patientData?: Record<string, any> | null;
  bills?: Record<string, any>[] | null;
  balance?: unknown;
  remainingBalance?: unknown;
  remaining_balance?: unknown;
  [key: string]: unknown;
};

const asNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const positive = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

const getPatientData = (patient: PatientLike) => {
  if (patient?.patient_data && typeof patient.patient_data === 'object') return patient.patient_data;
  if (patient?.patientData && typeof patient.patientData === 'object') return patient.patientData;
  return {};
};

const getBills = (patient: PatientLike): Record<string, any>[] => {
  const patientData = getPatientData(patient);
  if (Array.isArray(patientData.bills)) return patientData.bills;
  if (Array.isArray(patient.bills)) return patient.bills;
  return [];
};

const calculateBillRemainingBalance = (bill: Record<string, any>) => {
  const direct = positive(asNumber(
    bill.remainingBalance
    ?? bill.remaining_balance
    ?? bill.balance
    ?? bill.amountDue
    ?? bill.amount_due
    ?? bill.unpaidAmount
    ?? bill.unpaid_amount
  ));
  if (direct > 0) return direct;

  const total = asNumber(
    bill.totalBill
    ?? bill.total_bill
    ?? bill.totalAmount
    ?? bill.total_amount
    ?? bill.total
    ?? bill.payable
    ?? bill.amount
    ?? bill.totalCost
  );
  const paid = asNumber(
    bill.paidAmount
    ?? bill.paid_amount
    ?? bill.amountPaid
    ?? bill.amount_paid
    ?? bill.paid
  );

  return positive(total - paid);
};

export const calculatePatientRemainingBalance = (patient: PatientLike) => {
  const bills = getBills(patient);
  if (bills.length > 0) {
    return bills.reduce((sum, bill) => sum + calculateBillRemainingBalance(bill), 0);
  }

  const patientData = getPatientData(patient);
  const direct = positive(asNumber(
    patientData.balance
    ?? patientData.remainingBalance
    ?? patientData.remaining_balance
    ?? patient.balance
    ?? patient.remainingBalance
    ?? patient.remaining_balance
  ));
  if (direct > 0) return direct;

  if (Array.isArray(patientData.treatmentRecords)) {
    return patientData.treatmentRecords.reduce((sum: number, row: Record<string, any>) => {
      const rowBalance = positive(asNumber(row.balance));
      if (rowBalance > 0) return sum + rowBalance;
      return sum + positive(asNumber(row.amountCharged) - asNumber(row.amountPaid));
    }, 0);
  }

  return 0;
};

export const getPatientLatestBillDate = (patient: PatientLike) => {
  const dates = getBills(patient)
    .map((bill) => String(bill.date || bill.createdAt || bill.created_at || bill.updatedAt || bill.updated_at || '').trim())
    .filter(Boolean)
    .sort();
  return dates.length > 0 ? dates[dates.length - 1] : '';
};

export const formatPatientCurrency = (amount: number) =>
  `PHP ${positive(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
