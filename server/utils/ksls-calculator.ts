/**
 * Kidney Stress Load Score (KSLS) Calculator
 * 
 * KSLS is a wellness/stress index (0-100) that helps patients understand daily kidney stress.
 * 
 * IMPORTANT PRINCIPLES:
 * 1. KSLS is NOT a GFR estimate or medical diagnosis
 * 2. KSLS is a wellness index based on modifiable daily factors
 * 3. Demographics (age, sex, race) are NEVER used in score calculation
 * 4. Demographics are ONLY used in interpretation for educational context
 * 5. The score reflects controllable factors: BP, hydration, symptoms, BMI
 * 
 * Based on evidence from:
 * - National Kidney Foundation (kidney.org)
 * - KDIGO guidelines for CKD management
 * - NIDDK kidney health recommendations
 * 
 * @see docs/KSLS.md for detailed documentation
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Input data for KSLS calculation
 * All required fields except optional symptom scores
 */
export interface KSLSInput {
  // Vital signs
  systolic_bp: number;        // Blood pressure (mmHg)
  diastolic_bp: number;       // Blood pressure (mmHg)
  
  // Hydration
  fluid_intake_liters: number;  // Actual fluid intake
  fluid_target_liters: number;  // Prescribed/target fluid intake
  
  // Symptoms (0-10 scale, optional)
  fatigue_score?: number | null;
  pain_score?: number | null;
  stress_score?: number | null;
  
  // Body measurements
  height_cm: number;
  weight_kg: number;
}

/**
 * Demographics for interpretation ONLY
 * These fields are NEVER used in the numeric KSLS calculation
 */
export interface Demographics {
  age?: number | null;
  sex_assigned_at_birth?: "female" | "male" | "other" | "unknown" | null;
  race_ethnicity?: string | null;  // Free text, for context only
  ckd_stage?: string | number | null;  // Used only for messaging
}

/**
 * Individual normalized stress factors (0-1 scale)
 * Used for transparency and debugging
 */
export interface KSLSFactors {
  bp_norm: number;              // Blood pressure stress
  hydro_norm: number;            // Hydration stress
  fatigue_norm: number | null;   // Fatigue stress (null if not provided)
  pain_norm: number | null;      // Pain stress (null if not provided)
  stress_norm: number | null;    // Emotional stress (null if not provided)
  weight_norm: number;           // BMI stress
}

/**
 * KSLS calculation result
 */
export interface KSLSResult {
  ksls: number;                 // 0-100 kidney stress load score
  band: "stable" | "elevated" | "high";  // Risk band
  factors: KSLSFactors;         // Individual factor contributions
  bmi: number;                  // Calculated BMI for reference
}

/**
 * Human-readable interpretation with demographic-aware messaging
 */
export interface KSLSInterpretation {
  summary: string;              // Short headline
  detail: string;               // 1-3 sentences explaining drivers
  safety_note: string;          // Disclaimer about KSLS vs GFR
  personalized_context?: string; // Optional demographic-informed education
  top_factors: string[];        // Top 2-3 factors driving the score
}

// ============================================================================
// KSLS CALCULATION (PURE, DEMOGRAPHIC-AGNOSTIC)
// ============================================================================

/**
 * Calculate Kidney Stress Load Score (KSLS)
 * 
 * This is a PURE function that computes a 0-100 wellness index.
 * Demographics are NEVER used in this calculation.
 * 
 * @param input - Health measurements and symptoms
 * @returns KSLS result with score, band, and factor breakdown
 */
export function calculateKSLS(input: KSLSInput): KSLSResult {
  // Step 1: Calculate BMI
  const height_m = input.height_cm / 100;
  const bmi = input.weight_kg / (height_m * height_m);
  
  // Step 2: Normalize each factor to 0-1 "stress" scale
  const factors = normalizeFactors(input, bmi);
  
  // Step 3: Calculate weighted score with dynamic weight adjustment
  const raw_score = calculateWeightedScore(factors);
  
  // Step 4: Convert to 0-100 scale and determine band
  const ksls = Math.round(Math.max(0, Math.min(1, raw_score)) * 100);
  const band = determineBand(ksls);
  
  return {
    ksls,
    band,
    factors,
    bmi: Math.round(bmi * 10) / 10, // Round to 1 decimal
  };
}

