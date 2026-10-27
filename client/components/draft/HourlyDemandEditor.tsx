/**
 * HourlyDemandEditor — wspólny edytor godzinowego zapotrzebowania (24 wartości).
 *
 * Używany w obu trybach modułu "Planowanie obsady":
 *  - Szablony dni tygodnia (TemplateManager)  — porównanie z wartościami zapisanymi w bazie,
 *  - Edycja konkretnych dni (DraftChart)      — porównanie z szablonem danego dnia tygodnia.
 *
 * Komponent jest w pełni kontrolowany: nie trzyma wartości, tylko woła onChangeHour(hour, value).
 * Zamiast 17 par przycisków ▲▼ wybiera się godzinę (klik / strzałki) i zmienia ją w inspektorze − / +
 * albo przeciągając słupek. Sterowanie klawiaturą: ↑ ↓ (Shift = ±5) zmiana wartości, ← → zmiana godziny,
 * Home / End pierwsza / ostatnia godzina.
 */
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight, Minus, Moon, Plus, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toDemandArray } from '@/utils/draft.utils';

const DAY_FIRST_HOUR = 6;
const DAY_LAST_HOUR = 22;
/** Wysokość strefy słupków (px). */
const BAR_AREA_HEIGHT = 240;
/** Miejsce nad słupkami na etykiety wartości i znaczniki otwarcia/zamknięcia (px). */
const LABEL_PAD = 36;
/** Minimalna skala osi Y — przy małych wartościach słupki nie zajmują całej wysokości. */
const MIN_SCALE = 8;
/** Ile pikseli trzeba przesunąć wskaźnik, zanim klik zamieni się w przeciąganie (chroni przed przypadkową zmianą). */
const DRAG_THRESHOLD_PX = 4;

const pad2 = (n: number) => String(n).padStart(2, '0');
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export type BaselineKind = 'saved' | 'template';

export interface HourlyDemandEditorProps {
  /** 24 wartości — aktualny (edytowany) stan. */
  values: number[];
  /** Wywoływane tylko przy realnej zmianie; wartość jest już zaokrąglona i przycięta do [0, maxValue]. */
  onChangeHour: (hour: number, value: number) => void;
  /** Wartości porównawcze (24) — zapisane w bazie albo z szablonu; null/undefined = bez porównania. */
  baseline?: number[] | null;
  /**
   * 'saved'    — baseline to stan zapisany w bazie: zmienione godziny dostają bursztynową obwódkę i "było X · niezapisane".
   * 'template' — baseline to szablon dnia tygodnia: odchylenia są pokazane jako przerywany obrys szablonu.
   */
  baselineKind?: BaselineKind;
  /** Nazwa porównania do legendy, np. "zapisane w bazie" albo "szablon środy". */
  baselineLabel?: string;
  /** Limit obsady (maks. wartość pojedynczej godziny). */
  maxValue: number;
  /** Godzina otwarcia sklepu (np. 9 dla 09:00) — razem z closeHour rysuje pasmo godzin otwarcia. */
  openHour?: number;
  /** Godzina zamknięcia sklepu (np. 20 dla 20:00). */
  closeHour?: number;
  /** Blokuje edycję (np. w trakcie zapisu). */
  disabled?: boolean;
  /** Dodatkowe akcje nad wykresem (np. "Kopiuj z dnia", "Wyczyść"). */
  toolbar?: ReactNode;
}

function niceScale(peak: number, cap: number): number {
  const wanted = Math.max(MIN_SCALE, Math.ceil((peak + 1) / 2) * 2);
  // Skala nigdy nie jest mniejsza niż najwyższy słupek (np. stare dane ponad aktualnym limitem sklepu).
  return Math.max(Math.min(cap, wanted), peak, 1);
}

function yTicks(scale: number): number[] {
  const step = scale <= 10 ? 2 : scale <= 20 ? 5 : scale <= 50 ? 10 : 20;
  const ticks: number[] = [];
  for (let t = 0; t <= scale; t += step) ticks.push(t);
  return ticks;
}

