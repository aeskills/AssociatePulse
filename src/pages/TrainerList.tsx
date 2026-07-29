import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, School, ArrowRight, CheckCircle2, XCircle, AlertCircle, Plus, X, ArrowLeft } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import PageTransition from '../components/layout/PageTransition';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import SearchInput from '../components/ui/SearchInput';
import { getInitials, getDeterministicGradient } from '../lib/utils';

export default function TrainerList() {
  const { stateId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Add trainer form modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newTrainerName, setNewTrainerName] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newDistrict, setNewDistrict] = useState('');

  const getTrainersByState = useAppStore((s) => s.getTrainersByState);
  const getStateById = (id: string | undefined) => useAppStore.getState().states.find(s => s.id === id);
  const getTodayAttendance = useAppStore((s) => s.getTodayAttendance);

  const state = getStateById(stateId);
  const trainers = useMemo(() => getTrainersByState(stateId || ''), [stateId, getTrainersByState]);

  const filtered = trainers.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.district.toLowerCase().includes(search.toLowerCase())
  );

  const statsSummary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let notMarked = 0;
    
    trainers.forEach((t) => {
      const att = getTodayAttendance(t.id);
      if (!att) notMarked++;
      else if (att.status === 'present') present++;
      else if (att.status === 'absent') absent++;
      else notMarked++;
    });

    return { present, absent, notMarked, total: trainers.length };
  }, [trainers, getTodayAttendance]);

  const getAttendanceBadge = (trainerId: string) => {
    const att = getTodayAttendance(trainerId);
    if (!att) return { label: 'Not Marked', color: 'slate' as const, dot: true };
    if (att.status === 'present') return { label: 'Present', color: 'green' as const, dot: true };
    if (att.status === 'absent') return { label: 'Absent', color: 'red' as const, dot: true };
    return { label: 'On Leave', color: 'amber' as const, dot: true };
  };

  return (
    <PageTransition>
      <div className="space-y-6 text-left">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-1.5 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center flex-shrink-0"
                title="Back to States"
              >
                <ArrowLeft size={16} />
              </button>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                {state?.name || 'State'} — Associate Directory
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1.5 pl-9">
              Select a project associate to open their field operations workspace.
            </p>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="w-full md:w-64">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search associate or district..."
              />
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer min-h-[38px] flex-shrink-0"
            >
              <Plus size={16} />
              <span>Add Associate</span>
            </button>
          </div>
        </div>

        {/* Attendance Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {[
            { label: 'Present', count: statsSummary.present, icon: CheckCircle2, iconColor: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            { label: 'Absent', count: statsSummary.absent, icon: XCircle, iconColor: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
            { label: 'Not Marked', count: statsSummary.notMarked, icon: AlertCircle, iconColor: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' }
          ].map((stat, i) => (
            <Card key={i} padding="p-4" className={`flex items-center gap-3 ${stat.border}`}>
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={stat.iconColor} size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{stat.label}</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-extrabold text-slate-800">{stat.count}</span>
                  <span className="text-[10px] text-slate-400 font-bold">/ {statsSummary.total}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Associate Table / List */}
        <Card padding="p-0">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Project Associates ({filtered.length})
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400 text-sm font-semibold">No associates found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((trainer, i) => {
                const att = getAttendanceBadge(trainer.id);
                const cardGradient = getDeterministicGradient(trainer.name);

                return (
                  <motion.div
                    key={trainer.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.03 * i }}
                    onClick={() => navigate(`/dashboard/state/${stateId}/trainer/${trainer.id}`)}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${cardGradient} flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0`}>
                        {getInitials(trainer.name)}
                      </div>
                      
                      {/* Name & details */}
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors truncate">
                          {trainer.name}
                        </h3>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>{trainer.employeeId}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><MapPin size={10} />{trainer.district}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><School size={10} />{trainer.assignedSchools.length} schools</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <Badge color={att.color} dot={att.dot}>
                        {att.label}
                      </Badge>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Add Trainer Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-extrabold text-slate-800">Add New Associate</h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTrainerName.trim() || !newEmployeeId.trim() || !newDistrict.trim()) return;
                  
                  useAppStore.getState().addTrainer({
                    name: newTrainerName,
                    employeeId: newEmployeeId,
                    district: newDistrict,
                    stateId: stateId || ''
                  });

                  // Reset form
                  setNewTrainerName('');
                  setNewEmployeeId('');
                  setNewDistrict('');
                  setModalOpen(false);
                }}
                className="p-5 space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Associate Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newTrainerName}
                    onChange={(e) => setNewTrainerName(e.target.value)}
                    placeholder="e.g. Amit Sharma"
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmployeeId}
                    onChange={(e) => setNewEmployeeId(e.target.value)}
                    placeholder="e.g. EMP-RJ-806"
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Office District
                  </label>
                  <input
                    type="text"
                    required
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    placeholder="e.g. Jaipur"
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
                  >
                    Register Associate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

      </div>
    </PageTransition>
  );
}
