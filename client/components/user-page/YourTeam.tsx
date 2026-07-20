import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, User, ChevronDown, ChevronUp, Edit2, Save, X, Loader, Briefcase, ShieldAlert, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type {
  ResponseEmployeeDTO,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  EmployeeWithPosition,
} from '@/types/employee.types';
import type { ResponsePositionDTO } from '@/types/position.types';
import type { ResponseSpecialWorkNormDTO } from '@/types/special-work-norm.types';
import { employeeService, positionService, specialWorkNormService } from '@/services/api-provider';
import { AddEmployeeModal } from '@/components/modals/AddEmployeeModal';
import { useAppContext } from '@/context/AppContext';
import { useRequestGuard } from '@/hooks/useRequestGuard';

export default function YourTeam() {
  // ─── Pobierz aktualnie wybrany sklep z kontekstu ───────────
  const { selectedStoreId, managerData } = useAppContext();
  const isAdminOrDirector = managerData?.role === 'ADMIN' || managerData?.role === 'DIRECTOR';
  // Admin/Director używa selectedStoreId z górnego dropdownu;
  // STORE_MANAGER ma swój storeId w tokenie.
  const currentStoreId: number | null = isAdminOrDirector
    ? selectedStoreId
    : (managerData?.storeId ?? null);

  const [employees, setEmployees] = useState<EmployeeWithPosition[]>([]);
  const [positions, setPositions] = useState<Map<number, ResponsePositionDTO>>(new Map());
  const [specialWorkNorms, setSpecialWorkNorms] = useState<ResponseSpecialWorkNormDTO[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPositionId, setEditPositionId] = useState<number | undefined>();
  const [editIsSpecial, setEditIsSpecial] = useState(false);
  const [editSpecialWorkNormId, setEditSpecialWorkNormId] = useState<number | undefined>();
  const [editEtatNumerator, setEditEtatNumerator] = useState(1);
  const [editEtatDenominator, setEditEtatDenominator] = useState(1);

  // ─── Sortowanie / własna kolejność pracowników (tylko frontend,
  // trzymane w localStorage per sklep - nie dotyka backendu) ─────
  type SortMode = 'custom' | 'sap' | 'firstName' | 'lastName' | 'position';
  const [sortMode, setSortMode] = useState<SortMode>('custom');
  const [customOrder, setCustomOrder] = useState<number[]>([]);
  const [draggedEmployeeId, setDraggedEmployeeId] = useState<number | null>(null);

  const allRoles = [
    { key: 'manager' as const, label: 'Kierownik' },
    { key: 'seller' as const, label: 'Sprzedawca' },
    { key: 'cashier' as const, label: 'Kasjer' },
    { key: 'pok' as const, label: 'Pracownik POK' },
    { key: 'warehouseman' as const, label: 'Magazynier' },
    { key: 'enable' as const, label: 'Aktywny' },
    { key: 'canOperateCheckout' as const, label: 'Obsługa Kasy' },
    { key: 'canOperateCredit' as const, label: 'Obsługa Kredytu' },
    { key: 'canOpenCloseStore' as const, label: 'Otwarcie/Zamknięcie Sklepu' },
    { key: 'canOperateDelivery' as const, label: 'Obsługa Dostawy' },
  ] as const;

  // Rozdzielenie wizualne: "status" (Aktywny - osobny suwak) vs. "role" (stanowiskowe)
  // vs. "uprawnienia" (operacyjne) — czysto prezentacyjny podział, nie zmienia logiki
  // toggleRole/updateData.
  const STATUS_KEYS = ['enable'] as const;
  const ROLE_KEYS = ['manager', 'seller', 'cashier', 'pok', 'warehouseman'] as const;
  const PERMISSION_KEYS = ['canOperateCheckout', 'canOperateCredit', 'canOpenCloseStore', 'canOperateDelivery'] as const;
  const statusItems = allRoles.filter((r) => (STATUS_KEYS as readonly string[]).includes(r.key));
  const roleItems = allRoles.filter((r) => (ROLE_KEYS as readonly string[]).includes(r.key));
  const permissionItems = allRoles.filter((r) => (PERMISSION_KEYS as readonly string[]).includes(r.key));

  // Indywidualna treść tooltipu dla każdego suwaka - każdy opis edytowalny
  // niezależnie (podmienić poniższe teksty na docelowe opisy per uprawnienie).
  const tooltipContent: Record<(typeof allRoles)[number]['key'], string> = {
    manager: 'Kierownik Sklepu, Kierownik Sprzedaży, Kierownik Zmiany',
    seller: 'Doradca Klienta, Doradca Klienta Manager, Sprzedawca, Koordynator Zmiany',
    cashier: 'Kasjer, APT kasowy',
    pok: 'Pracownik Punktu Obsługi Klienta, APT techniczny',
    warehouseman: 'Pracownik ds. Przyjęcia Dostaw, Magazynier, APT techniczny',
    enable: 'Definiuje, czy pracownik jest aktywny i dostępny. Jeśli wyłączone to program nie będzie brał pod uwagę takiej osoby w planowaniu grafika',
    canOperateCheckout: 'Oznacza, że pracownik będzie planowany w grafiku jako osoba czynnie obsługująca kasę. Jeśli ktoś ma uprawnienia kasowe, ale nie chcesz, aby był planowany do tej funkcji to pozostaw wyłączony',
    canOperateCredit: 'Oznacza, że pracownik będzie planowany w grafiku jako osoba czynnie obsługująca wnioski ratalne. Jeśli ktoś ma uprawnienia ratalne, ale nie chcesz, aby był planowany do tej funkcji to pozostaw wyłączony',
    canOpenCloseStore: 'Oznacza, że pracownik może otwierać, zamykać sklep, posiada nadane odpowiednie uprawnienia. Dodatkowo pracownik z tą rolą może prowadzić zmianę w sklepie',
    canOperateDelivery: 'Jeśli posiadasz dedykowane stanowisko Magazyniera to w przypadku jego nieobecności, osoby posiadające tę rolę będą go zastępowały. Jeśli nie posiadasz dedykowanego stanowiska Magazyniera, to ta opcja nie ma znaczenia dla Ciebie, pozostaje ona jako informacja o umiejętnościach danego pracownika',
  };

  const ETAT_OPTIONS = [
    { numerator: 1, denominator: 1, label: '1/1 (pełny etat)' },
    { numerator: 4, denominator: 5, label: '4/5' },
    { numerator: 3, denominator: 4, label: '3/4' },
    { numerator: 1, denominator: 2, label: '1/2' },
    { numerator: 1, denominator: 3, label: '1/3' },
    { numerator: 1, denominator: 4, label: '1/4' },
  ];

  // Załaduj pozycje i normy raz (nie zależą od sklepu)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingPositions(true);
        const allPositions = await positionService.getAll();
        setPositions(new Map(allPositions.map(p => [p.id, p])));

        try {
          const activeNorms = await specialWorkNormService.getAllActive();
          setSpecialWorkNorms(activeNorms);
        } catch (normError) {
          console.warn('Could not load special work norms:', normError);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoadingPositions(false);
      }
    };

    loadInitialData();
  }, []);

  // Załaduj pracowników po zmianie sklepu
  const employeesGuard = useRequestGuard();
  useEffect(() => {
    // Brak sklepu → wyczyść listę i nie ładuj
    if (!currentStoreId) {
      setEmployees([]);
      setLoading(false);
      return;
    }
    if (loadingPositions || positions.size === 0) return;

    const token = employeesGuard.start();
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        setEmployees([]); // czyścimy od razu — bez tego przez chwilę widać pracowników poprzedniego sklepu
        // Zamknij otwarte edycje przy zmianie sklepu
        setEditingId(null);
        setExpandedId(null);

        const response = await employeeService.getAll(currentStoreId);
        if (!employeesGuard.isCurrent(token)) return; // sklep zmienił się w międzyczasie — porzuć odpowiedź
        const employeesWithPositions = response.content.map((emp) => ({
          ...emp,
          positionName: getPositionName(emp),
        }));
        setEmployees(employeesWithPositions);
      } catch (err) {
        if (!employeesGuard.isCurrent(token)) return;
        const errorMessage = err instanceof Error ? err.message : 'Nie udało się załadować pracowników';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        if (employeesGuard.isCurrent(token)) setLoading(false);
      }
    };

    loadData();
  }, [currentStoreId, loadingPositions, positions, employeesGuard]);

  // Wczytaj zapisaną kolejność i tryb sortowania dla wybranego sklepu.
  // Wyłącznie frontend/localStorage - przetrwa odświeżenie i wylogowanie
  // na tym samym urządzeniu, nie wymaga zmian w backendzie.
  useEffect(() => {
    if (!currentStoreId) {
      setCustomOrder([]);
      setSortMode('custom');
      return;
    }
    try {
      const storedOrder = localStorage.getItem(`employee_order_${currentStoreId}`);
      setCustomOrder(storedOrder ? JSON.parse(storedOrder) : []);
    } catch (e) {
      console.warn('Nie udało się odczytać zapisanej kolejności pracowników:', e);
      setCustomOrder([]);
    }
    try {
      const storedSort = localStorage.getItem(`employee_sort_${currentStoreId}`) as SortMode | null;
      setSortMode(storedSort ?? 'custom');
    } catch (e) {
      console.warn('Nie udało się odczytać zapisanego trybu sortowania:', e);
      setSortMode('custom');
    }
  }, [currentStoreId]);

  const getPositionName = (employee: ResponseEmployeeDTO): string => {
    const position = positions.get(employee.positionId);
    return position ? position.name : 'Brak stanowiska';
  };

  const getEtatLabel = (numerator: number, denominator: number): string => {
    const option = ETAT_OPTIONS.find(o => o.numerator === numerator && o.denominator === denominator);
    return option ? option.label : `${numerator}/${denominator}`;
  };

  const handleAddEmployee = async (data: CreateEmployeeDTO) => {
    if (!currentStoreId) return;
    try {
      setSaving(true);
      const created = await employeeService.create(currentStoreId, data);
      setEmployees((prev) => [...prev, { ...created, positionName: getPositionName(created) }]);
      toast.success('Dodano pracownika');
      setIsAddModalOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nie udało się dodać pracownika';
      toast.error(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (employee: ResponseEmployeeDTO) => {
    setEditingId(employee.id);
    setEditFirstName(employee.firstName);
    setEditLastName(employee.lastName);
    setEditPositionId(employee.positionId);
    setEditIsSpecial(employee.isSpecial ?? false);
    setEditSpecialWorkNormId(employee.specialWorkNormId ?? undefined);
    setEditEtatNumerator(employee.etatNumerator ?? 1);
    setEditEtatDenominator(employee.etatDenominator ?? 1);
  };

  const saveEditing = async (employeeId: number) => {
    if (!currentStoreId) return;
    try {
      setSaving(true);
      const employee = employees.find((e) => e.id === employeeId);
      if (!employee) return;

      const updateData: UpdateEmployeeDTO = {
        enable: employee.enable,
        canOperateCheckout: employee.canOperateCheckout,
        canOperateCredit: employee.canOperateCredit,
        canOpenCloseStore: employee.canOpenCloseStore,
        canOperateDelivery: employee.canOperateDelivery,
        seller: employee.seller,
        manager: employee.manager,
        cashier: employee.cashier,
        warehouseman: employee.warehouseman,
        pok: employee.pok,
        firstName: editFirstName,
        lastName: editLastName,
        positionId: editPositionId,
        isSpecial: editIsSpecial,
        specialWorkNormId: editIsSpecial ? editSpecialWorkNormId : undefined,
        etatNumerator: editEtatNumerator,
        etatDenominator: editEtatDenominator,
        updatedAt: new Date().toISOString()
      };

      const updated = await employeeService.update(currentStoreId, employeeId, updateData);
      setEmployees((prev) =>
        prev.map((emp) => emp.id === employeeId ? { ...updated, positionName: getPositionName(updated) } : emp)
      );
      toast.success('Zapisano zmiany');
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  };

  const removeEmployee = async (employeeId: number) => {
    if (!currentStoreId) return;
    if (!confirm('Czy na pewno usunąć tego pracownika?')) return;
    try {
      setSaving(true);
      await employeeService.delete(currentStoreId, employeeId);
      setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
      toast.success('Usunięto pracownika');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się usunąć pracownika');
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = async (
    employeeId: number,
    roleKey: 'manager' | 'seller' | 'cashier' | 'pok' | 'warehouseman' | 'enable' |
      'canOperateCheckout' | 'canOperateCredit' | 'canOpenCloseStore' | 'canOperateDelivery'
  ) => {
    if (!currentStoreId) return;
    try {
      const employee = employees.find((e) => e.id === employeeId);
      if (!employee) return;

      const updateData: UpdateEmployeeDTO = {
        enable: employee.enable,
        canOperateCheckout: employee.canOperateCheckout,
        canOperateCredit: employee.canOperateCredit,
        canOpenCloseStore: employee.canOpenCloseStore,
        canOperateDelivery: employee.canOperateDelivery,
        seller: employee.seller,
        manager: employee.manager,
        cashier: employee.cashier,
        warehouseman: employee.warehouseman,
        pok: employee.pok,
        isSpecial: employee.isSpecial ?? false,
        etatNumerator: employee.etatNumerator ?? 1,
        etatDenominator: employee.etatDenominator ?? 1,
        [roleKey]: !employee[roleKey],
        updatedAt: new Date().toISOString()
      };

      const updated = await employeeService.update(currentStoreId, employeeId, updateData);
      setEmployees((prev) =>
        prev.map((emp) => emp.id === employeeId ? { ...updated, positionName: getPositionName(updated) } : emp)
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zmienić uprawnienia');
    }
  };

  // Tooltip informacyjny przy etykietach ról/uprawnień — wzorzec identyczny
  // jak w komponencie PeriodEstimation.tsx używanym w YourDraft.tsx.
  const InfoTooltip = ({ content }: { content: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: '1.5px solid #94a3b8',
            color: '#94a3b8',
            fontSize: 10,
            fontWeight: 'bold',
            cursor: 'help',
            background: 'transparent',
            flexShrink: 0,
          }}
        >
          ?
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );

  const persistCustomOrder = (ids: number[], storeId: number) => {
    try {
      localStorage.setItem(`employee_order_${storeId}`, JSON.stringify(ids));
    } catch (e) {
      console.warn('Nie udało się zapisać kolejności pracowników:', e);
    }
  };

  const persistSortMode = (mode: SortMode, storeId: number) => {
    try {
      localStorage.setItem(`employee_sort_${storeId}`, mode);
    } catch (e) {
      console.warn('Nie udało się zapisać trybu sortowania:', e);
    }
  };

  const handleSortModeChange = (mode: SortMode) => {
    setSortMode(mode);
    if (currentStoreId) persistSortMode(mode, currentStoreId);
  };

  // Lista posortowana wg wybranego trybu; w trybie 'custom' wg zapisanej,
  // ręcznej kolejności (nowi/nieznani pracownicy trafiają na koniec).
  const sortedEmployees = useMemo(() => {
    if (sortMode === 'sap') {
      return [...employees].sort((a, b) => Number(a.sap) - Number(b.sap));
    }
    if (sortMode === 'firstName') {
      return [...employees].sort((a, b) => a.firstName.localeCompare(b.firstName, 'pl'));
    }
    if (sortMode === 'lastName') {
      return [...employees].sort((a, b) => a.lastName.localeCompare(b.lastName, 'pl'));
    }
    if (sortMode === 'position') {
      return [...employees].sort((a, b) => (a.positionName || '').localeCompare(b.positionName || '', 'pl'));
    }
    if (customOrder.length === 0) return employees;
    const orderIndex = new Map(customOrder.map((id, idx) => [id, idx]));
    return [...employees].sort((a, b) => {
      const ia = orderIndex.has(a.id) ? orderIndex.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const ib = orderIndex.has(b.id) ? orderIndex.get(b.id)! : Number.MAX_SAFE_INTEGER;
      return ia - ib;
    });
  }, [employees, sortMode, customOrder]);

  // Każda ręczna zmiana (strzałka albo drop) zapisuje nową kolejność
  // i przełącza widok na tryb "własna kolejność".
  const applyManualOrder = (ids: number[]) => {
    setCustomOrder(ids);
    setSortMode('custom');
    if (currentStoreId) {
      persistCustomOrder(ids, currentStoreId);
      persistSortMode('custom', currentStoreId);
    }
  };

  const moveEmployeeStep = (employeeId: number, direction: -1 | 1) => {
    const ids = sortedEmployees.map((emp) => emp.id);
    const idx = ids.indexOf(employeeId);
    const newIdx = idx + direction;
    if (idx === -1 || newIdx < 0 || newIdx >= ids.length) return;
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    applyManualOrder(ids);
  };

  const handleDragStart = (employeeId: number) => (e: React.DragEvent) => {
    setDraggedEmployeeId(employeeId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetEmployeeId: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedEmployeeId === null || draggedEmployeeId === targetEmployeeId) {
      setDraggedEmployeeId(null);
      return;
    }
    const ids = sortedEmployees.map((emp) => emp.id);
    const fromIdx = ids.indexOf(draggedEmployeeId);
    const toIdx = ids.indexOf(targetEmployeeId);
    if (fromIdx !== -1 && toIdx !== -1) {
      ids.splice(fromIdx, 1);
      ids.splice(toIdx, 0, draggedEmployeeId);
      applyManualOrder(ids);
    }
    setDraggedEmployeeId(null);
  };

  const handleDragEnd = () => setDraggedEmployeeId(null);

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      disabled={saving}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-blue-600' : 'bg-slate-600'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  // ─── Brak wybranego sklepu (ADMIN/DIRECTOR nie wybrał jeszcze) ─
  if (!currentStoreId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <User className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400 text-center">Wybierz sklep z górnego menu, aby zobaczyć zespół.</p>
      </div>
    );
  }

  if (loading || loadingPositions) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-slate-400">Ładowanie pracowników...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-300 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors">
          Ponów próbę
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">Członkowie Zespołu</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Dodaj Pracownika
          </button>
          <select
            value={sortMode}
            onChange={(e) => handleSortModeChange(e.target.value as SortMode)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 text-sm text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="custom">Własna kolejność</option>
            <option value="sap">Sortuj po SAP</option>
            <option value="firstName">Sortuj po imieniu</option>
            <option value="lastName">Sortuj po nazwisku</option>
            <option value="position">Sortuj po stanowisku</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3">
        {sortedEmployees.map((employee, index) => (
          <div
            key={employee.id}
            onDragOver={handleDragOver}
            onDrop={handleDrop(employee.id)}
            className={`bg-slate-800/50 backdrop-blur-sm border rounded-xl overflow-hidden transition-colors ${
              draggedEmployeeId === employee.id ? 'opacity-50 border-blue-500' : 'border-slate-700'
            }`}
          >
            {/* Header */}
            <div className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Uchwyt do przeciągania + strzałki zmiany kolejności */}
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moveEmployeeStep(employee.id, -1)}
                    disabled={saving || index === 0}
                    title="Przesuń w górę"
                    className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <span
                    draggable
                    onDragStart={handleDragStart(employee.id)}
                    onDragEnd={handleDragEnd}
                    title="Przeciągnij, aby zmienić kolejność"
                    className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300"
                  >
                    <GripVertical className="w-4 h-4" />
                  </span>
                  <button
                    type="button"
                    onClick={() => moveEmployeeStep(employee.id, 1)}
                    disabled={saving || index === sortedEmployees.length - 1}
                    title="Przesuń w dół"
                    className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>

                {editingId === employee.id ? (
                  /* Edit Mode */
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        placeholder="Imię"
                        className="text-base font-semibold text-white bg-slate-700 border border-slate-600 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder="Nazwisko"
                        className="text-base font-semibold text-white bg-slate-700 border border-slate-600 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <select
                      value={editPositionId || ''}
                      onChange={(e) => setEditPositionId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      className="text-xs text-slate-300 bg-slate-700 border border-slate-600 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Wybierz stanowisko</option>
                      {Array.from(positions.values()).map((pos) => (
                        <option key={pos.id} value={pos.id}>{pos.name}</option>
                      ))}
                    </select>

                    {/* isSpecial toggle */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-900/20 border border-amber-800/30">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-amber-300 font-medium">Szczególne warunki zatrudnienia</span>
                      </div>
                      <button
                        onClick={() => {
                          setEditIsSpecial(!editIsSpecial);
                          if (editIsSpecial) setEditSpecialWorkNormId(undefined);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editIsSpecial ? 'bg-amber-600' : 'bg-slate-600'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editIsSpecial ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {editIsSpecial && (
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Wymiar etatu</label>
                        <select
                          value={`${editEtatNumerator}/${editEtatDenominator}`}
                          onChange={(e) => {
                            const [n, d] = e.target.value.split('/').map(Number);
                            setEditEtatNumerator(n);
                            setEditEtatDenominator(d);
                          }}
                          className="text-xs text-slate-300 bg-slate-700 border border-slate-600 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {ETAT_OPTIONS.map(o => (
                            <option key={`${o.numerator}/${o.denominator}`} value={`${o.numerator}/${o.denominator}`}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {editIsSpecial && (
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Norma szczególna</label>
                        <select
                          value={editSpecialWorkNormId || ''}
                          onChange={(e) => setEditSpecialWorkNormId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                          className="text-xs text-slate-300 bg-slate-700 border border-amber-600/50 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">Wybierz normę</option>
                          {specialWorkNorms.map((norm) => (
                            <option key={norm.id} value={norm.id}>
                              {norm.name} ({norm.maxDailyHours}h/dzień, {norm.weeklyNorm}h/tydzień)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-white truncate">
                        {employee.firstName} {employee.lastName}
                      </p>
                      {employee.isSpecial && (
                        <span title={employee.specialWorkNormName || 'Szczególne warunki'}>
                          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-purple-400 font-medium">
                      <Briefcase className="w-4 h-4" />
                      <span>{employee.positionName}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-slate-500">SAP: {employee.sap}</p>
                      {(employee.etatNumerator && employee.etatDenominator) && (
                        <p className="text-xs text-slate-500">
                          Etat: {getEtatLabel(employee.etatNumerator, employee.etatDenominator)}
                        </p>
                      )}
                      {employee.isSpecial && employee.specialWorkNormName && (
                        <p className="text-xs text-amber-500">{employee.specialWorkNormName}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editingId === employee.id ? (
                  <>
                    <button
                      onClick={() => saveEditing(employee.id)}
                      disabled={saving}
                      className="p-2 text-green-400 hover:text-green-300 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      disabled={saving}
                      className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(employee)}
                      disabled={saving}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === employee.id ? null : employee.id)}
                      disabled={saving}
                      className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {expandedId === employee.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => removeEmployee(employee.id)}
                      disabled={saving}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Expandable Roles */}
            {expandedId === employee.id && (
              <div className="border-t border-slate-700 px-4 py-4 bg-slate-900/20 space-y-4">
                {/* ─── Aktywny (osobny suwak, wydzielony spod Roli) ─ */}
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
                    <p className="text-[11px] text-green-300 font-semibold uppercase tracking-widest">Status</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-3 border-l-2 border-green-500/25">
                    {statusItems.map(({ key, label }) => (
                      <div key={key} className="inline-flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-lg bg-slate-700/20 hover:bg-slate-700/30 transition-colors">
                        <span className="flex items-center gap-1.5 text-xs text-slate-300 whitespace-nowrap">
                          {label}
                          <InfoTooltip content={tooltipContent[key]} />
                        </span>
                        <ToggleSwitch
                          checked={employee[key]}
                          onChange={() => toggleRole(employee.id, key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* ─── Role ─────────────────────────────────────── */}
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
                    <p className="text-[11px] text-blue-300 font-semibold uppercase tracking-widest">Role</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-3 border-l-2 border-blue-500/25">
                    {roleItems.map(({ key, label }) => (
                      <div key={key} className="inline-flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-lg bg-slate-700/20 hover:bg-slate-700/30 transition-colors">
                        <span className="flex items-center gap-1.5 text-xs text-slate-300 whitespace-nowrap">
                          {label}
                          <InfoTooltip content={tooltipContent[key]} />
                        </span>
                        <ToggleSwitch
                          checked={employee[key]}
                          onChange={() => toggleRole(employee.id, key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* ─── Uprawnienia ──────────────────────────────── */}
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                    <p className="text-[11px] text-amber-300 font-semibold uppercase tracking-widest">Uprawnienia</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-3 border-l-2 border-amber-500/25">
                    {permissionItems.map(({ key, label }) => (
                      <div key={key} className="inline-flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-lg bg-slate-700/20 hover:bg-slate-700/30 transition-colors">
                        <span className="flex items-center gap-1.5 text-xs text-slate-300 whitespace-nowrap">
                          {label}
                          <InfoTooltip content={tooltipContent[key]} />
                        </span>
                        <ToggleSwitch
                          checked={employee[key]}
                          onChange={() => toggleRole(employee.id, key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {employees.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-slate-400 mb-4">Brak pracowników w tym sklepie</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Dodaj swojego pierwszego pracownika
          </button>
        </div>
      )}

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddEmployee}
        positions={Array.from(positions.values())}
        loading={saving}
      />
    </div>
  );
}
