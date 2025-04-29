import { db } from "../db";
import { healthMetrics } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Utility function to copy health metrics data from one user to another
 * This is useful for transferring demo data to a real user account
 */
export async function copyHealthMetricsData(sourceUserId: number, targetUserId: number) {
  try {
    // Fetch all health metrics for source user
    const sourceMetrics = await db.select().from(healthMetrics).where(eq(healthMetrics.userId, sourceUserId));
    
    console.log(`Found ${sourceMetrics.length} health metrics records for user ${sourceUserId}`);
    
    if (sourceMetrics.length === 0) {
      console.log(`No health metrics found for source user ${sourceUserId}`);
      return {
        success: false,
        message: "No health metrics found for source user",
        copied: 0
      };
    }
    
    // Delete existing metrics for target user to avoid duplicates
    await db.delete(healthMetrics).where(eq(healthMetrics.userId, targetUserId));
    console.log(`Deleted existing health metrics for target user ${targetUserId}`);
    
    // Copy metrics to target user
    const promises = sourceMetrics.map(metric => {
      // Create a new metric object, assign it to the target user
      const newMetric = { ...metric, id: undefined, userId: targetUserId };
      
      // Insert the new metric
      return db.insert(healthMetrics).values(newMetric);
    });
    
    // Wait for all insertions to complete
    await Promise.all(promises);
    
    console.log(`Successfully copied ${sourceMetrics.length} health metrics from user ${sourceUserId} to user ${targetUserId}`);
    
    return {
      success: true,
      message: `Successfully copied ${sourceMetrics.length} health metrics records`,
      copied: sourceMetrics.length
    };
  } catch (error) {
    console.error(`Error copying health metrics data:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
      copied: 0
    };
  }
}