/**
 * Region Real API Service
 */

import type {
  ResponseRegionDTO,
  CreateRegionDTO,
  UpdateRegionDTO,
  RegionSpecificationDTO,
} from '@/types/region.types';
import type { Page, PaginationParams } from '@/types/shared.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

export const regionService = {
  /**
   * Get all regions with optional filters and pagination
   */
  getAll: async (): Promise<ResponseRegionDTO[]> => {
  return await httpClient.get<ResponseRegionDTO[]>(
    API_CONFIG.ENDPOINTS.regions
  );
  },

  /**
   * Get region by ID
   */
  getById: async (id: number): Promise<ResponseRegionDTO> => {
    return await httpClient.get<ResponseRegionDTO>(
      API_CONFIG.ENDPOINTS.regionById(id)
    );
  },

  /**
   * Create region
   */
  create: async (data: CreateRegionDTO): Promise<ResponseRegionDTO> => {
    try {
      return await httpClient.post<ResponseRegionDTO>(
        API_CONFIG.ENDPOINTS.regions,
        data
      );
    } catch (error: any) {
      if (error.message?.includes('409') || error.message?.includes('already exists')) {
        throw new Error(`Region "${data.name}" already exists`);
      }
      throw error;
    }
  },

  /**
   * Update region
   */
  update: async (id: number, data: UpdateRegionDTO): Promise<ResponseRegionDTO> => {
    return await httpClient.patch<ResponseRegionDTO>(
      API_CONFIG.ENDPOINTS.regionById(id),
      data
    );
  },

  /**
   * Delete region
   */
  delete: async (id: number): Promise<void> => {
    await httpClient.delete(API_CONFIG.ENDPOINTS.regionById(id));
  },
};

console.log('🌐 Region Real API Service loaded');
