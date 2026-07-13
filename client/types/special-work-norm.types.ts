/**
 * Special Work Norm Module Types
 * Predefiniowane normy dla pracowników ze szczególnymi warunkami zatrudnienia
 */

export interface ResponseSpecialWorkNormDTO {
  id: number;
  name: string;
  maxDailyHours: number;
  weeklyNorm: number;
  description: string | null;
  active: boolean;
}

export interface CreateSpecialWorkNormDTO {
  name: string;       // min 3, max 100
  maxDailyHours: number; // 1.00 - 12.00
  weeklyNorm: number;    // 1.00 - 60.00
  description?: string;
}

export interface UpdateSpecialWorkNormDTO {
  name: string;
  maxDailyHours: number;
  weeklyNorm: number;
  description?: string;
  active: boolean;
}