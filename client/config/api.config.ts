const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    // store context
    stores: '/api/stores',
    storeById: (id: number) => `/api/stores/${id}`,
    storeDetails: (storeId: number) => `/api/stores/${storeId}/details`,
    storeDelivery: (storeId: number) => `/api/stores/${storeId}/deliveries`,
    storeOpeningHours: (storeId: number) => `/api/stores/${storeId}/opening-hours`,
    storeShiftHourConfig: (storeId: number) => `/stores/${storeId}/shift-hour-config`,

    // employee context
    employees: (storeId: number) => `/api/stores/${storeId}/employees`,
    employeeById: (storeId: number, employeeId: number) => `/api/stores/${storeId}/employees/${employeeId}`,
    employeeVacations: (storeId: number, employeeId: number) => `/api/stores/${storeId}/employees/${employeeId}/vacations`,
    employeeProposalsDaysOff: (storeId: number, employeeId: number) => `/api/stores/${storeId}/employees/${employeeId}/proposalsDaysOff`,
    employeeProposalsShifts: (storeId: number, employeeId: number) => `/api/stores/${storeId}/employees/${employeeId}/proposalShifts`,

    // schedule context
    schedules: (storeId: number) => `/api/stores/${storeId}/schedules`,
    scheduleById: (storeId: number, scheduleId: number) => `/api/stores/${storeId}/schedules/${scheduleId}`,
    scheduleDetails: (storeId: number, scheduleId: number) => `/api/stores/${storeId}/schedules/${scheduleId}/details`,

    // global
    shifts: '/api/shifts',
    shiftById: (id: number) => `/api/shifts/${id}`,
    regions: '/api/regions',
    regionById: (id: number) => `/api/regions/${id}`,
    branches: '/api/branches',
    branchById: (id: number) => `/api/branches/${id}`,
    positions: '/api/positions',
    billingPeriodConfig: '/billing-period-config',
    specialWorkNorms: '/api/special-work-norms',
    employeeHoursConfirmation: (storeId: number) => `/api/stores/${storeId}/hoursConfirmation`,

    // user management (ADMIN only)
    users: '/api/users',
    userById: (id: number) => `/api/users/${id}`,
    userPasswordById: (id: number) => `/api/users/${id}/password`,
    userEnabledById: (id: number) => `/api/users/${id}/enabled`,

    // own account (każdy zalogowany użytkownik)
    userOwnPassword: '/api/users/me/password',
  },
} as const;

export function buildUrl(path: string): string {
  return `${API_CONFIG.BASE_URL}${path}`;
}