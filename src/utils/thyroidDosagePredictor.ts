import { ThyroidTests, DosageRecommendation } from '../types/medical';
import { DosageCalculator } from './calculators/dosageCalculator';
import { ConditionAnalyzer } from './analyzers/conditionAnalyzer';
import { APP_CONFIG } from '../config/app.config';
import { THYROID_REFERENCE_RANGES } from '../constants/medical.constants';

export class ThyroidDosagePredictor {
  static predictDosage(tests: ThyroidTests, age: number | null, weight?: number): DosageRecommendation | null {
    const tsh = tests.TSH;
    const ft4 = tests.FT4 || tests.T4;
    
    if (!tsh) {
      return null;
    }

    // Default weight if not provided (average adult weight)
    const patientWeight = weight || APP_CONFIG.medical.defaultWeight;

    // Hypothyroidism detection and dosage calculation
    if (tsh.value > 4.5) {
      return DosageCalculator.calculateHypothyroidDosage(tsh.value, ft4?.value, patientWeight, age);
    }
    
    // Hyperthyroidism detection - check TSH <= 0.1 first
    if (tsh.value <= 0.1) {
      const ft3 = tests.FT3;
      const t4 = tests.T4;
      const t3 = tests.T3;
      return DosageCalculator.calculateHyperthyroidTreatment(
        tsh.value, 
        ft4?.value,
        ft3?.value,
        t4?.value,
        t3?.value,
        age,
        weight
      );
    }
    
    // TSH 0.1-0.4: Mild hyperthyroidism (still check)
    if (tsh.value < 0.4) {
      const ft3 = tests.FT3;
      const t4 = tests.T4;
      const t3 = tests.T3;
      return DosageCalculator.calculateHyperthyroidTreatment(
        tsh.value, 
        ft4?.value,
        ft3?.value,
        t4?.value,
        t3?.value,
        age,
        weight
      );
    }

    // TSH 0.4-4.5: Normal range - check if hormones are normal
    if (tsh.value >= 0.4 && tsh.value <= 4.5) {
      const ft3 = tests.FT3;
      const t4 = tests.T4;
      const t3 = tests.T3;
      
      // Check if hormones are in normal range
      const hasFreeHormones = ft4 && ft3;
      const hasTotalHormones = t4 && t3;
      
      if (hasFreeHormones || hasTotalHormones) {
        const ft4Ref = THYROID_REFERENCE_RANGES.FT4;
        const ft3Ref = THYROID_REFERENCE_RANGES.FT3;
        const t4Ref = THYROID_REFERENCE_RANGES.T4;
        const t3Ref = THYROID_REFERENCE_RANGES.T3;
        
        let hormonesNormal = true;
        
        if (hasFreeHormones) {
          const ft4Val = ft4.value;
          const ft3Val = ft3.value;
          hormonesNormal = (ft4Val >= ft4Ref.low && ft4Val <= ft4Ref.high) && 
                          (ft3Val >= ft3Ref.low && ft3Val <= ft3Ref.high);
        } else if (hasTotalHormones) {
          const t4Val = t4.value;
          const t3Val = t3.value;
          hormonesNormal = (t4Val >= t4Ref.low && t4Val <= t4Ref.high) && 
                          (t3Val >= t3Ref.low && t3Val <= t3Ref.high);
        }
        
        if (hormonesNormal) {
          return {
            medication: 'No medication required',
            dosage: 0,
            unit: '',
            frequency: '',
            reasoning: `TSH (${tsh.value} mIU/L) and hormone levels are within normal range. No treatment required.`,
            severity: 'mild',
            followUpWeeks: 12
          };
        }
      }
      
      // If hormones not provided or abnormal, still show normal message
      return {
        medication: 'No medication required',
        dosage: 0,
        unit: '',
        frequency: '',
        reasoning: `TSH (${tsh.value} mIU/L) is within normal range. Continue monitoring.`,
        severity: 'mild',
        followUpWeeks: 12
      };
    }

    // Should not reach here, but fallback
    return {
      medication: 'No medication required',
      dosage: 0,
      unit: '',
      frequency: '',
      reasoning: 'TSH levels are within normal range. Continue monitoring.',
      severity: 'mild',
      followUpWeeks: 12
    };
  }

  static getThyroidCondition(tests: ThyroidTests): string {
    return ConditionAnalyzer.getThyroidCondition(tests);
  }

  static getDetailedAnalysis(tests: ThyroidTests) {
    return ConditionAnalyzer.getDetailedAnalysis(tests);
  }
}