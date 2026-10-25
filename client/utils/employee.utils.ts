/**
 * Employee Utilities
 */

import type { CreateEmployeeDTO } from '@/types/employee.types';

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

/**
 * Walidacja imienia / nazwiska — wspólna dla formularza dodawania i edycji pracownika.
 * Długość liczona na wartości PRZYCIĘTEJ (to ona jest wysyłana do backendu).
 * Zwraca komunikat błędu albo undefined, gdy wartość jest poprawna.
 */
export function validateEmployeeName(
  value: string,
  field: 'firstName' | 'lastName'
): string | undefined {
  const rules = EMPLOYEE_VALIDATION[field];
  const label = field === 'firstName' ? 'Imię' : 'Nazwisko';
  const trimmed = value.trim();

  if (!trimmed) return `${label} jest wymagane`;
  if (trimmed.length < rules.minLength) {
    return `${label} musi zawierać co najmniej ${rules.minLength} znaki`;
  }
  if (trimmed.length > rules.maxLength) {
    return `${label} może zawierać maksymalnie ${rules.maxLength} znaków`;
  }
  if (!rules.pattern.test(trimmed)) {
    return `${label} może zawierać tylko litery, spacje i myślniki`;
  }
  return undefined;
}

/**
 * Numer SAP: dokładnie 8 cyfr, bez zera na początku (zakres 10000000–99999999) —
 * numer z wiodącym zerem i tak zostałby ucięty przez parseInt i odrzucony przez serwis.
 */
export function validateSapString(value: string): string | undefined {
  if (!value.trim()) return 'Numer SAP jest wymagany';
  if (!/^\d{8}$/.test(value)) return 'Numer SAP musi zawierać dokładnie 8 cyfr';
  if (value.startsWith('0')) return 'Numer SAP nie może zaczynać się od zera';
  return undefined;
}

export function createDefaultEmployee(): Partial<CreateEmployeeDTO> {
  return {
    firstName: '',
    lastName: '',
    sap: 0,
    positionId: 0,
  };
}
