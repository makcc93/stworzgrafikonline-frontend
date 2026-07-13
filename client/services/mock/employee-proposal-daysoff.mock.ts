/**
 * Employee Proposal DaysOff Mock Service
 */

import type {
  ResponseEmployeeProposalDaysOffDTO,
  CreateEmployeeProposalDaysOffDTO,
  UpdateEmployeeProposalDaysOffDTO,
  EmployeeProposalDaysOffSpecificationDTO,
  ProposalPaginationParams,
  Page,
} from '@/types/employee-proposal.types';
import { MOCK_DAYS_OFF } from '@/mocks/employee-proposal.mocks';
import { isValidDaysOffArray } from '@/utils/employee-proposal.utils';

const STORAGE_KEY = 'mock_proposal_daysoff';
const DELAY = 400 + Math.random() * 200;

function getFromStorage(): ResponseEmployeeProposalDaysOffDTO[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : MOCK_DAYS_OFF;
  } catch {
    return MOCK_DAYS_OFF;
  }
}

function saveToStorage(data: ResponseEmployeeProposalDaysOffDTO[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

function delay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, DELAY));
}

export const proposalDaysOffMockService = {
  getById: async (storeId: number, employeeId: number, proposalId: number): Promise<ResponseEmployeeProposalDaysOffDTO> => {
    await delay();
    const data = getFromStorage();
    const found = data.find(d => d.id === proposalId && d.storeId === storeId && d.employeeId === employeeId);
    if (!found) throw new Error(`Proposal with ID ${proposalId} not found`);
    return found;
  },

  getByCriteria: async (
    storeId: number,
    filters?: EmployeeProposalDaysOffSpecificationDTO,
    params?: ProposalPaginationParams
  ): Promise<Page<ResponseEmployeeProposalDaysOffDTO>> => {
    await delay();
    let data = getFromStorage().filter(d => d.storeId === storeId);
    
    if (filters?.employeeId) data = data.filter(d => d.employeeId === filters.employeeId);
    if (filters?.year) data = data.filter(d => d.year === filters.year);
    if (filters?.month) data = data.filter(d => d.month === filters.month);
    
    const page = params?.page || 0;
    const size = params?.size || 25;
    const start = page * size;
    const content = data.slice(start, start + size);
    
    return {
      content,
      totalElements: data.length,
      totalPages: Math.ceil(data.length / size),
      size,
      number: page,
      isEmpty: content.length === 0,
      isFirst: page === 0,
      isLast: page >= Math.ceil(data.length / size) - 1,
    };
  },

  create: async (storeId: number, employeeId: number, dto: CreateEmployeeProposalDaysOffDTO): Promise<ResponseEmployeeProposalDaysOffDTO> => {
    await delay();
    
    if (!isValidDaysOffArray(dto.monthlyDaysOff)) {
      throw new Error('monthlyDaysOff must have exactly 31 elements (values 0 or 1)');
    }
    
    const data = getFromStorage();
    const exists = data.some(d => 
      d.storeId === storeId && d.employeeId === employeeId && d.year === dto.year && d.month === dto.month
    );
    
    if (exists) {
      throw new Error(`Proposal for ${dto.month}/${dto.year} already exists`);
    }
    
    const newId = Math.max(...data.map(d => d.id), 0) + 1;
    const created: ResponseEmployeeProposalDaysOffDTO = {
      id: newId,
      storeId,
      employeeId,
      year: dto.year,
      month: dto.month,
      monthlyDaysOff: dto.monthlyDaysOff,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      createdByUserId: 0,
      createdByLabel: 'Mock User',
      updatedByUserId: null,
      updatedByLabel: null,
    };
    
    data.push(created);
    saveToStorage(data);
    return created;
  },

  update: async (
    storeId: number,
    employeeId: number,
    proposalId: number,
    dto: UpdateEmployeeProposalDaysOffDTO
  ): Promise<ResponseEmployeeProposalDaysOffDTO> => {
    await delay();
    
    if (dto.monthlyDaysOff && !isValidDaysOffArray(dto.monthlyDaysOff)) {
      throw new Error('monthlyDaysOff must have exactly 31 elements (values 0 or 1)');
    }
    
    const data = getFromStorage();
    const index = data.findIndex(d => d.id === proposalId && d.storeId === storeId && d.employeeId === employeeId);
    
    if (index === -1) throw new Error(`Proposal with ID ${proposalId} not found`);
    
    const updated: ResponseEmployeeProposalDaysOffDTO = {
      ...data[index],
      year: dto.year,
      month: dto.month,
      monthlyDaysOff: dto.monthlyDaysOff,
      updatedAt: new Date().toISOString(),
      updatedByUserId: 0,
      updatedByLabel: 'Mock User',
    };
    
    data[index] = updated;
    saveToStorage(data);
    return updated;
  },

  delete: async (storeId: number, employeeId: number, proposalId: number): Promise<void> => {
    await delay();
    const data = getFromStorage();
    const index = data.findIndex(d => d.id === proposalId && d.storeId === storeId && d.employeeId === employeeId);
    if (index === -1) throw new Error(`Proposal with ID ${proposalId} not found`);
    data.splice(index, 1);
    saveToStorage(data);
  },
};

console.log('🎭 Proposal DaysOff Mock Service loaded');