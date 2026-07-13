/**
 * Billing Period Config Module Types
 * Represents billing period configuration for stores
 */

/**
 * Billing Period Config Response
 * Backend DTO: BillingPeriodConfigResponse
 */
export interface BillingPeriodConfigResponse {
  id: number;
  startMonth: number;      // 1-12 (January = 1)
  durationMonths: number;  // 1-12
}

/**
 * Billing Period Config Request
 * Backend DTO: BillingPeriodConfigRequest
 * Used for creating/updating billing period config
 */
export interface BillingPeriodConfigRequest {
  startMonth: number;      // 1-12 (January = 1)
  durationMonths: number;  // 1-12
}
