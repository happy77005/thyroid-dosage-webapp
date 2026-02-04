import React, { useState, useEffect } from 'react';
import { User, Calendar, Users, ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { PatientInfo as PatientInfoType, PatientProfile } from '../types/medical';
import { DailyLimitManager } from '../utils/dailyLimit';

interface PatientInfoProps {
  patientInfo: PatientInfoType;
  onBack?: () => void;
}

export const PatientInfo: React.FC<PatientInfoProps> = ({ patientInfo, onBack }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <User className="h-5 w-5 mr-2 text-blue-600" />
          Patient Information
        </h2>
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Home"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="border-b border-gray-200 mb-4" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center space-x-3">
          <User className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium text-gray-800">
              {patientInfo.name || 'Not specified'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Calendar className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">Age</p>
            <p className="font-medium text-gray-800">
              {patientInfo.age ? `${patientInfo.age} years` : 'Not specified'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Users className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">Gender</p>
            <p className="font-medium text-gray-800">
              {patientInfo.gender || 'Not specified'}
            </p>
          </div>
        </div>
      </div>
      
      {patientInfo.date && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Report Date</p>
              <p className="font-medium text-gray-800">{patientInfo.date}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface PatientProfileFormProps {
  initialProfile: Partial<PatientProfile>;
  onSubmit: (profile: PatientProfile) => void;
  onBack?: () => void;
  userId: string | null;
  userCreatedAt?: string | null;
}

const defaultProfile: PatientProfile = {
  age: null,
  weightKg: null,
  gender: 'female',
  isPregnant: false,
  trimester: null,
  hasHighRiskHeartDisease: false,
  hasLowRiskHeartDisease: false,
  hasOsteoporosis: false,
  hasAdrenalInsufficiency: false,
  hasGIAbsorptionIssues: false,
  onEstrogenTherapy: false,
  hasLiverDisease: false,
  liverDiseaseType: null,
  hasKidneyDisease: false,
  kidneyDiseaseStage: null,
  currentTSH: null,
  currentT3: null,
  currentT4: null,
  currentFT3: null,
  currentFT4: null,
  currentDose: null,
  hasHypothyroidDiagnosis: false,
  reportDate: new Date().toISOString().split('T')[0], // Default to today in YYYY-MM-DD format
};

export const PatientProfileForm: React.FC<PatientProfileFormProps> = ({ initialProfile, onSubmit, onBack, userId, userCreatedAt }) => {
  const [profile, setProfile] = useState<PatientProfile>({
    ...defaultProfile,
    ...initialProfile,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [entryLimitStatus, setEntryLimitStatus] = useState<{
    allowed: boolean;
    remainingEntries: number;
    lastEntryTime?: string;
    registrationDate?: string;
    cycleStart?: string;
    cycleEnd?: string;
  } | null>(null);

  // Check daily limit on component mount
  useEffect(() => {
    if (!userId) return;
    const limitStatus = DailyLimitManager.canMakeEntry(userId, userCreatedAt ?? null);
    setEntryLimitStatus(limitStatus);
  }, [userId, userCreatedAt]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setProfile((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      const newValue = value === '' ? null : (type === 'number' ? Number(value) : value);
      setProfile((prev) => ({
        ...prev,
        [name]: newValue,
      }));
      
      // Clear hormone-related errors when values are entered
      if (name === 'currentTSH' || name === 'currentFT3' || name === 'currentFT4' || name === 'currentT3' || name === 'currentT4') {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.hormones;
          delete newErrors.currentFT3;
          delete newErrors.currentFT4;
          delete newErrors.currentT3;
          delete newErrors.currentT4;
          return newErrors;
        });
      }
    }
  };

  const handleSymptomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    const symptomKey = name.replace('symptoms.', '');
    setProfile((prev) => ({
      ...prev,
      symptoms: {
        ...prev.symptoms,
        [symptomKey]: checked,
      },
    }));
  };

  // Validate required fields
  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!profile.name || profile.name.trim() === '') newErrors.name = 'Name is required';
    if (profile.age == null) newErrors.age = 'Age is required';
    if (profile.weightKg == null) newErrors.weightKg = 'Weight is required';
    if (!profile.gender) newErrors.gender = 'Gender is required';
    
    // Validate weight range (0-250 kg)
    if (profile.weightKg != null && (profile.weightKg < 0 || profile.weightKg > 250)) {
      newErrors.weightKg = 'Wrong information/Invalid data';
    }
    
    // Validate age range (5-150 years)
    if (profile.age != null && (profile.age < 5 || profile.age > 150)) {
      newErrors.age = 'Wrong information/Invalid data';
    }
    
    // Validate TSH is provided
    if (profile.currentTSH == null) {
      newErrors.currentTSH = 'TSH value is required';
    }
    
    // If TSH <= 0.1, require hormone values for methimazole calculation
    if (profile.currentTSH != null && profile.currentTSH <= 0.1) {
      const hasFreeHormones = profile.currentFT3 != null && profile.currentFT4 != null;
      const hasTotalHormones = profile.currentT3 != null && profile.currentT4 != null;
      
      if (!hasFreeHormones && !hasTotalHormones) {
        // Check which set is partially filled to give specific error
        const hasPartialFree = (profile.currentFT3 != null && profile.currentFT4 == null) || 
                               (profile.currentFT3 == null && profile.currentFT4 != null);
        const hasPartialTotal = (profile.currentT3 != null && profile.currentT4 == null) || 
                                (profile.currentT3 == null && profile.currentT4 != null);
        
        if (hasPartialFree) {
          newErrors.hormones = 'Please enter both Free T3 and Free T4 values, OR both Total T3 and Total T4 values.';
          if (profile.currentFT3 == null) newErrors.currentFT3 = 'Free T3 is required when Free T4 is provided';
          if (profile.currentFT4 == null) newErrors.currentFT4 = 'Free T4 is required when Free T3 is provided';
        } else if (hasPartialTotal) {
          newErrors.hormones = 'Please enter both Total T3 and Total T4 values, OR both Free T3 and Free T4 values.';
          if (profile.currentT3 == null) newErrors.currentT3 = 'Total T3 is required when Total T4 is provided';
          if (profile.currentT4 == null) newErrors.currentT4 = 'Total T4 is required when Total T3 is provided';
        } else {
          newErrors.hormones = 'Please enter either Free T3 & Free T4, OR Total T3 & Total T4 to calculate methimazole dose.';
        }
      }
    }
    
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check daily limit first
    if (!userId) {
      setErrors({
        dailyLimit: 'User details unavailable. Please sign in again.'
      });
      return;
    }

    if (entryLimitStatus && !entryLimitStatus.allowed) {
      setErrors({ 
        dailyLimit: `Monthly limit reached. You have used all allotted entries this month. Last entry: ${entryLimitStatus.lastEntryTime ? new Date(entryLimitStatus.lastEntryTime).toLocaleString() : 'Unknown'}` 
      });
      return;
    }
    
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      setIsProcessing(true);
      
      try {
        // Call onSubmit first to process the dosage calculation
        await onSubmit(profile);
        
        // Only record the entry in daily limit AFTER successful processing
        DailyLimitManager.recordEntry(userId);
        
        // Update entry limit status
        const updatedStatus = DailyLimitManager.canMakeEntry(userId, userCreatedAt ?? null);
        setEntryLimitStatus(updatedStatus);
        
      } catch (error) {
        console.error('Error submitting profile:', error);
        // Don't decrement counter if processing failed
      } finally {
        setIsProcessing(false);
      }
    }
  };

    return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded shadow">
      {/* Back Button */}
      {onBack && (
        <div className="mb-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Upload
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Entry Limit Warning */}
        {entryLimitStatus && (
          <div className={`px-4 py-3 rounded-lg flex items-center space-x-2 ${
            entryLimitStatus.allowed 
              ? 'bg-blue-50 border border-blue-200 text-blue-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              {entryLimitStatus.allowed ? (
                <span>Manual entries remaining this month: {entryLimitStatus.remainingEntries} (limit 2)</span>
              ) : (
                <span>Monthly limit reached. You can submit again next month.</span>
              )}
            </div>
          </div>
        )}

        {/* Patient Profile Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-2">
              Name <span className="text-red-600">*</span>
            </label>
            <input type="text" name="name" value={profile.name ?? ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            {errors.name && <div className="text-red-600 text-sm mt-1">{errors.name}</div>}
          </div>

          
          
          <div>
            <label className="block font-semibold mb-2">
              Weight (kg) <span className="text-red-600">*</span>
            </label>
            <input type="number" name="weightKg" value={profile.weightKg ?? ''} onChange={handleChange} className="w-full border rounded px-3 py-2" min={0} max={250} />
            {errors.weightKg && <div className="text-red-600 text-sm mt-1">{errors.weightKg}</div>}
          </div>
          
          <div>
            <label className="block font-semibold mb-2">
              Age <span className="text-red-600">*</span>
            </label>
            <input type="number" name="age" value={profile.age ?? ''} onChange={handleChange} className="w-full border rounded px-3 py-2" min={5} max={150} />
            {errors.age && <div className="text-red-600 text-sm mt-1">{errors.age}</div>}
          </div>
          
          <div>
            <label className="block font-semibold mb-2">
              Gender <span className="text-red-600">*</span>
            </label>
            <select name="gender" value={profile.gender ?? ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            {errors.gender && <div className="text-red-600 text-sm mt-1">{errors.gender}</div>}
          </div>
          
          <div>
            <label className="block font-semibold mb-2">
              Report Date
            </label>
            <input 
              type="date" 
              name="reportDate" 
              value={profile.reportDate || ''} 
              onChange={(e) => {
                const dateValue = e.target.value;
                setProfile(prev => ({
                  ...prev,
                  reportDate: dateValue || null
                }));
              }}
              className="w-full border rounded px-3 py-2" 
            />
            <p className="text-sm text-gray-600 mt-1">Date of the thyroid function test (if applicable)</p>
          </div>
          
          <div>
            <label className="block font-semibold mb-2">
              Current TSH <span className="text-red-500">*</span>
            </label>
            <input 
              type="number" 
              name="currentTSH" 
              value={profile.currentTSH ?? ''} 
              onChange={handleChange} 
              className={`w-full border rounded px-3 py-2 ${errors.currentTSH ? 'border-red-500' : ''}`} 
              step="0.01" 
            />
            {errors.currentTSH && <div className="text-red-600 text-sm mt-1">{errors.currentTSH}</div>}
          </div>
          
          {/* Hormone validation message when TSH <= 0.1 */}
          {profile.currentTSH != null && profile.currentTSH <= 0.1 && (
            <div className="col-span-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800 mb-1">
                    Hormone values required for methimazole calculation
                  </p>
                  <p className="text-sm text-yellow-700">
                    Please enter either <strong>Free T3 & Free T4</strong>, OR <strong>Total T3 & Total T4</strong>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {errors.hormones && (
            <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{errors.hormones}</p>
            </div>
          )}
          
          <div>
            <label className="block font-semibold mb-2">
              Total T3 (ng/dL) 
              {profile.currentTSH != null && profile.currentTSH <= 0.1 && (
                <span className="text-red-500">*</span>
              )}
              {!(profile.currentTSH != null && profile.currentTSH <= 0.1) && (
                <span className="text-gray-500 text-sm font-normal">(optional)</span>
              )}
            </label>
            <input
              type="number"
              name="currentT3"
              value={profile.currentT3 ?? ''}
              onChange={handleChange}
              className={`w-full border rounded px-3 py-2 ${errors.currentT3 ? 'border-red-500' : ''}`}
              step="0.1"
            />
            {errors.currentT3 && <div className="text-red-600 text-sm mt-1">{errors.currentT3}</div>}
          </div>
          
          <div>
            <label className="block font-semibold mb-2">
              Total T4 (µg/dL) 
              {profile.currentTSH != null && profile.currentTSH <= 0.1 && (
                <span className="text-red-500">*</span>
              )}
              {!(profile.currentTSH != null && profile.currentTSH <= 0.1) && (
                <span className="text-gray-500 text-sm font-normal">(optional)</span>
              )}
            </label>
            <input
              type="number"
              name="currentT4"
              value={profile.currentT4 ?? ''}
              onChange={handleChange}
              className={`w-full border rounded px-3 py-2 ${errors.currentT4 ? 'border-red-500' : ''}`}
              step="0.1"
            />
            {errors.currentT4 && <div className="text-red-600 text-sm mt-1">{errors.currentT4}</div>}
          </div>
          
          <div>
            <label className="block font-semibold mb-2">
              Free T3 (pg/mL) 
              {profile.currentTSH != null && profile.currentTSH <= 0.1 && (
                <span className="text-red-500">*</span>
              )}
              {!(profile.currentTSH != null && profile.currentTSH <= 0.1) && (
                <span className="text-gray-500 text-sm font-normal">(optional)</span>
              )}
            </label>
            <input
              type="number"
              name="currentFT3"
              value={profile.currentFT3 ?? ''}
              onChange={handleChange}
              className={`w-full border rounded px-3 py-2 ${errors.currentFT3 ? 'border-red-500' : ''}`}
              step="0.01"
            />
            {errors.currentFT3 && <div className="text-red-600 text-sm mt-1">{errors.currentFT3}</div>}
          </div>
          
          <div>
            <label className="block font-semibold mb-2">
              Free T4 (ng/dL) 
              {profile.currentTSH != null && profile.currentTSH <= 0.1 && (
                <span className="text-red-500">*</span>
              )}
              {!(profile.currentTSH != null && profile.currentTSH <= 0.1) && (
                <span className="text-gray-500 text-sm font-normal">(optional)</span>
              )}
            </label>
            <input
              type="number"
              name="currentFT4"
              value={profile.currentFT4 ?? ''}
              onChange={handleChange}
              className={`w-full border rounded px-3 py-2 ${errors.currentFT4 ? 'border-red-500' : ''}`}
              step="0.01"
            />
            {errors.currentFT4 && <div className="text-red-600 text-sm mt-1">{errors.currentFT4}</div>}
          </div>
          
          <div>
            <label className="block font-semibold mb-2">
              Dosage Before Report (mcg)
            </label>
            <input type="number" name="currentDose" value={profile.currentDose ?? ''} onChange={handleChange} className="w-full border rounded px-3 py-2" min={0} />
          </div>
        </div>

        {/* Other Issues */}
        <div>
          <label className="block font-semibold mb-2">Other Issues</label>
          <textarea name="otherIssues" value={profile.otherIssues ?? ''} onChange={handleChange} className="w-full border rounded px-3 py-2" rows={3} />
        </div>

        {/* Recent Symptoms Section */}
        <fieldset className="mt-6 mb-4">
          <legend className="font-semibold mb-4 text-lg">Recent Symptoms</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center p-2 rounded hover:bg-gray-50">
              <input type="checkbox" name="symptoms.headache" checked={profile.symptoms?.headache ?? false} onChange={handleSymptomChange} className="mr-3" />
              Headache
            </label>
            <label className="flex items-center p-2 rounded hover:bg-gray-50">
              <input type="checkbox" name="symptoms.anxiousOrRestless" checked={profile.symptoms?.anxiousOrRestless ?? false} onChange={handleSymptomChange} className="mr-3" />
              Anxiety, restlessness, or irritability
            </label>
          </div>
        </fieldset>

        {/* Other Factors Section */}
        <div className="mt-6">
          <h3 className="font-semibold mb-4 text-lg">Other Factors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center p-2 rounded hover:bg-gray-50">
              <input type="checkbox" name="isPregnant" checked={profile.isPregnant} onChange={handleChange} className="mr-3" />
              Pregnant?
            </label>
            {profile.isPregnant && (
              <div className="md:col-span-2">
                <label className="block font-semibold mb-2">
                  Trimester:
                </label>
                <select name="trimester" value={profile.trimester ?? ''} onChange={handleChange} className="w-full md:w-48 border rounded px-3 py-2">
                  <option value="">Select</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
            )}
            
            {/* Heart Disease Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-3 text-md">Heart Disease</h4>
              <div className="space-y-2">
                <label className="flex items-center p-2 rounded hover:bg-gray-50">
                  <input type="checkbox" name="hasHighRiskHeartDisease" checked={profile.hasHighRiskHeartDisease ?? false} onChange={handleChange} className="mr-3" />
                  <div>
                    <div className="font-medium">High-risk heart disease</div>
                    <div className="text-sm text-gray-600">Do you have any of the following: Atrial fibrillation, severe heart failure, ischemic heart disease, post-MI, or unstable CAD?</div>
                  </div>
                </label>
                <label className="flex items-center p-2 rounded hover:bg-gray-50">
                  <input type="checkbox" name="hasLowRiskHeartDisease" checked={profile.hasLowRiskHeartDisease ?? false} onChange={handleChange} className="mr-3" />
                  <div>
                    <div className="font-medium">Low-risk heart disease</div>
                    <div className="text-sm text-gray-600">Do you have any of the following: mild valvular disease, stable CAD without symptoms, or mild hypertension?</div>
                  </div>
                </label>
              </div>
            </div>
            
            <label className="flex items-center p-2 rounded hover:bg-gray-50">
              <input type="checkbox" name="hasOsteoporosis" checked={profile.hasOsteoporosis} onChange={handleChange} className="mr-3" />
              Osteoporosis?
            </label>
            <label className="flex items-center p-2 rounded hover:bg-gray-50">
              <input type="checkbox" name="hasAdrenalInsufficiency" checked={profile.hasAdrenalInsufficiency} onChange={handleChange} className="mr-3" />
              Adrenal Insufficiency?
            </label>
            <label className="flex items-center p-2 rounded hover:bg-gray-50">
              <input type="checkbox" name="hasGIAbsorptionIssues" checked={profile.hasGIAbsorptionIssues} onChange={handleChange} className="mr-3" />
              GI Absorption Issues?
            </label>
            <label className="flex items-center p-2 rounded hover:bg-gray-50">
              <input type="checkbox" name="onEstrogenTherapy" checked={profile.onEstrogenTherapy} onChange={handleChange} className="mr-3" />
              On Estrogen Therapy?
            </label>
            {/* Liver Disease Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-3 text-md">Liver Disease</h4>
              <div className="space-y-2">
                <label className="flex items-center p-2 rounded hover:bg-gray-50">
                  <input type="checkbox" name="hasLiverDisease" checked={profile.hasLiverDisease ?? false} onChange={handleChange} className="mr-3" />
                  <div>
                    <div className="font-medium">Liver Disease</div>
                  </div>
                </label>
                {profile.hasLiverDisease && (
                  <div className="ml-6">
                    <label className="block font-semibold mb-2">
                      Liver Disease Type:
                    </label>
                    <select name="liverDiseaseType" value={profile.liverDiseaseType ?? ''} onChange={handleChange} className="w-full md:w-64 border rounded px-3 py-2">
                      <option value="">Select type</option>
                      <option value="cirrhosis">Cirrhosis</option>
                      <option value="cholestatic">Cholestatic liver disease</option>
                      <option value="nafld">NAFLD (Non-alcoholic fatty liver disease)</option>
                      <option value="hepatitis">Hepatitis</option>
                      <option value="post_transplant">Post-liver transplant</option>
                      <option value="other">Other/Unspecified</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Kidney Disease Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-3 text-md">Kidney Disease</h4>
              <div className="space-y-2">
                <label className="flex items-center p-2 rounded hover:bg-gray-50">
                  <input type="checkbox" name="hasKidneyDisease" checked={profile.hasKidneyDisease ?? false} onChange={handleChange} className="mr-3" />
                  <div>
                    <div className="font-medium">Kidney Disease</div>
                  </div>
                </label>
                {profile.hasKidneyDisease && (
                  <div className="ml-6">
                    <label className="block font-semibold mb-2">
                      Kidney Disease Stage:
                    </label>
                    <select name="kidneyDiseaseStage" value={profile.kidneyDiseaseStage ?? ''} onChange={handleChange} className="w-full md:w-64 border rounded px-3 py-2">
                      <option value="">Select stage</option>
                      <option value="Stage 1">Stage 1 (Mild)</option>
                      <option value="Stage 2">Stage 2 (Mild)</option>
                      <option value="Stage 3">Stage 3 (Moderate)</option>
                      <option value="Stage 4">Stage 4 (Severe)</option>
                      <option value="Stage 5">Stage 5 (Severe)</option>
                      <option value="ESRD">ESRD (End-stage renal disease)</option>
                      <option value="Post-Transplant">Post-kidney transplant</option>
                      <option value="other">Other/Unspecified</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
            <label className="flex items-center p-2 rounded hover:bg-gray-50">
              <input type="checkbox" name="hasHypothyroidDiagnosis" checked={profile.hasHypothyroidDiagnosis ?? false} onChange={handleChange} className="mr-3" />
              Diagnosed with hypothyroidism?
            </label>
          </div>
        </div>
        <div className="mt-6 text-center">
          <button 
            type="submit" 
            disabled={isProcessing || Object.keys(errors).length > 0}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Calculating...</span>
              </>
            ) : (
              'Calculate Dosage'
            )}
          </button>
          {Object.keys(errors).length > 0 && !isProcessing && (
            <p className="text-sm text-red-600 mt-2">
              Please fix the errors above before submitting
            </p>
          )}
        </div>
      </form>

    </div>
  );
};