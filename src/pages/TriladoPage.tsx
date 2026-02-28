import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Play, CheckCheck, Loader2, Scale, Package, Calendar, ChevronRight } from 'lucide-react';
import { pedidosService } from '@/services/pedidos.service';
import { trilladoService } from '@/services/trillado.service';
import { toast } from '@/lib/toast';
import { KpiCard } from '@/components/ui/KpiCard';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import type { Trillado, Pedido } from '@/types';
import { cn } from '@/lib/cn';

const finalizarSchema = z.object({
  kilosEntrada: z.coerce.number().positive('Debe ser mayor a 0'),
  kilosSalida:  z.coerce.number().positive('Debe ser mayor a 0'),
  horaInicio:   z.string().min(4, 'Hora requerida'),
  horaFin:      z.string().min(4, 'Hora requerida'),
}).refine(d => d.kilosSalida <= d.kilosEntrada, {
  message: 'Los kilos de salida no pueden superar los de entrada',
  path: ['kilosSalida'],
});

type FinalizarForm = z.infer<typeof finalizarSchema>;

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function totalKilosPedido(p: Pedido): number {
  if (p.detalles && p.detalles.length > 0) {
    return p.detalles.reduce((s, d) => s + Number(d.kilos), 0);
  }
  return Number(p.kilos ?? 0);
}

