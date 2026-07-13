import type { LocalDate, LocalDateTime } from '@/types/shared.types';

/**
 * Employee Proposals Module Types
 * Combines two proposal types: DaysOff (monthly) and Shifts (daily)
 */

// ==================== SHIFT ENTITY ====================

/**
 * Shift definition from backend
 * Represents working hours (e.g., 08:00-20:00)
 */
export interface ResponseShiftDTO {
  id: number;
  startHour: string; // "08:00" format
  endHour: string;   // "20:00" format
  length: number;    // Hours duration
}

/**
 * Create/update shift
 */
export interface ShiftHoursDTO {
  startHour: string; // "08:00"
  endHour: string;   // "20:00"
}

// ==================== DAYS OFF ENTITY ====================

/**
 * Employee proposal for monthly free days
 * Similar to Vacation but for proposals
 */
/**
 * Response Employee Proposal DaysOff DTO
 * Backend DTO: ResponseEmployeeProposalDaysOffDTO
 */
export interface ResponseEmployeeProposalDaysOffDTO {
  id: number;
  storeId: number;
  employeeId: number;
  year: number;        // 2000-2099
  month: number;       // 1-12 (1-indexed!)
  monthlyDaysOff: number[]; // Always 31 elements (0=work, 1=day off)
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime | null;
  createdByUserId: number;
  createdByLabel: string; // migawka roli+zakresu z momentu utworzenia, np. "Kierownik Sklepu Puławy F7"
  updatedByUserId: number | null;
  updatedByLabel: string | null; // migawka z momentu ostatniej edycji; null, jeśli nigdy nie edytowano
}

/**
 * Create Employee Proposal DaysOff DTO
 * Backend DTO: CreateEmployeeProposalDaysOffDTO
 */
export interface CreateEmployeeProposalDaysOffDTO {
  year: number;        // 2000-2099
  month: number;       // 1-12
  monthlyDaysOff: number[]; // Must be exactly 31 elements
}

/**
 * Update Employee Proposal DaysOff DTO
 * Backend DTO: UpdateEmployeeProposalDaysOffDTO
 */
export interface UpdateEmployeeProposalDaysOffDTO {
  year: number;
  month: number;
  monthlyDaysOff: number[]; // 31 elements
  updatedAt?: LocalDateTime | null;
}

/**
 * Employee Proposal DaysOff Specification DTO
 * Backend DTO: EmployeeProposalDaysOffSpecificationDTO
 * All fields optional for filtering
 */
export interface EmployeeProposalDaysOffSpecificationDTO {
  employeeId?: number;
  year?: number;
  month?: number;
}

// ==================== SHIFTS ENTITY ====================

/**
 * Response Employee Proposal Shifts DTO
 * Backend DTO: ResponseEmployeeProposalShiftsDTO
 * Contains shift IDs for each hour (0-23)
 */
export interface ResponseEmployeeProposalShiftsDTO {
  id: number;
  storeId: number;
  employeeId: number;
  date: LocalDate;     // "YYYY-MM-DD"
  dailyProposalShift: number[]; // Always 24 elements (shift IDs)
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime | null;
  createdByUserId: number;
  createdByLabel: string; // migawka roli+zakresu z momentu utworzenia, np. "Kierownik Sklepu Puławy F7"
  updatedByUserId: number | null;
  updatedByLabel: string | null; // migawka z momentu ostatniej edycji; null, jeśli nigdy nie edytowano
}

/**
 * Create Employee Proposal Shifts DTO
 * Backend DTO: CreateEmployeeProposalShiftsDTO
 */
export interface CreateEmployeeProposalShiftsDTO {
  date: LocalDate;     // "YYYY-MM-DD"
  dailyProposalShift: number[]; // Must be exactly 24 elements
}

/**
 * Update Employee Proposal Shifts DTO
 * Backend DTO: UpdateEmployeeProposalShiftsDTO
 */
export interface UpdateEmployeeProposalShiftsDTO {
  date: LocalDate;     // "YYYY-MM-DD"
  dailyProposalShift: number[]; // 24 elements
  updatedAt?: LocalDateTime | null;
}

/**
 * Employee Proposal Shifts Specification DTO
 * Backend DTO: EmployeeProposalShiftsSpecificationDTO
 * All fields optional for filtering
 */
export interface EmployeeProposalShiftsSpecificationDTO {
  employeeId?: number;
  startDate?: LocalDate; // "YYYY-MM-DD"
  endDate?: LocalDate;   // "YYYY-MM-DD"
}

// ==================== UI HELPER TYPES ====================

/**
 * Combined cell value (used in UI)
 */
export type CellValue = 
  | { type: 'empty' }
  | { type: 'dayOff' }  // Free day ("W")
  | { type: 'shift'; shiftId: number; startHour: string; endHour: string };

/**
 * Pending changes for batch save
 */
export interface PendingDaysOff {
  employeeId: number;
  monthlyDaysOff: number[];
}

export interface PendingShift {
  employeeId: number;
  date: string;
  dailyProposalShift: number[];
}

