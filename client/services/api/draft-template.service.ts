/**
 * Draft Template Service
 * Szablony zapotrzebowania per sklep / miesiąc / dzień tygodnia.
 * Konwencja miesiąca jak w draftService.getMonthlyNorm: month = 1-12 (nie JS 0-11).
 * Dzień tygodnia po stronie frontendu = JS getDay() (0 = niedziela).
 */
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';
import type {
  DemandTemplateApplyResponse,
  DemandTemplateCopyResponse,
  DemandTemplateResponse,
  DemandTemplateSaveResponse,
} from '@/types/draft-template.types';
import { JS_TO_API_DAY } from '@/types/draft-template.types';

const base = (storeId: number) => {
  if (!storeId || storeId <= 0) throw new Error('Invalid store ID');
  return `${API_CONFIG.ENDPOINTS.stores}/${storeId}/draftTemplates`;
};

export const draftTemplateService = {
  /**
   * Szablony miesiąca — zawsze 7 pozycji (pon–niedz); dzień bez zapisu ma persisted = false i same zera.
   * GET /api/stores/{storeId}/draftTemplates/{year}/{month}
   */
  getByMonth: (storeId: number, year: number, month: number): Promise<DemandTemplateResponse[]> =>
    httpClient.get<DemandTemplateResponse[]>(`${base(storeId)}/${year}/${month}`),

  /**
   * Zapisuje szablon dnia tygodnia i w tej samej transakcji nadpisuje drafty wszystkich takich dni w miesiącu.
   * PUT /api/stores/{storeId}/draftTemplates/{year}/{month}/{dayOfWeek}
   */
  save: (
    storeId: number,
    year: number,
    month: number,
    jsDayOfWeek: number,
    hourlyDemand: number[]
  ): Promise<DemandTemplateSaveResponse> =>
    httpClient.put<DemandTemplateSaveResponse>(
      `${base(storeId)}/${year}/${month}/${JS_TO_API_DAY[jsDayOfWeek]}`,
      { hourlyDemand }
    ),

  /**
   * Nadpisuje drafty dni zapisanymi szablonami (bez zmiany szablonów).
   * POST /api/stores/{storeId}/draftTemplates/{year}/{month}/apply
   */
  apply: (
    storeId: number,
    year: number,
    month: number,
    jsDaysOfWeek?: number[]
  ): Promise<DemandTemplateApplyResponse> =>
    httpClient.post<DemandTemplateApplyResponse>(`${base(storeId)}/${year}/${month}/apply`, {
      dayOfWeeks: jsDaysOfWeek?.map((d) => JS_TO_API_DAY[d]),
    }),

  /**
   * Kopiuje szablony po dniu tygodnia do innego miesiąca (nie rusza draftów dni).
   * POST /api/stores/{storeId}/draftTemplates/{year}/{month}/copy
   */
  copy: (
    storeId: number,
    year: number,
    month: number,
    targetYear: number,
    targetMonth: number,
    jsDaysOfWeek?: number[]
  ): Promise<DemandTemplateCopyResponse> =>
    httpClient.post<DemandTemplateCopyResponse>(`${base(storeId)}/${year}/${month}/copy`, {
      targetYear,
      targetMonth,
      dayOfWeeks: jsDaysOfWeek?.map((d) => JS_TO_API_DAY[d]),
    }),
};
