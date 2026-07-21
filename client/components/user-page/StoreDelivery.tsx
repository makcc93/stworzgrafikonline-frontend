import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  Truck,
  Users,
  Save,
  Loader2,
  AlertCircle,
  ChevronDown,
  PackageCheck,
  PackageX,
  Clock,
  UserCog,
} from 'lucide-react';
import { toast } from 'sonner';
import { storeDeliveryService, employeeService } from '@/services/api-provider';
import { useAppContext } from '@/context/AppContext';
import { useRequestGuard } from '@/hooks/useRequestGuard';
import {
  DayOfWeek,
  shiftArrayToHours,
  hoursToShiftArray,
  type ResponseStoreDeliveryDTO,
  type DayDeliveryConfig,
} from '@/types/store-delivery.types';
import type { ResponseEmployeeDTO } from '@/types/employee.types';

// ─── Stałe ────────────────────────────────────────────────────────────────────

const DAYS_CONFIG = [
  { key: DayOfWeek.MONDAY,    label: 'Poniedziałek' },
  { key: DayOfWeek.TUESDAY,   label: 'Wtorek' },
  { key: DayOfWeek.WEDNESDAY, label: 'Środa' },
  { key: DayOfWeek.THURSDAY,  label: 'Czwartek' },
  { key: DayOfWeek.FRIDAY,    label: 'Piątek' },
  { key: DayOfWeek.SATURDAY,  label: 'Sobota' },
  { key: DayOfWeek.SUNDAY,    label: 'Niedziela' },
] as const;

// ─── Typy lokalne ────────────────────────────────────────────────────────────

interface DayScheduleState {
  hasDelivery: boolean;
  start: number;
  end: number;
}

type ScheduleState = Record<DayOfWeek, DayScheduleState>;

// ─── Funkcje pomocnicze ───────────────────────────────────────────────────────

function buildDefaultSchedule(): ScheduleState {
  return Object.fromEntries(
    DAYS_CONFIG.map(({ key }) => [key, { hasDelivery: false, start: 8, end: 16 }])
  ) as ScheduleState;
}

function backendScheduleToState(
  backendSchedule: Record<DayOfWeek, DayDeliveryConfig>
): ScheduleState {
  const state = buildDefaultSchedule();
  for (const day of Object.values(DayOfWeek)) {
    const config = backendSchedule[day];
    if (!config) continue;
    const { start, end } = shiftArrayToHours(config.shiftAsArray ?? []);
    state[day] = {
      hasDelivery: config.hasDelivery ?? false,
      start,
      end,
    };
  }
  return state;
}

function stateToBackendSchedule(
  schedule: ScheduleState
): Record<DayOfWeek, DayDeliveryConfig> {
  return Object.fromEntries(
    DAYS_CONFIG.map(({ key }) => [
      key,
      {
        hasDelivery: schedule[key].hasDelivery,
        shiftAsArray: schedule[key].hasDelivery
          ? hoursToShiftArray(schedule[key].start, schedule[key].end)
          : new Array(24).fill(0),
      } satisfies DayDeliveryConfig,
    ])
  ) as Record<DayOfWeek, DayDeliveryConfig>;
}

// ─── Komponent przełącznika ───────────────────────────────────────────────────

function Toggle({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
      } ${value ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-slate-600'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-out ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── Komponent select godziny ─────────────────────────────────────────────────

function HourSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        disabled={disabled}
        className={`appearance-none rounded-lg border px-3 py-1.5 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
          disabled
            ? 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500'
            : 'border-slate-600 bg-slate-700 text-white hover:border-slate-500'
        }`}
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>
            {String(i).padStart(2, '0')}:00
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

// ─── Prezentacyjne komponenty pomocnicze ──────────────────────────────────────
// (tylko warstwa wizualna — cała logika zostaje w StoreDelivery)

const GLASS_PANEL = 'bg-slate-800/40 backdrop-blur-xl border border-slate-700/60 rounded-2xl';

/** Delikatne, animowane tło nagłówka — spójne z resztą modułów, w tonacji fioletowo-różowej tej sekcji. */
function DeliveryAurora() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
      <div className="delivery-aurora-blob absolute -top-16 -right-10 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="delivery-aurora-blob delivery-aurora-blob-delayed absolute -bottom-20 left-0 w-72 h-72 rounded-full bg-pink-400/15 blur-3xl" />
    </div>
  );
}

