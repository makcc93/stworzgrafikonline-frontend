/**
 * YourStore Mock Data Provider
 * Simulates backend API responses with localStorage persistence
 * Includes realistic data, pagination, filtering, and network delays
 */

import type {
  ResponseStoreDTO,
  CreateStoreFormState,
  UpdateStoreFormState,
  StoreSpecificationDTO,
} from '@/types/YourStore.types';
import type { Page, PaginationParams } from './api/store.service';

// ==================== MOCK DATA GENERATION ====================

/**
 * Generate realistic mock stores
 */
function generateMockStores(): ResponseStoreDTO[] {
  const branches = [
    { id: 101, name: 'POLSKA PÓŁNOC' },
    { id: 102, name: 'CENTRALNA' },
    { id: 103, name: 'POLSKA POŁUDNIE' },
    { id: 104, name: 'WSCHODNIA' },
    { id: 105, name: 'ZACHODNIA' },
  ];

  const cities = [
    { name: 'Puławy', code: 'PL', manager: 'Jan Kowalski' },
    { name: 'Warszawa', code: 'WA', manager: 'Maria Nowak' },
    { name: 'Kraków', code: 'KR', manager: null },
    { name: 'Gdańsk', code: 'GD', manager: 'Piotr Lewandowski' },
    { name: 'Poznań', code: 'PZ', manager: 'Anna Kamińska' },
    { name: 'Wrocław', code: 'WR', manager: null },
    { name: 'Łódź', code: 'LZ', manager: 'Krzysztof Zając' },
    { name: 'Szczecin', code: 'SZ', manager: 'Ewa Müller' },
    { name: 'Bydgoszcz', code: 'BD', manager: 'Tomasz Sikora' },
    { name: 'Toruń', code: 'TO', manager: null },
    { name: 'Kielce', code: 'KE', manager: 'Magdalena Kowal' },
    { name: 'Katowice', code: 'KA', manager: 'Grzegorz Urban' },
    { name: 'Lublin', code: 'LU', manager: null },
    { name: 'Białystok', code: 'BI', manager: 'Jacek Nowak' },
    { name: 'Radom', code: 'RA', manager: 'Teresa Góra' },
  ];

  const locations = [
    'ul. Główna 1',
    'al. Jerozolimskie 45',
    'ul. Floriańska 20',
    'ul. Długa 50',
    'pl. Nowy Świat 15',
    'ul. Mariacka 8',
    'al. Ujazdowskie 30',
    'ul. Piotrkowska 100',
    'ul. Świętego Marcina 15',
    'ul. Kazimierza Wielkiego 25',
    'ul. Księcia Józefa 40',
    'al. Armii Krajowej 20',
    'ul. Ołowna 12',
    'ul. Sienna 35',
    'pl. Zamkowy 10',
  ];

  const stores: ResponseStoreDTO[] = cities.map((city, index) => {
    const branch = branches[index % branches.length];
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 90));

    return {
      id: index + 1,
      name: `SKLEP ${city.name.toUpperCase()}`,
      storeCode: city.code,
      location: `${locations[index]}, ${city.name}`,
      branchId: branch.id,
      branchName: branch.name,
      createdAt: createdDate.toISOString(),
      enable: Math.random() > 0.15, // ~85% enabled
      storeManagerId: city.manager ? 500 + index : null,
      storeManagerFullName: city.manager,
      details: null, // Will be loaded separately via storeDetailsService
    };
  });

  return stores;
}

/**
 * Get initial mock stores from localStorage or generate new ones
 */
function getInitialMockStores(): ResponseStoreDTO[] {
  const storageKey = 'mock_stores_data';
  const stored = localStorage.getItem(storageKey);

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to parse stored mock data, generating new');
      localStorage.removeItem(storageKey);
    }
  }

  const mockStores = generateMockStores();
  localStorage.setItem(storageKey, JSON.stringify(mockStores));
  return mockStores;
}

/**
 * Get all stores from localStorage
 */
function getAllStoresFromStorage(): ResponseStoreDTO[] {
  const storageKey = 'mock_stores_data';
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : getInitialMockStores();
}

