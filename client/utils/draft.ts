/**
 * Draft utilities for managing draft logic
 * Follows SRP - single responsibility for draft operations
 */

import { StoreHours, DraftState, DraftStatus } from '@/types';

export const draftUtils = {
  /**
   * Create an empty draft array for 24 hours
   */
  createEmptyDraft(): number[] {
    return Array(24).fill(0);
  },

  /**
   * Create a storage key for a day of week draft
   */
  createDayOfWeekKey(year: number, month: number, dayOfWeek: number): string {
    return `${year}-${month}-${dayOfWeek}`;
  },

  /**
   * Create a storage key for a specific date draft
   */
  createDateKey(year: number, month: number, date: number): string {
    return `${year}-${month}-date-${date}`;
  },

  /**
   * Get the maximum value in a draft array
   */
  getMaxValue(draft: number[]): number {
    return Math.max(...draft, 5); // Minimum of 5 for scaling
  },

  /**
   * Find peak hours in a draft
   * Returns range of hours with the highest staffing
   */
  getPeakHours(draft: number[]): { start: number; end: number } | null {
    const maxValue = Math.max(...draft);
    if (maxValue === 0) return null;

    const startHour = draft.findIndex((v) => v === maxValue);
    const endHour = draft.lastIndexOf(maxValue) + 1;

    return { start: startHour, end: endHour };
  },

  /**
   * Calculate total staff needed (max concurrent staff)
   */
  getTotalStaffNeeded(draft: number[]): number {
    return Math.max(...draft, 0);
  },

  /**
   * Calculate average staff per hour
   */
  getAveragePerHour(draft: number[]): number {
    return Number((draft.reduce((a, b) => a + b, 0) / 24).toFixed(1));
  },

  /**
   * Count staffed hours
   */
  getStaffedHours(draft: number[]): number {
    return draft.filter((v) => v > 0).length;
  },

  /**
   * Check if draft is complete for all days of week
   */
  isDraftComplete(draftData: DraftState, storeHours: StoreHours, year: number, month: number): boolean {
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const dayKey = `${year}-${month}-${dayOfWeek}`;
      const dayDraft = draftData[dayKey];

      if (!dayDraft) return false;

      const dayName = dayKeys[dayOfWeek];
      const hours = storeHours[dayName];
      const openHour = parseInt(hours.open.split(':')[0]);
      const closeHour = parseInt(hours.close.split(':')[0]);

      // Check if all store hours have at least 1 staff
      for (let hour = openHour; hour < closeHour; hour++) {
        if (!dayDraft[hour] || dayDraft[hour] === 0) {
          return false;
        }
      }
    }

    return true;
  },

  /**
   * Get draft status
   */
  getDraftStatus(draftData: DraftState, storeHours: StoreHours, year: number, month: number): DraftStatus {
    const ready = this.isDraftComplete(draftData, storeHours, year, month);

    return {
      ready,
      message: ready
        ? 'Wszystkie dni tygodnia zostały skonfigurowane z wymaganiami obsady na godziny otwarcia sklepu.'
        : 'Uzupełnij DRAFT dla wszystkich dni tygodnia. Każdy dzień musi mieć co najmniej jednego pracownika w godzinach otwarcia.',
    };
  },

  /**
   * Update draft value for a specific hour
   */
  updateDraftHour(draft: number[], hour: number, delta: number): number[] {
    const newDraft = [...draft];
    newDraft[hour] = Math.max(0, newDraft[hour] + delta);
    return newDraft;
  },

  /**
   * Reset draft to empty array
   */
  resetDraft(): number[] {
    return this.createEmptyDraft();
  },

  /**
   * Load sample draft data
   */
  loadSampleDraft(): number[] {
    return [0, 0, 0, 0, 0, 0, 0, 3, 7, 7, 9, 9, 9, 10, 10, 10, 10, 10, 10, 6, 0, 0, 0, 0];
  },
};
