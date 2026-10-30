import { useState } from 'react';
import { Play, Info } from 'lucide-react';
import { toast } from 'sonner';
import { workingNormService, holidayService } from '@/services/api-provider';
import type { WorkingNormInitializationResponse } from '@/types/working-norm.types';
import type { HolidayInitializationResponse } from '@/types/holiday.types';

/**
 * Zakładka jednorazowej inicjalizacji (lata 2001–2099): normy godzinowe oraz dni wolne.
 *
 * Obie operacje są bezpieczne do powtórzenia:
 *  - normy: backend dodaje tylko BRAKUJĄCE miesiące i nie nadpisuje zapisanych (także zmienionych ręcznie),
 *  - dni wolne: backend uzupełnia tylko lata, które nie mają jeszcze żadnych wpisów.
 *
 * Po wykonaniu inicjalizacji ten plik można usunąć razem z wpisem 'initialize'
 * w AdminPanel.tsx (typ Tab, lista zakładek, etykieta i blok renderowania).
 * Inicjalizację dni wolnych najlepiej wykonać PRZED normami (domyślna norma korzysta z dni wolnych).
 */
export default function InitializeNormsTab() {
  const [loadingNorms, setLoadingNorms] = useState(false);
  const [normsResult, setNormsResult] = useState<WorkingNormInitializationResponse | null>(null);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [holidaysResult, setHolidaysResult] = useState<HolidayInitializationResponse | null>(null);

  const handleInitializeNorms = async () => {
    try {
      setLoadingNorms(true);
      const response = await workingNormService.initialize();
      setNormsResult(response);
      toast.success(`Zainicjalizowano normy: dodano ${response.created}, pominięto ${response.skipped}`);
    } catch (error: any) {
      console.error('Error initializing working norms:', error);
      toast.error(error.message || 'Nie udało się zainicjalizować norm godzinowych');
    } finally {
      setLoadingNorms(false);
    }
  };

  const handleInitializeHolidays = async () => {
    try {
      setLoadingHolidays(true);
      const response = await holidayService.initialize();
      setHolidaysResult(response);
      toast.success(
        `Zainicjalizowano dni wolne: ${response.initializedYears} lat, dodano ${response.createdHolidays} dni`
      );
    } catch (error: any) {
      console.error('Error initializing holidays:', error);
      toast.error(error.message || 'Nie udało się zainicjalizować dni wolnych');
    } finally {
      setLoadingHolidays(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-8">
      {/* ── Dni wolne ── */}
      <section className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300">
            Zapisuje w bazie święta z biblioteki kalendarza dla wszystkich lat 2001–2099. Lata, które mają już
            jakiekolwiek wpisy (np. edytowane ręcznie), nie są ruszane, więc operację można bezpiecznie powtórzyć.
            Po inicjalizacji dni wolne edytujesz w zakładce „Dni wolne”.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 py-2">
          <button
            onClick={handleInitializeHolidays}
            disabled={loadingHolidays}
            className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold tracking-wide rounded-lg flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            {loadingHolidays ? 'INICJALIZOWANIE...' : 'INICJALIZUJ DNI WOLNE'}
          </button>

          {holidaysResult && (
            <p className="text-sm text-slate-300">
              Uzupełniono <span className="text-green-400 font-semibold">{holidaysResult.initializedYears}</span> lat
              (dodano <span className="text-green-400 font-semibold">{holidaysResult.createdHolidays}</span> dni),
              pominięto <span className="text-slate-400 font-semibold">{holidaysResult.skippedYears}</span> lat z wpisami.
            </p>
          )}
        </div>
      </section>

      <div className="border-t border-slate-700" />

      {/* ── Normy godzinowe ── */}
      <section className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300">
            Wczytuje domyślne normy godzinowe (dni robocze × 8 h, z uwzględnieniem dni wolnych) dla wszystkich miesięcy
            w latach 2001–2099. Istniejące normy — w tym zmienione ręcznie — nie są nadpisywane, więc operację
            można bezpiecznie powtórzyć. Po inicjalizacji normy edytujesz w zakładce „Normy godzinowe”.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 py-2">
          <button
            onClick={handleInitializeNorms}
            disabled={loadingNorms}
            className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold tracking-wide rounded-lg flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            {loadingNorms ? 'INICJALIZOWANIE...' : 'INICJALIZUJ'}
          </button>

          {normsResult && (
            <p className="text-sm text-slate-300">
              Dodano <span className="text-green-400 font-semibold">{normsResult.created}</span> miesięcy,
              pominięto <span className="text-slate-400 font-semibold">{normsResult.skipped}</span> (już istniały).
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
