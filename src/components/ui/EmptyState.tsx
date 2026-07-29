import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 bg-slate-50 border border-slate-200/50 rounded-2xl',
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200/30">
        <Icon size={22} />
      </div>
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      <p className="text-xs text-slate-450 text-slate-400 font-semibold max-w-xs mt-1.5 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
