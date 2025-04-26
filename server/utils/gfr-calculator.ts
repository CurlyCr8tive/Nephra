/**
 * GFR Calculation Utility
 * Provides advanced GFR estimation with multiple calculation methods
 */

interface GfrEstimationResult {
  gfr_estimate: number;
  method: 'creatinine-based' | 'symptom-and-vital-based';
}

/**
 * Estimates GFR score based on available data
 * Uses creatinine-based calculation if available, otherwise uses symptom and vital-based estimation
 * 
 * @param age User's age in years
 * @param gender User's gender ('male' or 'female')
 * @param weight_kg User's weight in kilograms
 * @param height_cm User's height in centimeters
 * @param hydration_level Hydration level on 1-10 scale, 10 being well-hydrated
 * @param systolic_bp Systolic blood pressure in mmHg
 * @param diastolic_bp Diastolic blood pressure in mmHg
 * @param stress Stress level on 1-10 scale, 10 being very high stress
 * @param fatigue Fatigue level on 1-10 scale, 10 being very fatigued
 * @param pain Pain level on 1-10 scale, 10 being severe pain
 * @param creatinine Optional serum creatinine level in mg/dL
 * @returns GFR estimation result with estimate value and calculation method used
 */
export function estimateGfrScore(
  age: number,
  gender: string,
  weight_kg: number,
  height_cm: number,
  hydration_level: number, 
  systolic_bp: number,
  diastolic_bp: number,
  stress: number,
  fatigue: number,
  pain: number,
  creatinine?: number
): GfrEstimationResult {
  // Gender factor adjustment
  const gender_factor = gender.toLowerCase() === 'female' ? 0.85 : 1.0;
  
  // Calculate body surface area (Du Bois formula)
  const bsa = 0.007184 * Math.pow(height_cm, 0.725) * Math.pow(weight_kg, 0.425);
  
  // If creatinine is available, use creatinine-based calculation (CKD-EPI-like formula)
  if (creatinine) {
    // Simplified CKD-EPI style (not race-based)
    let gfr = 141 * Math.min(creatinine / 0.9, 1) ** -0.411 * Math.max(creatinine / 0.9, 1) ** -1.209 * (0.993 ** age);
    gfr *= gender_factor;
    
    return {
      gfr_estimate: Math.round(gfr * 100) / 100, // Round to 2 decimal places
      method: 'creatinine-based'
    };
  }
  
  // Symptom-based estimation when creatinine is not available
  const stress_factor = stress / 10;
  const fatigue_factor = fatigue / 10;
  const pain_factor = pain / 10;
  
  // Apply penalties for low hydration and high blood pressure
  const hydration_penalty = Math.max(0, (7 - hydration_level)) * 1.5;
  const bp_penalty = systolic_bp > 130 ? (systolic_bp - 130) / 10 : 0;
  
  // Sum all symptom factors
  const symptom_total = stress_factor + fatigue_factor + pain_factor + hydration_penalty + bp_penalty;
  
  // Calculate baseline GFR for age and adjust with symptoms
  const base_gfr = 100 - (age * 0.8); // Rough average expected GFR declining with age
  let score_adjusted = base_gfr - (symptom_total * 5);
  
  // Apply gender adjustment
  score_adjusted *= gender_factor;
  
  // Ensure minimum GFR value
  score_adjusted = Math.max(score_adjusted, 15);
  
  return {
    gfr_estimate: Math.round(score_adjusted * 100) / 100, // Round to 2 decimal places
    method: 'symptom-and-vital-based'
  };
}

/**
 * Gets interpretation of GFR value according to CKD stages
 * 
 * @param gfr GFR value
 * @returns Object with stage and description
 */
export function interpretGfr(gfr: number): { stage: string; description: string } {
  if (gfr >= 90) {
    return {
      stage: 'G1',
      description: 'Normal or high kidney function'
    };
  } else if (gfr >= 60) {
    return {
      stage: 'G2',
      description: 'Mildly decreased kidney function'
    };
  } else if (gfr >= 45) {
    return {
      stage: 'G3a',
      description: 'Mild to moderately decreased kidney function'
    };
  } else if (gfr >= 30) {
    return {
      stage: 'G3b',
      description: 'Moderately to severely decreased kidney function'
    };
  } else if (gfr >= 15) {
    return {
      stage: 'G4',
      description: 'Severely decreased kidney function'
    };
  } else {
    return {
      stage: 'G5',
      description: 'Kidney failure'
    };
  }
}

/**
 * Gets recommendations based on GFR value
 * 
 * @param gfr GFR value
 * @param method The method used to calculate GFR
 * @returns Recommendation string
 */
export function getGfrRecommendation(gfr: number, method: string): string {
  const interpretation = interpretGfr(gfr);
  
  // Add disclaimer for symptom-based method
  const methodDisclaimer = method === 'symptom-and-vital-based' 
    ? "This is an estimated value based on your symptoms and vitals. For a more accurate measurement, please consult your healthcare provider for a blood test." 
    : "";
  
  if (gfr >= 60) {
    return `Your kidney function appears to be in ${interpretation.stage} stage (${interpretation.description}). ${methodDisclaimer} Continue to monitor your kidney health and follow a kidney-friendly lifestyle.`;
  } else if (gfr >= 30) {
    return `Your kidney function appears to be in ${interpretation.stage} stage (${interpretation.description}). ${methodDisclaimer} Regular monitoring by a nephrologist is recommended.`;
  } else if (gfr >= 15) {
    return `Your kidney function appears to be in ${interpretation.stage} stage (${interpretation.description}). ${methodDisclaimer} Close management by a nephrologist is important at this stage.`;
  } else {
    return `Your kidney function appears to be in ${interpretation.stage} stage (${interpretation.description}). ${methodDisclaimer} Please consult with your healthcare team about treatment options, which may include dialysis or transplantation.`;
  }
}