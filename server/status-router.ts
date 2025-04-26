/**
 * Status API Router
 * 
 * Provides system-wide status information about all components:
 * - Database connections
 * - AI providers
 * - Supabase connection
 * - Other system services
 */

import { Router, Request, Response } from "express";
import { getProvidersStatus } from "./ai-providers-helper";
import { checkSupabaseConnection } from "./supabase-service";
import { pool } from "./db";

const router = Router();

// Get system-wide status
router.get("/", async (req: Request, res: Response) => {
  try {
    // Check database connection
    let databaseStatus = { connected: false, error: null as string | null };
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      databaseStatus.connected = true;
    } catch (dbError) {
      databaseStatus.error = (dbError instanceof Error) ? dbError.message : String(dbError);
    }
    
    // Check Supabase connection
    let supabaseStatus = { connected: false, error: null as string | null };
    try {
      const isConnected = await checkSupabaseConnection();
      supabaseStatus.connected = isConnected;
      if (!isConnected) {
        supabaseStatus.error = "Unable to connect to Supabase";
      }
    } catch (supabaseError) {
      supabaseStatus.error = (supabaseError instanceof Error) ? supabaseError.message : String(supabaseError);
    }
    
    // Get AI providers status
    const aiProvidersStatus = getProvidersStatus();
    
    // System resources (basic)
    const systemStatus = {
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    // Assemble the full status report
    const fullStatus = {
      status: "online",
      timestamp: new Date().toISOString(),
      components: {
        database: databaseStatus,
        supabase: supabaseStatus,
        aiProviders: aiProvidersStatus,
      },
      system: systemStatus
    };
    
    res.json(fullStatus);
  } catch (error) {
    console.error("Error generating status report:", error);
    res.status(500).json({ 
      status: "error", 
      error: (error instanceof Error) ? error.message : String(error)
    });
  }
});

// Get AI providers status
router.get("/ai", (req: Request, res: Response) => {
  try {
    const aiStatus = getProvidersStatus();
    res.json({
      status: "online",
      providers: aiStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error generating AI status report:", error);
    res.status(500).json({ 
      status: "error", 
      error: (error instanceof Error) ? error.message : String(error)
    });
  }
});

// Get database status
router.get("/database", async (req: Request, res: Response) => {
  try {
    let connected = false;
    let error = null;
    
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT current_database() as db_name, current_user as user');
      client.release();
      connected = true;
      
      res.json({
        status: "online",
        connected,
        info: result.rows[0],
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      error = (dbError instanceof Error) ? dbError.message : String(dbError);
      res.status(503).json({
        status: "error",
        connected,
        error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Error checking database status:", error);
    res.status(500).json({ 
      status: "error", 
      error: (error instanceof Error) ? error.message : String(error)
    });
  }
});

// Get Supabase connection status
router.get("/supabase", async (req: Request, res: Response) => {
  try {
    let connected = false;
    let error = null;
    
    try {
      connected = await checkSupabaseConnection();
      if (!connected) {
        error = "Unable to connect to Supabase";
      }
    } catch (supabaseError) {
      error = (supabaseError instanceof Error) ? supabaseError.message : String(supabaseError);
    }
    
    if (connected) {
      res.json({
        status: "online",
        connected,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: "error",
        connected,
        error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Error checking Supabase status:", error);
    res.status(500).json({ 
      status: "error", 
      error: (error instanceof Error) ? error.message : String(error)
    });
  }
});

// Health check (simple) - for load balancers/monitoring
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy" });
});

export default router;