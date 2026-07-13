/**
 * Shift Mock Service
 */

import type { ResponseShiftDTO, ShiftHoursDTO } from '@/types/employee-proposal.types';
import { MOCK_SHIFTS } from '@/mocks/employee-proposal.mocks';

const STORAGE_KEY = 'mock_shifts';
const DELAY = 300 + Math.random() * 200;

function getFromStorage(): ResponseShiftDTO[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : MOCK_SHIFTS;
  } catch {
    return MOCK_SHIFTS;
  }
}

function saveToStorage(data: ResponseShiftDTO[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving shifts to localStorage:', error);
  }
}

function delay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, DELAY));
}

function calculateLength(startHour: string, endHour: string): number {
  const start = parseInt(startHour.split(':')[0], 10);
  const end = parseInt(endHour.split(':')[0], 10);
  return end - start;
}

export const shiftMockService = {
  getAll: async (): Promise<ResponseShiftDTO[]> => {
    await delay();
    return getFromStorage();
  },

  getById: async (id: number): Promise<ResponseShiftDTO> => {
    await delay();
    const data = getFromStorage();
    const found = data.find(s => s.id === id);
    if (!found) throw new Error(`Shift with ID ${id} not found`);
    return found;
  },

  /**
   * Create shift (returns existing if same hours exist)
   */
  create: async (dto: ShiftHoursDTO): Promise<ResponseShiftDTO> => {
    await delay();
    const data = getFromStorage();
    
    // Check if shift with same hours exists
    const existing = data.find(s => s.startHour === dto.startHour && s.endHour === dto.endHour);
    if (existing) return existing;
    
    // Create new
    const newId = Math.max(...data.map(s => s.id), 0) + 1;
    const created: ResponseShiftDTO = {
      id: newId,
      startHour: dto.startHour,
      endHour: dto.endHour,
      length: calculateLength(dto.startHour, dto.endHour),
    };
    
    data.push(created);
    saveToStorage(data);
    return created;
  },

  update: async (id: number, dto: ShiftHoursDTO): Promise<ResponseShiftDTO> => {
    await delay();
    const data = getFromStorage();
    const index = data.findIndex(s => s.id === id);
    if (index === -1) throw new Error(`Shift with ID ${id} not found`);
    
    const updated: ResponseShiftDTO = {
      ...data[index],
      startHour: dto.startHour,
      endHour: dto.endHour,
      length: calculateLength(dto.startHour, dto.endHour),
    };
    
    data[index] = updated;
    saveToStorage(data);
    return updated;
  },

  delete: async (id: number): Promise<void> => {
    await delay();
    const data = getFromStorage();
    const index = data.findIndex(s => s.id === id);
    if (index === -1) throw new Error(`Shift with ID ${id} not found`);
    data.splice(index, 1);
    saveToStorage(data);
  },
};

console.log('🎭 Shift Mock Service loaded');
