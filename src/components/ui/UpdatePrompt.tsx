import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export function UpdatePrompt() {
  const {
    needRefresh:        [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Busca actualizaciones cada 60 segundos
      r && setInterval(() => r.update(), 60_000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[#00D084]/40 shadow-2xl shadow-black/30 text-sm animate-in fade-in slide-in-from-bottom-3 duration-300">
      <span className="w-2 h-2 rounded-full bg-[#00D084] animate-pulse shrink-0" />
      <p className="text-[var(--color-tx-primary)] font-medium whitespace-nowrap">
        Nueva versión disponible
      </p>
      <button
        className="btn btn-primary btn-sm gap-1.5 shrink-0"
        onClick={() => updateServiceWorker(true)}
      >
        <RefreshCw size={12} />
        Actualizar
      </button>
      <button
        className="btn btn-icon btn-ghost"
        onClick={() => setNeedRefresh(false)}
        aria-label="Ignorar"
      >
        <X size={14} />
      </button>
    </div>
  );
}
