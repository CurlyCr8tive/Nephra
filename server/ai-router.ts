import { Router, Request, Response } from "express";
import * as openaiService from "./openai-service";
import * as perplexityService from "./perplexity-service";
import * as geminiService from "./gemini-service";
import * as journalService from "./journal-service";
import * as supabaseService from "./supabase-service";
import { storage } from "./storage";
import journalApiRouter from "./journal-api-router";
import { estimateSymptomsFromText, shouldSuggestKSLS } from "./utils/symptom-extractor";

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
    
    // Extract symptoms using advanced NLP before getting AI response
    const symptomAnalysis = estimateSymptomsFromText(userMessage);
    const kslsSuggestion = shouldSuggestKSLS(symptomAnalysis);
    
    // Build enhanced context with symptom data for AI
    const enhancedContext = context || "";
    const symptomContext = symptomAnalysis.confidence !== "none" 
      ? `\n[Symptom Analysis: Fatigue=${symptomAnalysis.fatigue_score}/10, Pain=${symptomAnalysis.pain_score}/10, Stress=${symptomAnalysis.stress_score}/10, Confidence=${symptomAnalysis.confidence}]`
      : "";
    
    // Get the AI response with symptom-enhanced context
    let aiResponse = await openaiService.getNephraSupportChat(userMessage, enhancedContext + symptomContext);
    
    // Add KSLS tracking suggestion if symptoms are significant
    if (kslsSuggestion) {
      aiResponse += "\n\n💡 " + kslsSuggestion.message;
    }
    
    // Extract tags and emotions from symptom analysis
    let tags: string[] = [];
    let emotionalScore: number | undefined = undefined;
    
    // Use symptom extractor results for tagging
    if (symptomAnalysis.fatigue_score >= 5) {
      tags.push('fatigue');
      emotionalScore = Math.max(emotionalScore || 0, symptomAnalysis.fatigue_score);
    }
    
    if (symptomAnalysis.pain_score >= 3) {
      tags.push('pain');
      emotionalScore = Math.max(emotionalScore || 0, symptomAnalysis.pain_score);
    }
    
    if (symptomAnalysis.stress_score >= 5) {
      tags.push('stress');
      emotionalScore = Math.max(emotionalScore || 0, symptomAnalysis.stress_score);
    }
    
    // Add detected trigger keywords as additional tags
    if (symptomAnalysis.detected_triggers && symptomAnalysis.detected_triggers.length > 0) {
      symptomAnalysis.detected_triggers.forEach(trigger => {
        const triggerTag = trigger.replace(/\s+/g, '_').toLowerCase();
        if (!tags.includes(triggerTag)) {
          tags.push(triggerTag);
        }
      });
    }
    
    // Save the chat to the local database
    const chat = await storage.createAiChat({
      userId,
      userMessage,
      aiResponse,
      timestamp: new Date()
    });
    
    // Also log to Supabase for analytics and context history, but only if connection is available
    try {
      // First check if Supabase is connected before attempting to save
      const isConnected = await supabaseService.checkSupabaseConnection();
      
      if (isConnected) {
        await supabaseService.logChatToSupabase(
          userId,
          userMessage,
          aiResponse,
          'openai',
          tags.length > 0 ? tags : undefined,
          emotionalScore
        );
        console.log('Chat successfully logged to Supabase');
      } else {
        console.log('Skipping Supabase logging - connection not available');
      }
    } catch (supabaseError) {
      console.warn('Supabase logging failed but chat was saved locally:', supabaseError);
    }
    
    res.json({ 
      message: aiResponse, 
      chat,
      metadata: {
        tags,
        emotionalScore
      }
    });
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
    // SECURITY FIX: Require authentication for ALL AI chat history access
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.warn("🚨 SECURITY: Unauthenticated AI chat history access attempt blocked");
      return res.status(401).json({ 
        error: "Authentication required", 
        message: "You must be logged in to access chat history" 
      });
    }

    const requestedUserId = parseInt(req.params.userId);
    const authenticatedUserId = req.user?.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    if (isNaN(requestedUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // SECURITY FIX: Users can ONLY access their own AI chat history
    if (requestedUserId !== authenticatedUserId) {
      console.warn(`🚨 SECURITY: User ${authenticatedUserId} attempted to access AI chat history for user ${requestedUserId}`);
      return res.status(403).json({ 
        error: "Access denied", 
        message: "You can only access your own chat history" 
      });
    }
    
    console.log(`✅ Authenticated user ${authenticatedUserId} accessing their own AI chat history`);
    // Get chats from local storage
    const localChats = await storage.getAiChats(requestedUserId, limit);
    
    // Try to get richer chat data from Supabase if available
    let supabaseChats: any[] = [];
    try {
      if (typeof supabaseService.getChatLogs === 'function') {
        const isConnected = await supabaseService.checkSupabaseConnection();
        if (isConnected) {
          supabaseChats = await supabaseService.getChatLogs(requestedUserId, limit || 10);
        }
      }
    } catch (supabaseError) {
      console.warn('Failed to fetch Supabase chat logs, using local data only:', supabaseError);
    }
    
    // Return both sources, prioritizing Supabase data which has richer metadata
    res.json({
      chats: localChats,
      metadata: {
        hasSupabaseData: supabaseChats.length > 0,
        supabaseChats: supabaseChats
      }
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

/**
 * Get history specifically from Supabase with full context
 * GET /api/ai/chat/:userId/supabase
 */
router.get("/chat/:userId/supabase", async (req: Request, res: Response) => {
  try {
    // SECURITY FIX: Require authentication for ALL Supabase AI chat history access
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.warn("🚨 SECURITY: Unauthenticated Supabase AI chat history access attempt blocked");
      return res.status(401).json({ 
        error: "Authentication required", 
        message: "You must be logged in to access chat history" 
      });
    }

    const requestedUserId = parseInt(req.params.userId);
    const authenticatedUserId = req.user?.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    if (isNaN(requestedUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // SECURITY FIX: Users can ONLY access their own Supabase AI chat history
    if (requestedUserId !== authenticatedUserId) {
      console.warn(`🚨 SECURITY: User ${authenticatedUserId} attempted to access Supabase AI chat history for user ${requestedUserId}`);
      return res.status(403).json({ 
        error: "Access denied", 
        message: "You can only access your own chat history" 
      });
    }
    
    // Check if Supabase is available
    const isConnected = await supabaseService.checkSupabaseConnection();
    if (!isConnected) {
      return res.status(503).json({ 
        error: "Supabase service unavailable",
        message: "The enhanced chat history feature is currently unavailable. Please try again later."
      });
    }
    
    console.log(`✅ Authenticated user ${authenticatedUserId} accessing their own Supabase AI chat history`);
    // Get chat logs from Supabase
    const chats = await supabaseService.getChatLogs(requestedUserId, limit);
    
    // Return the chat logs with analytics
    // Filter out undefined/null values and ensure we have valid numerical scores
    const emotions: number[] = chats
      .filter(chat => typeof chat.emotional_score === 'number')
      .map(chat => chat.emotional_score as number);
    
    // Calculate average with proper type safety
    const avgEmotionalScore = emotions.length > 0 
      ? emotions.reduce((sum: number, score: number) => sum + score, 0) / emotions.length 
      : null;
    
    // Extract all tags for trend analysis
    const allTags = chats
      .filter(chat => chat.tags && Array.isArray(chat.tags))
      .flatMap(chat => chat.tags);
    
    // Count tag frequencies
    const tagCounts: Record<string, number> = {};
    allTags.forEach(tag => {
      if (tag) { // Only process defined tags
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    });
    
    // Return with analysis
    res.json({
      chats,
      analytics: {
        totalChats: chats.length,
        averageEmotionalScore: avgEmotionalScore,
        mostFrequentTags: Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([tag, count]) => ({ tag, count }))
      }
    });
  } catch (error) {
    console.error("Error fetching Supabase chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history from Supabase" });
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
 * POST /api/ai/nephra-advice
 */
router.post("/nephra-advice", async (req: Request, res: Response) => {
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
    
    // If Supabase is configured, also save to Supabase - but don't block on it
    let supabaseResult = { success: false, message: "Supabase not configured" };
    
    try {
      // Check if Supabase is configured and connected before trying to save
      if (typeof supabaseService.checkSupabaseConnection === 'function') {
        const isConnected = await supabaseService.checkSupabaseConnection();
        console.log('Supabase connection for journal entry:', isConnected ? 'available' : 'unavailable');
        if (isConnected) {
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
            tags.length > 0 ? tags : undefined,
            emotionalScore > 0 ? emotionalScore : undefined
          );
          
          supabaseResult = {
            success: true,
            message: "Successfully exported to Supabase with enhanced metadata"
          };
        }
      }
    } catch (supabaseError) {
      console.error("Supabase integration error:", supabaseError);
      supabaseResult = {
        success: false,
        message: "Error connecting to Supabase"
      };
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