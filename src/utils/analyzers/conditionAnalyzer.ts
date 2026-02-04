import { ThyroidTests } from '../../types/medical';
import { SEVERITY_THRESHOLDS } from '../../constants/medical.constants';

export class ConditionAnalyzer {
  static getThyroidCondition(tests: ThyroidTests): string {
    const tsh = tests.TSH;
    
    if (!tsh) return 'Insufficient data';

    // Hypothyroidism
    if (tsh.value > SEVERITY_THRESHOLDS.TSH.mild.min) {
      if (tsh.value >= SEVERITY_THRESHOLDS.TSH.severe.min) {
        return 'Severe Hypothyroidism';
      }
      if (tsh.value >= SEVERITY_THRESHOLDS.TSH.moderate.min) {
        return 'Moderate Hypothyroidism';
      }
      return 'Mild Hypothyroidism';
    }
    
    // Hyperthyroidism
    if (tsh.value < SEVERITY_THRESHOLDS.hyperthyroid.mild.min) {
      if (tsh.value <= SEVERITY_THRESHOLDS.hyperthyroid.severe.max) {
        return 'Severe Hyperthyroidism';
      }
      if (tsh.value <= SEVERITY_THRESHOLDS.hyperthyroid.moderate.max) {
        return 'Moderate Hyperthyroidism';
      }
      return 'Mild Hyperthyroidism';
    }

    return 'Normal Thyroid Function';
  }

  static getDetailedAnalysis(tests: ThyroidTests): {
    condition: string;
    summary: string;
    recommendations: string[];
  } {
    const condition = this.getThyroidCondition(tests);
    const tsh = tests.TSH;
    const ft4 = tests.FT4 || tests.T4;
    const ft3 = tests.FT3 || tests.T3;

    let summary = '';
    const recommendations: string[] = [];

    if (!tsh) {
      return {
        condition: 'Insufficient Data',
        summary: 'TSH value is required for proper thyroid function assessment.',
        recommendations: ['Obtain TSH measurement', 'Consider complete thyroid panel']
      };
    }

    // Generate detailed summary based on condition
    switch (true) {
      case condition.includes('Hypothyroidism'):
        summary = `TSH is elevated at ${tsh.value} ${tsh.units}, indicating underactive thyroid function.`;
        if (ft4 && ft4.status === 'low') {
          summary += ` Free T4 is also low at ${ft4.value} ${ft4.units}, confirming primary hypothyroidism.`;
        }
        recommendations.push(
          'Consider levothyroxine replacement therapy',
          'Monitor thyroid function in 6-8 weeks',
          'Check for underlying causes if newly diagnosed'
        );
        break;

      case condition.includes('Hyperthyroidism'):
        summary = `TSH is suppressed at ${tsh.value} ${tsh.units}, indicating overactive thyroid function.`;
        if (ft4 && ft4.status === 'high') {
          summary += ` Free T4 is elevated at ${ft4.value} ${ft4.units}, confirming hyperthyroidism.`;
        }
        recommendations.push(
          'Consider antithyroid medication',
          'Evaluate for Graves disease or toxic nodules',
          'Monitor closely for cardiac symptoms'
        );
        break;

      default:
        summary = `TSH is within normal range at ${tsh.value} ${tsh.units}.`;
        recommendations.push(
          'Continue routine monitoring',
          'Reassess if symptoms develop'
        );
    }

    return { condition, summary, recommendations };
  }
}