import type { ResponsePositionDTO } from '@/types/position.types';

export interface PositionFormData { name: string; description: string; }

export function createEmptyPositionForm(): PositionFormData {
  return { name: '', description: '' };
}
export function positionToFormData(position: ResponsePositionDTO): PositionFormData {
  return { name: position.name, description: position.description ?? '' };
}
export function validatePositionName(name: string): string | null {
  if (!name || name.length < 3) return 'Nazwa musi mieć min. 3 znaki';
  if (name.length > 50) return 'Nazwa może mieć max. 50 znaków';
  return null;
}
export function validatePositionDescription(desc: string): string | null {
  return null;
}