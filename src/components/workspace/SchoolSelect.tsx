import { useState, useMemo } from 'react';
import { Search, School, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SchoolData } from '../../store/useAppStore';

export interface SchoolSelectProps {
  schools: SchoolData[];
  value: string | null;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function SchoolSelect({
  schools,
  value,
  onChange,
  placeholder = 'Select a school...'
}: SchoolSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      schools.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.district.toLowerCase().includes(search.toLowerCase())
      ),
    [schools, search]
  );

  const selected = schools.find((s) => s.id === value);

  return (
    <div className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl',
          'bg-white border border-slate-200 text-left transition-all cursor-pointer',
          'hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
          open && 'ring-2 ring-primary-500/20 border-primary-500 shadow-sm'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
            <School size={16} className="text-primary-650" />
          </div>
          {selected ? (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{selected.name}</div>
              <div className="text-xs text-slate-400 font-medium">{selected.district} · UDISE: {selected.udiseCode}</div>
            </div>
          ) : (
            <span className="text-sm text-slate-400 font-medium">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={18}
          className={cn(
            'text-slate-400 transition-transform flex-shrink-0',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown menu options */}
      {open && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search text field */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search schools..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-400 placeholder:text-slate-400"
                autoFocus
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                No schools found
              </div>
            ) : (
              filtered.map((school) => (
                <button
                  key={school.id}
                  type="button"
                  onClick={() => {
                    onChange(school.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer',
                    value === school.id && 'bg-primary-50/50 text-primary-750 font-bold'
                  )}
                >
                  <div className="w-7.5 h-7.5 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <School size={14} className="text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-700 truncate">{school.name}</div>
                    <div className="text-xs text-slate-400">{school.district} · UDISE: {school.udiseCode}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Backdrop overlay to close */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />
      )}
    </div>
  );
}
