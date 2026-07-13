export function createEmptyDelegationArray(): number[] {
  return Array(31).fill(0);
}

export function isValidDelegationArray(arr: number[]): boolean {
  return Array.isArray(arr) && arr.length === 31 && arr.every(v => v === 0 || v === 1);
}

export function toggleDelegationDay(monthlyDelegation: number[], day: number): number[] {
  if (day < 1 || day > 31) throw new Error('Day must be between 1 and 31');
  const result = [...monthlyDelegation];
  result[day - 1] = result[day - 1] === 1 ? 0 : 1;
  return result;
}

export function setDelegationRange(
  monthlyDelegation: number[],
  startDay: number,
  endDay: number,
  value: 0 | 1
): number[] {
  if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31)
    throw new Error('Days must be between 1 and 31');
  const result = [...monthlyDelegation];
  for (let day = Math.min(startDay, endDay); day <= Math.max(startDay, endDay); day++) {
    result[day - 1] = value;
  }
  return result;
}

export function isDelegationDay(monthlyDelegation: number[], day: number): boolean {
  if (day < 1 || day > 31) return false;
  return monthlyDelegation[day - 1] === 1;
}

// Uwaga: wyznaczanie "ostatniej zmiany" (kto + kiedy) dla zbioru rekordów
// delegacji/nieobecności korzysta teraz z generycznej funkcji getLatestDraftRecord
// z @/utils/draft.utils — patrz Delegations.tsx. Zwraca ona cały rekord
// (a nie tylko datę), bo etykieta autora musi pochodzić z tego samego,
// najnowszego rekordu co data (createdByLabel/updatedByLabel z backendu).