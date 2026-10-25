import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { PeriodEstimation } from './PeriodEstimation';
import { Loader, Copy, Save, AlertCircle, ChevronUp, ChevronDown, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DayOfWeekTemplate, ResponseDemandDraftDTO } from '@/types/draft.types';
import { getDatesForDayOfWeek, DEFAULT_DAY_TEMPLATES } from '@/types/draft.types';
import { draftService } from '@/services/api-provider';
import { formatDateForBackend, buildTemplatesFromDrafts } from '@/utils/draft.utils';

const MONTH_NAMES = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
const CHART_HEIGHT = 260;

interface TemplateManagerProps {
  storeId: number;
  year: number;
  month: number;
  maxValue?: number;
  onTemplatesSaved: () => void;
  /** Aktualne drafty miesiąca z rodzica (YourDraft) — źródło prawdy dla szablonów. */
  drafts: ResponseDemandDraftDTO[];
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
   *  potwierdzonych godzin (nie norma etatu) i zapis szablonu jest blokowany, jeśli
   *  przekroczyłby ten budżet. */
  isLastMonthOfPeriod?: boolean;
  /** Godzina otwarcia sklepu dla aktualnie wybranego dnia tygodnia (np. 9 dla 09:00) */
  openHour?: number;
  /** Godzina zamknięcia sklepu dla aktualnie wybranego dnia tygodnia (np. 20 dla 20:00) */
  closeHour?: number;
  /** Callback wywoływany gdy użytkownik zmieni zakładkę dnia tygodnia */
  onDayOfWeekChange?: (dayOfWeek: number) => void;
}

// ============================================================
// Niezapisane edycje (sessionStorage)
//
// Źródłem prawdy są drafty w bazie. sessionStorage trzyma wyłącznie roboczą kopię
// NIEZAPISANYCH edycji, osobno dla każdego dnia tygodnia, żeby nie znikły np. po
// przełączeniu trybu na "Edycja Konkretnych Dni". Każdy dzień ma "podpis" stanu bazy,
// z którego powstała edycja (baseSignature) — jeśli baza zmieniła się w międzyczasie
// (np. admin zapisał ten dzień), kopia jest nieaktualna i zostaje odrzucona.
// ============================================================

/** dzień tygodnia (0-6) → podpis stanu bazy z momentu rozpoczęcia edycji tego dnia */
type DirtyBase = Record<number, string>;

interface StoredDay {
  baseSignature: string;
  hourlyDemand: number[];
}

function getTemplateStorageKey(storeId: number, year: number, month: number): string {
  return `dayTemplates_${storeId}_${year}_${month}`;
}

function daySignature(hourlyDemand: number[]): string {
  return JSON.stringify(hourlyDemand);
}

function toDemandArray(hourlyDemand: number[] | string): number[] {
  if (typeof hourlyDemand === 'string') {
    try { return JSON.parse(hourlyDemand); } catch { return Array(24).fill(0); }
  }
  return hourlyDemand;
}

function sumDemand(hourlyDemand: number[] | string): number {
  return toDemandArray(hourlyDemand).reduce((a, b) => a + b, 0);
}

function normalizeDate(draftDate: string): string {
  return draftDate.split('T')[0];
}

