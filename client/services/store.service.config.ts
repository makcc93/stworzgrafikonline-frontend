/**
 * YourStore Service Configuration
 * Allows easy switching between real API and mock service
 * Set VITE_USE_MOCK_STORE_SERVICE=true in .env to use mock service
 */

import { storeService } from './api/store.service';
import { storeMockService } from './store.mock';
import type {
  ResponseStoreDTO,
  CreateStoreFormState,
  UpdateStoreFormState,
  StoreSpecificationDTO,
} from '@/types/YourStore.types';
import type { Page, PaginationParams } from './api/store.service';

/**
 * Determine if mock service should be used
 */
const isUseMockService = (): boolean => {
  const envVar = import.meta.env.VITE_USE_MOCK_STORE_SERVICE;
  // Check env variable or default to true in development
  return envVar === 'true' || (import.meta.env.DEV && envVar !== 'false');
};

/**
 * YourStore Service - Auto-selects between real and mock based on config
 * This is the recommended way to use the store service
 */
export const storeServiceConfig = {
  /**
   * Get the current service instance (real or mock)
   */
  getService: () => {
    if (isUseMockService()) {
      return storeMockService;
    }
    return storeService;
  },

  /**
   * Get all stores with pagination
   */
  getAll: (params?: PaginationParams): Promise<Page<ResponseStoreDTO>> => {
    const service = isUseMockService() ? storeMockService : storeService;
    return service.getAll(params);
  },

  /**
   * Get store by ID
   */
  getById: (storeId: number): Promise<ResponseStoreDTO> => {
    const service = isUseMockService() ? storeMockService : storeService;
    return service.getById(storeId);
  },

  /**
   * Search stores by criteria
   */
  search: (
    filters?: Partial<StoreSpecificationDTO>,
    params?: PaginationParams
  ): Promise<Page<ResponseStoreDTO>> => {
    const service = isUseMockService() ? storeMockService : storeService;
    return service.search(filters, params);
  },

  /**
   * Create new store
   */
  create: (createData: CreateStoreFormState): Promise<ResponseStoreDTO> => {
    const service = isUseMockService() ? storeMockService : storeService;
    return service.create(createData);
  },

  /**
   * Update existing store
   */
  update: (
    storeId: number,
    updateData: UpdateStoreFormState
  ): Promise<ResponseStoreDTO> => {
    const service = isUseMockService() ? storeMockService : storeService;
    return service.update(storeId, updateData);
  },

  /**
   * Delete store
   */
  delete: (storeId: number): Promise<void> => {
    const service = isUseMockService() ? storeMockService : storeService;
    return service.delete(storeId);
  },

  /**
   * Check if currently using mock service
   */
  isUsingMock: isUseMockService,

  /**
   * Get service name for debugging
   */
  getServiceName: (): string => {
    return isUseMockService() ? 'MOCK' : 'REAL API';
  },

  /**
   * Log current service configuration
   */
  logConfig: (): void => {
    const serviceName = storeServiceConfig.getServiceName();
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'relative /api';
    console.group('📦 YourStore Service Configuration');
    console.log(`Service: ${serviceName}`);
    console.log(`API Base URL: ${baseUrl}`);
    console.log(`Environment: ${import.meta.env.MODE}`);
    if (isUseMockService()) {
      console.log(`Mock Records: ${storeMockService.getCount()}`);
    }
    console.groupEnd();
  },
};

// Log configuration on module load
if (import.meta.env.DEV) {
  storeServiceConfig.logConfig();
}