/** Pierścień pokazujący ile dni w tygodniu ma skonfigurowaną dostawę — ten sam język wizualny co pierścień okresu w module Draftu. */
function DeliveryDaysRing({ active, total }: { active: number; total: number }) {
  const size = 44;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? active / total : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-purple-950/60" />
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
          className="text-purple-400 delivery-ring-progress"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold text-purple-100 leading-none">{active}/{total}</span>
      </div>
    </div>
  );
}

/** Nagłówek sekcji — eyebrow-label spójny z pozostałymi modułami. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
      <span className="h-px flex-1 max-w-4 bg-slate-700" />
      {children}
      <span className="h-px flex-1 bg-slate-700" />
    </h3>
  );
}

/** Elegancki skeleton zamiast gołego spinnera. */
function DeliveryLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 bg-slate-800/60 border border-slate-700/50 rounded-2xl delivery-shimmer" />
      <div className="h-28 bg-slate-800/40 border border-slate-700/50 rounded-2xl delivery-shimmer" />
      <div className="h-96 bg-slate-800/40 border border-slate-700/50 rounded-2xl delivery-shimmer" />
    </div>
  );
}

// ─── Główny komponent ─────────────────────────────────────────────────────────

export default function StoreDelivery() {
  const { selectedStoreId, managerData } = useAppContext();

  const effectiveStoreId: number | null =
    selectedStoreId ?? managerData?.storeId ?? null;

  // ── Stan API ─────────────────────────────────────────────────
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Stan formularza ──────────────────────────────────────────
  const [hasDedicatedWarehouseman, setHasDedicatedWarehouseman] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleState>(buildDefaultSchedule);
  const [employees, setEmployees] = useState<ResponseEmployeeDTO[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  // ── Punkt odniesienia do wykrywania zmian ────────────────────
  const [savedEmployeeId, setSavedEmployeeId] = useState<number | null>(null);
  const [savedSchedule, setSavedSchedule] = useState<ScheduleState>(buildDefaultSchedule);

  const isDirty =
    selectedEmployeeId !== savedEmployeeId ||
    JSON.stringify(schedule) !== JSON.stringify(savedSchedule);

  // ── Posortowana lista: magazynierzy na górze, reszta niżej ───
  const sortedEmployees = [
    ...employees.filter((e) => e.warehouseman),
    ...employees.filter((e) => !e.warehouseman),
  ];

  // ── Załaduj dane ─────────────────────────────────────────────
  const loadDataGuard = useRequestGuard();
  const loadData = useCallback(async () => {
    if (!effectiveStoreId) return;
    const token = loadDataGuard.start();
    setLoadingData(true);
    setError(null);
    // Czyścimy od razu — bez tego przez chwilę widać dane poprzedniego sklepu
    setEmployees([]);
    setSchedule(buildDefaultSchedule());
    setSavedSchedule(buildDefaultSchedule());
    setSelectedEmployeeId(null);
    setSavedEmployeeId(null);
    try {
      const [delivery, employeesPage] = await Promise.all([
        storeDeliveryService.get(effectiveStoreId),
        // Pobieramy wszystkich aktywnych pracowników sklepu
        employeeService.getAll(effectiveStoreId, { enable: true }),
      ]);

      if (!loadDataGuard.isCurrent(token)) return; // sklep zmienił się w międzyczasie — porzuć odpowiedź

      setHasDedicatedWarehouseman(delivery.hasDedicatedWarehouseman ?? false);
      setSelectedEmployeeId(delivery.primaryEmployeeId ?? null);
      setSavedEmployeeId(delivery.primaryEmployeeId ?? null);

      if (delivery.storeWeeklyDeliverySchedule?.deliverySchedule) {
        const loadedSchedule = backendScheduleToState(
          delivery.storeWeeklyDeliverySchedule.deliverySchedule
        );
        setSchedule(loadedSchedule);
        setSavedSchedule(loadedSchedule);
      }

      setEmployees(employeesPage.content);
    } catch (err: any) {
      if (!loadDataGuard.isCurrent(token)) return;
      console.error('[StoreDelivery] loadData error:', err);
      setError(err?.message ?? 'Błąd ładowania danych');
    } finally {
      if (loadDataGuard.isCurrent(token)) setLoadingData(false);
    }
  }, [effectiveStoreId, loadDataGuard]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Zamknij dropdown po kliknięciu poza nim ──────────────────
  useEffect(() => {
    if (!showEmployeeDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-employee-dropdown]')) {
        setShowEmployeeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmployeeDropdown]);

  // ── Zapis ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!effectiveStoreId) {
      toast.error('Nie wybrano sklepu');
      return;
    }
    setSaving(true);
    try {
      await storeDeliveryService.update(effectiveStoreId, {
        hasDedicatedWarehouseman,
        primaryEmployeeId: hasDedicatedWarehouseman ? selectedEmployeeId : null,
        deliverySchedule: stateToBackendSchedule(schedule),
        updatedByUserId: managerData?.userId ?? null,
      });
      setSavedEmployeeId(hasDedicatedWarehouseman ? selectedEmployeeId : null);
      setSavedSchedule(schedule);
      toast.success('Zmiany zapisane');
    } catch (err: any) {
      console.error('[StoreDelivery] save error:', err);
      toast.error(err?.message ?? 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  // ── Auto-zapis przy zmianie flagi etatu ──────────────────────
  const handleToggleWarehouseman = async (newValue: boolean) => {
    if (!effectiveStoreId) return;
    setHasDedicatedWarehouseman(newValue);
    if (!newValue) setSelectedEmployeeId(null);
    setSaving(true);
    try {
      await storeDeliveryService.update(effectiveStoreId, {
        hasDedicatedWarehouseman: newValue,
        primaryEmployeeId: newValue ? selectedEmployeeId : null,
        deliverySchedule: stateToBackendSchedule(schedule),
        updatedByUserId: managerData?.userId ?? null,
      });
      toast.success(newValue ? 'Etat magazyniera włączony' : 'Etat magazyniera wyłączony');
    } catch (err: any) {
      setHasDedicatedWarehouseman(!newValue);
      if (!newValue) setSelectedEmployeeId(null);
      console.error('[StoreDelivery] toggle save error:', err);
      toast.error(err?.message ?? 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  // ── Wybrany pracownik ────────────────────────────────────────
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) ?? null;


  // ── Liczba dni w tygodniu ze skonfigurowaną dostawą (tylko do wyświetlenia) ──
  const activeDeliveryDaysCount = DAYS_CONFIG.filter(({ key }) => schedule[key].hasDelivery).length;

  // ─── Render: brak sklepu ────────────────────────────────────────────────────
  if (!effectiveStoreId) {
    return (
      <div className={`${GLASS_PANEL} flex flex-col items-center justify-center py-20 px-6 space-y-4`}>
        <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center">
          <Truck className="w-8 h-8 text-slate-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-slate-200 font-semibold">Nie wybrano sklepu</p>
          <p className="text-slate-500 text-sm">Wybierz sklep z górnego menu, aby zarządzać dostawami.</p>
        </div>
      </div>
    );
  }

  // ─── Render: ładowanie ──────────────────────────────────────────────────────
  if (loadingData) {
    return <DeliveryLoadingSkeleton />;
  }

  // ─── Render: błąd ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-red-900/50 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-red-200 font-semibold">Nie udało się wczytać konfiguracji dostaw</p>
            <p className="text-red-300/80 text-sm mt-0.5">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  // ─── Render główny ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Nagłówek z przełącznikiem etatu ── */}
      <div className={`relative overflow-hidden ${GLASS_PANEL} p-5 sm:p-6`}>
        <DeliveryAurora />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-950/50 flex-shrink-0">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Dostawy</h2>
              <p className="text-slate-400 text-sm mt-0.5">Etat magazyniera i harmonogram dostaw sklepu</p>
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-3">
            {hasDedicatedWarehouseman && (
              <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 bg-purple-950/50 border border-purple-700/40 rounded-xl">
                <DeliveryDaysRing active={activeDeliveryDaysCount} total={DAYS_CONFIG.length} />
                <div className="leading-tight">
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-purple-400">Dni z dostawą</p>
                  <p className="text-sm font-semibold text-purple-100">
                    {activeDeliveryDaysCount} z {DAYS_CONFIG.length} dni
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/60 border border-slate-700/70 rounded-xl">
              <span className="text-sm font-medium text-slate-300 whitespace-nowrap">
                Etat magazyniera
              </span>
              <Toggle
                value={hasDedicatedWarehouseman}
                onChange={handleToggleWarehouseman}
                disabled={saving}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sekcja widoczna tylko gdy etat magazyniera jest aktywny ── */}
      {hasDedicatedWarehouseman ? (
        <div className="delivery-fade-in space-y-6">

          {/* ── Pasek zapisu ── */}
          <div className="flex items-center justify-end gap-3">
            {isDirty && !saving && (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 delivery-dot-pulse" />
                Niezapisane zmiany
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                isDirty && !saving
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-950/40 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 opacity-70 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
            </button>
          </div>

          {/* ── Sekcja magazyniera ── */}
          <div className={`${GLASS_PANEL} border-purple-700/40 p-5 sm:p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <UserCog className="w-4 h-4 text-purple-400" />
              <h3 className="text-base font-semibold text-purple-200">Dedykowany magazynier</h3>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">

              {/* Wyświetlenie aktualnego */}
              <div className="flex items-center gap-3">
                {selectedEmployee ? (
                  <>
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md shadow-purple-950/40">
                      {selectedEmployee.firstName[0]}
                      {selectedEmployee.lastName[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {selectedEmployee.firstName} {selectedEmployee.lastName}
                      </p>
                      <p className="text-xs text-slate-400">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-700/60 font-mono">SAP {selectedEmployee.sap}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-slate-400">
                    <div className="w-11 h-11 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-sm italic">Nie wybrano pracownika</p>
                  </div>
                )}
              </div>

              {/* Dropdown wyboru */}
              <div className="relative" data-employee-dropdown>
                <button
                  type="button"
                  onClick={() => setShowEmployeeDropdown((v) => !v)}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  <Users className="h-4 w-4" />
                  Zmień
                </button>

                {showEmployeeDropdown && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-slate-600 bg-slate-800/95 backdrop-blur-xl shadow-2xl shadow-black/40">
                    <div className="border-b border-slate-700 px-3 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-purple-400">
                        Wybierz pracownika
                      </p>
                    </div>
                    <div className="max-h-52 overflow-y-auto p-2">
                      {sortedEmployees.length === 0 ? (
                        <p className="px-2 py-3 text-center text-sm text-slate-400">
                          Brak aktywnych pracowników
                        </p>
                      ) : (
                        <>
                          {/* ── Sekcja: Magazynierzy ── */}
                          {sortedEmployees.some((e) => e.warehouseman) && (
                            <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-purple-400">
                              Magazynierzy
                            </p>
                          )}
                          {sortedEmployees.map((emp, idx) => {
                            // separator przed pierwszym nie-magazynierem
                            const isFirstNonWarehouseman =
                              !emp.warehouseman &&
                              idx > 0 &&
                              sortedEmployees[idx - 1].warehouseman;

                            return (
                              <React.Fragment key={emp.id}>
                                {isFirstNonWarehouseman && (
                                  <>
                                    <div className="my-1 border-t border-slate-700" />
                                    <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Pozostali
                                    </p>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedEmployeeId(emp.id);
                                    setShowEmployeeDropdown(false);
                                  }}
                                  className={`w-full rounded-lg p-2.5 text-left transition-colors ${
                                    selectedEmployeeId === emp.id
                                      ? 'bg-purple-600 text-white'
                                      : 'text-slate-300 hover:bg-slate-700/70'
                                  }`}
                                >
                                  <div className="font-medium">
                                    {emp.firstName} {emp.lastName}
                                  </div>
                                  <div className="mt-0.5 text-xs opacity-70">
                                    SAP: {emp.sap}
                                  </div>
                                </button>
                              </React.Fragment>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Harmonogram tygodniowy ── */}
          <div className={`${GLASS_PANEL} p-5 sm:p-6`}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <h3 className="text-base font-semibold text-white">Harmonogram dostaw</h3>
            </div>
            <p className="mb-5 text-xs text-slate-400">
              Definiuje w jakich godzinach ma pracować magazynier danego dnia
            </p>

            <div className="space-y-2">
              {DAYS_CONFIG.map(({ key: dayKey, label }) => {
                const day = schedule[dayKey];
                const hoursDisabled = !day.hasDelivery;
                const StatusIcon = day.hasDelivery ? PackageCheck : PackageX;

                return (
                  <div
                    key={dayKey}
                    className={`flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border p-3.5 transition-colors ${
                      day.hasDelivery
                        ? 'bg-purple-950/20 border-purple-800/40'
                        : 'bg-slate-900/40 border-slate-800'
                    }`}
                  >
                    {/* Status + nazwa dnia */}
                    <div className="flex items-center gap-2.5 w-32 shrink-0">
                      <StatusIcon className={`w-4 h-4 shrink-0 ${day.hasDelivery ? 'text-purple-400' : 'text-slate-600'}`} />
                      <span
                        className={`text-sm font-medium ${
                          day.hasDelivery ? 'text-white' : 'text-slate-500'
                        }`}
                      >
                        {label}
                      </span>
                    </div>

                    {/* Przełącznik dnia */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Dostawa</span>
                      <Toggle
                        value={day.hasDelivery}
                        onChange={(v) =>
                          setSchedule((prev) => ({
                            ...prev,
                            [dayKey]: { ...prev[dayKey], hasDelivery: v },
                          }))
                        }
                      />
                    </div>

                    {/* Godziny */}
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${hoursDisabled ? '' : 'bg-slate-900/40'}`}>
                      <Clock className={`w-3.5 h-3.5 ${hoursDisabled ? 'text-slate-700' : 'text-purple-400'}`} />
                      <span className={`text-xs ${hoursDisabled ? 'text-slate-600' : 'text-slate-400'}`}>
                        Od
                      </span>
                      <HourSelect
                        value={day.start}
                        disabled={hoursDisabled}
                        onChange={(v) =>
                          setSchedule((prev) => ({
                            ...prev,
                            [dayKey]: { ...prev[dayKey], start: v },
                          }))
                        }
                      />
                      <span className={`text-xs ${hoursDisabled ? 'text-slate-600' : 'text-slate-400'}`}>
                        Do
                      </span>
                      <HourSelect
                        value={day.end}
                        disabled={hoursDisabled}
                        onChange={(v) =>
                          setSchedule((prev) => ({
                            ...prev,
                            [dayKey]: { ...prev[dayKey], end: v },
                          }))
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : (
        /* ── Informacja gdy etat wyłączony ── */
        <div className="delivery-fade-in flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-slate-800/30 px-5 py-4 text-slate-400">
          <AlertCircle className="h-4 w-4 shrink-0 text-slate-500" />
          <p className="text-sm">
            Włącz <span className="font-medium text-slate-300">Etat magazyniera w sklepie</span>, aby skonfigurować dedykowanego pracownika i harmonogram dostaw.
          </p>
        </div>
      )}

      {/* Lokalne animacje — bez zależności od tailwind.config, działa wszędzie */}
      <style>{`
        @keyframes deliveryFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .delivery-fade-in { animation: deliveryFadeIn 0.35s ease both; }

        @keyframes deliveryAuroraPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.08); }
        }
        .delivery-aurora-blob { animation: deliveryAuroraPulse 7s ease-in-out infinite; }
        .delivery-aurora-blob-delayed { animation-delay: 2.5s; }

        .delivery-ring-progress { transition: stroke-dashoffset 0.6s ease; }

        @keyframes deliveryShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .delivery-shimmer {
          background-image: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.08), transparent);
          background-size: 200% 100%;
          animation: deliveryShimmer 1.6s ease-in-out infinite;
        }

        @keyframes deliveryDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
        .delivery-dot-pulse { animation: deliveryDotPulse 1.4s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .delivery-fade-in, .delivery-aurora-blob, .delivery-ring-progress, .delivery-shimmer, .delivery-dot-pulse {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
