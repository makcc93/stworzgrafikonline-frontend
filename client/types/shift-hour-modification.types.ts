import type { LocalTime } from '@/types/shared.types';

/**
 * Shift Hour Modification Config Module Types
 * Represents shift hour mapping and excluded employees configuration
 */

/**
 * Zakres reguły przesunięcia:
 * START — dotyczy tylko zmian, które ZACZYNAJĄ się o originalHour,
 * END   — dotyczy tylko zmian, które KOŃCZĄ się o originalHour,
 * BOTH  — dotyczy obu (zachowanie sprzed wprowadzenia zakresu).
 */
export type ShiftHourScope = 'START' | 'END' | 'BOTH';

/**
 * Backend DTO: ShiftHourModificationDTO
 * Przesuwa godzinę oryginalną na zmienioną w podanym zakresie.
 */
export interface ShiftHourModificationDTO {
  originalHour: LocalTime;  // "HH:MM:SS" format
  modifiedHour: LocalTime;  // "HH:MM:SS" format
  /** Brak pola (starszy backend) = BOTH. */
  scope?: ShiftHourScope;
}

export interface ShiftHourMappingRequest {
  hours: ShiftHourModificationDTO[];
}

export interface ExcludedEmployeesRequest {
  excludedEmployeeIds: number[];
}

export interface ShiftHourModificationConfigResponse {
  hours: ShiftHourModificationDTO[] | null;
  excludedEmployeeIds: number[] | null;
}
