/**
 * Position (Stanowisko) Management Types
 * Defines job positions/roles for employees
 */

// ==================== POSITION DTOs ====================

/**
 * Position response from backend
 */
export interface ResponsePositionDTO {
  id: number;
  name: string;
  description: string | null;
}

/**
 * Create new position
 */
export interface CreatePositionDTO {
  name: string; // 3-50 chars, unique
  description?: string | null;
}

/**
 * Update existing position
 */
export interface UpdatePositionDTO {
  name: string; // 3-50 chars
  description?: string | null;
}

// ==================== UI HELPER TYPES ====================

/**
 * Position with employee count (for display)
 */
export interface PositionWithStats extends ResponsePositionDTO {
  employeeCount?: number;
}

/**
 * Form state for create/edit
 */
export interface PositionFormData {
  name: string;
  description: string;
}

// ==================== VALIDATION ====================

export const POSITION_VALIDATION = {
  name: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s\-_]+$/,
    message: 'Name must be 3-50 characters (letters, numbers, spaces, - and _ allowed)',
  },
  description: {
    maxLength: 500,
  },
} as const;

/**
 * Validate position name
 */
export function validatePositionName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < POSITION_VALIDATION.name.minLength) {
    return { valid: false, error: `Name must be at least ${POSITION_VALIDATION.name.minLength} characters` };
  }
  
  if (trimmed.length > POSITION_VALIDATION.name.maxLength) {
    return { valid: false, error: `Name must not exceed ${POSITION_VALIDATION.name.maxLength} characters` };
  }
  
  if (!POSITION_VALIDATION.name.pattern.test(trimmed)) {
    return { valid: false, error: POSITION_VALIDATION.name.message };
  }
  
  return { valid: true };
}

/**
 * Validate description
 */
export function validatePositionDescription(description: string): { valid: boolean; error?: string } {
  if (!description || description.trim().length === 0) {
    return { valid: true }; // Description is optional
  }
  
  if (description.length > POSITION_VALIDATION.description.maxLength) {
    return { valid: false, error: `Description must not exceed ${POSITION_VALIDATION.description.maxLength} characters` };
  }
  
  return { valid: true };
}

/**
 * Create empty form data
 */
export function createEmptyPositionForm(): PositionFormData {
  return {
    name: '',
    description: '',
  };
}

/**
 * Convert DTO to form data
 */
export function positionToFormData(position: ResponsePositionDTO): PositionFormData {
  return {
    name: position.name,
    description: position.description || '',
  };
}

// ==================== MOCK DATA ====================

/**
 * Mock positions for development
 */
export const MOCK_POSITIONS: ResponsePositionDTO[] = [
  { id: 1, name: 'Dyrektor Regionu', description: 'Zarządza pracą całego regionu i koordynuje pracę podległych Dyrektorów Oddziałów' },
  { id: 2, name: 'Dyrektor Oddziału', description: 'Zarządza pracą wszystkich podległych sklepów' },
  { id: 3, name: 'Kierownik Sklepu', description: 'Zarządza pracą danego sklepu oraz jego pracowników' },
  { id: 4, name: 'Kierownik Sprzedaży', description: 'Zarządza pracą pracowników sklepu, ściśle współpracuje z Kierownikiem Sklepu' },
  { id: 5, name: 'Doradca Klienta Manager', description: 'Rozszerza rolę Doradcy Klienta wspomagając pracę Kierowników' },
  { id: 6, name: 'Doradca Klienta', description: 'Doradza klientom w wyborze produktów podstawowych oraz dodatków i usług' },
  { id: 7, name: 'Kasjer', description: 'Obsługuje kasę, nie pełni bezpośredniej roli doradczej' },
  { id: 8, name: 'Pracownik POK', description: 'Obsługuje Punkt Obsługi Klienta do wydawania zamówień oraz udziela niezbędnych informacji' },
  { id: 9, name: 'Magazynier', description: 'Zajmuje się przyjmowaniem ilościowym i jakościowym towarów na sklep, odpowiedzialny jest za magazyn, a także za ekspozycję' },
  { id: 10, name: 'Koordynator Zmiany', description: 'Pełni rolę Doradcy Klienta poszerzoną o prowadzenie zmian oraz nadzorów, pozycja bliska Doradcy Klienta Managerowi' },
  { id: 11, name: 'Kierownik Zmiany', description: 'Pełni hybrydową rolę Kierownika w połączeniu z pracą Doradcy Klienta' },
];
