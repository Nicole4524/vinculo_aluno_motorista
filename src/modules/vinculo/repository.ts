import { getDatabase } from '../../config/database';
import { StatusSolicitacao } from '../../shared/types';
import {
  SolicitacaoVinculoRow,
  VinculoRow,
} from './types';

// ---- Solicitacoes ----
export async function insertSolicitacao(
  alunoId: number,
  motoristaId: number,
  solicitadoPor: string
): Promise<SolicitacaoVinculoRow> {
  const db = getDatabase();
  const { data, error } = await db
    .from('solicitacoes_vinculo')
    .insert({ aluno_id: alunoId, motorista_id: motoristaId, solicitado_por: solicitadoPor })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function findSolicitacaoById(id: string): Promise<SolicitacaoVinculoRow | null> {
  const db = getDatabase();
  const { data, error } = await db
    .from('solicitacoes_vinculo')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return data;
}

export async function findPendenteByPair(alunoId: number, motoristaId: number): Promise<SolicitacaoVinculoRow | null> {
  const db = getDatabase();
  const { data, error } = await db
    .from('solicitacoes_vinculo')
    .select('*')
    .eq('aluno_id', alunoId)
    .eq('motorista_id', motoristaId)
    .eq('status', StatusSolicitacao.PENDENTE)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findSolicitacoesByAluno(
  alunoId: number,
  status?: StatusSolicitacao
): Promise<SolicitacaoVinculoRow[]> {
  const db = getDatabase();
  let query = db
    .from('solicitacoes_vinculo')
    .select('*')
    .eq('aluno_id', alunoId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function findSolicitacoesByMotorista(
  motoristaId: number,
  status?: StatusSolicitacao
): Promise<SolicitacaoVinculoRow[]> {
  const db = getDatabase();
  let query = db
    .from('solicitacoes_vinculo')
    .select('*')
    .eq('motorista_id', motoristaId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updateSolicitacaoStatus(
  id: string,
  status: StatusSolicitacao
): Promise<SolicitacaoVinculoRow> {
  const db = getDatabase();
  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if ([StatusSolicitacao.ACEITA, StatusSolicitacao.RECUSADA].includes(status)) {
    updates.responded_at = new Date().toISOString();
  }

  const { data, error } = await db
    .from('solicitacoes_vinculo')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---- Vinculos ----
export async function insertVinculo(alunoId: number, motoristaId: number): Promise<VinculoRow> {
  const db = getDatabase();
  const { data, error } = await db
    .from('vinculos')
    .insert({ aluno_id: alunoId, motorista_id: motoristaId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function findVinculoAtivoByAluno(alunoId: number): Promise<VinculoRow | null> {
  const db = getDatabase();
  const { data, error } = await db
    .from('vinculos')
    .select('*')
    .eq('aluno_id', alunoId)
    .eq('ativo', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findVinculosByMotorista(motoristaId: number, ativo?: boolean): Promise<VinculoRow[]> {
  const db = getDatabase();
  let query = db
    .from('vinculos')
    .select('*')
    .eq('motorista_id', motoristaId)
    .order('created_at', { ascending: false });

  if (ativo !== undefined) {
    query = query.eq('ativo', ativo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function findVinculoById(id: string): Promise<VinculoRow | null> {
  const db = getDatabase();
  const { data, error } = await db
    .from('vinculos')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return data;
}

export async function updateVinculoAtivo(id: string, ativo: boolean): Promise<VinculoRow> {
  const db = getDatabase();
  const { data, error } = await db
    .from('vinculos')
    .update({ ativo, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listVinculosAtivos(): Promise<VinculoRow[]> {
  const db = getDatabase();
  const { data, error } = await db
    .from('vinculos')
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listVinculosInativos(): Promise<VinculoRow[]> {
  const db = getDatabase();
  const { data, error } = await db
    .from('vinculos')
    .select('*')
    .eq('ativo', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ---- Usuarios (consulta) ----
export type UsuarioRow = { id: number; nome: string; tipo: string; codigo?: string | null };

export async function findUsuarioById(id: number): Promise<UsuarioRow | null> {
  const db = getDatabase();
  const { data, error } = await db
    .from('usuarios')
    .select('id, nome, tipo')
    .eq('id', id)
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return data;
}

export async function findMotoristaByCode(codigo: string): Promise<(UsuarioRow & { codigo: string }) | null> {
  const db = getDatabase();
  const { data, error } = await db
    .from('usuarios')
    .select('id, nome, tipo, codigo')
    .eq('codigo', codigo)
    .eq('tipo', 'motorista')
    .single();

  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return data;
}
