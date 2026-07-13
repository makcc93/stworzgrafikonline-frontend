/**
 * Employee Mock Service
 * Simulates backend API responses with localStorage persistence
 */

import type {
  ResponseEmployeeDTO,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  EmployeeSpecificationDTO,
  MOCK_EMPLOYEES,
} from '@/types/employee.types';
import { MOCK_EMPLOYEES as DEFAULT_MOCK_EMPLOYEES } from '@/mocks/employee.mocks';

export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}

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
 * Get initial mock employees from localStorage or use defaults
 */
function getInitialMockEmployees(): ResponseEmployeeDTO[] {
  const storageKey = 'mock_employees_data';
  const stored = localStorage.getItem(storageKey);

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Check if data has warehouseman field, if not, migrate
      const hasWarehousemanField = parsed.length > 0 && parsed[0].hasOwnProperty('warehouseman');
      if (!hasWarehousemanField) {
        console.log('Migrating employee data to include warehouseman field');
        const migrated = parsed.map((emp: any) => ({
          ...emp,
          warehouseman: emp.positionId === 5, // Set warehouseman true for positionId 5 (Magazynier)
          canOperateDelivery: emp.canOperateDelivery || false,
          cashier: emp.cashier || false,
          pok: emp.pok || false,
        }));
        localStorage.setItem(storageKey, JSON.stringify(migrated));
        return migrated;
      }
      return parsed;
    } catch (error) {
      console.warn('Failed to parse stored mock employees, generating new');
      localStorage.removeItem(storageKey);
    }
  }

  const mockEmployees = DEFAULT_MOCK_EMPLOYEES;
  localStorage.setItem(storageKey, JSON.stringify(mockEmployees));
  return mockEmployees;
}

/**
 * Clear localStorage and reset to default mock employees
 * Useful for debugging when data structure changes
 */
export function clearEmployeeCache() {
  const storageKey = 'mock_employees_data';
  localStorage.removeItem(storageKey);
  console.log('Employee cache cleared - will reload with fresh data on next call');
}

/**
 * Get all employees from localStorage
 */
function getAllEmployeesFromStorage(): ResponseEmployeeDTO[] {
  const storageKey = 'mock_employees_data';
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : getInitialMockEmployees();
}

/**
 * Save employees to localStorage
 */
function saveEmployeesToStorage(employees: ResponseEmployeeDTO[]): void {
  const storageKey = 'mock_employees_data';
  localStorage.setItem(storageKey, JSON.stringify(employees));
}

/**
 * Simulate network delay (400-600ms)
 */
