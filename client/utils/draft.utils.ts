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
 * Używane jako fallback, gdy w sessionStorage nie ma jeszcze roboczej wersji
 * szablonów (np. pierwsze wejście w tej sesji przeglądarki, albo po powrocie
 * do zakładki w nowej sesji) — bez tego "Szablony" pokazywały same zera mimo
 * że drafty są poprawnie zapisane w bazie.
 */
export function buildTemplatesFromDrafts(
  drafts: ResponseDemandDraftDTO[]
): DayOfWeekTemplate[] {
  return DEFAULT_DAY_TEMPLATES.map((template) => {
    const matching = drafts.filter((d) => {
      const cleanDateStr = d.draftDate.split('T')[0];
      return parseDateFromBackend(cleanDateStr).getDay() === template.dayOfWeek;
    });

    if (matching.length === 0) {
      return { ...template, hourlyDemand: Array(24).fill(0) };
    }

    const avgDemand = Array(24).fill(0);
    matching.forEach((d) => {
      const demandArray = typeof d.hourlyDemand === 'string'
        ? JSON.parse(d.hourlyDemand)
        : d.hourlyDemand;
      demandArray.forEach((val: number, hour: number) => { avgDemand[hour] += val; });
    });

    return {
      ...template,
      hourlyDemand: avgDemand.map((val) => Math.round(val / matching.length)),
    };
  });
}
