/**
 * Calendar utilities for date and calendar calculations
 * Follows SRP - single responsibility for calendar logic
 */

export const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
] as const;

export const DAYS_OF_WEEK = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'] as const;

export const SHORT_DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'] as const;

export const calendarUtils = {
  /**
   * Get number of days in a month
   */
  getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  },

  /**
   * Get the day of week index (0 = Monday, 6 = Sunday) for the first day of a month
   */
  getFirstDayOfMonth(year: number, month: number): number {
    const firstDay = new Date(year, month, 1).getDay();
    return (firstDay + 6) % 7; // Convert from JavaScript's Sunday=0 to Monday=0
  },

  /**
   * Get day of week index for a specific date
   */
  getDayOfWeek(year: number, month: number, date: number): number {
    const d = new Date(year, month, date);
    return (d.getDay() + 6) % 7; // Convert from JavaScript's Sunday=0 to Monday=0
  },

  /**
   * Get day name from index
   */
  getDayName(dayIndex: number): string {
    return DAYS_OF_WEEK[dayIndex] || 'Unknown';
  },

  /**
   * Get month name
   */
  getMonthName(monthIndex: number): string {
    return MONTHS[monthIndex] || 'Unknown';
  },

  /**
   * Get short day name from index
   */
  getShortDayName(dayIndex: number): string {
    return SHORT_DAYS[dayIndex] || '?';
  },

  /**
   * Generate calendar grid for a month
   * Returns array with null for empty cells before month starts
   */
  generateCalendarGrid(year: number, month: number): (number | null)[] {
    const daysInMonth = this.getDaysInMonth(year, month);
    const firstDayIndex = this.getFirstDayOfMonth(year, month);

    const grid: (number | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(null);
    }

    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push(i);
    }

    return grid;
  },

  /**
   * Get range of years
   */
  getYearRange(centerYear: number, range: number = 5): number[] {
    return Array.from(
      { length: range * 2 + 1 },
      (_, i) => centerYear - range + i
    );
  },

  /**
   * Navigate to previous month
   */
  previousMonth(year: number, month: number): { year: number; month: number } {
    if (month === 0) {
      return { year: year - 1, month: 11 };
    }
    return { year, month: month - 1 };
  },

  /**
   * Navigate to next month
   */
  nextMonth(year: number, month: number): { year: number; month: number } {
    if (month === 11) {
      return { year: year + 1, month: 0 };
    }
    return { year, month: month + 1 };
  },
};
