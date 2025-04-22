/**
 * NLP Service for journal analysis
 * Provides natural language processing capabilities using multiple providers:
 * - Basic NLP (simulating spaCy-like functionality)
 * - OpenAI GPT-4 for deep analysis
 * - Hugging Face Transformers as free open-source alternatives
 */

import OpenAI from "openai";
import fetch from "node-fetch";

// Initialize OpenAI with API key from environment
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Interfaces for NLP analysis results
export interface NLPAnalysisResult {
  keywords: string[];
  entities: NamedEntity[];
  keyPhrases: string[];
  sentimentScore: number;
  sentimentLabel: string;
}

export interface NamedEntity {
  text: string;
  type: string;
  confidence?: number;
}

/**
 * Perform basic NLP analysis (simulating spaCy functionality)
 * This is a lightweight implementation that doesn't require Python/spaCy
 * 
 * @param text The text to analyze
 * @returns Basic NLP analysis results
 */
export async function performBasicNLPAnalysis(text: string): Promise<NLPAnalysisResult> {
  // A basic keyword extraction algorithm (simulating spaCy functionality)
  
  // Simple keyword extraction
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/);
  
  // Filter out common stopwords
  const stopwords = ["i", "me", "my", "myself", "we", "our", "ours", "ourselves", 
    "you", "your", "yours", "yourself", "yourselves", "he", "him", "his", 
    "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", 
    "them", "their", "theirs", "themselves", "what", "which", "who", "whom", 
    "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", 
    "been", "being", "have", "has", "had", "having", "do", "does", "did", 
    "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", 
    "until", "while", "of", "at", "by", "for", "with", "about", "against", 
    "between", "into", "through", "during", "before", "after", "above", "below", 
    "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", 
    "again", "further", "then", "once", "here", "there", "when", "where", "why", 
    "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", 
    "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", 
    "very", "s", "t", "can", "will", "just", "don", "should", "now"];
  
  const filteredWords = words.filter(word => 
    !stopwords.includes(word) && word.length > 3
  );
  
  // Count word frequency
  const wordFrequency: Record<string, number> = {};
  filteredWords.forEach(word => {
    if (wordFrequency[word]) {
      wordFrequency[word]++;
    } else {
      wordFrequency[word] = 1;
    }
  });
  
  // Sort by frequency and get top keywords
  const keywords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  // Named entity recognition (simulating spaCy's NER)
  const entities: NamedEntity[] = [];
  
  // Health-related entities
  const healthTerms = [
    "dialysis", "creatinine", "gfr", "kidney", "renal", "nephrologist", 
    "transplant", "blood pressure", "protein", "hypertension", "edema", 
    "swelling", "potassium", "phosphorus", "fatigue", "nausea"
  ];
  
  // Symptom-related entities
  const symptomsTerms = [
    "pain", "tired", "swollen", "itchy", "cramp", "nausea", "headache",
    "dizzy", "vomiting", "shortness of breath", "fatigue", "appetite"
  ];
  
  // Medication-related entities
  const medicationTerms = [
    "pill", "medication", "medicine", "dose", "prescription", "tablet",
    "capsule", "injection", "infusion", "treatment"
  ];
  
  // Find health terms in text
  healthTerms.forEach(term => {
    if (text.toLowerCase().includes(term)) {
      entities.push({ text: term, type: "HEALTH" });
    }
  });
  
  // Find symptom terms in text
  symptomsTerms.forEach(term => {
    if (text.toLowerCase().includes(term)) {
      entities.push({ text: term, type: "SYMPTOM" });
    }
  });
  
  // Find medication terms in text
  medicationTerms.forEach(term => {
    if (text.toLowerCase().includes(term)) {
      entities.push({ text: term, type: "MEDICATION" });
    }
  });
  
  // Extract key phrases (simulating spaCy's phrase detection)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const keyPhrases = sentences
    .filter(s => {
      // Consider sentences that have entities or keywords as key phrases
      const sentenceLower = s.toLowerCase();
      return entities.some(entity => sentenceLower.includes(entity.text)) || 
        keywords.some(keyword => sentenceLower.includes(keyword));
    })
    .map(s => s.trim())
    .slice(0, 3);
  
  // Simple sentiment analysis
  const positiveWords = [
    "good", "better", "best", "great", "happy", "glad", "positive", "well", 
    "improve", "improving", "improvement", "improved", "better", "stable"
  ];
  
  const negativeWords = [
    "bad", "worse", "worst", "pain", "hurt", "tired", "exhausted", "sick",
    "worry", "concerned", "afraid", "scared", "sad", "depressed", "anxious"
  ];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  filteredWords.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });
  
  // Calculate sentiment score from -1 (very negative) to 1 (very positive)
  const totalSentimentWords = positiveCount + negativeCount;
  const sentimentScore = totalSentimentWords === 0 ? 0 : 
    (positiveCount - negativeCount) / totalSentimentWords;
  
  // Determine sentiment label
  let sentimentLabel = "neutral";
  if (sentimentScore > 0.2) sentimentLabel = "positive";
  else if (sentimentScore < -0.2) sentimentLabel = "negative";
  
  return {
    keywords,
    entities,
    keyPhrases,
    sentimentScore,
    sentimentLabel
  };
}

/**
 * Use OpenAI to perform deep NLP analysis
 * 
 * @param text The text to analyze
 * @returns Detailed NLP analysis from GPT-4
 */
