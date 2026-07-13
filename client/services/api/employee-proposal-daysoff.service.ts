/**
 * Employee Proposal DaysOff Real API Service
 */

import type {
  ResponseEmployeeProposalDaysOffDTO,
  CreateEmployeeProposalDaysOffDTO,
  UpdateEmployeeProposalDaysOffDTO,
  EmployeeProposalDaysOffSpecificationDTO,
} from '@/types/employee-proposal.types';
import { isValidDaysOffArray } from '@/utils/employee-proposal.utils';
import type { Page, PaginationParams } from '@/types/shared.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

export const proposalDaysOffService = {
  /**
   * Get by ID
   */
  getById: async (storeId: number, employeeId: number, proposalId: number): Promise<ResponseEmployeeProposalDaysOffDTO> => {
    return await httpClient.get<ResponseEmployeeProposalDaysOffDTO>(
      `${API_CONFIG.ENDPOINTS.employeeProposalsDaysOff(storeId, employeeId)}/${proposalId}`
    );
  },

  /**
   * Get by criteria (year, month, employeeId)
   */
  getByCriteria: async (
    storeId: number,
    filters?: EmployeeProposalDaysOffSpecificationDTO,
    pagination?: PaginationParams
  ): Promise<Page<ResponseEmployeeProposalDaysOffDTO>> => {
    const params: Record<string, string | number | undefined> = {
      page: pagination?.page ?? 0,
      size: pagination?.size ?? 25,
      sort: pagination?.sort ?? 'createdAt',
      direction: pagination?.direction ?? 'DESC',
      employeeId: filters?.employeeId,
      year: filters?.year,
      month: filters?.month,
    };

    return await httpClient.get<Page<ResponseEmployeeProposalDaysOffDTO>>(
      `${API_CONFIG.ENDPOINTS.stores}/${storeId}/proposalDaysOff`,
      params
    );
  },

  /**
   * Create proposal days off
   */
  create: async (
    storeId: number,
    employeeId: number,
    data: CreateEmployeeProposalDaysOffDTO
  ): Promise<ResponseEmployeeProposalDaysOffDTO> => {
    if (!isValidDaysOffArray(data.monthlyDaysOff)) {
      throw new Error('monthlyDaysOff must have exactly 31 elements (values 0 or 1)');
    }

    try {
      return await httpClient.put<ResponseEmployeeProposalDaysOffDTO>(
        API_CONFIG.ENDPOINTS.employeeProposalsDaysOff(storeId, employeeId),
        data
      );
    } catch (error: any) {
      if (error.message?.includes('409')) {
        throw new Error(`Proposal for ${data.month}/${data.year} already exists`);
      }
      throw error;
    }
  },

  /**
   * Update proposal days off
   */
  update: async (
    storeId: number,
    employeeId: number,
    proposalId: number,
    data: UpdateEmployeeProposalDaysOffDTO
  ): Promise<ResponseEmployeeProposalDaysOffDTO> => {
    if (data.monthlyDaysOff && !isValidDaysOffArray(data.monthlyDaysOff)) {
      throw new Error('monthlyDaysOff must have exactly 31 elements (values 0 or 1)');
    }

    return await httpClient.patch<ResponseEmployeeProposalDaysOffDTO>(
      `${API_CONFIG.ENDPOINTS.employeeProposalsDaysOff(storeId, employeeId)}/${proposalId}`,
      data
    );
  },

  /**
   * Delete proposal days off
   */
  delete: async (storeId: number, employeeId: number, proposalId: number): Promise<void> => {
    await httpClient.delete(
      `${API_CONFIG.ENDPOINTS.employeeProposalsDaysOff(storeId, employeeId)}/${proposalId}`
    );
  },
};

console.log('🌐 Proposal DaysOff Real API Service loaded');
