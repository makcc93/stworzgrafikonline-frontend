/**
 * TemplateCopyPanel — akcje na szablonach całego miesiąca:
 *  1) "Zastosuj do dni" — nadpisuje drafty dni zapisanymi szablonami,
 *  2) "Kopiuj do innego miesiąca" — kopiuje szablony po DNIU TYGODNIA (nie po dacie); drafty dni
 *     w miesiącu docelowym zostają bez zmian.
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MONTHS } from '@/utils/calendar';
import type { DayOfWeekTemplate } from '@/types/draft.types';
import { draftTemplateService } from '@/services/api-provider';

interface TemplateCopyPanelProps {
  storeId: number;
  year: number;
  /** 0-11 */
  month: number;
  /** Szablony miesiąca (7 pozycji, getDay()) — do podpisów dni. */
  templates: DayOfWeekTemplate[];
  /** Dni tygodnia (getDay()), które mają ZAPISANY szablon w tym miesiącu. */
  persistedDays: number[];
  /** Są niezapisane zmiany w edytorze — nie biorą udziału w kopiowaniu ani zastosowaniu. */
  hasUnsaved: boolean;
  /** Po nadpisaniu draftów dni — rodzic przeładowuje drafty. */
  onApplied: () => void;
  /** Przejście do miesiąca docelowego (po skopiowaniu). */
  onGoToMonth?: (year: number, month: number) => void;
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

