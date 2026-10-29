import type {
  WorkingNormResponse,
  WorkingNormRequest,
  WorkingNormInitializationResponse,
} from '@/types/working-norm.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

/**
 * Working Norm Real API Service (ADMIN only)
 * Backend: WorkingNormController (/api/workingNorm)
 * month: 1-indexed (konwencja backendu)
 */
export const workingNormService = {

  /** GET /api/workingNorm/{year} — 12 miesięcy roku (brakujące z wartością domyślną, persisted=false) */
  getByYear: async (year: number): Promise<WorkingNormResponse[]> => {
    return await httpClient.get<WorkingNormResponse[]>(
      `${API_CONFIG.ENDPOINTS.workingNorm}/${year}`
    );
  },

  /** GET /api/workingNorm/{year}/{month} */
  getByYearMonth: async (year: number, month: number): Promise<WorkingNormResponse> => {
    return await httpClient.get<WorkingNormResponse>(
      `${API_CONFIG.ENDPOINTS.workingNorm}/${year}/${month}`
    );
  },

  /** PATCH /api/workingNorm/{year}/{month} — ustawia normę miesiąca (tworzy rekord, jeśli go nie ma) */
  update: async (year: number, month: number, data: WorkingNormRequest): Promise<WorkingNormResponse> => {
    return await httpClient.patch<WorkingNormResponse>(
      `${API_CONFIG.ENDPOINTS.workingNorm}/${year}/${month}`,
      data
    );
  },

  /** POST /api/workingNorm/{year}/{month}/reset — przywraca wartość domyślną (dni robocze * 8h) */
  reset: async (year: number, month: number): Promise<WorkingNormResponse> => {
    return await httpClient.post<WorkingNormResponse>(
      `${API_CONFIG.ENDPOINTS.workingNorm}/${year}/${month}/reset`,
      {}
    );
  },

  /**
   * POST /api/workingNorm/initialize — dodaje domyślne normy dla wszystkich BRAKUJĄCYCH
   * miesięcy (2001-2099). Istniejących (np. ręcznie zmienionych) nie nadpisuje,
   * więc można go bezpiecznie wywołać ponownie.
   */
  initialize: async (): Promise<WorkingNormInitializationResponse> => {
    return await httpClient.post<WorkingNormInitializationResponse>(
      `${API_CONFIG.ENDPOINTS.workingNorm}/initialize`,
      {}
    );
  },
};

console.log('🌐 Working Norm Real API Service loaded');
