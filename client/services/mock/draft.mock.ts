/**
 * Draft Mock Service
 * In-memory service with localStorage persistence for development/testing
 */

import type {
  ResponseDemandDraftDTO,
  CreateDemandDraftDTO,
  UpdateDemandDraftDTO,
  BulkCreateDraftsDTO,
  DraftPaginationParams,
  Page,
} from '@/types/draft.types';
import {
  MOCK_DRAFTS,
  isValidHourlyDemand,
  getDatesForDayOfWeek,
  createDraftDTO,
  formatDateForBackend,
  parseDateFromBackend,
} from '@/types/draft.types';

const STORAGE_KEY = 'mock_drafts_data';
const SIMULATED_DELAY = 400 + Math.random() * 200; // 400-600ms

/**
 * Get drafts from localStorage or use mock data
 */
function getDraftsFromStorage(): ResponseDemandDraftDTO[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : MOCK_DRAFTS;
  } catch (error) {
    console.error('Error reading drafts from localStorage:', error);
    return MOCK_DRAFTS;
  }
}

/**
 * Save drafts to localStorage
 */
function saveDraftsToStorage(drafts: ResponseDemandDraftDTO[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error('Error saving drafts to localStorage:', error);
  }
}

/**
 * Simulate network delay
 */
function simulateDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY));
}

/**
 * Get current month's first and last date
 */
function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return {
    startDate: formatDateForBackend(firstDay),
    endDate: formatDateForBackend(lastDay),
  };
}

/**
 * Draft Mock Service
 */
