import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Loader2, Cog, Wrench, AlertTriangle } from 'lucide-react';
import { maquinasService, type CreateMaquinaPayload, type Maquina } from '@/services/maquinas.service';
import { toast } from '@/lib/toast';
import { KpiCard } from '@/components/ui/KpiCard';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

const PROCESO_OPTIONS = [
  { value: 'MAQUILA',  label: 'Maquila' },
  { value: 'TOSTION',  label: 'Tostión' },
];

const ESTADO_OPTIONS = [
  { value: 'ACTIVA',           label: 'Activa' },
  { value: 'MANTENIMIENTO',    label: 'En mantenimiento' },
  { value: 'FUERA_SERVICIO',   label: 'Fuera de servicio' },
];

const PROCESO_COLORS: Record<string, string> = {
  MAQUILA: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TOSTION: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const ESTADO_COLORS: Record<string, string> = {
  ACTIVA:         'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MANTENIMIENTO:  'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  FUERA_SERVICIO: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ESTADO_LABELS: Record<string, string> = {
  ACTIVA: 'Activa', MANTENIMIENTO: 'Mantenimiento', FUERA_SERVICIO: 'Fuera servicio',
};

const schema = z.object({
  nombre:      z.string().min(2, 'Mínimo 2 caracteres'),
  codigo:      z.string().min(1, 'Código requerido'),
  proceso:     z.enum(['MAQUILA', 'TOSTION'], { required_error: 'Proceso requerido' }),
  estado:      z.enum(['ACTIVA', 'MANTENIMIENTO', 'FUERA_SERVICIO']).default('ACTIVA'),
  descripcion: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function MaquinasPage() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<Maquina | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const query = useQuery({
    queryKey: ['maquinas'],
    queryFn: () => maquinasService.getAll(),
    staleTime: 30_000,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'ACTIVA' },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateMaquinaPayload) => maquinasService.create(data),
    onSuccess: () => {
      toast.success('Máquina registrada correctamente');
      qc.invalidateQueries({ queryKey: ['maquinas'] });
      setShowCreate(false);
      form.reset({ estado: 'ACTIVA' });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'No se pudo crear la máquina'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: FormValues & { id: string }) => maquinasService.update(id, data),
    onSuccess: () => {
      toast.success('Máquina actualizada');
      qc.invalidateQueries({ queryKey: ['maquinas'] });
      setEditTarget(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'No se pudo actualizar la máquina'),
  });

  const isEditing = !!editTarget;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    form.reset({ estado: 'ACTIVA' });
    setShowCreate(true);
  };

  const openEdit = (m: Maquina) => {
    form.reset({
      nombre:      m.nombre,
      codigo:      m.codigo,
      proceso:     m.proceso,
      estado:      m.estado,
      descripcion: m.descripcion ?? '',
    });
    setEditTarget(m);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (isEditing) {
      updateMutation.mutate({ id: editTarget.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  });

  const closeModal = () => {
    setShowCreate(false);
    setEditTarget(null);
  };

  const stats = {
    total:       query.data?.length ?? 0,
    activas:     query.data?.filter(m => m.estado === 'ACTIVA').length ?? 0,
    mantenimiento: query.data?.filter(m => m.estado === 'MANTENIMIENTO').length ?? 0,
  };

  return (
    <div className="page space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="chip mb-2">Administración</span>
          <h2 className="text-2xl font-bold text-[var(--color-tx-primary)] mt-1">Máquinas</h2>
          <p className="text-sm text-[var(--color-tx-secondary)] mt-1">
            Inventario de maquinaria y su estado operativo.
          </p>
        </div>
        <button className="btn btn-primary gap-2" onClick={openCreate}>
          <Plus size={15} />
          Registrar máquina
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total máquinas"   value={stats.total}         icon={<Cog size={15} />}          accent="#3B82F6" loading={query.isLoading} />
        <KpiCard label="Activas"          value={stats.activas}       icon={<Cog size={15} />}           accent="#00D084" loading={query.isLoading} />
        <KpiCard label="En mantenimiento" value={stats.mantenimiento} icon={<Wrench size={15} />}        accent="#F59E0B" loading={query.isLoading} />
      </div>

      {/* Tabla */}
      <div className="card">
        <p className="section-title mb-4">Inventario de máquinas</p>
        {query.isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : !query.data?.length ? (
          <EmptyState title="Sin máquinas registradas" description="Agrega la primera máquina con el botón de arriba." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Proceso</th>
                  <th>Estado</th>
                  <th>Descripción</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((m) => (
                  <tr key={m.id}>
                    <td className="font-mono text-xs font-semibold">{m.codigo}</td>
                    <td className="font-semibold">{m.nombre}</td>
                    <td>
                      <span className={cn('badge', PROCESO_COLORS[m.proceso] ?? '')}>
                        {m.proceso === 'MAQUILA' ? 'Maquila' : 'Tostión'}
                      </span>
                    </td>
                    <td>
                      <span className={cn('badge flex items-center gap-1 w-fit', ESTADO_COLORS[m.estado] ?? '')}>
                        {m.estado === 'MANTENIMIENTO' && <Wrench size={10} />}
                        {m.estado === 'FUERA_SERVICIO' && <AlertTriangle size={10} />}
                        {ESTADO_LABELS[m.estado] ?? m.estado}
                      </span>
                    </td>
                    <td className="text-[var(--color-tx-secondary)] text-xs max-w-[180px] truncate">
                      {m.descripcion ?? '—'}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm gap-1" onClick={() => openEdit(m)}>
                        <Pencil size={13} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal
        open={showCreate || isEditing}
        onClose={closeModal}
        title={isEditing ? `Editar: ${editTarget?.nombre}` : 'Registrar máquina'}
        size="md"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary gap-2" onClick={onSubmit} disabled={isPending}>
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isEditing ? 'Guardar cambios' : 'Registrar máquina'}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre" error={form.formState.errors.nombre?.message} required>
            <Input placeholder="Ej: Tostadora 1" {...form.register('nombre')} error={form.formState.errors.nombre?.message} autoFocus />
          </Field>
          <Field label="Código" error={form.formState.errors.codigo?.message} required>
            <Input placeholder="Ej: TOST-01" {...form.register('codigo')} error={form.formState.errors.codigo?.message} />
          </Field>
          <Field label="Proceso" error={form.formState.errors.proceso?.message} required>
            <Select
              {...form.register('proceso')}
              placeholder="Seleccionar proceso"
              options={PROCESO_OPTIONS}
              error={form.formState.errors.proceso?.message}
            />
          </Field>
          <Field label="Estado">
            <Select
              {...form.register('estado')}
              options={ESTADO_OPTIONS}
            />
          </Field>
          <Field label="Descripción" className="col-span-2">
            <Input placeholder="Notas o descripción opcional" {...form.register('descripcion')} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
