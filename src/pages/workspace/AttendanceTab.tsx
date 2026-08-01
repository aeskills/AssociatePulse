import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  School as SchoolIcon,
  UploadCloud,
  FileText,
  RefreshCw,
  LogOut,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { logActivity, fetchLiveTrainerData } from '../../services/googleSheets';
import { getToday, formatDate, cn, compressImageToBase64, getCurrentFormattedTime, calculateWorkingHours } from '../../lib/utils';
import { checkGeotaggedImage } from '../../utils/exif';

function formatTimeDisplay(val: string | null | undefined): string {
  if (!val) return 'N/A';
  return getCurrentFormattedTime(val);
}

export default function AttendanceTab() {
  const { trainerId } = useParams();

  // Store selections
  const attendance = useAppStore((s) => s.attendance);
  const userRole = useAppStore((s) => s.userRole);
  const markAttendance = useAppStore((s) => s.markAttendance);
  const getTodayAttendance = useAppStore((s) => s.getTodayAttendance);
  const checkOut = useAppStore((s) => s.checkOut);
  const autoCheckOutYesterday = useAppStore((s) => s.autoCheckOutYesterday);
  const resetTodayAttendance = useAppStore((s) => s.resetTodayAttendance);
  const trainers = useAppStore((s) => s.trainers);

  const liveLocation = useAppStore((s) => s.liveLocation);
  const isLocating = useAppStore((s) => s.isLocating);
  const detectLiveLocation = useAppStore((s) => s.detectLiveLocation);

  useEffect(() => {
    if (!liveLocation && !isLocating) {
      detectLiveLocation();
    }
  }, [liveLocation, isLocating, detectLiveLocation]);

  // Computed state references
  const trainer = trainers.find((t) => t.id === trainerId);
  const todayAtt = useMemo(() => getTodayAttendance(trainerId || ''), [trainerId, getTodayAttendance, attendance]);
  const today = getToday();

  // Attendance local state
  const [attendanceType, setAttendanceType] = useState<'present' | 'on_leave'>('present');
  const [manualSchoolName, setManualSchoolName] = useState<string>(() => {
    if (todayAtt?.schoolName) return todayAtt.schoolName;
    return '';
  });

  // Multi-visit state from persisted store
  const currentVisitNumber = useAppStore((s) => s.currentVisitNumber);
  const todayCompletedVisits = useAppStore((s) => s.todayCompletedVisits);
  const visitDate = useAppStore((s) => s.visitDate);
  const [isNewVisit, setIsNewVisit] = useState(false);

  // Auto-reset visits on new day
  useEffect(() => {
    if (visitDate && visitDate !== today) {
      useAppStore.setState({
        currentVisitNumber: 1,
        todayCompletedVisits: [],
        visitDate: today
      });
    } else if (!visitDate) {
      useAppStore.setState({ visitDate: today });
    }
  }, [today, visitDate]);

  useEffect(() => {
    if (todayAtt?.schoolName && !manualSchoolName) {
      setManualSchoolName(todayAtt.schoolName);
    }
  }, [todayAtt?.schoolName]);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [leaveReason, setLeaveReason] = useState<string>('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Live Geo coordinates
  const currentLocation = useMemo(() => {
    if (liveLocation) {
      return { lat: liveLocation.lat, lng: liveLocation.lng };
    }
    return { lat: 28.6139, lng: 77.2090 };
  }, [liveLocation]);

  const [yesterdayWarning, setYesterdayWarning] = useState<boolean>(false);

  // Check yesterday clock out on mount
  useEffect(() => {
    if (trainerId) {
      const wasAutoClockedOut = autoCheckOutYesterday(trainerId);
      if (wasAutoClockedOut) {
        setYesterdayWarning(true);
      }
    }
  }, [trainerId, autoCheckOutYesterday]);

  // Cross-tab Sync
  useEffect(() => {
    const syncStore = () => {
      useAppStore.persist.rehydrate();
    };

    window.addEventListener('storage', syncStore);
    window.addEventListener('focus', syncStore);

    return () => {
      window.removeEventListener('storage', syncStore);
      window.removeEventListener('focus', syncStore);
    };
  }, []);

  // Photo Upload Handler with Geotag Check
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const geoResult = await checkGeotaggedImage(file);
      if (!geoResult.hasGeoTag) {
        useAppStore.getState().addToast('Please Upload Geotagged image', 'error');
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (galleryInputRef.current) galleryInputRef.current.value = '';
        return;
      }
      try {
        const compressedB64 = await compressImageToBase64(file, 1024);
        setPhotoPreview(compressedB64);
        setPhotoBase64(compressedB64);
        useAppStore.getState().addToast('Geotagged image verified & selected', 'success');
      } catch (err) {
        useAppStore.getState().addToast('Failed to process geotagged image', 'error');
      }
    }
  };

  // Submit Clock-In (Present or Leave)
  const handleAttendanceSubmit = () => {
    const nowTime = getCurrentFormattedTime();
    const todayFormatted = formatDate(getToday(), { day: '2-digit', month: '2-digit', year: 'numeric' });
    const locAddress = liveLocation?.formattedAddress || (trainer ? `${trainer.district}, ${trainer.stateId.toUpperCase()}` : 'Kanpur Dehat, Uttar Pradesh');

    if (attendanceType === 'present') {
      if (!manualSchoolName.trim()) {
        useAppStore.getState().addToast('Please enter school name first', 'error');
        return;
      }
      if (!photoPreview) {
        useAppStore.getState().addToast('Please capture or upload a geotagged photo', 'error');
        return;
      }

      if (todayAtt && isNewVisit) {
        useAppStore.setState((state) => ({
          attendance: state.attendance.map((r) =>
            r.trainerId === (trainerId || '') && r.date === getToday()
              ? {
                  ...r,
                  checkIn: nowTime,
                  checkOut: null,
                  workingHours: '0',
                  schoolName: manualSchoolName.trim(),
                  photoUrl: photoPreview
                }
              : r
          )
        }));
        useAppStore.getState().addToast(`Clocked In successfully for ${manualSchoolName.trim()}`, 'success');
      } else {
        markAttendance(trainerId || '', 'present', currentLocation, photoPreview, undefined, manualSchoolName.trim());
      }

      logActivity({
        trainerName: trainer?.name || 'Trainer',
        state: trainer?.stateId || 'UP',
        district: trainer?.district || '',
        activityType: 'Clock In',
        status: 'present',
        dateStr: todayFormatted,
        isNewVisit: isNewVisit,
        checkIn: nowTime,
        visitStartTime: nowTime,
        clockInLocation: locAddress,
        schoolName: manualSchoolName.trim(),
        photoBase64: photoBase64 || photoPreview,
        photoName: 'Present',
        details: `Clocked in at ${manualSchoolName.trim()}`
      });

      setIsNewVisit(false);
    } else {
      if (!leaveReason.trim()) {
        useAppStore.getState().addToast('Please specify the reason for leave', 'error');
        return;
      }

      markAttendance(trainerId || '', 'on_leave', null, undefined, leaveReason.trim());

      logActivity({
        trainerName: trainer?.name || 'Trainer',
        state: trainer?.stateId || 'UP',
        district: trainer?.district || '',
        activityType: 'On Leave',
        status: 'on_leave',
        dateStr: todayFormatted,
        leaveReason: leaveReason.trim(),
        details: `On Leave: ${leaveReason.trim()}`
      });
    }
  };

  // Clock Out Handler
  const handleClockOut = () => {
    if (!trainerId) return;
    checkOut(trainerId, currentLocation);

    const nowTime = getCurrentFormattedTime();
    const todayFormatted = formatDate(getToday(), { day: '2-digit', month: '2-digit', year: 'numeric' });
    const locAddress = liveLocation?.formattedAddress || (trainer ? `${trainer.district}, ${trainer.stateId.toUpperCase()}` : 'Kanpur Dehat, Uttar Pradesh');

    const hoursStr = calculateWorkingHours(todayAtt?.checkIn, nowTime);

    const currentSchoolName = manualSchoolName.trim() || todayAtt?.schoolName || 'Assigned School';

    // Save completed visit to persisted store
    useAppStore.setState((state) => ({
      todayCompletedVisits: [
        ...state.todayCompletedVisits,
        {
          visitNum: currentVisitNumber,
          schoolName: currentSchoolName,
          checkIn: todayAtt?.checkIn || nowTime,
          checkOut: nowTime,
          workingHours: hoursStr
        }
      ]
    }));

    logActivity({
      trainerName: trainer?.name || 'Trainer',
      state: trainer?.stateId || 'UP',
      district: trainer?.district || '',
      schoolName: currentSchoolName,
      activityType: 'Clock Out',
      status: 'present',
      dateStr: todayFormatted,
      isNewVisit: false,
      checkIn: todayAtt?.checkIn || nowTime,
      visitStartTime: todayAtt?.checkIn || nowTime,
      clockInLocation: todayAtt?.clockInLocation?.address || locAddress,
      checkOut: nowTime,
      workingHours: hoursStr,
      clockOutLocation: locAddress,
      details: `Clocked Out at ${nowTime} (${hoursStr} hrs)`
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 text-left"
    >

      {/* Yesterday Clock-out Warning Alert */}
      {yesterdayWarning && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl text-amber-900 shadow-sm flex items-start gap-3.5">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={22} />
          <div>
            <h4 className="text-sm font-black tracking-tight">Warning: You have not clocked out yesterday!</h4>
            <p className="text-xs font-semibold text-amber-800 mt-0.5">
              Your previous session was automatically clocked out at 6:00 PM evening. Please make sure to clock out on time today.
            </p>
          </div>
        </div>
      )}

      {/* DAILY ATTENDANCE CARD */}
      <Card className="relative !overflow-visible">
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-primary-600" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Clock className="text-primary-600" size={22} />
              <span>Daily Attendance — Clock In / Clock Out</span>
            </h2>
            <p className="text-sm text-slate-600 font-semibold mt-1">
              Today: {formatDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {todayAtt && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge color={todayAtt.status === 'present' ? 'green' : 'amber'} dot>
                {todayAtt.checkOut ? 'Clocked Out (Visit Finished)' : 'Clocked In (Present)'}
              </Badge>
              {todayAtt.checkOut && (
                <button
                  type="button"
                  onClick={() => {
                    const nextVisit = currentVisitNumber + 1;
                    useAppStore.setState({ currentVisitNumber: nextVisit });
                    setIsNewVisit(true);
                    setManualSchoolName('');
                    setPhotoPreview(null);
                    setPhotoBase64(null);
                    useAppStore.getState().addToast(`Ready to Clock In to Next School (Visit #${nextVisit})`, 'info');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Clock in for another school visit today"
                >
                  <SchoolIcon size={14} />
                  <span>+ Clock In to Next School (Visit #{currentVisitNumber + 1})</span>
                </button>
              )}
              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    if (trainerId) resetTodayAttendance(trainerId);
                    setPhotoPreview(null);
                    setPhotoBase64(null);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 font-extrabold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Reset today's attendance log to test freshly"
                >
                  <RefreshCw size={13} />
                  <span>Reset Today's Log</span>
                </button>
              )}
            </div>
          )}
        </div>

        {!todayAtt || isNewVisit ? (
          <div className="space-y-6">
            {/* Status Select: Present vs On Leave */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                Select Today's Attendance Status
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAttendanceType('present')}
                  className={cn(
                    'flex items-center justify-center gap-3 p-4.5 rounded-2xl border-2 transition-all cursor-pointer font-black text-base',
                    attendanceType === 'present'
                      ? 'border-emerald-500 bg-emerald-50/60 text-emerald-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  )}
                >
                  <CheckCircle2 size={22} className={attendanceType === 'present' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span>Clock In (Present Today)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendanceType('on_leave')}
                  className={cn(
                    'flex items-center justify-center gap-3 p-4.5 rounded-2xl border-2 transition-all cursor-pointer font-black text-base',
                    attendanceType === 'on_leave'
                      ? 'border-amber-500 bg-amber-50/60 text-amber-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  )}
                >
                  <FileText size={22} className={attendanceType === 'on_leave' ? 'text-amber-600' : 'text-slate-400'} />
                  <span>Apply On Leave</span>
                </button>
              </div>
            </div>

            {/* PRESENT FLOW WITH MANUAL SCHOOL SELECTION & CLOCK IN */}
            {attendanceType === 'present' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-5 p-5 bg-slate-50 border border-slate-200/80 rounded-2xl"
              >
                {/* 1. Manual School Input */}
                <div>
                  <label className="block text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <SchoolIcon size={18} className="text-primary-600" />
                    <span>Enter School Name Being Visited Today <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    value={manualSchoolName}
                    onChange={(e) => setManualSchoolName(e.target.value)}
                    placeholder="Enter school name manually (e.g. PM Shree, U.M.V. Roshanmau)..."
                    className="w-full h-12 px-4 text-sm font-bold bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                  />
                </div>

                {/* 2. Geotagged Photo Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Capture Live Photo or Upload Geotagged Image <span className="text-red-500">*</span>
                  </label>

                  {/* Camera Input (Live Camera) */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />

                  {/* Gallery Input (Phone Gallery) */}
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />

                  {photoPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-slate-900 max-w-sm">
                      <img src={photoPreview} alt="Geotagged Proof" className="w-full h-48 object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-slate-950/80 backdrop-blur-sm text-white text-[11px] font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><MapPin size={12} className="text-emerald-400" /> GPS Tagged Verified</span>
                        <button
                          type="button"
                          onClick={() => setPhotoPreview(null)}
                          className="text-xs text-rose-350 hover:underline font-bold cursor-pointer"
                        >
                          Retake / Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center justify-center gap-3 px-5 py-4 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl bg-white hover:bg-emerald-50/30 transition-all cursor-pointer text-xs font-bold text-emerald-800 shadow-xs"
                      >
                        <Camera size={20} className="text-emerald-600 shrink-0" />
                        <span>Take Live Camera Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex items-center justify-center gap-3 px-5 py-4 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl bg-white hover:bg-blue-50/30 transition-all cursor-pointer text-xs font-bold text-blue-800 shadow-xs"
                      >
                        <UploadCloud size={20} className="text-blue-600 shrink-0" />
                        <span>Choose from Gallery / Photos</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Auto-detected Location */}
                <div className="flex items-center justify-between gap-3.5 p-4 bg-white border border-slate-200/90 rounded-2xl shadow-sm text-sm font-semibold text-slate-800">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                      <MapPin size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">Auto-Detected Live Location</span>
                        {liveLocation?.source && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            {liveLocation.source === 'gps' ? 'Live GPS' : 'Network IP'}
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-slate-900 block text-sm sm:text-base truncate">
                        {isLocating ? (
                          'Detecting live location...'
                        ) : liveLocation ? (
                          `${liveLocation.formattedAddress} (${liveLocation.lat.toFixed(4)}° N, ${liveLocation.lng.toFixed(4)}° E)`
                        ) : manualSchoolName.trim() ? (
                          `${manualSchoolName.trim()} (${currentLocation.lat.toFixed(4)}° N, ${currentLocation.lng.toFixed(4)}° E)`
                        ) : (
                          `${trainer ? trainer.district + ', Uttar Pradesh' : 'Uttar Pradesh'}, India (${currentLocation.lat.toFixed(4)}° N, ${currentLocation.lng.toFixed(4)}° E)`
                        )}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => detectLiveLocation()}
                    disabled={isLocating}
                    title="Refresh live location"
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer flex-shrink-0"
                  >
                    <RefreshCw size={16} className={cn(isLocating && 'animate-spin')} />
                  </button>
                </div>

                {/* 4. Clock In Button */}
                <Button
                  onClick={handleAttendanceSubmit}
                  disabled={!manualSchoolName.trim() || !photoPreview}
                  className={cn(
                    'w-full h-12 text-xs font-black tracking-wider uppercase rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2',
                    manualSchoolName.trim() && photoPreview
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  )}
                >
                  <Clock size={18} />
                  <span>
                    {!manualSchoolName.trim()
                      ? 'Please Enter School Name First'
                      : !photoPreview
                      ? 'Please Upload Geotagged Image First'
                      : 'Clock In Now'}
                  </span>
                </Button>
              </motion.div>
            )}

            {/* ON LEAVE FLOW */}
            {attendanceType === 'on_leave' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-5 p-5 bg-amber-50/40 border border-amber-200/80 rounded-2xl"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Reason for Leave <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Enter mandatory reason for leave (e.g. Medical leave, personal emergency)..."
                    className="w-full px-4 py-3 text-xs bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none shadow-sm"
                  />
                  {!leaveReason.trim() && (
                    <p className="text-[11px] font-bold text-amber-700 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Reason is mandatory for leave submission.
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleAttendanceSubmit}
                  disabled={!leaveReason.trim()}
                  className={cn(
                    'w-full h-12 text-xs font-extrabold rounded-xl shadow-md cursor-pointer transition-all',
                    leaveReason.trim()
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  )}
                >
                  Submit Leave Request
                </Button>
              </motion.div>
            )}
          </div>
        ) : (
          /* SUBMITTED DISPLAY & CLOCK OUT CARD */
          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold',
                  todayAtt.status === 'present' ? 'bg-emerald-600' : 'bg-amber-600'
                )}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Clock In: {formatTimeDisplay(todayAtt.checkIn)} {todayAtt.status === 'on_leave' ? '(On Leave)' : ''}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {todayAtt.checkOut ? `Clocked Out: ${formatTimeDisplay(todayAtt.checkOut)} (${todayAtt.workingHours} hrs)` : 'Active session in progress (Auto-clocks out at 6:00 PM)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!todayAtt.checkOut && todayAtt.status === 'present' && (
                  <button
                    type="button"
                    onClick={handleClockOut}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    <LogOut size={16} />
                    <span>Clock Out</span>
                  </button>
                )}

                <Badge color={todayAtt.checkOut ? 'slate' : 'green'} dot>
                  {todayAtt.checkOut ? 'Completed' : 'Checked In'}
                </Badge>
              </div>
            </div>

            {/* Location Log */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
              {todayAtt.clockInLocation && (
                <div className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center gap-2">
                  <MapPin size={14} className="text-emerald-600 shrink-0" />
                  <span className="truncate">Clock In Location: {todayAtt.clockInLocation.address || liveLocation?.formattedAddress || (trainer ? `${trainer.district}, ${trainer.stateId.toUpperCase()}` : 'Kanpur Dehat, Uttar Pradesh')}</span>
                </div>
              )}
              {todayAtt.clockOutLocation && (
                <div className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center gap-2">
                  <MapPin size={14} className="text-red-600 shrink-0" />
                  <span className="truncate">Clock Out Location: {todayAtt.clockOutLocation.address || liveLocation?.formattedAddress || (trainer ? `${trainer.district}, ${trainer.stateId.toUpperCase()}` : 'Kanpur Dehat, Uttar Pradesh')}</span>
                </div>
              )}
            </div>

            {/* Completed Visits Stacked Cards (Visit 1, Visit 2, Visit 3...) */}
            {todayCompletedVisits.length > 0 ? (
              <div className="mt-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  Today's Completed School Visits ({todayCompletedVisits.length})
                </h4>
                {todayCompletedVisits.map((visit, idx) => (
                  <div key={`visit-${idx}`} className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2.5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-600 text-white font-black text-xs rounded-md">
                          Visit #{visit.visitNum || (idx + 1)}
                        </span>
                        <span className="text-xs font-black uppercase text-emerald-950 tracking-wider">
                          {visit.schoolName || 'Assigned School'}
                        </span>
                      </div>
                      <Badge color="green" dot>Visit Finished (Clocked Out)</Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-semibold text-emerald-900">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-600 block">Clock In</span>
                        <span className="font-extrabold">{formatTimeDisplay(visit.checkIn) || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-600 block">Clock Out</span>
                        <span className="font-extrabold">{formatTimeDisplay(visit.checkOut) || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-600 block">Total Duration</span>
                        <span className="font-extrabold">{visit.workingHours || '0.0'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : todayAtt.checkOut && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <SchoolIcon className="text-emerald-700" size={18} />
                    <span className="text-xs font-black uppercase text-emerald-900 tracking-wider">
                      Completed Visit: {manualSchoolName.trim() || todayAtt.schoolName || 'Entered School'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-0.5 rounded-md border border-emerald-200">
                    Visit Status: Fully Clocked Out
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-semibold text-emerald-900">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-600 block">Clock In</span>
                    <span className="font-extrabold">{formatTimeDisplay(todayAtt.checkIn)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-600 block">Clock Out</span>
                    <span className="font-extrabold">{formatTimeDisplay(todayAtt.checkOut)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-600 block">Total Duration</span>
                    <span className="font-extrabold">{todayAtt.workingHours} hrs</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
