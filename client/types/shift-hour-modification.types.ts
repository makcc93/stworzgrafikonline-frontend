import type { LocalTime } from '@/types/shared.types';

/**
 * Shift Hour Modification Config Module Types
 * Represents shift hour mapping and excluded employees configuration
 */

/**
 * Shift Hour Modification DTO
 * Backend DTO: ShiftHourModificationDTO
 * Maps an original hour to a modified hour
 */
export interface ShiftHourModificationDTO {
  originalHour: LocalTime;  // "HH:MM:SS" format
  modifiedHour: LocalTime;  // "HH:MM:SS" format
}

/**
 * Shift Hour Mapping Request
 * Backend DTO: ShiftHourMappingRequest
 * Request body for updating hour mappings
 */
export interface ShiftHourMappingRequest {
  hours: ShiftHourModificationDTO[];
}

/**
 * Excluded Employees Request
 * Backend DTO: ExcludedEmployeesRequest
 * Request body for updating excluded employees
 */
export interface ExcludedEmployeesRequest {
  excludedEmployeeIds: number[];
}

/**
 * Shift Hour Modification Config Response
 * Backend DTO: ShiftHourModificationConfigResponse
 * Response containing both hour mappings and excluded employees
 */
export interface ShiftHourModificationConfigResponse {
  hours: ShiftHourModificationDTO[] | null;
  excludedEmployeeIds: number[] | null;
}
