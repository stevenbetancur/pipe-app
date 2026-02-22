import { http } from '@/lib/http';

export interface HorarioDetalle {
  id: string;
  diaSemana: 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO';
  horaInicio: string;
  horaFin: string;
}

export interface Horario {
  id: string;
  nombre: string;
  descripcion: string | null;
  incluyeSabado: boolean;
  incluyeDomingo: boolean;
  activo: boolean;
  detalles: HorarioDetalle[];
  createdAt: string;
}

export interface CreateHorarioPayload {
  nombre: string;
  descripcion?: string;
  incluyeSabado?: boolean;
  incluyeDomingo?: boolean;
  activo?: boolean;
  detalles: Omit<HorarioDetalle, 'id'>[];
}

export interface HorarioAsignacion {
  id: string;
  horarioId: string;
  operarioId: string;
  fechaInicio: string;
  fechaFin: string | null;
  vigencia: 'DIA' | 'SEMANA' | 'MES' | 'INDEFINIDO';
  createdAt: string;
}

export const horariosService = {
  getAll: async (): Promise<Horario[]> => {
    const { data } = await http.get<Horario[]>('/horarios');
    return data;
  },
  create: async (payload: CreateHorarioPayload): Promise<Horario> => {
    const { data } = await http.post<Horario>('/horarios', payload);
    return data;
  },
  update: async (id: string, payload: Partial<CreateHorarioPayload>): Promise<Horario> => {
    const { data } = await http.put<Horario>(`/horarios/${id}`, payload);
    return data;
  },
  asignar: async (payload: { horarioId: string; operarioId: string; fechaInicio: string; fechaFin?: string | null; vigencia?: string }): Promise<HorarioAsignacion> => {
    const { data } = await http.post<HorarioAsignacion>('/horarios/asignaciones', payload);
    return data;
  },
};
