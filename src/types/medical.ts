export interface PatientInfo {
  name: string | null;
  age: number | null;
  gender: 'Male' | 'Female' | null;
  date: string | null;
}

export interface TestResult {
  label: string;
  value: number;
  units: string | null;
  refRange: {
    low: number;
    high: number;
  } | null;
  status?: 'normal' | 'high' | 'low';
}

export interface ThyroidTests {
  TSH?: TestResult;
  T3?: TestResult;
  T4?: TestResult;
  FT3?: TestResult;
  FT4?: TestResult;
}

export interface MedicalReport {
  patientInfo: PatientInfo;
  tests: ThyroidTests;
  rawText?: string;
}

export interface DosageRecommendation {
  medication: string;
  dosage: number;
  unit: string;
  frequency: string;
  reasoning: string;
  severity: 'mild' | 'moderate' | 'severe';
  followUpWeeks: number;
}

export interface PatientProfile {
  age: number | null;
  weightKg: number | null;
  gender: 'male' | 'female' | null;
  isPregnant: boolean;
  trimester?: 1 | 2 | 3 | null;
  hasHighRiskHeartDisease?: boolean;
  hasLowRiskHeartDisease?: boolean;
  hasOsteoporosis: boolean;
  hasAdrenalInsufficiency: boolean;
  hasGIAbsorptionIssues: boolean;
  onEstrogenTherapy: boolean;
  hasLiverDisease?: boolean;
  liverDiseaseType?: 'cirrhosis' | 'cholestatic' | 'nafld' | 'hepatitis' | 'post_transplant' | 'other' | null;
  hasKidneyDisease?: boolean;
  kidneyDiseaseStage?: 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Stage 5' | 'ESRD' | 'Post-Transplant' | 'other' | null;
  currentTSH: number | null;
  currentT3?: number | null;
  currentT4?: number | null;
  currentFT3?: number | null;
  currentFT4?: number | null;
  currentDose?: number | null;
  hasHypothyroidDiagnosis?: boolean;
  symptoms?: {
    headache?: boolean;
    anxiousOrRestless?: boolean;
  };
  name?: string;
  reportDate?: string | null;
  otherIssues?: string | null;
}

export interface DataCollectionRecord {
  userName: string;
  reportDate: string;
  TSH: number | null;
  T3: number | null;
  T4: number | null;
  recommendedDose: number;
  timestamp: string;
  userConsent: boolean;
}

export interface ConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  userName: string;
  recommendedDose: number;
}

export interface DosageResult {
  dose: number;
  nearestTablet?: number;
  symptomAlert?: string;
  alerts?: string[];
  medicalConditionsSummary?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  followUpWeeks?: number;
  /** When true, the calculation requires hormone data (FT3/FT4 or T3/T4) to proceed */
  requiresHormoneData?: boolean;
  /** Specific hormone fields that are missing */
  missingHormoneFields?: ('FT3' | 'FT4' | 'T3' | 'T4')[];
}