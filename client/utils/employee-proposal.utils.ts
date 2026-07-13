/**
 * Employee Proposal Utilities
 */

/**
 * Validate days off array
 */
export function isValidDaysOffArray(arr: number[]): boolean {
  return Array.isArray(arr) && arr.length === 31 && arr.every(v => v === 0 || v === 1);
}

/**
 * Validate shift array
 */
export function isValidShiftArray(arr: number[]): boolean {
  return Array.isArray(arr) && arr.length === 24 && arr.every(v => Number.isInteger(v) && v >= 0);
}