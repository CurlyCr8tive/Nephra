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
      const prompt = `You are a compassionate kidney health companion AI. Analyze this journal entry from ${userName}, who has kidney disease.

Journal entry: "${journalEntry}"

SCORING RULES (1–10, never default to 5):
- Use explicit numbers if stated (e.g. "pain 7/10"). Otherwise infer:
  mild/slight → 2–3 | moderate/some → 4–5 | significant/quite bad → 6–7 | severe/terrible → 8–10 | not mentioned → 1
- Stress: worry, anxiety, overwhelm | Fatigue: tired, exhausted, drained | Pain: ache, hurt, discomfort

RESPONSE (supportiveResponse): 3–4 paragraphs, ~200 words:
1. Acknowledge what ${userName} specifically wrote (no generic openers)
2. Provide kidney-health context for any symptoms or concerns they raised
3. 2–3 concrete, actionable suggestions
4. Note anything to raise with their care team (if applicable)

Return JSON: { "stressScore": number, "fatigueScore": number, "painScore": number, "sentiment": "positive|negative|neutral|mixed", "tags": ["string"], "supportiveResponse": "string" }`;

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
 * Processes a journal entry with AI analysis
 * 
 * @param userId The user's ID
 * @param content The journal entry content
 * @param pastEntries Optional past journal entries for context
 * @returns The journal entry data with analysis
 */
export async function processJournalEntry(
  userId: number,
  content: string,
  pastEntries?: any[]
): Promise<InsertJournalEntry> {
  // Get user info for personalization
  const user = await storage.getUser(userId);
  const userName = user?.firstName || "User";
  
  // Analyze the journal entry with context if available
  let analysis: JournalAnalysisResult;
  if (pastEntries && pastEntries.length > 0) {
    analysis = await analyzeJournalEntryWithContext(content, userName, pastEntries);
  } else {
    analysis = await analyzeJournalEntry(content, userName);
  }
  
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
 * Process journal entry using context from past entries for more personalized analysis
 * 
 * @param userId The user's ID
 * @param content The journal entry content
 * @param pastEntries Optional past journal entries for context
 * @returns Analysis results with context-aware insights
 */
export async function analyzeJournalEntryWithContext(
  journalEntry: string,
  userName: string = "User",
  pastEntries?: any[]
): Promise<JournalAnalysisResult> {
  try {
    // If no past entries, use the regular analysis
    if (!pastEntries || pastEntries.length === 0) {
      return analyzeJournalEntry(journalEntry, userName);
    }
    
    // Format past entries for context
    const pastEntriesContext = pastEntries.map((entry, index) => {
      const date = entry.date || entry.timestamp || 'previous entry';
      const content = entry.content || entry.user_input || '';
      const sentiment = entry.sentiment || '';
      const scores = [];
      if (entry.stressScore) scores.push(`stress: ${entry.stressScore}`);
      if (entry.fatigueScore) scores.push(`fatigue: ${entry.fatigueScore}`);
      if (entry.painScore) scores.push(`pain: ${entry.painScore}`);
      
      return `Previous Entry ${index + 1} (${date}): "${content}"
${sentiment ? `Sentiment: ${sentiment}` : ''}
${scores.length > 0 ? `Scores: ${scores.join(', ')}` : ''}`;
    }).join("\n\n");
    
    // Use OpenAI with context for enhanced analysis
    const prompt = `You are a compassionate kidney health companion AI analyzing a journal entry from ${userName}, who has kidney disease.

PREVIOUS ENTRIES FOR CONTEXT:
${pastEntriesContext}

CURRENT ENTRY: "${journalEntry}"

SCORING RULES (1–10, never default to 5):
- Use explicit numbers if stated (e.g. "pain 7/10"). Otherwise infer:
  mild/slight → 2–3 | moderate/some → 4–5 | significant/quite bad → 6–7 | severe/terrible → 8–10 | not mentioned → 1
- Stress: worry, anxiety, overwhelm | Fatigue: tired, exhausted, drained | Pain: ache, hurt, discomfort

RESPONSE (supportiveResponse): 3–4 paragraphs, ~200 words total:
1. Address what ${userName} specifically wrote (no generic openers)
2. Compare to previous entries — note improvements, declines, or patterns
3. 2–3 actionable kidney-health suggestions
4. Flag anything to discuss with their nephrologist (if applicable)

HEALTH INSIGHTS (healthInsights): 1–2 sentences on clinical patterns across entries.

Return JSON: { "stressScore": number, "fatigueScore": number, "painScore": number, "sentiment": "positive|negative|neutral|mixed", "tags": ["string"], "supportiveResponse": "string", "healthInsights": "string" }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an empathetic health assistant specializing in kidney disease. Your purpose is to analyze journal entries with context awareness to identify health trends and provide personalized supportive feedback."
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
  } catch (error) {
    console.error("Context-aware analysis failed, falling back to standard analysis:", error);
    // Fall back to standard analysis without context
    return analyzeJournalEntry(journalEntry, userName);
  }
}

/**
 * Alternative implementation to automatically save the entry
 */
export async function processAndSaveJournalEntry(
  userId: number,
  content: string,
  pastEntries?: any[]
): Promise<{ entry: InsertJournalEntry, metrics?: any }> {
  // Get user info for personalization
  const user = await storage.getUser(userId);
  const userName = user?.firstName || "User";
  
  // Do context-aware analysis if past entries are provided
  let journalData: InsertJournalEntry;
  if (pastEntries && pastEntries.length > 0) {
    const contextAnalysis = await analyzeJournalEntryWithContext(content, userName, pastEntries);
    journalData = {
      userId,
      content,
      date: new Date(),
      aiResponse: contextAnalysis.supportiveResponse,
      sentiment: contextAnalysis.sentiment,
      tags: contextAnalysis.tags,
      stressScore: contextAnalysis.stressScore,
      fatigueScore: contextAnalysis.fatigueScore,
      painScore: contextAnalysis.painScore
    };
  } else {
    journalData = await processJournalEntry(userId, content, undefined);
  }
  
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
      fatigueLevel: journalData.fatigueScore || null
      // Other fields would be null/undefined
    });
  }
  
  return { 
    entry: savedEntry,
    metrics
  };
}