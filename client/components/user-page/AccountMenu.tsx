import { useState } from 'react';
import { LogOut, User, KeyRound, Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '@/context/AppContext';
import { userService } from '@/services/api-provider';

export default function AccountMenu() {
  const { managerData, handleLogout } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ── Zmiana hasła ──
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Podaj aktualne hasło');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('Nowe hasło musi mieć co najmniej 6 znaków');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Hasła nie są identyczne');
      return;
    }

    try {
      setSaving(true);
      await userService.changeOwnPassword(currentPassword, newPassword);
      toast.success('Hasło zostało zmienione');
      closePasswordModal();
    } catch (error: any) {
      toast.error(error.message || 'Nie udało się zmienić hasła');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    setIsOpen(false);
    handleLogout();
  };

  return (
    <div className="relative">
      {/* Account Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors flex items-center gap-2 hover:scale-105 active:scale-95"
        title="Ustawienia konta"
      >
        <User className="w-5 h-5 text-white" />
        <span className="text-white text-sm font-medium hidden sm:inline">Konto</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl shadow-slate-900/50 z-50">
          {/* Menu Header */}
          <div className="flex justify-between items-center p-6 border-b border-slate-700">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Konto
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Menu Content */}
          <div className="p-6 space-y-4">
            <div>
              <label className="text-slate-400 text-sm font-medium">Nazwa</label>
              <p className="text-white text-base font-medium mt-1">{managerData.login}</p>
            </div>

            <button
              onClick={openPasswordModal}
              className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <KeyRound className="w-4 h-4 text-blue-400" />
              Zmień hasło
            </button>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              Wyloguj się
            </button>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Zmień hasło</h3>
              </div>
              <button onClick={closePasswordModal} className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Pole pomocnicze dla autouzupełniania przeglądarki — pozwala jej poprawnie
                  dopasować zapisane hasło do AKTUALNIE zalogowanego konta, a nie do
                  ostatnio zapisanych danych logowania w przeglądarce. Nie chowamy go
                  przez display:none, bo wtedy część przeglądarek je ignoruje. */}
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={managerData?.login || ''}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only absolute w-px h-px overflow-hidden opacity-0 pointer-events-none"
              />

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Aktualne hasło <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Potwierdź nowe hasło <span className="text-red-400">*</span>
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button onClick={closePasswordModal} disabled={saving} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">Anuluj</button>
              <button onClick={handleChangePassword} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving ? 'Zapisywanie...' : <><KeyRound className="w-4 h-4" /> Zmień hasło</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Potwierdź Wylogowanie</h3>
            <p className="text-slate-300 mb-6">
              Czy na pewno chcesz się wylogować? Wszystkie dane zostaną zapisane.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
              >
                Wyloguj się
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}