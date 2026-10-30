import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Save, Trash2, RotateCcw, Info, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { holidayService } from '@/services/api-provider';
import { calendarUtils } from '@/utils/calendar';
import {
  HOLIDAY_MIN_YEAR,
  HOLIDAY_MAX_YEAR,
  HOLIDAY_MAX_NAME_LENGTH,
  type HolidayResponse,
} from '@/types/holiday.types';

/**
 * Zakładka "Dni wolne" (Panel Admina).
 * Lista świąt i dni niehandlowych wybranego roku. W tych dniach draft wynosi 0, a dzień nie wchodzi do
 * dni roboczych. Zmiany są od razu widoczne w pozostałych modułach (draft, grafik, urlopy, eksporty).
 */

const YEARS = Array.from(
  { length: HOLIDAY_MAX_YEAR - HOLIDAY_MIN_YEAR + 1 },
  (_, i) => HOLIDAY_MIN_YEAR + i
);

const clampYear = (year: number) => Math.min(HOLIDAY_MAX_YEAR, Math.max(HOLIDAY_MIN_YEAR, year));

/** YYYY-MM-DD → "dd.MM.yyyy" + dzień tygodnia (bez Date z UTC, żeby uniknąć przesunięć stref czasowych) */
const describeDate = (iso: string): { text: string; weekday: string; isWeekend: boolean } => {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = calendarUtils.getDayOfWeek(y, m - 1, d); // 0 = poniedziałek
  return {
    text: `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`,
    weekday: calendarUtils.getDayName(dow),
    isWeekend: dow >= 5,
  };
};

const formatDateTime = (iso: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pl-PL');
};

