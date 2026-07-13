import { Users, ClipboardList, Calendar, Building2, UserCheck, Palmtree, Settings, Truck, Briefcase, ChevronDown, Box, ChartLine, CalendarCheck, CalendarCheck2, House, ChartNoAxesCombined } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useEffect, useState } from 'react';
import { storeService } from '@/services/api-provider';
import type { ResponseStoreDTO } from '@/types/YourStore.types';
import YourTeam from '@/components/user-page/YourTeam';
import YourDraft from '@/components/user-page/YourDraft';
import YourSchedule from '@/components/user-page/YourSchedule';
import YourStore from '@/components/user-page/YourStore';
import StoreDelivery from '@/components/user-page/StoreDelivery';
import EmployeeProposals from '@/components/user-page/EmployeeProposals';
import Vacations from '@/components/user-page/Vacations';
import Delegations from '@/components/user-page/Delegations';
import AccountMenu from '@/components/user-page/AccountMenu';
import AdminPage from '@/pages/AdminPage';

// Zakładki bez pozycji "Admin" — ta zostaje przeniesiona do przycisku przy tytule
const TABS = [
  { id: 'store'       as const, label: 'Sklep',                  icon: House          },
  { id: 'team'        as const, label: 'Zespół',                  icon: Users         },
  { id: 'vacations'   as const, label: 'Urlopy',                  icon: Palmtree      },
  { id: 'delegations' as const, label: 'Delegacje i nieobecności', icon: Briefcase    },
  { id: 'proposals'   as const, label: 'Propozycje',              icon: UserCheck     },
  { id: 'deliveries'  as const, label: 'Dostawy',                 icon: Truck         },
  { id: 'draft'       as const, label: 'Planowanie obsady',       icon: ChartNoAxesCombined     },
  { id: 'schedule'    as const, label: 'Grafiki',                 icon: CalendarCheck },
];

/**
 * Buduje tytuł panelu na podstawie roli i zakresu użytkownika.
 *
 * ADMIN              → "Panel Admina"
 * DIRECTOR/NETWORK   → "Panel Dyrektora Sieci"
 * DIRECTOR/REGION    → "Panel Dyrektora Regionu Północ"
 * DIRECTOR/BRANCH    → "Panel Dyrektora Oddziału Warszawa"
 * STORE_MANAGER      → "Panel Kierownika Sklepu Galeria Zielona"
 */
function buildPanelTitle(
  role: string | undefined,
  directorScope: string | null | undefined,
  scopeName: string | null | undefined
): string {
  if (!role) return 'Panel';

  switch (role) {
    case 'ADMIN':
      return 'Panel Admina';

    case 'DIRECTOR': {
      const name = scopeName?.trim() ?? '';
      switch (directorScope) {
        case 'NETWORK': return 'Panel Dyrektora Sieci';
        case 'REGION':  return name ? `Panel Dyrektora Regionu ${name}` : 'Panel Dyrektora Regionu';
        case 'BRANCH':  return name ? `Panel Dyrektora Oddziału ${name}` : 'Panel Dyrektora Oddziału';
        default:        return 'Panel Dyrektora';
      }
    }

    case 'STORE_MANAGER': {
      const name = scopeName?.trim() ?? '';
      return name ? `Panel Kierownika Sklepu ${name}` : 'Panel Kierownika';
    }

    default:
      return 'Panel';
  }
}

