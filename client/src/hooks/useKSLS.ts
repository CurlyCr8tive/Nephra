/**
 * React hook for calculating and fetching KSLS (Kidney Stress Load Score)
 * 
 * Usage:
 * const { calculateKSLS, isCalculating, error } = useKSLS();
 * const result = await calculateKSLS(input, demographics);
 */

import { useMutation, useQuery } from '@tanstack/react-query';

export interface KSLSInput {
  systolic_bp: number;
  diastolic_bp: number;
  fluid_intake_liters: number;
  fluid_target_liters: number;
  fatigue_score?: number | null;
  pain_score?: number | null;
  stress_score?: number | null;
  height_cm: number;
  weight_kg: number;
}

export interface Demographics {
  age?: number;
  sex_assigned_at_birth?: 'male' | 'female' | 'intersex';
  race_ethnicity?: string;
  ckd_stage?: number | null;
}

export interface KSLSFactors {
  bp_norm: number;
  hydro_norm: number;
  fatigue_norm: number | null;
  pain_norm: number | null;
  stress_norm: number | null;
  weight_norm: number;
}

export interface KSLSResult {
  ksls: number;
  band: 'stable' | 'elevated' | 'high';
  bmi: number;
  factors: KSLSFactors;
}

export interface KSLSInterpretation {
  summary: string;
  detail: string;
  safety_note: string;
  top_factors: string[];
  personalized_context?: string;
}

export interface KSLSResponse {
  result: KSLSResult;
  interpretation: KSLSInterpretation;
  data_source?: {
    metrics_date: string;
    user_profile_updated: string;
  };
}

/**
 * Calculate KSLS from explicit input data
 */
async function calculateKslsFromInput(
  input: KSLSInput,
  demographics?: Demographics
): Promise<KSLSResponse> {
  const response = await fetch('/api/ksls/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ input, demographics }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to calculate KSLS');
  }

  return response.json();
}

/**
 * Calculate KSLS from user's latest health metrics (fetched from database)
 */
async function calculateKslsFromMetrics(
  userId: number,
  overrides?: {
    fluid_intake_liters?: number;
    fluid_target_liters?: number;
  }
): Promise<KSLSResponse> {
  const response = await fetch(`/api/ksls/calculate-from-metrics/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(overrides || {}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to calculate KSLS from metrics');
  }

  return response.json();
}

/**
 * Hook for manual KSLS calculation with explicit input
 */
export function useKSLS() {
  const mutation = useMutation({
    mutationFn: ({ input, demographics }: { 
      input: KSLSInput; 
      demographics?: Demographics 
    }) => calculateKslsFromInput(input, demographics),
  });

  return {
    calculateKSLS: mutation.mutateAsync,
    isCalculating: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
}

/**
 * Hook for automatic KSLS calculation from user's latest metrics
 * Use this when you want to display current KSLS without manual input
 */
export function useKSLSFromMetrics(
  userId: number | undefined,
  overrides?: {
    fluid_intake_liters?: number;
    fluid_target_liters?: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['ksls', userId, overrides],
    queryFn: () => {
      if (!userId) throw new Error('User ID required');
      return calculateKslsFromMetrics(userId, overrides);
    },
    enabled: enabled && !!userId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
