import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCheck, Loader2, Package, ChevronRight, Boxes, Truck, Scale } from 'lucide-react';
import { pedidosService } from '@/services/pedidos.service';
import { produccionService, type CreateProduccionPayload } from '@/services/produccion.service';
import { toast } from '@/lib/toast';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import type { Pedido } from '@/types';

// El proceso se guía por los datos del pedido (detalleEmpaque, formaEntrega)
// fechaNotificacionFacturacion = hoy (automático) → mueve estado a FACTURACION
const schema = z.object({
  proceso:            z.enum(['A_GRANEL', 'EMPACADO'] as const, { error: 'Tipo de proceso requerido' }),
  kilosRecibidos:     z.coerce.number().positive('Debe ser mayor a 0').optional().or(z.literal('')),
  entregaFinal:       z.string().min(1, 'Descripción de salida requerida'),
  fechaProcesamiento: z.string().min(1, 'Fecha requerida'),
});

type FormValues = z.infer<typeof schema>;

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Sugerir descripción de salida según detalleEmpaque
function sugerirSalida(pedido: Pedido): string {
  const e = pedido.detalleEmpaque?.toLowerCase() ?? '';
  if (e.includes('1 lb') || e.includes('1lb'))  return 'Bolsas de 1 lb';
  if (e.includes('500'))                         return 'Bolsas de 500 g';
  if (e.includes('250'))                         return 'Bolsas de 250 g';
  if (e.includes('granel'))                      return 'Sacos a granel';
  return '';
}

