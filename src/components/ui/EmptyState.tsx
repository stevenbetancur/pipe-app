import { type ReactNode } from 'react';
import { PackageSearch } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title = 'Sin resultados',
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('empty-state', className)}>
      <div className="w-12 h-12 rounded-2xl bg-[var(--color-muted)] flex items-center justify-center text-[var(--color-tx-secondary)]">
        {icon ?? <PackageSearch size={22} />}
      </div>
      <div>
        <p className="font-semibold text-[var(--color-tx-primary)]">{title}</p>
        {description && (
          <p className="text-sm text-[var(--color-tx-secondary)] mt-1">{description}</p>
        )}
      </div>
      {action && action}
    </div>
  );
}
