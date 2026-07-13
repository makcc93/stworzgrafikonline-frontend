import { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Users,
  Check,
  Loader2,
  ChevronRight,
  Save,
  Info,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { employeeHoursConfirmationService } from '@/services/api-provider';
import type { EmployeeHoursConfirmationDTO } from '@/types/employee-hours-confirmation.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parsuje wartość z inputa na liczbę >= 0 (obsługa przecinka jako separatora dziesiętnego) */
function parseHours(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  if (Number.isNaN(value) || value < 0) return null;
  return value;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EmployeeHoursConfirmationStepProps {
  storeId: number;
  /** Rok (kalendarzowy) */
  year: number;
  /** Miesiąc 1-indexed (konwencja backendu) — ostatni miesiąc okresu rozliczeniowego */
  month: number;
  monthName: string;
  /** Wywoływane po kliknięciu "Przejdź dalej" w stopce kreatora (pomijane gdy embedded) */
  onConfirm?: () => void;
  /** Wywoływane po kliknięciu "Wróć" w stopce kreatora (pomijane gdy embedded) */
  onBack?: () => void;
  isConfirming?: boolean;
  /** true gdy komponent jest samodzielną zakładką (np. YourDraft), a nie krokiem
   *  kreatora SchedulePreparationModal - wtedy chowamy stopkę Wróć/Przejdź dalej. */
  embedded?: boolean;
  /** Wywoływane po każdym udanym zapisie, niezależnie od trybu - przydatne do
   *  odświeżenia sumy godzin (np. monthlyNorm) w rodzicu. */
  onSaved?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmployeeHoursConfirmationStep({
  storeId,
  year,
  month,
  monthName,
  onConfirm,
  onBack,
  isConfirming = false,
  embedded = false,
  onSaved,
}: EmployeeHoursConfirmationStepProps) {
  const [records, setRecords] = useState<EmployeeHoursConfirmationDTO[]>([]);
  const [values, setValues] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await employeeHoursConfirmationService.getForMonth(storeId, year, month);
        setRecords(data);
        setValues(
          Object.fromEntries(data.map((r) => [r.employeeId, String(r.confirmedHours)]))
        );
        setSavedOnce(false);
      } catch (e) {
        console.error('[EmployeeHoursConfirmationStep] load error', e);
        setLoadError('Nie udało się pobrać godzin pracowników dla tego miesiąca.');
        toast.error('Błąd podczas ładowania godzin pracowników');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeId, year, month]);

  const updateValue = (employeeId: number, raw: string) => {
    setSavedOnce(false);
    setValues((prev) => ({ ...prev, [employeeId]: raw }));
  };

  const resetToNorm = (record: EmployeeHoursConfirmationDTO) => {
    setSavedOnce(false);
    setValues((prev) => ({ ...prev, [record.employeeId]: String(record.defaultNormHours) }));
  };

  const resetAllToNorm = () => {
    setSavedOnce(false);
    setValues(Object.fromEntries(records.map((r) => [r.employeeId, String(r.defaultNormHours)])));
  };

  // ── Walidacja ──────────────────────────────────────────────────────────────
  const invalidIds = useMemo(
    () => new Set(records.filter((r) => parseHours(values[r.employeeId] ?? '') === null).map((r) => r.employeeId)),
    [records, values]
  );
  const hasInvalid = invalidIds.size > 0;

  const totals = useMemo(() => {
    const totalNorm = records.reduce((sum, r) => sum + r.defaultNormHours, 0);
    const totalConfirmed = records.reduce((sum, r) => {
      const parsed = parseHours(values[r.employeeId] ?? '');
      return sum + (parsed ?? r.defaultNormHours);
    }, 0);
    return { totalNorm, totalConfirmed };
  }, [records, values]);

  // ── Zapis ─────────────────────────────────────────────────────────────────
  const handleSave = async (): Promise<boolean> => {
    if (hasInvalid) {
      toast.error('Popraw nieprawidłowe wartości godzin przed zapisem');
      return false;
    }

    setSaving(true);
    try {
      const confirmations = records.map((r) => ({
        employeeId: r.employeeId,
        confirmedHours: parseHours(values[r.employeeId] ?? '') ?? r.defaultNormHours,
      }));

      const updated = await employeeHoursConfirmationService.saveForMonth(storeId, year, month, {
        confirmations,
      });

      setRecords(updated);
      setValues(Object.fromEntries(updated.map((r) => [r.employeeId, String(r.confirmedHours)])));
      toast.success('Godziny zostały zapisane');
      setSavedOnce(true);
      onSaved?.();
      return true;
    } catch (e) {
      console.error('[EmployeeHoursConfirmationStep] save error', e);
      toast.error('Błąd podczas zapisu godzin');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ── Przejście dalej z auto-zapisem ──────────────────────────────────────────
  const handleGoToSummary = async () => {
    if (!savedOnce) {
      const ok = await handleSave();
      if (!ok) return;
    }
    onConfirm?.();
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        <span className="text-slate-400 text-sm">Ładowanie godzin pracowników...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
        {/* Info banner */}
        <div className="flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/25 rounded-xl px-4 py-3 text-indigo-300 text-xs">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            <strong>{monthName}</strong> to ostatni miesiąc okresu rozliczeniowego. Domyślnie
            każdy pracownik ma limit godzin równy jego <strong>normie etatu</strong>. Możesz
            zmienić tę wartość indywidualnie — algorytm generujący grafik użyje podanej tu
            liczby godzin jako limitu dla tego pracownika w tym miesiącu.
          </p>
        </div>

        {loadError && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-900/20 border border-red-700/40 rounded-xl text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {loadError}
          </div>
        )}

        <section>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              <h3 className="text-white font-semibold text-base">Godziny pracowników</h3>
              <span className="bg-slate-700/60 text-slate-300 text-xs px-2 py-0.5 rounded-full font-medium">
                {records.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetAllToNorm}
                disabled={saving || isConfirming || records.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600/30 hover:bg-slate-600/50 border border-slate-500/40 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Zresetuj wszystkich do normy
              </button>

              <button
                onClick={handleSave}
                disabled={saving || isConfirming || hasInvalid}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  savedOnce
                    ? 'bg-green-600/20 border-green-600/40 text-green-300'
                    : 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-600/40 text-indigo-300 hover:text-white'
                }`}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : savedOnce ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saving ? 'Zapisywanie...' : savedOnce ? 'Zapisano' : 'Zapisz'}
              </button>
            </div>
          </div>

          <p className="text-slate-500 text-xs mb-4">
            Wartość domyślna to norma etatu pracownika w {monthName.toLowerCase()}. Pole edycji
            pozwala ustawić indywidualny limit godzin (np. z powodu zwolnienia, częściowego
            etatu w okresie, wyrównania nadgodzin itp.).
          </p>

          {records.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 bg-slate-800/30 border border-slate-700 border-dashed rounded-xl text-slate-500">
              <Users className="w-6 h-6 opacity-40" />
              <span className="text-sm">Brak aktywnych pracowników w tym sklepie</span>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((r) => {
                const raw = values[r.employeeId] ?? '';
                const parsed = parseHours(raw);
                const isInvalid = invalidIds.has(r.employeeId);
                const isModified =
                  parsed !== null && parsed !== r.defaultNormHours;

                return (
                  <div
                    key={r.employeeId}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
                      isInvalid
                        ? 'bg-red-900/20 border-red-600/40'
                        : isModified
                        ? 'bg-indigo-900/20 border-indigo-600/40'
                        : 'bg-slate-800/50 border-slate-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {r.employeeFirstName} {r.employeeLastName}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Norma: {r.defaultNormHours} h
                        {r.confirmed && !isModified && (
                          <span className="ml-2 text-indigo-400">· zapisano indywidualnie</span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-500 text-[10px] uppercase tracking-wide">
                        Godziny w tym miesiącu
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={raw}
                        onChange={(e) => updateValue(r.employeeId, e.target.value)}
                        className={`w-28 bg-slate-700 border rounded-lg px-3 py-1.5 text-white text-sm text-right focus:outline-none focus:ring-2 ${
                          isInvalid
                            ? 'border-red-600 focus:ring-red-500'
                            : 'border-slate-600 focus:ring-indigo-500'
                        }`}
                      />
                    </div>

                    <button
                      onClick={() => resetToNorm(r)}
                      disabled={parsed === r.defaultNormHours}
                      title="Przywróć normę"
                      className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {isInvalid && (
                      <span className="text-red-400 text-xs flex-shrink-0">Błędna wartość</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {records.length > 0 && (
            <div className="flex items-center justify-end gap-6 mt-3 px-1 text-xs text-slate-500">
              <span>Suma norm: <span className="text-slate-300 font-medium">{totals.totalNorm} h</span></span>
              <span>
                Suma ustawionych godzin:{' '}
                <span className={`font-medium ${totals.totalConfirmed !== totals.totalNorm ? 'text-indigo-300' : 'text-slate-300'}`}>
                  {totals.totalConfirmed} h
                </span>
              </span>
            </div>
          )}
        </section>
      </div>

      {/* ── Footer (tylko w trybie kreatora) ── */}
      {!embedded && (
        <div className="border-t border-slate-700 bg-slate-800/50 px-6 py-4 flex gap-3 flex-shrink-0">
          <button
            onClick={() => onBack?.()}
            disabled={saving || isConfirming}
            className="px-5 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
          >
            Wróć
          </button>

          <button
            onClick={handleGoToSummary}
            disabled={saving || isConfirming || hasInvalid}
            className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Zapisywanie...
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4" />
                Przejdź dalej
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}