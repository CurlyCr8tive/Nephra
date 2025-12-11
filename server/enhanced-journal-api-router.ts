/**
 * Enhanced Journal API Router
 * Integrates the advanced chatbot functionality converted from Python
 */
import { Router, Request, Response } from "express";
import { processEnhancedJournalEntry, getJournalFollowUpResponse } from "./enhanced-journal-service";
import { InsertJournalEntry, journalEntries } from "@shared/schema";
import { db } from "./db";
import { estimateSymptomsFromText, shouldSuggestKSLS } from "./utils/symptom-extractor";

const router = Router();

/**
 * Process a journal entry with enhanced multi-modal AI analysis
 * POST /api/enhanced-journal/process
 */
router.post("/process", async (req: Request, res: Response) => {
  try {
    // SECURITY FIX: Require authentication for ALL journal processing
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.warn("🚨 SECURITY: Unauthenticated enhanced journal processing attempt blocked");
      return res.status(401).json({ 
        error: "Authentication required", 
        message: "You must be logged in to process journal entries" 
      });
    }

    const { userId, content } = req.body;
    const authenticatedUserId = req.user?.id;
    
    if (!userId || !content) {
      return res.status(400).json({ error: "User ID and content are required" });
    }

    // SECURITY FIX: Users can ONLY process their own journal entries
    if (userId !== authenticatedUserId) {
      console.warn(`🚨 SECURITY: User ${authenticatedUserId} attempted to process journal entry for user ${userId}`);
      return res.status(403).json({ 
        error: "Access denied", 
        message: "You can only process your own journal entries" 
      });
    }
    
    try {
      // Try to process with our AI services
      const result = await processEnhancedJournalEntry(userId, content);
      
      // Extract symptoms from journal text for enhanced analysis
      const symptomAnalysis = estimateSymptomsFromText(content);
      const kslsSuggestion = shouldSuggestKSLS(symptomAnalysis);
      
      // Enhance AI response with symptom-based suggestions if applicable
      let enhancedResponse = result.aiAnalysis.response;
      if (kslsSuggestion) {
        enhancedResponse += "\n\n💡 " + kslsSuggestion.message;
      }
      
      return res.status(200).json({
        entry: result.entry,
        analysis: {
          stress: result.aiAnalysis.stress,
          fatigue: result.aiAnalysis.fatigue,
          response: enhancedResponse,
          link: result.aiAnalysis.link || null,
          symptoms: {
            detected: symptomAnalysis,
            kslsRecommended: kslsSuggestion ? true : false,
            triggers: symptomAnalysis.detected_triggers
          }
        }
      });
    } catch (aiError) {
      // All AI services failed, use fallback
      console.error("All AI services failed:", aiError);
      
      // Create a fallback journal entry without AI analysis
      const journalData: InsertJournalEntry = {
        content: content,
        date: new Date(),
        userId: userId,
        aiResponse: "I couldn't analyze your entry right now, but I've saved it. Please try again later.",
        sentiment: "neutral",
        stressScore: 5, // Default middle value
        fatigueScore: 5, // Default middle value
        painScore: 5, // Default middle value
        tags: []
      };
      
      // Insert the entry directly
      const [savedEntry] = await db.insert(journalEntries).values(journalData).returning();
      
      // Return with a fallback message
      return res.status(200).json({
        entry: savedEntry,
        analysis: {
          stress: 5,
          fatigue: 5,
          response: "I couldn't analyze your entry right now, but I've saved it. Please try again later.",
          link: null
        }
      });
    }
  } catch (error) {
    console.error("Error processing enhanced journal entry:", error);
    return res.status(500).json({ 
      error: "Failed to process journal entry",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get follow-up response for journal conversation
 * POST /api/enhanced-journal/follow-up
 */
router.post("/follow-up", async (req: Request, res: Response) => {
  try {
    // SECURITY FIX: Require authentication for ALL journal follow-up processing
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.warn("🚨 SECURITY: Unauthenticated enhanced journal follow-up attempt blocked");
      return res.status(401).json({ 
        error: "Authentication required", 
        message: "You must be logged in to access journal follow-up" 
      });
    }

    const { userId, prompt, context, followUpPrompt, previousContext } = req.body;
    const authenticatedUserId = req.user?.id;
    
    if (!userId || (!prompt && !followUpPrompt)) {
      return res.status(400).json({ error: "User ID and prompt are required" });
    }

    // SECURITY FIX: Users can ONLY access their own journal follow-up conversations
    if (userId !== authenticatedUserId) {
      console.warn(`🚨 SECURITY: User ${authenticatedUserId} attempted to access journal follow-up for user ${userId}`);
      return res.status(403).json({ 
        error: "Access denied", 
        message: "You can only access your own journal conversations" 
      });
    }
    
    // Support both field names for flexibility
    const userPrompt = followUpPrompt || prompt;
    const conversationContext = previousContext || context || [];
    
    try {
      // Try to get response from AI service
      const response = await getJournalFollowUpResponse(userId, userPrompt, conversationContext);
      
      return res.status(200).json({
        response,
        userId
      });
    } catch (aiError) {
      // All AI services failed, return a graceful fallback response
      console.error("All AI follow-up services failed:", aiError);
      
      const fallbackResponse = "I'm having trouble processing your question right now. " +
                             "Could you try again later or rephrase your question?";
      
      return res.status(200).json({
        response: fallbackResponse,
        userId
      });
    }
  } catch (error) {
    console.error("Error getting follow-up response:", error);
    return res.status(500).json({ 
      error: "Failed to get follow-up response",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;