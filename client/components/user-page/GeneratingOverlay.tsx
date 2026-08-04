import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Cpu, Download, Check } from 'lucide-react';

// ---------------------------------------------------------------------------
// Typy
// ---------------------------------------------------------------------------

export type GenerationStage = 'db' | 'algorithm' | 'export';

interface StageDef {
  key: GenerationStage;
  label: string;
  message: string;
  icon: React.ReactNode;
}

const STAGES: StageDef[] = [
  {
    key: 'db',
    label: 'Baza danych',
    message: 'Tworzenie grafiku w bazie…',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
        <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      </svg>
    ),
  },
  {
    key: 'algorithm',
    label: 'Algorytm',
    message: 'Uruchamianie algorytmu…',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
      </svg>
    ),
  },
  {
    key: 'export',
    label: 'Eksport',
    message: 'Pobieranie pliku…',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];

const STAGE_INDEX: Record<GenerationStage, number> = { db: 0, algorithm: 1, export: 2 };

// ---------------------------------------------------------------------------
// Animacja "budowania" grafiku — siatka komórek (dni), w których pojawiają
// się paski zmian i kropki-pracownicy, plus przesuwający się blask.
// Czysto dekoracyjna, kolorystyka zielona/emerald zgodna z marką.
// ---------------------------------------------------------------------------

function CalendarBuild() {
  const cells = useMemo(() => Array.from({ length: 28 }, (_, i) => i), []);

  return (
    <div className="relative bg-slate-950/50 border border-slate-700/50 rounded-xl p-3.5 overflow-hidden">
      <motion.div
        className="absolute top-0 bottom-0 w-16 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.16), transparent)' }}
        animate={{ left: ['-20%', '110%'] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative grid grid-cols-7 gap-[5px]">
        {cells.map((i) => (
          <div
            key={i}
            className="relative aspect-square rounded-[5px] bg-slate-700/35 border border-slate-600/40 overflow-hidden"
          >
            <motion.span
              className="absolute top-[3px] left-[3px] w-1 h-1 rounded-full bg-emerald-300"
              style={{ boxShadow: '0 0 6px 1px rgba(110,231,183,0.7)' }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.4] }}
              transition={{
                duration: 3.6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.09,
                times: [0, 0.22, 0.82, 1],
              }}
            />
            <motion.span
              className="absolute left-[2px] right-[2px] bottom-[2px] h-[3px] rounded-full origin-left"
              style={{ background: 'linear-gradient(90deg,#16a34a,#10b981)' }}
              animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
              transition={{
                duration: 3.6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.09,
                times: [0, 0.18, 0.88, 1],
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GeneratingOverlayProps {
  /** Aktualny, realny etap procesu generowania (sterowany przez wywołujący komponent) */
  stage: GenerationStage;
}

export default function GeneratingOverlay({ stage }: GeneratingOverlayProps) {
  const activeIndex = STAGE_INDEX[stage];
  const activeMessage = STAGES[activeIndex].message;

  return (
    <div className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-xs">
        <p className="text-white font-medium text-sm text-center mb-1">Generowanie grafiku</p>

        <div className="h-[18px] relative mb-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={activeMessage}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="text-slate-400 text-xs text-center absolute inset-0"
            >
              {activeMessage}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Etapy */}
        <div className="flex items-center mb-6 px-1.5">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 w-16 flex-shrink-0">
                <motion.div
                  className={`relative w-9 h-9 rounded-xl flex items-center justify-center border transition-colors duration-500 ${
                    i < activeIndex
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                      : i === activeIndex
                      ? 'bg-gradient-to-br from-green-600 to-emerald-500 border-transparent text-white'
                      : 'bg-slate-700/50 border-slate-600/60 text-slate-500'
                  }`}
                  animate={
                    i === activeIndex
                      ? {
                          boxShadow: [
                            '0 0 0 4px rgba(16,185,129,0.15), 0 0 18px rgba(16,185,129,0.55)',
                            '0 0 0 7px rgba(16,185,129,0.06), 0 0 26px rgba(16,185,129,0.75)',
                            '0 0 0 4px rgba(16,185,129,0.15), 0 0 18px rgba(16,185,129,0.55)',
                          ],
                        }
                      : { boxShadow: '0 0 0 0px rgba(16,185,129,0)' }
                  }
                  transition={{ duration: 1.6, repeat: i === activeIndex ? Infinity : 0, ease: 'easeInOut' }}
                >
                  {i < activeIndex ? <Check className="w-4 h-4" /> : s.icon}
                </motion.div>
                <span className={`text-[10.5px] text-center leading-tight ${i <= activeIndex ? 'text-slate-300' : 'text-slate-600'}`}>
                  {s.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="flex-1 h-0.5 rounded-full bg-slate-600/50 mb-5 mx-[-2px] overflow-hidden relative">
                  <motion.div
                    className="absolute inset-0 origin-left"
                    style={{ background: 'linear-gradient(90deg,#16a34a,#10b981)' }}
                    animate={{ scaleX: i < activeIndex ? 1 : 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <CalendarBuild />
      </div>
    </div>
  );
}
