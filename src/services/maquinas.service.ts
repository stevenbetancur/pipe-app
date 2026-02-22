import { http } from '@/lib/http';

export type ProcesoMaquina = 'MAQUILA' | 'TOSTION';
export type EstadoMaquina  = 'ACTIVA' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';

export interface Maquina {
  id: string;
  nombre: string;
  codigo: string;
  proceso: ProcesoMaquina;
  estado: EstadoMaquina;
  descripcion: string | null;
  createdAt: string;
}

export interface CreateMaquinaPayload {
  nombre: string;
  codigo: string;
  proceso: ProcesoMaquina;
  estado?: EstadoMaquina;
  descripcion?: string;
}

export interface MaquinaAsignacion {
  id: string;
  maquinaId: string;
  operarioId: string;
  fechaInicio: string;
  fechaFin: string | null;
  alcance: 'DIA' | 'SEMANA' | 'MES';
  notas: string | null;
  createdAt: string;
}

export const maquinasService = {
  getAll: async (): Promise<Maquina[]> => {
    const { data } = await http.get<Maquina[]>('/maquinas');
    return data;
  },
  create: async (payload: CreateMaquinaPayload): Promise<Maquina> => {
    const { data } = await http.post<Maquina>('/maquinas', payload);
    return data;
  },
  update: async (id: string, payload: Partial<CreateMaquinaPayload>): Promise<Maquina> => {
    const { data } = await http.put<Maquina>(`/maquinas/${id}`, payload);
    return data;
  },
};
