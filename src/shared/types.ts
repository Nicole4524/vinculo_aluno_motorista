import { z } from 'zod';

export enum StatusSolicitacao {
  PENDENTE = 'PENDENTE',
  ACEITA = 'ACEITA',
  RECUSADA = 'RECUSADA',
  CANCELADA = 'CANCELADA',
}

export enum PerfilUsuario {
  ALUNO = 'ALUNO',
  MOTORISTA = 'MOTORISTA',
}

export enum SolicitadoPor {
  ALUNO = 'ALUNO',
  MOTORISTA = 'MOTORISTA',
}

export interface DadosUsuario {
  id: number;
  tipo: PerfilUsuario;
  nome: string;
}

export type AcaoSolicitacao = 'ACEITAR' | 'RECUSAR';
