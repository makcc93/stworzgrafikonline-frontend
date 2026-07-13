import { useState, useRef, useCallback, useEffect } from 'react';
import { PeriodEstimation } from './PeriodEstimation';
import { Loader, Copy, Save, AlertCircle, ChevronUp, ChevronDown, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DayOfWeekTemplate } from '@/types/draft.types';
import { getDatesForDayOfWeek, DEFAULT_DAY_TEMPLATES } from '@/types/draft.types';
import { draftService } from '@/services/api-provider';
import { formatDateForBackend } from '@/utils/draft.utils';

const MONTH_NAMES = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
const CHART_HEIGHT = 260;

interface TemplateManagerProps {
  storeId: number;
  year: number;
  month: number;
  maxValue?: number;
  onTemplatesSaved: () => void;
  // — dane z rodzica (YourDraft) — reaktywne na zapis z obu trybów —
  activeNonWarehouseCount: number;
  /** Suma indywidualnych norm etatu (z backendu), uwzgl. 1/2 etatu etc. */
  totalEmployeeNorm: number;
  /** Rzeczywista suma godzin z DB – wyliczana w YourDraft z drafts[], aktualizuje się po każdym zapisie */
  confirmedDraftHours: number;
  totalVacationDays: number;
  totalDelegationDays: number;
  warehousemanName?: string | null;
  /** true w ostatnim miesiącu okresu rozliczeniowego — wtedy totalEmployeeNorm to suma
   *  potwierdzonych godzin (nie norma etatu) i zapis szablonów jest blokowany, jeśli
   *  przekroczyłby ten budżet. */
  isLastMonthOfPeriod?: boolean;
  /** Godzina otwarcia sklepu dla aktualnie wybranego dnia tygodnia (np. 9 dla 09:00) */
  openHour?: number;
  /** Godzina zamknięcia sklepu dla aktualnie wybranego dnia tygodnia (np. 20 dla 20:00) */
  closeHour?: number;
  /** Callback wywoływany gdy użytkownik zmieni zakładkę dnia tygodnia */
  onDayOfWeekChange?: (dayOfWeek: number) => void;
}

/**
 * Klucz sessionStorage dla szablonów danego sklepu/roku/miesiąca.
 * Szablony są przechowywane lokalnie w sesji, niezależnie od draftów konkretnych dni.
 */
function getTemplateStorageKey(storeId: number, year: number, month: number): string {
  return `dayTemplates_${storeId}_${year}_${month}`;
}

function loadTemplatesFromStorage(storeId: number, year: number, month: number): DayOfWeekTemplate[] | null {
  try {
    const raw = sessionStorage.getItem(getTemplateStorageKey(storeId, year, month));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Weryfikacja: musi być tablica z 7 elementami zawierającymi hourlyDemand[24]
    if (
      Array.isArray(parsed) &&
      parsed.length === DEFAULT_DAY_TEMPLATES.length &&
      parsed.every((t: any) => Array.isArray(t.hourlyDemand) && t.hourlyDemand.length === 24)
    ) {
      return parsed as DayOfWeekTemplate[];
    }
    return null;
  } catch {
    return null;
  }
}

function saveTemplatesToStorage(storeId: number, year: number, month: number, templates: DayOfWeekTemplate[]): void {
  try {
    sessionStorage.setItem(getTemplateStorageKey(storeId, year, month), JSON.stringify(templates));
  } catch {
    // Ignoruj błędy sessionStorage (np. tryb prywatny z pełną pamięcią)
  }
}

