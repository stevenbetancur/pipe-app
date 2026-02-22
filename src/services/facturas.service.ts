import { http } from '@/lib/http';
import type { Factura, EstadoEntrega } from '@/types';

export interface CreateFacturaPayload {
  pedidoId: string;
  numero: string;
  fecha: string;
  valorTotal: number;
  estadoEntrega?: EstadoEntrega;
  fechaConfirmacionEntrega?: string | null;
}

export const facturasService = {
  getAll: async (): Promise<Factura[]> => {
    const { data } = await http.get<Factura[]>('/facturas');
    return data;
  },

  getById: async (id: string): Promise<Factura> => {
    const { data } = await http.get<Factura>(`/facturas/${id}`);
    return data;
  },

  create: async (payload: CreateFacturaPayload): Promise<Factura> => {
    const { data } = await http.post<Factura>('/facturas', payload);
    return data;
  },

  updateEstado: async (id: string, estadoEntrega: EstadoEntrega, fechaConfirmacion?: string): Promise<Factura> => {
    const { data } = await http.patch<Factura>(`/facturas/${id}`, {
      estadoEntrega,
      fechaConfirmacionEntrega: fechaConfirmacion ?? null,
    });
    return data;
  },
};
