import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Loader2, Clock, CalendarRange, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { horariosService, type CreateHorarioPayload } from '@/services/horarios.service';
import { toast } from '@/lib/toast';
import { KpiCard } from '@/components/ui/KpiCard';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'] as const;
type Dia = typeof DIAS[number];

const DIA_LABELS: Record<Dia, string> = {
  LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié',
  JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom',
};

const detalleSchema = z.object({
  diaSemana: z.enum(DIAS),
  horaInicio: z.string().min(1, 'Requerida'),
  horaFin:    z.string().min(1, 'Requerida'),
});

const schema = z.object({
  nombre:         z.string().min(2, 'Mínimo 2 caracteres'),
  descripcion:    z.string().optional(),
  incluyeSabado:  z.boolean().default(false),
  incluyeDomingo: z.boolean().default(false),
  activo:         z.boolean().default(true),
  detalles:       z.array(detalleSchema).min(1, 'Agrega al menos un día'),
});

type FormValues = z.infer<typeof schema>;

type Horario = Awaited<ReturnType<typeof horariosService.getAll>>[0];

const defaultDetalle = (dia: Dia) => ({ diaSemana: dia, horaInicio: '08:00', horaFin: '17:00' });

export function HorariosPage() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<Horario | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const query = useQuery({
    queryKey: ['horarios'],
    queryFn: () => horariosService.getAll(),
    staleTime: 30_000,
  });

  const defaultValues: FormValues = {
    nombre: '',
    descripcion: '',
    incluyeSabado: false,
    incluyeDomingo: false,
    activo: true,
    detalles: [defaultDetalle('LUNES'), defaultDetalle('MARTES'), defaultDetalle('MIERCOLES'), defaultDetalle('JUEVES'), defaultDetalle('VIERNES')],
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'detalles' });

  const createMutation = useMutation({
    mutationFn: (data: CreateHorarioPayload) => horariosService.create(data),
    onSuccess: () => {
      toast.success('Horario creado correctamente');
      qc.invalidateQueries({ queryKey: ['horarios'] });
      setShowCreate(false);
      form.reset(defaultValues);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'No se pudo crear el horario'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: FormValues & { id: string }) => horariosService.update(id, data),
    onSuccess: () => {
      toast.success('Horario actualizado');
      qc.invalidateQueries({ queryKey: ['horarios'] });
      setEditTarget(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'No se pudo actualizar el horario'),
  });

  const isEditing = !!editTarget;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    form.reset(defaultValues);
    setShowCreate(true);
  };

  const openEdit = (h: Horario) => {
    form.reset({
      nombre: h.nombre,
      descripcion: h.descripcion ?? '',
      incluyeSabado: h.incluyeSabado,
      incluyeDomingo: h.incluyeDomingo,
      activo: h.activo,
      detalles: h.detalles.length ? h.detalles.map(d => ({
        diaSemana:  d.diaSemana,
        horaInicio: d.horaInicio,
        horaFin:    d.horaFin,
      })) : [defaultDetalle('LUNES')],
    });
    setEditTarget(h);
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
    form.reset(defaultValues);
  };

  const isOpen = showCreate || isEditing;

  const stats = {
    total:   query.data?.length ?? 0,
    activos: query.data?.filter(h => h.activo).length ?? 0,
  };

  return (
    <div className="page space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="chip mb-2">Administración</span>
          <h2 className="text-2xl font-bold text-[var(--color-tx-primary)] mt-1">Horarios</h2>
          <p className="text-sm text-[var(--color-tx-secondary)] mt-1">
            Define las plantillas de horario que se asignan a los operarios.
          </p>
        </div>
        <button className="btn btn-primary gap-2" onClick={openCreate}>
          <Plus size={15} />
          Nuevo horario
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <KpiCard label="Total horarios" value={stats.total}   icon={<CalendarRange size={15} />} accent="#3B82F6" loading={query.isLoading} />
        <KpiCard label="Activos"        value={stats.activos} icon={<Clock size={15} />}         accent="#00D084" loading={query.isLoading} />
      </div>

      {/* Lista de horarios */}
      {query.isLoading ? (
        <TableSkeleton rows={3} cols={3} />
      ) : !query.data?.length ? (
        <EmptyState title="Sin horarios" description="Crea tu primer horario con el botón de arriba." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {query.data.map((h) => (
            <div key={h.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--color-tx-primary)]">{h.nombre}</p>
                  {h.descripcion && <p className="text-xs text-[var(--color-tx-secondary)] mt-0.5">{h.descripcion}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {h.activo
                    ? <CheckCircle2 size={15} className="text-[#00D084]" />
                    : <XCircle size={15} className="text-gray-400" />}
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(h)}>
                    <Pencil size={13} />
                  </button>
                </div>
              </div>

              {/* Días */}
              <div className="flex flex-wrap gap-1">
                {DIAS.map(dia => {
                  const detalle = h.detalles.find(d => d.diaSemana === dia);
                  return (
                    <span
                      key={dia}
                      className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                        detalle
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-400 dark:bg-gray-800',
                      )}
                    >
                      {DIA_LABELS[dia]}
                      {detalle && <span className="font-normal ml-1">{detalle.horaInicio}–{detalle.horaFin}</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal
        open={isOpen}
        onClose={closeModal}
        title={isEditing ? `Editar: ${editTarget?.nombre}` : 'Nuevo horario'}
        size="xl"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
            <button className="btn btn-primary gap-2" onClick={onSubmit} disabled={isPending}>
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isEditing ? 'Guardar cambios' : 'Crear horario'}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" error={form.formState.errors.nombre?.message} required className="col-span-2">
              <Input placeholder="Ej: Turno mañana" {...form.register('nombre')} error={form.formState.errors.nombre?.message} autoFocus />
            </Field>
            <Field label="Descripción" className="col-span-2">
              <Input placeholder="Descripción opcional" {...form.register('descripcion')} />
            </Field>
            <div className="col-span-2 flex gap-6">
              <Controller
                control={form.control}
                name="incluyeSabado"
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} className="w-4 h-4 accent-[#00D084]" />
                    Incluye sábado
                  </label>
                )}
              />
              <Controller
                control={form.control}
                name="incluyeDomingo"
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} className="w-4 h-4 accent-[#00D084]" />
                    Incluye domingo
                  </label>
                )}
              />
              <Controller
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} className="w-4 h-4 accent-[#00D084]" />
                    Activo
                  </label>
                )}
              />
            </div>
          </div>

          {/* Detalles de días */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="section-title">Días y horarios</p>
              <div className="flex gap-1 flex-wrap">
                {DIAS.map(dia => {
                  const exists = fields.some(f => f.diaSemana === dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      className={cn('text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors',
                        exists
                          ? 'border-[#00D084] bg-[var(--color-brand-soft)] text-[#00D084]'
                          : 'border-[var(--color-border)] text-[var(--color-tx-secondary)] hover:border-[#00D084]',
                      )}
                      onClick={() => {
                        if (exists) {
                          const idx = fields.findIndex(f => f.diaSemana === dia);
                          remove(idx);
                        } else {
                          append(defaultDetalle(dia));
                        }
                      }}
                    >
                      {DIA_LABELS[dia]}
                    </button>
                  );
                })}
              </div>
            </div>

            {form.formState.errors.detalles?.root?.message && (
              <p className="error-msg mb-2">{form.formState.errors.detalles.root.message}</p>
            )}

            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color-muted)]">
                  <span className="w-10 text-xs font-semibold text-[var(--color-tx-secondary)]">{DIA_LABELS[field.diaSemana as Dia]}</span>
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      {...form.register(`detalles.${i}.horaInicio`)}
                      className="w-28"
                    />
                    <span className="text-[var(--color-tx-secondary)] text-sm">–</span>
                    <Input
                      type="time"
                      {...form.register(`detalles.${i}.horaFin`)}
                      className="w-28"
                    />
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm text-red-400 hover:text-red-600" onClick={() => remove(i)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {!fields.length && (
                <p className="text-sm text-[var(--color-tx-secondary)] text-center py-4">
                  Selecciona días con los botones de arriba
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
