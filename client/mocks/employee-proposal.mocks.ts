import type {
  ResponseShiftDTO,
  ResponseEmployeeProposalDaysOffDTO,
  ResponseEmployeeProposalShiftsDTO,
} from '@/types/employee-proposal.types';

export const MOCK_SHIFTS: ResponseShiftDTO[] = [
  { id: 1, startHour: '00:00:00', endHour: '24:00:00', length: 24 },
  { id: 2, startHour: '08:00:00', endHour: '16:00:00', length: 8 },
  { id: 3, startHour: '08:00:00', endHour: '20:00:00', length: 12 },
];

export const MOCK_DAYS_OFF: ResponseEmployeeProposalDaysOffDTO[] = [
  {
    id: 1,
    storeId: 1,
    employeeId: 1,
    year: 2025,
    month: 2,
    monthlyDaysOff: Array(31).fill(0),
    createdAt: '2025-01-15T10:00:00',
    updatedAt: '2025-01-15T10:00:00',
    createdByUserId: 1,
    createdByLabel: 'Administrator',
    updatedByUserId: 1,
    updatedByLabel: 'Administrator',
  },
];

export const MOCK_SHIFT_PROPOSALS: ResponseEmployeeProposalShiftsDTO[] = [
  {
    id: 1,
    storeId: 1,
    employeeId: 1,
    date: '2025-02-01',
    dailyProposalShift: Array(24).fill(0),
    createdAt: '2025-01-15T10:00:00',
    updatedAt: '2025-01-15T10:00:00',
    createdByUserId: 1,
    createdByLabel: 'Administrator',
    updatedByUserId: 1,
    updatedByLabel: 'Administrator',
  },
];