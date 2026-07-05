export interface RuleServiceItem {
  serviceId: string;
  priority: number; // 1 = Conservative (Lowest Cost), 2 = Standard, 3 = Comprehensive (Highest Cost)
  condition?: string;
}

export interface TreatmentRule {
  id: string;
  findingName: string; // Tooth Status or Condition name/code, e.g. "Cavity", "Missing Due to Caries", "Impacted Tooth"
  services: RuleServiceItem[];
  remarks?: string;
}

export interface SmartQuotationOption {
  title: string;
  estimatedCost: number;
  estimatedVisits: number;
  clinicalReason: string;
  procedures: {
    serviceId: string;
    serviceName: string;
    unitPrice: number;
    teeth: string[];
    sequenceOrder: number;
  }[];
  approved?: boolean;
}
