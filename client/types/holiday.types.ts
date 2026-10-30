/**
 * Holiday (dni wolne / niehandlowe) — Types
 * Backend module: calendar.holidays
 *
 * Rok z wpisami w bazie → baza jest źródłem prawdy; rok bez wpisów → fallback do jollyday.
 * W dniach wolnych draft wynosi 0, a dzień nie wchodzi do dni roboczych / normy.
 */

/** Zakres lat obsługiwany przez backend (HolidayServiceImpl) */
export const HOLIDAY_MIN_YEAR = 2001;
export const HOLIDAY_MAX_YEAR = 2099;
export const HOLIDAY_MAX_NAME_LENGTH = 100;

/** Backend DTO: HolidayResponse (GET /api/holidays/{year}) */
export interface HolidayResponse {
  /** YYYY-MM-DD */
  date: string;
  name: string;
  /** true = dzień dodany ręcznie, false = święto skopiowane z jollyday */
  custom: boolean;
  /** false = rok nie jest jeszcze zapisany w bazie (pokazano święta domyślne) */
  persisted: boolean;
  createdAt: string | null;
  createdByLabel: string | null;
  updatedAt: string | null;
  updatedByLabel: string | null;
}

/** Backend DTO: HolidayCreateRequest (POST /api/holidays) */
export interface HolidayCreateRequest {
  date: string;
  name: string;
}

/** Backend DTO: HolidayUpdateRequest (PATCH /api/holidays/{date}) */
export interface HolidayUpdateRequest {
  name: string;
}

/** Backend DTO: HolidayInitializationResponse (POST /api/holidays/initialize) */
export interface HolidayInitializationResponse {
  initializedYears: number;
  skippedYears: number;
  createdHolidays: number;
}
