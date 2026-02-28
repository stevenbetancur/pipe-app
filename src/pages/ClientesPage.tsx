import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Loader2 } from 'lucide-react';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientesService } from '@/services/pedidos.service';
import { toast } from '@/lib/toast';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import type { Cliente } from '@/types';

const schema = z.object({
  name:       z.string().min(2, 'Nombre requerido'),
  documentId: z.string().min(1, 'Documento requerido'),
  address:    z.string().optional(),
  phone:      z.string().optional(),
  email:      z.string().email('Email inválido'),
});

type FormValues = z.infer<typeof schema>;

export function ClientesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesService.getAll(),
    staleTime: 30_000,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
  });

  const crear = useMutation({
    mutationFn: (p: Omit<Cliente, 'id'>) => clientesService.create(p),
    onSuccess: () => {
      toast.success('Cliente registrado');
      qc.invalidateQueries({ queryKey: ['clientes'] });
      setShowForm(false);
      reset();
    },
    onError: () => toast.error('No se pudo registrar el cliente'),
  });

  const onSubmit = handleSubmit((v) =>
    crear.mutate({ name: v.name, documentId: v.documentId, address: v.address ?? '', phone: v.phone ?? '', email: v.email })
  );

  const filtered = (clientes ?? []).filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="chip mb-2">Comercial</span>
          <h2 className="text-2xl font-bold text-[var(--color-tx-primary)] mt-1">Clientes</h2>
          <p className="text-sm text-[var(--color-tx-secondary)] mt-1">Directorio de clientes activos.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-tx-secondary)]" />
        <input className="input pl-9" placeholder="Buscar cliente…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sin clientes"
          action={<button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}><Plus size={13} /> Registrar</button>}
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Dirección</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="font-mono text-xs text-[var(--color-tx-secondary)]">{c.documentId}</td>
                  <td className="text-xs text-[var(--color-tx-secondary)]">{c.email}</td>
                  <td className="text-xs text-[var(--color-tx-secondary)]">{c.phone || '—'}</td>
                  <td className="text-xs text-[var(--color-tx-secondary)] max-w-[200px] truncate">{c.address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); reset(); }}
        title="Nuevo cliente"
        footer={
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={onSubmit} disabled={crear.isPending}>
              {crear.isPending && <Loader2 size={14} className="animate-spin" />} Guardar
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre" error={errors.name?.message} required className="col-span-2">
            <Input placeholder="Juan García" {...register('name')} error={errors.name?.message} />
          </Field>
          <Field label="Documento" error={errors.documentId?.message} required>
            <Input placeholder="900.123.456-7" {...register('documentId')} error={errors.documentId?.message} />
          </Field>
          <Field label="Teléfono">
            <Input type="tel" placeholder="+57 300 000 0000" {...register('phone')} />
          </Field>
          <Field label="Email" error={errors.email?.message} required className="col-span-2">
            <Input type="email" placeholder="cliente@empresa.com" {...register('email')} error={errors.email?.message} />
          </Field>
          <Field label="Dirección" className="col-span-2">
            <Input placeholder="Cra. 7 # 32-00, Bogotá" {...register('address')} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
