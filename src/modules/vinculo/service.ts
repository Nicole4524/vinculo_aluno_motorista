import { DadosUsuario, PerfilUsuario, StatusSolicitacao, SolicitadoPor } from '../../shared/types';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors';
import * as repo from './repository';
import {
  SolicitacaoResponse,
  SolicitacaoVinculoDTO,
  VinculoDTO,
  VinculoResponse,
} from './types';
import { AcaoSolicitacao } from '../../shared/types';
import { gerarCodigoMotorista } from '../../shared/codeGenerator';

const MAX_TENTATIVAS_CODIGO = 5;

// ---- Helpers ----
function toSolicitacaoDTO(row: any): SolicitacaoVinculoDTO {
  return {
    id: row.id,
    alunoId: row.aluno_id,
    motoristaId: row.motorista_id,
    solicitadoPor: row.solicitado_por,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    respondedAt: row.responded_at,
  };
}

function toVinculoDTO(row: any): VinculoDTO {
  return {
    id: row.id,
    alunoId: row.aluno_id,
    motoristaId: row.motorista_id,
    ativo: row.ativo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---- Public API ----

export async function criarSolicitacao(
  usuario: DadosUsuario,
  targetId: number,
): Promise<SolicitacaoResponse> {
  if (usuario.id === targetId) {
    throw new ValidationError('Não é possível criar solicitação para si mesmo');
  }

  const targetUser = await repo.findUsuarioById(targetId);
  if (!targetUser) {
    throw new NotFoundError('Usuário alvo');
  }

  let alunoId: number;
  let motoristaId: number;
  let solicitadoPor: SolicitadoPor;

  if (usuario.tipo === PerfilUsuario.ALUNO) {
    if (targetUser.tipo !== 'motorista') {
      throw new ValidationError('Aluno só pode solicitar vínculo com um motorista');
    }
    alunoId = usuario.id;
    motoristaId = targetId;
    solicitadoPor = SolicitadoPor.ALUNO;
  } else if (usuario.tipo === PerfilUsuario.MOTORISTA) {
    if (targetUser.tipo !== 'aluno') {
      throw new ValidationError('Motorista só pode solicitar vínculo com um aluno');
    }
    alunoId = targetId;
    motoristaId = usuario.id;
    solicitadoPor = SolicitadoPor.MOTORISTA;
  } else {
    throw new ValidationError('Tipo de usuário inválido');
  }

  const vinculoAtivo = await repo.findVinculoAtivoByAluno(alunoId);
  if (vinculoAtivo) {
    throw new ConflictError('Aluno já possui um vínculo ativo');
  }

  const pendenteExistente = await repo.findPendenteByPair(alunoId, motoristaId);
  if (pendenteExistente) {
    throw new ConflictError('Já existe uma solicitação pendente entre aluno e motorista');
  }

  const solicitacao = await repo.insertSolicitacao(alunoId, motoristaId, solicitadoPor);
  return elaborarRespostaSolicitacao(solicitacao);
}

export async function listarSolicitacoesRecebidas(
  usuario: DadosUsuario,
  status?: StatusSolicitacao,
): Promise<SolicitacaoResponse[]> {
  let rows;
  if (usuario.tipo === PerfilUsuario.ALUNO) {
    rows = await repo.findSolicitacoesByAluno(usuario.id, status as any);
  } else {
    rows = await repo.findSolicitacoesByMotorista(usuario.id, status as any);
  }
  return Promise.all(rows.map(elaborarRespostaSolicitacao));
}

export async function listarSolicitacoesEnviadas(
  usuario: DadosUsuario,
  status?: StatusSolicitacao,
): Promise<SolicitacaoResponse[]> {
  let rows;
  if (usuario.tipo === PerfilUsuario.ALUNO) {
    rows = await repo.findSolicitacoesByMotorista(usuario.id, status as any);
  } else {
    rows = await repo.findSolicitacoesByAluno(usuario.id, status as any);
  }
  return Promise.all(rows.map(elaborarRespostaSolicitacao));
}

export async function listarHistoricoSolicitacoes(usuario: DadosUsuario): Promise<SolicitacaoResponse[]> {
  let rows;
  if (usuario.tipo === PerfilUsuario.ALUNO) {
    rows = await repo.findSolicitacoesByAluno(usuario.id);
  } else {
    rows = await repo.findSolicitacoesByMotorista(usuario.id);
  }
  return Promise.all(rows.map(elaborarRespostaSolicitacao));
}

export async function responderSolicitacao(
  usuario: DadosUsuario,
  solicitacaoId: string,
  acao: AcaoSolicitacao,
): Promise<SolicitacaoResponse> {
  const solicitacao = await repo.findSolicitacaoById(solicitacaoId);
  if (!solicitacao) {
    throw new NotFoundError('Solicitação');
  }

  if (solicitacao.status !== StatusSolicitacao.PENDENTE) {
    throw new ValidationError('Solicitação não está mais pendente');
  }

  const quemResponde = solicitacao.solicitado_por === SolicitadoPor.ALUNO
    ? { tipo: PerfilUsuario.MOTORISTA, id: solicitacao.motorista_id }
    : { tipo: PerfilUsuario.ALUNO, id: solicitacao.aluno_id };

  if (quemResponde.id !== usuario.id || quemResponde.tipo !== usuario.tipo) {
    throw new ForbiddenError('Você não tem permissão para responder esta solicitação');
  }

  if (acao === 'ACEITAR') {
    const vinculoAtivo = await repo.findVinculoAtivoByAluno(solicitacao.aluno_id);
    if (vinculoAtivo) {
      throw new ConflictError('Aluno já possui um vínculo ativo');
    }

    await repo.insertVinculo(solicitacao.aluno_id, solicitacao.motorista_id);
  }

  const updated = await repo.updateSolicitacaoStatus(
    solicitacaoId,
    acao === 'ACEITAR' ? StatusSolicitacao.ACEITA : StatusSolicitacao.RECUSADA,
  );

  return elaborarRespostaSolicitacao(updated);
}

export async function cancelarSolicitacao(
  usuario: DadosUsuario,
  solicitacaoId: string,
): Promise<SolicitacaoResponse> {
  const solicitacao = await repo.findSolicitacaoById(solicitacaoId);
  if (!solicitacao) {
    throw new NotFoundError('Solicitação');
  }

  if (solicitacao.status !== StatusSolicitacao.PENDENTE) {
    throw new ValidationError('Solicitação não está mais pendente');
  }

  const isCriadorAluno = solicitacao.solicitado_por === SolicitadoPor.ALUNO && solicitacao.aluno_id === usuario.id;
  const isCriadorMotorista = solicitacao.solicitado_por === SolicitadoPor.MOTORISTA && solicitacao.motorista_id === usuario.id;

  if (!isCriadorAluno && !isCriadorMotorista) {
    throw new ForbiddenError('Apenas o solicitante pode cancelar a solicitação');
  }

  const updated = await repo.updateSolicitacaoStatus(solicitacaoId, StatusSolicitacao.CANCELADA);
  return elaborarRespostaSolicitacao(updated);
}

export async function consultarVinculoAluno(usuario: DadosUsuario): Promise<VinculoResponse | null> {
  if (usuario.tipo !== PerfilUsuario.ALUNO) {
    throw new ForbiddenError('Apenas alunos podem consultar seu vínculo');
  }
  const vinculo = await repo.findVinculoAtivoByAluno(usuario.id);
  if (!vinculo) return null;
  return elaborarRespostaVinculo(vinculo);
}

export async function listarAlunosVinculados(
  usuario: DadosUsuario,
  ativo?: boolean,
): Promise<VinculoResponse[]> {
  if (usuario.tipo !== PerfilUsuario.MOTORISTA) {
    throw new ForbiddenError('Apenas motoristas podem listar alunos vinculados');
  }
  const rows = await repo.findVinculosByMotorista(usuario.id, ativo);
  return Promise.all(rows.map(elaborarRespostaVinculo));
}

export async function encerrarVinculo(
  usuario: DadosUsuario,
  vinculoId: string,
): Promise<VinculoResponse> {
  const vinculo = await repo.findVinculoById(vinculoId);
  if (!vinculo) {
    throw new NotFoundError('Vínculo');
  }

  const isAlunoOwner = vinculo.aluno_id === usuario.id && usuario.tipo === PerfilUsuario.ALUNO;
  const isMotoristaOwner = vinculo.motorista_id === usuario.id && usuario.tipo === PerfilUsuario.MOTORISTA;

  if (!isAlunoOwner && !isMotoristaOwner) {
    throw new ForbiddenError('Você não tem permissão para encerrar este vínculo');
  }

  const updated = await repo.updateVinculoAtivo(vinculoId, false);
  return elaborarRespostaVinculo(updated);
}

export async function listarVinculosAtivos(): Promise<VinculoResponse[]> {
  const rows = await repo.listVinculosAtivos();
  return Promise.all(rows.map(elaborarRespostaVinculo));
}

export async function listarVinculosInativos(): Promise<VinculoResponse[]> {
  const rows = await repo.listVinculosInativos();
  return Promise.all(rows.map(elaborarRespostaVinculo));
}

// ---- Código único de motorista ----

// Sincroniza o motorista localmente e garante que ele possua um código único e
// permanente. Se o motorista já tiver um código, ele é apenas retornado (nunca
// recriado). Em caso de colisão (código já usado por outro motorista), gera um
// novo candidato e tenta novamente.
export async function garantirCodigoMotorista(id: number, nome: string): Promise<string> {
  const usuario = await repo.upsertUsuario(id, nome, 'motorista');
  console.log(`[CODIGO_MOTORISTA] Motorista sincronizado: id=${id}, nome=${nome}`);

  if (usuario.codigo) {
    return usuario.codigo;
  }

  console.log(`[CODIGO_MOTORISTA] Motorista ${id} ainda não possui código. Gerando...`);

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_CODIGO; tentativa++) {
    const codigoCandidato = gerarCodigoMotorista();
    console.log(`[CODIGO_MOTORISTA] Código gerado (tentativa ${tentativa}): ${codigoCandidato}`);

    try {
      const atualizado = await repo.setCodigoIfMissing(id, codigoCandidato);
      if (atualizado?.codigo) {
        console.log(`[CODIGO_MOTORISTA] Código salvo para motorista ${id}: ${atualizado.codigo}`);
        return atualizado.codigo;
      }

      // Outra requisição concorrente já definiu o código deste motorista.
      const atual = await repo.findUsuarioById(id);
      if (atual?.codigo) {
        return atual.codigo;
      }
    } catch (err: any) {
      if (err?.code === '23505') {
        console.warn(`[CODIGO_MOTORISTA] Colisão de código detectada (${codigoCandidato}), tentando novamente...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`Não foi possível gerar um código único para o motorista ${id} após ${MAX_TENTATIVAS_CODIGO} tentativas`);
}

export async function consultarPerfilMotorista(usuario: DadosUsuario): Promise<{ id: number; nome: string; codigo: string | null }> {
  if (usuario.tipo !== PerfilUsuario.MOTORISTA) {
    throw new ForbiddenError('Apenas motoristas podem consultar este perfil');
  }
  const motorista = await repo.findUsuarioById(usuario.id);
  if (!motorista) {
    throw new NotFoundError('Motorista');
  }
  return { id: motorista.id, nome: motorista.nome, codigo: motorista.codigo ?? null };
}

// ---- Helpers internos ----
export async function buscarMotoristaPorCodigo(codigo: string): Promise<{ id: number; nome: string; codigo: string } | null> {
  console.log(`[VINCULACAO] Código informado pelo aluno: ${codigo}`);
  const motorista = await repo.findMotoristaByCode(codigo);
  if (!motorista) {
    console.log(`[VINCULACAO] Nenhum motorista encontrado para o código: ${codigo}`);
    return null;
  }
  console.log(`[VINCULACAO] Motorista encontrado. ID do motorista localizado: ${motorista.id}`);
  return { id: motorista.id, nome: motorista.nome, codigo: motorista.codigo };
}

async function elaborarRespostaSolicitacao(solicitacao: any): Promise<SolicitacaoResponse> {
  const [aluno, motorista] = await Promise.all([
    repo.findUsuarioById(solicitacao.aluno_id),
    repo.findUsuarioById(solicitacao.motorista_id),
  ]);
  return {
    ...toSolicitacaoDTO(solicitacao),
    aluno: aluno ? { id: aluno.id, nome: aluno.nome, codigo: aluno.codigo ?? null } : undefined,
    motorista: motorista ? { id: motorista.id, nome: motorista.nome, codigo: motorista.codigo ?? null } : undefined,
  };
}

async function elaborarRespostaVinculo(vinculo: any): Promise<VinculoResponse> {
  const [aluno, motorista] = await Promise.all([
    repo.findUsuarioById(vinculo.aluno_id),
    repo.findUsuarioById(vinculo.motorista_id),
  ]);
  return {
    ...toVinculoDTO(vinculo),
    aluno: aluno ? { id: aluno.id, nome: aluno.nome, codigo: aluno.codigo ?? null } : undefined,
    motorista: motorista ? { id: motorista.id, nome: motorista.nome, codigo: motorista.codigo ?? null } : undefined,
  };
}
