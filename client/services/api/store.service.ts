/**
 * YourStore API Service
 * Handles all store-related API calls with backend integration
 */

import type {
  ResponseStoreDTO,
  CreateStoreFormState,
  UpdateStoreFormState,
  StoreSpecificationDTO,
  StoreNameAndCodeDTO,
} from '@/types/YourStore.types';
import { notifySessionExpired } from '@/config/http.client';

/**
 * Pagination metadata for paginated responses
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  isEmpty: boolean;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Pagination parameters for API requests
 */
export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}

/**
 * API Error response structure
 */
export interface ApiError {
  status: number;
  message: string;
  timestamp: string;
  path: string;
  errors?: Record<string, string[]>;
}

/**
 * Get API base URL from environment variables
 */
function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_URL;
  if (!baseUrl) {
    console.warn('VITE_API_URL not set, using relative URL /api');
    return '/api';
  }
  return baseUrl;
}

/**
 * Get authorization token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

/**
 * Build fetch headers with authorization
 */
function buildHeaders(includeAuth: boolean = true): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Parse error response from API
 */
async function parseError(response: Response): Promise<ApiError> {
  // Wygasła/nieprawidłowa sesja — powiadom globalnie, żeby AppContext
  // wylogował użytkownika i przekierował do logowania (patrz http.client.ts).
  if (response.status === 401) {
    notifySessionExpired();
  }

  const contentType = response.headers.get('content-type');
  let errorData: any = {};

  if (contentType?.includes('application/json')) {
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
  } else {
    errorData = { message: response.statusText };
  }

  return {
    status: response.status,
    message: errorData.message || response.statusText,
    timestamp: new Date().toISOString(),
    path: response.url,
    errors: errorData.errors,
  };
}

/**
 * Build query string from object
 */
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * YourStore Service - All store management API calls
 */
