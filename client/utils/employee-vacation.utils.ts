/**
 * Employee Vacation Utilities
 */

/**
 * Create empty vacation array (all days working)
 */
export function createEmptyVacationArray(): number[] {
  return Array(31).fill(0);
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
  const result = [...monthlyVacation];
  result[day - 1] = result[day - 1] === 1 ? 0 : 1;
  return result;
}

/**
 * Check if specific day is vacation
 */
export function isVacationDay(monthlyVacation: number[], day: number): boolean {
  if (day < 1 || day > 31) return false;
  return monthlyVacation[day - 1] === 1;
}

/**
 * Set vacation for day range (inclusive)
 */
export function setVacationRange(
  monthlyVacation: number[],
  startDay: number,
  endDay: number,
  isVacation: boolean
): number[] {
  if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
    throw new Error('Days must be between 1 and 31');
  }
  const result = [...monthlyVacation];
  for (let day = startDay; day <= endDay; day++) {
    result[day - 1] = isVacation ? 1 : 0;
  }
  return result;
}

export function isValidVacationArray(arr: number[]): boolean {
  return Array.isArray(arr) && arr.length === 31 && arr.every(v => v === 0 || v === 1);
}

// Uwaga: wyznaczanie "ostatniej zmiany" (kto + kiedy) dla zbioru rekordów
// urlopowych korzysta teraz z generycznej funkcji getLatestDraftRecord
// z @/utils/draft.utils — patrz Vacations.tsx. Zwraca ona cały rekord
// (a nie tylko datę), bo etykieta autora musi pochodzić z tego samego,
// najnowszego rekordu co data (createdByLabel/updatedByLabel z backendu).