function simulateNetworkDelay(): Promise<void> {
  const delayMs = 400 + Math.random() * 200;
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Filter employees by store ID
 */
function filterByStore(employees: ResponseEmployeeDTO[], storeId: number): ResponseEmployeeDTO[] {
  return employees.filter((e) => e.storeId === storeId);
}

/**
 * Filter employees by specification criteria
 */
function filterBySpecification(
  employees: ResponseEmployeeDTO[],
  filters?: Partial<EmployeeSpecificationDTO>
): ResponseEmployeeDTO[] {
  if (!filters || Object.keys(filters).length === 0) {
    return employees;
  }

  return employees.filter((employee) => {
    if (filters.id && employee.id !== filters.id) return false;
    if (filters.firstName && !employee.firstName.toLowerCase().includes(filters.firstName.toLowerCase())) return false;
    if (filters.lastName && !employee.lastName.toLowerCase().includes(filters.lastName.toLowerCase())) return false;
    if (filters.sap && employee.sap !== filters.sap) return false;
    if (filters.positionId && employee.positionId !== filters.positionId) return false;
    if (filters.storeId && employee.storeId !== filters.storeId) return false;
    if (filters.enable !== undefined && employee.enable !== filters.enable) return false;
    if (filters.canOperateCheckout !== undefined && employee.canOperateCheckout !== filters.canOperateCheckout) return false;
    if (filters.canOperateCredit !== undefined && employee.canOperateCredit !== filters.canOperateCredit) return false;
    if (filters.canOpenCloseStore !== undefined && employee.canOpenCloseStore !== filters.canOpenCloseStore) return false;
    if (filters.seller !== undefined && employee.seller !== filters.seller) return false;
    if (filters.manager !== undefined && employee.manager !== filters.manager) return false;
    return true;
  });
}

/**
 * Sort employees by field
 */
function sortEmployees(
  employees: ResponseEmployeeDTO[],
  sortField: string = 'createdAt',
  direction: 'ASC' | 'DESC' = 'DESC'
): ResponseEmployeeDTO[] {
  const sorted = [...employees].sort((a, b) => {
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
 * Paginate employees array
 */
function paginateEmployees<T>(
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

/**
 * Employee Mock Service
 */
export const employeeMockService = {
  /**
   * Get all employees for a store with pagination
   */
  getAll: async (storeId: number, params?: PaginationParams): Promise<Page<ResponseEmployeeDTO>> => {
    await simulateNetworkDelay();

    const allEmployees = getAllEmployeesFromStorage();
    const storeEmployees = filterByStore(allEmployees, storeId);
    const sortField = params?.sort ?? 'createdAt';
    const sortDirection = params?.direction ?? 'DESC';
    const page = params?.page ?? 0;
    const size = params?.size ?? 25;

    const sorted = sortEmployees(storeEmployees, sortField, sortDirection);
    return paginateEmployees(sorted, page, size);
  },

  /**
   * Get single employee by ID
   */
  getById: async (storeId: number, employeeId: number): Promise<ResponseEmployeeDTO> => {
    await simulateNetworkDelay();

    const allEmployees = getAllEmployeesFromStorage();
    const employee = allEmployees.find((e) => e.id === employeeId && e.storeId === storeId);

    if (!employee) {
      throw new Error(`Employee with ID ${employeeId} not found in store ${storeId}`);
    }

    return employee;
  },

  /**
   * Search employees with filters
   */
  search: async (
    storeId: number,
    filters?: Partial<EmployeeSpecificationDTO>,
    params?: PaginationParams
  ): Promise<Page<ResponseEmployeeDTO>> => {
    await simulateNetworkDelay();

    const allEmployees = getAllEmployeesFromStorage();
    const storeEmployees = filterByStore(allEmployees, storeId);
    const filtered = filterBySpecification(storeEmployees, filters);
    const sortField = params?.sort ?? 'createdAt';
    const sortDirection = params?.direction ?? 'DESC';
    const page = params?.page ?? 0;
    const size = params?.size ?? 25;

    const sorted = sortEmployees(filtered, sortField, sortDirection);
    return paginateEmployees(sorted, page, size);
  },

  /**
   * Create new employee
   */
  create: async (storeId: number, createData: CreateEmployeeDTO): Promise<ResponseEmployeeDTO> => {
    await simulateNetworkDelay();

    const allEmployees = getAllEmployeesFromStorage();

    // Validate SAP is unique
    if (allEmployees.some((e) => e.sap === createData.sap)) {
      throw new Error(`SAP number ${createData.sap} already exists`);
    }

    // Validate firstName
    if (!createData.firstName || createData.firstName.length < 3 || createData.firstName.length > 50) {
      throw new Error('Imię musi zawierać 3-50 znaków');
    }

    // Validate lastName
    if (!createData.lastName || createData.lastName.length < 3 || createData.lastName.length > 50) {
      throw new Error('Nazwisko musi zawierać 3-50 znaków');
    }

    // Find max ID
    const maxId = Math.max(...allEmployees.map((e) => e.id), 0);

    const newEmployee: ResponseEmployeeDTO = {
      id: maxId + 1,
      firstName: createData.firstName,
      lastName: createData.lastName,
      sap: createData.sap,
      storeId,
      positionId: createData.positionId,
      enable: true,
      canOperateCheckout: false,
      canOperateCredit: false,
      canOpenCloseStore: false,
      canOperateDelivery: false,
      warehouseman: false,
      seller: false,
      manager: false,
      cashier: false,
      pok: false,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    allEmployees.push(newEmployee);
    saveEmployeesToStorage(allEmployees);

    return newEmployee;
  },

  /**
   * Update employee
   */
  update: async (
    storeId: number,
    employeeId: number,
    updateData: UpdateEmployeeDTO
  ): Promise<ResponseEmployeeDTO> => {
    await simulateNetworkDelay();

    const allEmployees = getAllEmployeesFromStorage();
    const employeeIndex = allEmployees.findIndex((e) => e.id === employeeId && e.storeId === storeId);

    if (employeeIndex === -1) {
      throw new Error(`Employee with ID ${employeeId} not found in store ${storeId}`);
    }

    const employee = allEmployees[employeeIndex];

    // Validate SAP uniqueness if updating
    if (updateData.sap && updateData.sap !== employee.sap) {
      if (allEmployees.some((e) => e.sap === updateData.sap && e.id !== employeeId)) {
        throw new Error(`SAP number ${updateData.sap} already exists`);
      }
    }

    // Validate firstName if updating
    if (updateData.firstName && (updateData.firstName.length < 3 || updateData.firstName.length > 50)) {
      throw new Error('Imię musi zawierać 3-50 znaków');
    }

    // Validate lastName if updating
    if (updateData.lastName && (updateData.lastName.length < 3 || updateData.lastName.length > 50)) {
      throw new Error('Nazwisko musi zawierać 3-50 znaków');
    }

    // Apply updates
    const updatedEmployee: ResponseEmployeeDTO = {
      ...employee,
      ...(updateData.firstName && { firstName: updateData.firstName }),
      ...(updateData.lastName && { lastName: updateData.lastName }),
      ...(updateData.sap && { sap: updateData.sap }),
      ...(updateData.positionId && { positionId: updateData.positionId }),
      ...(updateData.enable !== undefined && { enable: updateData.enable }),
      ...(updateData.canOperateCheckout !== undefined && { canOperateCheckout: updateData.canOperateCheckout }),
      ...(updateData.canOperateCredit !== undefined && { canOperateCredit: updateData.canOperateCredit }),
      ...(updateData.canOpenCloseStore !== undefined && { canOpenCloseStore: updateData.canOpenCloseStore }),
      ...(updateData.seller !== undefined && { seller: updateData.seller }),
      ...(updateData.manager !== undefined && { manager: updateData.manager }),
      ...(updateData.warehouseman !== undefined && { warehouseman: updateData.warehouseman }),
      ...(updateData.cashier !== undefined && { cashier: updateData.cashier }),
      ...(updateData.pok !== undefined && { pok: updateData.pok }),
      updatedAt: new Date().toISOString(),
    };

    allEmployees[employeeIndex] = updatedEmployee;
    saveEmployeesToStorage(allEmployees);

    return updatedEmployee;
  },

  /**
   * Delete employee
   */
  delete: async (storeId: number, employeeId: number): Promise<void> => {
    await simulateNetworkDelay();

    const allEmployees = getAllEmployeesFromStorage();
    const employeeIndex = allEmployees.findIndex((e) => e.id === employeeId && e.storeId === storeId);

    if (employeeIndex === -1) {
      throw new Error(`Employee with ID ${employeeId} not found in store ${storeId}`);
    }

    allEmployees.splice(employeeIndex, 1);
    saveEmployeesToStorage(allEmployees);
  },

  /**
   * Reset all data to initial state
   */
  reset: (): void => {
    const storageKey = 'mock_employees_data';
    localStorage.removeItem(storageKey);
    getInitialMockEmployees();
    console.log('Mock employee data reset to initial state');
  },

  /**
   * Get current count of employees
   */
  getCount: (): number => {
    return getAllEmployeesFromStorage().length;
  },

  /**
   * Export all mock data as JSON
   */
  exportData: (): ResponseEmployeeDTO[] => {
    return getAllEmployeesFromStorage();
  },
};

// Initialize mock data on module load
getInitialMockEmployees();

console.log('🎭 Employee Mock Service loaded');
console.log(`📦 Loaded ${employeeMockService.getCount()} mock employee records`);