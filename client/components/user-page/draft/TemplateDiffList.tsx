/**
 * TemplateDiffList — lista dni miesiąca edytowanych ręcznie, czyli różniących się od szablonu
 * swojego dnia tygodnia. Kliknięcie dnia wybiera go w edytorze.
 */
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SHORT_DAYS } from '@/utils/calendar';
import { MONTHS_GENITIVE, type MonthDayInfo } from '@/utils/draft.utils';

interface TemplateDiffListProps {
  month: number;
  days: MonthDayInfo[];
  selectedDate: number | null;
  onSelect: (day: number) => void;
}

export function TemplateDiffList({ month, days, selectedDate, onSelect }: TemplateDiffListProps) {
  const manualDays = days.filter((d) => d.isManual);

  return (
    <section
      aria-label="Różnice względem szablonu"
      className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/70"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Różnice względem szablonu</h4>
        {manualDays.length > 0 && (
          <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-1.5 py-0.5">
            {manualDays.length}
          </span>
        )}
      </div>

      {manualDays.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          Wszystkie dni są zgodne z szablonami dni tygodnia.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {manualDays.map((d) => {
            const diff = d.total - d.templateTotal;
            return (
              <li key={d.day}>
                <button
                  type="button"
                  onClick={() => onSelect(d.day)}
                  aria-label={`${d.day} ${MONTHS_GENITIVE[month]}: ${d.total} godzin, szablon ${d.templateTotal} godzin`}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    selectedDate === d.day
                      ? 'bg-blue-600/15 border-cyan-500/60'
                      : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                  )}
                >
                  <span className="font-bold text-slate-100">
                    {SHORT_DAYS[(d.dayOfWeek + 6) % 7]} {d.day}
                  </span>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {d.total} h <span className="text-slate-500">(szablon {d.templateTotal} h)</span>
                  </span>
                  <span
                    className={cn(
                      'text-xs font-black tabular-nums',
                      diff > 0 ? 'text-amber-300' : diff < 0 ? 'text-sky-300' : 'text-slate-400'
                    )}
                  >
                    {diff > 0 ? `+${diff}` : diff} h
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}