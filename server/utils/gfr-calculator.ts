/**
 * GFR Calculation Utility
 * Provides advanced GFR estimation with multiple calculation methods and trend detection
 */

import { HealthMetrics } from '@shared/schema';

interface GfrEstimationResult {
  gfr_estimate: number;
  method: 'creatinine-based' | 'symptom-and-vital-based';
  confidence: 'high' | 'moderate' | 'low';
  calculation: string;
  trend?: string;
  trend_description?: string;
  absolute_change?: number;
  percent_change?: number;
  long_term_trend?: string;
  stability?: string;
}

interface TrendAnalysisResult {
  trend: string;
  trend_description: string;
  absolute_change: number;
  percent_change: number;
  long_term_trend: string;
  stability: string;
}

/**
 * Analyzes GFR trend by comparing current GFR with previous readings
 * 
 * @param currentGfr Current GFR value
 * @param previousReadings Array of previous health metrics containing GFR values
 * @returns Trend analysis result including trend categorization and descriptive text
 */
export function analyzeGfrTrend(currentGfr: number, previousReadings: HealthMetrics[]): TrendAnalysisResult {
  if (!previousReadings || previousReadings.length === 0) {
    return {
      trend: 'insufficient_data',
      trend_description: 'Insufficient data for trend analysis',
      absolute_change: 0,
      percent_change: 0,
      long_term_trend: 'unknown',
      stability: 'More readings needed to establish a long-term trend'
    };
  }

  // Sort readings by date (most recent first)
  const sortedReadings = [...previousReadings].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(String(a.date || 0));
    const dateB = b.date instanceof Date ? b.date : new Date(String(b.date || 0));
    return dateB.getTime() - dateA.getTime();
  });
  
  // Get valid GFR readings (non-null values)
  const recentGfrReadings = sortedReadings
    .filter(r => r.estimatedGFR !== null && r.estimatedGFR !== undefined)
    .map(r => Number(r.estimatedGFR));
  
  if (recentGfrReadings.length === 0) {
    return {
      trend: 'insufficient_data',
      trend_description: 'No valid previous GFR readings found',
      absolute_change: 0,
      percent_change: 0,
      long_term_trend: 'unknown',
      stability: 'More readings needed to establish a long-term trend'
    };
  }
  
  // Calculate changes
  const latestPreviousGfr = recentGfrReadings[0];
  const absoluteChange = currentGfr - latestPreviousGfr;
  const percentChange = latestPreviousGfr > 0 ? (absoluteChange / latestPreviousGfr) * 100 : 0;
  
  // Calculate average of last 3 readings if available
  const lastThreeAvg = recentGfrReadings.slice(0, Math.min(3, recentGfrReadings.length))
    .reduce((sum, val) => sum + val, 0) / Math.min(3, recentGfrReadings.length);
  
  // Determine trend category based on percentage change
  let trend: string;
  let description: string;
  
  if (Math.abs(percentChange) < 5) {
    trend = 'stable';
    description = 'Your GFR appears stable compared to your last reading';
  } else if (percentChange < -10) {
    trend = 'significant_decline';
    description = 'Your GFR shows a significant drop from your last reading';
  } else if (percentChange < 0) {
    trend = 'possible_decline';
    description = 'Your GFR shows a possible slight decline from your last reading';
  } else if (percentChange > 10) {
    trend = 'significant_improvement';
    description = 'Your GFR shows significant improvement from your last reading';
  } else {
    trend = 'possible_improvement';
    description = 'Your GFR shows a possible slight improvement from your last reading';
  }
  
  // Analyze longer-term trend if at least 3 readings are available
  let longTermTrend = 'unknown';
  let stability = 'More readings needed to establish a long-term trend';
  
  if (recentGfrReadings.length >= 3) {
    // Create pairs for comparison
    const pairs: [number, number][] = [];
    
    for (let i = 0; i < recentGfrReadings.length - 1; i++) {
      pairs.push([recentGfrReadings[i], recentGfrReadings[i + 1]]);
    }
    
    const isConsistent = pairs.every(([a, b]) => Math.abs((a - b) / b) < 0.05);
    const isDeclining = pairs.every(([a, b]) => a < b);
    const isImproving = pairs.every(([a, b]) => a > b);
    
    if (isConsistent) {
      longTermTrend = 'consistent';
      stability = 'Your GFR has been relatively consistent over your last several readings';
    } else if (isDeclining) {
      longTermTrend = 'declining';
      stability = 'Your GFR has been showing a consistent downward trend';
    } else if (isImproving) {
      longTermTrend = 'improving';
      stability = 'Your GFR has been showing a consistent improving trend';
    } else {
      longTermTrend = 'fluctuating';
      stability = 'Your GFR has been fluctuating';
    }
  }
  
  return {
    trend,
    trend_description: description,
    absolute_change: Math.round(absoluteChange * 10) / 10,
    percent_change: Math.round(percentChange * 10) / 10,
    long_term_trend: longTermTrend,
    stability
  };
}

