import { useEffect, useState } from 'react';
import { holidayService } from '@/services/api-provider';

const EMPTY: Set<string> = new Set();

/** Klucz daty YYYY-MM-DD (month0: 0-11, jak w JS Date). */
export const toDateKey = (year: number, month0: number, day: number): string =>
  `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/**
 * Dni wolne (święta + dni niehandlowe z Panelu Admina) dla miesiąca.
 * @param month0 miesiąc 0-11 (konwencja komponentów frontendu); null = brak wybranego miesiąca
 * Zwraca zbiór dat YYYY-MM-DD; do czasu załadowania (lub przy błędzie) pusty zbiór.
 */
export function useHolidays(year: number, month0: number | null): Set<string> {
  const [holidays, setHolidays] = useState<Set<string>>(EMPTY);

  useEffect(() => {
    if (month0 === null) {
      setHolidays(EMPTY);
      return;
    }

    // flaga chroni przed nadpisaniem widoku spóźnioną odpowiedzią po zmianie miesiąca
    let cancelled = false;
    holidayService.getHolidays(year, month0 + 1).then((dates) => {
      if (!cancelled) setHolidays(dates);
    });

    return () => {
      cancelled = true;
    };
  }, [year, month0]);

  return holidays;
}
