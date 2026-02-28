import { type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

// ─── Field wrapper ──────────────────────────────────────
interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}

export function Field({ label, error, hint, children, required, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="field-error">{error}</p>}
      {!error && hint && <p className="text-xs text-[var(--color-tx-secondary)] mt-1">{hint}</p>}
    </div>
  );
}

// ─── Input ──────────────────────────────────────────────
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { error?: string }
>(({ className, error, ...props }, ref) => (
  <input
    ref={ref}
    className={cn('input', error && 'error', className)}
    {...props}
  />
));
Input.displayName = 'Input';

// ─── Select ─────────────────────────────────────────────
interface SelectOption { value: string; label: string; }

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { error?: string; options: readonly SelectOption[]; placeholder?: string }
>(({ className, error, options, placeholder, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn('input', error && 'error', className)}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
      <svg className="w-3.5 h-3.5 text-[var(--color-tx-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </div>
  </div>
));
Select.displayName = 'Select';

// ─── Textarea ────────────────────────────────────────────
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }
>(({ className, error, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn('input', error && 'error', className)}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
