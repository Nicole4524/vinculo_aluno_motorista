import { query, querySingle } from '../../config/database';
import { StatusSolicitacao } from '../../shared/types';
import { SolicitacaoVinculoRow, VinculoRow } from './types';

// ---- Solicitacoes ----
export async function insertSolicitacao(
  alunoId: number,
  motoristaId: number,
  solicitadoPor: string,
): Promise<SolicitacaoVinculoRow> {
  const rows = await query<SolicitacaoVinculoRow>(
    `INSERT INTO solicitacoes_vinculo (aluno_id, motorista_id, solicitado_por)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [alunoId, motoristaId, solicitadoPor],
  );
  return rows[0];
}

export async function findSolicitacaoById(id: string): Promise<SolicitacaoVinculoRow | null> {
  return querySingle<SolicitacaoVinculoRow>(
    'SELECT * FROM solicitacoes_vinculo WHERE id = $1',
    [id],
  );
}

export async function findPendenteByPair(alunoId: number, motoristaId: number): Promise<SolicitacaoVinculoRow | null> {
  return querySingle<SolicitacaoVinculoRow>(
    `SELECT * FROM solicitacoes_vinculo
     WHERE aluno_id = $1 AND motorista_id = $2 AND status = $3`,
    [alunoId, motoristaId, StatusSolicitacao.PENDENTE],
  );
}

export async function findSolicitacoesByAluno(
  alunoId: number,
  status?: StatusSolicitacao,
): Promise<SolicitacaoVinculoRow[]> {
  let sql = 'SELECT * FROM solicitacoes_vinculo WHERE aluno_id = $1';
  const params: any[] = [alunoId];
  if (status) {
    sql += ' AND status = $2';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  return query<SolicitacaoVinculoRow>(sql, params);
}

export async function findSolicitacoesByMotorista(
  motoristaId: number,
  status?: StatusSolicitacao,
): Promise<SolicitacaoVinculoRow[]> {
  let sql = 'SELECT * FROM solicitacoes_vinculo WHERE motorista_id = $1';
  const params: any[] = [motoristaId];
  if (status) {
    sql += ' AND status = $2';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  return query<SolicitacaoVinculoRow>(sql, params);
}

export async function updateSolicitacaoStatus(
  id: string,
  status: StatusSolicitacao,
): Promise<SolicitacaoVinculoRow> {
  const sets: string[] = ['status = $2', 'updated_at = NOW()'];
  const params: any[] = [id, status];

  if (status === StatusSolicitacao.ACEITA || status === StatusSolicitacao.RECUSADA) {
    sets.push('responded_at = NOW()');
  }

  const rows = await query<SolicitacaoVinculoRow>(
    `UPDATE solicitacoes_vinculo SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0];
}

// ---- Vinculos ----
export async function insertVinculo(alunoId: number, motoristaId: number): Promise<VinculoRow> {
  const rows = await query<VinculoRow>(
    `INSERT INTO vinculos (aluno_id, motorista_id)
     VALUES ($1, $2)
     RETURNING *`,
    [alunoId, motoristaId],
  );
  return rows[0];
}

export async function findVinculoAtivoByAluno(alunoId: number): Promise<VinculoRow | null> {
  return querySingle<VinculoRow>(
    'SELECT * FROM vinculos WHERE aluno_id = $1 AND ativo = true',
    [alunoId],
  );
}

export async function findVinculosByMotorista(motoristaId: number, ativo?: boolean): Promise<VinculoRow[]> {
  let sql = 'SELECT * FROM vinculos WHERE motorista_id = $1';
  const params: any[] = [motoristaId];
  if (ativo !== undefined) {
    sql += ' AND ativo = $2';
    params.push(ativo);
  }
  sql += ' ORDER BY created_at DESC';
  return query<VinculoRow>(sql, params);
}

export async function findVinculoById(id: string): Promise<VinculoRow | null> {
  return querySingle<VinculoRow>('SELECT * FROM vinculos WHERE id = $1', [id]);
}

export async function updateVinculoAtivo(id: string, ativo: boolean): Promise<VinculoRow> {
  const rows = await query<VinculoRow>(
    'UPDATE vinculos SET ativo = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, ativo],
  );
  return rows[0];
}

export async function listVinculosAtivos(): Promise<VinculoRow[]> {
  return query<VinculoRow>(
    'SELECT * FROM vinculos WHERE ativo = true ORDER BY created_at DESC',
  );
}

export async function listVinculosInativos(): Promise<VinculoRow[]> {
  return query<VinculoRow>(
    'SELECT * FROM vinculos WHERE ativo = false ORDER BY created_at DESC',
  );
}

// ---- Usuarios (banco próprio) ----
export type UsuarioRow = { id: number; nome: string; tipo: string; codigo?: string | null };

// O id retornado pela Auth API não é globalmente único: alunos e motoristas
// vêm de tabelas/sequências independentes (/alunos/perfil e /motoristas/perfil),
// então um aluno e um motorista podem ter o mesmo id numérico por coincidência.
// A identidade real de uma linha local é o par (id, tipo) — é essa a chave usada
// no ON CONFLICT, para que o upsert de um nunca sobrescreva a linha do outro.
export async function upsertUsuario(id: number, nome: string, tipo: string, codigo?: string): Promise<UsuarioRow> {
  const rows = await query<UsuarioRow>(
    `INSERT INTO usuarios (id, nome, tipo, codigo)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id, tipo) DO UPDATE SET nome = EXCLUDED.nome, codigo = COALESCE(EXCLUDED.codigo, usuarios.codigo)
     RETURNING id, nome, tipo, codigo`,
    [id, nome, tipo, codigo || null],
  );
  return rows[0];
}

export async function findUsuarioById(id: number, tipo: string): Promise<UsuarioRow | null> {
  return querySingle<UsuarioRow>(
    'SELECT id, nome, tipo, codigo FROM usuarios WHERE id = $1 AND tipo = $2',
    [id, tipo],
  );
}

export async function findMotoristaByCode(codigo: string): Promise<(UsuarioRow & { codigo: string }) | null> {
  return querySingle<UsuarioRow & { codigo: string }>(
    'SELECT id, nome, tipo, codigo FROM usuarios WHERE codigo = $1 AND tipo = $2',
    [codigo, 'motorista'],
  );
}

// Atualiza o código somente se o usuário ainda não tiver um, evitando sobrescrever
// um código já existente em caso de requisições concorrentes. Filtra por
// tipo = 'motorista' explicitamente: como (id, tipo) agora identifica a linha,
// isso garante que nunca grava um código na linha de um aluno com id colidente.
export async function setCodigoIfMissing(id: number, codigo: string): Promise<UsuarioRow | null> {
  const rows = await query<UsuarioRow>(
    `UPDATE usuarios SET codigo = $2 WHERE id = $1 AND tipo = 'motorista' AND codigo IS NULL RETURNING id, nome, tipo, codigo`,
    [id, codigo],
  );
  return rows[0] ?? null;
}
