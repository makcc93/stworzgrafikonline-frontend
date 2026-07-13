import { useState, useMemo, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, Search, AlertCircle, CalendarDays, Users, Eye, EyeOff, ShieldCheck, Store, Building2, Globe, UserCog, KeyRound, ShieldAlert, X, Play } from 'lucide-react';
import { toast } from 'sonner';
import { regionService, branchService, positionService, billingPeriodConfigService, userService, storeService, appInitializerService } from '@/services/api-provider';
import type { ResponseRegionDTO } from '@/types/region.types';
import type { ResponseBranchDTO } from '@/types/branch.types';
import type { ResponsePositionDTO } from '@/types/position.types';
import type { BillingPeriodConfigResponse } from '@/types/billing-period-config.types';
import type { UserResponse, UserRole, DirectorScope, CreateUserRequest } from '@/services/api/user.service';
import type { ResponseStoreDTO } from '@/types/YourStore.types';
import { validatePositionName, validatePositionDescription, createEmptyPositionForm, positionToFormData, type PositionFormData } from '@/utils/position.utils';
import { validateBranchName, createEmptyBranchForm, branchToFormData, type BranchFormData } from '@/utils/branch.utils';
import { validateRegionName, regionToFormData, createEmptyRegionForm, type RegionFormData } from '@/utils/region.utils';

// ==================== BILLING PERIOD HELPERS ====================

const MONTHS_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

const MONTHS_SHORT_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

const PERIOD_COLORS = [
  { bg: 'bg-blue-500/25',    border: 'border-blue-500/50',    text: 'text-blue-400',    dot: 'bg-blue-500',    header: 'text-blue-300'    },
  { bg: 'bg-purple-500/25',  border: 'border-purple-500/50',  text: 'text-purple-400',  dot: 'bg-purple-500',  header: 'text-purple-300'  },
  { bg: 'bg-emerald-500/25', border: 'border-emerald-500/50', text: 'text-emerald-400', dot: 'bg-emerald-500', header: 'text-emerald-300' },
  { bg: 'bg-orange-500/25',  border: 'border-orange-500/50',  text: 'text-orange-400',  dot: 'bg-orange-500',  header: 'text-orange-300'  },
  { bg: 'bg-pink-500/25',    border: 'border-pink-500/50',    text: 'text-pink-400',    dot: 'bg-pink-500',    header: 'text-pink-300'    },
  { bg: 'bg-teal-500/25',    border: 'border-teal-500/50',    text: 'text-teal-400',    dot: 'bg-teal-500',    header: 'text-teal-300'    },
];

/** Mirroring logiki backendowej belongsToPeriod */
const getMonthsForConfig = (config: { startMonth: number; durationMonths: number }): number[] => {
  const months: number[] = [];
  for (let i = 0; i < config.durationMonths; i++) {
    months.push((config.startMonth - 1 + i) % 12 + 1);
  }
  return months;
};

const formatDuration = (n: number): string => {
  if (n === 1) return '1 miesiąc';
  if (n < 5)   return `${n} miesiące`;
  return `${n} miesięcy`;
};

// ==================== USER HELPERS ====================

const ROLE_LABELS: Record<UserRole, string> = {
  STORE_MANAGER: 'Kierownik Sklepu',
  DIRECTOR:      'Dyrektor',
  ADMIN:         'Administrator',
};

const ROLE_COLORS: Record<UserRole, string> = {
  STORE_MANAGER: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  DIRECTOR:      'bg-purple-600/20 text-purple-400 border-purple-600/30',
  ADMIN:         'bg-red-600/20 text-red-400 border-red-600/30',
};

const DIRECTOR_SCOPE_LABELS: Record<DirectorScope, string> = {
  BRANCH:  'Oddział',
  REGION:  'Region',
  NETWORK: 'Cała Sieć',
};

interface CreateUserFormData {
  login: string;
  password: string;
  role: UserRole;
  // STORE_MANAGER
  storeId: number | null;
  // DIRECTOR
  directorScope: DirectorScope | null;
  branchId: number | null;
  regionId: number | null;
}

const emptyUserForm = (): CreateUserFormData => ({
  login: '',
  password: '',
  role: 'STORE_MANAGER',
  storeId: null,
  directorScope: null,
  branchId: null,
  regionId: null,
});

// ==================== TYPES ====================

type Tab = 'regions' | 'branches' | 'positions' | 'billing' | 'users' | 'stores';
type ModalMode = 'create' | 'edit' | null;

interface BillingPeriodFormData {
  startMonth: number;
  durationMonths: number;
}

