/**
 * SelectionInfo Component
 * Shows current selection information
 * Follows SRP - single responsibility for showing selection info
 */

import { MONTHS, DAYS_OF_WEEK } from '@/utils/calendar';
import LastModifiedInfo from '@/components/shared/LastModifiedInfo';

interface SelectionInfoProps {
  month: number;
  year: number;
  selectedDayOfWeek: number;
  selectedDate: number | null;
  /** Data ostatniej aktualizacji draftu dla wybranego dnia (ISO 8601 z backendu) */
  updatedAt?: string | null;
  /** Data utworzenia draftu — fallback, gdy nigdy nie był edytowany */
  createdAt?: string | null;
  /** Etykieta autora ostatniej edycji (migawka z backendu) */
  updatedByLabel?: string | null;
  /** Etykieta autora utworzenia draftu — fallback, gdy nigdy nie był edytowany */
  createdByLabel?: string | null;
}

export function SelectionInfo({
  month,
  year,
  selectedDayOfWeek,
  selectedDate,
  updatedAt,
  createdAt,
  updatedByLabel,
  createdByLabel,
}: SelectionInfoProps) {
  return (
    <div
      className={`border rounded-lg p-4 ${
        selectedDate !== null
          ? 'bg-green-900/30 border-green-700/50'
          : 'bg-blue-900/30 border-blue-700/50'
      }`}
    >
      <p className={selectedDate !== null ? 'text-green-300 text-sm' : 'text-blue-300 text-sm'}>
        <strong>DRAFT dla:</strong> {MONTHS[month]} {selectedDate || 'wszystkie'} {year}
        {selectedDate === null && (
          <>
            <br />
            <span className="text-xs mt-1 block">
              Szablon dla wszystkich {DAYS_OF_WEEK[selectedDayOfWeek]}ów w {MONTHS[month]}
            </span>
          </>
        )}
        {selectedDate !== null && (
          <>
            <br />
            <span className="text-xs mt-1 block">
              Indywidualny DRAFT na {MONTHS[month]} {selectedDate}, {year} (
              {DAYS_OF_WEEK[getDayOfWeek(year, month, selectedDate)]})
            </span>
          </>
        )}
      </p>
      {/* "Ostatnia zmiana" ma sens tylko dla konkretnego dnia — szablon (selectedDate === null)
          to wyliczona na bieżąco średnia z wielu dni, a nie jeden zapisany rekord. */}
      {selectedDate !== null && (
        <LastModifiedInfo
          updatedAt={updatedAt}
          createdAt={createdAt}
          updatedByLabel={updatedByLabel}
          createdByLabel={createdByLabel}
          className="mt-2"
        />
      )}
    </div>
  );
}

// Helper function to get day of week for a date
function getDayOfWeek(year: number, month: number, date: number): number {
  const d = new Date(year, month, date);
  return (d.getDay() + 6) % 7;
}