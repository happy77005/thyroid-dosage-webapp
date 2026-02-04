import { DosageRecommendation, DosageResult } from '../../types/medical';
import {
  DOSAGE_CONSTANTS,
  SEVERITY_THRESHOLDS,
  FOLLOW_UP_SCHEDULE,
  DOSAGE_MULTIPLIERS,
  AVAILABLE_DOSES,
  COMMERCIAL_TABLETS,
  SAFETY_LIMITS,
  THYROID_REFERENCE_RANGES
} from '../../constants/medical.constants';
import { APP_CONFIG } from '../../config/app.config';
import { PatientProfile } from '../../types/medical';

/**
 * Simple dosage calculator for initial PDF analysis
 * Used by ThyroidDosagePredictor for basic rule-based calculations
 * Does NOT include complex medical condition adjustments
 */
export class DosageCalculator {
  static calculateHypothyroidDosage(
    tshValue: number,
    ft4Value?: number,
    weight: number = APP_CONFIG.medical.defaultWeight,
    age?: number | null
  ): DosageRecommendation {
    const ageAdjustment = age && age > APP_CONFIG.medical.ageThreshold
      ? APP_CONFIG.medical.elderlyDosageAdjustment
      : 1.0;

    let baseDosage: number = DOSAGE_CONSTANTS.levothyroxine.baseDosage;
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    let followUpWeeks: number = FOLLOW_UP_SCHEDULE.mild;

    // Determine severity and adjust dosage
    if (tshValue >= SEVERITY_THRESHOLDS.TSH.severe.min) {
      baseDosage = DOSAGE_CONSTANTS.levothyroxine.severeDosage;
      severity = 'severe';
      followUpWeeks = FOLLOW_UP_SCHEDULE.severe;
    } else if (tshValue >= SEVERITY_THRESHOLDS.TSH.moderate.min) {
      baseDosage = DOSAGE_CONSTANTS.levothyroxine.moderateDosage;
      severity = 'moderate';
      followUpWeeks = FOLLOW_UP_SCHEDULE.moderate;
    }

    // Adjust for FT4 if available
    if (ft4Value && ft4Value < 0.8) {
      baseDosage *= 1.2;
    }

    const calculatedDosage = Math.round(
      (baseDosage * weight * ageAdjustment) / DOSAGE_CONSTANTS.levothyroxine.roundingFactor
    ) * DOSAGE_CONSTANTS.levothyroxine.roundingFactor;

    return {
      medication: 'Levothyroxine',
      dosage: calculatedDosage,
      unit: 'mcg',
      frequency: 'Once daily (morning, empty stomach)',
      reasoning: `TSH elevated at ${tshValue} mIU/L. Starting dose calculated based on weight (${weight}kg)${age ? `, age (${age}y)` : ''} and severity.`,
      severity,
      followUpWeeks
    };
  }

  static calculateHyperthyroidTreatment(
    tshValue: number,
    ft4Value?: number,
    ft3Value?: number,
    t4Value?: number,
    t3Value?: number,
    age?: number | null,
    weight?: number | null,
    hasCardiacDisease?: boolean,
    hasOsteoporosis?: boolean
  ): DosageRecommendation {
    // Always use comprehensive calculation when TSH <= 0.1 (even if hormones are missing, so it can prompt)
    if (tshValue <= 0.1) {
      // Create a minimal profile for the comprehensive function
      const profile: PatientProfile = {
        currentTSH: tshValue,
        currentFT4: ft4Value,
        currentFT3: ft3Value,
        currentT4: t4Value,
        currentT3: t3Value,
        age: age ?? null,
        weightKg: weight ?? null,
        gender: null,
        isPregnant: false,
        hasHighRiskHeartDisease: hasCardiacDisease ?? false,
        hasOsteoporosis: hasOsteoporosis ?? false,
        hasAdrenalInsufficiency: false,
        hasGIAbsorptionIssues: false,
        onEstrogenTherapy: false
      };

      const result = calculateMethimazoleDose(profile);

      if (result.dose === 0 && result.symptomAlert) {
        // Return a recommendation indicating no treatment or missing data
        return {
          medication: 'Methimazole',
          dosage: 0,
          unit: 'mg',
          frequency: '',
          reasoning: result.symptomAlert,
          severity: result.severity || 'mild',
          followUpWeeks: result.followUpWeeks || 12
        };
      }

      return {
        medication: 'Methimazole',
        dosage: result.dose,
        unit: 'mg',
        frequency: 'Once or twice daily',
        reasoning: result.symptomAlert || `Methimazole dose calculated based on TSH ${tshValue} mIU/L and hormone levels.`,
        severity: result.severity || 'mild',
        followUpWeeks: result.followUpWeeks || 4
      };
    }

    // Fallback to simple calculation for TSH > 0.1 but < 0.4
    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    let dosage: number = DOSAGE_CONSTANTS.methimazole.mildDosage;
    let followUpWeeks: number = FOLLOW_UP_SCHEDULE.hyperthyroid.mild;

    if (tshValue <= SEVERITY_THRESHOLDS.hyperthyroid.severe.max) {
      severity = 'severe';
      dosage = DOSAGE_CONSTANTS.methimazole.severeDosage;
      followUpWeeks = FOLLOW_UP_SCHEDULE.hyperthyroid.severe;
    } else if (tshValue <= SEVERITY_THRESHOLDS.hyperthyroid.moderate.max) {
      severity = 'moderate';
      dosage = DOSAGE_CONSTANTS.methimazole.moderateDosage;
      followUpWeeks = FOLLOW_UP_SCHEDULE.hyperthyroid.moderate;
    }

    return {
      medication: 'Methimazole',
      dosage,
      unit: 'mg',
      frequency: 'Twice daily',
      reasoning: `TSH suppressed at ${tshValue} mIU/L indicating hyperthyroidism. Requires antithyroid medication. Additional hormone levels (FT4/FT3 or T4/T3) needed for precise dosing.`,
      severity,
      followUpWeeks
    };
  }
}

