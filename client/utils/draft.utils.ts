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
      const cleanDateStr = d.draftDate.split('T')[0];
      if (parseDateFromBackend(cleanDateStr).getDay() !== template.dayOfWeek) continue;

      let demandArray: number[];
      try {
        demandArray = typeof d.hourlyDemand === 'string' ? JSON.parse(d.hourlyDemand) : d.hourlyDemand;
      } catch {
        continue; // uszkodzony rekord — pomijamy zamiast wywracać cały widok
      }
      if (!Array.isArray(demandArray)) continue;
      if (demandArray.every((v) => v === 0)) continue; // dzień zerowy (święto / pusty) — poza średnią

      demandArrays.push(demandArray);
    }

    if (demandArrays.length === 0) {
      return { ...template, hourlyDemand: Array(24).fill(0) };
    }

    const sum = Array(24).fill(0);
    demandArrays.forEach((arr) => {
      arr.forEach((val: number, hour: number) => { if (hour < 24) sum[hour] += val; });
    });

    return {
      ...template,
      hourlyDemand: sum.map((val) => Math.round(val / demandArrays.length)),
    };
  });
}
