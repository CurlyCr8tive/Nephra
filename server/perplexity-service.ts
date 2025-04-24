/**
 * Utility function to safely handle errors
 */
function handleError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return 'An unknown error occurred';
  }
}

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
 * Interface for medical terms explanation
 */
export interface MedicalTermsExplanation {
  originalText: string;
  simplifiedText: string;
  terms: {
    term: string;
    explanation: string;
    category: string;
  }[];
  resources: string[];
}

/**
 * Call the Perplexity API with the given prompt
 */
async function callPerplexityAPI(
  systemPrompt: string,
  userPrompt: string,
  model: string = "llama-3.1-sonar-small-128k-online"
): Promise<PerplexityResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    throw new Error("Perplexity API key not configured");
  }
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 2000,
        return_citations: true,
        search_recency_filter: "month",
        frequency_penalty: 1
      })
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorBody}`);
    }
    
    return await response.json() as PerplexityResponse;
  } catch (error) {
    console.error("Error calling Perplexity API:", error);
    throw error;
  }
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
  try {
    const systemPrompt = `You are a kidney health information specialist. Your role is to provide evidence-based information about kidney health topics. Use recent medical research and reputable sources. Communicate in a clear, accessible way without unnecessary medical jargon. When medical terms are unavoidable, explain them clearly.

Always include citations to reputable sources such as medical journals, government health websites, or recognized kidney health organizations like the National Kidney Foundation. Focus on providing reliable information, not medical advice.`;

    let userPrompt = `Please provide evidence-based information about "${params.topic}" related to kidney health`;
    
    if (params.relatedCondition) {
      userPrompt += ` in the context of ${params.relatedCondition}`;
    }
    
    if (params.context) {
      userPrompt += `. Additional context: ${params.context}`;
    }
    
    if (params.patientDetails) {
      userPrompt += `\n\nPatient details:`;
      
      if (params.patientDetails.age) {
        userPrompt += `\nAge: ${params.patientDetails.age}`;
      }
      
      if (params.patientDetails.gender) {
        userPrompt += `\nGender: ${params.patientDetails.gender}`;
      }
      
      if (params.patientDetails.stage) {
        userPrompt += `\nKidney disease stage: ${params.patientDetails.stage}`;
      }
      
      if (params.patientDetails.existingConditions && params.patientDetails.existingConditions.length > 0) {
        userPrompt += `\nExisting conditions: ${params.patientDetails.existingConditions.join(', ')}`;
      }
    }
    
    userPrompt += `\n\nPlease provide this information in a structured format with:
1. A concise summary
2. Key points from recent research
3. Evidence-based recommendations
4. Citations to reputable sources
5. Any risk factors that should be considered
6. A note if there's any reason for immediate medical attention`;

    const response = await callPerplexityAPI(systemPrompt, userPrompt);
    
    // Extract content from response
    const content = response.choices[0].message.content;
    const citations = response.citations || [];
    
    // Parse the structured response
    // This is a simplified parser that could be made more robust
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    const summary = lines[0] || "Information not available";
    const keyPoints = extractSection(content, "Key points", "Recommendations") || [];
    const recommendations = extractSection(content, "Recommendations", "Citations") || [];
    const riskFactors = extractSection(content, "Risk factors", "immediate medical attention") || [];
    
    // Check for warning signs
    const warningSignRegex = /immediate medical attention|emergency|urgent|critical|severe warning/i;
    const warningSign = warningSignRegex.test(content);
    let warningMessage = "";
    
    if (warningSign) {
      const warningSection = content.match(/immediate medical attention:?([\s\S]*?)(?=\n\n|$)/i);
      warningMessage = warningSection ? warningSection[1].trim() : "Consult with a healthcare provider immediately.";
    }
    
    return {
      topic: params.topic,
      summary,
      keyPoints,
      researchBased: true,
      citations,
      recommendations,
      riskFactors,
      warningSign,
      warningMessage: warningSign ? warningMessage : undefined
    };
  } catch (error) {
    console.error("Error getting health information:", error);
    // Return a fallback response
    return {
      topic: params.topic,
      summary: "Unable to retrieve evidence-based information at this time.",
      keyPoints: ["Please try your query again later."],
      researchBased: false,
      citations: [],
      recommendations: ["Consult with your healthcare provider for reliable information."],
      warningSign: false
    };
  }
}