/**
 * Advanced personalized levothyroxine dose calculation
 * Used for detailed patient profile-based calculations
 * Includes complex medical condition adjustments, pregnancy considerations, etc.
 * 
 * This is separate from DosageCalculator class which is used for simple initial analysis
 */
export function calculateLevothyroxineDose(profile: PatientProfile): DosageResult {
  if (profile.weightKg == null) throw new Error('Weight is required for dosage calculation.');
  if (profile.currentTSH == null) throw new Error('Current TSH is required for dosage calculation.');

  let baseDose = 0;
  let alerts: string[] = [];

  // 1. First check TSH levels - euthyroid patients don't need treatment
  if (profile.currentTSH < 4.5) {
    alerts.push(`✅ No LT4 therapy needed at this time. Patient TSH (${profile.currentTSH}) is within the normal range. Monitor periodically.`);
    return {
      dose: 0,
      symptomAlert: alerts.join("; ")
    };
  }

  // 2. For TSH ≥ 4.5, determine if treatment is indicated
  // Clinical decision: TSH > 10 mIU/L strongly suggests hypothyroidism requiring treatment
  if (profile.hasHypothyroidDiagnosis === false) {
    if (profile.currentTSH > 10) {
      alerts.push("⚠️ TSH > 10 mIU/L suggests hypothyroidism despite negative diagnosis. Proceeding based on labs but confirm diagnosis.");
    } else {
      alerts.push("ℹ️ Patient not formally diagnosed with hypothyroidism. Proceeding with LT4 dosing because TSH is above 4.5 mIU/L — confirm diagnosis with healthcare provider.");
    }
  } else if (profile.hasHypothyroidDiagnosis === undefined || profile.hasHypothyroidDiagnosis === null) {
    // Diagnosis status unknown - use TSH levels to guide decision
    if (profile.currentTSH > 10) {
      alerts.push("⚠️ TSH > 10 mIU/L strongly suggests hypothyroidism. Proceeding with dose calculation. Confirm diagnosis with healthcare provider.");
    } else {
      alerts.push("⚠️ Hypothyroidism diagnosis status unknown. Proceeding with dose calculation based on TSH levels. Please confirm diagnosis with healthcare provider.");
    }
  }

  // 3. Base Dose Calculation based on TSH levels
  if (profile.currentTSH >= 20) {
    // Full replacement for severe hypothyroidism
    baseDose = DOSAGE_MULTIPLIERS.severe * profile.weightKg;
    alerts.push("TSH ≥ 20 mIU/L - Severe hypothyroidism, full replacement dose recommended");
  } else if (profile.currentTSH >= 10) {
    // Moderate hypothyroidism
    baseDose = DOSAGE_MULTIPLIERS.moderate * profile.weightKg;
    alerts.push("TSH 10-20 mIU/L - Moderate hypothyroidism, moderate replacement dose recommended");
  } else if (profile.currentTSH >= 4.5) {
    // Mild hypothyroidism
    baseDose = DOSAGE_MULTIPLIERS.mild * profile.weightKg;
    alerts.push("TSH 4.5-10 mIU/L - Mild hypothyroidism, partial replacement dose recommended");
  }

  // If no treatment needed, return early
  if (baseDose === 0) {
    return {
      dose: 0,
      symptomAlert: alerts.join("; ") + ". Consider clinical assessment before treatment."
    };
  }

  let adjustedDose = baseDose;

  // Use available FT3/FT4 (and total T3/T4) data to fine-tune the starting dose
  const hormoneAdjustment = calculateHormoneAdjustmentFactor(profile, alerts);
  adjustedDose *= hormoneAdjustment;

  // 2. Pregnancy Adjustment (trimester-specific)
  if (profile.isPregnant) {
    if (profile.trimester === 1) {
      adjustedDose *= DOSAGE_MULTIPLIERS.pregnancy.trimester1;
      alerts.push("1st trimester pregnancy - 50% dose increase applied");
    } else if (profile.trimester === 2) {
      adjustedDose *= DOSAGE_MULTIPLIERS.pregnancy.trimester2;
      alerts.push("2nd trimester pregnancy - 40% dose increase applied");
    } else if (profile.trimester === 3) {
      adjustedDose *= DOSAGE_MULTIPLIERS.pregnancy.trimester3;
      alerts.push("3rd trimester pregnancy - 30% dose increase applied");
    } else {
      // Pregnant but trimester not specified - use conservative multiplier
      adjustedDose *= DOSAGE_MULTIPLIERS.pregnancy.unspecified;
      alerts.push("Pregnancy detected but trimester not specified - 40% dose increase applied (please specify trimester for optimal dosing)");
    }
  }

  // 3. TSH Target Assessment
  let targetTSH = 4.5; // Default non-pregnant target
  if (profile.isPregnant) {
    if (profile.trimester === 1) {
      targetTSH = 2.5;
      alerts.push("1st trimester target TSH < 2.5 mIU/L");
    } else {
      targetTSH = 3.0;
      alerts.push("2nd/3rd trimester target TSH < 3.0 mIU/L");
    }
  }

  // Check if current TSH meets target
  if (profile.currentTSH > targetTSH) {
    alerts.push(`Current TSH (${profile.currentTSH}) exceeds target (<${targetTSH}) - dose may need adjustment`);
  }

  // 4. Heart Disease Adjustments
  const hasHighRiskHeartDisease = profile.hasHighRiskHeartDisease ?? false;
  const hasLowRiskHeartDisease = profile.hasLowRiskHeartDisease ?? false;

  if (hasHighRiskHeartDisease) {
    // High-risk heart disease: reduce dose by 25% initially
    adjustedDose *= DOSAGE_MULTIPLIERS.heartDisease.highRisk;
    alerts.push("High-risk heart disease - 25% dose reduction for cardiac safety. Start low, go slow.");

    // Check for symptoms that require additional caution
    const hasCardiacSymptoms = profile.symptoms?.anxiousOrRestless ?? false; // Using anxiety as proxy for palpitations
    if (hasCardiacSymptoms) {
      alerts.push("ALERT: High-risk heart disease with symptoms - consider urgent cardiac evaluation");
    }

    // Ensure cardiac patients don't exceed conservative maximum
    if (adjustedDose > SAFETY_LIMITS.cardiacMaximumDose) {
      adjustedDose = SAFETY_LIMITS.cardiacMaximumDose;
      alerts.push(`High-risk cardiac patient - dose capped at ${SAFETY_LIMITS.cardiacMaximumDose} mcg for cardiac safety`);
    }
  } else if (hasLowRiskHeartDisease) {
    // Low-risk heart disease: reduce dose by 10% initially
    adjustedDose *= DOSAGE_MULTIPLIERS.heartDisease.lowRisk;
    alerts.push("Low-risk heart disease - 10% dose reduction for cardiac safety.");
  }

  if (profile.hasAdrenalInsufficiency) {
    alerts.push("Critical: Adrenal insufficiency must be treated before giving levothyroxine.");
    return {
      dose: 0,
      symptomAlert: alerts.join("; ")
    };
  }

  if (profile.hasOsteoporosis) {
    adjustedDose *= DOSAGE_MULTIPLIERS.osteoporosis;
    alerts.push("Patient has osteoporosis — dose reduced by 10% to minimize bone loss risk. Avoid TSH suppression below 1.0 mIU/L.");
  }

  if (profile.onEstrogenTherapy) {
    adjustedDose *= DOSAGE_MULTIPLIERS.estrogenTherapy;
    alerts.push("On estrogen therapy – increase LT4 dose by ~15% and recheck TSH in 6 weeks.");
  }

  if (profile.hasGIAbsorptionIssues) {
    adjustedDose *= DOSAGE_MULTIPLIERS.giAbsorptionIssues;
    alerts.push("GI absorption issues - 20% dose increase applied");
  }

  // Liver Disease Logic
  if (profile.hasLiverDisease) {
    const liverType = profile.liverDiseaseType;
    if (liverType === 'cirrhosis') {
      adjustedDose *= DOSAGE_MULTIPLIERS.liverDisease.cirrhosis;
      alerts.push("Cirrhosis detected – reduce LT4 dose by 10%; monitor free T4 and T3 closely.");
    } else if (liverType === 'cholestatic') {
      adjustedDose *= DOSAGE_MULTIPLIERS.liverDisease.cholestatic;
      alerts.push("Cholestatic liver disease – increase LT4 dose by 15%; elevated TBG expected.");
    } else if (liverType === 'nafld') {
      adjustedDose *= DOSAGE_MULTIPLIERS.liverDisease.nafld;
      alerts.push("NAFLD detected – mild increase in LT4 dose (10%) may be required.");
    } else if (liverType === 'hepatitis') {
      // No dose change
      alerts.push("Hepatitis – transient effect on thyroid metabolism; no routine dose change, monitor TSH.");
    } else if (liverType === 'post_transplant') {
      // No dose change
      alerts.push("Post-liver transplant – recheck thyroid function and titrate as metabolism normalizes.");
    } else {
      // Unspecified liver disease
      adjustedDose *= DOSAGE_MULTIPLIERS.liverDisease.unspecified;
      alerts.push("Unspecified liver disease – apply conservative 10% reduction.");
    }
  }

  // Kidney Disease Logic
  if (profile.hasKidneyDisease) {
    const kidneyStage = profile.kidneyDiseaseStage;
    if (kidneyStage === 'Stage 4' || kidneyStage === 'Stage 5' || kidneyStage === 'ESRD') {
      adjustedDose *= DOSAGE_MULTIPLIERS.kidneyDisease.severe;
      alerts.push("Severe CKD or ESRD – reduce LT4 dose by 15%; monitor TSH and free T4 frequently.");
    } else if (kidneyStage === 'Stage 3') {
      adjustedDose *= DOSAGE_MULTIPLIERS.kidneyDisease.moderate;
      alerts.push("Moderate CKD – reduce LT4 dose by 10%; metabolism may be slowed.");
    } else if (kidneyStage === 'Stage 1' || kidneyStage === 'Stage 2') {
      // No dose change
      alerts.push("Mild CKD – no dose change needed; monitor thyroid function periodically.");
    } else if (kidneyStage === 'Post-Transplant') {
      // No dose change
      alerts.push("Post kidney transplant – re-evaluate LT4 dose as metabolism normalizes.");
    } else {
      // Unspecified kidney disease
      adjustedDose *= DOSAGE_MULTIPLIERS.kidneyDisease.unspecified;
      alerts.push("Unspecified kidney disease – apply conservative 10% dose reduction.");
    }
  }


  // 5. Age and Weight Adjustments
  if (profile.weightKg < SAFETY_LIMITS.lowWeightThreshold) {
    adjustedDose *= DOSAGE_MULTIPLIERS.lowWeight;
    alerts.push(`Low body weight (<${SAFETY_LIMITS.lowWeightThreshold}kg) - 10% dose reduction for conservative start`);
  }

  if (profile.age != null && profile.age >= SAFETY_LIMITS.elderlyAgeThreshold) {
    adjustedDose = Math.min(adjustedDose, SAFETY_LIMITS.elderlyMaxDose);
    alerts.push(`Elderly patient (≥${SAFETY_LIMITS.elderlyAgeThreshold}) - dose capped at ${SAFETY_LIMITS.elderlyMaxDose} mcg for safety`);
  }

  // 6. Safety Checks
  if (profile.currentTSH < SAFETY_LIMITS.lowTSHThreshold) {
    // Only throw error if patient is not diagnosed with hypothyroidism
    // If they have hypothyroidism diagnosis, they might be over-treated
    if (!profile.hasHypothyroidDiagnosis) {
      throw new Error(`TSH too low (<${SAFETY_LIMITS.lowTSHThreshold}) — patient may be hyperthyroid. Recheck before dosing.`);
    } else {
      // Patient has hypothyroidism diagnosis but TSH is very low - likely over-treated
      alerts.push(`WARNING: TSH is very low (<${SAFETY_LIMITS.lowTSHThreshold}) in diagnosed hypothyroid patient. Consider dose reduction or temporary hold.`);
    }
  }

  // 7. Gradual Titration Control (heart disease and osteoporosis specific)
  if (profile.currentDose != null) {
    let maxChange: number = SAFETY_LIMITS.maxDoseChange.standard;
    let reasonForLimit = '';

    // Adjust maximum change based on medical conditions
    if (hasHighRiskHeartDisease) {
      maxChange = SAFETY_LIMITS.maxDoseChange.conservative;
      reasonForLimit = ' due to high-risk heart disease';
    } else if (profile.hasOsteoporosis) {
      maxChange = SAFETY_LIMITS.maxDoseChange.conservative;
      reasonForLimit = ' due to osteoporosis';
    } else if (hasLowRiskHeartDisease) {
      maxChange = SAFETY_LIMITS.maxDoseChange.standard;
    }

    if (Math.abs(adjustedDose - profile.currentDose) > maxChange) {
      const changeDirection = Math.sign(adjustedDose - profile.currentDose);
      adjustedDose = profile.currentDose + (changeDirection * maxChange);
      alerts.push(`Gradual titration applied - dose change limited to ±${maxChange} mcg from current dose (${profile.currentDose} mcg)${reasonForLimit}`);
    }
  }

  // 8. Symptom-based Adjustments
  const hasHeadache = profile.symptoms?.headache ?? false;
  const hasAnxiety = profile.symptoms?.anxiousOrRestless ?? false;
  const symptomCount = (hasHeadache ? 1 : 0) + (hasAnxiety ? 1 : 0);

  if (symptomCount > 0) {
    let reductionAmount = 0;
    if (symptomCount === 1) {
      reductionAmount = 12.5; // Single mild symptom
    } else if (symptomCount === 2) {
      reductionAmount = 25; // Both symptoms
    }

    adjustedDose = Math.max(25, adjustedDose - reductionAmount);
    alerts.push(`Symptoms reported - dose reduced by ${reductionAmount} mcg. Recheck TSH in 4 weeks.`);
  }

  // Critical safety check for very low TSH with symptoms
  if (profile.currentTSH < SAFETY_LIMITS.lowTSHThreshold && symptomCount > 0) {
    throw new Error(`TSH is very low (<${SAFETY_LIMITS.lowTSHThreshold}) and patient has symptoms of overdosage. Pause or reduce dose and recheck TSH urgently.`);
  }

  // 9. Final Dose Safety and Rounding
  adjustedDose = Math.max(SAFETY_LIMITS.minimumDose, Math.min(adjustedDose, SAFETY_LIMITS.maximumDose));

  // Round to nearest 12.5 mcg increment
  const finalDose = getNearestSafeDose(adjustedDose);

  // Find nearest commercial tablet
  const nearestTablet = getNearestCommercialTablet(adjustedDose);

  // 10. Generate detailed medical conditions summary
  const medicalConditionsSummary = generateMedicalConditionsSummary(profile);

  // 11. Generate final alert message
  const alertMessage = alerts.length > 0 ? alerts.join("; ") : undefined;

  return {
    dose: finalDose,
    nearestTablet: nearestTablet,
    symptomAlert: alertMessage,
    alerts: alerts, // Also return as array for better UI handling
    medicalConditionsSummary: medicalConditionsSummary
  };
}

