import { useState, useEffect } from 'react';
import {
  X,
  Check,
  Calendar,
  Clock,
  ChevronRight,
  FileCheck,
  UserCheck,
  GitBranch,
  LayoutGrid,
  Loader2,
  Zap,
  Users,
  Plane,
  Briefcase,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Palmtree,
  ChartNoAxesCombined,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ShiftHourConfigStep from './ShiftHourConfigStep';
import EmployeeHoursConfirmationStep from './EmployeeHoursConfirmationStep';
import { scheduleService } from '@/services/api/schedule.service';
import {
  vacationService,
  delegationService,
  employeeService,
  draftService,
  billingPeriodConfigService,
} from '@/services/api-provider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ModalStep = 'checklist' | 'shift-hour-config' | 'hours-confirmation' | 'summary';

type ChecklistItemId = 'vacations' | 'delegations' | 'proposals' | 'draft';

interface ChecklistItem {
  id: ChecklistItemId;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface SummaryData {
  totalVacationDays: number;
  totalDelegationDays: number;
  activeEmployeeCount: number;
  avgHoursPerEmployee: number | null;
  standardWorkingHours: number | null;
  totalEmployeeNorm: number;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SchedulePreparationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Wywoływane po pomyślnym wygenerowaniu — przekazuje id nowego grafiku */
  onProceed: (scheduleId: number) => void;
  selectedMonth: number;
  selectedYear: number;
  storeId: number;
  onNavigateToTab: (tab: 'vacations' | 'proposals' | 'draft') => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'vacations',
    label: 'Urlopy pracowników',
    description: 'Sprawdź urlopy planowane na ten miesiąc',
    icon: <Palmtree className="w-5 h-5 text-blue-400" />,
  },
  {
    id: 'delegations',
    label: 'Delegacje i nieobecności',
    description: 'Przejrzyj delegacje i zaplanowane nieobecności pracowników',
    icon: <Briefcase className="w-5 h-5 text-purple-400" />,
  },
  {
    id: 'proposals',
    label: 'Propozycje pracowników',
    description: 'Wprowadź propozycje zmian grafiku od pracowników',
    icon: <UserCheck className="w-5 h-5 text-cyan-400" />,
  },
  {
    id: 'draft',
    label: 'Planowanie obsady',
    description: 'Upewnij się, że obsada została należycie zaplanowana',
    icon: <ChartNoAxesCombined className="w-5 h-5 text-orange-400" />,
  },
];

const BASE_STEPS = [
  { key: 'checklist' as const,         label: 'Checklista' },
  { key: 'shift-hour-config' as const, label: 'Reguły godzin' },
];

const HOURS_CONFIRMATION_STEP = { key: 'hours-confirmation' as const, label: 'Godziny miesiąca' };

const SUMMARY_STEP = { key: 'summary' as const, label: 'Podsumowanie' };

// ---------------------------------------------------------------------------
// Helper — browser download Blob
// ---------------------------------------------------------------------------

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Summary stat tile
// ---------------------------------------------------------------------------

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  color: 'blue' | 'purple' | 'emerald' | 'amber' | 'cyan';
  loading?: boolean;
}

const COLOR_MAP: Record<StatTileProps['color'], { bg: string; border: string; iconBg: string; value: string }> = {
  blue:    { bg: 'bg-blue-900/20',    border: 'border-blue-700/40',    iconBg: 'bg-blue-500/15',    value: 'text-blue-300'    },
  purple:  { bg: 'bg-purple-900/20',  border: 'border-purple-700/40',  iconBg: 'bg-purple-500/15',  value: 'text-purple-300'  },
  emerald: { bg: 'bg-emerald-900/20', border: 'border-emerald-700/40', iconBg: 'bg-emerald-500/15', value: 'text-emerald-300' },
  amber:   { bg: 'bg-amber-900/20',   border: 'border-amber-700/40',   iconBg: 'bg-amber-500/15',   value: 'text-amber-300'   },
  cyan:    { bg: 'bg-cyan-900/20',     border: 'border-cyan-700/40',    iconBg: 'bg-cyan-500/15',    value: 'text-cyan-300'    },
};

