import type {
  StoreDetails,
  UpdateStoreDetailsDTO,
} from '@/types/YourStore.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

export const storeDetailsService = {

  getByStoreId: async (storeId: number): Promise<StoreDetails> => {
    return await httpClient.get<StoreDetails>(
      API_CONFIG.ENDPOINTS.storeDetails(storeId)
    );
  },

  update: async (storeId: number, data: UpdateStoreDetailsDTO): Promise<StoreDetails> => {
    return await httpClient.patch<StoreDetails>(
      API_CONFIG.ENDPOINTS.storeDetails(storeId),
      data
    );
  },
};

console.log('🌐 StoreDetails Real API Service loaded');
