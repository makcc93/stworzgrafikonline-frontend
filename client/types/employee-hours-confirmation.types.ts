/**
 * Employee Monthly Hours Confirmation — Types
 * Backend module: employee.hoursConfirmation
 *
 * Używane wyłącznie dla OSTATNIEGO miesiąca okresu rozliczeniowego.
 * Algorytm generujący grafik (/algorithm/ScheduleGeneratorContextFactory)
 * dla ostatniego miesiąca okresu bierze pod uwagę limit godzin pracownika:
 *   - jeśli istnieje zapisany EmployeeMonthlyHoursConfirmation → używa confirmedHours,
 *   - jeśli nie istnieje → używa domyślnej normy (defaultNormHours).
 */

/**
 * Backend DTO: EmployeeHoursConfirmationDTO
 * Zwracany przez GET /api/stores/{storeId}/hoursConfirmation
 */
export interface EmployeeHoursConfirmationDTO {
  employeeId: number;
  employeeFirstName: string;
  employeeLastName: string;
  /** Domyślna norma godzinowa pracownika wyliczona dla danego miesiąca (kalendarz + etat) */
  defaultNormHours: number;
  /** Aktualnie obowiązujące godziny — jeśli brak zapisu, równe defaultNormHours */
  confirmedHours: number;
  /** true jeśli dla pracownika istnieje już zapisany rekord w bazie (był edytowany/zapisany ręcznie) */
  confirmed: boolean;
}

/**
 * Backend DTO: UpdateEmployeeHoursConfirmationDTO
 * Pojedynczy wpis w żądaniu zapisu
 */
export interface UpdateEmployeeHoursConfirmationDTO {
  employeeId: number;
  confirmedHours: number;
}

/**
 * Backend DTO: SaveEmployeeHoursConfirmationRequest
 * Body dla PUT /api/stores/{storeId}/hoursConfirmation
 */
export interface SaveEmployeeHoursConfirmationRequest {
  confirmations: UpdateEmployeeHoursConfirmationDTO[];
}