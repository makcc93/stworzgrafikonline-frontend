import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";

import {
  TabType,
  UserPageState,
  StoreHours,
  DraftState,
  ManagerData,
} from "@/types";

import { storageUtils, STORAGE_KEYS } from "@/utils/storage";
import { SESSION_EXPIRED_EVENT } from "@/config/http.client";

interface AppContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  draftData: DraftState;
  setDraftData: (data: DraftState) => void;

  draftYear: number;
  setDraftYear: (year: number) => void;

  storeId: string;
  setStoreId: (id: string) => void;

  storeHours: StoreHours;
  setStoreHours: (hours: StoreHours) => void;

  isLoggedIn: boolean;
  setIsLoggedIn: (logged: boolean) => void;

  handleLogout: () => void;

  managerData: ManagerData;
  setManagerData: (data: ManagerData) => void;

  selectedStoreId: number | null;
  setSelectedStoreId: (id: number | null) => void;

  showUserPage: boolean;
  setShowUserPage: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_STORE_HOURS: StoreHours = {
  monday: { open: "09:00", close: "20:00" },
  tuesday: { open: "09:00", close: "20:00" },
  wednesday: { open: "09:00", close: "20:00" },
  thursday: { open: "09:00", close: "20:00" },
  friday: { open: "09:00", close: "20:00" },
  saturday: { open: "10:00", close: "18:00" },
  sunday: { open: "10:00", close: "16:00" },
};

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const stored = storageUtils.get<{ activeTab: TabType }>(
      STORAGE_KEYS.DRAFT_TAB_STATE,
      "session"
    );

    return stored?.activeTab === "draft" ? "draft" : "team";
  });

  const [draftData, setDraftData] = useState<DraftState>({});

  const [draftYear, setDraftYear] = useState<number>(() => {
    const stored = storageUtils.get<{ year: number }>(
      STORAGE_KEYS.DRAFT_TAB_STATE,
      "session"
    );

    return stored?.year || new Date().getFullYear();
  });

  const [storeId, setStoreId] = useState<string>("store-1");

  const [storeHours, setStoreHours] =
    useState<StoreHours>(DEFAULT_STORE_HOURS);

  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("authToken")
  );

  const [managerData, setManagerDataState] =
    useState<ManagerData | null>(() => {
      return (
        storageUtils.get<ManagerData>(
          STORAGE_KEYS.MANAGER_DATA,
          "local"
        ) || null
      );
    });

  const [selectedStoreId, setSelectedStoreId] =
    useState<number | null>(() => {
      const storedSelected = storageUtils.get<number>(
        STORAGE_KEYS.SELECTED_STORE_ID,
        "session"
      );

      if (storedSelected != null) {
        return storedSelected;
      }

      const stored = storageUtils.get<ManagerData>(
        STORAGE_KEYS.MANAGER_DATA,
        "local"
      );

      return stored?.storeId ?? null;
    });

  useEffect(() => {
    if (selectedStoreId != null) {
      storageUtils.set(
        STORAGE_KEYS.SELECTED_STORE_ID,
        selectedStoreId,
        "session"
      );
    } else {
      storageUtils.remove(
        STORAGE_KEYS.SELECTED_STORE_ID,
        "session"
      );
    }
  }, [selectedStoreId]);

  const [showUserPage, setShowUserPage] = useState(() => {
    const stored = storageUtils.get<boolean>(
      STORAGE_KEYS.SHOW_USER_PAGE,
      "session"
    );

    return stored ?? false;
  });

  useEffect(() => {
    storageUtils.set(
      STORAGE_KEYS.SHOW_USER_PAGE,
      showUserPage,
      "session"
    );
  }, [showUserPage]);

  useEffect(() => {
    storageUtils.set(
      STORAGE_KEYS.DRAFT_TAB_STATE,
      {
        activeTab,
        year: draftYear,
      },
      "session"
    );
  }, [activeTab, draftYear]);

  useEffect(() => {
    if (managerData) {
      storageUtils.set(
        STORAGE_KEYS.MANAGER_DATA,
        managerData,
        "local"
      );
    }
  }, [managerData]);

  useEffect(() => {
    if (activeTab === "draft") {
      storageUtils.remove(
        STORAGE_KEYS.DRAFT_TAB_STATE,
        "session"
      );
    }
  }, [activeTab]);

  const setManagerData = (data: ManagerData) => {
    setManagerDataState(data);

    if (data.role === "STORE_MANAGER" && data.storeId) {
      setSelectedStoreId(data.storeId);
    }
  };

  const handleLogout = () => {
    const allData: UserPageState = {
      activeTab,
      draftData,
      storeId,
      draftYear,
      storeHours,
      isLoggedIn: false,
    };

    storageUtils.set(
      STORAGE_KEYS.USER_PAGE_DATA,
      allData,
      "local"
    );

    localStorage.removeItem("authToken");

    storageUtils.remove(
      STORAGE_KEYS.MANAGER_DATA,
      "local"
    );

    storageUtils.remove(
      STORAGE_KEYS.DEMO_SESSION,
      "local"
    );

    storageUtils.remove(
      STORAGE_KEYS.DEMO_EXPIRES_AT,
      "local"
    );

    storageUtils.remove(
      STORAGE_KEYS.SELECTED_STORE_ID,
      "session"
    );

    setIsLoggedIn(false);
    setManagerDataState(null);
    setSelectedStoreId(null);
    setShowUserPage(false);
  };

  const handleLogoutRef = useRef(handleLogout);
  handleLogoutRef.current = handleLogout;

  useEffect(() => {
    const handleSessionExpired = () => {
      const wasDemoSession =
        storageUtils.get<boolean>(
          STORAGE_KEYS.DEMO_SESSION,
          "local"
        ) === true;

      storageUtils.set(
        STORAGE_KEYS.SESSION_NOTICE,
        wasDemoSession
          ? "demo-expired"
          : "session-expired",
        "session"
      );

      handleLogoutRef.current();

      window.location.href = "/";
    };

    window.addEventListener(
      SESSION_EXPIRED_EVENT,
      handleSessionExpired
    );

    return () => {
      window.removeEventListener(
        SESSION_EXPIRED_EVENT,
        handleSessionExpired
      );
    };
  }, []);

  const value: AppContextType = {
    activeTab,
    setActiveTab,

    draftData,
    setDraftData,

    draftYear,
    setDraftYear,

    storeId,
    setStoreId,

    storeHours,
    setStoreHours,

    isLoggedIn,
    setIsLoggedIn,

    handleLogout,

    managerData: managerData as ManagerData,
    setManagerData,

    selectedStoreId,
    setSelectedStoreId,

    showUserPage,
    setShowUserPage,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
      "useAppContext must be used within AppProvider"
    );
  }

  return context;
}

