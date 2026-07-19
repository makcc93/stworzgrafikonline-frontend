import { useState, useEffect, useCallback } from 'react';
import { X, Loader, ChevronLeft, ChevronRight, Download, FileText, Clock, CalendarDays, Users, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { scheduleService } from '@/services/api/schedule.service';
import { employeeService } from '@/services/api-provider';
import { computeShiftHours, normalizeToTimeString } from '@/utils/shiftNormalize';
import type { ResponseEmployeeDTO } from '@/types/employee.types';
import type { ResponseScheduleDetailsDTO, ShiftCode } from '@/types/schedule.types';

// ── Types ────────────────────────────────────────────────────────────────────

interface ScheduleViewerProps {
  storeId: number;
  scheduleId: number;
  year: number;
  month: number; // 0-indexed
  onClose: () => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
}

interface ShiftCell {
  label: string;
  isWeekend: boolean;
  isEmpty: boolean;    // true = wolne/urlop/L4 → szary tekst
  isSpecial: boolean;  // true = urlop/delegacja → amber
  shiftCode: ShiftCode | null;
}

interface EmployeeRow {
  employee: ResponseEmployeeDTO;
  cells: ShiftCell[];
  totalHours: number;
  workDays: number;
  weekendDays: number;
  vacationDays: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

const DOW = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];

function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month, day).getDay();
  return d === 0 || d === 6;
}

