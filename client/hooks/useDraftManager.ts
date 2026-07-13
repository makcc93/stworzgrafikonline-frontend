/**
 * Custom hook for managing draft state
 * Follows SRP - single responsibility for draft state logic
 */

import { useState, useCallback } from 'react';
import { DraftState } from '@/types';
import { draftUtils } from '@/utils/draft';

interface UseDraftManagerReturn {
  draftData: DraftState;
  updateDraft: (key: string, values: number[]) => void;
  updateDraftHour: (key: string, hour: number, delta: number) => void;
  getDraft: (key: string) => number[];
  resetDraft: (key: string) => void;
  loadSampleDraft: (key: string) => void;
}

export function useDraftManager(): UseDraftManagerReturn {
  const [draftData, setDraftData] = useState<DraftState>({});

  const updateDraft = useCallback((key: string, values: number[]) => {
    setDraftData((prev) => ({
      ...prev,
      [key]: values,
    }));
  }, []);

  const updateDraftHour = useCallback((key: string, hour: number, delta: number) => {
    setDraftData((prev) => {
      const currentDraft = prev[key] || draftUtils.createEmptyDraft();
      const updated = draftUtils.updateDraftHour(currentDraft, hour, delta);
      return {
        ...prev,
        [key]: updated,
      };
    });
  }, []);

  const getDraft = useCallback((key: string): number[] => {
    return draftData[key] || draftUtils.createEmptyDraft();
  }, [draftData]);

  const resetDraft = useCallback((key: string) => {
    setDraftData((prev) => ({
      ...prev,
      [key]: draftUtils.resetDraft(),
    }));
  }, []);

  const loadSampleDraft = useCallback((key: string) => {
    setDraftData((prev) => ({
      ...prev,
      [key]: draftUtils.loadSampleDraft(),
    }));
  }, []);

  return {
    draftData,
    updateDraft,
    updateDraftHour,
    getDraft,
    resetDraft,
    loadSampleDraft,
  };
}
