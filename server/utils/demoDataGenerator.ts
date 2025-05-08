import { healthMetrics } from "@shared/schema";
import { db } from "../db";
import { storage } from "../storage";
import { eq } from "drizzle-orm";

/**
 * Generate demo health data for a user
 * This is used when a user has no health data in the system
 */
export const generateDemoHealthData = async (userId: number) => {
  try {
    console.log(`🎮 Generating demo health data for user ${userId}`);
    const today = new Date();
    
    // Create demo health data for the last 30 days
    const demoData = [];
    const stageProfile = {
      1: { gfr: 95, fluctuation: 10 },
      2: { gfr: 75, fluctuation: 8 },
      3: { gfr: 45, fluctuation: 6 },
      4: { gfr: 25, fluctuation: 4 },
      5: { gfr: 15, fluctuation: 3 }
    };
    
    // Get user to determine correct GFR baseline
    const user = await storage.getUser(userId);
    const stage = user?.kidneyDiseaseStage || 1;
    // Safe access with type casting to access object properties
    const stageKey = stage as 1 | 2 | 3 | 4 | 5;
    const baseGFR = (stageProfile[stageKey]?.gfr) || 90;
    const fluctuation = (stageProfile[stageKey]?.fluctuation) || 5;
    
    // Generate data for last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      // Create varying but realistic health data
      const dayData = {
        userId,
        date,
        hydration: 1.5 + Math.random() * 1.5, // 1.5-3L
        systolicBP: 115 + Math.floor(Math.random() * 30), // 115-145
        diastolicBP: 70 + Math.floor(Math.random() * 20), // 70-90
        painLevel: 1 + Math.floor(Math.random() * 3), // 1-3
        stressLevel: 2 + Math.floor(Math.random() * 4), // 2-5
        fatigueLevel: 1 + Math.floor(Math.random() * 5), // 1-5
        
        // GFR with small fluctuation around baseline
        estimatedGFR: baseGFR + (Math.random() * fluctuation * 2 - fluctuation),
        gfrCalculationMethod: "symptom-and-vital-based",
        gfrTrend: "stable",
        gfrTrendDescription: "Your GFR appears stable compared to your last reading",
        gfrChangePercent: 0.5 + Math.random() * 3, 
        gfrAbsoluteChange: 1 + Math.random() * 2,
        gfrLongTermTrend: "improving",
        gfrStability: "Your GFR has been showing a consistent improving trend"
      };
      
      demoData.push(dayData);
    }
    
    // Save demo data to database
    for (const data of demoData) {
      try {
        const result = await db.insert(healthMetrics).values(data).returning();
        console.log(`📝 Added demo health data entry for ${userId} on ${data.date}`);
      } catch (err) {
        console.error(`❌ Error inserting demo data for user ${userId}:`, err);
      }
    }
    
    console.log(`✅ Successfully generated ${demoData.length} demo health data points for user ${userId}`);
    return demoData;
  } catch (error) {
    console.error(`❌ Error generating demo health data for user ${userId}:`, error);
    return [];
  }
};

/**
 * Check if a user has health data and generate demo data if needed
 */
export const ensureUserHasHealthData = async (userId: number) => {
  try {
    // Check if user has any health data
    const existingData = await db.select()
      .from(healthMetrics)
      .where(eq(healthMetrics.userId, userId))
      .limit(1);
    
    // If no health data exists, generate demo data
    if (!existingData || existingData.length === 0) {
      console.log(`🧪 No health metrics found for user ${userId}, generating demo data`);
      await generateDemoHealthData(userId);
      return true;
    }
    
    console.log(`✅ User ${userId} already has health data`);
    return false;
  } catch (error) {
    console.error(`❌ Error checking user health data: ${error}`);
    return false;
  }
};