/**
 * Normalize all input factors to 0-1 stress scale
 * Higher values = more kidney stress
 */
function normalizeFactors(input: KSLSInput, bmi: number): KSLSFactors {
  return {
    bp_norm: normalizeBloodPressure(input.systolic_bp, input.diastolic_bp),
    hydro_norm: normalizeHydration(input.fluid_intake_liters, input.fluid_target_liters),
    fatigue_norm: normalizeSymptom(input.fatigue_score),
    pain_norm: normalizeSymptom(input.pain_score),
    stress_norm: normalizeSymptom(input.stress_score),
    weight_norm: normalizeBMI(bmi),
  };
}

/**
 * Normalize blood pressure to stress value (0-1)
 * 
 * Based on JNC 8 and KDIGO guidelines:
 * - <120/80: Normal (0)
 * - 120-139/80-89: Elevated (0-1 linear)
 * - ≥140/90: High (1)
 */
function normalizeBloodPressure(systolic: number, diastolic: number): number {
  let bp_norm: number;
  
  if (systolic <= 120) {
    bp_norm = 0.0;
  } else if (systolic < 140) {
    // Linear interpolation: 120→0, 140→1
    bp_norm = (systolic - 120) / 20.0;
  } else {
    bp_norm = 1.0;
  }
  
  // If diastolic is high (≥90), ensure minimum stress of 0.7
  if (diastolic >= 90 && bp_norm < 0.7) {
    bp_norm = 0.7;
  }
  
  return Math.max(0, Math.min(1, bp_norm));
}

/**
 * Normalize hydration relative to target (0-1)
 * 
 * Based on KDOQI fluid management guidelines:
 * - 90-110% of target: Optimal (0)
 * - 60-90% or 110-150%: Suboptimal (0-1 linear)
 * - <60% or >150%: High stress (1)
 */
function normalizeHydration(intake: number, target: number): number {
  if (target === 0) {
    // If no target set, assume any intake is acceptable
    return 0;
  }
  
  const ratio = intake / target;
  let hydro_norm: number;
  
  if (ratio >= 0.9 && ratio <= 1.1) {
    // Within 10% of target: optimal
    hydro_norm = 0.0;
  } else if (ratio >= 0.6 && ratio < 0.9) {
    // Under-hydrated: linear from 0.6→1 to 0.9→0
    hydro_norm = (0.9 - ratio) / 0.3;
  } else if (ratio > 1.1 && ratio <= 1.5) {
    // Over-hydrated: linear from 1.1→0 to 1.5→1
    hydro_norm = (ratio - 1.1) / 0.4;
  } else {
    // Severely off target
    hydro_norm = 1.0;
  }
  
  return Math.max(0, Math.min(1, hydro_norm));
}

/**
 * Normalize symptom score (0-10) to stress value (0-1)
 * Returns null if symptom not provided
 */
function normalizeSymptom(score?: number | null): number | null {
  if (score === null || score === undefined) {
    return null;
  }
  return Math.max(0, Math.min(1, score / 10.0));
}

/**
 * Normalize BMI to stress value (0-1)
 * 
 * Based on NKF recommendations for kidney health:
 * - 20-30: Healthy range (0)
 * - 30-40: Overweight/obese (0-1 linear)
 * - >40: Severe obesity (1)
 * - <20: Underweight (0-1 linear from 20→0 to 15→1)
 */
