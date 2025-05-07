import { storage } from '../storage';

/**
 * Copies health metrics data from one user to another
 * @param sourceUserId User ID to copy data from
 * @param targetUserId User ID to copy data to
 * @returns Object with counts of copied records
 */
export async function copyHealthMetricsData(sourceUserId: number, targetUserId: number) {
  console.log(`Starting health metrics data transfer from user ${sourceUserId} to user ${targetUserId}`);
  
  try {
    // Get source user's metrics - no limit to get all records
    const sourceMetrics = await storage.getHealthMetricsForUser(sourceUserId);
    
    if (!sourceMetrics || sourceMetrics.length === 0) {
      console.log(`No health metrics found for source user ${sourceUserId}`);
      return { 
        copied: 0,
        message: "No health metrics found for source user" 
      };
    }
    
    console.log(`Found ${sourceMetrics.length} health metrics for source user ${sourceUserId}`);
    
    // Copy each metric to the target user with modified userId
    let successCount = 0;
    
    // Process in chronological order from oldest to newest
    const sortedMetrics = [...sourceMetrics].sort((a, b) => 
      new Date(a.date || '').getTime() - new Date(b.date || '').getTime()
    );
    
    for (const metric of sortedMetrics) {
      // Create a copy with the new user ID and no original ID
      const metricCopy = {
        date: metric.date,
        userId: targetUserId,
        systolicBP: metric.systolicBP,
        diastolicBP: metric.diastolicBP,
        hydration: metric.hydration,
        weight: metric.weight,
        painLevel: metric.painLevel,
        stressLevel: metric.stressLevel,
        fatigueLevel: metric.fatigueLevel,
        gfrEstimate: metric.gfrEstimate,
        gfrMethod: metric.gfrMethod,
        gfrTrend: metric.gfrTrend,
        gfrStability: metric.gfrStability
      };
      
      try {
        // Save the copied metric to the database
        await storage.saveHealthMetrics(metricCopy);
        successCount++;
      } catch (err) {
        console.error(`Error copying metric:`, err);
      }
    }
    
    console.log(`Successfully copied ${successCount} of ${sourceMetrics.length} health metrics`);
    
    return {
      total: sourceMetrics.length,
      copied: successCount,
      message: `Successfully copied ${successCount} health metrics to user ${targetUserId}`
    };
  } catch (error) {
    console.error('Error during health metrics copy:', error);
    throw new Error('Failed to copy health metrics data');
  }
}