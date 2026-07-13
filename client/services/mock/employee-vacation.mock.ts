/**
 * Employee Vacation Mock Service
 * Uses localStorage for persistence
 */

import type {
  ResponseEmployeeVacationDTO,
  CreateEmployeeVacationDTO,
  UpdateEmployeeVacationDTO,
  EmployeeVacationSpecificationDTO,
} from '@/types/employee-vacation.types';
import {
  MOCK_VACATIONS,
  isValidVacationArray,
} from '@/types/employee-vacation.types';
import type { Page, PaginationParams } from '@/types/shared.types';

type VacationPaginationParams = PaginationParams;

const STORAGE_KEY = 'mock_employee_vacations';
const SIMULATED_DELAY = 400 + Math.random() * 200; // 400-600ms

/**
 * Get vacations from localStorage
 */
function getVacationsFromStorage(): ResponseEmployeeVacationDTO[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : MOCK_VACATIONS;
  } catch (error) {
    console.error('Error reading vacations from localStorage:', error);
    return MOCK_VACATIONS;
  }
}

/**
 * Save vacations to localStorage
 */
function saveVacationsToStorage(vacations: ResponseEmployeeVacationDTO[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vacations));
  } catch (error) {
    console.error('Error saving vacations to localStorage:', error);
  }
}

/**
 * Simulate network delay
 */
function simulateDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY));
}

/**
 * Employee Vacation Mock Service
 */