/**
 * Analyzes medical terms and explains them in simple language
 * 
 * @param text Text containing medical terms to analyze
 * @returns An explanation of medical terms in simple language
 */
export async function explainMedicalTerms(text: string): Promise<MedicalTermsExplanation> {
  try {
    const systemPrompt = `You are a medical terminology specialist. Your task is to identify medical terms in the provided text, especially kidney-related terms, and explain them in simple, easy-to-understand language. Focus on clarity and accessibility without sacrificing accuracy.`;

    const userPrompt = `Please analyze the following text which contains medical terminology:

"""
${text}
"""

For each medical term you identify:
1. Provide a simple explanation
2. Categorize it (e.g., medication, procedure, condition, lab test)

Then provide:
1. A rewritten version of the entire text using simpler language
2. 1-2 recommended resources for learning more about these terms`;

    const response = await callPerplexityAPI(systemPrompt, userPrompt);
    const content = response.choices[0].message.content;
    
    // Extract the simplified text
    let simplifiedText = text; // Default to original
    const simplifiedMatch = content.match(/rewritten version[:\s]+([\s\S]+?)(?=\n\n|resources|recommended resources|$)/i);
    if (simplifiedMatch) {
      simplifiedText = simplifiedMatch[1].trim();
    }
    
    // Extract terms and explanations
    const terms: { term: string; explanation: string; category: string }[] = [];
    
    // Simpler regex approach without named groups to avoid TypeScript ES2018 issues
    const termLines = content.split('\n').filter(line => /^\s*[•\-*]?\s*[A-Za-z\s\-]+?:/.test(line));
    
    for (const line of termLines) {
      // Extract term and explanation with simple regex patterns
      const termMatch = line.match(/^\s*[•\-*]?\s*([A-Za-z\s\-]+?)(?:\s+\(.*?\))?\s*:/);
      if (!termMatch) continue;
      
      const term = termMatch[1].trim();
      let remainingText = line.substring(line.indexOf(':') + 1).trim();
      
      // Extract category if present
      let category = "Medical term";
      const categoryMatch = remainingText.match(/Category:\s*([A-Za-z\s\-]+)$/i);
      if (categoryMatch) {
        category = categoryMatch[1].trim();
        // Remove category part from explanation
        remainingText = remainingText.substring(0, remainingText.indexOf('Category:')).trim();
      }
      
      // Add to terms array
      terms.push({
        term,
        explanation: remainingText,
        category
      });
    }
    
    // Extract resources
    const resources: string[] = [];
    const resourcesMatch = content.match(/resources[:\s]+([\s\S]+?)(?=\n\n|$)/i);
    if (resourcesMatch) {
      const resourcesSection = resourcesMatch[1];
      const resourceLines = resourcesSection.split('\n');
      
      for (const line of resourceLines) {
        const trimmedLine = line.trim();
        if (trimmedLine && /^[•\-*\d\.\s]/.test(trimmedLine)) {
          resources.push(trimmedLine.replace(/^[•\-*\d\.\s]+/, '').trim());
        }
      }
    }
    
    if (resources.length === 0) {
      resources.push("National Kidney Foundation (kidney.org)");
      resources.push("MedlinePlus Medical Encyclopedia (medlineplus.gov)");
    }
    
    return {
      originalText: text,
      simplifiedText,
      terms,
      resources
    };
  } catch (error) {
    console.error("Error explaining medical terms:", error);
    return {
      originalText: text,
      simplifiedText: text,
      terms: [],
      resources: ["National Kidney Foundation (kidney.org)", "MedlinePlus Medical Encyclopedia (medlineplus.gov)"]
    };
  }
}

/**
 * Analyzes a journal entry for emotional patterns and health insights
 * 
 * @param entry Journal entry text to analyze
 * @returns Analysis with stress/fatigue scores and supportive response
 */
