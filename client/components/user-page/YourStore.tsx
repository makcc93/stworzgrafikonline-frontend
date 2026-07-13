import { useEffect, useState } from 'react';
import { Building2, Clock, Users, Loader, PlusCircle, MapPin, Tag, ChevronLeft, ChevronRight, Edit3, Check, X, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  mapBackendHoursToFrontend,
  mapFrontendHoursToBackend,
  createDefaultHours,
  createDefaultStaffing,
  type OptimalStaffing,
  type ResponseStoreDTO,
} from '@/types/YourStore.types';
import { storeDetailsService, storeService, branchService, storeOpeningHoursService } from '@/services/api-provider';
import { useAppContext } from '@/context/AppContext';
import type { ResponseBranchDTO } from '@/types/branch.types';
import { getAllowedBranchesForManager, isBranchScopeLocked } from '@/utils/branch.utils';
import LastModifiedInfo from '@/components/shared/LastModifiedInfo';

interface StoreConfigUI {
  storeName: string;
  warehouse: string;
  branch: string;
  hours: { [key: string]: { open: string; close: string } };
  staffing: OptimalStaffing;
  // Ostatnia aktualizacja danych sklepu (godziny + obsada) — z ResponseStoreDetailsDTO.updatedAt
  updatedAt: string | null;
}

interface YourStoreProps {
  onStoreCreated?: () => void;
}

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
const DAY_LABELS = ['Pon','Wt','Śr','Czw','Pt','Sob','Nd'];
const DAY_LABELS_FULL = ['Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota','Niedziela'];

const STAFFING_ROLES = [
  { key: 'storeManagers' as const, label: 'Kierownik sklepu', icon: '👔' },
  { key: 'salesManagers' as const, label: 'Kierownik sprzedaży', icon: '📊' },
  { key: 'sellers' as const, label: 'Sprzedawca', icon: '🛍️' },
  { key: 'cashiers' as const, label: 'Kasjer', icon: '💳' },
  { key: 'storemen' as const, label: 'Magazynier', icon: '📦' },
  { key: 'pok' as const, label: 'POK', icon: '🎯' },
] as const;

function timeToHour(t: string) { return parseInt(t?.split(':')[0] ?? '0', 10) || 0; }
function hourToTime(h: number) { return `${String(h).padStart(2,'0')}:00`; }

// ─── Shared input styles ──────────────────────────────────────
const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder-slate-500";
const selectCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all";
const labelCls = "block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5";

// ─── Section heading ──────────────────────────────────────────
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400">
        {icon}
      </div>
      <h3 className="text-white font-semibold text-base tracking-tight">{title}</h3>
    </div>
  );
}

