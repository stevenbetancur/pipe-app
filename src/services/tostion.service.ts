import { http } from '@/lib/http';
import type { Tostion } from '@/types';

export interface CreateTostionPayload {
  pedidoId: string;
  fechaIngreso?: string;
}

export interface FinalizarTostionPayload {
  kilosExcelso: number;
  kilosTostados: number;
  baches?: number | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  fechaEntregaProduccion?: string;
}

export const tostionService = {
  getAll: async (): Promise<Tostion[]> => {
    const { data } = await http.get<Tostion[]>('/tostion');
    return data;
  },

  getActivos: async (): Promise<Tostion[]> => {
    const { data } = await http.get<Tostion[]>('/tostion', { params: { estado: 'activos' } });
    return data;
  },

  iniciar: async (payload: CreateTostionPayload): Promise<Tostion> => {
    const { data } = await http.post<Tostion>('/tostion', {
      pedidoId: payload.pedidoId,
      fechaIngreso: payload.fechaIngreso ?? new Date().toISOString().slice(0, 10),
    });
    return data;
  },

  finalizar: async (id: string, payload: FinalizarTostionPayload): Promise<Tostion> => {
    const { data } = await http.put<Tostion>(`/tostion/${id}`, payload);
    return data;
  },
};
