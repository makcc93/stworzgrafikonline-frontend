/**
 * Employee Vacation Real API Service
 * Connects to Spring Boot backend
 */

import type {
  ResponseEmployeeVacationDTO,
  CreateEmployeeVacationDTO,
  UpdateEmployeeVacationDTO,
  EmployeeVacationSpecificationDTO,
} from '@/types/employee-vacation.types';
import { isValidVacationArray } from '@/utils/employee-vacation.utils';
import type { Page, PaginationParams } from '@/types/shared.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

/**
 * Employee Vacation Real API Service
 */
export const employeeVacationService = {
  /**
   * Get vacation by ID
   * GET /api/stores/{storeId}/employees/{employeeId}/vacations/{vacationId}
   */
  getById: async (
    storeId: number,
    employeeId: number,
    vacationId: number
  ): Promise<ResponseEmployeeVacationDTO> => {
    try {
      return await httpClient.get<ResponseEmployeeVacationDTO>(
        `${API_CONFIG.ENDPOINTS.employeeVacations(storeId, employeeId)}/${vacationId}`
      );
    } catch (error: any) {
      console.error('[employeeVacationService.getById] Error:', error);
      if (error.message?.includes('404')) {
        throw new Error(`Vacation with ID ${vacationId} not found`);
      }
      throw error;
    }
  },

  /**
   * Get vacations with filters
   * GET /api/stores/{storeId}/vacations?employeeId=X&year=Y&month=Z
   */
  getByCriteria: async (
    storeId: number,
    filters?: EmployeeVacationSpecificationDTO,
    pagination?: PaginationParams
  ): Promise<Page<ResponseEmployeeVacationDTO>> => {
    try {
      const params: Record<string, string | number | undefined> = {
        page: pagination?.page ?? 0,
        size: pagination?.size ?? 25,
        sort: pagination?.sort ?? 'createdAt',
        direction: pagination?.direction ?? 'DESC',
        employeeId: filters?.employeeId,
        year: filters?.year,
        month: filters?.month,
      };

      return await httpClient.get<Page<ResponseEmployeeVacationDTO>>(
        `${API_CONFIG.ENDPOINTS.stores}/${storeId}/vacations`,
        params
      );
    } catch (error) {
      console.error('[employeeVacationService.getByCriteria] Error:', error);
      throw error;
    }
  },

  /**
   * Create vacation
   * PUT /api/stores/{storeId}/employees/{employeeId}/vacations
   */
  create: async (
    storeId: number,
    employeeId: number,
    data: CreateEmployeeVacationDTO
  ): Promise<ResponseEmployeeVacationDTO> => {
    try {
      if (!isValidVacationArray(data.monthlyVacation)) {
        throw new Error(
          'monthlyVacation must have exactly 31 elements (values 0 or 1)'
        );
      }

      return await httpClient.put<ResponseEmployeeVacationDTO>(
        API_CONFIG.ENDPOINTS.employeeVacations(storeId, employeeId),
        data
      );
    } catch (error: any) {
      console.error('[employeeVacationService.create] Error:', error);
      if (error.message?.includes('409')) {
        throw new Error(`Vacation for ${data.month}/${data.year} already exists`);
      }
      throw error;
    }
  },

  /**
   * Update vacation
   * PATCH /api/stores/{storeId}/employees/{employeeId}/vacations/{vacationId}
   */
  update: async (
    storeId: number,
    employeeId: number,
    vacationId: number,
    data: UpdateEmployeeVacationDTO
  ): Promise<ResponseEmployeeVacationDTO> => {
    try {
      if (data.monthlyVacation && !isValidVacationArray(data.monthlyVacation)) {
        throw new Error(
          'monthlyVacation must have exactly 31 elements (values 0 or 1)'
        );
      }

      return await httpClient.patch<ResponseEmployeeVacationDTO>(
        `${API_CONFIG.ENDPOINTS.employeeVacations(storeId, employeeId)}/${vacationId}`,
        data
      );
    } catch (error: any) {
      console.error('[employeeVacationService.update] Error:', error);
      if (error.message?.includes('404')) {
        throw new Error(`Vacation with ID ${vacationId} not found`);
      }
      throw error;
    }
  },

  /**
   * Delete vacation
   * DELETE /api/stores/{storeId}/employees/{employeeId}/vacations/{vacationId}
   */
  delete: async (
    storeId: number,
    employeeId: number,
    vacationId: number
  ): Promise<void> => {
    try {
      await httpClient.delete(
        `${API_CONFIG.ENDPOINTS.employeeVacations(storeId, employeeId)}/${vacationId}`
      );
    } catch (error: any) {
      console.error('[employeeVacationService.delete] Error:', error);
      if (error.message?.includes('404')) {
        throw new Error(`Vacation with ID ${vacationId} not found`);
      }
      throw error;
    }
  },
};

console.log('🌐 Employee Vacation Real API Service loaded');
