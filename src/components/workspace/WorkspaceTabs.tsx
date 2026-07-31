import { NavLink, useParams } from 'react-router-dom';
import { CalendarRange, ClipboardList, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function WorkspaceTabs() {
  const { stateId, trainerId } = useParams();
  const basePath = `/dashboard/state/${stateId}/trainer/${trainerId}`;

  const tabs = [
    { id: 'daily-log', label: 'Daily Field Log', path: 'daily-log', icon: CalendarRange },
    { id: 'calendar', label: 'Schedule Monthly Calendar', path: 'calendar', icon: Calendar }
  ];

  return (
    <>
      {/* Desktop tabs — clean bordered tab bar */}
      <nav className="hidden md:flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {tabs.map((tab, idx) => (
          <NavLink
            key={tab.id}
            to={`${basePath}/${tab.path}`}
            className={({ isActive }) => cn(
              'relative flex items-center gap-2.5 px-6 py-3.5 text-base font-extrabold transition-all border-b-2',
              idx > 0 && 'border-l border-l-slate-100',
              isActive
                ? 'text-red-700 border-b-red-600 bg-red-50/40'
                : 'text-slate-500 border-b-transparent hover:text-slate-800 hover:bg-slate-50'
            )}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-2 py-2 shadow-lg">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => (
            <NavLink
              key={tab.id}
              to={`${basePath}/${tab.path}`}
              className={({ isActive }) => cn(
                'relative flex flex-col items-center gap-1 py-2 px-3 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-colors',
                isActive
                  ? 'text-red-600 bg-red-50'
                  : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
