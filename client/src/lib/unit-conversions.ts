/**
 * Unit conversion utilities for the Nephra app
 * Provides functions to convert between different measurement units
 */

/**
 * Convert pounds to kilograms
 * @param pounds - Weight in pounds
 * @returns Weight in kilograms
 */
export function poundsToKg(pounds: number): number {
  return pounds * 0.45359237;
}

/**
 * Convert kilograms to pounds
 * @param kg - Weight in kilograms
 * @returns Weight in pounds
 */
export function kgToPounds(kg: number): number {
  return kg / 0.45359237;
}

/**
 * Convert feet and inches to centimeters
 * @param feet - Height in feet
 * @param inches - Additional height in inches
 * @returns Height in centimeters
 */
export function feetAndInchesToCm(feet: number, inches: number): number {
  const totalInches = (feet * 12) + inches;
  return totalInches * 2.54;
}

/**
 * Convert centimeters to feet and inches
 * @param cm - Height in centimeters
 * @returns Object with feet and inches properties
 */
export function cmToFeetAndInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  
  // Handle case where inches is 12 (should roll over to feet)
  if (inches === 12) {
    return { feet: feet + 1, inches: 0 };
  }
  
  return { feet, inches };
}

/**
 * Format height in feet and inches with proper symbols
 * @param feet - Height in feet
 * @param inches - Height in inches
 * @returns Formatted string (e.g., "5′ 10″")
 */
export function formatFeetInches(feet: number, inches: number): string {
  return `${feet}′ ${inches}″`;
}

/**
 * Format weight in pounds with proper symbol
 * @param pounds - Weight in pounds
 * @returns Formatted string (e.g., "160 lb")
 */
export function formatPounds(pounds: number): string {
  return `${Math.round(pounds)} lb`;
}

/**
 * Format weight in kilograms with proper symbol
 * @param kg - Weight in kilograms
 * @returns Formatted string (e.g., "72.5 kg")
 */
export function formatKg(kg: number): string {
  return `${kg.toFixed(1)} kg`;
}

/**
 * Format height in centimeters with proper symbol
 * @param cm - Height in centimeters
 * @returns Formatted string (e.g., "178 cm")
 */
export function formatCm(cm: number): string {
  return `${Math.round(cm)} cm`;
}