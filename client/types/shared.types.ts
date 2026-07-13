/**
 * Shared Types
 * Common types used across all modules
 */

/** Day of week enum as string values from Java backend */
export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

/** Schedule status enum */
export enum ScheduleStatus {
  DONE = 'DONE',
  IN_PROGRESS = 'IN_PROGRESS',
  DELETED = 'DELETED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

/** Generic pagination page interface */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  isEmpty: boolean;
  isFirst: boolean;
  isLast: boolean;
}

/** Pagination parameters for API requests */
export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}

/** LocalTime from Java backend arrives as string "HH:MM:SS" */
export type LocalTime = string;

/** LocalDate from Java backend arrives as string "YYYY-MM-DD" */
export type LocalDate = string;

/** LocalDateTime from Java backend arrives as ISO 8601 string */
export type LocalDateTime = string;
