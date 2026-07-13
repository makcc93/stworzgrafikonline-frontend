import type { ResponseRegionDTO } from '@/types/region.types';

export interface RegionFormData { name: string; enable: boolean; }

export function createEmptyRegionForm(): RegionFormData {
  return { name: '', enable: true };
}

export function regionToFormData(region: ResponseRegionDTO): RegionFormData {
  return { name: region.name, enable: region.enable };
}

export function validateRegionName(name: string): string | null {
  if (!name || name.length < 3) return 'Nazwa musi mieć min. 3 znaki';
  if (name.length > 50) return 'Nazwa może mieć max. 50 znaków';
  return null;
}
