/**
 * Demand Draft Module Types
 * Represents demand planning for employees across 24-hour periods
 * Draft = plan zapotrzebowania na pracowników w danym dniu
 */
 
// ==================== BACKEND DTOs ====================
 
/**
 * Backend response for a single demand draft
 * @property id - Unique identifier
 * @property storeId - Associated store
 * @property draftDate - Specific date (LocalDate format: YYYY-MM-DD)
 * @property hourlyDemand - Array of exactly 24 elements (index 0-23 represents hours)
 * @property createdAt - Creation timestamp
 * @property updatedAt - Last update timestamp (nullable)
 */
export interface ResponseDemandDraftDTO {
  id: number;
  storeId: number;
  draftDate: string; // LocalDate format: "2025-02-20"
  hourlyDemand: number[]; // ALWAYS 24 elements
  createdAt: string; // ISO 8601
  updatedAt: string | null; // ISO 8601
  createdByUserId: number;
  createdByLabel: string; // migawka roli+zakresu z momentu utworzenia, np. "Kierownik Sklepu Puławy F7"
  updatedByUserId: number | null;
  updatedByLabel: string | null; // migawka z momentu ostatniej edycji; null, jeśli nigdy nie edytowano
}
 
/**
 * Create a new demand draft
 * @property draftDate - Target date in YYYY-MM-DD format
 * @property hourlyDemand - Exactly 24 elements representing hours 0-23
 */
export interface CreateDemandDraftDTO {
  draftDate: string; // "YYYY-MM-DD"
  hourlyDemand: number[]; // Must be exactly 24 elements
}
 
/**
 * Update existing demand draft
 * @property draftDate - Target date in YYYY-MM-DD format
 * @property hourlyDemand - Exactly 24 elements representing hours 0-23
 */
export interface UpdateDemandDraftDTO {
  draftDate: string; // "YYYY-MM-DD"
  hourlyDemand: number[]; // Must be exactly 24 elements
}
 
// ==================== UI HELPER INTERFACES ====================
 
/**
 * Template for a specific day of week
 * Used in UI before saving to database
 * Allows defining patterns like "all Mondays have this demand"
 */
export interface DayOfWeekTemplate {
  dayOfWeek: number; // 0=Niedziela, 1=Poniedziałek, ..., 6=Sobota
  dayName: string; // "Poniedziałek", "Wtorek", etc.
  hourlyDemand: number[]; // Exactly 24 elements
}
 
/**
 * Bulk create request - creates drafts for multiple days based on templates
 * Generates drafts for all Mondays, all Tuesdays, etc. in a given month
 */
export interface BulkCreateDraftsDTO {
  storeId: number;
  year: number;
  month: number; // 0-indexed (0=Styczeń, 11=Grudzień)
  templates: DayOfWeekTemplate[];
}
 
/**
 * Draft with additional metadata for UI display
 * Extends ResponseDemandDraftDTO with computed UI-friendly fields
 */
export interface DraftWithMetadata extends ResponseDemandDraftDTO {
  dayOfWeek: number; // 0-6
  dayOfWeekName: string; // "Poniedziałek", "Wtorek", etc.
  totalDemand: number; // Sum of hourlyDemand[0-23]
  peakHour: number; // Hour with highest demand
  peakDemand: number; // Value at peak hour
}
 
/**
 * Draft statistics for analytics
 */
export interface DraftStats {
  total: number;
  average: number;
  peak: { hour: number; demand: number };
  min: { hour: number; demand: number };
}
 
/**
 * Pagination parameters for draft queries
 */
export interface DraftPaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}
 
/**
 * API response wrapper for paginated draft results
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
 
// ==================== HELPER FUNCTIONS ====================
 
/**
 * Create an empty draft (all hours = 0)
 * Useful for initializing new drafts
 */
export function createEmptyDraft(): number[] {
  return Array(24).fill(0);
}
 
