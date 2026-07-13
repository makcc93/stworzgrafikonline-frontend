/**
 * Draft Real API Service
 * Connects to actual Spring Boot backend for demand draft management
 */
import { formatDateForBackend } from '@/utils/draft.utils';

import type {
  ResponseDemandDraftDTO,
  CreateDemandDraftDTO,
  UpdateDemandDraftDTO,
  BulkCreateDraftsDTO,
  DraftPaginationParams,
  Page,
} from '@/types/draft.types';
import {
  isValidHourlyDemand,
  getDatesForDayOfWeek,
  createDraftDTO,
} from '@/types/draft.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

/**
 * Dane norm miesięcznych zwracane przez backend.
 * – standardWorkingHours  : godziny wg kalendarza (z uwzgl. polskich świąt)
 * – totalEmployeeNorm     : suma indywidualnych norm etatu pracowników (bez magazyniera)
 * – activeNonWarehouseCount: liczba aktywnych pracowników bez magazyniera
 */
export interface MonthlyNormData {
  standardWorkingHours: number;
  totalEmployeeNorm: number;
  activeNonWarehouseCount: number;
  /** true w ostatnim miesiącu okresu rozliczeniowego - wtedy totalEmployeeNorm to suma
   *  potwierdzonych godzin z zakładki "Pozostałe godziny pracowników", nie norma etatu. */
  usingConfirmedHours: boolean;
}

/**
 * Draft Real API Service
 */
