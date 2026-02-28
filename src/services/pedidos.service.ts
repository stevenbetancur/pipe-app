import { http } from '@/lib/http';
import type { Pedido, PedidoEstado, Cliente, PresentacionDetalle, TipoCodigo } from '@/types';

export interface PedidoDetallePayload {
  presentacion: PresentacionDetalle;
  variedad?: string;
  kilos: number;
}

export interface CreatePedidoPayload {
  tipoCodigo: TipoCodigo;
  detalles: PedidoDetallePayload[];
  formaEntrega: 'A_GRANEL' | 'EMPACADO';
  detalleEmpaque?: string | null;
  diaEntrega: string;
  client: {
    name: string;
    documentId: string;
    address: string;
    phone: string;
    email: string;
    ciudadId?: number | null;
  };
}

export const pedidosService = {
  getAll: async (estado?: PedidoEstado | PedidoEstado[]): Promise<Pedido[]> => {
    const params: Record<string, string> = {};
    if (estado) {
      params.estado = Array.isArray(estado) ? estado.join(',') : estado;
    }
    const { data } = await http.get<Pedido[]>('/pedidos', { params });
    return data;
  },

  getById: async (id: string): Promise<Pedido> => {
    const { data } = await http.get<Pedido>(`/pedidos/${id}`);
    return data;
  },

  create: async (payload: CreatePedidoPayload): Promise<Pedido> => {
    const { data } = await http.post<Pedido>('/pedidos', payload);
    return data;
  },

  update: async (id: string, payload: Partial<CreatePedidoPayload> & { estado?: PedidoEstado }): Promise<Pedido> => {
    const { data } = await http.put<Pedido>(`/pedidos/${id}`, payload);
    return data;
  },

  updateEstado: async (id: string, estado: PedidoEstado): Promise<Pedido> => {
    const { data } = await http.patch<Pedido>(`/pedidos/${id}/estado`, { estado });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await http.delete(`/pedidos/${id}`);
  },
};

export const clientesService = {
  search: async (q: string): Promise<Cliente[]> => {
    const { data } = await http.get<Cliente[]>('/clients', { params: { q } });
    return data;
  },

  getAll: async (): Promise<Cliente[]> => {
    const { data } = await http.get<Cliente[]>('/clients');
    return data;
  },

  create: async (payload: Omit<Cliente, 'id'>): Promise<Cliente> => {
    const { data } = await http.post<Cliente>('/clients', payload);
    return data;
  },
};

