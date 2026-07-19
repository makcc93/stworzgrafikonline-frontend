import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Users,
  Clock,
  Check,
  Loader2,
  ArrowRight,
  Info,
  ChevronRight,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { shiftHourModificationService, employeeService } from '@/services/api-provider';
import type { ShiftHourModificationDTO } from '@/types/shift-hour-modification.types';
import type { ResponseEmployeeDTO } from '@/types/employee.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const generateTimeOptions = (): { value: string; label: string }[] => {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      options.push({ value: `${hh}:${mm}:00`, label: `${hh}:${mm}` });
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const snapToQuarter = (time: string): string => {
  if (!time) return '09:00:00';
  const [h = '09', m = '00'] = time.split(':');
  const minutes = parseInt(m, 10);
  const snapped = Math.round(minutes / 15) * 15;
  const mm = (snapped % 60).toString().padStart(2, '0');
  const hh = (snapped >= 60 ? (parseInt(h, 10) + 1) % 24 : parseInt(h, 10))
    .toString()
    .padStart(2, '0');
  return `${hh}:${mm}:00`;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ShiftHourConfigStepProps {
  storeId: number;
  onConfirm: () => void;
  onBack: () => void;
  isConfirming?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShiftHourConfigStep({
  storeId,
  onConfirm,
  onBack,
  isConfirming = false,
}: ShiftHourConfigStepProps) {
  const [mappings, setMappings] = useState<ShiftHourModificationDTO[]>([]);
  const [excludedIds, setExcludedIds] = useState<number[]>([]);
  const [employees, setEmployees] = useState<ResponseEmployeeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [hoursResp, exclResp, empResp] = await Promise.all([
          shiftHourModificationService
            .getHours(storeId)
            .catch(() => ({ hours: [], excludedEmployeeIds: [] as number[] })),
          shiftHourModificationService
            .getExcludedEmployees(storeId)
            .catch(() => ({ hours: [], excludedEmployeeIds: [] as number[] })),
          employeeService
            .getAll(storeId, {}, { page: 0, size: 500 })
            .catch(() => ({ content: [] as ResponseEmployeeDTO[] })),
        ]);

        setMappings(
          (hoursResp.hours ?? []).map((m) => ({
            originalHour: snapToQuarter(m.originalHour),
            modifiedHour: snapToQuarter(m.modifiedHour),
          }))
        );
        setExcludedIds(exclResp.excludedEmployeeIds ?? []);
        setEmployees((empResp as any).content ?? []);
      } catch (e) {
        console.error('[ShiftHourConfigStep] load error', e);
        toast.error('Błąd podczas ładowania konfiguracji godzin');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeId]);

  // ── Mapping mutations ─────────────────────────────────────────────────────
  const addMapping = () => {
    setSavedOnce(false);
    setMappings((prev) => [...prev, { originalHour: '09:00:00', modifiedHour: '09:00:00' }]);
  };

  const removeMapping = (idx: number) => {
    setSavedOnce(false);
    setMappings((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateMapping = (idx: number, field: 'originalHour' | 'modifiedHour', value: string) => {
    setSavedOnce(false);
    setMappings((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };

  // ── Excluded employees ────────────────────────────────────────────────────
  const toggleExcluded = (id: number) => {
    setSavedOnce(false);
    setExcludedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ── Save config — sequential to avoid 500 on first-time records ──────────
  // Zwraca true jeśli zapis się powiódł, false w przeciwnym razie.
  const handleSave = async (): Promise<boolean> => {
    const originals = mappings.map((m) => m.originalHour);
    if (originals.length !== new Set(originals).size) {
      toast.error('Godziny oryginalne muszą być unikalne – usuń duplikaty');
      return false;
    }

    setSaving(true);
    let hoursOk = false;
    let exclOk = false;

    try {
      await shiftHourModificationService.updateHours(storeId, { hours: mappings });
      hoursOk = true;
    } catch (e: any) {
      console.error('[ShiftHourConfigStep] updateHours error', e);
    }

    try {
      await shiftHourModificationService.updateExcludedEmployees(storeId, {
        excludedEmployeeIds: excludedIds,
      });
      exclOk = true;
    } catch (e: any) {
      console.error('[ShiftHourConfigStep] updateExcludedEmployees error', e);
    }

    setSaving(false);

    if (hoursOk && exclOk) {
      toast.success('Konfiguracja zapisana');
      setSavedOnce(true);
    } else if (hoursOk || exclOk) {
      toast.warning('Zapisano częściowo – spróbuj ponownie');
    } else {
      toast.error('Błąd podczas zapisu konfiguracji');
    }

    return hoursOk && exclOk;
  };

  // ── Przejdź do podsumowania z auto-zapisem ────────────────────────────────
  // Jeśli użytkownik nie kliknął "Zapisz" przy regułach, zapis nastąpi
  // automatycznie przed przejściem do kroku 3.
  const handleGoToSummary = async () => {
    if (!savedOnce) {
      const ok = await handleSave();
      if (!ok) return; // zostajemy na kroku 2 przy błędzie
    }
    onConfirm();
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        <span className="text-slate-400 text-sm">Ładowanie konfiguracji godzin...</span>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-8">

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/25 rounded-xl px-4 py-3 text-blue-300 text-xs">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Ustawienia są <strong>globalne dla sklepu</strong> – zostaną zapisane i domyślnie
            załadowane przy kolejnym grafiku. Możesz je zawsze zmienić przed wygenerowaniem.
          </p>
        </div>

        {/* ── Hour Mappings ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-400" />
              <h3 className="text-white font-semibold text-base">Modyfikacje godzin</h3>
            </div>

            <div className="flex items-center gap-2">
              {/* Save — lives next to the rules, not in the footer */}
              <button
                onClick={handleSave}
                disabled={saving || isConfirming}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  savedOnce
                    ? 'bg-green-600/20 border-green-600/40 text-green-300'
                    : 'bg-slate-600/30 hover:bg-slate-600/50 border-slate-500/40 text-slate-300 hover:text-white'
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

              <button
                onClick={addMapping}
                disabled={saving || isConfirming}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 text-green-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                Dodaj regułę
              </button>
            </div>
          </div>

          <p className="text-slate-500 text-xs mb-4">
            Zdefiniuj podmiany godzin (z dokładnością do 15 minut). Np. 09:00 → 08:30
            oznacza, że każda zmiana zaczynająca się o 9:00 zostanie przesunięta na 8:30.
          </p>

          {mappings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 bg-slate-800/30 border border-slate-700 border-dashed rounded-xl text-slate-500">
              <Clock className="w-6 h-6 opacity-40" />
              <span className="text-sm">Brak reguł – godziny nie będą modyfikowane</span>
              <button
                onClick={addMapping}
                className="mt-1 text-xs text-green-400 hover:text-green-300 underline underline-offset-2"
              >
                Dodaj pierwszą regułę
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {mappings.map((m, idx) => {
                const isDuplicate =
                  mappings.findIndex((x, i) => i !== idx && x.originalHour === m.originalHour) !== -1;

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
                      isDuplicate
                        ? 'bg-red-900/20 border-red-600/40'
                        : 'bg-slate-800/50 border-slate-700'
                    }`}
                  >
                    <span className="text-slate-500 text-xs w-5 text-right flex-shrink-0">
                      {idx + 1}.
                    </span>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-500 text-[10px] uppercase tracking-wide">Oryginalna</span>
                      <select
                        value={m.originalHour}
                        onChange={(e) => updateMapping(idx, 'originalHour', e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0 mt-4" />

                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-500 text-[10px] uppercase tracking-wide">Zmieniona</span>
                      <select
                        value={m.modifiedHour}
                        onChange={(e) => updateMapping(idx, 'modifiedHour', e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                      >
                        {TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {isDuplicate && (
                      <span className="text-red-400 text-xs ml-1 flex-shrink-0">Duplikat!</span>
                    )}

                    <div className="flex-1" />

                    <button
                      onClick={() => removeMapping(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex-shrink-0"
                      title="Usuń regułę"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Excluded Employees ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="text-white font-semibold text-base">
              Pracownicy wykluczeni z modyfikacji
            </h3>
            {excludedIds.length > 0 && (
              <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full font-medium">
                {excludedIds.length}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs mb-4">
            Zaznaczeni pracownicy nie będą objęci globalną podmianą godzin – ich zmiany
            pozostaną bez zmian.
          </p>

          {employees.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              Brak pracowników do wyświetlenia
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 pb-1">
              {employees.map((emp) => {
                const isExcluded = excludedIds.includes(emp.id);
                return (
                  <button
                    key={emp.id}
                    onClick={() => toggleExcluded(emp.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      isExcluded
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                      isExcluded ? 'bg-amber-500 border-amber-500' : 'border-slate-600'
                    }`}>
                      {isExcluded && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-sm truncate">{emp.firstName} {emp.lastName}</span>
                  </button>
                );
              })}
            </div>
          )}

          {excludedIds.length > 0 && (
            <button
              onClick={() => setExcludedIds([])}
              className="mt-2 text-xs text-slate-500 hover:text-slate-400 underline underline-offset-2"
            >
              Odznacz wszystkich ({excludedIds.length})
            </button>
          )}
        </section>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-700 bg-slate-800/50 px-6 py-4 flex gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          disabled={saving || isConfirming}
          className="px-5 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
        >
          Wróć
        </button>

        <button
          onClick={handleGoToSummary}
          disabled={saving || isConfirming}
          className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-green-500/30 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
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
    </div>
  );
}
