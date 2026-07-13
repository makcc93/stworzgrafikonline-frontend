import {
  DayOfWeek,
  hoursToShiftArray,
  type ResponseStoreDeliveryDTO,
  type UpdateStoreDeliveryDTO,
} from '@/types/store-delivery.types';

/**
 * Mock serwis store-delivery
 * Metody zgodne z realnym storeDeliveryService (api/store-delivery.service.ts)
 */
const storeDeliveryMockService = {
  get: async (storeId: number): Promise<ResponseStoreDeliveryDTO> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      id: 1,
      storeId,
      hasDedicatedWarehouseman: false,
      primaryEmployeeId: null,
      storeWeeklyDeliverySchedule: {
        deliverySchedule: {
          [DayOfWeek.MONDAY]:    { hasDelivery: true,  shiftAsArray: hoursToShiftArray(9, 17) },
          [DayOfWeek.TUESDAY]:   { hasDelivery: true,  shiftAsArray: hoursToShiftArray(9, 17) },
          [DayOfWeek.WEDNESDAY]: { hasDelivery: true,  shiftAsArray: hoursToShiftArray(9, 17) },
          [DayOfWeek.THURSDAY]:  { hasDelivery: false, shiftAsArray: new Array(24).fill(0) },
          [DayOfWeek.FRIDAY]:    { hasDelivery: true,  shiftAsArray: hoursToShiftArray(9, 17) },
          [DayOfWeek.SATURDAY]:  { hasDelivery: false, shiftAsArray: new Array(24).fill(0) },
          [DayOfWeek.SUNDAY]:    { hasDelivery: false, shiftAsArray: new Array(24).fill(0) },
        },
      },
      createdAt: null,
      createdByUserId: null,
      updatedAt: null,
      updatedByUserId: null,
    };
  },

  update: async (
    storeId: number,
    dto: UpdateStoreDeliveryDTO
  ): Promise<ResponseStoreDeliveryDTO> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('[MOCK] PATCH /api/stores/' + storeId + '/deliveries', dto);

    return {
      id: 1,
      storeId,
      hasDedicatedWarehouseman: dto.hasDedicatedWarehouseman,
      primaryEmployeeId: dto.primaryEmployeeId,
      storeWeeklyDeliverySchedule: {
        deliverySchedule: dto.deliverySchedule ?? {} as any,
      },
      createdAt: null,
      createdByUserId: null,
      updatedAt: new Date().toISOString() as any,
      updatedByUserId: dto.updatedByUserId,
    };
  },
};

export { storeDeliveryMockService };