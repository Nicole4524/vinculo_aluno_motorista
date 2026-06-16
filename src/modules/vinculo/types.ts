import { StatusSolicitacao, SolicitadoPor } from '../../shared/types';

// ---- Database row types ----
export interface SolicitacaoVinculoRow {
  id: string;
  aluno_id: number;
  motorista_id: number;
  solicitado_por: SolicitadoPor;
  status: StatusSolicitacao;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
}

export interface VinculoRow {
  id: string;
  aluno_id: number;
  motorista_id: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// ---- DTOs ----
export interface SolicitacaoVinculoDTO {
  id: string;
  alunoId: number;
  motoristaId: number;
  solicitadoPor: SolicitadoPor;
  status: StatusSolicitacao;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
}

export interface VinculoDTO {
  id: string;
  alunoId: number;
  motoristaId: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MotoristaLookup {
  id: number;
  nome: string;
  codigo: string;
}

// ---- Request DTOs ----
export interface CriarSolicitacaoInput {
  targetId: number;
}

export interface ResponderSolicitacaoInput {
  acao: 'ACEITAR' | 'RECUSAR';
}

// ---- Response DTOs ----
export interface SolicitacaoResponse {
  id: string;
  alunoId: number;
  motoristaId: number;
  solicitadoPor: SolicitadoPor;
  status: StatusSolicitacao;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  aluno?: { id: number; nome: string; codigo?: string | null };
  motorista?: { id: number; nome: string; codigo?: string | null };
}

export interface VinculoResponse {
  id: string;
  alunoId: number;
  motoristaId: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  aluno?: { id: number; nome: string; codigo?: string | null };
  motorista?: { id: number; nome: string; codigo?: string | null };
}
