import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package, FlaskConical, Factory, FileText,
  CheckCircle2, ArrowRight, Clock, TrendingUp,
  Scale, Users2,
} from 'lucide-react';
import { pedidosService } from '@/services/pedidos.service';
import { tostionService } from '@/services/tostion.service';
import { produccionService } from '@/services/produccion.service';
import { facturasService } from '@/services/facturas.service';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusBadge, ESTADO_ORDER } from '@/components/ui/StatusBadge';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { PedidoEstado } from '@/types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return { label: `${Math.abs(diff)}d atrás`, urgent: true };
  if (diff === 0) return { label: 'Hoy', urgent: true };
  if (diff === 1) return { label: 'Mañana', urgent: true };
  return { label: `en ${diff}d`, urgent: false };
}

export function DashboardPage() {
  const pedidosQuery   = useQuery({ queryKey: ['pedidos'],           queryFn: () => pedidosService.getAll(),    staleTime: 30_000 });
  const tostionQuery   = useQuery({ queryKey: ['tostion','activos'],  queryFn: () => tostionService.getActivos(), staleTime: 30_000 });
  const produccionQuery= useQuery({ queryKey: ['produccion'],         queryFn: () => produccionService.getAll(), staleTime: 30_000 });
  const facturasQuery  = useQuery({ queryKey: ['facturas'],           queryFn: () => facturasService.getAll(),   staleTime: 30_000 });

  const pedidos = pedidosQuery.data ?? [];
  const isLoading = pedidosQuery.isLoading;

  const counts = useMemo(() => {
    const map = {} as Record<PedidoEstado, number>;
    ESTADO_ORDER.forEach((e) => (map[e] = 0));
    pedidos.forEach((p) => { map[p.estado] = (map[p.estado] ?? 0) + 1; });
    return map;
  }, [pedidos]);

  // KPIs derivados de múltiples fuentes
  const kpis = useMemo(() => {
    const activos    = pedidos.filter(p => p.estado !== 'ENTREGADO');
    const kgTotal    = activos.reduce((s, p) => s + Number(p.kilos ?? 0), 0);
    const entregados = pedidos.filter(p => p.estado === 'ENTREGADO').length;
    const facturadas = facturasQuery.data?.length ?? 0;
    const tostiones  = tostionQuery.data?.length ?? 0;
    return { activos: activos.length, kgTotal, entregados, facturadas, tostiones };
  }, [pedidos, facturasQuery.data, tostionQuery.data]);

  const recientes = useMemo(
    () => pedidos.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [pedidos]
  );

  const proximasEntregas = useMemo(
    () => pedidos
      .filter(p => p.diaEntrega && p.estado !== 'ENTREGADO')
      .sort((a, b) => a.diaEntrega.localeCompare(b.diaEntrega))
      .slice(0, 6),
    [pedidos]
  );

  return (
    <div className="page space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <span className="chip mb-2">PIPE insights</span>
          <h2 className="text-2xl font-bold text-[var(--color-tx-primary)] mt-1">Ciclo productivo</h2>
          <p className="text-sm text-[var(--color-tx-secondary)] mt-1">
            Vista en tiempo real del flujo de trabajo.
          </p>
        </div>
        <p className="text-xs text-[var(--color-tx-secondary)]">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs fila 1 — operativos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Pedidos activos"    value={isLoading ? '—' : kpis.activos}    icon={<Package size={15} />}       accent="#3B82F6" loading={isLoading} />
        <KpiCard label="En tostión"         value={tostionQuery.isLoading ? '—' : kpis.tostiones} icon={<FlaskConical size={15} />}  accent="#F59E0B" loading={tostionQuery.isLoading} />
        <KpiCard label="En producción"      value={isLoading ? '—' : counts['PRODUCCION']}  icon={<Factory size={15} />}        accent="#8B5CF6" loading={isLoading} />
        <KpiCard label="Listos para entrega" value={isLoading ? '—' : counts['LISTO_PARA_ENTREGA']} icon={<CheckCircle2 size={15} />}  accent="#00D084" loading={isLoading} />
      </div>

      {/* KPIs fila 2 — acumulados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Kg en proceso"      value={isLoading ? '—' : `${kpis.kgTotal.toFixed(0)} kg`} icon={<Scale size={15} />}          accent="#6366F1" loading={isLoading} />
        <KpiCard label="Entregados total"   value={isLoading ? '—' : kpis.entregados}  icon={<TrendingUp size={15} />}     accent="#10B981" loading={isLoading} />
        <KpiCard label="Facturas emitidas"  value={facturasQuery.isLoading ? '—' : kpis.facturadas} icon={<FileText size={15} />}         accent="#EC4899" loading={facturasQuery.isLoading} />
        <KpiCard label="Procesos hoy"       value={produccionQuery.isLoading ? '—' : (produccionQuery.data?.filter(p => p.fechaProcesamiento?.startsWith(new Date().toISOString().slice(0,10))).length ?? 0)} icon={<Users2 size={15} />} accent="#F97316" loading={produccionQuery.isLoading} />
      </div>

      {/* Pipeline visual */}
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-tx-secondary)] mb-4">
          Pipeline de estados · {pedidos.length} pedidos totales
        </p>
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {ESTADO_ORDER.map((estado, i) => {
            const count = counts[estado] ?? 0;
            const isLast = i === ESTADO_ORDER.length - 1;
            return (
              <div key={estado} className="flex items-center">
                <div className={`flex flex-col items-center min-w-[80px] px-2 py-3 rounded-lg transition-colors ${count > 0 ? 'bg-[var(--color-muted)]' : ''}`}>
                  <span className={`text-lg font-bold tabular-nums ${count > 0 ? 'text-[var(--color-tx-primary)]' : 'text-[var(--color-tx-secondary)] opacity-40'}`}>
                    {isLoading ? '–' : count}
                  </span>
                  <StatusBadge estado={estado} className="mt-1 text-[9px]" />
                </div>
                {!isLast && (
                  <ArrowRight size={13} className="text-[var(--color-tx-secondary)] opacity-30 mx-0.5 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Pedidos recientes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title text-base">Pedidos recientes</p>
            <Link to="/maquilas" className="text-xs font-semibold text-[#00D084] hover:underline flex items-center gap-1">
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>
          {isLoading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : recientes.length === 0 ? (
            <EmptyState
              title="Sin pedidos"
              description="Registra el primer pedido desde Maquilas."
              action={<Link to="/maquilas" className="btn btn-primary btn-sm">Registrar pedido</Link>}
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cliente</th>
                    <th>Kg</th>
                    <th>Estado</th>
                    <th>Entrega</th>
                  </tr>
                </thead>
                <tbody>
                  {recientes.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono text-xs font-semibold text-[var(--color-tx-primary)]">{p.code}</td>
                      <td className="max-w-[160px] truncate">{p.client?.name ?? '—'}</td>
                      <td className="tabular-nums">{Number(p.kilos).toFixed(1)}</td>
                      <td><StatusBadge estado={p.estado} /></td>
                      <td className="text-xs text-[var(--color-tx-secondary)]">{formatDate(p.diaEntrega)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Próximas entregas */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-[var(--color-tx-secondary)]" />
            <p className="section-title text-base">Próximas entregas</p>
          </div>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
          ) : proximasEntregas.length === 0 ? (
            <EmptyState title="Sin entregas próximas" description="No hay pedidos pendientes de entrega." />
          ) : (
            <div className="space-y-2">
              {proximasEntregas.map((p) => {
                const { label, urgent } = daysUntil(p.diaEntrega);
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-muted)] gap-2">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-xs text-[var(--color-tx-primary)] truncate">{p.code}</p>
                      <p className="text-xs text-[var(--color-tx-secondary)] truncate">{p.client?.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold ${urgent ? 'text-amber-500' : 'text-[var(--color-tx-primary)]'}`}>{label}</p>
                      <p className="text-[10px] text-[var(--color-tx-secondary)]">{formatDate(p.diaEntrega)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

