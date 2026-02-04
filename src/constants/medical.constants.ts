// Reference ranges for thyroid tests
export const THYROID_REFERENCE_RANGES = {
  TSH: { low: 0.4, high: 4.5, units: 'mIU/L' },
  T3: { low: 80, high: 200, units: 'ng/dl' }, // Total T3
  T4: { low: 5.0, high: 12.0, units: 'μg/dl' }, // Total T4
  FT3: { low: 2.3, high: 4.2, units: 'pg/ml' }, // Free T3
  FT4: { low: 0.8, high: 1.8, units: 'ng/dl' } // Free T4
} as const;

// Dosage calculation constants
export const DOSAGE_CONSTANTS = {
  levothyroxine: {
    baseDosage: 1.6, // mcg/kg/day
    moderateDosage: 1.8,
    severeDosage: 2.0,
    roundingFactor: 25 // round to nearest 25mcg
  },
  methimazole: {
    mildDosage: 5, // mg
    moderateDosage: 10,
    severeDosage: 15
  }
};

// Personalized dosage calculation multipliers
export const DOSAGE_MULTIPLIERS = {
  mild: 1.2, // TSH 4.5-10 mIU/L
  moderate: 1.4, // TSH 10-20 mIU/L  
  severe: 1.6, // TSH ≥ 20 mIU/L
  
  // Pregnancy adjustments
  pregnancy: {
    trimester1: 1.5, // 50% increase
    trimester2: 1.4, // 40% increase
    trimester3: 1.3, // 30% increase
    unspecified: 1.4 // 40% increase (conservative)
  },
  
  // Medical condition adjustments
  osteoporosis: 0.9, // 10% reduction
  estrogenTherapy: 1.15, // 15% increase
  giAbsorptionIssues: 1.2, // 20% increase
  
  // Liver disease adjustments
  liverDisease: {
    cirrhosis: 0.9, // 10% reduction
    cholestatic: 1.15, // 15% increase
    nafld: 1.1, // 10% increase
    unspecified: 0.9 // 10% reduction (conservative)
  },
  
  // Kidney disease adjustments
  kidneyDisease: {
    severe: 0.85, // 15% reduction (Stage 4/5/ESRD)
    moderate: 0.9, // 10% reduction (Stage 3)
    unspecified: 0.9 // 10% reduction (conservative)
  },
  
  // Body weight adjustments
  lowWeight: 0.9, // 10% reduction for <45kg
  
  // Heart disease adjustments
  heartDisease: {
    highRisk: 0.75, // 25% reduction
    lowRisk: 0.9 // 10% reduction
  }
} as const;

// Commercially available levothyroxine tablets (12.5 mcg increments)
export const AVAILABLE_DOSES = [
  25, 37.5, 50, 62.5, 75, 87.5, 100, 112.5, 125, 137.5, 150, 162.5, 175, 187.5, 200
];

// Commercially available tablets (most common in pharmacies)
export const COMMERCIAL_TABLETS = [
  25, 50, 75, 88, 100, 112, 125, 137, 150, 175, 200
];

// Safety limits
export const SAFETY_LIMITS = {
  minimumDose: 25, // mcg
  maximumDose: 300, // mcg
  elderlyMaxDose: 50, // mcg for patients ≥60
  lowWeightThreshold: 45, // kg
  elderlyAgeThreshold: 60, // years
  lowTSHThreshold: 0.1, // mIU/L
  maxDoseChange: {
    standard: 25, // mcg
    conservative: 12.5 // mcg (heart disease, osteoporosis)
  } as const,
  // Cardiac-specific safety limits
  cardiacMinimumDose: 25, // mcg - minimum safe dose for cardiac patients
  cardiacMaximumDose: 100 // mcg - conservative maximum for high-risk cardiac patients
} as const;

// Severity thresholds
export const SEVERITY_THRESHOLDS = {
  TSH: {
    mild: { min: 4.5, max: 10 },
    moderate: { min: 10, max: 20 },
    severe: { min: 20, max: Infinity }
  },
  hyperthyroid: {
    mild: { min: 0.2, max: 0.4 },
    moderate: { min: 0.1, max: 0.2 },
    severe: { min: 0, max: 0.1 }
  }
} as const;

// Follow-up schedules (in weeks)
export const FOLLOW_UP_SCHEDULE = {
  normal: 12,
  mild: 6,
  moderate: 5,
  severe: 4,
  hyperthyroid: {
    mild: 4,
    moderate: 3,
    severe: 2
  }
};