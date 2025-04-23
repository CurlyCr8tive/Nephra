/**
 * Enhanced Journal API Router
 * Integrates the advanced chatbot functionality converted from Python
 */
import { Router, Request, Response } from "express";
import { processEnhancedJournalEntry, getJournalFollowUpResponse } from "./enhanced-journal-service";
import { InsertJournalEntry, journalEntries } from "@shared/schema";
import { db } from "./db";

const router = Router();

/**
 * Process a journal entry with enhanced multi-modal AI analysis
 * POST /api/enhanced-journal/process
 */
router.post("/process", async (req: Request, res: Response) => {
  try {
    const { userId, content } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: "User ID and content are required" });
    }
    
    try {
      // Try to process with our AI services
      const result = await processEnhancedJournalEntry(userId, content);
      
      return res.status(200).json({
        entry: result.entry,
        analysis: {
          stress: result.aiAnalysis.stress,
          fatigue: result.aiAnalysis.fatigue,
          response: result.aiAnalysis.response,
          link: result.aiAnalysis.link || null
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
    const { userId, prompt, context, followUpPrompt, previousContext } = req.body;
    
    if (!userId || (!prompt && !followUpPrompt)) {
      return res.status(400).json({ error: "User ID and prompt are required" });
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