function normalizeBMI(bmi: number): number {
  let weight_norm: number;
  
  if (bmi >= 20 && bmi <= 30) {
    weight_norm = 0.0;
  } else if (bmi > 30 && bmi <= 40) {
    // Obesity: linear from 30→0 to 40→1
    weight_norm = (bmi - 30) / 10.0;
  } else if (bmi > 40) {
    weight_norm = 1.0;
  } else {
    // Underweight: linear from 20→0 to 15→1
    weight_norm = (20 - bmi) / 5.0;
  }
  
  return Math.max(0, Math.min(1, weight_norm));
}

/**
 * Calculate weighted score with dynamic weight adjustment for missing symptoms
 * 
 * Base weights (when all factors present):
 * - Blood pressure: 0.35 (most critical for kidney health)
 * - Hydration: 0.15 (fluid management is key in CKD)
 * - Fatigue: 0.15 (common symptom)
 * - Pain: 0.10 (important but less common)
 * - Stress: 0.10 (affects BP and compliance)
 * - Weight/BMI: 0.15 (long-term risk factor)
 * 
 * If symptoms are missing, weights are re-normalized proportionally
 */
function calculateWeightedScore(factors: KSLSFactors): number {
  // Base weights
  const baseWeights = {
    bp: 0.35,
    hydration: 0.15,
    fatigue: 0.15,
    pain: 0.10,
    stress: 0.10,
    weight: 0.15,
  };
  
  // Determine which factors are available
  const available: { [key: string]: number } = {
    bp: baseWeights.bp,
    hydration: baseWeights.hydration,
    weight: baseWeights.weight,
  };
  
  if (factors.fatigue_norm !== null) {
    available.fatigue = baseWeights.fatigue;
  }
  if (factors.pain_norm !== null) {
    available.pain = baseWeights.pain;
  }
  if (factors.stress_norm !== null) {
    available.stress = baseWeights.stress;
  }
  
  // Calculate total weight of available factors
  const totalWeight = Object.values(available).reduce((sum, w) => sum + w, 0);
  
  // Normalize weights to sum to 1.0
  const normalizedWeights: { [key: string]: number } = {};
  for (const [key, weight] of Object.entries(available)) {
    normalizedWeights[key] = weight / totalWeight;
  }
  
  // Calculate weighted sum
  let score = 0;
  score += normalizedWeights.bp * factors.bp_norm;
  score += normalizedWeights.hydration * factors.hydro_norm;
  score += normalizedWeights.weight * factors.weight_norm;
  
  if (factors.fatigue_norm !== null && normalizedWeights.fatigue) {
    score += normalizedWeights.fatigue * factors.fatigue_norm;
  }
  if (factors.pain_norm !== null && normalizedWeights.pain) {
    score += normalizedWeights.pain * factors.pain_norm;
  }
  if (factors.stress_norm !== null && normalizedWeights.stress) {
    score += normalizedWeights.stress * factors.stress_norm;
  }
  
  return score;
}

/**
 * Determine risk band from KSLS score
 * 
 * Bands:
 * - 0-33: Stable (minimal kidney stress)
 * - 34-66: Elevated (moderate stress, needs attention)
 * - 67-100: High (significant stress, consult care team)
 */
function determineBand(ksls: number): "stable" | "elevated" | "high" {
  if (ksls <= 33) {
    return "stable";
  } else if (ksls <= 66) {
    return "elevated";
  } else {
    return "high";
  }
}

// ============================================================================
// INTERPRETATION (DEMOGRAPHIC-INFORMED, BUT NOT SCORE-CHANGING)
// ============================================================================

/**
 * Generate human-readable interpretation of KSLS
 * 
 * CRITICAL: This function does NOT change the numeric score or band.
 * Demographics are used ONLY for educational context and personalized messaging.
 * 
 * @param result - KSLS calculation result
 * @param demographics - User demographics (optional, for context only)
 * @returns Human-readable interpretation
 */
