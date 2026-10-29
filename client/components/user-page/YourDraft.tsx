/**
 * YourDraft Component
 * Main draft management component with clear mode separation
 * Mode 1: Template Management (activeMode === 'templates')
 * Mode 2: Specific Day Editing  (activeMode === 'edit')
 *
 * ARCHITEKTURA LICZENIA GODZIN:
 * - confirmedDraftHours: useMemo z drafts[] → automatycznie aktualny po każdym zapisie (tryb 1 i 2)
 * - monthlyNormData: pobierany z backendu (endpoint /monthlyNorm), zawiera:
 *     - standardWorkingHours (norma miesiąca ustalana ręcznie w Panelu Admina → „Normy godzinowe”)
 *     - totalEmployeeNorm (suma norm etatu wszystkich prac. bez magazyniera)
 *     - activeNonWarehouseCount
 * - TemplateManager i PeriodEstimation w trybie 2 korzystają z tych samych danych
 */

import { useState, useEffect, useMemo, useRef, type ComponentType } from 'react';
import {
  CalendarDays,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  LayoutTemplate,
  Users2,
  AlertTriangle,
  History,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ResponseDemandDraftDTO } from '@/types/draft.types';
import {
  formatDateForBackend,
  buildMonthDayInfos,
  buildTemplatesFromDrafts,
  getLatestDraftRecord,
  MONTHS_GENITIVE,
  normalizeDraftDate,
  sumDemand,
  toDemandArray,
} from '@/utils/draft.utils';
import { draftService, storeDetailsService, billingPeriodConfigService, storeOpeningHoursService } from '@/services/api-provider';
import type { DayHours } from '@/services/api/store-opening-hours.service';
import type { MonthlyNormData } from '@/services/api/draft.service';
import type { BillingPeriodConfigResponse } from '@/types/billing-period-config.types';
import type { ResponseEmployeeDTO } from '@/types/employee.types';
import { employeeService, vacationService, delegationService } from '@/services/api-provider';
import { TemplateManager, type StoreHoursByDay } from '@/components/draft/TemplateManager';
import { PeriodEstimation } from '@/components/draft/PeriodEstimation';
import { DraftChart } from './draft/DraftChart';
import { MiniCalendar } from './draft/MiniCalendar';
import { TemplateDiffList } from './draft/TemplateDiffList';
import { useAppContext } from '@/context/AppContext';
import { useRequestGuard } from '@/hooks/useRequestGuard';
import LastModifiedInfo from '@/components/shared/LastModifiedInfo';
import { DAYS_OF_WEEK, MONTHS } from '@/utils/calendar';
import EmployeeHoursConfirmationStep from './EmployeeHoursConfirmationStep';

// ============================================================
// PREZENTACYJNE KOMPONENTY POMOCNICZE (tylko warstwa wizualna,
// bez żadnej logiki biznesowej — ta zostaje w YourDraft)
// ============================================================

/** Delikatne, animowane tło w nagłówku — subtelny akcent, nie odciąga uwagi od danych. */
function HeaderAurora() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
      <div className="draft-aurora-blob absolute -top-16 -left-10 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="draft-aurora-blob draft-aurora-blob-delayed absolute -bottom-20 right-0 w-72 h-72 rounded-full bg-cyan-400/15 blur-3xl" />
    </div>
  );
}

/** Pierścień postępu okresu rozliczeniowego — wizualizuje którym miesiącem z serii jesteśmy. */
function BillingPeriodRing({ current, total }: { current: number; total: number }) {
  const size = 44;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? current / total : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-indigo-900/60" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-indigo-400 draft-ring-progress"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold text-indigo-100 leading-none">{current}/{total}</span>
      </div>
    </div>
  );
}

type DraftModeId = 'templates' | 'edit' | 'hoursConfirmation';

interface ModeTabConfig {
  id: DraftModeId;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ className?: string }>;
}

