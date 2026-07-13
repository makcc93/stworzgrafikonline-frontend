import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS } from '@/utils/calendar';
import { formatDateForBackend } from '@/utils/draft.utils';

interface MiniCalendarProps {
  year: number;
  month: number;
  selectedDate: number | null;
  drafts: Array<{ draftDate: string }>;
  holidayDates?: Set<string>; // YYYY-MM-DD — święta z backendu
  onMonthChange: (year: number, month: number) => void;
  onDateSelect: (date: number | null) => void;
}

export function MiniCalendar({
  year,
  month,
  selectedDate,
  drafts,
  holidayDates = new Set(),
  onMonthChange,
  onDateSelect,
}: MiniCalendarProps) {

  const generateCalendarGrid = (): (number | null)[] => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: (number | null)[] = Array(firstDay).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      grid.push(day);
    }
    return grid;
  };

  const calendarGrid = generateCalendarGrid();
  const draftDates = new Set(drafts.map((d) => d.draftDate));

  const handlePrevMonth = () => {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    onMonthChange(newYear, newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    onMonthChange(newYear, newMonth);
  };

  return (
    <div className="bg-slate-700/20 rounded-xl p-4 shadow-inner border border-slate-600/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-600 rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
        <h3 className="text-lg font-bold text-white text-center flex-1">
          {MONTHS[month]} {year}
        </h3>
        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-600 rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Nazwy dni */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'].map((day, idx) => (
          <div
            key={day}
            className={`text-center text-[13px] font-black uppercase tracking-tighter py-1 ${
              idx === 0 ? 'text-red-500' : 'text-slate-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Siatka kalendarza */}
      <div className="grid grid-cols-7 gap-2">
        {calendarGrid.map((day, idx) => {
          const isSunday = idx % 7 === 0;
          const isSelected = day !== null && selectedDate === day;
          const dateObj = day !== null ? new Date(year, month, day) : null;
          const dateStr = dateObj ? formatDateForBackend(dateObj) : null;
          const hasDraft = dateStr ? draftDates.has(dateStr) : false;
          const isHoliday = dateStr ? holidayDates.has(dateStr) : false;

          let buttonClasses = "py-2 px-1 rounded-lg text-sm font-bold transition-all relative ";

          if (day === null) {
            buttonClasses += "bg-transparent text-transparent cursor-default";
          } else if (isSelected) {
            buttonClasses += "bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg";
          } else if (isHoliday) {
            // Święto — czerwone tło, nie można kliknąć jak zwykły dzień
            buttonClasses += "bg-red-900/40 text-red-400 ring-1 ring-red-700/60 cursor-default";
          } else {
            buttonClasses += "bg-slate-700 hover:bg-slate-600 ";
            buttonClasses += isSunday ? "text-red-500" : "text-slate-200";
          }

          return (
            <button
              key={idx}
              onClick={() => day && !isHoliday && onDateSelect(day)}
              disabled={day === null}
              title={isHoliday ? "Dzień świąteczny — brak draftu" : undefined}
              className={buttonClasses}
            >
              <div className="text-center">{day}</div>

              {/* Kropka draftu */}
              {hasDraft && !isHoliday && (
                <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                  isSelected ? 'bg-white' : 'bg-blue-400'
                }`} />
              )}

              {/* Ikona świąta */}
              {isHoliday && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] leading-none">
                  🎉
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      {holidayDates.size > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-600/50 flex items-center gap-2 text-[10px] text-slate-400">
          <span className="w-3 h-3 bg-red-900/40 ring-1 ring-red-700/60 rounded inline-block"></span>
          <span>Święto — draft zerowany automatycznie</span>
        </div>
      )}
    </div>
  );
}