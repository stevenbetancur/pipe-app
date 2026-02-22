import { http } from '@/lib/http';

export interface UsuarioResponse {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operario' | 'facturacion';
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface CreateUsuarioPayload {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'operario' | 'facturacion';
  status?: 'active' | 'inactive';
}

export const usuariosService = {
  getAll: async (): Promise<UsuarioResponse[]> => {
    const { data } = await http.get<UsuarioResponse[]>('/users');
    return data;
  },
  create: async (payload: CreateUsuarioPayload): Promise<UsuarioResponse> => {
    const { data } = await http.post<UsuarioResponse>('/users', payload);
    return data;
  },
  update: async (id: string, payload: Partial<CreateUsuarioPayload>): Promise<UsuarioResponse> => {
    const { data } = await http.put<UsuarioResponse>(`/users/${id}`, payload);
    return data;
  },
};
