import type { LocalDateTime } from '@/types/shared.types';

/**
 * Employee Vacation Module Types
 * Represents employee vacation days per month
 */

/**
 * Response Employee Vacation DTO
 * Backend DTO: ResponseEmployeeVacationDTO
 */
export interface ResponseEmployeeVacationDTO {
  id: number;
  storeId: number;
  employeeId: number;
  year: number; // 2000-2099
  month: number; // 1-12 (backend uses 1-indexed months!)
  monthlyVacation: number[]; // ALWAYS 31 elements (0 or 1)
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime | null;
  createdByUserId: number;
  createdByLabel: string; // migawka roli+zakresu z momentu utworzenia, np. "Kierownik Sklepu Puławy F7"
  updatedByUserId: number | null;
  updatedByLabel: string | null; // migawka z momentu ostatniej edycji; null, jeśli nigdy nie edytowano
}

export interface CreateEmployeeVacationDTO {
  year: number; // 2000-2099
  month: number; // 1-12
  monthlyVacation: number[]; // Must be exactly 31 elements
}

/**
 * Update Employee Vacation DTO
 * Backend DTO: UpdateEmployeeVacationDTO
 */
export interface UpdateEmployeeVacationDTO {
  year: number;
  month: number;
  monthlyVacation: number[]; // 31 elements
  updatedAt?: LocalDateTime;
}

export interface EmployeeVacationSpecificationDTO {
  employeeId?: number;
  year?: number;
  month?: number;
}

/**
 * Vacation data organized by employee, year, month
 */
export interface VacationsByEmployee {
  [employeeId: string]: {
    [yearMonth: string]: ResponseEmployeeVacationDTO; // key: "2025-2" = Feb 2025
  };
}

/**
 * Create empty vacation array (all days working)
 */
export function createEmptyVacationArray(): number[] {
  return Array(31).fill(0);
}

/**
 * Validate vacation array (must be 31 elements, values 0 or 1)
 */
export function isValidVacationArray(arr: number[]): boolean {
  return (
    Array.isArray(arr) &&
    arr.length === 31 &&
    arr.every((val) => val === 0 || val === 1)
  );
}

/**
 * Count vacation days in array
 */
export function countVacationDays(monthlyVacation: number[]): number {
  return monthlyVacation.filter((day) => day === 1).length;
}

/**
 * Toggle vacation for specific day (1-31)
 */
export function toggleVacationDay(
  monthlyVacation: number[],
  day: number
): number[] {
  if (day < 1 || day > 31) {
    throw new Error('Day must be between 1 and 31');
  }

  const newArray = [...monthlyVacation];
  const index = day - 1; // Convert to 0-indexed
  newArray[index] = newArray[index] === 1 ? 0 : 1;
  return newArray;
}

/**
 * Set vacation for day range (inclusive)
 */
export function setVacationRange(
  monthlyVacation: number[],
  startDay: number,
  endDay: number,
  value: 0 | 1
): number[] {
  if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
    throw new Error('Days must be between 1 and 31');
  }

  const newArray = [...monthlyVacation];
  const minDay = Math.min(startDay, endDay);
  const maxDay = Math.max(startDay, endDay);

  for (let day = minDay; day <= maxDay; day++) {
    newArray[day - 1] = value;
  }

  return newArray;
}

/**
 * Check if specific day is vacation
 */
export function isVacationDay(monthlyVacation: number[], day: number): boolean {
  if (day < 1 || day > 31) return false;
  return monthlyVacation[day - 1] === 1;
}

/**
 * Convert frontend key format to year/month
 * OLD format: "month-year-employeeId-day" (0-indexed month)
 * NEW format: use year (number) and month (1-12)
 */
export function parseYearMonth(yearMonth: string): { year: number; month: number } {
  const [year, month] = yearMonth.split('-').map(Number);
  return { year, month };
}

/**
 * Format year/month to key
 * Format: "2025-2" = February 2025
 */
export function formatYearMonth(year: number, month: number): string {
  return `${year}-${month}`;
}

/**
 * Get number of days in month (accounting for leap years)
 */
export function getDaysInMonth(year: number, month: number): number {
  // month is 1-12, JavaScript Date expects 0-11
  return new Date(year, month, 0).getDate();
}

/**
 * Map backend vacation to UI-friendly format
 */
export function mapToVacationWithStats(
  vacation: ResponseEmployeeVacationDTO
): ResponseEmployeeVacationDTO & {
  vacationDays: number;
  workingDays: number;
  daysInMonth: number;
} {
  const vacationDays = countVacationDays(vacation.monthlyVacation);
  const daysInMonth = getDaysInMonth(vacation.year, vacation.month);
  const workingDays = daysInMonth - vacationDays;

  return {
    ...vacation,
    vacationDays,
    workingDays,
    daysInMonth,
  };
}

export const VACATION_VALIDATION = {
  year: {
    min: 2000,
    max: 2099,
    message: 'Rok musi być między 2000 a 2099',
  },
  month: {
    min: 1,
    max: 12,
    message: 'Miesiąc musi być między 1 a 12',
  },
  monthlyVacation: {
    length: 31,
    values: [0, 1],
    message: 'Tablica urlopów musi mieć dokładnie 31 elementów (wartości 0 lub 1)',
  },
} as const;

export const MOCK_VACATIONS: ResponseEmployeeVacationDTO[] = [
  {
    id: 1,
    storeId: 1,
    employeeId: 1,
    year: 2025,
    month: 2, // February
    monthlyVacation: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 1, 1, 1, 1, 1, 0,
    ], // Vacation days 26-30
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: null,
    createdByUserId: 1,
    createdByLabel: 'Administrator',
    updatedByUserId: null,
    updatedByLabel: null,
  },
  {
    id: 2,
    storeId: 1,
    employeeId: 2,
    year: 2025,
    month: 2,
    monthlyVacation: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ], // Vacation days 11-15
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: null,
    createdByUserId: 1,
    createdByLabel: 'Administrator',
    updatedByUserId: null,
    updatedByLabel: null,
  },
  {
    id: 3,
    storeId: 1,
    employeeId: 3,
    year: 2025,
    month: 3, // March
    monthlyVacation: [
      1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ], // Vacation days 1-7
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: null,
    createdByUserId: 1,
    createdByLabel: 'Administrator',
    updatedByUserId: null,
    updatedByLabel: null,
  },
];