export async function analyzeJournalEntry(entry: string): Promise<{
  stress: number;
  fatigue: number;
  response: string;
  link?: string;
}> {
  try {
    const systemPrompt = `You are a compassionate emotional wellness assistant for kidney patients.
      Analyze this journal entry, estimate stress and fatigue levels (1-10 scale), and provide a supportive response.
      
      IMPORTANT: Your entire response must be valid JSON.
      FORMAT: { "stress": number, "fatigue": number, "response": "your supportive message", "link": "optional url" }
      
      Keep your response message under 300 words and focus on being encouraging and helpful.
      Properly escape any quotes or special characters in your JSON response.`;

    const userPrompt = `Journal entry: "${entry}"
      
      Please analyze this entry and respond with properly formatted JSON only.`;
    
    const response = await callPerplexityAPI(systemPrompt, userPrompt);
    const content = response.choices[0].message.content;
    
    // Extract JSON from the response if there's any other text
    let jsonText = content.trim();
    
    // If response includes text before or after the JSON object, try to extract just the JSON part
    const jsonStartIndex = jsonText.indexOf('{');
    const jsonEndIndex = jsonText.lastIndexOf('}');
    
    if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
      jsonText = jsonText.substring(jsonStartIndex, jsonEndIndex + 1);
    }
    
    // Try to parse as JSON first
    try {
      const result = JSON.parse(jsonText);
      
      // Ensure we have valid values
      return {
        stress: Math.min(10, Math.max(1, parseInt(String(result.stress)) || 5)),
        fatigue: Math.min(10, Math.max(1, parseInt(String(result.fatigue)) || 5)),
        response: result.response || "Thank you for sharing your journal entry.",
        link: result.link || ""
      };
    } catch (parseError) {
      console.error("Failed to parse Perplexity response as JSON:", parseError);
      
      // If parsing fails, extract values using regex
      const stressMatch = content.match(/stress:?\s*(\d+)/i);
      const fatigueMatch = content.match(/fatigue:?\s*(\d+)/i);
      
      // Extract a supportive response in a more robust way
      let supportiveResponse = content;
      
      // Try different patterns for extracting the response
      const responseMatch = content.match(/response[": ]+([^"]+?)["]/i) || 
                           content.match(/response[": ]+(.*?)(?=,\s*"link"|,\s*link:|$)/i);
                           
      if (responseMatch) {
        supportiveResponse = responseMatch[1].trim();
      } else {
        // Clean the content to be more readable if no specific response found
        supportiveResponse = content
          .replace(/{|}/g, '')
          .replace(/"stress":|"fatigue":|"response":|"link":/g, '')
          .replace(/,/g, ' ')
          .replace(/"/g, '')
          .trim();
      }
      
      // If supportive response is still too raw or long, provide a fallback
      if (supportiveResponse.length > 500 || supportiveResponse.includes('\\n')) {
        supportiveResponse = "Thank you for sharing your journal entry. It's important to track how you're feeling. Consider discussing any persistent symptoms with your healthcare team.";
      }
      
      // Extract a link if present
      let link = "";
      const linkMatch = content.match(/link[": ]+([^"]+?)["]/i);
      if (linkMatch) {
        link = linkMatch[1].trim();
      }
      
      return {
        stress: stressMatch ? Math.min(10, Math.max(1, parseInt(stressMatch[1]))) : 5,
        fatigue: fatigueMatch ? Math.min(10, Math.max(1, parseInt(fatigueMatch[1]))) : 5,
        response: supportiveResponse.substring(0, 500), // Limit length for safety
        link: link
      };
    }
  } catch (error) {
    console.error("Error analyzing journal with Perplexity:", error);
    const errorMessage = handleError(error);
    console.log(`Handled Perplexity error: ${errorMessage}`);
    throw new Error(`Failed to analyze journal entry: ${errorMessage}`);
  }
}

/**
 * Helper function to extract sections from the response content
 */
function extractSection(content: string, sectionStart: string, sectionEnd: string): string[] {
  const sectionRegex = new RegExp(`${sectionStart}[:\\s]+(.*?)(?=${sectionEnd}|$)`, 'is');
  const sectionMatch = content.match(sectionRegex);
  
  if (!sectionMatch) return [];
  
  return sectionMatch[1]
    .split('\n')
    .map(line => {
      // Remove bullet points, numbers, etc.
      return line.replace(/^[\s•\-*\d\.]+/, '').trim();
    })
    .filter(line => line.length > 0);
}