/**
 * API Provider with Mock/Real switch
 * Toggle USE_MOCK to switch between mock and real API
 */

import { storeDetailsService as realStoreDetailsService } from './api/store-details.service';
import { storeDetailsMockService } from './mock/store-details.mock';
import { employeeService as realEmployeeService } from './api/employee.service';
import { employeeMockService } from './mock/employee.mock';
import { draftService as realDraftService } from './api/draft.service';
// import { draftMockService } from './mock/draft.mock';
import { employeeVacationService as realVacationService } from './api/employee-vacation.service';
import { employeeVacationMockService } from './mock/employee-vacation.mock';
import { proposalDaysOffService as realProposalDaysOffService } from './api/employee-proposal-daysoff.service';
import { proposalDaysOffMockService } from './mock/employee-proposal-daysoff.mock';
import { proposalShiftsService as realProposalShiftsService } from './api/employee-proposal-shifts.service';
import { proposalShiftsMockService } from './mock/employee-proposal-shifts.mock';
import { shiftService as realShiftService } from './api/shift.service';
import { shiftMockService } from './mock/shift.mock';
import { regionService as realRegionService } from './api/region.service';
import { regionMockService } from './mock/region.mock';
import { branchService as realBranchService } from './api/branch.service';
import { branchMockService } from './mock/branch.mock';
import { positionService as realPositionService } from './api/position.service';
import { positionMockService } from './mock/position.mock';
import { storeDeliveryService as realStoreDeliveryService } from './api/store-delivery.service';
import { storeDeliveryMockService } from './mock/store-delivery.mock';
import { storeService as realStoreService } from './api/store.service';
import { scheduleService as realScheduleService } from './api/schedule.service';
import { storeOpeningHoursService as realStoreOpeningHoursService } from './api/store-opening-hours.service';
import { holidayService as realHolidayService } from './api/holiday.service';
import { employeeDelegationService as realDelegationService } from './api/employee-delegation.service';
import { billingPeriodConfigService as realBillingPeriodConfigService } from './api/billing-period-config.service';
import { shiftHourModificationService as realShiftHourModificationService } from './api/shift-hour-modification.service';
import { specialWorkNormService as realSpecialWorkNormService } from './api/special-work-norm.service';
import { specialWorkNormMockService } from './mock/special-work-norm.mock';
import { userService as realUserService } from './api/user.service';
import { employeeHoursConfirmationService as realEmployeeHoursConfirmationService } from './api/employee-hours-confirmation.service';

// PRZEŁĄCZNIK: true = mock, false = real API
const USE_MOCK = false;


export const specialWorkNormService = USE_MOCK
  ? specialWorkNormMockService
  : realSpecialWorkNormService;

/**
 * StoreDetails Service Provider
 * Automatically switches between mock and real API based on USE_MOCK flag
 */
export const storeDetailsService = USE_MOCK
  ? storeDetailsMockService
  : realStoreDetailsService;

/**
 * Employee Service Provider
 * Automatically switches between mock and real API based on USE_MOCK flag
 */
export const employeeService = USE_MOCK
  ? employeeMockService
  : realEmployeeService;

  
export const draftService = realDraftService;

/**
 * Vacation Service Provider
 * Automatically switches between mock and real API based on USE_MOCK flag
 */
export const vacationService = USE_MOCK
  ? employeeVacationMockService
  : realVacationService;

/**
 * Proposal DaysOff Service Provider
 * Automatically switches between mock and real API based on USE_MOCK flag
 */
export const proposalDaysOffService = USE_MOCK
  ? proposalDaysOffMockService
  : realProposalDaysOffService;

/**
 * Proposal Shifts Service Provider
 * Automatically switches between mock and real API based on USE_MOCK flag
 */
export const proposalShiftsService = USE_MOCK
  ? proposalShiftsMockService
  : realProposalShiftsService;

/**
 * Shift Service Provider
 * Automatically switches between mock and real API based on USE_MOCK flag
 */
export const shiftService = USE_MOCK
  ? shiftMockService
  : realShiftService;

/**
 * Region Service Provider
 * Automatically switches between mock and real API based on USE_MOCK flag
 */
export const regionService = USE_MOCK
  ? regionMockService
  : realRegionService;

/**
 * Branch Service Provider
 * Automatically switches between mock and real API based on USE_MOCK flag
 */
export const branchService = USE_MOCK
  ? branchMockService
  : realBranchService;

/**
 * Position Service Provider
 * Automatically switches between mock and real API based on USE_MOCK flag
 */
export const positionService = USE_MOCK
  ? positionMockService
  : realPositionService;

/**
 * Store Delivery Service Provider
 * Automatically switches between mock and real API based on USE_MOCK flag
 */
export const storeDeliveryService = USE_MOCK ? storeDeliveryMockService : realStoreDeliveryService;

// Log which services are active
if (USE_MOCK) {
  console.log('🎭 Using MOCK Services (StoreDetails, Employee, Draft, Vacation, Proposals, Shifts, Region, Branch, Position, StoreDelivery)');
} else {
  console.log('🌐 Using REAL API Services (StoreDetails, Employee, Draft, Vacation, Proposals, Shifts, Region, Branch, Position, StoreDelivery)');
}

export const storeService = USE_MOCK
  ? realStoreService
  : realStoreService;

export const scheduleService = USE_MOCK
  ? realScheduleService
  : realScheduleService;

export const storeOpeningHoursService = realStoreOpeningHoursService;
export const holidayService = realHolidayService;

export const delegationService = USE_MOCK
  ? realDelegationService  // brak mocka delegation
  : realDelegationService;

export const billingPeriodConfigService = USE_MOCK
  ? realBillingPeriodConfigService
  : realBillingPeriodConfigService;

export const shiftHourModificationService = USE_MOCK
  ? realShiftHourModificationService
  : realShiftHourModificationService;

/**
 * User Service Provider (ADMIN only)
 * No mock — user management is always real API
 */
export const userService = realUserService;

/**
 * Employee Monthly Hours Confirmation Service Provider
 * Brak mocka — zawsze real API
 */
export const employeeHoursConfirmationService = realEmployeeHoursConfirmationService;

import { appInitializerService as realAppInitializerService } from './api/app-initializer.service';
export const appInitializerService = realAppInitializerService;