/**
 * Pagination params
 */
export interface ProposalPaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}

/**
 * Page wrapper
 */
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

// ==================== HELPER FUNCTIONS - DAYS OFF ====================

/**
 * Create empty days off array (all working days)
 */
export function createEmptyDaysOffArray(): number[] {
  return Array(31).fill(0);
}

/**
 * Validate days off array
 */
export function isValidDaysOffArray(arr: number[]): boolean {
  return Array.isArray(arr) && arr.length === 31 && arr.every(v => v === 0 || v === 1);
}

/**
 * Toggle day off for specific day
 */
export function toggleDayOff(monthlyDaysOff: number[], day: number): number[] {
  if (day < 1 || day > 31) {
    throw new Error('Day must be between 1 and 31');
  }
  
  const newArray = [...monthlyDaysOff];
  const index = day - 1;
  newArray[index] = newArray[index] === 1 ? 0 : 1;
  return newArray;
}

/**
 * Check if day is marked as day off
 */
export function isDayOff(monthlyDaysOff: number[], day: number): boolean {
  if (day < 1 || day > 31 || !monthlyDaysOff || monthlyDaysOff.length !== 31) {
    return false;
  }
  return monthlyDaysOff[day - 1] === 1;
}

/**
 * Set day off for specific day
 */
export function setDayOff(monthlyDaysOff: number[], day: number, isDayOff: boolean): number[] {
  if (day < 1 || day > 31) {
    throw new Error('Day must be between 1 and 31');
  }
  
  const newArray = [...monthlyDaysOff];
  newArray[day - 1] = isDayOff ? 1 : 0;
  return newArray;
}

// ==================== HELPER FUNCTIONS - SHIFTS ====================

/**
 * Create empty shift array (no shifts)
 */
export function createEmptyShiftArray(): number[] {
  return Array(24).fill(0);
}

/**
 * Validate shift array
 */
export function isValidShiftArray(arr: number[]): boolean {
  return Array.isArray(arr) && arr.length === 24 && arr.every(v => Number.isInteger(v) && v >= 0);
}

/**
 * Create shift array from shift hours
 * @param shiftId - ID of the shift
 * @param startHour - Start hour (0-23)
 * @param endHour - End hour (1-24, exclusive)
 * @returns Array with shiftId for hours in range, 0 otherwise
 * 
 * Example: createShiftArray(5, 8, 20) 
 * Returns: [0,0,0,0,0,0,0,0,5,5,5,5,5,5,5,5,5,5,5,5,0,0,0,0]
 *          hours 8-19 (8:00-19:59) = shift id 5
 */
export function createShiftArray(shiftId: number, startHour: number, endHour: number): number[] {
  if (startHour < 0 || startHour >= 24) {
    throw new Error('Start hour must be 0-23');
  }
  if (endHour < 1 || endHour > 24) {
    throw new Error('End hour must be 1-24');
  }
  if (endHour <= startHour) {
    throw new Error('End hour must be greater than start hour');
  }
  
  const array = Array(24).fill(0);
  for (let hour = startHour; hour < endHour; hour++) {
    array[hour] = 1; // tablica to bitmapa 0/1 — shiftId NIE jest przechowywany w tablicy
  }
  return array;
}

/**
 * Parse shift hours from "HH:MM" string to hour number
 */
export function parseHourString(hourStr: string): number {
  // Support both "HH:MM" and "HH:MM:SS" formats
  const match = hourStr.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw new Error(`Invalid hour format: ${hourStr}. Expected HH:MM or HH:MM:SS`);
  }
  return parseInt(match[1], 10);
}

/**
 * Get shift info from daily array
 * Returns null if no shift, or { shiftId, startHour, endHour }
 */
export function getShiftInfo(dailyProposalShift: number[]): { startHour: number; endHour: number } | null {
  if (!isValidShiftArray(dailyProposalShift)) return null;

  // Tablica to bitmapa 0/1 — szukamy pierwszej i ostatniej pozycji z wartością 1
  const startHour = dailyProposalShift.indexOf(1);
  if (startHour === -1) return null;

  // endHour = indeks ostatniego 1 + 1 (exclusive)
  const endHour = dailyProposalShift.lastIndexOf(1) + 1;

  return { startHour, endHour };
}

/**
 * Format hour to "HH:MM" string
 */
export function formatHourString(hour: number): string {
  if (hour < 0 || hour > 24) {
    throw new Error('Hour must be 0-24');
  }
  return `${hour.toString().padStart(2, '0')}:00:00`; // Include seconds for backend compatibility
}

// ==================== HELPER FUNCTIONS - DATE ====================

/**
 * Format Date to "YYYY-MM-DD" for backend
 */
