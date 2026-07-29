import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface StarRatingProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  maxStars?: number;
  className?: string;
}

export default function StarRating({
  label,
  value,
  onChange,
  maxStars = 5,
  className
}: StarRatingProps) {
  const [hoveredStar, setHoveredStar] = React.useState<number | null>(null);

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-slate-100 last:border-0', className)}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: maxStars }).map((_, idx) => {
          const starVal = idx + 1;
          const active = starVal <= (hoveredStar ?? value);
          
          return (
            <motion.button
              key={idx}
              type="button"
              onClick={() => onChange(starVal)}
              onMouseEnter={() => setHoveredStar(starVal)}
              onMouseLeave={() => setHoveredStar(null)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 450, damping: 15 }}
              className="focus:outline-none cursor-pointer"
            >
              <Star
                size={22}
                className={cn(
                  'transition-colors duration-150',
                  active 
                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.2)]' 
                    : 'text-slate-200 fill-transparent'
                )}
              />
            </motion.button>
          );
        })}
        <span className="text-xs font-bold text-slate-400 w-8 text-right ml-1">
          {value > 0 ? `${value} / 5` : '--'}
        </span>
      </div>
    </div>
  );
}
