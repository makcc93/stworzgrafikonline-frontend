type StorageType = "session" | "local";

const getStorage = (type: StorageType): Storage => {
  return type === "session"
    ? sessionStorage
    : localStorage;
};

export const storageUtils = {
  get<T>(
    key: string,
    type: StorageType = "local"
  ): T | null {
    try {
      const storage = getStorage(type);
      const item = storage.getItem(key);

      return item
        ? JSON.parse(item)
        : null;
    } catch {
      return null;
    }
  },

  set<T>(
    key: string,
    value: T,
    type: StorageType = "local"
  ): void {
    try {
      const storage = getStorage(type);

      storage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch {
      console.error(
        `Failed to set storage item: ${key}`
      );
    }
  },

  remove(
    key: string,
    type: StorageType = "local"
  ): void {
    try {
      const storage = getStorage(type);
      storage.removeItem(key);
    } catch {
      console.error(
        `Failed to remove storage item: ${key}`
      );
    }
  },

  clear(
    type: StorageType = "local"
  ): void {
    try {
      const storage = getStorage(type);
      storage.clear();
    } catch {
      console.error(
        "Failed to clear storage"
      );
    }
  },

  has(
    key: string,
    type: StorageType = "local"
  ): boolean {
    try {
      const storage = getStorage(type);

      return storage.getItem(key) !== null;
    } catch {
      return false;
    }
  },
};

export const STORAGE_KEYS = {
  SHOW_USER_PAGE: "showUserPage",
  DRAFT_TAB_STATE: "draftTabState",
  USER_PAGE_DATA: "userPageData",
  MANAGER_DATA: "managerData",
  SELECTED_STORE_ID: "selectedStoreId",

  DEMO_SESSION: "demoSession",
  DEMO_EXPIRES_AT: "demoExpiresAt",

  SESSION_NOTICE: "sessionNotice",

  DRAFT_PREFIX: "draft",
  SCHEDULE_PREFIX: "schedule",
} as const;

