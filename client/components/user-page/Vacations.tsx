import { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar, X, Loader, ChevronLeft, ChevronRight, TreePalmIcon, TreePalm } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '@/context/AppContext';
import { employeeService, vacationService } from '@/services/api-provider';
import type { ResponseEmployeeDTO } from '@/types/employee.types';
import type { ResponseEmployeeVacationDTO } from '@/types/employee-vacation.types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import {
  createEmptyVacationArray,
  toggleVacationDay,
  setVacationRange,
  isVacationDay,
} from '@/utils/employee-vacation.utils';
import { getLatestDraftRecord } from '@/utils/draft.utils';
import LastModifiedInfo from '@/components/shared/LastModifiedInfo';
import { useRequestGuard } from '@/hooks/useRequestGuard';

export default function Vacations() {
  const { selectedStoreId } = useAppContext();
  const currentStoreId = selectedStoreId ?? 0;
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [yearlyVacationData, setYearlyVacationData] = useState<{ month: string; monthIndex: number; total: number; lastModifiedRecord: ResponseEmployeeVacationDTO | null }[]>([]);
  const [loadingYearly, setLoadingYearly] = useState(false);
  const [chartRefreshKey, setChartRefreshKey] = useState(0);

  const [employees, setEmployees] = useState<ResponseEmployeeDTO[]>([]);
  const [vacations, setVacations] = useState<ResponseEmployeeVacationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const [pendingChanges, setPendingChanges] = useState<Map<number, number[]>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const dragStartRef = useRef<{ employeeId: number; day: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const months = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
  ];

  const years = Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i);

  const employeesGuard = useRequestGuard();
  const vacationsGuard = useRequestGuard();
  const yearlyGuard = useRequestGuard();

  useEffect(() => {
    const token = employeesGuard.start();
    const loadEmployees = async () => {
      try {
        setEmployeesLoading(true);
        setEmployees([]); // czyścimy od razu — bez tego przez chwilę widać pracowników poprzedniego sklepu
        const response = await employeeService.getAll(currentStoreId);
        if (!employeesGuard.isCurrent(token)) return; // sklep zmienił się w międzyczasie — porzuć odpowiedź
        setEmployees(response.content);
      } catch (error) {
        if (!employeesGuard.isCurrent(token)) return;
        console.error('Error loading employees:', error);
        toast.error('Nie udało się załadować pracowników');
      } finally {
        if (employeesGuard.isCurrent(token)) setEmployeesLoading(false);
      }
    };
    loadEmployees();
  }, [currentStoreId, employeesGuard]);

  useEffect(() => {
    if (selectedMonth === null) return;
    const token = vacationsGuard.start();
    const loadVacations = async () => {
      try {
        setLoading(true);
        setVacations([]);
        const backendMonth = selectedMonth + 1;
        const response = await vacationService.getByCriteria(currentStoreId, {
          year: selectedYear,
          month: backendMonth,
        });
        if (!vacationsGuard.isCurrent(token)) return;
        setVacations(response.content);
      } catch (error) {
        if (!vacationsGuard.isCurrent(token)) return;
        console.error('Error loading vacations:', error);
        toast.error('Nie udało się załadować urlopów');
      } finally {
        if (vacationsGuard.isCurrent(token)) setLoading(false);
      }
    };
    loadVacations();
  }, [currentStoreId, selectedYear, selectedMonth, vacationsGuard]);

  useEffect(() => {
    if (!currentStoreId) return;
    const token = yearlyGuard.start();
    const loadYearlyData = async () => {
      setLoadingYearly(true);
      setYearlyVacationData([]);
      try {
        const results: { month: string; monthIndex: number; total: number; lastModifiedRecord: ResponseEmployeeVacationDTO | null }[] = [];
        for (let m = 1; m <= 12; m++) {
          if (!yearlyGuard.isCurrent(token)) return; // sklep/rok zmienił się w trakcie pętli
          const res = await vacationService.getByCriteria(currentStoreId, {
            year: selectedYear,
            month: m,
          });
          const total = res.content.reduce((sum, v) => sum + v.monthlyVacation.reduce((a, b) => a + b, 0), 0);
          // Najnowszy rekord SPOŚRÓD URLOPÓW TEGO KONKRETNEGO MIESIĄCA (res.content
          // jest już przefiltrowane po year+month) — etykieta na kafelku jest więc
          // niezależna od innych miesięcy.
          const lastModifiedRecord = getLatestDraftRecord(res.content);
          results.push({ month: months[m - 1].substring(0, 3), monthIndex: m - 1, total, lastModifiedRecord });
        }
        if (!yearlyGuard.isCurrent(token)) return;
        setYearlyVacationData(results);
      } catch (e) {
        if (!yearlyGuard.isCurrent(token)) return;
        console.error('Błąd ładowania danych wykresu:', e);
      } finally {
        if (yearlyGuard.isCurrent(token)) setLoadingYearly(false);
      }
    };
    loadYearlyData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoreId, selectedYear, chartRefreshKey, yearlyGuard]);

  useEffect(() => {
    setPendingChanges(new Map());
    setHasUnsavedChanges(false);
  }, [selectedYear, selectedMonth]);

  const daysInMonth = useMemo(() => {
    if (selectedMonth === null) return 0;
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Najnowszy rekord (z autorem) spośród wszystkich urlopów w aktualnie otwartym
  // miesiącu — wyświetlany w nagłówku karty miesiąca jako "Ostatnia zmiana".
  const monthLastModifiedRecord = useMemo(
    () => getLatestDraftRecord(vacations),
    [vacations]
  );

  const getCurrentVacation = (employeeId: number): number[] => {
    if (selectedMonth === null) return createEmptyVacationArray();
    const pending = pendingChanges.get(employeeId);
    if (pending) return pending;
    const backendMonth = selectedMonth + 1;
    const vacation = vacations.find(
      (v) => v.employeeId === employeeId && v.year === selectedYear && v.month === backendMonth
    );
    return vacation ? vacation.monthlyVacation : createEmptyVacationArray();
  };

  // Zwraca zapisany rekord urlopu (z backendu) dla danego pracownika w wybranym miesiącu —
  // potrzebny do wyświetlenia "Ostatnia zmiana" (updatedAt/createdAt). Brak rekordu = nigdy nie zapisano.
  const getCurrentVacationRecord = (employeeId: number): ResponseEmployeeVacationDTO | undefined => {
    if (selectedMonth === null) return undefined;
    const backendMonth = selectedMonth + 1;
    return vacations.find(
      (v) => v.employeeId === employeeId && v.year === selectedYear && v.month === backendMonth
    );
  };

  const isVacation = (employeeId: number, day: number): boolean => {
    const monthlyVacation = getCurrentVacation(employeeId);
    return isVacationDay(monthlyVacation, day);
  };

  const handleToggleDay = (employeeId: number, day: number) => {
    if (selectedMonth === null) return;
    const currentVacation = getCurrentVacation(employeeId);
    const newVacation = toggleVacationDay(currentVacation, day);
    setPendingChanges((prev) => {
      const updated = new Map(prev);
      updated.set(employeeId, newVacation);
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  const handleCellMouseDown = (e: React.MouseEvent, employeeId: number, day: number) => {
    if (e.button === 2) {
      e.preventDefault();
      dragStartRef.current = { employeeId, day };
      setIsDragging(true);
      handleToggleDay(employeeId, day);
    }
  };

  const handleCellMouseEnter = (employeeId: number, day: number) => {
    if (isDragging && dragStartRef.current) {
      const startEmployee = dragStartRef.current.employeeId;
      const startDay = dragStartRef.current.day;
      if (employeeId === startEmployee) {
        const currentVacation = getCurrentVacation(employeeId);
        const isStartVacation = isVacationDay(currentVacation, startDay);
        const newVacation = setVacationRange(currentVacation, startDay, day, isStartVacation);
        setPendingChanges((prev) => {
          const updated = new Map(prev);
          updated.set(employeeId, newVacation);
          return updated;
        });
        setHasUnsavedChanges(true);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const getDayOfWeek = (day: number): string => {
    if (selectedMonth === null) return '';
    const date = new Date(selectedYear, selectedMonth, day);
    const daysOfWeek = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
    return daysOfWeek[date.getDay()];
  };

  const isWeekend = (day: number): boolean => {
    if (selectedMonth === null) return false;
    const date = new Date(selectedYear, selectedMonth, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const getDayType = (day: number): 'weekday' | 'weekend' | 'holiday' => {
    if (isWeekend(day)) return 'weekend';
    return 'weekday';
  };

  const saveAllChanges = async () => {
    if (selectedMonth === null || pendingChanges.size === 0) return;
    try {
      setSaving(true);
      const backendMonth = selectedMonth + 1;
      const savedVacations: ResponseEmployeeVacationDTO[] = [];

      for (const [employeeId, monthlyVacation] of pendingChanges.entries()) {
        const existing = vacations.find(
          (v) => v.employeeId === employeeId && v.year === selectedYear && v.month === backendMonth
        );
        let updated: ResponseEmployeeVacationDTO;
        if (existing) {
          updated = await vacationService.update(currentStoreId, employeeId, existing.id, {
            year: selectedYear, month: backendMonth, monthlyVacation,
          });
        } else {
          updated = await vacationService.create(currentStoreId, employeeId, {
            year: selectedYear, month: backendMonth, monthlyVacation,
          });
        }
        savedVacations.push(updated);
      }

      setVacations((prev) => {
        const updated = [...prev];
        savedVacations.forEach((saved) => {
          const index = updated.findIndex((v) => v.id === saved.id);
          if (index >= 0) updated[index] = saved;
          else updated.push(saved);
        });
        return updated;
      });

      setPendingChanges(new Map());
      setHasUnsavedChanges(false);
      toast.success(`Zapisano urlopy dla ${savedVacations.length} pracowników`);
      setChartRefreshKey((k) => k + 1);
    } catch (error) {
      console.error('Error saving vacations:', error);
      toast.error('Nie udało się zapisać urlopów');
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    setPendingChanges(new Map());
    setHasUnsavedChanges(false);
    toast.info('Anulowano zmiany');
  };

  const handleClose = () => { setSelectedMonth(null); };
  const handlePrevMonth = () => {
    if (selectedMonth === null) return;
    if (selectedMonth === 0) { setSelectedYear((y) => y - 1); setSelectedMonth(11); }
    else setSelectedMonth((m) => (m ?? 0) - 1);
  };
  const handleNextMonth = () => {
    if (selectedMonth === null) return;
    if (selectedMonth === 11) { setSelectedYear((y) => y + 1); setSelectedMonth(0); }
    else setSelectedMonth((m) => (m ?? 0) + 1);
  };

  // ── Modal widok miesiąca ──────────────────────────────────────
  if (selectedMonth !== null) {
    return (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="w-full h-screen max-h-[95vh] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl shadow-slate-900/50 flex flex-col" onContextMenu={(e) => e.preventDefault()}>
          <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50 flex-shrink-0">
            <div className="flex items-center gap-3 flex-1">
              <button onClick={handlePrevMonth} disabled={hasUnsavedChanges || saving} title={hasUnsavedChanges ? 'Najpierw zapisz lub anuluj zmiany' : 'Poprzedni miesiąc'} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-5 h-5 text-slate-300" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white">Urlopy na {months[selectedMonth]} {selectedYear}</h2>
                <p className="text-slate-400 text-xs">Kliknij i przytrzymaj prawym przyciskiem myszy, aby zaznaczyć wiele dni urlopu</p>
                <LastModifiedInfo
                  updatedAt={monthLastModifiedRecord?.updatedAt}
                  createdAt={monthLastModifiedRecord?.createdAt}
                  updatedByLabel={monthLastModifiedRecord?.updatedByLabel}
                  createdByLabel={monthLastModifiedRecord?.createdByLabel}
                  className="mt-1"
                />
              </div>
              <button onClick={handleNextMonth} disabled={hasUnsavedChanges || saving} title={hasUnsavedChanges ? 'Najpierw zapisz lub anuluj zmiany' : 'Następny miesiąc'} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>
            </div>
            <button onClick={handleClose} className="p-1 hover:bg-slate-700 rounded-lg transition-colors ml-2">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="p-4 overflow-x-auto flex-1 flex flex-col">
            <table className="w-full border-collapse select-none text-xs">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="border border-slate-600 px-3 py-2 text-left text-slate-300 font-medium sticky left-0 bg-slate-800/50 min-w-40">Pracownik</th>
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <th key={`day-${i}`} className={`border border-slate-600 px-0.5 py-1 text-center font-medium text-xs w-12 h-10 ${getDayType(i + 1) === 'weekend' ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-800/50 text-slate-300'}`}>
                      {i + 1}
                    </th>
                  ))}
                </tr>
                <tr className="bg-slate-800/30">
                  <th className="border border-slate-600 px-3 py-1 text-left text-slate-400 font-normal sticky left-0 bg-slate-800/30 min-w-40" />
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <th key={`dow-${i}`} className="border border-slate-600 px-0.5 py-0.5 text-center text-slate-400 font-normal text-xs w-12">{getDayOfWeek(i + 1)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading || employeesLoading ? (
                  <tr>
                    <td colSpan={daysInMonth + 1} className="text-center py-8">
                      <Loader className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => {
                    const vacationRecord = getCurrentVacationRecord(employee.id);
                    return (
                    <tr key={employee.id} className="group transition-colors hover:bg-cyan-500/10">
                      <td className="border border-slate-600 px-3 py-2 text-slate-300 font-medium sticky left-0 bg-slate-800/30 group-hover:bg-cyan-950/50 whitespace-nowrap min-w-40 transition-colors">
                        <div>
                          <p className="text-white font-semibold text-xl">{employee.firstName} {employee.lastName}</p>
                          <p className="text-xs text-slate-400">SAP {employee.sap}</p>
                          <LastModifiedInfo
                            updatedAt={vacationRecord?.updatedAt}
                            createdAt={vacationRecord?.createdAt}
                            updatedByLabel={vacationRecord?.updatedByLabel}
                            createdByLabel={vacationRecord?.createdByLabel}
                            className="mt-1 whitespace-normal"
                          />
                        </div>
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const onVacation = isVacation(employee.id, day);
                        return (
                          <td
                            key={day}
                            className={`border px-0.5 py-1 text-center cursor-pointer w-12 ${getDayType(day) === 'weekend' ? 'border-slate-500 bg-slate-700/20' : 'border-slate-600'}`}
                            onMouseDown={(e) => handleCellMouseDown(e, employee.id, day)}
                            onMouseEnter={() => handleCellMouseEnter(employee.id, day)}
                            onMouseUp={handleMouseUp}
                          >
                            <button
                              onClick={() => handleToggleDay(employee.id, day)}
                              disabled={saving}
                              className={`w-full h-8 rounded font-bold text-sm transition-all disabled:opacity-60 ${onVacation ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                              onContextMenu={(e) => e.preventDefault()}
                            >
                              {onVacation ? '✓' : '+'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 p-4 border-t border-slate-700 bg-slate-900/50 flex-shrink-0 items-center">
            {hasUnsavedChanges && (
              <div className="flex-1 flex items-center gap-2 text-sm text-amber-400">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                Niezapisane zmiany ({pendingChanges.size} pracowników)
              </div>
            )}
            <button onClick={discardChanges} disabled={!hasUnsavedChanges || saving} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Anuluj zmiany</button>
            <button onClick={saveAllChanges} disabled={!hasUnsavedChanges || saving} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/50 flex items-center gap-2">
              {saving ? <><Loader className="w-4 h-4 animate-spin" />Zapisywanie...</> : <>Zapisz urlopy</>}
            </button>
            <button onClick={handleClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors">Zamknij</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Widok główny ──────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header z selektorem roku po prawej stronie */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-pink-600 rounded-xl flex items-center justify-center shrink-0">
            <TreePalm className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Urlopy</h2>
            <p className="text-slate-400 text-sm">Zarządzaj urlopami pracowników</p>
          </div>
        </div>
        {/* Selektor roku — po prawej stronie na wysokości nagłówka */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYear(y => y - 1)}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <span className="text-xl font-bold text-white w-16 text-center">{selectedYear}</span>
          <button
            onClick={() => setSelectedYear(y => y + 1)}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Wykres roczny */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 text-sm text-slate-300">
          Urlopy w roku {selectedYear} — łączna liczba dni urlopowych (wszyscy aktywni pracownicy)
        </h3>
        {loadingYearly ? (
          <div className="flex items-center justify-center h-40">
            <Loader className="w-6 h-6 text-red-400 animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={yearlyVacationData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              onClick={(data) => {
                if (data?.activePayload?.[0]) {
                  const point = data.activePayload[0].payload as { monthIndex: number };
                  setSelectedMonth(point.monthIndex);
                }
              }}
            >
              <defs>
                <linearGradient id="vacGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }}
                labelStyle={{ color: '#f1f5f9' }}
                formatter={(value: number) => [`${value} dni`, 'Urlopy']}
                cursor={{ stroke: '#ef4444', strokeWidth: 1 }}
              />
              <Area type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={2} fill="url(#vacGradient)" dot={{ fill: '#ef4444', r: 4, cursor: 'pointer' }} activeDot={{ r: 6, cursor: 'pointer' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        <p className="text-slate-500 text-xs mt-2 text-center">Kliknij punkt na wykresie, aby otworzyć edycję miesiąca</p>
      </div>

      {/* Siatka miesięcy — kafelki */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map((month, monthIndex) => (
          <button
            key={monthIndex}
            onClick={() => setSelectedMonth(monthIndex)}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-5 hover:border-red-600 hover:bg-slate-700/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white group-hover:text-red-300 transition-colors">{month}</h3>
              <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">{selectedYear}</span>
            </div>
            <p className="text-slate-400 text-sm">
              {yearlyVacationData[monthIndex]?.total !== undefined
                ? `${yearlyVacationData[monthIndex].total} dni urlopowych`
                : 'Kliknij, aby edytować'}
            </p>
            <LastModifiedInfo
              updatedAt={yearlyVacationData[monthIndex]?.lastModifiedRecord?.updatedAt}
              createdAt={yearlyVacationData[monthIndex]?.lastModifiedRecord?.createdAt}
              updatedByLabel={yearlyVacationData[monthIndex]?.lastModifiedRecord?.updatedByLabel}
              createdByLabel={yearlyVacationData[monthIndex]?.lastModifiedRecord?.createdByLabel}
              className="mt-2"
            />
            {/* <div className="mt-3 pt-3 border-t border-slate-700/50">
              <span className="text-xs font-medium text-red-400 group-hover:text-red-300 transition-colors">Edytuj urlopy →</span>
            </div> */}
          </button>
        ))}
      </div>
    </div>
  );
}
