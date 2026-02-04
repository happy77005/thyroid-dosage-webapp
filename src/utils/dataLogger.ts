import { PatientProfile } from '../types/medical';

export interface LoggedCalculation {
  id: string;
  timestamp: string;
  input: {
    weightKg: number | null;
    age: number | null;
    gender: 'male' | 'female' | null;
    currentTSH: number | null;
    hasHypothyroidDiagnosis: boolean;
    isPregnant: boolean;
    trimester?: 1 | 2 | 3 | null;
    hasHighRiskHeartDisease?: boolean;
    hasLowRiskHeartDisease?: boolean;
    hasOsteoporosis: boolean;
    hasAdrenalInsufficiency: boolean;
    hasGIAbsorptionIssues: boolean;
    onEstrogenTherapy: boolean;
    hasLiverDisease?: boolean;
    liverDiseaseType?: string | null;
    hasKidneyDisease?: boolean;
    kidneyDiseaseStage?: string | null;
    currentDose?: number | null;
    symptoms?: {
      headache?: boolean;
      anxiousOrRestless?: boolean;
    };
  };
  output: {
    recommendedDose: number;
    symptomAlert?: string;
    isEuthyroid: boolean;
    recommendationType: 'monitoring' | 'treatment' | 'no_treatment';
  };
  userAgent: string;
  sessionId: string;
}

export class DataLogger {
  private static readonly STORAGE_KEY = 'thyroid_calculations';
  private static readonly CONSENT_KEY_PREFIX = 'data_consent_v1:';
  private static readonly MAX_LOCAL_ENTRIES = 100;

