import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";

import {
  Lock,
  Mail,
  Building2,
  Warehouse,
  Sparkles,
} from "lucide-react";

import {
  LoginRequest,
  RegistrationRequest,
  RegistrationResponse,
} from "@shared/api";

import { toast } from "sonner";

import { useAppContext } from "@/context/AppContext";

import {
  storageUtils,
  STORAGE_KEYS,
} from "@/utils/storage";

interface LoginPageProps {
  onLoginSuccess: (
    userData: any
  ) => void;

  onCancel: () => void;
}

type TabType =
  | "login"
  | "register";

export default function LoginPage({
  onLoginSuccess,
  onCancel,
}: LoginPageProps) {
  const [
    activeTab,
    setActiveTab,
  ] = useState<TabType>("login");

  const [
    login,
    setLogin,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    storeName,
    setStoreName,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    warehouseNumber,
    setWarehouseNumber,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    isDemoLoading,
    setIsDemoLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const {
    setManagerData,
    setIsLoggedIn,
  } = useAppContext();

  const handleLoginSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const loginRequest: LoginRequest = {
        login,
        password,
      };

      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            loginRequest
          ),
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          `HTTP ${response.status}: ${errorText}`
        );
      }

      const data =
        await response.json();

      if (data.token) {
        localStorage.setItem(
          "authToken",
          data.token
        );

        storageUtils.remove(
          STORAGE_KEYS.DEMO_SESSION,
          "local"
        );

        storageUtils.remove(
          STORAGE_KEYS.DEMO_EXPIRES_AT,
          "local"
        );

        toast.success(
          "Zalogowano pomyślnie"
        );

        setManagerData({
          login: data.login,
          role: data.role,
          storeId: data.storeId,
          directorScope:
            data.directorScope ?? null,
          scopeName:
            data.scopeName ?? null,
        });

        setIsLoggedIn(true);

        onLoginSuccess(data);
      } else {
        setError(
          "Nieprawidłowe dane logowania"
        );

        toast.error(
          "Nieprawidłowe dane logowania"
        );
      }
    } catch (err: any) {
      console.error(
        "Login error:",
        err
      );

      const errorMessage =
        err.message ||
        "Błąd sieci. Spróbuj ponownie.";

      setError(errorMessage);

      toast.error(
        errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin =
    async () => {
      setError("");
      setIsDemoLoading(true);

      try {
        /*
         * 1. Tworzymy konto demo.
         *
         * Backend zwraca:
         * login
         * role
         * storeId
         * expiresAt
         */
        const demoResponse =
          await fetch(
            "/api/demo",
            {
              method: "GET",
            }
          );

        if (!demoResponse.ok) {
          const errorText =
            await demoResponse.text();

          throw new Error(
            `HTTP ${demoResponse.status}: ${errorText}`
          );
        }

        const demoData =
          await demoResponse.json();

        if (
          !demoData.login ||
          !demoData.storeId ||
          !demoData.expiresAt
        ) {
          throw new Error(
            "Nieprawidłowa odpowiedź z /api/demo"
          );
        }

        /*
         * 2. Konto zostało utworzone.
         *
         * W DemoServiceImpl:
         *
         * String rawPassword = login;
         *
         * dlatego hasło konta demo jest
         * takie samo jak jego login.
         */
        const demoLoginRequest:
          LoginRequest = {
            login:
              demoData.login,
            password:
              demoData.login,
          };

        /*
         * 3. Logujemy świeżo utworzone
         * konto demo, aby otrzymać JWT.
         */
        const loginResponse =
          await fetch(
            "/api/auth/login",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                demoLoginRequest
              ),
            }
          );

        if (!loginResponse.ok) {
          const errorText =
            await loginResponse.text();

          throw new Error(
            `Nie udało się zalogować do konta demo. HTTP ${loginResponse.status}: ${errorText}`
          );
        }

        const loginData =
          await loginResponse.json();

        if (!loginData.token) {
          throw new Error(
            "Backend utworzył konto demo, ale /api/auth/login nie zwrócił tokena."
          );
        }

        /*
         * 4. Zapisujemy JWT.
         */
        localStorage.setItem(
          "authToken",
          loginData.token
        );

        /*
         * 5. Informujemy frontend,
         * że aktualna sesja jest demo.
         */
        storageUtils.set(
          STORAGE_KEYS.DEMO_SESSION,
          true,
          "local"
        );

        /*
         * 6. Zapisujemy dokładny moment
         * wygaśnięcia sesji.
         *
         * To jest wartość Instant
         * zwrócona przez backend.
         */
        storageUtils.set(
          STORAGE_KEYS.DEMO_EXPIRES_AT,
          demoData.expiresAt,
          "local"
        );

        /*
         * 7. Ustawiamy dane zalogowanego
         * użytkownika.
         *
         * Bierzemy je z odpowiedzi
         * /api/auth/login, ponieważ to
         * jest faktyczna odpowiedź
         * uwierzytelniająca.
         */
        setManagerData({
          login: loginData.login,
          role: loginData.role,
          storeId:
            loginData.storeId,
          directorScope:
            loginData.directorScope ??
            null,
          scopeName:
            loginData.scopeName ??
            null,
        });

        setIsLoggedIn(true);

        toast.success(
          "Utworzono sklep demonstracyjny"
        );

        onLoginSuccess({
          ...loginData,
          expiresAt:
            demoData.expiresAt,
        });
      } catch (err: any) {
        console.error(
          "Demo login error:",
          err
        );

        const errorMessage =
          err.message ||
          "Nie udało się utworzyć wersji demonstracyjnej";

        setError(errorMessage);

        toast.error(
          errorMessage
        );
      } finally {
        setIsDemoLoading(false);
      }
    };

  const handleRegistrationSubmit =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      setError("");
      setIsLoading(true);

      try {
        const registrationRequest:
          RegistrationRequest = {
            storeName,
            email,
            warehouseNumber,
          };

        const response =
          await fetch(
            "/api/auth/register",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                registrationRequest
              ),
            }
          );

        const data:
          RegistrationResponse =
          await response.json();

        if (data.success) {
          toast.success(
            data.message
          );

          setStoreName("");
          setEmail("");
          setWarehouseNumber("");

          setTimeout(() => {
            setActiveTab(
              "login"
            );
          }, 2000);
        } else {
          setError(
            data.message ||
              "Registration failed"
          );

          toast.error(
            data.message ||
              "Registration failed"
          );
        }
      } catch {
        const errorMessage =
          "Network error. Please try again.";

        setError(
          errorMessage
        );

        toast.error(
          errorMessage
        );
      } finally {
        setIsLoading(false);
      }
    };

  const floatingIcons = [
    {
      delay: 0,
      x: -20,
      y: -30,
    },

    {
      delay: 0.2,
      x: 20,
      y: -20,
    },

    {
      delay: 0.4,
      x: -30,
      y: 20,
    },

    {
      delay: 0.6,
      x: 30,
      y: 30,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      <motion.div
        className="absolute inset-0"
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 1,
        }}
      >
        {[...Array(20)].map(
          (_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-blue-400 rounded-full"
              style={{
                left: `${
                  Math.random() *
                  100
                }%`,
                top: `${
                  Math.random() *
                  100
                }%`,
              }}
              animate={{
                y: [
                  0,
                  -30,
                  0,
                ],

                opacity: [
                  0.2,
                  0.5,
                  0.2,
                ],
              }}
              transition={{
                duration:
                  3 +
                  Math.random() *
                    2,

                repeat:
                  Infinity,

                delay:
                  Math.random() *
                  2,
              }}
            />
          )
        )}
      </motion.div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.9,
            y: 20,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
          }}
          className="w-full max-w-md"
        >
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
            <motion.div
              initial={{
                opacity: 0,
                y: -20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.5,
                delay: 0.1,
              }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold text-white mb-6 text-center">
                Zarządzanie Grafikami
              </h1>

              <div className="flex gap-2 border-b border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(
                      "login"
                    );

                    setError("");
                  }}
                  className={`flex-1 py-3 font-semibold transition-all border-b-2 ${
                    activeTab ===
                    "login"
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Logowanie
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(
                      "register"
                    );

                    setError("");
                  }}
                  className={`flex-1 py-3 font-semibold transition-all border-b-2 ${
                    activeTab ===
                    "register"
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Rejestracja
                </button>
              </div>
            </motion.div>

            {activeTab ===
              "login" && (
              <motion.form
                initial={{
                  opacity: 0,
                  x: -20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                onSubmit={
                  handleLoginSubmit
                }
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Login
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />

                    <input
                      type="text"
                      value={login}
                      onChange={(e) =>
                        setLogin(
                          e.target.value
                        )
                      }
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Wprowadź login"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Hasło
                  </label>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />

                    <input
                      type="password"
                      value={password}
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Wprowadź hasło"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isLoading
                  }
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                >
                  {isLoading
                    ? "Logowanie..."
                    : "Zaloguj się"}
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700" />
                  </div>

                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-slate-800 text-slate-500">
                      lub
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    handleDemoLogin
                  }
                  disabled={
                    isDemoLoading
                  }
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  
                >
                  <Sparkles className="h-5 w-5" />

                  {isDemoLoading
                    ? "Tworzenie wersji demonstracyjnej..."
                    : "Wersja demonstracyjna"}
                </button>
              </motion.form>
            )}

            {activeTab ===
              "register" && (
              <motion.form
                initial={{
                  opacity: 0,
                  x: 20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                onSubmit={
                  handleRegistrationSubmit
                }
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nazwa sklepu
                  </label>

                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />

                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) =>
                        setStoreName(
                          e.target.value
                        )
                      }
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nazwa sklepu"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    E-mail
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(
                          e.target.value
                        )
                      }
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="E-mail"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Numer magazynu
                  </label>

                  <div className="relative">
                    <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />

                    <input
                      type="text"
                      value={
                        warehouseNumber
                      }
                      onChange={(e) =>
                        setWarehouseNumber(
                          e.target.value
                        )
                      }
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Numer magazynu"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isLoading
                  }
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                >
                  {isLoading
                    ? "Rejestracja..."
                    : "Zarejestruj się"}
                </button>
              </motion.form>
            )}

            <div className="mt-8 text-center">
              <Link
                to="/"
                onClick={
                  onCancel
                }
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Powrót do strony
                głównej
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
