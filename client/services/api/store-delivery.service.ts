import type {
  ResponseStoreDeliveryDTO,
  UpdateStoreDeliveryDTO,
} from '@/types/store-delivery.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

/**
 * Store Delivery API Service
 * Endpoints: GET/PATCH /api/stores/{storeId}/deliveries
 */
export const storeDeliveryService = {
  /**
   * Pobierz konfigurację dostaw sklepu
   * GET /api/stores/{storeId}/deliveries
   */
  get: async (storeId: number): Promise<ResponseStoreDeliveryDTO> => {
    try {
      return await httpClient.get<ResponseStoreDeliveryDTO>(
        API_CONFIG.ENDPOINTS.storeDelivery(storeId)
      );
    } catch (error: any) {
      console.error('[storeDeliveryService.get] Error:', error);
      if (error.message?.includes('403')) throw new Error('ACCESS_DENIED');
      if (error.message?.includes('404')) throw new Error('ENTITY_NOT_FOUND');
      throw error;
    }
  },

  /**
   * Zaktualizuj konfigurację dostaw sklepu
   * PATCH /api/stores/{storeId}/deliveries
   */
  update: async (
    storeId: number,
    dto: UpdateStoreDeliveryDTO
  ): Promise<ResponseStoreDeliveryDTO> => {
    try {
      return await httpClient.patch<ResponseStoreDeliveryDTO>(
        API_CONFIG.ENDPOINTS.storeDelivery(storeId),
        dto
      );
    } catch (error: any) {
      console.error('[storeDeliveryService.update] Error:', error);
      if (error.message?.includes('403')) throw new Error('ACCESS_DENIED');
      if (error.message?.includes('404')) throw new Error('ENTITY_NOT_FOUND');
      throw error;
    }
  },
};