export const draftService = {
  /**
   * Get single draft by ID
   * GET /api/stores/{storeId}/drafts/{draftId}
   */
  getById: async (
    storeId: number,
    draftId: number
  ): Promise<ResponseDemandDraftDTO> => {
    try {
      if (!storeId || storeId <= 0) throw new Error('Invalid store ID');
      if (!draftId || draftId <= 0) throw new Error('Invalid draft ID');

      return await httpClient.get<ResponseDemandDraftDTO>(
        `${API_CONFIG.ENDPOINTS.stores}/${storeId}/drafts/${draftId}`
      );
    } catch (error: any) {
      console.error('[draftService.getById] Error:', error);
      if (error.message?.includes('404')) {
        throw new Error(`Draft with ID ${draftId} not found`);
      }
      throw error;
    }
  },

  /**
   * Get drafts for date range
   * GET /api/stores/{storeId}/drafts?startDate=...&endDate=...
   */
  getByDateRange: async (
    storeId: number,
    startDate?: string,
    endDate?: string,
    pagination?: DraftPaginationParams
  ): Promise<Page<ResponseDemandDraftDTO>> => {
    try {
      if (!storeId || storeId <= 0) throw new Error('Invalid store ID');

      const params: Record<string, string | number | undefined> = {
        page: pagination?.page ?? 0,
        size: pagination?.size ?? 62,
        sort: pagination?.sort ?? 'draftDate',
        direction: pagination?.direction ?? 'DESC',
        startDate,
        endDate,
      };

      return await httpClient.get<Page<ResponseDemandDraftDTO>>(
        `${API_CONFIG.ENDPOINTS.stores}/${storeId}/drafts`,
        params
      );
    } catch (error) {
      console.error('[draftService.getByDateRange] Error:', error);
      throw error;
    }
  },

  /**
   * Create single draft
   * POST /api/stores/{storeId}/drafts
   */
  create: async (
    storeId: number,
    data: CreateDemandDraftDTO
  ): Promise<ResponseDemandDraftDTO> => {
    try {
      if (!storeId || storeId <= 0) throw new Error('Invalid store ID');

      if (!isValidHourlyDemand(data.hourlyDemand)) {
        throw new Error('hourlyDemand must have exactly 24 elements');
      }

      return await httpClient.post<ResponseDemandDraftDTO>(
        `${API_CONFIG.ENDPOINTS.stores}/${storeId}/drafts`,
        data
      );
    } catch (error: any) {
      console.error('[draftService.create] Error:', error);
      if (error.message?.includes('409')) {
        throw new Error(`Draft for date ${data.draftDate} already exists`);
      }
      throw error;
    }
  },

  /**
   * Update draft
   * PATCH /api/stores/{storeId}/drafts/{draftId}
   */
  update: async (
    storeId: number,
    draftId: number,
    data: UpdateDemandDraftDTO
  ): Promise<ResponseDemandDraftDTO> => {
    try {
      if (!storeId || storeId <= 0) throw new Error('Invalid store ID');
      if (!draftId || draftId <= 0) throw new Error('Invalid draft ID');

      if (!isValidHourlyDemand(data.hourlyDemand)) {
        throw new Error('hourlyDemand must have exactly 24 elements');
      }

      return await httpClient.patch<ResponseDemandDraftDTO>(
        `${API_CONFIG.ENDPOINTS.stores}/${storeId}/drafts/${draftId}`,
        data
      );
    } catch (error: any) {
      console.error('[draftService.update] Error:', error);
      if (error.message?.includes('404')) {
        throw new Error(`Draft with ID ${draftId} not found`);
      }
      throw error;
    }
  },

  /**
   * Delete draft
   * DELETE /api/stores/{storeId}/drafts/{draftId}
   */
  delete: async (storeId: number, draftId: number): Promise<void> => {
    try {
      if (!storeId || storeId <= 0) throw new Error('Invalid store ID');
      if (!draftId || draftId <= 0) throw new Error('Invalid draft ID');

      await httpClient.delete(
        `${API_CONFIG.ENDPOINTS.stores}/${storeId}/drafts/${draftId}`
      );
    } catch (error: any) {
      console.error('[draftService.delete] Error:', error);
      if (error.message?.includes('404')) {
        throw new Error(`Draft with ID ${draftId} not found`);
      }
      throw error;
    }
  },

  /**
   * Bulk create drafts from templates
   */
  bulkCreate: async (bulkData: BulkCreateDraftsDTO): Promise<ResponseDemandDraftDTO[]> => {
    try {
      const { storeId, year, month, templates } = bulkData;
      const results: ResponseDemandDraftDTO[] = [];

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const existing = await draftService.getByDateRange(
        storeId,
        formatDateForBackend(firstDay),
        formatDateForBackend(lastDay)
      );
      const existingMap = new Map(existing.content.map((d) => [d.draftDate, d]));

      for (const template of templates) {
        const totalDemand = template.hourlyDemand.reduce((a, b) => a + b, 0);
        if (totalDemand === 0) continue;

        const dates = getDatesForDayOfWeek(year, month, template.dayOfWeek);

        for (const date of dates) {
          const dateStr = formatDateForBackend(date);
          const existingDraft = existingMap.get(dateStr);
          try {
            if (existingDraft) {
              const updated = await draftService.update(storeId, existingDraft.id, {
                draftDate: dateStr,
                hourlyDemand: template.hourlyDemand,
              });
              results.push(updated);
            } else {
              const created = await draftService.create(storeId, {
                draftDate: dateStr,
                hourlyDemand: template.hourlyDemand,
              });
              results.push(created);
            }
          } catch (err) {
            console.warn(`Błąd dla daty ${dateStr}:`, err);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('[draftService.bulkCreate] Error:', error);
      throw error;
    }
  },

  /**
   * Get confirmed monthly draft sum from backend (respects holidays)
   * GET /api/stores/{storeId}/drafts/{year}/{month}/getSum
   */
  getMonthlySum: async (
    storeId: number,
    year: number,
    month: number // 1-indexed
  ): Promise<number> => {
    try {
      if (!storeId || storeId <= 0) throw new Error('Invalid store ID');
      const result = await httpClient.get<number>(
        `${API_CONFIG.ENDPOINTS.stores}/${storeId}/drafts/${year}/${month}/getSum`
      );
      return Number(result);
    } catch (error) {
      console.error('[draftService.getMonthlySum] Error:', error);
      throw error;
    }
  },

  /**
   * Pobiera normy miesięczne potrzebne do widgetu PeriodEstimation:
   * – standardowe godziny robocze (z uwzgl. polskich świąt, np. 160 dla maja 2026)
   * – sumę indywidualnych norm etatu pracowników (bez magazyniera)
   * – liczbę aktywnych pracowników bez magazyniera
   *
   * GET /api/stores/{storeId}/drafts/{year}/{month}/monthlyNorm
   * month: 1-indexed (konwencja backendu)
   */
  getMonthlyNorm: async (
    storeId: number,
    year: number,
    month: number // 1-indexed
  ): Promise<MonthlyNormData> => {
    try {
      if (!storeId || storeId <= 0) throw new Error('Invalid store ID');
      return await httpClient.get<MonthlyNormData>(
        `${API_CONFIG.ENDPOINTS.stores}/${storeId}/drafts/${year}/${month}/monthlyNorm`
      );
    } catch (error) {
      console.error('[draftService.getMonthlyNorm] Error:', error);
      throw error;
    }
  },
};

console.log('🌐 Draft Real API Service loaded');