function StatTile({ icon, label, value, sub, color, loading }: StatTileProps) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${c.bg} ${c.border}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-slate-400 text-xs mb-1 leading-tight">{label}</p>
        {loading ? (
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
            <span className="text-slate-500 text-sm">Ładowanie…</span>
          </div>
        ) : (
          <>
            <p className={`text-xl font-bold leading-tight ${c.value}`}>{value}</p>
            {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SchedulePreparationModal({
  isOpen,
  onClose,
  onProceed,
  selectedMonth,
  selectedYear,
  storeId,
  onNavigateToTab,
}: SchedulePreparationModalProps) {
  const [step, setStep] = useState<ModalStep>('checklist');
  const [checkedItems, setCheckedItems] = useState<Set<ChecklistItemId>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  // Summary data
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Czy wybrany miesiąc jest OSTATNIM miesiącem okresu rozliczeniowego —
  // tylko wtedy pokazujemy krok "Godziny miesiąca" (zgodnie z logiką
  // backendu: ScheduleGeneratorContextFactory#isLastMonthOfPeriod, który
  // dla ostatniego miesiąca okresu bierze limit godzin z
  // EmployeeMonthlyHoursConfirmation zamiast domyślnej normy etatu).
  const [isLastMonthOfPeriod, setIsLastMonthOfPeriod] = useState(false);
  const [checkingPeriod, setCheckingPeriod] = useState(false);

  const monthName = MONTH_NAMES[selectedMonth] ?? '';
  const allChecked = checkedItems.size === CHECKLIST_ITEMS.length;

  const STEPS = [
    ...BASE_STEPS,
    ...(isLastMonthOfPeriod ? [HOURS_CONFIRMATION_STEP] : []),
    SUMMARY_STEP,
  ];
  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  // ---------------------------------------------------------------------------
  // Sprawdź, czy selectedMonth jest ostatnim miesiącem okresu rozliczenia
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const backendMonth = selectedMonth + 1; // 1-indexed

    setCheckingPeriod(true);
    billingPeriodConfigService
      .getPeriodMonths(selectedYear, backendMonth)
      .then((periodMonths) => {
        if (cancelled) return;
        const isLast =
          Array.isArray(periodMonths) &&
          periodMonths.length > 0 &&
          periodMonths[periodMonths.length - 1] === backendMonth;
        setIsLastMonthOfPeriod(isLast);
      })
      .catch((e) => {
        console.error('[SchedulePreparationModal] getPeriodMonths error', e);
        if (!cancelled) setIsLastMonthOfPeriod(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingPeriod(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedYear, selectedMonth]);

  // ---------------------------------------------------------------------------
  // Reset on close / reopen
  // ---------------------------------------------------------------------------

  const handleClose = () => {
    if (isGenerating) return;
    setStep('checklist');
    setCheckedItems(new Set());
    setSummaryData(null);
    setSummaryError(null);
    onClose();
  };

  // ---------------------------------------------------------------------------
  // Checklist
  // ---------------------------------------------------------------------------

  const toggleCheck = (id: ChecklistItemId) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNavigateItem = (item: ChecklistItem) => {
    if (item.id === 'delegations') { handleClose(); return; }
    onNavigateToTab(item.id as 'vacations' | 'proposals' | 'draft');
    handleClose();
  };

  // ---------------------------------------------------------------------------
  // Load summary data when entering step 3
  // ---------------------------------------------------------------------------

  const loadSummaryData = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    const backendMonth = selectedMonth + 1; // 1-indexed

    try {
      const [empResponse, vacResponse, normData] = await Promise.all([
        employeeService.getAll(storeId).catch(() => ({ content: [] })),
        vacationService.getByCriteria(storeId, { year: selectedYear, month: backendMonth }).catch(() => ({ content: [] })),
        draftService.getMonthlyNorm(storeId, selectedYear, backendMonth).catch(() => null),
      ]);

      const employees = (empResponse as any).content ?? [];
      const activeCount = employees.filter((e: any) => e.enable && !e.warehouseman).length;

      const vacDays: number = ((vacResponse as any).content ?? []).reduce(
        (sum: number, v: any) => sum + (Array.isArray(v.monthlyVacation) ? v.monthlyVacation.filter((d: number) => d === 1).length : 0),
        0
      );

      let delDays = 0;
      try {
        const delResponse = await delegationService.getByCriteria(storeId, { year: selectedYear, month: backendMonth });
        delDays = ((delResponse as any).content ?? []).reduce(
          (sum: number, d: any) => sum + (Array.isArray(d.monthlyDelegation) ? d.monthlyDelegation.filter((v: number) => v === 1).length : 0),
          0
        );
      } catch { /* brak delegacji → 0 */ }

      const totalNorm = (normData as any)?.totalEmployeeNorm ?? 0;
      const stdHours = (normData as any)?.standardWorkingHours ?? null;

      // Średnie godziny na pracownika = totalEmployeeNorm / activeCount (zaokrąglone do 1 miejsca)
      const avgHours = activeCount > 0 && totalNorm > 0
        ? Math.round((totalNorm / activeCount) * 10) / 10
        : null;

      setSummaryData({
        totalVacationDays: vacDays,
        totalDelegationDays: delDays,
        activeEmployeeCount: activeCount,
        avgHoursPerEmployee: avgHours,
        standardWorkingHours: stdHours,
        totalEmployeeNorm: totalNorm,
      });
    } catch (err) {
      console.error('[SchedulePreparationModal] loadSummaryData error', err);
      setSummaryError('Nie udało się załadować danych podsumowania.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const goToSummary = () => {
    setStep('summary');
    loadSummaryData();
  };

  // Po kroku "Reguły godzin": jeśli to ostatni miesiąc okresu rozliczenia,
  // przejdź do kroku "Godziny miesiąca", w przeciwnym razie od razu do podsumowania.
  const goToNextAfterShiftHourConfig = () => {
    if (isLastMonthOfPeriod) {
      setStep('hours-confirmation');
    } else {
      goToSummary();
    }
  };

  // ---------------------------------------------------------------------------
  // Generate
  // ---------------------------------------------------------------------------

  const handleGenerateAndDownload = async () => {
    setIsGenerating(true);
    const toastId = toast.loading('Tworzenie grafiku w bazie…');
    try {
      const created = await scheduleService.create(storeId, {
        year: selectedYear,
        month: selectedMonth + 1,
        scheduleStatusName: 'IN_PROGRESS',
      });

      toast.loading('Uruchamianie algorytmu…', { id: toastId });

      const blob = await scheduleService.generate(storeId, created.id);
      const filename = `grafik_${created.month}_${created.year}.xlsx`;
      triggerDownload(blob, filename);

      toast.success('Grafik wygenerowany! Plik pobrany.', { id: toastId });

      setStep('checklist');
      setCheckedItems(new Set());
      setSummaryData(null);
      onClose();
      onProceed(created.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nieznany błąd';
      toast.error(`Błąd: ${msg}`, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Tworzenie grafiku na ${monthName} ${selectedYear}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                Utwórz grafik na {monthName} {selectedYear}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {step === 'checklist'
                  ? 'Potwierdź gotowość i skonfiguruj grafik'
                  : step === 'shift-hour-config'
                  ? 'Konfiguracja podmian godzin zmian'
                  : 'Podsumowanie przed generowaniem'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0 ml-4 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step progress ── */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      i < currentStepIndex
                        ? 'bg-green-600 text-white'
                        : i === currentStepIndex
                        ? 'bg-green-500 text-white ring-2 ring-green-500/30'
                        : 'bg-slate-700 text-slate-500'
                    }`}
                  >
                    {i < currentStepIndex ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      i <= currentStepIndex ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px transition-colors mx-1 ${
                      i < currentStepIndex ? 'bg-green-600' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <AnimatePresence mode="wait">

            {/* ── KROK 1: CHECKLISTA ── */}
            {step === 'checklist' && (
              <motion.div
                key="checklist"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col flex-1 min-h-0"
              >
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                  <p className="text-slate-400 text-sm mb-4">
                    Zanim wygenerujesz grafik, upewnij się że poniższe elementy zostały
                    przejrzane. Zaznacz każdą pozycję lub przejdź do danej sekcji.
                  </p>

                  {CHECKLIST_ITEMS.map((item) => {
                    const isChecked = checkedItems.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                          isChecked
                            ? 'bg-green-900/20 border-green-700/50'
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <button
                          onClick={() => toggleCheck(item.id)}
                          aria-pressed={isChecked}
                          aria-label={`Zaznacz: ${item.label}`}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-green-600 border-green-600'
                              : 'border-slate-500 hover:border-green-500'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                        <div className="flex-shrink-0">{item.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${isChecked ? 'text-green-300' : 'text-white'}`}>
                            {item.label}
                          </p>
                          <p className="text-slate-500 text-xs mt-0.5 truncate">{item.description}</p>
                        </div>
                        <button
                          onClick={() => handleNavigateItem(item)}
                          className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-500 hover:text-green-400 transition-colors px-2 py-1 rounded-lg hover:bg-slate-700/50"
                        >
                          Przejdź
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {allChecked && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300 text-sm"
                    >
                      <Check className="w-4 h-4 flex-shrink-0" />
                      Wszystkie punkty zatwierdzone – możesz przejść dalej!
                    </motion.div>
                  )}
                </div>

                <div className="border-t border-slate-700 bg-slate-800/50 px-6 py-4 flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-500 flex-1">
                    {checkedItems.size}/{CHECKLIST_ITEMS.length} zatwierdzone
                  </span>
                  <button
                    onClick={handleClose}
                    className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={() => setStep('shift-hour-config')}
                    disabled={!allChecked}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      allChecked
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/30 hover:scale-105 active:scale-95'
                        : 'bg-slate-700/50 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Reguły godzin
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── KROK 2: KONFIGURACJA GODZIN ── */}
            {step === 'shift-hour-config' && (
              <motion.div
                key="shift-hour-config"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col flex-1 min-h-0"
              >
                {/* ShiftHourConfigStep bez własnego przycisku generowania — tutaj przycisk Dalej */}
                <ShiftHourConfigStep
                  storeId={storeId}
                  onBack={() => setStep('checklist')}
                  onConfirm={goToNextAfterShiftHourConfig}
                  isConfirming={checkingPeriod}
                  confirmLabel="Dalej"
                  confirmIcon={<ChevronRight className="w-4 h-4" />}
                />
              </motion.div>
            )}

            {/* ── KROK 2b: GODZINY OSTATNIEGO MIESIĄCA OKRESU ROZLICZENIA ── */}
            {step === 'hours-confirmation' && (
              <motion.div
                key="hours-confirmation"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col flex-1 min-h-0"
              >
                <EmployeeHoursConfirmationStep
                  storeId={storeId}
                  year={selectedYear}
                  month={selectedMonth + 1}
                  monthName={`${monthName} ${selectedYear}`}
                  onBack={() => setStep('shift-hour-config')}
                  onConfirm={goToSummary}
                  isConfirming={false}
                />
              </motion.div>
            )}

            {/* ── KROK 3: PODSUMOWANIE ── */}
            {step === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col flex-1 min-h-0"
              >
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {/* Intro */}
                  <p className="text-slate-400 text-sm">
                    Przejrzyj kluczowe dane miesiąca przed wygenerowaniem grafiku.
                    Wszystko wygląda ok? Kliknij <span className="text-white font-medium">Generuj grafik</span>.
                  </p>

                  {/* Error state */}
                  {summaryError && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-900/20 border border-red-700/40 rounded-xl text-red-300 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {summaryError}
                    </div>
                  )}

                  {/* Kafelki statystyk */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile
                      icon={<Users className="w-4 h-4 text-emerald-400" />}
                      label="Aktywni pracownicy"
                      value={summaryData?.activeEmployeeCount ?? '—'}
                      sub="łączna suma"
                      color="emerald"
                      loading={summaryLoading}
                    />
                    <StatTile
                      icon={<Plane className="w-4 h-4 text-blue-400" />}
                      label="Dni urlopów"
                      value={summaryData?.totalVacationDays ?? '—'}
                      sub={`w ${monthName} ${selectedYear}`}
                      color="blue"
                      loading={summaryLoading}
                    />
                    <StatTile
                      icon={<Briefcase className="w-4 h-4 text-purple-400" />}
                      label="Dni delegacji"
                      value={summaryData?.totalDelegationDays ?? '—'}
                      sub={`w ${monthName} ${selectedYear}`}
                      color="purple"
                      loading={summaryLoading}
                    />
                    <StatTile
                      icon={<Clock className="w-4 h-4 text-amber-400" />}
                      label="Norma miesiąca"
                      value={summaryData?.standardWorkingHours != null ? `${summaryData.standardWorkingHours} h` : '—'}
                      sub="standardowe godziny robocze"
                      color="amber"
                      loading={summaryLoading}
                    />
                    <StatTile
                      icon={<BarChart3 className="w-4 h-4 text-cyan-400" />}
                      label="Łączna norma etatu"
                      value={summaryData?.totalEmployeeNorm ? `${summaryData.totalEmployeeNorm} h` : '—'}
                      sub="suma norm wszystkich prac."
                      color="cyan"
                      loading={summaryLoading}
                    />
                    <StatTile
                      icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
                      label="Śr. godzin / pracownik"
                      value={summaryData?.avgHoursPerEmployee != null ? `${summaryData.avgHoursPerEmployee} h` : '—'}
                      sub="norma etatu ÷ aktywni"
                      color="emerald"
                      loading={summaryLoading}
                    />
                  </div>

                  {/* Gotowość do generowania */}
                  {!summaryLoading && !summaryError && summaryData && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300 text-sm"
                    >
                      <Check className="w-4 h-4 flex-shrink-0" />
                      Dane załadowane – grafik gotowy do wygenerowania!
                    </motion.div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-700 bg-slate-800/50 px-6 py-4 flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => setStep(isLastMonthOfPeriod ? 'hours-confirmation' : 'shift-hour-config')}
                    disabled={isGenerating}
                    className="px-5 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
                  >
                    Wróć
                  </button>

                  <button
                    onClick={handleGenerateAndDownload}
                    disabled={isGenerating || summaryLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-green-500/30 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generowanie...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Generuj grafik
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Generating overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-green-400 animate-spin" />
            <p className="text-white font-medium text-sm">Generowanie grafiku…</p>
            <p className="text-slate-400 text-xs">To nie potrwa długo</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}