export function ProduccionPage() {
  const qc = useQueryClient();
  const [targetPedido, setTargetPedido] = useState<Pedido | null>(null);

  const pedidosQuery = useQuery({
    queryKey: ['pedidos', { estado: 'PRODUCCION' }],
    queryFn: () => pedidosService.getAll('PRODUCCION'),
    staleTime: 20_000,
  });

  const historialQuery = useQuery({
    queryKey: ['produccion'],
    queryFn: () => produccionService.getAll(),
    staleTime: 30_000,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: { fechaProcesamiento: new Date().toISOString().slice(0, 10) },
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateProduccionPayload) => produccionService.create(payload),
    onSuccess: () => {
      toast.success('Producción registrada — pedido enviado a Facturación');
      qc.invalidateQueries({ queryKey: ['pedidos'] });
      qc.invalidateQueries({ queryKey: ['produccion'] });
      setTargetPedido(null);
      reset({ fechaProcesamiento: new Date().toISOString().slice(0, 10) });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'No se pudo registrar el proceso'),
  });

  const openModal = (pedido: Pedido) => {
    reset({
      proceso: 'A_GRANEL',
      kilosRecibidos: undefined,
      entregaFinal: sugerirSalida(pedido),
      fechaProcesamiento: new Date().toISOString().slice(0, 10),
    });
    setTargetPedido(pedido);
  };

  const onSubmit = handleSubmit((values) => {
    if (!targetPedido) return;
    mutation.mutate({
      pedidoId: targetPedido.id,
      proceso: values.proceso as string,
      kilosRecibidos: values.kilosRecibidos ? Number(values.kilosRecibidos) : null,
      empaque: targetPedido.detalleEmpaque ?? values.proceso,
      entregaFinal: values.entregaFinal,
      fechaProcesamiento: values.fechaProcesamiento,
      // Siempre hoy → activa la transición a FACTURACION en el backend
      fechaNotificacionFacturacion: new Date().toISOString().slice(0, 10),
    });
  });

  return (
    <div className="page space-y-8">
      {/* Header */}
      <div>
        <span className="chip mb-2">Pipeline operativo</span>
        <h2 className="text-2xl font-bold text-[var(--color-tx-primary)] mt-1">Producción</h2>
        <p className="text-sm text-[var(--color-tx-secondary)] mt-1">
          Empaque y molido de lotes tostados. Al registrar, el pedido avanza a Facturación automáticamente.
        </p>
      </div>

      {/* Flujo visual */}
      <div className="flex items-center gap-2 text-sm text-[var(--color-tx-secondary)]">
        <span className="font-semibold text-amber-600">EN TOSTIÓN</span>
        <ChevronRight size={14} />
        <span className="font-semibold text-[var(--color-tx-primary)]">EN PRODUCCIÓN</span>
        <ChevronRight size={14} />
        <span className="font-semibold text-[#00D084]">FACTURACIÓN</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="En producción"    value={pedidosQuery.data?.length ?? 0}   icon={<Package size={15} />}     accent="#8B5CF6" loading={pedidosQuery.isLoading} />
        <KpiCard label="Procesados hoy"   value={historialQuery.data?.filter(p => p.fechaProcesamiento?.startsWith(new Date().toISOString().slice(0,10))).length ?? 0} icon={<CheckCheck size={15} />} accent="#00D084" loading={historialQuery.isLoading} />
        <KpiCard label="Total procesados" value={historialQuery.data?.length ?? 0}  icon={<Boxes size={15} />}        accent="#3B82F6" loading={historialQuery.isLoading} />
      </div>

      {/* Lotes en producción */}
      <div className="card space-y-4">
        <div>
          <p className="section-title">Lotes en producción</p>
          <p className="section-subtitle">Selecciona un lote para registrar el proceso de empaque/molido</p>
        </div>

        {pedidosQuery.isLoading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : !pedidosQuery.data?.length ? (
          <EmptyState title="Sin lotes en producción" description="Cuando un lote finalice tostión aparecerá aquí." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pedidosQuery.data.map((pedido) => (
              <div key={pedido.id} className="card border hover:border-[var(--color-brand)] transition-colors">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-sm">{pedido.code}</p>
                    <p className="text-xs text-[var(--color-tx-secondary)] truncate">{pedido.client?.name}</p>
                  </div>
                  <StatusBadge estado={pedido.estado} />
                </div>

                {/* Detalles de empaque — guía al operario */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-xs">
                    <Scale size={11} className="text-[var(--color-tx-secondary)] shrink-0" />
                    <span className="text-[var(--color-tx-secondary)]">Kilos:</span>
                    <span className="font-semibold">{Number(pedido.kilos).toFixed(1)} kg</span>
                  </div>
                  {pedido.presentacion && (
                    <div className="flex items-center gap-2 text-xs">
                      <Package size={11} className="text-[var(--color-tx-secondary)] shrink-0" />
                      <span className="text-[var(--color-tx-secondary)]">Presentación:</span>
                      <span className="font-semibold">{pedido.presentacion}</span>
                    </div>
                  )}
                  {pedido.detalleEmpaque && (
                    <div className="flex items-start gap-2 text-xs">
                      <Boxes size={11} className="text-[var(--color-tx-secondary)] shrink-0 mt-0.5" />
                      <span className="text-[var(--color-tx-secondary)]">Empaque:</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">{pedido.detalleEmpaque}</span>
                    </div>
                  )}
                  {pedido.formaEntrega && (
                    <div className="flex items-center gap-2 text-xs">
                      <Truck size={11} className="text-[var(--color-tx-secondary)] shrink-0" />
                      <span className="text-[var(--color-tx-secondary)]">Entrega:</span>
                      <span className="font-semibold">{pedido.formaEntrega}</span>
                    </div>
                  )}
                </div>

                <button className="btn btn-sm btn-primary w-full gap-1.5" onClick={() => openModal(pedido)}>
                  <CheckCheck size={12} />
                  Registrar proceso
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial */}
      {!!historialQuery.data?.length && (
        <div className="card">
          <p className="section-title mb-4">Historial de producción</p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pedido</th><th>Cliente</th><th>Proceso</th>
                  <th>Salida registrada</th><th>Fecha proceso</th><th>Noti. facturación</th>
                </tr>
              </thead>
              <tbody>
                {historialQuery.data.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs font-semibold">{p.pedido?.code}</td>
                    <td className="text-[var(--color-tx-secondary)] max-w-[140px] truncate">{p.pedido?.client?.name}</td>
                    <td><span className="badge bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{p.proceso}</span></td>
                    <td className="text-xs">{p.entregaFinal}</td>
                    <td className="text-xs">{fmt(p.fechaProcesamiento)}</td>
                    <td className="text-xs">
                      {p.fechaNotificacionFacturacion
                        ? <span className="text-[#00D084] font-semibold">{fmt(p.fechaNotificacionFacturacion)}</span>
                        : <span className="text-[var(--color-tx-secondary)]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal registrar */}
      <Modal
        open={!!targetPedido}
        onClose={() => { setTargetPedido(null); reset(); }}
        title="Registrar proceso de producción"
        description={`Pedido ${targetPedido?.code ?? ''} — Al guardar pasará a Facturación`}
        size="md"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => { setTargetPedido(null); reset(); }}>Cancelar</button>
            <button className="btn btn-primary gap-2" onClick={onSubmit} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Registrar y enviar a Facturación
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {targetPedido && (
            <div className="rounded-lg bg-[var(--color-muted)] p-3 grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-xs text-[var(--color-tx-secondary)]">Pedido</p><p className="font-mono font-semibold">{targetPedido.code}</p></div>
              <div><p className="text-xs text-[var(--color-tx-secondary)]">Cliente</p><p className="font-semibold truncate">{targetPedido.client?.name}</p></div>
              <div><p className="text-xs text-[var(--color-tx-secondary)]">Empaque pedido</p><p className="font-semibold text-purple-600 dark:text-purple-400">{targetPedido.detalleEmpaque ?? '—'}</p></div>
              <div><p className="text-xs text-[var(--color-tx-secondary)]">Forma de entrega</p><p className="font-semibold">{targetPedido.formaEntrega ?? '—'}</p></div>
              <div><p className="text-xs text-[var(--color-tx-secondary)]">Fecha de entrega</p><p className="font-semibold">{fmt(targetPedido.diaEntrega)}</p></div>
              <div><p className="text-xs text-[var(--color-tx-secondary)]">Notificación facturación</p><p className="font-semibold text-[#00D084]">Hoy — automática</p></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo de proceso" error={errors.proceso?.message} required>
              <Select
                {...register('proceso')}
                placeholder="Seleccionar"
                options={[
                  { value: 'A_GRANEL', label: 'A Granel' },
                  { value: 'EMPACADO', label: 'Empacado' },
                ]}
                error={errors.proceso?.message}
              />
            </Field>

            <Field label="Kilos recibidos del tostador" error={errors.kilosRecibidos?.message} hint="Kilos con los que inicia producción">
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 95"
                {...register('kilosRecibidos')}
                error={errors.kilosRecibidos?.message}
              />
            </Field>

            <Field label="Fecha de procesamiento" error={errors.fechaProcesamiento?.message} required>
              <Input type="date" {...register('fechaProcesamiento')} error={errors.fechaProcesamiento?.message} />
            </Field>

            <div />

            <Field
              label="Salida / Unidades producidas"
              error={errors.entregaFinal?.message}
              required
              hint={targetPedido?.detalleEmpaque ? `Según empaque: ${targetPedido.detalleEmpaque}` : 'Describe el resultado'}
              className="col-span-2"
            >
              <textarea
                rows={3}
                placeholder="Ej: 48 bolsas de 500 g selladas en cajas de 12 — lote A"
                {...register('entregaFinal')}
                className={`input resize-y min-h-[72px]${
                  errors.entregaFinal ? ' border-red-500 focus:ring-red-500' : ''
                }`}
              />
              {errors.entregaFinal && (
                <p className="text-xs text-red-500 mt-1">{errors.entregaFinal.message}</p>
              )}
            </Field>
          </div>

          <p className="text-xs text-[var(--color-tx-secondary)] bg-[var(--color-muted)] rounded-lg p-3">
            💡 Al confirmar, se notificará automáticamente al módulo de <strong>Facturación</strong> con la fecha de hoy.
          </p>
        </div>
      </Modal>
    </div>
  );
}

