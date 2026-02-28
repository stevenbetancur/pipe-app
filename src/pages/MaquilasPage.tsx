import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Loader2, UserPlus, X, Trash2, Pencil, User } from 'lucide-react';
import { pedidosService, clientesService, type CreatePedidoPayload } from '@/services/pedidos.service';
import { ciudadesService } from '@/services/ciudades.service';
import { toast } from '@/lib/toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/ui/KpiCard';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useAuthStore } from '@/store/auth.store';
import type { Cliente, Pedido, Ciudad } from '@/types';
import { cn } from '@/lib/cn';

// ─── Schemas ────────────────────────────────────────────────
const detalleSchema = z.object({
  presentacion: z.enum(['CPS', 'EXCELSO', 'HONEY', 'NATURAL'] as const, { message: 'Requerido' }),
  variedad:     z.string().optional().default(''),
  kilos:        z.coerce.number().positive('Mayor a 0'),
});

const pedidoSchema = z.object({
  tipoCodigo:    z.enum(['RPM', 'MPU'] as const, { message: 'Tipo requerido' }),
  detalles:      z.array(detalleSchema).min(1, 'Agrega al menos una línea'),
  formaEntrega:  z.enum(['A_GRANEL', 'EMPACADO'] as const),
  detalleEmpaque:z.string().max(800).optional(),
  diaEntrega:    z.string().min(1, 'Fecha requerida'),
});

const clienteSchema = z.object({
  name:       z.string().min(2, 'Nombre requerido'),
  documentId: z.string().min(1, 'Documento requerido'),
  address:    z.string().optional(),
  phone:      z.string().optional(),
  email:      z.string().email('Email inválido'),
});

const editSchema = z.object({
  formaEntrega:   z.enum(['A_GRANEL', 'EMPACADO'] as const),
  detalleEmpaque: z.string().max(800).optional(),
  diaEntrega:     z.string().min(1, 'Fecha requerida'),
  detalles:       z.array(detalleSchema).min(1, 'Agrega al menos una línea'),
});

type PedidoFormValues  = z.infer<typeof pedidoSchema>;
type ClienteFormValues = z.infer<typeof clienteSchema>;
type EditFormValues    = z.infer<typeof editSchema>;