/** Segmentowany przełącznik trybów z animowanym tłem podążającym za aktywną zakładką. */
function ModeTabs({
  tabs,
  activeMode,
  onChange,
}: {
  tabs: ModeTabConfig[];
  activeMode: DraftModeId;
  onChange: (mode: DraftModeId) => void;
}) {
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeMode));
  const count = tabs.length;

  return (
    <div
      role="tablist"
      aria-label="Tryb zarządzania draftem"
      className="relative flex w-full bg-slate-900/60 border border-slate-700/70 rounded-xl p-1 gap-1"
    >
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg shadow-blue-900/40 transition-transform duration-300 ease-out"
        style={{
          width: `calc(${100 / count}% - 4px)`,
          transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 4}px))`,
        }}
        aria-hidden="true"
      />
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeMode;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Elegancki skeleton zamiast gołego spinnera — mniej "migotania", bardziej dopracowane wrażenie ładowania. */
function DraftLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-11 bg-slate-800/60 border border-slate-700/50 rounded-lg draft-shimmer" />
      <div className="h-12 w-full sm:w-96 bg-slate-800/60 border border-slate-700/50 rounded-xl draft-shimmer" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-slate-800/40 border border-slate-700/50 rounded-2xl draft-shimmer" />
        <div className="h-80 bg-slate-800/40 border border-slate-700/50 rounded-2xl draft-shimmer" />
      </div>
    </div>
  );
}

/** Wspólny styl "szklanego" panelu używany w całym module draftu. */
const GLASS_PANEL = 'bg-slate-800/40 backdrop-blur-xl border border-slate-700/60 rounded-2xl';

// Mapowanie: getDay() (0=niedziela…6=sobota) → klucz godzin sklepu
const DAY_INDEX_TO_KEY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/** Dni tygodnia w dopełniaczu ("szablon środy"), klucz = getDay(). */
const WEEKDAY_GENITIVE: Record<number, string> = {
  0: 'niedzieli',
  1: 'poniedziałku',
  2: 'wtorku',
  3: 'środy',
  4: 'czwartku',
  5: 'piątku',
  6: 'soboty',
};

const DISCARD_CONFIRM_MESSAGE = 'Masz niezapisane zmiany w edytowanym dniu. Odrzucić je i kontynuować?';

function parseOpenCloseHours(hours: DayHours | undefined): { openHour: number; closeHour: number } | null {
  if (!hours) return null;
  const openHour = parseInt(hours.open.split(':')[0], 10);
  const closeHour = parseInt(hours.close.split(':')[0], 10);
  if (Number.isNaN(openHour) || Number.isNaN(closeHour)) return null;
  return { openHour, closeHour };
}

export default function YourDraft() {
  // ─── Pobierz aktualnie wybrany sklep z kontekstu ───────────
  const { selectedStoreId, managerData } = useAppContext();
  const isAdminOrDirector = managerData?.role === 'ADMIN' || managerData?.role === 'DIRECTOR';
  const currentStoreId: number | null = isAdminOrDirector
    ? selectedStoreId
    : (managerData?.storeId ?? null);

  // ======================== STATE ========================

  const [employees, setEmployees] = useState<ResponseEmployeeDTO[]>([]);
  const [totalVacationDays, setTotalVacationDays] = useState(0);
  const [totalDelegationDays, setTotalDelegationDays] = useState(0);

  /**
   * Normy miesięczne z backendu.
   * Null → jeszcze nie załadowane (endpoint /monthlyNorm).
   */
  const [monthlyNormData, setMonthlyNormData] = useState<MonthlyNormData | null>(null);

  const [drafts, setDrafts] = useState<ResponseDemandDraftDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());

  /** Konfiguracje okresów rozliczenia – ładowane jednorazowo przy mount */
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriodConfigResponse[]>([]);

  // ======================== MONTH / DATE NAVIGATION ========================
  const getInitialMonth = () => {
    try {
      const stored = sessionStorage.getItem('draftTabState');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.monthId) return data.monthId - 1;
      }
    } catch { /* ignore */ }
    return new Date().getMonth();
  };

  const [year, setYear] = useState(() => {
    try {
      const stored = sessionStorage.getItem('draftTabState');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.year) return data.year;
      }
    } catch { /* ignore */ }
    return new Date().getFullYear();
  });

  const [month, setMonth] = useState(getInitialMonth());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<'templates' | 'edit' | 'hoursConfirmation'>('templates');
  /** Czy edytor konkretnego dnia ma niezapisane zmiany (raportuje DraftChart). */
  const [editDirty, setEditDirty] = useState(false);
  /** Zwiększany przez "Ponów próbę" — wymusza ponowne pobranie draftów. */
  const [reloadKey, setReloadKey] = useState(0);

  /**
   * Aktualnie wybrany dzień tygodnia w zakładce Szablony (konwencja getDay(): 0=niedziela).
   * Trzymany tutaj, żeby przeżył przełączenie trybu (TemplateManager się wtedy odmontowuje).
   * Domyślnie 1 (poniedziałek) – zgodne z DEFAULT_DAY_TEMPLATES.
   */
  const [selectedTemplateDay, setSelectedTemplateDay] = useState<number>(1);

  // Max obsada z zakładki Sklep
  const [maxStaffFromStore, setMaxStaffFromStore] = useState<number>(100);

  // Godziny otwarcia sklepu (z zakładki Sklep)
  const [storeOpeningHours, setStoreOpeningHours] = useState<Record<string, DayHours> | null>(null);

  // ======================== DERIVED STATE ========================

  // Drafty wyłącznie bieżącego sklepu — przy przełączaniu sklepu stan `drafts` na chwilę
  // może jeszcze zawierać drafty poprzedniego (czyści go dopiero efekt ładowania).
  const storeDrafts = useMemo(
    () => drafts.filter((d) => d.storeId === currentStoreId),
    [drafts, currentStoreId]
  );

  /**
   * Rzeczywista suma godzin z bazy danych.
   * Wyliczana z drafts[] — automatycznie aktualizuje się po każdym zapisie w obu trybach.
   * Dzień samych zer (święto) nie wnosi nic do sumy.
   */
  const confirmedDraftHours = useMemo(
    () => storeDrafts.reduce((total, draft) => total + sumDemand(draft.hourlyDemand), 0),
    [storeDrafts]
  );

  const activeNonWarehouseCount = useMemo(
    () => employees.filter((e: any) => e.enable && !e.warehouseman).length,
    [employees]
  );

  /**
   * Liczy jaka byłaby suma miesięczna draftu, gdyby dzień `dateStr` miał `newHourlyDemand`
   * zamiast obecnej wartości (albo doszedł jako nowy dzień). Ta sama logika co
   * confirmedDraftHours (dzień samych zer = święto, nie wnosi nic do sumy).
   */
  const computeProjectedMonthlyTotal = (dateStr: string, newHourlyDemand: number[]): number => {
    let total = 0;
    let found = false;
    for (const d of storeDrafts) {
      const isSameDay = normalizeDraftDate(d.draftDate) === dateStr;
      if (isSameDay) found = true;
      total += sumDemand(isSameDay ? newHourlyDemand : d.hourlyDemand);
    }
    if (!found) total += sumDemand(newHourlyDemand);
    return total;
  };

  /**
   * Twarda blokada: w ostatnim miesiącu okresu rozliczeniowego nie pozwala zapisać
   * draftu, jeśli suma godzin zapotrzebowania w całym miesiącu przekroczyłaby budżet
   * dostępnych godzin pracowników (monthlyNormData.totalEmployeeNorm — w tym miesiącu
   * to suma potwierdzonych godzin z zakładki "Pozostałe godziny pracowników").
   * Zwraca true, jeśli zapis wolno wykonać.
   */
  const assertWithinLastMonthBudget = (dateStr: string, newHourlyDemand: number[]): boolean => {
    if (!isLastMonthOfPeriod || !monthlyNormData) return true;

    const projectedTotal = computeProjectedMonthlyTotal(dateStr, newHourlyDemand);
    const budget = monthlyNormData.totalEmployeeNorm;

    if (projectedTotal > budget) {
      const over = Math.round((projectedTotal - budget) * 10) / 10;
      toast.error(
        `Nie można zapisać - zapotrzebowanie w tym miesiącu (${projectedTotal}h) przekroczyłoby dostępny budżet godzin pracowników (${budget}h) o ${over}h. Zmniejsz zapotrzebowanie albo zwiększ godziny w zakładce "Pozostałe godziny pracowników".`
      );
      return false;
    }
    return true;
  };

  const warehouseman = useMemo(
    () => employees.find((e: any) => e.warehouseman && e.enable),
    [employees]
  );

  /**
   * Godziny otwarcia sklepu per dzień tygodnia (klucz = getDay()). undefined = jeszcze niezaładowane.
   * Dzień bez godzin albo z otwarciem >= zamknięcia traktujemy jako zamknięty (null).
   */
  const storeHoursByDay = useMemo<StoreHoursByDay | undefined>(() => {
    if (!storeOpeningHours) return undefined;
    const result: StoreHoursByDay = {};
    for (let dow = 0; dow < 7; dow++) {
      const parsed = parseOpenCloseHours(storeOpeningHours[DAY_INDEX_TO_KEY[dow]]);
      result[dow] = parsed && parsed.openHour < parsed.closeHour ? parsed : null;
    }
    return result;
  }, [storeOpeningHours]);

  const closedWeekdays = useMemo(() => {
    if (!storeHoursByDay) return undefined;
    const closed = new Set<number>();
    for (let dow = 0; dow < 7; dow++) if (!storeHoursByDay[dow]) closed.add(dow);
    return closed;
  }, [storeHoursByDay]);

  // Szablony dni tygodnia z bazy (średnia z miesiąca) — punkt odniesienia dla trybu edycji dni.
  const templatesFromDb = useMemo(() => buildTemplatesFromDrafts(storeDrafts), [storeDrafts]);
  const monthDays = useMemo(
    () => buildMonthDayInfos(year, month, storeDrafts, templatesFromDb),
    [year, month, storeDrafts, templatesFromDb]
  );
  const peakStaff = useMemo(
    () => storeDrafts.reduce((max, d) => Math.max(max, ...toDemandArray(d.hourlyDemand)), 0),
    [storeDrafts]
  );

  /**
   * Oblicza pozycję bieżącego miesiąca w jego okresie rozliczeniowym.
   */
  const billingPeriodInfo = useMemo(() => {
    if (!billingPeriods.length) return null;
    const backendMonth = month + 1;

    const config = billingPeriods.find(bp => {
      for (let i = 0; i < bp.durationMonths; i++) {
        const periodMonth = (bp.startMonth - 1 + i) % 12 + 1;
        if (periodMonth === backendMonth) return true;
      }
      return false;
    });
    if (!config) return null;

    const periodMonths: number[] = [];
    for (let i = 0; i < config.durationMonths; i++) {
      periodMonths.push((config.startMonth - 1 + i) % 12 + 1);
    }

    const currentPosition = periodMonths.indexOf(backendMonth) + 1;
    return { current: currentPosition, total: config.durationMonths };
  }, [billingPeriods, month]);

  /** Czy aktualnie wybrany miesiąc jest ostatnim miesiącem okresu rozliczeniowego */
  const isLastMonthOfPeriod = billingPeriodInfo !== null && billingPeriodInfo.current === billingPeriodInfo.total;

  // ======================== EFFECTS ========================

  // Pobierz max obsadę i godziny otwarcia ze sklepu — przeładuj przy zmianie sklepu
  const storeDetailsGuard = useRequestGuard();
  useEffect(() => {
    if (!currentStoreId) {
      setMaxStaffFromStore(100);
      setStoreOpeningHours(null);
      return;
    }
    const token = storeDetailsGuard.start();
    // Czyścimy dane poprzedniego sklepu na starcie — inaczej, gdy nowy sklep nie ma
    // `staffing` albo zapytanie się nie powiedzie, zostałyby wartości z poprzedniego.
    setMaxStaffFromStore(100);
    setStoreOpeningHours(null);
    const loadStoreDetails = async () => {
      // Osobne try/catch — błąd w details nie blokuje godzin otwarcia
      try {
        const details = await storeDetailsService.getByStoreId(currentStoreId);
        if (!storeDetailsGuard.isCurrent(token)) return;
        if (details?.staffing) {
          const total = Object.entries(details.staffing)
            .filter(([key]) => key !== 'total')
            .reduce((sum, [, value]) => sum + (typeof value === 'number' ? value : 0), 0);
          setMaxStaffFromStore(Math.max(total, 1));
        }
      } catch {
        if (storeDetailsGuard.isCurrent(token)) setMaxStaffFromStore(100);
      }
      try {
        const hours = await storeOpeningHoursService.getAll(currentStoreId);
        if (!storeDetailsGuard.isCurrent(token)) return;
        setStoreOpeningHours(hours);
      } catch {
        if (storeDetailsGuard.isCurrent(token)) setStoreOpeningHours(null);
      }
    };
    loadStoreDetails();
  }, [currentStoreId, storeDetailsGuard]);

  // Pobierz konfiguracje okresów rozliczenia jednorazowo
  useEffect(() => {
    billingPeriodConfigService.getAll()
      .then(data => setBillingPeriods(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  /**
   * Dane kontekstowe okresu: pracownicy, urlopy, delegacje, normy miesięczne.
   * Przeładowuje się przy zmianie sklepu LUB miesiąca.
   */
  const periodDataGuard = useRequestGuard();
  useEffect(() => {
    if (!currentStoreId) {
      setEmployees([]);
      setMonthlyNormData(null);
      setTotalVacationDays(0);
      setTotalDelegationDays(0);
      return;
    }

    const token = periodDataGuard.start();
    // Czyścimy dane poprzedniego sklepu/miesiąca na starcie — inaczej przy błędzie zapytania
    // zostałyby na stałe normy, urlopy i pracownicy z poprzedniego widoku.
    setEmployees([]);
    setMonthlyNormData(null);
    setTotalVacationDays(0);
    setTotalDelegationDays(0);
    const loadPeriodData = async () => {
      const backendMonth = month + 1;

      try {
        const [empResponse, vacResponse, normData] = await Promise.all([
          employeeService.getAll(currentStoreId),
          vacationService.getByCriteria(currentStoreId, { year, month: backendMonth }),
          draftService.getMonthlyNorm(currentStoreId, year, backendMonth),
        ]);

        if (!periodDataGuard.isCurrent(token)) return; // sklep/miesiąc zmienił się w międzyczasie — porzuć

        setEmployees(empResponse.content);
        setMonthlyNormData(normData);

        const vacDays = vacResponse.content.reduce(
          (sum: number, v: any) => sum + v.monthlyVacation.filter((d: number) => d === 1).length,
          0
        );
        setTotalVacationDays(vacDays);
      } catch (err) {
        if (!periodDataGuard.isCurrent(token)) return;
        console.warn('Could not load period data:', err);
      }

      try {
        const delResponse = await delegationService.getByCriteria(currentStoreId, {
          year,
          month: backendMonth,
        });
        if (!periodDataGuard.isCurrent(token)) return;
        const delDays = delResponse.content.reduce(
          (sum: number, d: any) => sum + d.monthlyDelegation.filter((v: number) => v === 1).length,
          0
        );
        setTotalDelegationDays(delDays);
      } catch {
        if (periodDataGuard.isCurrent(token)) setTotalDelegationDays(0);
      }
    };

    loadPeriodData();
  }, [currentStoreId, year, month, periodDataGuard]);

  // Załaduj drafty przy zmianie sklepu LUB miesiąca
  const draftsGuard = useRequestGuard();

  // Zmiana SKLEPU → wracamy do trybu szablonów bez wybranego dnia.
  // (Zmiana miesiąca zostawia tryb i wybrany dzień — dzień jest przycinany w handleMonthChange.)
  useEffect(() => {
    setSelectedDate(null);
    setActiveMode('templates');
  }, [currentStoreId]);

  // Zakładka "Pozostałe godziny" istnieje tylko w ostatnim miesiącu okresu rozliczeniowego.
  useEffect(() => {
    if (activeMode === 'hoursConfirmation' && !isLastMonthOfPeriod) setActiveMode('templates');
  }, [activeMode, isLastMonthOfPeriod]);

  useEffect(() => {
    if (!currentStoreId) {
      setDrafts([]);
      setLoading(false);
      return;
    }

    const token = draftsGuard.start();
    const loadDrafts = async () => {
      try {
        setLoading(true);
        setError(null);
        setDrafts([]); // czyścimy od razu — bez tego przez chwilę widać drafty poprzedniego sklepu

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = formatDateForBackend(firstDay);
        const endDate = formatDateForBackend(lastDay);

        const response = await draftService.getByDateRange(currentStoreId, startDate, endDate);
        if (!draftsGuard.isCurrent(token)) return; // sklep/miesiąc zmienił się w międzyczasie — porzuć
        setDrafts(response.content || []);
      } catch (err) {
        if (!draftsGuard.isCurrent(token)) return;
        console.error('API Error podczas pobierania grafików:', err);
        setDrafts([]);
        // Ekran błędu zamiast pustego draftu — pusty widok wyglądałby jak "brak danych"
        // i zachęcał do zapisu zer nad istniejącymi draftami.
        setError('Nie udało się pobrać draftów z serwera.');
        toast.error('Nie udało się pobrać grafików z serwera.');
      } finally {
        if (draftsGuard.isCurrent(token)) setLoading(false);
      }
    };

    loadDrafts();
  }, [currentStoreId, year, month, draftsGuard, reloadKey]);

  // ======================== HELPERS ========================

  // Wybrany dzień (tryb edycji): dzień tygodnia, zapisany draft, szablon i godziny otwarcia
  const selectedDayOfWeekJs = selectedDate !== null ? new Date(year, month, selectedDate).getDay() : null;

  const selectedDraftRecord = useMemo(() => {
    if (selectedDate === null) return undefined;
    const dateStr = formatDateForBackend(new Date(year, month, selectedDate));
    return storeDrafts.find((d) => normalizeDraftDate(d.draftDate) === dateStr);
  }, [storeDrafts, year, month, selectedDate]);

  const draft = useMemo(() => toDemandArray(selectedDraftRecord?.hourlyDemand), [selectedDraftRecord]);

  const selectedTemplateDemand = useMemo(() => {
    const template = templatesFromDb.find((t) => t.dayOfWeek === selectedDayOfWeekJs);
    return toDemandArray(template?.hourlyDemand);
  }, [templatesFromDb, selectedDayOfWeekJs]);

  const storeHoursForSelectedDay =
    selectedDayOfWeekJs !== null ? storeHoursByDay?.[selectedDayOfWeekJs] ?? null : null;

  // "Ostatnia zmiana" całego draftu danego miesiąca — jeden, ogólny wskaźnik,
  // wyświetlany niezależnie od trybu. Najnowszy rekord spośród WSZYSTKICH draftów miesiąca.
  const draftLastModifiedRecord = useMemo(() => getLatestDraftRecord(storeDrafts), [storeDrafts]);

  // Stan widoku (sklep + miesiąc) — pozwala porzucić wynik zapisu, który wrócił po zmianie widoku.
  const viewKeyRef = useRef('');
  viewKeyRef.current = `${currentStoreId}_${year}_${month}`;

  // ======================== HANDLERS ========================

  /** Zwraca true, jeśli można porzucić edytor dnia (brak zmian albo użytkownik potwierdził). */
  const confirmDiscardUnsavedDay = (): boolean => {
    if (!editDirty) return true;
    return window.confirm(DISCARD_CONFIRM_MESSAGE);
  };

  const handleMonthChange = (newYear: number, newMonth: number) => {
    if (activeMode === 'edit' && !confirmDiscardUnsavedDay()) return;
    setYear(newYear);
    setMonth(newMonth);
    // Wybrany dzień (np. 31) może nie istnieć w nowym miesiącu — inaczej new Date(...) przeskoczyłoby na kolejny miesiąc.
    const daysInNewMonth = new Date(newYear, newMonth + 1, 0).getDate();
    setSelectedDate((prev) => (prev === null ? null : Math.min(prev, daysInNewMonth)));
  };

  const shiftMonth = (delta: number) => {
    const target = new Date(year, month + delta, 1);
    handleMonthChange(target.getFullYear(), target.getMonth());
  };

  const handleDateSelect = (day: number) => {
    if (day === selectedDate) return;
    if (!confirmDiscardUnsavedDay()) return;
    setSelectedDate(day);
  };

  const handleModeChange = (mode: DraftModeId) => {
    if (mode === activeMode) return;
    if (activeMode === 'edit' && !confirmDiscardUnsavedDay()) return;
    setActiveMode(mode);
    if (mode === 'templates') {
      setSelectedDate(null);
    } else if (mode === 'edit') {
      // Domyślnie dzisiejszy dzień, jeśli oglądamy bieżący miesiąc; w innym przypadku pierwszy dzień miesiąca.
      const today = new Date();
      const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
      setSelectedDate(isCurrentMonth ? today.getDate() : 1);
    }
  };

  /**
   * Przeładowanie draftów po zapisie szablonu dnia tygodnia (komunikat o zapisie pokazuje
   * TemplateManager). Z guardem — odpowiedź spóźniona po zmianie sklepu/miesiąca jest porzucana.
   */
  const reloadDraftsAfterTemplateSave = async () => {
    if (!currentStoreId) return;
    const token = draftsGuard.start();
    try {
      const response = await draftService.getByDateRange(
        currentStoreId,
        formatDateForBackend(new Date(year, month, 1)),
        formatDateForBackend(new Date(year, month + 1, 0))
      );
      if (!draftsGuard.isCurrent(token)) return;
      setDrafts(response.content || []);
    } catch (err) {
      console.error('Error reloading drafts:', err);
    }
  };

  /**
   * Zapis z edytora dnia (tryb 2). Zwraca true tylko, gdy dzień został zapisany —
   * edytor po false zachowuje niezapisane wartości.
   */
  const handleDraftChartSave = async (values: number[]): Promise<boolean> => {
    if (!currentStoreId) return false;
    if (selectedDate === null) { toast.warning('Wybierz konkretny dzień'); return false; }

    const storeId = currentStoreId;
    const dateStr = formatDateForBackend(new Date(year, month, selectedDate));
    const savedViewKey = viewKeyRef.current;

    if (!assertWithinLastMonthBudget(dateStr, values)) return false;

    // Zastępuje (lub dodaje) zapisany rekord w stanie — tylko jeśli widok się nie zmienił w trakcie zapisu.
    const applySaved = (saved: ResponseDemandDraftDTO) => {
      if (viewKeyRef.current !== savedViewKey) return;
      setDrafts((prev) =>
        prev.some((d) => d.id === saved.id)
          ? prev.map((d) => (d.id === saved.id ? saved : d))
          : [...prev, saved]
      );
    };

    try {
      const existing = storeDrafts.find((d) => normalizeDraftDate(d.draftDate) === dateStr);
      if (existing) {
        applySaved(await draftService.update(storeId, existing.id, { draftDate: dateStr, hourlyDemand: values }));
      } else {
        try {
          applySaved(await draftService.create(storeId, { draftDate: dateStr, hourlyDemand: values }));
        } catch (createError) {
          // Draft tego dnia mógł powstać w międzyczasie (np. zapis szablonu przez innego użytkownika) —
          // pobieramy aktualną listę i nadpisujemy istniejący rekord.
          const message = createError instanceof Error ? createError.message : '';
          if (!message.includes('already exists')) throw createError;

          const response = await draftService.getByDateRange(
            storeId,
            formatDateForBackend(new Date(year, month, 1)),
            formatDateForBackend(new Date(year, month + 1, 0))
          );
          const found = response.content.find((d) => normalizeDraftDate(d.draftDate) === dateStr);
          if (!found) throw createError;
          applySaved(await draftService.update(storeId, found.id, { draftDate: dateStr, hourlyDemand: values }));
        }
      }
      toast.success('Zapisano zmiany');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message ? `Nie udało się zapisać zmian: ${message}` : 'Nie udało się zapisać zmian');
      return false;
    }
  };

  // ======================== RENDER ========================

  // Brak wybranego sklepu
  if (!currentStoreId) {
    return (
      <div className={`${GLASS_PANEL} flex flex-col items-center justify-center py-20 px-6 space-y-4`}>
        <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center">
          <CalendarDays className="w-8 h-8 text-slate-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-slate-200 font-semibold">Nie wybrano sklepu</p>
          <p className="text-slate-500 text-sm">Wybierz sklep z górnego menu, aby zarządzać draftem.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <DraftLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-red-900/50 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-red-200 font-semibold">Nie udało się wczytać draftu</p>
            <p className="text-red-300/80 text-sm mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Ponów próbę
          </button>
        </div>
      </div>
    );
  }

  const MODE_TABS: ModeTabConfig[] = [
    { id: 'templates', label: 'Szablony Dni Tygodnia', shortLabel: 'Szablony', icon: LayoutTemplate },
    { id: 'edit', label: 'Edycja Konkretnych Dni', shortLabel: 'Edycja Dni', icon: CalendarClock },
    ...(isLastMonthOfPeriod
      ? [{ id: 'hoursConfirmation' as const, label: 'Pozostałe Godziny Pracowników', shortLabel: 'Godziny', icon: Users2 }]
      : []),
  ];

  const selectedDayLabel =
    selectedDate !== null && selectedDayOfWeekJs !== null
      ? `${DAYS_OF_WEEK[(selectedDayOfWeekJs + 6) % 7]}, ${selectedDate} ${MONTHS_GENITIVE[month]}`
      : '';

  return (
    <div className="space-y-6">
      {/* ============ NAGŁÓWEK: tytuł modułu + ostatnia zmiana + okres rozliczeniowy + miesiąc ============ */}
      <div className={`relative overflow-hidden ${GLASS_PANEL} p-5 sm:p-6`}>
        <HeaderAurora />
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-950/50 flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Planowanie Obsady</h2>
              <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-0.5">
                <History className="w-3.5 h-3.5 flex-shrink-0" />
                <LastModifiedInfo
                  updatedAt={draftLastModifiedRecord?.updatedAt}
                  createdAt={draftLastModifiedRecord?.createdAt}
                  updatedByLabel={draftLastModifiedRecord?.updatedByLabel}
                  createdByLabel={draftLastModifiedRecord?.createdByLabel}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Odznaczka okresu rozliczeniowego */}
            {billingPeriodInfo && (
              <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-indigo-950/50 border border-indigo-700/40 rounded-xl">
                <BillingPeriodRing current={billingPeriodInfo.current} total={billingPeriodInfo.total} />
                <div className="leading-tight">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-indigo-400">Okres rozliczeniowy</p>
                  <p className="text-sm font-semibold text-indigo-100">
                    Miesiąc {billingPeriodInfo.current} z {billingPeriodInfo.total}
                    {isLastMonthOfPeriod && <span className="ml-1.5 text-amber-400">· ostatni</span>}
                  </p>
                </div>
              </div>
            )}

            {/* Przełącznik miesiąca — wspólny dla wszystkich trybów */}
            <div className="flex items-center bg-slate-900/60 border border-slate-700/70 rounded-xl">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Poprzedni miesiąc"
                className="w-10 h-11 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-l-xl transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="min-w-[150px] text-center text-base font-bold text-white tabular-nums" aria-live="polite">
                {MONTHS[month]} {year}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Następny miesiąc"
                className="w-10 h-11 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-r-xl transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ PRZEŁĄCZNIK TRYBÓW ============ */}
      <ModeTabs tabs={MODE_TABS} activeMode={activeMode} onChange={handleModeChange} />

      {/* ============ MODE 1: SZABLONY ============ */}
      {activeMode === 'templates' && (
        <div key="templates" className="draft-fade-in">
          <TemplateManager
            storeId={currentStoreId}
            year={year}
            month={month}
            maxValue={maxStaffFromStore}
            drafts={drafts}
            activeNonWarehouseCount={monthlyNormData?.activeNonWarehouseCount ?? activeNonWarehouseCount}
            totalEmployeeNorm={monthlyNormData?.totalEmployeeNorm ?? 0}
            confirmedDraftHours={confirmedDraftHours}
            totalVacationDays={totalVacationDays}
            totalDelegationDays={totalDelegationDays}
            warehousemanName={warehouseman ? `${warehouseman.firstName} ${warehouseman.lastName}` : null}
            // Bez załadowanych norm nie blokujemy zapisu budżetem 0 h (tak samo jak assertWithinLastMonthBudget)
            isLastMonthOfPeriod={isLastMonthOfPeriod && monthlyNormData !== null}
            storeHoursByDay={storeHoursByDay}
            selectedDayOfWeek={selectedTemplateDay}
            onSelectDayOfWeek={setSelectedTemplateDay}
            onTemplatesSaved={reloadDraftsAfterTemplateSave}
          />
        </div>
      )}

      {/* ============ MODE 2: EDYCJA KONKRETNYCH DNI ============ */}
      {activeMode === 'edit' && (
        <div key="edit" className="draft-fade-in space-y-5">
          {/* Estymacja draftu — tryb 2 */}
          {monthlyNormData && (
            <PeriodEstimation
              confirmedDraftHours={confirmedDraftHours}
              liveTemplateDraftHours={null}
              activeNonWarehouseCount={monthlyNormData.activeNonWarehouseCount}
              totalEmployeeNorm={monthlyNormData.totalEmployeeNorm}
              totalVacationDays={totalVacationDays}
              totalDelegationDays={totalDelegationDays}
              peakStaff={peakStaff}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-5 items-start">
            <div className="space-y-4 lg:sticky lg:top-4">
              <MiniCalendar
                year={year}
                month={month}
                selectedDate={selectedDate}
                days={monthDays}
                closedWeekdays={closedWeekdays}
                holidayDates={holidayDates}
                unsavedDate={editDirty ? selectedDate : null}
                onDateSelect={handleDateSelect}
              />
              <TemplateDiffList
                month={month}
                days={monthDays}
                selectedDate={selectedDate}
                onSelect={handleDateSelect}
              />
            </div>

            <div className="min-w-0">
              {selectedDate !== null && selectedDayOfWeekJs !== null ? (
                <DraftChart
                  key={`${currentStoreId}-${year}-${month}-${selectedDate}`}
                  draft={draft}
                  template={selectedTemplateDemand}
                  templateLabel={`szablon ${WEEKDAY_GENITIVE[selectedDayOfWeekJs]}`}
                  dateLabel={selectedDayLabel}
                  hasDraft={!!selectedDraftRecord}
                  onSave={handleDraftChartSave}
                  onDirtyChange={setEditDirty}
                  maxValue={maxStaffFromStore}
                  openHour={storeHoursForSelectedDay?.openHour}
                  closeHour={storeHoursForSelectedDay?.closeHour}
                  headerExtra={
                    <LastModifiedInfo
                      updatedAt={selectedDraftRecord?.updatedAt}
                      createdAt={selectedDraftRecord?.createdAt}
                      updatedByLabel={selectedDraftRecord?.updatedByLabel}
                      createdByLabel={selectedDraftRecord?.createdByLabel}
                      className="mt-1.5"
                    />
                  }
                />
              ) : (
                <div className={`${GLASS_PANEL} py-16 px-6 text-center text-slate-400 text-sm`}>
                  Wybierz dzień w kalendarzu, aby edytować jego obsadę.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ MODE 3: POZOSTAŁE GODZINY PRACOWNIKÓW (ostatni miesiąc okresu) ============ */}
      {activeMode === 'hoursConfirmation' && currentStoreId && (
        <div key="hoursConfirmation" className={`draft-fade-in ${GLASS_PANEL} overflow-hidden`} style={{ minHeight: 480 }}>
          <EmployeeHoursConfirmationStep
            storeId={currentStoreId}
            year={year}
            month={month + 1}
            monthName={MONTHS[month]}
            embedded
            onSaved={() => {
              // Suma potwierdzonych godzin jest teraz bazą draftu (zamiast normy) -
              // odśwież monthlyNormData, żeby PeriodEstimation od razu pokazywał
              // aktualny budżet i ostrzegał, jeśli draft go przekracza.
              draftService
                .getMonthlyNorm(currentStoreId, year, month + 1)
                .then(setMonthlyNormData)
                .catch(() => {});
            }}
          />
        </div>
      )}

      {/* Lokalne animacje — bez zależności od tailwind.config, działa wszędzie */}
      <style>{`
        @keyframes draftFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .draft-fade-in { animation: draftFadeIn 0.35s ease both; }

        @keyframes draftAuroraPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.08); }
        }
        .draft-aurora-blob { animation: draftAuroraPulse 7s ease-in-out infinite; }
        .draft-aurora-blob-delayed { animation-delay: 2.5s; }

        .draft-ring-progress { transition: stroke-dashoffset 0.6s ease; }

        @keyframes draftShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .draft-shimmer {
          background-image: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.08), transparent);
          background-size: 200% 100%;
          animation: draftShimmer 1.6s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .draft-fade-in, .draft-aurora-blob, .draft-ring-progress, .draft-shimmer {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}