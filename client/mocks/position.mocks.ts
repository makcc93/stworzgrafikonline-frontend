import type { ResponsePositionDTO } from '@/types/position.types';

export const MOCK_POSITIONS: ResponsePositionDTO[] = [
  { id: 1, name: 'Dyrektor Regionu', description: 'Zarządza pracą całego regionu' },
  { id: 2, name: 'Dyrektor Oddziału', description: 'Zarządza pracą wszystkich podległych sklepów' },
  { id: 3, name: 'Kierownik Sklepu', description: 'Zarządza pracą danego sklepu' },
];
