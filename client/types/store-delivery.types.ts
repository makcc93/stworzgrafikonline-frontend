import { DayOfWeek } from '@/types/shared.types';
import type { LocalDateTime } from '@/types/shared.types';

// Re-export DayOfWeek for convenience
export { DayOfWeek };

/**
 * Konfiguracja dostawy dla jednego dnia
 * Backend: DayDeliveryConfig
 */
export interface DayDeliveryConfig {
  hasDelivery: boolean;
  shiftAsArray: number[]; // 24 elementy — 1 = godzina objęta dostawą, 0 = poza zakresem
}

/**
 * Tygodniowy harmonogram dostaw sklepu
 * Backend: StoreWeeklyDeliverySchedule (embedded)
 */
export interface StoreWeeklyDeliverySchedule {
  deliverySchedule: Record<DayOfWeek, DayDeliveryConfig>;
}

/**
 * Odpowiedź GET /api/stores/{storeId}/deliveries
 * Backend: ResponseStoreDeliveryDTO
 */
export interface ResponseStoreDeliveryDTO {
  id: number;
  storeId: number;
  hasDedicatedWarehouseman: boolean;
  primaryEmployeeId: number | null;
  storeWeeklyDeliverySchedule: StoreWeeklyDeliverySchedule;
  createdAt: LocalDateTime | null;
  createdByUserId: number | null;
  updatedAt: LocalDateTime | null;
  updatedByUserId: number | null;
}

/**
 * Ciało PATCH /api/stores/{storeId}/deliveries
 * Backend: UpdateStoreDeliveryDTO
 */
export interface UpdateStoreDeliveryDTO {
  hasDedicatedWarehouseman: boolean;
  primaryEmployeeId: number | null;
  deliverySchedule: Record<DayOfWeek, DayDeliveryConfig> | null;
  updatedByUserId: number | null;
}

// ─── Funkcje pomocnicze ──────────────────────────────────────────────────────

/**
 * Konwertuje tablicę 24 elementów na zakres godzin {start, end}.
 * Szuka pierwszej i ostatniej pozycji z wartością 1.
 */
export function shiftArrayToHours(arr: number[]): { start: number; end: number } {
  const start = arr.indexOf(1);
  const end = arr.lastIndexOf(1) + 1;
  return {
    start: start === -1 ? 8 : start,
    end: end === 0 ? 16 : end,
  };
}

/**
 * Konwertuje zakres godzin {start, end} na tablicę 24 elementów.
 */
export function hoursToShiftArray(start: number, end: number): number[] {
  return Array.from({ length: 24 }, (_, i) => (i >= start && i < end ? 1 : 0));
}

/**
 * Mapuje nazwę dnia frontend (np. 'monday') → DayOfWeek ('MONDAY')
 */
export function toBackendDayKey(day: string): DayOfWeek {
  const mapping: Record<string, DayOfWeek> = {
    monday:    DayOfWeek.MONDAY,
    tuesday:   DayOfWeek.TUESDAY,
    wednesday: DayOfWeek.WEDNESDAY,
    thursday:  DayOfWeek.THURSDAY,
    friday:    DayOfWeek.FRIDAY,
    saturday:  DayOfWeek.SATURDAY,
    sunday:    DayOfWeek.SUNDAY,
  };
  return mapping[day] ?? DayOfWeek.MONDAY;
}