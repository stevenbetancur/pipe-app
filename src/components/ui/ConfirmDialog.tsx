import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

interface InternalState extends ConfirmOptions {
  resolver: (v: boolean) => void;
}

export function ConfirmProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<InternalState | null>(null);

  const confirm: ConfirmFn = useCallback(
    (options) =>
      new Promise<boolean>((resolve) => {
        setState({
          title:       options.title       ?? '¿Confirmas esta acción?',
          description: options.description ?? 'Esta operación no se puede deshacer.',
          confirmText: options.confirmText ?? 'Confirmar',
          cancelText:  options.cancelText  ?? 'Cancelar',
          danger:      options.danger      ?? false,
          resolver:    resolve,
        });
      }),
    []
  );

  const close = useCallback((decision: boolean) => {
    setState((prev) => {
      prev?.resolver(decision);
      return null;
    });
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        size="md"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => close(false)}>
              {state?.cancelText}
            </button>
            <button
              className={`btn ${state?.danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => close(true)}
            >
              {state?.confirmText}
            </button>
          </div>
        }
      >
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <div>
            <h3 className="section-title">{state?.title}</h3>
            <p className="section-subtitle mt-1">{state?.description}</p>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
