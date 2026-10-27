/**
 * MiniCalendar — kalendarz miesiąca w formie "heatmapy" godzin zapotrzebowania.
 *
 * Każda komórka pokazuje sumę godzin draftu danego dnia; im więcej godzin, tym jaśniejszy kolor.
 * Bursztynowa kropka = dzień edytowany ręcznie (różni się od szablonu dnia tygodnia),
 * kreskowanie = dzień bez obsady (sklep zamknięty / draft wyzerowany).
 * Nawigacja po miesiącach jest w nagłówku modułu, nie tutaj.
 */
import { MONTHS, SHORT_DAYS } from '@/utils/calendar';
import { cn } from '@/lib/utils';
import { MONTHS_GENITIVE, type MonthDayInfo } from '@/utils/draft.utils';

interface MiniCalendarProps {
  year: number;
  month: number;
  selectedDate: number | null;
  /** Podsumowania dni miesiąca (buildMonthDayInfos). */
  days: MonthDayInfo[];
  /** Dni tygodnia (getDay()), w które sklep jest zamknięty. */
  closedWeekdays?: Set<number>;
  /** YYYY-MM-DD — święta z backendu. */
  holidayDates?: Set<string>;
  /** Dzień miesiąca z niezapisanymi zmianami w edytorze (bursztynowa obwódka). */
  unsavedDate?: number | null;
  onDateSelect: (date: number) => void;
}

const HATCH =
  'repeating-linear-gradient(135deg, rgba(71,85,105,0.55) 0px, rgba(71,85,105,0.55) 4px, rgba(30,41,59,0.55) 4px, rgba(30,41,59,0.55) 8px)';

export function MiniCalendar({
  year,
  month,
  selectedDate,
  days,
  closedWeekdays,
  holidayDates,
  unsavedDate = null,
  onDateSelect,
}: MiniCalendarProps) {
  // Poniedziałek jako pierwszy dzień tygodnia
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;
  const maxTotal = Math.max(0, ...days.map((d) => d.total));

  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/70">
      <div className="grid grid-cols-7 gap-1.5 mb-1.5" aria-hidden="true">
        {SHORT_DAYS.map((name, idx) => (
          <div
            key={name}
            className={cn(
              'text-center text-[11px] font-black uppercase tracking-wide py-1',
              idx === 6 ? 'text-red-400' : 'text-slate-500'
            )}
          >
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label={`${MONTHS[month]} ${year}`}>
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} aria-hidden="true" />
        ))}

        {days.map((info) => {
          const isSelected = selectedDate === info.day;
          const isHoliday = holidayDates?.has(info.dateStr) ?? false;
          const isClosed = closedWeekdays?.has(info.dayOfWeek) ?? false;
          const noStaff = info.total === 0 && (info.isEmpty || isClosed);
          const hasUnsaved = unsavedDate === info.day;

          let background: string | undefined;
          if (isHoliday) background = 'rgba(127, 29, 29, 0.35)';
          else if (noStaff) background = HATCH;
          else if (info.total > 0 && maxTotal > 0) {
            background = `rgba(34, 211, 238, ${(0.1 + 0.55 * (info.total / maxTotal)).toFixed(2)})`;
          }

          const status = isHoliday
            ? 'dzień świąteczny'
            : info.isManual
            ? 'edytowany ręcznie'
            : noStaff
            ? 'bez obsady'
            : info.hasDraft
            ? 'zgodny z szablonem'
            : 'brak draftu';

          return (
            <button
              key={info.day}
              type="button"
              disabled={isHoliday}
              onClick={() => onDateSelect(info.day)}
              aria-pressed={isSelected}
              aria-label={`${info.day} ${MONTHS_GENITIVE[month]}: ${info.total} godzin, ${status}`}
              title={isHoliday ? 'Dzień świąteczny — brak draftu' : status}
              style={background ? { background } : undefined}
              className={cn(
                'relative h-14 rounded-lg border text-left px-1.5 py-1 transition-all flex flex-col justify-between',
                isHoliday
                  ? 'border-red-700/60 text-red-300 cursor-not-allowed'
                  : 'border-slate-700/80 hover:border-slate-400',
                !background && !isHoliday && 'bg-slate-800/60',
                isSelected && 'ring-2 ring-cyan-300 border-cyan-300 shadow-lg shadow-cyan-900/40',
                hasUnsaved && !isSelected && 'ring-2 ring-amber-400'
              )}
            >
              <span
                className={cn(
                  'text-[11px] font-bold leading-none',
                  info.dayOfWeek === 0 ? 'text-red-300' : 'text-slate-200'
                )}
              >
                {info.day}
              </span>
              <span className="text-sm font-black leading-none tabular-nums text-white text-right">
                {isHoliday ? '' : info.hasDraft || info.total > 0 ? info.total : '—'}
              </span>
              {(info.isManual || hasUnsaved) && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <ul className="mt-3 pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
        <li className="flex items-center gap-1.5">
          <span className="inline-block w-12 h-2.5 rounded-sm bg-gradient-to-r from-cyan-400/10 to-cyan-400/65" />
          mniej → więcej godzin
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
          edytowany ręcznie
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block w-3.5 h-2.5 rounded-sm" style={{ background: HATCH }} />
          bez obsady
        </li>
        {holidayDates && holidayDates.size > 0 && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-2.5 rounded-sm bg-red-900/50 border border-red-700/60" />
            święto
          </li>
        )}
      </ul>
    </div>
  );
}