const PRESENTACION_LABELS: Record<string, string> = {
  CPS: 'CPS',
  EXCELSO: 'Excelso',
  HONEY: 'Honey',
  NATURAL: 'Natural',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function totalKilos(p: Pedido): number {
  if (p.detalles && p.detalles.length > 0) {
    return p.detalles.reduce((s, d) => s + Number(d.kilos), 0);
  }
  return Number(p.kilos ?? 0);
}

// ─── Page ────────────────────────────────────────────────────
export function MaquilasPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [showNewPedido, setShowNewPedido] = useState(false);
  const [showNewCliente, setShowNewCliente] = useState(false);
  const [editTarget, setEditTarget] = useState<Pedido | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Ciudad search state (inside new-client modal)
  const [ciudadSearch, setCiudadSearch] = useState('');
  const [selectedCiudad, setSelectedCiudad] = useState<Ciudad | null>(null);

  // ── Queries ──────────────────────────────────────────────
  const { data: pedidos, isLoading } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => pedidosService.getAll(),
    staleTime: 20_000,
  });

  const { data: clienteResults, isFetching: searchingClientes } = useQuery({
    queryKey: ['clientes-search', clienteSearch],
    queryFn:  () => clientesService.search(clienteSearch),
    enabled:  clienteSearch.length >= 2,
    staleTime: 10_000,
  });

  const { data: ciudadResults, isFetching: searchingCiudades } = useQuery({
    queryKey: ['ciudades-search', ciudadSearch],
    queryFn:  () => ciudadesService.search(ciudadSearch),
    enabled:  ciudadSearch.length >= 2,
    staleTime: 60_000,
  });

  // ── Forms ─────────────────────────────────────────────────
  const pedidoForm = useForm<PedidoFormValues>({
    resolver: zodResolver(pedidoSchema) as unknown as Resolver<PedidoFormValues>,
    defaultValues: {
      tipoCodigo:  'RPM',
      detalles:    [{ presentacion: 'CPS', variedad: '', kilos: undefined as unknown as number }],
      formaEntrega:'A_GRANEL',
      diaEntrega:  new Date().toISOString().slice(0, 10),
    },
  });

  const { fields: detalleFields, append: appendDetalle, remove: removeDetalle } = useFieldArray({
    control: pedidoForm.control,
    name: 'detalles',
  });

  const clienteForm = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema) as unknown as Resolver<ClienteFormValues>,
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema) as unknown as Resolver<EditFormValues>,
    defaultValues: { formaEntrega: 'A_GRANEL', detalles: [] },
  });

  const { fields: editFields, append: appendEditDetalle, remove: removeEditDetalle } = useFieldArray({
    control: editForm.control,
    name: 'detalles',
  });

  const watchEditForma = editForm.watch('formaEntrega');
  const watchFormaEntrega = pedidoForm.watch('formaEntrega');

  // ── Mutations ─────────────────────────────────────────────
  const crearPedido = useMutation({
    mutationFn: (payload: CreatePedidoPayload) => pedidosService.create(payload),
    onSuccess: () => {
      toast.success('Pedido registrado correctamente');
      qc.invalidateQueries({ queryKey: ['pedidos'] });
      setShowNewPedido(false);
      setSelectedCliente(null);
      setClienteSearch('');
      pedidoForm.reset();
    },
    onError: () => toast.error('No se pudo registrar el pedido'),
  });

  const crearCliente = useMutation({
    mutationFn: (payload: Omit<Cliente, 'id'> & { ciudadId?: number | null }) =>
      clientesService.create(payload),
    onSuccess: (cliente) => {
      toast.success(`Cliente ${cliente.name} registrado`);
      qc.invalidateQueries({ queryKey: ['clientes-search'] });
      setSelectedCliente(cliente);
      setClienteSearch(cliente.name);
      setShowNewCliente(false);
      clienteForm.reset();
      setSelectedCiudad(null);
      setCiudadSearch('');
    },
    onError: () => toast.error('No se pudo registrar el cliente'),
  });

  const actualizarPedido = useMutation({
    mutationFn: ({ id, ...payload }: EditFormValues & { id: string }) =>
      pedidosService.update(id, payload),
    onSuccess: () => {
      toast.success('Pedido actualizado correctamente');
      qc.invalidateQueries({ queryKey: ['pedidos'] });
      setEditTarget(null);
      editForm.reset();
    },
    onError: () => toast.error('No se pudo actualizar el pedido'),
  });

  // ── Submit pedido ─────────────────────────────────────────
  const onSubmitPedido = pedidoForm.handleSubmit(async (values) => {
    if (!selectedCliente) {
      toast.error('Selecciona o registra un cliente');
      return;
    }
    const tipoCodigo = values.tipoCodigo;
    const ok = await confirm({
      title: `Registrar pedido ${tipoCodigo}`,
      description: `¿Confirmas el registro? El código se asignará automáticamente. Se notificará al cliente.`,
      confirmText: 'Registrar',
    });
    if (!ok) return;
    crearPedido.mutate({
      tipoCodigo: values.tipoCodigo,
      detalles: values.detalles.map(d => ({
        presentacion: d.presentacion,
        variedad: d.variedad ?? '',
        kilos: d.kilos,
      })),
      formaEntrega: values.formaEntrega,
      detalleEmpaque: values.detalleEmpaque || null,
      diaEntrega: values.diaEntrega,
      client: {
        name:       selectedCliente.name,
        documentId: selectedCliente.documentId,
        address:    selectedCliente.address,
        phone:      selectedCliente.phone,
        email:      selectedCliente.email,
        ciudadId:   selectedCliente.ciudad?.id ?? null,
      },
    });
  });

  const onSubmitCliente = clienteForm.handleSubmit(async (values) => {
    crearCliente.mutate({
      name:       values.name,
      documentId: values.documentId,
      address:    values.address ?? '',
      phone:      values.phone ?? '',
      email:      values.email,
      ciudadId:   selectedCiudad?.id ?? null,
    });
  });

  const openEdit = (pedido: Pedido) => {
    editForm.reset({
      formaEntrega:   pedido.formaEntrega,
      detalleEmpaque: pedido.detalleEmpaque ?? '',
      diaEntrega:     pedido.diaEntrega,
      detalles: (pedido.detalles ?? []).length > 0
        ? pedido.detalles!.map(d => ({ presentacion: d.presentacion, variedad: d.variedad ?? '', kilos: Number(d.kilos) }))
        : [{ presentacion: 'CPS' as const, variedad: '', kilos: undefined as unknown as number }],
    });
    setEditTarget(pedido);
  };

  const onSubmitEdit = editForm.handleSubmit(async (values) => {
    if (!editTarget) return;
    const ok = await confirm({
      title: `Editar pedido ${editTarget.code}`,
      description: 'Se guardarán los cambios en el pedido.',
      confirmText: 'Guardar cambios',
    });
    if (!ok) return;
    actualizarPedido.mutate({ id: editTarget.id, ...values });
  });

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = pedidos ?? [];
    return {
      total:   all.length,
      activos: all.filter((p) => p.estado !== 'ENTREGADO').length,
      hoy:     all.filter((p) => p.diaEntrega === new Date().toISOString().slice(0, 10)).length,
    };
  }, [pedidos]);

  const filteredPedidos = useMemo(() => {
    if (!searchFilter) return pedidos ?? [];
    const q = searchFilter.toLowerCase();
    return (pedidos ?? []).filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.client?.name.toLowerCase().includes(q)
    );
  }, [pedidos, searchFilter]);

  const resetNewPedido = useCallback(() => {
    setShowNewPedido(false);
    setSelectedCliente(null);
    setClienteSearch('');
    pedidoForm.reset({
      tipoCodigo: 'RPM',
      detalles: [{ presentacion: 'CPS', variedad: '', kilos: undefined as unknown as number }],
      formaEntrega: 'A_GRANEL',
      diaEntrega: new Date().toISOString().slice(0, 10),
    });
  }, [pedidoForm]);

  // ─────────────────────────────────────────────────────────
  return (
    <div className="page space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="chip mb-2">Pipeline operativo</span>
          <h2 className="text-2xl font-bold text-[var(--color-tx-primary)] mt-1">Maquilas</h2>
          <p className="text-sm text-[var(--color-tx-secondary)] mt-1">
            Registro de pedidos, clientes y compromisos de entrega.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewPedido(true)}>
          <Plus size={15} />
          Nuevo pedido
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total pedidos" value={stats.total} accent="#6B7280" />
        <KpiCard label="Activos" value={stats.activos} accent="#3B82F6" />
        <KpiCard label="Entrega hoy" value={stats.hoy} accent="#00D084" />
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-tx-secondary)]" />
          <input
            type="search"
            className="input pl-9"
            placeholder="Buscar por código o cliente…"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filteredPedidos.length === 0 ? (
        <EmptyState
          title="Sin pedidos"
          description="Aún no hay pedidos registrados."
          action={
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewPedido(true)}>
              <Plus size={13} /> Registrar pedido
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Total kg</th>
                <th>Líneas</th>
                <th>Forma entrega</th>
                <th>Estado</th>
                <th>Entrega</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filteredPedidos.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs font-semibold">{p.code}</td>
                  <td>
                    <div>
                      <p className="font-medium text-[var(--color-tx-primary)]">{p.client?.name}</p>
                      <p className="text-xs text-[var(--color-tx-secondary)]">
                        {p.client?.ciudad
                          ? `${p.client.ciudad.nombre}, ${p.client.ciudad.departamento}`
                          : p.client?.email}
                      </p>
                    </div>
                  </td>
                  <td className="tabular-nums font-medium">{totalKilos(p).toFixed(1)} kg</td>
                  <td>
                    {p.detalles && p.detalles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.detalles.map((d, i) => (
                          <span key={i} className="badge bg-[var(--color-muted)] text-[var(--color-tx-secondary)] text-xs">
                            {PRESENTACION_LABELS[d.presentacion] ?? d.presentacion}
                            {d.variedad ? ` · ${d.variedad}` : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[var(--color-tx-secondary)] text-xs">—</span>
                    )}
                  </td>
                  <td className="text-[var(--color-tx-secondary)]">
                    {p.formaEntrega === 'EMPACADO' ? 'Empacado' : 'A granel'}
                  </td>
                  <td><StatusBadge estado={p.estado} /></td>
                  <td className="text-xs text-[var(--color-tx-secondary)]">{formatDate(p.diaEntrega)}</td>
                  {isAdmin && (
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(p)}
                        title="Editar pedido"
                      >
                        <Pencil size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal editar pedido (admin) ── */}
      <Modal
        open={!!editTarget}
        onClose={() => { setEditTarget(null); editForm.reset(); }}
        title={`Editar pedido ${editTarget?.code ?? ''}`}
        description={`Cliente: ${editTarget?.client?.name ?? ''}`}
        size="lg"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => { setEditTarget(null); editForm.reset(); }}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={onSubmitEdit}
              disabled={actualizarPedido.isPending}
            >
              {actualizarPedido.isPending && <Loader2 size={14} className="animate-spin" />}
              Guardar cambios
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Tipo + Forma */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Forma de entrega" error={editForm.formState.errors.formaEntrega?.message} required>
              <Select
                {...editForm.register('formaEntrega')}
                options={[
                  { value: 'A_GRANEL', label: 'A granel' },
                  { value: 'EMPACADO', label: 'Empacado' },
                ]}
                error={editForm.formState.errors.formaEntrega?.message}
              />
            </Field>

            <Field label="Fecha de entrega" error={editForm.formState.errors.diaEntrega?.message} required>
              <Input
                type="date"
                {...editForm.register('diaEntrega')}
                error={editForm.formState.errors.diaEntrega?.message}
              />
            </Field>
          </div>

          {/* Líneas de detalle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-tx-secondary)]">
                Líneas del pedido
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => appendEditDetalle({ presentacion: 'CPS', variedad: '', kilos: undefined as unknown as number })}
              >
                <Plus size={13} /> Agregar línea
              </button>
            </div>
            {(editForm.formState.errors.detalles as { message?: string })?.message && (
              <p className="text-xs text-red-500 mb-2">
                {(editForm.formState.errors.detalles as { message?: string }).message}
              </p>
            )}

            <div className="space-y-2">
              {editFields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid items-end gap-2 p-3 rounded-lg bg-[var(--color-muted)] border border-[var(--color-border)]"
                  style={{ gridTemplateColumns: '1fr 1fr 100px auto' }}
                >
                  <Field
                    label="Presentación"
                    error={editForm.formState.errors.detalles?.[index]?.presentacion?.message}
                    required
                  >
                    <Select
                      {...editForm.register(`detalles.${index}.presentacion`)}
                      options={[
                        { value: 'CPS', label: 'CPS' },
                        { value: 'EXCELSO', label: 'Excelso' },
                        { value: 'HONEY', label: 'Honey' },
                        { value: 'NATURAL', label: 'Natural' },
                      ]}
                      error={editForm.formState.errors.detalles?.[index]?.presentacion?.message}
                    />
                  </Field>

                  <Field label="Variedad">
                    <Input
                      placeholder="Ej: Castillo, Caturra…"
                      {...editForm.register(`detalles.${index}.variedad`)}
                    />
                  </Field>

                  <Field
                    label="Kg"
                    error={editForm.formState.errors.detalles?.[index]?.kilos?.message}
                    required
                  >
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      {...editForm.register(`detalles.${index}.kilos`)}
                      error={editForm.formState.errors.detalles?.[index]?.kilos?.message}
                    />
                  </Field>

                  <div className="pb-0.5">
                    <button
                      type="button"
                      className="btn btn-icon btn-ghost text-red-400 hover:text-red-500"
                      onClick={() => editFields.length > 1 && removeEditDetalle(index)}
                      disabled={editFields.length === 1}
                      title="Eliminar línea"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {editFields.length > 0 && (
              <div className="mt-2 text-right text-xs text-[var(--color-tx-secondary)]">
                Total:{' '}
                <span className="font-semibold text-[var(--color-tx-primary)]">
                  {editForm
                    .watch('detalles')
                    .reduce((s, d) => s + (Number(d.kilos) || 0), 0)
                    .toFixed(1)}{' '}
                  kg
                </span>
              </div>
            )}
          </div>

          {/* Detalle empaque */}
          {watchEditForma === 'EMPACADO' && (
            <Field label="Detalle de empaque">
              <Textarea
                placeholder="Ej: bolsas 500g, cajas de 24 unidades…"
                maxLength={800}
                rows={4}
                {...editForm.register('detalleEmpaque')}
              />
            </Field>
          )}
        </div>
      </Modal>

      {/* ── Modal nuevo pedido ── */}
      <Modal
        open={showNewPedido}
        onClose={resetNewPedido}
        title="Registrar pedido"
        description="Completa todos los datos del pedido y el cliente."
        size="lg"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={resetNewPedido}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={onSubmitPedido}
              disabled={crearPedido.isPending}
            >
              {crearPedido.isPending && <Loader2 size={14} className="animate-spin" />}
              Registrar pedido
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Bloque cliente */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-tx-secondary)]">
                Información del cliente
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowNewCliente(true)}
              >
                <UserPlus size={13} />
                Nuevo cliente
              </button>
            </div>

            {/* Búsqueda de cliente */}
            <div className="relative">
              {/* Campo */}
              <div className={`flex items-center gap-2 rounded-lg border bg-[var(--color-surface)] px-3 h-10 transition-colors focus-within:border-[#00D084] focus-within:ring-[3px] focus-within:ring-[rgba(0,208,132,0.18)] ${selectedCliente ? 'border-[#00D084] bg-[var(--color-brand-soft)]' : 'border-[var(--color-border)]'}`}>
                {searchingClientes
                  ? <Loader2 size={14} className="text-[#00D084] shrink-0 animate-spin" />
                  : <Search size={14} className="text-[var(--color-tx-secondary)] shrink-0 pointer-events-none" />
                }
                <input
                  type="text"
                  className="flex-1 bg-transparent outline-none text-sm text-[var(--color-tx-primary)] placeholder:text-[var(--color-tx-secondary)]/70 min-w-0"
                  placeholder={selectedCliente ? '' : 'Buscar cliente por nombre…'}
                  value={selectedCliente ? '' : clienteSearch}
                  onChange={(e) => { setClienteSearch(e.target.value); if (selectedCliente) setSelectedCliente(null); }}
                />
                {(clienteSearch || selectedCliente) && (
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-0.5 text-[var(--color-tx-secondary)] hover:text-[var(--color-tx-primary)] hover:bg-[var(--color-muted)] transition-colors"
                    onClick={() => { setSelectedCliente(null); setClienteSearch(''); }}
                    tabIndex={-1}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Cliente seleccionado — se muestra dentro del campo */}
              {selectedCliente && (
                <div className="absolute inset-y-0 left-9 right-8 flex items-center pointer-events-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#00D084]/20 text-[#00D084] shrink-0">
                      <User size={11} />
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-tx-primary)] truncate">{selectedCliente.name}</span>
                    <span className="text-xs text-[var(--color-tx-secondary)] truncate hidden sm:block">· {selectedCliente.documentId}</span>
                  </div>
                </div>
              )}

              {/* Dropdown resultados */}
              {clienteSearch && !selectedCliente && (
                <div className="absolute top-full mt-1.5 w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-20 overflow-hidden">
                  {searchingClientes ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-xs text-[var(--color-tx-secondary)]">
                      <Loader2 size={12} className="animate-spin" /> Buscando…
                    </div>
                  ) : (clienteResults ?? []).length === 0 ? (
                    <div className="px-4 py-3 text-xs text-[var(--color-tx-secondary)]">
                      Sin resultados para <strong className="text-[var(--color-tx-primary)]">"{clienteSearch}"</strong>.{' '}
                      <button className="text-[#00D084] font-semibold hover:underline" onClick={() => setShowNewCliente(true)}>
                        Registrar cliente
                      </button>
                    </div>
                  ) : (
                    <ul>
                      {(clienteResults ?? []).map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--color-muted)] transition-colors border-b border-[var(--color-border)] last:border-0"
                            onClick={() => { setSelectedCliente(c); setClienteSearch(c.name); }}
                          >
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-muted)] text-[var(--color-tx-secondary)] shrink-0">
                              <User size={13} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[var(--color-tx-primary)] truncate">{c.name}</p>
                              <p className="text-xs text-[var(--color-tx-secondary)] truncate">
                                {c.documentId}{c.ciudad ? ` · ${c.ciudad.nombre}` : ''}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          <hr className="divider" />

          {/* Tipo de código */}
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Tipo de pedido"
              error={pedidoForm.formState.errors.tipoCodigo?.message}
              required
            >
              <Select
                {...pedidoForm.register('tipoCodigo')}
                options={[
                  { value: 'RPM', label: 'RPM — Recepción por maquila' },
                  { value: 'MPU', label: 'MPU — Maquila por usuario' },
                ]}
                error={pedidoForm.formState.errors.tipoCodigo?.message}
              />
            </Field>

            <Field
              label="Forma de entrega"
              error={pedidoForm.formState.errors.formaEntrega?.message}
              required
            >
              <Select
                {...pedidoForm.register('formaEntrega')}
                options={[
                  { value: 'A_GRANEL', label: 'A granel' },
                  { value: 'EMPACADO', label: 'Empacado' },
                ]}
                error={pedidoForm.formState.errors.formaEntrega?.message}
              />
            </Field>
          </div>

          {/* Líneas de detalle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-tx-secondary)]">
                Líneas del pedido
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => appendDetalle({ presentacion: 'CPS', variedad: '', kilos: undefined as unknown as number })}
              >
                <Plus size={13} /> Agregar línea
              </button>
            </div>
            {(pedidoForm.formState.errors.detalles as { message?: string })?.message && (
              <p className="text-xs text-red-500 mb-2">
                {(pedidoForm.formState.errors.detalles as { message?: string }).message}
              </p>
            )}

            <div className="space-y-2">
              {detalleFields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid items-end gap-2 p-3 rounded-lg bg-[var(--color-muted)] border border-[var(--color-border)]"
                  style={{ gridTemplateColumns: '1fr 1fr 100px auto' }}
                >
                  <Field
                    label="Presentación"
                    error={pedidoForm.formState.errors.detalles?.[index]?.presentacion?.message}
                    required
                  >
                    <Select
                      {...pedidoForm.register(`detalles.${index}.presentacion`)}
                      options={[
                        { value: 'CPS', label: 'CPS' },
                        { value: 'EXCELSO', label: 'Excelso' },
                        { value: 'HONEY', label: 'Honey' },
                        { value: 'NATURAL', label: 'Natural' },
                      ]}
                      error={pedidoForm.formState.errors.detalles?.[index]?.presentacion?.message}
                    />
                  </Field>

                  <Field label="Variedad">
                    <Input
                      placeholder="Ej: Castillo, Caturra…"
                      {...pedidoForm.register(`detalles.${index}.variedad`)}
                    />
                  </Field>

                  <Field
                    label="Kg"
                    error={pedidoForm.formState.errors.detalles?.[index]?.kilos?.message}
                    required
                  >
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      {...pedidoForm.register(`detalles.${index}.kilos`)}
                      error={pedidoForm.formState.errors.detalles?.[index]?.kilos?.message}
                    />
                  </Field>

                  <div className="pb-0.5">
                    <button
                      type="button"
                      className="btn btn-icon btn-ghost text-red-400 hover:text-red-500"
                      onClick={() => detalleFields.length > 1 && removeDetalle(index)}
                      disabled={detalleFields.length === 1}
                      title="Eliminar línea"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total kilos */}
            {detalleFields.length > 0 && (
              <div className="mt-2 text-right text-xs text-[var(--color-tx-secondary)]">
                Total:{' '}
                <span className="font-semibold text-[var(--color-tx-primary)]">
                  {pedidoForm
                    .watch('detalles')
                    .reduce((s, d) => s + (Number(d.kilos) || 0), 0)
                    .toFixed(1)}{' '}
                  kg
                </span>
              </div>
            )}
          </div>

          {/* Empaque + Fecha */}
          <div className="grid grid-cols-2 gap-4">
            {watchFormaEntrega === 'EMPACADO' && (
              <Field label="Detalle de empaque" className="col-span-2">
                <Textarea
                  placeholder="Ej: bolsas 500g, cajas de 24 unidades…"
                  maxLength={800}
                  rows={4}
                  {...pedidoForm.register('detalleEmpaque')}
                />
              </Field>
            )}

            <Field
              label="Fecha de entrega"
              error={pedidoForm.formState.errors.diaEntrega?.message}
              required
              className={cn(watchFormaEntrega === 'EMPACADO' ? 'col-span-2 sm:col-span-1' : 'col-span-2 sm:col-span-1')}
            >
              <Input
                type="date"
                {...pedidoForm.register('diaEntrega')}
                error={pedidoForm.formState.errors.diaEntrega?.message}
              />
            </Field>
          </div>
        </div>
      </Modal>

      {/* ── Modal nuevo cliente ── */}
      <Modal
        open={showNewCliente}
        onClose={() => { setShowNewCliente(false); clienteForm.reset(); setSelectedCiudad(null); setCiudadSearch(''); }}
        title="Registrar cliente"
        description="Ingresa los datos del nuevo cliente."
        size="md"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => { setShowNewCliente(false); clienteForm.reset(); }}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={onSubmitCliente}
              disabled={crearCliente.isPending}
            >
              {crearCliente.isPending && <Loader2 size={14} className="animate-spin" />}
              Guardar cliente
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre completo" error={clienteForm.formState.errors.name?.message} required className="col-span-2">
            <Input
              placeholder="Juan García"
              {...clienteForm.register('name')}
              error={clienteForm.formState.errors.name?.message}
            />
          </Field>

          <Field label="Documento" error={clienteForm.formState.errors.documentId?.message} required>
            <Input
              placeholder="900.123.456-7"
              {...clienteForm.register('documentId')}
              error={clienteForm.formState.errors.documentId?.message}
            />
          </Field>

          <Field label="Teléfono" error={clienteForm.formState.errors.phone?.message}>
            <Input
              type="tel"
              placeholder="+57 300 000 0000"
              {...clienteForm.register('phone')}
            />
          </Field>

          <Field label="Email" error={clienteForm.formState.errors.email?.message} required className="col-span-2">
            <Input
              type="email"
              placeholder="cliente@empresa.com"
              {...clienteForm.register('email')}
              error={clienteForm.formState.errors.email?.message}
            />
          </Field>

          <Field label="Dirección" className="col-span-2">
            <Input
              placeholder="Cra. 7 # 32-00, Bogotá"
              {...clienteForm.register('address')}
            />
          </Field>

          {/* Ciudad combobox */}
          <Field label="Ciudad" className="col-span-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-tx-secondary)] pointer-events-none" />
              <input
                type="text"
                className="input pl-8"
                placeholder="Buscar ciudad o departamento…"
                value={selectedCiudad ? `${selectedCiudad.nombre}, ${selectedCiudad.departamento}` : ciudadSearch}
                onChange={(e) => {
                  setCiudadSearch(e.target.value);
                  if (selectedCiudad) setSelectedCiudad(null);
                }}
              />
              {selectedCiudad && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-icon btn-ghost btn-xs"
                  onClick={() => { setSelectedCiudad(null); setCiudadSearch(''); }}
                >
                  <X size={12} />
                </button>
              )}
              {ciudadSearch && !selectedCiudad && (
                <div className="absolute top-full mt-1 w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                  {searchingCiudades ? (
                    <div className="p-3 text-xs text-[var(--color-tx-secondary)]">Buscando…</div>
                  ) : (ciudadResults ?? []).length === 0 ? (
                    <div className="p-3 text-xs text-[var(--color-tx-secondary)]">Sin resultados</div>
                  ) : (
                    (ciudadResults ?? []).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-[var(--color-muted)] transition-colors border-b border-[var(--color-border)] last:border-0"
                        onClick={() => { setSelectedCiudad(c); setCiudadSearch(''); }}
                      >
                        <p className="text-sm font-medium">{c.nombre}</p>
                        <p className="text-xs text-[var(--color-tx-secondary)]">{c.departamento}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