export const employeeVacationMockService = {
  /**
   * Get vacation by ID
   */
  getById: async (
    storeId: number,
    employeeId: number,
    vacationId: number
  ): Promise<ResponseEmployeeVacationDTO> => {
    await simulateDelay();

    const vacations = getVacationsFromStorage();
    const vacation = vacations.find(
      (v) =>
        v.id === vacationId &&
        v.storeId === storeId &&
        v.employeeId === employeeId
    );

    if (!vacation) {
      throw new Error(`Vacation with ID ${vacationId} not found`);
    }

    return vacation;
  },

  /**
   * Get vacations with filters
   */
  getByCriteria: async (
    storeId: number,
    filters?: EmployeeVacationSpecificationDTO,
    params?: VacationPaginationParams
  ): Promise<Page<ResponseEmployeeVacationDTO>> => {
    await simulateDelay();

    let vacations = getVacationsFromStorage();

    // Filter by store
    vacations = vacations.filter((v) => v.storeId === storeId);

    // Apply filters
    if (filters?.employeeId) {
      vacations = vacations.filter((v) => v.employeeId === filters.employeeId);
    }
    if (filters?.year) {
      vacations = vacations.filter((v) => v.year === filters.year);
    }
    if (filters?.month) {
      vacations = vacations.filter((v) => v.month === filters.month);
    }

    // Sort
    const sortField = params?.sort || 'createdAt';
    const direction = params?.direction || 'DESC';

    vacations.sort((a, b) => {
      let aVal: any = a[sortField as keyof ResponseEmployeeVacationDTO];
      let bVal: any = b[sortField as keyof ResponseEmployeeVacationDTO];

      if (typeof aVal === 'string') {
        aVal = aVal.localeCompare(bVal);
        bVal = 0;
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return direction === 'DESC' ? -comparison : comparison;
    });

    // Pagination
    const page = params?.page || 0;
    const size = params?.size || 25;
    const start = page * size;
    const end = start + size;

    const content = vacations.slice(start, end);
    const totalElements = vacations.length;

    return {
      content,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      size,
      number: page,
      isEmpty: content.length === 0,
      isFirst: page === 0,
      isLast: page === Math.ceil(totalElements / size) - 1,
    };
  },

  /**
   * Create vacation
   */
  create: async (
    storeId: number,
    employeeId: number,
    data: CreateEmployeeVacationDTO
  ): Promise<ResponseEmployeeVacationDTO> => {
    await simulateDelay();

    // Validate
    if (!isValidVacationArray(data.monthlyVacation)) {
      throw new Error(
        'monthlyVacation must have exactly 31 elements (values 0 or 1)'
      );
    }

    const vacations = getVacationsFromStorage();

    // Check for duplicate (storeId + employeeId + year + month)
    const exists = vacations.some(
      (v) =>
        v.storeId === storeId &&
        v.employeeId === employeeId &&
        v.year === data.year &&
        v.month === data.month
    );

    if (exists) {
      throw new Error(`Vacation for ${data.month}/${data.year} already exists`);
    }

    // Generate new ID
    const newId = Math.max(...vacations.map((v) => v.id), 0) + 1;

    const newVacation: ResponseEmployeeVacationDTO = {
      id: newId,
      storeId,
      employeeId,
      year: data.year,
      month: data.month,
      monthlyVacation: data.monthlyVacation,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      createdByUserId: 0,
      createdByLabel: 'Mock User',
      updatedByUserId: null,
      updatedByLabel: null,
    };

    vacations.push(newVacation);
    saveVacationsToStorage(vacations);

    return newVacation;
  },

  /**
   * Update vacation
   */
  update: async (
    storeId: number,
    employeeId: number,
    vacationId: number,
    data: UpdateEmployeeVacationDTO
  ): Promise<ResponseEmployeeVacationDTO> => {
    await simulateDelay();

    // Validate if provided
    if (data.monthlyVacation && !isValidVacationArray(data.monthlyVacation)) {
      throw new Error(
        'monthlyVacation must have exactly 31 elements (values 0 or 1)'
      );
    }

    const vacations = getVacationsFromStorage();
    const index = vacations.findIndex(
      (v) =>
        v.id === vacationId &&
        v.storeId === storeId &&
        v.employeeId === employeeId
    );

    if (index === -1) {
      throw new Error(`Vacation with ID ${vacationId} not found`);
    }

    // Check for duplicate if year/month changed
    if (data.year || data.month) {
      const newYear = data.year ?? vacations[index].year;
      const newMonth = data.month ?? vacations[index].month;

      const duplicate = vacations.some(
        (v) =>
          v.id !== vacationId &&
          v.storeId === storeId &&
          v.employeeId === employeeId &&
          v.year === newYear &&
          v.month === newMonth
      );

      if (duplicate) {
        throw new Error(`Vacation for ${newMonth}/${newYear} already exists`);
      }
    }

    const updated: ResponseEmployeeVacationDTO = {
      ...vacations[index],
      ...(data.year !== undefined && { year: data.year }),
      ...(data.month !== undefined && { month: data.month }),
      ...(data.monthlyVacation !== undefined && {
        monthlyVacation: data.monthlyVacation,
      }),
      updatedAt: new Date().toISOString(),
      updatedByUserId: 0,
      updatedByLabel: 'Mock User',
    };

    vacations[index] = updated;
    saveVacationsToStorage(vacations);

    return updated;
  },

  /**
   * Delete vacation
   */
  delete: async (
    storeId: number,
    employeeId: number,
    vacationId: number
  ): Promise<void> => {
    await simulateDelay();

    const vacations = getVacationsFromStorage();
    const index = vacations.findIndex(
      (v) =>
        v.id === vacationId &&
        v.storeId === storeId &&
        v.employeeId === employeeId
    );

    if (index === -1) {
      throw new Error(`Vacation with ID ${vacationId} not found`);
    }

    vacations.splice(index, 1);
    saveVacationsToStorage(vacations);
  },

  /**
   * Reset to initial mock data
   */
  reset: (): void => {
    saveVacationsToStorage(MOCK_VACATIONS);
    console.log('Mock vacations reset to initial data');
  },

  /**
   * Get count
   */
  getCount: (): number => {
    return getVacationsFromStorage().length;
  },

  /**
   * Export data
   */
  exportData: (): ResponseEmployeeVacationDTO[] => {
    return getVacationsFromStorage();
  },
};

console.log('🎭 Employee Vacation Mock Service loaded');