/**
 * Create a sample draft with typical business pattern
 * 06:00-08:00 = 5 employees (opening)
 * 08:00-20:00 = 10 employees (main hours)
 * 20:00-22:00 = 5 employees (closing)
 * Other hours = 2 employees (minimal staff)
 */
export function createSampleDraft(): number[] {
  const draft = Array(24).fill(2);
  // 06:00-08:00 (index 6-7)
  draft[6] = 5;
  draft[7] = 5;
  // 08:00-20:00 (index 8-19)
  for (let i = 8; i < 20; i++) {
    draft[i] = 10;
  }
  // 20:00-22:00 (index 20-21)
  draft[20] = 5;
  draft[21] = 5;
  return draft;
}
 
/**
 * Validates that hourly demand has exactly 24 elements
 * @param hourlyDemand - Array to validate
 * @returns true if valid, false otherwise
 */
export function isValidHourlyDemand(hourlyDemand: number[]): boolean {
  return Array.isArray(hourlyDemand) && hourlyDemand.length === 24;
}
 
/**
 * Validates that all values in hourly demand are within valid range
 * @param hourlyDemand - Array to validate
 * @param max - Maximum allowed value per hour
 * @returns true if all values are valid
 */
export function isValidHourlyDemandValues(
  hourlyDemand: number[],
  max: number = 100
): boolean {
  return (
    isValidHourlyDemand(hourlyDemand) &&
    hourlyDemand.every((val) => typeof val === 'number' && val >= 0 && val <= max)
  );
}
 
/**
 * Calculate statistics for a draft
 * @param hourlyDemand - Array of 24 hourly values
 * @returns Statistics including total, average, peak, and minimum
 */
export function calculateDraftStats(hourlyDemand: number[]): DraftStats {
  if (!isValidHourlyDemand(hourlyDemand)) {
    throw new Error('Invalid hourly demand: must have exactly 24 elements');
  }
 
  const total = hourlyDemand.reduce((sum, val) => sum + val, 0);
  const average = total / 24;
 
  const peakHour = hourlyDemand.indexOf(Math.max(...hourlyDemand));
  const minHour = hourlyDemand.indexOf(Math.min(...hourlyDemand));
 
  return {
    total,
    average: Math.round(average * 10) / 10,
    peak: { hour: peakHour, demand: hourlyDemand[peakHour] },
    min: { hour: minHour, demand: hourlyDemand[minHour] },
  };
}
 
/**
 * Format hour number to time string
 * @param hour - Hour number (0-23)
 * @returns Formatted time string (e.g., "00:00", "13:00")
 */
export function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}
 
/**
 * Format Date object to backend format (YYYY-MM-DD)
 * @param date - JavaScript Date object
 * @returns Formatted date string
 */
export function formatDateForBackend(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
 
/**
 * Parse backend date string (YYYY-MM-DD) to Date object
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns JavaScript Date object (midnight)
 */
export function parseDateFromBackend(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}
 
/**
 * Get day of week name in Polish
 * @param dayOfWeek - Day number (0=Niedziela, 6=Sobota)
 * @returns Polish day name
 */
export function getDayOfWeekName(dayOfWeek: number): string {
  const names = [
    'Niedziela',
    'Poniedziałek',
    'Wtorek',
    'Środa',
    'Czwartek',
    'Piątek',
    'Sobota',
  ];
  return names[dayOfWeek % 7] || 'Nieznany dzień';
}
 
/**
 * Map backend draft to UI-friendly format with metadata
 * @param draft - Backend response DTO
 * @returns Draft with computed UI fields
 */
export function mapToDraftWithMetadata(
  draft: ResponseDemandDraftDTO
): DraftWithMetadata {
  const date = parseDateFromBackend(draft.draftDate);
  const dayOfWeek = date.getDay();
  const stats = calculateDraftStats(draft.hourlyDemand);
 
  return {
    ...draft,
    dayOfWeek,
    dayOfWeekName: getDayOfWeekName(dayOfWeek),
    totalDemand: stats.total,
    peakHour: stats.peak.hour,
    peakDemand: stats.peak.demand,
  };
}
 
/**
 * Get all dates for a specific day of week in a month
 * Useful for generating drafts for "all Mondays" or "all Tuesdays"
 * @param year - Year
 * @param month - Month (0-indexed: 0=January, 11=December)
 * @param dayOfWeek - Target day (0=Sunday, 6=Saturday)
 * @returns Array of all matching dates in the month
 */
export function getDatesForDayOfWeek(year: number, month: number, dayOfWeek: number): Date[] {
  const dates: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // JS getDay(): 0=niedziela — zgodnie z DEFAULT_DAY_TEMPLATES (dayOfWeek: 0)
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (date.getDay() === dayOfWeek) {
      dates.push(date);
    }
  }
  return dates;
}
 
