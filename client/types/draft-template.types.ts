/**
 * Szablony zapotrzebowania (draftu) — zapisane w bazie per sklep / miesiąc / dzień tygodnia.
 * Backend: /api/stores/{storeId}/draftTemplates
 */

/** java.time.DayOfWeek zwracany przez backend. */
export type ApiDayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

/** Backend (DayOfWeek) → JS getDay(): 0 = niedziela. */
export const API_TO_JS_DAY: Record<ApiDayOfWeek, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

/** JS getDay() (indeks 0-6) → backend (DayOfWeek). */
export const JS_TO_API_DAY: ApiDayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

export interface DemandTemplateResponse {
  /** null = dzień tygodnia bez zapisanego szablonu (persisted = false). */
  id: number | null;
  storeId: number;
  year: number;
  /** 1-12 */
  month: number;
  dayOfWeek: ApiDayOfWeek;
  /** 24 wartości; same zera, gdy szablon nie jest zapisany. */
  hourlyDemand: number[];
  persisted: boolean;
  createdAt: string | null;
  createdByUserId: number | null;
  createdByLabel: string | null;
  updatedAt: string | null;
  updatedByUserId: number | null;
  updatedByLabel: string | null;
}

export interface DemandTemplateApplyResponse {
  created: number;
  updated: number;
  skipped: number;
}

export interface DemandTemplateSaveResponse {
  template: DemandTemplateResponse;
  days: DemandTemplateApplyResponse;
}

export interface DemandTemplateCopyRequest {
  targetYear: number;
  /** 1-12 */
  targetMonth: number;
  /** Pominięte / puste = wszystkie dni tygodnia z zapisanym szablonem. */
  dayOfWeeks?: ApiDayOfWeek[];
}

export interface DemandTemplateCopyResponse {
  copied: number;
  /** Komplet 7 szablonów miesiąca docelowego po skopiowaniu. */
  templates: DemandTemplateResponse[];
}
