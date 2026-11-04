import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Calendar } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import Vacations from './Vacations';
import Delegations from './Delegations';
import EmployeeProposals from './EmployeeProposals';
import YourDraft from './YourDraft';

type ChecklistItem = 'vacations' | 'delegations' | 'proposals' | 'draft';

export default function SchedulePreparation() {
  const { draftYear } = useAppContext();
  const [checkedItems, setCheckedItems] = useState<Set<ChecklistItem>>(new Set());
  const [expandedSection, setExpandedSection] = useState<ChecklistItem | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const currentMonth = new Date().getMonth();
  const currentMonthName = months[currentMonth];

  const items: Array<{
    id: ChecklistItem;
    label: string;
    description: string;
  }> = [
    {
      id: 'vacations',
      label: 'Urlopy',
      description: 'Przejrzyj i zatwierdź urlopy pracowników',
    },
    {
      id: 'delegations',
      label: 'Delegacje/nieobecności',
      description: 'Przejrzyj i zatwierdź delegacje oraz nieobecności pracowników',
    },
    {
      id: 'proposals',
      label: 'Propozycje pracowników',
      description: 'Przejrzyj propozycje zmian grafiku',
    },
    {
      id: 'draft',
      label: `Draft na ${currentMonthName}`,
      description: 'Przygotuj draft grafiku na bieżący miesiąc',
    },
  ];

  const toggleCheck = (id: ChecklistItem) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
    setExpandedSection(id);
  };

  const isAllChecked = checkedItems.size === items.length;

  const handleProceed = () => {
    if (isAllChecked) {
      // Navigate to schedule creation
      // This would navigate to a month selection screen or directly open schedule editor
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Przygotowanie Grafiku</h2>
            <p className="text-slate-400 text-sm">
              Przejrzyj wszystkie sekcje przed utworzeniem nowego grafiku
            </p>
          </div>
        </div>
      </div>

      {/* Checklist Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white px-4">
          Lista kontrolna
        </h3>

        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
              {/* Checklist Item Header */}
              <button
                onClick={() => toggleCheck(item.id)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-700/30 transition-colors"
              >
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    checkedItems.has(item.id)
                      ? 'bg-green-600 border-green-600'
                      : 'border-slate-500'
                  }`}
                >
                  {checkedItems.has(item.id) && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </div>

                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-white text-lg">
                    {item.label}
                  </h4>
                  <p className="text-slate-400 text-sm">{item.description}</p>
                </div>

                <div
                  className={`flex-shrink-0 text-sm font-medium px-3 py-1 rounded-full ${
                    checkedItems.has(item.id)
                      ? 'bg-green-600/30 text-green-300'
                      : 'bg-slate-700/50 text-slate-400'
                  }`}
                >
                  {checkedItems.has(item.id) ? '✓ Zatwierdzono' : 'Przeglądaj'}
                </div>
              </button>

              {/* Content Section */}
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: expandedSection === item.id ? 'auto' : 0,
                  opacity: expandedSection === item.id ? 1 : 0,
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden border-t border-slate-700"
              >
                <div className="p-6 bg-slate-800/30">
                  {item.id === 'vacations' && <Vacations />}
                  {item.id === 'delegations' && <Delegations />}
                  {item.id === 'proposals' && <EmployeeProposals />}
                  {item.id === 'draft' && <YourDraft />}
                </div>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Proceed Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="sticky bottom-0 py-4 px-4 bg-gradient-to-t from-slate-900 to-transparent"
      >
        <button
          onClick={handleProceed}
          disabled={!isAllChecked}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
            isAllChecked
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/50 cursor-pointer hover:scale-105 active:scale-95'
              : 'bg-slate-700/50 text-slate-400 cursor-not-allowed opacity-50'
          }`}
        >
          <Check className="w-5 h-5" />
          Przejdź do tworzenia grafiku
        </button>
        {!isAllChecked && (
          <p className="text-slate-400 text-sm text-center mt-2">
            Zaznacz wszystkie sekcje, aby odblokować przycisk
          </p>
        )}
      </motion.div>
    </div>
  );
}