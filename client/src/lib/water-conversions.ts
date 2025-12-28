/**
 * Water intake unit conversions
 * Base unit: Liters (L)
 */

export type WaterUnit = "liters" | "cups" | "fl_oz";

// Conversion constants
const LITERS_TO_CUPS = 4.227; // 1 liter ≈ 4.227 US cups
const LITERS_TO_FL_OZ = 33.814; // 1 liter ≈ 33.814 US fl oz

/**
 * Convert liters to cups
 */
export function litersToCups(liters: number | null): number | null {
  if (liters === null || liters === undefined) return null;
  return Math.round(liters * LITERS_TO_CUPS * 10) / 10;
}

/**
 * Convert cups to liters
 */
export function cupsToLiters(cups: number | null): number | null {
  if (cups === null || cups === undefined) return null;
  return Math.round((cups / LITERS_TO_CUPS) * 10) / 10;
}

/**
 * Convert liters to fl oz
 */
export function litersToFlOz(liters: number | null): number | null {
  if (liters === null || liters === undefined) return null;
  return Math.round(liters * LITERS_TO_FL_OZ);
}

/**
 * Convert fl oz to liters
 */
export function flOzToLiters(flOz: number | null): number | null {
  if (flOz === null || flOz === undefined) return null;
  return Math.round((flOz / LITERS_TO_FL_OZ) * 10) / 10;
}

/**
 * Format water intake value with unit label
 */
export function formatWaterIntake(value: number | null, unit: WaterUnit): string {
  if (value === null || value === undefined) return "N/A";
  
  switch (unit) {
    case "liters":
      return `${value.toFixed(1)}L`;
    case "cups":
      return `${value.toFixed(1)} cups`;
    case "fl_oz":
      return `${Math.round(value)} fl oz`;
    default:
      return `${value}`;
  }
}

/**
 * Convert from liters to target unit
 */
export function convertFromLiters(liters: number | null, targetUnit: WaterUnit): number | null {
  if (liters === null || liters === undefined) return null;
  
  switch (targetUnit) {
    case "liters":
      return liters;
    case "cups":
      return litersToCups(liters);
    case "fl_oz":
      return litersToFlOz(liters);
    default:
      return liters;
  }
}

/**
 * Convert from any unit to liters (for storage)
 */
export function convertToLiters(value: number | null, sourceUnit: WaterUnit): number | null {
  if (value === null || value === undefined) return null;
  
  switch (sourceUnit) {
    case "liters":
      return value;
    case "cups":
      return cupsToLiters(value);
    case "fl_oz":
      return flOzToLiters(value);
    default:
      return value;
  }
}

/**
 * Get unit label for display
 */
export function getWaterUnitLabel(unit: WaterUnit): string {
  switch (unit) {
    case "liters":
      return "Liters (L)";
    case "cups":
      return "Cups";
    case "fl_oz":
      return "Fluid Ounces (fl oz)";
    default:
      return unit;
  }
}
