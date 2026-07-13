/**
 * Employee Real API Service
 * Connects to actual Spring Boot backend
 */

import type {
  ResponseEmployeeDTO,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  EmployeeSpecificationDTO,
} from '@/types/employee.types';
import type { Page, PaginationParams } from '@/types/shared.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

/**
 * Validate SAP number format (must be exactly 8 digits)
 */
function isValidSAP(sap: number): boolean {
  return /^\d{8}$/.test(sap.toString());
}

/**
 * Employee Real API Service
 */
export const employeeService = {
  /**
   * Get all employees for a store with filters and pagination
   * GET /api/stores/{storeId}/employees
   */
  getAll: async (
    storeId: number,
    filters?: EmployeeSpecificationDTO,
    pagination?: PaginationParams
  ): Promise<Page<ResponseEmployeeDTO>> => {
    try {
      if (!storeId || storeId <= 0) {
        throw new Error('Invalid store ID');
      }

      const params: Record<string, string | number | undefined> = {
        id: filters?.id,
        firstName: filters?.firstName,
        lastName: filters?.lastName,
        sap: filters?.sap,
        positionId: filters?.positionId,
        storeId: filters?.storeId,
        enable: filters?.enable !== undefined ? String(filters.enable) : undefined,
        canOperateCheckout: filters?.canOperateCheckout !== undefined ? String(filters.canOperateCheckout) : undefined,
        pok: filters?.pok !== undefined ? String(filters.pok) : undefined,
        page: pagination?.page ?? 0,
        size: pagination?.size ?? 25,
        sort: pagination?.sort ?? 'createdAt',
        direction: pagination?.direction ?? 'DESC',
      };

      return await httpClient.get<Page<ResponseEmployeeDTO>>(
        API_CONFIG.ENDPOINTS.employees(storeId),
        params
      );
    } catch (error) {
      console.error('[employeeService.getAll] Error:', error);
      throw error;
    }
  },

  /**
   * Get single employee by ID
   * GET /api/stores/{storeId}/employees/{employeeId}
   */
  getById: async (storeId: number, employeeId: number): Promise<ResponseEmployeeDTO> => {
    try {
      if (!storeId || storeId <= 0) {
        throw new Error('Invalid store ID');
      }
      if (!employeeId || employeeId <= 0) {
        throw new Error('Invalid employee ID');
      }

      return await httpClient.get<ResponseEmployeeDTO>(
        API_CONFIG.ENDPOINTS.employeeById(storeId, employeeId)
      );
    } catch (error: any) {
      console.error('[employeeService.getById] Error:', error);
      if (error.message?.includes('404')) {
        throw new Error(`Employee with ID ${employeeId} not found`);
      }
      if (error.message?.includes('403')) {
        throw new Error('Brak dostępu do tego pracownika');
      }
      throw error;
    }
  },

  /**
   * Search employees with filters and pagination
   * GET /api/stores/{storeId}/employees
   */
  search: async (
    storeId: number,
    filters?: Partial<EmployeeSpecificationDTO>,
    pagination?: PaginationParams
  ): Promise<Page<ResponseEmployeeDTO>> => {
    try {
      if (!storeId || storeId <= 0) {
        throw new Error('Invalid store ID');
      }

      const params: Record<string, string | number | undefined> = {
        id: filters?.id,
        firstName: filters?.firstName,
        lastName: filters?.lastName,
        sap: filters?.sap,
        positionId: filters?.positionId,
        storeId: filters?.storeId,
        enable: filters?.enable !== undefined ? String(filters.enable) : undefined,
        canOperateCheckout: filters?.canOperateCheckout !== undefined ? String(filters.canOperateCheckout) : undefined,
        pok: filters?.pok !== undefined ? String(filters.pok) : undefined,
        page: pagination?.page ?? 0,
        size: pagination?.size ?? 25,
        sort: pagination?.sort ?? 'createdAt',
        direction: pagination?.direction ?? 'DESC',
      };

      return await httpClient.get<Page<ResponseEmployeeDTO>>(
        API_CONFIG.ENDPOINTS.employees(storeId),
        params
      );
    } catch (error) {
      console.error('[employeeService.search] Error:', error);
      throw error;
    }
  },

  /**
   * Create new employee
   * POST /api/stores/{storeId}/employees
   */
  create: async (storeId: number, data: CreateEmployeeDTO): Promise<ResponseEmployeeDTO> => {
    try {
      if (!storeId || storeId <= 0) {
        throw new Error('Invalid store ID');
      }

      if (!data.firstName || !data.lastName || !data.sap || !data.positionId) {
        throw new Error('All required fields must be provided');
      }

      // Validate SAP format before sending to backend
      if (!isValidSAP(data.sap)) {
        throw new Error('Numer SAP musi zawierać dokładnie 8 cyfr');
      }

      return await httpClient.post<ResponseEmployeeDTO>(
        API_CONFIG.ENDPOINTS.employees(storeId),
        data
      );
    } catch (error) {
      console.error('[employeeService.create] Error:', error);
      throw error;
    }
  },

  /**
   * Update employee (partial update)
   * PATCH /api/stores/{storeId}/employees/{employeeId}
   * All fields are optional for partial updates
   */
  update: async (
    storeId: number,
    employeeId: number,
    data: UpdateEmployeeDTO
  ): Promise<ResponseEmployeeDTO> => {
    try {
      if (!storeId || storeId <= 0) {
        throw new Error('Invalid store ID');
      }
      if (!employeeId || employeeId <= 0) {
        throw new Error('Invalid employee ID');
      }

      // Validate SAP format if provided in update
      if (data.sap !== undefined && !isValidSAP(data.sap)) {
        throw new Error('Numer SAP musi zawierać dokładnie 8 cyfr');
      }

      return await httpClient.patch<ResponseEmployeeDTO>(
        API_CONFIG.ENDPOINTS.employeeById(storeId, employeeId),
        data
      );
    } catch (error: any) {
      console.error('[employeeService.update] Error:', error);
      if (error.message?.includes('404')) {
        throw new Error(`Employee with ID ${employeeId} not found`);
      }
      if (error.message?.includes('403')) {
        throw new Error('Brak dostępu do edycji tego pracownika');
      }
      throw error;
    }
  },

  /**
   * Delete employee
   * DELETE /api/stores/{storeId}/employees/{employeeId}
   */
  delete: async (storeId: number, employeeId: number): Promise<void> => {
    try {
      if (!storeId || storeId <= 0) {
        throw new Error('Invalid store ID');
      }
      if (!employeeId || employeeId <= 0) {
        throw new Error('Invalid employee ID');
      }

      await httpClient.delete(API_CONFIG.ENDPOINTS.employeeById(storeId, employeeId));
    } catch (error: any) {
      console.error('[employeeService.delete] Error:', error);
      if (error.message?.includes('404')) {
        throw new Error(`Employee with ID ${employeeId} not found`);
      }
      if (error.message?.includes('403')) {
        throw new Error('Brak dostępu do usunięcia tego pracownika');
      }
      throw error;
    }
  },
};

console.log('🌐 Employee Real API Service loaded');
