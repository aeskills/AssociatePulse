import React, { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  MessageSquare,
  CheckCircle2,
  School as SchoolIcon,
  RefreshCw
} from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import UploadZone from '../../components/workspace/UploadZone';
import type { UploadedMedia } from '../../components/workspace/UploadZone';
import { uploadToDrive, deleteFromDrive } from '../../services/driveUpload';
import { logActivity, fetchLiveTrainerData } from '../../services/googleSheets';
import { getToday, formatDate } from '../../lib/utils';

export default function DailyFieldLogTab() {
  const { trainerId } = useParams();

  const attendance = useAppStore((s) => s.attendance);
  const getTodayAttendance = useAppStore((s) => s.getTodayAttendance);
  const trainers = useAppStore((s) => s.trainers);
  const feedback = useAppStore((s) => s.feedback);
  const addFeedback = useAppStore((s) => s.addFeedback);
  const saveStudentsTrained = useAppStore((s) => s.saveStudentsTrained);
  const saveUploadedMedia = useAppStore((s) => s.saveUploadedMedia);

  const trainer = trainers.find((t) => t.id === trainerId);
  const todayAtt = useMemo(() => getTodayAttendance(trainerId || ''), [trainerId, getTodayAttendance, attendance]);
  const today = getToday();
  const todayFeedback = useMemo(() => feedback.find((f) => f.trainerId === trainerId && f.date === today), [feedback, trainerId, today]);
  const todayDate = new Date().toISOString().split('T')[0];

  const [manualSchoolName, setManualSchoolName] = useState<string>(() => {
    if (todayAtt?.schoolName) return todayAtt.schoolName;
    return '';
  });

  useEffect(() => {
    if (todayAtt?.schoolName && !manualSchoolName) {
      setManualSchoolName(todayAtt.schoolName);
    }
  }, [todayAtt?.schoolName]);

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

  const currentVisitNumber = useAppStore((s) => s.currentVisitNumber);

  // Reset form fields when starting a new visit (Visit 2, 3...)
  useEffect(() => {
    if (currentVisitNumber > 1) {
      setStudentsTrained('');
      setUploads([]);
      setHighlight('');
      setLowlight('');
      setEodFeedback('');
      setHasComplaint('no');
      setComplaintDetails('');
    }
  }, [currentVisitNumber]);

  // Restore Total Students Trained count from today's attendance record
  useEffect(() => {
    if (currentVisitNumber === 1 && todayAtt?.studentsTrained !== undefined && todayAtt.studentsTrained !== null) {
      setStudentsTrained(String(todayAtt.studentsTrained));
    }
  }, [todayAtt?.studentsTrained, currentVisitNumber]);

  // Restore Uploaded Media items from today's record
  useEffect(() => {
    if (currentVisitNumber === 1 && todayAtt?.uploadedMedia && todayAtt.uploadedMedia.length > 0) {
      setUploads(todayAtt.uploadedMedia);
    }
  }, [todayAtt?.uploadedMedia, currentVisitNumber]);

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

  // Handler to update Total Students Trained Count and sync immediately to Google Sheets
  const handleStudentsTrainedChange = (val: string) => {
    setStudentsTrained(val);
    if (trainerId) {
      const num = parseInt(val, 10);
      if (!isNaN(num)) {
        saveStudentsTrained(trainerId, num);

        const todayFormatted = formatDate(getToday(), { day: '2-digit', month: '2-digit', year: 'numeric' });
        const currentSchoolName = manualSchoolName.trim() || todayAtt?.schoolName || '';

        logActivity({
          trainerName: trainer?.name || 'Trainer',
          state: trainer?.stateId || 'UP',
          district: trainer?.district || '',
          schoolName: currentSchoolName,
          activityType: 'Students Trained Update',
          dateStr: todayFormatted,
          isNewVisit: false,
          totalStudentsTrained: num,
          details: `Updated Total Students Trained Today to ${num}`
        });
      }
    }
  };

  // Drive Media Upload Handlers
  const handleUploadFiles = async (files: FileList) => {
    if (!trainer) return;
    const currentSchoolName = manualSchoolName.trim() || todayAtt?.schoolName || '';

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
        schoolName: currentSchoolName,
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

  // Submit Daily Feedback
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
    const currentSchoolName = manualSchoolName.trim() || todayAtt?.schoolName || '';

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
      schoolName: currentSchoolName,
      activityType: 'Daily Feedback (EOD)',
      dateStr: todayFormatted,
      isNewVisit: false,
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

      {/* 1. MEDIA EVIDENCE UPLOAD CARD */}
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
                  {manualSchoolName.trim() || todayAtt?.schoolName || 'Entered in Attendance tab'}
                </span>
              </div>
            </div>
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
              Specify the total headcount of pupils who completed the session today.
            </p>
          </div>
        </div>

        <UploadZone
          onFilesSelected={handleUploadFiles}
          uploads={uploads}
          onDeleteUpload={handleDeleteUpload}
        />
      </Card>

      {/* 2. DAILY FEEDBACK CARD (EOD REPORT) */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-primary-600" />

        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1 flex items-center gap-2.5">
          <MessageSquare className="text-primary-600" size={22} />
          <span>Daily Feedback Form</span>
        </h2>
        <p className="text-sm text-slate-600 font-semibold mb-6">
          Submit end-of-day operational feedback and classroom session updates.
        </p>

        {todayFeedback && currentVisitNumber === 1 ? (
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