export function interpretKSLS(
  result: KSLSResult,
  demographics?: Demographics
): KSLSInterpretation {
  // Generate base messaging based on band
  const summary = generateSummary(result.band);
  
  // Identify top contributing factors
  const topFactors = identifyTopFactors(result.factors);
  
  // Generate detailed explanation
  const detail = generateDetail(result.factors, topFactors);
  
  // Add demographic-informed context (educational only)
  const personalized_context = demographics
    ? generatePersonalizedContext(result, demographics, topFactors)
    : undefined;
  
  // Always include safety disclaimer
  const safety_note = 
    "This Kidney Stress Load Score measures daily stress on your kidneys from modifiable factors like blood pressure and hydration. " +
    "It is NOT a measure of kidney function (GFR) or a medical diagnosis. " +
    "This score is based on the information you enter and current kidney care guidelines. " +
    "For sudden changes, severe symptoms, or concerns, contact your healthcare team or emergency services immediately.";
  
  return {
    summary,
    detail,
    safety_note,
    personalized_context,
    top_factors: topFactors.map(f => f.name),
  };
}

/**
 * Generate summary headline based on band
 */
function generateSummary(band: "stable" | "elevated" | "high"): string {
  switch (band) {
    case "stable":
      return "Your kidney stress load looks stable today.";
    case "elevated":
      return "Your kidneys may be under extra stress today.";
    case "high":
      return "Your kidney stress load is high today.";
  }
}

/**
 * Identify top 2-3 contributing factors
 */
function identifyTopFactors(factors: KSLSFactors): Array<{name: string, value: number}> {
  const factorList: Array<{name: string, value: number}> = [
    { name: "blood pressure", value: factors.bp_norm },
    { name: "hydration", value: factors.hydro_norm },
    { name: "weight/BMI", value: factors.weight_norm },
  ];
  
  if (factors.fatigue_norm !== null) {
    factorList.push({ name: "fatigue", value: factors.fatigue_norm });
  }
  if (factors.pain_norm !== null) {
    factorList.push({ name: "pain", value: factors.pain_norm });
  }
  if (factors.stress_norm !== null) {
    factorList.push({ name: "emotional stress", value: factors.stress_norm });
  }
  
  // Sort by value descending and take top 3
  return factorList
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
}

/**
 * Generate detailed explanation of score drivers
 */
function generateDetail(factors: KSLSFactors, topFactors: Array<{name: string, value: number}>): string {
  const sentences: string[] = [];
  
  // Mention top 2 factors if they're significant
  const significantFactors = topFactors.filter(f => f.value > 0.3);
  
  if (significantFactors.length === 0) {
    return "All your tracked factors look stable today. Keep up the good work with your kidney health routine.";
  }
  
  if (significantFactors.length === 1) {
    const factor = significantFactors[0];
    sentences.push(`Your ${factor.name} is the main contributor to your stress load today.`);
  } else {
    const factorNames = significantFactors.map(f => f.name).join(" and ");
    sentences.push(`Your ${factorNames} are contributing most to your stress load today.`);
  }
  
  // Add specific guidance for top factor
  const topFactor = significantFactors[0];
  if (topFactor.name === "blood pressure" && factors.bp_norm > 0.5) {
    sentences.push("Consider discussing blood pressure management with your care team.");
  } else if (topFactor.name === "hydration" && factors.hydro_norm > 0.5) {
    sentences.push("Try to drink closer to your target fluid amount for optimal kidney health.");
  } else if (topFactor.name === "fatigue" && factors.fatigue_norm && factors.fatigue_norm > 0.5) {
    sentences.push("Fatigue can signal your body needs rest or may indicate other health factors worth discussing with your doctor.");
  } else if (topFactor.name === "pain" && factors.pain_norm && factors.pain_norm > 0.5) {
    sentences.push("Persistent pain should be discussed with your healthcare provider.");
  } else if (topFactor.name === "weight/BMI" && factors.weight_norm > 0.5) {
    sentences.push("Maintaining a healthy weight can reduce long-term stress on your kidneys.");
  }
  
  return sentences.join(" ");
}

/**
 * Generate demographic-informed educational context
 * 
 * CRITICAL: Demographics are ONLY used for messaging, never for score calculation
 * This provides culturally relevant, equity-focused education
 */
