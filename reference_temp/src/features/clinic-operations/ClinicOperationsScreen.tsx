import React, { useState, useEffect } from 'react';
import ClinicOperationsLedger from './ClinicOperationsLedger';
import { PatientRecord, ClinicUser } from '../../types';

interface ClinicOperationsScreenProps {
  currentUser: ClinicUser;
  setToast: (toast: { message: string; type: 'success' | 'info' | 'error' } | null) => void;
}

export default function ClinicOperationsScreen({ currentUser, setToast }: ClinicOperationsScreenProps) {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [allBills, setAllBills] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [selectedLedgerTab, setSelectedLedgerTab] = useState<'patient-registry' | 'or-management' | 'daily-collection' | 'patient-ledger' | 'clinic-expense' | 'monthly-summary' | 'audit-trail' | 'reconciliation'>('patient-registry');

  const refreshDatabase = () => {
    // Load records
    let currentRecords: PatientRecord[] = [];
    try {
      const stored = localStorage.getItem('DENTAL_PATIENT_RECORDS_PRODUCTION_STORAGE');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (currentUser) {
          currentRecords = parsed.filter((r: PatientRecord) => !r.clinicId || r.clinicId === currentUser.clinicId);
        } else {
          currentRecords = parsed;
        }
        setRecords(currentRecords);
      }
    } catch (e) {
      console.error(e);
    }

    // Load bills
    const billsList: any[] = [];
    currentRecords.forEach(patient => {
      const saved = localStorage.getItem(`dental_bills_${patient.id}`);
      let patientBills: any[] = [];
      if (saved) {
        try {
          patientBills = JSON.parse(saved);
        } catch (e) {
          patientBills = [];
        }
      }
      patientBills.forEach(b => {
        let standardizedDate = b.date;
        if (b.date && !b.date.includes('-')) {
          const d = new Date(b.date);
          if (!isNaN(d.getTime())) {
            standardizedDate = d.toISOString().split('T')[0];
          }
        }
        billsList.push({
          ...b,
          date: standardizedDate || "2026-06-15",
          patientId: patient.id,
          patientName: `${patient.personalInfo.lastName}, ${patient.personalInfo.firstName}`,
          patientGender: patient.personalInfo.sex || 'Male',
          patientCreatedAt: patient.createdAt
        });
      });
    });
    setAllBills(billsList);

    // Load expenses
    const expensesSaved = localStorage.getItem('DENTAL_EXPENSES_RECORD');
    let expensesList: any[] = [];
    if (expensesSaved) {
      try {
        expensesList = JSON.parse(expensesSaved);
      } catch (e) {
        expensesList = [];
      }
    }
    setAllExpenses(expensesList);
  };

  useEffect(() => {
    refreshDatabase();
    // Add event listener to refresh on updates if any other component triggers
    window.addEventListener('storage', refreshDatabase);
    return () => {
      window.removeEventListener('storage', refreshDatabase);
    };
  }, [currentUser]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header section with page title ONLY (no redundant gear or coins icons) */}
      <div className="border-b border-zinc-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight">Clinic Operations Ledger</h1>
          <p className="text-xs text-zinc-400 font-medium">Review and balance diagnostic accounts, OR registries, expense databases, and medical logs.</p>
        </div>
      </div>

      <ClinicOperationsLedger 
        records={records}
        allBills={allBills}
        allExpenses={allExpenses}
        refreshDatabase={refreshDatabase}
        selectedLedgerTab={selectedLedgerTab}
      />
    </div>
  );
}
