import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Calendar, User, ArrowLeft, Pill, RefreshCw, AlertCircle } from 'lucide-react';
import { FirestoreService, StoredMedicalReport } from '../services/FirestoreService';
import { useAuth } from '../hooks/useAuth';

interface SavedReportsProps {
  onBack?: () => void;
}

export const SavedReports: React.FC<SavedReportsProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<StoredMedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Directly fetch from Firestore to avoid state isolation issues
  const loadReports = useCallback(async () => {
    if (!user) {
      setError('Please sign in to view your saved reports');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('SavedReports: Fetching reports for user:', user.uid);
      const fetchedReports = await FirestoreService.getMedicalReports(user.uid);
      console.log('SavedReports: Fetched', fetchedReports.length, 'reports');
      setReports(fetchedReports);
    } catch (err) {
      console.error('SavedReports: Error fetching reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Merge with local reports for offline support
  const mergeLocalReports = (cloudReports: StoredMedicalReport[]): StoredMedicalReport[] => {
    try {
      const local = JSON.parse(localStorage.getItem('saved_reports_local') || '[]');
      // Filter out local reports that now exist in cloud (by uniqueKey or id)
      const cloudIds = new Set(cloudReports.map(r => r.id));
      const cloudKeys = new Set(cloudReports.map(r => r.uniqueKey).filter(Boolean));
      const filteredLocal = local.filter((r: any) =>
        !cloudIds.has(r.id) && (!r.uniqueKey || !cloudKeys.has(r.uniqueKey))
      );
      return [...filteredLocal.map((r: any) => ({ ...r, isLocal: true })), ...cloudReports];
    } catch {
      return cloudReports;
    }
  };

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Listen for new reports being saved
  useEffect(() => {
    const handleReportsSaved = () => {
      console.log('SavedReports: medicalReportsSaved event received, refreshing...');
      loadReports();
    };

    window.addEventListener('medicalReportsSaved', handleReportsSaved);
    return () => window.removeEventListener('medicalReportsSaved', handleReportsSaved);
  }, [loadReports]);

  const handleRefresh = () => {
    console.log('SavedReports: Manual refresh triggered');
    loadReports();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Unknown';
    }
  };

  const renderTestResults = (testResults: any) => {
    if (!testResults) return <span className="text-gray-500">No test data</span>;

    const testItems = [];
    if (testResults.TSH) testItems.push(`TSH: ${testResults.TSH.value} ${testResults.TSH.units || 'mIU/L'}`);
    if (testResults.T3) testItems.push(`T3: ${testResults.T3.value} ${testResults.T3.units || 'ng/dl'}`);
    if (testResults.T4) testItems.push(`T4: ${testResults.T4.value} ${testResults.T4.units || 'μg/dl'}`);
    if (testResults.FT3) testItems.push(`FT3: ${testResults.FT3.value} ${testResults.FT3.units || 'pg/ml'}`);
    if (testResults.FT4) testItems.push(`FT4: ${testResults.FT4.value} ${testResults.FT4.units || 'ng/dl'}`);

    return (
      <div className="text-sm text-gray-600">
        {testItems.length > 0 ? testItems.join(' • ') : 'No test data'}
      </div>
    );
  };

  const renderDosageRecommendation = (recommendation: any) => {
    if (!recommendation) return <span className="text-gray-500">No recommendation</span>;

    const dosage = recommendation.dosage ?? recommendation.dose;
    const medication = recommendation.medication || (dosage > 0 ? 'Levothyroxine' : '');
    const unit = recommendation.unit || 'mcg';

    if (!dosage || dosage === 0) {
      return <span className="text-gray-500">No medication required</span>;
    }

    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Pill className="h-4 w-4 text-blue-500" />
        <span>
          {medication}: {Math.round(Number(dosage))} {unit}
        </span>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Saved Reports
          </h2>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </button>
          )}
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading saved reports...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Saved Reports
          </h2>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </button>
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="flex items-center text-red-600 mb-4">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  const combined = mergeLocalReports(reports);

  // Empty state
  if (combined.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Saved Reports
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Go Back</span>
              </button>
            )}
          </div>
        </div>
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No saved reports yet.</p>
          <p className="text-gray-400 text-sm mt-1">Upload and analyze a PDF to get started.</p>
        </div>
      </div>
    );
  }

  // Reports list
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          Saved Reports ({combined.length})
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {combined.map((report) => (
          <div
            key={report.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="space-y-3">
              {/* Patient Name and Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-gray-800">
                  <User className="h-4 w-4" />
                  <span className="font-medium text-lg">
                    {report.patientInfo?.name || 'Unknown Patient'}
                  </span>
                  {(report as any).isLocal && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                      Pending sync
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {formatDate(report.createdAt)}
                  </span>
                </div>
              </div>

              {/* Age, Gender, Weight, Report Date */}
              <div className="text-sm text-gray-600">
                <span className="font-medium">Age:</span> {report.patientInfo?.age || 'N/A'} years
                <span className="mx-2">•</span>
                <span className="font-medium">Gender:</span> {report.patientInfo?.gender || 'N/A'}
                {report.patientInfo?.weightKg && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="font-medium">Weight:</span> {report.patientInfo.weightKg} kg
                  </>
                )}
                {report.patientInfo?.reportDate && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="font-medium">Report Date:</span> {report.patientInfo.reportDate}
                  </>
                )}
              </div>

              {/* Patient Profile - Medical Conditions */}
              {report.patientProfile && (
                <div className="mt-2">
                  <span className="font-medium text-sm text-gray-700">Medical Conditions:</span>
                  <div className="mt-1 text-sm text-gray-600">
                    {(() => {
                      const profile = report.patientProfile;
                      const conditions: string[] = [];
                      if (profile.isPregnant) conditions.push(`Pregnant${profile.trimester ? ` (Trimester ${profile.trimester})` : ''}`);
                      if (profile.hasHighRiskHeartDisease) conditions.push('High-risk heart disease');
                      if (profile.hasLowRiskHeartDisease) conditions.push('Low-risk heart disease');
                      if (profile.hasOsteoporosis) conditions.push('Osteoporosis');
                      if (profile.hasAdrenalInsufficiency) conditions.push('Adrenal insufficiency');
                      if (profile.hasGIAbsorptionIssues) conditions.push('GI absorption issues');
                      if (profile.onEstrogenTherapy) conditions.push('Estrogen therapy');
                      if (profile.hasLiverDisease) conditions.push(`Liver disease${profile.liverDiseaseType ? ` (${profile.liverDiseaseType})` : ''}`);
                      if (profile.hasKidneyDisease) conditions.push(`Kidney disease${profile.kidneyDiseaseStage ? ` (${profile.kidneyDiseaseStage})` : ''}`);
                      if (profile.hasHypothyroidDiagnosis) conditions.push('Hypothyroidism diagnosis');
                      return conditions.length > 0 ? conditions.join(' • ') : 'None';
                    })()}
                  </div>
                  {report.patientProfile.otherIssues && (
                    <div className="mt-1 text-sm text-gray-600">
                      <span className="font-medium">Other Issues:</span> {report.patientProfile.otherIssues}
                    </div>
                  )}
                </div>
              )}

              {/* Test Results */}
              <div className="mt-2">
                <span className="font-medium text-sm text-gray-700">Test Results:</span>
                <div className="mt-1">
                  {renderTestResults(report.testResults)}
                </div>
              </div>

              {/* Dosage Recommendation */}
              <div className="mt-2">
                <span className="font-medium text-sm text-gray-700">Recommended Dosage:</span>
                <div className="mt-1">
                  {renderDosageRecommendation(report.dosageRecommendation)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
