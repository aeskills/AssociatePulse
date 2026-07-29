import { useState } from 'react';
import { Calendar, ChevronDown, AlertCircle, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import type { FeedbackRecord } from '../../store/useAppStore';
import Badge from '../ui/Badge';

export interface FeedbackTimelineProps {
  feedback: FeedbackRecord[];
}

export default function FeedbackTimeline({ feedback }: FeedbackTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    feedback.length > 0 ? feedback[0].id : null
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {feedback.map((item) => {
        const isExpanded = expandedId === item.id;
        
        return (
          <div
            key={item.id}
            className={cn(
              'border border-slate-200/50 rounded-2xl overflow-hidden transition-all duration-200',
              isExpanded ? 'shadow-md bg-white border-slate-300/40' : 'bg-slate-50/50 hover:bg-slate-50 border-transparent'
            )}
          >
            {/* Header Accordion trigger */}
            <button
              onClick={() => toggleExpand(item.id)}
              className="w-full flex items-center justify-between gap-4 p-4 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <Calendar size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-700">
                    Session Log — {new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium truncate max-w-md mt-0.5">{item.highlight}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {item.hasComplaint && (
                  <Badge color={item.complaintSeverity === 'High' ? 'red' : 'amber'} dot>
                    Complaint
                  </Badge>
                )}
                <ChevronDown
                  size={16}
                  className={cn('text-slate-400 transition-transform duration-250', isExpanded && 'rotate-180')}
                />
              </div>
            </button>

            {/* Content Accordion details */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-4 text-slate-650 bg-white">
                    
                    {/* Highlight and lowlight */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">Highlight of the Day</span>
                        <p className="text-xs text-slate-600 leading-relaxed bg-emerald-50/20 border border-emerald-100/50 rounded-xl p-3">
                          {item.highlight}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider block">Challenge of the Day</span>
                        <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/20 border border-amber-100/50 rounded-xl p-3">
                          {item.lowlight}
                        </p>
                      </div>
                    </div>

                    {/* Complaint detail */}
                    {item.hasComplaint && (
                      <div className="border border-red-100 bg-red-50/20 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                          <AlertCircle size={14} />
                          <span>Reported Incident — {item.complaintCategory} ({item.complaintSeverity} Severity)</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-normal pl-5">{item.complaintDescription}</p>
                      </div>
                    )}

                    {/* Footer suggestions */}
                    {item.suggestions && item.suggestions !== 'None' && (
                      <div className="flex gap-2 text-xs bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <Quote size={14} className="text-slate-400 transform scale-x-[-1] mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wider block mb-0.5">Trainer Suggestions</span>
                          <span className="text-slate-600 leading-relaxed">{item.suggestions}</span>
                        </div>
                      </div>
                    )}

                    {/* Performance Metrics Summary */}
                    <div className="flex flex-wrap gap-x-6 gap-y-2.5 text-xs text-slate-450 border-t border-slate-100 pt-3">
                      <div>
                        <span className="font-bold text-slate-400">Working Mood: </span>
                        <span className="font-extrabold text-slate-700">{item.mood}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400">Overall Rating: </span>
                        <span className="font-extrabold text-slate-700">{item.overallExperience}</span>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
