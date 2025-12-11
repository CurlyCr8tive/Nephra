/**
 * Unit tests for Kidney Stress Load Score (KSLS) Calculator
 * 
 * These tests verify:
 * 1. Score calculation is deterministic and pure
 * 2. Demographics NEVER affect the numeric score
 * 3. Missing symptom data is handled correctly
 * 4. Edge cases produce expected results
 * 5. Interpretation varies with demographics (text only, not score)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateKSLS,
  interpretKSLS,
  type KSLSInput,
  type Demographics,
} from './ksls-calculator.js';

describe('KSLS Calculator - Core Functionality', () => {
  // Baseline healthy profile
  const healthyInput: KSLSInput = {
    systolic_bp: 115,
    diastolic_bp: 75,
    fluid_intake_liters: 2.0,
    fluid_target_liters: 2.0,
    fatigue_score: 2,
    pain_score: 1,
    stress_score: 2,
    height_cm: 170,
    weight_kg: 70,
  };

  describe('Low stress scenarios', () => {
    it('should return stable band for ideal health metrics', () => {
      const result = calculateKSLS(healthyInput);
      
      expect(result.band).toBe('stable');
      expect(result.ksls).toBeLessThanOrEqual(33);
      expect(result.factors.bp_norm).toBe(0);
      expect(result.factors.hydro_norm).toBe(0);
    });

    it('should calculate BMI correctly', () => {
      const result = calculateKSLS(healthyInput);
      
      // BMI = 70 / (1.7^2) = 24.2
      expect(result.bmi).toBeCloseTo(24.2, 1);
      expect(result.factors.weight_norm).toBe(0); // In healthy range
    });
  });

  describe('High stress scenarios', () => {
    it('should return high band for multiple elevated factors', () => {
      const highStressInput: KSLSInput = {
        systolic_bp: 160,  // Very high
        diastolic_bp: 95,  // High
        fluid_intake_liters: 0.5,  // Very low hydration
        fluid_target_liters: 2.0,
        fatigue_score: 9,
        pain_score: 8,
        stress_score: 9,
        height_cm: 170,
        weight_kg: 95,  // BMI ~32, overweight
      };
      
      const result = calculateKSLS(highStressInput);
      
      expect(result.band).toBe('high');
      expect(result.ksls).toBeGreaterThan(66);
      expect(result.factors.bp_norm).toBe(1); // Max stress
      expect(result.factors.hydro_norm).toBeGreaterThan(0.8);
    });

    it('should detect elevated BP stress correctly', () => {
      const elevatedBP: KSLSInput = {
        ...healthyInput,
        systolic_bp: 145,
        diastolic_bp: 85,
      };
      
      const result = calculateKSLS(elevatedBP);
      
      expect(result.factors.bp_norm).toBe(1); // ≥140 = max stress
      expect(result.band).not.toBe('stable');
    });

    it('should detect diastolic BP stress', () => {
      const highDiastolic: KSLSInput = {
        ...healthyInput,
        systolic_bp: 125,
        diastolic_bp: 92,
      };
      
      const result = calculateKSLS(highDiastolic);
      
      // Diastolic ≥90 should set minimum stress of 0.7
      expect(result.factors.bp_norm).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('Hydration normalization', () => {
    it('should handle optimal hydration', () => {
      const optimalHydration = {
        ...healthyInput,
        fluid_intake_liters: 2.0,
        fluid_target_liters: 2.0,
      };
      
      const result = calculateKSLS(optimalHydration);
      expect(result.factors.hydro_norm).toBe(0);
    });

    it('should detect under-hydration', () => {
      const underHydrated = {
        ...healthyInput,
        fluid_intake_liters: 1.0,
        fluid_target_liters: 2.0,
      };
      
      const result = calculateKSLS(underHydrated);
      // Ratio = 0.5, which is < 0.6 → max stress
      expect(result.factors.hydro_norm).toBe(1);
    });

    it('should detect over-hydration', () => {
      const overHydrated = {
        ...healthyInput,
        fluid_intake_liters: 3.2,
        fluid_target_liters: 2.0,
      };
      
      const result = calculateKSLS(overHydrated);
      // Ratio = 1.6, which is > 1.5 → max stress
      expect(result.factors.hydro_norm).toBe(1);
    });

    it('should handle zero target (no prescription)', () => {
      const noTarget = {
        ...healthyInput,
        fluid_target_liters: 0,
      };
      
      const result = calculateKSLS(noTarget);
      expect(result.factors.hydro_norm).toBe(0); // Accept any intake
    });
  });

  describe('BMI normalization', () => {
    it('should recognize healthy BMI', () => {
      const healthyWeight = {
        ...healthyInput,
        height_cm: 170,
        weight_kg: 70,  // BMI ~24
      };
      
      const result = calculateKSLS(healthyWeight);
      expect(result.factors.weight_norm).toBe(0);
    });

    it('should detect obesity', () => {
      const obese = {
        ...healthyInput,
        height_cm: 170,
        weight_kg: 100,  // BMI ~35
      };
      
      const result = calculateKSLS(obese);
      expect(result.factors.weight_norm).toBeGreaterThan(0.4);
      expect(result.factors.weight_norm).toBeLessThan(1);
    });

    it('should detect severe obesity', () => {
      const severeObese = {
        ...healthyInput,
        height_cm: 170,
        weight_kg: 120,  // BMI ~42
      };
      
      const result = calculateKSLS(severeObese);
      expect(result.factors.weight_norm).toBe(1);
    });

    it('should detect underweight', () => {
      const underweight = {
        ...healthyInput,
        height_cm: 170,
        weight_kg: 50,  // BMI ~17
      };
      
      const result = calculateKSLS(underweight);
      expect(result.factors.weight_norm).toBeGreaterThan(0.5);
    });
  });

  describe('Missing symptom data handling', () => {
    it('should handle all symptoms missing', () => {
      const noSymptoms: KSLSInput = {
        systolic_bp: 130,
        diastolic_bp: 85,
        fluid_intake_liters: 1.8,
        fluid_target_liters: 2.0,
        fatigue_score: null,
        pain_score: null,
        stress_score: null,
        height_cm: 170,
        weight_kg: 70,
      };
      
      const result = calculateKSLS(noSymptoms);
      
      // Should still calculate score based on available factors
      expect(result.ksls).toBeGreaterThanOrEqual(0);
      expect(result.ksls).toBeLessThanOrEqual(100);
      expect(result.factors.fatigue_norm).toBeNull();
      expect(result.factors.pain_norm).toBeNull();
      expect(result.factors.stress_norm).toBeNull();
    });

    it('should handle partial symptom data', () => {
      const partialSymptoms: KSLSInput = {
        ...healthyInput,
        fatigue_score: 5,
        pain_score: null,
        stress_score: 3,
      };
      
      const result = calculateKSLS(partialSymptoms);
      
      expect(result.factors.fatigue_norm).toBe(0.5);
      expect(result.factors.pain_norm).toBeNull();
      expect(result.factors.stress_norm).toBe(0.3);
    });

    it('should produce different scores with vs without symptoms', () => {
      const withSymptoms: KSLSInput = {
        ...healthyInput,
        fatigue_score: 8,
        pain_score: 7,
        stress_score: 9,
      };
      
      const withoutSymptoms: KSLSInput = {
        ...healthyInput,
        fatigue_score: null,
        pain_score: null,
        stress_score: null,
      };
      
      const resultWith = calculateKSLS(withSymptoms);
      const resultWithout = calculateKSLS(withoutSymptoms);
      
      // With high symptoms should have higher score
      expect(resultWith.ksls).toBeGreaterThan(resultWithout.ksls);
    });
  });
});

describe('KSLS Interpretation - Demographic Awareness', () => {
  const baseResult = calculateKSLS({
    systolic_bp: 135,
    diastolic_bp: 85,
    fluid_intake_liters: 1.5,
    fluid_target_liters: 2.0,
    fatigue_score: 6,
    pain_score: 3,
    stress_score: 4,
    height_cm: 170,
    weight_kg: 80,
  });

  describe('Core interpretation (no demographics)', () => {
    it('should provide interpretation without demographics', () => {
      const interp = interpretKSLS(baseResult);
      
      expect(interp.summary).toBeTruthy();
      expect(interp.detail).toBeTruthy();
      expect(interp.safety_note).toContain('NOT a measure of kidney function');
      expect(interp.safety_note).toContain('NOT');
      expect(interp.top_factors.length).toBeGreaterThan(0);
    });

    it('should always include safety disclaimer', () => {
      const interp = interpretKSLS(baseResult);
      
      expect(interp.safety_note).toContain('GFR');
      expect(interp.safety_note).toContain('diagnosis');
      expect(interp.safety_note).toContain('healthcare team');
    });

    it('should identify top contributing factors', () => {
      const interp = interpretKSLS(baseResult);
      
      expect(interp.top_factors).toContain('blood pressure');
      expect(interp.top_factors.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Demographic context (score unchanged)', () => {
    it('should provide age-specific context without changing score', () => {
      const demographics: Demographics = {
        age: 65,
        sex_assigned_at_birth: "female",
      };
      
      const interpWithDemo = interpretKSLS(baseResult, demographics);
      const interpWithoutDemo = interpretKSLS(baseResult);
      
      // Score-related fields should be identical
      expect(interpWithDemo.summary).toBe(interpWithoutDemo.summary);
      expect(interpWithDemo.top_factors).toEqual(interpWithoutDemo.top_factors);
      
      // But personalized context should differ
      expect(interpWithDemo.personalized_context).toBeTruthy();
      expect(interpWithDemo.personalized_context).toContain('60');
    });

    it('should provide sex-specific context for females', () => {
      const demographics: Demographics = {
        age: 45,
        sex_assigned_at_birth: "female",
      };
      
      const interp = interpretKSLS(baseResult, demographics);
      
      expect(interp.personalized_context).toBeTruthy();
      if (baseResult.factors.fatigue_norm && baseResult.factors.fatigue_norm > 0.4) {
        expect(interp.personalized_context).toContain('women');
      }
    });

    it('should provide sex-specific context for males', () => {
      const demographics: Demographics = {
        age: 50,
        sex_assigned_at_birth: "male",
      };
      
      const interp = interpretKSLS(baseResult, demographics);
      
      expect(interp.personalized_context).toBeTruthy();
      if (baseResult.factors.bp_norm > 0.4) {
        expect(interp.personalized_context).toContain('men');
      }
    });

    it('should provide equity-focused race context', () => {
      const demographics: Demographics = {
        age: 40,
        sex_assigned_at_birth: "male",
        race_ethnicity: "Black / African American",
      };
      
      const interp = interpretKSLS(baseResult, demographics);
      
      expect(interp.personalized_context).toBeTruthy();
      expect(interp.personalized_context).toContain('community');
      expect(interp.personalized_context).toContain('social');
      expect(interp.personalized_context).toContain('never uses race');
    });

    it('should provide CKD stage context', () => {
      const demographics: Demographics = {
        age: 55,
        ckd_stage: 3,
      };
      
      const interp = interpretKSLS(baseResult, demographics);
      
      if (baseResult.band !== 'stable') {
        expect(interp.personalized_context).toBeTruthy();
        expect(interp.personalized_context).toContain('CKD');
      }
    });
  });

  describe('Critical invariant: Demographics never change score', () => {
    const testInput: KSLSInput = {
      systolic_bp: 140,
      diastolic_bp: 90,
      fluid_intake_liters: 1.8,
      fluid_target_liters: 2.0,
      fatigue_score: 5,
      pain_score: 4,
      stress_score: 6,
      height_cm: 175,
      weight_kg: 85,
    };

    it('should produce identical scores regardless of age', () => {
      const result1 = calculateKSLS(testInput);
      const result2 = calculateKSLS(testInput);
      
      // Mock different demographics
      const demo1: Demographics = { age: 25 };
      const demo2: Demographics = { age: 75 };
      
      // Interpretations can differ
      const interp1 = interpretKSLS(result1, demo1);
      const interp2 = interpretKSLS(result2, demo2);
      
      // But KSLS scores must be identical
      expect(result1.ksls).toBe(result2.ksls);
      expect(result1.band).toBe(result2.band);
      expect(result1.factors).toEqual(result2.factors);
      
      // While text may differ
      // (we don't test text equality because it's expected to differ)
    });

    it('should produce identical scores regardless of sex', () => {
      const result1 = calculateKSLS(testInput);
      const result2 = calculateKSLS(testInput);
      
      const demo1: Demographics = { sex_assigned_at_birth: "female" };
      const demo2: Demographics = { sex_assigned_at_birth: "male" };
      
      interpretKSLS(result1, demo1);
      interpretKSLS(result2, demo2);
      
      expect(result1.ksls).toBe(result2.ksls);
      expect(result1.band).toBe(result2.band);
    });

    it('should produce identical scores regardless of race', () => {
      const result1 = calculateKSLS(testInput);
      const result2 = calculateKSLS(testInput);
      const result3 = calculateKSLS(testInput);
      
      const demo1: Demographics = { race_ethnicity: "White" };
      const demo2: Demographics = { race_ethnicity: "Black / African American" };
      const demo3: Demographics = { race_ethnicity: "Asian" };
      
      interpretKSLS(result1, demo1);
      interpretKSLS(result2, demo2);
      interpretKSLS(result3, demo3);
      
      expect(result1.ksls).toBe(result2.ksls);
      expect(result2.ksls).toBe(result3.ksls);
      expect(result1.factors).toEqual(result2.factors);
      expect(result2.factors).toEqual(result3.factors);
    });
  });
});

describe('KSLS Edge Cases', () => {
  it('should handle extreme values gracefully', () => {
    const extremeInput: KSLSInput = {
      systolic_bp: 200,
      diastolic_bp: 120,
      fluid_intake_liters: 0.1,
      fluid_target_liters: 3.0,
      fatigue_score: 10,
      pain_score: 10,
      stress_score: 10,
      height_cm: 150,
      weight_kg: 150,
    };
    
    const result = calculateKSLS(extremeInput);
    
    expect(result.ksls).toBeLessThanOrEqual(100);
    expect(result.ksls).toBeGreaterThanOrEqual(0);
    expect(result.band).toBe('high');
  });

  it('should handle very tall/short individuals', () => {
    const veryTall: KSLSInput = {
      systolic_bp: 120,
      diastolic_bp: 80,
      fluid_intake_liters: 2.0,
      fluid_target_liters: 2.0,
      fatigue_score: 2,
      pain_score: 1,
      stress_score: 2,
      height_cm: 200,
      weight_kg: 100,  // BMI = 25 (healthy for tall person)
    };
    
    const result = calculateKSLS(veryTall);
    expect(result.bmi).toBeCloseTo(25, 1);
    expect(result.factors.weight_norm).toBe(0);
  });

  it('should be deterministic (same input = same output)', () => {
    const input: KSLSInput = {
      systolic_bp: 130,
      diastolic_bp: 85,
      fluid_intake_liters: 1.8,
      fluid_target_liters: 2.0,
      fatigue_score: 5,
      pain_score: 3,
      stress_score: 4,
      height_cm: 170,
      weight_kg: 75,
    };
    
    const result1 = calculateKSLS(input);
    const result2 = calculateKSLS(input);
    const result3 = calculateKSLS(input);
    
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });
});
