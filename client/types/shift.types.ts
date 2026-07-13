import type { LocalTime } from '@/types/shared.types';

/**
 * Shift Module Types
 * Represents shift/working hours definitions
 */

/**
 * Shift Response DTO
 * Backend DTO: ResponseShiftDTO
 */
export interface ResponseShiftDTO {
  id: number;
  startHour: LocalTime;  // "HH:MM:SS" format
  endHour: LocalTime;    // "HH:MM:SS" format
  length: number;        // Duration in hours
}

/**
 * Shift Hours DTO
 * Backend DTO: ShiftHoursDTO
 * Used for creating/updating shifts
 */
export interface ShiftHoursDTO {
  startHour: LocalTime | null;  // "HH:MM:SS" format
  endHour: LocalTime | null;    // "HH:MM:SS" format
}

/**
 * Shift Criteria DTO
 * Backend DTO: ShiftCriteriaDTO
 * Used for filtering shifts
 */
export interface ShiftCriteriaDTO {
  startHour?: LocalTime;  // "HH:MM:SS" format
  endHour?: LocalTime;    // "HH:MM:SS" format
}
