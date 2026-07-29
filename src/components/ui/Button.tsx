import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
        // Size mapping
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2.5 text-sm',
        size === 'lg' && 'px-6 py-3.5 text-base',
        // Variant mapping
        variant === 'primary' && 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-500/10 border border-primary-700/20',
        variant === 'secondary' && 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/40',
        variant === 'outline' && 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm',
        variant === 'danger' && 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-500/10 border border-red-700/20',
        variant === 'ghost' && 'hover:bg-slate-100 text-slate-600',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} className="flex-shrink-0" />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} className="flex-shrink-0" />}
    </button>
  );
}
