/**
 * Branch Management Types
 * Admin-only entity - branches belong to regions
 */

// ==================== BRANCH DTOs ====================

/**
 * Branch response from backend
 */
export interface ResponseBranchDTO {
  id: number;
  name: string;
  enable: boolean;
  regionId: number;
  regionName: string;
}

/**
 * Create new branch
 */
export interface CreateBranchDTO {
  name: string; // 3-50 chars
  regionId: number;
}

/**
 * Update existing branch
 */
export interface UpdateBranchDTO {
  name: string; // 3-50 chars
  enable: boolean;
}

/**
 * Branch filters/specification
 */
export interface BranchSpecificationDTO {
  id?: number;
  name?: string;
  regionId?: number;
  enable?: boolean;
}

// ==================== UI HELPER TYPES ====================

/**
 * Branch grouped by region (for hierarchical display)
 */
export interface BranchesByRegion {
  regionId: number;
  regionName: string;
  branches: ResponseBranchDTO[];
}

/**
 * Form state for create/edit
 */
export interface BranchFormData {
  name: string;
  enable: boolean;
  regionId: number | null;
}

// ==================== VALIDATION ====================

export const BRANCH_VALIDATION = {
  name: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\\s\\-_ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+$/,
    message: 'Nazwa może zawierać litery (w tym polskie), cyfry, spacje, - i _',
  },
} as const;

/**
 * Validate branch name
 */
export function validateBranchName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Nazwa jest wymagana' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < BRANCH_VALIDATION.name.minLength) {
    return { valid: false, error: `Name must be at least ${BRANCH_VALIDATION.name.minLength} characters` };
  }
  
  if (trimmed.length > BRANCH_VALIDATION.name.maxLength) {
    return { valid: false, error: `Name must not exceed ${BRANCH_VALIDATION.name.maxLength} characters` };
  }
  
  if (!BRANCH_VALIDATION.name.pattern.test(trimmed)) {
    return { valid: false, error: BRANCH_VALIDATION.name.message };
  }
  
  return { valid: true };
}

/**
 * Validate region selection
 */
export function validateRegionId(regionId: number | null): { valid: boolean; error?: string } {
  if (regionId === null || regionId === undefined) {
    return { valid: false, error: 'Region is required' };
  }
  
  if (regionId <= 0) {
    return { valid: false, error: 'Invalid region selected' };
  }
  
  return { valid: true };
}

/**
 * Create empty form data
 */
export function createEmptyBranchForm(): BranchFormData {
  return {
    name: '',
    enable: true,
    regionId: null,
  };
}

/**
 * Convert DTO to form data
 */
export function branchToFormData(branch: ResponseBranchDTO): BranchFormData {
  return {
    name: branch.name,
    enable: branch.enable,
    regionId: branch.regionId,
  };
}

// ==================== GROUPING HELPERS ====================

/**
 * Group branches by region
 */
export function groupBranchesByRegion(branches: ResponseBranchDTO[]): BranchesByRegion[] {
  const grouped = new Map<number, BranchesByRegion>();
  
  branches.forEach(branch => {
    if (!grouped.has(branch.regionId)) {
      grouped.set(branch.regionId, {
        regionId: branch.regionId,
        regionName: branch.regionName,
        branches: [],
      });
    }
    grouped.get(branch.regionId)!.branches.push(branch);
  });
  
  return Array.from(grouped.values());
}

/**
 * Filter branches by region
 */
export function filterBranchesByRegion(
  branches: ResponseBranchDTO[],
  regionId: number | null
): ResponseBranchDTO[] {
  if (regionId === null) return branches;
  return branches.filter(b => b.regionId === regionId);
}

/**
 * Get branch count per region
 */
export function getBranchCountByRegion(branches: ResponseBranchDTO[]): Map<number, number> {
  const counts = new Map<number, number>();
  
  branches.forEach(branch => {
    const current = counts.get(branch.regionId) || 0;
    counts.set(branch.regionId, current + 1);
  });
  
  return counts;
}

// ==================== MOCK DATA ====================

/**
 * Mock branches for development
 */
export const MOCK_BRANCHES: ResponseBranchDTO[] = [
  { id: 1, name: 'Oddział Warszawa 3', enable: true, regionId: 2, regionName: 'Region Wschód' },
  { id: 2, name: 'Oddział Lublin', enable: true, regionId: 2, regionName: 'Region Wschód' },
  { id: 3, name: 'Oddział Białystok', enable: true, regionId: 2, regionName: 'Region Wschód' },
  { id: 4, name: 'Oddział Gdańsk', enable: true, regionId: 2, regionName: 'Region Wschód' },
  { id: 5, name: 'Oddział Warszawa 1', enable: true, regionId: 2, regionName: 'Region Wschód'},
  { id: 6, name: 'Oddział Warszawa 2', enable: true, regionId: 2, regionName: 'Region Wschód' },
];
