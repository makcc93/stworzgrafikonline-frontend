/**
 * DraftChart — edytor JEDNEGO konkretnego dnia (tryb "Edycja konkretnych dni").
 *
 * Opiera się na wspólnym HourlyDemandEditor. Wartości robocze trzymane są lokalnie, a "niezapisane zmiany"
 * to po prostu różnica między wartościami roboczymi a zapisanym draftem (props `draft`) — dzięki temu
 * nie ma osobnej flagi, która mogłaby się rozjechać (np. po nieudanym zapisie).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Eraser, LayoutTemplate, Loader, Save, Sparkles, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HourlyDemandEditor } from '@/components/draft/HourlyDemandEditor';
import { createSampleDraft, isSameDemand, toDemandArray } from '@/utils/draft.utils';

interface DraftChartProps {
  /** Zapisany stan dnia (24 wartości; same zera, gdy dla dnia nie ma jeszcze draftu). */
  draft: number[];
  /** Szablon dnia tygodnia wyliczony z miesiąca (24 wartości) — przerywany obrys na wykresie i "Z szablonu". */
  template: number[];
  /** Nazwa szablonu do legendy, np. "szablon środy". */
  templateLabel: string;
  /** Tytuł dnia, np. "Środa, 14 października". */
  dateLabel: string;
  /** Czy dla tego dnia istnieje już zapisany draft. */
  hasDraft: boolean;
  /** Zapis dnia. Zwraca true tylko, gdy zapis się powiódł (blokada budżetu / błąd → false). */
  onSave: (values: number[]) => Promise<boolean>;
  /** Informuje rodzica, czy są niezapisane zmiany (np. żeby ostrzec przed zmianą dnia). */
  onDirtyChange?: (dirty: boolean) => void;
  maxValue?: number;
  /** Godzina otwarcia sklepu (np. 9 dla 09:00). */
  openHour?: number;
  /** Godzina zamknięcia sklepu (np. 20 dla 20:00). */
  closeHour?: number;
  /** Dodatkowa informacja pod tytułem (np. "Ostatnia zmiana: ..."). */
  headerExtra?: ReactNode;
}

export function DraftChart({
  draft,
  template,
  templateLabel,
  dateLabel,
  hasDraft,
  onSave,
  onDirtyChange,
  maxValue,
  openHour,
  closeHour,
  headerExtra,
}: DraftChartProps) {
  const limit = Math.max(1, maxValue ?? 20);
  const [localDraft, setLocalDraft] = useState<number[]>(() => toDemandArray(draft));
  const [saving, setSaving] = useState(false);

  // Synchronizacja z propsami — po ZAWARTOŚCI draftu, nie po referencji tablicy.
  // Rodzic zwraca nową tablicę przy każdym renderze (np. zera dla dnia bez zapisanego draftu),
  // więc zależność od `draft` kasowała niezapisane zmiany użytkownika przy każdym odświeżeniu rodzica.
  // Zmiana dnia/sklepu/miesiąca resetuje komponent przez `key` w rodzicu.
  const draftKey = draft.join(',');
  useEffect(() => {
    setLocalDraft(toDemandArray(draft));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const dirty = !isSameDemand(localDraft, draft);
  const isManual = hasDraft && !isSameDemand(draft, template) && template.some((v) => v > 0);
  const matchesTemplate = isSameDemand(localDraft, template);
  const isEmpty = localDraft.every((v) => v === 0);

  const onDirtyRef = useRef(onDirtyChange);
  onDirtyRef.current = onDirtyChange;
  useEffect(() => {
    onDirtyRef.current?.(dirty);
  }, [dirty]);
  useEffect(() => () => onDirtyRef.current?.(false), []);

  const handleChangeHour = useCallback((hour: number, value: number) => {
    setLocalDraft((prev) => {
      if (prev[hour] === value) return prev;
      const next = [...prev];
      next[hour] = value;
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      // Po udanym zapisie rodzic aktualizuje `draft`, a efekt wyżej zsynchronizuje wartości robocze.
      // Po nieudanym — wartości robocze zostają i nadal są oznaczone jako niezapisane.
      await onSave([...localDraft]);
    } finally {
      setSaving(false);
    }
  };

  const badge = dirty
    ? { text: 'Niezapisane zmiany', classes: 'text-amber-300 bg-amber-500/10 border-amber-500/40' }
    : isManual
    ? { text: 'Edytowany ręcznie', classes: 'text-amber-300 bg-amber-500/10 border-amber-500/30' }
    : hasDraft
    ? { text: 'Zgodny z szablonem', classes: 'text-slate-300 bg-slate-800/60 border-slate-700' }
    : { text: 'Brak draftu', classes: 'text-slate-400 bg-slate-800/60 border-slate-700' };

  return (
    <div className="space-y-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3 p-5 border-b border-slate-700 bg-slate-900/60 rounded-t-2xl">
          <div className="min-w-0">
            <h3 className="text-xl font-black text-white tracking-tight">{dateLabel}</h3>
            <p className="text-sm text-slate-400 mt-0.5">Indywidualny draft tego dnia — nie zmienia szablonu ani pozostałych dni.</p>
            {headerExtra}
          </div>
          <span className={cn('text-xs font-bold border rounded-lg px-2.5 py-1', badge.classes)}>{badge.text}</span>
        </div>

        <div className="p-5">
          <HourlyDemandEditor
            values={localDraft}
            onChangeHour={handleChangeHour}
            baseline={template}
            baselineKind="template"
            baselineLabel={templateLabel}
            maxValue={limit}
            openHour={openHour}
            closeHour={closeHour}
            disabled={saving}
            toolbar={
              <>
                <button
                  type="button"
                  onClick={() => setLocalDraft(toDemandArray(template).map((v) => Math.min(v, limit)))}
                  disabled={saving || matchesTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wide rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  Przywróć z szablonu
                </button>
                <button
                  type="button"
                  onClick={() => setLocalDraft(Array(24).fill(0))}
                  disabled={saving || isEmpty}
                  className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wide rounded-lg border border-red-900/60 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-red-400 disabled:cursor-not-allowed"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  Wyczyść dzień
                </button>
                <button
                  type="button"
                  onClick={() => setLocalDraft(createSampleDraft().map((v) => Math.min(v, limit)))}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wide rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Przykład
                </button>
              </>
            }
          />
        </div>
      </div>

      {/* Pasek zapisu */}
      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl px-5 py-3.5 shadow-2xl shadow-black/40">
        <div className="min-w-0">
          {dirty ? (
            <>
              <p className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Niezapisane zmiany w: {dateLabel}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Zapis zmieni tylko ten jeden dzień. Szablon i pozostałe dni pozostaną bez zmian.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Wszystkie zmiany zapisane
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocalDraft(toDemandArray(draft))}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-600 text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <Undo2 className="w-4 h-4" />
            Cofnij zmiany
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className={cn(
              'px-6 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 text-sm uppercase',
              dirty && !saving
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            )}
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Zapisz dzień
          </button>
        </div>
      </div>
    </div>
  );
}