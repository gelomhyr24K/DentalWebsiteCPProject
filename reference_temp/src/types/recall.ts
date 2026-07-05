export interface RecallRecord {
  id: string;
  recallDate: string;
  presentMedicalCondition: string;
  presentMedications: string;
  allergiesToMedications: string;
  extraoralExamination: string;
  inlineChartingMode: 'inline' | 'multiple';
  activeToothStatus: 'red' | 'blue' | 'gray' | 'clear';
  toothData: Record<string, {
    surfaces: Record<string, 'red' | 'blue' | 'gray' | 'clear'>; // top, left, right, bottom, middle
    options: string[]; // max 4 selected options from popover
  }>;
  predentalScreening: {
    gingivitis?: boolean;
    earlyPeriodontitis?: boolean;
    moderatePeriodontitis?: boolean;
    advancePeriodontitis?: boolean;
    presenceOfCalcularDeposit?: boolean;
    goodOralHygiene?: boolean;
  };
  occlusion: {
    classMolar?: boolean;
    overjet?: boolean;
    overbite?: boolean;
    medlineDeviation?: boolean;
    crossbite?: boolean;
  };
  appliance: {
    orthodontic?: boolean;
    stayplate?: boolean;
    other?: boolean;
  };
  tmd: {
    clenching?: boolean;
    clicking?: boolean;
    trismus?: boolean;
    muscleSpasm?: boolean;
  };
  recallSummary: string;
}
