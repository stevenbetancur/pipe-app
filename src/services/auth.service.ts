import { http } from '@/lib/http';
import type { AuthUser } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authService = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await http.post<LoginResponse>('/auth/login', payload);
    return data;
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await http.get<AuthUser>('/auth/me');
    return data;
  },
};