/**
 * Comprehensive methimazole dose calculation for hyperthyroidism
 * Implements detailed logic based on TSH, FT4/FT3 or T4/T3 levels, age, cardiac risk, and osteoporosis
 */
export function calculateMethimazoleDose(profile: PatientProfile): DosageResult {
  if (profile.currentTSH == null) {
    throw new Error('Current TSH is required for methimazole dosage calculation.');
  }

  const alerts: string[] = [];
  let dose = 0;
  let severity: 'mild' | 'moderate' | 'severe' = 'mild';
  let followUpWeeks = 4;

  // Step 1: Check if TSH ≤ 0.1
  if (profile.currentTSH > 0.1) {
    alerts.push(`TSH (${profile.currentTSH} mIU/L) is not suppressed enough to indicate hyperthyroidism requiring methimazole.`);
    return {
      dose: 0,
      symptomAlert: alerts.join("; "),
      alerts
    };
  }

  // Step 2: Check for hormone values (Free FT3 & FT4 first, then Total T3 & T4)
  const hasFreeHormones = profile.currentFT4 != null && profile.currentFT3 != null;
  const hasTotalHormones = profile.currentT4 != null && profile.currentT3 != null;

  if (!hasFreeHormones && !hasTotalHormones) {
    // Determine which specific hormone fields are missing
    const missingFields: ('FT3' | 'FT4' | 'T3' | 'T4')[] = [];
    if (profile.currentFT3 == null) missingFields.push('FT3');
    if (profile.currentFT4 == null) missingFields.push('FT4');
    if (profile.currentT3 == null) missingFields.push('T3');
    if (profile.currentT4 == null) missingFields.push('T4');

    alerts.push('⚠️ Missing hormone values. Please enter either Free FT3 & Free FT4, OR Total T3 & Total T4 to calculate methimazole dose.');
    return {
      dose: 0,
      symptomAlert: alerts.join("; "),
      alerts,
      requiresHormoneData: true,
      missingHormoneFields: missingFields
    };
  }


  // Step 3: Determine which hormone set to use and get reference ranges
  const useFreeHormones = hasFreeHormones;
  const ft4Value = profile.currentFT4;
  const ft3Value = profile.currentFT3;
  const t4Value = profile.currentT4;
  const t3Value = profile.currentT3;

  const ft4Ref = THYROID_REFERENCE_RANGES.FT4;
  const ft3Ref = THYROID_REFERENCE_RANGES.FT3;
  const t4Ref = THYROID_REFERENCE_RANGES.T4;
  const t3Ref = THYROID_REFERENCE_RANGES.T3;

  // Step 4: Determine if hyperthyroidism is present
  let isHyperthyroid = false;
  let ft4ULN: number;
  let ft3ULN: number;
  let currentFT4: number | null = null;
  let currentFT3: number | null = null;

  if (useFreeHormones) {
    ft4ULN = ft4Ref.high;
    ft3ULN = ft3Ref.high;
    currentFT4 = ft4Value ?? null;
    currentFT3 = ft3Value ?? null;
    isHyperthyroid = (currentFT4 != null && currentFT4 > ft4ULN) || (currentFT3 != null && currentFT3 > ft3ULN);
  } else {
    ft4ULN = t4Ref.high; // Using T4 as "FT4" for total hormones
    ft3ULN = t3Ref.high; // Using T3 as "FT3" for total hormones
    currentFT4 = t4Value ?? null;
    currentFT3 = t3Value ?? null;
    isHyperthyroid = (currentFT4 != null && currentFT4 > ft4ULN) || (currentFT3 != null && currentFT3 > ft3ULN);
  }

  if (!isHyperthyroid) {
    // Subclinical hyperthyroidism - treat only if age ≥ 65 OR cardiac = yes OR osteoporosis = yes
    const age = profile.age ?? 0;
    const hasCardiac = profile.hasHighRiskHeartDisease ?? profile.hasLowRiskHeartDisease ?? false;
    const hasOsteoporosis = profile.hasOsteoporosis ?? false;

    if (age >= 65 || hasCardiac || hasOsteoporosis) {
      alerts.push('Subclinical hyperthyroidism detected. Treatment indicated due to age ≥ 65, cardiac disease, or osteoporosis.');
      // Use mild dosing for subclinical
      severity = 'mild';
      dose = 5;
      followUpWeeks = 6;
    } else {
      alerts.push('Subclinical hyperthyroidism detected (TSH ≤ 0.1 but FT4/FT3 normal). No methimazole treatment needed unless age ≥ 65, cardiac disease, or osteoporosis present.');
      return {
        dose: 0,
        symptomAlert: alerts.join("; "),
        alerts,
        severity: 'mild',
        followUpWeeks: 12
      };
    }
  } else {
    // Overt hyperthyroidism confirmed
    alerts.push('Overt hyperthyroidism confirmed based on elevated hormone levels.');

    // Step 5: Calculate severity based on FT4 (or T4 if using total hormones)
    if (currentFT4 == null) {
      alerts.push('⚠️ Cannot determine severity without FT4 or T4 value.');
      return {
        dose: 0,
        symptomAlert: alerts.join("; "),
        alerts
      };
    }

    const ft4Ratio = currentFT4 / ft4ULN;

    // Check if FT3 is elevated or disproportionately high (needed for severity classification)
    const ft3Elevated = currentFT3 != null && currentFT3 > ft3ULN;
    const ft3Disproportionate = currentFT3 != null && currentFT3 > ft3ULN * 1.5;
    const ft3VeryHigh = currentFT3 != null && currentFT3 > ft3ULN * 1.8; // Very high FT3 can upgrade severity

    // Classify severity based on FT4 ratio
    // Values very close to 2.0× (≥1.9×) with very high FT3 may be classified as severe
    if (ft4Ratio >= 2.0 && ft4Ratio <= 3.0) {
      severity = 'severe';
    } else if (ft4Ratio >= 1.9 && ft4Ratio < 2.0 && ft3VeryHigh) {
      // Borderline moderate-severe: upgrade to severe if FT3 is very high
      severity = 'severe';
      alerts.push('Moderate-severe hyperthyroidism: FT4 ratio near severe threshold with very high FT3 - classified as severe.');
    } else if (ft4Ratio >= 1.5 && ft4Ratio < 2.0) {
      severity = 'moderate';
    } else if (ft4Ratio >= 1.0 && ft4Ratio < 1.5) {
      severity = 'mild';
    } else if (ft4Ratio > 3.0) {
      severity = 'severe';
      alerts.push('⚠️ Very severe hyperthyroidism (FT4 > 3× ULN). Consider specialist consultation.');
    }

    // Step 6: Calculate dose based on severity, age, and cardiac risk
    const age = profile.age ?? 0;
    const hasCardiac = profile.hasHighRiskHeartDisease ?? profile.hasLowRiskHeartDisease ?? false;
    const weight = profile.weightKg;
    const isElderly = age >= 65;

    // Check if patient is a child (age < 18)
    const isChild = age > 0 && age < 18;

    if (isChild && weight != null && weight > 0) {
      // Weight-based dosing for children
      const standardDosePerKg = 0.35; // Middle of 0.2-0.5 range
      const severeDosePerKg = 0.7; // Upper limit for severe cases

      if (severity === 'severe') {
        dose = Math.min(weight * severeDosePerKg, 40); // Cap at 40 mg/day
        alerts.push(`Pediatric patient: Severe hyperthyroidism - weight-based dosing (${weight}kg × ${severeDosePerKg} mg/kg/day, capped at 40 mg/day).`);
      } else {
        dose = Math.min(weight * standardDosePerKg, 30); // Cap at 30 mg/day for standard
        alerts.push(`Pediatric patient: Weight-based dosing (${weight}kg × ${standardDosePerKg} mg/kg/day, capped at 30 mg/day).`);
      }
      followUpWeeks = 4;
    } else {
      // Adult dosing
      if (severity === 'mild') {
        if (age < 65 && !hasCardiac) {
          // Use upper end (10 mg) if T3 is elevated, otherwise middle (7.5 mg)
          if (ft3Elevated) {
            dose = 10; // Upper end of 5-10 mg/day range when T3 is elevated
            alerts.push('Mild hyperthyroidism with elevated T3: Age < 65 and no cardiac disease - 10 mg/day (upper end of 5-10 mg/day range).');
          } else {
            dose = 7.5; // 5-10 mg/day, use middle
            alerts.push('Mild hyperthyroidism: Age < 65 and no cardiac disease - 5-10 mg/day.');
          }
        } else {
          dose = 5; // Age ≥ 65 or cardiac = yes
          alerts.push('Mild hyperthyroidism: Age ≥ 65 or cardiac disease present - 5 mg/day (conservative).');
        }
        followUpWeeks = 6;
      } else if (severity === 'moderate') {
        if (ft3Disproportionate) {
          dose = 20; // Upper end if FT3 disproportionately high
          alerts.push('Moderate hyperthyroidism with disproportionately high FT3 - 20 mg/day (upper end of range).');
        } else {
          dose = 15; // 10-20 mg/day, use middle
          alerts.push('Moderate hyperthyroidism - 10-20 mg/day.');
        }
        followUpWeeks = 4;
      } else if (severity === 'severe') {
        // For elderly (age ≥65), use conservative dose 20-30 mg/day (prefer 20 mg)
        if (isElderly || hasCardiac) {
          dose = 20; // Conservative dose for elderly/cardiac patients
          alerts.push('Severe hyperthyroidism in elderly/cardiac patient - 20 mg/day (conservative, avoid overtreatment). Recommend beta-blocker and close follow-up in 4-6 weeks.');
        } else {
          dose = 35; // 30-40 mg/day, use middle for younger patients
          alerts.push('Severe hyperthyroidism - 30-40 mg/day. Recommend beta-blocker and specialist supervision.');
        }
        followUpWeeks = isElderly ? 4 : 2; // Longer follow-up for elderly
      }
    }

    // Round dose to nearest 5 mg (common methimazole tablet sizes: 5, 10, 15, 20, 30, 40 mg)
    dose = Math.round(dose / 5) * 5;
    dose = Math.max(5, Math.min(dose, 40)); // Clamp between 5-40 mg
  }

  // Step 7: Add titration guidance
  alerts.push('Titration: Recheck FT4 (± FT3) at 4-6 weeks. If FT4 normalizes, reduce dose by ~50%. Do NOT titrate early using TSH (TSH remains suppressed for months).');

  return {
    dose,
    symptomAlert: alerts.join("; "),
    alerts,
    severity,
    followUpWeeks
  };
}

