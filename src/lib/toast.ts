type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastPayload {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const TOAST_EVENT = 'pipe:toast';
const emitter = new EventTarget();

const emit = (type: ToastType, message: string, duration = 4000): void => {
  const id = crypto.randomUUID();
  const detail: ToastPayload = { id, type, message, duration };
  emitter.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail }));
};

export const toast = {
  success: (msg: string, duration?: number) => emit('success', msg, duration),
  error:   (msg: string, duration?: number) => emit('error',   msg, duration),
  info:    (msg: string, duration?: number) => emit('info',    msg, duration),
  warning: (msg: string, duration?: number) => emit('warning', msg, duration),
};

export const toastEvents = {
  subscribe: (listener: (payload: ToastPayload) => void): (() => void) => {
    const handler = (e: Event) => listener((e as CustomEvent<ToastPayload>).detail);
    emitter.addEventListener(TOAST_EVENT, handler);
    return () => emitter.removeEventListener(TOAST_EVENT, handler);
  },
};
