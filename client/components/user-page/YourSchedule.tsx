import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Loader2, Clock,
  CheckCircle2, AlertCircle, Trash2, X,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { scheduleService } from '@/services/api-provider';
import { ScheduleStatus } from '@/types/shared.types';
import type { ResponseScheduleDTO, ResponseScheduleDetailsDTO, ShiftCode } from '@/types/schedule.types';
import { ScheduleMonth } from '@/types';
import SchedulePreparationModal from './SchedulePreparationModal';
import ScheduleViewer from './ScheduleViewer';
import LastModifiedInfo from '@/components/shared/LastModifiedInfo';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Oblicza długość zmiany w godzinach na podstawie startHour/endHour "HH:MM:SS".
 * Obsługuje zmiany przechodzące przez północ.
 * Zwraca 0 dla zmiany 00:00→00:00 (wolne/urlop/L4).
 */
function computeShiftHours(startHour: string, endHour: string): number {
  const [sh, sm] = startHour.split(':').map(Number);
  const [eh, em] = endHour.split(':').map(Number);

  // specjalny przypadek: 00:00→00:00 to wolne, nie zmiana 24h
  if (sh === 0 && sm === 0 && eh === 0 && em === 0) return 0;

  const startMinutes = sh * 60 + (sm ?? 0);
  const endMinutes   = eh * 60 + (em ?? 0);
  const diff = endMinutes - startMinutes;
  return (diff > 0 ? diff : diff + 24 * 60) / 60;
}

/**
 * Liczy łączne godziny ze szczegółów grafiku korzystając bezpośrednio
 * z pól startHour/endHour/shiftCode/defaultHours z ResponseScheduleDetailsDTO.
 */
function sumHoursFromDetails(details: ResponseScheduleDetailsDTO[]): number {
  let total = 0;
  for (const d of details) {
    const code = d.shiftCode as ShiftCode;
    if (code === 'WORK' || code === 'WORK_BY_PROPOSAL') {
      total += computeShiftHours(d.startHour, d.endHour);
    } else if (code === 'VACATION' || code === 'SICK_LEAVE') {
      // Dla urlopu/L4 shift ma 00:00→00:00 — prawdziwa wartość jest w defaultHours
      if (d.defaultHours != null) {
        total += d.defaultHours;
      }
    }
    // DAY_OFF, DELEGATION — nie liczą do godzin
  }
  return total;
}

// ── Extended schedule entry ───────────────────────────────────────────────────

