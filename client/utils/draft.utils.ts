import type { CreateDemandDraftDTO, DayOfWeekTemplate, ResponseDemandDraftDTO } from '@/types/draft.types';
import { DEFAULT_DAY_TEMPLATES } from '@/types/draft.types';
/**
 * Formatuje obiekt Date do formatu YYYY-MM-DD bezpiecznie dla stref czasowych (czas lokalny)
 */

export const formatDateForBackend = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
 
/**
 * Parse backend date string (YYYY-MM-DD) to Date object
 */
export function parseDateFromBackend(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}
 
/**
 * Create empty hourly demand array (all zeros)
 * Returns number[] — gotowe do wstawienia w hourlyDemand: ...
 */
export function createEmptyDraft(): number[] {
  return Array(24).fill(0);
}
 
/**
 * Create sample hourly demand array with random business-hours data
 * Returns number[] — gotowe do wstawienia w hourlyDemand: ...
 */
export function createSampleDraft(): number[] {
  return Array(24)
    .fill(0)
    .map((_, hour) => {
      // More demand during business hours (8-20)
      if (hour >= 8 && hour <= 20) {
        return Math.floor(Math.random() * 5) + 1;
      }
      return Math.floor(Math.random() * 2);
    });
}

/** Nazwy miesięcy w dopełniaczu ("14 października") — indeks = month (0-11). */
export const MONTHS_GENITIVE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
] as const;

/**
 * Data draftu bez ewentualnej części czasowej: "2026-10-14T00:00:00" → "2026-10-14".
 * Backend zwykle zwraca samo YYYY-MM-DD, ale porównania dat robimy zawsze na znormalizowanej wartości.
 */
export function normalizeDraftDate(draftDate: string): string {
  return draftDate.split('T')[0];
}

/**
 * Zawsze zwraca tablicę dokładnie 24 nieujemnych liczb całkowitych.
 * Obsługuje tablicę, JSON w stringu oraz uszkodzone/niepełne dane (braki → 0).
 */
export function toDemandArray(hourlyDemand: unknown): number[] {
  let source: unknown = hourlyDemand;
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch { source = []; }
  }
  const list: unknown[] = Array.isArray(source) ? source : [];
  return Array.from({ length: 24 }, (_, i) => {
    const value = Number(list[i]);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  });
}

/** Suma godzin pracy z jednego dnia draftu. */
export function sumDemand(hourlyDemand: unknown): number {
  return toDemandArray(hourlyDemand).reduce((a, b) => a + b, 0);
}

/** Czy dwie tablice zapotrzebowania są identyczne (po normalizacji do 24 godzin). */
export function isSameDemand(a: unknown, b: unknown): boolean {
  const x = toDemandArray(a);
  const y = toDemandArray(b);
  return x.every((value, i) => value === y[i]);
}

/** Podsumowanie jednego dnia miesiąca — wspólne dla kalendarza i listy różnic względem szablonu. */
export interface MonthDayInfo {
  /** Dzień miesiąca (1–31). */
  day: number;
  /** YYYY-MM-DD */
  dateStr: string;
  /** getDay(): 0 = niedziela. */
  dayOfWeek: number;
  /** Czy dla dnia istnieje zapisany draft. */
  hasDraft: boolean;
  /** Suma godzin zapisanego draftu (0, gdy brak draftu). */
  total: number;
  /** Suma godzin szablonu tego dnia tygodnia. */
  templateTotal: number;
  /** Draft istnieje, ma obsadę i różni się od szablonu dnia tygodnia (edytowany ręcznie). */
  isManual: boolean;
  /** Draft istnieje, ale nie ma żadnej obsady (np. święto zerowane przez backend albo wyczyszczony dzień). */
  isEmpty: boolean;
}

