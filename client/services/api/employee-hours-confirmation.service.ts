/**
 * Employee Monthly Hours Confirmation — Real API Service
 * Backend module: employee.hoursConfirmation
 *
 * Endpoints:
 *   GET /api/stores/{storeId}/hoursConfirmation?year=&month=
 *   PUT /api/stores/{storeId}/hoursConfirmation?year=&month=
 */
import type {
  EmployeeHoursConfirmationDTO,
  SaveEmployeeHoursConfirmationRequest,
} from '@/types/employee-hours-confirmation.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

export const employeeHoursConfirmationService = {
  /**
   * Pobiera listę potwierdzonych/domyślnych godzin dla wszystkich aktywnych
   * pracowników sklepu w danym miesiącu.
   * GET /api/stores/{storeId}/hoursConfirmation?year=&month=
   * month: 1-indexed (konwencja backendu)
   */
  getForMonth: async (
    storeId: number,
    year: number,
    month: number
  ): Promise<EmployeeHoursConfirmationDTO[]> => {
    try {
      if (!storeId || storeId <= 0) throw new Error('Invalid store ID');

      return await httpClient.get<EmployeeHoursConfirmationDTO[]>(
        API_CONFIG.ENDPOINTS.employeeHoursConfirmation(storeId),
        { year, month }
      );
    } catch (error) {
      console.error('[employeeHoursConfirmationService.getForMonth] Error:', error);
      throw error;
    }
  },

  /**
   * Zapisuje (tworzy lub aktualizuje) potwierdzone godziny dla listy pracowników.
   * PUT /api/stores/{storeId}/hoursConfirmation?year=&month=
   * month: 1-indexed (konwencja backendu)
   */
  saveForMonth: async (
    storeId: number,
    year: number,
    month: number,
    data: SaveEmployeeHoursConfirmationRequest
  ): Promise<EmployeeHoursConfirmationDTO[]> => {
    try {
      if (!storeId || storeId <= 0) throw new Error('Invalid store ID');

      const query = `?year=${year}&month=${month}`;
      return await httpClient.put<EmployeeHoursConfirmationDTO[]>(
        `${API_CONFIG.ENDPOINTS.employeeHoursConfirmation(storeId)}${query}`,
        data
      );
    } catch (error) {
      console.error('[employeeHoursConfirmationService.saveForMonth] Error:', error);
      throw error;
    }
  },
};

console.log('🌐 Employee Hours Confirmation Real API Service loaded');