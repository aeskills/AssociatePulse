import { useParams, useLocation } from 'react-router-dom';
import { ChevronRight, User } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

export default function Breadcrumbs() {
  const { trainerId } = useParams();
  const location = useLocation();
  const activeTrainerId = useAppStore(s => s.activeTrainerId);
  const trainers = useAppStore(s => s.trainers);

  const trainer = trainers.find(t => t.id === (trainerId || activeTrainerId || 't13')) || trainers[0];

  const pathParts = location.pathname.split('/').filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];

  const getTabLabel = (part: string) => {
    switch (part) {
      case 'attendance':
        return 'Attendance';
      case 'daily-log':
        return 'Daily Field Log';
      case 'calendar':
        return 'Schedule Monthly Calendar';
      default:
        return part;
    }
  };

  return (
    <nav className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-400 leading-none">
      <div className="flex items-center gap-1 text-slate-600 font-extrabold flex-shrink-0">
        <User size={13} className="text-primary-600" />
        <span>{trainer.name} ({trainer.district})</span>
      </div>

      {lastPart && lastPart !== trainer.id && (
        <>
          <ChevronRight size={10} className="text-slate-300 flex-shrink-0" />
          <span className="text-slate-400 capitalize truncate max-w-[120px] flex-shrink-0 flex items-center">
            {getTabLabel(lastPart)}
          </span>
        </>
      )}
    </nav>
  );
}
