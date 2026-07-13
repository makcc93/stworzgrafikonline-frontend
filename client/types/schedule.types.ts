import { ScheduleStatus } from '@/types/shared.types';
import type { LocalDate, LocalDateTime, Page, PaginationParams } from '@/types/shared.types';

/**
 * Schedule Module Types
 * Represents work schedules for stores
 */

/**
 * Response Schedule DTO
 * Backend DTO: ResponseScheduleDTO
 */
export interface ResponseScheduleDTO {
  id: number;
  storeId: number;
  year: number;
  month: number;
  name: string;
  createdAt: LocalDateTime;
  createdByUserId: number;
  createdByLabel: string; // migawka roli+zakresu z momentu utworzenia, np. "Kierownik Sklepu Puławy F7"
  updatedAt: LocalDateTime | null;
  updatedByUserId: number | null;
  updatedByLabel: string | null; // migawka z momentu ostatniej edycji; null, jeśli nigdy nie edytowano
  scheduleStatusName: ScheduleStatus;
}

/**
 * Create Schedule DTO
 * Backend DTO: CreateScheduleDTO
 *
 * UWAGA: createdByUserId NIE jest tu wysyłany przez frontend — backend musi
 * sam wyznaczyć autora z aktualnie zalogowanego użytkownika (tak jak w
 * Vacations/Delegations/Proposals), a nie ufać wartości przysłanej w body.
 */
export interface CreateScheduleDTO {
  year: number;
  month: number;
  name?: string;
  scheduleStatusName: ScheduleStatus;
}

/**
 * Update Schedule DTO
 * Backend DTO: UpdateScheduleDTO
 *
 * UWAGA: updatedByUserId NIE jest tu wysyłany przez frontend — z tego samego
 * powodu co createdByUserId w CreateScheduleDTO.
 */
export interface UpdateScheduleDTO {
  storeId?: number;
  year?: number;
  month?: number;
  name?: string;
  updatedAt?: LocalDateTime;
}

/**
 * Schedule Specification DTO
 * Backend DTO: ScheduleSpecificationDTO
 * All fields optional for filtering
 */
export interface ScheduleSpecificationDTO {
  scheduleId?: number;
  year?: number;
  month?: number;
  name?: string;
  createdAt?: LocalDateTime;
  createdByUserId?: number;
  updatedAt?: LocalDateTime;
  updatedByUserId?: number;
  scheduleStatusName?: ScheduleStatus;
}

// Re-export for convenience
export { ScheduleStatus, Page, PaginationParams };

/**
 * Possible shift types — mirrors backend ShiftCode enum
 */
export type ShiftCode =
  | 'WORK'
  | 'WORK_BY_PROPOSAL'
  | 'VACATION'
  | 'DAY_OFF'
  | 'SICK_LEAVE'
  | 'DELEGATION';

/**
 * Response Schedule Details DTO
 * Backend DTO: ResponseScheduleDetailsDTO
 *
 * startHour / endHour / shiftCode są mapowane bezpośrednio z encji Shift i ShiftTypeConfig.
 * defaultHours — godziny z ShiftTypeConfig, używane dla VACATION/SICK_LEAVE
 * (te typy mają shift 00:00→00:00, więc godziny są przechowywane w konfiguracji).
 */
export interface ResponseScheduleDetailsDTO {
  id: number;
  scheduleId: number;
  employeeId: number;
  date: LocalDate;           // "YYYY-MM-DD"
  shiftId: number;
  shiftTypeConfigId: number;
  startHour: string;         // "HH:MM:SS"  (LocalTime → string)
  endHour: string;           // "HH:MM:SS"
  shiftCode: ShiftCode;      // WORK | VACATION | DAY_OFF | ...
  defaultHours: number | null; // godziny z ShiftTypeConfig — dla urlopu/L4
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime | null;
}

/**
 * Create Schedule Details DTO
 * Backend DTO: CreateScheduleDetailsDTO
 */
export interface CreateScheduleDetailsDTO {
  employeeId: number;
  date: LocalDate;  // "YYYY-MM-DD"
  shiftId: number;
  shiftTypeConfigId: number;
}

/**
 * Update Schedule Details DTO
 * Backend DTO: UpdateScheduleDetailsDTO
 */
export interface UpdateScheduleDetailsDTO {
  employeeId?: number;
  date?: LocalDate;  // "YYYY-MM-DD"
  shiftId?: number;
  shiftTypeConfigId?: number;
}