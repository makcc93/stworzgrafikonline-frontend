import type {
  ShiftHourModificationConfigResponse,
  ShiftHourMappingRequest,
  ExcludedEmployeesRequest,
} from '@/types/shift-hour-modification.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

/**
 * Shift Hour Modification Config API Service
 * Note: This module uses base URL without /api prefix
 */
export const shiftHourModificationService = {
  /**
   * Get shift hour mappings for a store
   * GET /stores/{storeId}/shift-hour-config/hours
   */
  getHours: async (storeId: number): Promise<ShiftHourModificationConfigResponse> => {
    try {
      return await httpClient.get<ShiftHourModificationConfigResponse>(
        `${API_CONFIG.ENDPOINTS.storeShiftHourConfig(storeId)}/hours`
      );
    } catch (error) {
      console.error('[shiftHourModificationService.getHours] Error:', error);
      throw error;
    }
  },

  /**
   * Update shift hour mappings for a store
   * PUT /stores/{storeId}/shift-hour-config/hours
   */
  updateHours: async (
    storeId: number,
    data: ShiftHourMappingRequest
  ): Promise<ShiftHourModificationConfigResponse> => {
    try {
      return await httpClient.put<ShiftHourModificationConfigResponse>(
        `${API_CONFIG.ENDPOINTS.storeShiftHourConfig(storeId)}/hours`,
        data
      );
    } catch (error) {
      console.error('[shiftHourModificationService.updateHours] Error:', error);
      throw error;
    }
  },

  /**
   * Get excluded employees for a store
   * GET /stores/{storeId}/shift-hour-config/excluded-employees
   */
  getExcludedEmployees: async (
    storeId: number
  ): Promise<ShiftHourModificationConfigResponse> => {
    try {
      return await httpClient.get<ShiftHourModificationConfigResponse>(
        `${API_CONFIG.ENDPOINTS.storeShiftHourConfig(storeId)}/excluded-employees`
      );
    } catch (error) {
      console.error('[shiftHourModificationService.getExcludedEmployees] Error:', error);
      throw error;
    }
  },

  /**
   * Update excluded employees for a store
   * PUT /stores/{storeId}/shift-hour-config/excluded-employees
   */
  updateExcludedEmployees: async (
    storeId: number,
    data: ExcludedEmployeesRequest
  ): Promise<ShiftHourModificationConfigResponse> => {
    try {
      return await httpClient.put<ShiftHourModificationConfigResponse>(
        `${API_CONFIG.ENDPOINTS.storeShiftHourConfig(storeId)}/excluded-employees`,
        data
      );
    } catch (error) {
      console.error('[shiftHourModificationService.updateExcludedEmployees] Error:', error);
      throw error;
    }
  },
};

console.log('🌐 Shift Hour Modification Config Real API Service loaded');
