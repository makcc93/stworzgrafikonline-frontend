/**
 * Region Mock Service
 */

import type {
  ResponseRegionDTO,
  CreateRegionDTO,
  UpdateRegionDTO,
} from '@/types/region.types';
import { MOCK_REGIONS } from '@/mocks/region.mocks';

const STORAGE_KEY = 'mock_regions';
const DELAY = 300 + Math.random() * 200;

function getFromStorage(): ResponseRegionDTO[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : MOCK_REGIONS;
  } catch {
    return MOCK_REGIONS;
  }
}

function saveToStorage(data: ResponseRegionDTO[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving regions to localStorage:', error);
  }
}

function delay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, DELAY));
}

export const regionMockService = {
  getAll: async (): Promise<ResponseRegionDTO[]> => {
    await delay();
    return getFromStorage();
  },

  getById: async (id: number): Promise<ResponseRegionDTO> => {
    await delay();
    const data = getFromStorage();
    const found = data.find(r => r.id === id);
    if (!found) throw new Error(`Region with ID ${id} not found`);
    return found;
  },

  create: async (dto: CreateRegionDTO): Promise<ResponseRegionDTO> => {
    await delay();
    const data = getFromStorage();
    
    // Check duplicate name
    if (data.some(r => r.name.toLowerCase() === dto.name.toLowerCase())) {
      throw new Error(`Region "${dto.name}" already exists`);
    }
    
    const newId = Math.max(...data.map(r => r.id), 0) + 1;
    const created: ResponseRegionDTO = {
      id: newId,
      name: dto.name.trim(),
      enable: true,
    };
    
    data.push(created);
    saveToStorage(data);
    return created;
  },

  update: async (id: number, dto: UpdateRegionDTO): Promise<ResponseRegionDTO> => {
    await delay();
    const data = getFromStorage();
    const index = data.findIndex(r => r.id === id);
    
    if (index === -1) throw new Error(`Region with ID ${id} not found`);
    
    // Check duplicate name (excluding current)
    if (data.some(r => r.id !== id && r.name.toLowerCase() === dto.name.toLowerCase())) {
      throw new Error(`Region "${dto.name}" already exists`);
    }
    
    const updated: ResponseRegionDTO = {
      ...data[index],
      name: dto.name.trim(),
      enable: dto.enable,
    };
    
    data[index] = updated;
    saveToStorage(data);
    return updated;
  },

  delete: async (id: number): Promise<void> => {
    await delay();
    const data = getFromStorage();
    const index = data.findIndex(r => r.id === id);
    if (index === -1) throw new Error(`Region with ID ${id} not found`);
    data.splice(index, 1);
    saveToStorage(data);
  },
};

console.log('🎭 Region Mock Service loaded');
