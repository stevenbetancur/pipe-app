import { type ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; label?: string };
  accent?: string; // color CSS
  loading?: boolean;
  className?: string;
}

export function KpiCard({ label, value, icon, trend, accent, loading, className }: KpiCardProps) {
  if (loading) {
    return (
      <div className={cn('kpi-card', className)}>
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-8 w-16 mt-2" />
      </div>
    );
  }

  return (
    <div className={cn('kpi-card', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-tx-secondary)]">
          {label}
        </p>
        {icon && (
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: accent ? `${accent}18` : 'var(--color-muted)', color: accent ?? 'var(--color-tx-secondary)' }}
          >
            {icon}
          </span>
        )}
      </div>

      <p
        className="text-[28px] font-bold leading-none tracking-tight"
        style={{ color: accent ?? 'var(--color-tx-primary)' }}
      >
        {value}
      </p>

      {trend && (
        <div className={cn('flex items-center gap-1 text-xs font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
          {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
          {trend.label && <span className="text-[var(--color-tx-secondary)] font-normal">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
