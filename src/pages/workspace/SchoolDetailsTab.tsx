import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, School as SchoolIcon, RefreshCw } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import SchoolSelect from '../../components/workspace/SchoolSelect';
import StarRating from '../../components/ui/StarRating';
import EmptyState from '../../components/ui/EmptyState';
import CustomSelect from '../../components/ui/CustomSelect';
import { logActivity, fetchLiveTrainerData, fetchLiveSchoolReport } from '../../services/googleSheets';
import { getToday, formatDate, cn } from '../../lib/utils';

// Form validation schema - 8 fields only
const schema = z.object({
  principalName: z.string().min(1, 'Principal name is required'),
  principalContact: z.string().regex(/^\d{10}$/, 'Must be a valid 10-digit contact number'),
  spoc1Name: z.string().min(1, 'SPOC 1 name is required'),
  spoc1Contact: z.string().regex(/^\d{10}$/, 'Must be a valid 10-digit contact number'),
  spoc2Name: z.string().optional(),
  spoc2Contact: z.string().optional().refine((val) => !val || /^\d{10}$/.test(val), 'Must be a valid 10-digit contact number'),
  totalTeachers: z.coerce.number().min(0, 'Cannot be negative'),
  totalStudents: z.coerce.number().min(0, 'Cannot be negative'),
  totalWorkingComputers: z.coerce.number().min(0, 'Cannot be negative'),
  internetFacility: z.string().min(1, 'Internet facility is required'),
  smartClass: z.string().min(1, 'Smart class selection is required'),
  remark: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

// 3 Rating Categories
const ratingCategories = [
  { key: 'infrastructure', label: 'Infrastructure & Facilities' },
  { key: 'management', label: 'School Management & Cooperation' },
  { key: 'engagement', label: 'Overall Engagement' }
];

export default function SchoolDetailsTab() {
  const { trainerId } = useParams();

  const trainers = useAppStore((s) => s.trainers);
  const getSchoolsByTrainer = useAppStore((s) => s.getSchoolsByTrainer);
  const schoolInspectionDetails = useAppStore((s) => s.schoolInspectionDetails);
  const allRatings = useAppStore((s) => s.ratings);
  const saveInspectionDetails = useAppStore((s) => s.saveInspectionDetails);
  const saveRating = useAppStore((s) => s.saveRating);

  const trainer = trainers.find((t) => t.id === trainerId) || trainers[0];
  const schools = useMemo(() => getSchoolsByTrainer(trainerId || ''), [trainerId, getSchoolsByTrainer]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);

  // Pre-fill form from database if already inspection exists
  const existingDetails = useMemo(() => {
    return schoolInspectionDetails.find((d) => d.schoolId === selectedSchoolId);
  }, [selectedSchoolId, schoolInspectionDetails]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isDirty }
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      principalName: '',
      principalContact: '',
      totalTeachers: 0,
      totalStudents: 0,
      totalWorkingComputers: 0,
      internetFacility: '',
      smartClass: '',
      remark: ''
    }
  });

  const formValues = watch();

  // 3 Star Ratings State + Remark (optional)
  const [ratings, setRatings] = useState<Record<string, number>>({
    infrastructure: 0,
    management: 0,
    engagement: 0
  });
  const [ratingRemark, setRatingRemark] = useState('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // UNIFIED: Reset form FIRST on school selection, then fetch live GSheet data if it matches the selected school.
  // Dependencies: ONLY selectedSchoolId, so typing in form fields NEVER triggers a re-reset loop.
  React.useEffect(() => {
    if (!selectedSchoolId || !selectedSchool) return;

    // STEP 1: Reset form to saved details for THIS school or blank
    const schoolSavedDetails = useAppStore.getState().schoolInspectionDetails.find((d) => d.schoolId === selectedSchoolId);
    reset({
      principalName: schoolSavedDetails?.principalName || '',
      principalContact: schoolSavedDetails?.principalContact || '',
      spoc1Name: schoolSavedDetails?.spoc1Name || '',
      spoc1Contact: schoolSavedDetails?.spoc1Contact || '',
      spoc2Name: schoolSavedDetails?.spoc2Name || '',
      spoc2Contact: schoolSavedDetails?.spoc2Contact || '',
      totalTeachers: schoolSavedDetails?.totalTeachers || 0,
      totalStudents: schoolSavedDetails?.totalStudents || 0,
      totalWorkingComputers: schoolSavedDetails?.totalWorkingComputers || 0,
      internetFacility: schoolSavedDetails?.internetFacility || '',
      smartClass: schoolSavedDetails?.smartClass || '',
      remark: schoolSavedDetails?.remark || ''
    });

    // Restore ratings from store for THIS school
    const existingRatingRecord = useAppStore.getState().ratings.find(
      (r) => r.schoolId === selectedSchoolId && r.trainerId === trainerId
    );
    if (existingRatingRecord) {
      setRatings(existingRatingRecord.ratings || { infrastructure: 0, management: 0, engagement: 0 });
      setRatingRemark(existingRatingRecord.comment || '');
    } else {
      setRatings({ infrastructure: 0, management: 0, engagement: 0 });
      setRatingRemark('');
    }

    // STEP 2: Fetch live data from Google Sheets "All School Report" master sheet
    if (selectedSchool) {
      setIsSyncing(true);
      fetchLiveSchoolReport(selectedSchool.name, selectedSchool.udiseCode)
        .then((reportData) => {
          if (!reportData) {
            setIsSyncing(false);
            return;
          }

          // Pre-fill form values from GSheet All School Report
          if (reportData.principalName) setValue('principalName', reportData.principalName);
          if (reportData.principalContact) setValue('principalContact', reportData.principalContact);
          if (reportData.spoc1Name) setValue('spoc1Name', reportData.spoc1Name);
          if (reportData.spoc1Contact) setValue('spoc1Contact', reportData.spoc1Contact);
          if (reportData.spoc2Name) setValue('spoc2Name', reportData.spoc2Name);
          if (reportData.spoc2Contact) setValue('spoc2Contact', reportData.spoc2Contact);
          if (reportData.totalTeachers !== undefined) setValue('totalTeachers', Number(reportData.totalTeachers) || 0);
          if (reportData.totalStudents !== undefined) setValue('totalStudents', Number(reportData.totalStudents) || 0);
          if (reportData.totalWorkingComputers !== undefined) setValue('totalWorkingComputers', Number(reportData.totalWorkingComputers) || 0);
          if (reportData.internetFacility) setValue('internetFacility', reportData.internetFacility);
          if (reportData.smartClass) setValue('smartClass', reportData.smartClass);
          if (reportData.schoolRemark) setValue('remark', reportData.schoolRemark);

          setRatings({
            infrastructure: Number(reportData.ratingInfra) || 0,
            management: Number(reportData.ratingMgmt) || 0,
            engagement: Number(reportData.ratingEngagement) || 0
          });
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, [selectedSchoolId]);

  const onSubmitDetails = (data: FormValues) => {
    if (!selectedSchoolId || !selectedSchool || !trainer) return;
    saveInspectionDetails({
      schoolId: selectedSchoolId,
      ...data
    });

    const todayFormatted = formatDate(getToday(), { day: '2-digit', month: '2-digit', year: 'numeric' });

    logActivity({
      trainerName: trainer.name,
      state: trainer.stateId || 'UP',
      district: trainer.district || '',
      activityType: 'School Details',
      dateStr: todayFormatted,
      schoolName: selectedSchool.name,
      udiseCode: selectedSchool.udiseCode,
      principalName: data.principalName,
      principalContact: data.principalContact,
      spoc1Name: data.spoc1Name,
      spoc1Contact: data.spoc1Contact,
      spoc2Name: data.spoc2Name || '',
      spoc2Contact: data.spoc2Contact || '',
      totalTeachers: data.totalTeachers,
      totalStudents: data.totalStudents,
      totalWorkingComputers: data.totalWorkingComputers,
      internetFacility: data.internetFacility,
      smartClass: data.smartClass,
      schoolRemark: data.remark || '',
      details: `Saved school info for ${selectedSchool.name}`
    });

    useAppStore.getState().addToast('School Information saved successfully!', 'success');
  };

  const onSubmitRating = () => {
    if (!selectedSchoolId || !selectedSchool || !trainerId || !trainer) return;
    
    const rated = Object.values(ratings).some((r) => r > 0);
    if (!rated) {
      useAppStore.getState().addToast('Please select ratings before saving', 'error');
      return;
    }

    saveRating(trainerId, selectedSchoolId, ratings, ratingRemark);

    const todayFormatted = formatDate(getToday(), { day: '2-digit', month: '2-digit', year: 'numeric' });

    logActivity({
      trainerName: trainer.name,
      state: trainer.stateId || 'UP',
      district: trainer.district || '',
      activityType: 'School Rating',
      dateStr: todayFormatted,
      schoolName: selectedSchool.name,
      udiseCode: selectedSchool.udiseCode,
      ratingInfra: ratings.infrastructure || 0,
      ratingMgmt: ratings.management || 0,
      ratingEngagement: ratings.engagement || 0,
      ratingRemark: ratingRemark.trim(),
      details: `Rated ${selectedSchool.name}`
    });

    useAppStore.getState().addToast('Ratings & Remark saved successfully!', 'success');
  };

  const inputClass = cn(
    'w-full px-4 py-2.5 text-sm rounded-xl font-semibold',
    'bg-white border border-slate-200/80 text-slate-800 placeholder:text-slate-400',
    'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
    'transition-all duration-200 shadow-sm'
  );

  const labelClass = 'block text-xs font-black text-slate-600 uppercase tracking-wider mb-2';
  const errorClass = 'text-xs font-bold text-red-500 mt-1.5';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left"
    >
      {/* Live Google Sheets Syncing Banner */}
      {isSyncing && (
        <div className="p-3.5 bg-blue-50/90 border border-blue-200/80 rounded-2xl text-blue-900 shadow-sm flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <RefreshCw className="animate-spin text-blue-600 shrink-0" size={18} />
            <p className="text-xs font-bold">Fetching school report & inspection details from Google Sheets...</p>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
            Live Sync
          </span>
        </div>
      )}
      {/* School selector select */}
      <Card className="relative !overflow-visible">
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-primary-600" />
        
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mb-4">School Report & Inspection Details</h2>
        <SchoolSelect
          schools={schools}
          value={selectedSchoolId}
          onChange={(val) => {
            setSelectedSchoolId(val);
            useAppStore.setState({ activeSchoolId: val });
          }}
          placeholder="Select a school to view details..."
        />
      </Card>

      {!selectedSchoolId ? (
        <EmptyState
          icon={SchoolIcon}
          title="Select a School First"
          description="Please select a school from the dropdown above to view, fetch live data, or fill inspection details."
        />
      ) : (
        <>
          {/* School details form — 8 Fields */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-primary-650" />
            
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-5 pb-3 border-b border-slate-100">
              School Information
            </h3>
            <form onSubmit={handleSubmit(onSubmitDetails) as any} className="space-y-5">
              
              {/* Row 1: Principal Name & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>1. Principal Name <span className="text-red-500">*</span></label>
                  <input type="text" {...register('principalName')} placeholder="Enter Principal Name..." className={inputClass} />
                  {errors.principalName && <p className={errorClass}>{errors.principalName.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>2. Principal Contact <span className="text-red-500">*</span></label>
                  <input type="text" {...register('principalContact')} placeholder="10-digit mobile number..." className={inputClass} />
                  {errors.principalContact && <p className={errorClass}>{errors.principalContact.message}</p>}
                </div>
              </div>

              {/* Row 2: SPOC 1 Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className={labelClass}>3. SPOC 1 Name <span className="text-red-500">*</span></label>
                  <input type="text" {...register('spoc1Name')} placeholder="Enter SPOC 1 Name..." className={inputClass} />
                  {errors.spoc1Name && <p className={errorClass}>{errors.spoc1Name.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>4. SPOC 1 Contact Number <span className="text-red-500">*</span></label>
                  <input type="text" {...register('spoc1Contact')} placeholder="10-digit mobile number..." className={inputClass} />
                  {errors.spoc1Contact && <p className={errorClass}>{errors.spoc1Contact.message}</p>}
                </div>
              </div>

              {/* Row 3: SPOC 2 Details (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className={labelClass}>5. SPOC 2 Name <span className="text-slate-400 font-semibold">(Optional)</span></label>
                  <input type="text" {...register('spoc2Name')} placeholder="Enter SPOC 2 Name (optional)..." className={inputClass} />
                  {errors.spoc2Name && <p className={errorClass}>{errors.spoc2Name.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>6. SPOC 2 Contact Number <span className="text-slate-400 font-semibold">(Optional)</span></label>
                  <input type="text" {...register('spoc2Contact')} placeholder="10-digit mobile number (optional)..." className={inputClass} />
                  {errors.spoc2Contact && <p className={errorClass}>{errors.spoc2Contact.message}</p>}
                </div>
              </div>

              {/* Row 4: Total Teacher, Total Students, Total Working Computers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className={labelClass}>7. Total Teacher <span className="text-red-500">*</span></label>
                  <input type="number" min="0" {...register('totalTeachers')} className={inputClass} />
                  {errors.totalTeachers && <p className={errorClass}>{errors.totalTeachers.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>8. Total Students <span className="text-red-500">*</span></label>
                  <input type="number" min="0" {...register('totalStudents')} className={inputClass} />
                  {errors.totalStudents && <p className={errorClass}>{errors.totalStudents.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>9. Total Working Computers <span className="text-red-500">*</span></label>
                  <input type="number" min="0" {...register('totalWorkingComputers')} className={inputClass} />
                  {errors.totalWorkingComputers && <p className={errorClass}>{errors.totalWorkingComputers.message}</p>}
                </div>
              </div>

              {/* Row 5: Internet facility & Smart Class */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-slate-100 pt-4">
                <div>
                  <label className={labelClass}>10. Internet Facility <span className="text-red-500">*</span></label>
                  <CustomSelect
                    options={['WiFi', 'LAN Connection', 'Dongle']}
                    value={formValues.internetFacility || 'WiFi'}
                    onChange={(val) => setValue('internetFacility', val, { shouldDirty: true })}
                  />
                </div>
                <div>
                  <label className={labelClass}>11. Smart Class <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-6 mt-2">
                    {['Yes', 'No'].map((option) => (
                      <label key={option} className="flex items-center gap-2 font-extrabold text-sm text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          value={option}
                          checked={formValues.smartClass === option}
                          onChange={(e) => setValue('smartClass', e.target.value, { shouldDirty: true })}
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 6: Remark (optional) */}
              <div className="border-t border-slate-100 pt-4">
                <label className={labelClass}>12. Remark <span className="text-slate-400 font-normal text-xs">(optional)</span></label>
                <textarea
                  {...register('remark')}
                  rows={3}
                  placeholder="Enter any operational remarks or notes (optional)..."
                  className={cn(inputClass, 'resize-none')}
                />
              </div>

              <div className="flex justify-end pt-3">
                <Button type="submit" icon={Save}>
                  Save Inspection Details
                </Button>
              </div>
            </form>
          </Card>

          {/* Rating category star components card — 3 Categories */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-primary-650" />
            
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-5 pb-3 border-b border-slate-100">
              School Performance Ratings
            </h3>
            <div className="space-y-5">
              {ratingCategories.map((cat) => (
                <StarRating
                  key={cat.key}
                  label={cat.label}
                  value={ratings[cat.key] || 0}
                  onChange={(val) => setRatings((prev) => ({ ...prev, [cat.key]: val }))}
                />
              ))}

              {/* Remark (optional) */}
              <div className="border-t border-slate-100 pt-4">
                <label className={labelClass}>Remark <span className="text-slate-400 font-normal text-xs">(optional)</span></label>
                <textarea
                  value={ratingRemark}
                  onChange={(e) => setRatingRemark(e.target.value)}
                  rows={3}
                  placeholder="Enter any additional rating feedback or performance remarks (optional)..."
                  className={cn(inputClass, 'resize-none')}
                />
              </div>

              <div className="flex justify-end pt-3">
                <Button onClick={onSubmitRating} icon={Save}>
                  Submit Ratings Log
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </motion.div>
  );
}
