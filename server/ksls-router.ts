/**
 * KSLS (Kidney Stress Load Score) API Router
 * 
 * Provides endpoints for calculating and interpreting KSLS scores.
 * All endpoints require authentication.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  calculateKSLS,
  interpretKSLS,
  type KSLSInput,
  type Demographics,
} from "./utils/ksls-calculator";
import { storage } from "./storage";

const router = Router();

// Zod schema for KSLS input validation
const kslsInputSchema = z.object({
  systolic_bp: z.number().min(0).max(300),
  diastolic_bp: z.number().min(0).max(200),
  fluid_intake_liters: z.number().min(0).max(20),
  fluid_target_liters: z.number().min(0).max(20),
  fatigue_score: z.number().min(0).max(10).nullable().optional(),
  pain_score: z.number().min(0).max(10).nullable().optional(),
  stress_score: z.number().min(0).max(10).nullable().optional(),
  height_cm: z.number().min(50).max(300),
  weight_kg: z.number().min(20).max(500),
});

const demographicsSchema = z.object({
  age: z.number().min(0).max(150).optional(),
  sex_assigned_at_birth: z.enum(["male", "female", "intersex"]).optional(),
  race_ethnicity: z.string().optional(),
  ckd_stage: z.number().min(1).max(5).nullable().optional(),
}).optional();

const calculateKslsRequestSchema = z.object({
  input: kslsInputSchema,
  demographics: demographicsSchema,
});

/**
 * POST /api/ksls/calculate
 * 
 * Calculate KSLS score and interpretation from health metrics.
 * 
 * Request body:
 * {
 *   "input": {
 *     "systolic_bp": number,
 *     "diastolic_bp": number,
 *     "fluid_intake_liters": number,
 *     "fluid_target_liters": number,
 *     "fatigue_score": number | null (optional),
 *     "pain_score": number | null (optional),
 *     "stress_score": number | null (optional),
 *     "height_cm": number,
 *     "weight_kg": number
 *   },
 *   "demographics": {
 *     "age": number (optional),
 *     "sex_assigned_at_birth": "male" | "female" | "intersex" (optional),
 *     "race_ethnicity": string (optional),
 *     "ckd_stage": number (optional)
 *   }
 * }
 * 
 * Response:
 * {
 *   "result": KSLSResult,
 *   "interpretation": KSLSInterpretation
 * }
 */