  // Generate a unique session ID for this browser session
  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('thyroid_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('thyroid_session_id', sessionId);
    }
    return sessionId;
  }

  private static isDuplicateTSHSameDay(
    calculations: LoggedCalculation[],
    profile: PatientProfile
  ): boolean {
    if (profile.currentTSH == null) return false;
    const todayKey = new Date().toISOString().split('T')[0];
    return calculations.some(calc => {
      if (calc.input.currentTSH == null) return false;
      const calcDate = new Date(calc.timestamp).toISOString().split('T')[0];
      return calcDate === todayKey && calc.input.currentTSH === profile.currentTSH;
    });
  }

  // Log calculation to localStorage
  static logCalculation(profile: PatientProfile, doseResult: { dose: number; symptomAlert?: string }): void {
    try {
      const calculation: LoggedCalculation = {
        id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        input: {
          weightKg: profile.weightKg,
          age: profile.age,
          gender: profile.gender,
          currentTSH: profile.currentTSH,
          hasHypothyroidDiagnosis: profile.hasHypothyroidDiagnosis ?? false,
          isPregnant: profile.isPregnant,
          trimester: profile.trimester,
          hasHighRiskHeartDisease: profile.hasHighRiskHeartDisease,
          hasLowRiskHeartDisease: profile.hasLowRiskHeartDisease,
          hasOsteoporosis: profile.hasOsteoporosis,
          hasAdrenalInsufficiency: profile.hasAdrenalInsufficiency,
          hasGIAbsorptionIssues: profile.hasGIAbsorptionIssues,
          onEstrogenTherapy: profile.onEstrogenTherapy,
          hasLiverDisease: profile.hasLiverDisease,
          liverDiseaseType: profile.liverDiseaseType,
          hasKidneyDisease: profile.hasKidneyDisease,
          kidneyDiseaseStage: profile.kidneyDiseaseStage,
          currentDose: profile.currentDose,
          symptoms: profile.symptoms,
        },
        output: {
          recommendedDose: doseResult.dose,
          symptomAlert: doseResult.symptomAlert,
          isEuthyroid: profile.currentTSH !== null && profile.currentTSH < 4.5,
          recommendationType: this.getRecommendationType(profile, doseResult),
        },
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId(),
      };

      // Get existing calculations
      const existingData = localStorage.getItem(this.STORAGE_KEY);
      const calculations: LoggedCalculation[] = existingData ? JSON.parse(existingData) : [];

      // Prevent duplicates with same-day identical TSH
      if (this.isDuplicateTSHSameDay(calculations, profile)) {
        console.info('Skipping duplicate TSH entry for the same day.');
        return;
      }

      // Add new calculation
      calculations.unshift(calculation);

      // Keep only the most recent entries
      const trimmedCalculations = calculations.slice(0, this.MAX_LOCAL_ENTRIES);

      // Save back to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedCalculations));

      console.log('Calculation logged to localStorage:', calculation);
    } catch (error) {
      console.error('Error logging calculation to localStorage:', error);
    }
  }

  // Get all logged calculations
  static getLoggedCalculations(): LoggedCalculation[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading logged calculations:', error);
      return [];
    }
  }

  // Get calculations for current session
  static getSessionCalculations(): LoggedCalculation[] {
    const sessionId = this.getSessionId();
    return this.getLoggedCalculations().filter(calc => calc.sessionId === sessionId);
  }

  // Clear all logged calculations
  static clearLoggedCalculations(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('All logged calculations cleared');
    } catch (error) {
      console.error('Error clearing logged calculations:', error);
    }
  }

  // Export calculations as JSON
  static exportCalculations(): string {
    try {
      const calculations = this.getLoggedCalculations();
      return JSON.stringify(calculations, null, 2);
    } catch (error) {
      console.error('Error exporting calculations:', error);
      return '[]';
    }
  }

  // Get statistics about logged calculations
  static getCalculationStats(): {
    totalCalculations: number;
    sessionCalculations: number;
    euthyroidCount: number;
    treatmentCount: number;
    monitoringCount: number;
    averageTSH: number;
    averageDose: number;
  } {
    const calculations = this.getLoggedCalculations();
    const sessionCalculations = this.getSessionCalculations();

    const euthyroidCount = calculations.filter(c => c.output.isEuthyroid).length;
    const treatmentCount = calculations.filter(c => c.output.recommendationType === 'treatment').length;
    const monitoringCount = calculations.filter(c => c.output.recommendationType === 'monitoring').length;

    const validTSH = calculations.filter(c => c.input.currentTSH !== null).map(c => c.input.currentTSH!);
    const validDoses = calculations.filter(c => c.output.recommendedDose > 0).map(c => c.output.recommendedDose);

    return {
      totalCalculations: calculations.length,
      sessionCalculations: sessionCalculations.length,
      euthyroidCount,
      treatmentCount,
      monitoringCount,
      averageTSH: validTSH.length > 0 ? validTSH.reduce((a, b) => a + b, 0) / validTSH.length : 0,
      averageDose: validDoses.length > 0 ? validDoses.reduce((a, b) => a + b, 0) / validDoses.length : 0,
    };
  }

  // Determine recommendation type based on profile and result
  private static getRecommendationType(profile: PatientProfile, doseResult: { dose: number; symptomAlert?: string }): 'monitoring' | 'treatment' | 'no_treatment' {
    if (profile.currentTSH !== null && profile.currentTSH < 4.5) {
      return 'monitoring';
    }
    
    if (doseResult.dose === 0) {
      return 'no_treatment';
    }
    
    return 'treatment';
  }

  // Log to Firestore (for cloud storage)
  static async logToFirestore(
    userId: string,
    profile: PatientProfile,
    doseResult: { dose: number; symptomAlert?: string }
  ): Promise<void> {
    try {
      // Respect user consent flag; if not granted, skip cloud logging
      const consent = localStorage.getItem(this.CONSENT_KEY_PREFIX + userId) === 'true';
      if (!consent) {
        return;
      }
      // Skip cloud logging if this TSH was already recorded today
      const localCalculations = this.getLoggedCalculations();
      if (this.isDuplicateTSHSameDay(localCalculations, profile)) {
        console.info('Skipping Firestore logging for duplicate same-day TSH entry.');
        return;
      }

      const calculation: LoggedCalculation = {
        id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        input: {
          weightKg: profile.weightKg,
          age: profile.age,
          gender: profile.gender,
          currentTSH: profile.currentTSH,
          hasHypothyroidDiagnosis: profile.hasHypothyroidDiagnosis ?? false,
          isPregnant: profile.isPregnant,
          trimester: profile.trimester,
          hasHighRiskHeartDisease: profile.hasHighRiskHeartDisease,
          hasLowRiskHeartDisease: profile.hasLowRiskHeartDisease,
          hasOsteoporosis: profile.hasOsteoporosis,
          hasAdrenalInsufficiency: profile.hasAdrenalInsufficiency,
          hasGIAbsorptionIssues: profile.hasGIAbsorptionIssues,
          onEstrogenTherapy: profile.onEstrogenTherapy,
          hasLiverDisease: profile.hasLiverDisease,
          liverDiseaseType: profile.liverDiseaseType,
          hasKidneyDisease: profile.hasKidneyDisease,
          kidneyDiseaseStage: profile.kidneyDiseaseStage,
          currentDose: profile.currentDose,
          symptoms: profile.symptoms,
        },
        output: {
          recommendedDose: doseResult.dose,
          symptomAlert: doseResult.symptomAlert,
          isEuthyroid: profile.currentTSH !== null && profile.currentTSH < 4.5,
          recommendationType: this.getRecommendationType(profile, doseResult),
        },
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId(),
      };

      // Import FirestoreService dynamically to avoid circular dependencies
      const { FirestoreService } = await import('../services/FirestoreService');
      
      // Save as a patient profile calculation
      await FirestoreService.savePatientProfile(userId, profile);
      
      console.log('Calculation logged to Firestore:', calculation);
    } catch (error) {
      console.error('Error logging calculation to Firestore:', error);
    }
  }
}
