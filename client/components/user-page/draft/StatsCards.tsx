/**
 * StatsCards Component
 * Displays draft statistics for the month
 * Shows completion %, average demand, and peak day info
 */

import { MONTHS } from '@/utils/calendar';
import type { ResponseDemandDraftDTO } from '@/types/draft.types';
import { parseDateFromBackend } from '@/utils/draft.utils';

interface StatsCardsProps {
  drafts: ResponseDemandDraftDTO[];
  year: number;
  month: number;
}

export function StatsCards({ drafts, year, month }: StatsCardsProps) {
  // Helper functions
  const getTotalDaysInMonth = () => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getAverageDemand = () => {
    if (drafts.length === 0) return 0;
    const total = drafts.reduce(
      (sum, d) => sum + d.hourlyDemand.reduce((a, b) => a + b, 0),
      0
    );
    const totalHours = drafts.length * 24;
    return totalHours > 0 ? Math.round(total / totalHours) : 0;
  };

  const getPeakDay = () => {
    if (drafts.length === 0) return { date: '', demand: 0 };

    let maxDemand = 0;
    let peakDraft: ResponseDemandDraftDTO | null = null;

    drafts.forEach((d) => {
      const dayTotal = d.hourlyDemand.reduce((a, b) => a + b, 0);
      if (dayTotal > maxDemand) {
        maxDemand = dayTotal;
        peakDraft = d;
      }
    });

    if (!peakDraft) return { date: '', demand: 0 };

    const date = parseDateFromBackend(peakDraft.draftDate);
    return {
      date: `${date.getDate()}`,
      demand: maxDemand,
    };
  };

  // Calculate stats
  const totalDays = getTotalDaysInMonth();
  const peakDay = getPeakDay();
  const completionPercent = Math.round((drafts.length / totalDays) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Completion Progress */}
      <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-700 rounded-xl p-4 hover:shadow-lg hover:shadow-blue-500/20 transition-shadow">
        <p className="text-xs text-slate-400 mb-1">Grafiki w Miesiącu</p>
        <p className="text-3xl font-bold text-blue-400">
          {drafts.length}
          <span className="text-lg text-slate-400 ml-2">/ {totalDays}</span>
        </p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 min-w-fit">{completionPercent}%</p>
        </div>
      </div>

      {/* Card 2: Average Demand */}
      <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-700 rounded-xl p-4 hover:shadow-lg hover:shadow-cyan-500/20 transition-shadow">
        <p className="text-xs text-slate-400 mb-1">Średnie Zapotrzebowanie</p>
        <p className="text-3xl font-bold text-cyan-400">{getAverageDemand()}</p>
        <p className="text-xs text-slate-500 mt-1">pracowników na godzinę</p>
      </div>

      {/* Card 3: Peak Day */}
      <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-700 rounded-xl p-4 hover:shadow-lg hover:shadow-emerald-500/20 transition-shadow">
        <p className="text-xs text-slate-400 mb-1">Najwyższe Zapotrzebowanie</p>
        <p className="text-3xl font-bold text-emerald-400">{peakDay.demand} godzin pracy</p>
        <p className="text-szzz text-slate-500 mt-1">
          {peakDay.date ? `${peakDay.date}. ${MONTHS[month]}` : 'Brak danych'}
        </p>
      </div>
    </div>
  );
}