function calculateHormoneAdjustmentFactor(profile: PatientProfile, alerts: string[]): number {
  let factor = 1;

  const applyLowValueAdjustment = (
    value: number | null | undefined,
    key: keyof typeof THYROID_REFERENCE_RANGES,
    increasePercent: number,
    label: string
  ) => {
    if (value == null) return;
    const ref = THYROID_REFERENCE_RANGES[key];
    if (value < ref.low) {
      factor *= (1 + increasePercent);
      alerts.push(`${label} (${value} ${ref.units}) is below the reference range (${ref.low}-${ref.high} ${ref.units}) — increasing LT4 dose by ${Math.round(increasePercent * 100)}%.`);
    }
  };

  applyLowValueAdjustment(profile.currentFT4, 'FT4', 0.15, 'Free T4');
  applyLowValueAdjustment(profile.currentFT3, 'FT3', 0.1, 'Free T3');
  applyLowValueAdjustment(profile.currentT4, 'T4', 0.1, 'Total T4');
  applyLowValueAdjustment(profile.currentT3, 'T3', 0.05, 'Total T3');

  return factor;
}

export function generateMedicalConditionsSummary(profile: PatientProfile): string {
  const conditions: string[] = [];

  // Heart disease
  if (profile.hasHighRiskHeartDisease) {
    conditions.push("High-risk heart disease");
  } else if (profile.hasLowRiskHeartDisease) {
    conditions.push("Low-risk heart disease");
  }

  // Kidney disease
  if (profile.hasKidneyDisease) {
    const stage = profile.kidneyDiseaseStage;
    if (stage) {
      conditions.push(`${stage} CKD`);
    } else {
      conditions.push("Kidney disease (stage unspecified)");
    }
  }

  // Liver disease
  if (profile.hasLiverDisease) {
    const type = profile.liverDiseaseType;
    if (type) {
      const typeNames: Record<string, string> = {
        'cirrhosis': 'Cirrhosis',
        'cholestatic': 'Cholestatic liver disease',
        'nafld': 'NAFLD',
        'hepatitis': 'Hepatitis',
        'post_transplant': 'Post-liver transplant',
        'other': 'Liver disease (other)'
      };
      conditions.push(typeNames[type] || 'Liver disease (unspecified)');
    } else {
      conditions.push("Liver disease (type unspecified)");
    }
  }

  // Osteoporosis
  if (profile.hasOsteoporosis) {
    conditions.push("Osteoporosis");
  }

  // Adrenal insufficiency
  if (profile.hasAdrenalInsufficiency) {
    conditions.push("Adrenal insufficiency");
  }

  // Pregnancy
  if (profile.isPregnant) {
    const trimester = profile.trimester;
    if (trimester) {
      conditions.push(`Pregnancy (${trimester === 1 ? '1st' : trimester === 2 ? '2nd' : '3rd'} trimester)`);
    } else {
      conditions.push("Pregnancy (trimester unspecified)");
    }
  }

  // GI absorption issues
  if (profile.hasGIAbsorptionIssues) {
    conditions.push("GI absorption issues");
  }

  // Estrogen therapy
  if (profile.onEstrogenTherapy) {
    conditions.push("Estrogen therapy");
  }

  // Age-related conditions
  if (profile.age && profile.age >= 60) {
    conditions.push("Elderly (≥60 years)");
  }

  // Low body weight
  if (profile.weightKg && profile.weightKg < 45) {
    conditions.push("Low body weight (<45kg)");
  }

  return conditions.length > 0 ? conditions.join(", ") : "None";
}

