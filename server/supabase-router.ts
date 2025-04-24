/**
 * Supabase Router for Nephra App
 * 
 * This router provides endpoints that interface with Supabase
 * for storing and retrieving health data.
 */

import { Router, Request, Response } from 'express';
import { supabase, logChatToSupabase } from './supabase-service';

const router = Router();

/**
 * Save health logs to Supabase
 * POST /api/supabase/health-logs
 */
router.post('/health-logs', async (req: Request, res: Response) => {
  try {
    const healthData = req.body;
    
    console.log('Received health data for Supabase:', healthData);
    
    // Ensure we have critical fields
    if (!healthData.user_id) {
      return res.status(400).json({ error: 'Missing user_id field' });
    }
    
    // Add created_at if not present
    if (!healthData.created_at) {
      healthData.created_at = new Date().toISOString();
    }
    
    // Try inserting into health_logs table
    const { data, error } = await supabase
      .from('health_logs')
      .insert([healthData])
      .select();
    
    if (error) {
      console.error('Supabase health logs insert error:', error);
      
      // If table doesn't exist, create it (this is just for demo/development)
      if (error.message?.includes('does not exist')) {
        console.log('Attempting to create health_logs table...');
        
        // Try to store in chat_logs as a fallback with metadata
        const fallbackData = {
          user_id: healthData.user_id,
          user_input: 'Health tracking data entry',
          ai_response: 'Health data recorded successfully',
          model_used: 'none',
          timestamp: healthData.created_at,
          metadata: healthData,
          tags: ['health_data', 'metrics']
        };
        
        const { data: chatData, error: chatError } = await supabase
          .from('chat_logs')
          .insert([fallbackData])
          .select();
        
        if (chatError) {
          console.error('Fallback to chat_logs failed:', chatError);
          return res.status(500).json({ 
            error: 'Could not save to Supabase', 
            details: error.message 
          });
        }
        
        return res.status(201).json({ 
          success: true, 
          data: chatData, 
          note: 'Stored as chat logs due to missing health_logs table'
        });
      }
      
      return res.status(500).json({ error: 'Supabase insert failed', details: error.message });
    }
    
    console.log('✅ Health data saved to Supabase:', data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error saving health data to Supabase:', error);
    return res.status(500).json({ 
      error: 'Server error saving to Supabase',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get health logs from Supabase
 * GET /api/supabase/health-logs/:userId
 */
router.get('/health-logs/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    // Try to get from health_logs table
    const { data, error } = await supabase
      .from('health_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Supabase health logs query error:', error);
      return res.status(500).json({ error: 'Supabase query failed', details: error.message });
    }
    
    return res.json(data || []);
  } catch (error) {
    console.error('Error getting health data from Supabase:', error);
    return res.status(500).json({ 
      error: 'Server error retrieving from Supabase',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;