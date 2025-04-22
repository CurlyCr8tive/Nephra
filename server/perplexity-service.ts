import fetch from 'node-fetch';

/**
 * Interface for Perplexity API response
 */
interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations: string[];
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Interface for health information query parameters
 */
interface HealthInfoQueryParams {
  topic: string;
  context?: string;
  relatedCondition?: string;
  patientDetails?: {
    age?: number;
    gender?: string;
    existingConditions?: string[];
    stage?: number;
  };
}

/**
 * Interface for health advice assessment results
 */
export interface HealthAdviceAssessment {
  topic: string;
  summary: string;
  keyPoints: string[];
  researchBased: boolean;
  citations: string[];
  recommendations: string[];
  riskFactors?: string[];
  warningSign?: boolean;
  warningMessage?: string;
}

/**
 * Gets evidence-based health information from Perplexity API
 * 
 * @param params The query parameters for retrieving health information
 * @returns An assessment of the health information with citations and recommendations
 */
export async function getEvidenceBasedHealthInfo(
  params: HealthInfoQueryParams
): Promise<HealthAdviceAssessment> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY is required to use the Perplexity API");
  }

  // Construct a detailed prompt based on the query parameters
  let prompt = `I need evidence-based medical information about ${params.topic}`;

  if (params.relatedCondition) {
    prompt += ` in relation to ${params.relatedCondition}`;
  }

  if (params.context) {
    prompt += `. ${params.context}`;
  }

  if (params.patientDetails) {
    prompt += ". The information should be relevant for ";
    
    if (params.patientDetails.age) {
      prompt += `a ${params.patientDetails.age}-year-old `;
    }
    
    if (params.patientDetails.gender) {
      prompt += `${params.patientDetails.gender} `;
    }
    
    if (params.patientDetails.existingConditions && params.patientDetails.existingConditions.length > 0) {
      prompt += `with ${params.patientDetails.existingConditions.join(', ')} `;
    }
    
    if (params.patientDetails.stage) {
      prompt += `at stage ${params.patientDetails.stage} `;
    }
  }

  prompt += `
  
  Please provide:
  1. A concise summary of the topic
  2. Key evidence-based facts
  3. Important recommendations
  4. Any risk factors to be aware of
  5. Scientific citations supporting this information
  
  If there's any potential emergency or serious warning sign in what I'm describing, please prominently flag it.
  
  Format your response as valid JSON with the following structure:
  {
    "summary": "Concise summary of the topic",
    "keyPoints": ["Key point 1", "Key point 2", ...],
    "recommendations": ["Recommendation 1", "Recommendation 2", ...],
    "riskFactors": ["Risk factor 1", "Risk factor 2", ...],
    "warningSign": boolean,
    "warningMessage": "Any critical warning message if applicable",
    "researchBased": boolean
  }`;

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: "You are a medical information specialist providing evidence-based health information with citations. Only provide information that is supported by research. Always include citations to medical research, and focus on providing factual information rather than opinions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1024,
        stream: false,
        search_domain_filter: ["nih.gov", "mayoclinic.org", "who.int", "cdc.gov", "nature.com", "nejm.org", "pubmed.ncbi.nlm.nih.gov"],
        return_related_questions: false,
        search_recency_filter: "month",
        frequency_penalty: 1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as PerplexityResponse;
    
    // Parse the JSON response content
    try {
      const content = data.choices[0].message.content;
      const jsonStartIndex = content.indexOf('{');
      const jsonEndIndex = content.lastIndexOf('}') + 1;
      
      if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
        const jsonContent = content.substring(jsonStartIndex, jsonEndIndex);
        const parsedResponse = JSON.parse(jsonContent);
        
        // Return the structured health advice with citations
        return {
          topic: params.topic,
          summary: parsedResponse.summary || "",
          keyPoints: parsedResponse.keyPoints || [],
          recommendations: parsedResponse.recommendations || [],
          riskFactors: parsedResponse.riskFactors || [],
          warningSign: parsedResponse.warningSign || false,
          warningMessage: parsedResponse.warningMessage || "",
          researchBased: parsedResponse.researchBased || true,
          citations: data.citations || []
        };
      }
      
      // Fallback if we can't parse JSON from the response
      return {
        topic: params.topic,
        summary: content.substring(0, 300) + "...",
        keyPoints: [],
        researchBased: true,
        recommendations: [],
        citations: data.citations || []
      };
      
    } catch (parseError) {
      console.error("Error parsing Perplexity response:", parseError);
      
      // Fallback to raw text response
      return {
        topic: params.topic,
        summary: data.choices[0].message.content.substring(0, 300) + "...",
        keyPoints: [],
        researchBased: true,
        recommendations: [],
        citations: data.citations || []
      };
    }
  } catch (error) {
    console.error("Error calling Perplexity API:", error);
    throw new Error(`Failed to retrieve evidence-based health information: ${error.message}`);
  }
}

/**
 * Analyzes medical terms and explains them in simple language
 * 
 * @param text Text containing medical terms to analyze
 * @returns An explanation of medical terms in simple language
 */
export async function explainMedicalTerms(text: string): Promise<{
  originalText: string;
  simplifiedExplanation: string;
  definedTerms: Record<string, string>;
}> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY is required to use the Perplexity API");
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: "You are a medical terminology expert who explains complex medical terms in simple language anyone can understand."
          },
          {
            role: "user",
            content: `Analyze this text that contains medical terminology: "${text}". 
            
            Please provide: 
            1. A simplified explanation of the entire text in plain language
            2. A dictionary of medical terms found in the text with simple definitions
            
            Format your response as valid JSON with the following structure:
            {
              "simplifiedExplanation": "The text explained in simple terms",
              "definedTerms": {
                "term1": "simple definition",
                "term2": "simple definition"
              }
            }`
          }
        ],
        temperature: 0.2,
        max_tokens: 1024,
        search_domain_filter: ["nih.gov", "mayoclinic.org", "who.int", "cdc.gov"],
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as PerplexityResponse;
    
    try {
      const content = data.choices[0].message.content;
      const jsonStartIndex = content.indexOf('{');
      const jsonEndIndex = content.lastIndexOf('}') + 1;
      
      if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
        const jsonContent = content.substring(jsonStartIndex, jsonEndIndex);
        const parsedResponse = JSON.parse(jsonContent);
        
        return {
          originalText: text,
          simplifiedExplanation: parsedResponse.simplifiedExplanation || "",
          definedTerms: parsedResponse.definedTerms || {}
        };
      }
      
      // Fallback if we can't parse JSON
      return {
        originalText: text,
        simplifiedExplanation: content,
        definedTerms: {}
      };
    } catch (parseError) {
      console.error("Error parsing Perplexity response:", parseError);
      return {
        originalText: text,
        simplifiedExplanation: data.choices[0].message.content,
        definedTerms: {}
      };
    }
  } catch (error) {
    console.error("Error calling Perplexity API:", error);
    throw new Error(`Failed to explain medical terms: ${error.message}`);
  }
}