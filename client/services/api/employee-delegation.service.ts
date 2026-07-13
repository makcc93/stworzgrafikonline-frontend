import type {
  ResponseEmployeeDelegationDTO,
  CreateEmployeeDelegationDTO,
  UpdateEmployeeDelegationDTO,
  EmployeeDelegationSpecificationDTO,
} from '@/types/employee-delegation.types';
import { isValidDelegationArray } from '@/utils/employee-delegation.utils';
import type { Page, PaginationParams } from '@/types/shared.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

const delegationsUrl = (storeId: number, employeeId: number) =>
  `${API_CONFIG.ENDPOINTS.stores}/${storeId}/employees/${employeeId}/delegations`;

export const employeeDelegationService = {

  getById: async (storeId: number, employeeId: number, delegationId: number): Promise<ResponseEmployeeDelegationDTO> => {
    return await httpClient.get<ResponseEmployeeDelegationDTO>(
      `${delegationsUrl(storeId, employeeId)}/${delegationId}`
    );
  },

  getByCriteria: async (
    storeId: number,
    filters?: EmployeeDelegationSpecificationDTO,
    pagination?: PaginationParams
  ): Promise<Page<ResponseEmployeeDelegationDTO>> => {
    const params: Record<string, string | number | undefined> = {
      page: pagination?.page ?? 0,
      size: pagination?.size ?? 25,
      sort: pagination?.sort ?? 'createdAt',
      direction: pagination?.direction ?? 'DESC',
      employeeId: filters?.employeeId,
      year: filters?.year,
      month: filters?.month,
    };
    return await httpClient.get<Page<ResponseEmployeeDelegationDTO>>(
      `${API_CONFIG.ENDPOINTS.stores}/${storeId}/delegations`,
      params
    );
  },

  create: async (storeId: number, employeeId: number, data: CreateEmployeeDelegationDTO): Promise<ResponseEmployeeDelegationDTO> => {
    if (!isValidDelegationArray(data.monthlyDelegation))
      throw new Error('monthlyDelegation must have exactly 31 elements (values 0 or 1)');
    return await httpClient.put<ResponseEmployeeDelegationDTO>(
      delegationsUrl(storeId, employeeId),
      data
    );
  },

  update: async (storeId: number, employeeId: number, delegationId: number, data: UpdateEmployeeDelegationDTO): Promise<ResponseEmployeeDelegationDTO> => {
    if (!isValidDelegationArray(data.monthlyDelegation))
      throw new Error('monthlyDelegation must have exactly 31 elements (values 0 or 1)');
    return await httpClient.patch<ResponseEmployeeDelegationDTO>(
      `${delegationsUrl(storeId, employeeId)}/${delegationId}`,
      data
    );
  },

  delete: async (storeId: number, employeeId: number, delegationId: number): Promise<void> => {
    await httpClient.delete(`${delegationsUrl(storeId, employeeId)}/${delegationId}`);
  },
};

console.log('🌐 Employee Delegation Real API Service loaded');
