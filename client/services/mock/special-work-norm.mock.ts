import type { ResponseSpecialWorkNormDTO } from '@/types/special-work-norm.types';

const MOCK_NORMS: ResponseSpecialWorkNormDTO[] = [
  { id: 1, name: 'Młodociany', maxDailyHours: 7, weeklyNorm: 35, description: 'Pracownik młodociany - Kodeks Pracy art. 202', active: true },
  { id: 2, name: 'Niepełnosprawny - stopień znaczny', maxDailyHours: 7, weeklyNorm: 35, description: 'Ustawa o rehabilitacji zawodowej', active: true },
  { id: 3, name: 'Niepełnosprawny - stopień umiarkowany', maxDailyHours: 7, weeklyNorm: 35, description: 'Ustawa o rehabilitacji zawodowej', active: true },
];

export const specialWorkNormMockService = {
  getAllActive: async () => MOCK_NORMS.filter(n => n.active),
  getAll: async () => MOCK_NORMS,
  getById: async (id: number) => {
    const norm = MOCK_NORMS.find(n => n.id === id);
    if (!norm) throw new Error(`SpecialWorkNorm not found: ${id}`);
    return norm;
  },
  create: async (data: any) => ({ id: Date.now(), ...data, active: true }),
  update: async (id: number, data: any) => ({ ...MOCK_NORMS.find(n => n.id === id)!, ...data }),
  delete: async (_id: number) => {},
};
