import { PatientInfo } from '../../types/medical';
import { PATIENT_PATTERNS } from '../regex/patterns';

export class PatientExtractor {
  static extractPatientInfo(text: string): PatientInfo {
    const patientInfo: PatientInfo = {
      name: null,
      age: null,
      gender: null,
      date: null
    };

    // Extract Name + Age + Gender (pattern: "Mr/Mrs/Ms NAME (44Y/F)")
    const nameMatch = text.match(PATIENT_PATTERNS.nameAgeGender);
    if (nameMatch) {
      patientInfo.name = nameMatch[1].trim();
      patientInfo.age = parseInt(nameMatch[2]);
      patientInfo.gender = nameMatch[3] === "F" ? "Female" : "Male";
    }

    // Alternative name extraction if not found
    if (!patientInfo.name) {
      const altNameMatch = text.match(PATIENT_PATTERNS.nameOnly);
      if (altNameMatch) {
        patientInfo.name = altNameMatch[1].trim();
      }
    }

    // Extract age separately if not found
    if (!patientInfo.age) {
      const ageMatch = text.match(PATIENT_PATTERNS.agePattern);
      if (ageMatch) {
        patientInfo.age = parseInt(ageMatch[1]);
      }
    }

    // Extract gender separately if not found
    if (!patientInfo.gender) {
      const genderMatch = text.match(PATIENT_PATTERNS.genderPattern);
      if (genderMatch) {
        const gender = genderMatch[1].toLowerCase();
        patientInfo.gender = gender === 'f' || gender === 'female' ? 'Female' : 'Male';
      }
    }

    // Extract Date (various report formats)
    const dateMatch = text.match(PATIENT_PATTERNS.datePattern) 
      || text.match(PATIENT_PATTERNS.dateNumeric) 
      || text.match(PATIENT_PATTERNS.dateDmySlashes);
    if (dateMatch) {
      patientInfo.date = dateMatch[1];
    }

    return patientInfo;
  }
}