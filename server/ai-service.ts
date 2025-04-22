import OpenAI from "openai";

// Initialize OpenAI with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generic interface for validation results
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
    age: number;
    gender: string;
    kidneyDiseaseType: string;
    kidneyDiseaseStage: number;
  },
  documentData: {
    fileName: string;
    description?: string;
    metadata: Record<string, any>;
  }
): Promise<ValidationResult> {
  // Construct a prompt specific to kidney health and the document type
  let systemPrompt = `You are a specialized AI medical document validator focused on kidney health. 
You're analyzing a ${documentType} for a ${patientInfo.age}-year-old ${patientInfo.gender} 
with ${patientInfo.kidneyDiseaseType} stage ${patientInfo.kidneyDiseaseStage}.

Your task is to validate the document's data and provide a structured analysis:
1. Determine if values are within normal/expected ranges for this patient's condition
2. Flag any concerning values that may require medical attention
3. Provide a confidence score (0-1) for your validation
4. Offer brief, helpful recommendations based on the data

Focus particularly on kidney health indicators such as:
- GFR (Glomerular Filtration Rate)
- Creatinine levels
- BUN (Blood Urea Nitrogen)
- Potassium levels
- Calcium and Phosphorus levels
- Albumin/protein in urine
- Blood pressure readings
- Hemoglobin and other blood count values

Respond in JSON format with the following structure:
{
  "isValid": boolean,
  "confidence": number,
  "analysis": "string with overall assessment",
  "concerns": ["list", "of", "concerns"],
  "recommendations": ["list", "of", "recommendations"]
}`;

  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Please validate this ${documentType}:
          
Document name: ${documentData.fileName}
Description: ${documentData.description || "No description provided"}
Test results/metadata: ${JSON.stringify(documentData.metadata, null, 2)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Lower temperature for more factual, consistent analysis
    });

    // Parse the response as JSON
    const validationData = JSON.parse(response.choices[0].message.content as string) as ValidationResult;
    
    return {
      isValid: validationData.isValid,
      confidence: validationData.confidence,
      analysis: validationData.analysis,
      concerns: validationData.concerns || [],
      recommendations: validationData.recommendations || [],
    };
  } catch (error) {
    console.error("Error validating medical document:", error);
    return {
      isValid: false,
      confidence: 0,
      analysis: "Error validating document. Please try again later.",
      concerns: ["Validation service unavailable"],
      recommendations: ["Please have this document reviewed by a healthcare professional"],
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
    age: number;
    gender: string;
    kidneyDiseaseType: string;
    kidneyDiseaseStage: number;
  },
  healthData: {
    systolicBP?: number;
    diastolicBP?: number;
    hydration?: number;
    weight?: number;
    painLevel?: number;
    stressLevel?: number;
    estimatedGFR?: number;
  }
): Promise<ValidationResult> {
  // Construct a prompt specific to kidney health metrics
  let systemPrompt = `You are a specialized AI kidney health metrics validator.
You're analyzing health data for a ${patientInfo.age}-year-old ${patientInfo.gender} 
with ${patientInfo.kidneyDiseaseType} stage ${patientInfo.kidneyDiseaseStage}.

Your task is to validate the health metrics and provide a structured analysis:
1. Determine if values are within normal/expected ranges for this patient's condition
2. Flag any concerning values that may require medical attention
3. Provide a confidence score (0-1) for your validation
4. Offer brief, helpful recommendations based on the data

For kidney patients, keep in mind:
- Normal BP target is often below 130/80 mmHg
- Hydration is crucial for kidney function
- Pain and stress can impact blood pressure and kidney function
- For CKD stage ${patientInfo.kidneyDiseaseStage}, expected GFR ranges are:
  * Stage 1: 90+ ml/min
  * Stage 2: 60-89 ml/min
  * Stage 3: 30-59 ml/min
  * Stage 4: 15-29 ml/min
  * Stage 5: <15 ml/min

Respond in JSON format with the following structure:
{
  "isValid": boolean,
  "confidence": number,
  "analysis": "string with overall assessment",
  "concerns": ["list", "of", "concerns"],
  "recommendations": ["list", "of", "recommendations"]
}`;

  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Please validate these health metrics:
          
Blood pressure: ${healthData.systolicBP || "N/A"}/${healthData.diastolicBP || "N/A"} mmHg
Hydration level (scale 1-10): ${healthData.hydration || "N/A"}
Weight: ${healthData.weight || "N/A"} kg
Pain level (scale 1-10): ${healthData.painLevel || "N/A"}
Stress level (scale 1-10): ${healthData.stressLevel || "N/A"}
Estimated GFR: ${healthData.estimatedGFR || "N/A"} ml/min`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Lower temperature for more factual, consistent analysis
    });

    // Parse the response as JSON
    const validationData = JSON.parse(response.choices[0].message.content as string) as ValidationResult;
    
    return {
      isValid: validationData.isValid,
      confidence: validationData.confidence,
      analysis: validationData.analysis,
      concerns: validationData.concerns || [],
      recommendations: validationData.recommendations || [],
    };
  } catch (error) {
    console.error("Error validating health metrics:", error);
    return {
      isValid: false,
      confidence: 0,
      analysis: "Error validating health metrics. Please try again later.",
      concerns: ["Validation service unavailable"],
      recommendations: ["Please have these metrics reviewed by a healthcare professional"],
    };
  }
}