import {
  useEffect,
  useRef,
  useState,
} from "react";

import { Clock3 } from "lucide-react";

import { useAppContext } from "@/context/AppContext";
import {
  storageUtils,
  STORAGE_KEYS,
} from "@/utils/storage";

function getRemainingSeconds(
  expiresAt: string | null
): number | null {
  if (!expiresAt) {
    return null;
  }

  const expiryMs = Date.parse(expiresAt);

  if (Number.isNaN(expiryMs)) {
    console.warn(
      "Nieprawidłowa wartość demoExpiresAt:",
      expiresAt
    );

    return null;
  }

  return Math.max(
    0,
    Math.ceil(
      (expiryMs - Date.now()) / 1000
    )
  );
}

function formatRemainingTime(
  totalSeconds: number
): string {
  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds =
    totalSeconds % 60;

  if (hours > 0) {
    return [
      hours,
      minutes,
      seconds,
    ]
      .map((value) =>
        String(value).padStart(2, "0")
      )
      .join(":");
  }

  return [
    minutes,
    seconds,
  ]
    .map((value) =>
      String(value).padStart(2, "0")
    )
    .join(":");
}

export default function DemoSessionBanner() {
  const {
    isLoggedIn,
    handleLogout,
  } = useAppContext();

  const [
    expiresAt,
    setExpiresAt,
  ] = useState<string | null>(null);

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState<number | null>(null);

  const expirationHandled =
    useRef(false);

  /*
   * Pobieramy moment wygaśnięcia sesji
   * bezpośrednio z localStorage.
   *
   * LoginPage zapisuje tutaj wartość
   * otrzymaną z GET /api/demo:
   *
   * demoExpiresAt = data.expiresAt
   */
  useEffect(() => {
    if (!isLoggedIn) {
      setExpiresAt(null);
      setRemainingSeconds(null);
      return;
    }

    const demoSession =
      storageUtils.get<boolean>(
        STORAGE_KEYS.DEMO_SESSION,
        "local"
      );

    if (demoSession !== true) {
      setExpiresAt(null);
      setRemainingSeconds(null);
      return;
    }

    const storedExpiresAt =
      storageUtils.get<string>(
        STORAGE_KEYS.DEMO_EXPIRES_AT,
        "local"
      );

    setExpiresAt(storedExpiresAt);
  }, [isLoggedIn]);

  /*
   * Aktualizacja licznika co sekundę.
   */
  useEffect(() => {
    expirationHandled.current = false;

    if (!expiresAt) {
      setRemainingSeconds(null);
      return;
    }

    const updateRemainingTime = () => {
      const remaining =
        getRemainingSeconds(expiresAt);

      setRemainingSeconds(remaining);
    };

    updateRemainingTime();

    const intervalId =
      window.setInterval(
        updateRemainingTime,
        1000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [expiresAt]);

  /*
   * Po osiągnięciu 0:
   *
   * 1. zapisujemy informację o wygaśnięciu,
   * 2. wylogowujemy użytkownika,
   * 3. wracamy na stronę startową.
   */
  useEffect(() => {
    if (
      remainingSeconds !== 0 ||
      expirationHandled.current
    ) {
      return;
    }

    expirationHandled.current = true;

    storageUtils.set(
      STORAGE_KEYS.SESSION_NOTICE,
      "demo-expired",
      "session"
    );

    handleLogout();

    window.location.replace("/");
  }, [
    remainingSeconds,
    handleLogout,
  ]);

  if (
    !isLoggedIn ||
    !expiresAt ||
    remainingSeconds == null
  ) {
    return null;
  }

  const isEndingSoon =
    remainingSeconds <= 5 * 60;

  return (
	<div
	  className={`pointer-events-none fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md ${
	    isEndingSoon
	      ? "border-amber-400/50 bg-amber-950/90 text-amber-100"
	      : "border-blue-400/40 bg-slate-900/90 text-slate-100"
	  }`}
	  role="status"
	  aria-live="polite"
	  title={`Sesja demo wygaśnie: ${expiresAt}`}
	>
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          isEndingSoon
            ? "bg-amber-400/15"
            : "bg-blue-400/15"
        }`}
      >
        <Clock3
          className={`h-5 w-5 ${
            isEndingSoon
              ? "text-amber-300"
              : "text-blue-300"
          }`}
        />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          Wersja demonstracyjna
        </p>

        <p className="text-sm font-medium">
          Wylogowanie za{" "}
          <span className="font-mono font-bold">
            {formatRemainingTime(
              remainingSeconds
            )}
          </span>
        </p>
      </div>
    </div>
  );
}
