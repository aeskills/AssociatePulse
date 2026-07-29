import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

const toastIcons = {
  success: <CheckCircle className="text-emerald-500 flex-shrink-0" size={18} />,
  error: <AlertCircle className="text-red-500 flex-shrink-0" size={18} />,
  info: <AlertTriangle className="text-blue-500 flex-shrink-0" size={18} />
};

const toastColors = {
  success: 'bg-emerald-50 border-emerald-200/80 text-emerald-800 shadow-sm shadow-emerald-50/50',
  error: 'bg-red-50 border-red-200/80 text-red-800 shadow-sm shadow-red-50/50',
  info: 'bg-blue-50 border-blue-200/80 text-blue-800 shadow-sm shadow-blue-50/50'
};

export default function ToastContainer() {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);

  React.useEffect(() => {
    if (toasts.length > 0) {
      const lastToast = toasts[toasts.length - 1];
      const timer = setTimeout(() => {
        removeToast(lastToast.id);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toasts, removeToast]);

  return (
    <div id="toast-container" className="fixed top-4 left-4 right-4 sm:left-auto sm:right-5 sm:top-5 z-[9999] flex flex-col gap-2.5 max-w-sm mx-auto sm:mx-0 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`flex items-start gap-3 p-4 rounded-xl border pointer-events-auto shadow-md ${toastColors[toast.type]}`}
          >
            {toastIcons[toast.type]}
            <p className="text-sm font-semibold flex-1 leading-normal">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-lg hover:bg-black/5"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
