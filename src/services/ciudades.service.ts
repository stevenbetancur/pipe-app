import { http } from '@/lib/http';
import type { Ciudad } from '@/types';

export const ciudadesService = {
  search: async (q?: string): Promise<Ciudad[]> => {
    const params: Record<string, string> = {};
    if (q) params.q = q;
    const { data } = await http.get<Ciudad[]>('/ciudades', { params });
    return data;
  },
};
