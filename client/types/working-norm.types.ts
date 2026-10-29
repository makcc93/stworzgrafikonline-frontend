/**
 * Working Norm — Types
 * Backend module: calendar.workingNorm
 *
 * Miesięczna norma godzin pracy ustalana ręcznie przez administratora
 * (wcześniej wyliczana z kalendarza: dni robocze * 8h).
 * Norma jest jedna dla całej sieci i wpływa m.in. na draft (/monthlyNorm),
 * limity godzin w algorytmie grafiku oraz potwierdzanie godzin pracowników.
 */

/** Zakres lat obsługiwany przez backend (WorkingNormServiceImpl) */
export const WORKING_NORM_MIN_YEAR = 2001;
export const WORKING_NORM_MAX_YEAR = 2099;

/** Maksymalna dozwolona wartość normy miesięcznej (31 dni * 24h) — zgodnie z @Max(744) w backendzie */
export const WORKING_NORM_MAX_HOURS = 744;

/** Backend DTO: WorkingNormResponse */
export interface WorkingNormResponse {
  year: number;
  /** 1-12 (konwencja backendu) */
  month: number;
  /** Obowiązująca norma miesiąca */
  hours: number;
  /** Wartość domyślna (dni robocze * 8h z uwzgl. świąt) — do porównania z `hours` */
  standardHours: number;
  /** false = miesiąc nie ma jeszcze zapisanego rekordu (pokazano wartość domyślną) */
  persisted: boolean;
  createdAt: string | null;
  createdByUserId: number | null;
  createdByLabel: string | null;
  updatedAt: string | null;
  updatedByUserId: number | null;
  updatedByLabel: string | null;
}

/** Backend DTO: WorkingNormRequest (PATCH /api/workingNorm/{year}/{month}) */
export interface WorkingNormRequest {
  hours: number;
}

/** Backend DTO: WorkingNormInitializationResponse (POST /api/workingNorm/initialize) */
export interface WorkingNormInitializationResponse {
  /** ile miesięcy dodano */
  created: number;
  /** ile miesięcy już istniało i zostało pominięte (nieruszane) */
  skipped: number;
}
