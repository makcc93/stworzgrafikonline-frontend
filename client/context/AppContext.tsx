/**
 * AppContext - Centralized application state management
 * Follows DIP - components depend on context abstraction, not concrete state
 * Follows SRP - context only manages application-wide state
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TabType, UserPageState, StoreHours, DraftState, ManagerData } from '@/types';
import { storageUtils, STORAGE_KEYS } from '@/utils/storage';

interface AppContextType {
  // Navigation state
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Draft state
  draftData: DraftState;
  setDraftData: (data: DraftState) => void;
  draftYear: number;
  setDraftYear: (year: number) => void;

  // Store state
  storeId: string;
  setStoreId: (id: string) => void;
  storeHours: StoreHours;
  setStoreHours: (hours: StoreHours) => void;

  // Auth state
  isLoggedIn: boolean;
  setIsLoggedIn: (logged: boolean) => void;
  handleLogout: () => void;

  // Manager state
  managerData: ManagerData;
  setManagerData: (data: ManagerData) => void;

  // Wybrany sklep (dla ADMIN/DIRECTOR — wybierany ręcznie; dla STORE_MANAGER — z tokenu)
  selectedStoreId: number | null;
  setSelectedStoreId: (id: number | null) => void;

  // Utilities
  showUserPage: boolean;
  setShowUserPage: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_STORE_HOURS: StoreHours = {
  monday: { open: '09:00', close: '20:00' },
  tuesday: { open: '09:00', close: '20:00' },
  wednesday: { open: '09:00', close: '20:00' },
  thursday: { open: '09:00', close: '20:00' },
  friday: { open: '09:00', close: '20:00' },
  saturday: { open: '10:00', close: '18:00' },
  sunday: { open: '10:00', close: '16:00' },
};

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const stored = storageUtils.get<{ activeTab: TabType }>('draftTabState', 'session');
    return stored?.activeTab === 'draft' ? 'draft' : 'team';
  });

  const [draftData, setDraftData] = useState<DraftState>({});
  const [draftYear, setDraftYear] = useState<number>(() => {
    const stored = storageUtils.get<{ year: number }>('draftTabState', 'session');
    return stored?.year || new Date().getFullYear();
  });

  const [storeId, setStoreId] = useState<string>('store-1');
  const [storeHours, setStoreHours] = useState<StoreHours>(DEFAULT_STORE_HOURS);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('authToken'));
  const [managerData, setManagerDataState] = useState<ManagerData | null>(() => {
    return storageUtils.get<ManagerData>('managerData', 'local') || null;
  });
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(() => {
    // Priorytet 1: sklep zapamiętany w sessionStorage (np. wybrany ręcznie przez
    // ADMIN/DIRECTOR w dropdownie) — dzięki temu odświeżenie strony (F5) zostaje
    // na tym samym sklepie zamiast wracać do pierwszego z listy.
    const storedSelected = storageUtils.get<number>(STORAGE_KEYS.SELECTED_STORE_ID, 'session');
    if (storedSelected != null) return storedSelected;
    // Priorytet 2: STORE_MANAGER ma przypisany sklep w tokenie — auto-select
    const stored = storageUtils.get<ManagerData>('managerData', 'local');
    return stored?.storeId ?? null;
  });

  // Persist selectedStoreId do sessionStorage — przeżywa odświeżenie strony,
  // ale (celowo) nie przeżywa zamknięcia karty/przeglądarki, ani nowej sesji
  // logowania na innym koncie.
  useEffect(() => {
    if (selectedStoreId != null) {
      storageUtils.set(STORAGE_KEYS.SELECTED_STORE_ID, selectedStoreId, 'session');
    } else {
      storageUtils.remove(STORAGE_KEYS.SELECTED_STORE_ID, 'session');
    }
  }, [selectedStoreId]);

  const [showUserPage, setShowUserPage] = useState(() => {
    const stored = storageUtils.get<boolean>(STORAGE_KEYS.SHOW_USER_PAGE, 'session');
    return stored ?? false;
  });

  // Persist showUserPage to sessionStorage
  useEffect(() => {
    storageUtils.set(STORAGE_KEYS.SHOW_USER_PAGE, showUserPage, 'session');
  }, [showUserPage]);

  // Persist draftYear to sessionStorage
  useEffect(() => {
    storageUtils.set(STORAGE_KEYS.DRAFT_TAB_STATE, { activeTab, year: draftYear }, 'session');
  }, [activeTab, draftYear]);

  // Persist managerData to localStorage — żeby przeżyło odświeżenie strony
  useEffect(() => {
    if (managerData) {
      storageUtils.set(STORAGE_KEYS.MANAGER_DATA, managerData, 'local');
    }
  }, [managerData]);

  // Clean up draftTabState after navigation to draft tab
  useEffect(() => {
    if (activeTab === 'draft') {
      storageUtils.remove(STORAGE_KEYS.DRAFT_TAB_STATE, 'session');
    }
  }, [activeTab]);

  // Wrapper — ustawia stan i od razu aktualizuje selectedStoreId dla STORE_MANAGER
  const setManagerData = (data: ManagerData) => {
    setManagerDataState(data);
    if (data.role === 'STORE_MANAGER' && data.storeId) {
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
    storageUtils.set(STORAGE_KEYS.USER_PAGE_DATA, allData, 'local');
    localStorage.removeItem('authToken');
    localStorage.removeItem('managerData');
    setIsLoggedIn(false);
    setManagerDataState(null as any);
    setSelectedStoreId(null);
    setShowUserPage(false);
  };

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
    managerData,
    setManagerData,
    selectedStoreId,
    setSelectedStoreId,
    showUserPage,
    setShowUserPage,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Hook to use AppContext
 * Follows DIP - consumers depend on this hook, not directly on context
 */
export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
