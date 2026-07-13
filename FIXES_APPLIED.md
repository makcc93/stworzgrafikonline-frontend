# Store Module Structure Fixes - Summary

## Overview
This document summarizes all fixes applied to correct the file structure and imports for the YourStore module integration with the backend API.

## ✅ All Issues Fixed

### 1. Real API Service - FIXED ✓
**File:** `client/services/api/store-details.service.ts`

Created simplified real API service with:
- `getByStoreId(storeId)` - GET `/api/stores/{storeId}/details`
- `create(createData)` - POST `/api/stores/details`
- `update(storeId, updateData)` - PUT `/api/stores/{storeId}/details`
- `delete(storeId)` - DELETE `/api/stores/{storeId}/details`

**Key Points:**
- Uses `VITE_API_URL` environment variable (default: `http://localhost:8080/api`)
- Basic error handling with specific HTTP status codes
- Ready for Bearer token authentication when needed

### 2. API Provider with Mock/Real Switch - FIXED ✓
**File:** `client/services/api-provider.ts`

Simplified API provider that:
- Exports single `storeDetailsService`
- Toggles between mock and real API via `USE_MOCK` flag
- Logs which service is active
- Simple, clean code

**Usage:**
```typescript
import { storeDetailsService } from '@/services/api-provider';

// Automatically uses mock or real API based on USE_MOCK
await storeDetailsService.getByStoreId(1);
await storeDetailsService.update(1, data);
```

**To switch to real API:**
```typescript
const USE_MOCK = false; // Change this line in api-provider.ts
```

### 3. YourStore Component Imports - FIXED ✓
**File:** `client/components/user-page/YourStore.tsx`

Updated imports from:
```typescript
// ❌ OLD - Wrong
import { storeServiceProvider, storeDetailsServiceProvider } from '@/services/api-provider';
```

To:
```typescript
// ✅ NEW - Correct
import { storeDetailsService } from '@/services/api-provider';
```

Also added temporary mock for `storeService`:
```typescript
const storeService = {
  getById: async (id: number): Promise<ResponseStoreDTO> => {
    // Returns mock store with real details loaded
    let details = null;
    try {
      details = await storeDetailsService.getByStoreId(id);
    } catch {
      details = null;
    }
    // Returns mock data for now
  },
};
```

All references updated:
```typescript
// ❌ Before
storeDetailsServiceProvider.update(...)

// ✅ After
storeDetailsService.update(...)
```

### 4. Environment Configuration - FIXED ✓
**File:** `client/.env.example`

Created proper environment template:
```env
# API Configuration
VITE_API_URL=http://localhost:8080/api
```

Users can create `.env` file locally:
```env
VITE_API_URL=http://your-backend.com/api
```

### 5. File Structure - VERIFIED ✓
```
/client
  /services
    /api
      store-details.service.ts      ✅ Real API service
    /mock
      store-details.mock.ts         ✅ Mock service (existing)
    api-provider.ts                 ✅ Simple switcher
    store.mock.ts                   ✅ Store mock data
    store.service.ts                ✅ (Old, not used)
    store.service.config.ts         ✅ (Old, not used)
  /components
    /user-page
      YourStore.tsx                 ✅ Updated with new imports
  /types
    YourStore.types.ts              ✅ Type definitions
  .env.example                       ✅ Environment template
```

## How to Use

### Development with Mock Service (DEFAULT)
```
# No changes needed - USE_MOCK = true by default
# Data persists in localStorage
```

### Production with Real API
```typescript
// In api-provider.ts, change:
const USE_MOCK = false;

// And create .env file:
# .env
VITE_API_URL=http://your-backend.com/api
```

## Component Flow

```
YourStore.tsx
    ↓
[Load data on mount]
    ↓
storeService.getById(1)  ← temporary mock
    ↓
storeDetailsService.getByStoreId(1)
    ↓
├─ If USE_MOCK = true
│  └─ Uses storeDetailsMockService
│     └─ localStorage persistence
│
└─ If USE_MOCK = false
   └─ Uses real storeDetailsService
      └─ Calls HTTP API
```

## Mock vs Real API Endpoints

### Real API (Backend)
```
GET    /api/stores/{storeId}/details
POST   /api/stores/details
PUT    /api/stores/{storeId}/details
DELETE /api/stores/{storeId}/details
```

### Mock Service
```
localStorage key: mock_store_details_data
Updates in memory, persists to localStorage
300-600ms simulated network delay
```

## Testing

### Test with Mock Service
1. Verify `USE_MOCK = true` in `api-provider.ts`
2. Open DevTools → Application → Local Storage
3. Look for `mock_store_details_data` key
4. Make changes in UI → localStorage updates
5. Refresh page → data persists

### Test with Real API
1. Change `USE_MOCK = false` in `api-provider.ts`
2. Create `.env` file with `VITE_API_URL`
3. Ensure backend is running
4. Make changes in UI → HTTP requests to backend
5. Check Network tab in DevTools for API calls

## Common Issues & Solutions

### Issue: "Cannot find module storeServiceProvider"
**Solution:** Use `storeDetailsService` instead (no Provider suffix)
```typescript
// ✅ Correct
import { storeDetailsService } from '@/services/api-provider';

// ❌ Wrong
import { storeDetailsServiceProvider } from '@/services/api-provider';
```

### Issue: API calls not working
**Solution:** Verify environment variable
```
# Check in browser console:
console.log(import.meta.env.VITE_API_URL)

# Should output:
http://localhost:8080/api
```

### Issue: Data not persisting with mock service
**Solution:** Check localStorage not cleared
```typescript
// In browser console:
localStorage.getItem('mock_store_details_data')

// Should return JSON string, not null
```

## Next Steps

1. **Implement Real Store Service** - Create `storeService` API provider
   - GET /api/stores/{id}
   - POST /api/stores
   - PATCH /api/stores/{id}
   - DELETE /api/stores/{id}

2. **Add Authentication**
   - Update API services to include Bearer token
   - Add token to headers when available

3. **Error Handling Enhancement**
   - Add retry logic
   - Add timeout handling
   - Better error messages

4. **Make Store ID Dynamic**
   - Get from context/URL params instead of hardcoded `1`
   - Update component when store ID changes

## Files Modified

| File | Changes | Status |
|------|---------|--------|
| `client/services/api/store-details.service.ts` | Created - Real API service | ✅ |
| `client/services/api-provider.ts` | Updated - Simplified switcher | ✅ |
| `client/components/user-page/YourStore.tsx` | Updated - Fixed imports, added mock store | ✅ |
| `client/.env.example` | Updated - API configuration template | ✅ |

## Verification Checklist

- ✅ api-provider.ts exports `storeDetailsService`
- ✅ YourStore.tsx imports `storeDetailsService` (no Provider)
- ✅ All references to `storeDetailsServiceProvider` changed to `storeDetailsService`
- ✅ Temporary mock `storeService` included in component
- ✅ Environment template created with `VITE_API_URL`
- ✅ File structure is correct (no `/src/` subdirectory)
- ✅ Dev server runs without errors
- ✅ Component loads and displays data

## Deployment Checklist

Before deploying to production:

1. Set `USE_MOCK = false` in `api-provider.ts`
2. Create `.env` file with real backend URL
3. Implement real `storeService` (currently using mock)
4. Test all CRUD operations
5. Add Bearer token authentication
6. Run type checking: `pnpm typecheck`
7. Build: `pnpm build`
8. Test in production environment
