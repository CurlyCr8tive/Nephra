/**
 * Journal API Router
 * Handles journal entry analysis and processing using multiple AI models
 */

import { Router, Request, Response } from "express";
import { storage } from "./storage";
import * as journalService from "./journal-service";
import * as supabaseService from "./supabase-service";
import { analyzeJournalEntryWithNLP } from "./nlp-service";
import OpenAI from "openai";
import fetch from "node-fetch";

// Initialize OpenAI API client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Create router
const router = Router();

/**
 * Process a journal entry with OpenAI analysis
 * POST /api/journal/process
 */
router.post("/process", async (req: Request, res: Response) => {
  try {
    const { userId, content } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: "Missing required fields: userId, content" });
    }
    
    // Get past entries from Supabase if available for enhanced context
    let pastEntries = [];
    let contextEnriched = false;
    try {
      if (typeof supabaseService.checkSupabaseConnection === 'function') {
        const isConnected = await supabaseService.checkSupabaseConnection();
        
        if (isConnected && typeof supabaseService.getJournalEntries === 'function') {
          // Get recent journal entries for context
          pastEntries = await supabaseService.getJournalEntries(userId, 3);
          if (pastEntries && pastEntries.length > 0) {
            contextEnriched = true;
            console.log(`Retrieved ${pastEntries.length} past journal entries for context`);
          }
        }
      }
    } catch (contextError) {
      console.warn("Error retrieving past entries for context:", contextError);
      // Continue with processing even if context retrieval fails
    }
    
    // Process and save the journal entry with optional health metrics
    // Pass past entries for context-aware analysis
    const result = await journalService.processAndSaveJournalEntry(
      userId, 
      content,
      contextEnriched ? pastEntries : undefined
    );
    
    // If Supabase is configured, also save to Supabase with enhanced metadata
    let supabaseResult = { success: false, message: "Supabase not configured" };
    
    try {
      // Check if Supabase is configured by testing for presence of functions
      if (typeof supabaseService.checkSupabaseConnection === 'function') {
        const isConnected = await supabaseService.checkSupabaseConnection();
        
        if (isConnected) {
          // Enhanced logging with emotional scores and tags
          if (typeof supabaseService.logChatToSupabase === 'function') {
            // Get emotional scores and tags from the result
            const tags = result.entry.tags || [];
            const emotionalScore = Math.max(
              result.entry.stressScore || 0, 
              result.entry.fatigueScore || 0, 
              result.entry.painScore || 0
            );
            
            // Enhanced logging with emotional score and tags
            await supabaseService.logChatToSupabase(
              userId,
              content,
              result.entry.aiResponse || "No AI response generated",
              'openai',
              tags,
              emotionalScore > 0 ? emotionalScore : undefined
            );
          }
          
          supabaseResult = {
            success: true,
            message: contextEnriched 
              ? "Successfully exported to Supabase with enhanced metadata and used past entries for context"
              : "Successfully exported to Supabase with enhanced metadata"
          };
        }
      }
    } catch (supabaseError) {
      console.error("Supabase integration error:", supabaseError);
      supabaseResult = {
        success: false,
        message: `Supabase error: ${supabaseError}`
      };
    }
    
    res.json({
      journalEntry: result.entry,
      metrics: result.metrics,
      supabase: supabaseResult,
      contextAware: contextEnriched
    });
  } catch (error) {
    console.error("Error processing journal entry:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process a journal entry with NLP analysis
 * POST /api/journal/analyze-nlp
 */
router.post("/analyze-nlp", async (req: Request, res: Response) => {
  try {
    const { content, userName } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Missing required field: content" });
    }
    
    // Use our comprehensive NLP service
    const analysis = await analyzeJournalEntryWithNLP(content, userName || "User");
    
    res.json(analysis);
  } catch (error) {
    console.error("Error analyzing journal with NLP:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analyze a journal entry with Perplexity
 * POST /api/journal/analyze-perplexity
 */
/**
 * Analyze a journal entry with Google Gemini
 * POST /api/journal/analyze-gemini
 */
router.post("/analyze-gemini", async (req: Request, res: Response) => {
  try {
    const { content, userId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Missing required field: content" });
    }
    
    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ 
        error: "Gemini API key is not configured",
        message: "Please set the GEMINI_API_KEY environment variable"
      });
    }
    
    // Check for past journal entries in Supabase if userId provided
    let pastEntriesContext = "";
    if (userId && typeof supabaseService.getJournalEntries === 'function') {
      try {
        const isConnected = await supabaseService.checkSupabaseConnection();
        if (isConnected) {
          const pastEntries = await supabaseService.getJournalEntries(userId, 3);
          
          if (pastEntries && pastEntries.length > 0) {
            pastEntriesContext = "Recent journal entries for context:\n\n";
            
            for (const entry of pastEntries) {
              const date = new Date(entry.timestamp || entry.created_at).toLocaleDateString();
              pastEntriesContext += `Entry (${date}): ${entry.user_input || entry.content}\n`;
              if (entry.emotional_score) {
                pastEntriesContext += `Emotional score: ${entry.emotional_score}/10\n`;
              }
              if (entry.tags && entry.tags.length > 0) {
                pastEntriesContext += `Tags: ${entry.tags.join(", ")}\n`;
              }
              pastEntriesContext += "\n";
            }
          }
        }
      } catch (error) {
        console.warn("Error retrieving past journal entries from Supabase:", error);
      }
    }
    
    // Using the fetch API for Google Gemini
    const response = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a health assistant specialized in analyzing journal entries from kidney disease patients.
                ${pastEntriesContext ? pastEntriesContext : ""}
                
                Analyze the following journal entry:
                "${content}"
                
                Provide these insights:
                1. Stress level (1-10)
                2. Fatigue level (1-10)
                3. Pain level (1-10)
                4. Overall sentiment (positive, negative, neutral)
                5. Key health concerns or symptoms mentioned
                6. A brief supportive response (1-2 sentences)
                
                Format your response as JSON with these keys: stressScore, fatigueScore, painScore, sentiment, keywords, supportiveResponse, healthInsights.
                `
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      })
    });
    
    // Process the response
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }
    
    const geminiData = await response.json();
    const assistantMessage = geminiData.candidates[0]?.content?.parts[0]?.text || "";
    
    // Extract JSON from response
    let analysisResult;
    try {
      // Find JSON in response (sometimes Gemini adds explanatory text)
      const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : assistantMessage;
      analysisResult = JSON.parse(jsonString);
    } catch (parseError) {
      // If not valid JSON, extract key information using regex
      analysisResult = {
        stressScore: extractNumberFromText(assistantMessage, /stress(\s+level)?(\s*):?\s*(\d+)/i, 3, 5),
        fatigueScore: extractNumberFromText(assistantMessage, /fatigue(\s+level)?(\s*):?\s*(\d+)/i, 3, 5),
        painScore: extractNumberFromText(assistantMessage, /pain(\s+level)?(\s*):?\s*(\d+)/i, 3, 5),
        sentiment: extractSentiment(assistantMessage),
        keywords: extractKeywords(assistantMessage),
        healthInsights: assistantMessage,
        supportiveResponse: extractSupportiveResponse(assistantMessage)
      };
    }
    
    // Log the analysis to Supabase if userId is provided
    if (userId && typeof supabaseService.logChatToSupabase === 'function') {
      try {
        const isConnected = await supabaseService.checkSupabaseConnection();
        if (isConnected) {
          await supabaseService.logChatToSupabase(
            userId,
            content,
            analysisResult.supportiveResponse || "",
            "gemini",
            analysisResult.keywords || [],
            Math.max(
              analysisResult.stressScore || 0,
              analysisResult.fatigueScore || 0,
              analysisResult.painScore || 0
            ) || 5
          );
        }
      } catch (error) {
        console.warn("Error logging analysis to Supabase:", error);
      }
    }
    
    res.json({
      analysis: analysisResult,
      rawResponse: assistantMessage
    });
  } catch (error) {
    console.error("Error analyzing journal with Gemini:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/analyze-perplexity", async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Missing required field: content" });
    }
    
    // Check if Perplexity API key is available
    if (!process.env.PERPLEXITY_API_KEY) {
      return res.status(400).json({ 
        error: "Perplexity API key is not configured",
        message: "Please set the PERPLEXITY_API_KEY environment variable"
      });
    }
    
    // Call Perplexity API
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
            content: `You are a health assistant specialized in analyzing journal entries from kidney disease patients. 
            Analyze the entry for:
            1. Stress level (1-10)
            2. Fatigue level (1-10)
            3. Pain level (1-10)
            4. Sentiment (positive, negative, neutral)
            5. Health insights based on evidence
            6. Relevant citations to medical literature
            
            Format your response as JSON with these keys: stressScore, fatigueScore, painScore, sentiment, healthInsights, supportiveResponse, citations.`
          },
          {
            role: "user",
            content: content
          }
        ],
        temperature: 0.2,
        max_tokens: 1024,
        top_p: 0.9,
        stream: false,
        frequency_penalty: 1
      })
    });
    
    // Process the response
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
    }
    
    const perplexityData = await response.json();
    const assistantMessage = perplexityData.choices[0].message.content;
    
    // Parse the JSON response or extract data from text
    let analysisResult;
    try {
      analysisResult = JSON.parse(assistantMessage);
    } catch (parseError) {
      // If not valid JSON, extract key information using regex
      analysisResult = {
        stressScore: extractNumberFromText(assistantMessage, /stress(\s+level)?(\s*):?\s*(\d+)/i, 3, 5),
        fatigueScore: extractNumberFromText(assistantMessage, /fatigue(\s+level)?(\s*):?\s*(\d+)/i, 3, 5),
        painScore: extractNumberFromText(assistantMessage, /pain(\s+level)?(\s*):?\s*(\d+)/i, 3, 5),
        sentiment: extractSentiment(assistantMessage),
        healthInsights: assistantMessage,
        supportiveResponse: extractSupportiveResponse(assistantMessage),
        citations: perplexityData.citations || []
      };
    }
    
    // Include the raw citations from Perplexity
    analysisResult.citations = analysisResult.citations || perplexityData.citations || [];
    
    res.json({
      analysis: analysisResult,
      rawResponse: assistantMessage
    });
  } catch (error) {
    console.error("Error analyzing journal with Perplexity:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Save journal entry with analysis
 * POST /api/journal/save
 */
router.post("/save", async (req: Request, res: Response) => {
  try {
    const { userId, content, analysis } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: "Missing required fields: userId, content" });
    }
    
    // Create journal entry data
    const journalData = {
      userId,
      content,
      date: new Date(),
      stressScore: analysis?.stressScore || 5,
      fatigueScore: analysis?.fatigueScore || 5,
      painScore: analysis?.painScore || 5,
      sentiment: analysis?.sentiment || "neutral",
      tags: analysis?.tags || [],
      aiResponse: analysis?.supportiveResponse || null
    };
    
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
        fatigueLevel: journalData.fatigueScore
      });
    }
    
    res.status(201).json({
      entry: savedEntry,
      metrics
    });
  } catch (error) {
    console.error("Error saving journal entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper functions for text extraction
function extractNumberFromText(text: string, regex: RegExp, groupIndex: number, defaultValue: number): number {
  const match = text.match(regex);
  if (match && match[groupIndex]) {
    const value = parseInt(match[groupIndex]);
    return isNaN(value) ? defaultValue : Math.min(10, Math.max(1, value));
  }
  return defaultValue;
}

function extractSentiment(text: string): string {
  const sentimentRegex = /sentiment(\s*):?\s*(\w+)/i;
  const match = text.match(sentimentRegex);
  if (match && match[2]) {
    const sentiment = match[2].toLowerCase();
    if (["positive", "negative", "neutral", "mixed"].includes(sentiment)) {
      return sentiment;
    }
  }
  return "neutral";
}

function extractKeywords(text: string): string[] {
  // Look for keywords or tags section
  const keywordRegex = /keywords|tags|key concerns|health concerns|symptoms(?:\s*):?\s*\[?([^\]]*)\]?/i;
  const match = text.match(keywordRegex);
  
  if (match && match[1]) {
    // Split by commas or other separators
    return match[1].split(/,|;/).map(keyword => keyword.trim()).filter(k => k.length > 0);
  }
  
  // If no keywords section found, extract potential keywords
  // Look for capitalized words that might be medical terms
  const medicalTerms = text.match(/\b[A-Z][a-z]{2,}\b/g);
  if (medicalTerms && medicalTerms.length > 0) {
    return [...new Set(medicalTerms)].slice(0, 5); // Deduplicate and take top 5
  }
  
  // Fallback to common kidney health keywords
  return ["health", "kidney", "nephrology"];
}

function extractSupportiveResponse(text: string): string {
  // Look for a supportive response section
  const supportiveRegex = /supportive(\s+response)?(\s*):?\s*(.+?)(\n|$)/i;
  const match = text.match(supportiveRegex);
  if (match && match[3]) {
    return match[3].trim();
  }
  
  // If not found, return the last paragraph if it's not too long
  const paragraphs = text.split(/\n\s*\n/);
  const lastParagraph = paragraphs[paragraphs.length - 1];
  if (lastParagraph && lastParagraph.length < 500) {
    return lastParagraph.trim();
  }
  
  return "Thank you for sharing your journal entry. Tracking your symptoms and feelings can help with your kidney health journey.";
}

export default router;