import { DayOfWeek } from '@/types/shared.types';
import type { LocalTime } from '@/types/shared.types';

/**
 * Store Opening Hours Module Types
 * Represents store opening hours per day of week
 */

/**
 * Day Hours DTO
 * Backend DTO: DayHours
 * Represents opening hours for a single day
 */
export interface DayHours {
  open: LocalTime;  // "HH:MM:SS" format
  close: LocalTime; // "HH:MM:SS" format
}

/**
 * Store Opening Hours DTO
 * Map of DayOfWeek to DayHours
 * Backend returns: Map<DayOfWeek, DayHours> as plain JS object
 */
export type StoreOpeningHoursDTO = Record<DayOfWeek, DayHours>;

// Re-export for convenience
export { DayOfWeek };
