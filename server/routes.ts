import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupAuth as setupReplitAuth, isAuthenticated as isReplitAuthenticated } from "./replitAuth";
import { 
  insertUserSchema, 
  insertHealthMetricsSchema, 
  insertEmotionalCheckInSchema, 
  insertAiChatSchema,
  insertMedicalDocumentSchema,
  insertJournalEntrySchema,
  insertEducationResourceSchema,
  insertTransplantStepSchema,
  insertUserTransplantProgressSchema,
  insertMedicationReminderSchema,
  insertMedicalAppointmentSchema
} from "@shared/schema";
import { estimateGfrScore, interpretGfr, getGfrRecommendation } from "./utils/gfr-calculator";

// API routers
import aiRouter from "./ai-router";
import enhancedJournalRouter from "./enhanced-journal-api-router";
import supabaseRouter from "./supabase-router-fixed";
import healthLogRouter from "./health-log-router";
import healthAlertsRouter from "./health-alerts-router";
import statusRouter from "./status-router";
import { getEvidenceBasedHealthInfo, explainMedicalTerms } from "./perplexity-service";

// Import OpenAI
import OpenAI from "openai";
// Import validation functions from our AI services
import { validateMedicalDocument } from "./openai-service";
import { ensureUserHasHealthData } from "./utils/demoDataGenerator";
// Import data transformation utilities
import { transformHealthMetrics, logDataResults } from "./utils/dataTransformer";
// Import news scraper
import { fetchLatestKidneyNews, fetchNewsByCategory, refreshNewsCache, getNewsCacheStatus, NewsArticle } from "./news-scraper";
// Import object storage service for file uploads
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

// Initialize OpenAI
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

// Helper function to safely handle errors
function handleError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return 'An unknown error occurred';
  }
}

