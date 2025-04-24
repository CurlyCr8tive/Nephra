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
    
    // Process and save the journal entry with optional health metrics
    const result = await journalService.processAndSaveJournalEntry(userId, content);
    
    // If Supabase is configured, also save to Supabase
    let supabaseResult = { success: false, message: "Supabase not configured" };
    
    try {
      // Check if Supabase is configured by testing for presence of functions
      if (typeof supabaseService.checkSupabaseConnection === 'function') {
        const isConnected = await supabaseService.checkSupabaseConnection();
        
        if (isConnected) {
          // Log the journal entry in Supabase
          await supabaseService.logChatInteraction(
            userId,
            content,
            result.entry.aiResponse || "No AI response generated",
            true
          );
          
          supabaseResult = {
            success: true,
            message: "Successfully exported to Supabase"
          };
        }
      }
    } catch (supabaseError) {
      console.error("Supabase integration error:", supabaseError);
      supabaseResult = {
        success: false,
        message: `Supabase error: ${supabaseError.message}`
      };
    }
    
    res.json({
      journalEntry: result.entry,
      metrics: result.metrics,
      supabase: supabaseResult
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