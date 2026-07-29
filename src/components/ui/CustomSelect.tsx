import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CustomSelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  options: CustomSelectOption[] | string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  className
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize array of strings or objects to objects format
  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((o) => o.value === value) || normalizedOptions[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative w-full text-left', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-left bg-white text-sm font-semibold text-slate-700 transition-all cursor-pointer hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          open && 'ring-2 ring-primary/20 border-primary'
        )}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown
          size={16}
          className={cn('text-slate-400 transition-transform flex-shrink-0', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
          {normalizedOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                'w-full px-4 py-2 text-xs text-left hover:bg-slate-50 transition-colors font-semibold cursor-pointer',
                value === opt.value ? 'bg-primary-50/50 text-primary font-bold' : 'text-slate-600'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
