import { ThyroidTests, TestResult } from '../../types/medical';
import { THYROID_TEST_PATTERNS } from '../regex/patterns';
import { THYROID_REFERENCE_RANGES } from '../../constants/medical.constants';

export class ThyroidExtractor {
  static extractThyroidTests(text: string): ThyroidTests {
    console.log('DEBUG: ENTIRE EXTRACTED TEXT:', text);
    const tests: ThyroidTests = {};

    // Extract each thyroid test
    Object.entries(THYROID_TEST_PATTERNS).forEach(([testKey, config]) => {
      const testResult = this.extractSingleTest(text, config, testKey);
      if (testResult) {
        tests[testKey as keyof ThyroidTests] = testResult;
      }
    });

    return tests;
  }

  private static extractSingleTest(
    text: string, 
    config: { pattern: RegExp; alternativePatterns: readonly RegExp[] }, 
    testKey: string
  ): TestResult | null {
    if (testKey === 'TSH') {
      console.log('DEBUG: Extracting TSH from text:', text.slice(0, 200));
    }
    // Try main pattern first
    let match = text.match(config.pattern);
    if (testKey === 'TSH') {
      console.log('DEBUG: TSH regex match:', match);
    }
    
    // If no match, try alternative patterns
    if (!match && config.alternativePatterns) {
      for (const altPattern of [...config.alternativePatterns]) {
        const altMatch = text.match(altPattern);
        if (altMatch) {
          // Convert alternative pattern match to main pattern format
          match = [altMatch[0], testKey, altMatch[1], '', '', ''];
          break;
        }
      }
    }

    if (!match) return null;

    let testResult: TestResult;
    if (testKey === 'TSH') {
      // Use new group numbers for TSH regex
      testResult = {
        label: match[1]?.trim() || testKey,
        value: parseFloat(match[5]),
        units: match[2] ? (match[2] === 'μIU/mL' ? 'mIU/L' : match[2]) : this.getDefaultUnits(testKey),
        refRange: match[3] && match[4] ? {
          low: parseFloat(match[3]),
          high: parseFloat(match[4])
        } : this.getDefaultRefRange(testKey)
      };
    } else {
      testResult = {
        label: match[1]?.trim() || testKey,
        value: parseFloat(match[2]),
        units: match[3] ? (match[3] === 'μIU/mL' ? 'mIU/L' : match[3]) : this.getDefaultUnits(testKey),
        refRange: match[4] && match[5] ? {
          low: parseFloat(match[4]),
          high: parseFloat(match[5])
        } : this.getDefaultRefRange(testKey)
      };
    }

    // Determine status based on reference range
    if (testResult.refRange) {
      testResult.status = this.determineStatus(testResult.value, testResult.refRange);
    }

    return testResult;
  }

  private static getDefaultUnits(testKey: string): string {
    const refRange = THYROID_REFERENCE_RANGES[testKey as keyof typeof THYROID_REFERENCE_RANGES];
    return refRange?.units || '';
  }

  private static getDefaultRefRange(testKey: string): { low: number; high: number } | null {
    const refRange = THYROID_REFERENCE_RANGES[testKey as keyof typeof THYROID_REFERENCE_RANGES];
    return refRange ? { low: refRange.low, high: refRange.high } : null;
  }

  private static determineStatus(value: number, refRange: { low: number; high: number }): 'normal' | 'high' | 'low' {
    if (value < refRange.low) return 'low';
    if (value > refRange.high) return 'high';
    return 'normal';
  }
}