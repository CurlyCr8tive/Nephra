import express, { Request, Response } from "express";
import { storage } from "./storage";
import { supabase } from "./supabase-service";

const router = express.Router();

/**
 * Direct health data submission endpoint
 * POST /api/direct-health-log
 * 
 * This is a simplified endpoint that bypasses complex authentication
 * mechanisms and directly inserts health data into storage.
 * It uses a simple API key-based approach for authorization.
 */
router.post("/direct-health-log", async (req: Request, res: Response) => {
  try {
    const { healthData, userId, apiKey } = req.body;
    
    // Simple security check
    if (apiKey !== "nephra-health-data-key") {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Invalid API key" 
      });
    }
    
    if (!healthData || !userId) {
      return res.status(400).json({ 
        error: "Missing required data",
        message: "Both userId and healthData are required"
      });
    }
    
    console.log(`🔐 DIRECT API: Processing health data for user ${userId}`);
    
    // Format data for our storage system
    const formattedData = {
      userId: parseInt(userId),
      date: new Date(),
      systolicBP: healthData.systolicBP || healthData.bp_systolic,
      diastolicBP: healthData.diastolicBP || healthData.bp_diastolic,
      hydration: healthData.hydration || healthData.hydration_level,
      painLevel: healthData.painLevel || healthData.pain_level,
      stressLevel: healthData.stressLevel || healthData.stress_level,
      fatigueLevel: healthData.fatigueLevel || healthData.fatigue_level,
      notes: healthData.notes || "",
      estimatedGFR: healthData.estimatedGFR || healthData.estimated_gfr,
      // Add other fields as needed
    };
    
    // Directly save to storage
    const savedData = await storage.createHealthMetrics(formattedData);
    
    console.log(`✅ DIRECT API: Successfully saved health data with ID ${savedData.id}`);
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: "Health data saved successfully",
      id: savedData.id
    });
  } catch (error) {
    console.error("❌ DIRECT API ERROR:", error);
    return res.status(500).json({
      error: "Failed to save health data",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Log health data
 * POST /api/log-health
 * 
 * Unified endpoint that handles both standard database and Supabase data saving
 * Accepts both metrics format (for our application database) and supabase format
 */
router.post("/log-health", async (req: Request, res: Response) => {
  try {
    const { metrics, supabase: supabaseData } = req.body;
    
    if (!metrics && !supabaseData) {
      return res.status(400).json({ error: "No health data provided" });
    }
    
    // Get user ID either from authenticated session or from request body
    const userId = req.user?.id || metrics?.userId || supabaseData?.user_id;
    
    if (!userId) {
      return res.status(400).json({ 
        error: "Missing user ID",
        details: "Please provide a user ID in the request or log in"
      });
    }
    
    console.log(`Processing health log for user ${userId}`);
    
    const results = {
      standardDb: null,
      supabase: null,
      errors: {}
    };
    
    // 1. Try saving to our standard database if metrics data is provided
    if (metrics) {
      try {
        // Make sure date is a proper Date object before saving
        let sanitizedMetrics = { ...metrics };
        
        // If date is a string, convert to Date object
        if (metrics.date && typeof metrics.date === 'string') {
          console.log("Converting date string to Date object:", metrics.date);
          sanitizedMetrics.date = new Date(metrics.date);
        }
        
        const savedData = await storage.saveHealthMetrics(sanitizedMetrics);
        console.log("Health metrics saved to standard database:", savedData.id);
        results.standardDb = { success: true, id: savedData.id };
      } catch (error) {
        console.error("Error saving to standard database:", error);
        results.errors.standardDb = error instanceof Error ? error.message : String(error);
      }
    }
    
    // 2. Try saving to Supabase if Supabase data is provided
    if (supabaseData) {
      try {
        // Ensure we're saving with proper column format for Supabase table
        const formattedData = {
          user_id: supabaseData.user_id || userId,
          created_at: supabaseData.created_at || new Date().toISOString(),
          bp_systolic: supabaseData.bp_systolic,
          bp_diastolic: supabaseData.bp_diastolic,
          hydration_level: supabaseData.hydration_level,
          pain_level: supabaseData.pain_level, 
          stress_level: supabaseData.stress_level,
          fatigue_level: supabaseData.fatigue_level,
          estimated_gfr: supabaseData.estimated_gfr,
          tags: supabaseData.tags || [],
          medications_taken: supabaseData.medications_taken || []
        };
        
        const { data, error } = await supabase
          .from("health_logs")
          .insert(formattedData)
          .select();
        
        if (error) {
          console.error("Supabase error:", error);
          results.errors.supabase = error.message;
        } else {
          console.log("Health metrics saved to Supabase:", data?.[0]?.id);
          results.supabase = { success: true, data };
        }
      } catch (error) {
        console.error("Error saving to Supabase:", error);
        results.errors.supabase = error instanceof Error ? error.message : String(error);
      }
    }
    
    // Determine overall success status
    const isSuccess = results.standardDb?.success || results.supabase?.success;
    
    if (isSuccess) {
      return res.status(200).json({
        success: true,
        message: "Health data saved successfully",
        results
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to save health data",
        errors: results.errors
      });
    }
  } catch (error) {
    console.error("Error processing health log:", error);
    return res.status(500).json({ 
      error: "Failed to process health log",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get health logs for a user
 * GET /api/log-health/:userId
 */
router.get("/log-health/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Check if user is authorized to access this data
    const isCurrentUser = req.user && String(req.user.id) === userId;
    const isAdmin = req.user && req.user.role === "admin";
    
    if (!isCurrentUser && !isAdmin) {
      return res.status(403).json({ 
        error: "Unauthorized",
        details: "You don't have permission to access this data"
      });
    }
    
    // Try fetching from standard database first
    let standardDbData = [];
    try {
      standardDbData = await storage.getHealthMetricsForUser(Number(userId)) || [];
    } catch (error) {
      console.error("Error fetching from standard database:", error);
    }
    
    // Also try fetching from Supabase
    let supabaseData = [];
    try {
      const { data, error } = await supabase
        .from("health_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Supabase query error:", error);
      } else {
        supabaseData = data || [];
      }
    } catch (error) {
      console.error("Error fetching from Supabase:", error);
    }
    
    // Merge and de-duplicate the data, preferring Supabase data if it exists
    // This is a simple implementation - you might want a more sophisticated merging strategy
    const supabaseEntryDates = new Set(supabaseData.map(entry => entry.created_at.substring(0, 19)));
    
    const filteredStandardData = standardDbData.filter(entry => {
      // Convert to ISO string and truncate milliseconds for comparison
      const entryDate = new Date(entry.date).toISOString().substring(0, 19);
      return !supabaseEntryDates.has(entryDate);
    });
    
    // Combine both sources
    const combinedData = [
      ...supabaseData,
      ...filteredStandardData.map(entry => ({
        id: entry.id,
        user_id: entry.userId,
        created_at: new Date(entry.date).toISOString(),
        bp_systolic: entry.systolicBP,
        bp_diastolic: entry.diastolicBP,
        hydration_level: entry.hydration,
        pain_level: entry.painLevel,
        stress_level: entry.stressLevel,
        fatigue_level: entry.fatigueLevel,
        estimated_gfr: entry.estimatedGFR,
        tags: entry.tags || [],
        medications_taken: entry.medications?.map(med => `${med.name} (${med.dosage})`) || [],
        source: "standard_db"
      }))
    ];
    
    // Sort by date, most recent first
    combinedData.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return res.status(200).json({
      success: true,
      data: combinedData,
      sources: {
        standardDb: standardDbData.length > 0,
        supabase: supabaseData.length > 0
      }
    });
  } catch (error) {
    console.error("Error fetching health logs:", error);
    return res.status(500).json({ 
      error: "Failed to fetch health logs",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;