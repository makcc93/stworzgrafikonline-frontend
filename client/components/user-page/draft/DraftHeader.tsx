/**
 * DraftHeader Component
 * Displays header with title and action buttons
 * Follows SRP - single responsibility for header section
 */

import { Clock, Save } from 'lucide-react';

interface DraftHeaderProps {
  onLoadSample: () => void;
  onReset: () => void;
}

export function DraftHeader({ onLoadSample, onReset }: DraftHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
          <Clock className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">DRAFT Grafiku</h2>
          <p className="text-slate-400 text-sm">Wymagania obsady na 24 godziny dnia</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        <button
          onClick={onLoadSample}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors hover:scale-105 active:scale-95"
        >
          Załaduj Przykład
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors hover:scale-105 active:scale-95"
        >
          Resetuj
        </button>
        <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm flex items-center gap-2 shadow-lg hover:shadow-blue-500/50 transition-all hover:scale-105 active:scale-95">
          <Save className="w-4 h-4" />
          Zapisz
        </button>
      </div>
    </div>
  );
}