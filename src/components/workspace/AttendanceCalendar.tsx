import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import type { AttendanceRecord } from '../../store/useAppStore';

export interface AttendanceCalendarProps {
  records: AttendanceRecord[];
}

export default function AttendanceCalendar({ records }: AttendanceCalendarProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const totalDays = new Date(year, month + 1, 0).getDate();
  
  const days = Array.from({ length: totalDays }).map((_, i) => {
    const day = i + 1;
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });

  const statusMap = records.reduce<Record<string, string>>((acc, record) => {
    if (record.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
      acc[record.date] = record.status;
    }
    return acc;
  }, {});

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = now.toISOString().split('T')[0];

  const getStatusStyle = (status: string | undefined, isWeekend: boolean, isFuture: boolean) => {
    if (isFuture) {
      return 'bg-slate-50 text-slate-300';
    }
    switch (status) {
      case 'present':
        return 'bg-emerald-50 text-emerald-800 font-extrabold hover:bg-emerald-100/75';
      case 'absent':
        return 'bg-red-50 text-red-800 font-extrabold hover:bg-red-100/75';
      case 'on_leave':
        return 'bg-amber-50 text-amber-800 font-extrabold hover:bg-amber-100/75';
      default:
        return isWeekend 
          ? 'bg-slate-100 text-slate-400 font-medium' 
          : 'bg-white text-slate-500 hover:bg-slate-50 font-medium';
    }
  };

  const getStatusTooltip = (status: string | undefined) => {
    switch (status) {
      case 'present': return 'Present';
      case 'absent': return 'Absent';
      case 'on_leave': return 'On Leave';
      default: return 'Not Marked';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <span>Active Calendar Board</span>
          <span className="text-xs font-semibold text-slate-400 normal-case">
            ({now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})
          </span>
        </h4>
        <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          <button className="px-2.5 py-1 text-[10px] font-extrabold text-slate-600 bg-white rounded shadow-sm cursor-pointer">Today</button>
        </div>
      </div>

      {/* Structured grid with outer border and inner divider grid lines */}
      <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200/80 text-center py-2.5">
          {dayNames.map((d) => (
            <div key={d} className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-150 border-t -mt-[1px] -ml-[1px]">
          {/* Offset empty days */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square bg-slate-50/50" />
          ))}

          {/* Actual days */}
          {days.map((dateStr, i) => {
            const dayNum = i + 1;
            const status = statusMap[dateStr];
            const isToday = dateStr === today;
            const isFuture = new Date(dateStr) > now;
            const dateObj = new Date(dateStr);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

            return (
              <motion.div
                key={dateStr}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.01, duration: 0.15 }}
                className={cn(
                  'aspect-square flex flex-col justify-between p-2.5 text-xs transition-all relative cursor-default border-slate-200/60',
                  getStatusStyle(status, isWeekend, isFuture),
                  isToday && 'ring-2 ring-primary-500 ring-inset z-10 font-black'
                )}
                title={`${dateStr}: ${isFuture ? 'Upcoming' : getStatusTooltip(status)}`}
              >
                <span className="font-extrabold">{dayNum}</span>
                {status && (
                  <span className="block text-[8px] font-black uppercase tracking-widest text-right mt-1">
                    {status === 'on_leave' ? 'Leave' : status}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Legend blocks */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
        {[
          { label: 'Present Today', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
          { label: 'Absent Today', color: 'bg-red-50 border-red-200 text-red-800' },
          { label: 'Approved Leave', color: 'bg-amber-50 border-amber-200 text-amber-800' },
          { label: 'Weekend / Off', color: 'bg-slate-100 border-slate-200 text-slate-500' }
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className={cn('w-3.5 h-3.5 rounded border shadow-sm', item.color.split(' ').shift(), item.color.split(' ')[1])} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
