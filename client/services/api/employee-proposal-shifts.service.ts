/**
 * Employee Proposal Shifts Real API Service
 */

import type {
  ResponseEmployeeProposalShiftsDTO,
  CreateEmployeeProposalShiftsDTO,
  UpdateEmployeeProposalShiftsDTO,
  EmployeeProposalShiftsSpecificationDTO,
} from '@/types/employee-proposal.types';
import { isValidShiftArray } from '@/utils/employee-proposal.utils';
import type { Page, PaginationParams } from '@/types/shared.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

export const proposalShiftsService = {
  /**
   * Get by ID
   */
  getById: async (storeId: number, employeeId: number, proposalShiftId: number): Promise<ResponseEmployeeProposalShiftsDTO> => {
    return await httpClient.get<ResponseEmployeeProposalShiftsDTO>(
      `${API_CONFIG.ENDPOINTS.employeeProposalsShifts(storeId, employeeId)}/${proposalShiftId}`
    );
  },

  /**
   * Get by criteria (employeeId, startDate, endDate)
   */
  getByCriteria: async (
    storeId: number,
    filters?: EmployeeProposalShiftsSpecificationDTO,
    pagination?: PaginationParams
  ): Promise<Page<ResponseEmployeeProposalShiftsDTO>> => {
    const params: Record<string, string | number | undefined> = {
      page: pagination?.page ?? 0,
      size: pagination?.size ?? 100, // Higher default for daily data
      employeeId: filters?.employeeId,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    };

    return await httpClient.get<Page<ResponseEmployeeProposalShiftsDTO>>(
      `${API_CONFIG.ENDPOINTS.stores}/${storeId}/proposalShifts`,
      params
    );
  },

  /**
   * Create proposal shift
   */
  create: async (
    storeId: number,
    employeeId: number,
    data: CreateEmployeeProposalShiftsDTO
  ): Promise<ResponseEmployeeProposalShiftsDTO> => {
    if (!isValidShiftArray(data.dailyProposalShift)) {
      throw new Error('dailyProposalShift must have exactly 24 elements');
    }

    try {
      return await httpClient.put<ResponseEmployeeProposalShiftsDTO>(
        API_CONFIG.ENDPOINTS.employeeProposalsShifts(storeId, employeeId),
        data
      );
    } catch (error: any) {
      if (error.message?.includes('409')) {
        throw new Error(`Proposal shift for ${data.date} already exists`);
      }
      throw error;
    }
  },

  /**
   * Update proposal shift
   */
  update: async (
    storeId: number,
    employeeId: number,
    proposalShiftId: number,
    data: UpdateEmployeeProposalShiftsDTO
  ): Promise<ResponseEmployeeProposalShiftsDTO> => {
    if (data.dailyProposalShift && !isValidShiftArray(data.dailyProposalShift)) {
      throw new Error('dailyProposalShift must have exactly 24 elements');
    }

    return await httpClient.patch<ResponseEmployeeProposalShiftsDTO>(
      `${API_CONFIG.ENDPOINTS.employeeProposalsShifts(storeId, employeeId)}/${proposalShiftId}`,
      data
    );
  },

  /**
   * Delete proposal shift
   */
  delete: async (storeId: number, employeeId: number, proposalShiftId: number): Promise<void> => {
    await httpClient.delete(
      `${API_CONFIG.ENDPOINTS.employeeProposalsShifts(storeId, employeeId)}/${proposalShiftId}`
    );
  },
};

console.log('🌐 Proposal Shifts Real API Service loaded');
