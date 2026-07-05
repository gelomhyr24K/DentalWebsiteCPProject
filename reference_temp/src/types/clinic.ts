export interface Clinic {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface ClinicUser {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  phone: string;
  role: 'Clinic Owner' | 'Associate Dentist' | 'Staff Member';
  status: 'Active' | 'Inactive';
  passwordHash?: string;
  createdAt?: string;
  displayInCalendar?: boolean;
}
