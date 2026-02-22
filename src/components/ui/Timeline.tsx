import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TimelineStep {
  id: string;
  label: string;
  description?: string;
  date?: string;
  status: 'completed' | 'active' | 'pending';
  icon?: ReactNode;
  color?: string;
}

interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

const statusStyles = {
  completed: { dot: 'bg-[#00D084] text-[#0F1419] border-[#00D084]', text: 'text-[var(--color-tx-primary)]' },
  active:    { dot: 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-500/30', text: 'text-[var(--color-tx-primary)]' },
  pending:   { dot: 'bg-[var(--color-muted)] text-[var(--color-tx-secondary)] border-[var(--color-border)]', text: 'text-[var(--color-tx-secondary)]' },
};

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <div className={cn('timeline', className)}>
      {steps.map((step, i) => {
        const styles = statusStyles[step.status];
        return (
          <div key={step.id} className="timeline-item">
            {/* Línea vertical */}
            {i < steps.length - 1 && (
              <div
                className="absolute left-[15px] top-8 w-0.5 bottom-0"
                style={{
                  background: step.status === 'completed'
                    ? 'rgba(0,208,132,0.35)'
                    : 'var(--color-border)',
                }}
              />
            )}

            {/* Punto */}
            <div className={cn('timeline-dot border-2 z-10', styles.dot)}>
              {step.icon ?? (
                <span className="text-[10px] font-bold">
                  {step.status === 'completed' ? '✓' : i + 1}
                </span>
              )}
            </div>

            {/* Contenido */}
            <div className="timeline-content">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <p className={cn('font-semibold text-sm', styles.text)}>{step.label}</p>
                {step.date && (
                  <span className="text-xs text-[var(--color-tx-secondary)]">{step.date}</span>
                )}
              </div>
              {step.description && (
                <p className="text-xs text-[var(--color-tx-secondary)] mt-0.5">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
