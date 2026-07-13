import type { LocalDateTime } from '@/types/shared.types';

/**
 * YourStore Module Types
 * Aligned with backend DTOs for store configuration management
 */

// ==================== RESPONSE DTOs ====================

/**
 * Store Hours in Backend Format
 * Each day has separate open/close fields
 * @property mondayOpen - Format "HH:mm" e.g. "08:00"
 * @property mondayClose - Format "HH:mm" e.g. "20:00"
 */
export interface StoreHoursBackend {
  mondayOpen: string;
  mondayClose: string;
  tuesdayOpen: string;
  tuesdayClose: string;
  wednesdayOpen: string;
  wednesdayClose: string;
  thursdayOpen: string;
  thursdayClose: string;
  fridayOpen: string;
  fridayClose: string;
  saturdayOpen: string;
  saturdayClose: string;
  sundayOpen: string;
  sundayClose: string;
}

/**
 * Optimal Staffing Levels
 */
export interface OptimalStaffing {
  storeManagers: number;
  salesManagers: number;
  sellers: number;
  cashiers: number;
  storemen: number;
  pok: number;
  total?: number; 
}

/** Alias for backend DTO naming consistency */
export type OptimalStaffingDTO = OptimalStaffing;

/**
 * Store Details (hours and staffing)
 * Matches backend ResponseStoreDetailsDTO
 */
export interface ResponseStoreDetailsDTO {
  id: number;
  storeId: number;
  staffing: OptimalStaffingDTO;
  createdAt: LocalDateTime;
  createdByUserId: number | null;
  updatedAt: LocalDateTime | null;
  updatedByUserId: number | null;
}

/** Legacy alias for backward compatibility */
export type StoreDetails = ResponseStoreDetailsDTO;

/**
 * Store response data from backend
 * @property id - Store unique identifier (Long)
 * @property name - Store name (3-50 chars)
 * @property storeCode - Store code (warehouse code, exactly 2 alphanumeric chars)
 * @property location - Store location
 * @property branchId - Branch identifier
 * @property branchName - Branch name
 * @property createdAt - Store creation timestamp (ISO 8601)
 * @property enable - Whether store is active
 * @property storeManagerId - Manager identifier (nullable)
 * @property storeManagerFullName - Manager full name (computed field, read-only)
 * @property details - Store details with hours and staffing (nullable)
 */
/**
 * Store response from backend
 */
export interface ResponseStoreDTO {
  id: number;
  name: string;
  storeCode: string;
  location: string;
  branchId: number;
  branchName: string;
  createdAt: LocalDateTime;
  enable: boolean;
  storeManagerId: number | null;
  storeManagerFullName: string | null;
  details: ResponseStoreDetailsDTO | null;
}

/**
 * Store name and code preview
 * Used for quick display of store identity
 * @property name - Store name with Polish characters allowed
 * @property storeCode - 2-character store identifier
 */
export interface StoreNameAndCodeDTO {
  name: string;
  storeCode: string;
}

// ==================== FORM STATE DTOs ====================

/**
 * Create Store DTO
 * Used when creating a new store
 */
export interface CreateStoreDTO {
  name: string;
  storeCode: string; // 2 chars
  location: string;
  branchId: number;
}

/** Legacy alias for backward compatibility */
export type CreateStoreFormState = CreateStoreDTO;

/**
 * Update Store DTO
 * Used when updating an existing store
 */
export interface UpdateStoreDTO {
  name?: string;
  storeCode?: string;
  location?: string;
  branchId?: number;
  enable: boolean;
  storeManagerId?: number | null;
}

/** Legacy alias for backward compatibility */
export type UpdateStoreFormState = UpdateStoreDTO;

/**
 * Create Store Details DTO
 * Matches backend CreateStoreDetailsDTO
 */
export interface CreateStoreDetailsDTO {
  storeId: number;
  staffing: OptimalStaffingDTO;
  createdByUserId?: number;
}

/**
 * Update Store Details DTO
 * Matches backend UpdateStoreDetailsDTO
 */
export interface UpdateStoreDetailsDTO {
  staffing: OptimalStaffingDTO;
  updatedByUserId?: number;
}

