import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

/**
 * Interface for kidney health advisory results from Gemini
 */
export interface KidneyHealthAdvisory {
  advice: string;
  dietaryRecommendations: string[];
  lifestyleRecommendations: string[];
  medicationConsiderations: string[];
  followUpRecommendations: string[];
  emergencySigns: string[];
  requiresMedicalAttention: boolean;
}

/**
 * Interface for laboratory results analysis
 */
export interface LabResultsAnalysis {
  summary: string;
  keyFindings: string[];
  abnormalValues: { 
    value: string; 
    analysis: string; 
    severity: "mild" | "moderate" | "severe" | "critical" | "normal" 
  }[];
  trendAnalysis: string;
  recommendations: string[];
  requiresFollowUp: boolean;
}

/**
 * Interface for kidney education content
 */
export interface KidneyEducationContent {
  topic: string;
  contentSummary: string;
  contentDetails: string;
  keyPoints: string[];
  resources: string[];
  relatedTopics: string[];
}

/**
 * Provides tailored kidney health advice using Google Gemini
 * 
 * @param metrics Recent health metrics
 * @param patientInfo Patient information context
 * @returns Kidney health advisory with recommendations
 */
export async function getKidneyHealthAdvice(
  metrics: {
    hydration: number;
    systolicBP: number;
    diastolicBP: number;
    painLevel: number;
    stressLevel: number;
    estimatedGFR: number;
    date?: Date;
  },
  patientInfo?: {
    age?: number;
    gender?: string;
    stage?: number;
    conditions?: string[];
  }
): Promise<KidneyHealthAdvisory> {
  try {
    const prompt = `You are a specialized kidney health advisor AI. Based on the following health metrics and patient information, provide tailored kidney health advice.
    
    Health Metrics:
    - Hydration Level (1-10): ${metrics.hydration}
    - Blood Pressure: ${metrics.systolicBP}/${metrics.diastolicBP}
    - Pain Level (1-10): ${metrics.painLevel}
    - Stress Level (1-10): ${metrics.stressLevel}
    - Estimated GFR: ${metrics.estimatedGFR}
    ${metrics.date ? `- Date Recorded: ${metrics.date}` : ''}
    
    Patient Information:
    ${patientInfo?.age ? `- Age: ${patientInfo.age}` : ''}
    ${patientInfo?.gender ? `- Gender: ${patientInfo.gender}` : ''}
    ${patientInfo?.stage ? `- Kidney Disease Stage: ${patientInfo.stage}` : ''}
    ${patientInfo?.conditions && patientInfo.conditions.length > 0 ? `- Existing Conditions: ${patientInfo.conditions.join(', ')}` : ''}
    
    Provide your response in JSON format with the following structure:
    {
      "advice": "General advice about their kidney health based on the metrics",
      "dietaryRecommendations": ["1-3 specific, actionable dietary recommendations"],
      "lifestyleRecommendations": ["1-3 specific, actionable lifestyle recommendations"],
      "medicationConsiderations": ["Any considerations related to medications"],
      "followUpRecommendations": ["Recommendations for follow-up"],
      "emergencySigns": ["Signs that would require immediate medical attention"],
      "requiresMedicalAttention": true/false (Whether the current metrics suggest they should seek medical care)
    }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Parse JSON from response
    // Extract JSON from the response (handles cases where model might add explanatory text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse valid JSON from response");
    }
    
    return JSON.parse(jsonMatch[0]) as KidneyHealthAdvisory;
  } catch (error) {
    console.error("Error getting kidney health advice from Gemini:", error);
    return {
      advice: "Unable to generate personalized advice at this time. Please consult with your healthcare provider for guidance on your kidney health.",
      dietaryRecommendations: ["Maintain proper hydration", "Follow your healthcare provider's dietary guidelines"],
      lifestyleRecommendations: ["Monitor your blood pressure regularly", "Track your symptoms and share them with your healthcare team"],
      medicationConsiderations: ["Take medications as prescribed by your healthcare provider"],
      followUpRecommendations: ["Continue regular check-ups with your nephrologist"],
      emergencySigns: ["Severe pain", "Difficulty breathing", "Extreme swelling", "Confusion"],
      requiresMedicalAttention: false
    };
  }
}

/**
 * Analyze lab results using Google Gemini
 * 
 * @param labText The text content of the lab results
 * @param patientContext Additional patient context
 * @returns Analysis of lab results with key findings and recommendations
 */
export async function analyzeLaboratoryResults(
  labText: string,
  patientContext?: {
    age?: number;
    gender?: string;
    stage?: number;
    previousResults?: string;
  }
): Promise<LabResultsAnalysis> {
  try {
    const prompt = `You are a specialized medical AI focused on kidney health. Analyze the following laboratory results with a focus on kidney function and related markers.
    
    Lab Results:
    ${labText}
    
    Patient Context:
    ${patientContext?.age ? `- Age: ${patientContext.age}` : ''}
    ${patientContext?.gender ? `- Gender: ${patientContext.gender}` : ''}
    ${patientContext?.stage ? `- Kidney Disease Stage: ${patientContext.stage}` : ''}
    ${patientContext?.previousResults ? `- Previous Results: ${patientContext.previousResults}` : ''}
    
    Focus specifically on markers relevant to kidney function such as creatinine, BUN, eGFR, electrolytes, protein levels, and any other relevant kidney markers.
    
    Provide your analysis in JSON format with the following structure:
    {
      "summary": "Brief summary of the lab results",
      "keyFindings": ["List of key findings from the lab results"],
      "abnormalValues": [
        {
          "value": "Name and measurement of abnormal value",
          "analysis": "Brief analysis of this abnormal value",
          "severity": "mild/moderate/severe/critical/normal"
        }
      ],
      "trendAnalysis": "Analysis of trends if previous results are available",
      "recommendations": ["Specific recommendations based on these results"],
      "requiresFollowUp": true/false
    }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse valid JSON from response");
    }
    
    return JSON.parse(jsonMatch[0]) as LabResultsAnalysis;
  } catch (error) {
    console.error("Error analyzing lab results with Gemini:", error);
    return {
      summary: "Unable to generate a detailed analysis at this time. Please consult with your healthcare provider for interpretation of your lab results.",
      keyFindings: ["Analysis unavailable due to technical limitations"],
      abnormalValues: [],
      trendAnalysis: "Trend analysis unavailable",
      recommendations: ["Discuss these lab results with your healthcare provider"],
      requiresFollowUp: true
    };
  }
}

