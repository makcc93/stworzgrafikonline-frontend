# Store Module Integration Documentation

## Overview
This document summarizes the integration of the YourStore module with the new backend API that includes store details (hours and staffing).

## Files Created/Updated

### 1. **types/YourStore.types.ts** ✅
Updated to include new backend structures:

**New Interfaces Added:**
- `StoreHoursBackend` - Backend format for store hours
- `OptimalStaffing` - Staffing levels
- `StoreDetails` - Complete store details object
- `CreateStoreDetailsDTO` - DTO for creating store details
- `UpdateStoreDetailsDTO` - DTO for updating store details

**Updated Interfaces:**
- `ResponseStoreDTO` - Now includes:
  - `storeManagerFullName: string | null` - Computed field (read-only)
  - `details: StoreDetails | null` - Store details relation

**Helper Functions:**
- `mapBackendHoursToFrontend()` - Convert backend format to UI format
- `mapFrontendHoursToBackend()` - Convert UI format to backend format
- `createDefaultHours()` - Generate default store hours
- `createDefaultStaffing()` - Generate default staffing levels

**Mock Data:**
- `MOCK_STORE_DETAILS` - Mock store details records
- Updated `MOCK_STORES` to include new fields

### 2. **services/api/store-details.service.ts** ✅ NEW
Real API service for store details management:

**Methods:**
- `getByStoreId(storeId)` - GET `/api/stores/{storeId}/details`
- `create(createData)` - POST `/api/stores/details`
- `update(storeId, updateData)` - PUT `/api/stores/{storeId}/details`
- `delete(storeId)` - DELETE `/api/stores/{storeId}/details`

**Features:**
- Bearer token authorization
- Error handling
- Type-safe responses

### 3. **services/mock/store-details.mock.ts** ✅ NEW
Mock service for store details with localStorage persistence:

**Methods:** All matching real service
- `getByStoreId()`
- `create()`
- `update()`
- `delete()`

**Features:**
- 5 mock store details records
- localStorage persistence (key: `mock_store_details_data`)
- Network delay simulation (400-600ms)
- Helper methods: `reset()`, `getCount()`, `exportData()`, `importData()`

### 4. **services/api-provider.ts** ✅ NEW
Service configuration layer for easy switching between mock/real:

**Exports:**
- `storeServiceProvider` - Auto-selects store service
- `storeDetailsServiceProvider` - Auto-selects store details service
- `apiProviderDebug` - Debug utilities

**Features:**
- Environment-based switching
- Single point of service configuration
- Debug logging

**Environment Variable:**
```env
VITE_USE_MOCK_STORE_SERVICE=true  # Default in dev
```

### 5. **services/store.mock.ts** ✅ UPDATED
Updated mock store service to include new fields:
- Added `storeManagerFullName` to all mock stores
- Set `details` field to `null` (loaded separately via storeDetailsService)
- Added manager names to mock data

### 6. **components/user-page/YourStore.tsx** ✅ UPDATED
Complete refactor with backend integration:

**New Features:**
- ✅ Loads store data on mount from API
- ✅ Maps between frontend and backend formats
- ✅ Loading states with spinner
- ✅ Error handling with toast notifications
- ✅ "Zapisz Zmiany" (Save Changes) button
- ✅ Disabled inputs while saving
- ✅ Success/error feedback

**Data Flow:**
1. Load store from `storeServiceProvider.getById()`
2. Map backend hours to frontend format
3. Display in UI
4. On save: map frontend to backend format
5. Call `storeDetailsServiceProvider.update()`
6. Show success/error toast

**Type Mappings:**
- `storeName` ← `store.name`
- `warehouse` ← `store.storeCode` (warehouse/shop code)
- `director` ← `store.storeManagerFullName` (read-only)
- `branch` ← `store.branchName`
- `hours` ← `store.details?.hours` (with mapping)
- `staffing` ← `store.details?.staffing`

**Staffing Role Keys (Updated):**
- `storeManagers` (was: `storeManager`)
- `salesManagers` (was: `salesManager`)
- `sellers` (was: `seller`)
- `cashiers` (was: `cashier`)
- `storemen` (was: `storeman`)
- `pok` (unchanged)

## Key Features Implemented

### 1. Backend Format Mapping
```typescript
// Backend format: { mondayOpen: "08:00", mondayClose: "20:00", ... }
// Frontend format: { monday: { open: "08:00", close: "20:00" }, ... }
mapBackendHoursToFrontend(backendHours)  // For loading
mapFrontendHoursToBackend(frontendHours) // For saving
```

### 2. Error Handling
- Try/catch blocks for all API calls
- User-friendly error messages
- Toast notifications for feedback
- Error state display

### 3. Loading States
- Initial data loading with spinner
- Save button disabled while processing
- Form inputs disabled during save
- Loading indicator with animation

### 4. Data Persistence
- Mock service uses localStorage
- Real API persists on backend
- State management via React hooks
- Context integration for store hours

## Backend Endpoints Expected

```
GET /api/stores/{storeId}
  → Returns: ResponseStoreDTO (with embedded details)

PUT /api/stores/{storeId}/details
  → Body: UpdateStoreDetailsDTO
  → Returns: StoreDetails

POST /api/stores/details
  → Body: CreateStoreDetailsDTO
  → Returns: StoreDetails

GET /api/stores/{storeId}/details
  → Returns: StoreDetails

DELETE /api/stores/{storeId}/details
  → Returns: 204 No Content
```