// ==================== FILTER/SPECIFICATION TYPE ====================

/**
 * Store Specification for filtering and searching
 * All fields are optional and used as filter criteria
 * @property storeCode - Filter by store code
 * @property name - Filter by store name
 * @property location - Filter by location
 * @property branchId - Filter by branch
 * @property storeManagerId - Filter by manager
 * @property enable - Filter by active status
 */
export type StoreSpecificationDTO = {
  storeCode?: string;
  name?: string;
  location?: string;
  branchId?: number;
  storeManagerId?: number;
  enable?: boolean;
};

// ==================== EXTENDED TYPES FOR UI ====================

/**
 * Store with extended information for UI display
 * Combines ResponseStoreDTO with additional computed/display fields
 */
export interface StoreWithMetadata extends ResponseStoreDTO {
  displayName: string; // Full display name: "name (storeCode)"
  isActive: boolean; // Derived from enable field
  createdDate: Date; // Parsed createdAt timestamp
}

/**
 * Branch reference for store assignment
 */
export interface BranchReference {
  id: number;
  name: string;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Map backend hours format to frontend format
 * Backend: { mondayOpen: "08:00", mondayClose: "20:00", ... }
 * Frontend: { monday: { open: "08:00", close: "20:00" }, ... }
 */
export function mapBackendHoursToFrontend(backendHours: StoreHoursBackend): {
  [key: string]: { open: string; close: string };
} {
  return {
    monday: { open: backendHours.mondayOpen, close: backendHours.mondayClose },
    tuesday: { open: backendHours.tuesdayOpen, close: backendHours.tuesdayClose },
    wednesday: { open: backendHours.wednesdayOpen, close: backendHours.wednesdayClose },
    thursday: { open: backendHours.thursdayOpen, close: backendHours.thursdayClose },
    friday: { open: backendHours.fridayOpen, close: backendHours.fridayClose },
    saturday: { open: backendHours.saturdayOpen, close: backendHours.saturdayClose },
    sunday: { open: backendHours.sundayOpen, close: backendHours.sundayClose },
  };
}

/**
 * Map frontend hours format to backend format
 * Frontend: { monday: { open: "08:00", close: "20:00" }, ... }
 * Backend: { mondayOpen: "08:00", mondayClose: "20:00", ... }
 */
export function mapFrontendHoursToBackend(frontendHours: {
  [key: string]: { open: string; close: string };
}): StoreHoursBackend {
  return {
    mondayOpen: frontendHours.monday.open,
    mondayClose: frontendHours.monday.close,
    tuesdayOpen: frontendHours.tuesday.open,
    tuesdayClose: frontendHours.tuesday.close,
    wednesdayOpen: frontendHours.wednesday.open,
    wednesdayClose: frontendHours.wednesday.close,
    thursdayOpen: frontendHours.thursday.open,
    thursdayClose: frontendHours.thursday.close,
    fridayOpen: frontendHours.friday.open,
    fridayClose: frontendHours.friday.close,
    saturdayOpen: frontendHours.saturday.open,
    saturdayClose: frontendHours.saturday.close,
    sundayOpen: frontendHours.sunday.open,
    sundayClose: frontendHours.sunday.close,
  };
}

/**
 * Create default store hours
 */
export function createDefaultHours(): { [key: string]: { open: string; close: string } } {
  return {
    monday: { open: '08:00', close: '20:00' },
    tuesday: { open: '08:00', close: '20:00' },
    wednesday: { open: '08:00', close: '20:00' },
    thursday: { open: '08:00', close: '20:00' },
    friday: { open: '08:00', close: '21:00' },
    saturday: { open: '09:00', close: '21:00' },
    sunday: { open: '10:00', close: '19:00' },
  };
}

/**
 * Create default staffing levels
 */
export function createDefaultStaffing(): OptimalStaffing {
  return {
    storeManagers: 1,
    salesManagers: 2,
    sellers: 11,
    cashiers: 1,
    storemen: 1,
    pok: 0,
  };
}

// ==================== VALIDATION PATTERNS ====================

/**
 * Validation patterns matching backend constraints
 */
export const STORE_VALIDATION = {
  name: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-ZąćęłńóśźżĄĘĆŁŃÓŚŹŻ\s-]+$/, // Polish chars allowed
    message: 'Nazwa sklepu musi zawierać 3-50 znaków',
  },
  storeCode: {
    minLength: 2,
    maxLength: 2,
    pattern: /^[a-zA-Z0-9]{2}$/, // Only alphanumeric
    message: 'Kod sklepu musi zawierać dokładnie 2 znaki alfanumeryczne',
  },
  location: {
    minLength: 3,
    message: 'Lokalizacja musi zawierać co najmniej 3 znaki',
  },
} as const;

