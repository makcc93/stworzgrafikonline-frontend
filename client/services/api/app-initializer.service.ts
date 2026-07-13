import { httpClient } from '@/config/http.client';

// Zgodny z @RequestMapping("/api/initializer") w AppInitializerController
const ENDPOINT = '/api/initializer';

export const appInitializerService = {
  /**
   * Tworzy domyślnych pracowników (15 osób) dla sklepu nr 1
   * GET /api/initializer/createFirstStoreEmployees
   */
  createFirstStoreEmployees: async (): Promise<void> => {
    try {
      await httpClient.get<void>(`${ENDPOINT}/createFirstStoreEmployees`);
    } catch (error) {
      console.error('[appInitializerService.createFirstStoreEmployees] Error:', error);
      throw error;
    }
  },
};

console.log('🚀 App Initializer Service loaded');