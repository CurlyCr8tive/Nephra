import express from 'express';
import { z } from 'zod';
import { 
  getEducationArticlesByCategory, 
  searchEducationArticles,
  getHealthLogs,
  saveHealthLog,
  getChatHistory,
  saveChatLog,
  getJournalEntries,
  saveJournalEntry
} from './supabase-service';
import { 
  supabaseHealthLogSchema,
  SupabaseEducationArticle,
  SupabaseHealthLog,
  SupabaseChatLog,
  SupabaseJournalEntry 
} from '../shared/schema';

// Create a router for Supabase related routes
const supabaseRouter = express.Router();

// Authentication middleware to ensure user is logged in
function ensureAuthenticated(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
}

// Get education articles by category or search query
supabaseRouter.get('/education-articles', async (req, res) => {
  try {
    const { category, query, limit = '10' } = req.query;
    const limitNum = parseInt(limit as string);
    
    if (query) {
      // Search mode
      const articles = await searchEducationArticles(query as string, limitNum);
      return res.json(articles);
    } else {
      // Category mode
      const articles = await getEducationArticlesByCategory(category as string, limitNum);
      return res.json(articles);
    }
  } catch (error) {
    console.error('Error in education articles route:', error);
    res.status(500).json({ error: 'Failed to fetch education articles' });
  }
});

// Get health logs for the current user
supabaseRouter.get('/health-logs', ensureAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { limit = '20' } = req.query;
    const limitNum = parseInt(limit as string);
    
    const healthLogs = await getHealthLogs(userId, limitNum);
    res.json(healthLogs);
  } catch (error) {
    console.error('Error in health logs route:', error);
    res.status(500).json({ error: 'Failed to fetch health logs' });
  }
});

// Save a new health log for the current user
supabaseRouter.post('/health-logs', ensureAuthenticated, async (req, res) => {
  try {
    // Validate the request body
    const validation = supabaseHealthLogSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid health log data', 
        details: validation.error.format() 
      });
    }
    
    // Ensure user_id matches the authenticated user
    const healthLog: SupabaseHealthLog = {
      ...req.body,
      user_id: (req.user as any).id,
      created_at: req.body.created_at || new Date().toISOString()
    };
    
    const result = await saveHealthLog(healthLog);
    
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to save health log', details: result.error });
    }
    
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error saving health log:', error);
    res.status(500).json({ error: 'Failed to save health log' });
  }
});

// Get chat history for the current user
supabaseRouter.get('/chat-history', ensureAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string);
    
    const chatHistory = await getChatHistory(userId, limitNum);
    res.json(chatHistory);
  } catch (error) {
    console.error('Error in chat history route:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Save a new chat interaction
supabaseRouter.post('/chat-logs', ensureAuthenticated, async (req, res) => {
  try {
    // Basic validation
    const chatLogSchema = z.object({
      user_input: z.string().min(1),
      ai_response: z.string().min(1),
      model_used: z.string().optional(),
      tags: z.array(z.string()).optional(),
      emotional_score: z.number().optional().nullable()
    });
    
    const validation = chatLogSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid chat log data', 
        details: validation.error.format() 
      });
    }
    
    // Create chat log object
    const chatLog: SupabaseChatLog = {
      ...req.body,
      user_id: (req.user as any).id,
      timestamp: new Date().toISOString()
    };
    
    const result = await saveChatLog(chatLog);
    
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to save chat log', details: result.error });
    }
    
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error saving chat log:', error);
    res.status(500).json({ error: 'Failed to save chat log' });
  }
});

// Get journal entries for the current user
supabaseRouter.get('/journal-entries', ensureAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { limit = '20' } = req.query;
    const limitNum = parseInt(limit as string);
    
    const journalEntries = await getJournalEntries(userId, limitNum);
    res.json(journalEntries);
  } catch (error) {
    console.error('Error in journal entries route:', error);
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

// Save a new journal entry
supabaseRouter.post('/journal-entries', ensureAuthenticated, async (req, res) => {
  try {
    // Basic validation
    const journalEntrySchema = z.object({
      content: z.string().min(1),
      sentiment: z.string().optional(),
      ai_analysis: z.string().optional(),
      tags: z.array(z.string()).optional(),
      stress_level: z.number().optional(),
      fatigue_level: z.number().optional(),
      pain_level: z.number().optional(),
      metadata: z.record(z.any()).optional()
    });
    
    const validation = journalEntrySchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid journal entry data', 
        details: validation.error.format() 
      });
    }
    
    // Create journal entry object
    const journalEntry: SupabaseJournalEntry = {
      ...req.body,
      user_id: (req.user as any).id,
      created_at: new Date().toISOString()
    };
    
    const result = await saveJournalEntry(journalEntry);
    
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to save journal entry', details: result.error });
    }
    
    res.status(201).json(result.data);
  } catch (error) {
    console.error('Error saving journal entry:', error);
    res.status(500).json({ error: 'Failed to save journal entry' });
  }
});

export default supabaseRouter;