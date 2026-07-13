/**
 * AppUser Real API Service
 * Handles all user management API calls (ADMIN only)
 */

import { API_CONFIG } from '@/config/api.config';
import { httpClient } from '@/config/http.client';

// ==================== TYPES ====================

export type UserRole = 'STORE_MANAGER' | 'DIRECTOR' | 'ADMIN';
export type DirectorScope = 'BRANCH' | 'REGION' | 'NETWORK';

export interface UserResponse {
  id: number;
  login: string;
  role: UserRole;
  directorScope: DirectorScope | null;
  storeId: number | null;
  branchId: number | null;
  regionId: number | null;
  enabled: boolean;
}

export interface CreateUserRequest {
  login: string;
  password: string;
  role: UserRole;
  storeId?: number | null;
  branchId?: number | null;
  regionId?: number | null;
  directorScope?: DirectorScope | null;
}

export interface ChangePasswordRequest {
  newPassword: string;
}

export interface ChangeOwnPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface SetEnabledRequest {
  enabled: boolean;
}

// ==================== SERVICE ====================

export const userService = {
  /**
   * Get all users
   * GET /api/users
   */
  getAll: async (): Promise<UserResponse[]> => {
    return await httpClient.get<UserResponse[]>(API_CONFIG.ENDPOINTS.users);
  },

  /**
   * Create a new user
   * POST /api/users
   */
  create: async (data: CreateUserRequest): Promise<UserResponse> => {
    try {
      return await httpClient.post<UserResponse>(API_CONFIG.ENDPOINTS.users, data);
    } catch (error: any) {
      if (error.message?.includes('Login already taken') || error.message?.includes('409')) {
        throw new Error(`Login "${data.login}" jest już zajęty`);
      }
      throw error;
    }
  },

  /**
   * Change user password (ADMIN only — zmiana hasła innego użytkownika)
   * PATCH /api/users/{id}/password
   */
  changePassword: async (id: number, newPassword: string): Promise<void> => {
    await httpClient.patch<void>(API_CONFIG.ENDPOINTS.userPasswordById(id), { newPassword });
  },

  /**
   * Change own password (każdy zalogowany użytkownik — wymaga podania aktualnego hasła)
   * PATCH /api/users/me/password
   */
  changeOwnPassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await httpClient.patch<void>(API_CONFIG.ENDPOINTS.userOwnPassword, {
        currentPassword,
        newPassword,
      });
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.includes('403') || error.message?.toLowerCase().includes('invalid') || error.message?.toLowerCase().includes('incorrect')) {
        throw new Error('Aktualne hasło jest nieprawidłowe');
      }
      throw error;
    }
  },

  /**
   * Enable or disable user
   * PATCH /api/users/{id}/enabled
   */
  setEnabled: async (id: number, enabled: boolean): Promise<void> => {
    await httpClient.patch<void>(API_CONFIG.ENDPOINTS.userEnabledById(id), { enabled });
  },
};

console.log('🌐 User Real API Service loaded');