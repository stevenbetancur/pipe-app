import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Loader2, UserPlus, X } from 'lucide-react';
import { pedidosService, clientesService, type CreatePedidoPayload } from '@/services/pedidos.service';
import { toast } from '@/lib/toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { KpiCard } from '@/components/ui/KpiCard';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import type { Cliente, Pedido } from '@/types';
import { cn } from '@/lib/cn';

// ─── Schemas ────────────────────────────────────────────────
const pedidoSchema = z.object({
  code:          z.string().min(1, 'Código requerido'),
  kilos:         z.coerce.number().positive('Debe ser mayor a 0'),
  presentacion:  z.enum(['CPS', 'EXCELSO']),
  formaEntrega:  z.enum(['A_GRANEL', 'EMPACADO']),
  detalleEmpaque:z.string().optional(),
  diaEntrega:    z.string().min(1, 'Fecha de entrega requerida'),
});

const clienteSchema = z.object({
  name:       z.string().min(2, 'Nombre requerido'),
  documentId: z.string().min(1, 'Documento requerido'),
  address:    z.string().optional().default(''),
  phone:      z.string().optional().default(''),
  email:      z.string().email('Email inválido'),
});

type PedidoFormValues  = z.infer<typeof pedidoSchema>;
type ClienteFormValues = z.infer<typeof clienteSchema>;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Page ────────────────────────────────────────────────────
export function MaquilasPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();

  const [showNewPedido, setShowNewPedido] = useState(false);
  const [showNewCliente, setShowNewCliente] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

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

  // ── Forms ─────────────────────────────────────────────────
  const pedidoForm = useForm<PedidoFormValues>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: {
      presentacion: 'CPS',
      formaEntrega: 'A_GRANEL',
      diaEntrega:   new Date().toISOString().slice(0, 10),
    },
  });

  const clienteForm = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
  });

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
    mutationFn: (payload: Omit<Cliente, 'id'>) => clientesService.create(payload),
    onSuccess: (cliente) => {
      toast.success(`Cliente ${cliente.name} registrado`);
      qc.invalidateQueries({ queryKey: ['clientes-search'] });
      setSelectedCliente(cliente);
      setClienteSearch(cliente.name);
      setShowNewCliente(false);
      clienteForm.reset();
    },
    onError: () => toast.error('No se pudo registrar el cliente'),
  });

  // ── Submit pedido ─────────────────────────────────────────
  const onSubmitPedido = pedidoForm.handleSubmit(async (values) => {
    if (!selectedCliente) {
      toast.error('Selecciona o registra un cliente');
      return;
    }
    const ok = await confirm({
      title: `Registrar pedido ${values.code}`,
      description: '¿Confirmas el registro del pedido? Se notificará al cliente.',
      confirmText: 'Registrar',
    });
    if (!ok) return;
    crearPedido.mutate({
      ...values,
      client: {
        name:       selectedCliente.name,
        documentId: selectedCliente.documentId,
        address:    selectedCliente.address,
        phone:      selectedCliente.phone,
        email:      selectedCliente.email,
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
    });
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
                <th>Kg</th>
                <th>Presentación</th>
                <th>Forma entrega</th>
                <th>Estado</th>
                <th>Entrega</th>
              </tr>
            </thead>
            <tbody>
              {filteredPedidos.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs font-semibold">{p.code}</td>
                  <td>
                    <div>
                      <p className="font-medium text-[var(--color-tx-primary)]">{p.client?.name}</p>
                      <p className="text-xs text-[var(--color-tx-secondary)]">{p.client?.email}</p>
                    </div>
                  </td>
                  <td className="tabular-nums font-medium">{Number(p.kilos).toFixed(1)} kg</td>
                  <td>
                    <span className="badge bg-[var(--color-muted)] text-[var(--color-tx-secondary)]">
                      {p.presentacion}
                    </span>
                  </td>
                  <td className="text-[var(--color-tx-secondary)]">
                    {p.formaEntrega === 'EMPACADO' ? 'Empacado' : 'A granel'}
                  </td>
                  <td><StatusBadge estado={p.estado} /></td>
                  <td className="text-xs text-[var(--color-tx-secondary)]">{formatDate(p.diaEntrega)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal nuevo pedido ── */}
      <Modal
        open={showNewPedido}
        onClose={() => { setShowNewPedido(false); pedidoForm.reset(); setSelectedCliente(null); setClienteSearch(''); }}
        title="Registrar pedido"
        description="Completa todos los datos del pedido y el cliente."
        size="lg"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setShowNewPedido(false)}>
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
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-tx-secondary)]" />
              <input
                type="text"
                className="input pl-8"
                placeholder="Buscar cliente por nombre…"
                value={clienteSearch}
                onChange={(e) => { setClienteSearch(e.target.value); if (selectedCliente) setSelectedCliente(null); }}
              />
              {clienteSearch && !selectedCliente && (
                <div className="absolute top-full mt-1 w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-20 overflow-hidden">
                  {searchingClientes ? (
                    <div className="p-3 text-xs text-[var(--color-tx-secondary)]">Buscando…</div>
                  ) : (clienteResults ?? []).length === 0 ? (
                    <div className="p-3 text-xs text-[var(--color-tx-secondary)]">
                      Sin resultados.{' '}
                      <button className="text-[#00D084] font-semibold" onClick={() => setShowNewCliente(true)}>
                        Registrar cliente
                      </button>
                    </div>
                  ) : (
                    (clienteResults ?? []).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-muted)] transition-colors border-b border-[var(--color-border)] last:border-0"
                        onClick={() => { setSelectedCliente(c); setClienteSearch(c.name); }}
                      >
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-[var(--color-tx-secondary)]">{c.email} · {c.documentId}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Cliente seleccionado */}
            {selectedCliente && (
              <div className="mt-2 flex items-center justify-between p-3 rounded-lg bg-[var(--color-brand-soft)] border border-[#00D084]/20">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-tx-primary)]">{selectedCliente.name}</p>
                  <p className="text-xs text-[var(--color-tx-secondary)]">{selectedCliente.email} · {selectedCliente.documentId}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-icon btn-ghost"
                  onClick={() => { setSelectedCliente(null); setClienteSearch(''); }}
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          <hr className="divider" />

          {/* Detalle del pedido */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-tx-secondary)] mb-3">
              Detalle del pedido
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Código" error={pedidoForm.formState.errors.code?.message} required className="col-span-2 sm:col-span-1">
                <Input
                  placeholder="MQ-2026-001"
                  {...pedidoForm.register('code')}
                  error={pedidoForm.formState.errors.code?.message}
                />
              </Field>

              <Field label="Kilogramos" error={pedidoForm.formState.errors.kilos?.message} required className="col-span-2 sm:col-span-1">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="100"
                  {...pedidoForm.register('kilos')}
                  error={pedidoForm.formState.errors.kilos?.message}
                />
              </Field>

              <Field label="Presentación" error={pedidoForm.formState.errors.presentacion?.message} required>
                <Select
                  {...pedidoForm.register('presentacion')}
                  options={[
                    { value: 'CPS', label: 'CPS' },
                    { value: 'EXCELSO', label: 'Excelso' },
                  ]}
                  error={pedidoForm.formState.errors.presentacion?.message}
                />
              </Field>

              <Field label="Forma de entrega" error={pedidoForm.formState.errors.formaEntrega?.message} required>
                <Select
                  {...pedidoForm.register('formaEntrega')}
                  options={[
                    { value: 'A_GRANEL', label: 'A granel' },
                    { value: 'EMPACADO', label: 'Empacado' },
                  ]}
                  error={pedidoForm.formState.errors.formaEntrega?.message}
                />
              </Field>

              {watchFormaEntrega === 'EMPACADO' && (
                <Field label="Detalle de empaque" className="col-span-2">
                  <Textarea
                    placeholder="Ej: bolsas 500g, cajas de 24 unidades…"
                    {...pedidoForm.register('detalleEmpaque')}
                  />
                </Field>
              )}

              <Field label="Fecha de entrega" error={pedidoForm.formState.errors.diaEntrega?.message} required className="col-span-2 sm:col-span-1">
                <Input
                  type="date"
                  {...pedidoForm.register('diaEntrega')}
                  error={pedidoForm.formState.errors.diaEntrega?.message}
                />
              </Field>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Modal nuevo cliente ── */}
      <Modal
        open={showNewCliente}
        onClose={() => { setShowNewCliente(false); clienteForm.reset(); }}
        title="Registrar cliente"
        description="Ingresa los datos del nuevo cliente."
        size="md"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setShowNewCliente(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={clienteForm.handleSubmit((v) => crearCliente.mutate({
                name: v.name, documentId: v.documentId,
                address: v.address ?? '', phone: v.phone ?? '', email: v.email,
              }))}
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
        </div>
      </Modal>
    </div>
  );
}
