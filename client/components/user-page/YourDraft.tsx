/**
 * YourDraft Component
 * Main draft management component with clear mode separation
 * Mode 1: Template Management (activeMode === 'templates')
 * Mode 2: Specific Day Editing  (activeMode === 'edit')
 *
 * ARCHITEKTURA LICZENIA GODZIN:
 * - confirmedDraftHours: useMemo z drafts[] → automatycznie aktualny po każdym zapisie (tryb 1 i 2)
 * - monthlyNormData: pobierany z backendu (endpoint /monthlyNorm), zawiera:
 *     - standardWorkingHours (np. 160 dla maja 2026 z uwzgl. świąt)
 *     - totalEmployeeNorm (suma norm etatu wszystkich prac. bez magazyniera)
 *     - activeNonWarehouseCount
 * - TemplateManager i PeriodEstimation w trybie 2 korzystają z tych samych danych
 */

import { useState, useEffect, useMemo, type ComponentType, type ReactNode } from 'react';
import {
  Loader,
  CalendarDays,
  LayoutTemplate,
  CalendarClock,
  Users2,
  AlertTriangle,
  History,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ResponseDemandDraftDTO } from '@/types/draft.types';
import {
  formatDateForBackend,
  parseDateFromBackend,
  createEmptyDraft,
  createSampleDraft,
  getLatestDraftRecord,
} from '@/utils/draft.utils';
import { draftService, storeDetailsService, billingPeriodConfigService, storeOpeningHoursService } from '@/services/api-provider';
import type { DayHours } from '@/services/api/store-opening-hours.service';
import type { MonthlyNormData } from '@/services/api/draft.service';
import type { BillingPeriodConfigResponse } from '@/types/billing-period-config.types';
import type { ResponseEmployeeDTO } from '@/types/employee.types';
import { employeeService, vacationService, delegationService } from '@/services/api-provider';
import { TemplateManager } from '@/components/draft/TemplateManager';
import { PeriodEstimation } from '@/components/draft/PeriodEstimation';
import { DraftHeader } from './draft/DraftHeader';
import { MonthlyPeopleChart } from './draft/MonthlyPeopleChart';
import { SelectionInfo } from './draft/SelectionInfo';
import { DraftChart } from './draft/DraftChart';
import { DraftStats } from './draft/DraftStats';
import { MiniCalendar } from './draft/MiniCalendar';
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
      className="relative flex w-full sm:w-auto bg-slate-900/60 border border-slate-700/70 rounded-xl p-1 gap-1 overflow-x-auto"
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
            className={`relative z-10 flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
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

/** Nagłówek sekcji — spójna etykieta "eyebrow" dla grup treści w trybie edycji. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
      <span className="h-px flex-1 max-w-4 bg-slate-700" />
      {children}
      <span className="h-px flex-1 bg-slate-700" />
    </h3>
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
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(0);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<'templates' | 'edit' | 'hoursConfirmation'>('templates');

  /**
   * Aktualnie wybrany dzień tygodnia w zakładce Szablony.
   * Synchronizowany z TemplateManager via callback onDayOfWeekChange.
   * Domyślnie 1 (poniedziałek) – zgodne z DEFAULT_DAY_TEMPLATES.
   */
  const [selectedTemplateDay, setSelectedTemplateDay] = useState<number>(1);

  // Max obsada z zakładki Sklep
  const [maxStaffFromStore, setMaxStaffFromStore] = useState<number>(100);

  // Godziny otwarcia sklepu (z zakładki Sklep)
  const [storeOpeningHours, setStoreOpeningHours] = useState<Record<string, DayHours> | null>(null);

  // ======================== DERIVED STATE ========================

  /**
   * Rzeczywista suma godzin z bazy danych.
   * Wyliczana z drafts[] — automatycznie aktualizuje się po każdym zapisie w obu trybach.
   */
  const confirmedDraftHours = useMemo(() =>
    drafts.reduce((total, draft) => {
      const isHoliday = draft.hourlyDemand.every(v => v === 0);
      if (isHoliday) return total;
      return total + draft.hourlyDemand.reduce((s, v) => s + v, 0);
    }, 0),
  [drafts]);

  const activeNonWarehouseCount = useMemo(
    () => employees.filter((e: any) => e.enable && !e.warehouseman).length,
    [employees]
  );

  /**
   * Liczy jaka byłaby suma miesięczna draftu, gdyby dzień `dateStr` miał `newHourlyDemand`
   * zamiast obecnej wartości (albo doszedł jako nowy dzień). Ta sama logika co
   * confirmedDraftHours (dzień samych zer = święto, pomijany).
   */
  const computeProjectedMonthlyTotal = (dateStr: string, newHourlyDemand: number[]): number => {
    const dayExists = drafts.some((d) => d.draftDate === dateStr);
    const dailyDemands = dayExists
      ? drafts.map((d) => (d.draftDate === dateStr ? newHourlyDemand : d.hourlyDemand))
      : [...drafts.map((d) => d.hourlyDemand), newHourlyDemand];

    return dailyDemands.reduce((total, hourlyDemand) => {
      const isHoliday = hourlyDemand.every((v) => v === 0);
      if (isHoliday) return total;
      return total + hourlyDemand.reduce((s, v) => s + v, 0);
    }, 0);
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

  // Mapowanie: getDay() (0=niedziela…6=sobota) → klucz godzin sklepu
  const DAY_INDEX_TO_KEY = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;

  /**
   * Godziny otwarcia/zamknięcia dla aktualnie wybranego dnia.
   * Jeśli wybrany konkretny dzień → bierzemy jego dzień tygodnia,
   * jeśli tryb szablonu → bierzemy selectedDayOfWeek (0–6).
   */
  const storeHoursForSelectedDay = useMemo(() => {
    if (!storeOpeningHours) return null;
    let dayOfWeek: number;
    if (selectedDate !== null) {
      dayOfWeek = new Date(year, month, selectedDate).getDay();
    } else {
      dayOfWeek = selectedDayOfWeek;
    }
    const key = DAY_INDEX_TO_KEY[dayOfWeek];
    const hours = storeOpeningHours[key];
    if (!hours) return null;
    return {
      openHour: parseInt(hours.open.split(':')[0], 10),
      closeHour: parseInt(hours.close.split(':')[0], 10),
    };
  }, [storeOpeningHours, selectedDate, selectedDayOfWeek, year, month]);

  /**
   * Godziny otwarcia/zamknięcia dla aktualnie wybranego dnia tygodnia w szablonach.
   * selectedTemplateDay używa tej samej konwencji co getDay(): 0=niedziela, 1=pon, …, 6=sobota.
   */
  const storeHoursForTemplateDay = useMemo(() => {
    if (!storeOpeningHours) return null;
    const key = DAY_INDEX_TO_KEY[selectedTemplateDay];
    const hours = storeOpeningHours[key];
    if (!hours) return null;
    return {
      openHour: parseInt(hours.open.split(':')[0], 10),
      closeHour: parseInt(hours.close.split(':')[0], 10),
    };
  }, [storeOpeningHours, selectedTemplateDay]);

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
        // Zresetuj zaznaczenie przy zmianie sklepu
        setSelectedDate(null);
        setActiveMode('templates');

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
        toast.error('Nie udało się pobrać grafików z serwera.');
      } finally {
        if (draftsGuard.isCurrent(token)) setLoading(false);
      }
    };

    loadDrafts();
  }, [currentStoreId, year, month, draftsGuard]);

  // ======================== HELPERS ========================

  const getCurrentDraft = (): number[] => {
    if (selectedDate !== null) {
      const date = new Date(year, month, selectedDate);
      const dateStr = formatDateForBackend(date);
      const found = drafts.find((d) => d.draftDate.startsWith(dateStr));
      if (found) {
        if (typeof found.hourlyDemand === 'string') {
          try { return JSON.parse(found.hourlyDemand); } catch { return Array(24).fill(0); }
        }
        return found.hourlyDemand;
      }
      return Array(24).fill(0);
    } else {
      const matchingDrafts = drafts.filter((d) => {
        const cleanDateStr = d.draftDate.split('T')[0];
        const date = parseDateFromBackend(cleanDateStr);
        return date.getDay() === selectedDayOfWeek;
      });
      if (matchingDrafts.length === 0) return Array(24).fill(0);

      const avgDraft = Array(24).fill(0);
      matchingDrafts.forEach((draft) => {
        const demandArray = typeof draft.hourlyDemand === 'string'
          ? JSON.parse(draft.hourlyDemand)
          : draft.hourlyDemand;
        demandArray.forEach((val: number, hour: number) => { avgDraft[hour] += val; });
      });
      return avgDraft.map((val) => Math.round(val / matchingDrafts.length));
    }
  };

  const draft = getCurrentDraft();

  // Zapisany rekord draftu (z backendu) dla aktualnie wybranego konkretnego dnia —
  // potrzebny do wyświetlenia "Ostatnia zmiana" (updatedAt/createdAt) w SelectionInfo.
  const selectedDraftRecord = useMemo(() => {
    if (selectedDate === null) return undefined;
    const dateStr = formatDateForBackend(new Date(year, month, selectedDate));
    return drafts.find((d) => d.draftDate.startsWith(dateStr));
  }, [drafts, year, month, selectedDate]);

  // "Ostatnia zmiana" całego draftu danego miesiąca — jeden, ogólny wskaźnik,
  // wyświetlany niezależnie od trybu (Szablony / Edycja Konkretnych Dni) i
  // niezależnie od wybranego dnia tygodnia. Najnowszy rekord spośród
  // WSZYSTKICH draftów miesiąca — patrz getLatestDraftRecord.
  const draftLastModifiedRecord = useMemo(() => {
    return getLatestDraftRecord(drafts);
  }, [drafts]);

  // ======================== HANDLERS ========================

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleDateSelect = (day: number | null) => {
    setSelectedDate(day);
    if (day !== null) setActiveMode('edit');
  };

  const handleModeChange = (mode: 'templates' | 'edit' | 'hoursConfirmation') => {
    setActiveMode(mode);
    if (mode === 'templates') {
      setSelectedDate(null);
    } else if (mode === 'edit') {
      setSelectedDate(1);
    }
  };

  const handleUpdateHour = async (hour: number, delta: number) => {
    if (!currentStoreId) return;
    if (selectedDate === null) { toast.warning('Wybierz konkretny dzień aby edytować'); return; }

    const newDraft = [...draft];
    const currentValue = newDraft[hour] || 0;
    const newValue = Math.max(0, Math.min(maxStaffFromStore, currentValue + delta));
    newDraft[hour] = newValue;

    const date = new Date(year, month, selectedDate);
    const dateStr = formatDateForBackend(date);

    if (!assertWithinLastMonthBudget(dateStr, newDraft)) return;

    try {
      const existing = drafts.find((d) => d.draftDate === dateStr);
      if (existing) {
        const updated = await draftService.update(currentStoreId, existing.id, {
          draftDate: dateStr,
          hourlyDemand: newDraft,
        });
        setDrafts((prev) => prev.map((d) => (d.id === existing.id ? updated : d)));
        toast.success('Zapisano zmiany');
      } else {
        const created = await draftService.create(currentStoreId, {
          draftDate: dateStr,
          hourlyDemand: newDraft,
        });
        setDrafts((prev) => [...prev, created]);
        toast.success('Zapisano nowy grafik');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zapisać zmian';
      toast.error(message);
    }
  };

  const handleLoadSample = async () => {
    if (!currentStoreId) return;
    if (selectedDate === null) { toast.warning('Wybierz konkretny dzień'); return; }

    try {
      const date = new Date(year, month, selectedDate);
      const dateStr = formatDateForBackend(date);
      const sampleDraft = createSampleDraft();

      if (!assertWithinLastMonthBudget(dateStr, sampleDraft)) return;

      let existing = drafts.find((d) => d.draftDate === dateStr);

      if (existing) {
        const updated = await draftService.update(currentStoreId, existing.id, {
          draftDate: dateStr,
          hourlyDemand: sampleDraft,
        });
        setDrafts((prev) => prev.map((d) => (d.id === existing!.id ? updated : d)));
        toast.success('Załadowano przykładowy grafik');
      } else {
        try {
          const created = await draftService.create(currentStoreId, {
            draftDate: dateStr,
            hourlyDemand: sampleDraft,
          });
          setDrafts((prev) => [...prev, created]);
          toast.success('Załadowano przykładowy grafik');
        } catch (createError) {
          const errorMsg = createError instanceof Error ? createError.message : '';
          if (errorMsg.includes('already exists')) {
            const response = await draftService.getByDateRange(
              currentStoreId,
              formatDateForBackend(new Date(year, month, 1)),
              formatDateForBackend(new Date(year, month + 1, 0))
            );
            setDrafts(response.content);
            const foundDraft = response.content.find((d) => {
              const draftDate = parseDateFromBackend(d.draftDate);
              return draftDate.getDate() === selectedDate &&
                draftDate.getMonth() === month &&
                draftDate.getFullYear() === year;
            });
            if (foundDraft) {
              const updated = await draftService.update(currentStoreId, foundDraft.id, {
                draftDate: dateStr,
                hourlyDemand: sampleDraft,
              });
              setDrafts((prev) => prev.map((d) => (d.id === foundDraft.id ? updated : d)));
              toast.success('Załadowano przykładowy grafik');
            }
          } else {
            throw createError;
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się załadować przykładu';
      toast.error(message);
    }
  };

  const handleResetDraft = async () => {
    if (!currentStoreId) return;
    if (selectedDate === null) { toast.warning('Wybierz konkretny dzień'); return; }

    const date = new Date(year, month, selectedDate);
    const dateStr = formatDateForBackend(date);
    const emptyDraft = createEmptyDraft();

    try {
      const existing = drafts.find((d) => d.draftDate === dateStr);
      if (existing) {
        const updated = await draftService.update(currentStoreId, existing.id, {
          draftDate: dateStr,
          hourlyDemand: emptyDraft,
        });
        setDrafts((prev) => prev.map((d) => (d.id === existing.id ? updated : d)));
        toast.success('Zresetowano grafik');
      } else {
        const created = await draftService.create(currentStoreId, {
          draftDate: dateStr,
          hourlyDemand: emptyDraft,
        });
        setDrafts((prev) => [...prev, created]);
        toast.success('Utworzono pusty grafik');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zresetować grafiku';
      toast.error(message);
    }
  };

  /**
   * Zapis z DraftChart (tryb 2).
   */
  const handleDraftChartSave = async (values: number[]) => {
    if (!currentStoreId) return;
    if (selectedDate === null) { toast.warning('Wybierz konkretny dzień'); return; }

    const date = new Date(year, month, selectedDate);
    const dateStr = formatDateForBackend(date);

    if (!assertWithinLastMonthBudget(dateStr, values)) return;

    try {
      const existing = drafts.find((d) => d.draftDate === dateStr);
      if (existing) {
        const updated = await draftService.update(currentStoreId, existing.id, {
          draftDate: dateStr,
          hourlyDemand: values,
        });
        setDrafts((prev) => prev.map((d) => (d.id === existing.id ? updated : d)));
      } else {
        const created = await draftService.create(currentStoreId, {
          draftDate: dateStr,
          hourlyDemand: values,
        });
        setDrafts((prev) => [...prev, created]);
      }
      toast.success('Zapisano zmiany');
    } catch (error) {
      toast.error('Nie udało się zapisać zmian');
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
            onClick={() => window.location.reload()}
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

  return (
    <div className="space-y-6">
      {/* ============ NAGŁÓWEK: tytuł modułu + ostatnia zmiana + okres rozliczeniowy ============ */}
      <div className={`relative overflow-hidden ${GLASS_PANEL} p-5 sm:p-6`}>
        <HeaderAurora />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

          {/* Odznaczka okresu rozliczeniowego */}
          {billingPeriodInfo && (
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-indigo-950/50 border border-indigo-700/40 rounded-xl">
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
        </div>
      </div>

      {/* ============ PRZEŁĄCZNIK TRYBÓW ============ */}
      <ModeTabs tabs={MODE_TABS} activeMode={activeMode} onChange={handleModeChange} />

      {/* ============ MODE 1: SZABLONY ============ */}
      {activeMode === 'templates' && (
        <div key="templates" className="draft-fade-in grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TemplateManager */}
          <div className="lg:col-span-2">
            <TemplateManager
              storeId={currentStoreId}
              year={year}
              month={month}
              maxValue={maxStaffFromStore}
              activeNonWarehouseCount={monthlyNormData?.activeNonWarehouseCount ?? activeNonWarehouseCount}
              totalEmployeeNorm={monthlyNormData?.totalEmployeeNorm ?? 0}
              confirmedDraftHours={confirmedDraftHours}
              totalVacationDays={totalVacationDays}
              totalDelegationDays={totalDelegationDays}
              warehousemanName={warehouseman ? `${warehouseman.firstName} ${warehouseman.lastName}` : null}
              isLastMonthOfPeriod={isLastMonthOfPeriod}
              openHour={storeHoursForTemplateDay?.openHour}
              closeHour={storeHoursForTemplateDay?.closeHour}
              onDayOfWeekChange={setSelectedTemplateDay}
              onTemplatesSaved={() => {
                const loadDrafts = async () => {
                  try {
                    const firstDay = new Date(year, month, 1);
                    const lastDay = new Date(year, month + 1, 0);
                    const response = await draftService.getByDateRange(
                      currentStoreId,
                      formatDateForBackend(firstDay),
                      formatDateForBackend(lastDay)
                    );
                    setDrafts(response.content);
                    toast.success('Szablony zostały zastosowane!');
                  } catch (err) {
                    console.error('Error reloading drafts:', err);
                  }
                };
                loadDrafts();
              }}
            />
          </div>

          {/* Kalendarz + statystyki */}
          <div className="space-y-4">
            <div className={`${GLASS_PANEL} p-4 flex items-center gap-3`}>
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center flex-shrink-0">
                <LayoutTemplate className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-slate-300 text-sm">
                <span className="block text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Szablon dla</span>
                <span className="font-semibold text-white">{DAYS_OF_WEEK[(selectedTemplateDay + 6) % 7]}</span>
              </p>
            </div>
            <div className={`${GLASS_PANEL} p-4`}>
              <MiniCalendar
                year={year}
                month={month}
                selectedDate={selectedDate}
                drafts={drafts}
                holidayDates={holidayDates}
                onMonthChange={handleMonthChange}
                onDateSelect={handleDateSelect}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============ MODE 2: EDYCJA KONKRETNYCH DNI ============ */}
      {activeMode === 'edit' && (
        <div key="edit" className="draft-fade-in space-y-6">
          <div className={`${GLASS_PANEL} p-6 sm:p-8 space-y-8`}>
            <DraftHeader onLoadSample={handleLoadSample} onReset={handleResetDraft} />

            <div className="space-y-4">
              <SectionLabel>Wybór dnia i podgląd</SectionLabel>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Wybierz dzień</h4>
                  <MiniCalendar
                    year={year}
                    month={month}
                    selectedDate={selectedDate}
                    drafts={drafts}
                    onMonthChange={handleMonthChange}
                    onDateSelect={handleDateSelect}
                  />
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <SelectionInfo
                    month={month}
                    year={year}
                    selectedDayOfWeek={selectedDayOfWeek}
                    selectedDate={selectedDate}
                    updatedAt={selectedDraftRecord?.updatedAt}
                    createdAt={selectedDraftRecord?.createdAt}
                    updatedByLabel={selectedDraftRecord?.updatedByLabel}
                    createdByLabel={selectedDraftRecord?.createdByLabel}
                  />
                  <MonthlyPeopleChart drafts={drafts} year={year} month={month} />
                </div>
              </div>
            </div>

            {/* Estymacja draftu — tryb 2 */}
            {monthlyNormData && (
              <div className="space-y-4">
                <SectionLabel>Estymacja okresu</SectionLabel>
                <PeriodEstimation
                  confirmedDraftHours={confirmedDraftHours}
                  liveTemplateDraftHours={null}
                  activeNonWarehouseCount={monthlyNormData.activeNonWarehouseCount}
                  totalEmployeeNorm={monthlyNormData.totalEmployeeNorm}
                  totalVacationDays={totalVacationDays}
                  totalDelegationDays={totalDelegationDays}
                />
              </div>
            )}

            <div className="space-y-4">
              <SectionLabel>Wykres i sterowanie godzinami</SectionLabel>
              <DraftChart
                draft={draft}
                onSave={handleDraftChartSave}
                maxValue={maxStaffFromStore}
                openHour={storeHoursForSelectedDay?.openHour}
                closeHour={storeHoursForSelectedDay?.closeHour}
              />
            </div>

            <DraftStats draft={draft} />
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
