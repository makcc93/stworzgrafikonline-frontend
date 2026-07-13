/**
 * Branch Real API Service
 */

import type {
  ResponseBranchDTO,
  CreateBranchDTO,
  UpdateBranchDTO,
  BranchSpecificationDTO,
} from '@/types/branch.types';
import type { Page, PaginationParams } from '@/types/shared.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

export const branchService = {
  /**
   * Get all branches with optional filters and pagination
   */
  getAll: async (): Promise<ResponseBranchDTO[]> => {
  return await httpClient.get<ResponseBranchDTO[]>(
    API_CONFIG.ENDPOINTS.branches
  );
},

  /**
   * Get branch by ID
   */
  getById: async (id: number): Promise<ResponseBranchDTO> => {
    return await httpClient.get<ResponseBranchDTO>(
      API_CONFIG.ENDPOINTS.branchById(id)
    );
  },

  /**
   * Create branch
   */
  create: async (data: CreateBranchDTO): Promise<ResponseBranchDTO> => {
    try {
      return await httpClient.post<ResponseBranchDTO>(
        API_CONFIG.ENDPOINTS.branches,
        data
      );
    } catch (error: any) {
      if (error.message?.includes('409') || error.message?.includes('already exists')) {
        throw new Error(`Branch "${data.name}" already exists`);
      }
      throw error;
    }
  },

  /**
   * Update branch
   */
  update: async (id: number, data: UpdateBranchDTO): Promise<ResponseBranchDTO> => {
    return await httpClient.patch<ResponseBranchDTO>(
      API_CONFIG.ENDPOINTS.branchById(id),
      data
    );
  },

  /**
   * Delete branch
   */
  delete: async (id: number): Promise<void> => {
    await httpClient.delete(API_CONFIG.ENDPOINTS.branchById(id));
  },
};

console.log('🌐 Branch Real API Service loaded');
