import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  padding?: string;
}

export default function Card({
  children,
  className,
  hover = false,
  onClick,
  padding = 'p-6',
  ...props
}: CardProps) {
  const Component = hover ? motion.div : 'div';
  
  // Custom spring hover configurations
  const motionProps: HTMLMotionProps<"div"> = hover
    ? {
        whileHover: { y: -3, scale: 1.01 },
        whileTap: { scale: 0.99 },
        transition: { type: 'spring', stiffness: 400, damping: 25 },
      }
    : {};

  return (
    // @ts-ignore
    <Component
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden transition-all duration-200',
        padding,
        hover && 'cursor-pointer hover:shadow-md hover:border-slate-300',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
}
