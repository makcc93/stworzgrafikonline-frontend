import { Clock } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { buildLastModifiedText } from '@/utils/lastModified.utils';

interface LastModifiedInfoProps {
  /** Data ostatniej aktualizacji rekordu (ISO 8601 / LocalDateTime z backendu) */
  updatedAt: string | null | undefined;
  /**
   * Data utworzenia rekordu — używana jako fallback, gdy updatedAt jest null
   * (rekord nigdy nie był edytowany). Dzięki temu informacja jest widoczna
   * ZAWSZE, odkąd rekord istnieje — a nie tylko po pierwszej edycji.
   */
  createdAt?: string | null | undefined;
  /** Etykieta autora ostatniej aktualizacji (migawka z backendu, np. "Kierownik Sklepu Puławy") */
  updatedByLabel?: string | null | undefined;
  /** Etykieta autora utworzenia rekordu (migawka z backendu) — fallback, gdy updatedByLabel brak */
  createdByLabel?: string | null | undefined;
  /** Dodatkowe klasy (np. do nadpisania marginesów w konkretnej sekcji) */
  className?: string;
}

/**
 * Wspólny komponent informujący kto i kiedy ostatnio zapisał dane.
 *
 * Format: "Ostatnia zmiana: <Rola + zakres> <DD.MM.RRRR GG:MM>"
 * np. "Ostatnia zmiana: Kierownik Sklepu Puławy F7 20.06.2026 13:54"
 *
 * Osoba w komunikacie to faktyczny autor zmiany — migawka updatedByLabel/createdByLabel
 * zapisana przez backend w momencie zapisu rekordu, NIE aktualnie zalogowany użytkownik.
 * Jeśli moduł nie przekaże tych propsów (jeszcze nie zaktualizowany), komponent spada
 * na fallbackManagerData (aktualnie zalogowany user) — patrz buildLastModifiedText.
 * Data to updatedAt z backendu — lub createdAt, jeśli rekord nigdy nie był edytowany.
 *
 * Nie renderuje nic tylko wtedy, gdy rekord jeszcze nie istnieje (brak obu dat).
 */
export default function LastModifiedInfo({
  updatedAt,
  createdAt,
  updatedByLabel,
  createdByLabel,
  className = '',
}: LastModifiedInfoProps) {
  const { managerData } = useAppContext();
  const text = buildLastModifiedText({
    updatedAt,
    createdAt,
    updatedByLabel,
    createdByLabel,
    fallbackManagerData: managerData,
  });

  if (!text) return null;

  return (
    <p className={`flex items-center gap-1.5 text-xs text-slate-500 ${className}`}>
      <Clock className="w-3 h-3 shrink-0" />
      <span>{text}</span>
    </p>
  );
}