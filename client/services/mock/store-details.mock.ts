/**
 * StoreDetails Mock Service
 * Simulates backend API responses with localStorage persistence
 */

import type {
  StoreDetails,
  CreateStoreDetailsDTO,
  UpdateStoreDetailsDTO,
  StoreHoursBackend,
  OptimalStaffing,
} from '@/types/YourStore.types';

/**
 * Generate mock store details
 */
function generateMockStoreDetails(): StoreDetails[] {
  const details: StoreDetails[] = [
    {
      id: 1,
      storeId: 1,
      hours: {
        mondayOpen: '08:00',
        mondayClose: '20:00',
        tuesdayOpen: '08:00',
        tuesdayClose: '20:00',
        wednesdayOpen: '08:00',
        wednesdayClose: '20:00',
        thursdayOpen: '08:00',
        thursdayClose: '20:00',
        fridayOpen: '08:00',
        fridayClose: '21:00',
        saturdayOpen: '09:00',
        saturdayClose: '21:00',
        sundayOpen: '10:00',
        sundayClose: '19:00',
      },
      staffing: { storeManagers: 1, salesManagers: 2, sellers: 11, cashiers: 1, storemen: 1, pok: 0 },
    },
    {
      id: 2,
      storeId: 2,
      hours: {
        mondayOpen: '08:00',
        mondayClose: '22:00',
        tuesdayOpen: '08:00',
        tuesdayClose: '22:00',
        wednesdayOpen: '08:00',
        wednesdayClose: '22:00',
        thursdayOpen: '08:00',
        thursdayClose: '22:00',
        fridayOpen: '08:00',
        fridayClose: '23:00',
        saturdayOpen: '09:00',
        saturdayClose: '23:00',
        sundayOpen: '10:00',
        sundayClose: '22:00',
      },
      staffing: { storeManagers: 2, salesManagers: 3, sellers: 15, cashiers: 2, storemen: 2, pok: 1 },
    },
    {
      id: 3,
      storeId: 3,
      hours: {
        mondayOpen: '07:00',
        mondayClose: '21:00',
        tuesdayOpen: '07:00',
        tuesdayClose: '21:00',
        wednesdayOpen: '07:00',
        wednesdayClose: '21:00',
        thursdayOpen: '07:00',
        thursdayClose: '21:00',
        fridayOpen: '07:00',
        fridayClose: '22:00',
        saturdayOpen: '08:00',
        saturdayClose: '22:00',
        sundayOpen: '09:00',
        sundayClose: '20:00',
      },
      staffing: { storeManagers: 1, salesManagers: 2, sellers: 10, cashiers: 1, storemen: 1, pok: 0 },
    },
    {
      id: 4,
      storeId: 4,
      hours: {
        mondayOpen: '09:00',
        mondayClose: '18:00',
        tuesdayOpen: '09:00',
        tuesdayClose: '18:00',
        wednesdayOpen: '09:00',
        wednesdayClose: '18:00',
        thursdayOpen: '09:00',
        thursdayClose: '18:00',
        fridayOpen: '09:00',
        fridayClose: '19:00',
        saturdayOpen: '10:00',
        saturdayClose: '19:00',
        sundayOpen: '11:00',
        sundayClose: '17:00',
      },
      staffing: { storeManagers: 1, salesManagers: 1, sellers: 8, cashiers: 1, storemen: 1, pok: 0 },
    },
    {
      id: 5,
      storeId: 5,
      hours: {
        mondayOpen: '08:00',
        mondayClose: '20:00',
        tuesdayOpen: '08:00',
        tuesdayClose: '20:00',
        wednesdayOpen: '08:00',
        wednesdayClose: '20:00',
        thursdayOpen: '08:00',
        thursdayClose: '20:00',
        fridayOpen: '08:00',
        fridayClose: '21:00',
        saturdayOpen: '09:00',
        saturdayClose: '21:00',
        sundayOpen: '10:00',
        sundayClose: '19:00',
      },
      staffing: { storeManagers: 1, salesManagers: 2, sellers: 12, cashiers: 1, storemen: 1, pok: 0 },
    },
  ];

  return details;
}

/**
 * Get initial mock store details from localStorage or generate new ones
 */
