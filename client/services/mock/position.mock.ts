/**
 * Position Mock Service
 */

import type {
  ResponsePositionDTO,
  CreatePositionDTO,
  UpdatePositionDTO,
} from '@/types/position.types';
import { MOCK_POSITIONS } from '@/mocks/position.mocks';

const STORAGE_KEY = 'mock_positions';
const DELAY = 300 + Math.random() * 200;

function getFromStorage(): ResponsePositionDTO[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : MOCK_POSITIONS;
  } catch {
    return MOCK_POSITIONS;
  }
}

function saveToStorage(data: ResponsePositionDTO[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving positions to localStorage:', error);
  }
}

function delay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, DELAY));
}

export const positionMockService = {
  getAll: async (): Promise<ResponsePositionDTO[]> => {
    await delay();
    return getFromStorage();
  },

  getById: async (id: number): Promise<ResponsePositionDTO> => {
    await delay();
    const data = getFromStorage();
    const found = data.find(p => p.id === id);
    if (!found) throw new Error(`Position with ID ${id} not found`);
    return found;
  },

  create: async (dto: CreatePositionDTO): Promise<ResponsePositionDTO> => {
    await delay();
    const data = getFromStorage();
    
    // Check duplicate name
    if (data.some(p => p.name.toLowerCase() === dto.name.toLowerCase())) {
      throw new Error(`Position "${dto.name}" already exists`);
    }
    
    const newId = Math.max(...data.map(p => p.id), 0) + 1;
    const created: ResponsePositionDTO = {
      id: newId,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
    };
    
    data.push(created);
    saveToStorage(data);
    return created;
  },

  update: async (id: number, dto: UpdatePositionDTO): Promise<ResponsePositionDTO> => {
    await delay();
    const data = getFromStorage();
    const index = data.findIndex(p => p.id === id);
    
    if (index === -1) throw new Error(`Position with ID ${id} not found`);
    
    // Check duplicate name (excluding current)
    if (data.some(p => p.id !== id && p.name.toLowerCase() === dto.name.toLowerCase())) {
      throw new Error(`Position "${dto.name}" already exists`);
    }
    
    const updated: ResponsePositionDTO = {
      ...data[index],
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
    };
    
    data[index] = updated;
    saveToStorage(data);
    return updated;
  },

  delete: async (id: number): Promise<void> => {
    await delay();
    const data = getFromStorage();
    const index = data.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Position with ID ${id} not found`);
    data.splice(index, 1);
    saveToStorage(data);
  },
};

console.log('🎭 Position Mock Service loaded');
