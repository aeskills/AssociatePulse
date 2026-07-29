import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children: React.ReactNode;
  color?: 'green' | 'red' | 'amber' | 'blue' | 'indigo' | 'slate';
  dot?: boolean;
  className?: string;
}

const colorMap = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-50/50',
  red: 'bg-red-50 text-red-700 border-red-200/60 shadow-sm shadow-red-50/50',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/60 shadow-sm shadow-amber-50/50',
  blue: 'bg-blue-50 text-blue-700 border-blue-200/60 shadow-sm shadow-blue-50/50',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-sm shadow-indigo-50/50',
  slate: 'bg-slate-50 text-slate-600 border-slate-200/60'
};

const dotColorMap = {
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  slate: 'bg-slate-400'
};

export default function Badge({
  children,
  color = 'slate',
  dot = false,
  className
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        colorMap[color],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColorMap[color])} />}
      {children}
    </span>
  );
}
