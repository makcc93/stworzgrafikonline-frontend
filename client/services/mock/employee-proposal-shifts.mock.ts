/**
 * Employee Proposal Shifts Mock Service
 */

import type {
  ResponseEmployeeProposalShiftsDTO,
  CreateEmployeeProposalShiftsDTO,
  UpdateEmployeeProposalShiftsDTO,
  EmployeeProposalShiftsSpecificationDTO,
  ProposalPaginationParams,
  Page,
} from '@/types/employee-proposal.types';
import { MOCK_SHIFT_PROPOSALS } from '@/mocks/employee-proposal.mocks';
import { isValidShiftArray } from '@/utils/employee-proposal.utils';

const STORAGE_KEY = 'mock_proposal_shifts';
const DELAY = 400 + Math.random() * 200;

function getFromStorage(): ResponseEmployeeProposalShiftsDTO[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : MOCK_SHIFT_PROPOSALS;
  } catch {
    return MOCK_SHIFT_PROPOSALS;
  }
}

function saveToStorage(data: ResponseEmployeeProposalShiftsDTO[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

function delay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, DELAY));
}

export const proposalShiftsMockService = {
  getById: async (storeId: number, employeeId: number, proposalShiftId: number): Promise<ResponseEmployeeProposalShiftsDTO> => {
    await delay();
    const data = getFromStorage();
    const found = data.find(d => d.id === proposalShiftId && d.storeId === storeId && d.employeeId === employeeId);
    if (!found) throw new Error(`Proposal shift with ID ${proposalShiftId} not found`);
    return found;
  },

  getByCriteria: async (
    storeId: number,
    filters?: EmployeeProposalShiftsSpecificationDTO,
    params?: ProposalPaginationParams
  ): Promise<Page<ResponseEmployeeProposalShiftsDTO>> => {
    await delay();
    let data = getFromStorage().filter(d => d.storeId === storeId);
    
    if (filters?.employeeId) {
      data = data.filter(d => d.employeeId === filters.employeeId);
    }
    
    if (filters?.startDate) {
      data = data.filter(d => d.date >= filters.startDate!);
    }
    
    if (filters?.endDate) {
      data = data.filter(d => d.date <= filters.endDate!);
    }
    
    const page = params?.page || 0;
    const size = params?.size || 100;
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

  create: async (storeId: number, employeeId: number, dto: CreateEmployeeProposalShiftsDTO): Promise<ResponseEmployeeProposalShiftsDTO> => {
    await delay();
    
    if (!isValidShiftArray(dto.dailyProposalShift)) {
      throw new Error('dailyProposalShift must have exactly 24 elements');
    }
    
    const data = getFromStorage();
    const exists = data.some(d => 
      d.storeId === storeId && d.employeeId === employeeId && d.date === dto.date
    );
    
    if (exists) {
      throw new Error(`Proposal shift for ${dto.date} already exists`);
    }
    
    const newId = Math.max(...data.map(d => d.id), 0) + 1;
    const created: ResponseEmployeeProposalShiftsDTO = {
      id: newId,
      storeId,
      employeeId,
      date: dto.date,
      dailyProposalShift: dto.dailyProposalShift,
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
    proposalShiftId: number,
    dto: UpdateEmployeeProposalShiftsDTO
  ): Promise<ResponseEmployeeProposalShiftsDTO> => {
    await delay();
    
    if (dto.dailyProposalShift && !isValidShiftArray(dto.dailyProposalShift)) {
      throw new Error('dailyProposalShift must have exactly 24 elements');
    }
    
    const data = getFromStorage();
    const index = data.findIndex(d => d.id === proposalShiftId && d.storeId === storeId && d.employeeId === employeeId);
    
    if (index === -1) throw new Error(`Proposal shift with ID ${proposalShiftId} not found`);
    
    const updated: ResponseEmployeeProposalShiftsDTO = {
      ...data[index],
      date: dto.date,
      dailyProposalShift: dto.dailyProposalShift,
      updatedAt: new Date().toISOString(),
      updatedByUserId: 0,
      updatedByLabel: 'Mock User',
    };
    
    data[index] = updated;
    saveToStorage(data);
    return updated;
  },

  delete: async (storeId: number, employeeId: number, proposalShiftId: number): Promise<void> => {
    await delay();
    const data = getFromStorage();
    const index = data.findIndex(d => d.id === proposalShiftId && d.storeId === storeId && d.employeeId === employeeId);
    if (index === -1) throw new Error(`Proposal shift with ID ${proposalShiftId} not found`);
    data.splice(index, 1);
    saveToStorage(data);
  },
};

console.log('🎭 Proposal Shifts Mock Service loaded');