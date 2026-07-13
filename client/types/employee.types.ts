/**
 * Employee Module Types
 * Aligned with backend DTOs for employee management
 */

// ==================== BASIC INTERFACES ====================

/**
 * Employee Position reference
 */
export interface Position {
  id: number;
  name: string;
}

/**
 * Employee response data from backend
 * @property id - Employee unique identifier
 * @property firstName - First name (3-50 chars)
 * @property lastName - Last name (3-50 chars)
 * @property sap - SAP employee number (8 digits)
 * @property storeId - Associated store ID
 * @property positionId - Employee position reference
 * @property enable - Whether employee is active
 * @property canOperateCheckout - Permission to operate checkout
 * @property canOperateCredit - Permission to operate credit
 * @property canOpenCloseStore - Permission to open/close store
 * @property canOperateDelivery - Permission to operate delivery
 * @property warehouseman - Whether employee is a warehouseman
 * @property seller - Whether employee is a seller
 * @property manager - Whether employee is a manager
 * @property cashier - Whether employee is a cashier
 * @property pok - Employee that can operate clients pickups
 * @property createdAt - Creation timestamp (ISO 8601)
 * @property updatedAt - Last update timestamp (ISO 8601, nullable)
 */
export interface ResponseEmployeeDTO {
  id: number;
  firstName: string;
  lastName: string;
  sap: number;
  storeId: number;
  positionId: number;
  enable: boolean;
  canOperateCheckout: boolean;
  canOperateCredit: boolean;
  canOpenCloseStore: boolean;
  canOperateDelivery: boolean;
  warehouseman: boolean;
  seller: boolean;
  manager: boolean;
  cashier: boolean;
  pok: boolean;
  isSpecial?: boolean;
  specialWorkNormId?: number | null;
  specialWorkNormName?: string | null;
  etatNumerator?: number;
  etatDenominator?: number;
  createdAt: string; // ISO 8601
  updatedAt: string | null; // ISO 8601
}

/**
 * Employee with position name (for UI display)
 * Backend only provides positionId, we enrich with positionName
 */
export interface EmployeeWithPosition extends ResponseEmployeeDTO {
  positionName?: string;
}

/**
 * Create Employee Form State
 * Used when creating a new employee
 * @property firstName - First name (required, 3-50 chars)
 * @property lastName - Last name (required, 3-50 chars)
 * @property sap - SAP number (required, 8 digits)
 * @property positionId - Position assignment (required)
 */
export interface CreateEmployeeDTO {
  firstName: string;
  lastName: string;
  sap: number;
  positionId: number;
}

/**
 * Update Employee Form State
 * Used when editing an existing employee (all fields optional)
 */
export interface UpdateEmployeeDTO {
  firstName?: string;
  lastName?: string;
  sap?: number;
  positionId?: number;
  enable: boolean;           // wymagane
  canOperateCheckout: boolean;
  canOperateCredit: boolean;
  canOpenCloseStore: boolean;
  canOperateDelivery: boolean;
  warehouseman: boolean;
  seller: boolean;
  manager: boolean;
  cashier: boolean;
  pok: boolean;
  isSpecial?: boolean;
  specialWorkNormId?: number | null;
  etatNumerator?: number;
  etatDenominator?: number;
  updatedAt: string;
}

/**
 * Employee Specification for filtering and searching
 * All fields are optional and used as filter criteria
 */
export type EmployeeSpecificationDTO = {
  id?: number;
  firstName?: string;
  lastName?: string;
  sap?: number;
  positionId?: number;
  storeId?: number;
  enable?: boolean;
  canOperateCheckout?: boolean;
  canOperateCredit?: boolean;
  canOpenCloseStore?: boolean;
  canOperateDelivery?: boolean;
  warehouseman?: boolean;
  seller?: boolean;
  manager?: boolean;
  cashier?: boolean;
  pok?: boolean;
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate SAP number format (must be 8 digits)
 * @param sap - SAP number to validate
 * @returns true if valid, false otherwise
 */
export function isValidSap(sap: number): boolean {
  const sapStr = sap.toString();
  return sapStr.length === 8 && /^\d{8}$/.test(sapStr);
}

/**
 * Create default/empty employee form state
 * @returns Partial employee object ready for form initialization
 */
export function createDefaultEmployee(): Partial<CreateEmployeeDTO> {
  return {
    firstName: '',
    lastName: '',
    sap: undefined,
    positionId: undefined,
  };
}

/**
 * Map backend employee to UI-friendly format with position lookup
 * @param employee - Employee from backend
 * @param positions - List of available positions
 * @returns Employee with computed fullName and positionName
 */
export function mapToEmployeeWithPosition(
  employee: ResponseEmployeeDTO,
  positions: Position[]
) {
  const position = positions.find((p) => p.id === employee.positionId);
  return {
    ...employee,
    fullName: `${employee.firstName} ${employee.lastName}`,
    positionName: position?.name || 'Nieznana pozycja',
  };
}

// ==================== VALIDATION PATTERNS ====================

/**
 * Validation patterns matching backend constraints
 */
export const EMPLOYEE_VALIDATION = {
  firstName: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-ZąćęłńóśźżĄĘĆŁŃÓŚŹŻ\s-]+$/,
    message: 'Imię musi zawierać 3-50 znaków (tylko litery, spacje i myślniki)',
  },
  lastName: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-ZąćęłńóśźżĄĘĆŁŃÓŚŹŻ\s-]+$/,
    message: 'Nazwisko musi zawierać 3-50 znaków (tylko litery, spacje i myślniki)',
  },
  sap: {
    digits: 8,
    pattern: /^\d{8}$/,
    message: 'Numer SAP musi zawierać dokładnie 8 cyfr',
  },
} as const;

