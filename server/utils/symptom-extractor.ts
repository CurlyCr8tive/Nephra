/**
 * AI Symptom Extraction Service
 * 
 * Estimates fatigue, pain, and stress scores from:
 * 1. Journal emotion indicators (happy, calm, stressed, tired, worried)
 * 2. Keyword/phrase triggers in journal entries
 * 3. AI companion chat messages
 * 
 * This creates a triangulated symptom estimate when users don't explicitly rate symptoms.
 * 
 * Evidence Base:
 * - NIH PROMIS Fatigue Item Bank (fatigue vocabulary)
 * - ESAS (Edmonton Symptom Assessment Scale) for pain lexicon
 * - NIH PROMIS Emotional Distress for stress/anxiety metrics
 * - KDIGO Symptom Management in CKD
 * - NIDDK CKD Symptoms and Quality of Life studies
 */

export type EmotionIndicator = 'happy' | 'calm' | 'stressed' | 'tired' | 'worried';

export interface SymptomEstimates {
  fatigue_score: number | null;
  pain_score: number | null;
  stress_score: number | null;
  confidence: 'high' | 'moderate' | 'low';
  detected_triggers: {
    fatigue: string[];
    pain: string[];
    stress: string[];
  };
  source: 'emotion_icon' | 'keywords' | 'hybrid';
}

/**
 * Fatigue keyword triggers (NIH PROMIS Fatigue Item Bank, KDIGO)
 */
const FATIGUE_TRIGGERS = {
  severe: [
    "exhausted",
    "can't get out of bed",
    "completely drained",
    "no energy at all",
    "wiped out",
    "can barely move",
  ],
  moderate: [
    "worn out",
    "drained",
    "fatigued",
    "low energy",
    "no stamina",
    "tired after doing nothing",
    "everything feels heavy",
    "sluggish",
    "run down",
  ],
  mild: [
    "tired",
    "sleepy",
    "weary",
    "low on energy",
    "need rest",
    "feeling drained",
  ],
};

/**
 * Pain keyword triggers (ESAS, NIH Pain Consortium, PROMIS Pain)
 */
const PAIN_TRIGGERS = {
  severe: [
    "severe pain",
    "unbearable",
    "excruciating",
    "sharp stabbing",
    "pain getting worse",
    "intense pain",
    "pain is terrible",
  ],
  moderate: [
    "aching",
    "throbbing",
    "burning",
    "cramping",
    "flank pain",
    "kidney area hurts",
    "back pain",
    "constant ache",
    "pain when breathing",
  ],
  mild: [
    "sore",
    "soreness",
    "dull pain",
    "slight ache",
    "uncomfortable",
    "tender",
  ],
};

/**
 * Stress/anxiety keyword triggers (PROMIS Emotional Distress, KDIGO)
 */
const STRESS_TRIGGERS = {
  severe: [
    "overwhelmed",
    "can't cope",
    "breaking down",
    "panic",
    "extremely anxious",
    "falling apart",
    "too much pressure",
  ],
  moderate: [
    "stressed",
    "anxious",
    "worried",
    "tense",
    "on edge",
    "irritable",
    "mentally exhausted",
    "under pressure",
    "emotional strain",
  ],
  mild: [
    "a bit stressed",
    "slightly anxious",
    "uneasy",
    "concerned",
    "restless",
  ],
};

/**
 * Analyze text for symptom keywords and return detected triggers
 */
function detectSymptomKeywords(text: string): {
  fatigue: { level: 'mild' | 'moderate' | 'severe', matches: string[] }[];
  pain: { level: 'mild' | 'moderate' | 'severe', matches: string[] }[];
  stress: { level: 'mild' | 'moderate' | 'severe', matches: string[] }[];
} {
  const lowerText = text.toLowerCase();
  
  const detectInCategory = (triggers: typeof FATIGUE_TRIGGERS) => {
    const results: { level: 'mild' | 'moderate' | 'severe', matches: string[] }[] = [];
    
    for (const [level, keywords] of Object.entries(triggers)) {
      const matches = keywords.filter(keyword => lowerText.includes(keyword));
      if (matches.length > 0) {
        results.push({
          level: level as 'mild' | 'moderate' | 'severe',
          matches,
        });
      }
    }
    
    return results;
  };
  
  return {
    fatigue: detectInCategory(FATIGUE_TRIGGERS),
    pain: detectInCategory(PAIN_TRIGGERS),
    stress: detectInCategory(STRESS_TRIGGERS),
  };
}

/**
 * Convert keyword detections to a 0-10 score
 */
function keywordsToScore(
  detections: { level: 'mild' | 'moderate' | 'severe', matches: string[] }[]
): number | null {
  if (detections.length === 0) return null;
  
  // Find highest severity level
  const hasSevere = detections.some(d => d.level === 'severe');
  const hasModerate = detections.some(d => d.level === 'moderate');
  const hasMild = detections.some(d => d.level === 'mild');
  
  // Count total matches for confidence
  const totalMatches = detections.reduce((sum, d) => sum + d.matches.length, 0);
  
  if (hasSevere) {
    // Severe: 8-10
    return totalMatches >= 3 ? 10 : totalMatches === 2 ? 9 : 8;
  } else if (hasModerate) {
    // Moderate: 5-7
    return totalMatches >= 3 ? 7 : totalMatches === 2 ? 6 : 5;
  } else if (hasMild) {
    // Mild: 2-4
    return totalMatches >= 2 ? 4 : 3;
  }
  
  return null;
}

/**
 * Map emotion indicator to base symptom scores
 */
