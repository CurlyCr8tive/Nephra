import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertUserSchema, 
  insertHealthMetricsSchema, 
  insertEmotionalCheckInSchema, 
  insertAiChatSchema,
  insertMedicalDocumentSchema,
  insertJournalEntrySchema,
  insertEducationResourceSchema,
  insertTransplantStepSchema,
  insertUserTransplantProgressSchema
} from "@shared/schema";
import { estimateGfrScore, interpretGfr, getGfrRecommendation } from "./utils/gfr-calculator";

// API routers
import aiRouter from "./ai-router";
import enhancedJournalRouter from "./enhanced-journal-api-router";
import supabaseRouter from "./supabase-router-fixed";
import healthLogRouter from "./health-log-router";
import statusRouter from "./status-router";
import { getEvidenceBasedHealthInfo, explainMedicalTerms } from "./perplexity-service";

// Import OpenAI
import OpenAI from "openai";
// Import validation functions from our AI services
import { validateMedicalDocument } from "./openai-service";

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
  // Set up authentication
  setupAuth(app);
  
  // Mount AI router with all AI service endpoints
  app.use('/api/ai', aiRouter);
  
  // Mount enhanced journal router with Python-converted chatbot functionality
  app.use('/api/enhanced-journal', enhancedJournalRouter);
  
  // Mount Supabase router for direct Supabase operations
  app.use('/api/supabase', supabaseRouter);
  
  // Mount health log router for unified health data logging
  app.use('/api', healthLogRouter);
  
  // Mount status router for system monitoring
  app.use('/api/status', statusRouter);
  
  // User profile endpoints (REMOVED DUPLICATE DEFINITIONS)
  // The user profile endpoints are defined at the bottom of this file
  // We're keeping these comments for clarity
  
  // Health metrics endpoints
  app.post("/api/health-metrics", async (req, res) => {
    try {
      // Check if the user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        console.warn("Unauthenticated attempt to save health metrics");
        return res.status(401).json({ error: "You must be logged in to save health metrics" });
      }
      
      // Get authenticated user ID from session
      const authenticatedUserId = req.user.id;
      console.log(`Authenticated user ${authenticatedUserId} submitting health metrics`);
      
      console.log("Received health metrics payload:", req.body);
      
      // Handle date conversions before validation
      const dataWithProperDate = { ...req.body };
      
      // Convert string date to Date object if needed
      if (dataWithProperDate.date && typeof dataWithProperDate.date === 'string') {
        console.log("Converting date string to Date object:", dataWithProperDate.date);
        dataWithProperDate.date = new Date(dataWithProperDate.date);
      }
      
      // Check if the submitted userId (if any) matches the authenticated user
      if (dataWithProperDate.userId && dataWithProperDate.userId !== authenticatedUserId) {
        console.warn(`User ${authenticatedUserId} attempted to save health metrics for user ${dataWithProperDate.userId}`);
        return res.status(403).json({ error: "You can only save health metrics for your own account" });
      }
      
      // Always set userId to the authenticated user's ID for security
      dataWithProperDate.userId = authenticatedUserId;
      
      // Parse with more flexibility - use safeParse instead of parse to avoid throwing errors
      const validationResult = insertHealthMetricsSchema.safeParse(dataWithProperDate);
      
      if (!validationResult.success) {
        console.error("Validation error for health metrics:", validationResult.error);
        return res.status(400).json({ 
          error: "Invalid health metrics data", 
          details: validationResult.error.errors
        });
      }
      
      const data = validationResult.data;
      console.log(`Validated health metrics for user ${authenticatedUserId}`);
      
      // If user exists, retrieve user data for GFR estimation
      const user = await storage.getUser(data.userId);
      if (!user) {
        console.error(`User with ID ${data.userId} not found`);
        return res.status(404).json({ error: "User not found" });
      }
      
      // Enhanced logging of user profile data for GFR calculation
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
      
      // Calculate GFR if we have enough data
      if (data.systolicBP && data.painLevel !== undefined && data.stressLevel !== undefined && data.hydration !== undefined) {
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
      const requestedUserId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      // Check if the user is authenticated and authorized to access this data
      const authenticatedUserId = req.user?.id;
      console.log(`Health metrics request - Authenticated user: ${authenticatedUserId}, Requested data for: ${requestedUserId}`);
      
      // Only allow users to access their own data, not others
      if (authenticatedUserId && authenticatedUserId !== requestedUserId) {
        console.warn(`User ${authenticatedUserId} attempted to access health metrics for user ${requestedUserId}`);
        return res.status(403).json({ error: "You are not authorized to access this user's health data" });
      }
      
      // Log the request details for debugging
      console.log(`Fetching health metrics for user ${requestedUserId} with limit ${limit || 'unlimited'}`);
      
      const results = await storage.getHealthMetrics(requestedUserId, limit);
      console.log(`Retrieved ${results.length} health metrics records for user ${requestedUserId}`);
      
      res.json(results);
    } catch (error) {
      console.error("Error in health metrics API:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/health-metrics/:userId/range", async (req, res) => {
    try {
      const requestedUserId = parseInt(req.params.userId);
      const startDate = new Date(req.query.start as string);
      const endDate = new Date(req.query.end as string);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      
      // Check if the user is authenticated and authorized to access this data
      const authenticatedUserId = req.user?.id;
      console.log(`Health metrics range request - Authenticated user: ${authenticatedUserId}, Requested data for: ${requestedUserId}`);
      
      // Only allow users to access their own data, not others
      if (authenticatedUserId && authenticatedUserId !== requestedUserId) {
        console.warn(`User ${authenticatedUserId} attempted to access health metrics range for user ${requestedUserId}`);
        return res.status(403).json({ error: "You are not authorized to access this user's health data" });
      }
      
      // Log the request details for debugging
      console.log(`Fetching health metrics range for user ${requestedUserId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      const results = await storage.getHealthMetricsByDate(requestedUserId, startDate, endDate);
      console.log(`Retrieved ${results.length} health metrics records in date range for user ${requestedUserId}`);
      
      res.json(results);
    } catch (error) {
      console.error("Error in health metrics range API:", error);
      res.status(400).json({ error: error.message });
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
      
      try {
        // Send message to OpenAI
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a supportive AI health companion for people with kidney disease. Provide empathetic, informative responses. Focus on emotional support and practical advice while being clear that you are not a medical professional and serious concerns should be discussed with healthcare providers."
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
      const userId = parseInt(req.params.userId);
      const documentType = req.query.type as string | undefined;
      const results = await storage.getMedicalDocuments(userId, documentType);
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: error.message });
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

  // Get journal entries for a specific user ID (fallback method)
  app.get("/api/journal-entries/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID format" });
      }
      
      console.log(`Fetching journal entries for specific user ID: ${userId}`);
      const results = await storage.getJournalEntries(userId, limit);
      console.log(`Found ${results.length} journal entries for user ${userId}`);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