// ==================== MOCK DATA ====================

/**
 * Mock employee positions
 */
export const MOCK_POSITIONS: Position[] = [
  { id: 1, name: 'Kierownik Sklepu' },
  { id: 2, name: 'Kierownik Sprzedaży' },
  { id: 3, name: 'Doradca Klienta' },
  { id: 4, name: 'Kasjer' },
  { id: 5, name: 'Magazynier' },
];

/**
 * Mock employee data for development and testing
 */
export const MOCK_EMPLOYEES: ResponseEmployeeDTO[] = [
  {
    id: 1,
    firstName: 'Jan',
    lastName: 'Kowalski',
    sap: 12345678,
    storeId: 1,
    positionId: 1,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: true,
    canOpenCloseStore: true,
    canOperateDelivery: true,
    warehouseman: false,
    seller: true,
    manager: true,
    cashier: false,
    pok: false,
    isSpecial: true,
    specialWorkNormId:1,
    specialWorkNormName: 'test',
    etatNumerator: 8,
    etatDenominator: 1,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: null,
  },
  {
    id: 2,
    firstName: 'Maria',
    lastName: 'Nowak',
    sap: 23456789,
    storeId: 1,
    positionId: 2,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: true,
    canOpenCloseStore: false,
    canOperateDelivery: true,
    warehouseman: false,
    seller: true,
    manager: true,
    cashier: false,
    pok: false,
    createdAt: '2024-01-10T09:30:00Z',
    updatedAt: '2024-02-20T14:15:00Z',
  },
  {
    id: 3,
    firstName: 'Piotr',
    lastName: 'Lewandowski',
    sap: 34567890,
    storeId: 1,
    positionId: 3,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: true,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-08T10:45:00Z',
    updatedAt: null,
  },
  {
    id: 4,
    firstName: 'Anna',
    lastName: 'Kamińska',
    sap: 45678901,
    storeId: 1,
    positionId: 4,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: true,
    warehouseman: false,
    seller: false,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-20T08:15:00Z',
    updatedAt: null,
  },
  {
    id: 5,
    firstName: 'Krzysztof',
    lastName: 'Zając',
    sap: 56789012,
    storeId: 1,
    positionId: 5,
    enable: true,
    canOperateCheckout: false,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: true,
    seller: false,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-12T07:30:00Z',
    updatedAt: '2024-02-10T11:00:00Z',
  },
  {
    id: 6,
    firstName: 'Ewa',
    lastName: 'Müller',
    sap: 67890123,
    storeId: 2,
    positionId: 3,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: true,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-18T09:00:00Z',
    updatedAt: null,
  },
  {
    id: 7,
    firstName: 'Tomasz',
    lastName: 'Sikora',
    sap: 78901234,
    storeId: 2,
    positionId: 2,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: true,
    canOpenCloseStore: true,
    canOperateDelivery: true,
    warehouseman: false,
    seller: true,
    manager: true,
    cashier: false,
    pok: false,
    createdAt: '2024-01-05T08:30:00Z',
    updatedAt: '2024-02-15T16:45:00Z',
  },
  {
    id: 8,
    firstName: 'Magdalena',
    lastName: 'Kowal',
    sap: 89012345,
    storeId: 2,
    positionId: 4,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: false,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-22T10:15:00Z',
    updatedAt: null,
  },
  {
    id: 9,
    firstName: 'Grzegorz',
    lastName: 'Urban',
    sap: 90123456,
    storeId: 2,
    positionId: 1,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: true,
    canOpenCloseStore: true,
    canOperateDelivery: true,
    warehouseman: false,
    seller: true,
    manager: true,
    cashier: false,
    pok: false,
    createdAt: '2024-01-02T07:00:00Z',
    updatedAt: '2024-02-18T13:30:00Z',
  },
  {
    id: 10,
    firstName: 'Jacek',
    lastName: 'Nowak',
    sap: 11223344,
    storeId: 3,
    positionId: 3,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: true,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-25T09:45:00Z',
    updatedAt: null,
  },
  {
    id: 11,
    firstName: 'Teresa',
    lastName: 'Góra',
    sap: 22334455,
    storeId: 3,
    positionId: 2,
    enable: false,
    canOperateCheckout: false,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: false,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-03T08:00:00Z',
    updatedAt: '2024-02-25T15:20:00Z',
  },
  {
    id: 12,
    firstName: 'Dariusz',
    lastName: 'Mróz',
    sap: 33445566,
    storeId: 3,
    positionId: 5,
    enable: true,
    canOperateCheckout: false,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: true,
    seller: false,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-19T06:30:00Z',
    updatedAt: null,
  },
  {
    id: 13,
    firstName: 'Beata',
    lastName: 'Szymańska',
    sap: 44556677,
    storeId: 1,
    positionId: 8,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: true,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-28T10:00:00Z',
    updatedAt: '2024-02-22T12:45:00Z',
  },
  {
    id: 14,
    firstName: 'Łukasz',
    lastName: 'Wójcik',
    sap: 55667788,
    storeId: 2,
    positionId: 5,
    enable: true,
    canOperateCheckout: false,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: true,
    seller: false,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-07T07:15:00Z',
    updatedAt: null,
  },
  {
    id: 15,
    firstName: 'Urszula',
    lastName: 'Zielińska',
    sap: 66778899,
    storeId: 3,
    positionId: 4,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: false,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-30T08:45:00Z',
    updatedAt: null,
  },
  {
    id: 16,
    firstName: 'Monika',
    lastName: 'Szymańska',
    sap: 44556678,
    storeId: 1,
    positionId: 3,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: true,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-28T10:00:00Z',
    updatedAt: '2024-02-22T12:45:00Z',
  },
  {
    id: 17,
    firstName: 'Dawid',
    lastName: 'Guz',
    sap: 44056678,
    storeId: 1,
    positionId: 3,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: true,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-28T10:00:00Z',
    updatedAt: '2024-02-22T12:45:00Z',
  },
  {
    id: 18,
    firstName: 'Andrzej',
    lastName: 'Pisula',
    sap: 41556678,
    storeId: 1,
    positionId: 3,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: true,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-28T10:00:00Z',
    updatedAt: '2024-02-22T12:45:00Z',
  },
  {
    id: 19,
    firstName: 'Marek',
    lastName: 'Kubiś',
    sap: 44556111,
    storeId: 1,
    positionId: 3,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: true,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-28T10:00:00Z',
    updatedAt: '2024-02-22T12:45:00Z',
  },
  {
    id: 20,
    firstName: 'Anna',
    lastName: 'Żyłka',
    sap: 44511178,
    storeId: 1,
    positionId: 3,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: true,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-28T10:00:00Z',
    updatedAt: '2024-02-22T12:45:00Z',
  },
  {
    id: 21,
    firstName: 'Damian',
    lastName: 'Miroński',
    sap: 44550078,
    storeId: 1,
    positionId: 3,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: true,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-28T10:00:00Z',
    updatedAt: '2024-02-22T12:45:00Z',
  },
  {
    id: 22,
    firstName: 'Krystyna',
    lastName: 'Czubówna',
    sap: 43556378,
    storeId: 1,
    positionId: 3,
    enable: true,
    canOperateCheckout: true,
    canOperateCredit: false,
    canOpenCloseStore: false,
    canOperateDelivery: false,
    warehouseman: false,
    seller: true,
    manager: false,
    cashier: false,
    pok: false,
    createdAt: '2024-01-28T10:00:00Z',
    updatedAt: '2024-02-22T12:45:00Z',
  },
];

// ==================== UTILITY TYPES ====================

/**
 * Pagination parameters for employee queries
 */
export interface EmployeePaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}

/**
 * API response wrapper for paginated employee lists
 */
export interface EmployeePage {
  content: ResponseEmployeeDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  isEmpty: boolean;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Employee form validation state
 */
export interface EmployeeFormValidation {
  firstName?: string; // Error message if any
  lastName?: string;
  sap?: string;
  positionId?: string;
}
