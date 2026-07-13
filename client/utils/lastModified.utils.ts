/**
 * Last Modified Info Utils
 * Wspólna logika dla komunikatu "Ostatnia zmiana: <kto> <kiedy>"
 * wyświetlanego we wszystkich sekcjach aplikacji.
 *
 * "Kto" pochodzi z aktualnie zalogowanego użytkownika (ManagerData z AppContext) —
 * ten sam mechanizm, który buduje tytuły paneli (np. "Panel Kierownika Sklepu Puławy F7").
 * "Kiedy" to realna wartość updatedAt zwrócona przez backend dla danego rekordu.
 */

import type { ManagerData } from '@/types';

/**
 * Buduje etykietę osoby na podstawie danych zalogowanego użytkownika.
 *
 * ADMIN              → "Administrator"
 * DIRECTOR/NETWORK   → "Dyrektor Sieci"
 * DIRECTOR/REGION    → "Dyrektor Regionu Północ"
 * DIRECTOR/BRANCH    → "Dyrektor Oddziału Warszawa"
 * STORE_MANAGER      → "Kierownik Sklepu Puławy F7"
 */
export function buildLastModifiedByLabel(
  managerData: ManagerData | null | undefined
): string {
  if (!managerData?.role) return 'Użytkownik';

  const name = managerData.scopeName?.trim() ?? '';

  switch (managerData.role) {
    case 'ADMIN':
      return 'Administrator';

    case 'DIRECTOR': {
      switch (managerData.directorScope) {
        case 'NETWORK':
          return 'Dyrektor Sieci';
        case 'REGION':
          return name ? `Dyrektor Regionu ${name}` : 'Dyrektor Regionu';
        case 'BRANCH':
          return name ? `Dyrektor Oddziału ${name}` : 'Dyrektor Oddziału';
        default:
          return 'Dyrektor';
      }
    }

    case 'STORE_MANAGER':
      return name ? `Kierownik Sklepu ${name}` : 'Kierownik Sklepu';

    default:
      return 'Użytkownik';
  }
}

/**
 * Formatuje datę z backendu (ISO 8601 / LocalDateTime) na format "DD.MM.RRRR GG:MM".
 * Zwraca null jeśli wartość jest pusta lub nieprawidłowa — wtedy nic nie powinno się wyświetlić.
 */
export function formatLastModifiedDate(
  value: string | null | undefined
): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (isNaN(date.getTime())) return null;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * Buduje pełny tekst "Ostatnia zmiana: <kto> <kiedy>".
 *
 * Informacja ma być widoczna ZAWSZE, odkąd rekord istnieje:
 * - jeśli rekord był edytowany → używamy updatedAt + updatedByLabel
 * - jeśli nigdy nie był edytowany (updatedAt === null) → używamy createdAt + createdByLabel
 * - jeśli nie ma żadnej daty (rekord jeszcze nie istnieje / nie wczytany) → null, nic się nie renderuje
 *
 * "Kto" pochodzi z migawki zapisanej przez backend w momencie zapisu rekordu
 * (createdByLabel / updatedByLabel) — to faktyczny autor zmiany, niezależny
 * od tego, kto akurat ogląda dany ekran.
 *
 * fallbackManagerData to mechanizm przejściowy: moduły, które jeszcze nie mają
 * pól createdByLabel/updatedByLabel z backendu, dalej dostają (błędną) etykietę
 * zbudowaną z aktualnie zalogowanego użytkownika, żeby nic się nie wysypało,
 * zanim przerobimy je jeden po drugim. Gdy dany moduł dostanie realne dane
 * z backendu, ten fallback przestaje być używany.
 */
export function buildLastModifiedText({
  updatedAt,
  createdAt,
  updatedByLabel,
  createdByLabel,
  fallbackManagerData,
}: {
  updatedAt: string | null | undefined;
  createdAt?: string | null | undefined;
  updatedByLabel?: string | null | undefined;
  createdByLabel?: string | null | undefined;
  fallbackManagerData?: ManagerData | null | undefined;
}): string | null {
  const effectiveDate = updatedAt ?? createdAt ?? null;
  const formattedDate = formatLastModifiedDate(effectiveDate);
  if (!formattedDate) return null;

  const effectiveLabel =
    (updatedAt ? updatedByLabel : createdByLabel) ??
    buildLastModifiedByLabel(fallbackManagerData);

  return `Ostatnia zmiana: ${effectiveLabel} ${formattedDate}`;
}