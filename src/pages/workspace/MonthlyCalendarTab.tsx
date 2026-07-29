import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  School as SchoolIcon, 
  Check, 
  Plus, 
  Pencil, 
  X, 
  Search, 
  LayoutGrid, 
  List, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import type { SchoolData } from '../../store/useAppStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function MonthlyCalendarTab() {
  const { trainerId } = useParams();

  const trainers = useAppStore((s) => s.trainers);
  const getSchoolsByTrainer = useAppStore((s) => s.getSchoolsByTrainer);
  const monthlySchedule = useAppStore((s) => s.monthlySchedule);
  const setMonthlySchool = useAppStore((s) => s.setMonthlySchool);
  const userRole = useAppStore((s) => s.userRole);
  const addToast = useAppStore((s) => s.addToast);

  const trainer = trainers.find((t) => t.id === trainerId);
  const schools = useMemo(() => getSchoolsByTrainer(trainerId || ''), [trainerId, getSchoolsByTrainer]);
  const trainerSchedule = useMemo(() => (trainerId ? monthlySchedule[trainerId] || {} : {}), [monthlySchedule, trainerId]);

  // Current viewed month/year state
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 7, 1)); // Default Aug 2026

  // Auto-detect view mode: default to 'list' on small mobile screens
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return window.innerWidth < 768 ? 'list' : 'grid';
  });

  // Active Date Modal State
  const [activeDateModal, setActiveDateModal] = useState<{
    dateKey: string;
    formattedDate: string;
    dayName: string;
    dayNum: number;
    isSunday: boolean;
  } | null>(null);

  // Temporary selected IDs while modal is open
  const [modalSelectedSchoolIds, setModalSelectedSchoolIds] = useState<string[]>([]);
  const [modalSearch, setModalSearch] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Helper to extract school ID list safely
  const getAssignedSchoolIds = (dateKey: string): string[] => {
    const raw = trainerSchedule[dateKey];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim().length > 0) return [raw];
    return [];
  };

  // Open Modal for a specific date
  const handleOpenAssignModal = (dateKey: string, dayNum: number, dateObj: Date) => {
    const isSunday = dateObj.getDay() === 0;
    if (isSunday) {
      addToast('Sunday is an official holiday. No scheduling required.', 'info');
      return;
    }

    const currentAssigned = getAssignedSchoolIds(dateKey);
    setModalSelectedSchoolIds(currentAssigned);
    setModalSearch('');
    setActiveDateModal({
      dateKey,
      formattedDate: `${dayNum} ${monthNames[month]} ${year}`,
      dayName: dayNames[dateObj.getDay()],
      dayNum,
      isSunday
    });
  };

  // Save Modal Changes
  const handleSaveModalSchedule = () => {
    if (!activeDateModal || !trainerId) return;
    setMonthlySchool(trainerId, activeDateModal.dateKey, modalSelectedSchoolIds);
    addToast(
      `Schedule updated for ${activeDateModal.formattedDate} (${modalSelectedSchoolIds.length} ${
        modalSelectedSchoolIds.length === 1 ? 'school' : 'schools'
      })`,
      'success'
    );
    setActiveDateModal(null);
  };

  // Toggle school in modal list
  const toggleModalSchool = (schoolId: string) => {
    if (modalSelectedSchoolIds.includes(schoolId)) {
      setModalSelectedSchoolIds(modalSelectedSchoolIds.filter((id) => id !== schoolId));
    } else {
      setModalSelectedSchoolIds([...modalSelectedSchoolIds, schoolId]);
    }
  };

  // Filtered schools in modal
  const modalFilteredSchools = useMemo(() => {
    if (!modalSearch.trim()) return schools;
    const q = modalSearch.toLowerCase();
    return schools.filter(
      (s) => s.name.toLowerCase().includes(q) || s.district.toLowerCase().includes(q) || (s.udiseCode && s.udiseCode.includes(q))
    );
  }, [schools, modalSearch]);

  // Color theme helper
  const getCellColorClasses = (count: number, isSunday: boolean) => {
    if (isSunday) return { cell: 'bg-rose-50/50 border-rose-200/80 text-rose-400', badge: 'bg-rose-100 text-rose-700' };
    if (count === 1) return { cell: 'bg-red-50/60 border-2 border-red-500/80 text-red-950 shadow-sm', badge: 'bg-red-600 text-white' };
    if (count === 2) return { cell: 'bg-blue-50/60 border-2 border-blue-500/80 text-blue-950 shadow-sm', badge: 'bg-blue-600 text-white' };
    if (count === 3) return { cell: 'bg-amber-50/60 border-2 border-amber-500/80 text-amber-950 shadow-sm', badge: 'bg-amber-500 text-white' };
    if (count >= 4) return { cell: 'bg-emerald-50/60 border-2 border-emerald-500/80 text-emerald-950 shadow-sm', badge: 'bg-emerald-600 text-white' };
    return { cell: 'bg-white border-slate-200 hover:border-red-400 shadow-sm', badge: 'bg-slate-100 text-slate-700' };
  };

  // Download Monthly Sheet (CSV)
  const handleDownloadSheet = () => {
    const rows = [['S.No', 'Date', 'Assigned Schools Count', 'School Names']];
    let counter = 1;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const isSunday = dateObj.getDay() === 0;

      if (isSunday) continue;

      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const formattedDate = `${day} ${shortMonthNames[month]} ${String(year).slice(-2)}`;

      const assignedIds = getAssignedSchoolIds(dateKey);
      const assignedSchoolNames = assignedIds
        .map((id) => schools.find((s) => s.id === id)?.name)
        .filter(Boolean)
        .join(' | ');

      rows.push([String(counter), formattedDate, String(assignedIds.length), assignedSchoolNames || 'Unassigned']);
      counter++;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map(val => `"${val}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${trainer?.name || 'Trainer'}_Monthly_Schedule_${shortMonthNames[month]}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('Monthly Schedule Sheet downloaded successfully!', 'success');
  };

  // Generate calendar grid cells
  const calendarGridCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarGridCells.push(<div key={`empty-${i}`} className="min-h-[110px] bg-slate-50/40 border border-slate-100/80 rounded-2xl" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    const isSunday = dateObj.getDay() === 0;
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const assignedIds = getAssignedSchoolIds(dateKey);
    const assignedSchoolObjs = assignedIds.map((id) => schools.find((s) => s.id === id)).filter(Boolean) as SchoolData[];
    const colorStyle = getCellColorClasses(assignedIds.length, isSunday);

    calendarGridCells.push(
      <div
        key={`day-${day}`}
        onClick={() => handleOpenAssignModal(dateKey, day, dateObj)}
        className={`min-h-[115px] p-2.5 rounded-2xl flex flex-col justify-between transition-all cursor-pointer group hover:shadow-md ${colorStyle.cell}`}
      >
        {/* Cell Top Header */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${colorStyle.badge}`}>
            {day}
          </span>

          {isSunday ? (
            <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider bg-rose-100/80 px-2 py-0.5 rounded-md">
              Holiday
            </span>
          ) : assignedIds.length > 0 ? (
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/90 shadow-xs flex items-center gap-1">
              <Pencil size={10} className="text-slate-500" />
              <span>{assignedIds.length} {assignedIds.length === 1 ? 'School' : 'Schools'}</span>
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
              + Assign
            </span>
          )}
        </div>

        {/* Cell Content Area */}
        {!isSunday ? (
          <div className="mt-2 flex-1 flex flex-col justify-center">
            {assignedSchoolObjs.length > 0 ? (
              <div className="space-y-1">
                {assignedSchoolObjs.slice(0, 2).map((sch) => (
                  <div
                    key={sch.id}
                    className="text-[11px] font-extrabold px-2 py-1 bg-white/90 border border-slate-200/80 rounded-lg text-slate-800 truncate shadow-xs flex items-center gap-1"
                  >
                    <SchoolIcon size={12} className="text-red-600 shrink-0" />
                    <span className="truncate">{sch.name}</span>
                  </div>
                ))}
                {assignedSchoolObjs.length > 2 && (
                  <div className="text-[10px] font-black text-slate-500 px-1 text-right">
                    +{assignedSchoolObjs.length - 2} more...
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-slate-300 rounded-xl bg-slate-50/60 group-hover:bg-red-50 group-hover:border-red-300 transition-all text-slate-500 group-hover:text-red-700">
                <Plus size={14} />
                <span className="text-xs font-bold">Assign School</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[10px] font-black uppercase tracking-wider text-center text-rose-400 py-3">
            Sunday Holiday
          </div>
        )}
      </div>
    );
  }

  // Generate mobile list rows
  const listRows = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    const isSunday = dateObj.getDay() === 0;
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const assignedIds = getAssignedSchoolIds(dateKey);
    const assignedSchoolObjs = assignedIds.map((id) => schools.find((s) => s.id === id)).filter(Boolean) as SchoolData[];
    const colorStyle = getCellColorClasses(assignedIds.length, isSunday);
    const dayName = dayNames[dateObj.getDay()];

    listRows.push(
      <div
        key={`list-day-${day}`}
        className={`p-4 rounded-2xl border transition-all ${
          isSunday
            ? 'bg-rose-50/40 border-rose-200/80 text-rose-900'
            : colorStyle.cell
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black ${colorStyle.badge} shrink-0`}>
              <span className="text-[10px] uppercase tracking-wider opacity-80">{shortMonthNames[month]}</span>
              <span className="text-lg leading-none">{day}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900">{dayName}</span>
                <span className="text-xs text-slate-500 font-semibold">{day} {monthNames[month]} {year}</span>
              </div>

              {isSunday ? (
                <span className="text-xs font-bold text-rose-500 block mt-0.5">Sunday — Official Holiday</span>
              ) : assignedSchoolObjs.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {assignedSchoolObjs.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-900 rounded-lg text-xs font-extrabold shadow-xs"
                    >
                      <SchoolIcon size={12} className="text-red-600 shrink-0" />
                      <span>{s.name}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400 font-bold block mt-0.5">No school assigned yet</span>
              )}
            </div>
          </div>

          {!isSunday && (
            <Button
              type="button"
              variant={assignedIds.length > 0 ? 'secondary' : 'primary'}
              size="sm"
              icon={assignedIds.length > 0 ? Pencil : Plus}
              onClick={() => handleOpenAssignModal(dateKey, day, dateObj)}
              className="w-full sm:w-auto self-end sm:self-center cursor-pointer shrink-0"
            >
              {assignedIds.length > 0 ? `Edit (${assignedIds.length})` : 'Assign School'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left pb-24 md:pb-6"
    >
      <Card className="relative !overflow-visible">
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-red-600" />

        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <CalendarIcon className="text-red-600" size={22} />
              <span>Schedule Monthly Calendar</span>
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Assign school visits for {trainer?.name || 'Trainer'}. Sundays are holidays.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid size={15} />
                <span>Grid View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List size={15} />
                <span>List View</span>
              </button>
            </div>

            {/* Month Nav */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-2.5 text-xs font-black text-slate-800 min-w-[100px] text-center uppercase tracking-wide">
                {monthNames[month]} {year}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Download Sheet Button (Admin Only) */}
            {userRole === 'admin' && (
              <Button onClick={handleDownloadSheet} icon={Download} className="w-full sm:w-auto">
                Download Sheet
              </Button>
            )}
          </div>
        </div>

        {/* View Mode 1: GRID VIEW */}
        {viewMode === 'grid' && (
          <div className="mt-4">
            {/* Scrollable Container on Mobile */}
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[720px] md:min-w-0">
                {/* Calendar Day Labels */}
                <div className="grid grid-cols-7 gap-2 mb-3 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                    <div
                      key={d}
                      className={`text-xs font-black uppercase tracking-wider py-1.5 rounded-lg ${
                        i === 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-50'
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarGridCells}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Mode 2: LIST SCHEDULE VIEW (PERFECT FOR MOBILE) */}
        {viewMode === 'list' && (
          <div className="mt-4 space-y-3">
            {listRows}
          </div>
        )}
      </Card>

      {/* ASSIGN SCHOOL SCHEDULING MODAL */}
      <AnimatePresence>
        {activeDateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Top Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="text-red-500" size={18} />
                    <h3 className="text-base font-black tracking-tight">{activeDateModal.dayName}, {activeDateModal.formattedDate}</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Select schools to assign for {trainer?.name || 'Trainer'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDateModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Search Bar */}
              <div className="p-4 bg-slate-50 border-b border-slate-200/80 space-y-3 shrink-0">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Search assigned school name, district, or UDISE..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>{modalSelectedSchoolIds.length} Selected</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModalSelectedSchoolIds(schools.map((s) => s.id))}
                      className="text-red-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setModalSelectedSchoolIds([])}
                      className="text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable School List */}
              <div className="p-4 overflow-y-auto space-y-2 flex-1">
                {modalFilteredSchools.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-semibold space-y-2">
                    <AlertCircle className="mx-auto text-slate-300" size={32} />
                    <p className="text-sm font-bold text-slate-600">No schools match your search</p>
                    <p className="text-xs text-slate-400">Ensure schools are assigned to this trainer account.</p>
                  </div>
                ) : (
                  modalFilteredSchools.map((s) => {
                    const isSelected = modalSelectedSchoolIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleModalSchool(s.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-red-50/80 border-2 border-red-500 text-red-950 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <SchoolIcon size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black truncate text-slate-900">{s.name}</h4>
                            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                              {s.district} {s.udiseCode ? `· UDISE: ${s.udiseCode}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-red-600 border-red-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Bottom Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveDateModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  icon={Check}
                  onClick={handleSaveModalSchedule}
                >
                  Save Schedule ({modalSelectedSchoolIds.length})
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
