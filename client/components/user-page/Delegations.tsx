import { useState, useMemo, useRef, useEffect } from 'react';
import { Briefcase, X, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '@/context/AppContext';
import { employeeService, delegationService } from '@/services/api-provider';
import type { ResponseEmployeeDTO } from '@/types/employee.types';
import type { ResponseEmployeeDelegationDTO } from '@/types/employee-delegation.types';
import {
  createEmptyDelegationArray,
  toggleDelegationDay,
  setDelegationRange,
  isDelegationDay,
} from '@/utils/employee-delegation.utils';
import { getLatestDraftRecord } from '@/utils/draft.utils';
import LastModifiedInfo from '@/components/shared/LastModifiedInfo';
import { useRequestGuard } from '@/hooks/useRequestGuard';

export default function Delegations() {
  const { selectedStoreId } = useAppContext();
  const currentStoreId = selectedStoreId ?? 0;

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [employees, setEmployees] = useState<ResponseEmployeeDTO[]>([]);
  const [delegations, setDelegations] = useState<ResponseEmployeeDelegationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<number, number[]>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const dragStartRef = useRef<{ employeeId: number; day: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Najnowszy rekord (z autorem) per miesiąc — do wyświetlenia "Ostatnia zmiana" na kafelkach miesięcy.
  // Liczony niezależnie dla każdego miesiąca (każdy fetch jest już przefiltrowany po year+month).
  const [yearlyLastModifiedRecords, setYearlyLastModifiedRecords] = useState<(ResponseEmployeeDelegationDTO | null)[]>(Array(12).fill(null));
  const [loadingYearly, setLoadingYearly] = useState(false);

  const months = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
  ];

  const employeesGuard = useRequestGuard();
  const delegationsGuard = useRequestGuard();
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
      } catch {
        if (!employeesGuard.isCurrent(token)) return;
        toast.error('Nie udało się załadować pracowników');
      } finally {
        if (employeesGuard.isCurrent(token)) setEmployeesLoading(false);
      }
    };
    loadEmployees();
  }, [currentStoreId, employeesGuard]);

  useEffect(() => {
    if (selectedMonth === null) return;
    const token = delegationsGuard.start();
    const loadDelegations = async () => {
      try {
        setLoading(true);
        setDelegations([]);
        const response = await delegationService.getByCriteria(currentStoreId, {
          year: selectedYear,
          month: selectedMonth + 1,
        });
        if (!delegationsGuard.isCurrent(token)) return;
        setDelegations(response.content);
      } catch {
        if (!delegationsGuard.isCurrent(token)) return;
        toast.error('Nie udało się załadować delegacji');
      } finally {
        if (delegationsGuard.isCurrent(token)) setLoading(false);
      }
    };
    loadDelegations();
  }, [currentStoreId, selectedYear, selectedMonth, delegationsGuard]);

  useEffect(() => {
    setPendingChanges(new Map());
    setHasUnsavedChanges(false);
  }, [selectedYear, selectedMonth]);

  // Ładuje rekord ostatniej zmiany dla każdego miesiąca roku — potrzebne do "Ostatnia zmiana" na kafelkach
  useEffect(() => {
    if (!currentStoreId) return;
    const token = yearlyGuard.start();
    const loadYearlyLastModified = async () => {
      setLoadingYearly(true);
      setYearlyLastModifiedRecords(Array(12).fill(null));
      try {
        const results: (ResponseEmployeeDelegationDTO | null)[] = [];
        for (let m = 1; m <= 12; m++) {
          if (!yearlyGuard.isCurrent(token)) return; // sklep/rok zmienił się w trakcie pętli
          const res = await delegationService.getByCriteria(currentStoreId, { year: selectedYear, month: m });
          // res.content jest już przefiltrowane po year+month, więc rekord jest
          // niezależny od innych miesięcy.
          results.push(getLatestDraftRecord(res.content));
        }
        if (!yearlyGuard.isCurrent(token)) return;
        setYearlyLastModifiedRecords(results);
      } catch (e) {
        if (!yearlyGuard.isCurrent(token)) return;
        console.error('Błąd ładowania dat ostatniej zmiany delegacji:', e);
      } finally {
        if (yearlyGuard.isCurrent(token)) setLoadingYearly(false);
      }
    };
    loadYearlyLastModified();
  }, [currentStoreId, selectedYear, yearlyGuard]);

  // Najnowszy rekord (z autorem) spośród wszystkich delegacji w aktualnie otwartym miesiącu —
  // wyświetlany w nagłówku karty miesiąca jako "Ostatnia zmiana".
  const monthLastModifiedRecord = useMemo(
    () => getLatestDraftRecord(delegations),
    [delegations]
  );

  const daysInMonth = useMemo(() => {
    if (selectedMonth === null) return 0;
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const getCurrentDelegation = (employeeId: number): number[] => {
    if (selectedMonth === null) return createEmptyDelegationArray();
    const pending = pendingChanges.get(employeeId);
    if (pending) return pending;
    const backendMonth = selectedMonth + 1;
    const delegation = delegations.find(
      d => d.employeeId === employeeId && d.year === selectedYear && d.month === backendMonth
    );
    return delegation ? delegation.monthlyDelegation : createEmptyDelegationArray();
  };

  const isDelegation = (employeeId: number, day: number): boolean =>
    isDelegationDay(getCurrentDelegation(employeeId), day);

  // Zwraca zapisany rekord delegacji/nieobecności (z backendu) dla danego pracownika w wybranym miesiącu —
  // potrzebny do wyświetlenia "Ostatnia zmiana" (updatedAt/createdAt). Brak rekordu = nigdy nie zapisano.
  const getCurrentDelegationRecord = (employeeId: number): ResponseEmployeeDelegationDTO | undefined => {
    if (selectedMonth === null) return undefined;
    const backendMonth = selectedMonth + 1;
    return delegations.find(
      d => d.employeeId === employeeId && d.year === selectedYear && d.month === backendMonth
    );
  };

  const handleToggleDay = (employeeId: number, day: number) => {
    if (selectedMonth === null) return;
    const newDelegation = toggleDelegationDay(getCurrentDelegation(employeeId), day);
    setPendingChanges(prev => new Map(prev).set(employeeId, newDelegation));
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
    if (isDragging && dragStartRef.current?.employeeId === employeeId) {
      const current = getCurrentDelegation(employeeId);
      const isStart = isDelegationDay(current, dragStartRef.current.day);
      const updated = setDelegationRange(current, dragStartRef.current.day, day, isStart ? 1 : 0);
      setPendingChanges(prev => new Map(prev).set(employeeId, updated));
      setHasUnsavedChanges(true);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const getDayOfWeek = (day: number): string => {
    if (selectedMonth === null) return '';
    return ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'][new Date(selectedYear, selectedMonth, day).getDay()];
  };

  const isWeekend = (day: number): boolean => {
    if (selectedMonth === null) return false;
    const d = new Date(selectedYear, selectedMonth, day).getDay();
    return d === 0 || d === 6;
  };

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

  const saveAllChanges = async () => {
    if (selectedMonth === null || pendingChanges.size === 0) return;
    try {
      setSaving(true);
      const backendMonth = selectedMonth + 1;
      const saved: ResponseEmployeeDelegationDTO[] = [];

      for (const [employeeId, monthlyDelegation] of pendingChanges.entries()) {
        const existing = delegations.find(
          d => d.employeeId === employeeId && d.year === selectedYear && d.month === backendMonth
        );
        let result: ResponseEmployeeDelegationDTO;
        if (existing) {
          result = await delegationService.update(currentStoreId, employeeId, existing.id, {
            year: selectedYear, month: backendMonth, monthlyDelegation,
          });
        } else {
          result = await delegationService.create(currentStoreId, employeeId, {
            year: selectedYear, month: backendMonth, monthlyDelegation,
          });
        }
        saved.push(result);
      }

      setDelegations(prev => {
        const updated = [...prev];
        saved.forEach(s => {
          const idx = updated.findIndex(d => d.id === s.id);
          idx >= 0 ? (updated[idx] = s) : updated.push(s);
        });

        // Aktualizujemy też rekord "Ostatnia zmiana" na kafelku tego miesiąca, bez czekania na ponowny fetch.
        setYearlyLastModifiedRecords((prevYearly) => {
          const next = [...prevYearly];
          next[selectedMonth] = getLatestDraftRecord(updated);
          return next;
        });

        return updated;
      });

      setPendingChanges(new Map());
      setHasUnsavedChanges(false);
      toast.success(`Zapisano delegacje/nieobecności dla ${saved.length} pracowników`);
    } catch {
      toast.error('Nie udało się zapisać delegacji/nieobecności');
    } finally {
      setSaving(false);
    }
  };

  // ── Modal widok miesiąca ──────────────────────────────────────
  if (selectedMonth !== null) {
    return (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="w-full h-screen max-h-[95vh] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl shadow-slate-900/50 flex flex-col" onContextMenu={e => e.preventDefault()}>
          <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50 flex-shrink-0">
            <div className="flex items-center gap-3 flex-1">
              <button onClick={handlePrevMonth} disabled={hasUnsavedChanges || saving} title={hasUnsavedChanges ? 'Najpierw zapisz lub anuluj zmiany' : 'Poprzedni miesiąc'} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-5 h-5 text-slate-300" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white">Delegacje/nieobecności na {months[selectedMonth]} {selectedYear}</h2>
                <p className="text-slate-400 text-xs">Kliknij i przytrzymaj prawym przyciskiem myszy, aby zaznaczyć wiele dni</p>
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
            <button onClick={() => setSelectedMonth(null)} className="p-1 hover:bg-slate-700 rounded-lg transition-colors ml-2">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="p-4 overflow-x-auto flex-1 flex flex-col">
            <table className="w-full border-collapse select-none text-xs">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="border border-slate-600 px-3 py-2 text-left text-slate-300 font-medium sticky left-0 bg-slate-800/50 min-w-40">Pracownik</th>
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <th key={i} className={`border border-slate-600 px-0.5 py-1 text-center font-medium text-xs w-12 h-10 ${isWeekend(i+1) ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-800/50 text-slate-300'}`}>{i + 1}</th>
                  ))}
                </tr>
                <tr className="bg-slate-800/30">
                  <th className="border border-slate-600 px-3 py-1 sticky left-0 bg-slate-800/30 min-w-40" />
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <th key={i} className="border border-slate-600 px-0.5 py-0.5 text-center text-slate-400 font-normal text-xs w-12">{getDayOfWeek(i + 1)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading || employeesLoading ? (
                  <tr><td colSpan={daysInMonth + 1} className="text-center py-8"><Loader className="w-6 h-6 text-blue-400 animate-spin mx-auto" /></td></tr>
                ) : employees.map(employee => {
                  const delegationRecord = getCurrentDelegationRecord(employee.id);
                  return (
                  <tr key={employee.id} className="group transition-colors hover:bg-amber-500/10">
                    <td className="border border-slate-600 px-3 py-2 text-slate-300 font-medium sticky left-0 bg-slate-800/30 group-hover:bg-amber-950/50 whitespace-nowrap min-w-40 transition-colors">
                      <p className="text-white font-semibold text-xl">{employee.firstName} {employee.lastName}</p>
                      <p className="text-xs text-slate-400">SAP {employee.sap}</p>
                      <LastModifiedInfo
                        updatedAt={delegationRecord?.updatedAt}
                        createdAt={delegationRecord?.createdAt}
                        updatedByLabel={delegationRecord?.updatedByLabel}
                        createdByLabel={delegationRecord?.createdByLabel}
                        className="mt-1 whitespace-normal"
                      />
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const onDelegation = isDelegation(employee.id, day);
                      return (
                        <td
                          key={day}
                          className={`border px-0.5 py-1 text-center cursor-pointer w-12 ${isWeekend(day) ? 'border-slate-500 bg-slate-700/20' : 'border-slate-600'}`}
                          onMouseDown={e => handleCellMouseDown(e, employee.id, day)}
                          onMouseEnter={() => handleCellMouseEnter(employee.id, day)}
                          onMouseUp={handleMouseUp}
                        >
                          <button
                            onClick={() => handleToggleDay(employee.id, day)}
                            disabled={saving}
                            className={`w-full h-8 rounded font-bold text-sm transition-all disabled:opacity-60 ${onDelegation ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                            onContextMenu={e => e.preventDefault()}
                          >
                            {onDelegation ? '✓' : '+'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
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
            <button onClick={() => { setPendingChanges(new Map()); setHasUnsavedChanges(false); toast.info('Anulowano zmiany'); }} disabled={!hasUnsavedChanges || saving} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Anuluj zmiany</button>
            <button onClick={saveAllChanges} disabled={!hasUnsavedChanges || saving} className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-sm rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-amber-500/50 flex items-center gap-2">
              {saving ? <><Loader className="w-4 h-4 animate-spin" />Zapisywanie...</> : <>Zapisz delegacje</>}
            </button>
            <button onClick={() => setSelectedMonth(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors">Zamknij</button>
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
          <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Delegacje i nieobecności</h2>
            <p className="text-slate-400 text-sm">Zarządzaj delegacjami i nieobecnościami pracowników</p>
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

      {/* Siatka miesięcy — kafelki */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map((month, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedMonth(idx)}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-5 hover:border-amber-600 hover:bg-slate-700/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white group-hover:text-amber-300 transition-colors">{month}</h3>
              <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">{selectedYear}</span>
            </div>
            <p className="text-slate-400 text-sm">Delegacje i nieobecności</p>
            <LastModifiedInfo
              updatedAt={yearlyLastModifiedRecords[idx]?.updatedAt}
              createdAt={yearlyLastModifiedRecords[idx]?.createdAt}
              updatedByLabel={yearlyLastModifiedRecords[idx]?.updatedByLabel}
              createdByLabel={yearlyLastModifiedRecords[idx]?.createdByLabel}
              className="mt-2"
            />
            {/* <div className="mt-3 pt-3 border-t border-slate-700/50">
              <span className="text-xs font-medium text-amber-400 group-hover:text-amber-300 transition-colors">Edytuj delegacje →</span>
            </div> */}
          </button>
        ))}
      </div>
    </div>
  );
}
