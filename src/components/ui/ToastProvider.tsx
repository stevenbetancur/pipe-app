import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { toastEvents, type ToastPayload } from '@/lib/toast';
import { cn } from '@/lib/cn';

const icons = {
  success: <CheckCircle2 size={16} className="text-[#00D084] shrink-0 mt-0.5" />,
  error:   <XCircle     size={16} className="text-red-400 shrink-0 mt-0.5" />,
  info:    <Info        size={16} className="text-blue-400 shrink-0 mt-0.5" />,
  warning: <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />,
};

function ToastItem({ toast, onRemove }: { toast: ToastPayload; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="toast"
    >
      {icons[toast.type]}
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className={cn('btn-icon btn-ghost shrink-0 opacity-60 hover:opacity-100')}
        aria-label="Cerrar"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return toastEvents.subscribe((payload) => {
      setToasts((prev) => [...prev.slice(-4), payload]);
    });
  }, []);

  return (
    <div className="toast-portal" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </AnimatePresence>
    </div>
  );
}
