import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { storageUtils } from '@/utils/storage';
import ScheduleEditor, { ScheduleData } from '@/components/user-page/ScheduleEditor';

export default function ScheduleEditorPage() {
  const { storeId, monthId, year } = useParams<{ storeId: string; monthId: string; year: string }>();
  const navigate = useNavigate();
  const [draftExists, setDraftExists] = useState(false);
  const [draftData, setDraftData] = useState<number[] | undefined>();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const monthIndex = monthId ? parseInt(monthId) - 1 : 0;
  const monthName = months[monthIndex] || 'Unknown';
  const yearNum = year ? parseInt(year) : new Date().getFullYear();

  // Check if draft exists (will fetch from API later)
  useEffect(() => {
    // TODO: Replace with API call to /api/drafts/{storeId}/{monthId}/{year}
    const storedDraft = localStorage.getItem(`draft_${storeId}_${monthId}_${yearNum}`);
    if (storedDraft) {
      try {
        const parsed = JSON.parse(storedDraft);
        setDraftData(parsed);
        setDraftExists(true);
      } catch {
        setDraftExists(false);
      }
    } else {
      setDraftExists(false);
    }
  }, [storeId, monthId, yearNum]);

  const handleClose = () => {
    navigate(-1);
  };

  const handleGoToDraft = () => {
    // Navigate to UserPage with draft tab selected and month/year set
    // Store state in sessionStorage to restore after navigation
    sessionStorage.setItem(
      'draftTabState',
      JSON.stringify({
        activeTab: 'draft',
        monthId: parseInt(monthId || '1'),
        year: yearNum,
      })
    );
    navigate('/');
  };

  const handleCreateSchedule = (data: ScheduleData) => {
    localStorage.setItem(`schedule_${storeId}_${monthId}_${year}`, JSON.stringify(data));
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-6xl h-[85vh] overflow-auto">
        <ScheduleEditor
          month={monthName}
          year={yearNum}
          storeId={storeId || 'store-1'}
          monthId={monthId || '1'}
          onClose={handleClose}
          onCreateSchedule={handleCreateSchedule}
          onGoToDraft={handleGoToDraft}
          draftExists={draftExists}
          draftData={draftData}
        />
      </div>
    </div>
  );
}
