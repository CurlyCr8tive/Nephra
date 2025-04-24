/**
 * Supabase Router for Nephra App
 * 
 * This router provides endpoints that interface with Supabase
 * for storing and retrieving health data.
 */

import { Router, Request, Response } from 'express';
import { supabase, logChatToSupabase, logHealthScores } from './supabase-service';

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
    
    // Try the new approach first using the format from the Python examples
    try {
      // Extract key fields or provide defaults
      const userId = healthData.user_id;
      const painLevel = healthData.pain_level ?? healthData.painLevel ?? 0;
      const stressLevel = healthData.stress_level ?? healthData.stressLevel ?? 0;
      const fatigueLevel = healthData.fatigue_level ?? healthData.fatigueLevel ?? 0;
      const notes = healthData.notes ?? '';
      
      // Additional data to include
      const additionalData: Record<string, any> = {};
      
      // Include other fields if they exist
      if (healthData.bp_systolic || healthData.systolicBP) {
        additionalData.bp_systolic = healthData.bp_systolic ?? healthData.systolicBP;
      }
      
      if (healthData.bp_diastolic || healthData.diastolicBP) {
        additionalData.bp_diastolic = healthData.bp_diastolic ?? healthData.diastolicBP;
      }
      
      if (healthData.hydration_level || healthData.hydration) {
        additionalData.hydration_level = healthData.hydration_level ?? healthData.hydration;
      }
      
      if (healthData.estimated_gfr || healthData.estimatedGFR) {
        additionalData.estimated_gfr = healthData.estimated_gfr ?? healthData.estimatedGFR;
      }
      
      if (healthData.created_at) {
        additionalData.created_at = healthData.created_at;
      }
      
      if (healthData.tags) {
        additionalData.tags = healthData.tags;
      }
      
      if (healthData.medications_taken || healthData.medications) {
        additionalData.medications_taken = healthData.medications_taken ?? 
          (Array.isArray(healthData.medications) ? 
            healthData.medications.map((med: any) => `${med.name} (${med.dosage})`) : 
            healthData.medications);
      }
      
      // Use the new function that matches the Python implementation
      const result = await logHealthScores(
        userId,
        painLevel,
        stressLevel,
        fatigueLevel,
        notes,
        additionalData
      );
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to log health scores');
      }
      
      console.log('✅ Health data saved via logHealthScores:', result.data);
      return res.status(201).json({ success: true, data: result.data });
    } catch (newMethodError) {
      console.warn('New method failed, trying legacy approach:', newMethodError);
      
      // If the new method fails, fall back to the original approach
      
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
      
      console.log('✅ Health data saved to Supabase (legacy method):', data);
      return res.status(201).json({ success: true, data });
    }
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

/**
 * Log health scores using the Python-style function
 * POST /api/supabase/log-health-scores
 */
router.post('/log-health-scores', async (req: Request, res: Response) => {
  try {
    const { user_id, pain_score, stress_score, fatigue_score, notes, ...additionalData } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id field' });
    }
    
    if (pain_score === undefined || stress_score === undefined || fatigue_score === undefined) {
      return res.status(400).json({ error: 'Missing required health scores (pain_score, stress_score, fatigue_score)' });
    }
    
    console.log(`📝 Logging health scores for user ${user_id}:`, req.body);
    
    // Use the dedicated Python-style health score logging function
    const result = await logHealthScores(
      user_id,
      pain_score, 
      stress_score,
      fatigue_score,
      notes || '',
      additionalData
    );
    
    if (!result.success) {
      console.error('Failed to log health scores:', result.error);
      return res.status(500).json({ 
        error: 'Failed to log health scores',
        details: result.error
      });
    }
    
    console.log('✅ Health scores saved successfully:', result.data);
    return res.status(201).json({
      success: true,
      data: result.data,
      message: 'Health scores saved successfully'
    });
  } catch (error) {
    console.error('Error logging health scores:', error);
    return res.status(500).json({
      error: 'Server error logging health scores',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;