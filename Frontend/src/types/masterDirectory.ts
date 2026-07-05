export type MasterDirectoryType =
  | 'services'
  | 'medicines'
  | 'medical_conditions'
  | 'prescription_templates'
  | 'tags'
  | 'tooth_conditions'
  | 'recall_templates'
  | 'certificate_templates'
  | 'clinical_snippets'
  | 'payment_methods'
  | 'doctors'
  | 'appointment_types'
  | 'dental_habits'
  | 'recall_appliance'
  | 'recall_occlusion'
  | 'periodontal_screening'
  | 'recall_tmd'
  | 'tooth_status'
  | 'tooth_prosthodontics'
  | 'tooth_surgery'
  | 'tooth_xray';

export interface MasterDirectoryItem {
  id: string;
  directory_type: MasterDirectoryType;
  code?: string | null;
  name: string;
  description?: string | null;
  price?: number | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
  color?: string | null;
  icon?: string | null;
  is_active: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  archived_at?: string | null;
}

export type MasterDirectoryInput = Partial<Omit<MasterDirectoryItem, 'id' | 'created_at' | 'updated_at'>> & {
  directory_type: MasterDirectoryType;
  name: string;
};