// ==================== COMPONENT ====================

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('regions');

  const [regions, setRegions]         = useState<ResponseRegionDTO[]>([]);
  const [branches, setBranches]       = useState<ResponseBranchDTO[]>([]);
  const [positions, setPositions]     = useState<ResponsePositionDTO[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriodConfigResponse[]>([]);
  const [users, setUsers]             = useState<UserResponse[]>([]);
  const [stores, setStores]           = useState<ResponseStoreDTO[]>([]);

  const [loadingRegions, setLoadingRegions]     = useState(false);
  const [loadingBranches, setLoadingBranches]   = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [loadingBilling, setLoadingBilling]     = useState(false);
  const [loadingUsers, setLoadingUsers]         = useState(false);
  const [loadingStores, setLoadingStores]       = useState(false);
  const [loadingInit, setLoadingInit]           = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [deleting, setDeleting]                 = useState<number | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [regionForm, setRegionForm]     = useState<RegionFormData>(createEmptyRegionForm());
  const [branchForm, setBranchForm]     = useState<BranchFormData>(createEmptyBranchForm());
  const [positionForm, setPositionForm] = useState<PositionFormData>(createEmptyPositionForm());
  const [billingForm, setBillingForm]   = useState<BillingPeriodFormData>({ startMonth: 1, durationMonths: 3 });
  const [userForm, setUserForm]         = useState<CreateUserFormData>(emptyUserForm());
  const [showPassword, setShowPassword] = useState(false);

  const [regionSearch, setRegionSearch]             = useState('');
  const [branchSearch, setBranchSearch]             = useState('');
  const [branchFilterRegion, setBranchFilterRegion] = useState<number | null>(null);
  const [positionSearch, setPositionSearch]         = useState('');
  const [userSearch, setUserSearch]                 = useState('');
  const [userRoleFilter, setUserRoleFilter]         = useState<UserRole | ''>('');
  const [storeSearch, setStoreSearch]               = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'region' | 'branch' | 'position' | 'billing' | 'user' | 'store';
    id: number;
    name: string;
  } | null>(null);

  // ── User edit modals ──
  const [changePasswordModal, setChangePasswordModal] = useState<{ userId: number; login: string } | null>(null);
  const [changeRoleModal, setChangeRoleModal] = useState<UserResponse | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changeRoleForm, setChangeRoleForm] = useState<CreateUserFormData>(emptyUserForm());

  // ==================== LOAD DATA ====================

  useEffect(() => { loadRegions(); }, []);

  useEffect(() => {
    if (activeTab === 'branches')  loadBranches();
    if (activeTab === 'positions') loadPositions();
    if (activeTab === 'billing')   loadBillingPeriods();
    if (activeTab === 'users')     { loadUsers(); loadStores(); loadBranches(); loadRegions(); }
    if (activeTab === 'stores')    loadStores();
  }, [activeTab]);

  const loadRegions = async () => {
    try {
      setLoadingRegions(true);
      const data = await regionService.getAll();
      setRegions(Array.isArray(data) ? data : (data as any).content ?? []);
    } catch (error) {
      console.error('Error loading regions:', error);
      toast.error('Nie udało się załadować regionów');
    } finally {
      setLoadingRegions(false);
    }
  };

  const loadBranches = async () => {
    try {
      setLoadingBranches(true);
      const data = await branchService.getAll();
      setBranches(Array.isArray(data) ? data : (data as any).content ?? []);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Nie udało się załadować oddziałów');
    } finally {
      setLoadingBranches(false);
    }
  };

  const loadPositions = async () => {
    try {
      setLoadingPositions(true);
      const data = await positionService.getAll();
      setPositions(Array.isArray(data) ? data : (data as any).content ?? []);
    } catch (error) {
      console.error('Error loading positions:', error);
      toast.error('Nie udało się załadować stanowisk');
    } finally {
      setLoadingPositions(false);
    }
  };

  const loadBillingPeriods = async () => {
    try {
      setLoadingBilling(true);
      const data = await billingPeriodConfigService.getAll();
      setBillingPeriods(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading billing periods:', error);
      toast.error('Nie udało się załadować okresów rozliczenia');
    } finally {
      setLoadingBilling(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await userService.getAll();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Nie udało się załadować użytkowników');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadStores = async () => {
    try {
      setLoadingStores(true);
      const data = await storeService.getAll();
      const items: ResponseStoreDTO[] = Array.isArray(data)
        ? data
        : (data as any).content ?? [];
      setStores(items);
    } catch (error) {
      console.error('Error loading stores:', error);
      toast.error('Nie udało się załadować sklepów');
    } finally {
      setLoadingStores(false);
    }
  };

  // ==================== INITIALIZER ====================

  const handleInitFirstStore = async () => {
    try {
      setLoadingInit(true);
      await appInitializerService.createFirstStoreEmployees();
      toast.success('Pracownicy sklepu nr 1 zostali utworzeni');
    } catch (error: any) {
      console.error('Error initializing store employees:', error);
      toast.error(error.message || 'Nie udało się zainicjalizować pracowników');
    } finally {
      setLoadingInit(false);
    }
  };

  // ==================== REGION CRUD ====================

  const openCreateRegion = () => {
    setRegionForm(createEmptyRegionForm());
    setEditingId(null);
    setModalMode('create');
  };

  const openEditRegion = (region: ResponseRegionDTO) => {
    setRegionForm(regionToFormData(region));
    setEditingId(region.id);
    setModalMode('edit');
  };

  const handleSaveRegion = async () => {
    const nameValidation = validateRegionName(regionForm.name);
    if (nameValidation) { toast.error(nameValidation); return; }

    try {
      setSaving(true);
      if (modalMode === 'create') {
        await regionService.create({ name: regionForm.name.trim() });
        toast.success('Region utworzony');
      } else if (modalMode === 'edit' && editingId) {
        await regionService.update(editingId, { name: regionForm.name.trim(), enable: regionForm.enable });
        toast.success('Region zaktualizowany');
      }
      await loadRegions();
      setModalMode(null);
    } catch (error: any) {
      console.error('Error saving region:', error);
      toast.error(error.message || 'Nie udało się zapisać regionu');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRegionEnable = async (region: ResponseRegionDTO) => {
    try {
      await regionService.update(region.id, { name: region.name, enable: !region.enable });
      toast.success(region.enable ? 'Region wyłączony' : 'Region włączony');
      await loadRegions();
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się zmienić statusu');
    }
  };

  const handleDeleteRegion = async (id: number) => {
    try {
      setDeleting(id);
      await regionService.delete(id);
      toast.success('Region usunięty');
      await loadRegions();
      setDeleteConfirm(null);
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się usunąć regionu');
    } finally {
      setDeleting(null);
    }
  };

  // ==================== BRANCH CRUD ====================

  const openCreateBranch = () => {
    setBranchForm(createEmptyBranchForm());
    setEditingId(null);
    setModalMode('create');
  };

  const openEditBranch = (branch: ResponseBranchDTO) => {
    setBranchForm(branchToFormData(branch));
    setEditingId(branch.id);
    setModalMode('edit');
  };

  const handleSaveBranch = async () => {
    const nameError = validateBranchName(branchForm.name);
    if (nameError) { toast.error(nameError); return; }
    if (!branchForm.regionId || branchForm.regionId <= 0) { toast.error('Region jest wymagany'); return; }

    try {
      setSaving(true);
      if (modalMode === 'create') {
        await branchService.create({ name: branchForm.name.trim(), regionId: branchForm.regionId! });
        toast.success('Oddział utworzony');
      } else if (modalMode === 'edit' && editingId) {
        await branchService.update(editingId, { name: branchForm.name.trim(), enable: branchForm.enable });
        toast.success('Oddział zaktualizowany');
      }
      await loadBranches();
      setModalMode(null);
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się zapisać oddziału');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBranchEnable = async (branch: ResponseBranchDTO) => {
    try {
      await branchService.update(branch.id, { name: branch.name, enable: !branch.enable });
      toast.success(branch.enable ? 'Oddział wyłączony' : 'Oddział włączony');
      await loadBranches();
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się zmienić statusu');
    }
  };

  const handleDeleteBranch = async (id: number) => {
    try {
      setDeleting(id);
      await branchService.delete(id);
      toast.success('Oddział usunięty');
      await loadBranches();
      setDeleteConfirm(null);
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się usunąć oddziału');
    } finally {
      setDeleting(null);
    }
  };

  // ==================== POSITION CRUD ====================

  const openCreatePosition = () => {
    setPositionForm(createEmptyPositionForm());
    setEditingId(null);
    setModalMode('create');
  };

  const openEditPosition = (position: ResponsePositionDTO) => {
    setPositionForm(positionToFormData(position));
    setEditingId(position.id);
    setModalMode('edit');
  };

  const handleSavePosition = async () => {
    const nameValidation = validatePositionName(positionForm.name);
    if (nameValidation) { toast.error(nameValidation); return; }

    const descValidation = validatePositionDescription(positionForm.description);
    if (descValidation) { toast.error(descValidation); return; }

    try {
      setSaving(true);
      const data = { name: positionForm.name.trim(), description: positionForm.description.trim() || null };
      if (modalMode === 'create') {
        await positionService.create(data);
        toast.success('Stanowisko utworzone');
      } else if (modalMode === 'edit' && editingId) {
        await positionService.update(editingId, data);
        toast.success('Stanowisko zaktualizowane');
      }
      await loadPositions();
      setModalMode(null);
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się zapisać stanowiska');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePosition = async (id: number) => {
    try {
      setDeleting(id);
      await positionService.delete(id);
      toast.success('Stanowisko usunięte');
      await loadPositions();
      setDeleteConfirm(null);
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się usunąć stanowiska');
    } finally {
      setDeleting(null);
    }
  };

  // ==================== BILLING PERIOD CRUD ====================

  const openCreateBillingPeriod = () => {
    setBillingForm({ startMonth: 1, durationMonths: 3 });
    setEditingId(null);
    setModalMode('create');
  };

  const openEditBillingPeriod = (bp: BillingPeriodConfigResponse) => {
    setBillingForm({ startMonth: bp.startMonth, durationMonths: bp.durationMonths });
    setEditingId(bp.id);
    setModalMode('edit');
  };

  const handleSaveBillingPeriod = async () => {
    if (billingForm.startMonth < 1 || billingForm.startMonth > 12) {
      toast.error('Miesiąc startowy musi być w zakresie 1–12'); return;
    }
    if (billingForm.durationMonths < 1 || billingForm.durationMonths > 12) {
      toast.error('Czas trwania musi być w zakresie 1–12 miesięcy'); return;
    }

    // Sprawdzenie nakładania się zakresów
    const newMonths = getMonthsForConfig(billingForm);
    const hasOverlap = billingPeriods.some(bp => {
      if (bp.id === editingId) return false;
      return getMonthsForConfig(bp).some(m => newMonths.includes(m));
    });
    if (hasOverlap) {
      toast.error('Wybrany zakres nakłada się na istniejący okres rozliczenia');
      return;
    }

    try {
      setSaving(true);
      if (modalMode === 'create') {
        await billingPeriodConfigService.create(billingForm);
        toast.success('Okres rozliczenia utworzony');
      } else if (modalMode === 'edit' && editingId) {
        await billingPeriodConfigService.update(editingId, billingForm);
        toast.success('Okres rozliczenia zaktualizowany');
      }
      await loadBillingPeriods();
      setModalMode(null);
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się zapisać okresu rozliczenia');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBillingPeriod = async (id: number) => {
    try {
      setDeleting(id);
      await billingPeriodConfigService.delete(id);
      toast.success('Okres rozliczenia usunięty');
      await loadBillingPeriods();
      setDeleteConfirm(null);
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się usunąć okresu rozliczenia');
    } finally {
      setDeleting(null);
    }
  };

  // ==================== USER CRUD ====================

  const openCreateUser = () => {
    setUserForm(emptyUserForm());
    setShowPassword(false);
    setModalMode('create');
  };

  const validateUserForm = (): string | null => {
    if (!userForm.login.trim()) return 'Login jest wymagany';
    if (userForm.login.trim().length < 3) return 'Login musi mieć co najmniej 3 znaki';
    if (!userForm.password) return 'Hasło jest wymagane';
    if (userForm.password.length < 6) return 'Hasło musi mieć co najmniej 6 znaków';
    if (userForm.role === 'STORE_MANAGER' && !userForm.storeId) return 'Sklep jest wymagany dla Kierownika Sklepu';
    if (userForm.role === 'DIRECTOR') {
      if (!userForm.directorScope) return 'Zakres uprawnień jest wymagany dla Dyrektora';
      if (userForm.directorScope === 'BRANCH' && !userForm.branchId) return 'Oddział jest wymagany dla Dyrektora Oddziału';
      if (userForm.directorScope === 'REGION' && !userForm.regionId) return 'Region jest wymagany dla Dyrektora Regionu';
    }
    return null;
  };

  const handleCreateUser = async () => {
    const validationError = validateUserForm();
    if (validationError) { toast.error(validationError); return; }

    const payload: CreateUserRequest = {
      login: userForm.login.trim(),
      password: userForm.password,
      role: userForm.role,
    };

    if (userForm.role === 'STORE_MANAGER') {
      payload.storeId = userForm.storeId;
    } else if (userForm.role === 'DIRECTOR') {
      payload.directorScope = userForm.directorScope;
      if (userForm.directorScope === 'BRANCH') payload.branchId = userForm.branchId;
      if (userForm.directorScope === 'REGION') payload.regionId = userForm.regionId;
    }

    try {
      setSaving(true);
      await userService.create(payload);
      toast.success(`Użytkownik "${userForm.login}" został utworzony`);
      await loadUsers();
      setModalMode(null);
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Nie udało się utworzyć użytkownika');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserEnabled = async (user: UserResponse) => {
    try {
      await userService.setEnabled(user.id, !user.enabled);
      toast.success(user.enabled ? `Użytkownik "${user.login}" wyłączony` : `Użytkownik "${user.login}" włączony`);
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się zmienić statusu użytkownika');
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      setDeleting(id);
      // TODO: Backend needs DELETE /api/users/{id} endpoint
      await (userService as any).delete(id);
      toast.success('Użytkownik usunięty');
      await loadUsers();
      setDeleteConfirm(null);
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się usunąć użytkownika (brak endpointu DELETE w backendzie)');
    } finally {
      setDeleting(null);
    }
  };

  const handleChangePassword = async () => {
    if (!changePasswordModal) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error('Hasło musi mieć co najmniej 6 znaków');
      return;
    }
    try {
      setSaving(true);
      await userService.changePassword(changePasswordModal.userId, newPassword);
      toast.success(`Hasło użytkownika "${changePasswordModal.login}" zostało zmienione`);
      setChangePasswordModal(null);
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się zmienić hasła');
    } finally {
      setSaving(false);
    }
  };

  const openChangeRoleModal = (user: UserResponse) => {
    setChangeRoleForm({
      login: user.login,
      password: '',
      role: user.role,
      storeId: user.storeId,
      directorScope: user.directorScope,
      branchId: user.branchId,
      regionId: user.regionId,
    });
    setChangeRoleModal(user);
  };

  const handleChangeRole = async () => {
    if (!changeRoleModal) return;
    // Validate required fields based on role
    if (changeRoleForm.role === 'STORE_MANAGER' && !changeRoleForm.storeId) {
      toast.error('Sklep jest wymagany dla Kierownika Sklepu'); return;
    }
    if (changeRoleForm.role === 'DIRECTOR') {
      if (!changeRoleForm.directorScope) { toast.error('Zakres uprawnień jest wymagany'); return; }
      if (changeRoleForm.directorScope === 'BRANCH' && !changeRoleForm.branchId) { toast.error('Oddział jest wymagany'); return; }
      if (changeRoleForm.directorScope === 'REGION' && !changeRoleForm.regionId) { toast.error('Region jest wymagany'); return; }
    }
    try {
      setSaving(true);
      // TODO: Backend needs PUT/PATCH /api/users/{id}/role endpoint
      await (userService as any).updateRole(changeRoleModal.id, {
        role: changeRoleForm.role,
        storeId: changeRoleForm.storeId,
        directorScope: changeRoleForm.directorScope,
        branchId: changeRoleForm.branchId,
        regionId: changeRoleForm.regionId,
      });
      toast.success(`Uprawnienia użytkownika "${changeRoleModal.login}" zostały zmienione`);
      await loadUsers();
      setChangeRoleModal(null);
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się zmienić uprawnień (brak endpointu w backendzie)');
    } finally {
      setSaving(false);
    }
  };

  // ==================== STORE TAB (read-only list + delete) ====================

  const handleDeleteStore = async (id: number) => {
    try {
      setDeleting(id);
      await storeService.delete(id);
      toast.success('Sklep usunięty');
      await loadStores();
      setDeleteConfirm(null);
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się usunąć sklepu');
    } finally {
      setDeleting(null);
    }
  };

  // ==================== FILTERING ====================

  const filteredRegions = useMemo(() => {
    let filtered = [...regions];
    if (regionSearch) filtered = filtered.filter(r => r.name.toLowerCase().includes(regionSearch.toLowerCase()));
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [regions, regionSearch]);

  const filteredBranches = useMemo(() => {
    let filtered = [...branches];
    if (branchSearch) filtered = filtered.filter(b =>
      b.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
      b.regionName.toLowerCase().includes(branchSearch.toLowerCase())
    );
    if (branchFilterRegion) filtered = filtered.filter(b => b.regionId === branchFilterRegion);
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [branches, branchSearch, branchFilterRegion]);

  const branchCounts = useMemo(() => {
    const map = new Map<number, number>();
    branches.forEach(b => map.set(b.regionId, (map.get(b.regionId) || 0) + 1));
    return map;
  }, [branches]);

  const filteredPositions = useMemo(() => {
    let filtered = [...positions];
    if (positionSearch) filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(positionSearch.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(positionSearch.toLowerCase()))
    );
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [positions, positionSearch]);

  const sortedBillingPeriods = useMemo(
    () => [...billingPeriods].sort((a, b) => a.startMonth - b.startMonth),
    [billingPeriods],
  );

  const coveredMonthsSet = useMemo(() => {
    const set = new Set<number>();
    billingPeriods.forEach(bp => getMonthsForConfig(bp).forEach(m => set.add(m)));
    return set;
  }, [billingPeriods]);

  const uncoveredMonths = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i + 1).filter(m => !coveredMonthsSet.has(m)),
    [coveredMonthsSet],
  );

  const filteredUsers = useMemo(() => {
    let filtered = [...users];
    if (userSearch) filtered = filtered.filter(u =>
      u.login.toLowerCase().includes(userSearch.toLowerCase())
    );
    if (userRoleFilter) filtered = filtered.filter(u => u.role === userRoleFilter);
    return filtered.sort((a, b) => a.login.localeCompare(b.login));
  }, [users, userSearch, userRoleFilter]);

  const filteredStores = useMemo(() => {
    let filtered = [...stores];
    if (storeSearch) filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
      s.storeCode.toLowerCase().includes(storeSearch.toLowerCase()) ||
      s.branchName.toLowerCase().includes(storeSearch.toLowerCase())
    );
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [stores, storeSearch]);

  // Helper to get store name by id
  const getStoreName = (storeId: number | null): string => {
    if (!storeId) return '—';
    const s = stores.find(s => s.id === storeId);
    return s ? `${s.name} (${s.storeCode})` : `Sklep #${storeId}`;
  };

  const getBranchName = (branchId: number | null): string => {
    if (!branchId) return '—';
    const b = branches.find(b => b.id === branchId);
    return b ? b.name : `Oddział #${branchId}`;
  };

  const getRegionName = (regionId: number | null): string => {
    if (!regionId) return '—';
    const r = regions.find(r => r.id === regionId);
    return r ? r.name : `Region #${regionId}`;
  };

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Panel Administracyjny</h2>
            <p className="text-slate-400 text-sm">Zarządzanie modułami</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-2">
        <div className="flex items-center gap-3">
          <div className="flex gap-2 flex-wrap flex-1">
            {(['regions', 'branches', 'positions', 'billing', 'users', 'stores'] as Tab[]).map(tab => {
              const labels: Record<Tab, string> = {
                regions:   `Regiony (${regions.length})`,
                branches:  `Oddziały (${branches.length})`,
                positions: `Stanowiska (${positions.length})`,
                billing:   `Okresy rozliczenia (${billingPeriods.length})`,
                users:     `Użytkownicy (${users.length})`,
                stores:    `Sklepy (${stores.length})`,
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-fit px-4 py-3 rounded-lg font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Przycisk inicjalizacji — widoczny tylko na zakładce Użytkownicy */}
          {activeTab === 'users' && (
            <button
              onClick={handleInitFirstStore}
              disabled={loadingInit}
              title="Utwórz domyślnych 15 pracowników dla sklepu nr 1 (GET /api/initializer/createFirstStoreEmployees)"
              className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/40 text-amber-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              {loadingInit ? 'Inicjalizacja...' : 'Inicjalizuj sklep 1'}
            </button>
          )}
        </div>
      </div>

      {/* ── Region Tab ── */}
      {activeTab === 'regions' && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Szukaj regionu..."
                value={regionSearch}
                onChange={(e) => setRegionSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={openCreateRegion}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Dodaj Region
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Nazwa</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Oddziały</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {loadingRegions ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400">Ładowanie...</td></tr>
                ) : filteredRegions.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400">Brak regionów</td></tr>
                ) : filteredRegions.map(region => (
                  <tr key={region.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4 text-white font-medium">{region.name}</td>
                    <td className="py-3 px-4 text-center text-slate-300">{branchCounts.get(region.id) || 0}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleRegionEnable(region)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          region.enable
                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                            : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                        }`}
                      >
                        {region.enable ? 'Aktywny' : 'Nieaktywny'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditRegion(region)} className="p-2 hover:bg-slate-600 rounded-lg transition-colors" title="Edytuj">
                          <Edit className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'region', id: region.id, name: region.name })}
                          disabled={deleting === region.id}
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                          title="Usuń"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Branch Tab ── */}
      {activeTab === 'branches' && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Szukaj oddziału..."
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={branchFilterRegion || ''}
                onChange={(e) => setBranchFilterRegion(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Wszystkie regiony</option>
                {regions.map(region => (
                  <option key={region.id} value={region.id}>{region.name}</option>
                ))}
              </select>
              <button
                onClick={openCreateBranch}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Dodaj Oddział
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Nazwa</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Region</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {loadingBranches ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400">Ładowanie...</td></tr>
                ) : filteredBranches.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400">Brak oddziałów</td></tr>
                ) : filteredBranches.map(branch => (
                  <tr key={branch.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4 text-white font-medium">{branch.name}</td>
                    <td className="py-3 px-4 text-slate-300">{branch.regionName}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleBranchEnable(branch)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          branch.enable
                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                            : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                        }`}
                      >
                        {branch.enable ? 'Aktywny' : 'Nieaktywny'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditBranch(branch)} className="p-2 hover:bg-slate-600 rounded-lg transition-colors" title="Edytuj">
                          <Edit className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'branch', id: branch.id, name: branch.name })}
                          disabled={deleting === branch.id}
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                          title="Usuń"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Position Tab ── */}
      {activeTab === 'positions' && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Szukaj stanowiska..."
                value={positionSearch}
                onChange={(e) => setPositionSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={openCreatePosition}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Dodaj Stanowisko
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Nazwa</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Opis</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {loadingPositions ? (
                  <tr><td colSpan={3} className="text-center py-8 text-slate-400">Ładowanie...</td></tr>
                ) : filteredPositions.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-8 text-slate-400">Brak stanowisk</td></tr>
                ) : filteredPositions.map(position => (
                  <tr key={position.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4 text-white font-medium">{position.name}</td>
                    <td className="py-3 px-4 text-slate-300 text-sm">
                      {position.description || <span className="text-slate-500 italic">Brak opisu</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditPosition(position)} className="p-2 hover:bg-slate-600 rounded-lg transition-colors" title="Edytuj">
                          <Edit className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'position', id: position.id, name: position.name })}
                          disabled={deleting === position.id}
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                          title="Usuń"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Billing Period Tab ── */}
      {activeTab === 'billing' && (
        <div className="space-y-6">

          {/* Wizualny przegląd roku */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-5 h-5 text-slate-400" />
              <h3 className="text-base font-semibold text-slate-200">Przegląd roku – pokrycie miesięcy</h3>
            </div>

            {/* 12-miesięczna siatka */}
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {MONTHS_SHORT_PL.map((name, idx) => {
                const monthNum = idx + 1;
                const periodIdx = sortedBillingPeriods.findIndex(bp =>
                  getMonthsForConfig(bp).includes(monthNum)
                );
                const colors = periodIdx >= 0 ? PERIOD_COLORS[periodIdx % PERIOD_COLORS.length] : null;
                return (
                  <div
                    key={monthNum}
                    className={`py-2 rounded-lg text-center text-xs font-semibold border transition-colors ${
                      colors
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : 'bg-slate-700/40 text-slate-600 border-slate-700'
                    }`}
                  >
                    {name}
                    {colors && (
                      <div className="text-[10px] font-normal opacity-75 mt-0.5">
                        O{periodIdx + 1}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Status pokrycia */}
            {uncoveredMonths.length > 0 ? (
              <div className="flex items-center gap-2 p-3 bg-amber-600/15 border border-amber-600/40 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-300">
                  Niepokryte miesiące:{' '}
                  <span className="font-semibold">{uncoveredMonths.map(m => MONTHS_SHORT_PL[m - 1]).join(', ')}</span>
                  . Harmonogram może działać niepoprawnie.
                </p>
              </div>
            ) : billingPeriods.length > 0 ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-600/15 border border-emerald-600/40 rounded-lg">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <p className="text-sm text-emerald-300 font-medium">Wszystkie 12 miesięcy jest pokrytych.</p>
              </div>
            ) : null}
          </div>

          {/* Lista okresów + akcje */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-200">Skonfigurowane okresy</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Każdy okres definiuje zakres miesięcy jednego cyklu rozliczeniowego
                </p>
              </div>
              <button
                onClick={openCreateBillingPeriod}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                Dodaj Okres
              </button>
            </div>

            {loadingBilling ? (
              <div className="py-8 text-center text-slate-400">Ładowanie...</div>
            ) : sortedBillingPeriods.length === 0 ? (
              <div className="py-12 text-center">
                <CalendarDays className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Brak skonfigurowanych okresów rozliczenia</p>
                <p className="text-slate-600 text-sm mt-1">Kliknij „Dodaj Okres", aby zacząć</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedBillingPeriods.map((bp, idx) => {
                  const months = getMonthsForConfig(bp);
                  const colors = PERIOD_COLORS[idx % PERIOD_COLORS.length];
                  const firstName = MONTHS_PL[months[0] - 1];
                  const lastName  = MONTHS_PL[months[months.length - 1] - 1];
                  return (
                    <div
                      key={bp.id}
                      className={`flex items-center justify-between p-4 rounded-xl border ${colors.bg} ${colors.border} gap-4`}
                    >
                      {/* Info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-3 h-3 rounded-full ${colors.dot} mt-0.5 flex-shrink-0`} />
                        <div className="min-w-0">
                          <p className={`font-semibold ${colors.header}`}>
                            Okres {idx + 1}
                            <span className="ml-2 text-xs font-normal opacity-75">
                              ({formatDuration(bp.durationMonths)})
                            </span>
                          </p>
                          <p className={`text-sm mt-0.5 ${colors.text}`}>
                            {firstName}
                            {months.length > 1 && ` → ${lastName}`}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {months.map(m => (
                              <span
                                key={m}
                                className={`px-2 py-0.5 rounded text-[11px] font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
                              >
                                {MONTHS_SHORT_PL[m - 1]}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Akcje */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditBillingPeriod(bp)}
                          className="p-2 hover:bg-slate-600/50 rounded-lg transition-colors"
                          title="Edytuj"
                        >
                          <Edit className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({
                            type: 'billing',
                            id: bp.id,
                            name: `Okres ${idx + 1} (${firstName}${months.length > 1 ? ` → ${lastName}` : ''})`,
                          })}
                          disabled={deleting === bp.id}
                          className="p-2 hover:bg-slate-600/50 rounded-lg transition-colors disabled:opacity-50"
                          title="Usuń"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Users Tab ── */}
      {activeTab === 'users' && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-48 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Szukaj loginu..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as UserRole | '')}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Wszystkie role</option>
                <option value="STORE_MANAGER">Kierownik Sklepu</option>
                <option value="DIRECTOR">Dyrektor</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <button
              onClick={openCreateUser}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Dodaj Użytkownika
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Login</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Rola</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Przypisanie</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">Ładowanie...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">Brak użytkowników</p>
                      <p className="text-slate-600 text-sm mt-1">Kliknij „Dodaj Użytkownika", aby zacząć</p>
                    </td>
                  </tr>
                ) : filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserCog className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="text-white font-medium">{user.login}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[user.role]}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                        {user.role === 'DIRECTOR' && user.directorScope && (
                          <div className="text-xs text-slate-500">
                            {DIRECTOR_SCOPE_LABELS[user.directorScope]}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-sm">
                      {user.role === 'STORE_MANAGER' && user.storeId && (
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span>{getStoreName(user.storeId)}</span>
                        </div>
                      )}
                      {user.role === 'DIRECTOR' && user.directorScope === 'BRANCH' && user.branchId && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span>{getBranchName(user.branchId)}</span>
                        </div>
                      )}
                      {user.role === 'DIRECTOR' && user.directorScope === 'REGION' && user.regionId && (
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span>{getRegionName(user.regionId)}</span>
                        </div>
                      )}
                      {user.role === 'DIRECTOR' && user.directorScope === 'NETWORK' && (
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-400 italic">Cała sieć</span>
                        </div>
                      )}
                      {user.role === 'ADMIN' && (
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="text-slate-400 italic">Pełny dostęp</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleUserEnabled(user)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          user.enabled
                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                            : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                        }`}
                      >
                        {user.enabled ? 'Aktywny' : 'Nieaktywny'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setChangePasswordModal({ userId: user.id, login: user.login }); setNewPassword(''); setShowNewPassword(false); }}
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                          title="Zmień hasło"
                        >
                          <KeyRound className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() => openChangeRoleModal(user)}
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                          title="Zmień uprawnienia"
                        >
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'user', id: user.id, name: user.login })}
                          disabled={deleting === user.id}
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                          title="Usuń użytkownika"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Stores Tab ── */}
      {activeTab === 'stores' && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Szukaj sklepu, kodu lub oddziału..."
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Sklep</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Lokalizacja</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Oddział</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {loadingStores ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">Ładowanie...</td></tr>
                ) : filteredStores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Store className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">Brak sklepów</p>
                    </td>
                  </tr>
                ) : filteredStores.map(store => (
                  <tr key={store.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <Store className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <div className="text-white font-medium">{store.name}</div>
                          <div className="text-slate-500 text-xs">{store.storeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{store.location}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>{store.branchName}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        store.enable
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-red-600/20 text-red-400'
                      }`}>
                        {store.enable ? 'Aktywny' : 'Nieaktywny'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDeleteConfirm({ type: 'store', id: store.id, name: store.name })}
                          disabled={deleting === store.id}
                          className="p-2 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                          title="Usuń sklep"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Region Modal ── */}
      {modalMode && activeTab === 'regions' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">
                {modalMode === 'create' ? 'Dodaj Region' : 'Edytuj Region'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nazwa regionu</label>
                <input
                  type="text"
                  value={regionForm.name}
                  onChange={(e) => setRegionForm({ ...regionForm, name: e.target.value })}
                  placeholder="np. Region Północny"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {modalMode === 'edit' && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="region-enable"
                    checked={regionForm.enable}
                    onChange={(e) => setRegionForm({ ...regionForm, enable: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="region-enable" className="text-sm text-slate-300">Region aktywny</label>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setModalMode(null)} disabled={saving} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">Anuluj</button>
              <button onClick={handleSaveRegion} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">{saving ? 'Zapisywanie...' : 'Zapisz'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Branch Modal ── */}
      {modalMode && activeTab === 'branches' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">
                {modalMode === 'create' ? 'Dodaj Oddział' : 'Edytuj Oddział'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nazwa oddziału</label>
                <input
                  type="text"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="np. Oddział Warszawa Centrum"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {modalMode === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Region</label>
                  <select
                    value={branchForm.regionId || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, regionId: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Wybierz region</option>
                    {regions.filter(r => r.enable).map(region => (
                      <option key={region.id} value={region.id}>{region.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {modalMode === 'edit' && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="branch-enable"
                    checked={branchForm.enable}
                    onChange={(e) => setBranchForm({ ...branchForm, enable: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="branch-enable" className="text-sm text-slate-300">Oddział aktywny</label>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setModalMode(null)} disabled={saving} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">Anuluj</button>
              <button onClick={handleSaveBranch} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">{saving ? 'Zapisywanie...' : 'Zapisz'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Position Modal ── */}
      {modalMode && activeTab === 'positions' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">
                {modalMode === 'create' ? 'Dodaj Stanowisko' : 'Edytuj Stanowisko'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nazwa stanowiska *</label>
                <input
                  type="text"
                  value={positionForm.name}
                  onChange={(e) => setPositionForm({ ...positionForm, name: e.target.value })}
                  placeholder="np. Kierownik Sklepu"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Opis (opcjonalny)</label>
                <textarea
                  value={positionForm.description}
                  onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                  placeholder="np. Zarządza pracą danego sklepu oraz jego pracowników"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setModalMode(null)} disabled={saving} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">Anuluj</button>
              <button onClick={handleSavePosition} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">{saving ? 'Zapisywanie...' : 'Zapisz'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Billing Period Modal ── */}
      {modalMode && activeTab === 'billing' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">
                {modalMode === 'create' ? 'Dodaj Okres Rozliczenia' : 'Edytuj Okres Rozliczenia'}
              </h3>
            </div>
            <div className="p-6 space-y-5">
              {/* Miesiąc startowy */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Miesiąc startowy
                </label>
                <select
                  value={billingForm.startMonth}
                  onChange={(e) => setBillingForm({ ...billingForm, startMonth: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MONTHS_PL.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Czas trwania */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Czas trwania
                </label>
                <select
                  value={billingForm.durationMonths}
                  onChange={(e) => setBillingForm({ ...billingForm, durationMonths: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{formatDuration(n)}</option>
                  ))}
                </select>
              </div>

              {/* Podgląd */}
              <div className="p-4 bg-slate-700/50 rounded-xl border border-slate-600/50 space-y-2">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Podgląd okresu</p>
                <div className="flex flex-wrap gap-1.5">
                  {getMonthsForConfig(billingForm).map(m => (
                    <span
                      key={m}
                      className="px-2.5 py-1 bg-blue-600/30 border border-blue-500/50 rounded-md text-xs font-medium text-blue-300"
                    >
                      {MONTHS_PL[m - 1]}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  {formatDuration(billingForm.durationMonths)} · Start: {MONTHS_PL[billingForm.startMonth - 1]}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => setModalMode(null)}
                disabled={saving}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveBillingPeriod}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create User Modal ── */}
      {modalMode === 'create' && activeTab === 'users' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Dodaj Użytkownika</h3>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Login */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Login <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={userForm.login}
                  onChange={(e) => setUserForm({ ...userForm, login: e.target.value })}
                  placeholder="np. jan.kowalski"
                  autoComplete="off"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Hasło <span className="text-red-400">*</span>
                  <span className="text-slate-500 font-normal ml-1">(min. 6 znaków)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full px-4 py-2 pr-11 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rola <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['STORE_MANAGER', 'DIRECTOR', 'ADMIN'] as UserRole[]).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setUserForm({
                        ...userForm,
                        role,
                        storeId: null,
                        directorScope: null,
                        branchId: null,
                        regionId: null,
                      })}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-center ${
                        userForm.role === role
                          ? role === 'ADMIN'
                            ? 'bg-red-600/30 border-red-500 text-red-300'
                            : role === 'DIRECTOR'
                            ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                            : 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                          : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>

              {/* STORE_MANAGER — wybór sklepu */}
              {userForm.role === 'STORE_MANAGER' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Sklep <span className="text-red-400">*</span>
                  </label>
                  {loadingStores ? (
                    <div className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400 text-sm">Ładowanie sklepów...</div>
                  ) : (
                    <select
                      value={userForm.storeId || ''}
                      onChange={(e) => setUserForm({ ...userForm, storeId: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Wybierz sklep</option>
                      {stores
                        .filter(s => s.enable)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(store => (
                          <option key={store.id} value={store.id}>
                            {store.name} ({store.storeCode}) — {store.branchName}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              )}

              {/* DIRECTOR — wybór zakresu */}
              {userForm.role === 'DIRECTOR' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Zakres uprawnień <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['BRANCH', 'REGION', 'NETWORK'] as DirectorScope[]).map(scope => (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => setUserForm({ ...userForm, directorScope: scope, branchId: null, regionId: null })}
                          className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-center ${
                            userForm.directorScope === scope
                              ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                              : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {DIRECTOR_SCOPE_LABELS[scope]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* BRANCH director — wybór oddziału */}
                  {userForm.directorScope === 'BRANCH' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Oddział <span className="text-red-400">*</span>
                      </label>
                      {loadingBranches ? (
                        <div className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400 text-sm">Ładowanie oddziałów...</div>
                      ) : (
                        <select
                          value={userForm.branchId || ''}
                          onChange={(e) => setUserForm({ ...userForm, branchId: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Wybierz oddział</option>
                          {branches
                            .filter(b => b.enable)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(branch => (
                              <option key={branch.id} value={branch.id}>
                                {branch.name} — {branch.regionName}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* REGION director — wybór regionu */}
                  {userForm.directorScope === 'REGION' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Region <span className="text-red-400">*</span>
                      </label>
                      {loadingRegions ? (
                        <div className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400 text-sm">Ładowanie regionów...</div>
                      ) : (
                        <select
                          value={userForm.regionId || ''}
                          onChange={(e) => setUserForm({ ...userForm, regionId: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Wybierz region</option>
                          {regions
                            .filter(r => r.enable)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(region => (
                              <option key={region.id} value={region.id}>{region.name}</option>
                            ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* NETWORK director — info */}
                  {userForm.directorScope === 'NETWORK' && (
                    <div className="flex items-center gap-2 p-3 bg-purple-600/10 border border-purple-600/30 rounded-lg">
                      <Globe className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <p className="text-sm text-purple-300">Dyrektor Sieci ma dostęp do wszystkich sklepów i regionów.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ADMIN — info */}
              {userForm.role === 'ADMIN' && (
                <div className="flex items-center gap-2 p-3 bg-red-600/10 border border-red-600/30 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">Administrator ma pełny dostęp do systemu, w tym do panelu administracyjnego.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => setModalMode(null)}
                disabled={saving}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleCreateUser}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>Tworzenie...</>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Utwórz Użytkownika
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ── */}
      {changePasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Zmień hasło</h3>
                  <p className="text-slate-400 text-sm">{changePasswordModal.login}</p>
                </div>
              </div>
              <button onClick={() => setChangePasswordModal(null)} className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nowe hasło <span className="text-red-400">*</span>
                  <span className="text-slate-500 font-normal ml-1">(min. 6 znaków)</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full px-4 py-2 pr-11 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setChangePasswordModal(null)} disabled={saving} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">Anuluj</button>
              <button onClick={handleChangePassword} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving ? 'Zapisywanie...' : <><KeyRound className="w-4 h-4" /> Zmień hasło</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Role Modal ── */}
      {changeRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Zmień uprawnienia</h3>
                  <p className="text-slate-400 text-sm">{changeRoleModal.login}</p>
                </div>
              </div>
              <button onClick={() => setChangeRoleModal(null)} className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Rola <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {(['STORE_MANAGER', 'DIRECTOR', 'ADMIN'] as UserRole[]).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setChangeRoleForm({ ...changeRoleForm, role, storeId: null, directorScope: null, branchId: null, regionId: null })}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-center ${
                        changeRoleForm.role === role
                          ? role === 'ADMIN' ? 'bg-red-600/30 border-red-500 text-red-300'
                          : role === 'DIRECTOR' ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                          : 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                          : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>

              {changeRoleForm.role === 'STORE_MANAGER' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Sklep <span className="text-red-400">*</span></label>
                  {loadingStores ? (
                    <div className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400 text-sm">Ładowanie sklepów...</div>
                  ) : (
                    <select
                      value={changeRoleForm.storeId || ''}
                      onChange={(e) => setChangeRoleForm({ ...changeRoleForm, storeId: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Wybierz sklep</option>
                      {stores.filter(s => s.enable).sort((a, b) => a.name.localeCompare(b.name)).map(store => (
                        <option key={store.id} value={store.id}>{store.name} ({store.storeCode}) — {store.branchName}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {changeRoleForm.role === 'DIRECTOR' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Zakres uprawnień <span className="text-red-400">*</span></label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['BRANCH', 'REGION', 'NETWORK'] as DirectorScope[]).map(scope => (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => setChangeRoleForm({ ...changeRoleForm, directorScope: scope, branchId: null, regionId: null })}
                          className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-center ${
                            changeRoleForm.directorScope === scope
                              ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                              : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {DIRECTOR_SCOPE_LABELS[scope]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {changeRoleForm.directorScope === 'BRANCH' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Oddział <span className="text-red-400">*</span></label>
                      <select
                        value={changeRoleForm.branchId || ''}
                        onChange={(e) => setChangeRoleForm({ ...changeRoleForm, branchId: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Wybierz oddział</option>
                        {branches.filter(b => b.enable).sort((a, b) => a.name.localeCompare(b.name)).map(b => (
                          <option key={b.id} value={b.id}>{b.name} — {b.regionName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {changeRoleForm.directorScope === 'REGION' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Region <span className="text-red-400">*</span></label>
                      <select
                        value={changeRoleForm.regionId || ''}
                        onChange={(e) => setChangeRoleForm({ ...changeRoleForm, regionId: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Wybierz region</option>
                        {regions.filter(r => r.enable).sort((a, b) => a.name.localeCompare(b.name)).map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {changeRoleForm.directorScope === 'NETWORK' && (
                    <div className="flex items-center gap-2 p-3 bg-purple-600/10 border border-purple-600/30 rounded-lg">
                      <Globe className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <p className="text-sm text-purple-300">Dyrektor Sieci ma dostęp do wszystkich sklepów i regionów.</p>
                    </div>
                  )}
                </div>
              )}

              {changeRoleForm.role === 'ADMIN' && (
                <div className="flex items-center gap-2 p-3 bg-red-600/10 border border-red-600/30 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">Administrator ma pełny dostęp do systemu.</p>
                </div>
              )}

              <div className="p-3 bg-amber-600/10 border border-amber-600/30 rounded-lg">
                <p className="text-xs text-amber-300">
                  ⚠️ Ta operacja wymaga endpointu <code className="bg-amber-600/20 px-1 rounded">PATCH /api/users/{'{id}'}/role</code> w backendzie.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button onClick={() => setChangeRoleModal(null)} disabled={saving} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">Anuluj</button>
              <button onClick={handleChangeRole} disabled={saving} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving ? 'Zapisywanie...' : <><ShieldAlert className="w-4 h-4" /> Zmień uprawnienia</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-700 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Potwierdzenie usunięcia</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-300">
                Czy na pewno chcesz usunąć{' '}
                <span className="font-semibold text-white">{deleteConfirm.name}</span>?
              </p>
              <p className="text-slate-400 text-sm mt-2">Tej operacji nie można cofnąć.</p>
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting !== null}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'region')        handleDeleteRegion(deleteConfirm.id);
                  else if (deleteConfirm.type === 'branch')   handleDeleteBranch(deleteConfirm.id);
                  else if (deleteConfirm.type === 'position') handleDeletePosition(deleteConfirm.id);
                  else if (deleteConfirm.type === 'billing')  handleDeleteBillingPeriod(deleteConfirm.id);
                  else if (deleteConfirm.type === 'user')     handleDeleteUser(deleteConfirm.id);
                  else if (deleteConfirm.type === 'store')    handleDeleteStore(deleteConfirm.id);
                }}
                disabled={deleting !== null}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? 'Usuwanie...' : 'Usuń'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}