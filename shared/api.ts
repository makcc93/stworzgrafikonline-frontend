/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Login request interface
 */
export interface LoginRequest {
  login: string;
  password: string;
}

/**
 * Login response interface
 */
export interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    login: string;
    name: string;
    email: string;
  };
}

/**
 * Registration request interface
 */
export interface RegistrationRequest {
  storeName: string;
  email: string;
  warehouseNumber: string;
}

/**
 * Registration response interface
 */
export interface RegistrationResponse {
  success: boolean;
  message: string;
}

/**
 * Pagination wrapper for paginated API responses
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  isEmpty: boolean;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Generic API error response
 */
export interface ApiErrorResponse {
  status: number;
  message: string;
  timestamp: string;
  path: string;
  errors?: Record<string, string[]>;
}
