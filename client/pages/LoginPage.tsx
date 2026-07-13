import { motion } from 'framer-motion';
import { useState } from 'react';
import { Lock, Mail, Building2, Warehouse } from 'lucide-react';
import { LoginRequest, RegistrationRequest, RegistrationResponse } from '@shared/api';
import { toast } from 'sonner';
import { useAppContext } from '@/context/AppContext';

interface LoginPageProps {
  onLoginSuccess: (userData: any) => void;
  onCancel: () => void;
}

type TabType = 'login' | 'register';

export default function LoginPage({ onLoginSuccess, onCancel }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [warehouseNumber, setWarehouseNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setManagerData, setIsLoggedIn } = useAppContext();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const loginRequest: LoginRequest = {
        login: login,
        password: password,
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.token) {
        localStorage.setItem('authToken', data.token);
        toast.success('Zalogowano pomyślnie');
        setManagerData({ login: data.login, role: data.role, storeId: data.storeId, directorScope: data.directorScope ?? null, scopeName: data.scopeName ?? null });
        setIsLoggedIn(true);
        onLoginSuccess(data);
      } else {
        setError('Nieprawidłowe dane logowania');
        toast.error('Nieprawidłowe dane logowania');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.message || 'Błąd sieci. Spróbuj ponownie.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const registrationRequest: RegistrationRequest = {
        storeName,
        email,
        warehouseNumber,
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationRequest),
      });

      const data: RegistrationResponse = await response.json();

      if (data.success) {
        toast.success(data.message);
        setStoreName('');
        setEmail('');
        setWarehouseNumber('');
        setTimeout(() => {
          setActiveTab('login');
        }, 2000);
      } else {
        setError(data.message || 'Registration failed');
        toast.error(data.message || 'Registration failed');
      }
    } catch (err) {
      const errorMessage = 'Network error. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const floatingIcons = [
    { delay: 0, x: -20, y: -30 },
    { delay: 0.2, x: 20, y: -20 },
    { delay: 0.4, x: -30, y: 20 },
    { delay: 0.6, x: 30, y: 30 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-blue-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </motion.div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold text-white mb-6 text-center">Zarządzanie Grafikami</h1>

              <div className="flex gap-2 border-b border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setError('');
                  }}
                  className={`flex-1 py-3 font-semibold transition-all border-b-2 ${
                    activeTab === 'login'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Logowanie
                </button>
                {/* Przycisk Rejestracja tymczasowo ukryty – usuń komentarz aby przywrócić */}
                {/* <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setError('');
                  }}
                  className={`flex-1 py-3 font-semibold transition-all border-b-2 ${
                    activeTab === 'register'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Rejestracja
                </button> */}
              </div>
            </motion.div>

            {activeTab === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Login
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      placeholder="Wpisz swój login"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Hasło
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Wpisz swoje hasło"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={isLoading || !login || !password}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  whileHover={{ scale: isLoading || !login || !password ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading || !login || !password ? 1 : 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  {isLoading ? 'Logowanie...' : 'Zaloguj się'}
                </motion.button>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="mt-6 pt-6 border-t border-slate-700 text-center"
                  >
                </motion.div>
              </form>
            ) : (
              <form onSubmit={handleRegistrationSubmit} className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Nazwa sklepu
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Wpisz nazwę sklepu"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Mail służbowy
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Wpisz swój mail"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Numer magazynu
                  </label>
                  <div className="relative">
                    <Warehouse className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={warehouseNumber}
                      onChange={(e) => setWarehouseNumber(e.target.value)}
                      placeholder="Wpisz numer magazynu"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={isLoading || !storeName || !email || !warehouseNumber}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  whileHover={{ scale: isLoading || !storeName || !email || !warehouseNumber ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading || !storeName || !email || !warehouseNumber ? 1 : 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  {isLoading ? 'Wysyłanie...' : 'Wyślij link rejestracji'}
                </motion.button>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm"
                >
                  Link rejestracyjny zostanie wysłany na podany adres email. Sprawdź swoją skrzynkę odbiorczą.
                </motion.div>
              </form>
            )}

            <motion.button
              type="button"
              onClick={onCancel}
              className="w-full mt-4 text-slate-400 hover:text-slate-300 py-2 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              Wróć
            </motion.button>
          </div>

          <div className="relative mt-8">
            {floatingIcons.map(({ delay, x, y }, index) => (
              <motion.div
                key={index}
                className="absolute"
                style={{ left: '50%', top: '50%' }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0.2, 0.4, 0.2],
                  scale: 1,
                  x: [0, x, 0],
                  y: [0, y, 0],
                }}
                transition={{
                  opacity: { duration: 3, repeat: Infinity, delay },
                  scale: { duration: 0.5, delay },
                  x: { duration: 4, repeat: Infinity, delay },
                  y: { duration: 4, repeat: Infinity, delay },
                }}
              >
                <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center backdrop-blur-sm border border-slate-600">
                  <Lock className="w-6 h-6 text-blue-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}