/**
 * Create a CreateDemandDraftDTO for a specific date
 * @param date - Target date
 * @param hourlyDemand - Demand values for 24 hours
 * @returns DTO ready for backend
 */
export function createDraftDTO(
  date: Date,
  hourlyDemand: number[]
): CreateDemandDraftDTO {
  if (!isValidHourlyDemand(hourlyDemand)) {
    throw new Error('Invalid hourly demand: must have exactly 24 elements');
  }
 
  return {
    draftDate: formatDateForBackend(date),
    hourlyDemand,
  };
}
 
/**
 * Generate all CreateDemandDraftDTOs for a month based on day-of-week templates
 * Useful for bulk draft creation
 * @param year - Year
 * @param month - Month (0-indexed)
 * @param templates - Templates for each day of week
 * @returns Array of DTOs ready for bulk creation
 */
export function generateMonthlyDrafts(
  year: number,
  month: number,
  templates: DayOfWeekTemplate[]
): CreateDemandDraftDTO[] {
  const drafts: CreateDemandDraftDTO[] = [];
 
  for (const template of templates) {
    const dates = getDatesForDayOfWeek(year, month, template.dayOfWeek);
    for (const date of dates) {
      drafts.push(createDraftDTO(date, template.hourlyDemand));
    }
  }
 
  return drafts;
}
 
// ==================== VALIDATION PATTERNS ====================
 
/**
 * Validation rules matching backend constraints
 */
export const DRAFT_VALIDATION = {
  hourlyDemand: {
    length: 24,
    min: 0,
    max: 100, // Maksymalna liczba pracowników na godzinę
    message: 'Zapotrzebowanie musi mieć dokładnie 24 elementy (0-23)',
  },
  draftDate: {
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    message: 'Data musi być w formacie YYYY-MM-DD',
  },
} as const;
 
export const DEFAULT_DAY_TEMPLATES = [
  { dayOfWeek: 1, dayName: 'Poniedziałek', hourlyDemand: Array(24).fill(0) }, // Indeks 0 = Poniedziałek (JS: 1)
  { dayOfWeek: 2, dayName: 'Wtorek',      hourlyDemand: Array(24).fill(0) }, // Indeks 1 = Wtorek (JS: 2)
  { dayOfWeek: 3, dayName: 'Środa',       hourlyDemand: Array(24).fill(0) }, // Indeks 2 = Środa (JS: 3)
  { dayOfWeek: 4, dayName: 'Czwartek',    hourlyDemand: Array(24).fill(0) }, // Indeks 3 = Czwartek (JS: 4)
  { dayOfWeek: 5, dayName: 'Piątek',      hourlyDemand: Array(24).fill(0) }, // Indeks 4 = Piątek (JS: 5)
  { dayOfWeek: 6, dayName: 'Sobota',      hourlyDemand: Array(24).fill(0) }, // Indeks 5 = Sobota (JS: 6)
  { dayOfWeek: 0, dayName: 'Niedziela',   hourlyDemand: Array(24).fill(0) }, // Indeks 6 = Niedziela (JS: 0)
];