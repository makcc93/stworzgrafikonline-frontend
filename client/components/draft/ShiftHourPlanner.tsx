/**
 * ShiftHourPlanner — przesunięcia godzin zmian (np. 09:00 → 08:30) ustawiane w Planowaniu obsady.
 *
 * Konfiguracja jest globalna dla sklepu (ta sama, której używa generowanie grafiku). Przesunięcie
 * wydłuża (albo skraca) zmiany zwykłych pracowników, więc zmienia liczbę godzin na osobę —
 * dlatego efekt dla wybranego miesiąca jest pokazany obok i wchodzi do "Wymagane przez draft".
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Clock, Info, Loader2, Plus, Save, Trash2, Undo2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MONTHS } from '@/utils/calendar';
import { shiftHourModificationService, employeeService } from '@/services/api-provider';
import type { ShiftHourModificationDTO, ShiftHourScope } from '@/types/shift-hour-modification.types';
import type { ShiftHourImpact } from '@/types/shift-hour-impact.types';
import type { ResponseEmployeeDTO } from '@/types/employee.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIME_OPTIONS: { value: string; label: string }[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    TIME_OPTIONS.push({ value: `${hh}:${mm}:00`, label: `${hh}:${mm}` });
  }
}

/** Do pełnej postaci HH:MM:00, z zaokrągleniem do 15 minut. */
const snapToQuarter = (time: string): string => {
  if (!time) return '09:00:00';
  const [h = '09', m = '00'] = time.split(':');
  const snapped = Math.round(parseInt(m, 10) / 15) * 15;
  const mm = String(snapped % 60).padStart(2, '0');
  const hh = String(snapped >= 60 ? (parseInt(h, 10) + 1) % 24 : parseInt(h, 10)).padStart(2, '0');
  return `${hh}:${mm}:00`;
};

/** Klucz porównawczy HH:MM (backend może zwrócić "09:00" albo "09:00:00"). */
const hm = (time: string): string => time.slice(0, 5);

const fmt1 = (value: number) =>
  value.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtSigned = (value: number) => (value > 0 ? `+${fmt1(value)}` : fmt1(value));

const SCOPES: { value: ShiftHourScope; label: string; hint: string }[] = [
  { value: 'START', label: 'Początek', hint: 'Tylko zmiany, które się zaczynają o tej godzinie' },
  { value: 'END', label: 'Koniec', hint: 'Tylko zmiany, które się kończą o tej godzinie' },
  { value: 'BOTH', label: 'Oba', hint: 'Zarówno początek, jak i koniec zmian o tej godzinie' },
];

const scopeOf = (m: ShiftHourModificationDTO): ShiftHourScope => m.scope ?? 'BOTH';

