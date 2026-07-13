/**
 * Employee Utilities
 */

export const EMPLOYEE_VALIDATION = {
  firstName: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+$/,
  },
  lastName: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+$/,
  },
  sap: {
    min: 10000000,
    max: 99999999,
  },
} as const;

export function isValidSap(sap: number): boolean {
  const sapStr = sap.toString();
  return sapStr.length === 8 && /^\d{8}$/.test(sapStr);
}

export function createDefaultEmployee(): Partial<CreateEmployeeDTO> {
  return {
    firstName: '',
    lastName: '',
    sap: 0,
    positionId: 0,
  };
}

import type { CreateEmployeeDTO } from '@/types/employee.types';
