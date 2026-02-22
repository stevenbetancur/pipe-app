import { cn } from '@/lib/cn';
import type { PedidoEstado, EstadoEntrega } from '@/types';

const estadoConfig: Record<PedidoEstado, { label: string; className: string }> = {
  REGISTRADO:         { label: 'Registrado',        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  MAQUILA:            { label: 'Maquila',            className: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  TOSTION:            { label: 'En tostión',         className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  PRODUCCION:         { label: 'En producción',      className: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  FACTURACION:        { label: 'En facturación',     className: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  LISTO_PARA_ENTREGA: { label: 'Listo para entrega', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  ENTREGADO:          { label: 'Entregado',           className: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

const entregaConfig: Record<EstadoEntrega, { label: string; className: string }> = {
  PENDIENTE_ENTREGA:  { label: 'Pendiente',          className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  LISTO_PARA_ENTREGA: { label: 'Listo para entrega', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  ENTREGADO:          { label: 'Entregado',           className: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

interface StatusBadgeProps {
  estado?: PedidoEstado;
  entrega?: EstadoEntrega;
  className?: string;
}

export function StatusBadge({ estado, entrega, className }: StatusBadgeProps) {
  const config = estado
    ? estadoConfig[estado]
    : entrega
    ? entregaConfig[entrega]
    : null;

  if (!config) return null;

  return (
    <span className={cn('badge', config.className, className)}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {config.label}
    </span>
  );
}

// Mapa para pipeline visual
export const ESTADO_ORDER: PedidoEstado[] = [
  'REGISTRADO', 'MAQUILA', 'TOSTION', 'PRODUCCION', 'FACTURACION', 'LISTO_PARA_ENTREGA', 'ENTREGADO'
];

export const ESTADO_LABELS = estadoConfig;