export function getNearestCommercialTablet(predictedDose: number): number {
  const commercialTablets = COMMERCIAL_TABLETS;

  if (typeof predictedDose !== 'number' || isNaN(predictedDose)) {
    throw new Error("Invalid dose: must be a number");
  }

  // Clamp predicted dose between 25–200 mcg
  const dose = Math.min(Math.max(predictedDose, 25), 200);

  // Find nearest tablet
  let nearestTablet = commercialTablets[0];
  let minDistance = Math.abs(dose - nearestTablet);

  for (const tablet of commercialTablets) {
    const distance = Math.abs(dose - tablet);
    if (distance < minDistance) {
      minDistance = distance;
      nearestTablet = tablet;
    }
  }

  return nearestTablet;
}

export function getNearestSafeDose(predictedDose: number): number {
  const availableDoses = AVAILABLE_DOSES;

  if (typeof predictedDose !== 'number' || isNaN(predictedDose)) {
    throw new Error("Invalid dose: must be a number");
  }

  // Clamp predicted dose between 25–200 mcg
  const dose = Math.min(Math.max(predictedDose, 25), 200);

  // Find nearest doses on both sides
  let lower: number = availableDoses[0];
  let upper: number = availableDoses[availableDoses.length - 1];

  for (let i = 0; i < availableDoses.length; i++) {
    if (availableDoses[i] <= dose) {
      lower = availableDoses[i];
    }
    if (availableDoses[i] >= dose) {
      upper = availableDoses[i];
      break;
    }
  }

  const distToLower = Math.abs(dose - lower);
  const distToUpper = Math.abs(upper - dose);

  // Prefer lower if it's within 6.25 mcg unless upper is within 1 mcg
  if (distToLower <= 6.25 && distToUpper > 1) {
    return lower;
  }

  // If upper is within 1 mcg (e.g., predicted 99 → 100), allow it
  if (distToUpper <= 1) {
    return upper;
  }

  // Otherwise, pick whichever is closer
  return distToLower <= distToUpper ? lower : upper;
}