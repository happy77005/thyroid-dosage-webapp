import React, { useEffect, useState } from 'react';
import { Activity, Brain, FileText, Pill, User, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from './FileUpload';
import { PatientInfo, PatientProfileForm } from './PatientInfo';
// import { DosageRecommendation } from './DosageRecommendation';
import { ReportSummary } from './ReportSummary';
import { useMedicalAnalysis } from '../hooks/useMedicalAnalysis';
import { calculateLevothyroxineDose, calculateMethimazoleDose } from '../utils/calculators/dosageCalculator';
import { DosageResultPage } from './DosageResultPage';
import SettingsPanel from './SettingsPanel';
import { useAuth } from '../hooks/useAuth';
import { DataLogger } from '../utils/dataLogger';
import { buildReportSummary, queueReportSummary, scheduleBackgroundSync } from '../utils/reportSync';
import { enqueueMedicalReport, processQueueAfterDelay, scheduleQueueProcessing } from '../utils/medicalReportQueue';
import { THYROID_REFERENCE_RANGES } from '../constants/medical.constants';

const ThyroidApp: React.FC = () => {
  const {
    isProcessing,
    error,
    report: medicalReport,
    // recommendation: dosageRecommendation,
    condition,
    analyzeFile,
    // loadReport,
    // saveReport,
    resetAnalysis,
    loadSavedReports
  } = useMedicalAnalysis();

  const { user } = useAuth();
  const navigate = useNavigate();
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileResult, setProfileResult] = useState<{
    profile: any;
    dose: { dose: number; symptomAlert?: string; severity?: 'mild' | 'moderate' | 'severe'; followUpWeeks?: number } | null;
    medication?: 'Levothyroxine' | 'Methimazole' | null;
    error?: string;
  } | null>(null);
  // Start background sync attempts when app mounts
  useEffect(() => {
    scheduleBackgroundSync();
    scheduleQueueProcessing(); // Schedule medical report queue processing
  }, []);


  // (removed unused helper getUpdatedMedicalReport)

  // Helper to generate detailed clinical reasoning
  function getDetailedClinicalReasoning(profile: any, doseResult: any) {
    const conditionsSummary = doseResult?.medicalConditionsSummary;
    if (conditionsSummary && conditionsSummary !== "None") {
      return `Personalized dose calculated based on patient profile: weight (${profile.weightKg}kg), age (${profile.age}y), gender (${profile.gender}), and comorbidities: ${conditionsSummary}.`;
    } else {
      return `Personalized dose calculated based on patient profile: weight (${profile.weightKg}kg), age (${profile.age}y), gender (${profile.gender}), and medical conditions.`;
    }
  }

  // Helper to create MedicalReport from manual form profile
  function createMedicalReportFromProfile(profile: any): import('../types/medical').MedicalReport {
    // Convert date from YYYY-MM-DD format to readable format
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
      } catch {
        return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
      }
    };

    const buildTestResult = (key: keyof typeof THYROID_REFERENCE_RANGES, value: number) => {
      const ref = THYROID_REFERENCE_RANGES[key];
      const status: 'normal' | 'high' | 'low' = value > ref.high ? 'high' : value < ref.low ? 'low' : 'normal';
      return {
        label: key,
        value,
        units: ref.units,
        refRange: { low: ref.low, high: ref.high },
        status
      };
    };

    const tests: import('../types/medical').ThyroidTests = {};

    if (profile.currentTSH != null) {
      tests.TSH = buildTestResult('TSH', profile.currentTSH);
    }
    if (profile.currentT3 != null) {
      tests.T3 = buildTestResult('T3', profile.currentT3);
    }
    if (profile.currentT4 != null) {
      tests.T4 = buildTestResult('T4', profile.currentT4);
    }
    if (profile.currentFT3 != null) {
      tests.FT3 = buildTestResult('FT3', profile.currentFT3);
    }
    if (profile.currentFT4 != null) {
      tests.FT4 = buildTestResult('FT4', profile.currentFT4);
    }

    return {
      patientInfo: {
        name: profile.name || null,
        age: profile.age,
        gender: profile.gender === 'male' ? 'Male' : profile.gender === 'female' ? 'Female' : null,
        date: formatDate(profile.reportDate)
      },
      tests,
      rawText: `Manual entry - ${profile.name || 'Patient'} - ${profile.reportDate || 'Today'}`
    };
  }

  // Prefill profile from extracted data
  const extractedProfile = medicalReport ? {
    name: medicalReport.patientInfo.name ?? '',
    age: medicalReport.patientInfo.age,
    gender: (medicalReport.patientInfo.gender?.toLowerCase() === 'female'
      ? 'female'
      : medicalReport.patientInfo.gender?.toLowerCase() === 'male'
        ? 'male'
        : null) as 'male' | 'female' | null,
    currentTSH: medicalReport.tests.TSH?.value ?? null,
    currentT3: medicalReport.tests.T3?.value ?? null,
    currentT4: medicalReport.tests.T4?.value ?? null,
    currentFT3: medicalReport.tests.FT3?.value ?? null,
    currentFT4: medicalReport.tests.FT4?.value ?? null,
    reportDate: medicalReport.patientInfo.date ?
      (() => {
        // Convert from "Jan 15, 2024" format to "2024-01-15" format for date input
        try {
          const date = new Date(medicalReport.patientInfo.date);
          return date.toISOString().split('T')[0];
        } catch {
          return new Date().toISOString().split('T')[0];
        }
      })() : new Date().toISOString().split('T')[0],
  } : {};

  // Listen for queue processing completion to reload saved reports
  useEffect(() => {
    const handleReportsSaved = () => {
      console.log('Medical reports saved, reloading saved reports...');
      loadSavedReports();
    };

    window.addEventListener('medicalReportsSaved', handleReportsSaved);

    return () => {
      window.removeEventListener('medicalReportsSaved', handleReportsSaved);
    };
  }, [loadSavedReports]);



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Activity className="h-8 w-8 text-blue-600" />
                <Brain className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  ThyroidAI
                </h1>
                <p className="text-gray-600 mt-1">
                  AI-powered medical report analysis and treatment recommendations
                </p>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 px-4 py-2 text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Dashboard</span>
              </button>
              <div className="flex items-center space-x-2 text-gray-600">
                <User className="h-5 w-5" />
                <span className="text-sm">{user?.email}</span>
              </div>
              <SettingsPanel />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!medicalReport && !showProfileForm ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <FileUpload
              onFileSelect={analyzeFile}
              isProcessing={isProcessing}
              error={error}
            />
            <button
              className="mt-6 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              onClick={() => setShowProfileForm(true)}
            >
              Add Manual Profile
            </button>

            <div className="mt-12 max-w-4xl text-center">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                How it works
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-lg shadow-sm">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Upload PDF</h3>
                  <p className="text-gray-600 text-sm">
                    Upload your thyroid function test report in PDF format
                  </p>
                </div>

                <div className="p-6 bg-white rounded-lg shadow-sm">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Brain className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">AI Analysis</h3>
                  <p className="text-gray-600 text-sm">
                    Our AI extracts and analyzes TSH, T3, T4 values automatically
                  </p>
                </div>

                <div className="p-6 bg-white rounded-lg shadow-sm">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Pill className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">Get Recommendations</h3>
                  <p className="text-gray-600 text-sm">
                    Receive personalized dosage recommendations and treatment plans
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          profileResult ? (
            <DosageResultPage
              profile={profileResult.profile}
              dosageRecommendation={profileResult.dose}
              medication={profileResult.medication}
              onBack={() => {
                setProfileResult(null);
              }}
            />
          ) : (
            <PatientProfileForm
              initialProfile={extractedProfile}
              userId={user?.uid ?? null}
              userCreatedAt={user?.metadata?.creationTime ?? null}
              onSubmit={async (profile) => {
                try {
                  // Route to appropriate calculation based on TSH
                  let doseObj: import('../types/medical').DosageResult | null = null;
                  let medication: 'Levothyroxine' | 'Methimazole' | null = null;

                  if (profile.currentTSH != null) {
                    if (profile.currentTSH <= 0.1) {
                      // Hyperthyroidism - calculate methimazole
                      doseObj = calculateMethimazoleDose(profile);

                      // Check if hormone data is required but missing
                      if (doseObj.requiresHormoneData) {
                        const missingFields = doseObj.missingHormoneFields?.join(', ') || 'FT3, FT4, T3, T4';
                        throw new Error(`Missing hormone values for hyperthyroidism calculation. Please enter either Free T3 & Free T4, OR Total T3 & Total T4. Missing: ${missingFields}`);
                      }

                      medication = 'Methimazole';
                    } else if (profile.currentTSH > 4.5) {
                      // Hypothyroidism - calculate levothyroxine
                      doseObj = calculateLevothyroxineDose(profile);
                      medication = 'Levothyroxine';
                    } else {
                      // TSH 0.2-4.5: Check if hormones are normal
                      const ft4Ref = THYROID_REFERENCE_RANGES.FT4;
                      const ft3Ref = THYROID_REFERENCE_RANGES.FT3;
                      const t4Ref = THYROID_REFERENCE_RANGES.T4;
                      const t3Ref = THYROID_REFERENCE_RANGES.T3;

                      const hasFreeHormones = profile.currentFT4 != null && profile.currentFT3 != null;
                      const hasTotalHormones = profile.currentT4 != null && profile.currentT3 != null;

                      let hormonesNormal = true;

                      if (hasFreeHormones) {
                        const ft4 = profile.currentFT4!;
                        const ft3 = profile.currentFT3!;
                        hormonesNormal = (ft4 >= ft4Ref.low && ft4 <= ft4Ref.high) &&
                          (ft3 >= ft3Ref.low && ft3 <= ft3Ref.high);
                      } else if (hasTotalHormones) {
                        const t4 = profile.currentT4!;
                        const t3 = profile.currentT3!;
                        hormonesNormal = (t4 >= t4Ref.low && t4 <= t4Ref.high) &&
                          (t3 >= t3Ref.low && t3 <= t3Ref.high);
                      }

                      if (hormonesNormal) {
                        // No treatment required - TSH and hormones are normal
                        doseObj = {
                          dose: 0,
                          symptomAlert: `TSH (${profile.currentTSH} mIU/L) and hormone levels are within normal range. No treatment required.`,
                          alerts: [`TSH (${profile.currentTSH} mIU/L) and hormone levels are within normal range. No treatment required.`]
                        };
                        medication = null;
                      } else {
                        // Hormones abnormal but TSH normal - calculate based on hormone levels
                        // If FT4/FT3 or T4/T3 are high, might need methimazole
                        // If low, might need levothyroxine
                        const useFreeHormones = hasFreeHormones;
                        const ft4Value = profile.currentFT4;
                        const ft3Value = profile.currentFT3;
                        const t4Value = profile.currentT4;
                        const t3Value = profile.currentT3;

                        const ft4ULN = useFreeHormones ? ft4Ref.high : t4Ref.high;
                        const ft3ULN = useFreeHormones ? ft3Ref.high : t3Ref.high;
                        const currentFT4 = useFreeHormones ? ft4Value : t4Value;
                        const currentFT3 = useFreeHormones ? ft3Value : t3Value;

                        const isHyperthyroid = (currentFT4 != null && currentFT4 > ft4ULN) ||
                          (currentFT3 != null && currentFT3 > ft3ULN);

                        if (isHyperthyroid) {
                          doseObj = calculateMethimazoleDose(profile);
                          medication = 'Methimazole';
                        } else {
                          // Likely hypothyroid based on low hormones
                          doseObj = calculateLevothyroxineDose(profile);
                          medication = 'Levothyroxine';
                        }
                      }
                    }
                  } else {
                    // No TSH - cannot determine treatment
                    doseObj = {
                      dose: 0,
                      symptomAlert: 'TSH value is required to determine appropriate treatment.',
                      alerts: ['TSH value is required to determine appropriate treatment.']
                    };
                    medication = null;
                  }

                  // Log calculation to localStorage
                  DataLogger.logCalculation(profile, doseObj);

                  // Create MedicalReport from profile for saving to Firestore
                  const reportDate = profile.reportDate ?
                    (() => {
                      try {
                        const date = new Date(profile.reportDate);
                        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
                      } catch {
                        return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
                      }
                    })() : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });

                  const medicalReportFromProfile: import('../types/medical').MedicalReport = createMedicalReportFromProfile(profile);

                  // Create dosage recommendation for saving
                  const dosageRecommendation: import('../types/medical').DosageRecommendation | null = doseObj && medication ? {
                    medication: medication,
                    dosage: doseObj.dose,
                    unit: medication === 'Methimazole' ? 'mg' : 'mcg',
                    frequency: medication === 'Methimazole' ? 'Once or twice daily' : 'Once daily (morning, empty stomach)',
                    reasoning: doseObj.symptomAlert || getDetailedClinicalReasoning(profile, doseObj),
                    severity: doseObj.severity || 'mild',
                    followUpWeeks: doseObj.followUpWeeks || 6
                  } : null;

                  // Queue data for async save (no delay - display results immediately)
                  if (user) {
                    try {
                      console.log('Queuing patient form data for async save...');
                      enqueueMedicalReport(
                        medicalReportFromProfile,
                        dosageRecommendation,
                        profile // Pass full patient profile with all checkbox data
                      );

                      // Process queue after a short delay to allow UI to render first
                      processQueueAfterDelay(1500); // 1.5 seconds delay
                    } catch (queueError) {
                      console.error('Failed to queue data:', queueError);
                      // Continue with the calculation even if queue fails
                    }
                  }

                  // Queue lightweight summary for offline-first storage
                  try {
                    if (medicalReport) {
                      const summary = buildReportSummary(medicalReport, dosageRecommendation, { weightKg: profile.weightKg ?? null });
                      queueReportSummary(summary);
                    } else {
                      // For manual form entries, create a lightweight summary
                      const manualSummary = {
                        id: `manual_${Date.now()}`,
                        userId: user?.uid || '',
                        reportDate,
                        generatedAt: new Date().toISOString(),
                        name: profile.name || 'Manual Entry',
                        age: profile.age,
                        weightKg: profile.weightKg,
                        TSH: profile.currentTSH,
                        T3: profile.currentT3 ?? null,
                        T4: profile.currentT4 ?? null,
                        FT3: profile.currentFT3 ?? null,
                        FT4: profile.currentFT4 ?? null,
                        recommendedDose: doseObj?.dose || 0
                      };
                      queueReportSummary(manualSummary);
                    }
                  } catch (queueError) {
                    console.warn('Failed to queue report summary:', queueError);
                  }

                  // Log to Firestore if user is authenticated (additional logging)
                  if (user) {
                    try {
                      await DataLogger.logToFirestore(user.uid, profile, doseObj);
                    } catch (firestoreError) {
                      console.warn('Failed to log to Firestore:', firestoreError);
                      // Continue with the calculation even if Firestore logging fails
                    }
                  }

                  setProfileResult({ profile, dose: doseObj, medication: medication || null });

                  // Scroll to top of the page after successful calculation
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } catch (e: any) {
                  // Set the result with error but also re-throw to prevent counter decrement
                  setProfileResult({ profile, dose: null, error: e.message });

                  // Scroll to top of the page to show error message
                  window.scrollTo({ top: 0, behavior: 'smooth' });

                  throw e; // Re-throw the error so the counter is not decremented
                }
              }}
              onBack={() => {
                setShowProfileForm(false);
                resetAnalysis();
              }}
            />
          )
        )}

        {/* Display Results - Only show after form submission */}
        {profileResult && (
          <div className="space-y-6">
            {/* Patient Information centered below */}
            <div className="max-w-4xl mx-auto">
              <PatientInfo
                patientInfo={medicalReport?.patientInfo || {
                  name: profileResult.profile.name,
                  age: profileResult.profile.age,
                  gender: profileResult.profile.gender === 'male' ? 'Male' : profileResult.profile.gender === 'female' ? 'Female' : null,
                  date: profileResult.profile.reportDate
                }}
                onBack={() => {
                  setProfileResult(null);
                }}
              />
            </div>



            {/* Removed bottom Test Results card per request */}

            {/* Analysis Summary */}
            <ReportSummary
              report={createMedicalReportFromProfile(profileResult.profile)}
              recommendation={profileResult?.dose ? ({
                medication: 'Levothyroxine',
                dosage: profileResult.dose.dose,
                unit: 'mcg',
                frequency: 'Once daily (morning, empty stomach)',
                reasoning: `Personalized dose calculated based on patient profile: weight (${profileResult.profile.weightKg}kg), age (${profileResult.profile.age}y), gender (${profileResult.profile.gender}), and medical conditions.`,
                severity: 'mild',
                followUpWeeks: 6
              } as import('../types/medical').DosageRecommendation) : null}
              condition={condition}
            />

            {/* Action buttons hidden per request; underlying functions retained */}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="text-sm">
              <strong>Disclaimer:</strong> This tool is for educational and research purposes only.
              Always consult with qualified healthcare professionals for medical decisions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ThyroidApp;
