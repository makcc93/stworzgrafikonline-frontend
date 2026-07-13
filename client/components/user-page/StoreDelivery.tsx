import React, { useState, useEffect, useCallback } from 'react';
import { Users, Save, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { storeDeliveryService, employeeService } from '@/services/api-provider';
import { useAppContext } from '@/context/AppContext';
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
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
      } ${value ? 'bg-blue-600' : 'bg-slate-600'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
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
  const loadData = useCallback(async () => {
    if (!effectiveStoreId) return;
    setLoadingData(true);
    setError(null);
    try {
      const [delivery, employeesPage] = await Promise.all([
        storeDeliveryService.get(effectiveStoreId),
        // Pobieramy wszystkich aktywnych pracowników sklepu
        employeeService.getAll(effectiveStoreId, { enable: true }),
      ]);

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
      console.error('[StoreDelivery] loadData error:', err);
      setError(err?.message ?? 'Błąd ładowania danych');
    } finally {
      setLoadingData(false);
    }
  }, [effectiveStoreId]);

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

  // ─── Render: brak sklepu ────────────────────────────────────────────────────
  if (!effectiveStoreId) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <AlertCircle className="mr-2 h-5 w-5" />
        Wybierz sklep, aby zarządzać dostawami.
      </div>
    );
  }

  // ─── Render: ładowanie ──────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Ładowanie konfiguracji dostaw…
      </div>
    );
  }

  // ─── Render: błąd ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-red-400">
        <AlertCircle className="h-6 w-6" />
        <p className="text-sm">{error}</p>
        <button
          onClick={loadData}
          className="mt-1 rounded-lg border border-red-700/50 px-4 py-1.5 text-sm text-red-300 hover:bg-red-900/20 transition-colors"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  // ─── Render główny ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Nagłówek z przełącznikiem etatu ── */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">Dostawy</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-300">
              Etat magazyniera w sklepie
            </span>
            <Toggle
              value={hasDedicatedWarehouseman}
              onChange={handleToggleWarehouseman}
              disabled={saving}
            />
          </div>
        </div>
      </div>

      {/* ── Sekcja widoczna tylko gdy etat magazyniera jest aktywny ── */}
      {hasDedicatedWarehouseman ? (
        <>
          {/* ── Zapis ── */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                isDirty && !saving
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                  : 'bg-slate-700 opacity-50 cursor-not-allowed'
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
          <div className="rounded-xl border border-purple-700/50 bg-gradient-to-r from-purple-900/30 to-pink-900/30 p-5">
            <h3 className="mb-3 text-base font-semibold text-purple-300">Dedykowany magazynier</h3>
            <div className="flex flex-wrap items-center justify-between gap-4">

              {/* Wyświetlenie aktualnego */}
              <div>
                {selectedEmployee ? (
                  <div>
                    <p className="font-medium text-white">
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </p>
                    <p className="text-sm text-slate-400">SAP: {selectedEmployee.sap}</p>
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-400">Nie wybrano pracownika</p>
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
                  <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-slate-600 bg-slate-800 shadow-xl">
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
                                      : 'text-slate-300 hover:bg-slate-700'
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
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
            <h3 className="mb-1 text-base font-semibold text-white">Harmonogram dostaw</h3>
            <p className="mb-5 text-xs text-slate-400">
              Definiuje w jakich godzinach ma pracować magazynier danego dnia
            </p>

            <div className="space-y-2">
              {DAYS_CONFIG.map(({ key: dayKey, label }) => {
                const day = schedule[dayKey];
                const hoursDisabled = !day.hasDelivery;

                return (
                  <div
                    key={dayKey}
                    className={`flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg p-3 transition-colors ${
                      day.hasDelivery ? 'bg-slate-700/40' : 'bg-slate-800/30'
                    }`}
                  >
                    {/* Nazwa dnia */}
                    <span
                      className={`w-28 shrink-0 text-sm font-medium ${
                        day.hasDelivery ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {label}
                    </span>

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
                    <div className="flex items-center gap-2">
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

        </>
      ) : (
        /* ── Informacja gdy etat wyłączony ── */
        <div className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/30 px-5 py-4 text-slate-400">
          <AlertCircle className="h-4 w-4 shrink-0 text-slate-500" />
          <p className="text-sm">
            Włącz <span className="font-medium text-slate-300">Etat magazyniera w sklepie</span>, aby skonfigurować dedykowanego pracownika i harmonogram dostaw.
          </p>
        </div>
      )}
    </div>
  );
}