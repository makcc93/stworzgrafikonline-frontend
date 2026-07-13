/**
 * Custom hook for managing month/year navigation
 * Follows SRP - single responsibility for calendar navigation
 */

import { useState, useCallback } from 'react';
import { calendarUtils } from '@/utils/calendar';

interface UseMonthNavigationReturn {
  year: number;
  month: number;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  previousMonth: () => void;
  nextMonth: () => void;
  setMonthYear: (month: number, year: number) => void;
}

export function useMonthNavigation(initialYear?: number, initialMonth?: number): UseMonthNavigationReturn {
  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? now.getMonth());

  const previousMonth = useCallback(() => {
    const { year: newYear, month: newMonth } = calendarUtils.previousMonth(year, month);
    setYear(newYear);
    setMonth(newMonth);
  }, [year, month]);

  const nextMonth = useCallback(() => {
    const { year: newYear, month: newMonth } = calendarUtils.nextMonth(year, month);
    setYear(newYear);
    setMonth(newMonth);
  }, [year, month]);

  const setMonthYear = useCallback((newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
  }, []);

  return {
    year,
    month,
    setYear,
    setMonth,
    previousMonth,
    nextMonth,
    setMonthYear,
  };
}
