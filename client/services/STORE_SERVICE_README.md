# YourStore Service Documentation

## Overview

The YourStore service provides a complete API integration layer for managing store data. It includes:

- **Real API Service** (`store.service.ts`) - Actual backend integration
- **Mock Service** (`store.mock.ts`) - Development/testing with simulated data
- **Service Configuration** (`store.service.config.ts`) - Easy switching between services

## Quick Start

### Using the Mock Service (Default in Development)

```typescript
import { storeServiceConfig } from '@/services/store.service.config';

// All these automatically use mock or real service based on config
const stores = await storeServiceConfig.getAll({ page: 0, size: 25 });
const store = await storeServiceConfig.getById(1);
const created = await storeServiceConfig.create({ /* ... */ });
```

### Using the Real API Service

```typescript
import { storeService } from '@/services/store.service';

// Direct API calls (requires backend running)
const stores = await storeService.getAll({ page: 0, size: 25 });
```

### Using the Mock Service Directly

```typescript
import { storeMockService } from '@/services/store.mock';

// Always uses mock service, useful for testing
const stores = await storeMockService.getAll();
```

## Configuration

### Environment Variables

Create a `.env` file in the `client` directory:

```env
# Use mock service (default: true in dev, false in prod)
VITE_USE_MOCK_STORE_SERVICE=true

# Real API base URL (only needed when VITE_USE_MOCK_STORE_SERVICE=false)
VITE_API_BASE_URL=http://localhost:3000/api
```

### Service Selection Logic

The system automatically chooses:

1. **Development Mode + No VITE_USE_MOCK_STORE_SERVICE** → Mock Service
2. **VITE_USE_MOCK_STORE_SERVICE=true** → Mock Service
3. **VITE_USE_MOCK_STORE_SERVICE=false** → Real API Service
4. **Production Mode** → Real API Service (default)

## API Methods

### getAll(params?: PaginationParams)

Get all stores with pagination.

```typescript
const result = await storeServiceConfig.getAll({
  page: 0,        // Page number (0-indexed)
  size: 25,       // Items per page
  sort: 'createdAt',  // Sort field
  direction: 'DESC'   // ASC or DESC
});

// Returns: Page<ResponseStoreDTO>
console.log(result.content);        // Array of stores
console.log(result.totalElements);  // Total number of stores
console.log(result.totalPages);     // Total number of pages
```

### getById(storeId: number)

Get a single store by ID.

```typescript
const store = await storeServiceConfig.getById(1);
// Returns: ResponseStoreDTO
```

### search(filters?, params?)

Search stores with filtering and pagination.

```typescript
const result = await storeServiceConfig.search(
  {
    storeCode: 'WA',      // Optional filter by store code
    branchId: 102,        // Optional filter by branch
    enable: true,         // Optional filter by status
    name: 'WARSZAWA',     // Optional filter by name
    location: 'al. Jerozolimskie', // Optional filter by location
  },
  {
    page: 0,
    size: 25,
    sort: 'name',
    direction: 'ASC'
  }
);
```

### create(createData: CreateStoreFormState)

Create a new store.

```typescript
const newStore = await storeServiceConfig.create({
  name: 'SKLEP GDAŃSK',
  storeCode: 'GD',
  location: 'ul. Długa 50, Gdańsk',
  branchId: 104
});

// Returns: ResponseStoreDTO with generated ID and timestamps
```

### update(storeId: number, updateData: UpdateStoreFormState)

Update an existing store.

```typescript
const updated = await storeServiceConfig.update(1, {
  name: 'UPDATED NAME',    // Optional
  storeCode: 'UPD',        // Optional
  location: 'New location', // Optional
  branchId: 105,           // Optional
  enable: false,           // Optional
  storeManagerId: 510      // Optional
});
```

### delete(storeId: number)

Delete a store.

```typescript
await storeServiceConfig.delete(1);
// No return value, throws on error
```

## Mock Service Features

### Realistic Data

The mock service generates 15 stores across different Polish cities and branches:

- **Multiple Branches**: POLSKA PÓŁNOC, CENTRALNA, POLSKA POŁUDNIE, WSCHODNIA, ZACHODNIA
- **Varied Status**: ~85% enabled, ~15% disabled
- **Mixed Manager Status**: Some stores without assigned managers
- **Realistic Locations**: Real Polish city names and addresses

### Data Persistence

All changes are automatically saved to localStorage:

```typescript
// Check current store count
const count = storeMockService.getCount(); // 15

// Create a store (auto-saved to localStorage)
await storeMockService.create({ /* ... */ });

// Data persists across page reloads
```

### Network Simulation

Requests include realistic delays (300-800ms) to simulate actual network latency:

```typescript
// Every call waits 300-800ms before responding
const start = Date.now();
await storeServiceConfig.getAll();
console.log(Date.now() - start); // ~500ms (example)
```

### Advanced Mock Operations

```typescript
import { storeMockService } from '@/services/store.mock';

// Reset to initial state
storeMockService.reset();

// Export all data as JSON
const allData = storeMockService.exportData();

// Import data from JSON
storeMockService.importData([
  { id: 1, name: 'STORE', /* ... */ }
]);

// Get current count
const total = storeMockService.getCount();
```

## Error Handling

### Real Service Errors

```typescript
try {
  const store = await storeService.getById(999); // Non-existent
} catch (error) {
  // Error details available
  console.error(error.message);
  // "Store with ID 999 not found"
}
```

