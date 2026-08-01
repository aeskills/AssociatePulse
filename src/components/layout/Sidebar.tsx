import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Calendar, ClipboardCheck, Clock, LogOut, ArrowLeft, ShieldCheck } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const userRole = useAppStore((s) => s.userRole);
  const logout = useAppStore((s) => s.logout);
  const activeTrainerId = useAppStore((s) => s.activeTrainerId);
  const trainers = useAppStore((s) => s.trainers);

  // Derive active trainer stateId and trainerId
  const trainerId = params.trainerId || activeTrainerId || 't-manish';
  const trainer = trainers.find((t) => t.id === trainerId) || trainers[0];
  const stateId = params.stateId || trainer?.stateId || 'up';

  const basePath = `/dashboard/state/${stateId}/trainer/${trainer ? trainer.id : 't-manish'}`;

  const menuItems = [
    {
      label: 'FIELD OPERATIONS',
      items: [
        {
          label: 'Attendance',
          path: `${basePath}/attendance`,
          icon: Clock,
          active: location.pathname.includes('/attendance')
        },
        {
          label: 'Daily Field Log',
          path: `${basePath}/daily-log`,
          icon: ClipboardCheck,
          active: location.pathname.includes('/daily-log')
        },
        {
          label: 'Schedule Monthly Calendar',
          path: `${basePath}/calendar`,
          icon: Calendar,
          active: location.pathname.includes('/calendar')
        }
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };

  return (
    <aside className={cn('sidebar', isOpen && 'open')}>
      {/* Brand Header */}
      <div
        className="flex items-center gap-2.5 cursor-pointer pb-5 border-b border-slate-800/50 mb-5"
        onClick={() => {
          navigate(basePath + '/daily-log');
          onClose();
        }}
      >
        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-extrabold shadow-md flex-shrink-0">
          AP
        </div>
        <div className="logo-text">
          <span className="text-sm font-black tracking-wider text-white font-display block uppercase leading-none">
            AssociatePulse
          </span>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">
            {userRole === 'admin' ? 'Admin Inspector' : 'Trainer ERP'}
          </span>
        </div>
      </div>

      {/* Navigation menu list */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {menuItems.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h5 className="section-label">{group.label}</h5>
            <div className="space-y-1">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={itemIdx}
                    to={item.path}
                    onClick={onClose}
                    className={cn('nav-item', item.active ? 'active' : 'inactive')}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="nav-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="divider" />

      {/* Conditional Bottom Action: Admin Return vs Trainer Logout */}
      {sessionStorage.getItem('admin_authenticated') === 'true' ? (
        <button
          onClick={() => {
            onClose();
            navigate('/admin');
          }}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-black text-red-300 hover:text-white bg-red-950/70 hover:bg-red-900/90 border border-red-500/40 rounded-xl transition-all cursor-pointer mb-2 shadow-sm"
          title="Return to Admin Dashboard"
        >
          <ArrowLeft size={16} className="shrink-0 text-red-400" />
          <span className="truncate">Return to Admin Dashboard</span>
        </button>
      ) : (
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer mb-2"
        >
          <LogOut size={16} />
          <span>Log Out Session</span>
        </button>
      )}

      {/* Bottom Footer version */}
      <div className="text-center text-[10px] text-slate-600 font-bold version-text pt-1">
        Version 4.8.0 Premium
      </div>
    </aside>
  );
}