export const storeService = {
  /**
   * Get all stores with pagination
   * GET /api/stores/getAll
   * @param params Pagination parameters (page, size, sort, direction)
   * @returns Paginated list of all stores
   */
  getAll: async (params?: PaginationParams): Promise<Page<ResponseStoreDTO>> => {
    try {
      const queryParams = {
        page: params?.page ?? 0,
        size: params?.size ?? 25,
        sort: params?.sort ?? 'createdAt',
        direction: params?.direction ?? 'DESC',
      };

      const queryString = buildQueryString(queryParams);
      const url = `${getApiBaseUrl()}/stores/getAll${queryString}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(true),
      });

      if (!response.ok) {
        const error = await parseError(response);
        throw new Error(error.message);
      }

      const data = await response.json();
      return data as Page<ResponseStoreDTO>;
    } catch (error) {
      console.error('[storeService.getAll] Error:', error);
      throw error;
    }
  },

  /**
   * Get stores accessible to current user (DIRECTOR / STORE_MANAGER / ADMIN)
   * GET /api/stores/managed
   */
  getManagedStores: async (params?: PaginationParams): Promise<Page<ResponseStoreDTO>> => {
    try {
      const queryParams = {
        page: params?.page ?? 0,
        size: params?.size ?? 100,
        sort: params?.sort ?? 'createdAt',
        direction: params?.direction ?? 'DESC',
      };
      const queryString = buildQueryString(queryParams);
      const url = `${getApiBaseUrl()}/stores/managed${queryString}`;
      const response = await fetch(url, { method: 'GET', headers: buildHeaders(true) });
      if (!response.ok) {
        const error = await parseError(response);
        throw new Error(error.message);
      }
      return (await response.json()) as Page<ResponseStoreDTO>;
    } catch (error) {
      console.error('[storeService.getManagedStores] Error:', error);
      throw error;
    }
  },

  /**
   * Get store by ID
   * GET /api/stores/{storeId}
   * @param storeId Store identifier
   * @returns Store data
   */
  getById: async (storeId: number): Promise<ResponseStoreDTO> => {
    try {
      if (!storeId || storeId <= 0) {
        throw new Error('Invalid store ID');
      }

      const url = `${getApiBaseUrl()}/stores/${storeId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(true),
      });

      if (!response.ok) {
        const error = await parseError(response);
        throw new Error(error.message);
      }

      const data = await response.json();
      return data as ResponseStoreDTO;
    } catch (error) {
      console.error('[storeService.getById] Error:', error);
      throw error;
    }
  },

  /**
   * Search stores by criteria with pagination
   * GET /api/stores
   * @param filters Filter criteria (storeCode, name, location, branchId, storeManagerId, enable)
   * @param params Pagination parameters
   * @returns Filtered and paginated stores
   */
  search: async (
    filters?: Partial<StoreSpecificationDTO>,
    params?: PaginationParams
  ): Promise<Page<ResponseStoreDTO>> => {
    try {
      const queryParams = {
        ...filters,
        page: params?.page ?? 0,
        size: params?.size ?? 25,
        sort: params?.sort ?? 'createdAt',
        direction: params?.direction ?? 'DESC',
      };

      const queryString = buildQueryString(queryParams);
      const url = `${getApiBaseUrl()}/stores${queryString}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(true),
      });

      if (!response.ok) {
        const error = await parseError(response);
        throw new Error(error.message);
      }

      const data = await response.json();
      return data as Page<ResponseStoreDTO>;
    } catch (error) {
      console.error('[storeService.search] Error:', error);
      throw error;
    }
  },

  /**
   * Create new store
   * POST /api/stores
   * @param createData Create store form data
   * @returns Created store with ID and metadata
   */
  create: async (createData: CreateStoreFormState): Promise<ResponseStoreDTO> => {
    try {
      if (!createData.name || !createData.storeCode || !createData.location || !createData.branchId) {
        throw new Error('Required fields are missing');
      }

      const url = `${getApiBaseUrl()}/stores`;

      const response = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(true),
        body: JSON.stringify(createData),
      });

      if (!response.ok) {
        const error = await parseError(response);
        throw new Error(error.message);
      }

      const data = await response.json();
      return data as ResponseStoreDTO;
    } catch (error) {
      console.error('[storeService.create] Error:', error);
      throw error;
    }
  },

  /**
   * Update existing store
   * PATCH /api/stores/{storeId}
   * @param storeId Store identifier
   * @param updateData Partial update data
   * @returns Updated store data
   */
  update: async (
    storeId: number,
    updateData: UpdateStoreFormState
  ): Promise<ResponseStoreDTO> => {
    try {
      if (!storeId || storeId <= 0) {
        throw new Error('Invalid store ID');
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error('No update data provided');
      }

      const url = `${getApiBaseUrl()}/stores/${storeId}`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: buildHeaders(true),
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await parseError(response);
        throw new Error(error.message);
      }

      const data = await response.json();
      return data as ResponseStoreDTO;
    } catch (error) {
      console.error('[storeService.update] Error:', error);
      throw error;
    }
  },

  /**
   * Delete store
   * DELETE /api/stores/{storeId}
   * @param storeId Store identifier
   * @returns void (204 No Content on success)
   */
  delete: async (storeId: number): Promise<void> => {
    try {
      if (!storeId || storeId <= 0) {
        throw new Error('Invalid store ID');
      }

      const url = `${getApiBaseUrl()}/stores/${storeId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: buildHeaders(true),
      });

      if (!response.ok) {
        const error = await parseError(response);
        throw new Error(error.message);
      }

      // 204 No Content responses have no body
    } catch (error) {
      console.error('[storeService.delete] Error:', error);
      throw error;
    }
  },
};

/**
 * Hook-friendly wrapper for error handling with toast notifications
 * Usage: useStoreService() for hook-based API calls with error handling
 */
export const useStoreService = () => {
  const handleApiError = (error: unknown, context: string) => {
    if (error instanceof Error) {
      console.error(`[${context}]`, error.message);
      return error.message;
    }
    const message = 'Nieznąd błąd API';
    console.error(`[${context}]`, message);
    return message;
  };

  return {
    getAll: (params?: PaginationParams) =>
      storeService.getAll(params).catch((error) => {
        handleApiError(error, 'getAll');
        throw error;
      }),

    getById: (storeId: number) =>
      storeService.getById(storeId).catch((error) => {
        handleApiError(error, 'getById');
        throw error;
      }),

    search: (filters?: Partial<StoreSpecificationDTO>, params?: PaginationParams) =>
      storeService.search(filters, params).catch((error) => {
        handleApiError(error, 'search');
        throw error;
      }),

    create: (createData: CreateStoreFormState) =>
      storeService.create(createData).catch((error) => {
        handleApiError(error, 'create');
        throw error;
      }),

    update: (storeId: number, updateData: UpdateStoreFormState) =>
      storeService.update(storeId, updateData).catch((error) => {
        handleApiError(error, 'update');
        throw error;
      }),

    delete: (storeId: number) =>
      storeService.delete(storeId).catch((error) => {
        handleApiError(error, 'delete');
        throw error;
      }),
  };
};