export const draftMockService = {
  /**
   * Get single draft by ID
   */
  getById: async (
    storeId: number,
    draftId: number
  ): Promise<ResponseDemandDraftDTO> => {
    await simulateDelay();

    const drafts = getDraftsFromStorage();
    const draft = drafts.find(
      (d) => d.id === draftId && d.storeId === storeId
    );

    if (!draft) {
      throw new Error(`Draft with ID ${draftId} not found`);
    }

    return draft;
  },

  /**
   * Get drafts for date range
   * If startDate and endDate not provided, uses current month
   */
  getByDateRange: async (
    storeId: number,
    startDate?: string,
    endDate?: string,
    params?: DraftPaginationParams
  ): Promise<Page<ResponseDemandDraftDTO>> => {
    await simulateDelay();

    let drafts = getDraftsFromStorage();

    // Filter by store
    drafts = drafts.filter((d) => d.storeId === storeId);

    // Filter by date range
    const actualStartDate = startDate || getCurrentMonthRange().startDate;
    const actualEndDate = endDate || getCurrentMonthRange().endDate;

    drafts = drafts.filter((d) => {
      return d.draftDate >= actualStartDate && d.draftDate <= actualEndDate;
    });

    // Sort
    const sortField = params?.sort || 'draftDate';
    const direction = params?.direction || 'DESC';

    drafts.sort((a, b) => {
      let aVal: any = a[sortField as keyof ResponseDemandDraftDTO];
      let bVal: any = b[sortField as keyof ResponseDemandDraftDTO];

      if (typeof aVal === 'string') {
        aVal = aVal.localeCompare(bVal);
        bVal = 0;
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return direction === 'DESC' ? -comparison : comparison;
    });

    // Pagination
    const page = params?.page || 0;
    const size = params?.size || 25;
    const start = page * size;
    const end = start + size;

    const content = drafts.slice(start, end);
    const totalElements = drafts.length;

    return {
      content,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      size,
      number: page,
      isEmpty: content.length === 0,
      isFirst: page === 0,
      isLast: page === Math.ceil(totalElements / size) - 1,
    };
  },

  /**
   * Create single draft
   */
  create: async (
    storeId: number,
    data: CreateDemandDraftDTO
  ): Promise<ResponseDemandDraftDTO> => {
    await simulateDelay();

    // Validate hourlyDemand
    if (!isValidHourlyDemand(data.hourlyDemand)) {
      throw new Error('hourlyDemand must have exactly 24 elements');
    }

    const drafts = getDraftsFromStorage();

    // Check for duplicate (storeId + draftDate must be unique)
    const exists = drafts.some(
      (d) => d.storeId === storeId && d.draftDate === data.draftDate
    );

    if (exists) {
      throw new Error(`Draft for date ${data.draftDate} already exists`);
    }

    // Generate new ID
    const newId = Math.max(...drafts.map((d) => d.id), 0) + 1;

    const newDraft: ResponseDemandDraftDTO = {
      id: newId,
      storeId,
      draftDate: data.draftDate,
      hourlyDemand: data.hourlyDemand,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    drafts.push(newDraft);
    saveDraftsToStorage(drafts);

    return newDraft;
  },

  /**
   * Update draft
   */
  update: async (
    storeId: number,
    draftId: number,
    data: UpdateDemandDraftDTO
  ): Promise<ResponseDemandDraftDTO> => {
    await simulateDelay();

    // Validate hourlyDemand
    if (!isValidHourlyDemand(data.hourlyDemand)) {
      throw new Error('hourlyDemand must have exactly 24 elements');
    }

    const drafts = getDraftsFromStorage();
    const index = drafts.findIndex(
      (d) => d.id === draftId && d.storeId === storeId
    );

    if (index === -1) {
      throw new Error(`Draft with ID ${draftId} not found`);
    }

    // Check for duplicate date (if changing date)
    if (data.draftDate !== drafts[index].draftDate) {
      const dateExists = drafts.some(
        (d) =>
          d.id !== draftId &&
          d.storeId === storeId &&
          d.draftDate === data.draftDate
      );

      if (dateExists) {
        throw new Error(`Draft for date ${data.draftDate} already exists`);
      }
    }

    // Update draft
    const updated: ResponseDemandDraftDTO = {
      ...drafts[index],
      draftDate: data.draftDate,
      hourlyDemand: data.hourlyDemand,
      updatedAt: new Date().toISOString(),
    };

    drafts[index] = updated;
    saveDraftsToStorage(drafts);

    return updated;
  },

  /**
   * Delete draft
   */
  delete: async (storeId: number, draftId: number): Promise<void> => {
    await simulateDelay();

    const drafts = getDraftsFromStorage();
    const index = drafts.findIndex(
      (d) => d.id === draftId && d.storeId === storeId
    );

    if (index === -1) {
      throw new Error(`Draft with ID ${draftId} not found`);
    }

    drafts.splice(index, 1);
    saveDraftsToStorage(drafts);
  },

  /**
   * Bulk create drafts from templates
   */
  bulkCreate: async (bulkData: BulkCreateDraftsDTO): Promise<ResponseDemandDraftDTO[]> => {
    const { storeId, year, month, templates } = bulkData;
    const createdDrafts: ResponseDemandDraftDTO[] = [];

    // For each day-of-week template
    for (const template of templates) {
      // Get all dates in the month for this day of week
      const dates = getDatesForDayOfWeek(year, month, template.dayOfWeek);

      // Create draft for each date
      for (const date of dates) {
        try {
          const draftDTO = createDraftDTO(date, template.hourlyDemand);
          const created = await draftMockService.create(storeId, draftDTO);
          createdDrafts.push(created);
        } catch (error) {
          // Log but continue - draft might already exist
          const dateStr = formatDateForBackend(date);
          console.warn(`Failed to create draft for ${dateStr}:`, error);
        }
      }
    }

    return createdDrafts;
  },

  /**
   * Reset to initial mock data
   */
  reset: (): void => {
    saveDraftsToStorage(MOCK_DRAFTS);
    console.log('Mock drafts reset to initial data');
  },

  /**
   * Get current count of drafts in storage
   */
  getCount: (): number => {
    return getDraftsFromStorage().length;
  },

  /**
   * Export all draft data
   */
  exportData: (): ResponseDemandDraftDTO[] => {
    return getDraftsFromStorage();
  },
};

console.log('🎭 Draft Mock Service loaded');
