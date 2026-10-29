import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Save, RotateCcw, Info } from 'lucide-react';
import { toast } from 'sonner';
import { workingNormService } from '@/services/api-provider';
import { MONTHS } from '@/utils/calendar';
import {
  WORKING_NORM_MIN_YEAR,
  WORKING_NORM_MAX_YEAR,
  WORKING_NORM_MAX_HOURS,
  type WorkingNormResponse,
} from '@/types/working-norm.types';

/**
 * Zakładka "Normy godzinowe" (Panel Admina).
 * Pokazuje 12 miesięcy wybranego roku; administrator ręcznie ustala normę każdego miesiąca.
 * Norma wpływa na draft (/monthlyNorm), algorytm grafiku i potwierdzanie godzin pracowników.
 */

const YEARS = Array.from(
  { length: WORKING_NORM_MAX_YEAR - WORKING_NORM_MIN_YEAR + 1 },
  (_, i) => WORKING_NORM_MIN_YEAR + i
);

/** Zwraca liczbę całkowitą 0..744 albo null, gdy wpis jest niepoprawny. */
const parseHours = (raw: string): number | null => {
  const normalized = raw.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return value <= WORKING_NORM_MAX_HOURS ? value : null;
};

const formatDateTime = (iso: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pl-PL');
};

const toInputs = (norms: WorkingNormResponse[]): Record<number, string> =>
  Object.fromEntries(norms.map((n) => [n.month, String(n.hours)]));

const clampYear = (year: number) =>
  Math.min(WORKING_NORM_MAX_YEAR, Math.max(WORKING_NORM_MIN_YEAR, year));

export default function WorkingNormsTab() {
  const [year, setYear] = useState<number>(() => clampYear(new Date().getFullYear()));
  const [norms, setNorms] = useState<WorkingNormResponse[]>([]);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyMonth, setBusyMonth] = useState<number | null>(null);

  useEffect(() => {
    // flaga chroni przed nadpisaniem widoku spóźnioną odpowiedzią po zmianie roku
    let cancelled = false;
    setLoading(true);

    workingNormService
      .getByYear(year)
      .then((data) => {
        if (cancelled) return;
        setNorms(data);
        setInputs(toInputs(data));
      })
      .catch((error: any) => {
        if (cancelled) return;
        console.error('Error loading working norms:', error);
        toast.error(error.message || 'Nie udało się załadować norm godzinowych');
        setNorms([]);
        setInputs({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year]);

  const replaceNorm = (updated: WorkingNormResponse) => {
    setNorms((prev) => prev.map((n) => (n.month === updated.month ? updated : n)));
    setInputs((prev) => ({ ...prev, [updated.month]: String(updated.hours) }));
  };

  const handleSave = async (norm: WorkingNormResponse) => {
    const parsed = parseHours(inputs[norm.month] ?? '');
    if (parsed === null) {
      toast.error(`Norma musi być liczbą całkowitą od 0 do ${WORKING_NORM_MAX_HOURS}`);
      return;
    }

    try {
      setBusyMonth(norm.month);
      const updated = await workingNormService.update(norm.year, norm.month, { hours: parsed });
      replaceNorm(updated);
      toast.success(`Norma na ${MONTHS[norm.month - 1].toLowerCase()} ${norm.year} zapisana`);
    } catch (error: any) {
      console.error('Error saving working norm:', error);
      toast.error(error.message || 'Nie udało się zapisać normy');
    } finally {
      setBusyMonth(null);
    }
  };

  const handleReset = async (norm: WorkingNormResponse) => {
    try {
      setBusyMonth(norm.month);
      const updated = await workingNormService.reset(norm.year, norm.month);
      replaceNorm(updated);
      toast.success(`Przywrócono normę domyślną (${updated.hours} h)`);
    } catch (error: any) {
      console.error('Error resetting working norm:', error);
      toast.error(error.message || 'Nie udało się przywrócić normy domyślnej');
    } finally {
      setBusyMonth(null);
    }
  };

  const totals = useMemo(
    () => ({
      hours: norms.reduce((sum, n) => sum + n.hours, 0),
      standard: norms.reduce((sum, n) => sum + n.standardHours, 0),
    }),
    [norms]
  );

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear((y) => clampYear(y - 1))}
            disabled={year <= WORKING_NORM_MIN_YEAR}
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
            disabled={year >= WORKING_NORM_MAX_YEAR}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-40"
            title="Następny rok"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="text-sm text-slate-400">
          Suma roku: <span className="text-white font-semibold">{totals.hours} h</span>
          {totals.hours !== totals.standard && (
            <span className="ml-2 text-xs text-slate-500">(domyślnie {totals.standard} h)</span>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300">
          Norma miesiąca jest ustalana ręcznie i obowiązuje w całej sieci — korzysta z niej draft, generator grafiku
          oraz potwierdzanie godzin pracowników. Wartość domyślna to dni robocze × 8 h (z uwzględnieniem świąt,
          także tych przypadających w sobotę). Zmiana normy nie przelicza istniejących już grafików.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Miesiąc</th>
              <th className="text-center py-3 px-4 text-slate-400 font-medium">Domyślna</th>
              <th className="text-center py-3 px-4 text-slate-400 font-medium">Norma (h)</th>
              <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Ostatnia zmiana</th>
              <th className="text-right py-3 px-4 text-slate-400 font-medium">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">Ładowanie...</td></tr>
            ) : norms.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">Brak danych dla roku {year}</td></tr>
            ) : norms.map((norm) => {
              const raw = inputs[norm.month] ?? String(norm.hours);
              const parsed = parseHours(raw);
              const invalid = parsed === null;
              const dirty = !invalid && parsed !== norm.hours;
              const isCustom = norm.persisted && norm.hours !== norm.standardHours;
              const busy = busyMonth === norm.month;

              const lastChangeLabel = norm.updatedAt ? norm.updatedByLabel : norm.createdByLabel;
              const lastChangeDate = formatDateTime(norm.updatedAt ?? norm.createdAt);

              return (
                <tr key={norm.month} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-3 px-4 text-white font-medium">{MONTHS[norm.month - 1]}</td>
                  <td className="py-3 px-4 text-center text-slate-400">{norm.standardHours} h</td>
                  <td className="py-3 px-4 text-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={raw}
                      disabled={busy}
                      onChange={(e) => setInputs((prev) => ({ ...prev, [norm.month]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && dirty) handleSave(norm);
                      }}
                      className={`w-24 px-3 py-1.5 bg-slate-700 border rounded-lg text-center text-white focus:outline-none focus:ring-2 ${
                        invalid
                          ? 'border-red-500 focus:ring-red-500'
                          : dirty
                          ? 'border-amber-500 focus:ring-amber-500'
                          : 'border-slate-600 focus:ring-blue-500'
                      }`}
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isCustom ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400">Ręczna</span>
                    ) : norm.persisted ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400">Domyślna</span>
                    ) : (
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium bg-amber-600/20 text-amber-400"
                        title="Brak zapisu w bazie — używana jest wartość domyślna"
                      >
                        Niezapisana
                      </span>
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
                      <button
                        onClick={() => handleSave(norm)}
                        disabled={!dirty || busy}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:hover:bg-blue-600"
                        title="Zapisz normę"
                      >
                        <Save className="w-4 h-4" />
                        Zapisz
                      </button>
                      <button
                        onClick={() => handleReset(norm)}
                        disabled={busy || (norm.hours === norm.standardHours && norm.persisted && !dirty)}
                        className="p-2 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-30"
                        title="Przywróć wartość domyślną"
                      >
                        <RotateCcw className="w-4 h-4 text-slate-300" />
                      </button>
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
