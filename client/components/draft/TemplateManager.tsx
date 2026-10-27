import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { PeriodEstimation } from './PeriodEstimation';
import { HourlyDemandEditor, DemandSparkline } from './HourlyDemandEditor';
import { Loader, Copy, Save, Undo2, Eraser, Info, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DayOfWeekTemplate, ResponseDemandDraftDTO } from '@/types/draft.types';
import { getDatesForDayOfWeek, DEFAULT_DAY_TEMPLATES } from '@/types/draft.types';
import { draftService } from '@/services/api-provider';
import {
  formatDateForBackend,
  buildTemplatesFromDrafts,
  normalizeDraftDate,
  sumDemand,
  toDemandArray,
} from '@/utils/draft.utils';

/** Miesiące w miejscowniku ("w październiku") — do komunikatu o skutkach zapisu. */
const MONTH_LOCATIVE = [
  'styczniu', 'lutym', 'marcu', 'kwietniu', 'maju', 'czerwcu',
  'lipcu', 'sierpniu', 'wrześniu', 'październiku', 'listopadzie', 'grudniu',
];

/** Dni tygodnia w bierniku liczby mnogiej ("wszystkie środy"), klucz = getDay(). */
const WEEKDAY_PLURAL: Record<number, string> = {
  0: 'niedziele',
  1: 'poniedziałki',
  2: 'wtorki',
  3: 'środy',
  4: 'czwartki',
  5: 'piątki',
  6: 'soboty',
};

export interface StoreHours {
  openHour: number;
  closeHour: number;
}