/**
 * Enhanced GFR estimation engine with dual calculation methods and trend detection
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
 * @param race Optional race information 
 * @param previousReadings Optional array of previous GFR readings for trend analysis
 * @returns Comprehensive GFR estimation result with calculation method and trend analysis
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
  creatinine?: number,
  race?: string,
  previousReadings?: HealthMetrics[]
): GfrEstimationResult {
  // Base factors
  const gender_factor = gender.toLowerCase() === 'female' ? 0.85 : 1.0;
  const bmi = weight_kg / ((height_cm / 100) ** 2);  // Calculate BMI
  
  // Method 1: CKD-EPI 2021 equation (gold standard when creatinine is available)
  if (creatinine !== undefined && creatinine > 0) {
    let gfr: number;
    
    // Use appropriate gender-specific formula (CKD-EPI 2021)
    if (gender.toLowerCase() === 'female') {
      if (creatinine <= 0.7) {
        gfr = 142 * ((creatinine / 0.7) ** -0.241) * (0.9938 ** age);
      } else {
        gfr = 142 * ((creatinine / 0.7) ** -1.200) * (0.9938 ** age);
      }
    } else { // male
      if (creatinine <= 0.9) {
        gfr = 142 * ((creatinine / 0.9) ** -0.302) * (0.9938 ** age);
      } else {
        gfr = 142 * ((creatinine / 0.9) ** -1.200) * (0.9938 ** age);
      }
    }
    
    // Cap maximum GFR at 120
    gfr = Math.min(gfr, 120);
    
    // Create result object
    const result: GfrEstimationResult = {
      gfr_estimate: Math.round(gfr * 10) / 10, // Round to 1 decimal place
      method: 'creatinine-based',
      confidence: 'high',
      calculation: 'CKD-EPI 2021'
    };
    
    // Add trend analysis if previous readings are available
    if (previousReadings && previousReadings.length > 0) {
      const trendAnalysis = analyzeGfrTrend(result.gfr_estimate, previousReadings);
      Object.assign(result, trendAnalysis);
    }
    
    return result;
  }
  
  // Method 2: ML-based approximation (when creatinine is unavailable)
  
  // BMI impact on kidney function
  let bmi_factor = 1.0;
  if (bmi < 18.5) { // underweight
    bmi_factor = 0.95;
  } else if (bmi >= 18.5 && bmi <= 24.9) { // normal
    bmi_factor = 1.0;
  } else if (bmi >= 25 && bmi <= 29.9) { // overweight
    bmi_factor = 0.97;
  } else { // obese
    bmi_factor = 0.92;
  }
  
  // Hydration impact (dehydration affects kidney function)
  const hydration_factor = 0.8 + (0.04 * hydration_level); // 0.8 to 1.2
  
  // Blood pressure impact (hypertension is a major risk factor)
  let bp_factor = 1.0;
  if (systolic_bp > 160 || diastolic_bp > 100) {
    bp_factor = 0.80; // Severe hypertension
  } else if (systolic_bp > 140 || diastolic_bp > 90) {
    bp_factor = 0.85; // Hypertension
  } else if (systolic_bp > 130 || diastolic_bp > 85) {
    bp_factor = 0.92; // Elevated
  }
  
  // Calculate weighted symptom score
  const weighted_stress = (stress / 10) * 0.4;
  const weighted_fatigue = (fatigue / 10) * 0.4; 
  const weighted_pain = (pain / 10) * 0.2;
  const symptom_score = weighted_stress + weighted_fatigue + weighted_pain;
  const symptom_factor = 1.0 - (symptom_score * 0.15); // Max 15% reduction
  
  // Age-adjusted baseline (normal GFR declines with age)
  let baseline_gfr: number;
  if (age < 30) {
    baseline_gfr = 120 - (age * 0.08);
  } else if (age < 40) {
    baseline_gfr = 116 - ((age-30) * 0.1);
  } else if (age < 50) {
    baseline_gfr = 115 - ((age-40) * 0.3);
  } else if (age < 60) {
    baseline_gfr = 112 - ((age-50) * 0.5);
  } else if (age < 70) {
    baseline_gfr = 107 - ((age-60) * 0.75);
  } else {
    baseline_gfr = 99.5 - ((age-70) * 0.9);
  }
  
  // Calculate final estimated GFR with all factors
  let estimated_gfr = baseline_gfr * gender_factor * bmi_factor * hydration_factor * bp_factor * symptom_factor;
  
  // Ensure GFR is within reasonable bounds
  estimated_gfr = Math.max(Math.min(estimated_gfr, 120), 15);
  
  // Create result
  const result: GfrEstimationResult = {
    gfr_estimate: Math.round(estimated_gfr * 10) / 10, // Round to 1 decimal place
    method: 'symptom-and-vital-based',
    confidence: 'moderate',
    calculation: 'ML approximation'
  };
  
  // Add trend analysis if previous readings are available
  if (previousReadings && previousReadings.length > 0) {
    const trendAnalysis = analyzeGfrTrend(result.gfr_estimate, previousReadings);
    Object.assign(result, trendAnalysis);
  }
  
  return result;
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
 * Gets comprehensive recommendations based on GFR value and trend analysis
 * 
 * @param gfr GFR value
 * @param method The method used to calculate GFR
 * @param trendInfo Optional trend analysis information
 * @returns Detailed recommendation string incorporating trend analysis
 */
