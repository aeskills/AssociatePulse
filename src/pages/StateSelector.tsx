import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Plus, Map, Users, Landmark, Award, X, ArrowLeft, ChevronRight } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import PageTransition from '../components/layout/PageTransition';
import CustomSelect from '../components/ui/CustomSelect';

export default function StateSelector() {
  const navigate = useNavigate();
  const states = useAppStore((state) => state.states);
  const trainers = useAppStore((state) => state.trainers);
  const schools = useAppStore((state) => state.schools);
  const ratings = useAppStore((state) => state.ratings);
  const [search, setSearch] = useState('');

  // Add trainer form state
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [district, setDistrict] = useState('');
  const [stateType, setStateType] = useState<'existing' | 'new'>('existing');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [newStateName, setNewStateName] = useState('');
  const [newStateAbbreviation, setNewStateAbbreviation] = useState('');

  // Set default state selection when modal opens
  useEffect(() => {
    if (states.length > 0 && !selectedStateId) {
      setSelectedStateId(states[0].id);
    }
  }, [states, selectedStateId]);

  const globalMetrics = useMemo(() => {
    const avgRating = ratings.length
      ? (ratings.reduce((sum, r) => sum + r.overallRating, 0) / ratings.length).toFixed(1)
      : '4.5';
    return {
      activeBranches: states.length,
      totalTrainers: trainers.length,
      monitoredSchools: schools.length,
      avgRating
    };
  }, [states, trainers, schools, ratings]);

  const filtered = useMemo(
    () =>
      states.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.abbreviation.toLowerCase().includes(search.toLowerCase())
      ),
    [states, search]
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer mb-2 uppercase tracking-widest"
            >
              <ArrowLeft size={12} />
              <span>Exit Portal</span>
            </button>
            <h1>
              Welcome to <span className="text-red-500">AssociatePulse</span>!
            </h1>
            <p className="subtitle">
              Here are your recent updates from the field operations network.
            </p>
          </div>
          <div className="banner-stats">
            <div className="stat-box">
              <span className="stat-value">{globalMetrics.activeBranches}</span>
              <span className="stat-label">States</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{globalMetrics.totalTrainers}</span>
              <span className="stat-label">Associates</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{globalMetrics.monitoredSchools}</span>
              <span className="stat-label">Schools</span>
            </div>
          </div>
        </div>

        {/* Quick Action Tiles */}
        <div className="action-grid">
          {[
            { label: 'State Directory', sub: 'View States', icon: Map, iconStyle: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' } },
            { label: 'Associate Force', sub: 'Manage Staff', icon: Users, iconStyle: { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' } },
            { label: 'School Network', sub: 'Inspect Schools', icon: Landmark, iconStyle: { background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' } },
            { label: 'Rating Dashboard', sub: `Avg: ${globalMetrics.avgRating} / 5.0`, icon: Award, iconStyle: { background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' } }
          ].map((action, idx) => (
            <div key={idx} className="action-card group" onClick={() => navigate('/dashboard')}>
              <div className="icon-circle" style={action.iconStyle}>
                <action.icon size={24} />
              </div>
              <div>
                <span className="title block group-hover:text-primary transition-colors">
                  {action.label}
                </span>
                <span className="subtitle block">
                  {action.sub}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* State Branch Selection Section */}
        <div>
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Select State</h2>
              <p className="section-subtitle">Choose your administrative jurisdiction to begin</p>
            </div>
            <div className="flex items-center gap-2.5 w-full md:w-auto flex-shrink-0">
              <div className="w-full md:w-64 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search state..."
                  className="section-search"
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

          <div className="branch-list-card">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-400 text-sm font-semibold">No states found matching your search</p>
              </div>
            ) : (
              <div>
                {filtered.map((state, i) => {
                  let badgeStyle = { backgroundColor: '#eff6ff', color: '#2563eb' };
                  if (state.abbreviation === 'RJ') badgeStyle = { backgroundColor: '#dbeafe', color: '#2563eb' };
                  else if (state.abbreviation === 'GJ') badgeStyle = { backgroundColor: '#d1fae5', color: '#059669' };
                  else if (state.abbreviation === 'HR') badgeStyle = { backgroundColor: '#fef3c7', color: '#d97706' };
                  else if (state.abbreviation === 'MH') badgeStyle = { backgroundColor: '#ede9fe', color: '#7c3aed' };
                  else if (state.abbreviation === 'DL') badgeStyle = { backgroundColor: '#fce7f3', color: '#db2777' };
                  else badgeStyle = { backgroundColor: state.color + '15', color: state.color };

                  return (
                    <motion.div
                      key={state.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.03 * i }}
                      onClick={() => navigate(`/dashboard/state/${state.id}`)}
                      className="branch-row group"
                    >
                      <div className="branch-badge" style={badgeStyle}>
                        {state.abbreviation}
                      </div>
                      
                      <div className="branch-info">
                        <div className="name group-hover:text-primary transition-colors">
                          {state.name}
                        </div>
                        <div className="meta">
                          {state.trainerCount} Active Associates · Field Operations
                        </div>
                      </div>
 
                      <button className="enter-btn">
                        <span className="label">Enter</span>
                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

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
                  if (!name.trim() || !employeeId.trim() || !district.trim()) return;

                  if (stateType === 'new' && (!newStateName.trim() || !newStateAbbreviation.trim())) {
                    return;
                  }

                  useAppStore.getState().addTrainer({
                    name,
                    employeeId,
                    district,
                    stateId: stateType === 'existing' ? selectedStateId : '',
                    newState: stateType === 'new' ? { name: newStateName, abbreviation: newStateAbbreviation } : undefined
                  });

                  // Reset form
                  setName('');
                  setEmployeeId('');
                  setDistrict('');
                  setNewStateName('');
                  setNewStateAbbreviation('');
                  setStateType('existing');
                  setModalOpen(false);
                }}
                className="p-5 space-y-4 max-h-[85vh] overflow-y-auto text-left"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Associate Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
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
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Jaipur"
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                  />
                </div>

                {/* State selection type */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    State Territory
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="stateType"
                        checked={stateType === 'existing'}
                        onChange={() => setStateType('existing')}
                        className="accent-primary"
                      />
                      <span>Existing State</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="stateType"
                        checked={stateType === 'new'}
                        onChange={() => setStateType('new')}
                        className="accent-primary"
                      />
                      <span>New State</span>
                    </label>
                  </div>
                </div>

                {stateType === 'existing' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Select State
                    </label>
                    <CustomSelect
                      options={states.map((s) => ({ value: s.id, label: `${s.name} (${s.abbreviation})` }))}
                      value={selectedStateId}
                      onChange={(val) => setSelectedStateId(val)}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-150">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        New State Name
                      </label>
                      <input
                        type="text"
                        required={stateType === 'new'}
                        value={newStateName}
                        onChange={(e) => setNewStateName(e.target.value)}
                        placeholder="e.g. Maharashtra"
                        className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        State Abbreviation (2 letters)
                      </label>
                      <input
                        type="text"
                        required={stateType === 'new'}
                        maxLength={2}
                        value={newStateAbbreviation}
                        onChange={(e) => setNewStateAbbreviation(e.target.value.toUpperCase())}
                        placeholder="e.g. MH"
                        className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium uppercase"
                      />
                    </div>
                  </div>
                )}

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

