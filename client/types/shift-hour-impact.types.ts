/**
 * Szacowany wpływ przesunięć godzin zmian (np. 09:00 → 08:30) na godziny w miesiącu.
 * Backend: GET /api/stores/{storeId}/shift-hour-config/impact/{year}/{month}
 */
export interface ShiftHourRuleImpact {
  /** "HH:MM" lub "HH:MM:SS" */
  originalHour: string;
  modifiedHour: string;
  /** Zakres reguły: START / END / BOTH. */
  scope: 'START' | 'END' | 'BOTH';
  /** Zmiany w miesiącu zaczynające się o originalHour (wg draftu). */
  shiftsStarting: number;
  /** Zmiany w miesiącu kończące się o originalHour (wg draftu). */
  shiftsEnding: number;
  /** Dodatkowe godziny łącznie z reguły (ujemne = krótsze zmiany). */
  extraHours: number;
}

export interface ShiftHourImpact {
  /** Dodatkowe godziny łącznie dla wszystkich pracowników. */
  extraHoursTotal: number;
  /** Dodatkowe godziny na pracownika — ten sam mianownik co "Wymagane przez draft". */
  extraHoursPerEmployee: number;
  /** Pracownicy objęci przesunięciami (nie wykluczeni, nie specjalni). */
  eligibleEmployees: number;
  /** Aktywni pracownicy bez magazyniera. */
  totalEmployees: number;
  rules: ShiftHourRuleImpact[];
}
