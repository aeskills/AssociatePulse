import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, School as SchoolIcon, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SchoolData } from '../../store/useAppStore';

export interface MultiSchoolSelectProps {
  schools: SchoolData[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
}

export default function MultiSchoolSelect({
  schools,
  selectedIds = [],
  onChange,
  placeholder = 'Select schools...'
}: MultiSchoolSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return schools;
    const q = search.toLowerCase();
    return schools.filter(
      (s) => s.name.toLowerCase().includes(q) || s.district.toLowerCase().includes(q)
    );
  }, [schools, search]);

  const selectedSchools = useMemo(() => {
    const set = new Set(selectedIds);
    return schools.filter((s) => set.has(s.id));
  }, [schools, selectedIds]);

  const toggleSchool = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div ref={containerRef} className="relative w-full text-left">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold',
          'bg-white border border-slate-200 text-slate-800 transition-all cursor-pointer min-h-[38px]',
          'hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500',
          isOpen && 'ring-2 ring-red-500/20 border-red-500 shadow-sm'
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1 py-0.5">
          {selectedSchools.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <SchoolIcon size={14} className="text-slate-400 shrink-0" />
              <span className="truncate">{placeholder}</span>
            </div>
          ) : (
            selectedSchools.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200/90 text-red-800 rounded-md text-[11px] font-black tracking-tight shrink-0"
              >
                <span className="truncate max-w-[140px]">{s.name}</span>
                <span
                  onClick={(e) => toggleSchool(s.id, e)}
                  className="hover:bg-red-200/60 p-0.5 rounded transition-colors cursor-pointer"
                >
                  <X size={12} className="text-red-600" />
                </span>
              </span>
            ))
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedIds.length > 0 && (
            <span
              onClick={handleClearAll}
              className="text-[10px] font-black text-slate-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-slate-100 uppercase tracking-wider"
              title="Clear all selections"
            >
              Clear
            </span>
          )}
          <ChevronDown
            size={15}
            className={cn('text-slate-400 transition-transform duration-200', isOpen && 'rotate-180 text-red-600')}
          />
        </div>
      </button>

      {/* Custom Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-[999] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150 w-[240px] sm:w-[280px]">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search school name or district..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 font-semibold focus:outline-none focus:border-red-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* School Options List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-bold">No schools found</div>
            ) : (
              filtered.map((s) => {
                const isSelected = selectedIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSchool(s.id)}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs font-semibold',
                      isSelected
                        ? 'bg-red-50/80 text-red-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="truncate font-black text-slate-800">{s.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium truncate">
                        {s.district} {s.udiseCode ? `· UDISE: ${s.udiseCode}` : ''}
                      </div>
                    </div>
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'border-slate-300 bg-white'
                      )}
                    >
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>{selectedIds.length} Selected</span>
            <span>{schools.length} Total Schools</span>
          </div>
        </div>
      )}
    </div>
  );
}
