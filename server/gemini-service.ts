import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Get the Gemini Pro model
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
  },
  patientInfo: {
    age?: number;
    gender?: string;
    kidneyDiseaseStage?: number;
    knownConditions?: string[];
  }
): Promise<KidneyHealthAdvisory> {
  try {
    const prompt = `
    As a kidney health expert, provide personalized health advice based on the following patient information and metrics:
    
    Patient Information:
    ${patientInfo.age ? `Age: ${patientInfo.age}` : 'Age: Unknown'}
    ${patientInfo.gender ? `Gender: ${patientInfo.gender}` : 'Gender: Unknown'}
    ${patientInfo.kidneyDiseaseStage ? `Kidney Disease Stage: ${patientInfo.kidneyDiseaseStage}` : 'Kidney Disease Stage: Unknown'}
    ${patientInfo.knownConditions?.length ? `Known Conditions: ${patientInfo.knownConditions.join(', ')}` : 'Known Conditions: None specified'}
    
    Recent Health Metrics:
    Hydration Level (1-10): ${metrics.hydration}
    Blood Pressure: ${metrics.systolicBP}/${metrics.diastolicBP} mmHg
    Pain Level (1-10): ${metrics.painLevel}
    Stress Level (1-10): ${metrics.stressLevel}
    Estimated GFR: ${metrics.estimatedGFR} mL/min/1.73m²
    
    Provide a detailed health advisory formatted as JSON with the following fields:
    - advice: comprehensive health advice based on the metrics
    - dietaryRecommendations: array of dietary guidelines specific to kidney health
    - lifestyleRecommendations: array of lifestyle adjustments to improve kidney function
    - medicationConsiderations: array of medication-related considerations (not specific prescriptions)
    - followUpRecommendations: array of suggested follow-up actions
    - emergencySigns: array of warning signs that require immediate medical attention
    - requiresMedicalAttention: boolean indicating if immediate medical attention is needed based on the provided metrics
    
    Focus especially on the correlation between the metrics and kidney health status. Include both immediate actions and longer-term recommendations.
    `;

    // Generate content using Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback if JSON parsing fails
    return {
      advice: "Unable to process health metrics into structured format. Please consult with your healthcare provider for personalized advice.",
      dietaryRecommendations: ["Maintain good hydration", "Monitor sodium intake", "Consider consulting a renal dietitian"],
      lifestyleRecommendations: ["Regular monitoring of blood pressure", "Stress management techniques", "Regular exercise as recommended by your doctor"],
      medicationConsiderations: ["Follow your prescribed medication regimen", "Report any side effects to your healthcare provider"],
      followUpRecommendations: ["Schedule regular check-ups with your nephrologist"],
      emergencySigns: ["Severe shortness of breath", "Chest pain", "Confusion or extreme fatigue"],
      requiresMedicalAttention: false
    };
  } catch (error) {
    console.error("Error getting kidney health advice from Gemini:", error);
    return {
      advice: "An error occurred while processing your health data. Please try again later or consult with your healthcare provider.",
      dietaryRecommendations: [],
      lifestyleRecommendations: [],
      medicationConsiderations: [],
      followUpRecommendations: ["Contact your healthcare provider for personalized advice"],
      emergencySigns: [],
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
    kidneyDiseaseStage?: number;
  }
): Promise<{
  summary: string;
  abnormalValues: Array<{parameter: string, value: string, significance: string}>;
  trendAnalysis: string;
  recommendations: string[];
  suggestedFollowUp: string[];
}> {
  try {
    const prompt = `
    As a medical laboratory specialist focusing on kidney health, analyze the following lab results:
    
    ${patientContext ? `
    Patient Context:
    ${patientContext.age ? `Age: ${patientContext.age}` : ''}
    ${patientContext.gender ? `Gender: ${patientContext.gender}` : ''}
    ${patientContext.kidneyDiseaseStage ? `Kidney Disease Stage: ${patientContext.kidneyDiseaseStage}` : ''}
    ` : ''}
    
    Lab Results:
    ${labText}
    
    Provide a detailed analysis formatted as JSON with the following fields:
    - summary: A concise summary of the lab results, focusing on kidney health indicators
    - abnormalValues: An array of objects, each containing {parameter, value, significance} for values outside normal ranges
    - trendAnalysis: Analysis of how these results might relate to kidney disease progression
    - recommendations: Array of recommendations based on these results
    - suggestedFollowUp: Array of suggested follow-up tests or monitoring based on these results
    
    Focus especially on kidney function markers like creatinine, BUN, GFR, electrolytes, protein levels, and any other values relevant to kidney health.
    Flag any critical values that might require immediate attention.
    `;

    // Generate content using Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback if JSON parsing fails
    return {
      summary: "Unable to process lab results into structured format. Please consult with your healthcare provider for interpretation.",
      abnormalValues: [],
      trendAnalysis: "Trend analysis requires structured lab data. Please consult with your healthcare provider.",
      recommendations: ["Review these results with your healthcare provider"],
      suggestedFollowUp: ["Schedule an appointment with your nephrologist to discuss these results"]
    };
  } catch (error) {
    console.error("Error analyzing lab results with Gemini:", error);
    return {
      summary: "An error occurred while analyzing the lab results.",
      abnormalValues: [],
      trendAnalysis: "Unable to perform trend analysis due to a technical error.",
      recommendations: ["Please try again later or consult with your healthcare provider"],
      suggestedFollowUp: ["Contact your healthcare provider for proper interpretation of your lab results"]
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
): Promise<{
  title: string;
  summary: string;
  keyPoints: string[];
  detailedExplanation: string;
  commonMisconceptions: string[];
  resources: Array<{title: string, description: string}>;
}> {
  try {
    const prompt = `
    As a kidney health educator, provide educational content about the following topic:
    
    Topic: ${topic}
    Target Audience: ${audience}
    ${diseaseStage ? `Disease Stage: ${diseaseStage}` : ''}
    
    Create comprehensive educational content formatted as JSON with the following fields:
    - title: A clear title for this educational content
    - summary: A concise 2-3 sentence summary of the key information
    - keyPoints: An array of 4-6 essential points about this topic
    - detailedExplanation: A detailed explanation in patient-friendly language
    - commonMisconceptions: An array of common misconceptions about this topic
    - resources: An array of objects with {title, description} for additional learning resources
    
    Ensure the content is:
    - Evidence-based and medically accurate
    - Written in clear, accessible language appropriate for the target audience
    - Free of medical jargon or with explanations where medical terms are necessary
    - Compassionate and empowering rather than alarming
    - Practical with actionable information where appropriate
    `;

    // Generate content using Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback if JSON parsing fails
    return {
      title: topic,
      summary: "Unable to generate structured content for this topic. Please try a different topic or contact support.",
      keyPoints: ["Please consult reliable kidney health resources for information on this topic"],
      detailedExplanation: "Detailed explanation unavailable due to content processing issues.",
      commonMisconceptions: [],
      resources: [
        {
          title: "National Kidney Foundation",
          description: "Provides comprehensive resources on kidney health and disease management."
        },
        {
          title: "American Association of Kidney Patients",
          description: "Offers patient-centered education and advocacy resources."
        }
      ]
    };
  } catch (error) {
    console.error("Error getting kidney education content from Gemini:", error);
    return {
      title: topic,
      summary: "An error occurred while generating educational content.",
      keyPoints: ["Please try again later or explore other reliable kidney health resources"],
      detailedExplanation: "Detailed explanation unavailable due to a technical error.",
      commonMisconceptions: [],
      resources: [
        {
          title: "National Kidney Foundation",
          description: "Provides comprehensive resources on kidney health and disease management."
        },
        {
          title: "American Association of Kidney Patients",
          description: "Offers patient-centered education and advocacy resources."
        }
      ]
    };
  }
}