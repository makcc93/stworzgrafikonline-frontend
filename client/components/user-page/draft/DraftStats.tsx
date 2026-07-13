/**
 * DraftStats Component
 * Displays comprehensive draft statistics
 * Shows total demand, peak hours, averages, and distribution info
 */

interface DraftStatsProps {
  draft: number[];
}

export function DraftStats({ draft }: DraftStatsProps) {
  // Calculate statistics
  const getTotalDemand = () => draft.reduce((sum, val) => sum + val, 0);

  const getMaxValue = () => Math.max(...draft, 0);

  const getMinValue = () => {
    const nonZero = draft.filter((val) => val > 0);
    return nonZero.length > 0 ? Math.min(...nonZero) : 0;
  };

  const getPeakHours = () => {
    const maxVal = getMaxValue();
    if (maxVal === 0) return null;

    const peakIndices = draft
      .map((val, idx) => (val === maxVal ? idx : -1))
      .filter((idx) => idx !== -1);

    if (peakIndices.length === 0) return null;

    return {
      start: peakIndices[0],
      end: peakIndices[peakIndices.length - 1],
      value: maxVal,
    };
  };

  const getAveragePerHour = () => {
    const total = getTotalDemand();
    return Math.round((total / 24) * 10) / 10;
  };

  const getStaffedHours = () => draft.filter((val) => val > 0).length;

  // Get stats
  const totalDemand = getTotalDemand();
  const maxValue = getMaxValue();
  const minValue = getMinValue();
  const avgPerHour = getAveragePerHour();
  const staffedHours = getStaffedHours();
  const peakHours = getPeakHours();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* Card 1: Total Demand */}
      <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border border-blue-700/50 rounded-lg p-4 hover:shadow-md hover:shadow-blue-500/20 transition-shadow">
        <p className="text-slate-400 text-xs mb-1">Suma Zapotrzebowania</p>
        <p className="text-2xl font-bold text-blue-300">{totalDemand}</p>
        <p className="text-xs text-slate-500 mt-1">godzin</p>
      </div>

      {/* Card 2: Peak Hours */}
      <div className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/30 border border-cyan-700/50 rounded-lg p-4 hover:shadow-md hover:shadow-cyan-500/20 transition-shadow">
        <p className="text-slate-400 text-xs mb-1">Godziny Szczytu</p>
        <p className="text-sm font-bold text-cyan-300">
          {peakHours ? (
            <>
              {peakHours.start.toString().padStart(2, '0')}:00 -{' '}
              {(peakHours.end + 1).toString().padStart(2, '0')}:00
            </>
          ) : (
            'Brak'
          )}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {peakHours ? `${peakHours.value} pracowników` : 'Nie zdefiniowano'}
        </p>
      </div>

      {/* Card 3: Average Per Hour */}
      <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/30 border border-emerald-700/50 rounded-lg p-4 hover:shadow-md hover:shadow-emerald-500/20 transition-shadow">
        <p className="text-slate-400 text-xs mb-1">Średnia / Godzinę</p>
        <p className="text-2xl font-bold text-emerald-300">{avgPerHour}</p>
        <p className="text-xs text-slate-500 mt-1">pracowników</p>
      </div>

      {/* Card 4: Staffed Hours */}
      <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/30 border border-amber-700/50 rounded-lg p-4 hover:shadow-md hover:shadow-amber-500/20 transition-shadow">
        <p className="text-slate-400 text-xs mb-1">Godziny z Obsadą</p>
        <p className="text-2xl font-bold text-amber-300">{staffedHours}</p>
        <p className="text-xs text-slate-500 mt-1">z 24 godzin</p>
      </div>

      {/* Card 5: Min / Max */}
      <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 border border-purple-700/50 rounded-lg p-4 hover:shadow-md hover:shadow-purple-500/20 transition-shadow">
        <p className="text-slate-400 text-xs mb-1">Min / Max</p>
        <p className="text-2xl font-bold text-purple-300">
          {minValue} / {maxValue}
        </p>
        <p className="text-xs text-slate-500 mt-1">pracowników</p>
      </div>
    </div>
  );
}