function loadStoredDays(storeId: number, year: number, month: number): Record<number, StoredDay> | null {
  try {
    const raw = sessionStorage.getItem(getTemplateStorageKey(storeId, year, month));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Stary format (cała tablica 7 szablonów albo { baseSignature, templates }) nie ma pola `days`
    // — jest odrzucany jako nieaktualny.
    if (!parsed || typeof parsed.days !== 'object' || parsed.days === null) return null;

    const result: Record<number, StoredDay> = {};
    for (const [key, value] of Object.entries<any>(parsed.days)) {
      const dow = Number(key);
      if (
        Number.isInteger(dow) && dow >= 0 && dow <= 6 &&
        value && typeof value.baseSignature === 'string' &&
        Array.isArray(value.hourlyDemand) && value.hourlyDemand.length === 24
      ) {
        result[dow] = { baseSignature: value.baseSignature, hourlyDemand: value.hourlyDemand };
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

/** Zapisuje do sessionStorage tylko dni z niezapisanymi zmianami; gdy ich nie ma — czyści klucz. */
function persistDirtyDays(
  storeId: number,
  year: number,
  month: number,
  templates: DayOfWeekTemplate[],
  dirtyBase: DirtyBase
): void {
  try {
    const key = getTemplateStorageKey(storeId, year, month);
    const days: Record<number, StoredDay> = {};
    for (const t of templates) {
      const base = dirtyBase[t.dayOfWeek];
      if (base !== undefined) days[t.dayOfWeek] = { baseSignature: base, hourlyDemand: t.hourlyDemand };
    }
    if (Object.keys(days).length === 0) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify({ days }));
  } catch {
    // Ignoruj błędy sessionStorage (np. tryb prywatny z pełną pamięcią)
  }
}

function emptyTemplates(): DayOfWeekTemplate[] {
  return DEFAULT_DAY_TEMPLATES.map(t => ({ ...t, hourlyDemand: Array(24).fill(0) }));
}

export function TemplateManager({
  storeId,
  year,
  month,
  maxValue = 20,
  onTemplatesSaved,
  drafts,
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
  const [templates, setTemplates] = useState<DayOfWeekTemplate[]>(emptyTemplates);
  /** Dni tygodnia z niezapisanymi zmianami (klucz = dayOfWeek). */
  const [dirtyBase, setDirtyBase] = useState<DirtyBase>({});
  const [selectedTemplate, setSelectedTemplate] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showNightHours, setShowNightHours] = useState(false);
  // Stan selecta "Kopiuj z dnia...". Bez tego React traktowałby <select> jako
  // niekontrolowany — przeglądarka sama "zapamiętywałaby" ostatnio wybrany dzień
  // w DOM, więc po przełączeniu zakładki dnia select wizualnie zostawałby na
  // poprzednio wybranej opcji, mimo że logicznie powinien wrócić do placeholdera.
  const [copySourceDay, setCopySourceDay] = useState<string>('');

  // Lustra stanu w refach — handlery (przeciąganie słupków, zapis po await) zawsze czytają
  // aktualne wartości, bez ryzyka zdezaktualizowanego closure.
  const templatesRef = useRef<DayOfWeekTemplate[]>(templates);
  const dirtyBaseRef = useRef<DirtyBase>({});
  /** Czy niezapisane edycje z sessionStorage zostały już rozpatrzone dla bieżącego sklepu/miesiąca. */
  const restoredRef = useRef(false);
  const viewKey = `${storeId}_${year}_${month}`;
  const viewKeyRef = useRef(viewKey);
  viewKeyRef.current = viewKey;

  // Drafty wyłącznie bieżącego sklepu. Przy przełączaniu sklepu rodzic na chwilę
  // nadal może przekazać drafty poprzedniego sklepu (czyści je dopiero w swoim efekcie).
  const storeDrafts = useMemo(
    () => drafts.filter(d => d.storeId === storeId),
    [drafts, storeId]
  );

  // Szablony zbudowane z bazy (uśrednione per dzień tygodnia) + podpisy poszczególnych dni.
  const dbTemplates = useMemo(() => buildTemplatesFromDrafts(storeDrafts), [storeDrafts]);
  const dbDaySignatures = useMemo(() => {
    const result: Record<number, string> = {};
    for (const t of dbTemplates) result[t.dayOfWeek] = daySignature(t.hourlyDemand);
    return result;
  }, [dbTemplates]);
  const dbDaySignaturesRef = useRef(dbDaySignatures);
  dbDaySignaturesRef.current = dbDaySignatures;

  /** Jedyne miejsce zmieniające stan szablonów: stan + refy + kopia robocza w sessionStorage. */
  const commit = useCallback((nextTemplates: DayOfWeekTemplate[], nextDirty: DirtyBase) => {
    templatesRef.current = nextTemplates;
    dirtyBaseRef.current = nextDirty;
    setTemplates(nextTemplates);
    setDirtyBase(nextDirty);
    persistDirtyDays(storeId, year, month, nextTemplates, nextDirty);
  }, [storeId, year, month]);

  /** Edycja JEDNEGO dnia tygodnia — oznacza tylko ten dzień jako niezapisany. */
  const applyEdit = useCallback((dayOfWeek: number, updater: (prev: number[]) => number[]) => {
    const current = templatesRef.current;
    const target = current.find(t => t.dayOfWeek === dayOfWeek);
    if (!target) return;

    const nextDemand = updater(target.hourlyDemand);
    if (daySignature(nextDemand) === daySignature(target.hourlyDemand)) return; // bez realnej zmiany

    const nextTemplates = current.map(t => t.dayOfWeek === dayOfWeek ? { ...t, hourlyDemand: nextDemand } : t);
    const nextDirty: DirtyBase = dirtyBaseRef.current[dayOfWeek] !== undefined
      ? dirtyBaseRef.current
      : { ...dirtyBaseRef.current, [dayOfWeek]: dbDaySignaturesRef.current[dayOfWeek] ?? daySignature(Array(24).fill(0)) };

    commit(nextTemplates, nextDirty);
  }, [commit]);

  // Zmiana sklepu / miesiąca → zaczynamy od zera.
  // Musi być zadeklarowany PRZED efektem poniżej — efekty odpalają się w kolejności deklaracji.
  useEffect(() => {
    restoredRef.current = false;
    templatesRef.current = emptyTemplates();
    dirtyBaseRef.current = {};
    setDirtyBase({});
    setLoadingTemplates(!!storeId);
  }, [storeId, year, month]);

  /**
   * Synchronizacja szablonów z bazą. Źródłem prawdy są drafty z bazy:
   * - dni tygodnia BEZ niezapisanych zmian zawsze pokazują dane z bazy (odświeżają się
   *   po każdym przeładowaniu draftów, np. po zapisie albo po załadowaniu),
   * - dni Z niezapisanymi zmianami zachowują edycje użytkownika,
   * - raz na sklep/miesiąc przywracamy niezapisane edycje z sessionStorage, ale tylko
   *   dla dni, w których baza nie zmieniła się od czasu edycji (zgodny podpis).
   *   Nieaktualne kopie są odrzucane.
   */
  useEffect(() => {
    if (!storeId) { setLoadingTemplates(false); return; }

    const nextDirty: DirtyBase = { ...dirtyBaseRef.current };
    const overlay: Record<number, number[]> = {};

    if (!restoredRef.current) {
      const stored = loadStoredDays(storeId, year, month);
      if (stored) {
        for (const [key, value] of Object.entries(stored)) {
          const dow = Number(key);
          if (nextDirty[dow] !== undefined) continue; // użytkownik już edytuje ten dzień
          if (value.baseSignature === dbDaySignatures[dow]) {
            nextDirty[dow] = value.baseSignature;
            overlay[dow] = value.hourlyDemand;
          }
        }
      }
      // Dopóki drafty się ładują (pusta lista), nie ma z czym porównać — próbujemy ponownie
      // przy kolejnym przebiegu. Gdy drafty dotarły, decyzja jest ostateczna.
      if (storeDrafts.length > 0) restoredRef.current = true;
    }

    const current = templatesRef.current;
    const merged = dbTemplates.map(t => {
      if (overlay[t.dayOfWeek]) return { ...t, hourlyDemand: overlay[t.dayOfWeek] };
      if (nextDirty[t.dayOfWeek] !== undefined) {
        const local = current.find(c => c.dayOfWeek === t.dayOfWeek);
        if (local) return local;
      }
      return t;
    });

    templatesRef.current = merged;
    dirtyBaseRef.current = nextDirty;
    setTemplates(merged);
    setDirtyBase(nextDirty);
    if (restoredRef.current) persistDirtyDays(storeId, year, month, merged, nextDirty); // sprząta nieaktualne kopie
    setLoadingTemplates(false);
  }, [storeId, year, month, storeDrafts, dbTemplates, dbDaySignatures]);

  const maxCap = Math.max(maxValue, 1);
  const currentTemplate = templates.find(t => t.dayOfWeek === selectedTemplate);
  const demand = currentTemplate?.hourlyDemand ?? [];
  const displayedHours = showNightHours
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 17 }, (_, i) => i + 6);

  const selectedDirty = dirtyBase[selectedTemplate] !== undefined;
  const dirtyDayNames = templates.filter(t => dirtyBase[t.dayOfWeek] !== undefined).map(t => t.dayName);
  const otherDirtyDayNames = templates
    .filter(t => t.dayOfWeek !== selectedTemplate && dirtyBase[t.dayOfWeek] !== undefined)
    .map(t => t.dayName);
  const anyDirty = dirtyDayNames.length > 0;

  const [dragging, setDragging] = useState<number | null>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setHourValue = useCallback((hour: number, newVal: number) => {
    const clamped = Math.max(0, Math.min(maxCap, Math.round(newVal)));
    applyEdit(selectedTemplate, prev => prev.map((v, i) => i === hour ? clamped : v));
  }, [selectedTemplate, maxCap, applyEdit]);

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

  /**
   * Zapis szablonu JEDNEGO, aktualnie wybranego dnia tygodnia: nadpisuje wszystkie takie dni
   * w miesiącu (np. wszystkie środy), także te edytowane wcześniej indywidualnie.
   * Pozostałe dni tygodnia nie są ruszane — ani w bazie, ani w ich niezapisanych edycjach.
   */
  const handleSaveSelectedDay = async () => {
    const dayOfWeek = selectedTemplate;
    const template = templatesRef.current.find(t => t.dayOfWeek === dayOfWeek);
    if (!template) return;

    const savedViewKey = viewKeyRef.current;
    const totalDemand = template.hourlyDemand.reduce((a, b) => a + b, 0);
    const dates = getDatesForDayOfWeek(year, month, dayOfWeek);

    try {
      setSaving(true);
      const existing = await draftService.getByDateRange(
        storeId,
        formatDateForBackend(new Date(year, month, 1)),
        formatDateForBackend(new Date(year, month + 1, 0))
      );
      const existingMap = new Map(existing.content.map(d => [normalizeDate(d.draftDate), d]));

      // W ostatnim miesiącu okresu rozliczeniowego totalEmployeeNorm to suma godzin
      // potwierdzonych w zakładce "Pozostałe godziny pracowników" (nie norma etatu) -
      // blokujemy zapis, jeśli po zapisie tego dnia tygodnia suma przekroczyłaby ten budżet.
      // Pozostałe dni liczymy takimi, jakie są teraz w bazie (nie ruszamy ich).
      // Uwaga: to policzenie z górką - backend zeruje zapotrzebowanie w dni świąteczne
      // (holidayManager.isHoliday), a tu liczymy je tak jak w szablonie. Lepiej ostrzec z zapasem.
      if (isLastMonthOfPeriod) {
        let projectedTotal = 0;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          if (date.getDay() === dayOfWeek) {
            projectedTotal += totalDemand;
          } else {
            const draft = existingMap.get(formatDateForBackend(date));
            if (draft) projectedTotal += sumDemand(draft.hourlyDemand);
          }
        }

        if (projectedTotal > totalEmployeeNorm) {
          const over = Math.round((projectedTotal - totalEmployeeNorm) * 10) / 10;
          toast.error(
            `Nie można zapisać - zapotrzebowanie w tym miesiącu po zapisie dnia "${template.dayName}" (${projectedTotal}h) przekroczyłoby dostępny budżet godzin pracowników (${totalEmployeeNorm}h) o ${over}h. Zmniejsz zapotrzebowanie albo zwiększ godziny w zakładce "Pozostałe godziny pracowników".`
          );
          return;
        }
      }

      let saved = 0, errors = 0;
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

      if (errors > 0) toast.warning(`${template.dayName}: zapisano ${saved} draftów, ${errors} błędów`);
      else toast.success(`${template.dayName}: zapisano ${saved} draftów`);

      // Użytkownik mógł w trakcie zapisu przełączyć sklep/miesiąc — wtedy nie ruszamy stanu nowego widoku.
      // Przy błędach dzień zostaje oznaczony jako niezapisany, żeby można było ponowić zapis.
      if (errors === 0 && viewKeyRef.current === savedViewKey) {
        const nextDirty = { ...dirtyBaseRef.current };
        delete nextDirty[dayOfWeek];
        commit(templatesRef.current, nextDirty); // czyści też kopię roboczą tego dnia
      }
      onTemplatesSaved(); // rodzic przeładuje drafts[] → confirmedDraftHours i szablon tego dnia z bazy
    } catch (err) {
      toast.error('Błąd zapisu szablonu');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Live suma godzin miesiąca po zapisie: dni tygodnia z niezapisanymi zmianami liczymy
   * wg szablonu, pozostałe — wg tego, co jest teraz w bazie. Przekazywana do PeriodEstimation
   * tylko gdy są niezapisane zmiany, żeby pokazać deltę "co zmieni się po zapisie".
   */
  const liveDraftHours = useMemo(() => {
    const dbByDate = new Map(storeDrafts.map(d => [normalizeDate(d.draftDate), sumDemand(d.hourlyDemand)]));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let total = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dow = date.getDay();
      if (dirtyBase[dow] !== undefined) {
        const t = templates.find(x => x.dayOfWeek === dow);
        if (t) total += t.hourlyDemand.reduce((a, b) => a + b, 0);
      } else {
        total += dbByDate.get(formatDateForBackend(date)) ?? 0;
      }
    }
    return total;
  }, [storeDrafts, templates, dirtyBase, year, month]);

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
            {anyDirty && <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />}
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
          {/* Informacja o niezapisanych zmianach w INNYCH dniach tygodnia — "Zapisz" zapisuje tylko aktywny dzień */}
          {otherDirtyDayNames.length > 0 && (
            <p className="text-[10px] font-bold text-amber-400 mt-1">
              Niezapisane zmiany także w: {otherDirtyDayNames.join(', ')} — każdy dzień zapisujesz osobno
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowNightHours(v => !v)}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border",
              showNightHours ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white")}>
            {showNightHours ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            {showNightHours ? "Ukryj godziny nocne" : "Pokaż godziny nocne"}
          </button>
          <button onClick={handleSaveSelectedDay} disabled={saving || !selectedDirty}
            title={`Zapisuje szablon dnia: ${currentTemplate.dayName} (wszystkie takie dni w miesiącu)`}
            className={cn("px-6 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 text-sm uppercase",
              selectedDirty ? "bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/20" : "bg-slate-800 text-slate-500 cursor-not-allowed")}>
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Zapisz: {currentTemplate.dayName}
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
          liveTemplateDraftHours={anyDirty ? liveDraftHours : null}
          activeNonWarehouseCount={activeNonWarehouseCount}
          totalEmployeeNorm={totalEmployeeNorm}
          totalVacationDays={totalVacationDays}
          totalDelegationDays={totalDelegationDays}
        />
      </div>

      {/* Tabs */}
      <div className="bg-slate-950/50 p-2 flex gap-1 overflow-x-auto border-b border-slate-800">
        {templates.map(t => {
          const isDirty = dirtyBase[t.dayOfWeek] !== undefined;
          return (
            <button key={t.dayOfWeek} onClick={() => handleSelectTemplate(t.dayOfWeek)}
              title={isDirty ? 'Niezapisane zmiany w tym dniu' : undefined}
              className={cn("px-4 py-2 rounded-lg text-[10px] font-black transition-all whitespace-nowrap border-2",
                selectedTemplate === t.dayOfWeek ? "bg-blue-600 border-blue-400 text-white" : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300")}>
              {t.dayName.toUpperCase()}
              {isDirty && <span className="ml-1.5 text-amber-400">●</span>}
            </button>
          );
        })}
      </div>

      {/* Kopiuj z dnia — umieszczone NAD wykresem, żeby było widoczne bez przewijania */}
      <div className="px-4 pt-3 pb-1 bg-[#020617] flex items-center gap-2">
        <span className="text-[10px] font-black text-slate-500 uppercase whitespace-nowrap">Szybkie kopiowanie:</span>
        <div className="relative">
          <select
            value={copySourceDay}
            onChange={e => {
              const sourceValue = e.target.value;
              setCopySourceDay(sourceValue);
              const source = templatesRef.current.find(t => t.dayOfWeek === parseInt(sourceValue, 10));
              if (source) {
                applyEdit(selectedTemplate, () => [...source.hourlyDemand]);
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
                    <div className={cn("flex flex-col items-center leading-none mt-3 font-mono tracking-tighter",
                      isNight ? "text-amber-500" : "text-slate-400 group-hover:text-white")}>
                      <span className="text-xs font-bold">{hour.toString().padStart(2, '0')}</span>
                      <span className="text-[9px] font-semibold opacity-60">·</span>
                      <span className="text-[9px] font-semibold opacity-60">{(hour + 1).toString().padStart(2, '0')}</span>
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
          <button onClick={() => applyEdit(selectedTemplate, () => Array(24).fill(0))}
            className="px-4 py-2 bg-slate-900 text-red-500 border border-red-900/50 text-xs rounded-xl font-black hover:bg-red-600 hover:text-white">
            WYCZYŚĆ
          </button>
        </div>
      </div>
    </div>
  );
}
