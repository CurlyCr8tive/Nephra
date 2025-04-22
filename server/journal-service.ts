import OpenAI from "openai";
import { InsertJournalEntry } from "@shared/schema";
import { storage } from "./storage";
import { analyzeJournalEntryWithNLP, NamedEntity } from "./nlp-service";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Interface for journal analysis result
 */
export interface JournalAnalysisResult {
  stressScore: number;
  fatigueScore: number;
  painScore: number;
  sentiment: string;
  tags: string[];
  supportiveResponse: string;
  keywords?: string[];
  entities?: NamedEntity[];
  keyPhrases?: string[];
  healthInsights?: string;
}

/**
 * Analyzes a journal entry to extract health insights and supportive response
 * Utilizes multiple NLP technologies including:
 * - spaCy-like analysis for basic NLP
 * - OpenAI GPT-4 for deep analysis
 * - Hugging Face Transformers as a fallback
 * 
 * @param journalEntry The text content of the journal entry
 * @param userName Optional user name for personalized response
 * @returns Analysis results including scores and supportive response
 */
export async function analyzeJournalEntry(
  journalEntry: string,
  userName: string = "User"
): Promise<JournalAnalysisResult> {
  try {
    // Use our comprehensive NLP analysis service
    const nlpAnalysis = await analyzeJournalEntryWithNLP(journalEntry, userName);
    
    return {
      stressScore: nlpAnalysis.stressScore,
      fatigueScore: nlpAnalysis.fatigueScore,
      painScore: nlpAnalysis.painScore,
      sentiment: nlpAnalysis.sentiment,
      tags: nlpAnalysis.tags,
      supportiveResponse: nlpAnalysis.supportiveResponse,
      keywords: nlpAnalysis.keywords,
      entities: nlpAnalysis.entities,
      keyPhrases: nlpAnalysis.keyPhrases,
      healthInsights: nlpAnalysis.healthInsights
    };
  } catch (error) {
    console.error("Error analyzing journal entry:", error);
    
    // Fallback to simple OpenAI analysis if comprehensive analysis fails
    try {
      const prompt = `
      You're analyzing a journal entry from a person with kidney disease. 
      
      Journal entry: "${journalEntry}"
      
      Based on this entry, please provide:
      1. A stress score from 1-10 (with 10 being most stressed)
      2. A fatigue score from 1-10 (with 10 being most fatigued) 
      3. A pain score from 1-10 (with 10 being most pain)
      4. The overall sentiment (positive, negative, neutral, mixed)
      5. 1-5 relevant tags that represent themes or emotions in the entry
      6. A supportive, empathetic response that includes the phrase "${userName}, you're doing your best" and offers relevant encouragement
      
      Respond with JSON in this exact format:
      {
        "stressScore": number,
        "fatigueScore": number,
        "painScore": number,
        "sentiment": "string",
        "tags": ["string", "string"],
        "supportiveResponse": "string"
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an empathetic health assistant specializing in kidney disease. Your purpose is to analyze journal entries and provide supportive feedback while identifying key health metrics."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      // Parse the JSON response
      const messageContent = response.choices[0].message.content || '{}';
      const result = JSON.parse(messageContent) as JournalAnalysisResult;
      
      // Ensure scores are within bounds
      result.stressScore = Math.min(10, Math.max(1, result.stressScore));
      result.fatigueScore = Math.min(10, Math.max(1, result.fatigueScore));
      result.painScore = Math.min(10, Math.max(1, result.painScore));
      
      return result;
    } catch (secondError) {
      console.error("Fallback analysis also failed:", secondError);
      // Return a basic fallback analysis
      return {
        stressScore: 5,
        fatigueScore: 5,
        painScore: 5,
        sentiment: "neutral",
        tags: ["journal", "health"],
        supportiveResponse: `${userName}, you're doing your best. It's important to keep tracking your symptoms and feelings, as this information can help your healthcare team provide better care.`
      };
    }
  }
}

/**
 * Processes and saves a journal entry with AI analysis
 * 
 * @param userId The user's ID
 * @param content The journal entry content
 * @returns The saved journal entry with analysis
 */
export async function processJournalEntry(
  userId: number,
  content: string
): Promise<InsertJournalEntry> {
  // Get user info for personalization
  const user = await storage.getUser(userId);
  const userName = user?.firstName || "User";
  
  // Analyze the journal entry
  const analysis = await analyzeJournalEntry(content, userName);
  
  // Create journal entry data
  const journalData: InsertJournalEntry = {
    userId,
    content,
    date: new Date(),
    aiResponse: analysis.supportiveResponse,
    sentiment: analysis.sentiment,
    tags: analysis.tags,
    stressScore: analysis.stressScore,
    fatigueScore: analysis.fatigueScore,
    painScore: analysis.painScore
  };
  
  return journalData;
}

/**
 * Alternative implementation to automatically save the entry
 */
export async function processAndSaveJournalEntry(
  userId: number,
  content: string
): Promise<{ entry: InsertJournalEntry, metrics?: any }> {
  const journalData = await processJournalEntry(userId, content);
  
  // Save to database
  const savedEntry = await storage.createJournalEntry(journalData);
  
  // Optionally create a health metrics entry using the same scores
  let metrics = null;
  
  if (journalData.stressScore !== undefined && journalData.painScore !== undefined) {
    metrics = await storage.createHealthMetrics({
      userId,
      date: new Date(),
      stressLevel: journalData.stressScore,
      painLevel: journalData.painScore,
      // Other fields would be null/undefined
    });
  }
  
  return { 
    entry: savedEntry,
    metrics
  };
}