## Configuration

### Environment Variables
```env
# Use mock service (default: true in dev, false in prod)
VITE_USE_MOCK_STORE_SERVICE=true

# Real API base URL
VITE_API_BASE_URL=http://localhost:3000/api
```

### Service Selection Logic
1. **Development + No Config** → Mock Service
2. **VITE_USE_MOCK_STORE_SERVICE=true** → Mock Service
3. **VITE_USE_MOCK_STORE_SERVICE=false** → Real API
4. **Production** → Real API (default)

## Usage Examples

### Load Store Data
```typescript
import { storeServiceProvider } from '@/services/api-provider';

const store = await storeServiceProvider.getById(1);
// store.name, store.storeCode, store.details, etc.
```

### Update Store Details
```typescript
import { storeDetailsServiceProvider } from '@/services/api-provider';
import { mapFrontendHoursToBackend } from '@/types/YourStore.types';

await storeDetailsServiceProvider.update(storeId, {
  hours: mapFrontendHoursToBackend(frontendHours),
  staffing: storeConfig.staffing,
});
```

### Debug
```typescript
import { apiProviderDebug } from '@/services/api-provider';

apiProviderDebug.logConfig();
// Shows: Service type, API base URL, environment
```

## Testing

### With Mock Service
1. `VITE_USE_MOCK_STORE_SERVICE=true` in .env
2. Data persists in localStorage under:
   - `mock_stores_data` - Store list
   - `mock_store_details_data` - Store details

### With Real API
1. `VITE_USE_MOCK_STORE_SERVICE=false` in .env
2. Set `VITE_API_BASE_URL` to your backend
3. Ensure backend is running and accessible
4. Backend must return proper `ResponseStoreDTO` format

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│              YourStore Component (UI)                   │
└───────┬──────────────────────────────────────────────┬──┘
        │ useEffect (load)                               │ onClick (save)
        │                                                │
        ▼                                                ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│   storeServiceProvider        │        │ storeDetailsServiceProvider  │
│   .getById(storeId)          │        │ .update(storeId, data)      │
└───┬─────────────┬────────────┘        └──┬───────────────────────┬──┘
    │             │                        │                       │
    │   Mock      │ Real API              │ Mock                  │ Real API
    │  Service    │ Service               │ Service               │ Service
    │    │        │  │                    │  │                    │  │
    └────┼────────┼──┼────────────────────┼──┼────────────────────┼──┘
         │        │  │                    │  │                    │
    ┌────▼────────▼──▼──────────────────────▼──▼────────────────────┘
    │
    │  localStorage              Backend API
    │  (mock_stores_data)        (/api/stores/*)
    │
```

## Migration from Old to New Format

### Old staffing keys → New staffing keys
```typescript
// Old (StoreConfig)
{
  staffing: {
    storeManager: 1,      // ← storeManagers
    salesManager: 2,      // ← salesManagers
    seller: 11,           // ← sellers
    cashier: 1,           // ← cashiers
    storeman: 1,          // ← storemen
    pok: 0                // ← pok (unchanged)
  }
}

// New (OptimalStaffing)
{
  staffing: {
    storeManagers: 1,
    salesManagers: 2,
    sellers: 11,
    cashiers: 1,
    storemen: 1,
    pok: 0
  }
}
```

## Important Notes

⚠️ **Warehouse = Store Code**
- `warehouse` field in UI maps to `store.storeCode`
- This is a 2-character code, not a separate warehouse field
- Example: "WA" for Warszawa, "PL" for Puławy

⚠️ **Director is Read-Only**
- Displayed from `store.storeManagerFullName`
- Cannot be edited in this component
- Managed through store manager assignment

⚠️ **Store Details are Separate**
- Details (hours + staffing) are loaded separately
- Updates go through `storeDetailsService`
- Initial load might show defaults while details load

## Troubleshooting

### Data Not Loading
1. Check browser console for errors
2. Verify environment variable `VITE_API_BASE_URL`
3. Check if backend is running
4. Look at Network tab in DevTools

### Save Not Working
1. Check form validation
2. Verify store ID is set
3. Check error toast message
4. Look at browser console

### Using Wrong Format
1. Check staffing key names (storeManagers, not storeManager)
2. Verify hour format is HH:mm (e.g., "08:00")
3. Use provided helper functions for format conversion

## Files Modified Summary

| File | Changes | Status |
|------|---------|--------|
| `types/YourStore.types.ts` | Added new interfaces, helpers, mock data | ✅ |
| `services/api/store-details.service.ts` | NEW - Real API service | ✅ |
| `services/mock/store-details.mock.ts` | NEW - Mock service | ✅ |
| `services/api-provider.ts` | NEW - Service configuration | ✅ |
| `services/store.mock.ts` | Updated with new fields | ✅ |
| `components/user-page/YourStore.tsx` | Complete refactor with API integration | ✅ |

## Next Steps

1. **Backend Integration**: Update backend to support new endpoints
2. **Testing**: Test with both mock and real services
3. **Error Handling**: Implement retry logic if needed
4. **Validation**: Add frontend validation if desired
5. **Loading States**: Add skeleton loaders for better UX
6. **Debouncing**: Add debounce for frequent updates
