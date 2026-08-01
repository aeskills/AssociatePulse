import { useMemo, useEffect } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, ShieldCheck, ArrowLeft } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import PageTransition from '../../components/layout/PageTransition';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import WorkspaceTabs from '../../components/workspace/WorkspaceTabs';
import { getInitials, getDeterministicGradient, getToday, formatDate } from '../../lib/utils';

export default function TrainerWorkspace() {
  const { trainerId } = useParams();
  const navigate = useNavigate();
  
  const userRole = useAppStore((s) => s.userRole);
  const trainers = useAppStore((s) => s.trainers);
  const getTodayAttendance = useAppStore((s) => s.getTodayAttendance);
  const getSchoolsByTrainer = useAppStore((s) => s.getSchoolsByTrainer);
  const detectLiveLocation = useAppStore((s) => s.detectLiveLocation);
  const liveLocation = useAppStore((s) => s.liveLocation);

  useEffect(() => {
    if (!liveLocation) {
      detectLiveLocation();
    }
  }, [liveLocation, detectLiveLocation]);

  const trainer = trainers.find((t) => t.id === trainerId) || trainers[0] || { name: 'Manish', district: 'Kanpur Dehat', employeeId: 'EMP-UP-101', id: 't-manish' };
  const trainerSchools = useMemo(() => getSchoolsByTrainer(trainerId || ''), [trainerId, getSchoolsByTrainer]);

  const getAttendanceBadge = (tid: string) => {
    const att = getTodayAttendance(tid);
    if (!att) return { label: 'Not Checked-In', color: 'slate' as const };
    if (att.status === 'present') return { label: 'Active (Checked-In)', color: 'green' as const };
    if (att.status === 'absent') return { label: 'Absent Today', color: 'red' as const };
    return { label: 'On Leave Today', color: 'amber' as const };
  };

  if (!trainer) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 font-bold text-sm">Project Associate account not found in database</p>
      </div>
    );
  }

  const avatarGradient = getDeterministicGradient(trainer.name);
  const attendanceBadge = getAttendanceBadge(trainer.id);

  const isAdminInspector = localStorage.getItem('admin_authenticated') === 'true' || sessionStorage.getItem('admin_authenticated') === 'true';

  return (
    <PageTransition>
      <div className="space-y-6 text-left">
        
        {/* Admin Inspector Mode Banner when Admin is viewing trainer workspace */}
        {isAdminInspector && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-900 text-white rounded-2xl border border-red-500/40 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-red-300 truncate">Admin Control Mode</span>
                  <span className="text-[10px] font-extrabold bg-red-500/20 text-red-200 px-2 py-0.5 rounded-md border border-red-500/30 shrink-0">
                    Inspecting Workspace
                  </span>
                </div>
                <span className="text-xs text-slate-300 font-medium block truncate">
                  You have full admin access to <strong>{trainer.name}</strong>&apos;s ground operations & reports.
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/admin')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-xs font-black tracking-wider uppercase rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
            >
              <ArrowLeft size={15} />
              <span>Return to Admin Dashboard</span>
            </button>
          </div>
        )}

        {/* Trainer Profile Header — clean MyAT style */}
        <Card padding="p-5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-black text-xl shadow-md flex-shrink-0`}>
              {getInitials(trainer.name)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{trainer.name}</h1>
                {attendanceBadge.label !== 'Not Checked-In' && (
                  <Badge color={attendanceBadge.color} dot>
                    {attendanceBadge.label}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-slate-600 font-semibold">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-500" />{trainer.district}</span>
                <span>·</span>
                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-500" />{formatDate(getToday(), { weekday: 'long', day: 'numeric', month: 'short' })}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <WorkspaceTabs />

        {/* Nested Tab Content */}
        <div>
          <Outlet />
        </div>

      </div>
    </PageTransition>
  );
}