/**
 * Generates personalized health context based on demographics
 * 
 * CRITICAL: This function NEVER changes the KSLS score.
 * It only provides educational context using evidence-based guidelines.
 * 
 * Sources:
 * - KDIGO 2021 CKD Guidelines (age, BP, CKD stage)
 * - NIDDK CKD Aging Cohort (hydration, fatigue in older adults)
 * - NIH PROMIS Fatigue Item Bank (sex-based symptom patterns)
 * - National Kidney Foundation (hydration, weight management)
 * - CDC Kidney Disparities Reports (social determinants)
 */
function generatePersonalizedContext(
  result: KSLSResult,
  demographics: Demographics,
  topFactors: Array<{name: string, value: number}>
): string {
  const messages: string[] = [];
  
  // Age-based context (KDIGO, NIDDK CKD Aging Cohort)
  if (demographics.age) {
    if (demographics.age >= 60) {
      // Older adults: Less physiological reserve, hydration critical
      if (result.factors.bp_norm > 0.3 || result.factors.hydro_norm > 0.3) {
        messages.push(
          "People over 60 may feel dehydration or fatigue earlier in the day. That doesn't always mean kidney decline, " +
          "but it's worth monitoring your hydration and energy levels. Keeping blood pressure and hydration within your " +
          "target range can make a significant difference in daily kidney stress. (Source: KDIGO CKD Guidelines, NIDDK CKD Aging Cohort)"
        );
      }
      if (result.band === "elevated" || result.band === "high") {
        messages.push(
          "At your age, staying near your target ranges for blood pressure and hydration helps protect long-term kidney function. " +
          "Small daily adjustments can reduce overall stress on your kidneys."
        );
      }
    } else if (demographics.age < 30) {
      // Younger adults: Often stress/lifestyle driven
      if (result.factors.stress_norm !== null && result.factors.stress_norm > 0.5) {
        messages.push(
          "Fatigue and stress in younger adults are often influenced by sleep, workload, and hydration patterns. " +
          "Your kidneys may be fine, but your body is signaling it needs rest or balance. Consider tracking sleep and stress triggers."
        );
      }
    } else if (demographics.age >= 30 && demographics.age < 60) {
      // Midlife: Prevention critical window
      if (result.band === "elevated" || result.band === "high") {
        messages.push(
          "Your midlife years are a critical window for kidney health. Consistent BP management, healthy weight, " +
          "and hydration habits now can significantly reduce risk of kidney decline later. (Source: National Kidney Foundation)"
        );
      }
    }
  }
  
  // Sex-based context (NIH PROMIS, KDIGO 2021 sex-based symptom patterns)
  // These are symptom presentation differences, NOT diagnostic differences
  if (demographics.sex_assigned_at_birth === "female") {
    if (result.factors.fatigue_norm !== null && result.factors.fatigue_norm > 0.4) {
      messages.push(
        "For women in midlife and beyond, fatigue can appear as an early warning signal before lab values change. " +
        "Today's score reflects more symptom load than pressure load. This is a normal pattern to track and discuss with your care team. " +
        "(Source: NIH PROMIS Fatigue Item Bank, KDIGO Guidelines)"
      );
    }
    if (result.factors.pain_norm !== null && result.factors.pain_norm > 0.5) {
      messages.push(
        "Women with CKD often experience pain earlier and more frequently than men, particularly in the flank area. " +
        "If pain is new, worsening, or accompanied by fever, contact your healthcare team."
      );
    }
  } else if (demographics.sex_assigned_at_birth === "male") {
    if (result.factors.bp_norm > 0.4) {
      messages.push(
        "For men, elevated blood pressure tends to be a stronger signal of kidney stress over time. Blood pressure often becomes " +
        "a key driver before other symptoms appear. Consistent monitoring and management is especially important for long-term kidney protection. " +
        "(Source: KDIGO 2021 Guidelines)"
      );
    }
  }
  
  // Race/ethnicity context (CDC, NKF - EQUITY FOCUSED, NOT BIOLOGICAL)
  // This addresses social determinants of health, structural barriers, NOT genetics
  if (demographics.race_ethnicity) {
    const raceEthLower = demographics.race_ethnicity.toLowerCase();
    if (
      raceEthLower.includes("black") ||
      raceEthLower.includes("african")
    ) {
      messages.push(
        "Black and African American adults face higher rates of high blood pressure and kidney disease due to " +
        "**social and structural factors**—including systemic barriers to care, food security, environmental stress, and inequitable access to quality healthcare—**NOT biology or genetics**. " +
        "Nephra **never uses race to calculate your score**. We highlight this information to help you advocate for your kidney health, " +
        "demand personalized care, and access resources that address the root causes of health disparities in your community. " +
        "(Source: CDC Kidney Disparities Report, National Kidney Foundation)"
      );
    } else if (
      raceEthLower.includes("latino") ||
      raceEthLower.includes("hispanic") ||
      raceEthLower.includes("latinx")
    ) {
      messages.push(
        "Latinx and Hispanic communities often face barriers to kidney care access, including language barriers, insurance gaps, " +
        "and structural inequities in healthcare systems. These are **social factors, not biological ones**. " +
        "Nephra focuses on the factors you can control today—like blood pressure and hydration—without using race in the score. " +
        "You deserve quality, culturally responsive care. Don't hesitate to ask your providers for support in your preferred language. " +
        "(Source: National Kidney Foundation, CDC)"
      );
    }
  }
  
  // BMI/Weight context (National Kidney Foundation, KDIGO)
  if (result.bmi) {
    if (result.bmi > 30 && result.factors.weight_norm > 0.3) {
      messages.push(
        "Your KSLS today is influenced partly by weight-related blood pressure strain. Even small improvements in sleep, movement, " +
        "or nutrition can reduce daily kidney load. Focus on sustainable changes, not rapid weight loss. " +
        "(Source: National Kidney Foundation Healthy Weight Guidelines)"
      );
    } else if (result.bmi < 20) {
      messages.push(
        "Lower body weight can sometimes mean smaller changes in hydration have a bigger impact on how you feel. " +
        "Make sure you're meeting your fluid and nutrition targets, especially on active days."
      );
    }
  }
  
  // CKD stage context (KDIGO, KDOQI)
  if (demographics.ckd_stage) {
    if (demographics.ckd_stage >= 3) {
      if (result.band === "elevated" || result.band === "high") {
        messages.push(
          "With Stage 3+ CKD, daily factors like blood pressure, fluid intake, and stress have an even bigger impact on how you feel. " +
          "Small daily changes—like drinking closer to your target, reducing salt, and managing stress—can make a real difference in symptoms and long-term outcomes. " +
          "(Source: KDIGO CKD Guidelines, KDOQI Clinical Practice Guidelines)"
        );
      }
    }
    if (demographics.ckd_stage >= 4) {
      messages.push(
        "With advanced CKD, you may be more sensitive to fluid imbalances and BP changes. Work closely with your nephrologist " +
        "to fine-tune your daily targets. Your KSLS can help you spot patterns between daily habits and how you feel."
      );
    }
  }
  
  // Top factor-specific guidance
  if (topFactors.length > 0 && topFactors[0].name === "blood pressure") {
    if (result.factors.bp_norm >= 0.7) {
      messages.push(
        "Blood pressure is your biggest contributor today. If this persists for 2-3 days, check in with your healthcare team. " +
        "In the short term, reduce salt, stay hydrated, and avoid stressful situations when possible."
      );
    }
  }
  if (topFactors.length > 0 && topFactors[0].name === "hydration") {
    if (result.factors.hydro_norm >= 0.7) {
      messages.push(
        "Hydration is your biggest contributor today. If you're drinking far from your target, try setting hourly reminders. " +
        "Both under-hydration and over-hydration can stress your kidneys, so aim for the 'just right' zone your team prescribed."
      );
    }
  }
  
  return messages.join("\n\n");
}
