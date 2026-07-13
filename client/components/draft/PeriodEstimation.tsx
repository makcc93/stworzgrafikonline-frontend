/* VERSION-TOOLTIP-3 */
import { useState } from 'react';
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
}

export function PeriodEstimation({
  confirmedDraftHours,
  liveTemplateDraftHours,
  activeNonWarehouseCount,
  totalEmployeeNorm,
  totalVacationDays,
  totalDelegationDays,
}: PeriodEstimationProps) {
  if (activeNonWarehouseCount === 0) return null;

  const n = activeNonWarehouseCount;

  const confirmedPerEmployee = Math.round((confirmedDraftHours / n) * 10) / 10;

  const livePerEmployee =
    liveTemplateDraftHours !== null
      ? Math.round((liveTemplateDraftHours / n) * 10) / 10
      : null;

  const liveDeltaPerEmployee =
    livePerEmployee !== null
      ? Math.round((livePerEmployee - confirmedPerEmployee) * 10) / 10
      : null;

  const avgNormPerEmployee = Math.round((totalEmployeeNorm / n) * 10) / 10;
  const totalAbsenceHours = (totalVacationDays + totalDelegationDays) * 8;
  const availablePerEmployee =
    Math.round(((totalEmployeeNorm - totalAbsenceHours) / n) * 10) / 10;

  const difference =
    Math.round((availablePerEmployee - confirmedPerEmployee) * 10) / 10;
  const isOverloaded = difference < 0;
  const isBalanced = Math.abs(difference) <= 5;

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

  return (
    <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xl font-black uppercase tracking-widest text-slate-400">
          Szacowanie realizacji draftu
        </h4>
        <span className={`text-[15px] font-bold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* ===== Wymagane przez draft ===== */}
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[15px] text-slate-400 uppercase tracking-widest">
              Wymagane przez draft
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: '1.5px solid #94a3b8',
                    color: '#94a3b8',
                    fontSize: 11,
                    fontWeight: 'bold',
                    cursor: 'help',
                    background: 'transparent',
                    flexShrink: 0,
                  }}
                >
                  ?
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Szacowana liczba godzin pracy na osobę zależna od planowania obsady.
              </TooltipContent>
            </Tooltip>
          </div>

          <p className="text-4xl font-black text-blue-300 font-mono">
            {confirmedPerEmployee}
            <span className="text-xl ml-1 opacity-50">h/os.</span>
          </p>

          <div className="text-[15px] text-slate-500 mt-1 space-y-0.5">
            <p className="text-emerald-400/80">
              ✓ {confirmedDraftHours} h (baza) ÷ {n} prac.
            </p>
            {liveDeltaPerEmployee !== null && liveDeltaPerEmployee !== 0 && (
              <p className={liveDeltaPerEmployee > 0 ? 'text-amber-400/80' : 'text-slate-400/70'}>
                {liveDeltaPerEmployee > 0
                  ? `▲ +${liveDeltaPerEmployee} h/os po zapisie szablonów`
                  : `▼ ${liveDeltaPerEmployee} h/os po zapisie szablonów`}
              </p>
            )}
            {liveDeltaPerEmployee === 0 && livePerEmployee !== null && (
              <p className="text-slate-500/60">Szablony zsynchronizowane z bazą</p>
            )}
          </div>
        </div>

        {/* ===== Dostępne na pracownika ===== */}
        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[15px] text-slate-400 uppercase tracking-widest">
              Dostępne na pracownika
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: '1.5px solid #94a3b8',
                    color: '#94a3b8',
                    fontSize: 11,
                    fontWeight: 'bold',
                    cursor: 'help',
                    background: 'transparent',
                    flexShrink: 0,
                  }}
                >
                  ?
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Orientacyjna dostępna liczba godzin na jednego pracownika.
                Wartość ta skorygowana jest o godziny z urlopów i delegacji/nieobecności. Ostateczna łączna suma godzin w grafiku będzie
                większa, jeśli pracownik korzysta z urlopu lub pracuje w
                delegacji.
              </TooltipContent>
            </Tooltip>
          </div>

          <p className="text-4xl font-black text-emerald-300 font-mono">
            {availablePerEmployee}
            <span className="text-xl ml-1 opacity-50">h/os.</span>
          </p>
          <div className="text-[15px] text-slate-500 mt-1 space-y-0.5">
            <p>Norma: {avgNormPerEmployee} h/os.</p>
            <p>
              Urlopy: {totalVacationDays} d · Delegacje/nieobecności:{' '}
              {totalDelegationDays} d
            </p>
          </div>
        </div>
      </div>

      <div className={`text-center text-xs font-bold ${statusColor}`}>
        {isOverloaded ? '▼' : '▲'} {Math.abs(difference)} h/os.{' '}
        {isOverloaded ? 'brakuje' : 'możliwe do zaplanowania'} względem
        dostępnej normy {availablePerEmployee} h/os.
      </div>
    </div>
  );
}