import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, MapPin, Play, StopCircle, CheckCircle2 } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import UploadZone from '../../components/workspace/UploadZone';
import type { UploadedMedia } from '../../components/workspace/UploadZone';
import { downloadStudentIdSheet } from '../../services/schoolData';
import { uploadToDrive, deleteFromDrive } from '../../services/driveUpload';

export default function SchoolVisitTab() {
  const { trainerId } = useParams();

  const getSchoolsByTrainer = useAppStore((s) => s.getSchoolsByTrainer);
  const trainers = useAppStore((s) => s.trainers);
  const activeVisit = useAppStore((s) => s.activeVisit);
  const startVisit = useAppStore((s) => s.startVisit);
  const endVisit = useAppStore((s) => s.endVisit);

  const trainer = trainers.find((t) => t.id === trainerId);
  const schools = useMemo(() => getSchoolsByTrainer(trainerId || ''), [trainerId, getSchoolsByTrainer]);

  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploads, setUploads] = useState<UploadedMedia[]>([]);

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);
  const todayDate = new Date().toISOString().split('T')[0];

  // Visit Timer tracker
  const [visitSeconds, setVisitSeconds] = useState(0);
  const timerRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (activeVisit.timerActive) {
      timerRef.current = setInterval(() => {
        setVisitSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setVisitSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeVisit.timerActive]);

  const formatTimer = (sec: number) => {
    const hrs = String(Math.floor(sec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const secs = String(sec % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const handleStartVisit = () => {
    if (!selectedSchoolId) return;
    // Captures mock GPS
    startVisit(selectedSchoolId, 26.7845 + Math.random() * 0.01, 75.7689 - Math.random() * 0.01);
  };

  const handleEndVisit = () => {
    endVisit();
  };

  const handleDownloadExcel = async () => {
    if (!selectedSchool) return;
    setDownloading(true);
    await downloadStudentIdSheet(selectedSchool.id, selectedSchool.name);
    setDownloading(false);
    useAppStore.getState().addToast('Excel Student ID sheet downloaded successfully', 'success');
  };

  const handleUploadFiles = async (files: FileList) => {
    if (!trainer) return;
    
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

      // Execute mock Drive upload process async
      uploadToDrive({
        trainerName: trainer.name,
        date: todayDate,
        file,
        onProgress: (prog) => {
          setUploads((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, progress: prog } : item
            )
          );
        }
      }).then((driveFile) => {
        setUploads((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'completed',
                  progress: 100,
                  drivePath: driveFile.path,
                  thumbnailUrl: driveFile.url
                }
              : item
          )
        );
        useAppStore.getState().addToast(`Media "${file.name}" uploaded to Drive`, 'success');
      }).catch(() => {
        setUploads((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: 'failed' } : item))
        );
      });

      return mediaItem;
    });

    setUploads((prev) => [...prev, ...newUploads]);
  };

  const handleDeleteUpload = async (id: string) => {
    const item = uploads.find((u) => u.id === id);
    if (item?.status === 'completed') {
      await deleteFromDrive(id);
    }
    setUploads((prev) => prev.filter((u) => u.id !== id));
    useAppStore.getState().addToast('Media removed successfully', 'info');
  };

  return (
    <div className="space-y-6">
      
      {/* School select selector */}
      <Card className="relative !overflow-visible">
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-primary-600" />
        
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mb-2">School Visit Portal</h2>
        <p className="text-xs text-slate-450 text-slate-500 font-semibold mb-6">
          Select the designated school to begin inspection timers.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Enter School Name
            </label>
            <input
              type="text"
              value={selectedSchoolId || ''}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              placeholder="Type school name manually..."
              className="w-full h-12 px-4 text-sm font-bold bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm"
            />
          </div>

          {selectedSchoolId && selectedSchoolId.trim() && !activeVisit.timerActive && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                <MapPin size={14} className="text-primary-500" />
                <span>Selected: {selectedSchoolId.trim()}</span>
              </div>
              <Button
                onClick={handleStartVisit}
                icon={Play}
              >
                Start Visit Timer
              </Button>
            </div>
          )}
        </div>

        {/* Excel Credential list download panel */}
        {selectedSchool && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-5 border-t border-slate-100 pt-5"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-primary-50/50 border border-primary-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-650 flex-shrink-0">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-700">Student ID Excel Credentials</h4>
                  <p className="text-xs text-slate-450 text-slate-500 font-semibold mt-0.5">
                    Download default logins list spreadsheet for {selectedSchool.totalStudents} pupils.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                icon={Download}
                onClick={handleDownloadExcel}
                loading={downloading}
                size="sm"
              >
                Download Excel
              </Button>
            </div>
          </motion.div>
        )}
      </Card>

      {/* Active Visit Dashboard timer */}
      {activeVisit.timerActive && (
        <Card className="border border-primary-200 bg-primary-50/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-primary-500" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0 animate-pulse">
                <StopCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Active visit: {schools.find(s => s.id === activeVisit.schoolId)?.name}
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Check-in start: {activeVisit.startTime} · GPS Tracked
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Session Duration</span>
                <span className="text-2xl font-black text-slate-800 font-mono block mt-0.5">{formatTimer(visitSeconds)}</span>
              </div>
              <Button
                variant="danger"
                icon={CheckCircle2}
                onClick={handleEndVisit}
              >
                Complete Visit
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Media Evidence Drag & Drop Upload card */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-primary-600" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">EOD Evidence Upload</h2>
            <p className="text-xs text-slate-450 text-slate-500 font-semibold mt-0.5">
              Upload captured photo/video media logs of the inspection visit.
            </p>
          </div>
          {trainer && (
            <span className="text-[10px] font-black text-slate-400 bg-slate-100 rounded-lg px-2.5 py-1 border border-slate-200/50">
              Drive / {trainer.name} / {todayDate}
            </span>
          )}
        </div>

        <UploadZone
          onFilesSelected={handleUploadFiles}
          uploads={uploads}
          onDeleteUpload={handleDeleteUpload}
        />
      </Card>

    </div>
  );
}