### Mock Service Errors

```typescript
try {
  const store = await storeMockService.getById(999);
} catch (error) {
  // Same error handling as real service
  console.error(error.message);
  // "Store with ID 999 not found"
}
```

### Using React Hook

```typescript
import { useStoreService } from '@/services/store.service';

function MyComponent() {
  const { getAll, create } = useStoreService();

  const handleFetch = async () => {
    try {
      const stores = await getAll();
    } catch (error) {
      // Error automatically logged
      toast.error('Failed to fetch stores');
    }
  };
}
```

## Data Types

### ResponseStoreDTO

```typescript
interface ResponseStoreDTO {
  id: number;                    // Auto-generated
  name: string;                  // 3-50 chars
  storeCode: string;             // 2 alphanumeric chars
  location: string;              // Store address
  branchId: number;              // Branch identifier
  branchName: string;            // Branch display name
  createdAt: string;             // ISO 8601 timestamp
  enable: boolean;               // Active status
  storeManagerId: number | null; // Optional manager
}
```

### CreateStoreFormState

```typescript
interface CreateStoreFormState {
  name: string;           // Required, 3-50 chars
  storeCode: string;      // Required, 2 alphanumeric
  location: string;       // Required
  branchId: number;       // Required
}
```

### UpdateStoreFormState

```typescript
interface UpdateStoreFormState {
  name?: string;                  // Optional
  storeCode?: string;             // Optional
  location?: string;              // Optional
  branchId?: number;              // Optional
  enable: boolean;                // Required
  storeManagerId?: number | null; // Optional
}
```

## Debugging

### Check Service Configuration

```typescript
import { storeServiceConfig } from '@/services/store.service.config';

// Log current configuration
storeServiceConfig.logConfig();
// Output:
// 📦 YourStore Service Configuration
// Service: MOCK (or REAL API)
// API Base URL: http://localhost:3000/api
// Environment: development
// Mock Records: 15
```

### Check if Using Mock Service

```typescript
if (storeServiceConfig.isUsingMock()) {
  console.log('Using mock service');
} else {
  console.log('Using real API');
}
```

### Get Service Name

```typescript
const serviceName = storeServiceConfig.getServiceName(); // "MOCK" or "REAL API"
```

## Transitions from Mock to Real API

When you're ready to use the real API:

1. **Update Environment**
   ```env
   VITE_USE_MOCK_STORE_SERVICE=false
   VITE_API_BASE_URL=http://your-backend.com/api
   ```

2. **Keep Your Component Code the Same**
   ```typescript
   // This works for both mock and real service
   const stores = await storeServiceConfig.getAll();
   ```

3. **No Component Changes Needed** - The abstraction layer handles it!

## Examples

### Complete Component Example

```typescript
import { useEffect, useState } from 'react';
import { storeServiceConfig } from '@/services/store.service.config';
import type { ResponseStoreDTO } from '@/types/YourStore.types';

export function StoreList() {
  const [stores, setStores] = useState<ResponseStoreDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const result = await storeServiceConfig.getAll({ size: 10 });
        setStores(result.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {stores.map((store) => (
        <div key={store.id}>
          <h3>{store.name}</h3>
          <p>Code: {store.storeCode}</p>
          <p>Branch: {store.branchName}</p>
        </div>
      ))}
    </div>
  );
}
```

### Search with Filters

```typescript
const filtered = await storeServiceConfig.search(
  { branchId: 102, enable: true },
  { page: 0, size: 10, sort: 'name', direction: 'ASC' }
);
```

### Create and Update

```typescript
// Create
const newStore = await storeServiceConfig.create({
  name: 'SKLEP TESTOWY',
  storeCode: 'TS',
  location: 'Test Location',
  branchId: 101
});

// Update
const updated = await storeServiceConfig.update(newStore.id, {
  name: 'SKLEP TESTOWY UPDATED',
  enable: true
});
```

## Troubleshooting

### Mock Service Not Loading Data

```typescript
// Check localStorage
const data = localStorage.getItem('mock_stores_data');
console.log(JSON.parse(data)); // View mock data

// Reset if corrupted
import { storeMockService } from '@/services/store.mock';
storeMockService.reset();
```

### Real API Returning Errors

```typescript
// Check environment variables
console.log(import.meta.env.VITE_API_BASE_URL);
console.log(import.meta.env.VITE_USE_MOCK_STORE_SERVICE);

// Check token
const token = localStorage.getItem('authToken');
console.log(token); // Should exist if authenticated
```

### Debugging Network Calls

```typescript
// In Chrome DevTools, filter by /api/stores
// Mock service won't show in Network tab (it's local)
// Real service will show actual HTTP requests
```

## Performance Considerations

- **Mock Service**: ~500ms simulated delay, 0ms actual computation
- **Real Service**: Network-dependent, typically 100-500ms
- **Pagination**: Efficiently handles large datasets
- **Filtering**: Client-side in mock, server-side in real API

## Security Notes

- **Token Storage**: Uses localStorage (consider sessionStorage for sensitive apps)
- **CORS**: Real API requires proper CORS configuration
- **Authorization**: Bearer token automatically included from storage
- **Validation**: Backend validates all inputs; client-side validation recommended

## Support

For issues or questions:
1. Check the example code above
2. Review your environment variables
3. Check browser console for error messages
4. Verify localStorage data with DevTools
