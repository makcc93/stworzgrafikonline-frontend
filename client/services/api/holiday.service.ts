/**
 * Holiday Service
 * Dni wolne od pracy / niehandlowe (baza, z fallbackiem do jollyday po stronie backendu).
 *
 * Publiczne (każdy moduł):  GET /api/holidays/{year}/{month} → YYYY-MM-DD[]
 * Admin (Panel Admina):     lista roku, dodawanie, zmiana nazwy, usuwanie, reset roku, inicjalizacja
 */
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';
import type {
  HolidayResponse,
  HolidayCreateRequest,
  HolidayUpdateRequest,
  HolidayInitializationResponse,
} from '@/types/holiday.types';

// Krótki cache w pamięci — kalendarze kilku modułów pytają o ten sam miesiąc.
// TTL jak w backendzie; po każdej zmianie w Panelu Admina cache jest czyszczony.
const CACHE_TTL_MS = 5 * 60 * 1000;
const monthCache = new Map<string, { loadedAt: number; dates: Set<string> }>();

const clearCache = () => monthCache.clear();

export const holidayService = {
  /**
   * Pobierz dni wolne dla roku i miesiąca (month: 1-12)
   * Zwraca Set<string> z datami w formacie YYYY-MM-DD
   */
  getHolidays: async (year: number, month: number): Promise<Set<string>> => {
    const key = `${year}-${month}`;
    const cached = monthCache.get(key);
    if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.dates;

    try {
      const dates = await httpClient.get<string[]>(`${API_CONFIG.ENDPOINTS.holidays}/${year}/${month}`);
      const set = new Set(dates);
      monthCache.set(key, { loadedAt: Date.now(), dates: set });
      return set;
    } catch (err) {
      console.warn('Nie udało się pobrać dni wolnych:', err);
      return new Set();
    }
  },

  clearCache,

  // ===== ADMIN =====

  /** GET /api/holidays/{year} — pełna lista roku (rok bez wpisów: święta domyślne, persisted=false) */
  getByYear: async (year: number): Promise<HolidayResponse[]> => {
    return await httpClient.get<HolidayResponse[]>(`${API_CONFIG.ENDPOINTS.holidays}/${year}`);
  },

  /** POST /api/holidays — dodaje własny dzień wolny */
  create: async (data: HolidayCreateRequest): Promise<HolidayResponse> => {
    const result = await httpClient.post<HolidayResponse>(API_CONFIG.ENDPOINTS.holidays, data);
    clearCache();
    return result;
  },

  /** PATCH /api/holidays/{date} — zmiana nazwy */
  update: async (date: string, data: HolidayUpdateRequest): Promise<HolidayResponse> => {
    const result = await httpClient.patch<HolidayResponse>(`${API_CONFIG.ENDPOINTS.holidays}/${date}`, data);
    clearCache();
    return result;
  },

  /** DELETE /api/holidays/{date} */
  delete: async (date: string): Promise<void> => {
    await httpClient.delete(`${API_CONFIG.ENDPOINTS.holidays}/${date}`);
    clearCache();
  },

  /** POST /api/holidays/{year}/reset — kasuje wpisy roku i wczytuje święta domyślne od nowa */
  resetYear: async (year: number): Promise<HolidayResponse[]> => {
    const result = await httpClient.post<HolidayResponse[]>(`${API_CONFIG.ENDPOINTS.holidays}/${year}/reset`, {});
    clearCache();
    return result;
  },

  /**
   * POST /api/holidays/initialize — uzupełnia święta domyślne dla wszystkich lat 2001-2099,
   * które nie mają jeszcze wpisów. Lata z wpisami nie są ruszane.
   */
  initialize: async (): Promise<HolidayInitializationResponse> => {
    const result = await httpClient.post<HolidayInitializationResponse>(
      `${API_CONFIG.ENDPOINTS.holidays}/initialize`,
      {}
    );
    clearCache();
    return result;
  },
};