// ─── Store card ───────────────────────────────────────────────
function StoreCard({ store, onSelect }: { store: ResponseStoreDTO; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group relative w-full text-left bg-slate-900 border border-slate-800 hover:border-violet-500/60 rounded-2xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-violet-900/20 hover:-translate-y-0.5 overflow-hidden"
    >
      {/* gradient accent top */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/40">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${store.enable ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {store.enable ? 'Aktywny' : 'Nieaktywny'}
        </span>
      </div>

      <h3 className="text-white font-bold text-lg mb-3 group-hover:text-violet-300 transition-colors leading-tight">{store.name}</h3>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="font-mono text-slate-300 text-xs bg-slate-800 px-1.5 py-0.5 rounded">{store.storeCode}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{store.location}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{store.branchName}</span>
        </div>
        {store.storeManagerFullName && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{store.storeManagerFullName}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-500">Szczegóły sklepu</span>
        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

// ─── Create store form ────────────────────────────────────────
function CreateStoreForm({ onCreated }: { onCreated: (id: number) => void }) {
  const { managerData } = useAppContext();
  const [allBranches, setAllBranches] = useState<ResponseBranchDTO[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', storeCode: '', location: '', branchId: '' });

  // Oddziały dostępne dla aktualnie zalogowanego użytkownika — dyrektor oddziału widzi
  // tylko swój oddział, dyrektor regionu tylko oddziały swojego regionu, admin/dyrektor
  // sieci widzą wszystkie.
  const branches = getAllowedBranchesForManager(allBranches, managerData);
  const branchLocked = isBranchScopeLocked(managerData);

  useEffect(() => { branchService.getAll().then(setAllBranches).catch(() => {}); }, []);

  // Dyrektor oddziału ma do wyboru tylko jeden oddział — wybierz go automatycznie
  useEffect(() => {
    if (branchLocked && branches.length === 1 && !form.branchId) {
      setForm((f) => ({ ...f, branchId: String(branches[0].id) }));
    }
  }, [branchLocked, branches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.branchId) { toast.error('Wybierz oddział'); return; }
    // Zabezpieczenie front-endowe — nie pozwól wysłać żądania z oddziałem poza zakresem
    if (!branches.some((b) => b.id === Number(form.branchId))) {
      toast.error('Możesz dodawać sklepy tylko w swoim zakresie (oddział/region)');
      return;
    }
    try {
      setSaving(true);
      const store = await storeService.create({
        name: form.name,
        storeCode: form.storeCode.toUpperCase(),
        location: form.location,
        branchId: Number(form.branchId),
      });
      toast.success('Sklep utworzony!');
      onCreated(store.id);
    } catch (err: any) {
      toast.error(err.message || 'Nie udało się utworzyć sklepu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-900/40">
          <PlusCircle className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Dodaj nowy sklep</h2>
          <p className="text-slate-400 text-sm mt-1">Uzupełnij dane i utwórz sklep</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Nazwa sklepu</label>
            <input type="text" required minLength={3} maxLength={50} placeholder="np. Sklep Centrum"
              className={inputCls} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Kod sklepu</label>
            <input type="text" required minLength={2} maxLength={2} placeholder="np. F7"
              className={`${inputCls} font-mono uppercase`} value={form.storeCode}
              onChange={(e) => setForm({ ...form, storeCode: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Oddział</label>
            <select required className={selectCls} value={form.branchId} disabled={branchLocked}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <option value="">-- Wybierz --</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {branchLocked && (
              <p className="text-xs text-slate-500 mt-1">Jako dyrektor oddziału możesz dodawać sklepy tylko we własnym oddziale.</p>
            )}
            {!branchLocked && managerData?.role === 'DIRECTOR' && managerData?.directorScope === 'REGION' && (
              <p className="text-xs text-slate-500 mt-1">Dostępne są tylko oddziały Twojego regionu.</p>
            )}
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Lokalizacja</label>
            <input type="text" required minLength={1} maxLength={100} placeholder="Miasto, ulica"
              className={inputCls} value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30 mt-2">
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <><PlusCircle className="w-4 h-4" /> Utwórz sklep</>}
        </button>
      </form>
    </div>
  );
}

// ─── Inline edit field ────────────────────────────────────────
function InfoTile({
  label, value, editable, editValue, onEditChange, type = 'text', options, minLength, maxLength
}: {
  label: string; value: string; editable: boolean;
  editValue?: string; onEditChange?: (v: string) => void;
  type?: 'text' | 'select'; options?: { id: number; name: string }[];
  minLength?: number; maxLength?: number;
}) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col items-center text-center gap-2">
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
      {editable && onEditChange ? (
        type === 'select' ? (
          <select className={`${selectCls} text-center`} value={editValue} onChange={e => onEditChange(e.target.value)}>
            <option value="">-- Bez zmiany --</option>
            {options?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        ) : (
          <input type="text" className={`${inputCls} text-center`} value={editValue} minLength={minLength} maxLength={maxLength}
            onChange={e => onEditChange(e.target.value)} />
        )
      ) : (
        <p className="text-white font-bold text-base leading-tight w-full truncate">{value || '—'}</p>
      )}
    </div>
  );
}

// ─── Store edit (inline, no collapse) ────────────────────────
function StoreEditPanel({ storeId, onSaved }: {
  storeId: number;
  onSaved: (updated: ResponseStoreDTO) => void;
}) {
  const { managerData } = useAppContext();
  const [allBranches, setAllBranches] = useState<ResponseBranchDTO[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', storeCode: '', location: '', branchId: '' });
  const [storeInfo, setStoreInfo] = useState<ResponseStoreDTO | null>(null);

  // Oddziały dostępne dla aktualnie zalogowanego użytkownika (patrz CreateStoreForm)
  const branches = getAllowedBranchesForManager(allBranches, managerData);

  useEffect(() => {
    branchService.getAll().then(setAllBranches).catch(() => {});
    storeService.getById(storeId).then(s => {
      setStoreInfo(s);
      setForm({ name: s.name, storeCode: s.storeCode, location: s.location, branchId: String(s.branchId) });
    }).catch(() => {});
  }, [storeId]);

  const handleSave = async () => {
    if (form.branchId && !branches.some((b) => b.id === Number(form.branchId))) {
      toast.error('Możesz przypisywać sklepy tylko w swoim zakresie (oddział/region)');
      return;
    }
    try {
      setSaving(true);
      const updated = await storeService.update(storeId, {
        name: form.name,
        storeCode: form.storeCode.toUpperCase(),
        location: form.location,
        branchId: form.branchId ? Number(form.branchId) : undefined,
        enable: true,
      });
      toast.success('Dane sklepu zaktualizowane');
      setStoreInfo(updated);
      onSaved(updated);
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (storeInfo) setForm({ name: storeInfo.name, storeCode: storeInfo.storeCode, location: storeInfo.location, branchId: String(storeInfo.branchId) });
    setEditing(false);
  };

  const displayBranch = branches.find(b => b.id === Number(form.branchId))?.name ?? storeInfo?.branchName ?? '—';

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <SectionTitle icon={<Building2 className="w-4 h-4" />} title="Dane sklepu" />
        {editing ? (
          <div className="flex gap-2">
            <button onClick={handleCancel} disabled={saving}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-all">
              <X className="w-3.5 h-3.5" /> Anuluj
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 text-sm text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
              {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Zapisz
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-violet-400 border border-slate-700 hover:border-violet-500/50 px-3 py-1.5 rounded-lg transition-all">
            <Edit3 className="w-3.5 h-3.5" /> Edytuj
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoTile label="Nazwa" value={form.name} editable={editing}
          editValue={form.name} onEditChange={v => setForm(f => ({...f, name: v}))} minLength={3} maxLength={50} />
        <InfoTile label="Kod sklepu" value={form.storeCode} editable={editing}
          editValue={form.storeCode} onEditChange={v => setForm(f => ({...f, storeCode: v}))} minLength={2} maxLength={2} />
        <InfoTile label="Lokalizacja" value={form.location} editable={editing}
          editValue={form.location} onEditChange={v => setForm(f => ({...f, location: v}))} minLength={3} />
        <InfoTile label="Oddział" value={displayBranch} editable={editing}
          editValue={form.branchId} onEditChange={v => setForm(f => ({...f, branchId: v}))}
          type="select" options={branches} />
      </div>
    </div>
  );
}

// ─── Hours grid ───────────────────────────────────────────────
function HoursPanel({ config, saving, updateTime }: {
  config: StoreConfigUI;
  saving: boolean;
  updateTime: (day: string, field: 'open'|'close', hour: number) => void;
}) {
  const HOURS_OPEN = Array.from({length: 24}, (_, i) => i);
  const HOURS_CLOSE = Array.from({length: 25}, (_, i) => i);

  const isWeekend = (i: number) => i >= 5;

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6">
      <SectionTitle icon={<Clock className="w-4 h-4" />} title="Godziny otwarcia dla klientów" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2">
        {DAYS.map((day, i) => {
          const openH = timeToHour(config.hours[day]?.open);
          const closeH = timeToHour(config.hours[day]?.close);
          const duration = closeH > openH ? closeH - openH : 0;

          return (
            <div key={day} className={`rounded-xl p-3 border transition-all ${isWeekend(i) ? 'bg-violet-950/20 border-violet-800/30' : 'bg-slate-900/60 border-slate-800'}`}>
              {/* Day header */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider ${isWeekend(i) ? 'text-violet-400' : 'text-slate-400'}`}>
                  {DAY_LABELS[i]}
                </span>
                {duration > 0 && (
                  <span className="text-xs text-slate-500 tabular-nums">{duration}h</span>
                )}
              </div>

              {/* Open */}
              <div className="mb-2">
                <p className="text-xs text-slate-500 mb-1">Otwarcie</p>
                <select
                  value={openH}
                  onChange={(e) => updateTime(day, 'open', +e.target.value)}
                  disabled={saving}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                >
                  {HOURS_OPEN.map(h => (
                    <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
                  ))}
                </select>
              </div>

              {/* Close */}
              <div>
                <p className="text-xs text-slate-500 mb-1">Zamknięcie</p>
                <select
                  value={closeH}
                  onChange={(e) => updateTime(day, 'close', +e.target.value)}
                  disabled={saving}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                >
                  {HOURS_CLOSE.map(h => (
                    <option key={h} value={h}>{h === 24 ? '24:00' : `${String(h).padStart(2,'0')}:00`}</option>
                  ))}
                </select>
              </div>

              {/* Visual bar */}
              {duration > 0 && (
                <div className="mt-2.5 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isWeekend(i) ? 'bg-violet-500' : 'bg-emerald-500'}`}
                    style={{ width: `${(duration / 16) * 100}%`, maxWidth: '100%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Staffing panel ───────────────────────────────────────────
function StaffingPanel({ config, saving, updateStaffing }: {
  config: StoreConfigUI;
  saving: boolean;
  updateStaffing: (key: keyof OptimalStaffing, val: number) => void;
}) {
  const total = (['storeManagers','salesManagers','sellers','cashiers','storemen','pok'] as const)
    .reduce((sum, k) => sum + (config.staffing[k] ?? 0), 0);

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400">
          <Users className="w-4 h-4" />
        </div>
        <h3 className="text-white font-semibold text-base tracking-tight">Optymalna obsada</h3>
      </div>

      {/* Total — centered, large */}
      <div className="flex flex-col items-center justify-center py-4 mb-4 bg-slate-900/50 border border-slate-800 rounded-xl">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Łącznie pracowników</p>
        <p className="text-5xl font-bold text-violet-400 tabular-nums leading-none">{total}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {STAFFING_ROLES.map(({ key, label, icon }) => (
          <div key={key} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col items-center gap-3">
            {/* Icon + label centered */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-2xl leading-none">{icon}</span>
              <p className="text-slate-300 text-xs font-semibold text-center leading-tight uppercase tracking-wide">{label}</p>
            </div>
            {/* Counter */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateStaffing(key, config.staffing[key] - 1)}
                disabled={config.staffing[key] === 0 || saving}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white flex items-center justify-center disabled:opacity-30 transition-all"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-white font-bold text-2xl tabular-nums w-8 text-center leading-none">{config.staffing[key]}</span>
              <button
                onClick={() => updateStaffing(key, config.staffing[key] + 1)}
                disabled={saving}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-violet-600 border border-slate-700 hover:border-violet-500 text-white flex items-center justify-center disabled:opacity-30 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Store detail ─────────────────────────────────────────────
function StoreDetail({ storeId, onBack, showBack }: { storeId: number; onBack?: () => void; showBack?: boolean }) {
  const [config, setConfig] = useState<StoreConfigUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      storeService.getById(storeId),
      storeOpeningHoursService.getAll(storeId).catch(() => null),
    ]).then(([store, hours]) => {
      setConfig({
        storeName: store.name,
        warehouse: store.storeCode,
        branch: store.branchName || 'Brak oddziału',
        hours: hours ?? createDefaultHours(),
        staffing: store.details?.staffing || createDefaultStaffing(),
        updatedAt: store.details?.updatedAt ?? null,
      });
    }).catch((err) => toast.error('Nie udało się załadować danych sklepu: ' + (err?.message ?? '')))
      .finally(() => setLoading(false));
  }, [storeId]);

  const updateTime = (day: string, field: 'open'|'close', hour: number) =>
    setConfig((p) => p ? { ...p, hours: { ...p.hours, [day]: { ...p.hours[day], [field]: hourToTime(hour) } } } : p);

  const updateStaffing = (key: keyof OptimalStaffing, val: number) =>
    setConfig((p) => p ? { ...p, staffing: { ...p.staffing, [key]: Math.max(0, val) } } : p);

  const save = async () => {
    if (!config) return;
    try {
      setSaving(true);
      const [, updatedDetails] = await Promise.all([
        storeOpeningHoursService.updateAll(storeId, config.hours),
        storeDetailsService.update(storeId, { staffing: config.staffing }),
      ]);
      setConfig((p) => p ? { ...p, updatedAt: updatedDetails.updatedAt } : p);
      toast.success('Zapisano zmiany');
    } catch (err: any) {
      toast.error(err.message || 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3">
      <Loader className="w-6 h-6 text-violet-400 animate-spin" />
      <span className="text-slate-400">Ładowanie...</span>
    </div>
  );
  if (!config) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">{config.storeName}</h2>
            <p className="text-slate-400 text-sm">{config.branch} · <span className="font-mono text-slate-300">{config.warehouse}</span></p>
            <LastModifiedInfo updatedAt={config.updatedAt} className="mt-1" />
          </div>
        </div>
      </div>

      {/* Edit panel */}
      <StoreEditPanel storeId={storeId} onSaved={(updated) => setConfig(prev => prev ? {
        ...prev,
        storeName: updated.name,
        warehouse: updated.storeCode,
        branch: updated.branchName || prev.branch,
      } : prev)} />

      {/* Hours */}
      <HoursPanel config={config} saving={saving} updateTime={updateTime} />

      {/* Staffing */}
      <StaffingPanel config={config} saving={saving} updateStaffing={updateStaffing} />

      {/* Save button */}
      <button onClick={save} disabled={saving || loading}
        className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30">
        {saving ? <><Loader className="w-4 h-4 animate-spin" /> Zapisywanie...</> : <><Check className="w-4 h-4" /> Zapisz godziny i obsadę</>}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function YourStore({ onStoreCreated }: YourStoreProps) {
  const { managerData, selectedStoreId, setSelectedStoreId } = useAppContext();
  const [stores, setStores] = useState<ResponseStoreDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStoreId, setViewStoreId] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  const isAdminOrDirector = managerData?.role === 'ADMIN' || managerData?.role === 'DIRECTOR';
  const isAdmin = managerData?.role === 'ADMIN';

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (isAdminOrDirector) {
          const page = isAdmin
            ? await storeService.getAll()
            : await storeService.getManagedStores();
          setStores(page.content);
          if (!initialized && selectedStoreId) {
            setViewStoreId(selectedStoreId);
          }
        } else if (managerData?.storeId) {
          setViewStoreId(managerData.storeId);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrDirector, managerData?.storeId]);

  useEffect(() => {
    if (!initialized) return;
    if (selectedStoreId && selectedStoreId !== viewStoreId) {
      setViewStoreId(selectedStoreId);
    }
    if (selectedStoreId === null && viewStoreId !== null && viewStoreId !== -1) {
      setViewStoreId(null);
    }
  }, [selectedStoreId]);

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3">
      <Loader className="w-6 h-6 text-violet-400 animate-spin" />
      <span className="text-slate-400">Ładowanie...</span>
    </div>
  );

  if (!isAdminOrDirector && !managerData?.storeId) {
    return <CreateStoreForm onCreated={(id) => {
      setSelectedStoreId(id);
      setViewStoreId(id);
      onStoreCreated?.();
    }} />;
  }

  const loadStoresForRole = () =>
    isAdmin ? storeService.getAll() : storeService.getManagedStores();

  if (viewStoreId === -1) {
    return (
      <CreateStoreForm onCreated={(id) => {
        setSelectedStoreId(id);
        loadStoresForRole().then(p => {
          setStores(p.content);
          setViewStoreId(null);
          onStoreCreated?.();
        }).catch(() => setViewStoreId(null));
      }} />
    );
  }

  if (isAdminOrDirector && viewStoreId && viewStoreId > 0) {
    return (
      <StoreDetail
        storeId={viewStoreId}
        showBack={true}
        onBack={() => {
          setViewStoreId(null);
          setSelectedStoreId(null);
          loadStoresForRole().then(p => setStores(p.content)).catch(() => {});
        }}
      />
    );
  }

  if (isAdminOrDirector) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Sklepy</h2>
            <p className="text-slate-400 text-sm mt-0.5">{stores.length} {stores.length === 1 ? 'sklep' : stores.length < 5 ? 'sklepy' : 'sklepów'} w systemie</p>
          </div>
          <button
            onClick={() => setViewStoreId(-1)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-900/30"
          >
            <PlusCircle className="w-4 h-4" /> Dodaj sklep
          </button>
        </div>

        {stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-medium">Brak sklepów</p>
              <p className="text-slate-500 text-sm mt-1">Dodaj pierwszy sklep aby zacząć</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((s) => (
              <StoreCard key={s.id} store={s} onSelect={() => {
                setViewStoreId(s.id);
                setSelectedStoreId(s.id);
              }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (viewStoreId) {
    return <StoreDetail storeId={viewStoreId} showBack={false} />;
  }

  return null;
}