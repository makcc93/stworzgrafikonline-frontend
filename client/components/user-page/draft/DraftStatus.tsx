/**
 * DraftStatus Component
 * Displays draft completion status
 * Follows SRP - single responsibility for showing status
 */

import { type DraftStatus } from '@/types';

interface DraftStatusProps {
  status: DraftStatus;
}

export function DraftStatus({ status }: DraftStatusProps) {
  return (
    <div
      className={`rounded-xl p-6 border ${
        status.ready
          ? 'bg-green-900/30 border-green-700/50'
          : 'bg-orange-900/30 border-orange-700/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${status.ready ? 'bg-green-500' : 'bg-orange-500'}`}
        ></div>
        <div>
          <h3 className={`font-bold text-lg ${status.ready ? 'text-green-300' : 'text-orange-300'}`}>
            {status.ready ? '✓ DRAFT GOTOWY' : '⚠ DRAFT NIEGOTOWY'}
          </h3>
          <p className={`text-sm ${status.ready ? 'text-green-200' : 'text-orange-200'}`}>
            {status.message}
          </p>
        </div>
      </div>
    </div>
  );
}