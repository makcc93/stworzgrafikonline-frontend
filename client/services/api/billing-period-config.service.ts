import type {
  BillingPeriodConfigResponse,
  BillingPeriodConfigRequest,
} from '@/types/billing-period-config.types';
import { httpClient } from '@/config/http.client';

// Poprawny endpoint zgodny z kontrolerem: @RequestMapping("/api") + @GetMapping("/billing-period")
const ENDPOINT = '/api/billing-period';

export const billingPeriodConfigService = {
  /**
   * Pobiera wszystkie konfiguracje okresów rozliczenia
   * GET /api/billing-period
   */
  getAll: async (): Promise<BillingPeriodConfigResponse[]> => {
    try {
      return await httpClient.get<BillingPeriodConfigResponse[]>(ENDPOINT);
    } catch (error) {
      console.error('[billingPeriodConfigService.getAll] Error:', error);
      throw error;
    }
  },

  /**
   * Tworzy nową konfigurację okresu rozliczenia
   * POST /api/billing-period
   * Uwaga: wymaga dodania @PostMapping("/billing-period") w kontrolerze po stronie backendu
   */
  create: async (data: BillingPeriodConfigRequest): Promise<BillingPeriodConfigResponse> => {
    try {
      return await httpClient.post<BillingPeriodConfigResponse>(ENDPOINT, data);
    } catch (error) {
      console.error('[billingPeriodConfigService.create] Error:', error);
      throw error;
    }
  },

  /**
   * Aktualizuje konfigurację okresu rozliczenia
   * PATCH /api/billing-period/{id}
   */
  update: async (
    id: number,
    data: BillingPeriodConfigRequest,
  ): Promise<BillingPeriodConfigResponse> => {
    try {
      return await httpClient.patch<BillingPeriodConfigResponse>(`${ENDPOINT}/${id}`, data);
    } catch (error) {
      console.error('[billingPeriodConfigService.update] Error:', error);
      throw error;
    }
  },

  /**
   * Usuwa konfigurację okresu rozliczenia
   * DELETE /api/billing-period/{id}
   */
  delete: async (id: number): Promise<void> => {
    try {
      return await httpClient.delete(`${ENDPOINT}/${id}`);
    } catch (error) {
      console.error('[billingPeriodConfigService.delete] Error:', error);
      throw error;
    }
  },

  /**
   * Zwraca miesiąc startowy okresu, do którego należy podany miesiąc
   * GET /api/billing-period/{month}
   */
  getPeriodStartMonth: async (month: number): Promise<number> => {
    try {
      return await httpClient.get<number>(`${ENDPOINT}/${month}`);
    } catch (error) {
      console.error('[billingPeriodConfigService.getPeriodStartMonth] Error:', error);
      throw error;
    }
  },

  /**
   * Zwraca listę wszystkich miesięcy należących do okresu rozliczenia dla danego roku/miesiąca
   * GET /api/billing-period/{year}/{month}
   */
  getPeriodMonths: async (year: number, month: number): Promise<number[]> => {
    try {
      return await httpClient.get<number[]>(`${ENDPOINT}/${year}/${month}`);
    } catch (error) {
      console.error('[billingPeriodConfigService.getPeriodMonths] Error:', error);
      throw error;
    }
  },
};

console.log('🌐 Billing Period Config Real API Service loaded');