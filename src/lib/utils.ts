import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes cleanly
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get name initials for profile avatars (e.g. "Amit Sharma" -> "AS")
 */
export function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get current Indian date formatted as YYYY-MM-DD
 */
export function getToday(): string {
  const d = new Date();
  // Adjust to Indian Standard Time (IST, UTC+5:30)
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a date string with options
 */
export function formatDate(dateStr: string, options: Intl.DateTimeFormatOptions = {}): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options
  });
}

/**
 * Standardize time string formatting as 12-hour format (e.g. "07:24 PM")
 */
export function getCurrentFormattedTime(dateStrOrObj?: string | Date | null): string {
  if (!dateStrOrObj) {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (dateStrOrObj instanceof Date) {
    if (isNaN(dateStrOrObj.getTime())) return '';
    return dateStrOrObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  const str = String(dateStrOrObj).trim();
  if (str.includes('AM') || str.includes('PM') || str.includes('am') || str.includes('pm')) {
    return str;
  }
  try {
    const todayStr = new Date().toDateString();
    const d = new Date(`${todayStr} ${str}`);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  } catch (e) {}
  return str;
}

/**
 * Calculate working hours accurately between Check-In and Check-Out
 */
export function calculateWorkingHours(checkInStr?: string | null, checkOutStr?: string | null): string {
  if (!checkInStr) return '0.0';
  try {
    const todayStr = new Date().toDateString();
    const cin = new Date(`${todayStr} ${checkInStr}`);
    const cout = checkOutStr ? new Date(`${todayStr} ${checkOutStr}`) : new Date();

    if (isNaN(cin.getTime()) || isNaN(cout.getTime())) return '0.0';
    
    const diffMs = Math.max(0, cout.getTime() - cin.getTime());
    const hours = (diffMs / (1000 * 60 * 60)).toFixed(1);
    return hours;
  } catch (e) {
    return '0.0';
  }
}

/**
 * Deterministic background gradient for trainer cards
 */
export function getDeterministicGradient(seed: string): string {
  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-cyan-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-indigo-600',
    'from-amber-500 to-orange-600',
    'from-red-500 to-rose-600'
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

/**
 * Compress and resize an image file to a lightweight JPEG base64 string
 */
export function compressImageToBase64(file: File, maxWidth = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedB64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedB64);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


/**
 * Deterministic text/border colors for state badges
 */
export function getDeterministicColor(seed: string): string {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
