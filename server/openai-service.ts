import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Interface for validation result returned by OpenAI
 */
export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  analysis: string;
  concerns: string[];
  recommendations: string[];
}

/**
 * Validates a medical document or test result using OpenAI
 * 
 * @param documentType The type of medical document (test_result, scan, letter, etc.)
 * @param patientInfo Basic patient information for context
 * @param documentData The document data to validate
 * @returns A validation result with analysis and recommendations
 */
export async function validateMedicalDocument(
  documentType: string,
  patientInfo: {
    age?: number;
    gender?: string;
    stage?: number;
    conditions?: string[];
  },
  documentData: string
): Promise<ValidationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI trained to validate kidney-related medical documents. Analyze the provided ${documentType} and determine if it appears valid based on medical knowledge.
          
          Focus on identifying:
          1. Standard format and expected content for this document type
          2. Consistency of values and units
          3. Any anomalies or unexpected results
          4. Inconsistencies with the patient's known information
          
          The patient has stage ${patientInfo.stage || "unknown"} kidney disease.
          ${patientInfo.conditions?.length ? `Known conditions: ${patientInfo.conditions.join(", ")}` : ""}
          ${patientInfo.age ? `Age: ${patientInfo.age}` : ""}
          ${patientInfo.gender ? `Gender: ${patientInfo.gender}` : ""}
          
          Provide your assessment as JSON with: isValid (boolean), confidence (0-1), analysis (string), concerns (string[]), and recommendations (string[]).`
        },
        {
          role: "user",
          content: documentData
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content) as ValidationResult;
  } catch (error) {
    console.error("Error validating document with OpenAI:", error);
    return {
      isValid: false,
      confidence: 0,
      analysis: "An error occurred during document validation. Please try again later.",
      concerns: ["Unable to validate document due to a technical error."],
      recommendations: ["Please have a healthcare professional review this document."]
    };
  }
}

/**
 * Validates health metrics data using OpenAI
 * 
 * @param patientInfo Basic patient information for context
 * @param healthData The health metrics to validate
 * @returns A validation result with analysis and recommendations
 */
export async function validateHealthMetrics(
  patientInfo: {
    age?: number;
    gender?: string;
    stage?: number;
  },
  healthData: {
    date: Date;
    hydration: number;
    systolicBP: number;
    diastolicBP: number;
    painLevel: number;
    stressLevel: number;
    estimatedGFR: number;
  }
): Promise<ValidationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI trained to validate kidney health metrics. Analyze the provided health data and determine if it appears valid based on medical knowledge.
          
          Focus on identifying:
          1. Realistic values for each metric
          2. Consistency between related metrics (e.g., pain and stress)
          3. Any concerning values given the patient's kidney disease stage
          4. Values that would require immediate medical attention
          
          The patient has stage ${patientInfo.stage || "unknown"} kidney disease.
          ${patientInfo.age ? `Age: ${patientInfo.age}` : ""}
          ${patientInfo.gender ? `Gender: ${patientInfo.gender}` : ""}
          
          Provide your assessment as JSON with: isValid (boolean), confidence (0-1), analysis (string), concerns (string[]), and recommendations (string[]).`
        },
        {
          role: "user",
          content: `
          Date: ${healthData.date}
          Hydration level (1-10): ${healthData.hydration}
          Blood pressure: ${healthData.systolicBP}/${healthData.diastolicBP}
          Pain level (1-10): ${healthData.painLevel}
          Stress level (1-10): ${healthData.stressLevel}
          Estimated GFR: ${healthData.estimatedGFR}
          `
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content) as ValidationResult;
  } catch (error) {
    console.error("Error validating health metrics with OpenAI:", error);
    return {
      isValid: false,
      confidence: 0,
      analysis: "An error occurred during health metrics validation. Please try again later.",
      concerns: ["Unable to validate metrics due to a technical error."],
      recommendations: ["Continue monitoring your health and consult with your healthcare provider as scheduled."]
    };
  }
}

/**
 * Provides chat-based support and information for Nephra health using OpenAI
 * 
 * @param userMessage The user's message or question
 * @param userContext Additional context about the user
 * @returns AI response to the user's message
 */
export async function getNephraSupportChat(
  userMessage: string,
  userContext?: {
    age?: number;
    gender?: string;
    stage?: number;
    recentHealthMetrics?: {
      date: Date;
      hydration: number;
      systolicBP: number;
      diastolicBP: number;
      painLevel: number;
      stressLevel: number;
      estimatedGFR: number;
    }
  }
): Promise<string> {
  try {
    // Prepare context from user data if available
    let contextString = "";
    if (userContext) {
      contextString = `
      User context:
      ${userContext.age ? `Age: ${userContext.age}` : ""}
      ${userContext.gender ? `Gender: ${userContext.gender}` : ""}
      ${userContext.stage ? `Kidney disease stage: ${userContext.stage}` : ""}
      
      ${userContext.recentHealthMetrics ? `
      Recent health metrics (${userContext.recentHealthMetrics.date}):
      Hydration level: ${userContext.recentHealthMetrics.hydration}/10
      Blood pressure: ${userContext.recentHealthMetrics.systolicBP}/${userContext.recentHealthMetrics.diastolicBP}
      Pain level: ${userContext.recentHealthMetrics.painLevel}/10
      Stress level: ${userContext.recentHealthMetrics.stressLevel}/10
      Estimated GFR: ${userContext.recentHealthMetrics.estimatedGFR}
      ` : ""}
      `;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a compassionate Nephra health assistant providing support and information to patients with kidney disease. Your responses should be:
          
          1. Accurate and evidence-based
          2. Easy to understand without medical jargon
          3. Compassionate and supportive
          4. Careful not to provide specific medical advice that should come from a doctor
          
          Always clarify that you're providing general information, not medical advice, and encourage users to consult healthcare professionals for specific guidance.
          
          When answering questions about symptoms, medications, or treatments, focus on general education rather than specific recommendations.
          
          ${contextString}`
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response. Please try asking again.";
  } catch (error) {
    console.error("Error getting Nephra support from OpenAI:", error);
    return "I'm sorry, I'm having trouble processing your request right now. Please try again later or contact your healthcare provider if you have urgent questions.";
  }
}

/**
 * Analyzes a journal entry for emotional patterns using OpenAI
 * 
 * @param journalText The text content of the journal entry
 * @returns Sentiment analysis and emotional insights
 */
export async function analyzeJournalEntry(journalText: string): Promise<{
  sentiment: string;
  emotions: string[];
  analysis: string;
  suggestions: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an empathetic assistant trained to analyze journal entries for emotional patterns, particularly for people managing Nephra health.
          
          Analyze the provided journal entry and identify:
          1. Overall sentiment (positive, negative, neutral, mixed)
          2. Key emotions expressed
          3. Patterns related to health concerns, stress, or coping
          4. Supportive suggestions that might be helpful
          
          Provide your analysis as JSON with: sentiment (string), emotions (string[]), analysis (string), and suggestions (string[]).`
        },
        {
          role: "user",
          content: journalText
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content) as {
      sentiment: string;
      emotions: string[];
      analysis: string;
      suggestions: string[];
    };
  } catch (error) {
    console.error("Error analyzing journal with OpenAI:", error);
    return {
      sentiment: "unknown",
      emotions: [],
      analysis: "An error occurred during journal analysis. Please try again later.",
      suggestions: ["Continue journaling as it can be beneficial for emotional processing."]
    };
  }
}