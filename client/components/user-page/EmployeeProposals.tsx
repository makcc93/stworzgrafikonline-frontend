import { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar, X, Loader, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { isWholeHourShift, shiftMatchesHours, normalizeToTimeString } from '@/utils/shiftNormalize';
import { useAppContext } from '@/context/AppContext';
import { 
  employeeService, 
  proposalDaysOffService, 
  proposalShiftsService,
  shiftService 
} from '@/services/api-provider';
import type { ResponseEmployeeDTO } from '@/types/employee.types';
import type {
  ResponseEmployeeProposalDaysOffDTO,
  ResponseEmployeeProposalShiftsDTO,
  ResponseShiftDTO,
  CellValue,
} from '@/types/employee-proposal.types';
import {
  createEmptyDaysOffArray,
  createEmptyShiftArray,
  createShiftArray,
  isDayOff,
  setDayOff,
  getCellValue,
  formatCellDisplay,
  formatDateForBackend,
  parseHourString,
  getShiftInfo,
} from '@/types/employee-proposal.types';
import { getLatestDraftRecord } from '@/utils/draft.utils';
import LastModifiedInfo from '@/components/shared/LastModifiedInfo';

export default function EmployeeProposals() {
  const { selectedStoreId } = useAppContext();
  const currentStoreId = selectedStoreId ?? 0;

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const [employees, setEmployees] = useState<ResponseEmployeeDTO[]>([]);
  const [daysOff, setDaysOff] = useState<ResponseEmployeeProposalDaysOffDTO[]>([]);
  const [shifts, setShifts] = useState<ResponseEmployeeProposalShiftsDTO[]>([]);

  // FIX: Store only shifts with whole-hour start AND end times (no minutes).
  // With 4656 shifts (every 15 min), we filter to only those where startHour
  // and endHour are on the full hour (e.g. "08:00:00", NOT "08:15:00").
  const [shiftDefinitions, setShiftDefinitions] = useState<Map<number, ResponseShiftDTO>>(new Map());

  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pendingDaysOff, setPendingDaysOff] = useState<Map<number, number[]>>(new Map());
  // key: "employeeId_YYYY-MM-DD" (always formatted via formatDateForBackend for consistency)
  const [pendingShifts, setPendingShifts] = useState<Map<string, number[]>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Najnowszy rekord (z autorem), per miesiąc — łącznie z dni wolnych i zmian —
  // do "Ostatnia zmiana" na kafelkach miesięcy. Liczony niezależnie dla każdego
  // miesiąca (każdy fetch jest już przefiltrowany po year+month).
  const [yearlyLastModifiedRecords, setYearlyLastModifiedRecords] = useState<
    (ResponseEmployeeProposalDaysOffDTO | ResponseEmployeeProposalShiftsDTO | null)[]
  >(Array(12).fill(null));
  const [loadingYearlyLastModified, setLoadingYearlyLastModified] = useState(false);

  const months = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
  ];

  const years = Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i);

  const handleClose = () => {
    setSelectedMonth(null);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === null) return;
    if (selectedMonth === 0) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(11);
    } else {
      setSelectedMonth((m) => (m ?? 0) - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === null) return;
    if (selectedMonth === 11) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(0);
    } else {
      setSelectedMonth((m) => (m ?? 0) + 1);
    }
  };

  // Load employees
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const response = await employeeService.getAll(currentStoreId);
        setEmployees(response.content);
      } catch (error) {
        console.error('Error loading employees:', error);
        toast.error('Nie udało się załadować pracowników');
      } finally {
        setLoadingEmployees(false);
      }
    };
    loadEmployees();
  }, [currentStoreId]);

  // Load shift definitions (once on mount).
  // The backend paginates – default page size may be as small as 5.
  // Strategy: request size=500 first. If the response is a Page and
  // totalPages > 1, fetch remaining pages in parallel, then merge.
  // We keep only whole-hour shifts (minutes === "00") because
  // dailyProposalShift is a 24-element array indexed by full hour.
  useEffect(() => {
    const loadShifts = async () => {
      try {
        // Helper: normalise Page<T> or T[] → T[]
        const toArray = (raw: unknown): ResponseShiftDTO[] => {
          if (Array.isArray(raw)) return raw as ResponseShiftDTO[];
          const page = raw as any;
          if (page && Array.isArray(page.content)) return page.content as ResponseShiftDTO[];
          return [];
        };

        // First request – big page size to get everything in one shot
        const firstRaw = await shiftService.getAll({ page: 0, size: 500 } as any);
        let allShifts = toArray(firstRaw);

        // If paginated and there are more pages, fetch them in parallel
        const firstPage = firstRaw as any;
        if (firstPage && typeof firstPage.totalPages === 'number' && firstPage.totalPages > 1) {
          const pagePromises = Array.from(
            { length: firstPage.totalPages - 1 },
            (_, i) => shiftService.getAll({ page: i + 1, size: 500 } as any).then(toArray)
          );
          const rest = await Promise.all(pagePromises);
          allShifts = allShifts.concat(...rest);
        }

        // Normalizuj DO stringa zanim wejdą do stanu —
        // odtąd wszędzie w kodzie s.startHour to zawsze "HH:MM:00"
        const normalized = allShifts.map(s => ({
          ...s,
          startHour: normalizeToTimeString(s.startHour),
          endHour:   normalizeToTimeString(s.endHour),
        }));

        // Filtruj tylko pełnogodzinowe (minuty == 00 po normalizacji)
        // — używamy oryginalnych s.startHour przed normalizacją żeby odczytać minutę
        const wholeHourShifts = allShifts
          .filter(s => isWholeHourShift(s.startHour, s.endHour))
          .map(s => ({
            ...s,
            startHour: normalizeToTimeString(s.startHour),
            endHour:   normalizeToTimeString(s.endHour),
          }));

        setShiftDefinitions(new Map(wholeHourShifts.map(s => [s.id, s])));
      } catch (error) {
        console.error('Error loading shift definitions:', error);
        toast.error('Nie udało się załadować definicji zmian');
      }
    };
    loadShifts();
  }, []);

  // Load proposals for selected month
  useEffect(() => {
    if (selectedMonth === null) return;

    const loadProposals = async () => {
      try {
        setLoadingProposals(true);
        const backendMonth = selectedMonth + 1;

        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate   = new Date(selectedYear, selectedMonth + 1, 0);

        const [daysOffResponse, shiftsResponse] = await Promise.all([
          proposalDaysOffService.getByCriteria(currentStoreId, {
            year: selectedYear,
            month: backendMonth,
          }),
          proposalShiftsService.getByCriteria(currentStoreId, {
            startDate: formatDateForBackend(startDate),
            endDate:   formatDateForBackend(endDate),
          }),
        ]);

        setDaysOff(daysOffResponse.content);
        setShifts(shiftsResponse.content);
      } catch (error) {
        console.error('Error loading proposals:', error);
        toast.error('Nie udało się załadować propozycji');
      } finally {
        setLoadingProposals(false);
      }
    };

    loadProposals();
  }, [currentStoreId, selectedYear, selectedMonth]);

  // Clear pending changes when month/year changes
  useEffect(() => {
    setPendingDaysOff(new Map());
    setPendingShifts(new Map());
    setHasUnsavedChanges(false);
  }, [selectedYear, selectedMonth]);

  // Ładuje rekord ostatniej zmiany (dni wolne + zmiany łącznie) dla każdego miesiąca roku —
  // potrzebne do "Ostatnia zmiana" na kafelkach miesięcy.
  useEffect(() => {
    if (!currentStoreId) return;
    const loadYearlyLastModified = async () => {
      setLoadingYearlyLastModified(true);
      try {
        const results: (ResponseEmployeeProposalDaysOffDTO | ResponseEmployeeProposalShiftsDTO | null)[] = [];
        for (let m = 1; m <= 12; m++) {
          const startDate = new Date(selectedYear, m - 1, 1);
          const endDate = new Date(selectedYear, m, 0);
          const [daysOffRes, shiftsRes] = await Promise.all([
            proposalDaysOffService.getByCriteria(currentStoreId, { year: selectedYear, month: m }),
            proposalShiftsService.getByCriteria(currentStoreId, {
              startDate: formatDateForBackend(startDate),
              endDate: formatDateForBackend(endDate),
            }),
          ]);
          // res.content jest już przefiltrowane po year+month, więc rekord jest
          // niezależny od innych miesięcy.
          results.push(getLatestDraftRecord([...daysOffRes.content, ...shiftsRes.content]));
        }
        setYearlyLastModifiedRecords(results);
      } catch (e) {
        console.error('Błąd ładowania dat ostatniej zmiany propozycji:', e);
      } finally {
        setLoadingYearlyLastModified(false);
      }
    };
    loadYearlyLastModified();
  }, [currentStoreId, selectedYear]);

  // Najnowszy rekord (z autorem) spośród wszystkich propozycji (dni wolne + zmiany)
  // w aktualnie otwartym miesiącu — wyświetlany w nagłówku karty miesiąca jako "Ostatnia zmiana".
  const monthLastModifiedRecord = useMemo(
    () => getLatestDraftRecord([...daysOff, ...shifts]),
    [daysOff, shifts]
  );

  // Najnowszy rekord (z autorem) propozycji (dni wolne + zmiany) dla konkretnego pracownika
  // w aktualnie otwartym miesiącu — wyświetlany w wierszu pracownika w tabeli.
  const getEmployeeProposalLastModifiedRecord = (
    employeeId: number
  ): ResponseEmployeeProposalDaysOffDTO | ResponseEmployeeProposalShiftsDTO | null => {
    if (selectedMonth === null) return null;
    const backendMonth = selectedMonth + 1;
    const employeeDaysOff = daysOff.filter(
      d => d.employeeId === employeeId && d.year === selectedYear && d.month === backendMonth
    );
    const employeeShifts = shifts.filter(s => s.employeeId === employeeId);
    return getLatestDraftRecord([...employeeDaysOff, ...employeeShifts]);
  };

  const daysInMonth = useMemo(() => {
    if (selectedMonth === null) return 0;
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // FIX: Build shift key consistently using formatDateForBackend everywhere.
  // Previously the key in getCurrentCellValue was built with manual padding which
  // differed from the key built via formatDateForBackend in the handlers.
  const buildShiftKey = (employeeId: number, year: number, month0indexed: number, day: number) => {
    const dateStr = formatDateForBackend(new Date(year, month0indexed, day));
    return `${employeeId}_${dateStr}`;
  };

  const getCurrentCellValue = (employeeId: number, day: number): CellValue => {
    if (selectedMonth === null) return { type: 'empty' };

    const backendMonth = selectedMonth + 1;

    // FIX: Use buildShiftKey so the key always matches what the handlers write.
    const shiftKey = buildShiftKey(employeeId, selectedYear, selectedMonth, day);
    const pendingShift = pendingShifts.get(shiftKey);

    if (pendingShift !== undefined) {
      // Pusta tablica (same 0) = marker "skasuj zapisaną zmianę" → pokaż puste
      if (pendingShift.every(v => v === 0)) {
        return { type: 'empty' };
      }
      const shiftInfo = getShiftInfo(pendingShift);
      if (shiftInfo) {
        const shift = Array.from(shiftDefinitions.values()).find(s =>
          shiftMatchesHours(s.startHour, s.endHour, shiftInfo.startHour, shiftInfo.endHour)
        );
        if (shift) {
          return {
            type: 'shift',
            shiftId: shift.id,
            startHour: shift.startHour,
            endHour: shift.endHour,
          };
        }
      }
    }

    const pendingDaysOffData = pendingDaysOff.get(employeeId);
    if (pendingDaysOffData) {
      // BUGFIX: jeśli dla pracownika istnieje pending tablica dni wolnych, jest ona
      // JEDYNYM źródłem prawdy o statusie dnia wolnego w tym miesiącu — nie wolno
      // tu spadać do sprawdzania oryginalnego, jeszcze niezapisanego w bazie rekordu
      // z `daysOff`. W przeciwnym razie reset dnia wolnego (ustawienie 0 w pending)
      // nie był widoczny w UI, dopóki zmiana nie trafiła do backendu — "W" wisiało
      // mimo wyzerowanej tablicy w pendingDaysOff.
      if (isDayOff(pendingDaysOffData, day)) {
        return { type: 'dayOff' };
      }

      // Dzień nie jest (już) dniem wolnym według pending zmian — sprawdź jeszcze
      // zapisaną (committed) zmianę godzinową dla tego dnia (pending shift dla tego
      // dnia już sprawdziliśmy wyżej i nic nie znaleźliśmy).
      const dateStr = formatDateForBackend(new Date(selectedYear, selectedMonth, day));
      const shiftProposal = shifts.find(
        s => s.employeeId === employeeId && s.date === dateStr
      );
      if (shiftProposal) {
        const shiftInfo = getShiftInfo(shiftProposal.dailyProposalShift);
        if (shiftInfo) {
          const shift = Array.from(shiftDefinitions.values()).find(s =>
            shiftMatchesHours(s.startHour, s.endHour, shiftInfo.startHour, shiftInfo.endHour)
          );
          if (shift) {
            return {
              type: 'shift',
              shiftId: shift.id,
              startHour: shift.startHour,
              endHour: shift.endHour,
            };
          }
        }
      }

      return { type: 'empty' };
    }

    return getCellValue(
      employeeId,
      day,
      selectedYear,
      backendMonth,
      daysOff,
      shifts,
      shiftDefinitions
    );
  };

  const handleSetDayOff = (employeeId: number, day: number) => {
    if (selectedMonth === null) return;

    const backendMonth = selectedMonth + 1;

    let monthlyDaysOff = pendingDaysOff.get(employeeId);
    if (!monthlyDaysOff) {
      const existing = daysOff.find(
        d => d.employeeId === employeeId && d.year === selectedYear && d.month === backendMonth
      );
      monthlyDaysOff = existing ? [...existing.monthlyDaysOff] : createEmptyDaysOffArray();
    }

    const updated = setDayOff(monthlyDaysOff, day, true);

    setPendingDaysOff(prev => {
      const newMap = new Map(prev);
      newMap.set(employeeId, updated);
      return newMap;
    });

    // Remove any pending shift for this day using consistent key
    const shiftKey = buildShiftKey(employeeId, selectedYear, selectedMonth, day);
    setPendingShifts(prev => {
      const newMap = new Map(prev);
      newMap.delete(shiftKey);
      return newMap;
    });

    setHasUnsavedChanges(true);
  };

  const handleResetCell = (employeeId: number, day: number) => {
    if (selectedMonth === null) return;

    const backendMonth = selectedMonth + 1;
    const dateStr  = formatDateForBackend(new Date(selectedYear, selectedMonth, day));
    const shiftKey = `${employeeId}_${dateStr}`;

    const currentValue = getCurrentCellValue(employeeId, day);
    if (currentValue.type === 'empty') return;

    if (currentValue.type === 'shift') {
      // Zawsze wstawiamy pustą tablicę jako marker "skasuj" —
      // getCurrentCellValue traktuje [0,0,...,0] jako force-empty
      // niezależnie od tego czy zmiana pochodzi z pending czy z bazy.
      setPendingShifts(prev => {
        const newMap = new Map(prev);
        newMap.set(shiftKey, createEmptyShiftArray());
        return newMap;
      });
    }

    if (currentValue.type === 'dayOff') {
      // Pobierz bieżącą tablicę dni wolnych (pending lub z bazy lub pustą)
      const base: number[] = pendingDaysOff.get(employeeId)
        ?? daysOff.find(d => d.employeeId === employeeId && d.year === selectedYear && d.month === backendMonth)?.monthlyDaysOff
        ?? createEmptyDaysOffArray();

      const updated = setDayOff([...base], day, false);

      setPendingDaysOff(prev => {
        const newMap = new Map(prev);
        newMap.set(employeeId, updated);
        return newMap;
      });
    }

    setHasUnsavedChanges(true);
  };

  const saveAllChanges = async () => {
    if (selectedMonth === null) return;

    try {
      setSaving(true);
      const backendMonth = selectedMonth + 1;
      let savedCount = 0;

      for (const [employeeId, monthlyDaysOff] of pendingDaysOff.entries()) {
        const existing = daysOff.find(
          d => d.employeeId === employeeId && d.year === selectedYear && d.month === backendMonth
        );

        if (existing) {
          await proposalDaysOffService.update(currentStoreId, employeeId, existing.id, {
            year: selectedYear,
            month: backendMonth,
            monthlyDaysOff,
          });
        } else {
          await proposalDaysOffService.create(currentStoreId, employeeId, {
            year: selectedYear,
            month: backendMonth,
            monthlyDaysOff,
          });
        }
        savedCount++;
      }

      for (const [key, dailyProposalShift] of pendingShifts.entries()) {
        const [employeeIdStr, dateStr] = key.split('_');
        const employeeId = parseInt(employeeIdStr, 10);

        const existing = shifts.find(
          s => s.employeeId === employeeId && s.date === dateStr
        );

        const isEmpty = dailyProposalShift.every(v => v === 0);

        if (isEmpty) {
          // Reset — usuń rekord z bazy jeśli istnieje, w przeciwnym razie nic nie rób
          if (existing) {
            await proposalShiftsService.delete(currentStoreId, employeeId, existing.id);
            savedCount++;
          }
        } else if (existing) {
          await proposalShiftsService.update(currentStoreId, employeeId, existing.id, {
            date: dateStr,
            dailyProposalShift,
          });
          savedCount++;
        } else {
          await proposalShiftsService.create(currentStoreId, employeeId, {
            date: dateStr,
            dailyProposalShift,
          });
          savedCount++;
        }
      }

      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate   = new Date(selectedYear, selectedMonth + 1, 0);

      const [daysOffResponse, shiftsResponse] = await Promise.all([
        proposalDaysOffService.getByCriteria(currentStoreId, {
          year: selectedYear,
          month: backendMonth,
        }),
        proposalShiftsService.getByCriteria(currentStoreId, {
          startDate: formatDateForBackend(startDate),
          endDate:   formatDateForBackend(endDate),
        }),
      ]);

      setDaysOff(daysOffResponse.content);
      setShifts(shiftsResponse.content);

      // Aktualizujemy też rekord "Ostatnia zmiana" na kafelku tego miesiąca, bez czekania na ponowny fetch listy 12 miesięcy.
      setYearlyLastModifiedRecords((prevYearly) => {
        const next = [...prevYearly];
        next[selectedMonth] = getLatestDraftRecord([
          ...daysOffResponse.content,
          ...shiftsResponse.content,
        ]);
        return next;
      });

      setPendingDaysOff(new Map());
      setPendingShifts(new Map());
      setHasUnsavedChanges(false);

      toast.success(`Zapisano ${savedCount} propozycji`);
    } catch (error) {
      console.error('Error saving proposals:', error);
      toast.error('Nie udało się zapisać propozycji');
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    setPendingDaysOff(new Map());
    setPendingShifts(new Map());
    setHasUnsavedChanges(false);
    toast.info('Anulowano zmiany');
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

  // ---------------------------------------------------------------------------
  // ShiftSelector – inline component (reads outer-scope state via closure)
  // UI: two <select> inputs for start hour (0-23) and end hour (1-24).
  // On confirm we find the matching shift in shiftDefinitions by startHour
  // and endHour, then build dailyProposalShift from it.
  // ---------------------------------------------------------------------------
  const ShiftSelector = ({
    employeeId,
    day,
    currentValue
  }: {
    employeeId: number;
    day: number;
    currentValue: CellValue;
  }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [inputStart, setInputStart] = useState<number>(8);
    const [inputEnd,   setInputEnd]   = useState<number>(14);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setShowMenu(false);
        }
      };
      if (showMenu) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [showMenu]);

    const handleSelectDayOff = () => {
      handleSetDayOff(employeeId, day);
      setShowMenu(false);
    };

    const handleConfirmShift = () => {
  if (inputEnd <= inputStart) {
    toast.error('Godzina końca musi być późniejsza niż startu');
    return;
  }

  // pad musi być zdefiniowane lokalnie w tej funkcji
  const pad = (n: number) => n.toString().padStart(2, '0');

  // Po normalizacji w useEffect s.startHour to już string "HH:00:00",
  // ale shiftMatchesHours obsłuży też obiekt gdyby coś się wymknęło
  const matchedShift = Array.from(shiftDefinitions.values()).find(s =>
    shiftMatchesHours(s.startHour, s.endHour, inputStart, inputEnd)
  );

  if (!matchedShift) {
    toast.error(
      `Brak zmiany ${pad(inputStart)}:00 – ${inputEnd === 24 ? '24:00' : pad(inputEnd) + ':00'} w bazie. Dodaj ją w Panelu Administracyjnym.`
    );
    return;
  }

  const dailyProposalShift = createShiftArray(0, inputStart, inputEnd); // tablica to bitmapa 0/1
  const shiftKey = buildShiftKey(employeeId, selectedYear, selectedMonth!, day);

  setPendingShifts(prev => {
    const newMap = new Map(prev);
    newMap.set(shiftKey, dailyProposalShift);
    return newMap;
  });

  // Clear any day off for this day
  const currentDaysOff = pendingDaysOff.get(employeeId);
  if (currentDaysOff && isDayOff(currentDaysOff, day)) {
    const updated = setDayOff(currentDaysOff, day, false);
    setPendingDaysOff(prev => {
      const newMap = new Map(prev);
      newMap.set(employeeId, updated);
      return newMap;
    });
  }

  setHasUnsavedChanges(true);
  setShowMenu(false);
};

    const handleReset = () => {
      handleResetCell(employeeId, day);
      setShowMenu(false);
    };

    const displayValue = formatCellDisplay(currentValue);
    const isEmpty      = currentValue.type === 'empty';
    const shiftLength  = inputEnd > inputStart ? inputEnd - inputStart : 0;

    return (
      <div className="relative w-full" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={saving}
          className={`w-full px-1.5 py-1 rounded font-medium text-xs transition-all border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 whitespace-pre-line disabled:opacity-50 ${
            isEmpty
              ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              : 'bg-purple-600/40 text-purple-200 hover:bg-purple-600/50 border border-purple-600/50'
          }`}
        >
          {isEmpty ? '+' : displayValue}
        </button>

        {showMenu && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-2xl z-50 min-w-72">
            {/* Day off */}
            <button
              onClick={handleSelectDayOff}
              className="w-full px-4 py-2 text-center text-white text-sm hover:bg-slate-600 transition-colors border-b border-slate-600 rounded-t-lg"
            >
              Dzień wolny
            </button>

            {/* Hour inputs */}
            <div className="p-4 border-b border-slate-600">
              <p className="text-sm text-slate-300 font-semibold mb-3">Wpisz godziny zmiany</p>

              <div className="flex items-center gap-2 mb-3">
                {/* Start hour */}
                <div className="flex-1">
                  <label className="text-xs text-slate-400 block mb-1">Od</label>
                  <select
                    value={inputStart}
                    onChange={e => setInputStart(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-slate-400 text-sm mt-4">–</span>

                {/* End hour */}
                <div className="flex-1">
                  <label className="text-xs text-slate-400 block mb-1">Do</label>
                  <select
                    value={inputEnd}
                    onChange={e => setInputEnd(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map(h => (
                      <option key={h} value={h}>
                        {h === 24 ? '24:00' : h.toString().padStart(2, '0') + ':00'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div className={`rounded p-2 mb-3 text-xs text-center font-medium ${
                shiftLength > 0 && inputEnd > inputStart
                  ? 'bg-purple-600/20 text-purple-300'
                  : 'bg-red-600/20 text-red-300'
              }`}>
                {inputEnd > inputStart
                  ? `${inputStart.toString().padStart(2,'0')}:00 – ${inputEnd === 24 ? '24:00' : inputEnd.toString().padStart(2,'0') + ':00'} · ${shiftLength}h`
                  : 'Koniec musi być po starcie'}
              </div>

              <button
                onClick={handleConfirmShift}
                disabled={inputEnd <= inputStart}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Zatwierdź zmianę
              </button>
            </div>

            {/* Reset */}
            {!isEmpty && (
              <button
                onClick={handleReset}
                className="w-full px-4 py-2 text-center text-red-300 text-sm hover:bg-slate-600 transition-colors font-medium rounded-b-lg"
              >
                Resetuj
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render – calendar modal
  // ---------------------------------------------------------------------------
  if (selectedMonth !== null) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="w-full h-screen max-h-[95vh] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl shadow-slate-900/50 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50 flex-shrink-0">
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={handlePrevMonth}
                disabled={hasUnsavedChanges || saving}
                title={hasUnsavedChanges ? 'Najpierw zapisz lub anuluj zmiany' : 'Poprzedni miesiąc'}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-slate-300" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white">
                  Propozycje pracowników na {months[selectedMonth]} {selectedYear}
                </h2>
                <p className="text-slate-400 text-xs">Zarządzaj propozycjami zmian grafiku dla pracowników</p>
                <LastModifiedInfo
                  updatedAt={monthLastModifiedRecord?.updatedAt}
                  createdAt={monthLastModifiedRecord?.createdAt}
                  updatedByLabel={monthLastModifiedRecord?.updatedByLabel}
                  createdByLabel={monthLastModifiedRecord?.createdByLabel}
                  className="mt-1"
                />
              </div>
              <button
                onClick={handleNextMonth}
                disabled={hasUnsavedChanges || saving}
                title={hasUnsavedChanges ? 'Najpierw zapisz lub anuluj zmiany' : 'Następny miesiąc'}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-slate-700 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Loading overlay */}
          {loadingProposals && (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              Ładowanie propozycji...
            </div>
          )}

          {/* Table */}
          {!loadingProposals && (
            <div className="p-4 overflow-x-auto flex-1 flex flex-col">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800/50">
                    <th className="border border-slate-600 px-3 py-2 text-left text-slate-300 font-medium sticky left-0 bg-slate-800/50 min-w-40">
                      Pracownik
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      return (
                        <th
                          key={`day-${i}`}
                          className={`border px-0.5 py-1 text-center font-medium text-xs w-12 h-10 ${
                            isWeekend(day)
                              ? 'border-slate-500 bg-slate-700/50 text-slate-400'
                              : 'border-slate-600 bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          {day}
                        </th>
                      );
                    })}
                  </tr>
                  <tr className="bg-slate-800/30">
                    <th className="border border-slate-600 px-3 py-1 text-left text-slate-400 font-normal sticky left-0 bg-slate-800/30 min-w-40" />
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      return (
                        <th
                          key={`dow-${i}`}
                          className={`border px-0.5 py-0.5 text-center font-normal text-xs w-12 ${
                            isWeekend(day)
                              ? 'border-slate-500 bg-slate-700/30'
                              : 'border-slate-600'
                          }`}
                        >
                          {getDayOfWeek(day)}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => {
                    const employeeLastModifiedRecord = getEmployeeProposalLastModifiedRecord(employee.id);
                    return (
                    <tr key={employee.id} className="hover:bg-slate-700/20">
                      <td className="border border-slate-600 px-3 py-2 text-slate-300 font-medium sticky left-0 bg-slate-800/30 whitespace-nowrap min-w-40">
                        <div>
                          <p className="text-white font-semibold text-xl">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-xs text-slate-400">SAP {employee.sap}</p>
                          <LastModifiedInfo
                            updatedAt={employeeLastModifiedRecord?.updatedAt}
                            createdAt={employeeLastModifiedRecord?.createdAt}
                            updatedByLabel={employeeLastModifiedRecord?.updatedByLabel}
                            createdByLabel={employeeLastModifiedRecord?.createdByLabel}
                            className="mt-1 whitespace-normal"
                          />
                        </div>
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day       = i + 1;
                        const cellValue = getCurrentCellValue(employee.id, day);
                        return (
                          <td
                            key={day}
                            className={`border px-0.5 py-1 text-center w-12 ${
                              isWeekend(day)
                                ? 'border-slate-500 bg-slate-700/20'
                                : 'border-slate-600'
                            }`}
                          >
                            <ShiftSelector
                              employeeId={employee.id}
                              day={day}
                              currentValue={cellValue}
                            />
                          </td>
                        );
                      })}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 p-4 border-t border-slate-700 bg-slate-900/50 flex-shrink-0">
            {hasUnsavedChanges && (
              <div className="flex-1 flex items-center gap-2 text-sm text-amber-400">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                Niezapisane zmiany ({pendingDaysOff.size + pendingShifts.size} zmian)
              </div>
            )}

            <button
              onClick={discardChanges}
              disabled={!hasUnsavedChanges || saving}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anuluj
            </button>

            <button
              onClick={saveAllChanges}
              disabled={!hasUnsavedChanges || saving}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                <>Zapisz propozycje</>
              )}
            </button>

            <button
              onClick={handleClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render – month picker
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-8">
      {/* Header z selektorem roku po prawej stronie */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Propozycje Grafikowe Pracowników</h2>
            <p className="text-slate-400 text-sm">Zarządzaj propozycjami zmian pracowników</p>
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
        {months.map((month, monthIndex) => (
          <button
            key={monthIndex}
            onClick={() => setSelectedMonth(monthIndex)}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-5 hover:border-purple-600 hover:bg-slate-700/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">{month}</h3>
              <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">{selectedYear}</span>
            </div>
            <p className="text-slate-400 text-sm">Propozycje zmian grafiku</p>
            <LastModifiedInfo
              updatedAt={yearlyLastModifiedRecords[monthIndex]?.updatedAt}
              createdAt={yearlyLastModifiedRecords[monthIndex]?.createdAt}
              updatedByLabel={yearlyLastModifiedRecords[monthIndex]?.updatedByLabel}
              createdByLabel={yearlyLastModifiedRecords[monthIndex]?.createdByLabel}
              className="mt-2"
            />
            {/* <div className="mt-3 pt-3 border-t border-slate-700/50">
              <span className="text-xs font-medium text-purple-400 group-hover:text-purple-300 transition-colors">Edytuj propozycje →</span>
            </div> */}
          </button>
        ))}
      </div>
    </div>
  );
}