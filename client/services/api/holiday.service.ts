/**
 * Holiday Service
 * Pobiera polskie święta z backendu (jollyday POLAND calendar)
 * GET /api/holidays/{year}/{month} → LocalDate[]
 */
import { httpClient } from '@/config/http.client';

export const holidayService = {
  /**
   * Pobierz święta dla roku i miesiąca (month: 1-12)
   * Zwraca Set<string> z datami w formacie YYYY-MM-DD
   */
  getHolidays: async (year: number, month: number): Promise<Set<string>> => {
    try {
      const dates = await httpClient.get<string[]>(
        `/api/holidays/${year}/${month}`
      );
      return new Set(dates);
    } catch (err) {
      console.warn('Nie udało się pobrać świąt:', err);
      return new Set();
    }
  },
};
