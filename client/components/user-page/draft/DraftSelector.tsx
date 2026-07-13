/**
 * DraftSelector Component
 * Handles month/year and day selection
 * Follows SRP - single responsibility for selection logic
 */

import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { calendarUtils, MONTHS, DAYS_OF_WEEK, SHORT_DAYS } from '@/utils/calendar';

interface DraftSelectorProps {
  year: number;
  month: number;
  selectedDayOfWeek: number;
  selectedDate: number | null;
  onMonthChange: (year: number, month: number) => void;
  onDayOfWeekSelect: (dayOfWeek: number) => void;
  onDateSelect: (date: number | null) => void;
}

export function DraftSelector({
  year,
  month,
  selectedDayOfWeek,
  selectedDate,
  onMonthChange,
  onDayOfWeekSelect,
  onDateSelect,
}: DraftSelectorProps) {
  const [showDateSelector, setShowDateSelector] = useState(false);

  const calendarGrid = calendarUtils.generateCalendarGrid(year, month);

  const handlePreviousMonth = () => {
    const { year: newYear, month: newMonth } = calendarUtils.previousMonth(year, month);
    onMonthChange(newYear, newMonth);
    onDateSelect(null);
  };

  const handleNextMonth = () => {
    const { year: newYear, month: newMonth } = calendarUtils.nextMonth(year, month);
    onMonthChange(newYear, newMonth);
    onDateSelect(null);
  };

  const years = calendarUtils.getYearRange(year, 5);

  return (
    <div className="bg-slate-700/30 rounded-xl p-6">
      {/* Month/Year Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePreviousMonth}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors hover:scale-110 active:scale-90"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          <div className="text-center min-w-[200px]">
            <p className="text-2xl font-bold text-white">
              {MONTHS[month]} {year}
            </p>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors hover:scale-110 active:scale-90"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex gap-2 flex-wrap justify-center lg:justify-end">
          <div className="flex gap-2">
            <label className="text-slate-400 text-sm">Miesiąc:</label>
            <select
              value={month}
              onChange={(e) => {
                const newMonth = parseInt(e.target.value);
                onMonthChange(year, newMonth);
                onDateSelect(null);
              }}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MONTHS.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <label className="text-slate-400 text-sm">Rok:</label>
            <select
              value={year}
              onChange={(e) => {
                const newYear = parseInt(e.target.value);
                onMonthChange(newYear, month);
                onDateSelect(null);
              }}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Day of Week Selector */}
      <div className="border-t border-slate-600 pt-6">
        <p className="text-slate-300 text-sm mb-3 font-medium">Wybierz szablon dnia tygodnia:</p>
        <div className="grid grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map((day, idx) => (
            <button
              key={day}
              onClick={() => {
                onDayOfWeekSelect(idx);
                onDateSelect(null);
              }}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                selectedDate === null && selectedDayOfWeek === idx
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Expandable Date Selector */}
      <div className="border-t border-slate-600 mt-6 pt-6">
        <button
          onClick={() => setShowDateSelector(!showDateSelector)}
          className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-3 hover:text-slate-200 transition-colors"
        >
          {showDateSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Nadpisanie dla konkretnego dnia
        </button>

        {showDateSelector && (
          <div className="bg-slate-700/20 rounded-lg p-4">
            <p className="text-slate-300 text-xs mb-3">Wybierz konkretny dzień:</p>
            <div className="grid grid-cols-7 gap-2 max-h-48 overflow-y-auto">
              {/* Day headers */}
              {SHORT_DAYS.map((day) => (
                <div key={`header-${day}`} className="text-center text-xs font-semibold text-slate-400 py-1">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarGrid.map((day, idx) => (
                <button
                  key={`${idx}`}
                  onClick={() => day && onDateSelect(day)}
                  disabled={day === null}
                  className={`py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                    day === null
                      ? 'bg-transparent text-transparent cursor-default'
                      : selectedDate === day
                      ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}