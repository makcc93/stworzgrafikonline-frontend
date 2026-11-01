/**
 * Shift Hour Impact Service
 * Estymacja wpływu przesunięć godzin zmian na godziny pracy w miesiącu.
 * Konwencja miesiąca jak w draftService.getMonthlyNorm: month = 1-12 (nie JS 0-11).
 */
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';
import type { ShiftHourImpact } from '@/types/shift-hour-impact.types';

export const shiftHourImpactService = {
  /**
   * GET /api/stores/{storeId}/shift-hour-config/impact/{year}/{month}
   */
  getImpact: (storeId: number, year: number, month: number): Promise<ShiftHourImpact> => {
    if (!storeId || storeId <= 0) throw new Error('Invalid store ID');
    return httpClient.get<ShiftHourImpact>(
      `${API_CONFIG.ENDPOINTS.storeShiftHourConfig(storeId)}/impact/${year}/${month}`
    );
  },
};