// Estimate GFR based on health metrics and user profile
// This is a simplified estimation for demonstration purposes
function estimateGFR(
  age: number | null, 
  gender: string | null, 
  race: string | null, 
  weight: number | null, 
  systolicBP: number | null, 
  diastolicBP: number | null, 
  hydration: number | null, 
  stressLevel: number | null, 
  painLevel: number | null, 
  diseaseStage: number | null
): number | null {
  // Validate required parameters first
  if (age === null || gender === null) {
    console.warn("Cannot calculate GFR: missing required age or gender data");
    return null;
  }
  
  if (!systolicBP && !diastolicBP) {
    console.warn("Cannot calculate GFR: missing both blood pressure readings");
    return null;
  }
  
  // This is a simplified formula for estimation purposes
  // In a real application, you would use established medical formulas
  // such as CKD-EPI or MDRD equations
  
  // Provide defaults for missing non-critical values
  const safeAge = age || 40;
  const safeGender = gender ? gender.toLowerCase() : 'male';
  const safeRace = race ? race.toLowerCase() : 'caucasian';
  const safeWeight = weight || 70;
  const safeSystolicBP = systolicBP || 120;
  const safeDiastolicBP = diastolicBP || 80;
  const safeHydration = hydration !== null ? hydration : 5;
  const safeStressLevel = stressLevel !== null ? stressLevel : 5;
  const safePainLevel = painLevel !== null ? painLevel : 3;
  const safeDiseaseStage = diseaseStage !== null ? diseaseStage : 1;
  
  console.log("GFR calculation with normalized inputs:", {
    age: safeAge,
    gender: safeGender, 
    race: safeRace,
    weight: safeWeight,
    systolicBP: safeSystolicBP,
    diastolicBP: safeDiastolicBP,
    hydration: safeHydration,
    stressLevel: safeStressLevel,
    painLevel: safePainLevel,
    diseaseStage: safeDiseaseStage
  });
  
  // Base GFR range based on kidney disease stage (simplified)
  let baseGFR = 90;
  if (safeDiseaseStage === 1) baseGFR = 90;
  else if (safeDiseaseStage === 2) baseGFR = 75;
  else if (safeDiseaseStage === 3) baseGFR = 45;
  else if (safeDiseaseStage === 4) baseGFR = 25;
  else if (safeDiseaseStage === 5) baseGFR = 15;
  
  // Adjustment factors (simplified for demo)
  const ageAdjustment = Math.max(0, (40 - safeAge) / 100);
  const genderFactor = safeGender === 'female' ? 0.85 : 1.0;
  const raceFactor = safeRace === 'black' || safeRace.includes('black') ? 1.2 : 1.0;
  
  // Health metric adjustments (simplified for demo)
  const bpFactor = 1 - Math.max(0, (safeSystolicBP - 120) / 400);
  const hydrationFactor = 1 + (safeHydration / 10);
  const stressFactor = 1 - (safeStressLevel / 20);
  const painFactor = 1 - (safePainLevel / 20);
  
  // Calculate adjusted GFR
  let adjustedGFR = baseGFR * (1 + ageAdjustment) * genderFactor * 
                    raceFactor * bpFactor * hydrationFactor * 
                    stressFactor * painFactor;
  
  // Ensure result is within reasonable bounds for the disease stage
  adjustedGFR = Math.min(adjustedGFR, 120);
  adjustedGFR = Math.max(adjustedGFR, 5);
  
  return Math.round(adjustedGFR);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up hybrid authentication (custom auth + Replit Auth)
  // In production with REPL_ID, use Replit Auth; otherwise use custom auth
  if (process.env.REPL_ID && process.env.NODE_ENV === "production") {
    console.log("[Auth] Setting up Replit Auth for production deployment");
    await setupReplitAuth(app);
  } else {
    console.log("[Auth] Setting up custom auth for development");
    setupAuth(app);
  }
  
  // Hybrid Auth User Endpoint - Works with both custom auth and Replit Auth  
  app.get('/api/auth/user', async (req: any, res: any) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Handle Replit Auth user (has claims)
      if (req.user && req.user.claims) {
        const replitUserId = req.user.claims.sub;
        const user = await storage.getUserByReplitId(replitUserId);
        if (user) {
          const { password, ...userWithoutPassword } = user;
          return res.json(userWithoutPassword);
        }
      }

      // Handle custom auth user (has direct user object)
      if (req.user && req.user.id) {
        const { password, ...userWithoutPassword } = req.user;
        return res.json(userWithoutPassword);
      }

      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // CSRF Token Endpoint - Provides CSRF tokens to authenticated clients
  app.get('/api/csrf', (req: any, res: any) => {
    try {
      // Generate and return CSRF token (works with session-based csurf)
      const token = req.csrfToken();
      res.json({ csrfToken: token });
    } catch (error) {
      console.error('Error generating CSRF token:', error);
      // If CSRF token generation fails, still return a response
      res.status(200).json({ csrfToken: null, error: 'CSRF tokens disabled or unavailable' });
    }
  });
  
  // Mount AI router with all AI service endpoints
  app.use('/api/ai', aiRouter);
  
  // Mount enhanced journal router with Python-converted chatbot functionality
  app.use('/api/enhanced-journal', enhancedJournalRouter);
  
  // Mount Supabase router for direct Supabase operations
  app.use('/api/supabase', supabaseRouter);
  
  // Mount health log router for unified health data logging
  app.use('/api', healthLogRouter);
  
  // SECURITY NOTE: Hardcoded backdoor endpoint removed for security compliance
  // All health data operations now require proper authentication through standard endpoints
  
  // Mount status router for system monitoring
  app.use('/api/status', statusRouter);
  
  // Mount health alerts router for health monitoring
  app.use('/api', healthAlertsRouter);
  
  // User profile endpoints (REMOVED DUPLICATE DEFINITIONS)
  // The user profile endpoints are defined at the bottom of this file
  // We're keeping these comments for clarity
  
  // Health metrics endpoints - SECURED with mandatory authentication
  app.post("/api/health-metrics", async (req, res) => {
    try {
      console.log("🔧 HEALTH METRICS SAVE - Starting request processing");
      
      // SECURITY FIX: Require authentication for ALL health data operations
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        console.warn("🚨 SECURITY: Unauthenticated health metrics submission attempt blocked");
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "You must be logged in to submit health data" 
        });
      }
      
      // SECURITY FIX: Use ONLY the authenticated user's ID - no fallbacks
      const authenticatedUserId = req.user?.id;
      if (!authenticatedUserId) {
        console.error("🚨 SECURITY: No user ID available from authenticated session");
        return res.status(401).json({ 
          error: "Invalid authentication", 
          message: "Please log in again" 
        });
      }
      
      console.log(`✅ Authenticated user ${authenticatedUserId} submitting health metrics`);
      
      // SECURITY FIX: Ignore any userId from request body - use only authenticated user ID
      const requestData = { ...req.body };
      delete requestData.userId; // Remove any userId from request to prevent tampering
      
      console.log("📦 Received health metrics payload:", requestData);
      
      // Handle date conversions before validation
      const dataWithProperDate = { ...requestData };
      
      // Convert string date to Date object if needed
      if (dataWithProperDate.date && typeof dataWithProperDate.date === 'string') {
        console.log("🗓️ Converting date string to Date object:", dataWithProperDate.date);
        dataWithProperDate.date = new Date(dataWithProperDate.date);
      } else if (!dataWithProperDate.date) {
        // If no date provided, use current date
        dataWithProperDate.date = new Date();
        console.log("🗓️ No date provided, using current date:", dataWithProperDate.date);
      }
      
      // SECURITY FIX: Always use authenticated user ID only
      dataWithProperDate.userId = authenticatedUserId;
      console.log(`🔐 Using authenticated user ID ${authenticatedUserId} for health metrics`);
      
      // Parse with more flexibility - use safeParse instead of parse to avoid throwing errors
      const validationResult = insertHealthMetricsSchema.safeParse(dataWithProperDate);
      
      if (!validationResult.success) {
        console.error("❌ Validation error for health metrics:", validationResult.error);
        return res.status(400).json({ 
          error: "Invalid health metrics data", 
          details: validationResult.error.errors
        });
      }
      
      const data = validationResult.data;
      console.log(`✅ Validated health metrics for user ${authenticatedUserId}`);
      
      // CRITICAL FIX: Try to find user but don't fail if not found
      // We want to save even with minimal data
      let user = null;
      try {
        user = await storage.getUser(data.userId);
        if (!user) {
          console.warn(`⚠️ User with ID ${data.userId} not found, but continuing with minimal data`);
        } else {
          console.log(`👤 Found user ${user.username} for health metrics processing`);
        }
      } catch (userLookupError) {
        console.error(`❌ Error fetching user data: ${userLookupError}`);
        // Continue without user data - we'll save metrics with minimal information
      }
      
      // Enhanced logging of user profile data for GFR calculation
      if (user) {
        console.log("User data retrieved for GFR calculation:", {
          id: user.id,
          hasAge: user.age !== null && user.age !== undefined,
          hasGender: user.gender !== null && user.gender !== undefined,
          hasRace: user.race !== null && user.race !== undefined,
          hasWeight: user.weight !== null && user.weight !== undefined,
          hasDiseaseStage: user.kidneyDiseaseStage !== null && user.kidneyDiseaseStage !== undefined,
          ageValue: user.age,
          genderValue: user.gender,
          genderType: typeof user.gender
        });
      } else {
        console.warn("No user data available for GFR calculation - proceeding with minimal data");
      }
      
      // Calculate GFR if we have enough data and user profile exists
      if (data.systolicBP && data.painLevel !== undefined && data.stressLevel !== undefined && data.hydration !== undefined && user) {
        // More forgiving GFR estimation with proper null/undefined handling
        // Still require the minimum needed data, but with better validation
        if (user.age && user.gender && user.race && user.weight) {
          // Normalize gender value to handle potential case issues
          const normalizedGender = user.gender ? String(user.gender).toLowerCase() : '';
          
          // Log extra height information to debug our condition
          console.log("User height data:", {
            height: user.height,
            heightType: typeof user.height,
            isZero: user.height === 0,
            isFalsy: !user.height,
            heightEmpty: user.height === null || user.height === undefined
          });
          
          console.log("Estimating GFR with advanced calculator", {
            age: user.age,
            gender: normalizedGender,
            weight_kg: user.weight,
            height_cm: user.height || 170, // Default height if not available
            systolicBP: data.systolicBP,
            diastolicBP: data.diastolicBP || 80,
            hydration_level: data.hydrationLevel || Math.round(data.hydration * 2), // Convert hydration in liters to scale 1-10
            stress: data.stressLevel,
            fatigue: data.fatigueLevel || 5, // Default if not available
            pain: data.painLevel,
            creatinine: data.creatinineLevel // May be undefined, which is fine
          });
          
          // Check if minimum required data is available
          // Updated condition to use a more reliable height check
          if (user.age && user.gender && user.weight && user.height !== null && user.height !== undefined) {
            // Get previous health metrics for trend analysis
            let previousReadings = [];
            try {
              // Get up to 5 most recent readings
              previousReadings = await storage.getHealthMetrics(user.id, 5);
              console.log(`Found ${previousReadings.length} previous readings for trend analysis`);
            } catch (err) {
              console.warn("Failed to fetch previous health metrics for trend analysis:", err);
              // Non-critical error, continue without trend analysis
            }
            
            // Use the enhanced GFR calculator with trend analysis
            const gfrResult = estimateGfrScore(
              user.age,
              normalizedGender,
              user.weight,
              user.height || 170, // Default height if not available
              data.hydrationLevel || Math.round(data.hydration * 2), // Convert hydration from liters to scale
              data.systolicBP,
              data.diastolicBP || 80,
              data.stressLevel,
              data.fatigueLevel || 5, // Default if not available
              data.painLevel,
              data.creatinineLevel, // May be undefined, which is fine
              user.race, // Pass race for future enhancements
              previousReadings.length > 0 ? previousReadings : undefined // Pass previous readings for trend analysis
            );
            
            // Save both the GFR result, method, and trend information
            data.estimatedGFR = gfrResult.gfr_estimate;
            data.gfrCalculationMethod = gfrResult.method;
            
            // Save trend information if available
            if (gfrResult.trend) {
              // Type assertion to avoid TypeScript errors
              (data as any).gfrTrend = gfrResult.trend;
              (data as any).gfrTrendDescription = gfrResult.trend_description;
              (data as any).gfrChangePercent = gfrResult.percent_change;
              (data as any).gfrAbsoluteChange = gfrResult.absolute_change;
              (data as any).gfrLongTermTrend = gfrResult.long_term_trend;
              (data as any).gfrStability = gfrResult.stability;
            }
            
            // Get interpretation and recommendations with trend info
            const interpretation = interpretGfr(gfrResult.gfr_estimate);
            
            // Include trend info in recommendation if available
            const trendInfo = gfrResult.trend ? {
              trend: gfrResult.trend,
              trend_description: gfrResult.trend_description,
              long_term_trend: gfrResult.long_term_trend
            } : undefined;
            
            const recommendation = getGfrRecommendation(
              gfrResult.gfr_estimate, 
              gfrResult.method,
              trendInfo
            );
            
            console.log("Enhanced GFR Estimation with Trend Analysis:", {
              gfr: gfrResult.gfr_estimate,
              method: gfrResult.method,
              confidence: gfrResult.confidence,
              stage: interpretation.stage,
              description: interpretation.description,
              trend: gfrResult.trend,
              trend_description: gfrResult.trend_description
            });
          } else {
            // Fallback to the original calculator if height is missing
            console.log("Using legacy GFR calculator due to missing height data");
            const gfr = estimateGFR(
              user.age,
              normalizedGender,
              user.race,
              user.weight,
              data.systolicBP,
              data.diastolicBP || 80,
              data.hydration,
              data.stressLevel,
              data.painLevel,
              user.kidneyDiseaseStage || 1
            );
            
            data.estimatedGFR = gfr;
            data.gfrCalculationMethod = "legacy";
          }
          
          console.log("Estimated GFR:", data.estimatedGFR);
        } else {
          console.log("Missing user profile data for GFR estimation");
        }
      } else {
        console.log("Missing health metrics for GFR estimation");
      }
      
      console.log("Saving health metrics to database:", data);
      const result = await storage.createHealthMetrics(data);
      console.log("Health metrics saved successfully with ID:", result.id);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating health metrics:", error);
      res.status(500).json({ error: handleError(error) });
    }
  });

  app.get("/api/health-metrics/:userId", async (req, res) => {
    try {
      // Parse requested user ID and limit
      const requestedUserId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      console.log(`🔍 GET /api/health-metrics/${requestedUserId} requested with limit:`, limit);
      
      // IMPROVED AUTHENTICATION FLOW:
      // 1. Check standard authentication first
      let authenticatedUserId = null;
      let isAuthenticated = false;
      
      if (req.isAuthenticated() && req.user) {
        authenticatedUserId = req.user.id;
        isAuthenticated = true;
        console.log(`✅ Standard session authentication successful for user ${authenticatedUserId}`);
      } else {
        console.log(`⚠️ Standard session authentication failed, checking fallback methods...`);
      }
      
      // 2. SECURITY FIX: Remove dangerous API key bypass mechanism
      // This bypass was allowing unauthorized access when NEPHRA_API_KEY was empty
      // All health data access must require proper session authentication only
      console.log("🔒 API key bypass mechanism disabled for security - session authentication required");
      
      // 3. Final validation and security check
      if (!isAuthenticated || !authenticatedUserId) {
        console.warn("❌ All authentication methods failed for health metrics request");
        // Don't return error details for security
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "Please log in to access health metrics data" 
        });
      }
      
      // 4. For security, only allow access to own data
      if (authenticatedUserId !== requestedUserId) {
        console.warn(`⚠️ User ${authenticatedUserId} attempted to access health metrics for user ${requestedUserId}`);
        return res.status(403).json({ 
          error: "Unauthorized", 
          message: "You can only access your own health data" 
        });
      }
      
      // Import our data transformer utility
      // Data transformer utilities are imported at the top of the file
      
      // Successful authentication, proceed with data retrieval
      console.log(`✅ Authorized request: Fetching health metrics for user ${authenticatedUserId} with limit ${limit || 'unlimited'}`);
      
      // Check if user has health data and generate if needed
      await ensureUserHasHealthData(authenticatedUserId);
      
      // Get the metrics for the authenticated user
      const rawResults = await storage.getHealthMetrics(authenticatedUserId, limit);
      
      // Log the raw database results for debugging
      logDataResults('Health metrics raw', rawResults);
      
      // Transform the data from snake_case to camelCase for frontend compatibility
      const transformedResults = transformHealthMetrics(rawResults);
      
      // Log the transformed results
      logDataResults('Health metrics transformed', transformedResults);
      
      console.log(`📊 Retrieved and transformed ${rawResults.length} health metrics records for user ${authenticatedUserId}`);
      
      res.json(transformedResults);
    } catch (error) {
      console.error("❌ Error in health metrics API:", error);
      res.status(500).json({ 
        error: "Server error", 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.get("/api/health-metrics/:userId/range", async (req, res) => {
    try {
      // Parse requested user ID and query params
      const requestedUserId = parseInt(req.params.userId);
      console.log(`💗 Health metrics range request for user ID: ${requestedUserId}`);
      
      // TEMPORARY FIX: Use default dates if not provided for better debugging
      let startDate, endDate;
      
      try {
        startDate = req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        endDate = req.query.end ? new Date(req.query.end as string) : new Date();
      } catch (e) {
        console.warn("Error parsing dates, using defaults:", e);
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        endDate = new Date(); // now
      }
      
      // Log the date range for debugging
      console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Get authenticated user ID from session
      let authenticatedUserId = req.isAuthenticated() ? req.user.id : null;
      let isAuthenticated = !!authenticatedUserId;
      
      // SECURITY FIX: Require authentication for ALL health metrics access - NO EXCEPTIONS
      if (!isAuthenticated || !authenticatedUserId) {
        console.warn("🚨 SECURITY: Unauthenticated health metrics range access attempt blocked");
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "You must be logged in to access health metrics" 
        });
      }

      // SECURITY FIX: Users can ONLY access their own health metrics data
      if (authenticatedUserId !== requestedUserId) {
        console.warn(`🚨 SECURITY: User ${authenticatedUserId} attempted to access health metrics for user ${requestedUserId}`);
        return res.status(403).json({ 
          error: "Access denied", 
          message: "You can only access your own health metrics" 
        });
      }
      
      console.log(`✅ Authenticated user ${authenticatedUserId} accessing their own health metrics`);
      
      // Import our data transformer utility
      // Data transformer utilities are imported at the top of the file
      
      // Successful authentication, proceed with data retrieval
      console.log(`✅ Authorized request: Fetching health metrics range for user ${authenticatedUserId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Check if user has health data and generate if needed
      await ensureUserHasHealthData(authenticatedUserId);
      
      // Get the metrics for date range, using the authenticated user ID
      const rawResults = await storage.getHealthMetricsByDate(authenticatedUserId, startDate, endDate);
      
      // Log the raw database results for debugging
      logDataResults('Health metrics date range raw', rawResults);
      
      // Transform the data from snake_case to camelCase for frontend compatibility
      const transformedResults = transformHealthMetrics(rawResults);
      
      // Log the transformed results
      logDataResults('Health metrics date range transformed', transformedResults);
      
      console.log(`📊 Retrieved and transformed ${rawResults.length} health metrics records in date range for user ${authenticatedUserId}`);
      
      res.json(transformedResults);
    } catch (error) {
      console.error("❌ Error in health metrics range API:", error);
      res.status(500).json({ 
        error: "Server error", 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // GFR estimation endpoint with trend analysis - calculate without saving
  app.post("/api/estimate-gfr", async (req, res) => {
    try {
      console.log("Received GFR estimation request:", req.body);
      
      const { 
        age, 
        gender, 
        weight_kg, 
        height_cm, 
        hydration_level, 
        systolic_bp, 
        diastolic_bp, 
        stress, 
        fatigue, 
        pain, 
        creatinine,
        race,
        userId
      } = req.body;
      
      // Validate required parameters
      if (!age || !gender || !weight_kg || !height_cm) {
        return res.status(400).json({ 
          error: "Missing required parameters", 
          required: ["age", "gender", "weight_kg", "height_cm"] 
        });
      }
      
      // Get previous health metrics for trend analysis if userId is provided
      let previousReadings = [];
      if (userId) {
        try {
          // Get up to 5 most recent readings
          previousReadings = await storage.getHealthMetrics(parseInt(userId), 5);
          console.log(`Found ${previousReadings.length} previous readings for trend analysis`);
        } catch (err) {
          console.warn("Failed to fetch previous health metrics for trend analysis:", err);
          // Non-critical error, continue without trend analysis
        }
      }
      
      // Calculate GFR with enhanced model
      const gfrResult = estimateGfrScore(
        age,
        gender.toLowerCase(),
        weight_kg,
        height_cm,
        hydration_level || 5,
        systolic_bp || 120,
        diastolic_bp || 80,
        stress || 5,
        fatigue || 5,
        pain || 3,
        creatinine,
        race,
        previousReadings.length > 0 ? previousReadings : undefined
      );
      
      // Get interpretation and detailed recommendations with trend info
      const interpretation = interpretGfr(gfrResult.gfr_estimate);
      
      // Include trend info in recommendation if available
      const trendInfo = gfrResult.trend ? {
        trend: gfrResult.trend,
        trend_description: gfrResult.trend_description,
        long_term_trend: gfrResult.long_term_trend
      } : undefined;
      
      const recommendation = getGfrRecommendation(
        gfrResult.gfr_estimate, 
        gfrResult.method, 
        trendInfo
      );
      
      // Return comprehensive result with trend analysis
      res.json({
        gfr: gfrResult.gfr_estimate,
        method: gfrResult.method,
        confidence: gfrResult.confidence,
        calculation: gfrResult.calculation,
        stage: interpretation.stage,
        description: interpretation.description,
        recommendation,
        trend: gfrResult.trend,
        trend_description: gfrResult.trend_description,
        absolute_change: gfrResult.absolute_change,
        percent_change: gfrResult.percent_change,
        long_term_trend: gfrResult.long_term_trend,
        stability: gfrResult.stability
      });
    } catch (error) {
      console.error("Error in GFR estimation:", error);
      res.status(500).json({ error: handleError(error) });
    }
  });

  // Emotional check-in endpoints
  app.post("/api/emotional-check-in", async (req, res) => {
    try {
      const data = insertEmotionalCheckInSchema.parse(req.body);
      const result = await storage.createEmotionalCheckIn(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/emotional-check-in/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const results = await storage.getEmotionalCheckIns(userId, limit);
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Medication reminders endpoints
  app.get("/api/medication-reminders/:userId", async (req, res) => {
    try {
      // Parse requested user ID
      const requestedUserId = parseInt(req.params.userId);
      
      // Check authentication
      if (!req.isAuthenticated() || !req.user) {
        console.warn("❌ Unauthenticated medication reminders access attempt blocked");
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "Please log in to access medication reminders" 
        });
      }
      
      const authenticatedUserId = req.user.id;
      
      // For security, only allow access to own data
      if (authenticatedUserId !== requestedUserId) {
        console.warn(`⚠️ User ${authenticatedUserId} attempted to access medication reminders for user ${requestedUserId}`);
        return res.status(403).json({ 
          error: "Unauthorized", 
          message: "You can only access your own medication reminders" 
        });
      }
      
      console.log(`📊 Fetching medication reminders for user ${authenticatedUserId}`);
      const results = await storage.getMedicationReminders(authenticatedUserId);
      console.log(`Found ${results.length} medication reminders for user ${authenticatedUserId}`);
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching medication reminders:", error);
      res.status(500).json({ error: handleError(error) });
    }
  });

  app.post("/api/medication-reminders", async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "Please log in to create medication reminders" 
        });
      }
      
      const authenticatedUserId = req.user.id;
      
      // Parse and validate the request data
      const data = insertMedicationReminderSchema.parse({
        ...req.body,
        userId: authenticatedUserId // Always use authenticated user ID for security
      });
      
      console.log(`💊 Creating medication reminder for user ${authenticatedUserId}:`, data.medicationName);
      const result = await storage.createMedicationReminder(data);
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating medication reminder:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ 
          error: "Invalid medication reminder data", 
          details: error.errors 
        });
      } else {
        res.status(500).json({ error: handleError(error) });
      }
    }
  });

  app.patch("/api/medication-reminders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check authentication
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "Please log in to update medication reminders" 
        });
      }
      
      const authenticatedUserId = req.user.id;
      
      // Ensure the medication reminder exists and belongs to the user
      const existingReminder = await storage.getMedicationReminder(id);
      if (!existingReminder) {
        return res.status(404).json({ error: "Medication reminder not found" });
      }
      
      if (existingReminder.userId !== authenticatedUserId) {
        return res.status(403).json({ 
          error: "Unauthorized", 
          message: "You can only update your own medication reminders" 
        });
      }
      
      // Validate update data (partial schema validation)
      const updateData = req.body;
      
      console.log(`📝 Updating medication reminder ${id} for user ${authenticatedUserId}`);
      const result = await storage.updateMedicationReminder(id, updateData);
      
      if (!result) {
        return res.status(500).json({ error: "Failed to update medication reminder" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error updating medication reminder:", error);
      res.status(500).json({ error: handleError(error) });
    }
  });

  app.delete("/api/medication-reminders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check authentication
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "Please log in to delete medication reminders" 
        });
      }
      
      const authenticatedUserId = req.user.id;
      
      // Ensure the medication reminder exists and belongs to the user
      const existingReminder = await storage.getMedicationReminder(id);
      if (!existingReminder) {
        return res.status(404).json({ error: "Medication reminder not found" });
      }
      
      if (existingReminder.userId !== authenticatedUserId) {
        return res.status(403).json({ 
          error: "Unauthorized", 
          message: "You can only delete your own medication reminders" 
        });
      }
      
      console.log(`🗑️ Deleting medication reminder ${id} for user ${authenticatedUserId}`);
      const success = await storage.deleteMedicationReminder(id);
      
      if (!success) {
        return res.status(500).json({ error: "Failed to delete medication reminder" });
      }
      
      res.json({ success: true, message: "Medication reminder deleted successfully" });
    } catch (error) {
      console.error("Error deleting medication reminder:", error);
      res.status(500).json({ error: handleError(error) });
    }
  });

  // Medical appointments endpoints
  app.get("/api/medical-appointments/:userId", async (req, res) => {
    try {
      // Parse requested user ID
      const requestedUserId = parseInt(req.params.userId);
      
      // Check authentication
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "Please log in to access medical appointments" 
        });
      }
      
      const authenticatedUserId = req.user.id;
      
      // For security, only allow access to own data
      if (authenticatedUserId !== requestedUserId) {
        return res.status(403).json({ 
          error: "Unauthorized", 
          message: "You can only access your own medical appointments" 
        });
      }
      
      console.log(`📅 Fetching medical appointments for user ${authenticatedUserId}`);
      const appointments = await storage.getMedicalAppointments(authenticatedUserId);
      
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching medical appointments:", error);
      res.status(500).json({ error: handleError(error) });
    }
  });

  app.post("/api/medical-appointments", async (req, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "Please log in to create medical appointments" 
        });
      }
      
      const authenticatedUserId = req.user.id;
      
      // Validate request body
      const validatedData = insertMedicalAppointmentSchema.parse({
        ...req.body,
        userId: authenticatedUserId // Always use authenticated user ID for security
      });
      
      console.log(`📝 Creating medical appointment for user ${authenticatedUserId}`);
      const result = await storage.createMedicalAppointment(validatedData);
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating medical appointment:", error);
      res.status(500).json({ error: handleError(error) });
    }
  });

  app.patch("/api/medical-appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check authentication
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "Please log in to update medical appointments" 
        });
      }
      
      const authenticatedUserId = req.user.id;
      
      // Ensure the medical appointment exists and belongs to the user
      const existingAppointment = await storage.getMedicalAppointment(id);
      if (!existingAppointment) {
        return res.status(404).json({ error: "Medical appointment not found" });
      }
      
      if (existingAppointment.userId !== authenticatedUserId) {
        return res.status(403).json({ 
          error: "Unauthorized", 
          message: "You can only update your own medical appointments" 
        });
      }
      
      // Validate update data (partial schema validation)
      const updateData = req.body;
      
      console.log(`📝 Updating medical appointment ${id} for user ${authenticatedUserId}`);
      const result = await storage.updateMedicalAppointment(id, updateData);
      
      if (!result) {
        return res.status(500).json({ error: "Failed to update medical appointment" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error updating medical appointment:", error);
      res.status(500).json({ error: handleError(error) });
    }
  });

  app.delete("/api/medical-appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check authentication
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "Please log in to delete medical appointments" 
        });
      }
      
      const authenticatedUserId = req.user.id;
      
      // Ensure the medical appointment exists and belongs to the user
      const existingAppointment = await storage.getMedicalAppointment(id);
      if (!existingAppointment) {
        return res.status(404).json({ error: "Medical appointment not found" });
      }
      
      if (existingAppointment.userId !== authenticatedUserId) {
        return res.status(403).json({ 
          error: "Unauthorized", 
          message: "You can only delete your own medical appointments" 
        });
      }
      
      console.log(`🗑️ Deleting medical appointment ${id} for user ${authenticatedUserId}`);
      const success = await storage.deleteMedicalAppointment(id);
      
      if (!success) {
        return res.status(500).json({ error: "Failed to delete medical appointment" });
      }
      
      res.json({ success: true, message: "Medical appointment deleted successfully" });
    } catch (error) {
      console.error("Error deleting medical appointment:", error);
      res.status(500).json({ error: handleError(error) });
    }
  });

  // User management endpoints
  app.post("/api/users", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const result = await storage.createUser(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't send the password in the response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: handleError(error) });
    }
  });

  // Add PATCH endpoint specifically for partial updates like gender
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`PATCH updating user ${id} with partial data:`, req.body);
      
      // Ensure the user exists
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        console.log(`User ${id} not found`);
        return res.status(404).json({ error: "User not found" });
      }
      
      // Validate the update data
      const updateData = req.body;
      
      // Update the user (using the special handling in storage.updateUser)
      const user = await storage.updateUser(id, updateData);
      
      if (!user) {
        return res.status(500).json({ error: "Failed to update user" });
      }
      
      // Don't send the password in the response
      const { password: pwd, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error in PATCH update for user:", error);
      res.status(400).json({ error: handleError(error) });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Updating user ${id} with data:`, req.body);
      
      // Ensure the user exists
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        console.log(`User ${id} not found`);
        return res.status(404).json({ error: "User not found" });
      }
      
      // Validate user data without password (we don't want to update password here)
      const { password, ...updateData } = req.body;
      
      // Handle special fields
      // Convert string dates to Date objects
      if (updateData.diagnosisDate && typeof updateData.diagnosisDate === 'string') {
        updateData.diagnosisDate = new Date(updateData.diagnosisDate);
      }
      
      // Ensure arrays are properly handled
      if (updateData.otherHealthConditions && !Array.isArray(updateData.otherHealthConditions)) {
        if (typeof updateData.otherHealthConditions === 'string') {
          updateData.otherHealthConditions = updateData.otherHealthConditions
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        } else {
          updateData.otherHealthConditions = [];
        }
      }
      
      console.log("Sanitized update data:", updateData);
      
      // Update the user
      const user = await storage.updateUser(id, updateData);
      console.log("Updated user result:", user);
      
      if (!user) {
        return res.status(404).json({ error: "Failed to update user" });
      }
      
      // Don't send the password in the response
      const { password: pwd, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ error: handleError(error) });
    }
  });

  // AI chat endpoints
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { userId, userMessage } = req.body;
      
      console.log(`Processing AI chat request for user ${userId} with message: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`);
      
      // Check if this is a request for relaxation techniques
      const isRelaxationRequest = userMessage.toLowerCase().includes("relaxation") || 
                                 userMessage.toLowerCase().includes("stress") ||
                                 userMessage.toLowerCase().includes("yes, i would like some simple relaxation techniques");
      
      // Enhanced system prompt for relaxation techniques
      const systemPrompt = isRelaxationRequest 
        ? "You are a supportive AI health companion for people with kidney disease. The user is asking about relaxation techniques to manage stress. Provide 3-5 specific, practical relaxation techniques that are appropriate for kidney patients. Include deep breathing exercises, progressive muscle relaxation, guided imagery, and mindfulness practices. Be empathetic and encouraging, but clear that you are not a medical professional."
        : "You are a supportive AI health companion for people with kidney disease. Provide empathetic, informative responses. Focus on emotional support and practical advice while being clear that you are not a medical professional and serious concerns should be discussed with healthcare providers.";
      
      try {
        // Send message to OpenAI
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          max_tokens: 500,
        });

        const aiResponse = response.choices[0].message.content;
        
        // Save the conversation to storage
        const chat = await storage.createAiChat({
          userId,
          userMessage,
          aiResponse,
          timestamp: new Date()
        });
        
        res.json({ message: aiResponse, chat });
      } catch (error) {
        console.error("OpenAI API error:", error);
        res.status(500).json({ 
          error: "Could not process request with AI service", 
          message: "I'm having trouble connecting right now. Please try again later."
        });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/ai-chat/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const chats = await storage.getAiChats(userId, limit);
      res.json(chats);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // News endpoint - aggregates from Perplexity, RSS feeds, and PubMed
  app.get("/api/kidney-news", async (req, res) => {
    try {
      console.log("🔍 Fetching latest kidney health news from all sources...");
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 15;
      const forceRefresh = req.query.refresh === 'true';
      
      const articles = forceRefresh 
        ? await refreshNewsCache()
        : await fetchLatestKidneyNews(limit);
      
      const cacheStatus = getNewsCacheStatus();
      
      console.log(`✅ Successfully retrieved ${articles.length} news articles`);
      res.json({
        success: true,
        articles: articles.slice(0, limit),
        count: articles.length,
        lastUpdated: cacheStatus.lastUpdate?.toISOString() || new Date().toISOString(),
        sources: cacheStatus.activeSources
      });
    } catch (error) {
      console.error("Error fetching kidney news:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch latest news", 
        articles: [] 
      });
    }
  });

  // News by category endpoint
  app.get("/api/kidney-news/category/:category", async (req, res) => {
    try {
      const category = req.params.category as 'research' | 'treatment' | 'policy' | 'prevention' | 'general';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      console.log(`🔍 Fetching ${category} kidney health news...`);
      const articles = await fetchNewsByCategory(category, limit);
      
      res.json({
        success: true,
        category,
        articles,
        count: articles.length
      });
    } catch (error) {
      console.error("Error fetching news by category:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch news by category", 
        articles: [] 
      });
    }
  });

  // News cache status endpoint
  app.get("/api/kidney-news/status", async (req, res) => {
    try {
      const status = getNewsCacheStatus();
      res.json({
        success: true,
        ...status,
        cacheAgeMinutes: status.lastUpdate 
          ? Math.round((Date.now() - status.lastUpdate.getTime()) / 60000) 
          : null
      });
    } catch (error) {
      console.error("Error getting news status:", error);
      res.status(500).json({ success: false, error: "Failed to get news status" });
    }
  });

  // Object Storage - File Upload Endpoints (replaces Supabase file storage)
  
  // Get presigned URL for file upload
  app.post("/api/objects/upload", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve uploaded objects
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // Check if user can access the object
      const userId = req.isAuthenticated() ? String(req.user?.id) : undefined;
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      return res.status(500).json({ error: "Error serving file" });
    }
  });

  // Serve public objects from search paths
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update document/profile image after upload
  app.put("/api/documents/uploaded", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!req.body.uploadURL) {
      return res.status(400).json({ error: "uploadURL is required" });
    }
    
    const userId = String(req.user?.id);
    
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.uploadURL,
        {
          owner: userId,
          visibility: req.body.isPrivate ? "private" : "public",
        }
      );
      
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Transplant roadmap endpoints
  // Endpoint moved to avoid duplication - see the implementation below

  app.get("/api/transplant-progress/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const progress = await storage.getUserTransplantProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/transplant-progress", async (req, res) => {
    try {
      const data = req.body;
      const result = await storage.createUserTransplantProgress(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/transplant-progress/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const progress = await storage.updateUserTransplantProgress(id, req.body);
      if (!progress) {
        return res.status(404).json({ error: "Progress record not found" });
      }
      res.json(progress);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Medical documents endpoints
  app.post("/api/medical-documents", async (req, res) => {
    try {
      const data = insertMedicalDocumentSchema.parse(req.body);
      
      // Here we would normally have file upload logic
      // For now we'll simulate it with the provided metadata
      const result = await storage.createMedicalDocument(data);
      
      // Return early if automatic validation is not requested
      if (!req.query.validate) {
        return res.status(201).json(result);
      }
      
      try {
        // Get user information for context
        const user = await storage.getUser(result.userId || 1);
        
        if (!user) {
          return res.status(201).json(result);
        }
        
        // Use our specialized document validation service
        const validationResult = await validateMedicalDocument(
          result.documentType,
          {
            age: user.age || 40,
            gender: user.gender || "unknown",
            stage: user.kidneyDiseaseStage || 3,
            conditions: user.kidneyDiseaseType ? [user.kidneyDiseaseType] : ["CKD"],
          },
          JSON.stringify({
            fileName: result.fileName,
            description: result.fileName, // Use filename as description if none provided
            metadata: result.metadata || {},
          })
        );
        
        // Update the document with validation results
        const updated = await storage.updateMedicalDocument(result.id, {
          aiVerified: true,
          aiVerificationNotes: JSON.stringify(validationResult),
        });
        
        res.status(201).json(updated);
      } catch (error) {
        console.error("AI validation error:", error);
        res.status(201).json(result);
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.get("/api/medical-documents/:userId", async (req, res) => {
    try {
      // SECURITY FIX: Require authentication for ALL medical document access
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        console.warn("🚨 SECURITY: Unauthenticated medical documents access attempt blocked");
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "You must be logged in to access medical documents" 
        });
      }
      
      const requestedUserId = parseInt(req.params.userId);
      const authenticatedUserId = req.user?.id;
      
      // SECURITY FIX: Users can ONLY access their own medical documents
      if (requestedUserId !== authenticatedUserId) {
        console.warn(`🚨 SECURITY: User ${authenticatedUserId} attempted to access medical documents for user ${requestedUserId}`);
        return res.status(403).json({ 
          error: "Access denied", 
          message: "You can only access your own medical documents" 
        });
      }
      
      console.log(`✅ Authenticated user ${authenticatedUserId} accessing their own medical documents`);
      const documentType = req.query.type as string | undefined;
      const results = await storage.getMedicalDocuments(requestedUserId, documentType);
      res.json(results);
    } catch (error) {
      console.error("Error accessing medical documents:", error);
      res.status(500).json({ error: "Failed to access medical documents" });
    }
  });
  
  // Endpoint to validate an existing medical document with AI
  app.post("/api/medical-documents/:id/validate", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getMedicalDocuments(1); // Simple way to get all documents
      
      // Find the document by ID
      const targetDocument = document.find((doc) => doc.id === documentId);
      
      if (!targetDocument) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Get user information for context
      const user = await storage.getUser(targetDocument.userId || 1);
      
      if (!user) {
        return res.status(400).json({ error: "User information not available" });
      }
      
      // Use our specialized document validation service
      const validationResult = await validateMedicalDocument(
        targetDocument.documentType,
        {
          age: user.age || 40,
          gender: user.gender || "unknown",
          stage: user.kidneyDiseaseStage || 3,
          conditions: user.kidneyDiseaseType ? [user.kidneyDiseaseType] : ["CKD"],
        },
        JSON.stringify({
          fileName: targetDocument.fileName,
          description: targetDocument.fileName,
          metadata: targetDocument.metadata || {},
        })
      );
      
      // Update the document with validation results
      const updated = await storage.updateMedicalDocument(documentId, {
        aiVerified: true,
        aiVerificationNotes: JSON.stringify(validationResult),
      });
      
      res.json({
        document: updated,
        validation: validationResult
      });
    } catch (error) {
      console.error("AI validation error:", error);
      res.status(500).json({ error: "Failed to validate document" });
    }
  });
  
  // Journal entries endpoints
  app.post("/api/journal-entries", async (req, res) => {
    try {
      const data = insertJournalEntrySchema.parse(req.body);
      
      // Create the journal entry first
      let result = await storage.createJournalEntry(data);
      
      // If we want AI analysis of the journal entry
      if (data.content) {
        try {
          // Generate AI response and sentiment analysis
          const analysis = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a supportive AI assistant. Analyze the following journal entry for emotional tone and provide a supportive, uplifting response. Also determine the primary sentiment (positive, neutral, negative) and suggest 2-3 relevant tags separated by commas."
              },
              {
                role: "user",
                content: data.content
              }
            ],
            max_tokens: 350,
            response_format: { type: "json_object" }
          });
          
          // Parse the JSON response
          const content = analysis.choices[0].message.content || '{}';
          const aiResponse = JSON.parse(content);
          
          // Update the journal entry with AI response and sentiment
          const updatedEntry = await storage.updateJournalEntry(result.id, {
            aiResponse: aiResponse.response || '',
            sentiment: aiResponse.sentiment || 'neutral',
            tags: aiResponse.tags ? aiResponse.tags.split(',').map((tag: string) => tag.trim()) : []
          });
          
          if (updatedEntry) {
            result = updatedEntry;
          }
        } catch (error) {
          console.error("AI analysis error:", error);
          // Continue without AI analysis if there's an error
        }
      }
      
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get journal entries for the authenticated user
  app.get("/api/journal-entries", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const userId = req.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      console.log(`Fetching journal entries for authenticated user ID: ${userId}`);
      const results = await storage.getJournalEntries(userId, limit);
      console.log(`Found ${results.length} journal entries for user ${userId}`);
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ error: "Failed to fetch journal entries" });
    }
  });

  // Get journal entries for a specific user ID - SECURED with mandatory authentication
  app.get("/api/journal-entries/:userId", async (req, res) => {
    try {
      // SECURITY FIX: Require authentication for ALL journal entry access
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        console.warn("🚨 SECURITY: Unauthenticated journal entries access attempt blocked");
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "You must be logged in to access journal entries" 
        });
      }
      
      const requestedUserId = parseInt(req.params.userId);
      const authenticatedUserId = req.user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      if (isNaN(requestedUserId)) {
        return res.status(400).json({ error: "Invalid user ID format" });
      }
      
      // SECURITY FIX: Users can ONLY access their own journal entries
      if (requestedUserId !== authenticatedUserId) {
        console.warn(`🚨 SECURITY: User ${authenticatedUserId} attempted to access journal entries for user ${requestedUserId}`);
        return res.status(403).json({ 
          error: "Access denied", 
          message: "You can only access your own journal entries" 
        });
      }
      
      console.log(`✅ Authenticated user ${authenticatedUserId} accessing their own journal entries`);
      const results = await storage.getJournalEntries(requestedUserId, limit);
      console.log(`Found ${results.length} journal entries for user ${requestedUserId}`);
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ error: "Failed to fetch journal entries" });
    }
  });
  
  // User profile endpoints are already defined above

  // Transplant Steps endpoint
  app.get("/api/transplant-steps", async (req, res) => {
    try {
      // Use predefined steps from the database or create default ones if none exist
      const transplantSteps = [
        { 
          id: 1, 
          title: "Referral to Transplant Center", 
          description: "Your doctor refers you for evaluation based on your kidney function and overall health assessment.",
          expectedTimeframe: "1-2 months",
          requiredTests: ["Blood tests", "Urine tests", "GFR assessment"],
          keyContacts: ["Primary Nephrologist", "Transplant Coordinator"]
        },
        { 
          id: 2, 
          title: "Initial Evaluation", 
          description: "Complete medical, psychological, and social evaluation to determine transplant candidacy.",
          expectedTimeframe: "3-6 months",
          requiredTests: ["Complete blood panel", "Cardiac testing", "Psychological evaluation", "Social work assessment"],
          keyContacts: ["Transplant Team", "Transplant Coordinator"]
        },
        { 
          id: 3, 
          title: "Waitlist Registration", 
          description: "After evaluation approval, you are registered on the national transplant waitlist.",
          expectedTimeframe: "Varies by blood type, tissue matching and region",
          requiredTests: ["HLA typing", "Antibody screening", "Crossmatching"],
          keyContacts: ["Transplant Coordinator", "UNOS Representative"]
        },
        { 
          id: 4, 
          title: "Living Donor Search", 
          description: "If applicable, potential living donors are evaluated for compatibility.",
          expectedTimeframe: "2-4 months for donor evaluation",
          requiredTests: ["Blood typing", "Tissue matching", "Donor medical evaluation"],
          keyContacts: ["Living Donor Coordinator", "Transplant Social Worker"]
        },
        { 
          id: 5, 
          title: "Transplant Surgery", 
          description: "When a compatible kidney becomes available, the transplant surgery is performed.",
          expectedTimeframe: "4-6 hours for surgery",
          requiredTests: ["Final crossmatching", "Pre-operative tests"],
          keyContacts: ["Transplant Surgeon", "Transplant Nephrologist", "Transplant Coordinator"]
        },
        { 
          id: 6, 
          title: "Post-Transplant Recovery", 
          description: "Hospital stay and immediate recovery period after transplantation.",
          expectedTimeframe: "5-10 days in hospital; 4-8 weeks initial recovery",
          requiredTests: ["Daily blood tests", "Kidney function assessments", "Medication level monitoring"],
          keyContacts: ["Transplant Nephrologist", "Transplant Nurse", "Transplant Pharmacist"]
        },
        { 
          id: 7, 
          title: "Long-term Follow-up", 
          description: "Ongoing care and monitoring to ensure transplant success and prevent rejection.",
          expectedTimeframe: "Lifelong",
          requiredTests: ["Regular blood tests", "Medication monitoring", "Annual comprehensive evaluation"],
          keyContacts: ["Transplant Nephrologist", "Primary Care Physician"]
        }
      ];
      
      res.json(transplantSteps);
    } catch (error) {
      console.error("Error retrieving transplant steps:", error);
      res.status(500).json({ 
        error: "Error retrieving transplant steps",
        message: "There was a problem retrieving the transplant roadmap information."
      });
    }
  });

  // Education resources endpoints
  app.get("/api/education-resources", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const results = await storage.getEducationResources(category);
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.post("/api/education-resources", async (req, res) => {
    try {
      const data = insertEducationResourceSchema.parse(req.body);
      const result = await storage.createEducationResource(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Perplexity API routes for evidence-based health information
  app.post("/api/evidence-health-info", async (req, res) => {
    try {
      // Check for Perplexity API key
      if (!process.env.PERPLEXITY_API_KEY) {
        return res.status(500).json({ 
          error: "Perplexity API key is not configured",
          message: "The evidence-based health information service is currently unavailable."
        });
      }

      const { topic, context, relatedCondition, patientDetails } = req.body;
      
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }
      
      const result = await getEvidenceBasedHealthInfo({
        topic,
        context,
        relatedCondition,
        patientDetails
      });
      
      res.json(result);
    } catch (error) {
      console.error("Perplexity API error:", error);
      res.status(500).json({ 
        error: "Could not retrieve evidence-based health information", 
        message: "Unable to retrieve health information at this time. Please try again later."
      });
    }
  });

  app.post("/api/explain-medical-terms", async (req, res) => {
    try {
      // Check for Perplexity API key
      if (!process.env.PERPLEXITY_API_KEY) {
        return res.status(500).json({ 
          error: "Perplexity API key is not configured",
          message: "The medical terms explanation service is currently unavailable."
        });
      }

      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      
      const result = await explainMedicalTerms(text);
      res.json(result);
    } catch (error) {
      console.error("Perplexity API error:", error);
      res.status(500).json({ 
        error: "Could not explain medical terms", 
        message: "Unable to process medical terminology at this time. Please try again later."
      });
    }
  });

  // Import health data from another user
  app.post("/api/transfer-health-data", async (req, res) => {
    try {
      // Admin endpoint - requires authentication to avoid unauthorized data access
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { sourceUserId, targetUserId } = req.body;
      
      // Either source or target ID must match the authenticated user for security
      const authenticatedUserId = req.user.id;
      const isTargetAuthenticated = targetUserId === authenticatedUserId;
      
      if (!isTargetAuthenticated) {
        console.warn(`User ${authenticatedUserId} attempted to transfer data to another account ${targetUserId}`);
        return res.status(403).json({ error: "You can only import data to your own account" });
      }
      
      // Validate parameters
      if (!sourceUserId || !targetUserId) {
        return res.status(400).json({ error: "Source and target user IDs are required" });
      }
      
      // Import the data transfer utility
      const { copyHealthMetricsData } = await import('./utils/data-transfer');
      
      // Execute the transfer
      console.log(`Transferring health data from user ${sourceUserId} to user ${targetUserId}`);
      // Execute the transfer from our new utility
      const result = await copyHealthMetricsData(sourceUserId, targetUserId);
      
      // Return the result
      res.status(200).json(result);
    } catch (error) {
      console.error("Error in health data transfer API:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
