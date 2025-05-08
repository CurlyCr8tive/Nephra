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
  return metrics.map(metric => ({
    id: metric.id,
    userId: metric.user_id,
    date: metric.date,
    hydration: metric.hydration,
    systolicBP: metric.systolic_bp,
    diastolicBP: metric.diastolic_bp,
    painLevel: metric.pain_level,
    stressLevel: metric.stress_level,
    estimatedGFR: metric.estimated_gfr,
    fatigueLevel: metric.fatigue_level,
    gfrCalculationMethod: metric.gfr_calculation_method,
    creatinineLevel: metric.creatinine_level,
    hydrationLevel: metric.hydration_level,
    gfrTrend: metric.gfr_trend,
    gfrTrendDescription: metric.gfr_trend_description,
    gfrChangePercent: metric.gfr_change_percent,
    gfrAbsoluteChange: metric.gfr_absolute_change,
    gfrLongTermTrend: metric.gfr_long_term_trend,
    gfrStability: metric.gfr_stability
  }));
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