export type TabType = 'team' | 'draft' | 'schedule' | 'store' | 'proposals' | 'vacations' | 'deliveries' | 'admin';
export type ScheduleTabType = 'draft' | 'vacations' | 'proposals' | 'settings';

export interface StoreHours {
  monday: { open: string; close: string };
  tuesday: { open: string; close: string };
  wednesday: { open: string; close: string };
  thursday: { open: string; close: string };
  friday: { open: string; close: string };
  saturday: { open: string; close: string };
  sunday: { open: string; close: string };
}

export interface StoreConfig {
  storeName: string;
  warehouse: string;
  director: string;
  branch: string;
  hours: StoreHours;
  staffing: {
    storeManager: number;
    salesManager: number;
    seller: number;
    cashier: number;
    storeman: number;
    pok: number;
  };
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  roles: {
    manager: boolean;
    seller: boolean;
    enable: boolean;
    canOperateCheckout: boolean;
    canOperateCredit: boolean;
    canOpenCloseStore: boolean;
  };
}

export interface ScheduleData {
  draft: number[];
  vacations: string[];
  employeeProposals: string;
  monthSettings: Record<string, string>;
}

export interface DraftState {
  [key: string]: number[];
}

export interface ManagerData {
  login: string;
  role: string;
  storeId: number | null;
  // Zakres uprawnień Dyrektora — obecne tylko gdy role === 'DIRECTOR'
  directorScope?: 'BRANCH' | 'REGION' | 'NETWORK' | null;
  // Nazwa zakresu (nazwa sklepu / oddziału / regionu) — wyliczana przez backend przy logowaniu
  scopeName?: string | null;
}

export interface UserPageState {
  activeTab: TabType;
  draftData: DraftState;
  draftYear: number;
  storeId: string;
  storeHours: StoreHours;
  isLoggedIn: boolean;
}

export interface ScheduleMonth {
  year: number;
  month: number;
  created: boolean;
}

export interface DraftStatus {
  ready: boolean;
  message: string;
}

export interface EmployeeProposal {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  proposals: Record<number, string>; // day -> "free day" | "8-20" | "10-20" etc
}

export interface EmployeeVacation {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  vacationDays: Set<number>; // Set of days
}