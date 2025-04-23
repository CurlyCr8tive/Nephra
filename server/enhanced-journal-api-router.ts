/**
 * Enhanced Journal API Router
 * Integrates the advanced chatbot functionality converted from Python
 */
import { Router, Request, Response } from "express";
import { processEnhancedJournalEntry, getJournalFollowUpResponse } from "./enhanced-journal-service";

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
    const { userId, prompt, context } = req.body;
    
    if (!userId || !prompt) {
      return res.status(400).json({ error: "User ID and prompt are required" });
    }
    
    const previousContext = context || [];
    const response = await getJournalFollowUpResponse(userId, prompt, previousContext);
    
    return res.status(200).json({
      response,
      userId
    });
  } catch (error) {
    console.error("Error getting follow-up response:", error);
    return res.status(500).json({ 
      error: "Failed to get follow-up response",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;