/**
 * Save stores to localStorage
 */
function saveStoresToStorage(stores: ResponseStoreDTO[]): void {
  const storageKey = 'mock_stores_data';
  localStorage.setItem(storageKey, JSON.stringify(stores));
}

/**
 * Simulate network delay
 */
function simulateNetworkDelay(): Promise<void> {
  const delayMs = 300 + Math.random() * 500; // 300-800ms
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Filter stores by criteria
 */
function filterStores(
  stores: ResponseStoreDTO[],
  filters?: Partial<StoreSpecificationDTO>
): ResponseStoreDTO[] {
  if (!filters || Object.keys(filters).length === 0) {
    return stores;
  }

  return stores.filter((store) => {
    if (filters.storeCode && !store.storeCode.toLowerCase().includes(filters.storeCode.toLowerCase())) {
      return false;
    }
    if (filters.name && !store.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    if (filters.location && !store.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    if (filters.branchId && store.branchId !== filters.branchId) {
      return false;
    }
    if (filters.storeManagerId && store.storeManagerId !== filters.storeManagerId) {
      return false;
    }
    if (filters.enable !== undefined && store.enable !== filters.enable) {
      return false;
    }
    return true;
  });
}

/**
 * Sort stores by criteria
 */
function sortStores(
  stores: ResponseStoreDTO[],
  sortField: string = 'createdAt',
  direction: 'ASC' | 'DESC' = 'DESC'
): ResponseStoreDTO[] {
  const sorted = [...stores].sort((a, b) => {
    let aValue = (a as any)[sortField];
    let bValue = (b as any)[sortField];

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }

    if (aValue < bValue) return direction === 'ASC' ? -1 : 1;
    if (aValue > bValue) return direction === 'ASC' ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Paginate stores array
 */
function paginateStores<T>(
  items: T[],
  page: number = 0,
  size: number = 25
): Page<T> {
  const totalElements = items.length;
  const totalPages = Math.ceil(totalElements / size);
  const startIndex = page * size;
  const endIndex = startIndex + size;
  const content = items.slice(startIndex, endIndex);

  return {
    content,
    totalElements,
    totalPages,
    size,
    number: page,
    isEmpty: content.length === 0,
    isFirst: page === 0,
    isLast: page >= totalPages - 1,
  };
}

// ==================== MOCK SERVICE IMPLEMENTATION ====================

/**
 * YourStore Mock Service
 * Implements all store service methods with mock data
 */
export const storeMockService = {
  /**
   * Get all stores with pagination (mocked)
   */
  getAll: async (params?: PaginationParams): Promise<Page<ResponseStoreDTO>> => {
    await simulateNetworkDelay();

    const stores = getAllStoresFromStorage();
    const sortField = params?.sort ?? 'createdAt';
    const sortDirection = params?.direction ?? 'DESC';
    const page = params?.page ?? 0;
    const size = params?.size ?? 25;

    const sorted = sortStores(stores, sortField, sortDirection);
    return paginateStores(sorted, page, size);
  },

  /**
   * Get store by ID (mocked)
   */
  getById: async (storeId: number): Promise<ResponseStoreDTO> => {
    await simulateNetworkDelay();

    const stores = getAllStoresFromStorage();
    const store = stores.find((s) => s.id === storeId);

    if (!store) {
      throw new Error(`Store with ID ${storeId} not found`);
    }

    return store;
  },

  /**
   * Search stores by criteria (mocked)
   */
  search: async (
    filters?: Partial<StoreSpecificationDTO>,
    params?: PaginationParams
  ): Promise<Page<ResponseStoreDTO>> => {
    await simulateNetworkDelay();

    const stores = getAllStoresFromStorage();
    const filtered = filterStores(stores, filters);
    const sortField = params?.sort ?? 'createdAt';
    const sortDirection = params?.direction ?? 'DESC';
    const page = params?.page ?? 0;
    const size = params?.size ?? 25;

    const sorted = sortStores(filtered, sortField, sortDirection);
    return paginateStores(sorted, page, size);
  },

  /**
   * Create new store (mocked)
   */
  create: async (createData: CreateStoreFormState): Promise<ResponseStoreDTO> => {
    await simulateNetworkDelay();

    const stores = getAllStoresFromStorage();

    // Check for duplicate store code
    if (stores.some((s) => s.storeCode === createData.storeCode)) {
      throw new Error(`Store code '${createData.storeCode}' already exists`);
    }

    // Find max ID
    const maxId = Math.max(...stores.map((s) => s.id), 0);

    // Find branch name
    const branches = [
      { id: 101, name: 'POLSKA PÓŁNOC' },
      { id: 102, name: 'CENTRALNA' },
      { id: 103, name: 'POLSKA POŁUDNIE' },
      { id: 104, name: 'WSCHODNIA' },
      { id: 105, name: 'ZACHODNIA' },
    ];
    const branch = branches.find((b) => b.id === createData.branchId);
    const branchName = branch?.name ?? 'UNKNOWN';

    const newStore: ResponseStoreDTO = {
      id: maxId + 1,
      name: createData.name,
      storeCode: createData.storeCode,
      location: createData.location,
      branchId: createData.branchId,
      branchName: branchName,
      createdAt: new Date().toISOString(),
      enable: true,
      storeManagerId: null,
      storeManagerFullName: null,
      details: null,
    };

    stores.push(newStore);
    saveStoresToStorage(stores);

    return newStore;
  },

  /**
   * Update existing store (mocked)
   */
  update: async (
    storeId: number,
    updateData: UpdateStoreFormState
  ): Promise<ResponseStoreDTO> => {
    await simulateNetworkDelay();

    const stores = getAllStoresFromStorage();
    const storeIndex = stores.findIndex((s) => s.id === storeId);

    if (storeIndex === -1) {
      throw new Error(`Store with ID ${storeId} not found`);
    }

    const store = stores[storeIndex];

    // Check for duplicate store code if updating
    if (updateData.storeCode && updateData.storeCode !== store.storeCode) {
      if (stores.some((s) => s.storeCode === updateData.storeCode && s.id !== storeId)) {
        throw new Error(`Store code '${updateData.storeCode}' already exists`);
      }
    }

    // Apply updates
    const updatedStore: ResponseStoreDTO = {
      ...store,
      ...(updateData.name && { name: updateData.name }),
      ...(updateData.storeCode && { storeCode: updateData.storeCode }),
      ...(updateData.location && { location: updateData.location }),
      ...(updateData.branchId && { branchId: updateData.branchId }),
      ...(updateData.storeManagerId !== undefined && {
        storeManagerId: updateData.storeManagerId,
      }),
      enable: updateData.enable,
    };

    stores[storeIndex] = updatedStore;
    saveStoresToStorage(stores);

    return updatedStore;
  },

  /**
   * Delete store (mocked)
   */
  delete: async (storeId: number): Promise<void> => {
    await simulateNetworkDelay();

    const stores = getAllStoresFromStorage();
    const storeIndex = stores.findIndex((s) => s.id === storeId);

    if (storeIndex === -1) {
      throw new Error(`Store with ID ${storeId} not found`);
    }

    stores.splice(storeIndex, 1);
    saveStoresToStorage(stores);
  },

  /**
   * Reset all data to initial state (useful for development)
   */
  reset: (): void => {
    const storageKey = 'mock_stores_data';
    localStorage.removeItem(storageKey);
    getInitialMockStores();
    console.log('Mock data reset to initial state');
  },

  /**
   * Get current count of stores in storage
   */
  getCount: (): number => {
    return getAllStoresFromStorage().length;
  },

  /**
   * Export all mock data as JSON
   */
  exportData: (): ResponseStoreDTO[] => {
    return getAllStoresFromStorage();
  },

  /**
   * Import mock data from JSON
   */
  importData: (data: ResponseStoreDTO[]): void => {
    if (!Array.isArray(data)) {
      throw new Error('Import data must be an array of stores');
    }
    saveStoresToStorage(data);
  },
};

// ==================== INITIALIZATION ====================

// Initialize mock data on module load
getInitialMockStores();

console.log('🎭 YourStore Mock Service loaded');
console.log(`📦 Loaded ${storeMockService.getCount()} mock store records`);
