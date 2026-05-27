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
  if (!metrics || !Array.isArray(metrics)) {
    console.warn("transformHealthMetrics received non-array input:", metrics);
    return [];
  }
  
  return metrics.map(metric => {
    // Create a fresh transformed object with all available fields
    const transformed = {
      id: metric.id,
      userId: metric.userId ?? metric.user_id,
      date: metric.date,
      hydration: metric.hydration,
      systolicBP: metric.systolicBP ?? metric.systolic_bp,
      diastolicBP: metric.diastolicBP ?? metric.diastolic_bp,
      pulse: metric.pulse,
      painLevel: metric.painLevel ?? metric.pain_level,
      stressLevel: metric.stressLevel ?? metric.stress_level,
      estimatedGFR: metric.estimatedGFR ?? metric.estimated_gfr,
      fatigueLevel: metric.fatigueLevel ?? metric.fatigue_level,
      gfrCalculationMethod: metric.gfrCalculationMethod ?? metric.gfr_calculation_method,
      creatinineLevel: metric.creatinineLevel ?? metric.creatinine_level,
      hydrationLevel: metric.hydrationLevel ?? metric.hydration_level,
      gfrTrend: metric.gfrTrend ?? metric.gfr_trend,
      gfrTrendDescription: metric.gfrTrendDescription ?? metric.gfr_trend_description,
      gfrChangePercent: metric.gfrChangePercent ?? metric.gfr_change_percent,
      gfrAbsoluteChange: metric.gfrAbsoluteChange ?? metric.gfr_absolute_change,
      gfrLongTermTrend: metric.gfrLongTermTrend ?? metric.gfr_long_term_trend,
      gfrStability: metric.gfrStability ?? metric.gfr_stability,
      kslsScore: metric.kslsScore ?? metric.ksls_score,
      kslsBand: metric.kslsBand ?? metric.ksls_band,
      kslsBmi: metric.kslsBmi ?? metric.ksls_bmi,
      kslsConfidence: metric.kslsConfidence ?? metric.ksls_confidence,
      kslsFactors: metric.kslsFactors ?? metric.ksls_factors,
    };
    
    return transformed;
  });
}

/**
 * Adds explicit logging to database query results for diagnosis
 */
export function logDataResults(_name: string, data: any): any {
  return data;
}