export async function performOpenAINLPAnalysis(
  text: string
): Promise<{
  stressScore: number;
  fatigueScore: number;
  painScore: number;
  sentiment: string;
  tags: string[];
  supportiveResponse: string;
  healthInsights: string;
}> {
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a health tracking assistant that analyzes journal entries for people with kidney disease. Extract the following information:
        1. Stress level (1-10 scale)
        2. Fatigue level (1-10 scale)
        3. Pain level (1-10 scale)
        4. Overall sentiment (positive, negative, neutral)
        5. Relevant tags (3-5 keywords)
        6. A brief, supportive response that acknowledges their feelings
        7. Health insights - note any symptoms or health patterns mentioned
        
        Return the results as a JSON object with these keys: stressScore, fatigueScore, painScore, sentiment, tags (array), supportiveResponse, healthInsights.`
      },
      {
        role: "user",
        content: text
      }
    ],
    response_format: { type: "json_object" }
  });

  // Parse the JSON response
  const messageContent = response.choices[0].message.content || '{}';
  const result = JSON.parse(messageContent);
  
  // Ensure scores are within bounds
  result.stressScore = Math.min(10, Math.max(1, result.stressScore || 5));
  result.fatigueScore = Math.min(10, Math.max(1, result.fatigueScore || 5));
  result.painScore = Math.min(10, Math.max(1, result.painScore || 5));
  
  return result;
}

/**
 * Get sentiment analysis from Hugging Face model (fallback)
 * 
 * @param text Text to analyze for sentiment
 * @returns Sentiment result or null if API is not available
 */
export async function getHuggingFaceSentiment(
  text: string
): Promise<{label: string, score: number} | null> {
  if (!process.env.HUGGING_FACE_API_TOKEN) return null;
  
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english", 
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HUGGING_FACE_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: text })
      }
    );
    
    if (!response.ok) return null;
    
    const result = await response.json();
    return result[0][0]; // Format: [[{label: "POSITIVE", score: 0.9}]]
  } catch (error) {
    console.error("Error getting Hugging Face sentiment:", error);
    return null;
  }
}

/**
 * Comprehensive journal entry analysis using multiple NLP technologies
 * 
 * @param text Journal entry text to analyze
 * @returns Comprehensive analysis from multiple NLP sources
 */
export async function analyzeJournalEntryWithNLP(
  text: string,
  userName: string = "User"
): Promise<{
  keywords: string[];
  entities: NamedEntity[];
  stressScore: number;
  fatigueScore: number;
  painScore: number;
  sentiment: string;
  tags: string[];
  keyPhrases: string[];
  supportiveResponse: string;
  healthInsights?: string;
}> {
  try {
    // First, run the basic NLP analysis (spaCy-like functionality)
    const basicAnalysis = await performBasicNLPAnalysis(text);
    
    // Then, try to get OpenAI's analysis
    try {
      const openaiAnalysis = await performOpenAINLPAnalysis(text);
      
      // Combine the results from both analyses
      return {
        keywords: basicAnalysis.keywords,
        entities: basicAnalysis.entities,
        stressScore: openaiAnalysis.stressScore,
        fatigueScore: openaiAnalysis.fatigueScore, 
        painScore: openaiAnalysis.painScore,
        sentiment: openaiAnalysis.sentiment,
        tags: openaiAnalysis.tags,
        keyPhrases: basicAnalysis.keyPhrases,
        supportiveResponse: openaiAnalysis.supportiveResponse,
        healthInsights: openaiAnalysis.healthInsights
      };
    } catch (openaiError) {
      console.error("OpenAI analysis failed, using basic NLP only:", openaiError);
      
      // Try to get Hugging Face sentiment as a fallback
      let sentiment = basicAnalysis.sentimentLabel;
      try {
        const hfSentiment = await getHuggingFaceSentiment(text);
        if (hfSentiment) {
          sentiment = hfSentiment.label.toLowerCase();
        }
      } catch (hfError) {
        console.error("Hugging Face analysis failed:", hfError);
      }
      
      // Derive scores based on the basic analysis
      // Approximate stress, fatigue, and pain scores based on keywords
      const stressWords = ["stress", "worry", "anxious", "anxiety", "overwhelmed", "tense"];
      const fatigueWords = ["tired", "exhausted", "fatigue", "weak", "no energy", "drained"];
      const painWords = ["pain", "hurt", "ache", "sore", "discomfort", "suffering"];
      
      let stressScore = 5;
      let fatigueScore = 5;
      let painScore = 5;
      
      // Simple scoring based on presence of keywords
      const textLower = text.toLowerCase();
      
      stressWords.forEach(word => {
        if (textLower.includes(word)) stressScore = Math.min(10, stressScore + 1);
      });
      
      fatigueWords.forEach(word => {
        if (textLower.includes(word)) fatigueScore = Math.min(10, fatigueScore + 1);
      });
      
      painWords.forEach(word => {
        if (textLower.includes(word)) painScore = Math.min(10, painScore + 1);
      });
      
      return {
        keywords: basicAnalysis.keywords,
        entities: basicAnalysis.entities,
        stressScore,
        fatigueScore,
        painScore,
        sentiment,
        tags: basicAnalysis.keywords.slice(0, 5),
        keyPhrases: basicAnalysis.keyPhrases,
        supportiveResponse: `${userName}, I notice you mentioned ${basicAnalysis.keywords.slice(0, 2).join(" and ")}. It's important to keep tracking your symptoms and feelings, as this information can help your healthcare team provide better care.`
      };
    }
  } catch (error) {
    console.error("Journal analysis failed:", error);
    // Return basic fallback analysis
    return {
      keywords: ["health", "journal"],
      entities: [],
      stressScore: 5,
      fatigueScore: 5,
      painScore: 5,
      sentiment: "neutral",
      tags: ["journal", "health"],
      keyPhrases: [],
      supportiveResponse: `${userName}, thank you for sharing. Tracking your health journey is an important step.`
    };
  }
}