import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { MedicalReport, DosageRecommendation, PatientProfile } from '../types/medical';

export interface StoredMedicalReport {
  id?: string;
  userId: string;
  uniqueKey?: string; // to dedupe same report
  patientInfo: {
    name: string | null;
    age: number | null;
    gender: 'Male' | 'Female' | null;
    date: string | null;
    weightKg?: number | null;
    reportDate?: string | null;
  };
  patientProfile?: {
    weightKg: number | null;
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
    currentDose?: number | null;
    hasHypothyroidDiagnosis?: boolean;
    symptoms?: {
      headache?: boolean;
      anxiousOrRestless?: boolean;
    };
    otherIssues?: string | null;
  };
  testResults: {
    TSH?: {
      value: number;
      units: string;
      status: 'normal' | 'high' | 'low';
    };
    T3?: {
      value: number;
      units: string;
      status: 'normal' | 'high' | 'low';
    };
    T4?: {
      value: number;
      units: string;
      status: 'normal' | 'high' | 'low';
    };
    FT3?: {
      value: number;
      units: string;
      status: 'normal' | 'high' | 'low';
    };
    FT4?: {
      value: number;
      units: string;
      status: 'normal' | 'high' | 'low';
    };
  };
  dosageRecommendation?: DosageRecommendation | null;
  condition?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StoredPatientProfile {
  id?: string;
  userId: string;
  profile: PatientProfile;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class FirestoreService {
  // Lightweight summary document for offline sync uploads
  static async saveReportSummary(
    userId: string,
    summary: {
      reportDate: string | null;
      generatedAt: string; // ISO string
      name: string | null;
      age: number | null;
      weightKg: number | null;
      TSH: number | null;
      T3?: number | null;
      T4?: number | null;
      FT3?: number | null;
      FT4?: number | null;
      recommendedDose: number;
      otherIssues?: string | null;
    }
  ): Promise<string> {
    try {
      const docData = {
        userId,
        ...summary,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      console.log('Saving to Firestore collection "reportSummaries" with data:', JSON.stringify(docData, null, 2));
      const docRef = await addDoc(collection(db, 'reportSummaries'), docData);
      console.log('Document saved successfully with ID:', docRef.id);
      console.log('Collection: reportSummaries | Document ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving report summary:', error);
      throw new Error('Failed to save report summary');
    }
  }

  // Medical Reports Collection
  static async saveMedicalReport(
    userId: string, 
    report: MedicalReport, 
    recommendation?: DosageRecommendation | null,
    _condition?: string, // Not used but kept for backward compatibility
    patientProfile?: PatientProfile
  ): Promise<string> {
    try {
      console.log('Starting saveMedicalReport with userId:', userId);
      console.log('Firestore db instance:', !!db);
      // Extract only essential test data
      const testResults: StoredMedicalReport['testResults'] = {};
      
      if (report.tests.TSH) {
        testResults.TSH = {
          value: report.tests.TSH.value,
          units: report.tests.TSH.units || 'mIU/L',
          status: report.tests.TSH.status || 'normal'
        };
      }
      
      if (report.tests.T3) {
        testResults.T3 = {
          value: report.tests.T3.value,
          units: report.tests.T3.units || 'ng/dl',
          status: report.tests.T3.status || 'normal'
        };
      }
      
      if (report.tests.T4) {
        testResults.T4 = {
          value: report.tests.T4.value,
          units: report.tests.T4.units || 'μg/dl',
          status: report.tests.T4.status || 'normal'
        };
      }
      
      if (report.tests.FT3) {
        testResults.FT3 = {
          value: report.tests.FT3.value,
          units: report.tests.FT3.units || 'pg/ml',
          status: report.tests.FT3.status || 'normal'
        };
      }
      
      if (report.tests.FT4) {
        testResults.FT4 = {
          value: report.tests.FT4.value,
          units: report.tests.FT4.units || 'ng/dl',
          status: report.tests.FT4.status || 'normal'
        };
      }

      // Clean the recommendation data to remove undefined values
      const cleanRecommendation = recommendation ? {
        medication: recommendation.medication,
        // Store nearest integer dosage only
        dosage: Math.round(recommendation.dosage),
        unit: recommendation.unit,
        frequency: recommendation.frequency,
        reasoning: recommendation.reasoning,
        severity: recommendation.severity,
        followUpWeeks: recommendation.followUpWeeks,
      } : null;

      // Clean patient info to remove undefined values
      const cleanPatientInfo = {
        name: report.patientInfo.name || null,
        age: report.patientInfo.age || null,
        gender: report.patientInfo.gender || null,
        date: report.patientInfo.date || null,
        weightKg: patientProfile?.weightKg ?? null,
        reportDate: patientProfile?.reportDate ?? null
      };

      // Clean patient profile data if provided
      const cleanPatientProfile = patientProfile ? {
        weightKg: patientProfile.weightKg ?? null,
        isPregnant: patientProfile.isPregnant ?? false,
        ...(patientProfile.trimester !== undefined && patientProfile.trimester !== null && { trimester: patientProfile.trimester }),
        hasHighRiskHeartDisease: patientProfile.hasHighRiskHeartDisease ?? false,
        hasLowRiskHeartDisease: patientProfile.hasLowRiskHeartDisease ?? false,
        hasOsteoporosis: patientProfile.hasOsteoporosis ?? false,
        hasAdrenalInsufficiency: patientProfile.hasAdrenalInsufficiency ?? false,
        hasGIAbsorptionIssues: patientProfile.hasGIAbsorptionIssues ?? false,
        onEstrogenTherapy: patientProfile.onEstrogenTherapy ?? false,
        hasLiverDisease: patientProfile.hasLiverDisease ?? false,
        ...(patientProfile.liverDiseaseType !== undefined && patientProfile.liverDiseaseType !== null && { liverDiseaseType: patientProfile.liverDiseaseType }),
        hasKidneyDisease: patientProfile.hasKidneyDisease ?? false,
        ...(patientProfile.kidneyDiseaseStage !== undefined && patientProfile.kidneyDiseaseStage !== null && { kidneyDiseaseStage: patientProfile.kidneyDiseaseStage }),
        ...(patientProfile.currentDose !== undefined && patientProfile.currentDose !== null && { currentDose: patientProfile.currentDose }),
        hasHypothyroidDiagnosis: patientProfile.hasHypothyroidDiagnosis ?? false,
        ...(patientProfile.symptoms && { symptoms: patientProfile.symptoms }),
        ...(patientProfile.otherIssues !== undefined && patientProfile.otherIssues !== null && { otherIssues: patientProfile.otherIssues })
      } : undefined;

      // Build a deterministic unique key based on metadata and core values
      // For manual entries, include more profile data to prevent duplicates
      const isManualEntry = !report.rawText || report.rawText.includes('Manual entry');
      const uniqueKey = isManualEntry 
        ? `${userId}|${cleanPatientInfo.date || ''}|${cleanPatientInfo.name || ''}|${testResults.TSH?.value || ''}|${Date.now()}` // Add timestamp for manual entries
        : `${userId}|${cleanPatientInfo.date || ''}|${cleanPatientInfo.name || ''}|${testResults.TSH?.value || ''}`;

      // Check for existing report with same uniqueKey to prevent duplicates
      try {
        const existingQ = query(
          collection(db, 'medicalReports'),
          where('userId', '==', userId),
          where('uniqueKey', '==', uniqueKey)
        );
        const existingSnap = await getDocs(existingQ);
        if (!existingSnap.empty) {
          return existingSnap.docs[0].id;
        }
      } catch (dupeErr) {
        console.warn('Duplicate check failed (continuing save):', dupeErr);
      }

      const reportData: Omit<StoredMedicalReport, 'id'> = {
        userId,
        uniqueKey,
        patientInfo: cleanPatientInfo,
        patientProfile: cleanPatientProfile,
        testResults,
        dosageRecommendation: cleanRecommendation,
        // Stop storing condition explicitly to avoid showing it in UI
        // condition: condition || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      console.log('Saving medical report data:', reportData);
      console.log('Data validation:', {
        hasUserId: !!reportData.userId,
        hasPatientInfo: !!reportData.patientInfo,
        hasTestResults: !!reportData.testResults,
        userId: reportData.userId,
        patientName: reportData.patientInfo?.name
      });
      
      const docRef = await addDoc(collection(db, 'medicalReports'), reportData);
      console.log('Medical report saved successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving medical report:', error);
      console.error('Error details:', {
        code: (error as any)?.code,
        message: (error as any)?.message,
        stack: (error as any)?.stack
      });
      throw new Error(`Failed to save medical report: ${(error as any)?.message || 'Unknown error'}`);
    }
  }

  static async getMedicalReports(userId: string): Promise<StoredMedicalReport[]> {
    try {
      // Temporarily remove orderBy to avoid index requirement
      const q = query(
        collection(db, 'medicalReports'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const reports = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StoredMedicalReport));
      
      // Sort in JavaScript instead of Firestore
      return reports.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime; // Descending order (newest first)
      });
    } catch (error) {
      console.error('Error getting medical reports:', error);
      throw new Error('Failed to get medical reports');
    }
  }

  static async getMedicalReport(reportId: string): Promise<StoredMedicalReport | null> {
    try {
      const docRef = doc(db, 'medicalReports', reportId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as StoredMedicalReport;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting medical report:', error);
      throw new Error('Failed to get medical report');
    }
  }

  static async updateMedicalReport(
    reportId: string, 
    updates: Partial<StoredMedicalReport>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'medicalReports', reportId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating medical report:', error);
      throw new Error('Failed to update medical report');
    }
  }

  static async deleteMedicalReport(reportId: string): Promise<void> {
    try {
      const docRef = doc(db, 'medicalReports', reportId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting medical report:', error);
      throw new Error('Failed to delete medical report');
    }
  }

  // Patient Profiles Collection
  static async savePatientProfile(
    userId: string, 
    profile: PatientProfile
  ): Promise<string> {
    try {
      const profileData: Omit<StoredPatientProfile, 'id'> = {
        userId,
        profile,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'patientProfiles'), profileData);
      return docRef.id;
    } catch (error) {
      console.error('Error saving patient profile:', error);
      throw new Error('Failed to save patient profile');
    }
  }

  static async getPatientProfiles(userId: string): Promise<StoredPatientProfile[]> {
    try {
      const q = query(
        collection(db, 'patientProfiles'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StoredPatientProfile));
    } catch (error) {
      console.error('Error getting patient profiles:', error);
      throw new Error('Failed to get patient profiles');
    }
  }

  static async updatePatientProfile(
    profileId: string, 
    updates: Partial<StoredPatientProfile>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'patientProfiles', profileId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating patient profile:', error);
      throw new Error('Failed to update patient profile');
    }
  }

  static async deletePatientProfile(profileId: string): Promise<void> {
    try {
      const docRef = doc(db, 'patientProfiles', profileId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting patient profile:', error);
      throw new Error('Failed to delete patient profile');
    }
  }

  // User Statistics
  static async getUserStats(userId: string): Promise<{
    totalReports: number;
    totalProfiles: number;
    lastReportDate?: Date;
  }> {
    try {
      const [reportsSnapshot, profilesSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'medicalReports'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'patientProfiles'), where('userId', '==', userId)))
      ]);

      const reports = reportsSnapshot.docs.map(doc => doc.data() as StoredMedicalReport);
      const lastReport = reports.length > 0 
        ? reports.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0]
        : null;

      return {
        totalReports: reportsSnapshot.size,
        totalProfiles: profilesSnapshot.size,
        lastReportDate: lastReport ? lastReport.createdAt.toDate() : undefined
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw new Error('Failed to get user statistics');
    }
  }
}
