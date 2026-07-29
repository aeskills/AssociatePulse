import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarCheck, MapPin, Clock } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import AttendanceCalendar from '../../components/workspace/AttendanceCalendar';
import { cn } from '../../lib/utils';

export default function AttendanceTab() {
  const { trainerId } = useParams();

  const attendance = useAppStore((s) => s.attendance);
  const markAttendance = useAppStore((s) => s.markAttendance);
  const checkOut = useAppStore((s) => s.checkOut);
  const getTodayAttendance = useAppStore((s) => s.getTodayAttendance);

  const todayAtt = useMemo(() => getTodayAttendance(trainerId || ''), [trainerId, getTodayAttendance, attendance]);
  const [selectedStatus, setSelectedStatus] = useState<'present' | 'absent' | 'on_leave'>('present');

  // Compute stats metrics
  const monthlyStats = useMemo(() => {
    const trainerRecords = attendance.filter(r => r.trainerId === trainerId);
    const present = trainerRecords.filter(r => r.status === 'present').length;
    const absent = trainerRecords.filter(r => r.status === 'absent').length;
    const onLeave = trainerRecords.filter(r => r.status === 'on_leave').length;
    const total = trainerRecords.length;
    const percentage = total ? Math.round((present / total) * 100) : 100;

    return { present, absent, onLeave, total, percentage };
  }, [attendance, trainerId]);

  const liveLocation = useAppStore((s) => s.liveLocation);

  const handleCheckIn = (status: 'present' | 'absent' | 'on_leave') => {
    const geo = status === 'present'
      ? (liveLocation ? { lat: liveLocation.lat, lng: liveLocation.lng } : { lat: 28.6139, lng: 77.2090 })
      : null;
    markAttendance(trainerId || '', status, geo);
  };

  const handleCheckOut = () => {
    checkOut(trainerId || '');
  };

  return (
    <div className="space-y-6">
      
      {/* Daily checkin card action */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-primary-600" />
        
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mb-2 flex items-center gap-2">
          <CalendarCheck className="text-primary-600" size={20} />
          <span>Daily Check-In Portal</span>
        </h2>
        <p className="text-xs text-slate-455 text-slate-500 font-semibold mb-6">
          Submit today's attendance status and log your check-in timestamp.
        </p>

        {!todayAtt ? (
          <div className="space-y-5 text-left">
            {/* Status Tabs Selector */}
            <div>
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                Select Today's Attendance Status
              </span>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('present')}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer",
                    selectedStatus === 'present'
                      ? "border-emerald-500 bg-emerald-50/30 text-emerald-700 font-extrabold"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-350 font-semibold"
                  )}
                >
                  <span className="text-xs">Present</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus('absent')}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer",
                    selectedStatus === 'absent'
                      ? "border-red-500 bg-red-50/30 text-red-700 font-extrabold"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-350 font-semibold"
                  )}
                >
                  <span className="text-xs">Absent</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus('on_leave')}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer",
                    selectedStatus === 'on_leave'
                      ? "border-amber-500 bg-amber-50/30 text-amber-700 font-extrabold"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-350 font-semibold"
                  )}
                >
                  <span className="text-xs">On Leave</span>
                </button>
              </div>
            </div>

            {/* Instruction Context text */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-500">
              {selectedStatus === 'present' && "You are checking in as Present. The system will automatically capture your current GPS coordinates to verify your location."}
              {selectedStatus === 'absent' && "You are marking yourself as Absent for today. This will be logged on your monthly operational reports."}
              {selectedStatus === 'on_leave' && "You are applying for Leave for today. This will log a Leave status for your monthly operational tracking."}
            </div>

            {/* Submit Button */}
            <Button
              onClick={() => handleCheckIn(selectedStatus)}
              className={cn(
                "w-full h-11 text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center",
                selectedStatus === 'present' && "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600",
                selectedStatus === 'absent' && "bg-red-600 hover:bg-red-700 text-white border-red-600",
                selectedStatus === 'on_leave' && "bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
              )}
            >
              {selectedStatus === 'present' && "Submit Check-In (Present)"}
              {selectedStatus === 'absent' && "Submit Attendance (Absent)"}
              {selectedStatus === 'on_leave' && "Submit Attendance (On Leave)"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-5 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status</span>
                <Badge color={todayAtt.status === 'present' ? 'green' : todayAtt.status === 'absent' ? 'red' : 'amber'} className="mt-1" dot>
                  {todayAtt.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Check-In Time</span>
                <span className="text-sm font-bold text-slate-700 block mt-1.5 flex items-center gap-1">
                  <Clock size={14} className="text-slate-400" />
                  {todayAtt.checkIn || '--:--:--'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Check-Out Time</span>
                <span className="text-sm font-bold text-slate-700 block mt-1.5 flex items-center gap-1">
                  <Clock size={14} className="text-slate-400" />
                  {todayAtt.checkOut || 'Active Session'}
                </span>
              </div>
            </div>

            {/* Check-Out trigger button */}
            {todayAtt.status === 'present' && !todayAtt.checkOut && (
              <Button
                variant="danger"
                size="lg"
                onClick={handleCheckOut}
                className="w-full sm:w-auto"
              >
                Log Check-Out (Complete Session)
              </Button>
            )}

            {/* Geo details */}
            {todayAtt.geoTag && (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200/50 rounded-xl px-3 py-2.5">
                <MapPin size={14} className="text-primary-500" />
                <span>GPS Check-in captured: {todayAtt.geoTag.lat.toFixed(4)} N, {todayAtt.geoTag.lng.toFixed(4)} E</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Overview Analytics Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Attendance Chart Summary */}
        <Card className="lg:col-span-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5">Monthly Breakdown</h3>
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="relative w-18 h-18">
                {/* SVG circular track */}
                <svg className="w-18 h-18 transform -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                  <motion.circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke="#2563eb"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - monthlyStats.percentage / 100) }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-black text-slate-800">{monthlyStats.percentage}%</span>
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-700">Attendance Rate</p>
                <p className="text-[10px] text-slate-400 font-semibold">{monthlyStats.present} of {monthlyStats.total} marked days</p>
              </div>
            </div>

            {/* Table breakdowns list */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              {[
                { label: 'Present Today', value: monthlyStats.present, color: 'bg-emerald-500' },
                { label: 'Absent Today', value: monthlyStats.absent, color: 'bg-red-500' },
                { label: 'On Leave', value: monthlyStats.onLeave, color: 'bg-amber-500' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className={cn('w-2.5 h-2.5 rounded-full', item.color)} />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-slate-855 text-slate-800 font-extrabold">{item.value} days</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Heatmap calendar panel */}
        <Card className="lg:col-span-2">
          <AttendanceCalendar records={attendance.filter(r => r.trainerId === trainerId)} />
        </Card>

      </div>

    </div>
  );
}