function getInitialMockStoreDetails(): StoreDetails[] {
  const storageKey = 'mock_store_details_data';
  const stored = localStorage.getItem(storageKey);

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to parse stored mock store details, generating new');
      localStorage.removeItem(storageKey);
    }
  }

  const mockDetails = generateMockStoreDetails();
  localStorage.setItem(storageKey, JSON.stringify(mockDetails));
  return mockDetails;
}

/**
 * Get all store details from localStorage
 */
function getAllDetailsFromStorage(): StoreDetails[] {
  const storageKey = 'mock_store_details_data';
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : getInitialMockStoreDetails();
}

/**
 * Save store details to localStorage
 */
function saveDetailsToStorage(details: StoreDetails[]): void {
  const storageKey = 'mock_store_details_data';
  localStorage.setItem(storageKey, JSON.stringify(details));
}

/**
 * Simulate network delay (400-600ms)
 */
function simulateNetworkDelay(): Promise<void> {
  const delayMs = 400 + Math.random() * 200;
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * StoreDetails Mock Service
 */
export const storeDetailsMockService = {
  /**
   * Get store details by store ID
   */
  getByStoreId: async (storeId: number): Promise<StoreDetails> => {
    await simulateNetworkDelay();

    const details = getAllDetailsFromStorage();
    const detail = details.find((d) => d.storeId === storeId);

    if (!detail) {
      throw new Error(`Store details for store ID ${storeId} not found`);
    }

    return detail;
  },

  /**
   * Create store details
   */
  create: async (createData: CreateStoreDetailsDTO): Promise<StoreDetails> => {
    await simulateNetworkDelay();

    const details = getAllDetailsFromStorage();

    // Check if details already exist for this store
    if (details.some((d) => d.storeId === createData.storeId)) {
      throw new Error(`Store details for store ID ${createData.storeId} already exist`);
    }

    // Find max ID
    const maxId = Math.max(...details.map((d) => d.id), 0);

    const newDetail: StoreDetails = {
      id: maxId + 1,
      storeId: createData.storeId,
      hours: createData.hours,
      staffing: createData.staffing,
    };

    details.push(newDetail);
    saveDetailsToStorage(details);

    return newDetail;
  },

  /**
   * Update store details
   */
  update: async (storeId: number, updateData: UpdateStoreDetailsDTO): Promise<StoreDetails> => {
    await simulateNetworkDelay();

    const details = getAllDetailsFromStorage();
    const detailIndex = details.findIndex((d) => d.storeId === storeId);

    if (detailIndex === -1) {
      throw new Error(`Store details for store ID ${storeId} not found`);
    }

    const detail = details[detailIndex];

    // Apply updates
    const updatedDetail: StoreDetails = {
      ...detail,
      ...(updateData.hours && { hours: updateData.hours }),
      ...(updateData.staffing && { staffing: updateData.staffing }),
    };

    details[detailIndex] = updatedDetail;
    saveDetailsToStorage(details);

    return updatedDetail;
  },

  /**
   * Delete store details
   */
  delete: async (storeId: number): Promise<void> => {
    await simulateNetworkDelay();

    const details = getAllDetailsFromStorage();
    const detailIndex = details.findIndex((d) => d.storeId === storeId);

    if (detailIndex === -1) {
      throw new Error(`Store details for store ID ${storeId} not found`);
    }

    details.splice(detailIndex, 1);
    saveDetailsToStorage(details);
  },

  /**
   * Reset all data to initial state
   */
  reset: (): void => {
    const storageKey = 'mock_store_details_data';
    localStorage.removeItem(storageKey);
    getInitialMockStoreDetails();
    console.log('Mock store details reset to initial state');
  },

  /**
   * Get current count of store details in storage
   */
  getCount: (): number => {
    return getAllDetailsFromStorage().length;
  },

  /**
   * Export all mock data as JSON
   */
  exportData: (): StoreDetails[] => {
    return getAllDetailsFromStorage();
  },

  /**
   * Import mock data from JSON
   */
  importData: (data: StoreDetails[]): void => {
    if (!Array.isArray(data)) {
      throw new Error('Import data must be an array of store details');
    }
    saveDetailsToStorage(data);
  },
};

// Initialize mock data on module load
getInitialMockStoreDetails();

console.log('🎭 StoreDetails Mock Service loaded');
console.log(`📦 Loaded ${storeDetailsMockService.getCount()} mock store detail records`);
