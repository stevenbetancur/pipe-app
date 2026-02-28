import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Loader2, Users, ShieldCheck, UserCheck } from 'lucide-react';
import { usuariosService } from '@/services/usuarios.service';
import { toast } from '@/lib/toast';
import { KpiCard } from '@/components/ui/KpiCard';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

const ROLES = [
  { value: 'admin',        label: 'Administrador' },
  { value: 'operario',     label: 'Operario' },
  { value: 'facturacion',  label: 'Facturación' },
] as const;

type Rol = typeof ROLES[number]['value'];

const createSchema = z.object({
  name:     z.string().min(2, 'Mínimo 2 caracteres'),
  email:    z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role:     z.enum(['admin', 'operario', 'facturacion'] as const, { message: 'Rol requerido' }),
  status:   z.enum(['active', 'inactive']),
});

const editSchema = createSchema.extend({
  password: z.string().min(8, 'Mínimo 8 caracteres').or(z.literal('')).optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm   = z.infer<typeof editSchema>;

const ROLE_COLORS: Record<Rol, string> = {
  admin:       'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  operario:    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  facturacion: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const ROLE_LABELS: Record<Rol, string> = {
  admin: 'Admin', operario: 'Operario', facturacion: 'Facturación',
};

export function UsuariosPage() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<{ id: string; name: string; email: string; role: Rol; status: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const query = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => usuariosService.getAll(),
    staleTime: 30_000,
  });

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema) as unknown as Resolver<CreateForm>,
    defaultValues: { status: 'active' },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema) as unknown as Resolver<EditForm>,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => usuariosService.create(data),
    onSuccess: () => {
      toast.success('Usuario creado correctamente');
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      setShowCreate(false);
      createForm.reset({ status: 'active' });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'No se pudo crear el usuario'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: EditForm & { id: string }) => usuariosService.update(id, data),
    onSuccess: () => {
      toast.success('Usuario actualizado');
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      setEditTarget(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'No se pudo actualizar el usuario'),
  });

  const onCreateSubmit = createForm.handleSubmit((values) => createMutation.mutate(values));

  const openEdit = (u: typeof editTarget) => {
    setEditTarget(u);
    editForm.reset({
      name:   u?.name  ?? '',
      email:  u?.email ?? '',
      role:   u?.role  ?? 'operario',
      status: (u?.status as 'active' | 'inactive') ?? 'active',
      password: '',
    });
  };

  const onEditSubmit = editForm.handleSubmit((values) => {
    if (!editTarget) return;
    const payload: EditForm & { id: string } = { id: editTarget.id, ...values };
    if (!payload.password) delete payload.password;
    updateMutation.mutate(payload);
  });

  const stats = {
    total:      query.data?.length ?? 0,
    admins:     query.data?.filter(u => u.role === 'admin').length ?? 0,
    activos:    query.data?.filter(u => u.status === 'active').length ?? 0,
  };

  return (
    <div className="page space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="chip mb-2">Administración</span>
          <h2 className="text-2xl font-bold text-[var(--color-tx-primary)] mt-1">Usuarios</h2>
          <p className="text-sm text-[var(--color-tx-secondary)] mt-1">
            Gestiona los accesos y roles del sistema.
          </p>
        </div>
        <button className="btn btn-primary gap-2" onClick={() => setShowCreate(true)}>
          <Plus size={15} />
          Nuevo usuario
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total usuarios"   value={stats.total}   icon={<Users size={15} />}       accent="#3B82F6" loading={query.isLoading} />
        <KpiCard label="Administradores"  value={stats.admins}  icon={<ShieldCheck size={15} />}  accent="#8B5CF6" loading={query.isLoading} />
        <KpiCard label="Activos"          value={stats.activos} icon={<UserCheck size={15} />}    accent="#00D084" loading={query.isLoading} />
      </div>

      {/* Tabla */}
      <div className="card">
        <p className="section-title mb-4">Lista de usuarios</p>
        {query.isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : !query.data?.length ? (
          <EmptyState title="Sin usuarios" description="Crea el primer usuario con el botón de arriba." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold">{u.name}</td>
                    <td className="text-[var(--color-tx-secondary)] text-sm">{u.email}</td>
                    <td>
                      <span className={cn('badge', ROLE_COLORS[u.role as Rol] ?? '')}>
                        {ROLE_LABELS[u.role as Rol] ?? u.role}
                      </span>
                    </td>
                    <td>
                      <span className={cn('badge', u.status === 'active'
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                      )}>
                        {u.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm gap-1"
                        onClick={() => openEdit({ id: u.id, name: u.name, email: u.email, role: u.role as Rol, status: u.status })}
                      >
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

      {/* Modal crear */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); createForm.reset({ status: 'active' }); }}
        title="Nuevo usuario"
        size="md"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="btn btn-primary gap-2" onClick={onCreateSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Crear usuario
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre completo" error={createForm.formState.errors.name?.message} required className="col-span-2">
            <Input placeholder="Ej: María García" {...createForm.register('name')} error={createForm.formState.errors.name?.message} autoFocus />
          </Field>
          <Field label="Correo electrónico" error={createForm.formState.errors.email?.message} required className="col-span-2">
            <Input type="email" placeholder="usuario@pipe.local" {...createForm.register('email')} error={createForm.formState.errors.email?.message} />
          </Field>
          <Field label="Contraseña" error={createForm.formState.errors.password?.message} required>
            <Input type="password" placeholder="Mínimo 6 caracteres" {...createForm.register('password')} error={createForm.formState.errors.password?.message} />
          </Field>
          <Field label="Rol" error={createForm.formState.errors.role?.message} required>
            <Select
              {...createForm.register('role')}
              placeholder="Seleccionar rol"
              options={ROLES}
              error={createForm.formState.errors.role?.message}
            />
          </Field>
          <Field label="Estado">
            <Select
              {...createForm.register('status')}
              options={[{ value: 'active', label: 'Activo' }, { value: 'inactive', label: 'Inactivo' }]}
            />
          </Field>
        </div>
      </Modal>

      {/* Modal editar */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Editar: ${editTarget?.name ?? ''}`}
        size="md"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancelar</button>
            <button className="btn btn-primary gap-2" onClick={onEditSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Guardar cambios
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre completo" error={editForm.formState.errors.name?.message} required className="col-span-2">
            <Input placeholder="Nombre" {...editForm.register('name')} error={editForm.formState.errors.name?.message} autoFocus />
          </Field>
          <Field label="Correo electrónico" error={editForm.formState.errors.email?.message} required className="col-span-2">
            <Input type="email" {...editForm.register('email')} error={editForm.formState.errors.email?.message} />
          </Field>
          <Field label="Nueva contraseña" hint="Dejar en blanco para no cambiar" error={editForm.formState.errors.password?.message}>
            <Input type="password" placeholder="Nueva contraseña (opcional)" {...editForm.register('password')} error={editForm.formState.errors.password?.message} />
          </Field>
          <Field label="Rol" error={editForm.formState.errors.role?.message} required>
            <Select
              {...editForm.register('role')}
              options={ROLES}
              error={editForm.formState.errors.role?.message}
            />
          </Field>
          <Field label="Estado">
            <Select
              {...editForm.register('status')}
              options={[{ value: 'active', label: 'Activo' }, { value: 'inactive', label: 'Inactivo' }]}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