export function TemplateCopyPanel({
  storeId,
  year,
  month,
  templates,
  persistedDays,
  hasUnsaved,
  onApplied,
  onGoToMonth,
}: TemplateCopyPanelProps) {
  const [target, setTarget] = useState(() => nextMonth(year, month));
  const [selectedDays, setSelectedDays] = useState<number[]>(persistedDays);
  const [confirmApply, setConfirmApply] = useState(false);
  const [busy, setBusy] = useState<'apply' | 'copy' | null>(null);

  // Zmiana miesiąca/sklepu → cel = następny miesiąc, wszystkie zapisane dni zaznaczone.
  const persistedKey = persistedDays.join(',');
  useEffect(() => {
    setTarget(nextMonth(year, month));
    setSelectedDays(persistedDays);
    setConfirmApply(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, year, month, persistedKey]);

  const hasAnyTemplate = persistedDays.length > 0;
  const sameAsSource = target.year === year && target.month === month;
  const canCopy = hasAnyTemplate && selectedDays.length > 0 && !sameAsSource && busy === null;

  const shiftTarget = (delta: number) => {
    setTarget((prev) => {
      const index = prev.year * 12 + prev.month + delta;
      return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
    });
  };

  const toggleDay = (dayOfWeek: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayOfWeek) ? prev.filter((d) => d !== dayOfWeek) : [...prev, dayOfWeek]
    );
  };

  const handleApply = async () => {
    setBusy('apply');
    try {
      const result = await draftTemplateService.apply(storeId, year, month + 1);
      toast.success(
        `Zastosowano szablony: utworzono ${result.created}, nadpisano ${result.updated}, pominięto ${result.skipped} dni`
      );
      setConfirmApply(false);
      onApplied();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zastosować szablonów');
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async () => {
    const { year: targetYear, month: targetMonth } = target;
    setBusy('copy');
    try {
      const result = await draftTemplateService.copy(
        storeId,
        year,
        month + 1,
        targetYear,
        targetMonth + 1,
        selectedDays
      );
      const label = `${MONTHS[targetMonth]} ${targetYear}`;
      if (result.copied === 0) {
        toast.warning('Brak zapisanych szablonów do skopiowania');
      } else {
        toast.success(`Skopiowano szablony (${result.copied}) do: ${label}`, {
          description: 'Drafty dni w tym miesiącu nie zostały zmienione.',
          action: onGoToMonth
            ? { label: 'Przejdź', onClick: () => onGoToMonth(targetYear, targetMonth) }
            : undefined,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się skopiować szablonów');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl divide-y divide-slate-700/70">
      {/* ===== Zastosuj do dni ===== */}
      <div className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600/15 border border-emerald-600/30 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white">Zastosuj szablony do dni miesiąca</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Nadpisuje drafty wszystkich dni w {MONTHS[month]} zapisanymi szablonami — także te edytowane ręcznie.
              Dni wolne dostają zera. Przydatne po skopiowaniu szablonów z innego miesiąca.
            </p>
          </div>
        </div>

        {confirmApply ? (
          <div className="flex flex-wrap items-center gap-2 pl-12">
            <span className="text-xs font-semibold text-amber-300">Na pewno nadpisać drafty dni?</span>
            <button
              type="button"
              onClick={handleApply}
              disabled={busy !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-900 disabled:opacity-50"
            >
              {busy === 'apply' && <Loader className="w-3.5 h-3.5 animate-spin" />}
              Tak, nadpisz
            </button>
            <button
              type="button"
              onClick={() => setConfirmApply(false)}
              disabled={busy !== null}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              Anuluj
            </button>
          </div>
        ) : (
          <div className="pl-12">
            <button
              type="button"
              onClick={() => setConfirmApply(true)}
              disabled={!hasAnyTemplate || busy !== null}
              className="px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border border-emerald-700/60 text-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-emerald-300"
            >
              Zastosuj do dni
            </button>
            {!hasAnyTemplate && (
              <span className="ml-3 text-xs text-slate-500">Brak zapisanych szablonów w tym miesiącu</span>
            )}
          </div>
        )}
      </div>

      {/* ===== Kopiuj do innego miesiąca ===== */}
      <div className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/15 border border-blue-600/30 flex items-center justify-center flex-shrink-0">
            <Copy className="w-4 h-4 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white">Kopiuj szablony do innego miesiąca</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Kopiuje szablony po dniu tygodnia (np. wszystkie wtorki), nie po dacie. Nadpisuje szablony wybranych
              dni w miesiącu docelowym; jego drafty dni zostają bez zmian.
            </p>
          </div>
        </div>

        <div className="pl-12 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">Do miesiąca</span>
            <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700 rounded-xl px-1 py-1">
              <button
                type="button"
                onClick={() => shiftTarget(-1)}
                aria-label="Poprzedni miesiąc docelowy"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="min-w-[140px] text-center text-sm font-bold text-white tabular-nums">
                {MONTHS[target.month]} {target.year}
              </span>
              <button
                type="button"
                onClick={() => shiftTarget(1)}
                aria-label="Następny miesiąc docelowy"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {sameAsSource && <span className="text-xs text-amber-400">To miesiąc źródłowy — wybierz inny</span>}
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dni tygodnia do skopiowania">
            {templates.map((t) => {
              const available = persistedDays.includes(t.dayOfWeek);
              const checked = available && selectedDays.includes(t.dayOfWeek);
              return (
                <button
                  key={t.dayOfWeek}
                  type="button"
                  disabled={!available || busy !== null}
                  aria-pressed={checked}
                  title={available ? t.dayName : `${t.dayName} — brak zapisanego szablonu`}
                  onClick={() => toggleDay(t.dayOfWeek)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                    checked
                      ? 'bg-blue-600/20 border-cyan-500/60 text-cyan-200'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500',
                    !available && 'opacity-40 cursor-not-allowed hover:border-slate-700'
                  )}
                >
                  {t.dayName.slice(0, 3)}
                </button>
              );
            })}
          </div>

          {hasUnsaved && (
            <p className="text-xs text-amber-400">
              Kopiowane są tylko ZAPISANE szablony — niezapisane zmiany w edytorze nie są uwzględniane.
            </p>
          )}

          <button
            type="button"
            onClick={handleCopy}
            disabled={!canCopy}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-colors',
              canCopy
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            )}
          >
            {busy === 'copy' ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
            Kopiuj do {MONTHS[target.month]}
          </button>
        </div>
      </div>
    </div>
  );
}
