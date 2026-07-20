import { useCallback, useMemo, useRef } from 'react';

/**
 * Zabezpiecza przed race condition przy async fetchach zależnych od zmiennego
 * parametru (np. wybranego sklepu w dropdownie admina/dyrektora).
 *
 * PROBLEM, który to rozwiązuje:
 * Admin/Dyrektor ma kilka sklepów. Przełącza się między nimi w dropdownie.
 * Każda zmiana `selectedStoreId` odpala nowy fetch (useEffect). Jeśli
 * odpowiedź na fetch dla POPRZEDNIEGO sklepu przyjdzie z opóźnieniem i
 * dotrze PO odpowiedzi dla nowego sklepu (typowe przy szybkim przełączaniu
 * albo wolniejszym połączeniu), to bez zabezpieczenia `setState(...)` z tej
 * starej, spóźnionej odpowiedzi nadpisuje już poprawnie załadowane dane
 * nowego sklepu — na ekranie widać wtedy dane/pusty stan z poprzedniego
 * sklepu, mimo że w dropdownie wybrany jest inny.
 *
 * Użycie:
 *   const { start, isCurrent } = useRequestGuard();
 *   const fetchX = useCallback(async () => {
 *     const token = start();
 *     setLoading(true);
 *     try {
 *       const data = await api.get(...);
 *       if (!isCurrent(token)) return; // odpowiedź nieaktualna — porzuć, nic nie nadpisujemy
 *       setState(data);
 *     } finally {
 *       if (isCurrent(token)) setLoading(false);
 *     }
 *   }, [start, isCurrent, ...]);
 */
export function useRequestGuard() {
  const tokenRef = useRef(0);

  const start = useCallback(() => {
    tokenRef.current += 1;
    return tokenRef.current;
  }, []);

  const isCurrent = useCallback((token: number) => token === tokenRef.current, []);

  // Memoizowane — start/isCurrent są już stabilne (useCallback z []), ale bez
  // useMemo tutaj zwracany obiekt {start, isCurrent} byłby NOWYM obiektem przy
  // każdym renderze komponentu, co przy umieszczeniu go w tablicy zależności
  // useEffect/useCallback powodowałoby ich niepotrzebne odpalanie przy KAŻDYM
  // renderze, a nie tylko przy realnej zmianie np. wybranego sklepu.
  return useMemo(() => ({ start, isCurrent }), [start, isCurrent]);
}
