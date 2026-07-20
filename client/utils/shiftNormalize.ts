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

/**
 * Oblicza długość zmiany w godzinach na podstawie surowych startHour/endHour
 * z backendu (string "HH:MM:SS", obiekt {hour,minute,...} lub tablica [h,m]).
 *
 * JEDYNE miejsce w froncie, które powinno liczyć długość zmiany — używane
 * zarówno w podglądzie grafiku (ScheduleViewer), jak i w wykresie rocznym
 * (YourSchedule), żeby uniknąć rozjazdu wynikającego z dwóch niezależnych
 * implementacji.
 *
 * Zasady:
 * - 00:00 → 00:00 to sentinel "wolne" (dzień bez zmiany) → 0h.
 * - start === end (dowolna godzina, nie tylko 00:00) → traktujemy jako 0h,
 *   NIE jako 24h. Zmiana zero-długościowa nie powinna nigdy zaokrąglać się
 *   w górę do pełnej doby — to był realny błąd w poprzedniej implementacji
 *   (`diff > 0 ? diff : diff + 24h`), który przy start === end ≠ 00:00
 *   fałszywie doliczał 24 godziny.
 * - end < start (np. 22:00 → 06:00) → zmiana przechodzi przez północ,
 *   liczymy różnicę + 24h.
 */
export function computeShiftHours(rawStart: unknown, rawEnd: unknown): number {
  const startMinutes = getHour(rawStart) * 60 + getMinute(rawStart);
  const endMinutes = getHour(rawEnd) * 60 + getMinute(rawEnd);

  const diff = endMinutes - startMinutes;
  if (diff === 0) return 0;
  return (diff > 0 ? diff : diff + 24 * 60) / 60;
}

/**
 * Liczy łączne godziny pracy (WORK/WORK_BY_PROPOSAL) + urlop/L4 (defaultHours)
 * z tablicy ResponseScheduleDetailsDTO. DAY_OFF i DELEGATION nie liczą się do godzin.
 * Współdzielone przez ScheduleViewer i YourSchedule, żeby liczby zawsze się zgadzały.
 */
export function sumScheduleDetailHours(
  details: Array<{ shiftCode: string; startHour: unknown; endHour: unknown; defaultHours?: number | null }>
): number {
  let total = 0;
  for (const d of details) {
    if (d.shiftCode === 'WORK' || d.shiftCode === 'WORK_BY_PROPOSAL' || d.shiftCode === 'DELEGATION') {
      // Delegacja liczy się jak dzień pracy: realne godziny zmiany, a jeśli shift to
      // sentinel 00:00→00:00 (delegacja bez godzin w grafiku) — fallback na defaultHours.
      const fromShift = computeShiftHours(d.startHour, d.endHour);
      total += fromShift > 0 ? fromShift : (d.defaultHours ?? 0);
    } else if (d.shiftCode === 'VACATION' || d.shiftCode === 'SICK_LEAVE') {
      // Dla urlopu/L4 shift ma 00:00→00:00 — prawdziwa wartość jest w defaultHours (z bazy)
      if (d.defaultHours != null) {
        total += d.defaultHours;
      }
    }
    // DAY_OFF — nie liczy się do godzin
  }
  return total;
}
