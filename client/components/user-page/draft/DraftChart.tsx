/**
 * DraftChart – Wersja zoptymalizowana (6-23 domyślnie, duże godziny, wysoki kontrast)
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Save, AlertCircle, ChevronUp, ChevronDown, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraftChartProps {
  draft: number[];
  onSave: (values: number[]) => void;
  maxValue?: number;
  /** Godzina otwarcia sklepu (np. 9 dla 09:00). Kreska wyświetlana między (openHour-1) a openHour. */
  openHour?: number;
  /** Godzina zamknięcia sklepu (np. 20 dla 20:00). Kreska wyświetlana między (closeHour-1) a closeHour. */
  closeHour?: number;
}

export function DraftChart({ draft, onSave, maxValue, openHour, closeHour }: DraftChartProps) {
  const limit = maxValue ?? 20;
  const [localDraft, setLocalDraft] = useState<number[]>([...draft]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showNightHours, setShowNightHours] = useState(false);
  
  const [dragging, setDragging] = useState<number | null>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Synchronizacja z propsami
  useEffect(() => { 
    setLocalDraft([...draft]); 
    setHasChanges(false); 
  }, [draft]);

  // Zakres godzin: 6-22 (dzienne) lub 0-23 (pełne)
  const displayedHours = showNightHours 
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 17 }, (_, i) => i + 6);

  const setValue = useCallback((hour: number, newVal: number) => {
    const clamped = Math.max(0, Math.min(limit, Math.round(newVal)));
    setLocalDraft(prev => {
      if (prev[hour] === clamped) return prev;
      const newDraft = [...prev];
      newDraft[hour] = clamped;
      return newDraft;
    });
    setHasChanges(true);
  }, [limit]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging === null) return;
    const rect = columnRefs.current[dragging]?.getBoundingClientRect();
    if (!rect) return;
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setValue(dragging, (1 - y / rect.height) * limit);
  }, [dragging, limit, setValue]);

  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-5 border-b border-slate-700 bg-slate-900/80 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white tracking-tight">Zapotrzebowanie</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Limit: {limit} os. {hasChanges && <span className="text-amber-500 ml-2 animate-pulse">● Niezapisane</span>}
          </p>
          {(openHour !== undefined || closeHour !== undefined) && (
            <div className="flex items-center gap-3 mt-1">
              {openHour !== undefined && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <span style={{ display: 'inline-block', width: 12, borderTop: '2px dashed #34d399' }} />
                  Otwarcie {String(openHour).padStart(2, '0')}:00
                </span>
              )}
              {closeHour !== undefined && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                  <span style={{ display: 'inline-block', width: 12, borderTop: '2px dashed #f87171' }} />
                  Zamknięcie {String(closeHour).padStart(2, '0')}:00
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNightHours(!showNightHours)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border",
              showNightHours 
                ? "bg-amber-500/10 border-amber-500/50 text-amber-500" 
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
            )}
          >
            {showNightHours ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            {showNightHours ? "Ukryj godziny nocne" : "Pokaż godziny nocne"}
          </button>

          <button 
            onClick={() => { onSave(localDraft); setHasChanges(false); }}
            disabled={!hasChanges}
            className={cn("px-6 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 text-sm uppercase", 
              hasChanges 
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/20" 
                : "bg-slate-800 text-slate-500 cursor-not-allowed")}
          >
            <Save className="w-4 h-4" /> Zapisz
          </button>
        </div>
      </div>

      <div className="p-4 bg-[#020617]">
        <div className="w-full">
          {/* Wykres */}
          <div className="relative flex items-end" style={{ height: 260 }}>
            <div className="flex-1 flex items-end gap-1.5 h-full border-b-2 border-slate-800 pb-10">
              {displayedHours.map((hour, index) => {
                const value = localDraft[hour];
                const heightPct = (value / limit) * 100;
                const isNight = hour < 6 || hour > 22;

                // Kreski pionowe: wyświetlamy PRZED słupkiem danej godziny
                // openHour=9 → kreska przed indeksem godziny 9 (między 8 a 9)
                // closeHour=20 → kreska przed indeksem godziny 20 (między 19 a 20)
                const showOpenLine = openHour !== undefined && hour === openHour;
                const showCloseLine = closeHour !== undefined && hour === closeHour;

                return (
                  <div key={hour} className="flex-1 h-full flex flex-col justify-end group relative">
                    {/* Pionowa przerywana kreska otwarcia sklepu */}
                    {showOpenLine && (
                      <div
                        className="absolute left-0 top-0 bottom-10 z-10 flex flex-col items-center"
                        style={{ transform: 'translateX(-50%)' }}
                      >
                        <div
                          className="w-0 h-full"
                          style={{
                            borderLeft: '2px dashed #34d399',
                            height: '100%',
                          }}
                        />
                        <span
                          className="text-[9px] font-black text-emerald-400 whitespace-nowrap mt-1 bg-[#020617] px-1 rounded"
                          style={{ position: 'absolute', bottom: '-18px' }}
                        >
                          otw.
                        </span>
                      </div>
                    )}
                    {/* Pionowa przerywana kreska zamknięcia sklepu */}
                    {showCloseLine && (
                      <div
                        className="absolute left-0 top-0 bottom-10 z-10 flex flex-col items-center"
                        style={{ transform: 'translateX(-50%)' }}
                      >
                        <div
                          className="w-0 h-full"
                          style={{
                            borderLeft: '2px dashed #f87171',
                            height: '100%',
                          }}
                        />
                        <span
                          className="text-[9px] font-black text-red-400 whitespace-nowrap mt-1 bg-[#020617] px-1 rounded"
                          style={{ position: 'absolute', bottom: '-18px' }}
                        >
                          zam.
                        </span>
                      </div>
                    )}
                    <div
                      ref={(el) => { columnRefs.current[hour] = el; }}
                      onPointerDown={(e) => { 
                        setDragging(hour); 
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); 
                      }}
                      onPointerMove={handlePointerMove}
                      onPointerUp={(e) => { 
                        setDragging(null); 
                        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {} 
                      }}
                      className="relative w-full bg-slate-800/10 rounded-t-md cursor-ns-resize touch-none hover:bg-slate-800/20 transition-all"
                      style={{ height: '100%' }}
                    >
                      <div
                        className={cn(
                          "absolute bottom-0 left-0 right-0 rounded-t-md transition-all flex flex-col items-center",
                          dragging === hour ? "bg-cyan-400" : "bg-gradient-to-t from-blue-700 to-cyan-400"
                        )}
                        style={{ height: `${heightPct}%`, minHeight: value > 0 ? '4px' : '0' }}
                      >
                        {value > 0 && (
                          <div className="mt-1.5 px-1 py-0.5 bg-white rounded shadow-md border border-white">
                            <span className="text-[10px] font-black text-slate-900 leading-none select-none">
                              {value}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Godzina - Zgodnie z Twoją prośbą: większa i czytelniejsza */}
                    <div className={cn(
                      "text-xs font-bold text-center mt-3 font-mono transition-colors tracking-tighter",
                      isNight ? "text-amber-500 font-black" : "text-slate-500 group-hover:text-white"
                    )}>
                      {hour.toString().padStart(2, '0')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Przyciski +/- */}
          <div className="flex gap-1.5 mt-4">
            {displayedHours.map((hour) => (
              <div key={hour} className="flex-1 flex flex-col gap-1">
                <button 
                  onClick={() => setValue(hour, localDraft[hour] + 1)}
                  className="h-7 bg-slate-800/80 hover:bg-emerald-500 text-white rounded-md flex items-center justify-center border border-slate-700 transition-colors"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => setValue(hour, localDraft[hour] - 1)}
                  className="h-7 bg-slate-800/80 hover:bg-red-500 text-white rounded-md flex items-center justify-center border border-slate-700 transition-colors"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}