// ==================== MOCK DATA ====================

/**
 * Mock store details data
 */
export const MOCK_STORE_DETAILS: StoreDetails[] = [
  {
    id: 1,
    storeId: 1,
    staffing: createDefaultStaffing(),
    createdAt: '2024-01-15T08:00:00Z',
    createdByUserId: 1,
    updatedAt: null,
    updatedByUserId: null,
  },
  {
    id: 2,
    storeId: 2,
    staffing: { storeManagers: 2, salesManagers: 3, sellers: 15, cashiers: 2, storemen: 2, pok: 1 },
    createdAt: '2024-01-20T10:30:00Z',
    createdByUserId: 1,
    updatedAt: '2024-02-01T14:15:00Z',
    updatedByUserId: 2,
  },
];

/**
 * Mock store data for development and testing
 */
export const MOCK_STORES: ResponseStoreDTO[] = [
  {
    id: 1,
    name: 'SKLEP PUŁAWY',
    storeCode: 'PL',
    location: 'ul. Słoneczna 15, Puławy',
    branchId: 101,
    branchName: 'POLSKA PÓŁNOC',
    createdAt: '2024-01-15T08:00:00Z',
    enable: true,
    storeManagerId: 501,
    storeManagerFullName: 'Jan Kowalski',
    details: MOCK_STORE_DETAILS[0],
  },
  {
    id: 2,
    name: 'SKLEP WARSZAWA',
    storeCode: 'WA',
    location: 'al. Jerozolimskie 45, Warszawa',
    branchId: 102,
    branchName: 'CENTRALNA',
    createdAt: '2024-01-10T10:30:00Z',
    enable: true,
    storeManagerId: 502,
    storeManagerFullName: 'Maria Nowak',
    details: MOCK_STORE_DETAILS[1],
  },
  {
    id: 3,
    name: 'SKLEP KRAKÓW',
    storeCode: 'KR',
    location: 'ul. Floriańska 20, Kraków',
    branchId: 103,
    branchName: 'POLSKA POŁUDNIE',
    createdAt: '2024-01-08T09:15:00Z',
    enable: true,
    storeManagerId: null,
    storeManagerFullName: null,
    details: null,
  },
];

/**
 * Mock create store form state
 */
export const MOCK_CREATE_STORE: CreateStoreFormState = {
  name: 'SKLEP GDAŃSK',
  storeCode: 'GD',
  location: 'ul. Długa 50, Gdańsk',
  branchId: 104,
};

/**
 * Mock update store form state
 */
export const MOCK_UPDATE_STORE: UpdateStoreFormState = {
  name: 'SKLEP POZNAŃ',
  storeCode: 'PZ',
  location: 'ul. Święty Marcin 15, Poznań',
  branchId: 105,
  enable: true,
  storeManagerId: 503,
};

/**
 * Mock filter specification
 */
export const MOCK_STORE_FILTER: StoreSpecificationDTO = {
  branchId: 101,
  enable: true,
};

/**
 * Mock branches for dropdown/selection
 */
export const MOCK_BRANCHES: BranchReference[] = [
  { id: 101, name: 'POLSKA PÓŁNOC' },
  { id: 102, name: 'CENTRALNA' },
  { id: 103, name: 'POLSKA POŁUDNIE' },
  { id: 104, name: 'WSCHODNIA' },
  { id: 105, name: 'ZACHODNIA' },
];
