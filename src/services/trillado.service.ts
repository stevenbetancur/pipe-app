import { http } from '@/lib/http';
import type { Trillado } from '@/types';

export interface IniciarTrilladoPayload {
  pedidoId: string;
}

export interface FinalizarTrilladoPayload {
  kilosEntrada: number;
  kilosSalida: number;
  horaInicio: string;
  horaFin: string;
  fechaEntregaTostion?: string | null;
}

export const trilladoService = {
  getAll: async (): Promise<Trillado[]> => {
    const { data } = await http.get<Trillado[]>('/trillado');
    return data;
  },

  getActivos: async (): Promise<Trillado[]> => {
    const { data } = await http.get<Trillado[]>('/trillado', { params: { estado: 'activos' } });
    return data;
  },

  iniciar: async (payload: IniciarTrilladoPayload): Promise<Trillado> => {
    const { data } = await http.post<Trillado>('/trillado', payload);
    return data;
  },

  finalizar: async (id: string, payload: FinalizarTrilladoPayload): Promise<Trillado> => {
    const { data } = await http.put<Trillado>(`/trillado/${id}`, payload);
    return data;
  },
};
