import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Play, CheckCheck, Loader2, Scale, Package, Calendar, ChevronRight } from 'lucide-react';
import { pedidosService } from '@/services/pedidos.service';
import { tostionService } from '@/services/tostion.service';
import { trilladoService } from '@/services/trillado.service';
import { toast } from '@/lib/toast';
import { KpiCard } from '@/components/ui/KpiCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import type { Tostion, Pedido } from '@/types';
import { cn } from '@/lib/cn';

// Solo se piden los kg + baches + horas — las fechas las asigna el servidor automáticamente
const finalizarSchema = z.object({
  kilosExcelso:  z.coerce.number().positive('Debe ser mayor a 0'),
  kilosTostados: z.coerce.number().positive('Debe ser mayor a 0'),
  baches:        z.coerce.number().int().positive('Debe ser mayor a 0').optional().or(z.literal('')),
  horaInicio:    z.string().optional(),
  horaFin:       z.string().optional(),
}).refine(d => Number(d.kilosTostados) <= Number(d.kilosExcelso), {
  message: 'Los kilos tostados no pueden superar los kilos de excelso recibidos',
  path: ['kilosTostados'],
});

type FinalizarForm = z.infer<typeof finalizarSchema>;

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function TostionPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [finalizeTarget, setFinalizeTarget] = useState<Tostion | null>(null);

  const finalizeForm = useForm<FinalizarForm>({
    resolver: zodResolver(finalizarSchema) as unknown as Resolver<FinalizarForm>,
  });

  // ── Queries ─────────────────────────────────────────────────
  // Pedidos en TRILLADO esperando entrar a tostión
  const pendientesQuery = useQuery({
    queryKey: ['pedidos', { estado: 'TRILLADO' }],
    queryFn: () => pedidosService.getAll('TRILLADO'),
    staleTime: 20_000,
  });

  // Tostiones activas (sin fechaEntregaProduccion)
  const activosQuery = useQuery({
    queryKey: ['tostion', 'activos'],
    queryFn: () => tostionService.getActivos(),
    staleTime: 15_000,
  });

  // Historial completo
  const historialQuery = useQuery({
    queryKey: ['tostion', 'historial'],
    queryFn: () => tostionService.getAll(),
    staleTime: 30_000,
  });

  // Trillados finalizados — para obtener kilosSalida por pedido
  const trilladoHistorialQuery = useQuery({
    queryKey: ['trillado', 'historial'],
    queryFn: () => trilladoService.getAll(),
    staleTime: 30_000,
  });

  // Retorna los kilosSalida del trillado correspondiente al pedido
  const getTriladoKilosSalida = (pedidoId: string): number | null =>
    trilladoHistorialQuery.data?.find(
      t => t.pedido?.id === pedidoId && t.kilosSalida != null
    )?.kilosSalida ?? null;

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['pedidos'] });
    qc.invalidateQueries({ queryKey: ['tostion'] });
  };

  // ── Mutations ───────────────────────────────────────────────
  const iniciarMutation = useMutation({
    mutationFn: (pedidoId: string) => tostionService.iniciar({ pedidoId }),
    onSuccess: () => { toast.success('Tostión iniciada — fecha de ingreso registrada'); invalidateAll(); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'No fue posible iniciar la tostión'),
  });

  const finalizarMutation = useMutation({
    mutationFn: ({ id, ...rest }: FinalizarForm & { id: string }) =>
      tostionService.finalizar(id, {
        kilosExcelso: rest.kilosExcelso as number,
        kilosTostados: rest.kilosTostados as number,
        baches: rest.baches ? Number(rest.baches) : null,
        horaInicio: rest.horaInicio || null,
        horaFin: rest.horaFin || null,
      }),
    onSuccess: () => {
      toast.success('Tostión finalizada — pedido enviado a Producción');
      setFinalizeTarget(null);
      finalizeForm.reset();
      invalidateAll();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'No fue posible finalizar la tostión'),
  });

  // ── Stats ───────────────────────────────────────────────────
  const stats = useMemo(() => ({
    pendientes: pendientesQuery.data?.length ?? 0,
    enCurso:    activosQuery.data?.length ?? 0,
    finalizados: (historialQuery.data ?? []).filter(t => t.fechaEntregaProduccion).length,
  }), [pendientesQuery.data, activosQuery.data, historialQuery.data]);

  const handleIniciar = async (pedido: Pedido) => {
    const ok = await confirm({
      title: 'Iniciar tostión',
      description: `¿Iniciar tostión para el pedido ${pedido.code}? La fecha de ingreso se registrará como hoy.`,
      confirmText: 'Iniciar',
    });
    if (!ok) return;
    await iniciarMutation.mutateAsync(pedido.id);
  };

  const handleFinalizar = finalizeForm.handleSubmit(async (values) => {
    if (!finalizeTarget) return;
    await finalizarMutation.mutateAsync({ id: finalizeTarget.id, ...values });
  });

  const openFinalize = (t: Tostion) => {
    // Pre-fill kilosExcelso from the related trillado's kilosSalida
    const kilosSalida = t.pedido?.id ? getTriladoKilosSalida(t.pedido.id) : null;
    finalizeForm.reset({ kilosExcelso: kilosSalida != null ? kilosSalida : undefined });
    setFinalizeTarget(t);
  };

  return (
    <div className="page space-y-8">
      {/* Header */}
      <div>
        <span className="chip mb-2">Pipeline operativo</span>
        <h2 className="text-2xl font-bold text-[var(--color-tx-primary)] mt-1">Tostión</h2>
        <p className="text-sm text-[var(--color-tx-secondary)] mt-1">
          Toma los pedidos registrados, inicia el proceso y registra los kilos de salida.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="En espera"   value={stats.pendientes} icon={<Package size={15} />}     accent="#3B82F6" loading={pendientesQuery.isLoading} />
        <KpiCard label="En proceso"  value={stats.enCurso}    icon={<Scale size={15} />}        accent="#F59E0B" loading={activosQuery.isLoading} />
        <KpiCard label="Finalizados" value={stats.finalizados} icon={<CheckCheck size={15} />}  accent="#00D084" loading={historialQuery.isLoading} />
      </div>

      {/* Flujo visual */}
      <div className="flex items-center gap-2 text-sm text-[var(--color-tx-secondary)]">
        <span className="font-semibold text-[var(--color-tx-primary)]">REGISTRADO</span>
        <ChevronRight size={14} />
        <span className="font-semibold text-amber-600">EN TOSTIÓN</span>
        <ChevronRight size={14} />
        <span className="font-semibold text-purple-600">PRODUCCIÓN</span>
      </div>

      {/* Dos columnas principales */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* ── Col A: Pedidos en espera ── */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-title">Pedidos en espera</p>
              <p className="section-subtitle">Estado TRILLADO — listos para iniciar tostión</p>
            </div>
            <span className="badge bg-blue-50 text-blue-600">{stats.pendientes}</span>
          </div>

          {pendientesQuery.isLoading ? (
            <TableSkeleton rows={3} cols={3} />
          ) : !pendientesQuery.data?.length ? (
            <EmptyState
              title="Sin pedidos pendientes"
              description="Todos los pedidos ya están en proceso o completados."
            />
          ) : (
            <div className="space-y-2">
              {pendientesQuery.data.map((pedido) => (
                <div
                  key={pedido.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-muted)] gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold">{pedido.code}</p>
                    <p className="text-xs text-[var(--color-tx-secondary)] truncate">{pedido.client?.name}</p>
                    {/* Desglose por lote */}
                    {pedido.detalles && pedido.detalles.length > 0 ? (
                      <div className="mt-1 space-y-0.5">
                        {pedido.detalles.map((d, i) => (
                          <p key={i} className="text-xs text-[var(--color-tx-secondary)]">
                            <span className="font-semibold text-[var(--color-tx-primary)]">{Number(d.kilos).toFixed(1)} kg</span>
                            {' · '}<span className="uppercase">{d.presentacion}</span>
                            {d.variedad ? <span className="italic"> ({d.variedad})</span> : null}
                          </p>
                        ))}
                        <p className="text-xs font-semibold text-[var(--color-tx-secondary)] pt-0.5 border-t border-[var(--color-border)] mt-0.5">
                          {getTriladoKilosSalida(pedido.id) != null
                            ? `${Number(getTriladoKilosSalida(pedido.id)).toFixed(1)} kg excelso (trillado) · ${pedido.detalles.length} lote${pedido.detalles.length !== 1 ? 's' : ''}`
                            : `Total: ${Number(pedido.kilos).toFixed(1)} kg · ${pedido.detalles.length} lote${pedido.detalles.length !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--color-tx-secondary)] mt-0.5">
                        {getTriladoKilosSalida(pedido.id) != null
                          ? `${Number(getTriladoKilosSalida(pedido.id)).toFixed(1)} kg excelso (trillado)`
                          : `${Number(pedido.kilos).toFixed(1)} kg`}
                        {pedido.presentacion ? ` · ${pedido.presentacion}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-[var(--color-tx-secondary)]">Entrega</p>
                      <p className="text-xs font-semibold">{fmt(pedido.diaEntrega)}</p>
                    </div>
                    <button
                      className={cn('btn btn-sm btn-primary gap-1.5', iniciarMutation.isPending && 'opacity-60')}
                      onClick={() => handleIniciar(pedido)}
                      disabled={iniciarMutation.isPending}
                    >
                      <Play size={12} />
                      Iniciar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Col B: En proceso (activos) ── */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-title">En proceso</p>
              <p className="section-subtitle">Tostiones activas — pendientes de finalizar</p>
            </div>
            <span className="badge bg-amber-50 text-amber-700">{stats.enCurso}</span>
          </div>

          {activosQuery.isLoading ? (
            <TableSkeleton rows={3} cols={3} />
          ) : !activosQuery.data?.length ? (
            <EmptyState
              title="Ninguna tostión activa"
              description="Inicia una tostión desde la columna de la izquierda."
            />
          ) : (
            <div className="space-y-2">
              {activosQuery.data.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800/30 dark:bg-amber-900/10 gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold">{t.pedido?.code}</p>
                    <p className="text-xs text-[var(--color-tx-secondary)] truncate">{t.pedido?.client?.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar size={11} className="text-[var(--color-tx-secondary)]" />
                      <p className="text-xs text-[var(--color-tx-secondary)]">Ingreso: {fmt(t.fechaIngreso)}</p>
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-primary gap-1.5 shrink-0"
                    onClick={() => openFinalize(t)}
                  >
                    <CheckCheck size={12} />
                    Finalizar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historial */}
      {!!historialQuery.data?.filter(t => t.fechaEntregaProduccion).length && (
        <div className="card">
          <p className="section-title mb-4">Historial de tostiones</p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Fecha ingreso</th>
                  <th>Fecha salida</th>
                  <th>Kg excelso</th>
                  <th>Kg tostados</th>
                  <th>Baches</th>
                  <th>Horario</th>
                  <th>Merma</th>
                </tr>
              </thead>
              <tbody>
                {historialQuery.data.filter(t => t.fechaEntregaProduccion).map((t) => {
                  const merma = t.kilosExcelso && t.kilosTostados
                    ? ((t.kilosExcelso - t.kilosTostados) / t.kilosExcelso * 100).toFixed(1)
                    : null;
                  return (
                    <tr key={t.id}>
                      <td className="font-mono text-xs font-semibold">{t.pedido?.code}</td>
                      <td className="text-[var(--color-tx-secondary)]">{t.pedido?.client?.name ?? '—'}</td>
                      <td>{fmt(t.fechaIngreso)}</td>
                      <td>{fmt(t.fechaEntregaProduccion)}</td>
                      <td className="font-semibold">{t.kilosExcelso ?? '—'} kg</td>
                      <td className="font-semibold">{t.kilosTostados ?? '—'} kg</td>
                      <td className="text-center">{t.baches ?? '—'}</td>
                      <td className="text-xs text-[var(--color-tx-secondary)]">
                        {t.horaInicio && t.horaFin ? `${t.horaInicio} – ${t.horaFin}` : '—'}
                      </td>
                      <td>
                        {merma ? (
                          <span className={cn('badge', Number(merma) > 20 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600')}>
                            {merma}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal finalizar */}
      <Modal
        open={!!finalizeTarget}
        onClose={() => { setFinalizeTarget(null); finalizeForm.reset(); }}
        title="Finalizar tostión"
        description={`Pedido ${finalizeTarget?.pedido?.code ?? ''} — Ingresa los kg de salida del proceso`}
        size="md"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => { setFinalizeTarget(null); finalizeForm.reset(); }}>
              Cancelar
            </button>
            <button
              className="btn btn-primary gap-2"
              onClick={handleFinalizar}
              disabled={finalizarMutation.isPending}
            >
              {finalizarMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Registrar y enviar a Producción
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Resumen del pedido */}
          {finalizeTarget?.pedido && (
            <div className="p-3 rounded-lg bg-[var(--color-muted)] grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-[var(--color-tx-secondary)]">Pedido</p>
                <p className="font-mono font-semibold">{finalizeTarget.pedido.code}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-tx-secondary)]">Fecha ingreso</p>
                <p className="font-semibold">{fmt(finalizeTarget.fechaIngreso)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-tx-secondary)]">Fecha salida</p>
                <p className="font-semibold text-[#00D084]">Hoy — automática</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Kg de excelso recibidos"
              error={finalizeForm.formState.errors.kilosExcelso?.message}
              required
              hint="Kilos que entraron al proceso"
            >
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 120"
                {...finalizeForm.register('kilosExcelso')}
                error={finalizeForm.formState.errors.kilosExcelso?.message}
                autoFocus
              />
            </Field>

            <Field
              label="Kg procesados (tostados)"
              error={finalizeForm.formState.errors.kilosTostados?.message}
              required
              hint="Kilos obtenidos tras la tostión"
            >
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 98"
                {...finalizeForm.register('kilosTostados')}
                error={finalizeForm.formState.errors.kilosTostados?.message}
              />
            </Field>

            <Field
              label="Baches (lotes)"
              error={finalizeForm.formState.errors.baches?.message}
              hint="Número de lotes procesados"
            >
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 3"
                {...finalizeForm.register('baches')}
                error={finalizeForm.formState.errors.baches?.message}
              />
            </Field>

            <div />

            <Field label="Hora inicio" error={finalizeForm.formState.errors.horaInicio?.message}>
              <Input
                type="time"
                {...finalizeForm.register('horaInicio')}
                error={finalizeForm.formState.errors.horaInicio?.message}
              />
            </Field>

            <Field label="Hora fin" error={finalizeForm.formState.errors.horaFin?.message}>
              <Input
                type="time"
                {...finalizeForm.register('horaFin')}
                error={finalizeForm.formState.errors.horaFin?.message}
              />
            </Field>
          </div>

          <p className="text-xs text-[var(--color-tx-secondary)] bg-[var(--color-muted)] rounded-lg p-3">
            💡 Al confirmar, el pedido pasará automáticamente al módulo de <strong>Producción</strong>.
          </p>
        </div>
      </Modal>
    </div>
  );
}
