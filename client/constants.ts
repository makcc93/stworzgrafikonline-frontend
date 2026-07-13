/**
 * Application constants
 * Centralizes all constant values used throughout the app
 */

export const STAFFING_ROLES = [
  { key: 'storeManager', label: 'STORE MANAGER' },
  { key: 'salesManager', label: 'SALES MANAGER' },
  { key: 'seller', label: 'SELLER' },
  { key: 'cashier', label: 'CASHIER' },
  { key: 'storeman', label: 'STOREMAN' },
  { key: 'pok', label: 'POK' },
] as const;

export const SCHEDULE_TABS = [
  { id: 'draft' as const, label: 'Draft' },
  { id: 'vacations' as const, label: 'Vacations' },
  { id: 'proposals' as const, label: 'Employee Proposals' },
  { id: 'settings' as const, label: 'Specific Month Settings' },
] as const;

export const DEFAULT_STORE_NAME = 'SKLEP PUŁAWY';
export const DEFAULT_WAREHOUSE = 'F7';
export const DEFAULT_DIRECTOR = 'PIOTR KOWALSKI';
export const DEFAULT_BRANCH = 'WARSZAWA 3';

export const HOURS_IN_DAY = 24;
export const MIN_CHART_HEIGHT = 500; // pixels

export const VACATION_EMPLOYEES = ['John Smith', 'Jane Doe', 'Mike Johnson'];
