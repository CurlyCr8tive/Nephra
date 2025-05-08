/**
 * Data transformation utilities for handling the conversion between database (snake_case) 
 * and frontend application (camelCase) representations of data
 */

import { HealthMetrics } from "@shared/schema";

/**
 * Transforms health metrics data from database format (snake_case) to frontend format (camelCase)
 * This is necessary because the database has snake_case column names but our TypeScript types
 * and frontend code expect camelCase property names
 */
export function transformHealthMetrics(metrics: any[]): HealthMetrics[] {
  return metrics.map(metric => {
    // Log the incoming metric object to diagnose issues
    console.log("Transforming metric object:", metric);
    
    return {
      id: metric.id,
      userId: metric.userId || metric.user_id, // Support both formats
      date: metric.date,
      hydration: metric.hydration,
      systolicBP: metric.systolicBP || metric.systolic_bp,
      diastolicBP: metric.diastolicBP || metric.diastolic_bp,
      painLevel: metric.painLevel || metric.pain_level,
      stressLevel: metric.stressLevel || metric.stress_level,
      estimatedGFR: metric.estimatedGFR || metric.estimated_gfr,
      fatigueLevel: metric.fatigueLevel || metric.fatigue_level,
      gfrCalculationMethod: metric.gfrCalculationMethod || metric.gfr_calculation_method,
      creatinineLevel: metric.creatinineLevel || metric.creatinine_level,
      hydrationLevel: metric.hydrationLevel || metric.hydration_level,
      gfrTrend: metric.gfrTrend || metric.gfr_trend,
      gfrTrendDescription: metric.gfrTrendDescription || metric.gfr_trend_description,
      gfrChangePercent: metric.gfrChangePercent || metric.gfr_change_percent,
      gfrAbsoluteChange: metric.gfrAbsoluteChange || metric.gfr_absolute_change,
      gfrLongTermTrend: metric.gfrLongTermTrend || metric.gfr_long_term_trend,
      gfrStability: metric.gfrStability || metric.gfr_stability
    };
  });
}

/**
 * Adds explicit logging to database query results for diagnosis
 */
export function logDataResults(name: string, data: any): any {
  console.log(`📊 ${name} data retrieved:`, {
    count: Array.isArray(data) ? data.length : 'not an array',
    firstItem: Array.isArray(data) && data.length > 0 ? 
      Object.keys(data[0]).reduce((obj: Record<string, any>, key: string) => {
        // Truncate large values for cleaner logs
        const value = data[0][key];
        obj[key] = typeof value === 'string' && value.length > 50 ? 
          value.substring(0, 50) + '...' : value;
        return obj;
      }, {}) : 'no items'
  });
  return data;
}