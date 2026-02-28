import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Loader2, CheckCircle2, Truck } from 'lucide-react';
import { pedidosService } from '@/services/pedidos.service';
import { facturasService, type CreateFacturaPayload } from '@/services/facturas.service';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import type { Factura, EstadoEntrega } from '@/types';

const SEMAFORO: Record<EstadoEntrega, string> = {
  PENDIENTE_ENTREGA:  'bg-red-500',
  LISTO_PARA_ENTREGA: 'bg-yellow-400',
  ENTREGADO:          'bg-green-500',
};

const SEMAFORO_LABEL: Record<EstadoEntrega, string> = {
  PENDIENTE_ENTREGA:  'Pendiente de entrega',
  LISTO_PARA_ENTREGA: 'Listo para entrega',
  ENTREGADO:          'Entregado',
};

const schema = z.object({
  pedidoId:    z.string().min(1, 'Selecciona un pedido'),
  numero:      z.string().min(1, 'Número de factura requerido'),
  fecha:       z.string().min(1, 'Fecha requerida'),
  valorTotal:  z.coerce.number().positive('El valor debe ser mayor a 0'),
  estadoEntrega: z.enum(['PENDIENTE_ENTREGA', 'LISTO_PARA_ENTREGA', 'ENTREGADO']).optional(),
  fechaConfirmacionEntrega: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(v: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
}

export function FacturacionPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [previewFactura, setPreviewFactura] = useState<Factura | null>(null);

  const pedidosQuery = useQuery({
    queryKey: ['pedidos', { estado: 'FACTURACION' }],
    queryFn: () => pedidosService.getAll('FACTURACION'),
    staleTime: 20_000,
  });

  const facturasQuery = useQuery({
    queryKey: ['facturas'],
    queryFn: () => facturasService.getAll(),
    staleTime: 20_000,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      fecha: new Date().toISOString().slice(0, 10),
      estadoEntrega: 'PENDIENTE_ENTREGA',
    },
  });

  const crearFactura = useMutation({
    mutationFn: (payload: CreateFacturaPayload) => facturasService.create(payload),
    onSuccess: () => {
      toast.success('Factura generada · Se notificará al cliente');
      qc.invalidateQueries({ queryKey: ['pedidos'] });
      qc.invalidateQueries({ queryKey: ['facturas'] });
      setShowForm(false);
      reset();
    },
    onError: () => toast.error('No se pudo generar la factura'),
  });

  const updateEstado = useMutation({
    mutationFn: ({ id, estado, fecha }: { id: string; estado: EstadoEntrega; fecha?: string }) =>
      facturasService.updateEstado(id, estado, fecha),
    onSuccess: () => {
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: ['facturas'] });
      qc.invalidateQueries({ queryKey: ['pedidos'] });
      setPreviewFactura(null);
    },
    onError: () => toast.error('No se pudo actualizar el estado'),
  });

  const onSubmit = handleSubmit(async (values) => {
    const ok = await confirm({
      title: `Generar factura ${values.numero}`,
      description: 'Se generará la factura y se notificará automáticamente al cliente.',
      confirmText: 'Generar factura',
    });
    if (!ok) return;
    crearFactura.mutate({
      pedidoId: values.pedidoId,
      numero: values.numero,
      fecha: values.fecha,
      valorTotal: values.valorTotal,
      estadoEntrega: values.estadoEntrega ?? 'PENDIENTE_ENTREGA',
      fechaConfirmacionEntrega: values.fechaConfirmacionEntrega || null,
    });
  });

  const handleMarcarListo = async (factura: Factura) => {
    const ok = await confirm({
      title: 'Marcar como listo para entrega',
      description: `¿El pedido ${factura.pedido?.code} está listo para despachar al cliente?`,
      confirmText: 'Marcar como listo',
    });
    if (!ok) return;
    updateEstado.mutate({ id: factura.id, estado: 'LISTO_PARA_ENTREGA' });
  };

  const handleConfirmarEntrega = async (factura: Factura) => {
    const ok = await confirm({
      title: 'Confirmar entrega',
      description: `¿Confirmas la entrega del pedido ${factura.pedido?.code}?`,
      confirmText: 'Confirmar entrega',
    });
    if (!ok) return;
    updateEstado.mutate({
      id: factura.id,
      estado: 'ENTREGADO',
      fecha: new Date().toISOString().slice(0, 10),
    });
  };

  const stats = useMemo(() => ({
    pendientes: pedidosQuery.data?.length ?? 0,
    facturas:   facturasQuery.data?.length ?? 0,
    entregadas: facturasQuery.data?.filter((f) => f.estadoEntrega === 'ENTREGADO').length ?? 0,
    totalFacturado: facturasQuery.data?.reduce((acc, f) => acc + Number(f.valorTotal), 0) ?? 0,
  }), [pedidosQuery.data, facturasQuery.data]);

  return (
    <div className="page space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="chip mb-2">Ciclo de facturación</span>
          <h2 className="text-2xl font-bold text-[var(--color-tx-primary)] mt-1">Facturación</h2>
          <p className="text-sm text-[var(--color-tx-secondary)] mt-1">
            Genera facturas y cierra el ciclo con la confirmación de entrega.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={!pedidosQuery.data?.length}
        >
          <Plus size={15} />
          Nueva factura
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Pendientes de facturar" value={stats.pendientes} accent="#EC4899" />
        <KpiCard label="Facturas generadas" value={stats.facturas} accent="#6B7280" />
        <KpiCard label="Entregas confirmadas" value={stats.entregadas} accent="#00D084" />
        <KpiCard label="Total facturado" value={fmtMoney(stats.totalFacturado)} accent="#3B82F6" />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Lista de facturas */}
        <div className="card">
          <p className="section-title text-base mb-4">Historial de facturas</p>
          {facturasQuery.isLoading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (facturasQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="Sin facturas"
              description="Genera la primera factura cuando un pedido esté listo."
              action={
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} disabled={!pedidosQuery.data?.length}>
                  <Plus size={13} /> Nueva factura
                </button>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>N° Factura</th>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado entrega</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(facturasQuery.data ?? []).map((f) => (
                    <tr key={f.id}>
                      <td className="font-mono text-xs font-bold">{f.numero}</td>
                      <td className="font-mono text-xs">{f.pedido?.code}</td>
                      <td className="max-w-[140px] truncate text-[var(--color-tx-secondary)]">{f.pedido?.client?.name}</td>
                      <td className="text-xs">{fmt(f.fecha)}</td>
                      <td className="tabular-nums font-semibold text-sm">{fmtMoney(Number(f.valorTotal))}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn('inline-block w-2.5 h-2.5 rounded-full flex-shrink-0', SEMAFORO[f.estadoEntrega])}
                            title={SEMAFORO_LABEL[f.estadoEntrega]}
                          />
                          <StatusBadge entrega={f.estadoEntrega} />
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm text-xs"
                          onClick={() => setPreviewFactura(f)}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pedidos listos para facturar */}
        <div className="card">
          <p className="section-title text-base mb-4">Pedidos listos para facturar</p>
          {pedidosQuery.isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map((i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
            </div>
          ) : (pedidosQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="Sin pedidos pendientes"
              description="Cuando Producción complete un lote aparecerá aquí."
            />
          ) : (
            <div className="space-y-2">
              {(pedidosQuery.data ?? []).map((pedido) => (
                <div
                  key={pedido.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-muted)] gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-xs">{pedido.code}</p>
                    <p className="text-xs text-[var(--color-tx-secondary)] truncate">{pedido.client?.name}</p>
                    <p className="text-xs text-[var(--color-tx-secondary)]">Entrega: {fmt(pedido.diaEntrega)}</p>
                  </div>
                  <button
                    className="btn btn-primary btn-sm shrink-0"
                    onClick={() => setShowForm(true)}
                  >
                    Facturar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal nueva factura ── */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); reset(); }}
        title="Generar factura"
        description="Completa los datos para generar la factura."
        size="md"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={onSubmit} disabled={crearFactura.isPending}>
              {crearFactura.isPending && <Loader2 size={14} className="animate-spin" />}
              Generar factura
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Pedido" error={errors.pedidoId?.message} required>
            <Select
              {...register('pedidoId')}
              placeholder="Selecciona un pedido"
              options={(pedidosQuery.data ?? []).map((p) => ({
                value: p.id,
                label: `${p.code} · ${p.client?.name}`,
              }))}
              error={errors.pedidoId?.message}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Número de factura" error={errors.numero?.message} required>
              <Input placeholder="FAC-2026-001" {...register('numero')} error={errors.numero?.message} />
            </Field>

            <Field label="Fecha" error={errors.fecha?.message} required>
              <Input type="date" {...register('fecha')} error={errors.fecha?.message} />
            </Field>
          </div>

          <Field label="Valor total (COP)" error={errors.valorTotal?.message} required>
            <Input type="number" step="1000" min="0" placeholder="5000000" {...register('valorTotal')} error={errors.valorTotal?.message} />
          </Field>

          <Field label="Estado de entrega">
            <Select
              {...register('estadoEntrega')}
              options={[
                { value: 'PENDIENTE_ENTREGA', label: 'Pendiente de entrega' },
                { value: 'LISTO_PARA_ENTREGA', label: 'Listo para entrega' },
                { value: 'ENTREGADO', label: 'Entregado' },
              ]}
            />
          </Field>

          <Field label="Fecha confirmación de entrega" hint="Opcional">
            <Input type="date" {...register('fechaConfirmacionEntrega')} />
          </Field>
        </div>
      </Modal>

      {/* ── Modal preview factura ── */}
      <Modal
        open={!!previewFactura}
        onClose={() => setPreviewFactura(null)}
        title={`Factura ${previewFactura?.numero}`}
        description={`Pedido ${previewFactura?.pedido?.code} · ${previewFactura?.pedido?.client?.name}`}
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setPreviewFactura(null)}>Cerrar</button>
            {previewFactura?.estadoEntrega === 'PENDIENTE_ENTREGA' && (
              <button
                className="btn btn-primary gap-1.5"
                onClick={() => previewFactura && handleMarcarListo(previewFactura)}
                disabled={updateEstado.isPending}
              >
                {updateEstado.isPending ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                Marcar como listo
              </button>
            )}
            {previewFactura?.estadoEntrega === 'LISTO_PARA_ENTREGA' && (
              <button
                className="btn btn-primary gap-1.5"
                onClick={() => previewFactura && handleConfirmarEntrega(previewFactura)}
                disabled={updateEstado.isPending}
              >
                {updateEstado.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Confirmar entrega
              </button>
            )}
          </div>
        }
      >
        {previewFactura && (
          <div className="space-y-4">
            {/* Preview de factura */}
            <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-[var(--color-muted)]">
                <div>
                  <p className="text-xs text-[var(--color-tx-secondary)] mb-0.5">Número de factura</p>
                  <p className="font-mono font-bold text-lg">{previewFactura.numero}</p>
                </div>
                <StatusBadge entrega={previewFactura.estadoEntrega} />
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--color-tx-secondary)] mb-0.5">Cliente</p>
                    <p className="font-medium">{previewFactura.pedido?.client?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-tx-secondary)] mb-0.5">Pedido</p>
                    <p className="font-mono font-semibold">{previewFactura.pedido?.code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-tx-secondary)] mb-0.5">Fecha</p>
                    <p>{fmt(previewFactura.fecha)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-tx-secondary)] mb-0.5">Confirmación entrega</p>
                    <p>{fmt(previewFactura.fechaConfirmacionEntrega)}</p>
                  </div>
                </div>

                <div className="border-t border-[var(--color-border)] pt-3 flex items-center justify-between">
                  <p className="text-sm text-[var(--color-tx-secondary)]">Total</p>
                  <p className="text-xl font-bold text-[var(--color-tx-primary)]">
                    {fmtMoney(Number(previewFactura.valorTotal))}
                  </p>
                </div>
              </div>
            </div>

            {previewFactura.estadoEntrega === 'ENTREGADO' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                <CheckCircle2 size={15} />
                <p className="text-sm font-medium">Entrega confirmada el {fmt(previewFactura.fechaConfirmacionEntrega)}</p>
              </div>
            )}

            {previewFactura.estadoEntrega === 'LISTO_PARA_ENTREGA' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700">
                <Truck size={15} />
                <p className="text-sm font-medium">Listo para ser despachado al cliente</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
