/**
 * Position Real API Service
 */

import type {
  ResponsePositionDTO,
  CreatePositionDTO,
  UpdatePositionDTO,
} from '@/types/position.types';
import type { Page, PaginationParams } from '@/types/shared.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

export const positionService = {
  /**
   * Get all positions with optional pagination
   */
  getAll: async (): Promise<ResponsePositionDTO[]> => {
    return await httpClient.get<ResponsePositionDTO[]>(
      API_CONFIG.ENDPOINTS.positions
    );
  },

  /**
   * Get position by ID
   */
  getById: async (id: number): Promise<ResponsePositionDTO> => {
    return await httpClient.get<ResponsePositionDTO>(
      `${API_CONFIG.ENDPOINTS.positions}/${id}`
    );
  },

  /**
   * Create position
   */
  create: async (data: CreatePositionDTO): Promise<ResponsePositionDTO> => {
    try {
      return await httpClient.post<ResponsePositionDTO>(
        API_CONFIG.ENDPOINTS.positions,
        data
      );
    } catch (error: any) {
      if (error.message?.includes('409') || error.message?.includes('already exists')) {
        throw new Error(`Position "${data.name}" already exists`);
      }
      throw error;
    }
  },

  /**
   * Update position
   */
  update: async (id: number, data: UpdatePositionDTO): Promise<ResponsePositionDTO> => {
    return await httpClient.patch<ResponsePositionDTO>(
      `${API_CONFIG.ENDPOINTS.positions}/${id}`,
      data
    );
  },

  /**
   * Delete position
   */
  delete: async (id: number): Promise<void> => {
    await httpClient.delete(`${API_CONFIG.ENDPOINTS.positions}/${id}`);
  },
};

console.log('🌐 Position Real API Service loaded');