function emotionToScores(emotion: EmotionIndicator): {
  fatigue: number | null;
  stress: number | null;
} {
  switch (emotion) {
    case 'tired':
      return { fatigue: 6, stress: 3 };
    case 'stressed':
      return { fatigue: 4, stress: 7 };
    case 'worried':
      return { fatigue: 3, stress: 6 };
    case 'calm':
      return { fatigue: 2, stress: 1 };
    case 'happy':
      return { fatigue: 1, stress: 1 };
  }
}

/**
 * Estimate symptom scores from journal entry or chat message
 * 
 * Algorithm:
 * 1. Start with emotion indicator (if provided)
 * 2. Detect keywords in text
 * 3. Combine both for final estimate with confidence level
 * 
 * @param text - Journal entry or chat message text
 * @param emotion - Selected emotion indicator (optional)
 * @returns Estimated fatigue, pain, stress scores (0-10) with confidence
 */
export function estimateSymptomsFromText(
  text: string,
  emotion?: EmotionIndicator
): SymptomEstimates {
  // Detect keywords
  const keywords = detectSymptomKeywords(text);
  
  // Convert keywords to scores
  const fatigueFromKeywords = keywordsToScore(keywords.fatigue);
  const painFromKeywords = keywordsToScore(keywords.pain);
  const stressFromKeywords = keywordsToScore(keywords.stress);
  
  // Get emotion-based estimates
  let fatigueFromEmotion: number | null = null;
  let stressFromEmotion: number | null = null;
  
  if (emotion) {
    const emotionScores = emotionToScores(emotion);
    fatigueFromEmotion = emotionScores.fatigue;
    stressFromEmotion = emotionScores.stress;
  }
  
  // Combine estimates with weighting
  // Keywords are more specific, so they get priority
  let fatigue_score: number | null = null;
  let stress_score: number | null = null;
  let confidence: 'high' | 'moderate' | 'low' = 'low';
  let source: 'emotion_icon' | 'keywords' | 'hybrid' = 'emotion_icon';
  
  if (fatigueFromKeywords !== null && fatigueFromEmotion !== null) {
    // Hybrid: Average with keyword bias (70/30 split)
    fatigue_score = Math.round(fatigueFromKeywords * 0.7 + fatigueFromEmotion * 0.3);
    confidence = 'high';
    source = 'hybrid';
  } else if (fatigueFromKeywords !== null) {
    fatigue_score = fatigueFromKeywords;
    confidence = 'moderate';
    source = 'keywords';
  } else if (fatigueFromEmotion !== null) {
    fatigue_score = fatigueFromEmotion;
    confidence = 'low';
    source = 'emotion_icon';
  }
  
  if (stressFromKeywords !== null && stressFromEmotion !== null) {
    stress_score = Math.round(stressFromKeywords * 0.7 + stressFromEmotion * 0.3);
    confidence = 'high';
    source = 'hybrid';
  } else if (stressFromKeywords !== null) {
    stress_score = stressFromKeywords;
    confidence = 'moderate';
    source = 'keywords';
  } else if (stressFromEmotion !== null) {
    stress_score = stressFromEmotion;
    confidence = 'low';
    source = 'emotion_icon';
  }
  
  // Pain only from keywords (no emotion mapping for pain)
  const pain_score = painFromKeywords;
  if (painFromKeywords !== null && confidence === 'low') {
    confidence = 'moderate';
  }
  
  return {
    fatigue_score,
    pain_score,
    stress_score,
    confidence,
    detected_triggers: {
      fatigue: keywords.fatigue.flatMap(d => d.matches),
      pain: keywords.pain.flatMap(d => d.matches),
      stress: keywords.stress.flatMap(d => d.matches),
    },
    source,
  };
}

/**
 * Suggest KSLS tracking based on symptom estimates
 * 
 * Returns recommendation message if symptoms warrant KSLS calculation
 */
export function shouldSuggestKSLS(estimates: SymptomEstimates): {
  suggest: boolean;
  message: string | null;
} {
  const hasModerateFatigue = estimates.fatigue_score !== null && estimates.fatigue_score >= 5;
  const hasModerateStress = estimates.stress_score !== null && estimates.stress_score >= 5;
  const hasPain = estimates.pain_score !== null && estimates.pain_score >= 3;
  
  if (hasModerateFatigue || hasModerateStress || hasPain) {
    let message = "Based on what you've shared, it might be helpful to track your Kidney Stress Load Score (KSLS) today. ";
    
    if (hasModerateFatigue) {
      message += "Your fatigue level suggests your body is under some stress. ";
    }
    if (hasModerateStress) {
      message += "Stress can impact blood pressure and kidney health. ";
    }
    if (hasPain) {
      message += "Pain is an important signal to monitor. ";
    }
    
    message += "Would you like to log your health metrics and see your KSLS?";
    
    return { suggest: true, message };
  }
  
  return { suggest: false, message: null };
}

/**
 * Example usage in journal or chat:
 * 
 * const text = "I'm feeling exhausted today, can't get out of bed, and have some flank pain";
 * const emotion = "tired";
 * const estimates = estimateSymptomsFromText(text, emotion);
 * 
 * // estimates = {
 * //   fatigue_score: 9,
 * //   pain_score: 6,
 * //   stress_score: 3,
 * //   confidence: 'high',
 * //   detected_triggers: {
 * //     fatigue: ['exhausted', "can't get out of bed"],
 * //     pain: ['flank pain'],
 * //     stress: []
 * //   },
 * //   source: 'hybrid'
 * // }
 * 
 * const suggestion = shouldSuggestKSLS(estimates);
 * if (suggestion.suggest) {
 *   // Show suggestion.message to user
 * }
 */
