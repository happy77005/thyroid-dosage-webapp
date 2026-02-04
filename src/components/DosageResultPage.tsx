import React from 'react';
import { PatientProfile } from '../types/medical';
import { ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';

interface DosageResultPageProps {
  profile: PatientProfile;
  dosageRecommendation: { dose: number; nearestTablet?: number; symptomAlert?: string; medicalConditionsSummary?: string; severity?: 'mild' | 'moderate' | 'severe'; followUpWeeks?: number } | null;
  medication?: 'Levothyroxine' | 'Methimazole' | null;
  onBack?: () => void;
}

export const DosageResultPage: React.FC<DosageResultPageProps> = ({ 
  profile, 
  dosageRecommendation, 
  medication,
  onBack
}) => {
  // (removed unused formatDate)

  const getTSHStatus = (tsh: number) => {
    if (tsh < 0.4) return { status: 'LOW', color: 'text-red-600', bg: 'bg-red-50' };
    if (tsh > 4.5) return { status: 'HIGH', color: 'text-red-600', bg: 'bg-red-50' };
    return { status: 'NORMAL', color: 'text-green-600', bg: 'bg-green-50' };
  };

  // (removed unused getClinicalAssessment)

  // (removed unused getClinicalReasoning)

  const tshStatus = profile.currentTSH ? getTSHStatus(profile.currentTSH) : null;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Back Button */}
      {onBack && (
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </button>
        </div>
      )}

      {/* Section 1: Thyroid Test Results & Treatment Details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-3">
          Thyroid Test Results & Treatment Detail
        </h1>

        {/* Treatment Recommendation */}
        {dosageRecommendation && (
          <div className="mb-6">
            {dosageRecommendation.dose === 0 ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                  <h3 className="text-xl font-semibold text-green-800">No Treatment Required</h3>
                </div>
                <p className="text-green-700 mb-2">
                  Patient TSH: {profile.currentTSH} mIU/L (Normal)
                </p>
                <p className="text-green-600">
                  <strong>Recommendation:</strong> {dosageRecommendation.symptomAlert || 'Monitor thyroid function periodically. No treatment needed at this time.'}
                </p>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-xl font-semibold text-blue-800 mb-3">Treatment Recommendation</h3>
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                    {medication || 'Levothyroxine'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Recommended Dose</label>
                    <p className="text-2xl font-bold text-blue-600">
                      {dosageRecommendation.dose} {medication === 'Methimazole' ? 'mg' : 'mcg'}/day
                      {dosageRecommendation.nearestTablet && medication === 'Levothyroxine' && dosageRecommendation.nearestTablet !== dosageRecommendation.dose && (
                        <span className="text-lg font-normal text-gray-600 ml-2">
                          (nearest available: {dosageRecommendation.nearestTablet} mcg tablet)
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Frequency</label>
                    <p className="text-lg font-semibold text-gray-800">
                      {medication === 'Methimazole' ? 'Once or twice daily' : 'Once daily (morning, empty stomach)'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Follow-up</label>
                    <p className="text-lg font-semibold text-gray-800">
                      {dosageRecommendation.followUpWeeks || 6} weeks
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Important Alerts */}
        {dosageRecommendation?.symptomAlert && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <h4 className="font-semibold text-yellow-800">Important Alert</h4>
            </div>
            <p className="text-yellow-700">{dosageRecommendation.symptomAlert}</p>
          </div>
        )}
      </div>

      {/* Section 2: Thyroid Test Results */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">
          Thyroid Test Results
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profile.currentTSH && (
            <div className={`p-4 rounded-lg ${tshStatus?.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-700">TSH</span>
                <span className={`text-sm font-semibold ${tshStatus?.color}`}>
                  {tshStatus?.status}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{profile.currentTSH} mIU/L</p>
              <p className="text-sm text-gray-500">Normal: 0.4-4.5 mIU/L</p>
            </div>
          )}
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700">T3</span>
              <span className="text-sm font-semibold text-gray-500">N/A</span>
            </div>
            <p className="text-2xl font-bold text-gray-400">--</p>
            <p className="text-sm text-gray-500">Normal: 80-200 ng/dL</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700">T4</span>
              <span className="text-sm font-semibold text-gray-500">N/A</span>
            </div>
            <p className="text-2xl font-bold text-gray-400">--</p>
            <p className="text-sm text-gray-500">Normal: 5.0-12.0 μg/dL</p>
          </div>
        </div>
      </div>

      
    </div>
  );
};
