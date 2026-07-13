/**
 * Branch Mock Service
 */

import type {
  ResponseBranchDTO,
  CreateBranchDTO,
  UpdateBranchDTO,
} from '@/types/branch.types';
import { MOCK_BRANCHES } from '@/mocks/branch.mocks';

const STORAGE_KEY = 'mock_branches';
const DELAY = 300 + Math.random() * 200;

function getFromStorage(): ResponseBranchDTO[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : MOCK_BRANCHES;
  } catch {
    return MOCK_BRANCHES;
  }
}

function saveToStorage(data: ResponseBranchDTO[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving branches to localStorage:', error);
  }
}

function delay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, DELAY));
}

// Helper to get region name (from regions in localStorage)
function getRegionName(regionId: number): string {
  try {
    const regionsStr = localStorage.getItem('mock_regions');
    if (regionsStr) {
      const regions = JSON.parse(regionsStr);
      const region = regions.find((r: any) => r.id === regionId);
      return region ? region.name : `Region ${regionId}`;
    }
  } catch {}
  return `Region ${regionId}`;
}

export const branchMockService = {
  getAll: async (): Promise<ResponseBranchDTO[]> => {
    await delay();
    return getFromStorage();
  },

  getById: async (id: number): Promise<ResponseBranchDTO> => {
    await delay();
    const data = getFromStorage();
    const found = data.find(b => b.id === id);
    if (!found) throw new Error(`Branch with ID ${id} not found`);
    return found;
  },

  create: async (dto: CreateBranchDTO): Promise<ResponseBranchDTO> => {
    await delay();
    const data = getFromStorage();
    
    // Check duplicate name
    if (data.some(b => b.name.toLowerCase() === dto.name.toLowerCase())) {
      throw new Error(`Branch "${dto.name}" already exists`);
    }
    
    const newId = Math.max(...data.map(b => b.id), 0) + 1;
    const created: ResponseBranchDTO = {
      id: newId,
      name: dto.name.trim(),
      enable: true,
      regionId: dto.regionId,
      regionName: getRegionName(dto.regionId),
    };
    
    data.push(created);
    saveToStorage(data);
    return created;
  },

  update: async (id: number, dto: UpdateBranchDTO): Promise<ResponseBranchDTO> => {
    await delay();
    const data = getFromStorage();
    const index = data.findIndex(b => b.id === id);
    
    if (index === -1) throw new Error(`Branch with ID ${id} not found`);
    
    // Check duplicate name (excluding current)
    if (data.some(b => b.id !== id && b.name.toLowerCase() === dto.name.toLowerCase())) {
      throw new Error(`Branch "${dto.name}" already exists`);
    }
    
    const updated: ResponseBranchDTO = {
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
    const index = data.findIndex(b => b.id === id);
    if (index === -1) throw new Error(`Branch with ID ${id} not found`);
    data.splice(index, 1);
    saveToStorage(data);
  },
};

console.log('🎭 Branch Mock Service loaded');
