import type {
  ResponseScheduleDTO,
  CreateScheduleDTO,
  UpdateScheduleDTO,
  ScheduleSpecificationDTO,
  ResponseScheduleDetailsDTO,
  CreateScheduleDetailsDTO,
  UpdateScheduleDetailsDTO,
  Page,
  PaginationParams,
} from '@/types/schedule.types';
import { API_CONFIG, buildUrl } from '@/config/api.config';
import { httpClient, notifySessionExpired } from '@/config/http.client';

/**
 * Schedule API Service
 */
export const scheduleService = {
  /**
   * Get all schedules for a store with optional filters and pagination
   * GET /api/stores/{storeId}/schedules
   */
  getAll: async (
    storeId: number,
    filters?: ScheduleSpecificationDTO,
    pagination?: PaginationParams
  ): Promise<Page<ResponseScheduleDTO>> => {
    try {
      const params: Record<string, string | number | undefined> = {
        scheduleId: filters?.scheduleId,
        year: filters?.year,
        month: filters?.month,
        name: filters?.name,
        createdAt: filters?.createdAt,
        createdByUserId: filters?.createdByUserId,
        updatedAt: filters?.updatedAt,
        updatedByUserId: filters?.updatedByUserId,
        scheduleStatusName: filters?.scheduleStatusName,
        page: pagination?.page,
        size: pagination?.size,
        sort: pagination?.sort,
        direction: pagination?.direction,
      };

      return await httpClient.get<Page<ResponseScheduleDTO>>(
        API_CONFIG.ENDPOINTS.schedules(storeId),
        params
      );
    } catch (error) {
      console.error('[scheduleService.getAll] Error:', error);
      throw error;
    }
  },

  getDetailById: async (
    storeId: number,
    scheduleId: number,
    detailId: number
  ): Promise<ResponseScheduleDetailsDTO> => {
    return await httpClient.get<ResponseScheduleDetailsDTO>(
      `${API_CONFIG.ENDPOINTS.scheduleDetails(storeId, scheduleId)}/${detailId}`
    );
  },

  /**
   * Get schedule by ID
   * GET /api/stores/{storeId}/schedules/{scheduleId}
   */
  getById: async (storeId: number, scheduleId: number): Promise<ResponseScheduleDTO> => {
    try {
      return await httpClient.get<ResponseScheduleDTO>(
        API_CONFIG.ENDPOINTS.scheduleById(storeId, scheduleId)
      );
    } catch (error) {
      console.error('[scheduleService.getById] Error:', error);
      throw error;
    }
  },

  /**
   * Create new schedule
   * POST /api/stores/{storeId}/schedules
   */
  create: async (storeId: number, data: CreateScheduleDTO): Promise<ResponseScheduleDTO> => {
    try {
      return await httpClient.post<ResponseScheduleDTO>(
        API_CONFIG.ENDPOINTS.schedules(storeId),
        data
      );
    } catch (error) {
      console.error('[scheduleService.create] Error:', error);
      throw error;
    }
  },

  /**
   * Update schedule
   * PATCH /api/stores/{storeId}/schedules/{scheduleId}
   */
  update: async (
    storeId: number,
    scheduleId: number,
    data: UpdateScheduleDTO
  ): Promise<ResponseScheduleDTO> => {
    try {
      return await httpClient.patch<ResponseScheduleDTO>(
        API_CONFIG.ENDPOINTS.scheduleById(storeId, scheduleId),
        data
      );
    } catch (error) {
      console.error('[scheduleService.update] Error:', error);
      throw error;
    }
  },

  /**
   * Eksportuje gotowy grafik jako plik Excel (.xlsx) — dane z bazy danych.
   * GET /api/stores/{storeId}/schedules/{scheduleId}/export
   *
   * Dane są identyczne z podglądem w ScheduleViewer (ta sama baza).
   * Nie uruchamia ponownie algorytmu.
   */
exportFromDatabase: async (storeId: number, scheduleId: number): Promise<{ downloadUrl: string; filename: string }> => {
  const token =
    localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

  const headers: HeadersInit = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(
    buildUrl(`${API_CONFIG.ENDPOINTS.scheduleById(storeId, scheduleId)}/export`),
    { method: 'GET', headers },
  );

  if (!response.ok) {
    if (response.status === 401) {
      notifySessionExpired();
      throw new Error('Sesja wygasła — zaloguj się ponownie.');
    }
    const msg = await response.text().catch(() => response.statusText);
    throw new Error(msg || response.statusText);
  }

  return response.json();
},

  /**
   * Eksportuje gotowy grafik jako plik PDF.
   * GET /api/stores/{storeId}/schedules/{scheduleId}/exportPdf
   */

	exportPdf: async (storeId: number, scheduleId: number): Promise<{ downloadUrl: string; filename: string }> => {
	  const token =
	    localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

	  const headers: HeadersInit = { Accept: 'application/json' };
	  if (token) headers['Authorization'] = `Bearer ${token}`;

	  const response = await fetch(
	    buildUrl(`${API_CONFIG.ENDPOINTS.scheduleById(storeId, scheduleId)}/exportPdf`),
	    { method: 'GET', headers },
	  );

	  if (!response.ok) {
	    if (response.status === 401) {
	      notifySessionExpired();
	      throw new Error('Sesja wygasła — zaloguj się ponownie.');
	    }
	    const msg = await response.text().catch(() => response.statusText);
	    throw new Error(msg || response.statusText);
	  }

	  return response.json();
	},

	/**
	 * Generate schedule — algorytm generuje grafik i wgrywa Excel + PDF na Cloudflare R2.
	 * Backend NIE zwraca juz pliku bezposrednio w odpowiedzi - po sukcesie nalezy
	 * osobno wywolac exportFromDatabase()/exportPdf(), zeby dostac link do pobrania z R2.
	 * POST /api/stores/{storeId}/schedules/{scheduleId}/generate
	 */
	generate: async (storeId: number, scheduleId: number): Promise<void> => {
	  const token =
	    localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

	  const headers: HeadersInit = { 'Content-Type': 'application/json' };
	  if (token) headers['Authorization'] = `Bearer ${token}`;

	  const response = await fetch(
	    buildUrl(`${API_CONFIG.ENDPOINTS.scheduleById(storeId, scheduleId)}/generate`),
	    { method: 'POST', headers, body: JSON.stringify({}) }
	  );

	  if (!response.ok) {
	    if (response.status === 401) {
	      notifySessionExpired();
	      throw new Error('Sesja wygasła — zaloguj się ponownie.');
	    }
	    const msg = await response.text().catch(() => response.statusText);
	    throw new Error(msg || response.statusText);
	  }
	},

  /**
   * Delete schedule
   * DELETE /api/stores/{storeId}/schedules/{scheduleId}
   */
  delete: async (storeId: number, scheduleId: number): Promise<void> => {
    try {
      await httpClient.delete(API_CONFIG.ENDPOINTS.scheduleById(storeId, scheduleId));
    } catch (error) {
      console.error('[scheduleService.delete] Error:', error);
      throw error;
    }
  },

  // ==================== SCHEDULE DETAILS ====================

  /**
   * Get all schedule details for a schedule
   * GET /api/stores/{storeId}/schedules/{scheduleId}/details
   */
  getDetails: async (
    storeId: number,
    scheduleId: number,
    filters?: { employeeId?: number; date?: string; shiftId?: number; shiftTypeConfigId?: number },
    pagination?: PaginationParams
  ): Promise<Page<ResponseScheduleDetailsDTO>> => {
    try {
      const params: Record<string, string | number | undefined> = {
        employeeId: filters?.employeeId,
        date: filters?.date,
        shiftId: filters?.shiftId,
        shiftTypeConfigId: filters?.shiftTypeConfigId,
        page: pagination?.page,
        size: pagination?.size,
        sort: pagination?.sort,
        direction: pagination?.direction,
      };

      return await httpClient.get<Page<ResponseScheduleDetailsDTO>>(
        API_CONFIG.ENDPOINTS.scheduleDetails(storeId, scheduleId),
        params
      );
    } catch (error) {
      console.error('[scheduleService.getDetails] Error:', error);
      throw error;
    }
  },

  /**
   * Create schedule detail
   * POST /api/stores/{storeId}/schedules/{scheduleId}/details
   */
  createDetail: async (
    storeId: number,
    scheduleId: number,
    data: CreateScheduleDetailsDTO
  ): Promise<ResponseScheduleDetailsDTO> => {
    try {
      return await httpClient.post<ResponseScheduleDetailsDTO>(
        API_CONFIG.ENDPOINTS.scheduleDetails(storeId, scheduleId),
        data
      );
    } catch (error) {
      console.error('[scheduleService.createDetail] Error:', error);
      throw error;
    }
  },

  /**
   * Update schedule detail
   * PATCH /api/stores/{storeId}/schedules/{scheduleId}/details/{detailId}
   */
  updateDetail: async (
    storeId: number,
    scheduleId: number,
    detailId: number,
    data: UpdateScheduleDetailsDTO
  ): Promise<ResponseScheduleDetailsDTO> => {
    try {
      return await httpClient.patch<ResponseScheduleDetailsDTO>(
        `${API_CONFIG.ENDPOINTS.scheduleDetails(storeId, scheduleId)}/${detailId}`,
        data
      );
    } catch (error) {
      console.error('[scheduleService.updateDetail] Error:', error);
      throw error;
    }
  },

  /**
   * Delete schedule detail
   * DELETE /api/stores/{storeId}/schedules/{scheduleId}/details/{detailId}
   */
  deleteDetail: async (storeId: number, scheduleId: number, detailId: number): Promise<void> => {
    try {
      await httpClient.delete(
        `${API_CONFIG.ENDPOINTS.scheduleDetails(storeId, scheduleId)}/${detailId}`
      );
    } catch (error) {
      console.error('[scheduleService.deleteDetail] Error:', error);
      throw error;
    }
  },
};

console.log('🌐 Schedule Real API Service loaded');