export function TriladoPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [finalizeTarget, setFinalizeTarget] = useState<Trillado | null>(null);

  const finalizeForm = useForm<FinalizarForm>({
    resolver: zodResolver(finalizarSchema) as unknown as Resolver<FinalizarForm>,
  });

  // ── Queries ─────────────────────────────────────────────────
  // Pedidos en REGISTRADO esperando entrar a trillado
  const pendientesQuery = useQuery({
    queryKey: ['pedidos', { estado: 'REGISTRADO' }],
    queryFn: () => pedidosService.getAll('REGISTRADO'),
    staleTime: 20_000,
  });

  // Trillados activos (sin fechaEntregaTostion)
  const activosQuery = useQuery({
    queryKey: ['trillado', 'activos'],
    queryFn: () => trilladoService.getActivos(),
    staleTime: 15_000,
  });

  // Historial completo
  const historialQuery = useQuery({
    queryKey: ['trillado', 'historial'],
    queryFn: () => trilladoService.getAll(),
    staleTime: 30_000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['pedidos'] });
    qc.invalidateQueries({ queryKey: ['trillado'] });
  };

  // ── Mutations ───────────────────────────────────────────────
  const iniciarMutation = useMutation({
    mutationFn: (pedidoId: string) => trilladoService.iniciar({ pedidoId }),
    onSuccess: () => { toast.success('Trillado iniciado — fecha de ingreso registrada'); invalidateAll(); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'No fue posible iniciar el trillado'),
  });

  const finalizarMutation = useMutation({
    mutationFn: ({ id, ...rest }: FinalizarForm & { id: string }) =>
      trilladoService.finalizar(id, rest),
    onSuccess: () => {
      toast.success('Trillado finalizado — pedido enviado a Maquila');
      setFinalizeTarget(null);
      finalizeForm.reset();
      invalidateAll();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'No fue posible finalizar el trillado'),
  });

  // ── Stats ───────────────────────────────────────────────────
  const stats = useMemo(() => ({
    pendientes:  pendientesQuery.data?.length ?? 0,
    enCurso:     activosQuery.data?.length ?? 0,
    finalizados: (historialQuery.data ?? []).filter(t => t.fechaEntregaTostion).length,
  }), [pendientesQuery.data, activosQuery.data, historialQuery.data]);

  const handleIniciar = async (pedido: Pedido) => {
    const ok = await confirm({
      title: 'Iniciar trillado',
      description: `¿Iniciar trillado para el pedido ${pedido.code}? La fecha de ingreso se registrará como hoy.`,
      confirmText: 'Iniciar',
    });
    if (!ok) return;
    await iniciarMutation.mutateAsync(pedido.id);
  };

  const handleFinalizar = finalizeForm.handleSubmit(async (values) => {
    if (!finalizeTarget) return;
    await finalizarMutation.mutateAsync({ id: finalizeTarget.id, ...values });
  });

  const openFinalize = (t: Trillado) => {
    finalizeForm.reset();
    setFinalizeTarget(t);
  };

  return (
    <div className="page space-y-8">
      {/* Header */}
      <div>
        <span className="chip mb-2">Pipeline operativo</span>
        <h2 className="text-2xl font-bold text-[var(--color-tx-primary)] mt-1">Trillado</h2>
        <p className="text-sm text-[var(--color-tx-secondary)] mt-1">
          Toma los pedidos registrados, inicia el proceso de trillado y registra los kilos de salida.
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
        <span className="font-semibold text-amber-600">EN TRILLADO</span>
        <ChevronRight size={14} />
        <span className="font-semibold text-blue-600">MAQUILA</span>
      </div>

      {/* Dos columnas principales */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* ── Col A: Pedidos en espera ── */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-title">Pedidos en espera</p>
              <p className="section-subtitle">Estado REGISTRADO — listos para iniciar trillado</p>
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
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold">{pedido.code}</p>
                    <p className="text-xs text-[var(--color-tx-secondary)] truncate">{pedido.client?.name}</p>
                    <p className="text-xs text-[var(--color-tx-secondary)] mt-0.5">
                      {totalKilosPedido(pedido).toFixed(1)} kg
                      {pedido.detalles && pedido.detalles.length > 0
                        ? ` · ${pedido.detalles.map(d => d.presentacion).join(', ')}`
                        : pedido.presentacion ? ` · ${pedido.presentacion}` : ''}
                    </p>
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
              <p className="section-subtitle">Trillados activos — pendientes de finalizar</p>
            </div>
            <span className="badge bg-amber-50 text-amber-700">{stats.enCurso}</span>
          </div>

          {activosQuery.isLoading ? (
            <TableSkeleton rows={3} cols={3} />
          ) : !activosQuery.data?.length ? (
            <EmptyState
              title="Ningún trillado activo"
              description="Inicia un trillado desde la columna de la izquierda."
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
      {!!historialQuery.data?.filter(t => t.fechaEntregaTostion).length && (
        <div className="card">
          <p className="section-title mb-4">Historial de trillados</p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Fecha ingreso</th>
                  <th>Fecha salida</th>
                  <th>Kg entrada</th>
                  <th>Kg salida</th>
                  <th>Merma</th>
                  <th>Horario</th>
                </tr>
              </thead>
              <tbody>
                {historialQuery.data.filter(t => t.fechaEntregaTostion).map((t) => {
                  const merma = t.kilosEntrada && t.kilosSalida
                    ? ((t.kilosEntrada - t.kilosSalida) / t.kilosEntrada * 100).toFixed(1)
                    : null;
                  return (
                    <tr key={t.id}>
                      <td className="font-mono text-xs font-semibold">{t.pedido?.code}</td>
                      <td className="text-[var(--color-tx-secondary)]">{t.pedido?.client?.name ?? '—'}</td>
                      <td>{fmt(t.fechaIngreso)}</td>
                      <td>{fmt(t.fechaEntregaTostion)}</td>
                      <td className="font-semibold">{t.kilosEntrada ?? '—'} kg</td>
                      <td className="font-semibold">{t.kilosSalida ?? '—'} kg</td>
                      <td>
                        {merma ? (
                          <span className={cn('badge', Number(merma) > 15 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600')}>
                            {merma}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-xs text-[var(--color-tx-secondary)]">
                        {t.horaInicio && t.horaFin ? `${t.horaInicio} – ${t.horaFin}` : '—'}
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
        title="Finalizar trillado"
        description={`Pedido ${finalizeTarget?.pedido?.code ?? ''} — Ingresa los datos del proceso`}
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
              Registrar y enviar a Maquila
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
              label="Kg entrada (bruto)"
              error={finalizeForm.formState.errors.kilosEntrada?.message}
              required
              hint="Total de kilos que entraron al trillado"
            >
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="ej. 200"
                {...finalizeForm.register('kilosEntrada')}
                error={finalizeForm.formState.errors.kilosEntrada?.message}
                autoFocus
              />
            </Field>

            <Field
              label="Kg salida (trillado)"
              error={finalizeForm.formState.errors.kilosSalida?.message}
              required
              hint="Kilos obtenidos tras el trillado"
            >
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="ej. 160"
                {...finalizeForm.register('kilosSalida')}
                error={finalizeForm.formState.errors.kilosSalida?.message}
              />
            </Field>

            <Field
              label="Hora inicio"
              error={finalizeForm.formState.errors.horaInicio?.message}
              required
            >
              <Input
                type="time"
                {...finalizeForm.register('horaInicio')}
                error={finalizeForm.formState.errors.horaInicio?.message}
              />
            </Field>

            <Field
              label="Hora fin"
              error={finalizeForm.formState.errors.horaFin?.message}
              required
            >
              <Input
                type="time"
                {...finalizeForm.register('horaFin')}
                error={finalizeForm.formState.errors.horaFin?.message}
              />
            </Field>
          </div>

          <p className="text-xs text-[var(--color-tx-secondary)] bg-[var(--color-muted)] rounded-lg p-3">
            💡 Al confirmar, el pedido pasará automáticamente al módulo de <strong>Maquila</strong>.
            La merma se calculará automáticamente.
          </p>
        </div>
      </Modal>
    </div>
  );
}