function getDow(year: number, month: number, day: number): string {
  return DOW[new Date(year, month, day).getDay()];
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Formatuje LocalTime (string/obiekt/tablica z backendu) → "HH:MM".
 */
function fmtTime(t: unknown): string {
  return normalizeToTimeString(t).substring(0, 5);
}

/**
 * Buduje etykietę i metadane komórki na podstawie shiftCode i godzin.
 */
function buildCell(
  detail: ResponseScheduleDetailsDTO,
  weekend: boolean,
): ShiftCell {
  const code: ShiftCode = detail.shiftCode;

  switch (code) {
    case 'DAY_OFF':
      return { label: 'W', isWeekend: weekend, isEmpty: true, isSpecial: false, shiftCode: code };

    case 'VACATION':
      return { label: 'U', isWeekend: weekend, isEmpty: true, isSpecial: true, shiftCode: code };

    case 'SICK_LEAVE':
      return { label: 'L4', isWeekend: weekend, isEmpty: true, isSpecial: true, shiftCode: code };

    case 'DELEGATION':
      return { label: 'D', isWeekend: weekend, isEmpty: false, isSpecial: true, shiftCode: code };

    case 'WORK':
    case 'WORK_BY_PROPOSAL':
    default: {
      const s = fmtTime(detail.startHour);
      const e = fmtTime(detail.endHour);
      return {
        label: `${s}\n${e}`,
        isWeekend: weekend,
        isEmpty: false,
        isSpecial: code === 'WORK_BY_PROPOSAL',
        shiftCode: code,
      };
    }
  }
}

/**
 * Zwraca klasy CSS tła komórki na podstawie kodu zmiany i weekendu.
 * Priorytet: WORK_BY_PROPOSAL > VACATION > SICK_LEAVE > DELEGATION > weekend > brak
 */
function cellBgClass(cell: ShiftCell): string {
  switch (cell.shiftCode) {
    case 'WORK_BY_PROPOSAL': return 'bg-violet-900/40';
    case 'VACATION':         return 'bg-emerald-900/40';
    case 'SICK_LEAVE':       return 'bg-yellow-900/30';
    case 'DELEGATION':       return 'bg-indigo-900/40';
    default:
      return cell.isWeekend ? 'bg-slate-600/25' : '';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ScheduleViewer({
  storeId,
  scheduleId,
  year,
  month,
  onClose,
  onNavigatePrev,
  onNavigateNext,
  canNavigatePrev = false,
  canNavigateNext = false,
}: ScheduleViewerProps) {
  const [loading, setLoading]           = useState(true);
  const [rows, setRows]                 = useState<EmployeeRow[]>([]);
  const [downloading, setDownloading]   = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const days = daysInMonth(year, month);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Pracownicy sklepu
      const empPage = await employeeService.getAll(storeId, undefined, { page: 0, size: 200 });
      const employees: ResponseEmployeeDTO[] = empPage.content;

      // 2. Szczegóły grafiku
      const detailsPage = await scheduleService.getDetails(
        storeId,
        scheduleId,
        undefined,
        { page: 0, size: 5000 },
      );
      const details: ResponseScheduleDetailsDTO[] = Array.isArray(detailsPage)
        ? detailsPage
        : (detailsPage?.content ?? []);

      // 3. Budujemy mapę: employeeId → Map<dayOfMonth, detail>
      const empDayDetail = new Map<number, Map<number, ResponseScheduleDetailsDTO>>();
      for (const d of details) {
        const dayNum = parseInt(d.date.split('-')[2], 10);
        if (!empDayDetail.has(d.employeeId)) empDayDetail.set(d.employeeId, new Map());
        empDayDetail.get(d.employeeId)!.set(dayNum, d);
      }

      // 4. Budujemy wiersze tabeli
      const builtRows: EmployeeRow[] = employees
        .filter((e) => e.enable)
        .map((employee) => {
          const dayDetail = empDayDetail.get(employee.id) ?? new Map<number, ResponseScheduleDetailsDTO>();
          let totalHours   = 0;
          let workDays     = 0;
          let weekendDays  = 0;
          let vacationDays = 0;

          const cells: ShiftCell[] = Array.from({ length: days }, (_, i) => {
            const day     = i + 1;
            const weekend = isWeekend(year, month, day);
            const detail  = dayDetail.get(day);

            if (!detail) {
              return { label: '—', isWeekend: weekend, isEmpty: true, isSpecial: false, shiftCode: null };
            }

            const cell = buildCell(detail, weekend);

            // ── Zliczanie godzin ──────────────────────────────────────────
            switch (detail.shiftCode) {
              case 'WORK':
              case 'WORK_BY_PROPOSAL': {
                const len = computeShiftHours(detail.startHour, detail.endHour);
                totalHours += len;
                workDays   += 1;
                if (weekend) weekendDays += 1;
                break;
              }
              case 'VACATION':
              case 'SICK_LEAVE': {
                // Godziny urlopowe/chorobowe — shift ma 00:00→00:00,
                // prawdziwa wartość jest w ShiftTypeConfig.defaultHours
                if (detail.defaultHours != null) {
                  totalHours += detail.defaultHours;
                }
                if (detail.shiftCode === 'VACATION') vacationDays += 1;
                break;
              }
              default:
                // DAY_OFF, DELEGATION — nie liczą do godzin
                break;
            }

            return cell;
          });

          return { employee, cells, totalHours, workDays, weekendDays, vacationDays };
        });

      setRows(builtRows);
    } catch (e) {
      console.error('[ScheduleViewer] load error', e);
      toast.error('Nie udało się załadować grafiku');
    } finally {
      setLoading(false);
    }
  }, [storeId, scheduleId, year, month, days]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Backend wgrywa Excel na Cloudflare R2 i zwraca presigned URL (~15 min)
      const { downloadUrl, filename } = await scheduleService.exportFromDatabase(storeId, scheduleId);
      const a    = document.createElement('a');
      a.href     = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Plik Excel pobrany');
    } catch {
      toast.error('Błąd pobierania pliku');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      // Backend wgrywa PDF na Cloudflare R2 i zwraca presigned URL (~15 min)
      const { downloadUrl, filename } = await scheduleService.exportPdf(storeId, scheduleId);
      const a    = document.createElement('a');
      a.href     = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Plik PDF pobrany');
    } catch {
      toast.error('Błąd pobierania pliku PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ── Summary stats ────────────────────────────────────────────────────────
  const totalHoursAll       = rows.reduce((s, r) => s + r.totalHours, 0);
  const totalWorkDaysAll    = rows.reduce((s, r) => s + r.workDays, 0);
  const totalWeekendDaysAll = rows.reduce((s, r) => s + r.weekendDays, 0);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="w-full h-screen max-h-[95vh] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl shadow-slate-900/50 flex flex-col">

        {/* ── Header ── */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={onNavigatePrev}
              disabled={!canNavigatePrev}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Poprzedni miesiąc"
            >
              <ChevronLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Grafik — {MONTHS[month]} {year}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600/30 text-emerald-300 font-medium">
                  ✓ Gotowy
                </span>
              </div>
              <p className="text-slate-400 text-xs">Podgląd wygenerowanego grafiku — weekendy wyróżnione</p>
            </div>
            <button
              onClick={onNavigateNext}
              disabled={!canNavigateNext}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Następny miesiąc"
            >
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </button>
          </div>

          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {downloadingPdf
                ? <Loader className="w-3.5 h-3.5 animate-spin" />
                : <FileText className="w-3.5 h-3.5" />}
              Pobierz PDF
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {downloading
                ? <Loader className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />}
              Pobierz Excel
            </button>
            <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="p-4 overflow-auto flex-1 flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center flex-1 gap-3">
              <Loader className="w-6 h-6 text-emerald-400 animate-spin" />
              <span className="text-slate-400 text-sm">Ładowanie grafiku…</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-slate-500 text-sm">Brak danych dla tego miesiąca</p>
            </div>
          ) : (
            <table className="w-full border-collapse select-none text-xs">
              <thead>
                {/* Wiersz 1: numery dni */}
                <tr className="bg-slate-800/50">
                  <th className="border border-slate-600 px-3 py-2 text-left text-slate-300 font-medium sticky left-0 bg-slate-800/50 min-w-44 z-10">
                    Pracownik
                  </th>
                  {Array.from({ length: days }, (_, i) => {
                    const day     = i + 1;
                    const weekend = isWeekend(year, month, day);
                    return (
                      <th
                        key={`h-${day}`}
                        className={`border px-0.5 py-1 text-center font-medium text-xs w-14 h-10 ${
                          weekend
                            ? 'border-slate-500 bg-slate-600/50 text-slate-300'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300'
                        }`}
                      >
                        {day}
                      </th>
                    );
                  })}
                  <th className="border border-slate-600 px-2 py-1 text-center text-slate-300 font-bold text-xs bg-slate-800/50 min-w-16">Godz.</th>
                  <th className="border border-slate-600 px-2 py-1 text-center text-slate-300 font-bold text-xs bg-slate-800/50 min-w-12">Dni</th>
                  <th className="border border-slate-600 px-2 py-1 text-center text-slate-300 font-bold text-xs bg-slate-800/50 min-w-14">Wknd</th>
                </tr>

                {/* Wiersz 2: dni tygodnia */}
                <tr className="bg-slate-800/30">
                  <th className="border border-slate-600 px-3 py-1 sticky left-0 bg-slate-800/30 z-10" />
                  {Array.from({ length: days }, (_, i) => {
                    const day     = i + 1;
                    const weekend = isWeekend(year, month, day);
                    return (
                      <th
                        key={`dow-${day}`}
                        className={`border px-0.5 py-0.5 text-center font-normal text-xs w-14 ${
                          weekend
                            ? 'border-slate-500 bg-slate-600/30 text-slate-300 font-semibold'
                            : 'border-slate-600 text-slate-400'
                        }`}
                      >
                        {getDow(year, month, day)}
                      </th>
                    );
                  })}
                  <th className="border border-slate-600 bg-slate-800/30" colSpan={3} />
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.employee.id} className="hover:bg-slate-700/20">
                    {/* Kolumna pracownika */}
                    <td className="border border-slate-600 px-3 py-2 text-slate-300 font-medium sticky left-0 bg-slate-800/30 whitespace-nowrap min-w-44 z-10">
                      <div>
                        <p className="text-white font-semibold text-sm leading-tight">
                          {row.employee.firstName} {row.employee.lastName}
                        </p>
                        <p className="text-xs text-slate-400">SAP {row.employee.sap}</p>
                      </div>
                    </td>

                    {/* Komórki dni */}
                    {row.cells.map((cell, i) => {
                      const day = i + 1;
                      return (
                        <td
                          key={day}
                          className={`border px-0.5 py-1 text-center w-14 align-middle ${
                            cell.shiftCode === 'WORK_BY_PROPOSAL' ? 'border-violet-500/50' :
                            cell.shiftCode === 'VACATION'         ? 'border-emerald-700/50' :
                            cell.shiftCode === 'SICK_LEAVE'       ? 'border-yellow-700/50' :
                            cell.shiftCode === 'DELEGATION'       ? 'border-indigo-500/50' :
                            cell.isWeekend                         ? 'border-slate-500' :
                                                                     'border-slate-600'
                          } ${cellBgClass(cell)}`}
                        >
                          {cell.isEmpty ? (
                            // wolne / urlop / L4
                            <span className={`text-xs font-medium ${
                              cell.shiftCode === 'VACATION'   ? 'text-emerald-300' :
                              cell.shiftCode === 'SICK_LEAVE' ? 'text-yellow-300' :
                                                                'text-slate-500'
                            }`}>
                              {cell.label}
                            </span>
                          ) : (
                            // zmiana robocza lub delegacja
                            <span className={`font-medium whitespace-pre text-[10px] leading-tight block ${
                              cell.shiftCode === 'WORK_BY_PROPOSAL' ? 'text-violet-300' :
                              cell.shiftCode === 'DELEGATION'       ? 'text-indigo-300' :
                                                                       'text-emerald-300'
                            }`}>
                              {cell.label}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Kolumny podsumowujące */}
                    <td className="border border-slate-600 px-2 py-1 text-center font-bold text-emerald-300 text-xs bg-slate-800/20">
                      {row.totalHours > 0
                        ? `${Number.isInteger(row.totalHours) ? row.totalHours : row.totalHours.toFixed(2).replace(/\.?0+$/, '')}h`
                        : '—'}
                    </td>
                    <td className="border border-slate-600 px-2 py-1 text-center font-bold text-slate-200 text-xs bg-slate-800/20">
                      {row.workDays}
                    </td>
                    <td className="border border-slate-600 px-2 py-1 text-center font-bold text-amber-300 text-xs bg-slate-800/20">
                      {row.weekendDays}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer: podsumowanie ── */}
        {!loading && rows.length > 0 && (
          <div className="border-t border-slate-700 bg-slate-900/50 p-4 flex-shrink-0">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>{rows.length} pracowników</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-emerald-300">
                  {Number.isInteger(totalHoursAll) ? totalHoursAll : totalHoursAll.toFixed(2).replace(/\.?0+$/, '')}h
                </span>
                <span className="text-slate-500">łącznie</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <CalendarDays className="w-4 h-4 text-blue-400" />
                <span>{totalWorkDaysAll} dni pracy</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Briefcase className="w-4 h-4 text-amber-400" />
                <span>{totalWeekendDaysAll} weekendów</span>
              </div>

              {/* Legenda */}
              <div className="ml-auto">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm bg-slate-600/50 border border-slate-500" />
                    Weekend
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-slate-500 font-mono">W</span>
                    Wolne
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm bg-emerald-900/40 border border-emerald-700/50" />
                    <span className="text-emerald-300 font-mono">U</span>
                    Urlop
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm bg-yellow-900/30 border border-yellow-700/50" />
                    <span className="text-yellow-300 font-mono">L4</span>
                    Chorobowe
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm bg-indigo-900/40 border border-indigo-500/50" />
                    <span className="text-indigo-300 font-mono">D</span>
                    Delegacja
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-emerald-300 font-mono text-[10px]">08:00<br/>16:00</span>
                    Zmiana
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm bg-violet-900/40 border border-violet-500/50" />
                    <span className="text-violet-300 font-mono text-[10px]">08:00<br/>16:00</span>
                    Propozycja
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