/** Godziny otwarcia sklepu per dzień tygodnia (klucz = getDay(), null = brak danych / zamknięte). */
export type StoreHoursByDay = Record<number, StoreHours | null>;

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
  /** Godziny otwarcia sklepu dla każdego dnia tygodnia; undefined = jeszcze niezaładowane. */
  storeHoursByDay?: StoreHoursByDay;
  /** Wybrany dzień tygodnia (getDay(): 0=niedziela). Trzymany w rodzicu, żeby przeżył przełączenie trybu. */
  selectedDayOfWeek: number;
  onSelectDayOfWeek: (dayOfWeek: number) => void;
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
        result[dow] = { baseSignature: value.baseSignature, hourlyDemand: toDemandArray(value.hourlyDemand) };
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
  storeHoursByDay,
  selectedDayOfWeek,
  onSelectDayOfWeek,
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<DayOfWeekTemplate[]>(emptyTemplates);
  /** Dni tygodnia z niezapisanymi zmianami (klucz = dayOfWeek). */
  const [dirtyBase, setDirtyBase] = useState<DirtyBase>({});
  const [saving, setSaving] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  // Stan selecta "Kopiuj z dnia...". Bez tego React traktowałby <select> jako
  // niekontrolowany — przeglądarka sama "zapamiętywałaby" ostatnio wybrany dzień
  // w DOM, więc po przełączeniu dnia select wizualnie zostawałby na
  // poprzednio wybranej opcji, mimo że logicznie powinien wrócić do placeholdera.
  const [copySourceDay, setCopySourceDay] = useState<string>('');

  // Lustra stanu w refach — handlery (edycja, zapis po await) zawsze czytają
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

  /** Ile razy dany dzień tygodnia występuje w wybranym miesiącu (np. 4 środy). */
  const dayCounts = useMemo(() => {
    const result: Record<number, number> = {};
    for (let dow = 0; dow < 7; dow++) result[dow] = getDatesForDayOfWeek(year, month, dow).length;
    return result;
  }, [year, month]);

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
    setCopySourceDay('');
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
  const currentTemplate = templates.find(t => t.dayOfWeek === selectedDayOfWeek);
  const dbTemplate = dbTemplates.find(t => t.dayOfWeek === selectedDayOfWeek);
  const demand = currentTemplate?.hourlyDemand ?? [];
  const storeHours = storeHoursByDay?.[selectedDayOfWeek] ?? null;

  const selectedDirty = dirtyBase[selectedDayOfWeek] !== undefined;
  const dirtyDayNames = templates.filter(t => dirtyBase[t.dayOfWeek] !== undefined).map(t => t.dayName);
  const otherDirtyDayNames = templates
    .filter(t => t.dayOfWeek !== selectedDayOfWeek && dirtyBase[t.dayOfWeek] !== undefined)
    .map(t => t.dayName);
  const anyDirty = dirtyDayNames.length > 0;

  const peakStaff = useMemo(
    () => templates.reduce((max, t) => Math.max(max, ...t.hourlyDemand), 0),
    [templates]
  );

  const handleSelectDay = (dayOfWeek: number) => {
    onSelectDayOfWeek(dayOfWeek);
    setCopySourceDay('');
  };

  const handleChangeHour = useCallback((hour: number, value: number) => {
    applyEdit(selectedDayOfWeek, prev => prev.map((v, i) => (i === hour ? value : v)));
  }, [selectedDayOfWeek, applyEdit]);

  /** Cofnięcie niezapisanych zmian JEDNEGO dnia tygodnia — wraca do wartości z bazy. */
  const handleRevertSelectedDay = () => {
    const base = dbTemplates.find(t => t.dayOfWeek === selectedDayOfWeek);
    if (!base) return;
    const nextTemplates = templatesRef.current.map(t =>
      t.dayOfWeek === selectedDayOfWeek ? { ...t, hourlyDemand: [...base.hourlyDemand] } : t
    );
    const nextDirty = { ...dirtyBaseRef.current };
    delete nextDirty[selectedDayOfWeek];
    commit(nextTemplates, nextDirty);
    setCopySourceDay('');
  };

  /**
   * Zapis szablonu JEDNEGO, aktualnie wybranego dnia tygodnia: nadpisuje wszystkie takie dni
   * w miesiącu (np. wszystkie środy), także te edytowane wcześniej indywidualnie.
   * Pozostałe dni tygodnia nie są ruszane — ani w bazie, ani w ich niezapisanych edycjach.
   */
  const handleSaveSelectedDay = async () => {
    const dayOfWeek = selectedDayOfWeek;
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
      const existingMap = new Map(existing.content.map(d => [normalizeDraftDate(d.draftDate), d]));

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
    const dbByDate = new Map(storeDrafts.map(d => [normalizeDraftDate(d.draftDate), sumDemand(d.hourlyDemand)]));
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
      <div className="flex items-center justify-center py-16 gap-3 bg-[#0f172a] border border-slate-700 rounded-2xl">
        <Loader className="w-5 h-5 text-blue-400 animate-spin" />
        <span className="text-slate-400 text-sm">Ładowanie szablonów...</span>
      </div>
    );
  }

  if (!currentTemplate) return null;

  const selectedDayCount = dayCounts[selectedDayOfWeek] ?? 0;
  const selectedDayTotal = demand.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      {/* Wskaźniki okresu — props z rodzica, reaktywne */}
      <PeriodEstimation
        confirmedDraftHours={confirmedDraftHours}
        liveTemplateDraftHours={anyDirty ? liveDraftHours : null}
        activeNonWarehouseCount={activeNonWarehouseCount}
        totalEmployeeNorm={totalEmployeeNorm}
        totalVacationDays={totalVacationDays}
        totalDelegationDays={totalDelegationDays}
        peakStaff={peakStaff}
      />

      <div className="flex items-start gap-2.5 bg-amber-900/15 border border-amber-700/30 rounded-xl px-4 py-2.5 text-xs text-amber-300/90">
        <Info className="w-4 h-4 flex-shrink-0 mt-px text-amber-400" />
        <span>
          W planowaniu nie uwzględniamy magazyniera{warehousemanName ? ` (${warehousemanName})` : ''} — jeśli posiadasz dedykowanego pracownika, zaplanuj jego pracę w zakładce "Dostawy".
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-5 items-start">
        {/* ============ Lista dni tygodnia ============ */}
        <nav aria-label="Dni tygodnia" className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          {templates.map(t => {
            const isSelected = t.dayOfWeek === selectedDayOfWeek;
            const isDirty = dirtyBase[t.dayOfWeek] !== undefined;
            const dayTotal = t.hourlyDemand.reduce((a, b) => a + b, 0);
            const hours = storeHoursByDay?.[t.dayOfWeek];
            const closed = storeHoursByDay !== undefined && (!hours || hours.openHour >= hours.closeHour);
            return (
              <button
                key={t.dayOfWeek}
                type="button"
                onClick={() => handleSelectDay(t.dayOfWeek)}
                aria-current={isSelected ? 'true' : undefined}
                className={cn(
                  'text-left rounded-xl border px-3.5 py-3 transition-colors min-w-[170px] lg:min-w-0',
                  isSelected
                    ? 'bg-blue-600/15 border-cyan-500/60 shadow-lg shadow-blue-950/40'
                    : 'bg-slate-800/40 border-slate-700/70 hover:bg-slate-800/70 hover:border-slate-600'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('text-sm font-bold', isSelected ? 'text-white' : 'text-slate-200')}>
                    {t.dayName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {closed && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-700/60 rounded px-1.5 py-0.5">
                        zamknięty
                      </span>
                    )}
                    {isDirty && (
                      <span
                        className="w-2 h-2 rounded-full bg-amber-400"
                        title="Niezapisane zmiany w tym dniu"
                        role="img"
                        aria-label="Niezapisane zmiany w tym dniu"
                      />
                    )}
                  </span>
                </div>
                <DemandSparkline values={t.hourlyDemand} className="mt-2" />
                <p className="mt-1.5 text-xs text-slate-400 tabular-nums">
                  <span className={cn('font-bold', isSelected ? 'text-cyan-300' : 'text-slate-300')}>{dayTotal} h</span>
                  {' '}/ dzień · {dayCounts[t.dayOfWeek]} dni w mies.
                </p>
              </button>
            );
          })}
        </nav>

        {/* ============ Edytor wybranego dnia ============ */}
        <div className="space-y-4 min-w-0">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 p-5 border-b border-slate-700 bg-slate-900/60 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">{currentTemplate.dayName}</h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  Szablon dla: {WEEKDAY_PLURAL[selectedDayOfWeek]} w {MONTH_LOCATIVE[month]} {year}
                  {' '}· {selectedDayCount} {selectedDayCount === 1 ? 'dzień' : 'dni'} · {selectedDayTotal} h dziennie
                </p>
              </div>
              {selectedDirty && (
                <span className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-lg px-2.5 py-1">
                  Niezapisane zmiany
                </span>
              )}
            </div>

            <div className="p-5">
              <HourlyDemandEditor
                values={demand}
                onChangeHour={handleChangeHour}
                baseline={dbTemplate?.hourlyDemand ?? null}
                baselineKind="saved"
                baselineLabel="zapisane w bazie"
                maxValue={maxCap}
                openHour={storeHours?.openHour}
                closeHour={storeHours?.closeHour}
                disabled={saving}
                toolbar={
                  <>
                    <div className="relative">
                      <select
                        aria-label="Kopiuj z innego dnia tygodnia"
                        value={copySourceDay}
                        disabled={saving}
                        onChange={e => {
                          const sourceValue = e.target.value;
                          setCopySourceDay(sourceValue);
                          const source = templatesRef.current.find(t => t.dayOfWeek === parseInt(sourceValue, 10));
                          if (source) {
                            applyEdit(selectedDayOfWeek, () => [...source.hourlyDemand]);
                            toast.success(`Skopiowano z: ${source.dayName}. Zapisz, aby zatwierdzić.`);
                            setCopySourceDay('');
                          }
                        }}
                        className="pl-3 pr-8 py-2 bg-slate-800 text-slate-200 text-[11px] rounded-lg font-bold appearance-none border border-slate-700 uppercase tracking-wide disabled:opacity-50"
                      >
                        <option value="">Kopiuj z dnia...</option>
                        {templates.filter(t => t.dayOfWeek !== selectedDayOfWeek).map(t => (
                          <option key={t.dayOfWeek} value={t.dayOfWeek}>{t.dayName}</option>
                        ))}
                      </select>
                      <Copy className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      onClick={() => applyEdit(selectedDayOfWeek, () => Array(24).fill(0))}
                      disabled={saving || selectedDayTotal === 0}
                      className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wide rounded-lg border border-red-900/60 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-red-400 disabled:cursor-not-allowed"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      Wyczyść dzień
                    </button>
                  </>
                }
              />
            </div>
          </div>

          {/* Pasek zapisu — mówi dokładnie, co zostanie zapisane */}
          <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl px-5 py-3.5 shadow-2xl shadow-black/40">
            <div className="min-w-0">
              {selectedDirty ? (
                <>
                  <p className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Niezapisane zmiany w: {currentTemplate.dayName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Zapis nadpisze wszystkie {selectedDayCount} {WEEKDAY_PLURAL[selectedDayOfWeek]} w {MONTH_LOCATIVE[month]},
                    także te edytowane ręcznie. Pozostałe dni tygodnia nie zostaną zmienione.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Brak niezapisanych zmian w: {currentTemplate.dayName}
                </p>
              )}
              {otherDirtyDayNames.length > 0 && (
                <p className="text-xs font-semibold text-amber-400 mt-1">
                  Niezapisane zmiany także w: {otherDirtyDayNames.join(', ')} — każdy dzień zapisujesz osobno
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRevertSelectedDay}
                disabled={saving || !selectedDirty}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-600 text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <Undo2 className="w-4 h-4" />
                Cofnij zmiany
              </button>
              <button
                type="button"
                onClick={handleSaveSelectedDay}
                disabled={saving || !selectedDirty}
                title={`Zapisuje szablon dnia: ${currentTemplate.dayName} (wszystkie takie dni w miesiącu)`}
                className={cn(
                  'px-6 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 text-sm uppercase',
                  selectedDirty && !saving
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                )}
              >
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Zapisz: {currentTemplate.dayName}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}