interface ScheduleEntry extends ScheduleMonth {
  scheduleId?: number;
  status?: ScheduleStatus;
  // Dane "Ostatnia zmiana" — migawka autora z backendu (nie aktualnie zalogowany użytkownik)
  createdAt?: string | null;
  updatedAt?: string | null;
  createdByLabel?: string | null;
  updatedByLabel?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function YourSchedule() {
  const { storeId, selectedStoreId, draftYear, setActiveTab } = useAppContext();
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(draftYear);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Modal state — creation flow
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Viewer state — show existing DONE schedule
  const [viewerState, setViewerState] = useState<{
    scheduleId: number;
    year: number;
    month: number;
  } | null>(null);

  // Confirm delete dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    year: number;
    month: number;
    monthName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── wykres godzin ─────────────────────────────────────────────────────────
  const [yearlyHoursData, setYearlyHoursData] = useState<
    { month: string; monthIndex: number; hours: number }[]
  >([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const months = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
  ];

  const resolvedStoreId = (selectedStoreId ?? parseInt(storeId as string, 10)) || 1;

  // ── Fetch schedules ───────────────────────────────────────────────────────
  const fetchSchedules = useCallback(async () => {
    if (!resolvedStoreId) return;
    setLoadingSchedules(true);
    try {
      const data = await scheduleService.getAll(resolvedStoreId);
      const content: ResponseScheduleDTO[] = Array.isArray(data)
        ? data
        : (data?.content ?? []);
      setSchedules(
        content.map((s: ResponseScheduleDTO) => ({
          year: s.year,
          month: s.month - 1, // konwertuj na 0-indexed
          created: true,
          scheduleId: s.id,
          status: s.scheduleStatusName as ScheduleStatus,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          createdByLabel: s.createdByLabel,
          updatedByLabel: s.updatedByLabel,
        }))
      );
    } catch (e) {
      console.error('[YourSchedule] Failed to load schedules', e);
    } finally {
      setLoadingSchedules(false);
    }
  }, [resolvedStoreId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // ── Fetch yearly hours chart data ─────────────────────────────────────────
  // Korzysta z już załadowanego stanu `schedules` (0-indexed miesiące)
  // i bezpośrednio z pól startHour/endHour/shiftCode/defaultHours w details —
  // bez osobnego wywołania getAll ani budowania shiftMap.
  const fetchYearlyHours = useCallback(async () => {
    if (!resolvedStoreId) return;
    setLoadingChart(true);
    try {
      // Filtrujemy schedules dla wybranego roku — miesiące są 0-indexed w stanie
      const schedulesForYear = schedules.filter(
        (s) => s.year === selectedYear && s.scheduleId != null
      );

      const results: { month: string; monthIndex: number; hours: number }[] = [];

      for (let m = 0; m < 12; m++) {
        const entry = schedulesForYear.find((s) => s.month === m);

        if (!entry?.scheduleId) {
          results.push({ month: months[m].substring(0, 3), monthIndex: m, hours: 0 });
          continue;
        }

        let totalHours = 0;
        try {
          const detailsPage = await scheduleService.getDetails(
            resolvedStoreId,
            entry.scheduleId,
            undefined,
            { page: 0, size: 5000 }
          );
          const details: ResponseScheduleDetailsDTO[] = Array.isArray(detailsPage)
            ? detailsPage
            : (detailsPage?.content ?? []);

          totalHours = sumHoursFromDetails(details);
        } catch {
          // jeśli details nie istnieją — zostaje 0
        }

        results.push({ month: months[m].substring(0, 3), monthIndex: m, hours: totalHours });
      }

      setYearlyHoursData(results);
    } catch (e) {
      console.error('[YourSchedule] Failed to load yearly hours chart', e);
    } finally {
      setLoadingChart(false);
    }
  }, [resolvedStoreId, selectedYear, schedules]);

  useEffect(() => {
    fetchYearlyHours();
  }, [fetchYearlyHours]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const getMonthsForYear = (year: number) =>
    months.map((month, idx) => ({ year, month: idx, monthName: month }));

  const getScheduleEntry = (year: number, month: number): ScheduleEntry | undefined =>
    schedules.find((s) => s.year === year && s.month === month);

  const isScheduleCreated = (year: number, month: number) =>
    !!getScheduleEntry(year, month);

  const isScheduleDone = (year: number, month: number): boolean => {
    const entry = getScheduleEntry(year, month);
    return entry?.status === ScheduleStatus.DONE;
  };

  const getScheduleId = (year: number, month: number): number | undefined =>
    getScheduleEntry(year, month)?.scheduleId;

  // ── Tile click handler ────────────────────────────────────────────────────
  const handleMonthClick = (year: number, month: number) => {
    const entry = getScheduleEntry(year, month);

    if (entry && entry.scheduleId && entry.status === ScheduleStatus.DONE) {
      // Grafik gotowy — pokaż podgląd
      setViewerState({ scheduleId: entry.scheduleId, year, month });
      return;
    }

    if (entry && entry.scheduleId && entry.status === ScheduleStatus.IN_PROGRESS) {
      // Grafik w trakcie tworzenia — otwórz edytor
      openScheduleEditor(year, month);
      return;
    }

    // Brak grafiku — otwórz modal tworzenia
    openModal(month);
  };

  const openModal = (month: number) => {
    setSelectedMonth(month);
    setIsModalOpen(true);
  };

  const handleNavigateToTab = (tab: 'vacations' | 'proposals' | 'draft') => {
    setActiveTab(tab);
  };

  const openScheduleEditor = (year: number, month: number) => {
    const monthId = (month + 1).toString();
    sessionStorage.setItem(
      'draftTabState',
      JSON.stringify({ activeTab: 'draft', monthId: parseInt(monthId), year })
    );
    navigate(`/schedule/${storeId}/${monthId}/${year}`);
  };

  // Called after modal successfully generates schedule — passes new scheduleId
  const handleModalProceed = (newScheduleId: number) => {
    if (selectedMonth !== null) {
      setIsModalOpen(false);
      // Odśwież listę grafików z backendu (fetchYearlyHours odpali się automatycznie przez dependency)
      fetchSchedules().then(() => {
        // Po odświeżeniu otwórz podgląd nowo utworzonego grafiku
        setViewerState({ scheduleId: newScheduleId, year: selectedYear, month: selectedMonth });
      });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, year: number, month: number, monthName: string) => {
    e.stopPropagation();
    setDeleteConfirm({ year, month, monthName });
  };

  const deleteSchedule = async () => {
    if (!deleteConfirm) return;
    const { year, month } = deleteConfirm;
    const scheduleId = getScheduleId(year, month);
    setIsDeleting(true);
    try {
      if (scheduleId) {
        // 1. Pobierz wszystkie details i usuń je najpierw (FK constraint)
        try {
          const detailsPage = await scheduleService.getDetails(
            resolvedStoreId,
            scheduleId,
            undefined,
            { page: 0, size: 5000 }
          );
          const details: ResponseScheduleDetailsDTO[] = Array.isArray(detailsPage)
            ? detailsPage
            : (detailsPage?.content ?? []);

          await Promise.all(
            details.map((d) =>
              scheduleService.deleteDetail(resolvedStoreId, scheduleId, d.id)
            )
          );
        } catch (e) {
          console.warn('[YourSchedule] could not delete details (may not exist)', e);
        }

        // 2. Dopiero teraz usuń sam schedule
        await scheduleService.delete(resolvedStoreId, scheduleId);
      }
      setSchedules((prev) => prev.filter((s) => !(s.year === year && s.month === month)));
      setDeleteConfirm(null);
    } catch (e) {
      console.error('[YourSchedule] delete failed', e);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Viewer navigation helpers ─────────────────────────────────────────────
  const handleViewerPrev = () => {
    if (!viewerState) return;
    let { year, month } = viewerState;
    if (month === 0) { year -= 1; month = 11; } else { month -= 1; }
    const entry = getScheduleEntry(year, month);
    if (entry?.scheduleId && entry.status === ScheduleStatus.DONE) {
      setViewerState({ scheduleId: entry.scheduleId, year, month });
    }
  };

  const handleViewerNext = () => {
    if (!viewerState) return;
    let { year, month } = viewerState;
    if (month === 11) { year += 1; month = 0; } else { month += 1; }
    const entry = getScheduleEntry(year, month);
    if (entry?.scheduleId && entry.status === ScheduleStatus.DONE) {
      setViewerState({ scheduleId: entry.scheduleId, year, month });
    }
  };

  const canViewerPrev = (() => {
    if (!viewerState) return false;
    let { year, month } = viewerState;
    if (month === 0) { year -= 1; month = 11; } else { month -= 1; }
    const entry = getScheduleEntry(year, month);
    return !!(entry?.scheduleId && entry.status === ScheduleStatus.DONE);
  })();

  const canViewerNext = (() => {
    if (!viewerState) return false;
    let { year, month } = viewerState;
    if (month === 11) { year += 1; month = 0; } else { month += 1; }
    const entry = getScheduleEntry(year, month);
    return !!(entry?.scheduleId && entry.status === ScheduleStatus.DONE);
  })();

  const monthsInYear = getMonthsForYear(selectedYear);
  const createdThisYear = schedules.filter((s) => s.year === selectedYear).length;
  const doneThisYear = schedules.filter((s) => s.year === selectedYear && s.status === ScheduleStatus.DONE).length;
  const totalHoursThisYear = yearlyHoursData.reduce((sum, d) => sum + d.hours, 0);

  return (
    <>
      <div className="space-y-8">

        {/* ── Header z selektorem roku po prawej ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Moje Grafiki</h2>
              <p className="text-slate-400 text-sm">Utwórz i zarządzaj grafikami miesiąca</p>
            </div>
          </div>
          {/* Selektor roku */}
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

        {/* ── Wykres godzin rocznych ── */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-300 font-semibold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Łączne godziny pracy wszystkich pracowników w roku {selectedYear}
            </h3>
            {!loadingChart && totalHoursThisYear > 0 && (
              <span className="text-emerald-400 font-bold text-sm">{totalHoursThisYear} h łącznie</span>
            )}
          </div>
          {loadingChart ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={yearlyHoursData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                onClick={(data) => {
                  if (data?.activePayload?.[0]) {
                    const point = data.activePayload[0].payload as { monthIndex: number };
                    const item = monthsInYear[point.monthIndex];
                    if (item) handleMonthClick(item.year, item.month);
                  }
                }}
              >
                <defs>
                  <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }}
                  labelStyle={{ color: '#f1f5f9' }}
                  formatter={(value: number) => [`${value} h`, 'Godziny pracy']}
                  cursor={{ stroke: '#10b981', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#hoursGradient)"
                  dot={{ fill: '#10b981', r: 4, cursor: 'pointer' }}
                  activeDot={{ r: 6, cursor: 'pointer' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <p className="text-slate-500 text-xs mt-2 text-center">
            Kliknij punkt na wykresie, aby otworzyć grafik miesiąca
          </p>
        </div>

        {/* ── Siatka miesięcy — kafelki ── */}
        {loadingSchedules ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
            <span className="text-slate-400 text-sm">Ładowanie grafików...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthsInYear.map((item) => {
              const entry = getScheduleEntry(item.year, item.month);
              const isCreated = !!entry;
              const isDone = entry?.status === ScheduleStatus.DONE;
              const isInProgress = entry?.status === ScheduleStatus.IN_PROGRESS;
              // yearlyHoursData jest indeksowane 0-11 (monthIndex === item.month)
              const monthHoursEntry = yearlyHoursData.find((d) => d.monthIndex === item.month);
              const monthHours = monthHoursEntry?.hours ?? 0;

              return (
                <div
                  key={`${item.year}-${item.month}`}
                  className={`rounded-xl p-5 backdrop-blur-sm border transition-all ${
                    isDone
                      ? 'bg-emerald-900/20 border-emerald-700/60 hover:border-emerald-500 hover:bg-emerald-900/30'
                      : isInProgress
                      ? 'bg-amber-900/10 border-amber-700/40 hover:border-amber-500 hover:bg-amber-900/20'
                      : 'bg-slate-800/50 border-slate-700 hover:border-green-600 hover:bg-slate-700/50'
                  } group cursor-pointer`}
                  onClick={() => handleMonthClick(item.year, item.month)}
                >
                  {/* Nagłówek kafelka */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-lg font-semibold transition-colors ${
                      isDone
                        ? 'text-white group-hover:text-emerald-300'
                        : isInProgress
                        ? 'text-white group-hover:text-amber-300'
                        : 'text-white group-hover:text-green-300'
                    }`}>
                      {item.monthName}
                    </h3>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      isDone
                        ? 'bg-emerald-600/30 text-emerald-300'
                        : isInProgress
                        ? 'bg-amber-600/30 text-amber-300'
                        : 'bg-slate-700/50 text-slate-500'
                    }`}>
                      {isDone && <CheckCircle2 className="w-3 h-3" />}
                      {isInProgress && <AlertCircle className="w-3 h-3" />}
                      {isDone ? 'Gotowy' : isInProgress ? 'W trakcie' : 'Brak'}
                    </span>
                  </div>

                  {/* Dane godzin */}
                  {isDone && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300 text-sm font-medium">
                        {loadingChart ? '...' : monthHours > 0 ? `${monthHours} h` : '—'}
                      </span>
                      <span className="text-slate-500 text-xs">łącznie</span>
                    </div>
                  )}

                  {/* Ostatnia zmiana */}
                  {entry && (
                    <LastModifiedInfo
                      updatedAt={entry.updatedAt}
                      createdAt={entry.createdAt}
                      updatedByLabel={entry.updatedByLabel}
                      createdByLabel={entry.createdByLabel}
                      className="mb-3"
                    />
                  )}

                  {/* CTA */}
                  <div className="mt-2 pt-3 border-t border-slate-700/40 flex items-center justify-between">
                    {isDone ? (
                      <>
                        <span className="text-xs font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                          Podgląd grafiku →
                        </span>
                        <button
                          onClick={(e) => handleDeleteClick(e, item.year, item.month, item.monthName)}
                          className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-400/10"
                        >
                          Usuń
                        </button>
                      </>
                    ) : isInProgress ? (
                      <>
                        <span className="text-xs font-medium text-amber-400 group-hover:text-amber-300 transition-colors">
                          Otwórz edytor →
                        </span>
                        <button
                          onClick={(e) => handleDeleteClick(e, item.year, item.month, item.monthName)}
                          className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-400/10"
                        >
                          Usuń
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 group-hover:text-green-400 transition-colors flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" />
                        Utwórz grafik
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Podsumowanie ── */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Podsumowanie Grafików</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/30 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Łącznie Grafików</p>
              <p className="text-2xl font-bold text-white">{schedules.length}</p>
            </div>
            <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-4">
              <p className="text-slate-400 text-sm flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Gotowych {selectedYear}
              </p>
              <p className="text-2xl font-bold text-emerald-400">{doneThisYear}</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Pozostałe Miesiące</p>
              <p className="text-2xl font-bold text-white">{12 - createdThisYear}</p>
            </div>
            <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-4">
              <p className="text-slate-400 text-sm flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Godzin {selectedYear}
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                {loadingChart ? '...' : totalHoursThisYear}
              </p>
            </div>
          </div>
        </div>

        {/* ── Modal przygotowania grafiku ── */}
        {selectedMonth !== null && (
          <SchedulePreparationModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onProceed={handleModalProceed}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            storeId={resolvedStoreId}
            onNavigateToTab={handleNavigateToTab}
          />
        )}
      </div>

      {/* ── Schedule Viewer (fullscreen overlay) ── */}
      {viewerState && (
        <ScheduleViewer
          storeId={resolvedStoreId}
          scheduleId={viewerState.scheduleId}
          year={viewerState.year}
          month={viewerState.month}
          onClose={() => setViewerState(null)}
          onNavigatePrev={handleViewerPrev}
          onNavigateNext={handleViewerNext}
          canNavigatePrev={canViewerPrev}
          canNavigateNext={canViewerNext}
        />
      )}

      {/* ── Confirm Delete Dialog ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteConfirm(null)}
          />
          {/* Dialog */}
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <button
              onClick={() => setDeleteConfirm(null)}
              disabled={isDeleting}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">Usuń grafik</h3>
                <p className="text-slate-400 text-xs">Ta operacja jest nieodwracalna</p>
              </div>
            </div>

            <p className="text-slate-300 text-sm mb-6">
              Czy na pewno chcesz usunąć grafik na{' '}
              <span className="text-white font-semibold">
                {deleteConfirm.monthName} {deleteConfirm.year}
              </span>
              ? Wszystkie dane grafiku zostaną trwale usunięte.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors disabled:opacity-40"
              >
                Anuluj
              </button>
              <button
                onClick={deleteSchedule}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Usuwanie…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Usuń grafik
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}