export function HourlyDemandEditor({
  values,
  onChangeHour,
  baseline = null,
  baselineKind = 'saved',
  baselineLabel,
  maxValue,
  openHour,
  closeHour,
  disabled = false,
  toolbar,
}: HourlyDemandEditorProps) {
  const cap = Math.max(1, Math.floor(maxValue) || 1);
  const vals = useMemo(() => toDemandArray(values), [values]);
  const baseVals = useMemo(() => (baseline ? toDemandArray(baseline) : null), [baseline]);

  const [showNight, setShowNight] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number>(() =>
    clamp(openHour ?? 12, DAY_FIRST_HOUR, DAY_LAST_HOUR)
  );
  /** Skala zamrożona na czas przeciągania — inaczej wykres "uciekałby" spod palca przy każdej zmianie. */
  const [frozenScale, setFrozenScale] = useState<number | null>(null);

  const dragRef = useRef<{ hour: number; startY: number; moved: boolean } | null>(null);
  const sliderRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Dane poza 06–22 nie mogą być ukryte — inaczej wchodzą do sum, a nie ma ich na wykresie.
  const hasNightValues = vals.some((v, h) => v > 0 && (h < DAY_FIRST_HOUR || h > DAY_LAST_HOUR));
  const nightVisible = showNight || hasNightValues;

  const displayedHours = useMemo(
    () =>
      nightVisible
        ? Array.from({ length: 24 }, (_, i) => i)
        : Array.from({ length: DAY_LAST_HOUR - DAY_FIRST_HOUR + 1 }, (_, i) => i + DAY_FIRST_HOUR),
    [nightVisible]
  );
  const firstVisible = displayedHours[0];
  const lastVisible = displayedHours[displayedHours.length - 1];
  const activeHour = clamp(selectedHour, firstVisible, lastVisible);

  const peak = Math.max(0, ...vals, ...(baseVals ?? []));
  const autoScale = niceScale(peak, cap);
  const scale = frozenScale ?? autoScale;

  const hasBand =
    openHour !== undefined && closeHour !== undefined && openHour < closeHour;
  const bandStart = hasBand ? clamp(openHour as number, firstVisible, lastVisible + 1) : 0;
  const bandEnd = hasBand ? clamp(closeHour as number, firstVisible, lastVisible + 1) : 0;
  const columnCount = displayedHours.length;
  const bandLeftPct = ((bandStart - firstVisible) / columnCount) * 100;
  const bandWidthPct = ((bandEnd - bandStart) / columnCount) * 100;
  const showBand = hasBand && bandWidthPct > 0;
  const openLineVisible = hasBand && (openHour as number) >= firstVisible && (openHour as number) <= lastVisible + 1;
  const closeLineVisible = hasBand && (closeHour as number) >= firstVisible && (closeHour as number) <= lastVisible + 1;

  const commitValue = useCallback(
    (hour: number, raw: number) => {
      if (disabled) return;
      const next = clamp(Math.round(raw), 0, cap);
      if (next === vals[hour]) return;
      onChangeHour(hour, next);
    },
    [disabled, cap, vals, onChangeHour]
  );

  const moveSelection = useCallback(
    (delta: number | 'first' | 'last', focus: boolean) => {
      const idx = displayedHours.indexOf(activeHour);
      const targetIdx =
        delta === 'first' ? 0 : delta === 'last' ? displayedHours.length - 1 : clamp(idx + delta, 0, displayedHours.length - 1);
      const target = displayedHours[targetIdx];
      setSelectedHour(target);
      if (focus) sliderRefs.current[target]?.focus();
    },
    [displayedHours, activeHour]
  );

  const endDrag = useCallback((e?: PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setFrozenScale(null);
    if (e) {
      try {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* przeglądarka mogła już zwolnić przechwycenie */
      }
    }
  }, []);

  const handlePointerDown = (hour: number, e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    setSelectedHour(hour);
    dragRef.current = { hour, startY: e.clientY, moved: false };
    setFrozenScale(autoScale);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* brak przechwytywania — przeciąganie nadal działa w obrębie słupka */
    }
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved) {
      if (Math.abs(e.clientY - drag.startY) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
    }
    const rect = sliderRefs.current[drag.hour]?.getBoundingClientRect();
    if (!rect || rect.height === 0) return;
    const ratio = 1 - clamp((e.clientY - rect.top) / rect.height, 0, 1);
    commitValue(drag.hour, ratio * (frozenScale ?? autoScale));
  };

  const handleKeyDown = (hour: number, e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 5 : 1;
    switch (e.key) {
      case 'ArrowUp':
        commitValue(hour, vals[hour] + step);
        break;
      case 'ArrowDown':
        commitValue(hour, vals[hour] - step);
        break;
      case 'ArrowRight':
        moveSelection(1, true);
        break;
      case 'ArrowLeft':
        moveSelection(-1, true);
        break;
      case 'Home':
        moveSelection('first', true);
        break;
      case 'End':
        moveSelection('last', true);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  // ── statystyki do paska podsumowania ──
  const total = vals.reduce((a, b) => a + b, 0);
  const peakValue = Math.max(0, ...vals);
  const peakHours = vals.map((v, h) => (v === peakValue && v > 0 ? h : -1)).filter((h) => h !== -1);
  const staffedHours = vals.filter((v) => v > 0).length;
  const avgBase = hasBand
    ? vals.slice(openHour as number, closeHour as number)
    : vals.filter((v) => v > 0);
  const avg = avgBase.length > 0 ? Math.round((avgBase.reduce((a, b) => a + b, 0) / avgBase.length) * 10) / 10 : 0;
  const baseTotal = baseVals ? baseVals.reduce((a, b) => a + b, 0) : null;
  const delta = baseTotal !== null ? total - baseTotal : null;

  const activeValue = vals[activeHour];
  const activeBase = baseVals ? baseVals[activeHour] : null;
  const ticks = yTicks(scale);

  return (
    <div className="space-y-4">
      {/* Pasek narzędzi + legenda */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-400">
            <li className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-gradient-to-t from-blue-700 to-cyan-400" />
              Obsada
            </li>
            {showBand && (
              <li className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400/20 border border-dashed border-emerald-400/70" />
                Godziny otwarcia
              </li>
            )}
            {baseVals && baselineLabel && (
              <li className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block w-3 h-3 rounded-sm border border-dashed',
                    baselineKind === 'saved' ? 'border-amber-400' : 'border-slate-300'
                  )}
                />
                {baselineLabel}
              </li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => setShowNight((v) => !v)}
            disabled={hasNightValues}
            title={hasNightValues ? 'Są wartości w godzinach nocnych — nie można ich ukryć' : undefined}
            aria-pressed={nightVisible}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors border disabled:cursor-not-allowed',
              nightVisible
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            )}
          >
            {nightVisible ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {nightVisible ? 'Ukryj godziny nocne' : 'Pokaż godziny nocne'}
          </button>
        </div>
      </div>

      {/* Wykres */}
      <div className="bg-[#020617] border border-slate-800 rounded-xl px-3 pt-3 pb-2">
        <div
          role="group"
          aria-label="Wykres godzinowego zapotrzebowania na obsadę"
          className="relative pl-8 pr-6"
          style={{ height: LABEL_PAD + BAR_AREA_HEIGHT }}
        >
          {/* Strefa słupków */}
          <div className="absolute left-8 right-6 bottom-0" style={{ top: LABEL_PAD }}>
            {/* linie siatki + oś Y */}
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute left-0 right-0 pointer-events-none"
                style={{ bottom: `${(t / scale) * 100}%` }}
              >
                <div className={cn('border-t', t === 0 ? 'border-slate-700' : 'border-slate-800/80')} />
                <span className="absolute -left-8 w-6 text-right text-[10px] font-semibold text-slate-500 tabular-nums -translate-y-1/2">
                  {t}
                </span>
              </div>
            ))}

            {/* pasmo godzin otwarcia */}
            {showBand && (
              <div
                className="absolute top-0 bottom-0 bg-emerald-400/[0.05] pointer-events-none"
                style={{ left: `${bandLeftPct}%`, width: `${bandWidthPct}%` }}
              />
            )}
            {openLineVisible && (
              <div
                className="absolute top-0 bottom-0 border-l-2 border-dashed border-emerald-400/80 pointer-events-none"
                style={{ left: `${((clamp(openHour as number, firstVisible, lastVisible + 1) - firstVisible) / columnCount) * 100}%` }}
              >
                <span className="absolute -top-[26px] -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-emerald-400">
                  otwarcie {pad2(openHour as number)}:00
                </span>
              </div>
            )}
            {closeLineVisible && (
              <div
                className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-400/80 pointer-events-none"
                style={{ left: `${((clamp(closeHour as number, firstVisible, lastVisible + 1) - firstVisible) / columnCount) * 100}%` }}
              >
                <span className="absolute -top-[26px] -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-red-400">
                  zamknięcie {pad2(closeHour as number)}:00
                </span>
              </div>
            )}

            {/* kolumny = suwaki godzin */}
            <div className="relative flex h-full">
              {displayedHours.map((hour) => {
                const value = vals[hour];
                const base = baseVals ? baseVals[hour] : null;
                const changed = base !== null && base !== value;
                const isSelected = hour === activeHour;
                const inOpen = !hasBand || (hour >= (openHour as number) && hour < (closeHour as number));
                const heightPct = Math.min(100, (value / scale) * 100);
                const ghostPct = base !== null ? Math.min(100, (base / scale) * 100) : 0;
                const unsaved = changed && baselineKind === 'saved';

                return (
                  <div
                    key={hour}
                    ref={(el) => {
                      sliderRefs.current[hour] = el;
                    }}
                    role="slider"
                    tabIndex={isSelected ? 0 : -1}
                    aria-orientation="vertical"
                    aria-label={`Godzina ${pad2(hour)}:00–${pad2(hour + 1)}:00`}
                    aria-valuemin={0}
                    aria-valuemax={cap}
                    aria-valuenow={value}
                    aria-valuetext={`${value} os.`}
                    aria-disabled={disabled}
                    onFocus={() => setSelectedHour(hour)}
                    onKeyDown={(e) => handleKeyDown(hour, e)}
                    onPointerDown={(e) => handlePointerDown(hour, e)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onLostPointerCapture={() => {
                      dragRef.current = null;
                      setFrozenScale(null);
                    }}
                    className={cn(
                      'relative flex-1 min-w-0 h-full rounded-t-md outline-none touch-none select-none',
                      disabled ? 'cursor-not-allowed' : 'cursor-ns-resize',
                      isSelected ? 'bg-cyan-400/10' : 'hover:bg-slate-800/40',
                      'focus-visible:ring-2 focus-visible:ring-cyan-300'
                    )}
                  >
                    {/* słupek */}
                    <div
                      className={cn(
                        'absolute left-[2px] right-[2px] bottom-0 rounded-t-md pointer-events-none',
                        value === 0
                          ? 'bg-slate-700/80'
                          : inOpen
                          ? 'bg-gradient-to-t from-blue-700 to-cyan-400'
                          : 'bg-gradient-to-t from-slate-600 to-slate-400',
                        unsaved && 'ring-2 ring-amber-400',
                        isSelected && !unsaved && 'ring-2 ring-white/80'
                      )}
                      style={{ height: value > 0 ? `max(3px, ${heightPct}%)` : '2px' }}
                    />

                    {/* przerywany obrys wartości porównawczej (tylko tam, gdzie się różni) — nad słupkiem, żeby był widoczny także, gdy słupek jest wyższy */}
                    {changed && base !== null && base > 0 && (
                      <div
                        className={cn(
                          'absolute left-[2px] right-[2px] bottom-0 rounded-t-md border-2 border-dashed border-b-0 pointer-events-none',
                          baselineKind === 'saved' ? 'border-amber-400' : 'border-slate-300'
                        )}
                        style={{ height: `${ghostPct}%` }}
                      />
                    )}

                    {/* etykieta wartości */}
                    {(value > 0 || isSelected) && (
                      <span
                        className={cn(
                          'absolute left-1/2 -translate-x-1/2 text-[11px] font-bold leading-none tabular-nums pointer-events-none',
                          isSelected ? 'text-white' : 'text-slate-300'
                        )}
                        style={{ bottom: `calc(${value > 0 ? `max(3px, ${heightPct}%)` : '2px'} + 4px)` }}
                      >
                        {value}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Etykiety godzin */}
        <div className="flex pl-8 pr-6 mt-1">
          {displayedHours.map((hour) => {
            const isNight = hour < DAY_FIRST_HOUR || hour > DAY_LAST_HOUR;
            return (
              <div
                key={hour}
                className={cn(
                  'flex-1 min-w-0 text-center text-[11px] font-mono font-bold py-0.5 rounded',
                  hour === activeHour
                    ? 'text-white bg-slate-700/70'
                    : isNight
                    ? 'text-amber-500'
                    : 'text-slate-500'
                )}
              >
                {pad2(hour)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspektor wybranej godziny */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => moveSelection(-1, false)}
            disabled={activeHour === firstVisible}
            aria-label="Poprzednia godzina"
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-[120px] text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Wybrana godzina</p>
            <p className="text-base font-black text-white tabular-nums">
              {pad2(activeHour)}:00–{pad2(activeHour + 1)}:00
            </p>
          </div>
          <button
            type="button"
            onClick={() => moveSelection(1, false)}
            disabled={activeHour === lastVisible}
            aria-label="Następna godzina"
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => commitValue(activeHour, activeValue - 1)}
            disabled={disabled || activeValue <= 0}
            aria-label="Zmniejsz obsadę o 1"
            className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-600 text-white hover:bg-red-600 hover:border-red-500 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:hover:border-slate-600 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Minus className="w-5 h-5" />
          </button>
          <div className="min-w-[64px] text-center leading-none">
            <span className="text-4xl font-black text-white tabular-nums" aria-live="polite">
              {activeValue}
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
              z limitu {cap}
            </span>
          </div>
          <button
            type="button"
            onClick={() => commitValue(activeHour, activeValue + 1)}
            disabled={disabled || activeValue >= cap}
            aria-label="Zwiększ obsadę o 1"
            className="w-11 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {activeBase !== null && baselineKind === 'saved' && activeBase !== activeValue && (
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1">
            było {activeBase} · niezapisane
          </span>
        )}
        {activeBase !== null && baselineKind === 'template' && (
          <span
            className={cn(
              'text-xs font-bold rounded-lg px-2.5 py-1 border',
              activeBase === activeValue
                ? 'text-slate-400 bg-slate-800/60 border-slate-700'
                : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
            )}
          >
            {activeBase === activeValue ? 'zgodne z szablonem' : `szablon: ${activeBase}`}
          </span>
        )}

        <p className="ml-auto text-[11px] text-slate-500 max-w-[260px] leading-snug">
          Przeciągnij słupek w pionie albo użyj klawiszy: ↑ ↓ zmieniają wartość (Shift = ±5), ← → przechodzą między godzinami.
        </p>
      </div>

      {/* Pasek podsumowania */}
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3">
          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Suma godzin</dt>
          <dd className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-300 tabular-nums">{total}</span>
            <span className="text-xs text-slate-500">h</span>
            {delta !== null && delta !== 0 && (
              <span className={cn('text-xs font-bold tabular-nums', delta > 0 ? 'text-amber-400' : 'text-sky-300')}>
                {delta > 0 ? `+${delta}` : delta} h
              </span>
            )}
          </dd>
        </div>
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3">
          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Szczyt</dt>
          <dd className="mt-1">
            <span className="text-2xl font-black text-cyan-300 tabular-nums">{peakValue}</span>
            <span className="text-xs text-slate-500 ml-1.5">os.</span>
            <span className="block text-[11px] text-slate-500 tabular-nums">
              {peakHours.length > 0
                ? `${pad2(peakHours[0])}:00–${pad2(peakHours[peakHours.length - 1] + 1)}:00`
                : 'brak obsady'}
            </span>
          </dd>
        </div>
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3">
          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {hasBand ? 'Średnio w godz. otwarcia' : 'Średnio (godz. z obsadą)'}
          </dt>
          <dd className="mt-1">
            <span className="text-2xl font-black text-emerald-300 tabular-nums">{avg}</span>
            <span className="text-xs text-slate-500 ml-1.5">os.</span>
          </dd>
        </div>
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3">
          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Godziny z obsadą</dt>
          <dd className="mt-1">
            <span className="text-2xl font-black text-amber-300 tabular-nums">{staffedHours}</span>
            <span className="text-xs text-slate-500 ml-1.5">z 24</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Miniwykres słupkowy (np. na liście dni tygodnia) — czysto prezentacyjny. */
export function DemandSparkline({
  values,
  className,
  barClassName,
}: {
  values: number[];
  className?: string;
  barClassName?: string;
}) {
  const vals = toDemandArray(values).slice(DAY_FIRST_HOUR, DAY_LAST_HOUR + 1);
  const max = Math.max(1, ...vals);
  return (
    <div className={cn('flex items-end gap-px h-6', className)} aria-hidden="true">
      {vals.map((v, i) => (
        <span
          key={i}
          className={cn('flex-1 rounded-[1px]', v > 0 ? 'bg-cyan-400/80' : 'bg-slate-700/70', barClassName)}
          style={{ height: v > 0 ? `${Math.max(12, (v / max) * 100)}%` : '2px' }}
        />
      ))}
    </div>
  );
}