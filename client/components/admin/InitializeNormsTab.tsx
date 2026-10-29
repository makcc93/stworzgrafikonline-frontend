import { useState } from 'react';
import { Play, Info } from 'lucide-react';
import { toast } from 'sonner';
import { workingNormService } from '@/services/api-provider';
import type { WorkingNormInitializationResponse } from '@/types/working-norm.types';

/**
 * Zakładka jednorazowej inicjalizacji norm godzinowych (lata 2001–2099).
 *
 * Operacja jest bezpieczna do powtórzenia: backend dodaje tylko BRAKUJĄCE miesiące
 * i nie nadpisuje norm już zapisanych (w tym zmienionych ręcznie).
 *
 * Po wykonaniu inicjalizacji ten plik można usunąć razem z wpisem 'initialize'
 * w AdminPanel.tsx (typ Tab, lista zakładek, etykieta i blok renderowania).
 */
export default function InitializeNormsTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkingNormInitializationResponse | null>(null);

  const handleInitialize = async () => {
    try {
      setLoading(true);
      const response = await workingNormService.initialize();
      setResult(response);
      toast.success(`Zainicjalizowano normy: dodano ${response.created}, pominięto ${response.skipped}`);
    } catch (error: any) {
      console.error('Error initializing working norms:', error);
      toast.error(error.message || 'Nie udało się zainicjalizować norm godzinowych');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-6">
      <div className="flex items-start gap-2 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300">
          Wczytuje domyślne normy godzinowe (dni robocze × 8 h, z uwzględnieniem świąt) dla wszystkich miesięcy
          w latach 2001–2099. Istniejące normy — w tym zmienione ręcznie — nie są nadpisywane, więc operację
          można bezpiecznie powtórzyć. Po inicjalizacji normy edytujesz w zakładce „Normy godzinowe”.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 py-6">
        <button
          onClick={handleInitialize}
          disabled={loading}
          className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold tracking-wide rounded-lg flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Play className="w-5 h-5" />
          {loading ? 'INICJALIZOWANIE...' : 'INICJALIZUJ'}
        </button>

        {result && (
          <p className="text-sm text-slate-300">
            Dodano <span className="text-green-400 font-semibold">{result.created}</span> miesięcy,
            pominięto <span className="text-slate-400 font-semibold">{result.skipped}</span> (już istniały).
          </p>
        )}
      </div>
    </div>
  );
}