const toMinutes = (time: string): number => {
  const [h = '0', m = '0'] = time.split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
};
const fromMinutes = (total: number): string => {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const fmtDuration = (minutes: number): string => {
  const hours = minutes / 60;
  return `${hours.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} h`;
};

/** Reguły z tą samą godziną oryginalną kolidują, jeśli ich zakresy się nakładają (BOTH nakłada się na wszystko). */
const scopesOverlap = (a: ShiftHourScope, b: ShiftHourScope) => a === 'BOTH' || b === 'BOTH' || a === b;

const snapshot = (mappings: ShiftHourModificationDTO[], excludedIds: number[]) =>
  JSON.stringify({
    m: [...mappings].map((x) => `${x.originalHour}>${x.modifiedHour}@${scopeOf(x)}`).sort(),
    e: [...excludedIds].sort((a, b) => a - b),
  });

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ShiftHourPlannerProps {
  storeId: number;
  year: number;
  /** 0-11 */
  month: number;
  /** Szacowany wpływ na wybrany miesiąc (z zapisanej konfiguracji); null = jeszcze nie załadowano. */
  impact: ShiftHourImpact | null;
  impactLoading: boolean;
  /** Po zapisie konfiguracji — rodzic odświeża wpływ i kafelki godzin. */
  onSaved: () => void;
}

export function ShiftHourPlanner({ storeId, year, month, impact, impactLoading, onSaved }: ShiftHourPlannerProps) {
  const [mappings, setMappings] = useState<ShiftHourModificationDTO[]>([]);
  const [excludedIds, setExcludedIds] = useState<number[]>([]);
  const [employees, setEmployees] = useState<ResponseEmployeeDTO[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [hoursResp, exclResp, empResp] = await Promise.all([
        shiftHourModificationService.getHours(storeId),
        shiftHourModificationService.getExcludedEmployees(storeId),
        employeeService.getAll(storeId, {}, { page: 0, size: 500 }),
      ]);

      const loadedMappings = (hoursResp.hours ?? []).map((m) => ({
        originalHour: snapToQuarter(m.originalHour),
        modifiedHour: snapToQuarter(m.modifiedHour),
        scope: (m.scope ?? 'BOTH') as ShiftHourScope,
      }));
      const loadedExcluded = exclResp.excludedEmployeeIds ?? [];

      setMappings(loadedMappings);
      setExcludedIds(loadedExcluded);
      setEmployees((empResp as any).content ?? []);
      setSavedSnapshot(snapshot(loadedMappings, loadedExcluded));
    } catch (e) {
      console.error('[ShiftHourPlanner] load error', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const dirty = snapshot(mappings, excludedIds) !== savedSnapshot;
  const conflicts = useMemo(() => {
    const set = new Set<number>();
    mappings.forEach((a, i) =>
      mappings.forEach((b, j) => {
        if (i < j && a.originalHour === b.originalHour && scopesOverlap(scopeOf(a), scopeOf(b))) {
          set.add(i);
          set.add(j);
        }
      })
    );
    return set;
  }, [mappings]);
  const hasDuplicates = conflicts.size > 0;

  const addMapping = () =>
    setMappings((prev) => [...prev, { originalHour: '09:00:00', modifiedHour: '08:30:00', scope: 'START' }]);
  const removeMapping = (idx: number) => setMappings((prev) => prev.filter((_, i) => i !== idx));
  const updateMapping = (idx: number, field: 'originalHour' | 'modifiedHour' | 'scope', value: string) =>
    setMappings((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  const toggleExcluded = (id: number) =>
    setExcludedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleRevert = () => {
    // Powrót do ostatnio zapisanego stanu — przeładowanie z serwera.
    load();
  };

  const handleSave = async () => {
    if (hasDuplicates) {
      toast.error('Dwie reguły dotyczą tej samej godziny i zakresu – popraw zaznaczone reguły');
      return;
    }

    setSaving(true);
    try {
      // Sekwencyjnie — przy pierwszym zapisie sklepu równoległe żądania tworzyłyby dwie konfiguracje.
      await shiftHourModificationService.updateHours(storeId, { hours: mappings });
      await shiftHourModificationService.updateExcludedEmployees(storeId, { excludedEmployeeIds: excludedIds });

      setSavedSnapshot(snapshot(mappings, excludedIds));
      toast.success('Zapisano przesunięcia godzin zmian');
      onSaved();
    } catch (e) {
      console.error('[ShiftHourPlanner] save error', e);
      toast.error(e instanceof Error ? e.message : 'Nie udało się zapisać konfiguracji');
    } finally {
      setSaving(false);
    }
  };

  const impactByRule = useMemo(() => {
    const map = new Map<string, ShiftHourImpact['rules'][number]>();
    impact?.rules.forEach((r) => map.set(`${hm(r.originalHour)}>${hm(r.modifiedHour)}@${r.scope ?? 'BOTH'}`, r));
    return map;
  }, [impact]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 bg-[#0f172a] border border-slate-700 rounded-2xl">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        <span className="text-slate-400 text-sm">Ładowanie konfiguracji godzin zmian...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-5 flex items-center justify-between gap-4">
        <p className="text-sm text-red-200">Nie udało się pobrać konfiguracji godzin zmian.</p>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-semibold flex-shrink-0"
        >
          Ponów
        </button>
      </div>
    );
  }

  const extraPerEmployee = impact?.extraHoursPerEmployee ?? 0;

  return (
    <div className="space-y-5">
      {/* ===== Efekt w wybranym miesiącu ===== */}
      <section className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">
            Efekt w {MONTHS[month]} {year}
          </h4>
          {impactLoading && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
        </div>

        {impact && impact.rules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Na pracownika</span>
              <p className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-3xl font-black text-blue-300 font-mono tabular-nums">{fmtSigned(extraPerEmployee)}</span>
                <span className="text-sm text-slate-500">h/os.</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">doliczane do „Wymagane przez draft”</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Łącznie</span>
              <p className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-3xl font-black text-slate-200 font-mono tabular-nums">{fmtSigned(impact.extraHoursTotal)}</span>
                <span className="text-sm text-slate-500">h</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">w całym sklepie, w tym miesiącu</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Objęci</span>
              <p className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-3xl font-black text-slate-200 font-mono tabular-nums">{impact.eligibleEmployees}</span>
                <span className="text-sm text-slate-500">z {impact.totalEmployees} os.</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">bez wykluczonych i specjalnych</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {impactLoading ? 'Liczenie efektu...' : 'Brak zapisanych reguł — przesunięcia nie zmieniają godzin w tym miesiącu.'}
          </p>
        )}

        <p className="flex items-start gap-2 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span>
            Estymacja z zapisanych draftów tego miesiąca i zapisanej konfiguracji (zmiany zaczynają się tam, gdzie
            zapotrzebowanie rośnie, i kończą tam, gdzie spada). Zakłada równy rozkład zmian między pracowników;
            nie uwzględnia wniosków pracowników ani dzielenia zmian dłuższych niż 12 h.
          </span>
        </p>
      </section>

      {/* ===== Reguły ===== */}
      <section className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-slate-700 bg-slate-900/60 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600/15 border border-blue-600/30 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-black text-white tracking-tight">Przesunięcia godzin zmian</h3>
              <p className="text-xs text-slate-400">
                Wybierz, czy reguła dotyczy początku, końca, czy obu — np. 14:00 → 13:45 tylko dla początku: zmiany
                14–20 zaczną się o 13:45, a zmiany 8–14 zostaną bez zmian. Dokładność do 15 minut, ustawienia globalne dla sklepu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={addMapping}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border border-blue-600/40 bg-blue-600/15 text-blue-300 hover:bg-blue-600/25 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Dodaj regułę
          </button>
        </div>

        <div className="p-5">
          {mappings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 bg-slate-800/30 border border-slate-700 border-dashed rounded-xl text-slate-500">
              <Clock className="w-6 h-6 opacity-40" />
              <span className="text-sm">Brak reguł – godziny zmian nie będą modyfikowane</span>
            </div>
          ) : (
            <div className="space-y-3">
              {mappings.map((m, idx) => {
                const scope = scopeOf(m);
                const isConflict = conflicts.has(idx);
                const noChange = m.originalHour === m.modifiedHour;
                const ruleImpact = impactByRule.get(`${hm(m.originalHour)}>${hm(m.modifiedHour)}@${scope}`);

                const orig = toMinutes(m.originalHour);
                const mod = toMinutes(m.modifiedHour);
                // Wcześniejszy start / późniejszy koniec = dłuższa zmiana.
                const startDelta = scope !== 'END' ? orig - mod : 0;
                const endDelta = scope !== 'START' ? mod - orig : 0;

                const SAMPLE = 6 * 60; // przykładowa zmiana 6-godzinna
                const examples: { key: string; label: string; from: string; to: string; before: number; after: number }[] = [];
                if (scope !== 'END') {
                  const e = orig + SAMPLE;
                  examples.push({
                    key: 'start', label: 'Zmiana zaczynająca się o ' + fromMinutes(orig),
                    from: `${fromMinutes(orig)}–${fromMinutes(e)}`, to: `${fromMinutes(mod)}–${fromMinutes(e)}`,
                    before: SAMPLE, after: SAMPLE + startDelta,
                  });
                }
                if (scope !== 'START') {
                  const b = orig - SAMPLE;
                  examples.push({
                    key: 'end', label: 'Zmiana kończąca się o ' + fromMinutes(orig),
                    from: `${fromMinutes(b)}–${fromMinutes(orig)}`, to: `${fromMinutes(b)}–${fromMinutes(mod)}`,
                    before: SAMPLE, after: SAMPLE + endDelta,
                  });
                }
                const delta = (scope === 'START' ? startDelta : scope === 'END' ? endDelta : null);

                return (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-2xl border p-4 space-y-3.5 transition-colors',
                      isConflict ? 'bg-red-900/15 border-red-600/50' : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                    )}
                  >
                    {/* Wiersz 1: numer, zakres, usuń */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-xs font-black flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>

                      <div className="inline-flex rounded-xl bg-slate-900/80 border border-slate-700 p-0.5" role="radiogroup" aria-label="Zakres reguły">
                        {SCOPES.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={scope === opt.value}
                            title={opt.hint}
                            disabled={saving}
                            onClick={() => updateMapping(idx, 'scope', opt.value)}
                            className={cn(
                              'px-3.5 py-1.5 rounded-[10px] text-xs font-bold uppercase tracking-wide transition-all',
                              scope === opt.value
                                ? 'bg-blue-600 text-white shadow shadow-blue-600/30'
                                : 'text-slate-400 hover:text-slate-200'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {isConflict && <span className="text-red-400 text-xs font-semibold">Koliduje z inną regułą!</span>}
                      {!isConflict && noChange && <span className="text-amber-400 text-xs font-semibold">Bez zmiany</span>}

                      <div className="flex-1" />
                      <button
                        type="button"
                        onClick={() => removeMapping(idx)}
                        disabled={saving}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex-shrink-0"
                        title="Usuń regułę"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Wiersz 2: godziny + chip różnicy */}
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500 text-[10px] uppercase tracking-wide">
                          {scope === 'START' ? 'Zmiany zaczynające się o' : scope === 'END' ? 'Zmiany kończące się o' : 'Godzina oryginalna'}
                        </span>
                        <select
                          value={m.originalHour}
                          onChange={(e) => updateMapping(idx, 'originalHour', e.target.value)}
                          disabled={saving}
                          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          {TIME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0 mb-3" />

                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500 text-[10px] uppercase tracking-wide">Przesuń na</span>
                        <select
                          value={m.modifiedHour}
                          onChange={(e) => updateMapping(idx, 'modifiedHour', e.target.value)}
                          disabled={saving}
                          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          {TIME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {!noChange && delta !== null && (
                        <span
                          className={cn(
                            'mb-1.5 px-2.5 py-1 rounded-full text-xs font-bold border',
                            delta > 0
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                          )}
                        >
                          {delta > 0 ? 'Dłuższa' : 'Krótsza'} o {Math.abs(delta)} min
                        </span>
                      )}
                      {!noChange && delta === null && (
                        <span className="mb-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-blue-500/15 text-blue-300 border-blue-500/30">
                          Początek i koniec
                        </span>
                      )}
                    </div>

                    {/* Podgląd na żywo */}
                    {!noChange && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {examples.map((ex) => (
                          <div key={ex.key} className="rounded-xl bg-slate-900/70 border border-slate-700/80 px-3.5 py-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-slate-500">{ex.label}</p>
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-mono tabular-nums">
                              <span className="text-slate-400 line-through decoration-slate-600">{ex.from}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-white font-bold">{ex.to}</span>
                              <span className="text-xs text-slate-500 font-sans">
                                ({fmtDuration(ex.before)} → <span className="text-slate-300 font-semibold">{fmtDuration(ex.after)}</span>)
                              </span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {ruleImpact && !dirty && (
                      <p className="text-xs text-slate-400 tabular-nums border-t border-slate-700/60 pt-2.5">
                        W {MONTHS[month]}: {scope !== 'END' && <>{ruleImpact.shiftsStarting} zmian startuje</>}
                        {scope === 'BOTH' && ' · '}
                        {scope !== 'START' && <>{ruleImpact.shiftsEnding} kończy się</>}
                        {' · '}
                        <span className="font-bold text-slate-200">{fmtSigned(ruleImpact.extraHours)} h</span> łącznie
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== Wykluczeni pracownicy ===== */}
      <section className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3 p-5 border-b border-slate-700 bg-slate-900/60 rounded-t-2xl">
          <div className="w-9 h-9 rounded-lg bg-amber-600/15 border border-amber-600/30 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Pracownicy wykluczeni z przesunięć
              {excludedIds.length > 0 && (
                <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full font-medium">
                  {excludedIds.length}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Zaznaczeni pracownicy nie są objęci przesunięciem — ich zmiany zostają bez zmian. Pracownicy specjalni
              mają stałą długość zmiany (zmiana tylko się przesuwa), więc nie zmieniają liczby godzin.
            </p>
          </div>
        </div>

        <div className="p-5">
          {employees.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">Brak pracowników do wyświetlenia</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {employees.map((emp) => {
                const isExcluded = excludedIds.includes(emp.id);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => toggleExcluded(emp.id)}
                    disabled={saving}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all',
                      isExcluded
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors',
                        isExcluded ? 'bg-amber-500 border-amber-500' : 'border-slate-600'
                      )}
                    >
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
              type="button"
              onClick={() => setExcludedIds([])}
              className="mt-3 text-xs text-slate-500 hover:text-slate-400 underline underline-offset-2"
            >
              Odznacz wszystkich ({excludedIds.length})
            </button>
          )}
        </div>
      </section>

      {/* ===== Pasek zapisu ===== */}
      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl px-5 py-3.5 shadow-2xl shadow-black/40">
        <p className={cn('text-sm flex items-center gap-2', dirty ? 'font-bold text-amber-300' : 'text-slate-400')}>
          {dirty ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Niezapisane zmiany — efekt powyżej dotyczy ostatnio zapisanej konfiguracji
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              Konfiguracja zapisana
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRevert}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-600 text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <Undo2 className="w-4 h-4" />
            Cofnij zmiany
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty || hasDuplicates}
            className={cn(
              'px-6 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 text-sm uppercase',
              dirty && !saving && !hasDuplicates
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}
