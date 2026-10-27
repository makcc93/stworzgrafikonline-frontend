/* VERSION-TOOLTIP-4 */
import type { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PeriodEstimationProps {
  confirmedDraftHours: number;
  liveTemplateDraftHours: number | null;
  activeNonWarehouseCount: number;
  totalEmployeeNorm: number;
  totalVacationDays: number;
  totalDelegationDays: number;
  /** Najwyższa obsada w pojedynczej godzinie (opcjonalnie) — wyświetlana jako czwarty wskaźnik. */
  peakStaff?: number | null;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Liczba z jednym miejscem po przecinku w polskim formacie, np. 155,2. */
const fmt1 = (value: number) =>
  value.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const fmtSigned = (value: number) => (value > 0 ? `+${fmt1(value)}` : fmt1(value));

function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border border-slate-400 text-slate-400 text-[11px] font-bold cursor-help bg-transparent flex-shrink-0 hover:text-white hover:border-white transition-colors"
        >
          ?
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

export function PeriodEstimation({
  confirmedDraftHours,
  liveTemplateDraftHours,
  activeNonWarehouseCount,
  totalEmployeeNorm,
  totalVacationDays,
  totalDelegationDays,
  peakStaff = null,
}: PeriodEstimationProps) {
  if (activeNonWarehouseCount === 0) return null;

  const n = activeNonWarehouseCount;

  const confirmedPerEmployee = round1(confirmedDraftHours / n);

  const livePerEmployee =
    liveTemplateDraftHours !== null ? round1(liveTemplateDraftHours / n) : null;

  const liveDeltaPerEmployee =
    livePerEmployee !== null ? round1(livePerEmployee - confirmedPerEmployee) : null;

  const avgNormPerEmployee = round1(totalEmployeeNorm / n);
  const totalAbsenceHours = (totalVacationDays + totalDelegationDays) * 8;
  const availablePerEmployee = round1((totalEmployeeNorm - totalAbsenceHours) / n);

  const balance = round1(availablePerEmployee - confirmedPerEmployee);
  const liveBalance = livePerEmployee !== null ? round1(availablePerEmployee - livePerEmployee) : null;
  const isOverloaded = balance < 0;
  const isBalanced = Math.abs(balance) <= 5;

  const statusColor = isOverloaded
    ? 'text-red-400'
    : isBalanced
    ? 'text-emerald-400'
    : 'text-amber-400';

  const statusLabel = isOverloaded
    ? 'Zaplanowałeś więcej niż dostępna norma'
    : isBalanced
    ? 'Plan jest optymalny względem normy'
    : 'Możesz zwiększyć planowanie';

  const balanceTileClasses = isOverloaded
    ? 'bg-red-900/20 border-red-700/40'
    : isBalanced
    ? 'bg-emerald-900/20 border-emerald-700/40'
    : 'bg-amber-900/20 border-amber-700/40';

  return (
    <section
      aria-label="Szacowanie realizacji draftu"
      className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">
          Szacowanie realizacji draftu
        </h4>
        <span className={`text-sm font-bold ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${peakStaff !== null ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-3`}>
        {/* ===== Wymagane przez draft ===== */}
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Wymagane przez draft
            </span>
            <InfoTip label="Co oznacza „Wymagane przez draft”?">
              Szacowana liczba godzin pracy na osobę zależna od planowania obsady. Wartość ta nie uwzględnia urlopów i delegacji.
            </InfoTip>
          </div>
          <p className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-3xl font-black text-blue-300 font-mono tabular-nums">{fmt1(confirmedPerEmployee)}</span>
            <span className="text-sm text-slate-500">h/os.</span>
            {liveDeltaPerEmployee !== null && liveDeltaPerEmployee !== 0 && (
              <span
                className={`text-xs font-bold tabular-nums ${liveDeltaPerEmployee > 0 ? 'text-amber-400' : 'text-sky-300'}`}
              >
                {fmtSigned(liveDeltaPerEmployee)} po zapisie
              </span>
            )}
          </p>
          <p className="text-xs text-emerald-400/80 mt-1">
            ✓ {confirmedDraftHours} h (baza) ÷ {n} prac.
          </p>
          {liveDeltaPerEmployee === 0 && livePerEmployee !== null && (
            <p className="text-xs text-slate-500 mt-0.5">Niezapisane zmiany nie zmieniają sumy godzin</p>
          )}
        </div>

        {/* ===== Dostępne na pracownika ===== */}
        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Dostępne na pracownika
            </span>
            <InfoTip label="Co oznacza „Dostępne na pracownika”?">
              Orientacyjna dostępna liczba godzin na jednego pracownika.
              Wartość ta skorygowana jest o godziny z urlopów i delegacji/nieobecności. Ostateczna łączna suma godzin w grafiku będzie
              większa, jeśli pracownik korzysta z urlopu lub pracuje w
              delegacji.
            </InfoTip>
          </div>
          <p className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-emerald-300 font-mono tabular-nums">{fmt1(availablePerEmployee)}</span>
            <span className="text-sm text-slate-500">h/os.</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Norma {fmt1(avgNormPerEmployee)} h/os. · urlopy {totalVacationDays} d · delegacje/nieobecności {totalDelegationDays} d
          </p>
        </div>

        {/* ===== Bilans ===== */}
        <div className={`border rounded-xl p-3.5 ${balanceTileClasses}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Bilans</span>
            <InfoTip label="Jak liczony jest bilans?">
              Różnica między dostępnymi godzinami na pracownika a godzinami wymaganymi przez zapisany draft.
              Wartość dodatnia oznacza, że możesz zaplanować więcej obsady, ujemna — że brakuje godzin.
            </InfoTip>
          </div>
          <p className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-black font-mono tabular-nums ${statusColor}`}>{fmtSigned(balance)}</span>
            <span className="text-sm text-slate-500">h/os.</span>
          </p>
          <p className={`text-xs mt-1 ${statusColor}`}>
            {isOverloaded ? '▼ brakuje' : '▲ możliwe do zaplanowania'} względem dostępnej normy
          </p>
          {liveBalance !== null && liveBalance !== balance && (
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              po zapisie: <span className="font-bold text-slate-200">{fmtSigned(liveBalance)} h/os.</span>
            </p>
          )}
        </div>

        {/* ===== Szczyt obsady ===== */}
        {peakStaff !== null && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Szczyt obsady</span>
            </div>
            <p className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-cyan-300 font-mono tabular-nums">{peakStaff}</span>
              <span className="text-sm text-slate-500">os.</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">najwyższa obsada w jednej godzinie</p>
          </div>
        )}
      </div>
    </section>
  );
}