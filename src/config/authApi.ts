import axios from 'axios';

const authApi = axios.create({
  baseURL: process.env.AUTH_API_URL || 'https://cadastro-login-production.up.railway.app',
  timeout: 10000,
});

export interface PerfilAlunoResponse {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  matricula: string;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  escola?: string | null;
  motorista_id?: number | null;
  ativo: boolean;
  criado_em: string;
}

export interface PerfilMotoristaResponse {
  id: number;
  nome: string;
  email: string;
  tipo: string;
  codigo?: string | null;
}

export async function validarTokenAluno(token: string): Promise<PerfilAlunoResponse> {
  const { data } = await authApi.get<PerfilAlunoResponse>('/alunos/perfil', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function validarTokenMotorista(token: string): Promise<PerfilMotoristaResponse> {
  const { data } = await authApi.get<PerfilMotoristaResponse>('/motoristas/perfil', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}
