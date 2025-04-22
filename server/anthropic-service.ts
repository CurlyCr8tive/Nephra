import Anthropic from "@anthropic-ai/sdk";

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Interface for health assessment results from Anthropic
 */
export interface HealthAnalysisResult {
  analysis: string;
  concerns: string[];
  recommendations: string[];
  summary: string;
  warningSign: boolean;
  warningMessage?: string;
}

/**
 * Analyzes health metrics using Claude AI
 * 
 * @param userId The ID of the user
 * @param metrics The health metrics to analyze
 * @returns An analysis of the health metrics with recommendations
 */
export async function analyzeHealthMetrics(
  userId: number,
  metrics: {
    date: Date;
    hydration: number;
    systolicBP: number;
    diastolicBP: number;
    painLevel: number;
    stressLevel: number;
    estimatedGFR: number;
  }
): Promise<HealthAnalysisResult> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      system: `You are a kidney health assistant analyzing patient metrics. 
      Analyze the health metrics for concerning patterns and provide recommendations. 
      Always be alert for warning signs related to kidney disease such as:
      - Blood pressure above 140/90
      - Significant pain levels (7+)
      - Stress levels (8+)
      - eGFR decline below 60 (concerning) or below 30 (severe)
      - Low hydration levels (below 3)
      
      Format your response as JSON with these keys:
      - analysis: A detailed analysis of the metrics
      - concerns: An array of specific concerns
      - recommendations: An array of actionable recommendations
      - summary: A concise summary of the overall health status
      - warningSign: true if any metrics indicate a serious health issue, false otherwise
      - warningMessage: A clear warning message if warningSign is true
      `,
      messages: [
        {
          role: "user",
          content: `Please analyze these kidney health metrics for user ${userId}:
          
          Date: ${metrics.date}
          Hydration level (1-10): ${metrics.hydration}
          Blood pressure: ${metrics.systolicBP}/${metrics.diastolicBP}
          Pain level (1-10): ${metrics.painLevel}
          Stress level (1-10): ${metrics.stressLevel}
          Estimated GFR: ${metrics.estimatedGFR}
          `
        }
      ],
    });

    // Parse the JSON response
    const resultText = response.content[0].text;
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Error analyzing health metrics with Anthropic:", error);
    return {
      analysis: "An error occurred while analyzing health metrics.",
      concerns: ["Unable to process metrics at this time."],
      recommendations: ["Please try again later or contact support if the issue persists."],
      summary: "Analysis failed due to a technical error.",
      warningSign: false
    };
  }
}

/**
 * Analyzes journal entries for emotional patterns using Claude AI
 * 
 * @param content The journal entry content
 * @returns The sentiment analysis with key emotions and recommendations
 */
export async function analyzeJournalSentiment(content: string): Promise<{
  sentiment: string;
  emotions: string[];
  analysis: string;
  recommendations: string[];
}> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 800,
      system: `You are an empathetic kidney health emotional support assistant.
      Analyze journal entries to identify emotional patterns and provide supportive recommendations.
      Focus on emotions related to chronic illness, medical treatments, and health journeys.
      Be especially mindful of signs of depression, anxiety, or burnout which are common in chronic kidney disease patients.
      
      Format your response as JSON with these keys:
      - sentiment: Overall sentiment (positive, negative, neutral, or mixed)
      - emotions: Array of key emotions detected
      - analysis: Thoughtful analysis of emotional state
      - recommendations: Array of supportive recommendations
      `,
      messages: [
        {
          role: "user",
          content: `Please analyze the emotional sentiment in this journal entry:
          
          ${content}`
        }
      ],
    });

    // Parse the JSON response
    const resultText = response.content[0].text;
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Error analyzing journal sentiment with Anthropic:", error);
    return {
      sentiment: "neutral",
      emotions: ["unknown"],
      analysis: "An error occurred while analyzing the journal entry.",
      recommendations: ["Please try again later or contact support if the issue persists."]
    };
  }
}

/**
 * Validates medical documents using Claude AI
 * 
 * @param documentType Type of medical document
 * @param documentText Text content of the medical document
 * @param patientContext Patient context information
 * @returns Validation results with analysis and recommendations
 */
export async function validateMedicalDocument(
  documentType: string,
  documentText: string,
  patientContext: {
    age?: number;
    gender?: string;
    kidneyDiseaseStage?: number;
    knownConditions?: string[];
  }
): Promise<{
  isValid: boolean;
  confidence: number;
  analysis: string;
  keyPoints: string[];
  recommendations: string[];
  flaggedIssues: string[];
}> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1200,
      system: `You are a medical document validation assistant for kidney patients.
      Analyze medical documents to validate their authenticity, extract key information, and provide actionable insights.
      Be attentive to inconsistencies, unusual values, or important health indicators relevant to kidney disease.
      
      Format your response as JSON with these keys:
      - isValid: Boolean indicating if the document appears authentic and consistent
      - confidence: Confidence score (0.0-1.0) in your assessment
      - analysis: Detailed analysis of the document
      - keyPoints: Array of important points extracted from the document
      - recommendations: Array of recommended actions based on the document
      - flaggedIssues: Array of potential issues or inconsistencies identified
      `,
      messages: [
        {
          role: "user",
          content: `Please validate this ${documentType} medical document with the following patient context:
          
          Patient context:
          ${patientContext.age ? `Age: ${patientContext.age}` : ''}
          ${patientContext.gender ? `Gender: ${patientContext.gender}` : ''}
          ${patientContext.kidneyDiseaseStage ? `Kidney disease stage: ${patientContext.kidneyDiseaseStage}` : ''}
          ${patientContext.knownConditions?.length ? `Known conditions: ${patientContext.knownConditions.join(', ')}` : ''}
          
          Document content:
          ${documentText}`
        }
      ],
    });

    // Parse the JSON response
    const resultText = response.content[0].text;
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Error validating medical document with Anthropic:", error);
    return {
      isValid: false,
      confidence: 0,
      analysis: "An error occurred while validating the document.",
      keyPoints: [],
      recommendations: ["Please try again later or contact support if the issue persists."],
      flaggedIssues: ["Document validation failed due to a technical error."]
    };
  }
}