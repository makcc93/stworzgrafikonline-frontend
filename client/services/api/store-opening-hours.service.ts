/**
 * Store Opening Hours Service
 * Manages store hours — SEPARATE from storeDetails (which only has staffing)
 * GET  /api/stores/{storeId}/opening-hours → Record<string, {open: string, close: string}>
 * PATCH /api/stores/{storeId}/opening-hours/{dayOfWeek} → void
 */
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

// Backend zwraca LocalTime jako "HH:mm:ss" np. "09:00:00"
// Frontend używa "HH:mm" — normalizujemy przy odbiorze
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface DayHours {
  open: string;  // "HH:mm"
  close: string; // "HH:mm"
}

export type OpeningHoursMap = Record<DayOfWeek, DayHours>;

// Normalizuje "09:00:00" → "09:00"
function normalizeTime(t: string): string {
  if (!t) return '09:00';
  return t.substring(0, 5);
}

// Konwertuje mapę z backendu (klucze MONDAY/TUESDAY...) na format frontendu (monday/tuesday...)
export function backendHoursToFrontend(backendMap: Record<string, any>): Record<string, DayHours> {
  const result: Record<string, DayHours> = {};
  for (const [day, hours] of Object.entries(backendMap)) {
    result[day.toLowerCase()] = {
      open: normalizeTime(hours.open),
      close: normalizeTime(hours.close),
    };
  }
  return result;
}

// Konwertuje format frontendu (monday) → DayOfWeek backendu (MONDAY)
export function frontendDayToBackend(day: string): DayOfWeek {
  return day.toUpperCase() as DayOfWeek;
}

export const storeOpeningHoursService = {
  getAll: async (storeId: number): Promise<Record<string, DayHours>> => {
    const raw = await httpClient.get<Record<string, any>>(
      API_CONFIG.ENDPOINTS.storeOpeningHours(storeId)
    );
    return backendHoursToFrontend(raw);
  },

  updateDay: async (storeId: number, day: string, hours: DayHours): Promise<void> => {
    const dayOfWeek = frontendDayToBackend(day);
    await httpClient.patch<void>(
      `${API_CONFIG.ENDPOINTS.storeOpeningHours(storeId)}/${dayOfWeek}`,
      { open: hours.open + ':00', close: hours.close + ':00' } // LocalTime wymaga sekund
    );
  },

  // Zapisuje wszystkie 7 dni jednocześnie (7 osobnych PATCHy)
  updateAll: async (storeId: number, hours: Record<string, DayHours>): Promise<void> => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    await Promise.all(
      days.map(day => storeOpeningHoursService.updateDay(storeId, day, hours[day]))
    );
  },
};

console.log('🌐 Store Opening Hours Service loaded');
