/**
 * shiftNormalize.ts
 *
 * Backend zwraca LocalTime przez Jackson w jednym z formatów:
 *   A) string   "08:00:00"  lub  "08:00"          (JavaTimeModule skonfigurowany)
 *   B) obiekt   {"hour":8,"minute":0,"second":0,"nano":0}  (domyślny Jackson)
 *   C) tablica  [8, 0]                             (rzadko, WRITE_DATES_AS_TIMESTAMPS=true)
 *
 * Wszystkie funkcje obsługują każdy z tych formatów.
 */

type RawLocalTime = string | { hour: number; minute: number; second?: number; nano?: number } | number[];

/**
 * Zwraca godzinę (0–24) z dowolnego formatu LocalTime z backendu.
 */
export function getHour(raw: unknown): number {
  if (typeof raw === 'string') {
    const h = parseInt(raw.split(':')[0], 10);
    return isNaN(h) ? 0 : h;
  }
  if (Array.isArray(raw)) {
    return typeof raw[0] === 'number' ? raw[0] : 0;
  }
  if (raw !== null && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    return typeof o.hour === 'number' ? o.hour : 0;
  }
  return 0;
}

/**
 * Zwraca minutę (0–59) z dowolnego formatu LocalTime z backendu.
 */
export function getMinute(raw: unknown): number {
  if (typeof raw === 'string') {
    const parts = raw.split(':');
    const m = parseInt(parts[1] ?? '0', 10);
    return isNaN(m) ? 0 : m;
  }
  if (Array.isArray(raw)) {
    return typeof raw[1] === 'number' ? raw[1] : 0;
  }
  if (raw !== null && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    return typeof o.minute === 'number' ? o.minute : 0;
  }
  return 0;
}

/**
 * Zwraca true jeśli zmiana jest pełnogodzinowa (minuty == 0 dla obu końców).
 */
export function isWholeHourShift(rawStart: unknown, rawEnd: unknown): boolean {
  return getMinute(rawStart) === 0 && getMinute(rawEnd) === 0;
}

/**
 * Porównuje surowy LocalTime z backendu z wybraną godziną całkowitą.
 * Używane w ShiftSelector do znalezienia pasującej zmiany.
 */
export function shiftMatchesHours(
  rawStart: unknown,
  rawEnd: unknown,
  wantStart: number,
  wantEnd: number,
): boolean {
  return getHour(rawStart) === wantStart && getHour(rawEnd) === wantEnd;
}

/**
 * Normalizuje pole startHour/endHour do stringa "HH:MM:00"
 * — zawsze string, niezależnie od formatu backendu.
 */
export function normalizeToTimeString(raw: unknown): string {
  const h = getHour(raw).toString().padStart(2, '0');
  const m = getMinute(raw).toString().padStart(2, '0');
  return `${h}:${m}:00`;
}