/**
 * Provides educational content about kidney disease topics using Google Gemini
 * 
 * @param topic The kidney disease related topic
 * @param audience The target audience (patient, caregiver, etc.)
 * @param diseaseStage Optional kidney disease stage for more targeted information
 * @returns Educational content about the requested topic
 */
export async function getKidneyEducationContent(
  topic: string,
  audience: string = "patient",
  diseaseStage?: number
): Promise<KidneyEducationContent> {
  try {
    const prompt = `You are an educational AI specializing in kidney disease information. Provide educational content about the following kidney-related topic:
    
    Topic: ${topic}
    Target Audience: ${audience}
    ${diseaseStage ? `Kidney Disease Stage: ${diseaseStage}` : ''}
    
    Provide comprehensive, evidence-based information that is easy to understand for the specified audience. Avoid medical jargon when possible, and explain technical terms when they are necessary to use.
    
    Format your response as JSON with the following structure:
    {
      "topic": "The specific topic",
      "contentSummary": "A brief summary of the content (1-2 sentences)",
      "contentDetails": "Detailed information about the topic (2-3 paragraphs)",
      "keyPoints": ["3-5 key points to remember"],
      "resources": ["Suggested resources for more information"],
      "relatedTopics": ["Related topics that might be of interest"]
    }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse valid JSON from response");
    }
    
    return JSON.parse(jsonMatch[0]) as KidneyEducationContent;
  } catch (error) {
    console.error("Error getting kidney education content from Gemini:", error);
    return {
      topic: topic,
      contentSummary: "Educational content temporarily unavailable.",
      contentDetails: "We're sorry, but the detailed information about this topic is not available at the moment. Please try again later or consult other educational resources provided by your healthcare team.",
      keyPoints: ["Consult with your healthcare provider for information about this topic"],
      resources: ["National Kidney Foundation (kidney.org)", "American Association of Kidney Patients (aakp.org)"],
      relatedTopics: ["General kidney health", "Kidney diet guidelines", "Understanding kidney disease stages"]
    };
  }
}