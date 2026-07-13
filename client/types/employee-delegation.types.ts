import type { LocalDateTime } from '@/types/shared.types';

export interface ResponseEmployeeDelegationDTO {
  id: number;
  storeId: number;
  employeeId: number;
  year: number;
  month: number;
  monthlyDelegation: number[]; // 31 elements, 0 or 1
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime | null;
  createdByUserId: number;
  createdByLabel: string; // migawka roli+zakresu z momentu utworzenia, np. "Kierownik Sklepu Puławy F7"
  updatedByUserId: number | null;
  updatedByLabel: string | null; // migawka z momentu ostatniej edycji; null, jeśli nigdy nie edytowano
}

export interface CreateEmployeeDelegationDTO {
  year: number;
  month: number;
  monthlyDelegation: number[]; // exactly 31 elements
}

export interface UpdateEmployeeDelegationDTO {
  year: number;
  month: number;
  monthlyDelegation: number[];
  updatedAt?: LocalDateTime;
}

export interface EmployeeDelegationSpecificationDTO {
  employeeId?: number;
  year?: number;
  month?: number;
}