export default function UserPage() {
  const { activeTab, setActiveTab, isLoggedIn, handleLogout, managerData, selectedStoreId, setSelectedStoreId } = useAppContext();
  const [availableStores, setAvailableStores] = useState<ResponseStoreDTO[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  // Śledzi czy lista sklepów była już raz załadowana — nie auto-wybieramy przy każdym odświeżeniu
  const [storesLoaded, setStoresLoaded] = useState(false);

  const isAdmin = managerData?.role === 'ADMIN';
  const isDirector = managerData?.role === 'DIRECTOR';
  const isAdminOrDirector = isAdmin || isDirector;

  // Załaduj sklepy — ADMIN via getAll, DIRECTOR via getManagedStores
  useEffect(() => {
    if (!isAdminOrDirector) return;
    const load = async () => {
      try {
        setLoadingStores(true);
        // ADMIN może getAll (endpoint z @PreAuthorize ADMIN); DIRECTOR musi getManagedStores
        const page = isAdmin
          ? await storeService.getAll()
          : await storeService.getManagedStores();
        setAvailableStores(page.content);
        if (!storesLoaded && !selectedStoreId && page.content.length > 0) {
          setSelectedStoreId(page.content[0].id);
        }
        setStoresLoaded(true);
      } catch (e) {
        console.error('Błąd ładowania sklepów:', e);
      } finally {
        setLoadingStores(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrDirector, isAdmin]);

  // Odśwież listę sklepów po dodaniu nowego sklepu (wywoływane z YourStore)
  const refreshStores = async () => {
    if (!isAdminOrDirector) return;
    try {
      const page = isAdmin
        ? await storeService.getAll()
        : await storeService.getManagedStores();
      setAvailableStores(page.content);
    } catch (e) {
      console.error('Błąd odświeżania sklepów:', e);
    }
  };

  // Zabezpieczenie: jeśli ktoś inny niż ADMIN ma aktywną zakładkę "admin"
  // (np. stan z poprzedniej sesji/wersji), przełącz go na zakładkę "Sklep".
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('store');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Wylogowano</h2>
          <p className="text-slate-400 mb-6">Twoje dane zostały zapisane. Do zobaczenia!</p>
        </div>
      </div>
    );
  }

  const panelTitle = buildPanelTitle(
    managerData?.role,
    managerData?.directorScope,
    managerData?.scopeName
  );

  return (
    /*
     * Zmiana 1: max-w-7xl (1280px) → max-w-[1500px] — mniejsze czarne pasy boczne.
     * Zmiana 2: px-4 zamiast px-4 na zewnętrznym kontenerze — nieznaczna poprawa.
     */
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-[1280px] mx-auto">

        {/* ── Nagłówek: tytuł + przycisk Panelu Admina + AccountMenu ── */}
        <div className="mb-8 flex justify-between items-start gap-4">
          <div>
            {/* Tytuł + przycisk "Panel Admina" obok */}
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-4xl font-bold text-white">{panelTitle}</h1>

              {/* Przycisk Panelu Admina — widoczny tylko dla ADMIN */}
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all ${
                    activeTab === 'admin'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-slate-700/60 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  Panel Admina
                </button>
              )}
            </div>
            <p className="text-slate-400">Zarządzaj zespołem, planuj obsadę i twórz grafiki</p>
          </div>
          <AccountMenu />
        </div>

        {/* Selektor sklepu — widoczny tylko dla ADMIN/DIRECTOR */}
        {isAdminOrDirector && (
          <div className="mb-6 flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
            <Building2 className="w-5 h-5 text-purple-400 shrink-0" />
            <span className="text-slate-300 text-sm font-medium whitespace-nowrap">Wybrany sklep:</span>
            {loadingStores ? (
              <span className="text-slate-400 text-sm">Ładowanie...</span>
            ) : availableStores.length === 0 ? (
              <span className="text-slate-400 text-sm italic">Brak sklepów — utwórz sklep w zakładce Sklep</span>
            ) : (
              <div className="relative flex-1 max-w-sm">
                <select
                  value={selectedStoreId ?? ''}
                  onChange={(e) => {
                    setSelectedStoreId(e.target.value ? Number(e.target.value) : null);
                  }}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 pr-8"
                >
                  <option value="">-- Wybierz sklep --</option>
                  {availableStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.storeCode}) — {s.location}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
        )}

        {/*
         * Zakładki: Sklep → Grafiki (bez Admina).
         * px-4 zamiast px-6 — nieznacznie mniejsze przyciski, mieszczą się bez scroll
         * na monitorach ≥1366 px przy max-w-[1500px].
         */}
        <div className="flex gap-1 mb-8 border-b border-slate-700 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-3 font-medium flex items-center gap-2 transition-all border-b-2 whitespace-nowrap hover:scale-105 active:scale-95 ${
                activeTab === id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon className="w-7 h-7" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Treść zakładek ── */}
        <div>
          {activeTab === 'team'        && <YourTeam />}
          {activeTab === 'draft'       && <YourDraft />}
          {activeTab === 'schedule'    && <YourSchedule />}
          {activeTab === 'proposals'   && <EmployeeProposals />}
          {activeTab === 'vacations'   && <Vacations />}
          {activeTab === 'delegations' && <Delegations />}
          {activeTab === 'store'       && <YourStore onStoreCreated={refreshStores} />}
          {activeTab === 'deliveries'  && <StoreDelivery />}
          {activeTab === 'admin'       && isAdmin && <AdminPage />}
        </div>
      </div>
    </div>
  );
}