export default function HolidaysTab() {
  const [year, setYear] = useState<number>(() => clampYear(new Date().getFullYear()));
  const [holidays, setHolidays] = useState<HolidayResponse[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyDate, setBusyDate] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const applyList = (list: HolidayResponse[]) => {
    setHolidays(list);
    setNames(Object.fromEntries(list.map((h) => [h.date, h.name])));
  };

  useEffect(() => {
    // flaga chroni przed nadpisaniem widoku spóźnioną odpowiedzią po zmianie roku
    let cancelled = false;
    setLoading(true);
    setConfirmDelete(null);
    setConfirmReset(false);

    holidayService
      .getByYear(year)
      .then((list) => {
        if (!cancelled) applyList(list);
      })
      .catch((error: any) => {
        if (cancelled) return;
        console.error('Error loading holidays:', error);
        toast.error(error.message || 'Nie udało się załadować dni wolnych');
        applyList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const isYearPersisted = holidays.length > 0 && holidays.every((h) => h.persisted);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!newDate) {
      toast.error('Wybierz datę');
      return;
    }
    if (!newDate.startsWith(`${year}-`)) {
      toast.error(`Data musi należeć do roku ${year}`);
      return;
    }
    if (!name) {
      toast.error('Podaj nazwę dnia wolnego');
      return;
    }
    if (holidays.some((h) => h.date === newDate)) {
      toast.error('Ten dzień jest już na liście');
      return;
    }

    try {
      setAdding(true);
      await holidayService.create({ date: newDate, name });
      toast.success('Dzień wolny dodany');
      setNewDate('');
      setNewName('');
      reload();
    } catch (error: any) {
      console.error('Error creating holiday:', error);
      toast.error(error.message || 'Nie udało się dodać dnia wolnego');
    } finally {
      setAdding(false);
    }
  };

  const handleSaveName = async (holiday: HolidayResponse) => {
    const name = (names[holiday.date] ?? '').trim();
    if (!name) {
      toast.error('Nazwa nie może być pusta');
      return;
    }

    try {
      setBusyDate(holiday.date);
      await holidayService.update(holiday.date, { name });
      toast.success('Nazwa zapisana');
      reload();
    } catch (error: any) {
      console.error('Error updating holiday:', error);
      toast.error(error.message || 'Nie udało się zapisać nazwy');
    } finally {
      setBusyDate(null);
    }
  };

  const handleDelete = async (holiday: HolidayResponse) => {
    try {
      setBusyDate(holiday.date);
      await holidayService.delete(holiday.date);
      toast.success('Dzień wolny usunięty');
      setConfirmDelete(null);
      reload();
    } catch (error: any) {
      console.error('Error deleting holiday:', error);
      toast.error(error.message || 'Nie udało się usunąć dnia wolnego');
    } finally {
      setBusyDate(null);
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);
      const list = await holidayService.resetYear(year);
      applyList(list);
      setConfirmReset(false);
      toast.success(`Przywrócono domyślne święta roku ${year}`);
    } catch (error: any) {
      console.error('Error resetting holidays:', error);
      toast.error(error.message || 'Nie udało się przywrócić domyślnych świąt');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear((y) => clampYear(y - 1))}
            disabled={year <= HOLIDAY_MIN_YEAR}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-40"
            title="Poprzedni rok"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => setYear((y) => clampYear(y + 1))}
            disabled={year >= HOLIDAY_MAX_YEAR}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-40"
            title="Następny rok"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {confirmReset ? (
            <>
              <span className="text-sm text-amber-300">Usunąć wszystkie zmiany roku {year}?</span>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium disabled:opacity-50"
              >
                {resetting ? 'Przywracanie...' : 'Tak, przywróć'}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg"
              >
                Anuluj
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
              title="Usuwa zmiany roku i wczytuje święta domyślne od nowa"
            >
              <RotateCcw className="w-4 h-4" />
              Przywróć domyślne dla {year}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300">
          W dniach wolnych draft wynosi 0, a dzień nie wchodzi do dni roboczych. Lista startuje od świąt z biblioteki
          kalendarza; możesz dodać własne dni (np. niehandlowe), zmienić nazwę albo usunąć dzień. Zmiany nie przeliczają
          zapisanych norm godzin ani istniejących draftów i grafików — dotyczą nowych obliczeń.
        </p>
      </div>

      {!loading && holidays.length > 0 && !isYearPersisted && (
        <div className="flex items-start gap-2 p-3 bg-amber-600/10 border border-amber-600/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            Rok {year} nie jest jeszcze zapisany w bazie — pokazano święta domyślne. Pierwsza zmiana zapisze je w bazie
            razem ze zmianą, a wszystkie lata naraz możesz zapisać w zakładce „Inicjalizacja”.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 p-3 bg-slate-900/40 border border-slate-700 rounded-lg">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Data</label>
          <input
            type="date"
            value={newDate}
            min={`${year}-01-01`}
            max={`${year}-12-31`}
            onChange={(e) => setNewDate(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-slate-400 mb-1">Nazwa</label>
          <input
            type="text"
            value={newName}
            maxLength={HOLIDAY_MAX_NAME_LENGTH}
            placeholder="np. Dzień niehandlowy"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {adding ? 'Dodawanie...' : 'Dodaj dzień wolny'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Data</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Nazwa</th>
              <th className="text-center py-3 px-4 text-slate-400 font-medium">Rodzaj</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Ostatnia zmiana</th>
              <th className="text-right py-3 px-4 text-slate-400 font-medium">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Ładowanie...</td></tr>
            ) : holidays.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Brak dni wolnych w roku {year}</td></tr>
            ) : holidays.map((holiday) => {
              const info = describeDate(holiday.date);
              const busy = busyDate === holiday.date;
              const currentName = names[holiday.date] ?? holiday.name;
              const nameDirty = currentName.trim() !== holiday.name && currentName.trim() !== '';
              const lastChangeLabel = holiday.updatedAt ? holiday.updatedByLabel : holiday.createdByLabel;
              const lastChangeDate = formatDateTime(holiday.updatedAt ?? holiday.createdAt);

              return (
                <tr key={holiday.date} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="text-white font-medium">{info.text}</div>
                    <div className={`text-xs ${info.isWeekend ? 'text-amber-400' : 'text-slate-500'}`}>{info.weekday}</div>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={currentName}
                      maxLength={HOLIDAY_MAX_NAME_LENGTH}
                      disabled={busy}
                      onChange={(e) => setNames((prev) => ({ ...prev, [holiday.date]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && nameDirty) handleSaveName(holiday);
                      }}
                      className={`w-full min-w-[180px] px-3 py-1.5 bg-slate-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                        nameDirty ? 'border-amber-500 focus:ring-amber-500' : 'border-slate-600 focus:ring-blue-500'
                      }`}
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    {holiday.custom ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400">Własny</span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400">Z kalendarza</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {lastChangeDate ? (
                      <>
                        <div>{lastChangeLabel ?? '—'}</div>
                        <div className="text-xs text-slate-500">{lastChangeDate}</div>
                      </>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {confirmDelete === holiday.date ? (
                        <>
                          <span className="text-xs text-amber-300">Usunąć?</span>
                          <button
                            onClick={() => handleDelete(holiday)}
                            disabled={busy}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium disabled:opacity-50"
                          >
                            Tak
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg"
                          >
                            Nie
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSaveName(holiday)}
                            disabled={!nameDirty || busy}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:hover:bg-blue-600"
                            title="Zapisz nazwę"
                          >
                            <Save className="w-4 h-4" />
                            Zapisz
                          </button>
                          <button
                            onClick={() => setConfirmDelete(holiday.date)}
                            disabled={busy}
                            className="p-2 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-40"
                            title="Usuń dzień wolny"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
