import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarRange, ClipboardCheck } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import CustomSelect from '../../components/ui/CustomSelect';
import FeedbackTimeline from '../../components/workspace/FeedbackTimeline';
import { getToday, cn } from '../../lib/utils';

// Validation schema
const schema = z.object({
  highlight: z.string().min(5, 'Highlight of the day must be at least 5 characters'),
  lowlight: z.string().min(5, 'Challenge of the day must be at least 5 characters'),
  challenges: z.string().min(2, 'Challenges summary must be at least 2 characters'),
  hasComplaint: z.boolean(),
  complaintCategory: z.string().optional(),
  complaintSeverity: z.enum(['Low', 'Medium', 'High']).optional(),
  complaintDescription: z.string().optional(),
  suggestions: z.string().optional(),
  overallExperience: z.enum(['Excellent', 'Good', 'Average', 'Poor', 'Critical']),
  mood: z.enum(['Excellent', 'Good', 'Average', 'Poor', 'Critical'])
});

type FormValues = z.infer<typeof schema>;

export default function FeedbackTab() {
  const { trainerId } = useParams();

  const feedback = useAppStore((s) => s.feedback);
  const addFeedback = useAppStore((s) => s.addFeedback);

  const today = getToday();
  const todayFeedback = useMemo(() => {
    return feedback.find((f) => f.trainerId === trainerId && f.date === today);
  }, [feedback, trainerId, today]);

  const trainerFeedbackList = useMemo(() => {
    return feedback.filter((f) => f.trainerId === trainerId);
  }, [feedback, trainerId]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      highlight: '',
      lowlight: '',
      challenges: 'None',
      hasComplaint: false,
      complaintCategory: 'Infrastructure',
      complaintSeverity: 'Low',
      complaintDescription: '',
      suggestions: 'None',
      overallExperience: 'Good',
      mood: 'Good'
    }
  });

  const formValues = watch();
  const hasComplaint = formValues.hasComplaint;

  const onSubmit = (data: FormValues) => {
    addFeedback(data);
    reset();
  };

  const inputClass = cn(
    'w-full px-4 py-2.5 text-sm rounded-xl',
    'bg-white border border-slate-200/80 text-slate-800 placeholder:text-slate-400',
    'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
    'transition-all duration-200 shadow-sm'
  );

  const labelClass = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2';
  const errorClass = 'text-xs font-bold text-red-500 mt-1.5';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Submit daily EOD feedback form */}
      <Card className="lg:col-span-2 relative !overflow-visible">
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-primary-600" />
        
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mb-2 flex items-center gap-2">
          <CalendarRange className="text-primary-600" size={20} />
          <span>Daily Feedback Form (EOD)</span>
        </h2>
        <p className="text-xs text-slate-450 text-slate-500 font-semibold mb-6">
          Submit EOD logs of highlights, lowlights, issues and general suggestions.
        </p>

        {todayFeedback ? (
          <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-50 border border-slate-200/50 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-150 flex items-center justify-center mb-3">
              <ClipboardCheck size={24} />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">EOD Log Already Submitted</h3>
            <p className="text-xs text-slate-455 text-slate-400 font-semibold max-w-sm mt-1.5">
              Thank you for updating operations today. Read your submitted log details in the history tab on the right.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Highlight of the Day</label>
                <textarea {...register('highlight')} rows={3} className={cn(inputClass, 'resize-none')} placeholder="Mention smart classroom usage, parent engagement..." />
                {errors.highlight && <p className={errorClass}>{errors.highlight.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Challenges Faced</label>
                <textarea {...register('lowlight')} rows={3} className={cn(inputClass, 'resize-none')} placeholder="Mention transport delays, lab electricity shortage..." />
                {errors.lowlight && <p className={errorClass}>{errors.lowlight.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
              <div>
                <label className={labelClass}>Working Mood</label>
                <CustomSelect
                  options={['Excellent', 'Good', 'Average', 'Poor', 'Critical']}
                  value={formValues.mood || 'Good'}
                  onChange={(val) => setValue('mood', val as any, { shouldDirty: true })}
                />
              </div>
              <div>
                <label className={labelClass}>Overall Experience</label>
                <CustomSelect
                  options={['Excellent', 'Good', 'Average', 'Poor', 'Critical']}
                  value={formValues.overallExperience || 'Good'}
                  onChange={(val) => setValue('overallExperience', val as any, { shouldDirty: true })}
                />
              </div>
              <div>
                <label className={labelClass}>Session Block Summary</label>
                <input type="text" {...register('challenges')} className={inputClass} placeholder="e.g. Completed Grade 8 math validation" />
              </div>
            </div>

            {/* Complaint checklist block */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('hasComplaint')}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500/20"
                />
                <span className="text-xs font-bold text-slate-700">Flag an incident/complaint to administrator</span>
              </label>

              {hasComplaint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 p-4 border border-amber-250 bg-amber-50/20 rounded-2xl"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Complaint Area</label>
                      <CustomSelect
                        options={[
                          { value: 'Infrastructure', label: 'Infrastructure Maintenance' },
                          { value: 'Cooperation', label: 'School Cooperation / Principal Support' },
                          { value: 'Technical', label: 'Smart Classroom Kit Malfunctions' },
                          { value: 'Other', label: 'Other Operational Issues' }
                        ]}
                        value={formValues.complaintCategory || 'Infrastructure'}
                        onChange={(val) => setValue('complaintCategory', val, { shouldDirty: true })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Severity Alert Level</label>
                      <CustomSelect
                        options={[
                          { value: 'Low', label: 'Low Priority' },
                          { value: 'Medium', label: 'Medium Severity' },
                          { value: 'High', label: 'High Severity escalation' }
                        ]}
                        value={formValues.complaintSeverity || 'Low'}
                        onChange={(val) => setValue('complaintSeverity', val as any, { shouldDirty: true })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Details & Action Required Description</label>
                    <textarea {...register('complaintDescription')} rows={2} className={cn(inputClass, 'resize-none')} placeholder="Mention details..." />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <label className={labelClass}>EOD Suggestions / Feedbacks</label>
              <textarea {...register('suggestions')} rows={2} className={cn(inputClass, 'resize-none')} placeholder="Share feedback..." />
            </div>

            <div className="flex justify-end pt-3">
              <Button type="submit" loading={isSubmitting}>
                Submit Daily Report
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* History log timeline card listing */}
      <Card className="lg:col-span-1 relative overflow-hidden bg-slate-50/50">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5">Feedback History Logs</h3>
        <FeedbackTimeline feedback={trainerFeedbackList} />
      </Card>

    </div>
  );
}
