/**
 * DraftArray – Wersja uproszczona (tylko tablica i kopiowanie)
 */
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface DraftArrayProps {
  draft: number[];
}

export function DraftArray({ draft }: DraftArrayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const jsonString = JSON.stringify(draft);
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/50 rounded-xl p-6 space-y-4 border border-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Tablica Grafiku</h3>

        <button
          onClick={copyToClipboard}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg flex items-center gap-2 transition-colors"
        >
          {copied ? (
            <><Check className="w-3 h-3 text-emerald-400" /> Skopiowano!</>
          ) : (
            <><Copy className="w-3 h-3" /> Kopiuj</>
          )}
        </button>
      </div>

      <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm text-cyan-400 border border-slate-800">
        [{draft.join(', ')}]
      </div>

      <p className="text-slate-500 text-xs italic">
        Ta tablica reprezentuje wymaganą liczbę pracowników dla każdej godziny dnia (0-23).
      </p>
    </div>
  );
}