export function formatDateForBackend(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse "YYYY-MM-DD" to Date
 */
export function parseDateFromBackend(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Get days in month
 */
export function getDaysInMonth(year: number, month: number): number {
  // month is 1-indexed (1-12)
  return new Date(year, month, 0).getDate();
}

// ==================== UI MAPPING FUNCTIONS ====================

/**
 * Get cell value from both DaysOff and Shifts data
 * Priority: Shift > DayOff > Empty
 */
export function getCellValue(
  employeeId: number,
  day: number,
  year: number,
  month: number, // 1-indexed
  daysOffList: ResponseEmployeeProposalDaysOffDTO[],
  shiftsList: ResponseEmployeeProposalShiftsDTO[],
  shiftsMap: Map<number, ResponseShiftDTO>
): CellValue {
  // Priority 1: Check for shift proposal
  const date = new Date(year, month - 1, day);
  const dateStr = formatDateForBackend(date);
  
  const shiftProposal = shiftsList.find(
    s => s.employeeId === employeeId && s.date === dateStr
  );
  
  if (shiftProposal) {
    const shiftInfo = getShiftInfo(shiftProposal.dailyProposalShift);
    if (shiftInfo) {
      // Tablica to bitmapa — szukamy pasującego shiftu po godzinach
      const shift = Array.from(shiftsMap.values()).find(s =>
        parseInt(s.startHour.split(':')[0], 10) === shiftInfo.startHour &&
        parseInt(s.endHour.split(':')[0], 10)   === shiftInfo.endHour
      );
      if (shift) {
        return {
          type: 'shift',
          shiftId: shift.id,
          startHour: shift.startHour,
          endHour: shift.endHour,
        };
      }
    }
  }
  
  // Priority 2: Check for day off
  const daysOff = daysOffList.find(
    d => d.employeeId === employeeId && d.year === year && d.month === month
  );
  
  if (daysOff && isDayOff(daysOff.monthlyDaysOff, day)) {
    return { type: 'dayOff' };
  }
  
  // Empty
  return { type: 'empty' };
}

/**
 * Format cell value for display
 */
export function formatCellDisplay(cellValue: CellValue): string {
  switch (cellValue.type) {
    case 'empty':
      return '';
    case 'dayOff':
      return 'W';
    case 'shift':
      // Format as "08\n20" (2 lines)
      const start = cellValue.startHour.split(':')[0];
      const end = cellValue.endHour.split(':')[0];
      return `${start}\n${end}`;
    default:
      return '';
  }
}

// ==================== VALIDATION ====================

export const PROPOSAL_VALIDATION = {
  daysOff: {
    length: 31,
    values: [0, 1],
    message: 'monthlyDaysOff must have exactly 31 elements (values 0 or 1)',
  },
  shifts: {
    length: 24,
    message: 'dailyProposalShift must have exactly 24 elements',
  },
  year: {
    min: 2000,
    max: 2099,
    message: 'Year must be between 2000 and 2099',
  },
  month: {
    min: 1,
    max: 12,
    message: 'Month must be between 1 and 12',
  },
} as const;

// ==================== MOCK DATA ====================

/**
 * Mock shifts (predefined)
 */
export const MOCK_SHIFTS: ResponseShiftDTO[] = [
  { id: 1, startHour: '00:00:00', endHour: '24:00:00', length: 24 },
  { id: 2, startHour: '08:00:00', endHour: '16:00:00', length: 8 },
  { id: 3, startHour: '08:00:00', endHour: '20:00:00', length: 12 },
  { id: 4, startHour: '06:00:00', endHour: '14:00:00', length: 8 },
  { id: 5, startHour: '14:00:00', endHour: '22:00:00', length: 8 },
  { id: 6, startHour: '16:00:00', endHour: '00:00:00', length: 8 },
];

/**
 * Mock days off for February 2025
 */
export const MOCK_DAYS_OFF: ResponseEmployeeProposalDaysOffDTO[] = [
  {
    id: 1,
    storeId: 1,
    employeeId: 1,
    year: 2025,
    month: 2, // February
    monthlyDaysOff: [
      0, 0, 0, 0, 0, 0, 0, 1, 1, 0, // days 1-10 (8-9 off)
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // days 11-20
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // days 21-31
    ],
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
    monthlyDaysOff: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // days 1-10
      0, 0, 0, 0, 1, 1, 0, 0, 0, 0, // days 11-20 (15-16 off)
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // days 21-31
    ],
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: null,
    createdByUserId: 1,
    createdByLabel: 'Administrator',
    updatedByUserId: null,
    updatedByLabel: null,
  },
];

/**
 * Mock shift proposals for February 2025
 */
export const MOCK_SHIFT_PROPOSALS: ResponseEmployeeProposalShiftsDTO[] = [
  {
    id: 1,
    storeId: 1,
    employeeId: 1,
    date: '2025-02-05',
    dailyProposalShift: createShiftArray(3, 8, 20), // Shift 8-20
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
    date: '2025-02-10',
    dailyProposalShift: createShiftArray(2, 8, 16), // Shift 8-16
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
    date: '2025-02-12',
    dailyProposalShift: createShiftArray(5, 14, 22), // Shift 14-22
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: null,
    createdByUserId: 1,
    createdByLabel: 'Administrator',
    updatedByUserId: null,
    updatedByLabel: null,
  },
];