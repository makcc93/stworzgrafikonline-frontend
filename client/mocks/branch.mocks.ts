import type { ResponseBranchDTO } from '@/types/branch.types';

export const MOCK_BRANCHES: ResponseBranchDTO[] = [
  { id: 1, name: 'Oddział Warszawa 3', enable: true, regionId: 2, regionName: 'Region Wschód' },
  { id: 2, name: 'Oddział Lublin', enable: true, regionId: 2, regionName: 'Region Wschód' },
  { id: 3, name: 'Oddział Białystok', enable: true, regionId: 2, regionName: 'Region Wschód' },
];