router.post("/calculate", async (req: Request, res: Response) => {
  try {
    // Authentication check
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request body
    const validation = calculateKslsRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid input data",
        details: validation.error.format()
      });
    }

    const { input, demographics } = validation.data;

    // Calculate KSLS
    const result = calculateKSLS(input);

    // Generate interpretation
    const interpretation = interpretKSLS(result, demographics);

    res.json({
      result,
      interpretation,
    });
  } catch (error) {
    console.error("❌ Error calculating KSLS:", error);
    res.status(500).json({ 
      error: "Failed to calculate KSLS",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/ksls/calculate-from-metrics/:userId
 * 
 * Calculate KSLS using latest health metrics and user profile from database.
 * Convenience endpoint that fetches data automatically.
 * 
 * Request body (optional overrides):
 * {
 *   "fluid_intake_liters": number (optional),
 *   "fluid_target_liters": number (optional)
 * }
 * 
 * Response:
 * {
 *   "result": KSLSResult,
 *   "interpretation": KSLSInterpretation,
 *   "data_source": {
 *     "metrics_date": string,
 *     "user_profile_updated": string
 *   }
 * }
 */
router.post("/calculate-from-metrics/:userId", async (req: Request, res: Response) => {
  try {
    console.log(`📊 KSLS calculation requested for user ${req.params.userId}`);
    
    // Authentication check
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.log("❌ KSLS: Not authenticated");
      return res.status(401).json({ error: "Authentication required" });
    }

    const authenticatedUserId = (req.user as any).id;
    const requestedUserId = parseInt(req.params.userId);
    
    console.log(`✅ KSLS: Authenticated user ${authenticatedUserId} requesting data for user ${requestedUserId}`);

    // Authorization check - users can only access their own data
    if (authenticatedUserId !== requestedUserId) {
      console.log(`❌ KSLS: Authorization failed - user mismatch`);
      return res.status(403).json({ error: "Access denied" });
    }

    // Fetch user profile
    const user = await storage.getUser(requestedUserId);
    console.log(`📊 KSLS: User profile fetched:`, user ? `id=${user.id}, height=${user.height}, weight=${user.weight}` : 'null');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch latest health metrics
    const metrics = await storage.getHealthMetrics(requestedUserId);
    console.log(`📊 KSLS: Fetched ${metrics?.length || 0} health metrics records`);
    if (!metrics || metrics.length === 0) {
      return res.status(404).json({ 
        error: "No health metrics found. Please log health data first." 
      });
    }

    const latestMetrics = metrics[0]; // Assuming sorted by date desc
    console.log(`📊 KSLS: Latest metrics:`, {
      id: latestMetrics.id,
      date: latestMetrics.date,
      systolicBP: latestMetrics.systolicBP,
      diastolicBP: latestMetrics.diastolicBP,
      hydration: latestMetrics.hydration,
      fatigue: latestMetrics.fatigueLevel,
      pain: latestMetrics.painLevel,
      stress: latestMetrics.stressLevel
    });

    // Use defaults if height/weight are not available
    // Default: 170cm (5'7") and 70kg (154lbs) - average adult values
    const heightCm = user.height || 170;
    const weightKg = user.weight || 70;
    
    console.log(`📊 KSLS calculation using height: ${heightCm}cm, weight: ${weightKg}kg ${user.height ? '' : '(default)'}`);

    // Validate required fields from health metrics
    console.log(`🔍 KSLS: Validating BP - systolic: ${latestMetrics.systolicBP}, diastolic: ${latestMetrics.diastolicBP}`);
    if (latestMetrics.systolicBP === null || latestMetrics.diastolicBP === null) {
      console.log(`❌ KSLS: Blood pressure validation failed`);
      return res.status(400).json({
        error: "Missing blood pressure data in latest health metrics."
      });
    }
    console.log(`✅ KSLS: Blood pressure validation passed`);

    // Allow overrides from request body
    const overrides = req.body || {};

    // Build KSLS input
    const input: KSLSInput = {
      systolic_bp: latestMetrics.systolicBP,
      diastolic_bp: latestMetrics.diastolicBP,
      fluid_intake_liters: overrides.fluid_intake_liters ?? (latestMetrics.hydration ?? 2.0),
      fluid_target_liters: overrides.fluid_target_liters ?? 2.0, // Default target
      fatigue_score: latestMetrics.fatigueLevel ?? null,
      pain_score: latestMetrics.painLevel ?? null,
      stress_score: latestMetrics.stressLevel ?? null,
      height_cm: heightCm,
      weight_kg: weightKg,
    };

    console.log(`📊 KSLS: Built input:`, JSON.stringify(input, null, 2));

    // Build demographics
    const demographics: Demographics | undefined = {
      age: user.age ?? undefined,
      sex_assigned_at_birth: user.gender as "male" | "female" | "intersex" | undefined,
      race_ethnicity: user.race ?? undefined,
      ckd_stage: user.kidneyDiseaseStage ?? undefined,
    };

    console.log(`👤 KSLS: Demographics:`, JSON.stringify(demographics, null, 2));

    // Calculate KSLS
    console.log(`🧮 KSLS: Starting calculation...`);
    const result = calculateKSLS(input);
    console.log(`✅ KSLS: Calculation complete:`, { score: result.ksls, band: result.band });

    // Generate interpretation
    const interpretation = interpretKSLS(result, demographics);

    res.json({
      result,
      interpretation,
      data_source: {
        metrics_date: latestMetrics.date,
        user_profile_updated: user.updatedAt || "unknown",
      }
    });
  } catch (error) {
    console.error("❌ Error calculating KSLS from user metrics:", error);
    res.status(500).json({ 
      error: "Failed to calculate KSLS",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/ksls/history/:userId
 * 
 * Retrieve KSLS history for a user from stored health metrics.
 * Returns only records where KSLS was calculated.
 */
router.get("/history/:userId", async (req: Request, res: Response) => {
  try {
    // Authentication check
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const authenticatedUserId = (req.user as any).id;
    const requestedUserId = parseInt(req.params.userId);

    // Authorization check
    if (authenticatedUserId !== requestedUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Fetch health metrics with KSLS data
    const allMetrics = await storage.getHealthMetrics(requestedUserId);
    
    // Filter to only records with KSLS scores
    const kslsHistory = allMetrics
      .filter(metric => metric.kslsScore !== null)
      .map(metric => ({
        date: metric.date,
        ksls: metric.kslsScore,
        band: metric.kslsBand as 'stable' | 'elevated' | 'high',
        bmi: metric.kslsBmi,
        confidence: metric.kslsConfidence,
        factors: metric.kslsFactors ? JSON.parse(metric.kslsFactors as any) : null,
        // Include related health data for context
        bloodPressure: {
          systolic: metric.systolicBP,
          diastolic: metric.diastolicBP
        },
        hydration: metric.hydration,
        symptoms: {
          fatigue: metric.fatigueLevel,
          pain: metric.painLevel,
          stress: metric.stressLevel
        }
      }));

    res.json({
      userId: requestedUserId,
      count: kslsHistory.length,
      history: kslsHistory
    });
  } catch (error) {
    console.error("❌ Error fetching KSLS history:", error);
    res.status(500).json({ 
      error: "Failed to fetch KSLS history",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
