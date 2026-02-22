import { http } from '@/lib/http';
import type { Produccion } from '@/types';

export interface CreateProduccionPayload {
  pedidoId: string;
  fechaProcesamiento: string;
  proceso: string;
  empaque: string;
  entregaFinal: string;
  fechaNotificacionFacturacion?: string | null;
}

export const produccionService = {
  getAll: async (): Promise<Produccion[]> => {
    const { data } = await http.get<Produccion[]>('/produccion');
    return data;
  },

  create: async (payload: CreateProduccionPayload): Promise<Produccion> => {
    const { data } = await http.post<Produccion>('/produccion', payload);
    return data;
  },

  getById: async (id: string): Promise<Produccion> => {
    const { data } = await http.get<Produccion>(`/produccion/${id}`);
    return data;
  },
};