export function TemplateManager({
  storeId,
  year,
  month,
  maxValue = 20,
  onTemplatesSaved,
  activeNonWarehouseCount,
  totalEmployeeNorm,
  confirmedDraftHours,
  totalVacationDays,
  totalDelegationDays,
  warehousemanName,
  isLastMonthOfPeriod = false,
  openHour,
  closeHour,
  onDayOfWeekChange,
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<DayOfWeekTemplate[]>(DEFAULT_DAY_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showNightHours, setShowNightHours] = useState(false);
  // Stan selecta "Kopiuj z dnia...". Bez tego React traktowałby <select> jako
  // niekontrolowany — przeglądarka sama "zapamiętywałaby" ostatnio wybrany dzień
  // w DOM, więc po przełączeniu zakładki dnia select wizualnie zostawałby na
  // poprzednio wybranej opcji, mimo że logicznie powinien wrócić do placeholdera.
  const [copySourceDay, setCopySourceDay] = useState<string>('');

  /**
   * Inicjalizacja szablonów:
   * 1. Sprawdź sessionStorage — jeśli użytkownik już edytował szablony w tej sesji,
   *    odtwórz je dokładnie takie jakie były (niezależnie od zmian w konkretnych dniach).
   * 2. Jeśli brak zapisu → użyj DEFAULT_DAY_TEMPLATES (puste szablony).
   *
   * CELOWO nie uśredniamy draftów z bazy — szablony to niezależny byt,
   * który nie powinien zmieniać się automatycznie gdy ktoś edytuje konkretny dzień.
   */
  useEffect(() => {
    if (!storeId) { setLoadingTemplates(false); return; }

    setLoadingTemplates(true);
    setHasChanges(false);

    const stored = loadTemplatesFromStorage(storeId, year, month);
    if (stored) {
      setTemplates(stored);
    } else {
      setTemplates(DEFAULT_DAY_TEMPLATES.map(t => ({ ...t, hourlyDemand: [...t.hourlyDemand] })));
    }

    setLoadingTemplates(false);
  }, [storeId, year, month]);

  const maxCap = Math.max(maxValue, 1);
  const currentTemplate = templates.find(t => t.dayOfWeek === selectedTemplate);
  const demand = currentTemplate?.hourlyDemand ?? [];
  const displayedHours = showNightHours
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 17 }, (_, i) => i + 6);

  const [dragging, setDragging] = useState<number | null>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setHourValue = useCallback((hour: number, newVal: number) => {
    setTemplates(prev => {
      const updated = prev.map(t =>
        t.dayOfWeek === selectedTemplate
          ? { ...t, hourlyDemand: t.hourlyDemand.map((v, i) => i === hour ? Math.max(0, Math.min(maxCap, Math.round(newVal))) : v) }
          : t
      );
      // Zapisz do sessionStorage przy każdej zmianie wartości
      saveTemplatesToStorage(storeId, year, month, updated);
      return updated;
    });
    setHasChanges(true);
  }, [selectedTemplate, maxCap, storeId, year, month]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging === null) return;
    const rect = columnRefs.current[dragging]?.getBoundingClientRect();
    if (!rect) return;
    setHourValue(dragging, (1 - Math.max(0, Math.min(rect.height, e.clientY - rect.top)) / rect.height) * maxCap);
  }, [dragging, maxCap, setHourValue]);

  const handleSelectTemplate = (dayOfWeek: number) => {
    setSelectedTemplate(dayOfWeek);
    setCopySourceDay('');
    onDayOfWeekChange?.(dayOfWeek);
  };

  // Zapis szablonów
  const handleSaveTemplates = async () => {
    // W ostatnim miesiącu okresu rozliczeniowego totalEmployeeNorm to suma godzin
    // potwierdzonych w zakładce "Pozostałe godziny pracowników" (nie norma etatu) -
    // blokujemy zapis, jeśli zastosowanie szablonów przekroczyłoby ten budżet.
    // Uwaga: to policzenie z górką - realny zapis może wyjść niżej, bo backend zeruje
    // zapotrzebowanie w dni świąteczne (holidayManager.isHoliday), a to liczy je tak jak są
    // w szablonie. Lepiej ostrzec z zapasem niż przepuścić przekroczenie.
    if (isLastMonthOfPeriod) {
      let projectedTotal = 0;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dow = new Date(year, month, day).getDay();
        const t = templates.find(t => t.dayOfWeek === dow);
        if (t) projectedTotal += t.hourlyDemand.reduce((a, b) => a + b, 0);
      }

      if (projectedTotal > totalEmployeeNorm) {
        const over = Math.round((projectedTotal - totalEmployeeNorm) * 10) / 10;
        toast.error(
          `Nie można zapisać - zapotrzebowanie z szablonów w tym miesiącu (${projectedTotal}h) przekroczyłoby dostępny budżet godzin pracowników (${totalEmployeeNorm}h) o ${over}h. Zmniejsz zapotrzebowanie albo zwiększ godziny w zakładce "Pozostałe godziny pracowników".`
        );
        return;
      }
    }

    try {
      setSaving(true);
      const existing = await draftService.getByDateRange(
        storeId,
        formatDateForBackend(new Date(year, month, 1)),
        formatDateForBackend(new Date(year, month + 1, 0))
      );
      const existingMap = new Map(existing.content.map(d => [d.draftDate, d]));
      let saved = 0, errors = 0;

      for (const template of templates) {
        const totalDemand = template.hourlyDemand.reduce((a, b) => a + b, 0);
        const dates = getDatesForDayOfWeek(year, month, template.dayOfWeek);
        for (const date of dates) {
          const dateStr = formatDateForBackend(date);
          const existingDraft = existingMap.get(dateStr);
          try {
            if (existingDraft) {
              await draftService.update(storeId, existingDraft.id, { draftDate: dateStr, hourlyDemand: template.hourlyDemand });
              saved++;
            } else if (totalDemand > 0) {
              await draftService.create(storeId, { draftDate: dateStr, hourlyDemand: template.hourlyDemand });
              saved++;
            }
          } catch { errors++; }
        }
      }

      if (errors > 0) toast.warning(`Zapisano ${saved} draftów, ${errors} błędów`);
      else toast.success(`Zapisano ${saved} draftów`);

      setHasChanges(false);
      onTemplatesSaved(); // rodzic przeładuje drafts[] → confirmedDraftHours się zaktualizuje
    } catch (err) {
      toast.error('Błąd zapisu szablonów');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Live suma godzin z aktualnego stanu szablonów (UI, jeszcze niezapisanych).
   * Przekazywana do PeriodEstimation tylko gdy hasChanges === true,
   * żeby pokazać deltę "co zmieni się po zapisie".
   * Gdy false → null, widget nie pokazuje delty (szablony == baza).
   */
  const totalDraftHoursFromTemplates = (() => {
    let total = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = new Date(year, month, day).getDay();
      const t = templates.find(t => t.dayOfWeek === dow);
      if (t) total += t.hourlyDemand.reduce((a, b) => a + b, 0);
    }
    return total;
  })();

  if (loadingTemplates) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 bg-[#0f172a] border border-slate-700 rounded-xl">
        <Loader className="w-5 h-5 text-blue-400 animate-spin" />
        <span className="text-slate-400 text-sm">Ładowanie szablonów...</span>
      </div>
    );
  }

  if (!currentTemplate) return null;

  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-5 border-b border-slate-700 bg-slate-900/80 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
            {MONTH_NAMES[month]} {year}
            {hasChanges && <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />}
          </h3>
          {/* Legenda kresek – wyświetlana gdy godziny sklepu są dostępne */}
          {(openHour !== undefined || closeHour !== undefined) && (
            <div className="flex items-center gap-3 mt-1">
              {openHour !== undefined && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <span style={{ display: 'inline-block', width: 12, borderTop: '2px dashed #34d399' }} />
                  Otwarcie {String(openHour).padStart(2, '0')}:00
                </span>
              )}
              {closeHour !== undefined && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                  <span style={{ display: 'inline-block', width: 12, borderTop: '2px dashed #f87171' }} />
                  Zamknięcie {String(closeHour).padStart(2, '0')}:00
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowNightHours(v => !v)}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border",
              showNightHours ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white")}>
            {showNightHours ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            {showNightHours ? "Ukryj godziny nocne" : "Pokaż godziny nocne"}
          </button>
          <button onClick={handleSaveTemplates} disabled={saving || !hasChanges}
            className={cn("px-6 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 text-sm uppercase",
              hasChanges ? "bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/20" : "bg-slate-800 text-slate-500 cursor-not-allowed")}>
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Zapisz
          </button>
        </div>
      </div>

      <div className="bg-amber-900/20 border-b border-amber-700/30 px-5 py-2 text-xs text-amber-400 flex items-center gap-2">
        <span>⚠️</span>
        <span>
          W planowaniu nie uwzględniamy magazyniera {warehousemanName ? ` (${warehousemanName})` : ''} — jeśli posiadasz dedykowanego pracownika, zaplanuj jego pracę w zakładce "Dostawy".
        </span>
      </div>

      {/* PeriodEstimation – props z rodzica, reaktywne */}
      <div className="px-5 py-3 border-b border-slate-800">
        <PeriodEstimation
          confirmedDraftHours={confirmedDraftHours}
          liveTemplateDraftHours={hasChanges ? totalDraftHoursFromTemplates : null}
          activeNonWarehouseCount={activeNonWarehouseCount}
          totalEmployeeNorm={totalEmployeeNorm}
          totalVacationDays={totalVacationDays}
          totalDelegationDays={totalDelegationDays}
        />
      </div>

      {/* Tabs */}
      <div className="bg-slate-950/50 p-2 flex gap-1 overflow-x-auto border-b border-slate-800">
        {templates.map(t => (
          <button key={t.dayOfWeek} onClick={() => handleSelectTemplate(t.dayOfWeek)}
            className={cn("px-4 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap border-2",
              selectedTemplate === t.dayOfWeek ? "bg-blue-600 border-blue-400 text-white" : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300")}>
            {t.dayName.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="p-4 bg-[#020617]">
        <div className="w-full">
          <div className="relative flex items-end" style={{ height: CHART_HEIGHT }}>
            <div className="flex-1 flex items-end gap-1.5 h-full border-b-2 border-slate-800 pb-10">
              {displayedHours.map(hour => {
                const value = demand[hour] ?? 0;
                const heightPct = (value / maxCap) * 100;
                const isNight = hour < 6 || hour > 22;

                // Kreski pionowe: wyświetlamy PRZED słupkiem danej godziny
                // openHour=9  → kreska przed indeksem godziny 9 (między 8 a 9)
                // closeHour=20 → kreska przed indeksem godziny 20 (między 19 a 20)
                const showOpenLine = openHour !== undefined && hour === openHour;
                const showCloseLine = closeHour !== undefined && hour === closeHour;

                return (
                  <div key={hour} className="flex-1 h-full flex flex-col justify-end group relative">
                    {/* Pionowa przerywana kreska otwarcia sklepu */}
                    {showOpenLine && (
                      <div
                        className="absolute left-0 top-0 bottom-10 z-10 flex flex-col items-center"
                        style={{ transform: 'translateX(-50%)' }}
                      >
                        <div
                          className="w-0 h-full"
                          style={{
                            borderLeft: '2px dashed #34d399',
                            height: '100%',
                          }}
                        />
                        <span
                          className="text-[9px] font-black text-emerald-400 whitespace-nowrap mt-1 bg-[#020617] px-1 rounded"
                          style={{ position: 'absolute', bottom: '-18px' }}
                        >
                          otw.
                        </span>
                      </div>
                    )}
                    {/* Pionowa przerywana kreska zamknięcia sklepu */}
                    {showCloseLine && (
                      <div
                        className="absolute left-0 top-0 bottom-10 z-10 flex flex-col items-center"
                        style={{ transform: 'translateX(-50%)' }}
                      >
                        <div
                          className="w-0 h-full"
                          style={{
                            borderLeft: '2px dashed #f87171',
                            height: '100%',
                          }}
                        />
                        <span
                          className="text-[9px] font-black text-red-400 whitespace-nowrap mt-1 bg-[#020617] px-1 rounded"
                          style={{ position: 'absolute', bottom: '-18px' }}
                        >
                          zam.
                        </span>
                      </div>
                    )}
                    <div ref={el => { columnRefs.current[hour] = el; }}
                      onPointerDown={e => { setDragging(hour); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
                      onPointerMove={handlePointerMove}
                      onPointerUp={e => { setDragging(null); try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {} }}
                      className="relative w-full bg-slate-800/10 rounded-t-md cursor-ns-resize touch-none hover:bg-slate-800/20"
                      style={{ height: '100%' }}>
                      <div className={cn("absolute bottom-0 left-0 right-0 rounded-t-md flex flex-col items-center",
                        dragging === hour ? "bg-cyan-400" : "bg-gradient-to-t from-blue-700 to-cyan-400")}
                        style={{ height: `${heightPct}%`, minHeight: value > 0 ? '4px' : '0' }}>
                        {value > 0 && (
                          <div className="mt-1.5 px-1 py-0.5 bg-white rounded shadow-md">
                            <span className="text-[10px] font-black text-slate-900 leading-none select-none">{value}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={cn("text-xs font-bold text-center mt-3 font-mono tracking-tighter",
                      isNight ? "text-amber-500" : "text-slate-400 group-hover:text-white")}>
                      {hour.toString().padStart(2, '0')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-1.5 mt-4">
            {displayedHours.map(hour => (
              <div key={hour} className="flex-1 flex flex-col gap-1">
                <button onClick={() => setHourValue(hour, (demand[hour] ?? 0) + 1)}
                  className="h-7 bg-slate-800/80 hover:bg-emerald-500 text-white rounded-md flex items-center justify-center border border-slate-700">
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button onClick={() => setHourValue(hour, (demand[hour] ?? 0) - 1)}
                  className="h-7 bg-slate-800/80 hover:bg-red-500 text-white rounded-md flex items-center justify-center border border-slate-700">
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 bg-slate-900 border-t border-slate-700">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => {
            setTemplates(prev => {
              const updated = prev.map(t => t.dayOfWeek === selectedTemplate ? { ...t, hourlyDemand: Array(24).fill(0) } : t);
              saveTemplatesToStorage(storeId, year, month, updated);
              return updated;
            });
            setHasChanges(true);
          }}
            className="px-4 py-2 bg-slate-900 text-red-500 border border-red-900/50 text-xs rounded-xl font-black hover:bg-red-600 hover:text-white">
            WYCZYŚĆ
          </button>
          <div className="relative">
            <select
              value={copySourceDay}
              onChange={e => {
                const sourceValue = e.target.value;
                setCopySourceDay(sourceValue);
                const source = templates.find(t => t.dayOfWeek === parseInt(sourceValue, 10));
                if (source) {
                  setTemplates(prev => {
                    const updated = prev.map(t => t.dayOfWeek === selectedTemplate ? { ...t, hourlyDemand: [...source.hourlyDemand] } : t);
                    saveTemplatesToStorage(storeId, year, month, updated);
                    return updated;
                  });
                  setHasChanges(true);
                  toast.success('Skopiowano!');
                  setCopySourceDay('');
                }
              }} className="pl-3 pr-8 py-2 bg-slate-800 text-white text-[10px] rounded-xl font-black appearance-none border border-slate-700 uppercase">
              <option value="">KOPIUJ Z DNIA...</option>
              {templates.filter(t => t.dayOfWeek !== selectedTemplate).map(t => (
                <option key={t.dayOfWeek} value={t.dayOfWeek}>{t.dayName}</option>
              ))}
            </select>
            <Copy className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}