/** Buduje listę podsumowań dla każdego dnia miesiąca (month: 0-11). */
export function buildMonthDayInfos(
  year: number,
  month: number,
  drafts: ResponseDemandDraftDTO[],
  templates: DayOfWeekTemplate[]
): MonthDayInfo[] {
  const byDate = new Map(drafts.map((d) => [normalizeDraftDate(d.draftDate), d]));
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = new Date(year, month, day);
    const dateStr = formatDateForBackend(date);
    const dayOfWeek = date.getDay();
    const draft = byDate.get(dateStr);
    const template = templates.find((t) => t.dayOfWeek === dayOfWeek);

    const total = draft ? sumDemand(draft.hourlyDemand) : 0;
    const templateTotal = template ? sumDemand(template.hourlyDemand) : 0;

    return {
      day,
      dateStr,
      dayOfWeek,
      hasDraft: !!draft,
      total,
      templateTotal,
      isManual: !!draft && total > 0 && templateTotal > 0 && !isSameDemand(draft.hourlyDemand, template?.hourlyDemand),
      isEmpty: !!draft && total === 0,
    };
  });
}

/**
 * Zwraca cały rekord draftu z najnowszą datą aktualizacji (lub utworzenia,
 * jeśli nigdy nie edytowano) spośród listy rekordów. Używane do wyznaczenia
 * "Ostatnia zmiana: <kto> <kiedy>" dla zbioru dni (np. wszystkich dopasowanych
 * do szablonu dnia tygodnia) — zwracamy cały rekord, a nie samą datę, bo
 * etykieta autora ("kto") musi pochodzić z tego samego, najnowszego rekordu.
 * Zwraca null, jeśli lista jest pusta lub żaden rekord nie ma poprawnej daty.
 */
export function getLatestDraftRecord<
  T extends { updatedAt?: string | null; createdAt?: string | null }
>(records: T[]): T | null {
  let latest: T | null = null;
  let latestTime = -Infinity;

  for (const record of records) {
    const effective = record.updatedAt ?? record.createdAt ?? null;
    if (!effective) continue;

    const time = new Date(effective).getTime();
    if (isNaN(time)) continue;

    if (time > latestTime) {
      latestTime = time;
      latest = record;
    }
  }

  return latest;
}

/**
 * Buduje szablony dni tygodnia (jak w zakładce "Szablony") na podstawie
 * rzeczywistych draftów zapisanych w bazie dla danego miesiąca — uśredniając
 * godzinowe zapotrzebowanie po wszystkich dniach danego dnia tygodnia
 * (analogicznie do trybu "Edycja Konkretnych Dni" w YourDraft.getCurrentDraft).
 *
 * Dni z samymi zerami (święta zerowane przez backend, puste/wyczyszczone dni) NIE
 * wchodzą do średniej — w przeciwnym razie np. jedno święto w środę obniżałoby
 * szablon środy o ćwierć, a zapis takiego szablonu zniekształciłby pozostałe środy.
 * Gdy dla danego dnia tygodnia wszystkie dni są zerowe lub brak draftów → same zera.
 *
 * Używane jako źródło szablonów w TemplateManager (źródłem prawdy są drafty z bazy).
 */
export function buildTemplatesFromDrafts(
  drafts: ResponseDemandDraftDTO[]
): DayOfWeekTemplate[] {
  return DEFAULT_DAY_TEMPLATES.map((template) => {
    const demandArrays: number[][] = [];

    for (const d of drafts) {
      const cleanDateStr = normalizeDraftDate(d.draftDate);
      if (parseDateFromBackend(cleanDateStr).getDay() !== template.dayOfWeek) continue;

      const demandArray = toDemandArray(d.hourlyDemand);
      if (demandArray.every((v) => v === 0)) continue; // dzień zerowy (święto / pusty / uszkodzony) — poza średnią

      demandArrays.push(demandArray);
    }

    if (demandArrays.length === 0) {
      return { ...template, hourlyDemand: Array(24).fill(0) };
    }

    const sum: number[] = Array(24).fill(0);
    demandArrays.forEach((arr) => {
      arr.forEach((val, hour) => { sum[hour] += val; });
    });

    return {
      ...template,
      hourlyDemand: sum.map((val) => Math.round(val / demandArrays.length)),
    };
  });
}