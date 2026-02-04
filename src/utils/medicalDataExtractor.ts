import { MedicalReport, PatientInfo, ThyroidTests, TestResult } from '../types/medical';
import { PatientExtractor } from './extractors/patientExtractor';
import { ThyroidExtractor } from './extractors/thyroidExtractor';

export class MedicalDataExtractor {
  static extractMedicalReportData(text: string): MedicalReport {
    const result: MedicalReport = {
      patientInfo: {
        name: null,
        age: null,
        gender: null,
        date: null
      },
      tests: {},
      rawText: text
    };

    // Normalize text
    const cleanText = text.replace(/\s+/g, " ").replace(/[\r\n]+/g, "\n");

    // Extract patient information
    result.patientInfo = PatientExtractor.extractPatientInfo(cleanText);
    
    // Extract test results
    result.tests = ThyroidExtractor.extractThyroidTests(cleanText);

    // Fallback: if date still missing, try to find a standalone date-like token near 'Report' or 'Date'
    if (!result.patientInfo.date) {
      const quick = text.match(/Report\s*(?:Date|Dt\.?)[\s:]+([\w\/-]+)/i) || text.match(/Date[\s:]+([\w\/-]+)/i);
      if (quick) {
        result.patientInfo.date = quick[1];
      }
    }

    return result;
  }
}