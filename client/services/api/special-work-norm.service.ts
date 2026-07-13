import type {
  ResponseSpecialWorkNormDTO,
  CreateSpecialWorkNormDTO,
  UpdateSpecialWorkNormDTO,
} from '@/types/special-work-norm.types';
import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

export const specialWorkNormService = {

  // kierownik — tylko aktywne (do wyboru przy edycji pracownika)
  getAllActive: async (): Promise<ResponseSpecialWorkNormDTO[]> => {
    return await httpClient.get<ResponseSpecialWorkNormDTO[]>(
      `${API_CONFIG.ENDPOINTS.specialWorkNorms}/active`
    );
  },

  // admin — wszystkie
  getAll: async (): Promise<ResponseSpecialWorkNormDTO[]> => {
    return await httpClient.get<ResponseSpecialWorkNormDTO[]>(
      API_CONFIG.ENDPOINTS.specialWorkNorms
    );
  },

  getById: async (id: number): Promise<ResponseSpecialWorkNormDTO> => {
    return await httpClient.get<ResponseSpecialWorkNormDTO>(
      `${API_CONFIG.ENDPOINTS.specialWorkNorms}/${id}`
    );
  },

  create: async (data: CreateSpecialWorkNormDTO): Promise<ResponseSpecialWorkNormDTO> => {
    return await httpClient.post<ResponseSpecialWorkNormDTO>(
      API_CONFIG.ENDPOINTS.specialWorkNorms,
      data
    );
  },

  update: async (id: number, data: UpdateSpecialWorkNormDTO): Promise<ResponseSpecialWorkNormDTO> => {
    return await httpClient.patch<ResponseSpecialWorkNormDTO>(
      `${API_CONFIG.ENDPOINTS.specialWorkNorms}/${id}`,
      data
    );
  },

  delete: async (id: number): Promise<void> => {
    await httpClient.delete(`${API_CONFIG.ENDPOINTS.specialWorkNorms}/${id}`);
  },
};

console.log('🌐 Special Work Norm Real API Service loaded');