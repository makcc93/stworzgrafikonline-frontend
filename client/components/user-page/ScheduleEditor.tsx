import { useState } from 'react';
import { X, Check, Calendar, Plus } from 'lucide-react';

interface ScheduleEditorProps {
  month: string;
  year: number;
  storeId: string;
  monthId: string;
  onClose: () => void;
  onCreateSchedule: (data: ScheduleData) => void;
  onGoToDraft: () => void;
  draftExists: boolean;
  draftData?: number[];
}

export interface ScheduleData {
  draft: number[];
  vacations: string[];
  employeeProposals: string;
  monthSettings: Record<string, string>;
}

type TabType = 'draft' | 'vacations' | 'proposals' | 'settings';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ScheduleEditor({
  month,
  year,
  storeId,
  monthId,
  onClose,
  onCreateSchedule,
  onGoToDraft,
  draftExists,
  draftData: initialDraftData,
}: ScheduleEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('draft');
  const [confirmed, setConfirmed] = useState<Record<TabType, boolean>>({
    draft: draftExists ? true : false,
    vacations: false,
    proposals: false,
    settings: false,
  });

  // Draft state
  const [draftData] = useState<number[]>(initialDraftData ?? Array(24).fill(0));
  const [showDraftViewer, setShowDraftViewer] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  // Vacations state
  const [vacationsList, setVacationsList] = useState<string[]>(['John Smith', 'Jane Doe', 'Mike Johnson']);
  const [vacationDays, setVacationDays] = useState<Record<string, Set<number>>>({});
  
  // Proposals state
  const [proposals, setProposals] = useState<string>('');
  
  // Settings state
  const [monthSettings, setMonthSettings] = useState({
    minStaffDaily: '',
    maxStaffDaily: '',
    restDays: '',
    specialNotes: '',
  });

  const handleGoToDraft = () => {
    onGoToDraft();
  };

  const handleVacationsConfirm = () => {
    setConfirmed({ ...confirmed, vacations: true });
  };

  const handleProposalsConfirm = () => {
    setConfirmed({ ...confirmed, proposals: true });
  };

  const handleSettingsConfirm = () => {
    setConfirmed({ ...confirmed, settings: true });
  };

  const allConfirmed = Object.values(confirmed).every((val) => val === true);

  const handleCreateSchedule = () => {
    if (!allConfirmed) return;
    
    const vacationsArray = Object.entries(vacationDays).flatMap(([employee, days]) =>
      Array.from(days).map((day) => `${employee}: Day ${day}`)
    );

    onCreateSchedule({
      draft: draftData,
      vacations: vacationsArray,
      employeeProposals: proposals,
      monthSettings,
    });
  };

  const canAccessTab = (tabId: TabType) => {
    if (tabId === 'draft') return true;
    if (tabId === 'vacations') return confirmed.draft;
    if (tabId === 'proposals') return confirmed.vacations;
    if (tabId === 'settings') return confirmed.proposals;
    return false;
  };

  const tabs = [
    { id: 'draft' as const, label: 'Draft' },
    { id: 'vacations' as const, label: 'Vacations' },
    { id: 'proposals' as const, label: 'Employee Proposal Shifts' },
    { id: 'settings' as const, label: 'Specific month settings' },
  ];

  const daysInMonth = new Date(year, MONTHS.indexOf(month) + 1, 0).getDate();

  const toggleVacationDay = (employee: string, day: number) => {
    setVacationDays((prev) => {
      const employeeDays = prev[employee] || new Set();
      const newDays = new Set(employeeDays);
      if (newDays.has(day)) {
        newDays.delete(day);
      } else {
        newDays.add(day);
      }
      return {
        ...prev,
        [employee]: newDays,
      };
    });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl shadow-slate-900/50 w-full h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">{month} {year}</h2>
            <p className="text-slate-400 text-sm">Create and configure your schedule</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 pt-6 border-b border-slate-700 overflow-x-auto">
        {tabs.map(({ id, label }) => {
          const isAccessible = canAccessTab(id);
          const isActive = activeTab === id;
          
          return (
            <button
              key={id}
              onClick={() => isAccessible && setActiveTab(id)}
              disabled={!isAccessible}
              className={`flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap rounded-t-lg border-b-2 transition-all ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-slate-700/20'
                  : isAccessible
                    ? 'border-transparent text-slate-400 hover:text-slate-300 cursor-pointer'
                    : 'border-transparent text-slate-600 opacity-50 cursor-not-allowed'
              }`}
            >
              {label}
              {confirmed[id] && <Check className="w-4 h-4 text-green-400" />}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'draft' && (
          <div className="space-y-6">
            {draftExists ? (
              <>
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Check className="w-6 h-6 text-green-400" />
                    <h3 className="text-xl font-bold text-green-300">DRAFT COMPLETED</h3>
                  </div>
                  <p className="text-green-200 text-sm">
                    A draft for {month} {year} has been created. You can view it by clicking the button below.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDraftViewer(true)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
                  >
                    SEE DRAFT FOR {month.toUpperCase()} {year}
                  </button>
                  <button
                    onClick={handleGoToDraft}
                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all hover:scale-105 active:scale-95"
                  >
                    CHANGE DRAFT
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-orange-900/30 border border-orange-700/50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <X className="w-6 h-6 text-orange-400" />
                    <h3 className="text-xl font-bold text-orange-300">DRAFT NOT COMPLETED</h3>
                  </div>
                  <p className="text-orange-200 text-sm">
                    You need to create a draft for {month} {year} before proceeding.
                  </p>
                </div>

                <button
                  onClick={handleGoToDraft}
                  className="w-full px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg font-bold transition-all hover:scale-105 active:scale-95"
                >
                  GO FOR DRAFT {month.toUpperCase()} {year}
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'vacations' && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Manage employee vacations for {month}. Click "+" to mark a day off for an employee.
            </p>
            
            <div className="overflow-x-auto bg-slate-700/30 rounded-lg">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-800/50">
                    <th className="border border-slate-600 p-2 text-left text-slate-300 font-medium sticky left-0 bg-slate-800/50">Employee</th>
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <th key={i} className="border border-slate-600 p-2 text-center text-slate-300 font-medium text-sm w-8">
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vacationsList.map((employee) => (
                    <tr key={employee}>
                      <td className="border border-slate-600 p-2 text-slate-300 font-medium sticky left-0 bg-slate-800/30 whitespace-nowrap">
                        {employee}
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const isVacation = vacationDays[employee]?.has(day);
                        return (
                          <td key={day} className="border border-slate-600 p-1 text-center">
                            <button
                              onClick={() => toggleVacationDay(employee, day)}
                              className={`w-full h-8 rounded transition-all text-sm font-medium ${
                                isVacation
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                              }`}
                            >
                              {isVacation ? '✓' : '+'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleVacationsConfirm}
              className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                confirmed.vacations
                  ? 'bg-green-600/30 text-green-400 border border-green-600/50'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95'
              }`}
            >
              {confirmed.vacations ? (
                <>
                  <Check className="w-4 h-4" />
                  Vacations Confirmed
                </>
              ) : (
                'Confirm Vacations'
              )}
            </button>
          </div>
        )}

        {activeTab === 'proposals' && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Review and manage employee shift proposals for {month}.
            </p>
            <div className="bg-slate-700/30 rounded-lg p-4">
              <label className="text-slate-400 text-sm font-medium">Employee Proposals</label>
              <textarea
                value={proposals}
                onChange={(e) => setProposals(e.target.value)}
                placeholder="Add employee shift proposals here..."
                className="w-full mt-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32"
              />
            </div>
            <button
              onClick={handleProposalsConfirm}
              className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                confirmed.proposals
                  ? 'bg-green-600/30 text-green-400 border border-green-600/50'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95'
              }`}
            >
              {confirmed.proposals ? (
                <>
                  <Check className="w-4 h-4" />
                  Proposals Confirmed
                </>
              ) : (
                'Confirm Proposals'
              )}
            </button>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Configure specific settings for {month}.
            </p>
            <div className="grid grid-cols-2 gap-4 bg-slate-700/30 rounded-lg p-4">
              <div>
                <label className="text-slate-400 text-sm font-medium">Min Staff Daily</label>
                <input
                  type="number"
                  value={monthSettings.minStaffDaily}
                  onChange={(e) => setMonthSettings({ ...monthSettings, minStaffDaily: e.target.value })}
                  placeholder="e.g., 3"
                  className="w-full mt-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm font-medium">Max Staff Daily</label>
                <input
                  type="number"
                  value={monthSettings.maxStaffDaily}
                  onChange={(e) => setMonthSettings({ ...monthSettings, maxStaffDaily: e.target.value })}
                  placeholder="e.g., 10"
                  className="w-full mt-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="text-slate-400 text-sm font-medium">Rest Days</label>
                <input
                  type="text"
                  value={monthSettings.restDays}
                  onChange={(e) => setMonthSettings({ ...monthSettings, restDays: e.target.value })}
                  placeholder="e.g., Sundays, holidays"
                  className="w-full mt-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="text-slate-400 text-sm font-medium">Special Notes</label>
                <textarea
                  value={monthSettings.specialNotes}
                  onChange={(e) => setMonthSettings({ ...monthSettings, specialNotes: e.target.value })}
                  placeholder="Any special notes for this month..."
                  className="w-full mt-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-20"
                />
              </div>
            </div>
            <button
              onClick={handleSettingsConfirm}
              className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                confirmed.settings
                  ? 'bg-green-600/30 text-green-400 border border-green-600/50'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95'
              }`}
            >
              {confirmed.settings ? (
                <>
                  <Check className="w-4 h-4" />
                  Settings Confirmed
                </>
              ) : (
                'Confirm Settings'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 p-6 border-t border-slate-700 bg-slate-900/50">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateSchedule}
          disabled={!allConfirmed}
          className={`flex-1 px-4 py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all ${
            allConfirmed
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:scale-105 active:scale-95'
              : 'bg-slate-600 opacity-50 cursor-not-allowed'
          }`}
        >
          <Check className="w-5 h-5" />
          CREATE SCHEDULE
        </button>
      </div>

      {/* Draft Viewer Modal */}
      {showDraftViewer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-900/50">
              <h3 className="text-xl font-bold text-white">View Draft - {month} {year}</h3>
              <button
                onClick={() => setShowDraftViewer(false)}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
              <div>
                <p className="text-slate-300 text-sm mb-4">Select a day to view draft details:</p>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setSelectedDay(i + 1)}
                      className={`p-3 rounded-lg font-medium transition-all ${
                        selectedDay === i + 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              {selectedDay && (
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <p className="text-slate-300 text-sm mb-4">
                    Draft for {month} {selectedDay}, {year}:
                  </p>
                  <div className="bg-slate-900/30 rounded-lg p-4">
                    <p className="text-slate-400 text-xs mb-2">Hourly Staff Requirements:</p>
                    <p className="text-white font-mono text-sm break-all">
                      {draftData.join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-700 bg-slate-900/50">
              <button
                onClick={() => setShowDraftViewer(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}