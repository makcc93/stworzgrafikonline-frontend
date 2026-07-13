/**
 * MonthlyPeopleChart Component
 * Displays a chart showing maximum number of people per day throughout the month
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ResponseDemandDraftDTO } from '@/types/draft.types';
import { formatDateForBackend } from '@/utils/draft.utils';

interface MonthlyPeopleChartProps {
  drafts: ResponseDemandDraftDTO[];
  year: number;
  month: number;
}

export function MonthlyPeopleChart({
  drafts,
  year,
  month,
}: MonthlyPeopleChartProps) {
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const daysList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Calculate max people for each day of the month
  const chartData = useMemo(() => {
    const data = daysList.map((day) => {
      const date = new Date(year, month, day);
      const dateStr = formatDateForBackend(date);
      const draft = drafts.find((d) => d.draftDate === dateStr);
      let maxPeople = 0;

      if (draft && draft.hourlyDemand) {
        maxPeople = Math.max(...draft.hourlyDemand, 0);
      }

      return {
        day,
        people: maxPeople,
      };
    });

    return data;
  }, [drafts, year, month, daysInMonth, daysList]);

  const maxValue = Math.max(...chartData.map((d) => d.people), 10);
  const chartHeight = 200;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white">Maksymalna liczba osób w miesiącu</h3>
        <p className="text-slate-400 text-sm">Liczba pracowników na każdy dzień</p>
      </div>

      {/* Chart Container */}
      <div className="flex flex-col gap-4">
        {/* Y-axis labels and bars */}
        <div className="flex gap-4">
          {/* Y-axis */}
          <div className="flex flex-col justify-between items-end text-xs text-slate-400 w-8 pt-2">
            <span>{maxValue}</span>
            <span>{Math.round(maxValue * 0.75)}</span>
            <span>{Math.round(maxValue * 0.5)}</span>
            <span>{Math.round(maxValue * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Bars */}
          <div className="flex-1 flex items-end gap-1 justify-center h-64 border-l border-b border-slate-600 px-2 py-2 bg-slate-900/30 rounded-lg">
            {chartData.map((item, index) => {
              const barHeight = (item.people / maxValue) * chartHeight;

              return (
                <div
                  key={index}
                  className="flex flex-col items-center flex-1 gap-1"
                >
                  <div className="relative h-full w-full flex flex-col justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${barHeight}px` }}
                      transition={{ duration: 0.5, delay: index * 0.02 }}
                      className={`w-full rounded-t-md transition-all hover:opacity-80 ${
                        item.people > 0
                          ? 'bg-gradient-to-t from-blue-600 to-cyan-500'
                          : 'bg-slate-600/30'
                      }`}
                      title={`Dzień ${item.day}: ${item.people} osób`}
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-medium mt-1">
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-400 pt-4 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-t from-blue-600 to-cyan-500 rounded-sm"></div>
            <span>Liczba pracowników</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-600/30 rounded-sm"></div>
            <span>Brak danych</span>
          </div>
        </div>
      </div>
    </div>
  );
}