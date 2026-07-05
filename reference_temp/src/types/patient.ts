import { ProgressNote } from './progressNote';
import { RecallRecord } from './recall';

export interface PersonalInfo {
  lastName: string;
  firstName: string;
  middleName: string;
  ext: string; // Jr., Sr., III, etc.
  nickname: string;
  birthdate: string;
  sex: 'Male' | 'Female' | 'Other' | '';
  mobile: string; // 09xxxxxxxxx
  email: string;
  address: string;
  school: string;
  hmo: string; // HMO name or 'No HMO'
  referredBy: string;
  bloodType: string;
  weight: string; // in kg
  height: string; // in cm
  civilStatus: 'Single' | 'Married' | 'Widowed' | 'Separated' | 'Divorced' | '';
  occupation: string;
  company: string;
  photoUrl: string; // Base64 or mock image url
}

export interface GuardianInfo {
  fathersName: string;
  fathersOccupation: string;
  fathersEmployer: string;
  fathersContact: string;
  mothersName: string;
  mothersOccupation: string;
  mothersEmployer: string;
  mothersContact: string;
  guardiansName: string;
  guardiansContact: string;
  physicianName: string;
  physicianContact: string;
}

export interface MedicalHistory {
  previousHospitalizations: string;
  prescribedMedications: string;
  allergiesToMedications: string;
  familyMedicationProblems: string;
  otherMedicalConcerns: string;
  medicalAlert: string; // Red alert notes if any
  conditions: string[]; // List of selected conditions
}

export interface DentalHistory {
  reasonForCheckup: string;
  lastVisit: string;
  badDentalExperience: string;
  brushingDifficulties: string;
  fluoridesReceived: string;
  habits: string[]; // List of selected habits
  patientsDiet: string;
}

export interface PatientRecord {
  id: string;
  createdAt: string;
  personalInfo: PersonalInfo;
  guardianInfo: GuardianInfo;
  medicalHistory: MedicalHistory;
  dentalHistory: DentalHistory;
  balance?: number;
  isArchived?: boolean;
  lastRecall?: string;
  tags?: string[];
  progressNotes?: ProgressNote[];
  alternatePatientIds?: string;
  recalls?: RecallRecord[];
  clinicId?: string;
  createdBy?: string;
  updatedBy?: string;
  updatedAt?: string;
}
