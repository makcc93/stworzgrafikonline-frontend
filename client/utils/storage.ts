/**
 * Storage utilities for managing sessionStorage and localStorage
 * Follows DIP - depends on abstractions, not concrete implementations
 */

type StorageType = 'session' | 'local';

const getStorage = (type: StorageType): Storage => {
  return type === 'session' ? sessionStorage : localStorage;
};

export const storageUtils = {
  /**
   * Get value from storage
   */
  get<T>(key: string, type: StorageType = 'local'): T | null {
    try {
      const storage = getStorage(type);
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  /**
   * Set value in storage
   */
  set<T>(key: string, value: T, type: StorageType = 'local'): void {
    try {
      const storage = getStorage(type);
      storage.setItem(key, JSON.stringify(value));
    } catch {
      console.error(`Failed to set storage item: ${key}`);
    }
  },

  /**
   * Remove value from storage
   */
  remove(key: string, type: StorageType = 'local'): void {
    try {
      const storage = getStorage(type);
      storage.removeItem(key);
    } catch {
      console.error(`Failed to remove storage item: ${key}`);
    }
  },

  /**
   * Clear all items from storage
   */
  clear(type: StorageType = 'local'): void {
    try {
      const storage = getStorage(type);
      storage.clear();
    } catch {
      console.error(`Failed to clear storage`);
    }
  },

  /**
   * Check if key exists in storage
   */
  has(key: string, type: StorageType = 'local'): boolean {
    try {
      const storage = getStorage(type);
      return storage.getItem(key) !== null;
    } catch {
      return false;
    }
  },
};

/**
 * Keys for storage items - centralizes all storage keys
 */
export const STORAGE_KEYS = {
  SHOW_USER_PAGE: 'showUserPage',
  DRAFT_TAB_STATE: 'draftTabState',
  USER_PAGE_DATA: 'userPageData',
  MANAGER_DATA: 'managerData',
  SELECTED_STORE_ID: 'selectedStoreId',
  DRAFT_PREFIX: 'draft',
  SCHEDULE_PREFIX: 'schedule',
} as const;
