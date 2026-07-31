import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  MapPin,
  Camera,
  CheckCircle2,
  School as SchoolIcon,
  UploadCloud,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  FileText,
  RefreshCw,
  LogOut,
  Clock
} from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SchoolSelect from '../../components/workspace/SchoolSelect';
import UploadZone from '../../components/workspace/UploadZone';
import type { UploadedMedia } from '../../components/workspace/UploadZone';
import { uploadToDrive, deleteFromDrive } from '../../services/driveUpload';
import { logActivity, fetchLiveTrainerData } from '../../services/googleSheets';
import { getToday, formatDate, cn } from '../../lib/utils';
import { checkGeotaggedImage } from '../../utils/exif';

function formatTimeDisplay(val: string | null | undefined): string {
  if (!val) return 'N/A';
  const str = String(val).trim();
  if (str.includes('GMT') || str.includes('1899')) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    } catch (e) {}
  }
  return str;
}

export default function DailyLogTab() {
  const { trainerId } = useParams();

  // Store selections
  const attendance = useAppStore((s) => s.attendance);
  const userRole = useAppStore((s) => s.userRole);
  const markAttendance = useAppStore((s) => s.markAttendance);
  const getTodayAttendance = useAppStore((s) => s.getTodayAttendance);
  const [isNewVisit, setIsNewVisit] = useState(false);
  const [todayCompletedVisits, setTodayCompletedVisits] = useState<any[]>([]);

  const getSchoolsByTrainer = useAppStore((s) => s.getSchoolsByTrainer);
  const trainers = useAppStore((s) => s.trainers);

  const feedback = useAppStore((s) => s.feedback);
  const addFeedback = useAppStore((s) => s.addFeedback);

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
  const schools = useMemo(() => getSchoolsByTrainer(trainerId || ''), [trainerId, getSchoolsByTrainer]);
  const todayAtt = useMemo(() => getTodayAttendance(trainerId || ''), [trainerId, getTodayAttendance, attendance]);
  const today = getToday();
  const todayFeedback = useMemo(() => feedback.find((f) => f.trainerId === trainerId && f.date === today), [feedback, trainerId, today]);

  // Attendance local state (2 options: 'present' or 'on_leave')
  const activeSchoolId = useAppStore((s) => s.activeSchoolId);
  const [attendanceType, setAttendanceType] = useState<'present' | 'on_leave'>('present');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(() => {
    if (activeSchoolId && schools.some(s => s.id === activeSchoolId)) {
      return activeSchoolId;
    }
    return null;
  });

  useEffect(() => {
    if (activeSchoolId && schools.some(s => s.id === activeSchoolId)) {
      setSelectedSchoolId(activeSchoolId);
    }
  }, [schools, activeSchoolId]);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [leaveReason, setLeaveReason] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);
  const todayDate = new Date().toISOString().split('T')[0];

  // Live Geo coordinates (Auto-detected location)
  const currentLocation = useMemo(() => {
    if (liveLocation) {
      return { lat: liveLocation.lat, lng: liveLocation.lng };
    }
    return { lat: 28.6139, lng: 77.2090 };
  }, [liveLocation]);

  // Media Uploads & Training metrics local state
  const [uploads, setUploads] = useState<UploadedMedia[]>([]);
  const [studentsTrained, setStudentsTrained] = useState<string>('');

  // Feedback & Complaint fields state
  const [highlight, setHighlight] = useState('');
  const [lowlight, setLowlight] = useState('');
  const [eodFeedback, setEodFeedback] = useState('');
  const [hasComplaint, setHasComplaint] = useState<'no' | 'yes'>('no');
  const [complaintDetails, setComplaintDetails] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const checkOut = useAppStore((s) => s.checkOut);
  const autoCheckOutYesterday = useAppStore((s) => s.autoCheckOutYesterday);
  const resetTodayAttendance = useAppStore((s) => s.resetTodayAttendance);
  const saveStudentsTrained = useAppStore((s) => s.saveStudentsTrained);
  const saveUploadedMedia = useAppStore((s) => s.saveUploadedMedia);

  const [yesterdayWarning, setYesterdayWarning] = useState<boolean>(false);

  // Restore Total Students Trained count from today's attendance record only
  useEffect(() => {
    if (todayAtt?.studentsTrained !== undefined && todayAtt.studentsTrained !== null) {
      setStudentsTrained(String(todayAtt.studentsTrained));
    }
  }, [todayAtt?.studentsTrained]);

  // Restore Uploaded Media items from today's record
  useEffect(() => {
    if (todayAtt?.uploadedMedia && todayAtt.uploadedMedia.length > 0) {
      setUploads(todayAtt.uploadedMedia);
    }
  }, [todayAtt?.uploadedMedia]);

  // Check yesterday clock out on mount
  useEffect(() => {
    if (trainerId) {
      const wasAutoClockedOut = autoCheckOutYesterday(trainerId);
      if (wasAutoClockedOut) {
        setYesterdayWarning(true);
      }
    }
  }, [trainerId, autoCheckOutYesterday]);



  // Real-time Cross-tab Sync & Live Google Sheets Data Fetch
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  useEffect(() => {
    const syncStore = () => {
      useAppStore.persist.rehydrate();
    };

    window.addEventListener('storage', syncStore);
    window.addEventListener('focus', syncStore);

    if (trainer) {
      setIsSyncing(true);
      const todayFormatted = formatDate(getToday(), { day: '2-digit', month: '2-digit', year: 'numeric' });
      fetchLiveTrainerData(trainer.name, trainer.stateId, todayFormatted)
        .then((liveData) => {
          if (liveData && liveData.allVisits && Array.isArray(liveData.allVisits)) {
            setTodayCompletedVisits(liveData.allVisits.filter((v: any) => v.checkOut && String(v.checkOut).trim().length > 0));
          }

          if (!liveData || !liveData.status) {
            // If no data exists in GSheet (or data was deleted in GSheet), clear today's records
            useAppStore.setState((state) => ({
              attendance: state.attendance.filter(r => !(r.trainerId === trainer.id && r.date === getToday())),
              feedback: state.feedback.filter(f => !(f.trainerId === trainer.id && f.date === getToday()))
            }));
            setStudentsTrained('');
            setHighlight('');
            setLowlight('');
            setEodFeedback('');
            setHasComplaint('no');
            setComplaintDetails('');
            return;
          }

          // --- 1. SYNC ATTENDANCE STATUS, CLOCK IN/OUT ---
          if (liveData.status) {
            const isPresent = liveData.status.toLowerCase().includes('present') || liveData.status.toLowerCase().includes('clock in');
            const isOnLeave = liveData.status.toLowerCase().includes('leave');

            if (isPresent || isOnLeave) {
              const numStudents = liveData.totalStudentsTrained ? parseInt(String(liveData.totalStudentsTrained), 10) : undefined;

              useAppStore.setState((state) => {
                const exists = state.attendance.find(r => r.trainerId === trainer.id && r.date === getToday());

                if (!exists) {
                  return {
                    attendance: [
                      ...state.attendance,
                      {
                        id: `att-live-${Date.now()}`,
                        trainerId: trainer.id,
                        date: getToday(),
                        status: isPresent ? 'present' : 'on_leave',
                        checkIn: liveData.checkIn || null,
                        checkOut: liveData.checkOut || null,
                        workingHours: liveData.workingHours || '',
                        studentsTrained: !isNaN(numStudents as number) ? numStudents : undefined,
                        geoTag: null,
                        clockInLocation: liveData.clockInLocation ? { lat: 0, lng: 0, address: liveData.clockInLocation } : null,
                        clockOutLocation: liveData.clockOutLocation ? { lat: 0, lng: 0, address: liveData.clockOutLocation } : null
                      }
                    ]
                  };
                } else {
                  // Update existing record with fields from GSheet
                  return {
                    attendance: state.attendance.map(r =>
                      r.trainerId === trainer.id && r.date === getToday()
                        ? {
                            ...r,
                            checkIn: liveData.checkIn || r.checkIn,
                            checkOut: liveData.checkOut || r.checkOut,
                            workingHours: liveData.workingHours || r.workingHours,
                            studentsTrained: !isNaN(numStudents as number) ? numStudents : r.studentsTrained,
                            clockInLocation: liveData.clockInLocation ? { lat: 0, lng: 0, address: liveData.clockInLocation } : r.clockInLocation,
                            clockOutLocation: liveData.clockOutLocation ? { lat: 0, lng: 0, address: liveData.clockOutLocation } : r.clockOutLocation
                          }
                        : r
                    )
                  };
                }
              });
            }
          }

          // --- 2. SYNC TOTAL STUDENTS TRAINED ---
          if (liveData.totalStudentsTrained !== undefined && liveData.totalStudentsTrained !== '') {
            setStudentsTrained(String(liveData.totalStudentsTrained));
          }

          // --- 3. SYNC SCHOOL SELECTION ---
          if (liveData.schoolName && !selectedSchoolId) {
            const matchedSchool = schools.find(s =>
              s.name.toLowerCase().includes(liveData.schoolName.toLowerCase()) ||
              liveData.schoolName.toLowerCase().includes(s.name.toLowerCase())
            );
            if (matchedSchool) {
              setSelectedSchoolId(matchedSchool.id);
            }
          }

          // --- 4. SYNC FEEDBACK FORM FIELDS ---
          if (liveData.highlight) setHighlight(liveData.highlight);
          if (liveData.challenges || liveData.lowlight) setLowlight(liveData.challenges || liveData.lowlight);
          if (liveData.suggestions) setEodFeedback(liveData.suggestions);

          if (liveData.hasComplaint) {
            const isYes = String(liveData.hasComplaint).toLowerCase().includes('yes');
            if (isYes) {
              setHasComplaint('yes');
              if (liveData.complaintDetails) {
                setComplaintDetails(liveData.complaintDetails);
              }
            }
          }

          // --- 5. SYNC FEEDBACK RECORD INTO STORE ---
          if (liveData.highlight || liveData.lowlight) {
            useAppStore.setState((state) => {
              const existingFb = state.feedback.find(f => f.trainerId === trainer.id && f.date === getToday());
              if (!existingFb) {
                return {
                  feedback: [
                    ...state.feedback,
                    {
                      id: `fb-live-${Date.now()}`,
                      trainerId: trainer.id,
                      date: getToday(),
                      highlight: liveData.highlight || '',
                      lowlight: liveData.lowlight || '',
                      challenges: liveData.lowlight || '',
                      hasComplaint: String(liveData.hasComplaint || '').toLowerCase().includes('yes'),
                      complaintDescription: liveData.complaintDetails || '',
                      suggestions: liveData.suggestions || '',
                      overallExperience: 'Good',
                      mood: liveData.mood || 'Satisfied'
                    }
                  ]
                };
              }
              return state;
            });
          }
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }

    return () => {
      window.removeEventListener('storage', syncStore);
      window.removeEventListener('focus', syncStore);
    };
  }, [trainer]);

  // Photo Upload Handler for Attendance with Geotag Check
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const geoResult = await checkGeotaggedImage(file);
      if (!geoResult.hasGeoTag) {
        useAppStore.getState().addToast('Please Upload Geotagged image', 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result as string;
        setPhotoPreview(b64);
        setPhotoBase64(b64);
      };
      reader.readAsDataURL(file);
      useAppStore.getState().addToast('Geotagged image verified & selected', 'success');
    }
  };

  // Handler to update Total Students Trained Count and sync immediately to Google Sheets
  const handleStudentsTrainedChange = (val: string) => {
    setStudentsTrained(val);
    if (trainerId) {
      const num = parseInt(val, 10);
      if (!isNaN(num)) {
        saveStudentsTrained(trainerId, num);

        const todayFormatted = formatDate(getToday(), { day: '2-digit', month: '2-digit', year: 'numeric' });
        const activeSchool = schools.find((s) => s.id === selectedSchoolId);

        logActivity({
          trainerName: trainer?.name || 'Trainer',
          state: trainer?.stateId || 'UP',
          district: trainer?.district || '',
          schoolName: activeSchool?.name || (schools.length > 0 ? schools[0].name : ''),
          activityType: 'Students Trained Update',
          dateStr: todayFormatted,
          totalStudentsTrained: num,
          details: `Updated Total Students Trained Today to ${num}`
        });
      }
    }
  };

  // Submit Clock-In (Present or Leave)
  const handleAttendanceSubmit = () => {
    const selectedSch = schools.find((s) => s.id === selectedSchoolId);
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const todayFormatted = formatDate(getToday(), { day: '2-digit', month: '2-digit', year: 'numeric' });

    const locAddress = liveLocation?.formattedAddress || (trainer ? `${trainer.district}, ${trainer.stateId.toUpperCase()}` : 'Kanpur Dehat, Uttar Pradesh');

    if (attendanceType === 'present') {
      if (!selectedSchoolId) {
        useAppStore.getState().addToast('Please select a school first', 'error');
        return;
      }
      if (!photoPreview) {
        useAppStore.getState().addToast('Please capture or upload a geotagged photo', 'error');
        return;
      }

      markAttendance(trainerId || '', 'present', currentLocation, photoPreview);

      const numStudents = studentsTrained ? parseInt(studentsTrained, 10) : (todayAtt?.studentsTrained ?? undefined);

      logActivity({
        trainerName: trainer?.name || 'Trainer',
        state: trainer?.stateId || 'UP',
        district: trainer?.district || '',
        activityType: 'Clock In',
        status: 'present',
        dateStr: todayFormatted,
        isNewVisit,
        checkIn: nowTime,
        visitStartTime: nowTime,
        clockInLocation: locAddress,
        schoolName: selectedSch?.name || (schools.length > 0 ? schools[0].name : 'Assigned School'),
        udiseCode: selectedSch?.udiseCode || '',
        totalStudentsTrained: numStudents,
        photoBase64: photoBase64 || photoPreview,
        photoName: 'Present',
        details: `Clocked in at ${selectedSch?.name || 'School'}`
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

    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const todayFormatted = formatDate(getToday(), { day: '2-digit', month: '2-digit', year: 'numeric' });
    const locAddress = liveLocation?.formattedAddress || (trainer ? `${trainer.district}, ${trainer.stateId.toUpperCase()}` : 'Kanpur Dehat, Uttar Pradesh');

    let hoursStr = '0.1';
    if (todayAtt && todayAtt.checkIn) {
      const parts = todayAtt.checkIn.split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h)) {
        const cin = new Date();
        cin.setHours(h, m || 0, 0);
        const diffMs = Math.max(60000, new Date().getTime() - cin.getTime());
        hoursStr = (diffMs / (1000 * 60 * 60)).toFixed(1);
      }
    }

    const activeSchool = schools.find((s) => s.id === selectedSchoolId);
    const numStudents = studentsTrained ? parseInt(studentsTrained, 10) : (todayAtt?.studentsTrained ?? undefined);

    logActivity({
      trainerName: trainer?.name || 'Trainer',
      state: trainer?.stateId || 'UP',
      district: trainer?.district || '',
      schoolName: activeSchool?.name || (schools.length > 0 ? schools[0].name : ''),
      activityType: 'Clock Out',
      dateStr: todayFormatted,
      checkOut: nowTime,
      totalStudentsTrained: numStudents,
      workingHours: hoursStr,
      clockOutLocation: locAddress,
      details: `Clocked Out at ${nowTime} (${hoursStr} hrs)`
    });
  };

  // Drive Media Upload Handlers
  const handleUploadFiles = async (files: FileList) => {
    if (!trainer) return;
    const activeSchool = schools.find((s) => s.id === selectedSchoolId);

    const newUploads = Array.from(files).map((file) => {
      const id = 'media-' + Math.random().toString(36).substr(2, 9);
      const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);

      const mediaItem: UploadedMedia = {
        id,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        progress: 0,
        status: 'uploading',
        thumbnailUrl: isImage ? URL.createObjectURL(file) : undefined
      };

      uploadToDrive({
        trainerName: trainer.name,
        state: trainer.stateId,
        district: trainer.district,
        schoolName: activeSchool?.name || (schools.length > 0 ? schools[0].name : ''),
        date: todayDate,
        file,
        onProgress: (prog) => {
          setUploads((prev) =>
            prev.map((item) => (item.id === id ? { ...item, progress: prog } : item))
          );
        }
      })
        .then((driveFile) => {
          setUploads((prev) => {
            const next = prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: 'completed' as const,
                    progress: 100,
                    drivePath: driveFile.path,
                    thumbnailUrl: driveFile.url
                  }
                : item
            );
            if (trainerId) saveUploadedMedia(trainerId, next);
            return next;
          });
          useAppStore.getState().addToast(`Media "${file.name}" uploaded to Drive`, 'success');
        })
        .catch(() => {
          setUploads((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: 'failed' as const } : item))
          );
        });

      return mediaItem;
    });

    setUploads((prev) => {
      const next = [...prev, ...newUploads];
      if (trainerId) saveUploadedMedia(trainerId, next);
      return next;
    });
  };

  const handleDeleteUpload = async (id: string) => {
    const item = uploads.find((u) => u.id === id);
    if (item?.status === 'completed') {
      await deleteFromDrive(id);
    }
    setUploads((prev) => {
      const next = prev.filter((u) => u.id !== id);
      if (trainerId) saveUploadedMedia(trainerId, next);
      return next;
    });
    useAppStore.getState().addToast('Media removed successfully', 'info');
  };

  // Submit Daily Feedback (EOD Feedback is Optional)
  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlight.trim() || !lowlight.trim()) {
      useAppStore.getState().addToast('Please fill out Highlight and Challenges fields', 'error');
      return;
    }

    if (hasComplaint === 'yes' && !complaintDetails.trim()) {
      useAppStore.getState().addToast('Please enter the complaint details', 'error');
      return;
    }

    setIsSubmittingFeedback(true);

    const todayFormatted = formatDate(getToday(), { day: '2-digit', month: '2-digit', year: 'numeric' });

    addFeedback({
      highlight: highlight.trim(),
      lowlight: lowlight.trim(),
      challenges: lowlight.trim(),
      hasComplaint: hasComplaint === 'yes',
      complaintCategory: hasComplaint === 'yes' ? 'Operational Issue' : undefined,
      complaintDescription: hasComplaint === 'yes' ? complaintDetails.trim() : undefined,
      suggestions: eodFeedback.trim() || 'N/A',
      overallExperience: 'Good',
      mood: 'Satisfied'
    });

    const numStudents = studentsTrained ? parseInt(studentsTrained, 10) : (todayAtt?.studentsTrained ?? undefined);

    logActivity({
      trainerName: trainer?.name || 'Trainer',
      state: trainer?.stateId || 'UP',
      district: trainer?.district || '',
      activityType: 'Daily Feedback (EOD)',
      dateStr: todayFormatted,
      mood: 'Satisfied',
      overallExperience: 'Good',
      totalStudentsTrained: numStudents,
      highlight: highlight.trim(),
      challenges: lowlight.trim(),
      hasComplaint: hasComplaint === 'yes',
      complaintDetails: hasComplaint === 'yes' ? complaintDetails.trim() : 'N/A',
      suggestions: eodFeedback.trim() || 'N/A',
      details: `EOD Feedback submitted`
    });

    setHighlight('');
    setLowlight('');
    setEodFeedback('');
    setIsSubmittingFeedback(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 text-left"
    >
      {/* Live Google Sheets Syncing Banner */}
      {isSyncing && (
        <div className="p-3.5 bg-blue-50/90 border border-blue-200/80 rounded-2xl text-blue-900 shadow-sm flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <RefreshCw className="animate-spin text-blue-600 shrink-0" size={18} />
            <p className="text-xs font-bold">Synchronizing live records with Google Sheets...</p>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
            Live Sync
          </span>
        </div>
      )}
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

      {/* 1. DAILY ATTENDANCE CARD (CLOCK IN / CLOCK OUT WORKFLOW) */}
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
                    if (trainerId) resetTodayAttendance(trainerId);
                    setIsNewVisit(true);
                    setSelectedSchoolId(null);
                    setPhotoPreview(null);
                    setPhotoBase64(null);
                    setStudentsTrained('');
                    setHighlight('');
                    setLowlight('');
                    setEodFeedback('');
                    useAppStore.getState().addToast('Ready to Clock-In for another school visit today!', 'info');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Start a new visit for another school today"
                >
                  <SchoolIcon size={14} />
                  <span>+ Visit Another School Today</span>
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

        {!todayAtt ? (
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

            {/* PRESENT FLOW WITH SCHOOL SELECTION & CLOCK IN */}
            {attendanceType === 'present' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-5 p-5 bg-slate-50 border border-slate-200/80 rounded-2xl"
              >
                {/* 1. School Dropdown */}
                <div>
                  <label className="block text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <SchoolIcon size={18} className="text-primary-600" />
                    <span>Select School Being Visited Today <span className="text-red-500">*</span></span>
                  </label>
                  <SchoolSelect
                    schools={schools}
                    value={selectedSchoolId}
                    onChange={(val) => {
                      setSelectedSchoolId(val);
                      useAppStore.setState({ activeSchoolId: val });
                    }}
                  />
                </div>

                {/* 2. Geotagged Photo Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Capture / Upload Live Geotagged Image <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
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
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl bg-white hover:bg-emerald-50/20 transition-all cursor-pointer text-xs font-bold text-slate-700"
                    >
                      <Camera size={20} className="text-emerald-600" />
                      <span>Capture / Upload Geotagged Image</span>
                    </button>
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
                        ) : selectedSchool ? (
                          `${selectedSchool.address || selectedSchool.name} (${(selectedSchool.latitude || currentLocation.lat).toFixed(4)}° N, ${(selectedSchool.longitude || currentLocation.lng).toFixed(4)}° E)`
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
                  disabled={!selectedSchoolId || !photoPreview}
                  className={cn(
                    'w-full h-12 text-xs font-black tracking-wider uppercase rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2',
                    selectedSchoolId && photoPreview
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  )}
                >
                  <Clock size={18} />
                  <span>
                    {!selectedSchoolId
                      ? 'Please Select School First'
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
                      Completed Visit: {selectedSchool ? selectedSchool.name : (schools[0]?.name || 'Assigned School')}
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

      {/* 2. MEDIA EVIDENCE UPLOAD CARD */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-primary-600" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <UploadCloud className="text-primary-600" size={20} />
              <span>Media Evidence Upload</span>
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Upload captured photo/video media logs of your visit to Google Drive.
            </p>
          </div>
          {trainer && (
            <span className="text-[10px] font-black text-slate-400 bg-slate-100 rounded-lg px-2.5 py-1 border border-slate-200/50">
              Drive / {trainer.name} / {todayDate}
            </span>
          )}
        </div>

        {/* Visited School Banner & Total Students Trained Input */}
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <SchoolIcon size={18} className="text-primary-600 flex-shrink-0" />
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Visited School Today</span>
                <span className="text-xs font-extrabold text-slate-800">
                  {selectedSchool ? selectedSchool.name : 'Selected in Attendance above'}
                </span>
              </div>
            </div>
            {selectedSchool && (
              <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                UDISE: {selectedSchool.udiseCode}
              </span>
            )}
          </div>

          <div className="border-t border-slate-200/60 pt-3">
            <label className="block text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2">
              Total Students Trained Today <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={studentsTrained}
              onChange={(e) => handleStudentsTrainedChange(e.target.value)}
              placeholder="Enter total number of students trained today (e.g. 45)..."
              className="w-full h-12 px-4 text-sm font-bold bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
            />
            <p className="text-xs font-medium text-slate-500 mt-1.5">
              Specify the total headcount of pupils who completed the Adobe Express session today.
            </p>
          </div>
        </div>

        <UploadZone
          onFilesSelected={handleUploadFiles}
          uploads={uploads}
          onDeleteUpload={handleDeleteUpload}
        />
      </Card>

      {/* 3. DAILY FEEDBACK CARD (EOD FEEDBACK IS OPTIONAL) */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-primary-600" />

        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1 flex items-center gap-2.5">
          <MessageSquare className="text-primary-600" size={22} />
          <span>Daily Feedback Form</span>
        </h2>
        <p className="text-sm text-slate-600 font-semibold mb-6">
          Submit end-of-day operational feedback and classroom session updates.
        </p>

        {todayFeedback ? (
          <div className="p-6 bg-emerald-50/50 border border-emerald-200/60 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-sm">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900">Daily Feedback Submitted ✓</h4>
                <p className="text-[11px] text-slate-500 font-semibold">Today's end-of-day report has been recorded.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {todayFeedback.highlight && (
                <div className="p-3 bg-white rounded-xl border border-slate-200/60">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Highlight</p>
                  <p className="text-xs font-semibold text-slate-700">{todayFeedback.highlight}</p>
                </div>
              )}
              {todayFeedback.lowlight && (
                <div className="p-3 bg-white rounded-xl border border-slate-200/60">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Challenges</p>
                  <p className="text-xs font-semibold text-slate-700">{todayFeedback.lowlight}</p>
                </div>
              )}
            </div>

            {todayFeedback.hasComplaint && todayFeedback.complaintDescription && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200/60">
                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">Complaint Reported</p>
                <p className="text-xs font-semibold text-red-800">{todayFeedback.complaintDescription}</p>
              </div>
            )}

            {todayFeedback.suggestions && todayFeedback.suggestions !== 'N/A' && (
              <div className="p-3 bg-white rounded-xl border border-slate-200/60">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">EOD Feedback / Suggestions</p>
                <p className="text-xs font-semibold text-slate-700">{todayFeedback.suggestions}</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmitFeedback} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Field 1: Highlight of the day */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  1. Highlight of the Day <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={highlight}
                  onChange={(e) => setHighlight(e.target.value)}
                  placeholder="Mention smart classroom usage, positive student engagement, principal support..."
                  className="w-full px-4 py-3 text-sm bg-white border border-slate-200/80 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none shadow-sm"
                />
              </div>

              {/* Field 2: Challenges of the day */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  2. Challenges of the Day <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={lowlight}
                  onChange={(e) => setLowlight(e.target.value)}
                  placeholder="Mention transport delays, kit maintenance issues, electricity shortage, internet challenges..."
                  className="w-full px-4 py-3 text-sm bg-white border border-slate-200/80 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none shadow-sm"
                />
              </div>
            </div>

            {/* Field 3: Complaint Radio Option */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <label className="block text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                3. Any Operational Complaint / Issue Today? <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm font-extrabold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="hasComplaint"
                    value="no"
                    checked={hasComplaint === 'no'}
                    onChange={() => setHasComplaint('no')}
                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <span>No Complaint</span>
                </label>
                <label className="flex items-center gap-2 text-sm font-extrabold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="hasComplaint"
                    value="yes"
                    checked={hasComplaint === 'yes'}
                    onChange={() => setHasComplaint('yes')}
                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-red-600 font-black">Yes, Have Complaint</span>
                </label>
              </div>

              {hasComplaint === 'yes' && (
                <div className="pt-2 space-y-1.5">
                  <label className="block text-xs font-black text-red-800 uppercase tracking-wider">
                    Complaint Details <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={complaintDetails}
                    onChange={(e) => setComplaintDetails(e.target.value)}
                    placeholder="Describe the complaint or equipment/infrastructure issue..."
                    className="w-full px-4 py-2.5 text-sm bg-white border border-red-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none shadow-sm"
                  />
                </div>
              )}
            </div>

            {/* Field 4: EOD Feedback (OPTIONAL) */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                4. EOD Feedback <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={eodFeedback}
                onChange={(e) => setEodFeedback(e.target.value)}
                placeholder="Enter general end-of-day feedback, recommendations, or operational suggestions (optional)..."
                className="w-full px-4 py-3 text-sm bg-white border border-slate-200/80 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none shadow-sm"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                loading={isSubmittingFeedback}
                disabled={!highlight.trim() || !lowlight.trim()}
              >
                Submit Daily Report
              </Button>
            </div>
          </form>
        )}
      </Card>
    </motion.div>
  );
}
