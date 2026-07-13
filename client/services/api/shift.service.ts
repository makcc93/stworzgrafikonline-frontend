import type {
  ResponseShiftDTO,
  ShiftHoursDTO,
  ShiftCriteriaDTO,
} from '@/types/shift.types';
import type { Page } from '@/types/shared.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

export const shiftService = {
  /**
   * Get shifts with optional criteria and pagination.
   *
   * UWAGA: backend Spring przyjmuje page/size jako część Pageable (query params),
   * a startHour/endHour jako ShiftCriteriaDTO (też query params).
   * Wszystkie trafiają razem w jednym obiekcie params do httpClient.get().
   *
   * Poprzednia sygnatura (criteria?, pagination?) powodowała, że wywołanie
   * getAll({ page: 0, size: 500 }) wrzucało page/size do criteria zamiast Pageable,
   * więc Spring nie otrzymywał paginacji i zwracał domyślny rozmiar strony (~20).
   *
   * GET /api/shifts?startHour=...&endHour=...&page=...&size=...
   */
  getAll: async (params?: {
    startHour?: string;
    endHour?: string;
    page?: number;
    size?: number;
    sort?: string;
    direction?: 'ASC' | 'DESC';
  }): Promise<Page<ResponseShiftDTO>> => {
    const queryParams: Record<string, string | number | undefined> = {
      startHour: params?.startHour,
      endHour:   params?.endHour,
      page:      params?.page,
      size:      params?.size,
      sort:      params?.sort,
    };

    return await httpClient.get<Page<ResponseShiftDTO>>(
      API_CONFIG.ENDPOINTS.shifts,
      queryParams
    );
  },

  /**
   * Get shift by ID
   */
  getById: async (id: number): Promise<ResponseShiftDTO> => {
    return await httpClient.get<ResponseShiftDTO>(
      API_CONFIG.ENDPOINTS.shiftById(id)
    );
  },

  /**
   * Create shift (backend returns existing if already exists)
   */
  create: async (data: ShiftHoursDTO): Promise<ResponseShiftDTO> => {
    return await httpClient.post<ResponseShiftDTO>(
      API_CONFIG.ENDPOINTS.shifts,
      data
    );
  },

  /**
   * Update shift (PATCH method)
   */
  update: async (id: number, data: ShiftHoursDTO): Promise<ResponseShiftDTO> => {
    return await httpClient.patch<ResponseShiftDTO>(
      API_CONFIG.ENDPOINTS.shiftById(id),
      data
    );
  },

  /**
   * Delete shift
   */
  delete: async (id: number): Promise<void> => {
    await httpClient.delete(API_CONFIG.ENDPOINTS.shiftById(id));
  },
};

console.log('🌐 Shift Real API Service loaded');