import { Router, Request, Response } from "express";
import * as openaiService from "./openai-service";
import * as perplexityService from "./perplexity-service";
import * as geminiService from "./gemini-service";
import * as journalService from "./journal-service";
import { SupabaseService } from "./supabase-service";
import { storage } from "./storage";
import journalApiRouter from "./journal-api-router";

const router = Router();

// Mount journal API router for journal-specific operations
router.use("/journal", journalApiRouter);

// OpenAI endpoints

/**
 * Chat with AI using OpenAI
 * POST /api/ai/chat
 */
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { userId, userMessage, context } = req.body;
    
    if (!userId || !userMessage) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Get the AI response
    const aiResponse = await openaiService.getNephraSupportChat(userMessage, context);
    
    // Save the chat to the database
    const chat = await storage.createAiChat({
      userId,
      userMessage,
      aiResponse,
      timestamp: new Date()
    });
    
    res.json({ message: aiResponse, chat });
  } catch (error) {
    console.error("Error in AI chat endpoint:", error);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});

/**
 * Get chat history for a user
 * GET /api/ai/chat/:userId
 */
router.get("/chat/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    
    const chats = await storage.getAiChats(userId, limit);
    res.json(chats);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

/**
 * Validate health metrics
 * POST /api/ai/validate/health-metrics
 */
router.post("/validate/health-metrics", async (req: Request, res: Response) => {
  try {
    const { patientInfo, healthData } = req.body;
    
    if (!healthData) {
      return res.status(400).json({ error: "Missing health data" });
    }
    
    const validation = await openaiService.validateHealthMetrics(patientInfo, healthData);
    res.json(validation);
  } catch (error) {
    console.error("Error validating health metrics:", error);
    res.status(500).json({ error: "Failed to validate health metrics" });
  }
});

/**
 * Validate medical document
 * POST /api/ai/validate/document
 */
router.post("/validate/document", async (req: Request, res: Response) => {
  try {
    const { documentType, patientInfo, documentData } = req.body;
    
    if (!documentType || !documentData) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const validation = await openaiService.validateMedicalDocument(documentType, patientInfo, documentData);
    res.json(validation);
  } catch (error) {
    console.error("Error validating medical document:", error);
    res.status(500).json({ error: "Failed to validate medical document" });
  }
});

/**
 * Analyze journal entry
 * POST /api/ai/analyze/journal
 */
router.post("/analyze/journal", async (req: Request, res: Response) => {
  try {
    const { journalText } = req.body;
    
    if (!journalText) {
      return res.status(400).json({ error: "Missing journal text" });
    }
    
    const analysis = await openaiService.analyzeJournalEntry(journalText);
    res.json(analysis);
  } catch (error) {
    console.error("Error analyzing journal entry:", error);
    res.status(500).json({ error: "Failed to analyze journal entry" });
  }
});

// Perplexity endpoints

/**
 * Get evidence-based health information
 * POST /api/ai/health-info
 */
router.post("/health-info", async (req: Request, res: Response) => {
  try {
    const { topic, context, relatedCondition, patientDetails } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: "Missing topic" });
    }
    
    const healthInfo = await perplexityService.getEvidenceBasedHealthInfo({
      topic,
      context,
      relatedCondition,
      patientDetails
    });
    
    res.json(healthInfo);
  } catch (error) {
    console.error("Error fetching health information:", error);
    res.status(500).json({ error: "Failed to fetch health information" });
  }
});

/**
 * Explain medical terms
 * POST /api/ai/explain-terms
 */
router.post("/explain-terms", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }
    
    const explanation = await perplexityService.explainMedicalTerms(text);
    res.json(explanation);
  } catch (error) {
    console.error("Error explaining medical terms:", error);
    res.status(500).json({ error: "Failed to explain medical terms" });
  }
});

// Gemini endpoints

/**
 * Get Nephra health advice
 * POST /api/ai/kidney-advice
 */
router.post("/kidney-advice", async (req: Request, res: Response) => {
  try {
    const { metrics, patientInfo } = req.body;
    
    if (!metrics) {
      return res.status(400).json({ error: "Missing health metrics" });
    }
    
    const advice = await geminiService.getNephraHealthAdvice(metrics, patientInfo);
    res.json(advice);
  } catch (error) {
    console.error("Error getting Nephra health advice:", error);
    res.status(500).json({ error: "Failed to get health advice" });
  }
});

/**
 * Analyze lab results
 * POST /api/ai/analyze/lab-results
 */
router.post("/analyze/lab-results", async (req: Request, res: Response) => {
  try {
    const { labText, patientContext } = req.body;
    
    if (!labText) {
      return res.status(400).json({ error: "Missing lab results text" });
    }
    
    const analysis = await geminiService.analyzeLaboratoryResults(labText, patientContext);
    res.json(analysis);
  } catch (error) {
    console.error("Error analyzing lab results:", error);
    res.status(500).json({ error: "Failed to analyze lab results" });
  }
});

/**
 * Get Nephra education content
 * POST /api/ai/education
 */
router.post("/education", async (req: Request, res: Response) => {
  try {
    const { topic, audience, diseaseStage } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: "Missing topic" });
    }
    
    const content = await geminiService.getNephraEducationContent(topic, audience, diseaseStage);
    res.json(content);
  } catch (error) {
    console.error("Error getting Nephra education content:", error);
    res.status(500).json({ error: "Failed to get education content" });
  }
});

/**
 * Process journal entry with enhanced analysis (from Python implementation)
 * POST /api/ai/journal/process
 */
router.post("/journal/process", async (req: Request, res: Response) => {
  try {
    const { userId, content } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: "Missing userId or journal content" });
    }
    
    // Process the journal entry using the service
    const journalData = await journalService.processJournalEntry(userId, content);
    
    // Save to database
    const savedEntry = await storage.createJournalEntry(journalData);
    
    // Return the processed entry with analysis
    res.json({
      entry: savedEntry,
      analysis: {
        stressScore: journalData.stressScore,
        fatigueScore: journalData.fatigueScore,
        painScore: journalData.painScore,
        sentiment: journalData.sentiment,
        tags: journalData.tags,
        supportiveResponse: journalData.aiResponse
      }
    });
  } catch (error) {
    console.error("Error processing journal entry:", error);
    res.status(500).json({ error: "Failed to process journal entry" });
  }
});

/**
 * Process and save journal entry with health metrics
 * POST /api/ai/journal/process-with-metrics
 */
router.post("/journal/process-with-metrics", async (req: Request, res: Response) => {
  try {
    const { userId, content } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: "Missing userId or journal content" });
    }
    
    // Process and save the journal entry with optional health metrics
    const result = await journalService.processAndSaveJournalEntry(userId, content);
    
    // If Supabase is configured, also save to Supabase
    let supabaseResult = { success: false, message: "Supabase not configured" };
    
    if (SupabaseService.isConfigured()) {
      try {
        const supabaseService = new SupabaseService();
        const success = await supabaseService.exportJournalEntryToSupabase(result.entry);
        
        supabaseResult = {
          success,
          message: success ? "Successfully exported to Supabase" : "Failed to export to Supabase"
        };
      } catch (supabaseError) {
        console.error("Supabase integration error:", supabaseError);
        supabaseResult = {
          success: false,
          message: "Error connecting to Supabase"
        };
      }
    }
    
    res.json({
      ...result,
      supabase: supabaseResult
    });
  } catch (error) {
    console.error("Error processing journal entry with metrics:", error);
    res.status(500).json({ error: "Failed to process journal entry" });
  }
});

export default router;