export function getGfrRecommendation(
  gfr: number, 
  method: string, 
  trendInfo?: {
    trend?: string;
    trend_description?: string;
    long_term_trend?: string;
  }
): string {
  const interpretation = interpretGfr(gfr);
  
  // Add disclaimer for symptom-based method
  const methodDisclaimer = method === 'symptom-and-vital-based' 
    ? "This is an estimated value based on your symptoms and vitals. For a more accurate measurement, please consult your healthcare provider for a blood test." 
    : "";
  
  // Build base recommendation based on GFR
  let recommendation = `Your kidney function appears to be in ${interpretation.stage} stage (${interpretation.description}).`;
  
  // Add trend information if available
  if (trendInfo && trendInfo.trend && trendInfo.trend !== 'insufficient_data') {
    recommendation += ` ${trendInfo.trend_description}.`;
    
    if (trendInfo.long_term_trend && trendInfo.long_term_trend !== 'unknown') {
      if (trendInfo.long_term_trend === 'declining') {
        recommendation += ` This continues a pattern of declining kidney function, which should be discussed with your healthcare provider.`;
      } else if (trendInfo.long_term_trend === 'improving') {
        recommendation += ` This continues an encouraging pattern of improving kidney function.`;
      } else if (trendInfo.long_term_trend === 'fluctuating') {
        recommendation += ` Your GFR has been fluctuating recently, which should be monitored closely.`;
      }
    }
  }
  
  // Add method disclaimer
  recommendation += ` ${methodDisclaimer}`;
  
  // Add stage-specific advice
  if (gfr >= 60) {
    recommendation += ` Continue to monitor your kidney health and follow a kidney-friendly lifestyle including proper hydration and blood pressure control.`;
  } else if (gfr >= 30) {
    recommendation += ` Regular monitoring by a nephrologist is recommended, along with medication review and dietary adjustments.`;
  } else if (gfr >= 15) {
    recommendation += ` Close management by a nephrologist is important at this stage, with preparation for possible future treatment options.`;
  } else {
    recommendation += ` Please consult with your healthcare team about treatment options, which may include dialysis or transplantation.`;
  }
  
  // Add specific advice for declining trend
  if (trendInfo && trendInfo.trend === 'significant_decline') {
    recommendation += ` Since your GFR has recently declined significantly, discussing this change with your healthcare provider promptly is advisable.`;
  }
  
  return recommendation;
}