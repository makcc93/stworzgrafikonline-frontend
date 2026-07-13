import type { ResponseBranchDTO } from '@/types/branch.types';
import type { ManagerData } from '@/types';

export interface BranchFormData { name: string; regionId: number; enable: boolean; }

/**
 * Zwraca listę oddziałów, do których dany użytkownik (na podstawie ManagerData) ma prawo
 * przypisać sklep (dodanie / zmiana oddziału sklepu):
 * - ADMIN oraz Dyrektor sieci (directorScope === 'NETWORK') — wszystkie oddziały
 * - Dyrektor regionu (directorScope === 'REGION') — tylko oddziały należące do jego regionu
 * - Dyrektor oddziału (directorScope === 'BRANCH') — tylko jego własny oddział
 * - Pozostali (np. STORE_MANAGER bez przypisanego zakresu) — wszystkie oddziały (np. przy
 *   tworzeniu pierwszego, własnego sklepu)
 *
 * Dopasowanie odbywa się po nazwie (scopeName z tokenu logowania), ponieważ ManagerData
 * nie przechowuje obecnie branchId/regionId — jeśli backend zacznie zwracać te ID,
 * warto przełączyć dopasowanie na porównanie ID.
 */
export function getAllowedBranchesForManager(
  branches: ResponseBranchDTO[],
  managerData: ManagerData | null | undefined
): ResponseBranchDTO[] {
  if (!managerData || managerData.role !== 'DIRECTOR') return branches;

  const { directorScope, scopeName } = managerData;

  if (directorScope === 'BRANCH' && scopeName) {
    return branches.filter((b) => b.name === scopeName);
  }
  if (directorScope === 'REGION' && scopeName) {
    return branches.filter((b) => b.regionName === scopeName);
  }
  // NETWORK (dyrektor sieci) lub brak danych o zakresie — bez ograniczeń
  return branches;
}

/**
 * Czy dany użytkownik ma ograniczony (zablokowany na jeden oddział) wybór oddziału —
 * dotyczy dyrektora oddziału, który może dodawać/przenosić sklepy wyłącznie w obrębie
 * swojego jednego oddziału.
 */
export function isBranchScopeLocked(managerData: ManagerData | null | undefined): boolean {
  return managerData?.role === 'DIRECTOR' && managerData?.directorScope === 'BRANCH';
}

export function createEmptyBranchForm(): BranchFormData {
  return { name: '', regionId: 0, enable: true };
}
export function branchToFormData(branch: ResponseBranchDTO): BranchFormData {
  return { name: branch.name, regionId: branch.regionId, enable: branch.enable };
}
export function validateBranchName(name: string): string | null {
  if (!name || name.length < 3) return 'Nazwa musi mieć min. 3 znaki';
  if (name.length > 50) return 'Nazwa może mieć max. 50 znaków';
  return null;
}
export function validateRegionId(regionId: number): string | null {
  if (!regionId || regionId === 0) return 'Wybierz region';
  return null;
}