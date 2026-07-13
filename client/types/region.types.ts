import type { Page, PaginationParams } from '@/types/shared.types';

/**
 * Region Module Types
 * Based on backend DTOs for region management
 */

/** Response DTO for region data from backend */
export interface ResponseRegionDTO {
  id: number;
  name: string;
  enable: boolean;
}

/** Create DTO for creating a new region */
export interface CreateRegionDTO {
  name: string; // min 3, max 50 characters
}

/** Update DTO for updating an existing region */
export interface UpdateRegionDTO {
  name: string; // min 3, max 50 characters
  enable: boolean;
}

/** Specification DTO for filtering regions */
export interface RegionSpecificationDTO {
  id?: number;
  name?: string;
  enable?: boolean;
}

/** Combined type for region service parameters */
export type RegionFilters = RegionSpecificationDTO;

/** Re-export shared types for convenience */
export type { Page, PaginationParams };
