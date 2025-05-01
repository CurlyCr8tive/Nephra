/**
 * Utility functions for converting between metric and imperial units
 */

// Weight conversions
export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

// Height conversions
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  
  // Handle case where inches rounds to 12
  if (inches === 12) {
    return { feet: feet + 1, inches: 0 };
  }
  
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return Math.round(totalInches * 2.54);
}

// Blood pressure doesn't change between unit systems, but including for API consistency
export function convertBpSystolic(value: number, _toSystem: 'metric' | 'imperial'): number {
  return value;
}

export function convertBpDiastolic(value: number, _toSystem: 'metric' | 'imperial'): number {
  return value;
}

// Hydration conversions (liters to fluid oz)
export function litersToFlOz(liters: number): number {
  return liters * 33.814;
}

export function flOzToLiters(flOz: number): number {
  return flOz / 33.814;
}

// Temperature conversions
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9/5) + 32;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) * 5/9;
}

// Convenience wrappers for use with unit system 
export function convertWeight(value: number, toSystem: 'metric' | 'imperial', fromSystem: 'metric' | 'imperial'): number {
  if (fromSystem === toSystem) return value;
  
  return fromSystem === 'metric' ? kgToLbs(value) : lbsToKg(value);
}

export function convertHeight(value: number, toSystem: 'metric' | 'imperial', fromSystem: 'metric' | 'imperial'): number {
  if (fromSystem === toSystem) return value;
  
  // This only handles converting the numeric value in cm, not the display format
  // For display as feet/inches, use cmToFeetInches
  if (fromSystem === 'imperial') {
    throw new Error('Direct imperial height conversion requires feet and inches separately');
  }
  
  // We won't actually use this function for imperial output since we need feet/inches separate
  return value;
}

// Format values for display according to unit system
export function formatWeight(value: number | null | undefined, unitSystem: 'metric' | 'imperial'): string {
  if (value === null || value === undefined) return '—';
  
  if (unitSystem === 'metric') {
    return `${value.toFixed(1)} kg`;
  } else {
    return `${kgToLbs(value).toFixed(1)} lbs`;
  }
}

export function formatHeight(value: number | null | undefined, unitSystem: 'metric' | 'imperial'): string {
  if (value === null || value === undefined) return '—';
  
  if (unitSystem === 'metric') {
    return `${value} cm`;
  } else {
    const { feet, inches } = cmToFeetInches(value);
    return `${feet}'${inches}"`;
  }
}

export function formatHydration(value: number | null | undefined, unitSystem: 'metric' | 'imperial'): string {
  if (value === null || value === undefined) return '—';
  
  if (unitSystem === 'metric') {
    return `${value.toFixed(1)} L`;
  } else {
    const flOz = litersToFlOz(value);
    return `${Math.round(flOz)} fl oz`;
  }
}

export function formatBloodPressure(systolic: number | null | undefined, diastolic: number | null | undefined): string {
  if (systolic === null || systolic === undefined || diastolic === null || diastolic === undefined) {
    return '—/—';
  }
  
  return `${systolic}/${diastolic} mmHg`;
}

// Non-measurement display formatters
export function formatGFR(gfr: number | null | undefined): string {
  if (gfr === null || gfr === undefined) return '—';
  return `${Math.round(gfr)} mL/min/1.73m²`;
}

export function getGFRCategory(gfr: number | null | undefined): {
  stage: string;
  description: string;
  color: string; // Tailwind color class
} {
  if (gfr === null || gfr === undefined) {
    return {
      stage: 'Unknown',
      description: 'GFR value not available',
      color: 'bg-gray-300'
    };
  }
  
  if (gfr >= 90) {
    return {
      stage: 'Stage 1',
      description: 'Normal or High',
      color: 'bg-green-500'
    };
  } else if (gfr >= 60) {
    return {
      stage: 'Stage 2',
      description: 'Mildly Decreased',
      color: 'bg-green-300'
    };
  } else if (gfr >= 45) {
    return {
      stage: 'Stage 3a',
      description: 'Mild to Moderately Decreased',
      color: 'bg-yellow-300'
    };
  } else if (gfr >= 30) {
    return {
      stage: 'Stage 3b',
      description: 'Moderately to Severely Decreased',
      color: 'bg-orange-300'
    };
  } else if (gfr >= 15) {
    return {
      stage: 'Stage 4',
      description: 'Severely Decreased',
      color: 'bg-orange-500'
    };
  } else {
    return {
      stage: 'Stage 5',
      description: 'Kidney Failure',
      color: 'bg-red-500'
    };
  }
}